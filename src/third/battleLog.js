// ============================================================
// battleLog.js — バトルの解答を、勝敗にかかわらずサーバーの学習ログへ送る。
//  ・勝った小単元バトルは claim(報酬の申請)で記録済み。ここはそれ以外（負け・途中でやめた・お試し・章ボス）の取りこぼしを防ぐ。
//    同じ問題(seed)はサーバーが二重に数えないので、勝った戦いを重ねて送ってもよい。
//  ・送る前に端末へ一時保存し、送れたら消す＝通信が切れても・タブを閉じても、次に開いた時に送り直す（取りこぼさない）。
//  ・ゲスト・ローカルモードでは何もしない。失敗してもゲームは止めない。
// ============================================================
import { thirdApi, THIRD_SERVER } from "./thirdApi.js";
import { isGuest } from "../auth/session.js";

const KEY = "ml3_battle_log_queue_v1";
const MAX_QUEUE = 20;

const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; } };
const write = (q) => { try { localStorage.setItem(KEY, JSON.stringify(q.slice(-MAX_QUEUE))); } catch { /* noop */ } };
const enabled = () => THIRD_SERVER && !isGuest();

let flushing = false;
/** 溜まっている報告を順に送る。送れたものだけ消す。 */
export async function flushBattleLogs() {
  if (!enabled() || flushing) return;
  flushing = true;
  try {
    for (const item of read()) {
      const r = await thirdApi.report(item);
      // 200＝記録した。400＝中身が不正で永久に受け付けない（捨てる）。それ以外(通信・サーバー障害)は残して次回に再送する
      if (r.status === 200 || r.status === 400) write(read().filter((x) => x.id !== item.id));
      else break;
    }
  } finally { flushing = false; }
}

/** バトル画面を出る時に呼ぶ。result: "win" | "lose" | "abandon" */
export function reportBattle({ grade, chapterId, subUnitId, kind, result, attempts }) {
  if (!enabled() || !Array.isArray(attempts) || !attempts.length) return;
  const item = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    grade, chapterId, subUnitId: subUnitId || null, kind, result,
    attempts: attempts.slice(-120).map((a) => ({ unitId: a.unitId, level: a.level, seed: a.seed, answer: a.answer, ms: a.ms })),
  };
  write([...read(), item]);
  flushBattleLogs();
}
