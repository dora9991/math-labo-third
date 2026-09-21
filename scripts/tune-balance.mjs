// バランスの自動探索：テストプレイヤー(得意/普通/苦手)の「勝率」と「勝った時の最低HP」が目標に近づく数値を、ランダム探索で見つける。
//  使い方: node scripts/tune-balance.mjs [--iters 150] [--n 120]   結果は表示だけ（balance.js は手で反映する）。
import { ENEMY, GAUGE } from "../src/third/balance.js";
import { PARTIES, TIER_OF, evaluate } from "./playtest.mjs";
const iters = Number(process.argv[process.argv.indexOf("--iters") + 1]) || 150;
const N = Number(process.argv[process.argv.indexOf("--n") + 1]) || 120;
// 目標：{勝率, 勝った時の最低HP}（＝ハラハラするが、上手ければ勝てる）
const TARGET = { 得意: { win: 0.92, min: 0.4 }, 普通: { win: 0.72, min: 0.28 }, 苦手: { win: 0.45, min: 0.2 } };
const rnd = (a, b) => a + Math.random() * (b - a);
const KEYS = Object.keys(PARTIES);
function loss() {
  let L = 0; const detail = {};
  for (const name of Object.keys(TARGET)) for (const k of KEYS) {
    const r = evaluate(k, TIER_OF[k], name, N); (detail[name] ||= []).push(r);
    L += 2 * Math.abs(r.win - TARGET[name].win) + Math.abs(r.minHp - TARGET[name].min);
  }
  return { L, detail };
}
const cur = () => ({ mob: GAUGE.mob, boss: GAUGE.boss, ma: ENEMY.mobActionFrac, ba: ENEMY.bossActionFrac, dt: ENEMY.dmgPerTier, ht: ENEMY.hpPerTier, ed: ENEMY.earlyDmg, eg: GAUGE.early });
const apply = (p) => { GAUGE.mob = p.mob; GAUGE.boss = p.boss; ENEMY.mobActionFrac = p.ma; ENEMY.bossActionFrac = p.ba; ENEMY.dmgPerTier = p.dt; ENEMY.hpPerTier = p.ht; ENEMY.earlyDmg = p.ed; GAUGE.early = p.eg; };
// 制約（設計の意図）：ゲージは短め／ボスは雑魚より短く・強く／成長の伸びは現実的な範囲
const B = { mob: [16, 24], boss: [11, 20], ma: [0.04, 0.16], ba: [0.08, 0.35], dt: [2, 16], ht: [1, 6], ed: [0.2, 0.85], eg: [0, 12] };
const clamp = (v, [lo, hi]) => Math.max(lo, Math.min(hi, v));
const fix = (p) => { p.mob = Math.round(clamp(p.mob, B.mob)); p.boss = Math.round(clamp(Math.min(p.boss, p.mob - 2), B.boss)); p.ma = clamp(p.ma, B.ma); p.ba = clamp(Math.max(p.ba, p.ma * 1.5), B.ba); p.dt = clamp(p.dt, B.dt); p.ht = clamp(p.ht, B.ht); p.ed = clamp(p.ed, B.ed); p.eg = Math.round(clamp(p.eg, B.eg)); return p; };
let best = fix({ mob: 22, boss: 20, ma: 0.067, ba: 0.11, dt: 9, ht: 2.71, ed: 0.44, eg: 6 }); apply(best); let bl = loss().L; console.log("開始", JSON.stringify(best), bl.toFixed(2));
for (let i = 0; i < iters; i++) {
  const p = { ...best };
  const k = ["mob", "boss", "ma", "ba", "dt", "ht", "ed", "eg"][Math.floor(Math.random() * 8)];
  if (k === "mob") p.mob = best.mob + Math.round(rnd(-3, 3));
  if (k === "boss") p.boss = best.boss + Math.round(rnd(-3, 3));
  if (k === "ma") p.ma = best.ma * rnd(0.8, 1.25);
  if (k === "ba") p.ba = best.ba * rnd(0.8, 1.25);
  if (k === "dt") p.dt = best.dt * rnd(0.8, 1.25);
  if (k === "ht") p.ht = best.ht * rnd(0.85, 1.2);
  if (k === "ed") p.ed = best.ed * rnd(0.85, 1.18);
  if (k === "eg") p.eg = best.eg + Math.round(rnd(-2, 2));
  fix(p); apply(p); const { L } = loss();
  if (L < bl) { best = p; bl = L; if (i % 5 === 0) console.log(String(i).padStart(3), "改善", JSON.stringify({ ...best, ma: +best.ma.toFixed(3), ba: +best.ba.toFixed(3), dt: +best.dt.toFixed(2), ht: +best.ht.toFixed(2) }), L.toFixed(2)); }
}
console.log("\n最良:", JSON.stringify({ gaugeMob: best.mob, gaugeBoss: best.boss, mobActionFrac: +best.ma.toFixed(3), bossActionFrac: +best.ba.toFixed(3), dmgPerTier: +best.dt.toFixed(2), hpPerTier: +best.ht.toFixed(2), earlyDmg: +best.ed.toFixed(2), earlyGauge: best.eg, loss: +bl.toFixed(2) }));
