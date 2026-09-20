// ============================================================
// weakness.js — 「苦手な小単元」を見つけるエンジン
//
//  プレイヤーの記録から、いま苦手な小単元を弱い順に返す。
//  判定材料：
//   ・unitMastery.pt（習得確認メーター。低いほど苦手）／ok（習得済みか）
//   ・間違いノートに残っている数（多いほど苦手）
//   ・タイムアタック等の正答率（低いほど苦手）
//
//  「苦手タイムアタック」では、ここで選んだ単元の問題を混ぜて出題する。
// ============================================================
import { allChapters } from "../data/index.js";

/** 小単元ID から { chapter, unit } を探す（全学年の全章を走査） */
function locate(unitId) {
  for (const c of allChapters()) {
    const u = c.units.find((x) => x.id === unitId);
    if (u) return { chapter: c, unit: u };
  }
  return null;
}

/**
 * 苦手な小単元を弱い順（苦手度が高い順）に返す。
 * @returns {Array<{chapterId, unitId, chapter, unit, score, ok, pt, mistakes, accuracy}>}
 */
export function getWeakUnits(player, mistakes = [], records = [], limit = 6) {
  const um = player?.unitMastery || {};

  // 候補＝これまで触れた小単元（mastery・間違い・記録のいずれかに出てくるもの）
  const ids = new Set([
    ...Object.keys(um),
    ...mistakes.filter((m) => m.unitId).map((m) => m.unitId),
    ...records.filter((r) => r.unitId).map((r) => r.unitId),
  ]);

  // 単元ごとの間違い数
  const mistakeCount = {};
  for (const m of mistakes) if (m.unitId) mistakeCount[m.unitId] = (mistakeCount[m.unitId] || 0) + 1;

  // 単元ごとの正答数・誤答数（記録から）
  const acc = {};
  for (const r of records) {
    if (!r.unitId) continue;
    const a = acc[r.unitId] || (acc[r.unitId] = { c: 0, w: 0 });
    a.c += r.correct || 0;
    a.w += r.wrong || 0;
  }

  const list = [];
  for (const id of ids) {
    const loc = locate(id);
    if (!loc) continue; // 合成単元など実在しないIDは除外
    const m = um[id] || {};
    const pt = typeof m.pt === "number" ? m.pt : 50;
    const ok = !!m.ok;
    const mc = mistakeCount[id] || 0;
    const a = acc[id];
    const total = a ? a.c + a.w : 0;
    const accuracy = total > 0 ? a.c / total : null;

    // 苦手度スコア（高いほど苦手）
    let score = 0;
    score += (100 - pt) * 1.0;                       // ptが低いほど苦手
    score += mc * 15;                                // 間違いが多いほど
    if (accuracy != null) score += (1 - accuracy) * 60; // 正答率が低いほど
    if (ok) score -= 40;                             // 既に習得済みなら苦手度を下げる

    list.push({ chapterId: loc.chapter.id, unitId: id, chapter: loc.chapter, unit: loc.unit, score, ok, pt, mistakes: mc, accuracy });
  }

  // 苦手度が一定以上のものだけ、弱い順に
  return list.filter((x) => x.score > 20).sort((a, b) => b.score - a.score).slice(0, limit);
}

/** 苦手単元が1つでもあるか */
export function hasWeakUnits(player, mistakes = [], records = []) {
  return getWeakUnits(player, mistakes, records, 1).length > 0;
}

/**
 * 苦手単元の問題を混ぜた「合成単元」を作る（苦手タイムアタック用）。
 * 各単元の かんたん＋ふつう のテンプレを集める（発展は入れず、克服を主目的に）。
 * genProblem(unit, level) はこの problems[level] から出題する。
 */
export function buildWeakUnit(weakUnits) {
  const merged = [];
  for (const w of weakUnits) {
    const p = w.unit?.problems || {};
    for (const lv of ["easy", "standard"]) {
      if (Array.isArray(p[lv])) merged.push(...p[lv]);
    }
  }
  // どの難易度キーで呼ばれても同じ混合プールを返す
  return { id: "__weak__", name: "苦手ミックス", problems: { easy: merged, standard: merged, advanced: merged } };
}
