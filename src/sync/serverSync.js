// ============================================================
// serverSync.js — クライアント⇔サーバ権威の同期層（Step4）
//
//  ・AUTH_ENABLED（Supabase設定済み）のときだけ動く。未設定なら全部 no-op で、
//    アプリは従来どおりローカルのみで完結する（何も壊れない）。
//  ・submitAttempt: 1問の解答を Edge Function `attempt` に送り、サーバが採点＆権威更新した
//    最新の player_state を受け取る。
//  ・loadServerState: 自分の player_state をサーバから読む（RLSで本人の行だけ見える）。
//
//  ★導入の考え方（安全な段階移行）★
//   まずは「影(shadow)運用」：ローカルを正のまま submitAttempt を裏で呼び、
//   サーバ側の集計が一致するかを attempts / player_state で確認する。
//   一致を確認できたら Step5 でサーバを“正”に切り替える（表示もサーバ値に）。
// ============================================================
import { AUTH_ENABLED, supabase } from "../auth/supabase.js";
import { getActiveUid } from "../auth/session.js";

/** サーバが有効か（未ログイン/未設定なら false → 呼び出し側は従来のローカル処理のみ） */
export function serverActive() {
  return !!(AUTH_ENABLED && supabase && getActiveUid());
}

/**
 * 1問の解答をサーバに送って“正”採点＆権威更新してもらう。
 * @param {object} attempt { unitId, level, templateId, seed, userAnswer, mode, lessonKey? }
 * @returns {Promise<{ok:boolean, cleared?:boolean, level?:number, state?:object, error?:string}|null>}
 *   サーバ無効時は null（呼び出し側はローカル結果を使う）。
 */
export async function submitAttempt(attempt) {
  if (!serverActive()) return null;
  try {
    const { data, error } = await supabase.functions.invoke("attempt", { body: attempt });
    if (error) return { ok: false, error: String(error.message || error) };
    return data;
  } catch (e) {
    // ネットワーク失敗などはローカル進行を止めない（オフラインでも遊べる）
    return { ok: false, error: String(e?.message || e) };
  }
}

/** 自分の player_state をサーバから読む（無ければ null）。RLSで本人の行だけ取得できる。 */
export async function loadServerState() {
  if (!serverActive()) return null;
  try {
    const { data, error } = await supabase
      .from("player_state").select("state").eq("student_id", getActiveUid()).maybeSingle();
    if (error || !data) return null;
    return data.state || null;
  } catch {
    return null;
  }
}
