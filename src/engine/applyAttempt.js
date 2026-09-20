// ============================================================
// applyAttempt.js — サーバ権威の「1解答 → 新しい player_state」（Step3の中核・純関数）
//
//  ★これがサーバの“正”★ クライアントの自己申告ではなく、seed から問題を作り直して
//   採点し(grade.js)、その結果だけで cycle/クリスタル/レベル/石 を更新する。
//   App.jsx の bumpCycle / maybeReviewBonus と同じルール(engine/progress.js)を使う。
//
//  ★純関数★ DB も Date.now も使わない（nowMs は引数で渡す）。だから Node でテストでき、
//   Deno の Edge Function からも同じ結果で呼べる。副作用（DB保存）は呼び出し側(index.ts)が行う。
// ============================================================
import { gradeAttempt } from "./grade.js";
import {
  nextCycleCounts, naosuSatisfied, isUnitCycleCleared,
  reviewMilestonesToGrant,
  MASTER_CYCLE_COIN, MASTER_CYCLE_CRYSTAL, GEAR_STONE_CAP,
} from "./progress.js";

/**
 * 1解答をサーバ権威で反映する。
 * @param {object} state  現在の player_state（recordSchema.initialPlayerState の形）
 * @param {object} input  { unitId, level, templateId, seed, userAnswer, mode }
 *   mode: "practice" | "battle" | "relearn" | "applied"（採点対象）
 * @param {object} deps   { unitsInWorld:[{id}], unitHasMistakes:boolean, lectureOK:boolean, nowMs:number }
 * @returns {{ state:object, ok:boolean, cleared:boolean, level:number, events:string[], error?:string }}
 */
export function applyAttempt(state, input, deps) {
  const { unitId, level, templateId, seed, userAnswer, mode } = input || {};
  const { unitsInWorld = [], unitHasMistakes = false, lectureOK = true, nowMs = 0 } = deps || {};

  // ① サーバで採点（seed から問題を再現して照合＝自己申告を信じない）
  const g = gradeAttempt({ unitId, level, templateId, seed, userAnswer });
  const ok = !!g.ok;
  const events = [];
  const out = { ...state };
  out.cycle = { ...(state.cycle || {}) };

  // 採点だけ返す（正解でなければ進捗は動かさない）
  if (!ok) return { state: out, ok: false, cleared: false, level: 1 + clearedInWorld(out.cycle, unitsInWorld), events, error: g.error };

  // ② 種類ごとにカウントを増やす（practice/battle=ためす, relearn=なおす, applied=応用）
  const isRelearn = mode === "relearn";
  const isApplied = mode === "applied";
  const prev = out.cycle[unitId] || {};
  let next = isApplied
    ? { ...prev, appliedN: (prev.appliedN || 0) + 1, lecture: !!prev.lecture, cleared: !!prev.cleared }
    : nextCycleCounts(prev, { practice: isRelearn ? 0 : 1, relearn: isRelearn ? 1 : 0 });

  // ③ サイクルクリア判定（講義+ためす+なおす）。progress.js に一元化。
  const naosuOK = naosuSatisfied(next.relearnN, unitHasMistakes);
  const wasCleared = !!next.cleared;
  const newlyCleared = !next.cleared && isUnitCycleCleared({ lectureOK, practiceN: next.practiceN, naosuOK });
  if (newlyCleared) { next.cleared = true; next.clearedAt = nowMs; }
  out.cycle[unitId] = next;

  // ④ 初クリア＝レベル+1・クリスタル+1・コイン束。worldCleared は flag から数え直し（ドリフトしない）。
  if (newlyCleared) {
    out.coins = (state.coins ?? 0) + MASTER_CYCLE_COIN;
    out.crystals = (state.crystals ?? 0) + MASTER_CYCLE_CRYSTAL;
    const world = state.world || 1;
    const wc = { 1: 0, 2: 0, 3: 0, ...(state.worldCleared || {}) };
    wc[world] = unitsInWorld.filter((u) => out.cycle[u.id]?.cleared).length;
    out.worldCleared = wc;
    events.push("cycle-cleared");
  } else if (wasCleared && !isApplied) {
    // ⑤ クリア済みを解き直した＝間隔反復。1日後/1週間後の窓が開いていれば 剣石+鎧石。
    const give = reviewMilestonesToGrant(next, nowMs);
    if (give.length) {
      const u = { ...next };
      if (give.includes("d1")) u.r1 = true;
      if (give.includes("d7")) u.r7 = true;
      out.cycle[unitId] = u;
      out.gear = addStones(state.gear, give.length);
      events.push("review-bonus:" + give.join("+"));
    }
  }

  // ⑥ 応用の初クリア（appliedN が 1 に達した瞬間）＝剣石+鎧石（武器/防具が少し育つ・上限あり）
  if (isApplied && (prev.appliedN || 0) === 0 && next.appliedN === 1) {
    out.gear = addStones(out.gear || state.gear, 1);
    events.push("applied-first-clear");
  }

  const newLevel = 1 + clearedInWorld(out.cycle, unitsInWorld);
  return { state: out, ok: true, cleared: newlyCleared, level: newLevel, events };
}

/** 講義（確認問題）合格をサーバ権威で記録する（mode:"lecture"）。lessonKey は葉一レッスンのキー。 */
export function applyLecturePass(state, lessonKey, deps) {
  const { unitsInWorld = [] } = deps || {};
  const out = { ...state, haichiPassed: { ...(state.haichiPassed || {}), [lessonKey]: true } };
  return { state: out, level: 1 + clearedInWorld(out.cycle || {}, unitsInWorld) };
}

// ── 内部ヘルパー ─────────────────────────────
function clearedInWorld(cycleMap = {}, unitsInWorld = []) {
  return unitsInWorld.filter((u) => cycleMap[u.id]?.cleared).length;
}
function addStones(gear, add) {
  const g = { swordStones: 0, armorStones: 0, ...(gear || {}) };
  return {
    ...g,
    swordStones: Math.min(GEAR_STONE_CAP, (g.swordStones || 0) + add),
    armorStones: Math.min(GEAR_STONE_CAP, (g.armorStones || 0) + add),
  };
}
