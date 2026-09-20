// ============================================================
// insight.js — 単元(章)・小単元(ユニット)ごとの「理解度」とAIの一言
//
// records（1回ごとの挑戦結果）と stars（くり返しでためた星）から、
// 小単元ごとの「正答率」と「理解度（星＋正答率の合成）」を出し、
// ルールベースで励まし＆アドバイスの一言を生成する。
//
//   理解度 = 星（クリアの達成度 0〜9）と 正答率 を半々で合成。
//            まだ解いていない単元は band:"none"（未挑戦）。
// ============================================================
import { LEVEL_KEYS } from "../data/index.js";

/** records から 小単元(unitId)ごとの正誤を集計する */
export function accuracyByUnit(records = []) {
  const acc = {};
  for (const r of records) {
    if (!r || !r.unitId) continue;
    const a = acc[r.unitId] || (acc[r.unitId] = { c: 0, w: 0 });
    a.c += r.correct || 0;
    a.w += r.wrong || 0;
  }
  return acc;
}

/** records から 小単元×難易度ごとの正誤を集計する（難易度別の内訳表示に使う） */
export function accuracyByUnitLevel(records = []) {
  const acc = {};
  for (const r of records) {
    if (!r || !r.unitId || !r.level) continue;
    const key = `${r.unitId}-${r.level}`;
    const a = acc[key] || (acc[key] = { c: 0, w: 0 });
    a.c += r.correct || 0;
    a.w += r.wrong || 0;
  }
  return acc;
}

/** 小単元の星合計（3難易度ぶん 0〜9） */
export function unitStarSum(stars = {}, unitId) {
  return LEVEL_KEYS.reduce((s, l) => s + (stars[`${unitId}-${l}`] || 0), 0);
}

/**
 * 理解度を求める。
 * @param {{starSum:number, accuracy:number|null, attempts:number}} x
 * @returns {{pct:number, band:"strong"|"ok"|"weak"|"none", label:string, color:string}}
 */
export function unitUnderstanding({ starSum = 0, accuracy = null, attempts = 0 }) {
  if (attempts === 0 && starSum === 0) {
    return { pct: 0, band: "none", label: "未挑戦", color: "#94a3b8" };
  }
  const starPart = Math.min(1, starSum / 9);
  const pct = accuracy == null
    ? Math.round(starPart * 100)
    : Math.round((starPart * 0.5 + accuracy * 0.5) * 100);
  let band, label, color;
  if (pct >= 80) { band = "strong"; label = "得意"; color = "#4ade80"; }
  else if (pct >= 55) { band = "ok"; label = "まずまず"; color = "#fbbf24"; }
  else { band = "weak"; label = "苦手"; color = "#f87171"; }
  return { pct, band, label, color };
}

/**
 * AIからの一言（ルールベース）。苦手なら具体アドバイス、未挑戦なら誘導。
 * @returns {string}
 */
export function aiComment({ unitName, band, accuracy, attempts = 0, starSum = 0 }) {
  const accTxt = accuracy == null ? null : `${Math.round(accuracy * 100)}%`;
  if (band === "none") {
    return `「${unitName}」はまだ挑戦していないよ。まずはタイムアタックで力だめししてみよう！`;
  }
  if (band === "strong") {
    if (starSum >= 9) return `「${unitName}」はバッチリ！全難易度で星を集めたね。バトルで腕だめししよう⚔️`;
    return `「${unitName}」は得意分野（正答率${accTxt}）。発展まで星3を狙ってみよう✨`;
  }
  if (band === "ok") {
    return `「${unitName}」はあと一歩（正答率${accTxt}）。間違えた問題をノートで見直すと安定するよ📓`;
  }
  // weak
  if (attempts < 3) {
    return `「${unitName}」はまだデータが少ないよ。じっくりモードで数問ためしてみよう🌱`;
  }
  return `「${unitName}」は苦手みたい（正答率${accTxt}）。ステップアップ／じっくりモードで基礎からゆっくり固めよう💪`;
}

/**
 * 章(単元)・小単元の理解度をまとめて返す（StatusDetail 用）。
 * @returns 章ごとに { chapter, units:[{unit, starSum, accuracy, attempts, understanding, comment, levels}] }
 */
export function buildStatusReport(chapters, player, records = []) {
  const stars = player?.stars || {};
  const accU = accuracyByUnit(records);
  const accUL = accuracyByUnitLevel(records);
  return chapters.map((ch) => {
    const units = ch.units.map((u) => {
      const a = accU[u.id];
      const attempts = a ? a.c + a.w : 0;
      const accuracy = attempts > 0 ? a.c / attempts : null;
      const starSum = unitStarSum(stars, u.id);
      const understanding = unitUnderstanding({ starSum, accuracy, attempts });
      const comment = aiComment({ unitName: u.name, band: understanding.band, accuracy, attempts, starSum });
      const levels = LEVEL_KEYS.map((l) => {
        const al = accUL[`${u.id}-${l}`];
        const at = al ? al.c + al.w : 0;
        return { level: l, stars: stars[`${u.id}-${l}`] || 0, accuracy: at > 0 ? al.c / at : null, attempts: at };
      });
      return { unit: u, starSum, accuracy, attempts, understanding, comment, levels };
    });
    return { chapter: ch, units };
  });
}
