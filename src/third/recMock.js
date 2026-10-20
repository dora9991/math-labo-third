// ============================================================
// recMock.js — 【開発用】「今日のおすすめ」「わたしの理解度」の見た目を確かめるための架空の解答履歴。
//  開発サーバーで URL に ?recMock=weak（苦手）/ avg（ふつう）/ strong（得意）を付けたときだけ使う（本番のビルドには入らない）。
// ============================================================
import { summarizeAttempts, summarizeTags } from "./learnerProfile.js";

const DAY = 86400000;
function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

// [単元, 何日前, [[難易度, 問題数, 本当の正答率], ...]]
const PLANS = {
  weak: [
    ["u1", 20, [["easy", 10, 0.9], ["standard", 8, 0.7]]],
    ["u2", 18, [["easy", 10, 0.7], ["standard", 8, 0.45]]],
    ["u3", 12, [["easy", 10, 0.45], ["standard", 8, 0.25]]],
    ["u4", 9, [["easy", 8, 0.8], ["standard", 6, 0.6]]],
    ["u5", 5, [["easy", 8, 0.4], ["standard", 6, 0.2]]],
    ["v1", 3, [["easy", 8, 0.75], ["standard", 6, 0.5]]],
    ["v3", 1, [["easy", 8, 0.35], ["standard", 6, 0.15]]],
  ],
  avg: [
    ["u1", 30, [["easy", 8, 0.95], ["standard", 10, 0.85]]],
    ["u2", 28, [["standard", 12, 0.8], ["advanced", 5, 0.5]]],
    ["u3", 26, [["standard", 12, 0.75]]],
    ["u4", 21, [["standard", 10, 0.7], ["advanced", 4, 0.4]]],
    ["u5", 14, [["standard", 10, 0.6]]],
    ["v1", 8, [["standard", 10, 0.85]]],
    ["v2", 6, [["easy", 6, 0.8], ["standard", 10, 0.45]]],
    ["v3", 2, [["standard", 10, 0.7]]],
  ],
  strong: [
    ["u1", 40, [["standard", 10, 1], ["advanced", 10, 0.9]]],
    ["u2", 38, [["advanced", 12, 0.9], ["oni", 4, 0.5]]],
    ["u3", 35, [["advanced", 12, 0.85]]],
    ["u4", 30, [["advanced", 10, 0.9], ["oni", 5, 0.6]]],
    ["u5", 20, [["advanced", 10, 0.8]]],
    ["u6", 15, [["standard", 10, 0.95], ["advanced", 6, 0.8]]],
    ["v1", 6, [["advanced", 10, 0.9]]],
    ["v2", 4, [["advanced", 10, 0.85]]],
    ["v3", 2, [["standard", 8, 0.95], ["advanced", 8, 0.8]]],
  ],
};

export function mockLearnProfile(kind = "avg") {
  const plan = PLANS[kind] || PLANS.avg;
  const r = rng(kind.length * 7919 + 17);
  const now = Date.now();
  const rows = [];
  for (const [unitId, daysAgo, spec] of plan) {
    let k = 0;
    for (const [level, n, p] of spec) for (let i = 0; i < n; i++) rows.push({ unit_id: unitId, difficulty: level, ok: r() < p, created_at: new Date(now - daysAgo * DAY + (k++) * 60000).toISOString() });
  }
  const tags = kind === "weak" ? [...Array(3)].map(() => ({ unit_id: "v3", mistake_tag: "coef-sign" })) : [];
  return { ok: true, source: "server", units: summarizeAttempts(rows), tags: summarizeTags(tags), now, mock: kind };
}
