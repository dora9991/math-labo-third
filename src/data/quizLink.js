// ============================================================
// quizLink.js — 小テストアプリ（math-dialogue/quiz/、別リポジトリ）との連携。
//  同じSupabaseプロジェクトに相乗りしているquiz側の quiz_my_attempts RPC を呼び、
//  正答率の低い回を数学ラボ2の対応単元にマップして返すだけ（生徒データを書き換えない・
//  失敗しても数学ラボ2の動作には影響しない=呼び出し側は空配列で握りつぶす前提）。
// ============================================================
import { supabase } from "../auth/supabase.js";

const WEAK_THRESHOLD = 0.6; // これ未満の正答率を「苦手」とみなす

// quiz回id → 数学ラボ2の単元（比例と反比例=chapter c4）。
// quiz/teacher.html の MATHLABO_UNIT と対応関係（quizが展開されたら両方に追記する）。
const QUIZ_TO_UNIT = {
  "M1-04-1": { unitId: "h4", name: "変域" },
  "M1-04-2": { unitId: "h1", name: "比例" },
  "M1-04-3": { unitId: "h3", name: "座標とグラフ" },
  "M1-04-4": { unitId: "h3", name: "座標とグラフ" },
  "M1-04-5": { unitId: "h2", name: "反比例" },
  "M1-04-6": { unitId: "h3", name: "座標とグラフ" },
  "M1-04-7": { unitId: "h5", name: "比例・反比例の利用" },
};

/**
 * 小テストの学籍ID（E-101236形式）から、苦手が見つかった数学ラボ2の単元一覧を返す。
 * 取れなければ（未設定・形式不一致・通信エラー・quiz未受験など）常に空配列。
 */
export async function getQuizWeakUnits(accountId) {
  if (!supabase || !accountId) return [];
  if (!/^[A-Z]-[0-9]{5,7}$/.test(String(accountId).trim().toUpperCase())) return [];
  try {
    const { data, error } = await supabase.rpc("quiz_my_attempts", { p_account_id: accountId });
    if (error || !data || data.error) return [];
    const attempts = Array.isArray(data.attempts) ? data.attempts : [];
    const seen = new Set();
    const out = [];
    for (const a of attempts) {
      if (!a.best_max) continue; // 未受験・満点0のデータは判定不能なので無視
      if (a.best_score / a.best_max >= WEAK_THRESHOLD) continue;
      const u = QUIZ_TO_UNIT[a.quiz_id];
      if (!u || seen.has(u.unitId)) continue;
      seen.add(u.unitId);
      out.push(u);
    }
    return out;
  } catch {
    return [];
  }
}
