// 30秒ゲージ方式のバランス確認用シミュレーション（node scripts/sim-gauge-battle.mjs [tier]）
//  1バトル＝雑魚の波2回(1〜3体)＋ボス。状態異常・スキルは含めない（＝実際よりやや楽な見積り）。
import { SPECIALIST_ROSTER } from "../src/third/specialistRoster.js";
import { computePartyMaxHp, resolvePlayerAttack, spawnEnemyGroup, spawnBoss, resolveEnemyAction } from "../src/third/battleEngine.js";
import { GAUGE_SECONDS, WRONG_PENALTY_SECONDS, DIFFICULTIES, capDamageFor } from "../src/third/balance.js";

const by = Object.fromEntries(SPECIALIST_ROSTER.map((c) => [c.id, c]));
const P = (ids) => ids.map((i) => by[i]);
const parties = {
  "初期N×5 Lv1": [P(["sp_calc_a_n", "sp_eq_a_n", "sp_func_a_n", "sp_geo_a_n", "sp_data_a_n"]), 1],
  "N×5 Lv30": [P(["sp_calc_a_n", "sp_eq_a_n", "sp_func_a_n", "sp_geo_a_n", "sp_data_a_n"]), 30],
  "SR×5 Lv50": [P(["sp_calc_a_sr", "sp_calc_b_sr", "sp_eq_a_sr", "sp_func_a_sr", "sp_geo_b_sr"]), 50],
  "UR×5 Lv70": [P(["sp_calc_a_ur", "sp_calc_b_ur", "sp_calc_c_ur", "sp_eq_c_ur", "sp_func_c_ur"]), 70],
};
// 生徒モデル：難度ごとの正答率と1問にかかる秒数、選ぶ難度
const students = {
  得意: { p: { easy: 0.98, standard: 0.93, advanced: 0.8, oni: 0.55 }, t: { easy: 5, standard: 9, advanced: 15, oni: 24 }, pick: "advanced" },
  ふつう: { p: { easy: 0.93, standard: 0.75, advanced: 0.45, oni: 0.2 }, t: { easy: 8, standard: 14, advanced: 22, oni: 32 }, pick: "standard" },
  苦手: { p: { easy: 0.8, standard: 0.45, advanced: 0.2, oni: 0.05 }, t: { easy: 12, standard: 22, advanced: 32, oni: 40 }, pick: "easy" },
};
const jit = (x) => x * (0.75 + Math.random() * 0.5);

function battle(members, level, st, tier) {
  const partyMax = computePartyMaxHp(members, () => level);
  let hp = partyMax, answers = 0, actions = 0, gauge = GAUGE_SECONDS;
  const waves = [
    Array.from({ length: 1 + Math.floor(Math.random() * 3) }, (_, i, a) => null),
    Array.from({ length: 1 + Math.floor(Math.random() * 3) }, () => null),
    null,
  ];
  for (let w = 0; w < 3; w++) {
    let enemies;
    if (w < 2) { const n = waves[w].length; enemies = waves[w].map((_, i) => spawnEnemyGroup({ id: "m" }, i, n, tier)); }
    else enemies = [spawnBoss({ id: "b", kind: "unitSmallBoss" }, tier)];
    const cycle = () => { for (const e of enemies) if (e.hp > 0) hp -= resolveEnemyAction(e); actions++; };
    while (enemies.some((e) => e.hp > 0)) {
      if (hp <= 0) return { win: false, answers, actions, hpLeft: 0 };
      const d = st.pick;
      gauge -= jit(st.t[d]);
      while (gauge <= 0) { cycle(); gauge += GAUGE_SECONDS; if (hp <= 0) return { win: false, answers, actions, hpLeft: 0 }; }
      answers++;
      if (Math.random() < st.p[d]) {
        const alive = enemies.filter((e) => e.hp > 0);
        const dmgBy = new Map(alive.map((e) => [e, 0]));
        members.forEach((c, i) => {
          const e = alive[i % alive.length];
          dmgBy.set(e, dmgBy.get(e) + resolvePlayerAttack(c, level, "calc", true).damage * DIFFICULTIES[d].dmgMult);
        });
        for (const [e, raw] of dmgBy) e.hp = Math.max(0, e.hp - Math.min(Math.round(raw), capDamageFor(e.maxHp, d)));
      } else {
        gauge -= WRONG_PENALTY_SECONDS;
        while (gauge <= 0) { cycle(); gauge += GAUGE_SECONDS; if (hp <= 0) return { win: false, answers, actions, hpLeft: 0 }; }
      }
    }
    if (hp <= 0) return { win: false, answers, actions, hpLeft: 0 };
    gauge = GAUGE_SECONDS;
  }
  return { win: hp > 0, answers, actions, hpLeft: Math.max(0, hp) / partyMax };
}

const tier = Number(process.argv[2] ?? 0);
const N = 3000;
console.log(`tier=${tier}（0=中1の最初〜1=中3の最後）`);
for (const [pn, [members, lv]] of Object.entries(parties)) {
  const line = [];
  for (const [sn, st] of Object.entries(students)) {
    let win = 0, ans = 0, act = 0, left = 0;
    for (let i = 0; i < N; i++) { const r = battle(members, lv, st, tier); if (r.win) { win++; left += r.hpLeft; } ans += r.answers; act += r.actions; }
    line.push(`${sn}(${st.pick.slice(0, 3)}) 勝${String((win / N * 100).toFixed(0)).padStart(3)}% 残HP${win ? (left / win * 100).toFixed(0) : "-"}% ${(ans / N).toFixed(0)}問 敵${(act / N).toFixed(1)}回`);
  }
  console.log(pn.padEnd(12), line.join(" │ "));
}
