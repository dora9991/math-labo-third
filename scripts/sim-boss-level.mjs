// 1体のボスを、Lv●の育成済みパーティが倒せるか（勝率）を調べる。「推奨レベル」＝普通の生徒が約半分勝てるレベル。
//  使い方: node scripts/sim-boss-level.mjs [kind=finalBoss] [tier=1] [hpMul=1] [dmgMul=1] [breaks=0]
//  スキル・状態異常は含めない＝実際よりやや厳しめの見積り（スキルを使うと少し楽になる）。
import { SPECIALIST_ROSTER } from "../src/third/specialistRoster.js";
import { computePartyMaxHp, resolvePlayerAttack, spawnBoss, resolveEnemyAction } from "../src/third/battleEngine.js";
import { gaugeBaseSeconds, DIFFICULTIES, capDamageFor } from "../src/third/balance.js";
import { getLevelCap } from "../src/third/growthCurve.js";

const by = Object.fromEntries(SPECIALIST_ROSTER.map((c) => [c.id, c]));
const set = (r, breaks = 0) => ["sp_calc_a", "sp_calc_b", "sp_calc_c", "sp_eq_c", "sp_func_c"].map((k) => ({ ...by[`${k}_${r}`], breaks }));
const students = {
  得意: { p: { easy: 0.98, standard: 0.93, advanced: 0.82, oni: 0.6 }, t: { easy: 5, standard: 8, advanced: 13, oni: 20 }, pick: "advanced" },
  普通: { p: { easy: 0.93, standard: 0.75, advanced: 0.5, oni: 0.25 }, t: { easy: 7, standard: 12, advanced: 19, oni: 28 }, pick: "standard" },
};
const jit = (x) => x * (0.75 + Math.random() * 0.5);
export function fight({ members, level, kind, tier, hpMul = 1, dmgMul = 1, st }) {
  const partyMax = computePartyMaxHp(members, () => level);
  const boss = spawnBoss({ id: "b", kind }, tier); boss.hp = boss.maxHp = Math.round(boss.hp * hpMul); boss.dmg = Math.round(boss.dmg * dmgMul);
  const gmax = gaugeBaseSeconds(true, tier);
  let hp = partyMax, gauge = gmax, answers = 0;
  while (boss.hp > 0) {
    const d = st.pick;
    gauge -= jit(st.t[d]);
    while (gauge <= 0) { hp -= resolveEnemyAction(boss); gauge += gmax; if (hp <= 0) return { win: false, answers }; }
    answers++;
    if (Math.random() < st.p[d]) {
      let raw = 0; for (const c of members) raw += resolvePlayerAttack(c, level, "calc", true).damage * DIFFICULTIES[d].dmgMult;
      boss.hp = Math.max(0, boss.hp - Math.min(Math.round(raw), capDamageFor(boss.maxHp, d)));
    } else { gauge -= gmax / 2; /* 不正解＝ゲージの半分が進む(2026-09-26の仕様) */ while (gauge <= 0) { hp -= resolveEnemyAction(boss); gauge += gmax; if (hp <= 0) return { win: false, answers }; } }
  }
  return { win: hp > 0, answers };
}
if (process.argv[1].endsWith("sim-boss-level.mjs")) {
  const [kind = "finalBoss", tier = "1", hpMul = "1", dmgMul = "1", breaks = "0"] = process.argv.slice(2);
  const N = 1500;
  console.log(`kind=${kind} tier=${tier} HP×${hpMul} ダメ×${dmgMul} 凸${breaks}`);
  for (const r of ["n", "r", "sr", "ur"]) {
    const cap = getLevelCap(r.toUpperCase());
    const levels = [1, 10, 21, 30, 40, 50, 60, 70].filter((l) => l <= cap);
    for (const [sn, st] of Object.entries(students)) {
      const row = levels.map((lv) => { let w = 0; for (let i = 0; i < N; i++) if (fight({ members: set(r, Number(breaks)), level: lv, kind, tier: Number(tier), hpMul: Number(hpMul), dmgMul: Number(dmgMul), st }).win) w++; return `Lv${lv}:${String(Math.round((w / N) * 100)).padStart(3)}%`; });
      console.log(r.toUpperCase().padEnd(3), sn, row.join("  "));
    }
  }
}
