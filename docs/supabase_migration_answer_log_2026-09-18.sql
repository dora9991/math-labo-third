-- ============================================================
-- 数学ラボ2 — ログイン履歴＋解答内容ログ（2026-09-18）
--  Supabase ダッシュボードの SQL Editor に貼って実行する（docs/supabase_setup.sql の追加分）。
--
--  背景：
--   ・ログインしても何もしなければ students テーブルに一切痕跡が残らなかった
--     （registerKid で1回書くだけ・loginKid は何も書かない）→ last_login を追加。
--   ・attempts テーブルは chート対策の最小限ログ（unit_id/level/ok の○×だけ）で、
--     問題文・答え・誤答タグの「中身」は生徒のブラウザ(localStorage)にしか無かった
--     → answer_log を新設し、中身も送るようにする。
-- ============================================================

-- ① ログイン履歴：ログインのたびに更新する列（既存の "students self update" ポリシーで
--    本人の行を更新できるので、新しいポリシーは不要）。
alter table public.students add column if not exists last_login timestamptz;

-- ② 解答内容ログ：問題文・答え・正誤・誤答タグ（診断タグ）を記録する。
--    attempts（サーバ権威の再採点用・service_roleのみ書込）とは別物。
--    こちらは生徒自身が「自分の解答を記録する」だけの一方向ログ（insertのみ許可）。
--    読めるのは Edge Function `teacher`（service_role）経由の先生だけ（selectポリシーは作らない）。
create table if not exists public.answer_log (
  id           bigint generated always as identity primary key,
  student_id   uuid not null references public.students(id) on delete cascade,
  unit_id      text,
  level        text,
  mode         text,             -- practice/battle/relearn/applied/slow ...
  q            text,             -- 問題文
  ans          text,             -- 正解
  user_answer  text,             -- 生徒が実際に答えた内容
  ok           boolean not null,
  mistake_tag  text,             -- 誤答の診断タグ（distractors[].tag。正解や非対応単元ではnull）
  created_at   timestamptz not null default now()
);
alter table public.answer_log enable row level security;
create index if not exists answer_log_student_created on public.answer_log (student_id, created_at desc);

drop policy if exists "answer_log self insert" on public.answer_log;
create policy "answer_log self insert" on public.answer_log
  for insert with check (auth.uid() = student_id);
-- 生徒自身の select ポリシーはあえて作らない（今は先生用途のみのため）。
-- 将来「自分の解答履歴を振り返る」機能を作るときに self select を足せばよい。
