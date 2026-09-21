// テストプレイヤー（自動プレイ）：得意・普通・苦手の3タイプが、実際の戦闘ロジックに近い形で遊んで、
//  「勝てるか」「ハラハラするか（HPが減る・ピンチから逆転）」を数える。  使い方: node scripts/playtest.mjs [--n 600] [--quiet]
//  実際のゲームと同じ関数（ダメージ・スキル・状態異常・ダメージ上限・ゲージ）を使う。数値は balance.js を直接参照する
//  （このスクリプト内で GAUGE / ENEMY を書き換えて、調整案を試すこともできる）。
import { SPECIALIST_ROSTER } from "../src/third/specialistRoster.js";
import {
  computePartyMaxHp, resolvePlayerAttack, spawnEnemyGroup, spawnBoss, resolveEnemyAction,
  rollEnemyInflictedStatus, applyStatusEffect, tickStatusEffects, cureStatusEffects,
  canActThisRound, canUseSkillThisRound, isConfusedThisRound, isPartyAllPetrified, STATUS_DEFS,
} from "../src/third/battleEngine.js";
import { GAUGE, gaugeBaseSeconds as gaugeSecondsFor, WRONG_PENALTY_SECONDS, DIFFICULTIES, capDamageFor, SKILL_CAP_FRAC } from "../src/third/balance.js";

export const SKILL_GAUGE_MAX = 4;
const by = Object.fromEntries(SPECIALIST_ROSTER.map((c) => [c.id, c]));
const P = (ids) => ids.map((i) => ({ ...by[i], breaks: 0 }));
const set = (r) => P([`sp_calc_a_${r}`, `sp_calc_b_${r}`, `sp_calc_c_${r}`, `sp_eq_c_${r}`, `sp_func_c_${r}`]); // 全体・単体・攻撃バフ・防御バフ・回復
export const PARTIES = {
  "P0 初期(N全体×5) Lv1": [P(["sp_calc_a_n", "sp_eq_a_n", "sp_func_a_n", "sp_geo_a_n", "sp_data_a_n"]), 1],
  "P1 N編成 Lv15": [set("n"), 15],
  "P2 R編成 Lv30": [set("r"), 30],
  "P3 SR編成 Lv45": [set("sr"), 45],
  "P4 UR編成 Lv60": [set("ur"), 60],
};
// 「今のレベルに合った」敵の位置(tier)
export const TIER_OF = { "P0 初期(N全体×5) Lv1": 0.0, "P1 N編成 Lv15": 0.2, "P2 R編成 Lv30": 0.45, "P3 SR編成 Lv45": 0.7, "P4 UR編成 Lv60": 0.95 };

// 生徒タイプ：難度ごとの正答率(p)と1問にかかる秒数(t)。skill＝スキルを的確に使える確率
export const PLAYERS = {
  得意: { p: { easy: 0.98, standard: 0.93, advanced: 0.82, oni: 0.6 }, t: { easy: 5, standard: 8, advanced: 13, oni: 20 }, skill: 0.95, healAt: 0.55 },
  普通: { p: { easy: 0.93, standard: 0.75, advanced: 0.5, oni: 0.25 }, t: { easy: 7, standard: 12, advanced: 19, oni: 28 }, skill: 0.8, healAt: 0.45 },
  苦手: { p: { easy: 0.8, standard: 0.5, advanced: 0.25, oni: 0.08 }, t: { easy: 11, standard: 19, advanced: 28, oni: 36 }, skill: 0.5, healAt: 0.35 },
};
const jit = (x) => x * (0.75 + Math.random() * 0.5);

// 難度の選び方：ゲージと残りHPを見て、余裕があれば難しく、ピンチなら簡単に
function pickDifficulty(pl, name, gauge, hpFrac) {
  if (name === "得意") { if (gauge < 9 || hpFrac < 0.3) return "standard"; if (gauge > 18 && hpFrac > 0.6) return "oni"; return "advanced"; }
  if (name === "普通") { if (gauge < 12 || hpFrac < 0.35) return "easy"; if (gauge > 22 && hpFrac > 0.7) return "advanced"; return "standard"; }
  if (gauge > 24 && hpFrac > 0.75) return "standard"; return "easy";
}

export function battle({ members, level, tier, name, opts = {} }) {
  const pl = PLAYERS[name];
  const partyMax = computePartyMaxHp(members, () => level);
  const ids = members.map((c) => c.id);
  let hp = partyMax, status = {}, buffs = { atk: null, guard: null }, hot = null;
  const sg = Object.fromEntries(ids.map((i) => [i, 0]));
  let time = 0, actions = 0, answers = 0, skillUses = 0, minHp = 1, panic = 0, statusHits = 0;
  const waves = [
    () => { const n = 1 + Math.floor(Math.random() * 3); return Array.from({ length: n }, (_, i) => spawnEnemyGroup({ id: "m" }, i, n, tier)); },
    () => { const n = 1 + Math.floor(Math.random() * 3); return Array.from({ length: n }, (_, i) => spawnEnemyGroup({ id: "m" }, i, n, tier)); },
    () => [spawnBoss({ id: "b", kind: "unitSmallBoss" }, tier)],
  ];
  const track = () => { minHp = Math.min(minHp, hp / partyMax); };

  function cycle(enemies) {
    const pool = enemies.filter((e) => e.hp > 0);
    const guard = buffs.guard?.multiplier ?? 1;
    let downed = false;
    for (const e of pool) {
      hp = Math.max(0, hp - Math.round(resolveEnemyAction(e) * guard));
      const elig = ids.filter((id) => !status[id]?.petrification);
      if (elig.length) {
        const tid = elig[Math.floor(Math.random() * elig.length)];
        const key = rollEnemyInflictedStatus(members.find((m) => m.id === tid));
        if (key) { status = applyStatusEffect(status, tid, key); statusHits++; if (isPartyAllPetrified(status, ids)) downed = true; }
      }
      if (hp <= 0 || downed) break;
    }
    actions++;
    const tk = (b) => (b && b.turnsLeft > 1 ? { ...b, turnsLeft: b.turnsLeft - 1 } : null);
    buffs = { atk: tk(buffs.atk), guard: tk(buffs.guard) };
    const t = tickStatusEffects(status, partyMax); status = t.statusByCharId; hp = Math.max(0, hp - t.poisonDamage);
    if (hot && hot.left > 0) { hp = Math.min(partyMax, hp + hot.amount); hot = { ...hot, left: hot.left - 1 }; }
    track();
    return hp <= 0 || downed || isPartyAllPetrified(status, ids);
  }

  function useSkills(enemies, gauge) {
    let spent = 0;
    for (const c of members) {
      if (!c.skill || sg[c.id] < SKILL_GAUGE_MAX) continue;
      const ef = status[c.id];
      if (!canActThisRound(ef) || !canUseSkillThisRound(ef)) continue;
      const sk = c.skill, live = enemies.filter((e) => e.hp > 0);
      if (!live.length || Math.random() > pl.skill) continue;
      const hpF = hp / partyMax;
      let use = false;
      if (sk.category === "heal") use = hpF < pl.healAt;
      else if (sk.category === "buffGuard") use = !buffs.guard && hpF < 0.85;
      else if (sk.category === "buffAtk") use = !buffs.atk;
      else if (sk.category === "cure") use = Object.keys(status).length > 0;
      else use = true; // ダメージ系はたまったら撃つ
      if (!use) continue;
      sg[c.id] = 0; skillUses++; spent += 1.4; // タップ＋確認ダイアログ
      if (sk.category === "aoeDamage" || sk.category === "singleDamage") {
        const targets = sk.category === "aoeDamage" ? live : [live.slice().sort((a, b) => b.hp - a.hp)[0]];
        for (const e of targets) {
          const r = resolvePlayerAttack(c, level, "calc", true, { skillMultiplier: sk.multiplier, atkBuffMultiplier: buffs.atk?.multiplier ?? 1 });
          e.hp = Math.max(0, e.hp - Math.min(r.damage, Math.round(e.maxHp * SKILL_CAP_FRAC)));
        }
      } else if (sk.category === "buffAtk") buffs.atk = { multiplier: sk.multiplier, turnsLeft: sk.duration };
      else if (sk.category === "buffGuard") buffs.guard = { multiplier: sk.multiplier, turnsLeft: sk.duration };
      else if (sk.category === "heal") { const amt = Math.round(partyMax * sk.percent); hp = Math.min(partyMax, hp + amt); if (sk.mode === "hot") hot = { left: (sk.duration || 3) - 1, amount: amt }; }
      else if (sk.category === "cure") status = cureStatusEffects(status, sk.cures);
    }
    return spent;
  }

  for (let w = 0; w < 3; w++) {
    const enemies = waves[w]();
    const gmax = gaugeSecondsFor(w === 2, tier);
    let gauge = gmax;
    while (enemies.some((e) => e.hp > 0)) {
      const spent = useSkills(enemies, gauge); gauge -= spent; time += spent;
      if (!enemies.some((e) => e.hp > 0)) break; // スキルで全滅させた
      const hpF = hp / partyMax;
      const d = pickDifficulty(pl, name, gauge, hpF);
      const t = jit(pl.t[d]); time += t; gauge -= t;
      if (gauge < 6) panic++; // ゲージが残りわずかの時に答えている＝ハラハラ
      while (gauge <= 0) { if (cycle(enemies)) return res(false); gauge += gmax; }
      answers++;
      if (Math.random() < pl.p[d]) {
        const alive = enemies.filter((e) => e.hp > 0), dmgBy = new Map(alive.map((e) => [e, 0]));
        members.forEach((c, i) => {
          if (!canActThisRound(status[c.id])) return;
          sg[c.id] = Math.min(SKILL_GAUGE_MAX, sg[c.id] + 1);
          const r = resolvePlayerAttack(c, level, "calc", true, { atkBuffMultiplier: buffs.atk?.multiplier ?? 1 });
          if (isConfusedThisRound(status[c.id])) { hp = Math.max(0, hp - Math.round(r.damage * STATUS_DEFS.confusion.damageFraction)); return; }
          const e = alive[i % alive.length]; dmgBy.set(e, dmgBy.get(e) + r.damage * DIFFICULTIES[d].dmgMult);
        });
        for (const [e, raw] of dmgBy) e.hp = Math.max(0, e.hp - Math.min(Math.round(raw), capDamageFor(e.maxHp, d)));
        track(); if (hp <= 0) return res(false);
      } else {
        gauge -= WRONG_PENALTY_SECONDS;
        while (gauge <= 0) { if (cycle(enemies)) return res(false); gauge += gmax; }
      }
    }
  }
  return res(true);
  function res(win) { return { win, minHp: win ? minHp : 0, time, actions, answers, skillUses, panic, statusHits }; }
}

export function evaluate(partyKey, tier, name, N = 500) {
  const [members, level] = PARTIES[partyKey];
  let win = 0, min = 0, close = 0, time = 0, act = 0, sk = 0, panic = 0, ans = 0, st = 0;
  for (let i = 0; i < N; i++) {
    const r = battle({ members, level, tier, name });
    if (r.win) { win++; min += r.minHp; if (r.minHp < 0.25) close++; }
    time += r.time; act += r.actions; sk += r.skillUses; panic += r.panic; ans += r.answers; st += r.statusHits;
  }
  return { win: win / N, minHp: win ? min / win : 0, close: win ? close / win : 0, time: time / N, act: act / N, sk: sk / N, panic: panic / N, ans: ans / N, st: st / N };
}

const pct = (x) => String(Math.round(x * 100)).padStart(3) + "%";
export function report(N = 500, quiet = false) {
  const rows = {};
  console.log(`\nゲージ 雑魚${GAUGE.mob}秒/ボス${GAUGE.boss}秒（序盤+${GAUGE.early}秒）`);
  for (const name of Object.keys(PLAYERS)) {
    if (!quiet) console.log(`\n■ ${name}（今のレベルに合った敵と戦う）`);
    rows[name] = [];
    for (const key of Object.keys(PARTIES)) {
      const r = evaluate(key, TIER_OF[key], name, N); rows[name].push(r);
      if (!quiet) console.log(`${key.padEnd(20)} 勝${pct(r.win)}  勝った時の最低HP平均${pct(r.minHp)}  ピンチ勝ち(HP25%未満)${pct(r.close)}  戦闘${r.time.toFixed(0).padStart(3)}秒  敵の行動${r.act.toFixed(1)}回  スキル${r.sk.toFixed(1)}回  焦り${r.panic.toFixed(1)}回  状態異常${r.st.toFixed(1)}回`);
    }
  }
  return rows;
}
if ((process.argv[1] || "").endsWith("playtest.mjs")) {
  const n = Number(process.argv[process.argv.indexOf("--n") + 1]) || 400;
  report(n, process.argv.includes("--quiet"));
}
