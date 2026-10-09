// ============================================================
// sim-raid-battle.mjs — マルチ専用ストーリー「みんなの冒険」（raidBattle.js）の強さの調整用シミュレーション（2026-10-09）。
//  実際の部屋の関数（startBattle / readyBattle / submitAnswer / tickBattle）を、仮想の生徒たち（得意・普通・苦手）で動かして、
//  ステージごとの勝率・かかる時間・メダルの色を出す。時計は仮想（実時間はかからない）。
//  使い方: node scripts/sim-raid-battle.mjs [--n 100] [--stages 0,5,10,20] [--players 3] [--skill 普通] [--set "RB.bossHp=0.5;RB.mobHp=[.1,.2]"]
// ============================================================
import { build } from "esbuild";
import { execSync } from "node:child_process";
execSync("node scripts/gen-problem-version.mjs", { stdio: "ignore" });
await build({
  stdin: { contents: `export * from "./src/third/raidBattle.js"; export * from "./src/third/raid.js"; export { generateThirdProblem } from "./src/third/problemSource.js"; export { SPECIALIST_ROSTER } from "./src/third/specialistRoster.js"; export { expForLevel } from "./src/third/expCurve.js"; export { STARTER_PARTY } from "./src/third/gachaConfig.js";`, resolveDir: process.cwd(), loader: "js" },
  bundle: true, format: "esm", platform: "node", outfile: "dist-fn/_sim.mjs", loader: { ".json": "json" }, logLevel: "error",
});
const T = await import("../dist-fn/_sim.mjs");
const argv = process.argv; const arg = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const N = Number(arg("--n", 100));
const SET = arg("--set", "");
if (SET) new Function("RB", "RAID", "COOP", SET)(T.RB, T.RAID, T.COOP);
const NPLAYERS = Number(arg("--players", 3));
const STAGES = arg("--stages", "0,3,6,9,12,15,18,20").split(",").map(Number);
const SKILLS = arg("--skill", "得意,普通,苦手").split(",");

// 仮想の生徒（scripts/playtest2.mjs と同じ：難しさごとの正答率と、かかる秒数）
const PLAYERS = {
  得意: { p: { easy: 0.98, standard: 0.93, advanced: 0.82, oni: 0.6 }, t: { easy: 5, standard: 8, advanced: 13, oni: 20 }, pick: () => (Math.random() < 0.5 ? "advanced" : Math.random() < 0.5 ? "standard" : "oni") },
  普通: { p: { easy: 0.93, standard: 0.75, advanced: 0.5, oni: 0.25 }, t: { easy: 7, standard: 12, advanced: 19, oni: 28 }, pick: () => (Math.random() < 0.7 ? "standard" : Math.random() < 0.5 ? "easy" : "advanced") },
  苦手: { p: { easy: 0.8, standard: 0.5, advanced: 0.25, oni: 0.08 }, t: { easy: 11, standard: 19, advanced: 28, oni: 36 }, pick: () => (Math.random() < 0.8 ? "easy" : "standard") },
};
const jit = (x) => x * (0.75 + Math.random() * 0.5);

// 各ステージで生徒たちが持ってくるパーティの目安（ステージが進むほど育っている）
const pure = (r, cat, nth = 0) => T.SPECIALIST_ROSTER.filter((c) => c.rarity === r && c.id.startsWith("sp_") && c.skill.category === cat)[nth];
const team = (r) => [pure(r, "aoeDamage"), pure(r, "singleDamage"), pure(r, "singleDamage", 1), pure(r, "heal"), pure(r, "cure")].map((c) => c.id);
const STARTER = T.STARTER_PARTY;
const partyFor = (stage) => (stage <= 2 ? { ids: STARTER, lv: 4 + stage * 2 } : stage <= 6 ? { ids: team("N"), lv: 10 + stage * 2 } : stage <= 12 ? { ids: team("R"), lv: 14 + (stage - 7) * 2 } : stage <= 17 ? { ids: team("SR"), lv: 16 + (stage - 13) * 3 } : { ids: team("UR"), lv: 24 + (stage - 18) * 4 });

function makeRoom(n, stage, skillName) {
  const { ids, lv } = partyFor(stage);
  const exp = T.expForLevel(lv);
  const shape = T.partyShape ? T.partyShape(n) : { 2: { host: 3, other: 2 }, 3: { host: 3, other: 1 }, 4: { host: 2, other: 1 }, 5: { host: 1, other: 1 } }[n];
  const members = Array.from({ length: n }, (_, i) => ({ id: "u" + i, name: "P" + i }));
  const party = []; let k = 0;
  members.forEach((m, i) => { const need = i === 0 ? shape.host : shape.other; for (let j = 0; j < need; j++) party.push({ id: ids[k++ % ids.length], ownerId: m.id, exp, exps: [exp, exp, exp], breaks: 0 }); });
  return { code: "SIM1", hostId: "u0", status: "started", members, party, rev: 1, updatedAt: 0 };
}

const MIX = ["得意", "普通", "苦手", "普通", "得意"]; // 「混合」＝教室のようにいろいろな子がいる
function playStage(n, stage, skillName) {
  const plOf = (i) => PLAYERS[skillName === "混合" ? MIX[i % MIX.length] : skillName];
  let now = 1_800_000_000_000;
  const states = Object.fromEntries(Array.from({ length: n }, (_, i) => ["u" + i, { raid: { cleared: Object.fromEntries(T.RAID_LADDER.slice(0, stage).map((b) => [`${b.grade}:${b.chapterId}`, 1])) } }]));
  let room = T.startBattle(makeRoom(n, stage, skillName), { userId: "u0", index: stage, states, now }).room;
  for (const m of room.members) { const r = T.readyBattle(room, { userId: m.id, now }); room = r.room; }
  const t0 = now; let rounds = 0, dealtSum = 0, lastN = 0, foeDmgSum = 0;
  while (room.battle.status === "fighting" && rounds < 400) {
    const r = room.battle.round; rounds++;
    // 各自が答える秒数を決める（制限時間を超える人は答えない）
    const plan = room.members.map((m, mi) => { const pl = plOf(mi); const level = r.problems[m.id].level; const ms = jit(pl.t[level]) * 1000 + 1300; return { id: m.id, level, ms, ok: Math.random() < pl.p[level] }; }).sort((a, b) => a.ms - b.ms);
    const nextLevel = Object.fromEntries(room.members.map((m, mi) => [m.id, plOf(mi).pick()]));
    for (const a of plan) {
      const t = r.startAt + a.ms;
      if (t > r.deadline) continue;
      const prob = T.generateThirdProblem(r.problems[a.id].unitId, r.problems[a.id].level, r.problems[a.id].seed);
      const ans = a.ok ? prob.choices[prob.correctIndex] : prob.choices.find((c, i) => i !== prob.correctIndex);
      now = t; const res = T.submitAnswer(room, { userId: a.id, answer: ans, nextLevel: nextLevel[a.id], now });
      if (res.room) room = res.room;
      if (room.battle.round?.n !== r.n) break; // 結果が出て次のラウンドへ
    }
    if (room.battle.status === "fighting" && room.battle.round.n === r.n) { now = r.deadline + T.RB.graceMs + 1; room = T.tickBattle(room, now); }
    if (room.battle.last && room.battle.last.n !== lastN) { lastN = room.battle.last.n; dealtSum += room.battle.last.dealt; foeDmgSum += room.battle.last.foeDmg; }
  }
  const b = room.battle;
  const totalHp = b.waves.reduce((a, w) => a + w.maxHp, 0);
  return { avgDealt: dealtSum / Math.max(1, rounds), avgFoe: foeDmgSum / Math.max(1, rounds), totalHp, partyMaxHp: b.partyMaxHp, won: b.status === "won", tier: b.tier || 0, rounds, sec: (b.endedAt - t0) / 1000, partyFrac: b.partyHp / b.partyMaxHp, minCorrect: Math.min(...Object.values(b.stats).map((s) => s.correct)) };
}

console.log(`人数 ${NPLAYERS}人・${N}回ずつ ${SET ? `［${SET}］` : ""}`);
for (const st of STAGES) {
  const boss = T.raidBoss(st); const { lv } = partyFor(st);
  const cells = [];
  for (const sk of SKILLS) {
    let w = 0, tiers = [0, 0, 0, 0], sec = 0, rd = 0, mc = 0, ad = 0, af = 0, th = 0, pm = 0;
    for (let i = 0; i < N; i++) { const r = playStage(NPLAYERS, st, sk); if (r.won) { w++; tiers[r.tier]++; mc += r.minCorrect; } sec += r.sec; rd += r.rounds; ad += r.avgDealt; af += r.avgFoe; th = r.totalHp; pm = r.partyMaxHp; }
    if (sk === SKILLS[0]) console.log(`    （敵の合計HP ${th}／パーティHP ${pm}／1ラウンドの与ダメ平均 ${(ad / N).toFixed(0)}／敵の与ダメ平均 ${(af / N).toFixed(0)}）`);
    cells.push(`${sk}:勝${String(Math.round(100 * w / N)).padStart(3)}% 金${tiers[3]}銀${tiers[2]}銅${tiers[1]} ${(sec / N / 60).toFixed(1)}分/${(rd / N).toFixed(0)}R`);
  }
  console.log(`#${String(st + 1).padStart(2)} ${boss.name.padEnd(12)} パーティLv${String(lv).padStart(2)}  ${cells.join("　")}`);
}
