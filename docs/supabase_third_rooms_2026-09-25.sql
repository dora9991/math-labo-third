-- ============================================================
-- 数学ラボ3 — マルチプレイの部屋（2026-09-25・第1段階）
--  Supabase ダッシュボードの SQL Editor に貼って実行する。追加のみ（既存テーブルには触れない）。
--  設計: Obsidian 「設計メモ_math-labo-third_マルチプレイ_2026-09-25」
--  書き込みは Edge Function `third-api`（service_role）だけ。参加者は自分の部屋の行を「読む」ことだけできる
--  （Realtime で状態を受け取るため）。
-- ============================================================
create table if not exists public.third_rooms (
  code        text primary key,               -- 部屋コード（4文字）
  host_id     uuid not null,
  status      text not null default 'waiting', -- waiting / started / closed
  member_ids  uuid[] not null default '{}',    -- 参加者（RLS用）
  room        jsonb not null default '{}'::jsonb, -- 部屋の状態の本体
  updated_at  timestamptz not null default now()
);
alter table public.third_rooms enable row level security;
create index if not exists third_rooms_member_ids on public.third_rooms using gin (member_ids);

drop policy if exists "third_rooms member select" on public.third_rooms;
create policy "third_rooms member select" on public.third_rooms
  for select using (auth.uid() = any (member_ids));
-- insert / update / delete のポリシーは作らない（service_role だけが書く）。

-- Realtime（参加者の画面に部屋の変化を即座に配る）
do $$ begin
  alter publication supabase_realtime add table public.third_rooms;
exception when duplicate_object then null; end $$;
