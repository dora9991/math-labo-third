// ============================================================
// playtest-journey.mjs — 1人の生徒が「学年のはじめから順に」進めるときの通しシミュレーション（2026-09-30）。
//  playtest2.mjs の1戦（状態異常・耐性・4種のスキル・ボスの技・ゲージ）を使い、実際の進み方をまねる：
//   ・小単元のバトルを順番に（勝つまで挑戦。負けたら、ひとつ前の小単元をもう一度戦って経験値をかせいでから再挑戦）
//   ・章の小単元をぜんぶクリアしたら章ボス（勝つまで挑戦）
//   ・経験値＝初クリアは getSubUnitClearExpReward をパーティ5体で等分／周回は雑魚ぶん＋ボスぶんの30%
//   ・クリスタル＝確認問題・れんしゅう(タイプ別に何段階やるか)・初クリア2・周回1・章クリア5・章ボス5・毎日の目標
//     → 5個たまるたびにガチャ（排出率・天井は本物と同じ）。ダブりは限界突破→それ以外は合成でパーティの経験値に
//   ・パーティは、いまの強さ(攻撃＋HP/4)で上位5体。新しく引いた子はこの学年ではLv1から
//  出力：得意/普通/苦手ごとの「負けた回数」「つまずいた小単元」「学年の終わりの編成」。
//  使い方: node scripts/playtest-journey.mjs [--n 40] [--grade 1] [--detail]
// ============================================================
import { SPECIALIST_ROSTER } from "../src/third/specialistRoster.js";
import { STARTER_PARTY, GACHA, REWARD, CRYSTAL, SYNTH } from "../src/third/gachaConfig.js";
import { getStatsAtLevel } from "../src/third/growthCurve.js";
import { levelFromExp, getSubUnitClearExpReward } from "../src/third/expCurve.js";
import { tierOf, ENEMY, GAUGE, DIFFICULTIES, STATUS_TUNING } from "../src/third/balance.js";
import { STATUS_DEFS } from "../src/third/battleEngine.js";
import { getGrade, getChapter } from "../src/third/data/storyMap.js";
import { spawnEnemyGroup, spawnBoss } from "../src/third/battleEngine.js";
import { battle, PLAYERS } from "./playtest2.mjs";

const argv = process.argv;
const arg = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const N = Number(arg("--n", 40));
const GRADE = Number(arg("--grade", 1));
const DETAIL = argv.includes("--detail");
const NO_STATUS = argv.includes("--noStatus"); // 比較用：仲間全員を全状態異常に耐性100にする（状態異常の影響を測る）
const SET = arg("--set", ""); // 比較用：数値を仮に変える 例 --set "ENEMY.dmgPerTier=3;STATUS_DEFS.poison.dotFraction=0.05"

const BY_ID = Object.fromEntries(SPECIALIST_ROSTER.map((c) => [c.id, c]));
const POOL = { N: [], R: [], SR: [], UR: [] };
for (const c of SPECIALIST_ROSTER) POOL[c.rarity]?.push(c.id);
// タイプごとの「れんしゅうを何段階やるか」（難易度ごとの初回5問で💎1）
const PRACTICE_LEVELS = { 得意: 3, 普通: 2, 苦手: 1 };
const MAX_TRIES = 12; // 同じバトルに何回まで挑むか（それ以上は「つまずいて先に進めない」と数える）

function mobWave(su, t) { return () => { const n = 1 + Math.floor(Math.random() * 3); return Array.from({ length: n }, (_, i) => spawnEnemyGroup(su.enemy, i, n, t)); }; }
const subUnitWaves = (su, t) => [mobWave(su, t), mobWave(su, t), () => [spawnBoss(su.boss, t)]];
const chapterBossWaves = (chap, t) => [() => [spawnBoss(chap.chapterBoss, t)]];

export function journey(name, grade = GRADE) {
  const owned = {}; let acq = 0;
  const own = (id) => (owned[id] ||= { exp: 0, breaks: 0, n: ++acq });
  STARTER_PARTY.forEach(own);
  let crystals = 0, pity = 0, pulls = 0, dayRepeats = 0;
  const lv = (id) => levelFromExp(owned[id].exp, BY_ID[id].rarity);
  const power = (id) => { const s = getStatsAtLevel({ ...BY_ID[id], breaks: owned[id].breaks }, lv(id)); return s.atk + s.hp / 4; };
  const party = () => Object.keys(owned).sort((a, b) => power(b) - power(a)).slice(0, 5);
  const IMMUNE = { poison: 100, paralysis: 100, sleep: 100, petrification: 100, confusion: 100 };
  const members = () => party().map((id) => ({ ...BY_ID[id], breaks: owned[id].breaks, ...(NO_STATUS ? { resistances: IMMUNE } : {}) }));
  const levels = () => Object.fromEntries(party().map((id) => [id, lv(id)]));
  function pullOnce() {
    pulls++; pity++;
    let r = Math.random(), rar = r < GACHA.rates.UR ? "UR" : r < GACHA.rates.UR + GACHA.rates.SR ? "SR" : r < GACHA.rates.UR + GACHA.rates.SR + GACHA.rates.R ? "R" : "N";
    if (pity >= GACHA.urPity) rar = "UR";
    if (rar === "UR") pity = 0;
    const id = POOL[rar][Math.floor(Math.random() * POOL[rar].length)];
    if (!owned[id]) { own(id); return; }
    // ダブり：その子がパーティにいて凸が残っていれば限界突破、それ以外は合成（パーティで一番レベルの低い子の経験値に）
    if (party().includes(id) && owned[id].breaks < GACHA.maxBreaks) { owned[id].breaks++; return; }
    const target = party().sort((a, b) => lv(a) - lv(b))[0];
    owned[target].exp += SYNTH.baseExp;
    crystals += CRYSTAL.dupRefund;
  }
  const spend = () => { while (crystals >= GACHA.costPerPull) { crystals -= GACHA.costPerPull; pullOnce(); } };
  const giveExp = (total) => { const ids = party(); const per = Math.floor(total / ids.length); for (const id of ids) owned[id].exp += per; };

  const log = { losses: 0, bossLosses: 0, stuck: 0, battles: 0, time: 0, firstTry: [], perUnit: [], minHp: [], statusHits: 0, fights: 0 };
  const fight = (waves, t) => { const r = battle({ members: members(), level: 1, levels: levels(), waves, tier: t, name }); log.statusHits += r.statusHits; log.fights++; return r; };
  let prev = null; // ひとつ前にクリアした小単元（経験値かせぎ用）
  let unitsDone = 0;
  for (const c of getGrade(grade).chapters) {
    const chap = getChapter(grade, c.chapterId);
    for (const su of chap.subUnits) {
      crystals += CRYSTAL.confirmFirst + PRACTICE_LEVELS[name] * CRYSTAL.practiceLevelFirst; // 学ぶ・れんしゅう
      if (++unitsDone % 3 === 0) { crystals += CRYSTAL.dailyMission; dayRepeats = 0; } // 3小単元で1日、くらいの進み
      spend();
      const t = tierOf(grade, c.chapterId, su.id);
      const base = getSubUnitClearExpReward(grade, c.chapterId, su.id);
      let tries = 0, won = false;
      while (!won && tries < MAX_TRIES) {
        tries++; log.battles++;
        const r = fight(subUnitWaves(su, t), t); log.time += r.time;
        if (r.win) { won = true; log.minHp.push(r.minHp); giveExp(base); crystals += REWARD.firstCrystals; spend(); break; }
        log.losses++;
        if (prev) { // 負けた → ひとつ前の小単元で経験値かせぎ（周回）
          log.battles++;
          const r2 = fight(subUnitWaves(prev.su, prev.t), prev.t); log.time += r2.time;
          if (r2.win) {
            const mob = Math.floor(prev.base * REWARD.mobExpShare);
            giveExp(mob + Math.round((prev.base - mob) * REWARD.repeatExpRate));
            if (dayRepeats < REWARD.repeatCrystalMax) { crystals += REWARD.repeatCrystals; dayRepeats++; }
            spend();
          }
        }
      }
      if (!won) log.stuck++;
      log.firstTry.push(tries === 1 ? 1 : 0);
      log.perUnit.push({ id: su.id, theme: su.theme, tries, won, t, avgLv: Math.round(Object.values(levels()).reduce((a, b) => a + b, 0) / 5) });
      prev = { su, t, base };
    }
    crystals += CRYSTAL.chapterClear; spend();
    const tb = tierOf(grade, c.chapterId, null);
    let tries = 0, won = false;
    while (!won && tries < MAX_TRIES) {
      tries++; log.battles++;
      const r = fight(chapterBossWaves(chap, tb), tb); log.time += r.time;
      if (r.win) { won = true; crystals += CRYSTAL.chapterBossFirst; spend(); break; }
      log.bossLosses++;
      if (prev) { log.battles++; const r2 = fight(subUnitWaves(prev.su, prev.t), prev.t); log.time += r2.time; if (r2.win) { const mob = Math.floor(prev.base * REWARD.mobExpShare); giveExp(mob + Math.round((prev.base - mob) * REWARD.repeatExpRate)); } }
    }
    if (!won) log.stuck++;
    log.perUnit.push({ id: `${c.chapterId}:boss`, theme: `${chap.name}の章ボス`, tries, won, t: tb, avgLv: Math.round(Object.values(levels()).reduce((a, b) => a + b, 0) / 5), boss: true });
  }
  const final = party().map((id) => `${BY_ID[id].rarity}${lv(id)}`);
  return { ...log, final, pulls };
}

const pct = (x) => `${Math.round(x * 100)}%`.padStart(4);
if ((argv[1] || "").endsWith("playtest-journey.mjs")) {
  if (SET) new Function("ENEMY", "GAUGE", "DIFFICULTIES", "STATUS_DEFS", "ST", SET)(ENEMY, GAUGE, DIFFICULTIES, STATUS_DEFS, STATUS_TUNING);
  console.log(`中${GRADE}を最初から最後まで（${N}人ずつ）${NO_STATUS ? "［状態異常なし］" : ""}${SET ? `［${SET}］` : ""}`);
  for (const name of Object.keys(PLAYERS)) {
    const runs = Array.from({ length: N }, () => journey(name));
    const avg = (f) => runs.reduce((a, r) => a + f(r), 0) / runs.length;
    const units = runs[0].perUnit.length;
    const ft = (from, to) => avg((r) => r.firstTry.slice(from, to).reduce((a, b) => a + b, 0) / Math.max(1, r.firstTry.slice(from, to).length));
    const n = runs[0].firstTry.length, third = Math.ceil(n / 3);
    const rar = {}; for (const r of runs) for (const f of r.final) { const k = f.replace(/\d+/, ""); rar[k] = (rar[k] || 0) + 1; }
    console.log(`\n■ ${name}：小単元で負けた回数 ${avg((r) => r.losses).toFixed(1)}／章ボスで負けた回数 ${avg((r) => r.bossLosses).toFixed(1)}／先に進めなくなった ${avg((r) => r.stuck).toFixed(2)}回／バトル合計 ${avg((r) => r.battles).toFixed(0)}回・${(avg((r) => r.time) / 60).toFixed(0)}分`);
    console.log(`   1回目で勝てた割合：はじめ ${pct(ft(0, third))}　なか ${pct(ft(third, 2 * third))}　おわり ${pct(ft(2 * third, n))}　／ガチャ ${avg((r) => r.pulls).toFixed(0)}回`);
    const bossFirst = avg((r) => { const b = r.perUnit.filter((u) => u.boss); return b.filter((u) => u.tries === 1).length / Math.max(1, b.length); });
    console.log(`   章ボスに1回目で勝てた割合 ${pct(bossFirst)}　／　状態異常にかかった回数 1バトルあたり ${(avg((r) => r.statusHits / Math.max(1, r.fights))).toFixed(1)}回`);
    const mins = runs.flatMap((r) => r.minHp);
    console.log(`   ハラハラ度：勝ったバトルで一番へったときのHP 平均${pct(mins.reduce((a, b) => a + b, 0) / Math.max(1, mins.length))}・HPが25%未満まで追いこまれて勝った ${pct(mins.filter((x) => x < 0.25).length / Math.max(1, mins.length))}・半分以下 ${pct(mins.filter((x) => x < 0.5).length / Math.max(1, mins.length))}`);
    console.log(`   学年の終わりのパーティ（レア度の内訳）：${Object.entries(rar).map(([k, v]) => `${k}${(v / N).toFixed(1)}`).join(" ")}　平均Lv ${avg((r) => r.final.reduce((a, f) => a + Number(f.replace(/\D+/, "")), 0) / 5).toFixed(1)}`);
    // いちばん負けた場所
    const worst = Array.from({ length: units }, (_, i) => ({ ...runs[0].perUnit[i], avgTries: avg((r) => r.perUnit[i].tries), stuckRate: avg((r) => (r.perUnit[i].won ? 0 : 1)), lvAt: avg((r) => r.perUnit[i].avgLv) }))
      .sort((a, b) => b.avgTries - a.avgTries).slice(0, DETAIL ? 12 : 4);
    console.log(`   負けやすい所：${worst.map((w) => `${w.theme}(平均${w.avgTries.toFixed(1)}回・Lv${w.lvAt.toFixed(0)}${w.stuckRate > 0 ? `・進めない${pct(w.stuckRate)}` : ""})`).join("　")}`);
  }
}
