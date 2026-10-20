// テストプレイヤー（2026-09-26版）：今の戦闘ルールを、実際の関数で再現して、たくさん遊んで勝率などを出す。
//  再現するもの：ゲージ（不正解で半分進む）・雑魚の「状態異常＋ダメージ」攻撃・ボスの技のパターン・5種類の状態異常と耐性・4種類のスキル（ゲージ数はスキルごと）。
//  使い方: node scripts/playtest2.mjs [--n 300] [--only 小単元|章ボス|裏ボス]
import { SPECIALIST_ROSTER } from "../src/third/specialistRoster.js";
import { STARTER_PARTY } from "../src/third/gachaConfig.js";
import {
  computePartyMaxHp, resolvePlayerAttack, spawnEnemyGroup, spawnBoss, resolveEnemyAction, rollEnemyInflictedStatus, rollStatusInflict, applyStatusEffect,
  tickStatusEffects, cureStatusEffects, canActThisRound, canUseSkillThisRound, isConfusedThisRound, isPartyAllPetrified, STATUS_DEFS, STATUS_KEYS,
} from "../src/third/battleEngine.js";
import { mobAttack, nextBossMove, isBossKind, BOSS_STATUS_BONUS } from "../src/third/enemyMoves.js";
import { gaugeBaseSeconds, DIFFICULTIES, capDamageFor, SKILL_CAP_FRAC, wrongPenaltyFrac, STATUS_TUNING } from "../src/third/balance.js";
import { secretLadder } from "../src/third/secretBoss.js";

const by = Object.fromEntries(SPECIALIST_ROSTER.map((c) => [c.id, c]));
const pure = (r, cat, nth = 0) => SPECIALIST_ROSTER.filter((c) => c.rarity === r && c.id.startsWith("sp_") && c.skill.category === cat)[nth];
const team = (r, breaks = 0) => [pure(r, "aoeDamage"), pure(r, "singleDamage"), pure(r, "singleDamage", 1), pure(r, "heal"), pure(r, "cure")].map((c) => ({ ...c, breaks }));
export const PARTIES = {
  "初期N×5 Lv1": [STARTER_PARTY.map((id) => ({ ...by[id], breaks: 0 })), 1],
  "N編成 Lv21": [team("N"), 21],
  "N編成 Lv30": [team("N"), 30],
  "R編成 Lv21": [team("R"), 21],
  "R編成 Lv40": [team("R"), 40],
  "SR編成 Lv21": [team("SR"), 21],
  "SR編成 Lv50": [team("SR"), 50],
  "UR編成 Lv21": [team("UR"), 21],
  "UR編成 Lv70": [team("UR"), 70],
  "UR凸3 Lv70": [team("UR", 3), 70],
};
export const PLAYERS = {
  得意: { p: { easy: 0.98, standard: 0.93, advanced: 0.82, oni: 0.6 }, t: { easy: 5, standard: 8, advanced: 13, oni: 20 }, skill: 0.95, healAt: 0.55 },
  普通: { p: { easy: 0.93, standard: 0.75, advanced: 0.5, oni: 0.25 }, t: { easy: 7, standard: 12, advanced: 19, oni: 28 }, skill: 0.8, healAt: 0.45 },
  苦手: { p: { easy: 0.8, standard: 0.5, advanced: 0.25, oni: 0.08 }, t: { easy: 11, standard: 19, advanced: 28, oni: 36 }, skill: 0.5, healAt: 0.35 },
};
const jit = (x) => x * (0.75 + Math.random() * 0.5);
const GAUGE_BY_TIER = { 1: 6, 2: 9, 3: 12, 4: 15 };
const gaugeMaxOf = (c) => c.skill.gauge || GAUGE_BY_TIER[c.skill.tier] || 6;
function pickDifficulty(name, gauge, hpFrac) {
  if (name === "得意") { if (gauge < 9 || hpFrac < 0.3) return "standard"; if (gauge > 18 && hpFrac > 0.6) return "oni"; return "advanced"; }
  if (name === "普通") { if (gauge < 12 || hpFrac < 0.35) return "easy"; if (gauge > 22 && hpFrac > 0.7) return "advanced"; return "standard"; }
  if (gauge > 24 && hpFrac > 0.75) return "standard"; return "easy";
}

/** 1回のバトル。encounters＝波の配列（各波は敵の配列）。 tier＝ゲージの序盤補正用。 */
export function battle({ members, level, waves, tier, name, levels = null }) {
  const lvOf = (c) => levels?.[c.id] ?? level; // 仲間ごとのレベル（playtest-journey.mjs 用。無ければ全員 level）
  const pl = PLAYERS[name];
  const partyMax = computePartyMaxHp(members, lvOf);
  const ids = members.map((c) => c.id);
  let hp = partyMax, status = {}, time = 0, actions = 0, answers = 0, skillUses = 0, minHp = 1, statusHits = 0, panic = 0;
  const sg = Object.fromEntries(ids.map((i) => [i, 0]));
  const bossState = {};
  const track = () => { minHp = Math.min(minHp, hp / partyMax); };
  const eligible = () => ids.filter((id) => !status[id]?.petrification);

  function inflict(n, key, bonus, combo = null) {
    const pool = eligible().sort(() => Math.random() - 0.5).slice(0, n);
    for (const id of pool) {
      const m = members.find((x) => x.id === id);
      if (combo) { for (const k of combo) if (rollStatusInflict(k, m, bonus)) { status = applyStatusEffect(status, id, k); statusHits++; } continue; } // 裏ボス：複数の状態異常を同時に（ThirdBattle と同じ）
      const k = rollEnemyInflictedStatus(m, { statusKey: key, bonus }); if (k) { status = applyStatusEffect(status, id, k); statusHits++; }
    }
  }
  function cycle(enemies) {
    let downed = false;
    for (const e of enemies.filter((x) => x.hp > 0)) {
      let mul = 1, statusN = 0, key = null, bonus = 0, charge = false;
      if (isBossKind(e.kind)) { const mv = nextBossMove(e, (bossState[e.instanceId] ||= {})); mul = mv.dmgMul; statusN = mv.def.status || 0; bonus = statusN ? (e.kind === "secretBoss" ? STATUS_TUNING.secretBonus : STATUS_TUNING.bossBonus) : 0; charge = mv.move === "charge"; if (statusN) key = STATUS_KEYS[Math.floor(Math.random() * STATUS_KEYS.length)]; }
      else { const ma = mobAttack(e); if (ma.statusAttack) { statusN = 1; key = ma.statusKey; bonus = ma.bonus; } }
      if (!charge) hp = Math.max(0, hp - Math.round(resolveEnemyAction(e) * mul));
      const combo = e.kind === "secretBoss" && statusN ? [...STATUS_KEYS].sort(() => Math.random() - 0.5).slice(0, (e.secretIndex ?? 0) >= 4 ? 3 : 2) : null;
      if (!charge && statusN) inflict(statusN, key, bonus, combo);
      if (isPartyAllPetrified(status, ids)) downed = true;
      if (hp <= 0 || downed) break;
    }
    actions++;
    const t = tickStatusEffects(status, partyMax); status = t.statusByCharId; hp = Math.max(0, hp - t.poisonDamage);
    track();
    return hp <= 0 || downed || isPartyAllPetrified(status, ids);
  }
  function useSkills(enemies) {
    let spent = 0;
    for (const c of members) {
      if (sg[c.id] < gaugeMaxOf(c)) continue;
      const ef = status[c.id];
      if (!canActThisRound(ef, () => 1) || !canUseSkillThisRound(ef)) continue;
      const live = enemies.filter((e) => e.hp > 0); if (!live.length || Math.random() > pl.skill) continue;
      const sk = c.skill, hpF = hp / partyMax;
      let use = true;
      if (sk.category === "heal") use = hpF < pl.healAt; else if (sk.category === "cure") use = Object.keys(status).length > 0;
      if (!use) continue;
      sg[c.id] = 0; skillUses++; spent += 1.4;
      if (sk.category === "aoeDamage" || sk.category === "singleDamage") {
        const targets = sk.category === "aoeDamage" ? live : [live.slice().sort((a, b) => b.hp - a.hp)[0]];
        for (const e of targets) { const r = resolvePlayerAttack(c, lvOf(c), "calc", true, { skillMultiplier: sk.multiplier }); e.hp = Math.max(0, e.hp - Math.min(r.damage, Math.round(e.maxHp * SKILL_CAP_FRAC))); }
      } else if (sk.category === "heal") hp = Math.min(partyMax, hp + Math.round(partyMax * sk.percent));
      else if (sk.category === "cure") status = cureStatusEffects(status, sk.cures);
    }
    return spent;
  }
  for (let w = 0; w < waves.length; w++) {
    const enemies = waves[w]();
    const gmax = gaugeBaseSeconds(w === waves.length - 1 && isBossKind(enemies[0]?.kind), tier);
    let gauge = gmax;
    while (enemies.some((e) => e.hp > 0)) {
      time += useSkills(enemies);
      if (!enemies.some((e) => e.hp > 0)) break;
      const d = pickDifficulty(name, gauge, hp / partyMax);
      const t = jit(pl.t[d]); time += t; gauge -= t;
      if (gauge < 6) panic++;
      while (gauge <= 0) { if (cycle(enemies)) return res(false); gauge += gmax; }
      answers++;
      if (Math.random() < pl.p[d]) {
        const alive = enemies.filter((e) => e.hp > 0), dmgBy = new Map(alive.map((e) => [e, 0]));
        members.forEach((c, i) => {
          if (!canActThisRound(status[c.id])) return;
          sg[c.id] = Math.min(gaugeMaxOf(c), sg[c.id] + 1);
          const r = resolvePlayerAttack(c, lvOf(c), "calc", true, {});
          if (isConfusedThisRound(status[c.id])) { hp = Math.max(0, hp - Math.round(r.damage * STATUS_DEFS.confusion.damageFraction)); return; }
          const e = alive[i % alive.length]; dmgBy.set(e, dmgBy.get(e) + r.damage * DIFFICULTIES[d].dmgMult);
        });
        for (const [e, raw] of dmgBy) e.hp = Math.max(0, e.hp - Math.min(Math.round(raw), capDamageFor(e.maxHp, d)));
        track(); if (hp <= 0) return res(false);
        if (isPartyAllPetrified(status, ids)) return res(false);
      } else { gauge -= gmax * wrongPenaltyFrac(d); while (gauge <= 0) { if (cycle(enemies)) return res(false); gauge += gmax; } } // 実際のバトルと同じ（簡単は1/4・ほかは半分）
    }
  }
  return res(true);
  function res(win) { return { win, minHp: win ? minHp : 0, time, actions, answers, skillUses, statusHits, panic }; }
}

// ---- 場面 ----
const mobWave = (t) => () => { const n = 1 + Math.floor(Math.random() * 3); return Array.from({ length: n }, (_, i) => spawnEnemyGroup({ id: `mob_${Math.floor(Math.random() * 1e6)}` }, i, n, t)); };
const bossWave = (kind, t, id = "boss_x") => () => [spawnBoss({ id: id + Math.floor(Math.random() * 1e6), kind }, t)];
export const SCENES = {
  小単元: (t) => [mobWave(t), mobWave(t), bossWave("unitSmallBoss", t)],
  章ボス: (t) => [bossWave("chapterBoss", t)],
};
const pct = (x) => String(Math.round(x * 100)).padStart(3) + "%";
function run(partyKey, waves, tier, name, N) {
  const [members, level] = PARTIES[partyKey];
  let win = 0, min = 0, time = 0, st = 0, sk = 0, close = 0;
  for (let i = 0; i < N; i++) { const r = battle({ members: members.map((m) => ({ ...m })), level, waves, tier, name }); if (r.win) { win++; min += r.minHp; if (r.minHp < 0.25) close++; } time += r.time; st += r.statusHits; sk += r.skillUses; }
  return { win: win / N, minHp: win ? min / win : 0, close: win ? close / win : 0, time: time / N, st: st / N, sk: sk / N };
}
const ni = process.argv.indexOf("--n"); const argN = (ni >= 0 && Number(process.argv[ni + 1])) || 300;
const oi = process.argv.indexOf("--only"); const only = oi >= 0 ? process.argv[oi + 1] : undefined;
if ((process.argv[1] || "").endsWith("playtest2.mjs")) {
  const line = (r) => `勝${pct(r.win)} 残HP${pct(r.minHp)} ピンチ勝${pct(r.close)} ${r.time.toFixed(0).padStart(3)}秒 異常${r.st.toFixed(1)}回`;
  for (const [scene, tiers] of Object.entries({ 小単元: [0, 0.18, 0.36], 章ボス: [0.05, 0.2, 0.36] })) {
    if (only && only !== scene) continue;
    for (const t of tiers) {
      console.log(`\n■ ${scene}  tier=${t}（0=学年の最初〜0.36=学年の最後）`);
      for (const name of Object.keys(PLAYERS)) {
        console.log(`  ${name}`);
        for (const pk of Object.keys(PARTIES)) console.log(`    ${pk.padEnd(14)} ${line(run(pk, SCENES[scene](t), t, name, argN))}`);
      }
    }
  }
  if (!only || only === "裏ボス") {
    console.log("\n■ 裏ボス（推奨レベルの基準編成で）");
    const REF = (L) => (L <= 50 ? ["SR編成 Lv50", L] : L <= 70 ? ["UR編成 Lv70", L] : ["UR凸3 Lv70", 70]);
    for (const b of secretLadder(1)) {
      const [pk] = REF(b.recLevel); const [members] = PARTIES[pk]; const lv = b.recLevel <= 70 ? b.recLevel : 70;
      const waves = [() => [{ id: b.id, name: b.name, kind: "secretBoss", secretIndex: b.index, instanceId: b.id, hp: b.hp, maxHp: b.hp, dmg: b.dmg }]];
      const out = Object.keys(PLAYERS).map((name) => { let w = 0, tm = 0; for (let i = 0; i < argN; i++) { const r = battle({ members: members.map((m) => ({ ...m })), level: lv, waves, tier: 1, name }); if (r.win) w++; tm += r.time; } return `${name}勝${pct(w / argN)}(${(tm / argN / 60).toFixed(1)}分)`; });
      console.log(`  Lv${b.recLevel} ${b.name.padEnd(12)} HP${String(b.hp).padStart(6)}  ${pk.padEnd(12)} ${out.join("  ")}`);
    }
  }
}
