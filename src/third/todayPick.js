// ============================================================
// todayPick.js — 「今日のおすすめ」1つを選ぶ（メニューから階層を飛ばして練習を始めるため）。
//  優先順：①先生の小テストで見つかった苦手 → ②最近まちがえた単元 → ③れんしゅうメダルが未取得の最初の単元 → ④最初の単元
// ============================================================
import { unitMedals } from "./medals.js";

export function pickToday({ chapters = [], medalState, mistakes = [], quizWeakUnits = [] }) {
  const flat = chapters.flatMap((c) => (c.units || []).map((u) => ({ chapter: c, unit: u })));
  if (flat.length === 0) return null;
  const find = (id) => flat.find((x) => x.unit.id === id);

  for (const w of quizWeakUnits) {
    const hit = find(w.unitId);
    if (hit) return { ...hit, reason: "小テストで苦手が見つかったよ" };
  }

  const count = {};
  for (const m of mistakes) if (m?.unitId && find(m.unitId)) count[m.unitId] = (count[m.unitId] || 0) + 1;
  const top = Object.entries(count).sort((a, b) => b[1] - a[1])[0];
  if (top) return { ...find(top[0]), reason: "最近まちがえた問題をやりなおそう" };

  const next = flat.find((x) => !unitMedals(medalState, x.unit.id).practice);
  if (next) return { ...next, reason: "つぎに進む単元だよ" };

  return { ...flat[0], reason: "ふくしゅうしよう" };
}
