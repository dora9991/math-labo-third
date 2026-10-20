// 裏ボス（推奨Lv30〜90）の HP・ダメージを、シミュレーションで決める。 使い方: node scripts/calibrate-secret.mjs
//  基準の編成：Lv50まで＝SR×5、Lv60・70＝UR×5、Lv80＝UR×5(凸2)、Lv90＝UR×5(凸3)。「普通」の生徒がその編成のLvで約45％勝つように、敵の1回の攻撃の強さを決める。
//  HP＝「その編成が普通で K 回正解して倒せる量」。K が大きいほど、長く戦う（＝たくさん解く）。
import { SPECIALIST_ROSTER } from "../src/third/specialistRoster.js";
import { computePartyMaxHp, resolvePlayerAttack, resolveEnemyAction } from "../src/third/battleEngine.js";
import { gaugeBaseSeconds, DIFFICULTIES, capDamageFor } from "../src/third/balance.js";

const by = Object.fromEntries(SPECIALIST_ROSTER.map((c) => [c.id, c]));
const set = (r, breaks = 0) => ["sp_calc_a", "sp_calc_b", "sp_calc_c", "sp_eq_c", "sp_func_c"].map((k) => ({ ...by[`${k}_${r}`], breaks }));
const students = {
  得意: { p: { easy: 0.98, standard: 0.93, advanced: 0.82, oni: 0.6 }, t: { easy: 5, standard: 8, advanced: 13, oni: 20 }, pick: "advanced" },
  普通: { p: { easy: 0.93, standard: 0.75, advanced: 0.5, oni: 0.25 }, t: { easy: 7, standard: 12, advanced: 19, oni: 28 }, pick: "standard" },
};
const jit = (x) => x * (0.75 + Math.random() * 0.5);
const LEVELS = [30, 40, 50, 60, 70, 80, 90];
export const refParty = (L) => (L <= 50 ? { members: set("sr"), lv: L } : L <= 70 ? { members: set("ur"), lv: L } : { members: set("ur", L === 80 ? 2 : 3), lv: 70 });
export const K_OF = (L) => Math.round(25 + ((L - 30) / 60) * 20); // 普通で何回正解すれば倒せるか（25〜45回＝1戦およそ5〜9分）

function fight(members, lv, boss0, st) {
  const partyMax = computePartyMaxHp(members, () => lv);
  const boss = { ...boss0 }; const gmax = gaugeBaseSeconds(true, 1);
  let hp = partyMax, gauge = gmax;
  const act = () => { hp -= resolveEnemyAction(boss); gauge += gmax; return hp <= 0; };
  while (boss.hp > 0) {
    const d = st.pick; gauge -= jit(st.t[d]);
    while (gauge <= 0) if (act()) return false;
    if (Math.random() < st.p[d]) {
      let raw = 0; for (const c of members) raw += resolvePlayerAttack(c, lv, "calc", true).damage * DIFFICULTIES[d].dmgMult;
      boss.hp = Math.max(0, boss.hp - Math.min(Math.round(raw), capDamageFor(boss.maxHp, d)));
    } else { gauge -= gmax / 2; while (gauge <= 0) if (act()) return false; }
  }
  return true;
}
const winRate = (members, lv, boss, st, N = 600) => { let w = 0; for (let i = 0; i < N; i++) if (fight(members, lv, boss, st)) w++; return w / N; };

export function calibrate(L, target = 0.45, minHp = 0) {
  const { members, lv } = refParty(L);
  const partyMax = computePartyMaxHp(members, () => lv);
  let per = 0; for (const c of members) per += resolvePlayerAttack(c, lv, "calc", true).damage; // 標準1回の正解での合計ダメージ（分散は平均で吸収）
  const hp = Math.max(minHp, Math.round(per * K_OF(L))); // 前のボスより必ず高いHPにする
  let lo = 0.01, hi = 1.0; // 1回の攻撃＝パーティ最大HPの割合
  for (let i = 0; i < 14; i++) {
    const f = (lo + hi) / 2; const boss = { hp, maxHp: hp, dmg: Math.round(partyMax * f) };
    if (winRate(members, lv, boss, students.普通) > target) lo = f; else hi = f;
  }
  const f = (lo + hi) / 2, boss = { hp, maxHp: hp, dmg: Math.round(partyMax * f) };
  return { L, hp, dmg: boss.dmg, frac: f, k: K_OF(L), partyMax, win: { 得意: winRate(members, lv, boss, students.得意, 800), 普通: winRate(members, lv, boss, students.普通, 800) } };
}
if (process.argv[1].endsWith("calibrate-secret.mjs")) {
  let prev = 0; const out = [];
  for (const L of LEVELS) { const r = calibrate(L, 0.45, Math.round(prev * 1.12)); prev = r.hp; out.push({ L, hp: r.hp, dmg: r.dmg }); console.log(`Lv${L}: HP ${r.hp}  1回の攻撃 ${r.dmg}（パーティHPの${(r.frac * 100).toFixed(1)}%） K=${r.k}  勝率 得意${(r.win.得意 * 100).toFixed(0)}% 普通${(r.win.普通 * 100).toFixed(0)}%`); }
  console.log(JSON.stringify(out));
}
