-- ============================================================
-- 数学ラボ3 — 学習ログ（解答の中身・1日ごとの集計・メダル履歴・ログイン時間）2026-09-25
--  Supabase ダッシュボードの SQL Editor に貼って実行する。何度実行しても安全（if not exists / drop policy if exists）。
--  ※ supabase_third_setup.sql（third_ の基本テーブルと third_login_log / third_attempts.ms）を先に実行済みであること。
--
--  ここで作る/変えるもの
--   ① third_answer_log  … サーバーが seed から問題を作り直して記録する「解答の中身」（問題文・正解・生徒の答え・正誤・誤答タグ・所要時間）。
--                          生徒のブラウザからは書けない（＝改ざん・でっちあげ不可）。同じ問題(seed)は二重に入らない。
--   ② third_daily       … 生徒×日(日本時間)ごとの集計：解いた問題数・正解数・解答時間・メダル・ログイン回数・滞在時間 …
--   ③ third_sessions    … ログイン(1回のブラウザ滞在)ごとの開始・最終確認時刻・滞在時間（サーバー時刻）
--   ④ third_medals     … メダルの獲得日時（テーブルは基本セットアップで作成済み。書き込みはサーバーが行う）
--  鉄則：これらはすべて Edge Function（service_role）だけが書く。生徒が読めるのは自分の third_daily だけ。
-- ============================================================

-- ① 解答の中身ログ：列を足し、生徒からの直接 insert を禁止する（サーバーだけが書く）
alter table public.third_answer_log add column if not exists seed        bigint;
alter table public.third_answer_log add column if not exists template_id text;
alter table public.third_answer_log add column if not exists ms          int;
alter table public.third_answer_log add column if not exists counted     boolean not null default true;  -- 報酬・メダルに数えた解答か（検証を通ったもの）
alter table public.third_answer_log add column if not exists grade       int;
alter table public.third_answer_log add column if not exists chapter_id  text;
alter table public.third_answer_log add column if not exists sub_unit_id text;
alter table public.third_answer_log add column if not exists result      text;    -- バトルの結果: win / lose / abandon（バトル以外は null）
drop policy if exists "third_answer_log self insert" on public.third_answer_log; -- 以後クライアントは書けない
-- 同じ問題(seed)の二重記録を防ぐ（seed が無い行は対象外）
create unique index if not exists third_answer_log_dedupe on public.third_answer_log (student_id, mode, unit_id, difficulty, seed);
create index if not exists third_answer_log_unit on public.third_answer_log (student_id, unit_id, created_at desc);

-- ② 1日ごとの集計（日本時間の日付）
create table if not exists public.third_daily (
  student_id  uuid not null references public.students(id) on delete cascade,
  day         date not null,
  solved      int    not null default 0,   -- その日に解いた問題数（正誤問わず）
  correct     int    not null default 0,   -- そのうち正解
  ms          bigint not null default 0,   -- 解答にかけた時間の合計
  battle_n    int    not null default 0,   -- モード別の問題数
  practice_n  int    not null default 0,
  haichi_n    int    not null default 0,
  medals      int    not null default 0,   -- その日に取ったメダルの数
  logins      int    not null default 0,   -- その日のログイン(ブラウザを開いた)回数
  active_ms   bigint not null default 0,   -- 滞在時間（ping で計測。放置は含めない）
  first_at    timestamptz,
  last_at     timestamptz,
  primary key (student_id, day)
);
alter table public.third_daily enable row level security;
drop policy if exists "third_daily self select" on public.third_daily;
create policy "third_daily self select" on public.third_daily for select using (auth.uid() = student_id);

-- 加算は関数で原子的に行う（同時に2つの記録が来ても数が落ちない）。service_role だけが呼べる。
create or replace function public.third_bump_daily(
  p_student uuid, p_day date, p_solved int, p_correct int, p_ms bigint,
  p_battle int, p_practice int, p_haichi int, p_medals int, p_logins int, p_active_ms bigint
) returns void language sql security definer set search_path = public as $$
  insert into public.third_daily as d (student_id, day, solved, correct, ms, battle_n, practice_n, haichi_n, medals, logins, active_ms, first_at, last_at)
  values (p_student, p_day, p_solved, p_correct, p_ms, p_battle, p_practice, p_haichi, p_medals, p_logins, p_active_ms, now(), now())
  on conflict (student_id, day) do update set
    solved = d.solved + excluded.solved, correct = d.correct + excluded.correct, ms = d.ms + excluded.ms,
    battle_n = d.battle_n + excluded.battle_n, practice_n = d.practice_n + excluded.practice_n, haichi_n = d.haichi_n + excluded.haichi_n,
    medals = d.medals + excluded.medals, logins = d.logins + excluded.logins, active_ms = d.active_ms + excluded.active_ms,
    first_at = least(coalesce(d.first_at, excluded.first_at), excluded.first_at), last_at = now();
$$;
revoke all on function public.third_bump_daily(uuid, date, int, int, bigint, int, int, int, int, int, bigint) from public, anon, authenticated;
grant execute on function public.third_bump_daily(uuid, date, int, int, bigint, int, int, int, int, int, bigint) to service_role;

-- ③ ログイン（滞在）ごとの記録
create table if not exists public.third_sessions (
  id           bigint generated always as identity primary key,
  student_id   uuid not null references public.students(id) on delete cascade,
  sid          text not null,                       -- ブラウザのタブごとの識別子
  started_at   timestamptz not null default now(),  -- ログイン（開いた）時刻＝サーバー時刻
  last_seen_at timestamptz not null default now(),  -- 最後に動いていた時刻
  active_ms    bigint not null default 0,           -- 滞在時間（放置は数えない）
  unique (student_id, sid)
);
alter table public.third_sessions enable row level security;   -- ポリシー無し＝クライアントは読み書き不可（Edge Function だけ）
create index if not exists third_sessions_student_started on public.third_sessions (student_id, started_at desc);

-- ④ メダル獲得日時：サーバーが書く。生徒が読むのは自分の分だけ（基本セットアップのポリシーのまま）
create index if not exists third_medals_earned on public.third_medals (earned_at desc);
