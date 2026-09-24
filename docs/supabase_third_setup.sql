-- ============================================================
-- 数学ラボ3 — Supabase セットアップ（third_ 別テーブル・2026-09-20）
--  Supabase ダッシュボードの SQL Editor に貼って実行する。何度実行しても安全（if not exists / drop policy if exists）。
--
--  方針：
--   ・数学ラボ2と「同じSupabaseプロジェクト」を使う。生徒アカウント(auth.users / public.students)は共通＝
--     生徒はラボ2と同じクラスコード・なまえ・あいことばでログインできる。
--   ・ラボ2が使っているテーブル(player_state / attempts / answer_log / feedback)には一切触れない。
--     ラボ3専用のテーブルはすべて third_ の接頭辞。追加のみ（既存テーブルの変更・削除は無し）。
--   ・鉄則：サーバ権威のテーブルは client の insert/update/delete を一切許可しない（select ポリシーだけ）。
--     更新は Edge Function（service_role）だけ＝localStorage を書き換えても進捗・メダル・ガチャは変わらない。
--   ・設計: Obsidian 「設計メモ_math-labo-third_ゲームシステム論点整理_2026-09-20」
-- ============================================================

-- ① プレイヤー状態（サーバが正）。cycle(れんしゅう正解数)・haichiPassed(はいち合格)・仲間・チケット等を state に丸ごと保存。
--    メダルはこの state から導出する（src/third/medals.js）ので、ここが守られれば メダルも守られる。
create table if not exists public.third_player_state (
  student_id  uuid primary key references public.students(id) on delete cascade,
  state       jsonb not null default '{}'::jsonb,
  level       int  not null default 1,     -- 表示・教師画面用ミラー
  tickets     int  not null default 0,     -- ガチャチケット（表示用ミラー。正はstate）
  updated_at  timestamptz not null default now()
);
alter table public.third_player_state enable row level security;
drop policy if exists "third_ps self select" on public.third_player_state;
create policy "third_ps self select" on public.third_player_state
  for select using (auth.uid() = student_id);

-- ② 解答ログ（サーバが採点した結果。service_role のみ書込）
create table if not exists public.third_attempts (
  id          bigint generated always as identity primary key,
  student_id  uuid not null references public.students(id) on delete cascade,
  unit_id     text,
  difficulty  text,            -- easy/normal/hard（バトル）または easy/standard/advanced（れんしゅう）
  template_id text,
  seed        bigint,          -- 手続き生成問題を再現する種
  problem_id  text,            -- 固定DB問題のID（seedが無い問題をIDで照合する用）
  ok          boolean not null,
  mode        text,            -- haichi / practice / battle / relearn
  created_at  timestamptz not null default now()
);
alter table public.third_attempts enable row level security;
create index if not exists third_attempts_student_created on public.third_attempts (student_id, created_at desc);
drop policy if exists "third_attempts self select" on public.third_attempts;
create policy "third_attempts self select" on public.third_attempts
  for select using (auth.uid() = student_id);

-- ③ メダル獲得記録（サーバが付与。1人・1小単元・1種類につき1行）。教師画面の集計用。
create table if not exists public.third_medals (
  student_id  uuid not null references public.students(id) on delete cascade,
  unit_id     text not null,
  kind        text not null check (kind in ('haichi', 'practice')),
  earned_at   timestamptz not null default now(),
  primary key (student_id, unit_id, kind)
);
alter table public.third_medals enable row level security;
drop policy if exists "third_medals self select" on public.third_medals;
create policy "third_medals self select" on public.third_medals
  for select using (auth.uid() = student_id);

-- ④ ガチャ履歴（抽選はサーバ側で行う。引き直し・結果の書き換えを防ぐ）。service_role のみ書込。
create table if not exists public.third_gacha_log (
  id          bigint generated always as identity primary key,
  student_id  uuid not null references public.students(id) on delete cascade,
  pool        text,            -- ガチャの種類
  result_id   text not null,   -- 出た仲間のID（specialistRoster の id）
  rarity      text,            -- N/R/SR/UR
  is_new      boolean,         -- 新規入手か（false＝被り→限界突破素材）
  tickets_used int not null default 1,
  created_at  timestamptz not null default now()
);
alter table public.third_gacha_log enable row level security;
create index if not exists third_gacha_log_student_created on public.third_gacha_log (student_id, created_at desc);
drop policy if exists "third_gacha self select" on public.third_gacha_log;
create policy "third_gacha self select" on public.third_gacha_log
  for select using (auth.uid() = student_id);

-- ⑤ 解答内容ログ（生徒が自分の解答を記録する一方向ログ。insert のみ許可）。
--    読めるのは Edge Function（service_role）経由の先生だけ。ラボ2の answer_log と同じ設計で、ラボ3専用。
create table if not exists public.third_answer_log (
  id           bigint generated always as identity primary key,
  student_id   uuid not null references public.students(id) on delete cascade,
  unit_id      text,
  difficulty   text,
  mode         text,
  q            text,
  ans          text,
  user_answer  text,
  ok           boolean not null,
  mistake_tag  text,
  created_at   timestamptz not null default now()
);
alter table public.third_answer_log enable row level security;
create index if not exists third_answer_log_student_created on public.third_answer_log (student_id, created_at desc);
drop policy if exists "third_answer_log self insert" on public.third_answer_log;
create policy "third_answer_log self insert" on public.third_answer_log
  for insert with check (auth.uid() = student_id);

-- ============================================================
-- ⑥ 管理者の分析用（2026-09-24）— これも SQL Editor に貼って実行（何度実行しても安全）
--  ・third_attempts に「解答にかけた時間(ms)」の列を追加（プレイ時間の集計用）。template_id は元からある列を使う。
--  ・third_login_log：ログインした日時の履歴（生徒が自分の行だけ追加できる。読めるのは管理者の Edge Function だけ）。
-- ============================================================
alter table public.third_attempts add column if not exists ms int;

create table if not exists public.third_login_log (
  id          bigint generated always as identity primary key,
  student_id  uuid not null references public.students(id) on delete cascade,
  at          timestamptz not null default now()
);
alter table public.third_login_log enable row level security;
create index if not exists third_login_log_student_at on public.third_login_log (student_id, at desc);
drop policy if exists "third_login_log self insert" on public.third_login_log;
create policy "third_login_log self insert" on public.third_login_log
  for insert with check (auth.uid() = student_id);
