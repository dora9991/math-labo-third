// ============================================================
// answerLog.js — 解答の中身（問題文・答え・正誤・誤答タグ）をサーバに記録する。
//  attempts（チート対策の○×だけの再採点ログ、service_role専用書込）とは別物。
//  こちらは生徒自身が「自分の解答をそのまま記録する」だけの一方向ログ（insertのみ）。
//  未ログイン/認証OFF/通信エラーなど何が起きても本体の動作には影響しない（常に握りつぶす）。
// ============================================================
import { AUTH_ENABLED, supabase } from "../auth/supabase.js";
import { getActiveUid } from "../auth/session.js";

/**
 * 1問ぶんの解答内容を記録する（正解・不正解どちらも）。呼びっぱなしでよい（fire-and-forget）。
 * @param {object} a { unitId, level, mode, q, ans, userAnswer, ok, mistakeTag }
 */
export function logAnswer(a) {
  if (!AUTH_ENABLED || !supabase) return;
  const uid = getActiveUid();
  if (!uid || !a) return;
  supabase.from("answer_log").insert({
    student_id: uid,
    unit_id: a.unitId ?? null,
    level: a.level ?? null,
    mode: a.mode ?? null,
    q: a.q != null ? String(a.q) : null,
    ans: a.ans != null ? String(a.ans) : null,
    user_answer: a.userAnswer != null ? String(a.userAnswer) : null,
    ok: !!a.ok,
    mistake_tag: a.mistakeTag ?? null,
  }).then(() => {}, () => {}); // 失敗は無視（ローカルの進行には影響させない）
}
