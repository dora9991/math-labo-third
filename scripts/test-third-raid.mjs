// マルチ専用ストーリー「みんなの冒険」（協力バトル）の自動テスト。メモリ上のストアで、本番と同じ handler を動かす。  実行: npm run test:third-raid
import { build } from "esbuild";
import { execSync } from "node:child_process";
execSync("node scripts/gen-problem-version.mjs", { stdio: "ignore" });
await build({
  stdin: { contents: `export * from "./supabase/functions/third-api/handler.js"; export * from "./src/third/room.js"; export * from "./src/third/raidBattle.js"; export * from "./src/third/raid.js"; export * from "./src/third/core.js"; export { generateThirdProblem } from "./src/third/problemSource.js"; export { SPECIALIST_ROSTER } from "./src/third/specialistRoster.js"; export { expOf } from "./src/third/expCurve.js";`, resolveDir: process.cwd(), loader: "js" },
  bundle: true, format: "esm", platform: "node", outfile: "dist-fn/_raid.mjs", loader: { ".json": "json" }, logLevel: "error",
});
const T = await import("../dist-fn/_raid.mjs");
let pass = 0, fail = 0;
const t = (name, cond, extra = "") => { (cond ? pass++ : fail++); console.log(`${cond ? "✅" : "❌"} ${name}${cond ? "" : "  " + extra}`); };

function makeStore() {
  const players = new Map(), rooms = new Map(); let ver = 0;
  return {
    players, rooms,
    async load(u) { const r = players.get(u); return r ? { state: structuredClone(r.state), version: r.version } : null; },
    async save(u, state, prev) { const r = players.get(u); if (!r && prev === null) { players.set(u, { state: structuredClone(state), version: ++ver }); return true; } if (r && r.version === prev) { players.set(u, { state: structuredClone(state), version: ++ver }); return true; } return false; },
    async roomLoad(code) { const r = rooms.get(code); return r ? { room: structuredClone(r.room), version: r.version } : null; },
    async roomSave(room, prev) { const r = rooms.get(room.code); if (!r && prev === null) { rooms.set(room.code, { room: structuredClone(room), version: ++ver }); return true; } if (r && r.version === prev) { rooms.set(room.code, { room: structuredClone(room), version: ++ver }); return true; } return false; },
    async roomOfUser(u) { for (const [c, r] of rooms) if (r.room.status !== "closed" && r.room.members.some((m) => m.id === u)) return c; return null; },
    async profileName(u) { return "P-" + u; },
  };
}
const T0 = 1_800_000_000_000;
let clock = T0;
const call = (s, action, body, u, now = clock) => T.handle({ action, body, userId: u, store: s, now, rand: Math.random });

// 部屋を作って、全員が入って、ホストが開始（共通パーティが決まる）まで
async function setupRoom(ids, { cleared = 0 } = {}) {
  const s = makeStore();
  for (const u of ids) {
    await call(s, "get_state", {}, u);
    if (cleared) { const l = await s.load(u); const st = l.state; for (const b of T.RAID_LADDER.slice(0, cleared)) st.raid.cleared[`${b.grade}:${b.chapterId}`] = 1; await s.save(u, st, l.version); }
  }
  const code = (await call(s, "room_create", {}, ids[0])).body.room.code;
  for (const u of ids.slice(1)) await call(s, "room_join", { code }, u);
  const r = await call(s, "room_start", { code }, ids[0]);
  return { s, code, room: r.body.room };
}
const getRoom = async (s, code, u) => (await call(s, "room_get", { code }, u)).body.room;
// 全員が「場面を読み終わった」→最初のラウンドが始まる
async function startStage(s, code, ids, index) {
  const r = await call(s, "room_battle_start", { code, index }, ids[0]);
  if (r.status !== 200) return r;
  let last; for (const u of ids) last = await call(s, "room_battle_ready", { code }, u);
  return last;
}
const answerFor = (room, u, ok) => { const p = room.battle.round.problems[u]; const q = T.generateThirdProblem(p.unitId, p.level, p.seed); return ok ? q.choices[q.correctIndex] : q.choices.find((c, i) => i !== q.correctIndex); };
// 1ラウンド：okMap = { uid: true|false|null(答えない) }
async function playRound(s, code, ids, okMap) {
  let room = await getRoom(s, code, ids[0]);
  const r = room.battle.round;
  clock = r.startAt + 3000;
  let res;
  for (const u of ids) { if (okMap[u] === null || okMap[u] === undefined) continue; res = await call(s, "room_battle_answer", { code, answer: answerFor(room, u, okMap[u]) }, u); }
  room = await getRoom(s, code, ids[0]);
  if (room.battle.status === "fighting" && room.battle.round.n === r.n) { clock = r.deadline + T.RB.graceMs + 10; await call(s, "room_battle_sync", { code }, ids[0]); room = await getRoom(s, code, ids[0]); }
  return room;
}

// ---- 設定の確認
t("ステージ: 全21（中1が7・中2が6・中3が8）で、雑魚2波→ボス", T.RAID_LADDER.length === 21 && T.stageWaves(0).map((w) => w.kind).join() === "mob,mob,boss" && T.stageWaves(20).length === 3);
t("敵の強さ: 後半のステージほどHPが多い／雑魚はボスより弱い", T.stageWaves(20)[2].maxHp > T.stageWaves(0)[2].maxHp && T.stageWaves(5)[0].maxHp < T.stageWaves(5)[2].maxHp);
t("ごほうびの設計: メダル3色・経験値は小単元の初回より低い", T.COOP.tierCrystals.length === 3 && T.coopExpPerChar(0, true) * 5 < 390 && T.coopExpPerChar(0, false) < T.coopExpPerChar(0, true));

// ---- 開始の条件
{ const { s, code } = await setupRoom(["h", "a"]);
  let r = await call(s, "room_battle_start", { code, index: 0 }, "a"); t("開始: ホスト以外は始められない", r.status === 400 && r.body.error === "host-only");
  r = await call(s, "room_battle_start", { code, index: 1 }, "h"); t("開始: 前のステージをクリアしていない人がいると、先には進めない", r.status === 400 && r.body.error === "locked");
  r = await call(s, "room_battle_start", { code, index: 99 }, "h"); t("開始: 範囲外は拒否", r.status === 400);
  r = await call(s, "room_battle_state", { code }, "a"); t("開始: どこまで始められるか（最初のステージ）が分かる", r.status === 200 && r.body.maxStart === 0);
  r = await call(s, "room_battle_start", { code, index: 0 }, "h");
  const b = r.body.room?.battle;
  t("開始: 最初は「場面を読む」段階。ラウンドはまだ無い", r.status === 200 && b.phase === "intro" && b.round === null && b.waves.length === 3 && b.wave === 0);
  r = await call(s, "room_battle_start", { code, index: 0 }, "h"); t("開始: 戦闘中にもう一度は始められない", r.status === 400 && r.body.error === "already-fighting");
  r = await call(s, "room_battle_answer", { code, answer: "1" }, "a"); t("解答: 場面を読んでいる間は答えられない（害のない無視）", r.status === 200 && r.body.ignored === "not-fighting");
  r = await call(s, "room_battle_ready", { code }, "h"); t("準備: 全員そろうまでラウンドは始まらない", r.status === 200 && r.body.room.battle.phase === "intro" && r.body.room.battle.ready.length === 1);
  r = await call(s, "room_battle_ready", { code }, "a"); const rb = r.body.room.battle;
  t("準備: 全員そろったら最初のラウンドが始まる（全員ぶんの問題・制限時間つき）", rb.phase === "fight" && rb.round?.n === 1 && Object.keys(rb.round.problems).length === 2 && rb.round.deadline > rb.round.startAt);
  t("問題: 同じ章の単元から、人ごとに別のseed", new Set(Object.values(rb.round.problems).map((p) => p.seed)).size === 2 && Object.values(rb.round.problems).every((p) => p.level === "standard"));
}
// 場面を読むのを待ちすぎたら始まる
{ const { s, code } = await setupRoom(["h", "a"]); await call(s, "room_battle_start", { code, index: 0 }, "h");
  clock = T0 + T.RB.introWaitMs + 100; const r = await call(s, "room_battle_sync", { code }, "a");
  t("準備: 読むのを待ちすぎたら、始まる", r.body.room.battle.phase === "fight"); clock = T0; }

// ---- 解答
{ const { s, code } = await setupRoom(["h", "a"]); clock = T0; await startStage(s, code, ["h", "a"], 0);
  let room = await getRoom(s, code, "h"); const r1 = room.battle.round;
  clock = r1.startAt - 500; let r = await call(s, "room_battle_answer", { code, answer: "x" }, "h"); t("解答: ラウンドが始まる前は受け付けない", r.status === 200 && r.body.ignored === "not-started");
  clock = r1.startAt + 300; r = await call(s, "room_battle_answer", { code, answer: "x" }, "h"); t("解答: 速すぎる解答は読み直し", r.status === 400 && r.body.error === "too-fast");
  clock = r1.startAt + 3000; r = await call(s, "room_battle_answer", { code, answer: answerFor(room, "h", true), nextLevel: "advanced" }, "h");
  t("解答: 1人が答えても、全員がそろうまでラウンドは終わらない", r.status === 200 && r.body.room.battle.round.n === 1 && r.body.room.battle.round.answers.h.correct === true);
  r = await call(s, "room_battle_answer", { code, answer: answerFor(room, "h", false) }, "h"); t("解答: 同じラウンドで2回は答えられない", r.status === 200 && r.body.ignored === "already-answered");
  r = await call(s, "room_battle_answer", { code, answer: answerFor(room, "a", false) }, "a");
  const b = r.body.room.battle;
  t("解答: 全員そろったらすぐ結果が出て、次のラウンドになる", b.round.n === 2 && b.last.n === 1 && b.last.per.h.correct && !b.last.per.a.correct && b.last.dealt > 0);
  t("結果: 正解した人ぶんだけダメージ／間違えた人は0／敵が反撃してパーティHPが減る", b.last.per.h.damage > 0 && b.last.per.a.damage === 0 && b.last.foeDmg > 0 && b.partyHp < b.partyMaxHp && b.waves[0].hp === b.waves[0].maxHp - b.last.dealt);
  t("次のラウンド: 「次の難しさ」が、その人の次の問題に反映される", b.round.problems.h.level === "advanced" && b.round.problems.a.level === "standard");
  t("集計: 正解数・解答数が人ごとに数えられる", b.stats.h.correct === 1 && b.stats.h.total === 1 && b.stats.a.correct === 0 && b.stats.a.total === 1);
  // 時間切れ
  room = await getRoom(s, code, "h"); const r2 = room.battle.round;
  clock = r2.deadline + 5000; r = await call(s, "room_battle_sync", { code }, "a");
  t("時間切れ: 期限を過ぎて誰かが様子を見ると、答えなかった人は不正解扱いで結果が出る", r.body.room.battle.round.n === 3 && r.body.room.battle.last.n === 2 && !r.body.room.battle.last.per.h.answered);
  clock = r.body.room.battle.round.startAt + 3000; r = await call(s, "room_battle_answer", { code, answer: "x" }, "a"); t("解答: 遅れて来た解答は新しいラウンドの問題として採点される（古い問題には答えられない）", r.status === 200);
}
// 離席・全員が答えない
{ const ids = ["h", "a"]; const { s, code } = await setupRoom(ids); clock = T0; await startStage(s, code, ids, 0);
  let room;
  for (let i = 0; i < T.RB.idleAfter; i++) room = await playRound(s, code, ids, { h: true, a: null });
  t("離席: 2ラウンド続けて答えなかった人は、もう待たれない", room.battle.idle.a >= T.RB.idleAfter);
  const r = room.battle.round; clock = r.startAt + 3000;
  const x = await call(s, "room_battle_answer", { code, answer: answerFor(room, "h", true) }, "h");
  t("離席: 残りの全員が答えれば、離席の人を待たずに結果が出る", x.body.room.battle.last.n === r.n);
  for (let i = 0; i < T.RB.abortAfterIdleRounds + 1; i++) { room = await getRoom(s, code, "h"); if (room.battle.status !== "fighting") break; room = await playRound(s, code, ids, {}); }
  t("離席: 全員が答えない状態が続くと、戦闘はやめになる", room.battle.status === "aborted");
}

// ---- 勝つまで（雑魚2波→ボス）→ ごほうび
async function winStage(ids, index, okOf = () => true, opts = {}) {
  const { s, code } = opts.ctx || (await setupRoom(ids, { cleared: index }));
  clock = T0 + (opts.day || 0) * 86400000;
  await startStage(s, code, ids, index);
  let room = await getRoom(s, code, ids[0]); const waves = []; let rounds = 0;
  while (room.battle.status === "fighting" && rounds < 300) {
    rounds++;
    const m = Object.fromEntries(ids.map((u) => [u, okOf(u, rounds)]));
    const before = room.battle.wave;
    room = await playRound(s, code, ids, m);
    if (room.battle.wave !== before) waves.push(room.battle.last.foeName);
  }
  return { s, code, room, waves, rounds, ids };
}
{ const ids = ["h", "a"]; const w = await winStage(ids, 0);
  t("勝利: 雑魚2波を順に倒して、ボスを倒すと勝ち", w.room.battle.status === "won" && w.waves.length === 2 && w.room.battle.wave === 2);
  t("勝利: メダルの色が決まる（全員正解ならパーティHPがよく残る）", [1, 2, 3].includes(w.room.battle.tier));
  const before = (await w.s.load("h")).state;
  let r = await call(w.s, "room_battle_claim", { code: w.code }, "h");
  const rw = r.body.rewards;
  t("ごほうび: 初回は 💎(初回)＋称号＋メダル＋経験値", r.status === 200 && rw.first && rw.crystals === T.RAID.firstCrystals && !!rw.title && rw.tier === w.room.battle.tier && rw.perMember > 0);
  const st = (await w.s.load("h")).state;
  t("ごほうび: クリア記録・メダルが保存される", st.raid.cleared["1:c1"] > 0 && st.coop.medals["0"] === rw.tier && st.crystals >= before.crystals + rw.crystals);
  const pid = st.party.filter(Boolean)[0];
  t("経験値: 本人のいまのパーティ5体に、中1の経験値として低めに付く", T.expOf(st.owned[pid], 1) === T.expOf(before.owned[pid], 1) + rw.perMember && rw.perMember === T.coopExpPerChar(0, true) && rw.exp === rw.perMember * 5);
  r = await call(w.s, "room_battle_claim", { code: w.code }, "h"); t("ごほうび: 二重には受け取れない", r.status === 400 && r.body.error === "already-claimed");
  r = await call(w.s, "room_battle_claim", { code: w.code }, "a"); t("ごほうび: もう一人も受け取れる（それぞれ1回）", r.status === 200 && r.body.rewards.first);
  const rr = await getRoom(w.s, w.code, "h"); t("ごほうび: 受け取り済みの印が部屋に残る", rr.battle.rewarded.length === 2);
  // 次のステージは、全員が前をクリアしたので始められる
  r = await call(w.s, "room_battle_state", { code: w.code }, "h"); t("次へ: 全員がクリアしたので、次のステージに進める", r.body.maxStart === 1);
  r = await call(w.s, "room_battle_start", { code: w.code, index: 1 }, "h"); t("次へ: 同じ部屋で次のステージを始められる", r.status === 200 && r.body.room.battle.index === 1 && r.body.room.battle.phase === "intro");
}
// ただ乗り防止・周回・日ごとの上限
{ const ids = ["h", "a", "b"]; const w = await winStage(ids, 0, (u) => (u === "b" ? null : true)); // bは一度も答えない（離席）
  const r = await call(w.s, "room_battle_claim", { code: w.code }, "b");
  t("ただ乗り防止: 正解が足りない人はごほうびが付かない", w.room.battle.status === "won" && r.status === 400 && r.body.error === "too-few-correct");
  const h = await call(w.s, "room_battle_claim", { code: w.code }, "h"); t("ただ乗り防止: ちゃんと答えた人には付く", h.status === 200);
}
{ // 周回：2回目以降は経験値が少なく、1日3回まで。メダルは色が上がったときだけクリスタル
  const ids = ["h", "a"]; const first = await winStage(ids, 0); await call(first.s, "room_battle_claim", { code: first.code }, "h");
  const ctx = { s: first.s, code: first.code };
  const exps = [];
  for (let i = 0; i < 5; i++) {
    await call(ctx.s, "room_leave", { code: ctx.code }, "a"); // 部屋を作り直す
    const nr = await setupRoomOn(ctx.s, ids, 0);
    const w = await winStage(ids, 0, () => true, { ctx: { s: ctx.s, code: nr } });
    const r = await call(ctx.s, "room_battle_claim", { code: nr }, "h"); exps.push(r.body.rewards?.perMember ?? "x");
    Object.assign(ctx, { code: nr });
  }
  t("周回: 経験値は初回より少なく、1日3回まで（4回目以降は0）", exps[0] > 0 && exps[0] < T.coopExpPerChar(0, true) && exps[1] > 0 && exps[2] > 0 && exps[3] === 0 && exps[4] === 0, JSON.stringify(exps));
}
async function setupRoomOn(s, ids, cleared) { // 同じストアで、新しい部屋を作る
  const code = (await call(s, "room_create", {}, ids[0])).body.room.code;
  for (const u of ids.slice(1)) await call(s, "room_join", { code }, u);
  await call(s, "room_start", { code }, ids[0]);
  return code;
}
// 負け（全員が間違い続ける）
{ const ids = ["h", "a"]; const w = await winStage(ids, 0, () => false);
  t("負け: 全員が不正解を続けると、パーティが全滅して負け", w.room.battle.status === "lost");
  const r = await call(w.s, "room_battle_claim", { code: w.code }, "h"); t("負け: ごほうびは付かない", r.status === 400 && r.body.error === "not-won");
  const again = await call(w.s, "room_battle_start", { code: w.code, index: 0 }, "h"); t("負け: 同じ部屋でやり直せる", again.status === 200 && again.body.room.battle.status === "fighting" && again.body.room.battle.partyHp === again.body.room.battle.partyMaxHp);
}
// 人数ごと・上限
{ for (const n of [2, 3, 5]) { const ids = ["a", "b", "c", "d", "e"].slice(0, n); const w = await winStage(ids, 0); t(`${n}人で最後まで勝てる（雑魚2波→ボス）`, w.room.battle.status === "won"); } }
// 同時に答える（ほぼ同時の操作でも、全員の解答が1回ずつ入る）
{ const ids = ["a", "b", "c", "d", "e"]; const { s, code } = await setupRoom(ids); clock = T0; await startStage(s, code, ids, 0);
  const room = await getRoom(s, code, "a"); clock = room.battle.round.startAt + 3000;
  const rs = await Promise.all(ids.map((u) => call(s, "room_battle_answer", { code, answer: answerFor(room, u, true) }, u)));
  const after = await getRoom(s, code, "a");
  t("同時: 5人がほぼ同時に答えても、全員ぶんが数えられて1回だけ結果が出る", rs.every((r) => r.status === 200) && after.battle.last?.n === 1 && Object.values(after.battle.last.per).every((p) => p.correct) && after.battle.stats.a.total === 1);
}
// 抜けた人・閉じた部屋でも受け取れる
{ const ids = ["h", "a"]; const w = await winStage(ids, 0);
  await call(w.s, "room_leave", { code: w.code }, "h"); // ホストが閉じる
  const r = await call(w.s, "room_battle_claim", { code: w.code }, "a"); t("ごほうび: ホストが部屋を閉じたあとでも、受け取れる", r.status === 200 && r.body.rewards.first);
}
// 部屋の表示用データ
{ const { s, code } = await setupRoom(["h", "a"]); await startStage(s, code, ["h", "a"], 0); const room = await getRoom(s, code, "a");
  t("表示: 部屋のデータに戦闘の状態が入っている／パーティに学年ごとの経験値が入っている", !!room.battle && room.party.every((p) => Array.isArray(p.exps) && p.exps.length === 3)); }
// 状態の正規化・既存データ
{ const s0 = T.initialThirdState(); const n = T.normalizeThirdState({ ...s0, coop: { medals: { 0: 3, 1: 9, x: 2 }, daily: { date: "2026-10-09", n: 2 } } });
  t("保存データ: 協力のメダルは 1〜3 だけ・数字の番号だけを残す／古いデータにも coop が付く", n.coop.medals["0"] === 3 && !("1" in n.coop.medals) && !("x" in n.coop.medals) && T.normalizeThirdState({}).coop.daily.n === 0); }

console.log(`\n${fail ? "❌" : "✅"} ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
