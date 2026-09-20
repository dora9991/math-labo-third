// ============================================================
// supabase.js — 保存層（サーバー実装・将来用のプレースホルダ）
//
// 【今はまだ使わない】サーバー連携(P3)になったらここを実装する。
// localStore.js と「同じ関数名」で中身だけ Supabase 版に差し替えれば、
// ゲーム本体・画面のコードは一切変更不要。
//
// 手順イメージ（P3で一緒にやる）：
//   1) npm install @supabase/supabase-js
//   2) .env.local に接続情報を書く（VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY）
//   3) 下のコメントを外して実装
//   4) 画面側の import を localStore → supabase に切り替え
//
// テーブル設計（recordSchema.js と1対1で対応）：
//   students(id, name, class_id, ...)
//   records(id, student_id, mode, chapter_id, unit_id, level, correct, wrong, stars, xp, max_streak, extra, created_at)
//   mistakes(id, student_id, chapter_id, unit_id, level, q, ans, created_at)
//   player_state(student_id, xp, streaks, last_date, stars, updated_at)
// ============================================================

// import { createClient } from "@supabase/supabase-js";
//
// const supabase = createClient(
//   import.meta.env.VITE_SUPABASE_URL,
//   import.meta.env.VITE_SUPABASE_ANON_KEY
// );
//
// export async function load() { /* select ... */ }
// export async function savePlayerState(player) { /* upsert player_state */ }
// export async function addRecord(record) { /* insert records */ }
// export async function addMistakes(mistakes) { /* insert mistakes */ }
// export async function removeMistake(id) { /* delete mistakes */ }

export const NOT_IMPLEMENTED = true;
