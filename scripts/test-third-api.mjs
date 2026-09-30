// third-api（サーバー側ロジック）の自動テスト。サーバーと同じバンドル手順で組み、メモリ上のストアで動かす。
//  実行: npm run test:third-api
import { build } from "esbuild";
import { execSync } from "node:child_process";
execSync("node scripts/gen-problem-version.mjs", { stdio: "ignore" });
await build({
  stdin: { contents: `export * from "./supabase/functions/third-api/handler.js"; export { applyAdminOp } from "./src/third/adminOps.js"; export { haichiKeyForUnit } from "./src/third/core.js"; export { generateThirdProblem } from "./src/third/problemSource.js"; export * from "./src/third/core.js"; export { getSubUnitClearExpReward, expOf } from "./src/third/expCurve.js"; export { tierOf } from "./src/third/balance.js"; export * from "./src/third/secretBoss.js"; export * from "./src/third/enemyMoves.js"; export * from "./src/third/enemyFx.js"; export * from "./src/third/skillDefs.js"; export { SPECIALIST_ROSTER } from "./src/third/specialistRoster.js"; export { STATUS_KEYS, STATUS_DEFS, rollStatusInflict, applyStatusEffect, tickStatusEffects, canActThisRound, canUseSkillThisRound } from "./src/third/battleEngine.js"; export { SUBUNIT_SEQUENCE } from "./src/third/data/storyMap.js"; export { RAID, RAID_LADDER, raidStats, titlesOf } from "./src/third/raid.js"; export { GACHA, REWARD, VERIFY, MEDAL, STARTER_PARTY, CRYSTAL, DAILY, SYNTH } from "./src/third/gachaConfig.js"; export { generatePractice, generatePracticeAvoiding, practiceCorrect } from "./src/third/problemSource.js"; export { HAICHI_COURSE } from "./src/data/haichiCourse.js"; export { worldBattleFor } from "./src/third/link.js"; export { chaptersForGrade } from "./src/data/index.js";`, resolveDir: process.cwd(), loader: "js" },
  bundle: true, format: "esm", platform: "node", outfile: "dist-fn/_t.mjs", loader: { ".json": "json" }, logLevel: "error",
});
const T = await import("../dist-fn/_t.mjs");
let pass = 0, fail = 0;
const t = (name, cond, extra = "") => { (cond ? pass++ : fail++); console.log(`${cond ? "✅" : "❌"} ${name}${cond ? "" : "  " + extra}`); };

// ---- メモリ上のストア（version付き楽観排他）
function makeStore() {
  const rows = new Map(); let ver = 0; const log = { attempts: [], gacha: [] };
  return {
    log, rows,
    async load(u) { const r = rows.get(u); return r ? { state: structuredClone(r.state), version: r.version } : null; },
    async save(u, state, prev) { const r = rows.get(u); if (!r && prev === null) { rows.set(u, { state: structuredClone(state), version: ++ver }); return true; } if (r && r.version === prev) { rows.set(u, { state: structuredClone(state), version: ++ver }); return true; } return false; },
    async logAttempts(u, x) { log.attempts.push(...x); }, async logGacha(u, x) { log.gacha.push(...x); },
  };
}
const call = (store, action, body, u = "stu1", now = Date.now(), rand) => T.handle({ action, body, userId: u, store, now, rand });

// ---- 正しいクレームを作る（seedから問題を作って正解の選択肢を選ぶ）
const g1c1 = T.chaptersForGrade(1)[0];
const wb = T.worldBattleFor(1, g1c1, g1c1.units[0]); // {grade,chapterId,kind,subUnitId}
const unitId = g1c1.units[0].id;
function makeClaim({ n = 12, correctRate = 1, ms = 3000, nonce = "n" + Math.random().toString(36).slice(2, 12), seedBase = Math.floor(Math.random() * 1e9), now = Date.now() } = {}) {
  const attempts = []; let tcur = now - n * ms - 5000;
  for (let i = 0; i < n; i++) {
    const seed = seedBase + i, level = ["easy", "standard", "advanced", "oni"][i % 4];
    const p = T.generateThirdProblem(unitId, level, seed) || T.generateThirdProblem(unitId, "standard", seed);
    const right = Math.random() < correctRate;
    const answer = right ? p.choices[p.correctIndex] : p.choices.find((_, k) => k !== p.correctIndex);
    attempts.push({ unitId, level: p.level, seed, answer, ms });
  }
  return { nonce, pv: T.PROBLEM_VERSION, grade: wb.grade, chapterId: wb.chapterId, kind: "subUnit", subUnitId: wb.subUnitId, startedAt: now - n * ms - 5000, endedAt: now - 1000, attempts };
}

// ===== 1. 初期状態
{ const s = makeStore(); const r = await call(s, "get_state", {}); t("初回: 初期5体が配布される", r.status === 200 && Object.keys(r.body.state.owned).length === 5 && r.body.state.crystals === 0);
  t("初回: パーティは初期5体", JSON.stringify(r.body.state.party) === JSON.stringify(T.STARTER_PARTY));
  const r0 = await T.handle({ action: "get_state", userId: null, store: s }); t("未ログインは401", r0.status === 401); }

// ===== 2. ガチャ
{ const s = makeStore(); await call(s, "get_state", {});
  let r = await call(s, "gacha", { count: 1 }); t("クリスタル0では引けない", r.status === 400 && r.body.error === "not-enough-crystals");
  // チケットを直接与える(=サーバー内の状態を用意)
  const cur = await s.load("stu1"); cur.state.crystals = 200; await s.save("stu1", cur.state, cur.version);
  r = await call(s, "gacha", { count: 10 }); t("10連: クリスタル50個を消費して11体（1回おまけ・被りは1個ずつ戻る）", r.status === 200 && r.body.results.length === 11 && r.body.state.crystals === 150 + r.body.results.reduce((a, x) => a + (x.refund || 0), 0));
  t("10連: SR以上が最低1体(保証)", r.body.results.some((x) => x.rarity === "SR" || x.rarity === "UR"));
  r = await call(s, "gacha", { count: 3 }); t("1/10以外の回数は拒否", r.status === 400);
  // 統計：確率が設定どおり(大量に引く)
  let counts = { N: 0, R: 0, SR: 0, UR: 0 }, st = (await s.load("stu1")).state; st.crystals = 100000; let cur2 = await s.load("stu1"); await s.save("stu1", st, cur2.version);
  for (let i = 0; i < 300; i++) { const rr = await call(s, "gacha", { count: 10 }); rr.body.results.forEach((x) => counts[x.rarity]++); }
  const tot = counts.N + counts.R + counts.SR + counts.UR, rate = (k) => counts[k] / tot;
  t(`排出率が設定どおり(N≈55%: ${(rate("N") * 100).toFixed(1)})`, Math.abs(rate("N") - 0.55) < 0.06 && rate("UR") > 0.02 && rate("UR") < 0.07, JSON.stringify(counts));
  // 被った子は自動で凸にならず「予備」として残る（合成か限界突破に使う）。数は取りこぼさない
  const fin = (await s.load("stu1")).state; const totalSpares = Object.values(fin.spares).reduce((a, n) => a + n, 0);
  t("被った子は予備として残る（凸は自動で上がらず、コインにもならない）", Object.values(fin.owned).every((o) => o.breaks === 0) && totalSpares > 0 && Object.keys(fin.dex).length === Object.keys(fin.owned).length, JSON.stringify({ totalSpares }));
  // 天井：100回目までにURが必ず出る
  const s2 = makeStore(); await call(s2, "get_state", {}); const c2 = await s2.load("stu1"); c2.state.crystals = 600; await s2.save("stu1", c2.state, c2.version);
  let gotUR = false; const noUR = () => 0.5; // 常にN(=0.5<0.55)の乱数＝運が最悪でも
  for (let i = 0; i < 12; i++) { const rr = await call(s2, "gacha", { count: 10 }, "stu1", Date.now(), () => 0.9); if (rr.body.results.some((x) => x.rarity === "UR")) gotUR = true; }
  t("天井: 最悪運でも100回以内にURが出る", gotUR);
}

// ===== 3. パーティ編成（未所持は入れられない）
{ const s = makeStore(); await call(s, "get_state", {});
  let r = await call(s, "set_party", { party: ["sp_calc_a_ur", null, null, null, null] }); t("未所持のキャラはパーティに入れない", r.status === 400 && r.body.error === "not-owned");
  r = await call(s, "set_party", { party: [T.STARTER_PARTY[0], T.STARTER_PARTY[0], null, null, null] }); t("同じキャラの重複は不可", r.status === 400);
  r = await call(s, "set_party", { party: [T.STARTER_PARTY[1], T.STARTER_PARTY[0], null, null, null] }); t("所持キャラの並べ替えはOK", r.status === 200 && r.body.state.party[0] === T.STARTER_PARTY[1]); }

// ===== 3.5 画面が作る問題を、サーバーが同じseedで作り直せるか（全単元・全難度）
{ let bad = 0, n = 0;
  for (const g of [1, 2, 3]) for (const c of T.chaptersForGrade(g)) for (const u of c.units) for (const lv of ["easy", "standard", "advanced", "oni"]) {
    const client = T.generatePracticeAvoiding(u, lv, ["x"]); if (!client) continue; n++;
    if (!client.plevel) bad++;
    const server = T.generatePractice(u.id, client.plevel, client.pseed);
    if (!server || String(server.ans) !== String(client.ans) || server.q !== client.q) bad++;
  }
  t(`画面の問題をサーバーが同じseedで再現できる(${n}通り)`, n > 300 && bad === 0, `bad=${bad}`); }

// ===== 4. メダル（サーバーが付与）
const T0 = 1_800_000_000_000; // テスト用の基準時刻
const MIN = 60_000;
function makePracticeAttempts({ uid = unitId, n = 15, correct = true, ms = 3000, seedBase = Math.floor(Math.random() * 1e9), level = "standard" } = {}) {
  return Array.from({ length: n }, (_, i) => {
    const seed = seedBase + i; const q = T.generatePractice(uid, level, seed);
    let ans = String(q.ans);
    if (!correct) ans = "___wrong___";
    return { unitId: uid, level, seed, answer: ans, ms };
  });
}
async function earnMedals(s, u = "stu1", t = T0) { // 本物の手順でメダル2枚を取る（練習5問＋確認5問）
  await call(s, "get_state", {}, u, t);
  const lesson = T.HAICHI_COURSE[1].flatMap((x) => x.lessons).find((l) => (l.u || []).includes(unitId));
  const key = lesson ? `g1m${lesson.n}` : `nv:${unitId}`;
  let r = await call(s, "practice", { attempts: makePracticeAttempts({ n: T.MEDAL.practiceTarget }) }, u, t + 2 * MIN);
  let r2 = await call(s, "confirm", { key, attempts: makePracticeAttempts({ n: 5 }) }, u, t + 4 * MIN);
  return { r, r2, key };
}
{ const s = makeStore(); await call(s, "get_state", {}, "stu1", T0);
  // 4-1 練習15問（実時間が十分経過）→ れんしゅうメダル
  let r = await call(s, "practice", { attempts: makePracticeAttempts({ n: T.MEDAL.practiceTarget }) }, "stu1", T0 + 2 * MIN);
  t("練習: 規定の5問正解でれんしゅうメダル", r.status === 200 && r.body.verified.correct === T.MEDAL.practiceTarget && r.body.newMedals.some((m) => m.kind === "practice") && r.body.state.medals.practiceN[unitId] === T.MEDAL.practiceTarget, JSON.stringify(r.body.verified));
  // 4-2 同じ解答の使い回しは数えない
  const at = makePracticeAttempts({ n: 5, seedBase: 555000 }); await call(s, "practice", { attempts: at }, "stu1", T0 + 4 * MIN);
  r = await call(s, "practice", { attempts: at }, "stu1", T0 + 6 * MIN); t("練習: 同じ問題(seed)の使い回しは数えない", r.body.verified.total === 0);
}
{ const s = makeStore(); await call(s, "get_state", {}, "s", T0);
  let r = await call(s, "practice", { attempts: makePracticeAttempts({ n: T.MEDAL.practiceTarget, ms: 300 }) }, "s", T0 + 2 * MIN);
  t("練習: 速すぎる解答(1秒未満)は正解に数えない", r.status === 200 && r.body.verified.correct === 0 && !(r.body.state.medals.practiceN[unitId] > 0), JSON.stringify(r.body.verified));
  r = await call(s, "practice", { attempts: makePracticeAttempts({ n: T.MEDAL.practiceTarget, correct: false }) }, "s", T0 + 4 * MIN);
  t("練習: まちがいは数えない", r.body.verified.correct === 0);
  // 実時間の持ち分：初回から1秒しか経っていないのに、30問×5秒=150秒ぶんを申請
  const s2 = makeStore(); await call(s2, "get_state", {}, "s", T0);
  r = await call(s2, "practice", { attempts: makePracticeAttempts({ n: 30, ms: 5000 }) }, "s", T0 + 1000);
  t("実時間の持ち分: 経過1秒で150秒ぶんの解答は、ほとんど数えない", r.status === 200 && r.body.verified.total <= 1, JSON.stringify(r.body.verified));
}
{ // 4-3 はいち（確認問題）
  const s = makeStore(); await call(s, "get_state", {}, "s", T0);
  const lesson = T.HAICHI_COURSE[1].flatMap((x) => x.lessons).find((l) => (l.u || []).includes(unitId)); const key = `g1m${lesson.n}`;
  const four = makePracticeAttempts({ n: 5, seedBase: 100 }); four[0].answer = "___wrong___"; // 4/5
  let r = await call(s, "confirm", { key, attempts: four }, "s", T0 + 3 * MIN);
  t("確認: 5問中4問正解(80%)ではいちメダル", r.status === 200 && r.body.verified.passed && r.body.state.medals.haichi[key], JSON.stringify(r.body.verified));
  const s2 = makeStore(); await call(s2, "get_state", {}, "s", T0);
  const three = makePracticeAttempts({ n: 5, seedBase: 200 }); three[0].answer = three[1].answer = "___wrong___";
  r = await call(s2, "confirm", { key, attempts: three }, "s", T0 + 3 * MIN); t("確認: 3/5(60%)では合格しない", r.status === 200 && !r.body.verified.passed && !r.body.state.medals.haichi[key]);
  r = await call(s2, "confirm", { key: "g9m999", attempts: makePracticeAttempts({ n: 5 }) }, "s", T0 + 6 * MIN); t("確認: 存在しないレッスンは拒否", r.status === 400 && r.body.error === "unknown-lesson");
  r = await call(s2, "confirm", { key, attempts: makePracticeAttempts({ n: 3 }) }, "s", T0 + 9 * MIN); t("確認: 5問未満の申請は拒否", r.status === 400);
  const other = makePracticeAttempts({ uid: "u3", n: 5, seedBase: 900 }); r = await call(s2, "confirm", { key, attempts: other }, "s", T0 + 12 * MIN);
  t("確認: そのレッスンに無い単元の問題は数えない", r.status === 200 && r.body.verified.total === 0 && !r.body.verified.passed);
}

// ===== 5. バトル結果の検証（チート対策の本丸）
{ const s = makeStore(); const now = T0 + 10 * MIN;
  // 5-0 メダルが無くても、バトルは受け付ける（メダルの条件なし）。初クリアでバトルメダルを付与する
  const sN = makeStore(); await call(sN, "get_state", {}, "stuN", T0); let r = await call(sN, "claim", { claim: makeClaim({ now }) }, "stuN", now);
  t("メダル無しでもバトル申請を受け付け、初クリアでバトルメダルを付与", r.status === 200 && r.body.rewards.granted && r.body.rewards.newMedals?.some((m) => m.kind === "battle") && T.unitMedalsOf(r.body.state, unitId).battle && T.unitMedalsOf(r.body.state, unitId).count === 1, JSON.stringify(r.body).slice(0, 160));
  { const s0 = makeStore(); await call(s0, "get_state", {}, "stu0", T0);
    const rr = await call(s0, "claim", { claim: makeClaim({ now }) }, "stu0", now);
    const r2 = await call(s0, "claim", { claim: makeClaim({ now: now + 5 * MIN }) }, "stu0", now + 5 * MIN);
    t("バトルメダルは2回目のクリアでは新しく付かない", rr.status === 200 && r2.status === 200 && !(r2.body.rewards.newMedals || []).length); }
  await call(s, "get_state", {}, "stu1", T0);
  await earnMedals(s, "stu1", T0);
  // 5-1 正しい申請 → 初回クリアでチケット1枚（実時間が十分経過）
  let claim = makeClaim({ now }); r = await call(s, "claim", { claim }, "stu1", now);
  t("正しい申請: 初回クリアでクリスタル+2", r.status === 200 && r.body.rewards.granted && r.body.rewards.crystals === 2 && r.body.rewards.isFirstClear, JSON.stringify(r.body).slice(0, 200));
  t("経験値がパーティに配られる", r.body.state.owned[T.STARTER_PARTY[0]].exp > 0);
  r = await call(s, "claim", { claim }, "stu1", now + 5 * MIN); t("同じnonceの再送は拒否", r.status === 400 && r.body.error === "duplicate-claim");
  const replay = { ...claim, nonce: "another-nonce-1" }; r = await call(s, "claim", { claim: replay }, "stu1", now + 10 * MIN);
  t("同じ解答(seed)の使い回しは報酬にならない", r.status === 200 && r.body.rewards.granted === false && r.body.verified.correct === 0, JSON.stringify(r.body.verified));
  const c2 = makeClaim({ now: now + 20 * MIN }); r = await call(s, "claim", { claim: c2 }, "stu1", now + 20 * MIN);
  t("2回目以降のクリアは周回ボーナス💎1(経験値・コインは少なめ)", r.status === 200 && r.body.rewards.granted && r.body.rewards.crystals === T.REWARD.repeatCrystals && r.body.rewards.exp < 200 && !r.body.rewards.isFirstClear, JSON.stringify(r.body.rewards));
  // 5-5 全部まちがい
  const s3 = makeStore(); await earnMedals(s3, "u3", T0); r = await call(s3, "claim", { claim: makeClaim({ correctRate: 0, now }) }, "u3", now);
  t("正解ゼロの申請は報酬なし", r.status === 200 && r.body.rewards.granted === false && r.body.rewards.crystals === 0);
  const liar = makeClaim({ correctRate: 0, now: now + 400000 }); liar.attempts.forEach((a) => (a.correct = true)); liar.won = true; r = await call(s3, "claim", { claim: liar }, "u3", now + 15 * MIN);
  t("『正解した/勝った』と書き足しても無効", r.body.rewards.granted === false);
  // 5-7 速すぎる解答
  const s4 = makeStore(); await earnMedals(s4, "u4", T0); r = await call(s4, "claim", { claim: makeClaim({ ms: 300, now }) }, "u4", now);
  t("速すぎる解答(1.2秒未満)は数えない", r.status === 200 && r.body.rewards.granted === false, JSON.stringify(r.body.verified));
  r = await call(makeStore(), "claim", { claim: makeClaim({ n: 4, now }) }, "u9", now); t("(メダル無しでは)4問の申請は通らない", r.status === 400);
  const s5 = makeStore(); await earnMedals(s5, "u5", T0); r = await call(s5, "claim", { claim: makeClaim({ n: 4, now }) }, "u5", now); t("正解が少なすぎる申請(4問)は報酬なし", r.body.rewards?.granted === false);
  const old = makeClaim({ now }); old.pv = "deadbeef0000"; r = await call(s5, "claim", { claim: old }, "u5", now + 5 * MIN); t("版のずれたクライアントは案内付きで拒否", r.status === 400 && r.body.error === "client-outdated");
  const mix = makeClaim({ now }); mix.attempts[0].unitId = "u2"; const s6 = makeStore(); await earnMedals(s6, "u6", T0); r = await call(s6, "claim", { claim: mix }, "u6", now); t("別単元の解答は数えない(混入OK・その分は無効)", r.status === 200 && r.body.verified.total === mix.attempts.length - 1);
  const s7 = makeStore(); await earnMedals(s7, "u7", T0); await call(s7, "claim", { claim: makeClaim({ now }) }, "u7", now); r = await call(s7, "claim", { claim: makeClaim({ now: now + 5000 }) }, "u7", now + 5000);
  t("短時間の連続申請は拒否", r.status === 400 && r.body.error === "too-soon");
  // 実時間の持ち分：メダルは取ったが、直後に「36秒ぶんの解答」を即申請
  const s8 = makeStore(); await earnMedals(s8, "u8", T0); const drain = T0 + 4 * MIN; // メダル取得直後（持ち分を使い切った状態に近い）
  await call(s8, "practice", { attempts: makePracticeAttempts({ n: 60, ms: 20000, seedBase: 7777 }) }, "u8", drain + 1000);
  r = await call(s8, "claim", { claim: makeClaim({ n: 12, now: drain + 5000 }) }, "u8", drain + 5000); // 経過5秒なのに36秒ぶんの解答
  t("実時間の持ち分: 経過時間より速い解答の連投は拒否", r.status === 400 && r.body.error === "time-mismatch", JSON.stringify(r.body).slice(0, 100));
}

// ===== 6. 二重送信（同時リクエスト）で2回取れない
{ const s = makeStore(); await call(s, "get_state", {}); const cur = await s.load("stu1"); cur.state.crystals = 5; await s.save("stu1", cur.state, cur.version);
  // 2つのリクエストが同じ版を読んでから書く状況を再現
  const a = call(s, "gacha", { count: 1 }), b = call(s, "gacha", { count: 1 }); const [ra, rb] = await Promise.all([a, b]);
  const okCount = [ra, rb].filter((x) => x.status === 200).length; const end = (await s.load("stu1")).state;
  t("同時に2回ガチャを送っても、クリスタル5個で1回しか成立しない", okCount === 1 && (end.crystals === 0 || end.crystals === T.CRYSTAL.dupRefund), `ok=${okCount} crystals=${end.crystals}`); } // 被りが出た時は還元で💎1が戻る（0 か 1 のどちらか）

// ===== 7. 管理者の操作（チケット・全クリア・仲間の調整）＋解答ログにtemplateId
{
  const s = makeStore();
  let r = await T.handleAdmin({ op: "addCrystals", args: { n: 7 }, targetId: "adm1", store: s });
  t("管理者：クリスタルを付与できる", r.status === 200 && r.body.crystals === 7, JSON.stringify(r.body));
  r = await T.handleAdmin({ op: "clearAllMedals", targetId: "adm1", store: s });
  const st = (await s.load("adm1")).state;
  const units = T.chaptersForGrade(1).flatMap((c) => c.units);
  t("管理者：全クリアで全小単元のメダル3枚がそろう", r.status === 200 && units.every((u) => T.unitMedalsOf(st, u.id).count === 3));
  r = await T.handleAdmin({ op: "grantCompanions", args: { mode: "all" }, targetId: "adm1", store: s });
  t("管理者：仲間を全員追加できる", r.status === 200 && r.body.owned > 100, JSON.stringify(r.body));
  r = await T.handleAdmin({ op: "setCompanionGrowth", args: { exp: 5000, breaks: 2 }, targetId: "adm1", store: s });
  const st2 = (await s.load("adm1")).state;
  t("管理者：仲間の経験値・限界突破をそろえられる", Object.values(st2.owned).every((o) => o.exp === 5000 && o.breaks === 2));
  r = await T.handleAdmin({ op: "resetCompanions", targetId: "adm1", store: s });
  t("管理者：仲間を最初の5体に戻せる", r.status === 200 && r.body.owned === 5);
  r = await T.handleAdmin({ op: "nope", targetId: "adm1", store: s });
  t("管理者：知らない操作は拒否", r.status === 400);
  // れんしゅうの解答に templateId が付く（問題ごとの正答率の元）
  const sp = makeStore();
  await call(sp, "get_state", {}, "stuP", Date.now() - 10 * 60000); // 実時間の持ち分を貯めてから
  await call(sp, "practice", { attempts: makePracticeAttempts({ n: 3, ms: 4000, seedBase: 4242 }) }, "stuP", Date.now());
  t("解答ログに templateId が入る", sp.log.attempts.length > 0 && sp.log.attempts.every((x) => typeof x.templateId === "string" && x.templateId.length > 0), JSON.stringify(sp.log.attempts[0]));
}

// ===== 8. クリスタル（初クリア報酬）と10連の保証
{
  const s = makeStore();
  const T0 = Date.now() - 20 * 60000;
  await call(s, "get_state", {}, "cry1", T0);
  { const g0 = await s.load("cry1"); g0.state.daily = { date: T.dayKey(T0), repeat: 0, ok: 0, mission: true }; await s.save("cry1", g0.state, g0.version); } // 毎日の目標は別の節でテスト（ここでは達成済みにしておく）
  // れんしゅう：簡単で5問正解 → クリスタル1（普通で5問 → もう1）。同じ難易度の周回では増えない
  const mk = (lv, base) => Array.from({ length: 5 }, (_, i) => { const seed = base + i; const p = T.generatePractice("u1", lv, seed); return { unitId: "u1", level: lv, seed, answer: p.ans, ms: 2500 }; });
  let r = await call(s, "practice", { attempts: mk("easy", 900100) }, "cry1", T0 + 60000);
  t("れんしゅう(簡単)を初クリア：クリスタル+1", r.status === 200 && r.body.state.crystals === 1 && r.body.crystalEvents.length === 1, JSON.stringify(r.body.crystalEvents));
  r = await call(s, "practice", { attempts: mk("easy", 900200) }, "cry1", T0 + 120000);
  t("同じ難易度をもう一度クリアしても増えない", r.status === 200 && r.body.state.crystals === 1);
  r = await call(s, "practice", { attempts: mk("standard", 900300) }, "cry1", T0 + 180000);
  t("れんしゅう(普通)は別にクリスタル+1", r.status === 200 && r.body.state.crystals === 2);
  // 確認問題：初合格でクリスタル+1
  const lesson = T.haichiKeyForUnit("u1");
  const cf = Array.from({ length: 5 }, (_, i) => { const seed = 900400 + i; const p = T.generatePractice("u1", "standard", seed); return { unitId: "u1", level: "standard", seed, answer: p.ans, ms: 2500 }; });
  r = await call(s, "confirm", { key: lesson, attempts: cf }, "cry1", T0 + 300000);
  t("確認問題に初めて合格：クリスタル+1", r.status === 200 && r.body.verified.passed && r.body.state.crystals === 3, JSON.stringify(r.body.verified));
  const cf2 = Array.from({ length: 5 }, (_, i) => { const seed = 900500 + i; const p = T.generatePractice("u1", "standard", seed); return { unitId: "u1", level: "standard", seed, answer: p.ans, ms: 2500 }; });
  r = await call(s, "confirm", { key: lesson, attempts: cf2 }, "cry1", T0 + 420000);
  t("確認問題の2回目の合格では増えない", r.status === 200 && r.body.state.crystals === 3);
  // 10連は必ずSR以上が1体（最悪の乱数でも）
  const g = await s.load("cry1"); g.state.crystals = 500; await s.save("cry1", g.state, g.version);
  let allOk = true;
  for (let i = 0; i < 8; i++) { const rr = await call(s, "gacha", { count: 10 }, "cry1", Date.now(), () => 0.5); if (!rr.body.results.some((x) => x.rarity === "SR" || x.rarity === "UR")) allOk = false; }
  t("10連：最悪の乱数でもSR以上が必ず1体", allOk);
  // 旧ガチャチケットは 1枚=クリスタル5個 に換算して引き継ぐ
  const s3 = makeStore(); const legacy = { v: 1, tickets: 3 }; await s3.save("old1", legacy, null);
  const lg = await call(s3, "get_state", {}, "old1");
  t("旧チケット3枚 → クリスタル15個に引き継ぎ", lg.body.state.crystals === 15 && lg.body.state.tickets === undefined, JSON.stringify(lg.body.state.crystals));
}

// ===== 9. クリスタルの入り口を増やす：被りの還元／章クリアボーナス／章ボス初撃破（2026-09-25）
{ // 被りの還元：同じ仲間ばかり出る乱数で10連 → 最初の1体は新規、あとは被り。被り1回ごとにクリスタル1個
  const s = makeStore(); await call(s, "get_state", {}, "dup1"); const g = await s.load("dup1"); g.state.crystals = 200; await s.save("dup1", g.state, g.version);
  const r = await call(s, "gacha", { count: 10 }, "dup1", Date.now(), () => 0);
  const dups = r.body.results.filter((x) => !x.isNew).length;
  t(`被りの還元: 被り${dups}回ぶん、クリスタルが1個ずつ戻る`, r.status === 200 && dups >= 8 && r.body.state.crystals === 150 + dups * T.CRYSTAL.dupRefund && r.body.results.filter((x) => !x.isNew).every((x) => x.refund === T.CRYSTAL.dupRefund) && r.body.results.filter((x) => x.isNew).every((x) => !x.refund), JSON.stringify(r.body.state.crystals));
}
{ // 章クリアボーナス＆章ボス
  const ch = T.chaptersForGrade(1)[0]; const units = ch.units.map((u) => u.id);
  const mk = async (u, withMedals = true) => { // 全単元のメダル2枚をそろえた生徒
    const s = makeStore(); await call(s, "get_state", {}, u, T0); const g = await s.load(u);
    for (const id of units) { if (!withMedals && id === units[units.length - 1]) continue; g.state.medals.practiceN[id] = 5; g.state.medals.haichi[T.haichiKeyForUnit(id)] = T0; g.state.medals.battle[id] = T0; }
    await s.save(u, g.state, g.version); return s;
  };
  const attemptsFor = (unitList, n, seedBase) => Array.from({ length: n }, (_, i) => {
    const uid = unitList[i % unitList.length], level = ["easy", "standard", "advanced", "oni"][i % 4];
    const p = T.generateThirdProblem(uid, level, seedBase + i) || T.generateThirdProblem(uid, "standard", seedBase + i);
    return { unitId: uid, level: p.level, seed: seedBase + i, answer: p.choices[p.correctIndex], ms: 3000 };
  });
  const s = await mk("ch1"); let now = T0 + 5 * MIN; let bonuses = [], crystalsGot = 0;
  for (let i = 0; i < ch.units.length; i++) {
    const wbi = T.worldBattleFor(1, ch, ch.units[i]);
    const claim = { nonce: "chap-" + i + Math.random().toString(36).slice(2, 10), pv: T.PROBLEM_VERSION, grade: 1, chapterId: wbi.chapterId, kind: "subUnit", subUnitId: wbi.subUnitId, startedAt: now - 60000, endedAt: now, attempts: attemptsFor([units[i]], 12, 5000000 + i * 100) };
    const r = await call(s, "claim", { claim }, "ch1", now); now += 5 * MIN;
    if (r.status !== 200) { t(`章クリア: ${i + 1}つ目の申請が通る(テスト前提)`, false, JSON.stringify(r.body)); break; }
    bonuses.push(r.body.rewards.chapterBonus || 0); crystalsGot += r.body.rewards.crystals + (r.body.rewards.chapterBonus || 0);
  }
  t("章クリアボーナス: 最後の小単元を初クリアした時だけ5個（途中は0）", bonuses.slice(0, -1).every((b) => b === 0) && bonuses.at(-1) === T.CRYSTAL.chapterClear, JSON.stringify(bonuses));
  // 同じ章を もう一度クリアしてもボーナスは出ない（章ごとに1回）
  const wb0 = T.worldBattleFor(1, ch, ch.units[0]);
  const again = await call(s, "claim", { claim: { nonce: "again-" + Math.random().toString(36).slice(2, 10), pv: T.PROBLEM_VERSION, grade: 1, chapterId: wb0.chapterId, kind: "subUnit", subUnitId: wb0.subUnitId, startedAt: now - 60000, endedAt: now, attempts: attemptsFor([units[0]], 12, 6000000) } }, "ch1", now); now += 5 * MIN;
  t("章クリアボーナス: 章ごとに1回だけ（周回では出ない）", again.status === 200 && !again.body.rewards.chapterBonus && again.body.rewards.crystals === T.REWARD.repeatCrystals);
  // 章ボス：はじめて倒すとクリスタル5個＋コイン
  const bossClaim = (nonce, seedBase, ul = units) => ({ nonce, pv: T.PROBLEM_VERSION, grade: 1, chapterId: ch.id, kind: "chapterBoss", startedAt: now - 60000, endedAt: now, attempts: attemptsFor(ul, 12, seedBase) });
  const before = (await s.load("ch1")).state;
  let b = await call(s, "claim", { claim: bossClaim("boss1-" + Math.random().toString(36).slice(2, 10), 7000000) }, "ch1", now); now += 5 * MIN;
  t("章ボス初撃破: クリスタル5個", b.status === 200 && b.body.rewards.kind === "chapterBoss" && b.body.rewards.crystals === T.CRYSTAL.chapterBossFirst && b.body.state.crystals === before.crystals + T.CRYSTAL.chapterBossFirst, JSON.stringify(b.body.rewards || b.body));
  b = await call(s, "claim", { claim: bossClaim("boss2-" + Math.random().toString(36).slice(2, 10), 8000000) }, "ch1", now); now += 5 * MIN;
  t("章ボス: 2回目以降は報酬なし（何度でも挑戦はできる）", b.status === 200 && b.body.rewards.crystals === 0 && b.body.rewards.reason === "boss-repeat");
  const foreign = { ...bossClaim("boss3-" + Math.random().toString(36).slice(2, 10), 9000000), attempts: Array.from({ length: 12 }, (_, i) => ({ unitId: "zzz", level: "easy", seed: 9000000 + i, answer: "1", ms: 3000 })) };
  b = await call(s, "claim", { claim: foreign }, "ch1", now);
  t("章ボス: その章に無い単元の解答は数えない（申請は不正で拒否 or 報酬なし）", b.status === 400 || (b.status === 200 && b.body.rewards.crystals === 0));
  // メダルが1つでも欠けていると、章ボスの申請は受け付けない（学習に遡れない報酬は作らない）
  const s2 = await mk("ch2", false);
  const c2 = await call(s2, "claim", { claim: { ...bossClaim("boss4-" + Math.random().toString(36).slice(2, 10), 9100000), startedAt: T0, endedAt: T0 + 60000 } }, "ch2", T0 + 5 * MIN);
  t("章ボス: バトルメダルが全単元そろっていないと拒否", c2.status === 400 && c2.body.error === "medals-missing", JSON.stringify(c2.body.error));
}

// ===== 10. 周回ボーナス／毎日の目標／学年クリアボーナス（2026-09-25）
{
  const ch = T.chaptersForGrade(1)[0]; const units = ch.units.map((u) => u.id);
  const allUnits = T.chaptersForGrade(1).flatMap((c) => c.units.map((u) => u.id));
  const withMedals = async (u, list) => { const s = makeStore(); await call(s, "get_state", {}, u, T0); const g = await s.load(u); for (const id of list) { g.state.medals.practiceN[id] = 5; g.state.medals.haichi[T.haichiKeyForUnit(id)] = T0; } await s.save(u, g.state, g.version); return s; };
  const attemptsFor = (unitList, n, seedBase) => Array.from({ length: n }, (_, i) => {
    const uid = unitList[i % unitList.length], level = ["easy", "standard", "advanced", "oni"][i % 4];
    let seed = seedBase + i, p = T.generateThirdProblem(uid, level, seed) || T.generateThirdProblem(uid, "standard", seed);
    for (let k = 1; !p && k < 50; k++) { seed = seedBase + i + k * 1000; p = T.generateThirdProblem(uid, level, seed) || T.generateThirdProblem(uid, "standard", seed); }
    return { unitId: uid, level: p.level, seed, answer: p.choices[p.correctIndex], ms: 3000 };
  });
  let nonceN = 0; const nonce = () => "n10-" + (nonceN++) + Math.random().toString(36).slice(2, 10);
  const subClaim = (chapter, idx, seedBase, now) => { const w = T.worldBattleFor(1, chapter, chapter.units[idx]); return { nonce: nonce(), pv: T.PROBLEM_VERSION, grade: 1, chapterId: w.chapterId, kind: "subUnit", subUnitId: w.subUnitId, startedAt: now - 60000, endedAt: now, attempts: attemptsFor([chapter.units[idx].id], 12, seedBase) }; };

  // --- 周回ボーナス：クリア済みの小単元に勝つと💎1、1日5回まで（6回目からはコイン・経験値のみ）
  { const s = await withMedals("rp1", allUnits); let now = T0 + 5 * MIN;
    const first = await call(s, "claim", { claim: subClaim(ch, 0, 10000000, now) }, "rp1", now); now += 5 * MIN;
    const got = [];
    for (let i = 0; i < 12; i++) { const r = await call(s, "claim", { claim: subClaim(ch, 0, 10100000 + i * 100, now) }, "rp1", now); now += 3 * MIN; got.push(r.body.rewards.crystals); }
    t("周回ボーナス: 初回は💎2、2回目以降は1日10回まで💎1（11回目からは0）", first.body.rewards.crystals === T.REWARD.firstCrystals && JSON.stringify(got) === JSON.stringify([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0]), JSON.stringify(got));
    // 翌日はまた5回
    now = T0 + 26 * 60 * MIN; const nx = await call(s, "claim", { claim: subClaim(ch, 0, 10900000, now) }, "rp1", now);
    t("周回ボーナス: 翌日（日本時間）はまた💎1がもらえる", nx.body.rewards.crystals === 1, JSON.stringify(nx.body.rewards));
  }
  // --- コインは廃止。経験値は「雑魚のぶん」は2回目以降も減らない（減るのはボスのぶんだけ）
  { const s = await withMedals("rp2", allUnits); let now = T0 + 5 * MIN;
    const first = await call(s, "claim", { claim: subClaim(ch, 0, 20000000, now) }, "rp2", now); now += 5 * MIN;
    const repeat = await call(s, "claim", { claim: subClaim(ch, 0, 20100000, now) }, "rp2", now);
    const baseExp = T.getSubUnitClearExpReward(1, ch.id, ch.units[0].id);
    const mobExp = Math.floor(baseExp * T.REWARD.mobExpShare);
    const bossExp = baseExp - mobExp;
    const expectRepeatExp = mobExp + Math.round(bossExp * T.REWARD.repeatExpRate);
    t("コインは無い（報酬にcoinsが無い）", first.status === 200 && !("coins" in first.body.rewards) && !("coins" in repeat.body.rewards), JSON.stringify(first.body.rewards));
    t("初回クリアの経験値は満額", first.body.rewards.exp === baseExp, JSON.stringify({ exp: first.body.rewards.exp, baseExp }));
    t("2回目以降：雑魚のぶんは満額のまま、ボスのぶんだけ減る", repeat.body.rewards.exp === expectRepeatExp && expectRepeatExp > mobExp, JSON.stringify({ exp: repeat.body.rewards.exp, mobExp, expectRepeatExp }));
  }
  // --- 毎日の目標：その日の検証済みの正解が5問で💎1（1日1回）
  { const s = makeStore(); await call(s, "get_state", {}, "dm1", T0);
    let r = await call(s, "practice", { attempts: practiceAttempts3(3, 20000000) }, "dm1", T0 + 2 * MIN);
    const before = r.body.state.crystals;
    t("毎日の目標: 3問ではまだ", !r.body.crystalEvents.some((e) => /今日の目標/.test(e.label)) && r.body.state.daily.ok === 3);
    r = await call(s, "practice", { attempts: practiceAttempts3(2, 20000100) }, "dm1", T0 + 4 * MIN);
    t("毎日の目標: 5問正解でクリスタル1個", r.body.crystalEvents.some((e) => /今日の目標/.test(e.label) && e.n === T.CRYSTAL.dailyMission) && r.body.state.daily.mission === true, JSON.stringify(r.body.crystalEvents));
    r = await call(s, "practice", { attempts: practiceAttempts3(5, 20000200) }, "dm1", T0 + 6 * MIN);
    t("毎日の目標: 1日1回だけ", !r.body.crystalEvents.some((e) => /今日の目標/.test(e.label)));
    r = await call(s, "practice", { attempts: practiceAttempts3(5, 20000300) }, "dm1", T0 + 26 * 60 * MIN);
    t("毎日の目標: 翌日はまた達成できる", r.body.crystalEvents.some((e) => /今日の目標/.test(e.label)) && r.body.state.daily.ok === 5);
    // まちがいは数えない
    const s2 = makeStore(); await call(s2, "get_state", {}, "dm2", T0);
    const w = await call(s2, "practice", { attempts: practiceAttempts3(8, 20000400, false) }, "dm2", T0 + 2 * MIN);
    t("毎日の目標: まちがい・速すぎる解答は数えない", w.body.state.daily.ok === 0 && !w.body.state.daily.mission);
  }
  // --- 学年クリアボーナス：全章の「章クリアボーナス」と「章ボス初撃破」がそろった時に💎30（学年ごとに1回）
  { const s = await withMedals("gr1", allUnits); let now = T0 + 5 * MIN; const chs = T.chaptersForGrade(1); let gradeBonuses = [], failed = null, seed = 30000000;
    for (const c of chs) {
      for (let i = 0; i < c.units.length; i++) { const r = await call(s, "claim", { claim: subClaim(c, i, seed, now) }, "gr1", now); seed += 100; now += 3 * MIN; if (r.status !== 200) { failed = JSON.stringify(r.body); break; } gradeBonuses.push(r.body.rewards.gradeBonus || 0); }
      if (failed) break;
      const bc = { nonce: nonce(), pv: T.PROBLEM_VERSION, grade: 1, chapterId: c.id, kind: "chapterBoss", startedAt: now - 60000, endedAt: now, attempts: attemptsFor(c.units.map((u) => u.id), 12, seed) }; seed += 100;
      const r = await call(s, "claim", { claim: bc }, "gr1", now); now += 3 * MIN;
      if (r.status !== 200) { failed = JSON.stringify(r.body); break; }
      gradeBonuses.push(r.body.rewards.gradeBonus || 0);
    }
    const st = (await s.load("gr1")).state;
    t("学年クリアボーナス: 全章の章ボスまでそろった最後の1回だけ💎30", !failed && gradeBonuses.slice(0, -1).every((b) => b === 0) && gradeBonuses.at(-1) === T.CRYSTAL.gradeClear && !!st.gradeDone[1], failed || JSON.stringify(gradeBonuses.filter((b) => b)));
    // 受け取り済みの学年で、もう一度章ボスを倒しても出ない
    const c0 = chs[0]; const again = await call(s, "claim", { claim: { nonce: nonce(), pv: T.PROBLEM_VERSION, grade: 1, chapterId: c0.id, kind: "chapterBoss", startedAt: now - 60000, endedAt: now, attempts: attemptsFor(c0.units.map((u) => u.id), 12, seed) } }, "gr1", now);
    t("学年クリアボーナス: 学年ごとに1回だけ", again.status === 200 && !again.body.rewards.gradeBonus);
  }
  function practiceAttempts3(n, seedBase, correct = true) { return Array.from({ length: n }, (_, i) => { const seed = seedBase + i; const q = T.generatePractice(unitId, "standard", seed); return { unitId, level: "standard", seed, answer: correct ? String(q.ans) : "___wrong___", ms: correct ? 3000 : 300 }; }); }
}

// ===== 11. 被りの予備・合成（いらない仲間を経験値に）・限界突破（2026-09-25）
{
  const s = makeStore(); await call(s, "get_state", {}, "sy1", T0);
  const g = await s.load("sy1"); g.state.crystals = 200; await s.save("sy1", g.state, g.version);
  const r = await call(s, "gacha", { count: 10 }, "sy1", T0, () => 0); // 同じ仲間ばかり出る乱数
  const id = r.body.results[0].id; const st = r.body.state;
  t("被り: 予備が数えられ、結果に出る", st.spares[id] === 10 && r.body.results.filter((x) => x.spare).length === 10 && r.body.results.at(-1).spares === 10, JSON.stringify(st.spares));
  const target = T.STARTER_PARTY[0]; const exp0 = st.owned[target].exp;
  let m = await call(s, "synthesize", { materialId: id, targetId: target, source: "spare", count: 3 }, "sy1", T0);
  t("合成(予備3体): 経験値が 200×3 増え、予備が減る", m.status === 200 && m.body.gain === 3 * T.SYNTH.baseExp && m.body.state.owned[target].exp === exp0 + 600 && m.body.state.spares[id] === 7, JSON.stringify(m.body.gain));
  m = await call(s, "synthesize", { materialId: id, targetId: target, source: "spare", count: 99 }, "sy1", T0); t("合成: 持っている予備より多くは使えない", m.status === 400 && m.body.error === "no-spare");
  // 持っている仲間（パーティ外）を素材にする：200＋経験値÷2
  const cur = await s.load("sy1"); cur.state.owned[id].exp = 1000; cur.state.spares = {}; await s.save("sy1", cur.state, cur.version); // 素材にする子(経験値1000)・予備なし
  m = await call(s, "synthesize", { materialId: id, targetId: target, source: "owned" }, "sy1", T0);
  t("合成(持っている仲間): 200＋経験値÷2＝700。素材の子は仲間からいなくなるが図鑑には残る", m.status === 200 && m.body.gain === 700 && !m.body.state.owned[id] && m.body.state.dex[id] === 1 && m.body.state.owned[target].exp === exp0 + 600 + 700 - 0 * 1 || (m.status === 200 && m.body.gain === 700 && !m.body.state.owned[id] && m.body.state.dex[id] === 1), JSON.stringify(m.body));
  m = await call(s, "synthesize", { materialId: target, targetId: T.STARTER_PARTY[1], source: "owned" }, "sy1", T0); t("合成: パーティに入っている子は素材にできない", m.status === 400 && m.body.error === "in-party");
  m = await call(s, "synthesize", { materialId: T.STARTER_PARTY[1], targetId: T.STARTER_PARTY[1], source: "owned" }, "sy1", T0); t("合成: 自分自身は素材にできない", m.status === 400);
  m = await call(s, "synthesize", { materialId: "no_such", targetId: target, source: "owned" }, "sy1", T0); t("合成: 持っていない子は素材にできない", m.status === 400);
  m = await call(s, "synthesize", { materialId: id, targetId: "no_such", source: "spare" }, "sy1", T0); t("合成: 持っていない子は強化できない", m.status === 400);
  m = await call(s, "synthesize", { materialId: id, targetId: target, source: "hack" }, "sy1", T0); t("合成: 不正な指定は拒否", m.status === 400);
  // 予備が残っている子は、先に予備から使う（持っている子を先に消して予備だけ残る事故を防ぐ）
  const s2 = makeStore(); await call(s2, "get_state", {}, "sy2", T0); const g2 = await s2.load("sy2"); g2.state.crystals = 200; await s2.save("sy2", g2.state, g2.version);
  const r2 = await call(s2, "gacha", { count: 10 }, "sy2", T0, () => 0); const id2 = r2.body.results[0].id;
  m = await call(s2, "synthesize", { materialId: id2, targetId: T.STARTER_PARTY[0], source: "owned" }, "sy2", T0); t("合成: 予備がある子は、先に予備を使う", m.status === 400 && m.body.error === "use-spare-first");
  // 限界突破
  let lb = await call(s2, "limit_break", { id: id2 }, "sy2", T0); t("限界突破: 予備を1つ使って凸+1", lb.status === 200 && lb.body.breaks === 1 && lb.body.state.spares[id2] === 9);
  for (let i = 0; i < 3; i++) lb = await call(s2, "limit_break", { id: id2 }, "sy2", T0);
  t("限界突破: 最大4まで", lb.body.breaks === 4 && lb.body.state.spares[id2] === 6);
  lb = await call(s2, "limit_break", { id: id2 }, "sy2", T0); t("限界突破: 5回目は拒否(max-breaks)", lb.status === 400 && lb.body.error === "max-breaks");
  lb = await call(s2, "limit_break", { id: T.STARTER_PARTY[3] }, "sy2", T0); t("限界突破: 予備が無い子は拒否", lb.status === 400 && lb.body.error === "no-spare");
}

// ===== 12. 協力プレイの裏ボス連戦：相手の一覧・強さ・ごほうび・称号（2026-09-25）
{
  t("裏ボス連戦: 全21体（中1が7・中2が6・中3が8）で、章の順", T.RAID_LADDER.length === 21 && [1, 2, 3].map((g) => T.RAID_LADDER.filter((b) => b.grade === g).length).join() === "7,6,8" && T.RAID_LADDER.every((b, i) => b.index === i));
  const s0 = T.initialThirdState(); const b0 = T.raidStats(0), bl = T.raidStats(20);
  t("裏ボスの強さ: HPは章ボスの5倍・後半ほど強い", b0.hp > 0 && bl.hp > b0.hp && b0.dmg > 0);
  let r = T.applyRaidWin(s0, 0, T0); const st1 = r.state;
  t("裏ボス初撃破: 💎10＋称号", r.ok && r.rewards.crystals === T.RAID.firstCrystals && !!r.rewards.title && st1.crystals === T.RAID.firstCrystals && T.titlesOf(st1).find((x) => x.id === "raid_c1").got);
  const ds = [];
  let st = st1; for (let i = 0; i < 5; i++) { r = T.applyRaidWin(st, 0, T0 + (i + 1) * MIN); st = r.state; ds.push(r.rewards.crystals); }
  t("裏ボス周回: 💎1が1日3回まで（4回目から0）", JSON.stringify(ds) === JSON.stringify([1, 1, 1, 0, 0]), JSON.stringify(ds));
  r = T.applyRaidWin(st, 0, T0 + 30 * 60 * MIN); t("裏ボス周回: 翌日はまた💎1", r.rewards.crystals === 1);
  // 学年制覇（中1の7体）と全制覇（21体）
  let sc = T.initialThirdState(); const got = [];
  for (const b of T.RAID_LADDER) { const rr = T.applyRaidWin(sc, b.index, T0 + b.index * MIN); sc = rr.state; got.push([rr.rewards.gradeBonus, rr.rewards.allBonus]); }
  t("学年制覇ボーナス: 各学年の最後の1体で💎20（中1=7体目・中2=13体目・中3=21体目）", got[6][0] === T.RAID.gradeBonus && got[12][0] === T.RAID.gradeBonus && got[20][0] === T.RAID.gradeBonus && got.filter((g) => g[0] > 0).length === 3, JSON.stringify(got.map((g) => g[0])));
  t("全制覇ボーナス: 21体すべてで💎50（1回）", got[20][1] === T.RAID.allBonus && got.filter((g) => g[1] > 0).length === 1 && T.titlesOf(sc).find((x) => x.id === "all").got);
  t("称号: 全部で 21＋3＋1＝25種", T.titlesOf(sc).length === 25 && T.titlesOf(sc).every((x) => x.got) && T.titlesOf(T.initialThirdState()).every((x) => !x.got));
  t("裏ボスの範囲外は拒否", T.applyRaidWin(s0, 99, T0).ok === false);
  // クライアントから直接「倒した」と申請する操作は存在しない（不正にごほうびを取れない）
  const s = makeStore(); await call(s, "get_state", {}, "rd1", T0);
  const bad = await call(s, "raid_win", { index: 0 }, "rd1", T0); t("裏ボスのごほうびは、クライアントから直接は申請できない", bad.status === 400 && bad.body.error === "unknown-action");
}

// ===== 13. ストーリーどおり：前のバトルをクリアすると次が開く（2026-09-25）
{
  const ch1 = T.chaptersForGrade(1)[0], ch2 = T.chaptersForGrade(1)[1]; const u1 = ch1.units.map((u) => u.id), lastC1 = u1[u1.length - 1], firstC2 = ch2.units[0].id;
  const st = T.initialThirdState();
  t("バトルの順番: 学年の最初の小単元はいつでも開いている", T.battleOpen(st, 1, u1[0]) && !T.battleOpen(st, 1, u1[1]) && !T.battleOpen(st, 1, u1[2]));
  t("バトルの順番: 状態が未取得(null)の間は開けておく（サーバーが最終判定）", T.battleOpen(null, 1, u1[3]));
  const cl = (ids) => { const x = T.initialThirdState(); for (const id of ids) x.medals.battle[id] = 1; return x; };
  t("バトルの順番: 前をクリアすると次だけが開く", T.battleOpen(cl([u1[0]]), 1, u1[1]) && !T.battleOpen(cl([u1[0]]), 1, u1[2]));
  t("バトルの順番: 章をまたいでも同じ（前の章の最後をクリアすると、次の章の最初が開く）", !T.battleOpen(cl(u1.slice(0, -1)), 1, firstC2) && T.battleOpen(cl(u1), 1, firstC2) && !T.battleOpen(cl(u1), 1, ch2.units[1].id));
  t("バトルの順番: 以前に先へ進んでいた人は行き止まりにならない（いちばん先の次まで開く）", T.battleOpen(cl([u1[4]]), 1, u1[2]) && T.battleOpen(cl([u1[4]]), 1, u1[5]) && !T.battleOpen(cl([u1[4]]), 1, u1[6] ?? firstC2));
  t("バトルの順番: 学年ごとに別（中2の最初はいつでも）", T.battleOpen(T.initialThirdState(), 2, T.chaptersForGrade(2)[0].units[0].id));
  // サーバーの申請：前をクリアしていないと拒否 → クリアすると通る
  const s = makeStore(); await call(s, "get_state", {}, "lk1", T0);
  const attemptsFor = (uid, n, seedBase) => Array.from({ length: n }, (_, i) => { const lv = ["easy", "standard", "advanced", "oni"][i % 4]; let seed = seedBase + i, p = T.generateThirdProblem(uid, lv, seed) || T.generateThirdProblem(uid, "standard", seed); for (let k = 1; !p && k < 50; k++) { seed = seedBase + i + k * 1000; p = T.generateThirdProblem(uid, lv, seed) || T.generateThirdProblem(uid, "standard", seed); } return { unitId: uid, level: p.level, seed, answer: p.choices[p.correctIndex], ms: 3000 }; });
  const claimFor = (idx, seedBase, now) => { const w = T.worldBattleFor(1, ch1, ch1.units[idx]); return { nonce: "lk-" + idx + Math.random().toString(36).slice(2, 10), pv: T.PROBLEM_VERSION, grade: 1, chapterId: w.chapterId, kind: "subUnit", subUnitId: w.subUnitId, startedAt: now - 60000, endedAt: now, attempts: attemptsFor(u1[idx], 12, seedBase) }; };
  let now = T0 + 5 * MIN;
  let r = await call(s, "claim", { claim: claimFor(2, 40000000, now) }, "lk1", now); now += 3 * MIN;
  t("バトルの順番(サーバー): 前をクリアしていない小単元の申請は拒否(locked)", r.status === 400 && r.body.error === "locked", JSON.stringify(r.body.error));
  r = await call(s, "claim", { claim: claimFor(0, 40001000, now) }, "lk1", now); now += 3 * MIN;
  t("バトルの順番(サーバー): 最初の小単元は通り、バトルメダルが付く", r.status === 200 && r.body.state.medals.battle[u1[0]] > 0);
  r = await call(s, "claim", { claim: claimFor(2, 40002000, now) }, "lk1", now); now += 3 * MIN;
  t("バトルの順番(サーバー): 1つ飛ばした3つ目はまだ拒否", r.status === 400 && r.body.error === "locked");
  r = await call(s, "claim", { claim: claimFor(1, 40003000, now) }, "lk1", now); now += 3 * MIN;
  t("バトルの順番(サーバー): 2つ目をクリアすると", r.status === 200);
  r = await call(s, "claim", { claim: claimFor(2, 40004000, now) }, "lk1", now);
  t("バトルの順番(サーバー): 3つ目が開いて通る", r.status === 200 && r.body.state.medals.battle[u1[2]] > 0, JSON.stringify(r.body.error));
}

// ---------------- 学年ごとの強さ（敵の強さ・経験値・キャラの経験値） ----------------
{
  const gsum = (g) => T.SUBUNIT_SEQUENCE.filter((x) => x.grade === g).map((x) => T.getSubUnitClearExpReward(g, x.chapterId, x.subUnitId));
  const sum = (a) => a.reduce((x, y) => x + y, 0);
  const s1 = sum(gsum(1)), s2 = sum(gsum(2)), s3 = sum(gsum(3));
  t("学年ごとの経験値: 中2・中3の合計が中1と(誤差3%以内で)同じ", Math.abs(s2 - s1) / s1 < 0.03 && Math.abs(s3 - s1) / s1 < 0.03, `${s1} ${s2} ${s3}`);
  const seqOf = (g) => T.SUBUNIT_SEQUENCE.filter((x) => x.grade === g);
  const last = (g) => { const x = seqOf(g).at(-1); return T.tierOf(g, x.chapterId, x.subUnitId); };
  const first = (g) => { const x = seqOf(g)[0]; return T.tierOf(g, x.chapterId, x.subUnitId); };
  t("学年ごとの敵の強さ: どの学年も最初は0、最後は中1の最後と同じ", [1, 2, 3].every((g) => first(g) === 0) && Math.abs(last(2) - last(1)) < 1e-9 && Math.abs(last(3) - last(1)) < 1e-9);
  const o = { exp: 100, exp2: 0, exp3: 0 };
  t("学年ごとの経験値: 学年別に読み出せる", T.expOf(o, 1) === 100 && T.expOf(o, 2) === 0 && T.expOf(o, 3) === 0);
  const st = T.initialThirdState(); const id = T.STARTER_PARTY[0];
  t("学年ごとの経験値: 初期状態は全学年0", [1, 2, 3].every((g) => T.expOf(st.owned[id], g) === 0));
  const s = makeStore(); await call(s, "get_state", {}, "gx1", T0);
  const g = await s.load("gx1"); g.state.spares = { [T.STARTER_PARTY[1]]: 2 }; await s.save("gx1", g.state, g.version);
  const m = await call(s, "synthesize", { materialId: T.STARTER_PARTY[1], targetId: id, source: "spare", count: 2, grade: 3 }, "gx1", T0);
  const o2 = m.body.state.owned[id];
  t("学年ごとの経験値: 合成は指定した学年の経験値だけ増える（中3を指定→中1・中2は増えない）", m.status === 200 && o2.exp3 === 400 && o2.exp === 0 && o2.exp2 === 0, JSON.stringify(o2));
}

// ---------------- 合成：まとめて合成・二重指定・消費の確認 ----------------
{
  const s = makeStore(); await call(s, "get_state", {}, "mx1", T0);
  const g = await s.load("mx1"); const ids = Object.keys(g.state.owned);
  const [a, b, c, d, e] = ids; // 初期5体（全員パーティ）。パーティから外して素材にする
  g.state.party = [a, null, null, null, null].map((x) => x || null);
  g.state.spares = { [b]: 3 };
  await s.save("mx1", g.state, g.version);
  let m = await call(s, "synthesize", { targetId: a, grade: 1, materials: [{ id: b, source: "spare", count: 2 }, { id: c, source: "owned" }, { id: d, source: "owned" }] }, "mx1", T0);
  t("まとめて合成: 予備2＋持っている子2を一度に。経験値の合計が入る", m.status === 200 && m.body.gain === 2 * T.SYNTH.baseExp + 2 * T.SYNTH.baseExp && m.body.used === 4, JSON.stringify(m.body.gain));
  const st = m.body.state;
  t("まとめて合成: 使った子は仲間から消える／予備は減る／図鑑には残る", !st.owned[c] && !st.owned[d] && st.owned[e] && st.spares[b] === 1 && st.dex[c] === 1);
  m = await call(s, "synthesize", { targetId: a, grade: 1, materials: [{ id: c, source: "owned" }] }, "mx1", T0);
  t("合成した子は もう素材に使えない（永遠に合成できない）", m.status === 400 && m.body.error === "bad-material");
  m = await call(s, "synthesize", { targetId: a, grade: 1, materials: [{ id: e, source: "owned" }, { id: e, source: "owned" }] }, "mx1", T0);
  t("同じ子の二重指定は拒否（一度に2回ぶん消費できない）", m.status === 400);
  const before = await s.load("mx1");
  t("拒否された合成では何も減らない", !!before.state.owned[e] && before.state.spares[b] === 1);
}

// ---- 回帰：バトルが無い小単元があっても、順番が止まらない／式の答えも正解と判定される
{
  for (const g of [1, 2, 3]) {
    const st = T.initialThirdState();
    for (const c of T.chaptersForGrade(g)) for (const u of c.units) {
      if (T.worldBattleFor(g, c, u) && T.battleOpen(st, g, u.id)) st.medals.battle[u.id] = 1;
    }
    const all = T.chaptersForGrade(g).every((c) => T.chapterBattlesCleared(st, g, c));
    t(`中${g}：戦えるバトルを順に全部クリアすれば、全章の章ボスまで開く`, all);
  }
  let bad = 0, n = 0;
  for (const u of ["h1", "h2", "v1", "v3", "z3"]) for (let k = 1; k <= 60; k++) {
    const q = T.generatePractice(u, "standard", k * 104729); if (!q) continue; n++;
    if (!T.practiceCorrect(q, q.ans)) bad++;
  }
  t(`式の答え(y＝5x・−n/4・π など)を選ぶと正解になる（${n}問）`, n > 0 && bad === 0, `${bad}問が不正解扱い`);
}

// ---- 難易度で問題が変わる（2026-09-30：生成関数に難易度が届かず、簡単〜難しいが同じ問題になっていた不具合の再発防止）
{
  const L = ["easy", "standard", "advanced", "oni"];
  const qs = (fn) => new Set(Array.from({ length: 40 }, (_, i) => fn(9001 + i * 7919)).filter(Boolean).map((p) => String(p.q ?? p.question)));
  const overlap = (a, b) => { let k = 0; for (const x of a) if (b.has(x)) k++; return k / Math.max(1, Math.min(a.size, b.size)); };
  const worst = [];
  for (const g of [1, 2, 3]) for (const ch of T.chaptersForGrade(g)) for (const u of ch.units) {
    const sets = L.map((l) => qs((seed) => T.generatePractice(u, l, seed)));
    const ea = overlap(sets[0], sets[2]), ao = overlap(sets[2], sets[3]);
    if (ea >= 0.5 || ao >= 0.5) worst.push(`${u.id}(簡単-難しい${Math.round(ea * 100)}%・難しい-鬼${Math.round(ao * 100)}%)`);
  }
  t("練習：どの単元も、簡単と難しい・難しいと鬼で同じ問題が半分以上にならない", worst.length === 0, worst.join(" "));
  const battleSame = [];
  for (const u of ["u2", "u4", "e1", "h1", "g2c1u1", "g3c1u3"]) {
    const e = qs((seed) => T.generateThirdProblem(u, "easy", seed)), o = qs((seed) => T.generateThirdProblem(u, "oni", seed));
    if (overlap(e, o) > 0.2) battleSame.push(u);
  }
  t("バトル：難易度を変えると問題も変わる（とけた式の単元も）", battleSame.length === 0, battleSame.join(","));
}

// ---------------- 裏ボス（やり込み・非公開）：順番・ごほうび・検証 ----------------
{
  const units1 = T.chaptersForGrade(1).flatMap((c) => c.units.map((u) => u.id));
  const mkAttempts = (n, seedBase) => Array.from({ length: n }, (_, i) => { const uid = units1[i % units1.length]; const lv = ["easy", "standard", "advanced", "oni"][i % 4]; let seed = seedBase + i, p = T.generateThirdProblem(uid, lv, seed); for (let k = 1; !p && k < 60; k++) { seed = seedBase + i + k * 1000; p = T.generateThirdProblem(uid, lv, seed); } return { unitId: uid, level: p.level, seed, answer: p.choices[p.correctIndex], ms: 3000 }; });
  const s = makeStore(); await call(s, "get_state", {}, "sc1", T0);
  const claimOf = (idx, seedBase, n = 24) => ({ nonce: "sc-" + idx + Math.random().toString(36).slice(2, 10), pv: T.PROBLEM_VERSION, grade: 1, kind: "secretBoss", index: idx, startedAt: T0, endedAt: T0 + 1, attempts: mkAttempts(n, seedBase) });
  let now = T0 + 10 * MIN;
  let r = await call(s, "claim", { claim: claimOf(0, 70000000) }, "sc1", now); now += 3 * MIN;
  t("裏ボス: 学年をクリアする前は挑戦できない(locked)", r.status === 400 && r.body.error === "locked", JSON.stringify(r.body.error));
  const g = await s.load("sc1"); g.state.gradeDone = { 1: 1 }; g.state.owned = g.state.owned; await s.save("sc1", g.state, g.version);
  r = await call(s, "claim", { claim: claimOf(1, 70010000) }, "sc1", now); now += 3 * MIN;
  t("裏ボス: 前の裏ボスを倒していないと次は挑戦できない", r.status === 400 && r.body.error === "locked");
  const before = (await s.load("sc1")).state; const p0 = before.party.filter(Boolean)[0];
  r = await call(s, "claim", { claim: claimOf(0, 70020000) }, "sc1", now); now += 3 * MIN;
  const st = r.body.state;
  t("裏ボス: 1体目をはじめて倒すと、クリスタルと経験値（学年別）が入る", r.status === 200 && r.body.rewards.isFirstClear && r.body.rewards.crystals === T.SECRET.firstCrystals[0] && r.body.rewards.perMember === T.secretFirstExp(0) && T.expOf(st.owned[p0], 1) === T.expOf(before.owned[p0], 1) + T.secretFirstExp(0) && T.expOf(st.owned[p0], 2) === 0, JSON.stringify(r.body.rewards || r.body));
  r = await call(s, "claim", { claim: claimOf(1, 70030000) }, "sc1", now); now += 3 * MIN;
  t("裏ボス: 1体目を倒すと2体目が開く", r.status === 200 && r.body.rewards.isFirstClear && !!r.body.state.secret.cleared["1:1"]);
  r = await call(s, "claim", { claim: claimOf(0, 70040000) }, "sc1", now); now += 3 * MIN;
  t("裏ボス: 周回は経験値だけ（クリスタルなし）", r.status === 200 && !r.body.rewards.isFirstClear && r.body.rewards.crystals === 0 && r.body.rewards.perMember === T.secretRepeatExp(0));
  r = await call(s, "claim", { claim: claimOf(2, 70050000, 8) }, "sc1", now); now += 3 * MIN;
  t("裏ボス: 正解が少なすぎる申請は認めない（HPが高いので、そんなに少なく倒せない）", r.status === 200 && r.body.rewards.granted === false);
  r = await call(s, "claim", { claim: { ...claimOf(9, 70060000) } }, "sc1", now);
  t("裏ボス: 番号が範囲外なら拒否", r.status === 400);
  t("裏ボスの強さ: 前の裏ボスより必ずHPが高い・推奨レベルは30〜90", T.secretLadder(1).every((b, i, a) => (i === 0 || b.hp > a[i - 1].hp) && b.recLevel === 30 + 10 * i) && T.secretLadder(2).length === 7 && T.secretLadder(3).length === 7);
}

// ---------------- 敵の技：ボスのパターン・雑魚の状態異常 ----------------
{
  const boss = (id, extra = {}) => ({ id, kind: "chapterBoss", hp: 100, maxHp: 100, ...extra });
  let ok = true, chargeThenBig = true;
  for (const kind of ["unitSmallBoss", "chapterBoss"]) for (const name of Object.keys(T.BOSS_PATTERNS)) {
    const pat = T.BOSS_PATTERNS[name], mv = T.movesFor(kind);
    // 正規化した平均が1倍になる（強さの調整を崩さない）
    const norm = T.patternAverage(name, kind);
    const avg = pat.reduce((a, m) => a + mv[m].dmg / norm, 0) / pat.length;
    if (Math.abs(avg - 1) > 1e-9) ok = false;
    pat.forEach((m, i) => { if (m === "charge" && pat[(i + 1) % pat.length] !== "big") chargeThenBig = false; });
  }
  t("ボスの技: どのパターンも、1周のダメージ平均がちょうど1倍（強さの調整を崩さない）", ok);
  const sm = T.movesFor("unitSmallBoss"), cm = T.movesFor("chapterBoss");
  t("小単元ボスの技: 状態異常1.5倍・ため攻撃4倍・ためずに2倍（ふつうの攻撃を1倍として）", sm.venom.dmg === 1.5 && sm.big.dmg === 4 && sm.heavy.dmg === 2 && sm.slash.dmg === 1 && sm.venom.status === 1);
  t("章ボスの技: 状態異常2倍・ため攻撃6倍・ためずに4倍", cm.venom.dmg === 2 && cm.big.dmg === 6 && cm.heavy.dmg === 4 && cm.venom.status === 1);
  t("ボスの技: 「ため」の次は必ず「大技」", chargeThenBig);
  t("雑魚の攻撃: 約45%が「状態異常＋ふつうのダメージ」、それ以外はふつうの攻撃だけ", (() => { let n = 0; for (let i = 0; i < 4000; i++) if (T.mobAttack({ id: "mob_1" }).statusAttack) n++; return Math.abs(n / 4000 - T.MOB_STATUS_ATTACK_CHANCE) < 0.04 && !T.mobAttack({ id: "x" }, () => 0.99).statusAttack && T.mobAttack({ id: "x" }, () => 0.01).dmgMul === 1; })());
  const seq = (b) => { const st = {}; return Array.from({ length: 8 }, () => T.nextBossMove(b, st).move); };
  const a = seq(boss("boss_x")), b = seq(boss("boss_x"));
  t("ボスの技: 同じボスはいつも同じ順番（覚えると対策できる）", JSON.stringify(a) === JSON.stringify(b) && new Set(a).size >= 3);
  const pats = new Set(Array.from({ length: 40 }, (_, i) => T.bossPatternName(boss("boss_" + i))));
  t("ボスの技: いろいろなパターンのボスがいる", pats.size >= 4);
  t("裏ボス: 7体で、パターンが全部そろう", new Set(Array.from({ length: 7 }, (_, i) => T.bossPatternName({ id: "z", kind: "secretBoss", secretIndex: i }))).size === Object.keys(T.BOSS_PATTERNS).length);
  const nm = T.nextBossMove({ id: "z", kind: "secretBoss", secretIndex: 0, hp: 40, maxHp: 100 }, { step: 0 });
  t("裏ボス: HPが半分以下になると激しくなる（ダメージ×1.15）", nm.enraged && Math.abs(nm.dmgMul - (nm.def.dmg / T.patternAverage(T.bossPatternName({ id: "z", kind: "secretBoss", secretIndex: 0 }), "secretBoss")) * 1.15) < 1e-9);
  const share = Array.from({ length: 200 }, (_, i) => T.mobSpecialty({ id: "mob_" + i })).filter(Boolean).length / 200;
  t(`雑魚の状態異常: 半分以上の雑魚が得意な状態異常を持つ(${(share * 100).toFixed(0)}%)`, share > 0.5 && share < 0.75);
  t("雑魚の状態異常: 同じ敵はいつも同じ状態異常", T.mobSpecialty({ id: "mob_5" }) === T.mobSpecialty({ id: "mob_5" }));
  const ch = { resistances: { poison: 0.3 * 100 } };
  let n0 = 0, n1 = 0; for (let i = 0; i < 4000; i++) { if (T.rollStatusInflict("poison", ch, 0)) n0++; if (T.rollStatusInflict("poison", ch, T.MOB_STATUS_BONUS)) n1++; }
  t(`雑魚の状態異常: 得意な状態異常はかかりやすい（確率が約+${Math.round(T.MOB_STATUS_BONUS * 100)}%）`, Math.abs(n1 / 4000 - n0 / 4000 - T.MOB_STATUS_BONUS) < 0.05, `${n0 / 4000} → ${n1 / 4000}`);
}

// ---------------- 新しいスキル（16種）・状態異常回復の増加・敵とパーティの効果 ----------------
{
  const cnt = {}; for (const c of T.SPECIALIST_ROSTER) cnt[c.skill.category] = (cnt[c.skill.category] || 0) + 1;
  t("仲間: スキルは4種類だけ（全体ダメージ・単体ダメージ・回復・状態異常回復）。ほかは廃止", Object.keys(cnt).sort().join() === "aoeDamage,cure,heal,singleDamage", JSON.stringify(cnt));
  t("仲間: 各レア度35体＝全体9・単体9・回復9・状態異常回復8", ["N", "R", "SR", "UR"].every((r) => { const of = (k) => T.SPECIALIST_ROSTER.filter((c) => c.rarity === r && c.skill.category === k).length; return of("aoeDamage") === 9 && of("singleDamage") === 9 && of("heal") === 9 && of("cure") === 8; }));
  t("仲間: 全体140体・初期の仲間5体は変わらない（全体攻撃のまま）", T.SPECIALIST_ROSTER.length === 140 && T.STARTER_PARTY.every((id) => T.SPECIALIST_ROSTER.find((c) => c.id === id).skill.category === "aoeDamage"));
  t("スキル定義（廃止中・コードだけ残してある）: 説明文つきで作れる", T.NEW_SKILL_KEYS.every((k) => [1, 2, 3, 4].every((tr) => { const s = T.buildSkill(k, tr); return s.desc && s.tier === tr && s.category === k; })));
  // 敵の効果
  const map = T.newEnemyFx(), mob = { instanceId: "m1", maxHp: 1000, kind: undefined }, bs = { instanceId: "b1", maxHp: 100000, kind: "chapterBoss" };
  T.applySkip(map, mob, 2, "sleep"); T.applySkip(map, bs, 2, "sleep"); T.applyPoison(map, mob, 0.05, 3); T.applyPoison(map, bs, 0.05, 3); T.applyCurse(map, mob, 0.7, 2);
  let a = T.tickEnemyTurn(map, mob), a2 = T.tickEnemyTurn(map, mob), a3 = T.tickEnemyTurn(map, mob);
  t("敵の効果: ねむりは2回ぶん行動不能→3回目は動ける", a.skip && a2.skip && !a3.skip);
  t("敵の効果: 毒は3回・そのたびに最大HPの5%", a.poisonDamage === 50 && a2.poisonDamage === 50 && a3.poisonDamage === 50 && T.tickEnemyTurn(map, mob).poisonDamage === 0);
  t("敵の効果: 呪いは2回ぶん攻撃力ダウン", a.atkMul === 0.7 && a2.atkMul === 0.7 && a3.atkMul === 1);
  const b1 = T.tickEnemyTurn(map, bs), b2 = T.tickEnemyTurn(map, bs);
  t("敵の効果: ボスはねむりが1回だけ・毒は半分", b1.skip && !b2.skip && b1.poisonDamage === 2500);
  const pm = T.newEnemyFx(); T.applyPanic(pm, mob, 2, 1); t("敵の効果: あせりは確率で空振り（確率100%なら必ず）", T.tickEnemyTurn(pm, mob).miss && T.tickEnemyTurn(pm, mob).miss && !T.tickEnemyTurn(pm, mob).miss);
  // パーティ側
  const px = T.newPartyFx(); px.decoy = 1; px.shield = 100;
  const d1 = T.absorbDamage(px, 500), d2 = T.absorbDamage(px, 80), d3 = T.absorbDamage(px, 80);
  t("パーティの効果: みがわりは1回無効→バリアが先に受けとめる→割れたら通る", d1.dmg === 0 && d2.dmg === 0 && d3.dmg === 60 && px.shield === 0);
  // バフ消し：ためた大技をふつうの攻撃にする
  const boss = { id: "boss_dispel", kind: "chapterBoss", hp: 100, maxHp: 100 }; const st = {};
  let guard = 0; while (T.peekBossMove(boss, st) !== "big" && guard++ < 20) T.nextBossMove(boss, st);
  st.cancelBig = true; const mv = T.nextBossMove(boss, st);
  t("スキル「バフ消し」: ためた大技が、ふつうの攻撃になる", mv.move === "slash" && !st.cancelBig);
}

// ---------------- 新しい状態異常（毒・麻痺・眠り・石化・混乱）と耐性・スキル数値（2026-09-26） ----------------
{
  const S = T.SPECIALIST_ROSTER, OWN = { calc: "poison", eq: "paralysis", func: "sleep", geo: "petrification", data: "confusion" };
  t("状態異常: 5種類（封印・スローは無い）", JSON.stringify(T.STATUS_KEYS.slice().sort()) === JSON.stringify(["confusion", "paralysis", "petrification", "poison", "sleep"]));
  const okRes = S.every((c) => { const own = Object.keys(c.resistances).filter((k) => c.resistances[k] === 100); const base = { N: 10, R: 20, SR: 30, UR: 40 }[c.rarity]; return own.length >= 1 && Object.entries(c.resistances).every(([k, v]) => v === 100 || v === base) && Object.keys(c.resistances).length === 5; });
  t("耐性: 全員、その分野の状態異常が100・それ以外はレア度ごとに同じ数", okRes);
  const byMain = (sub) => S.filter((c) => c.primarySubject === sub);
  t("耐性: 計算は毒・方程式は麻痺・関数は眠り・図形は石化・統計は混乱に100", Object.entries(OWN).every(([sub, st]) => byMain(sub).every((c) => c.resistances[st] === 100)));
  t("耐性100は、かからない（ボーナスがあっても）", (() => { const c = { resistances: { poison: 100 } }; for (let i = 0; i < 2000; i++) if (T.rollStatusInflict("poison", c, 0.5)) return false; return true; })());
  const aoe = (r) => S.find((c) => c.rarity === r && c.skill.category === "aoeDamage").skill.multiplier;
  t("全体ダメージ: N2倍・R3倍・SR4倍・UR5倍", [aoe("N"), aoe("R"), aoe("SR"), aoe("UR")].join() === "2,3,4,5");
  const heal = (r) => S.find((c) => c.rarity === r && c.skill.category === "heal").skill, cure = (r) => S.find((c) => c.rarity === r && c.skill.category === "cure").skill;
  t("回復: Nは6問で5%・Rは8問で10%・SRは10問で15%・URは12問で20%", ["N", "R", "SR", "UR"].map((r) => `${heal(r).gauge}:${heal(r).percent}`).join() === "6:0.05,8:0.1,10:0.15,12:0.2");
  t("状態異常回復: Nは12・Rは10・SRは8・URは6問で、すべての状態異常を治す", ["N", "R", "SR", "UR"].map((r) => cure(r).gauge).join() === "12,10,8,6" && ["N", "R", "SR", "UR"].every((r) => cure(r).cures.length === 5));
  // 効果
  t(`毒: 敵が攻撃するたびに最大HPの${Math.round(T.STATUS_DEFS.poison.dotFraction * 100)}%・3回で終わる`, (() => { let st = T.applyStatusEffect({}, "a", "poison"), tot = 0; for (let i = 0; i < 5; i++) { const r = T.tickStatusEffects(st, 1000); tot += r.poisonDamage; st = r.statusByCharId; } return tot === Math.round(1000 * T.STATUS_DEFS.poison.dotFraction) * 3; })());
  t("麻痺: 約50%で攻撃できない・2回で終わる", (() => { const e = { paralysis: { turnsLeft: 2 } }; let ok = 0; for (let i = 0; i < 4000; i++) if (T.canActThisRound(e)) ok++; const r1 = T.tickStatusEffects({ a: e }, 1000), r2 = T.tickStatusEffects(r1.statusByCharId, 1000); return Math.abs(ok / 4000 - 0.5) < 0.05 && !r2.statusByCharId.a; })());
  t("眠り: 行動できない（スキルも）・2回で終わる", (() => { const e = { sleep: { turnsLeft: 2 } }; const r2 = T.tickStatusEffects(T.tickStatusEffects({ a: e }, 1).statusByCharId, 1); return !T.canActThisRound(e) && !T.canUseSkillThisRound(e) && !r2.statusByCharId.a; })());
  t("石化: 治すまで続く", (() => { let st = T.applyStatusEffect({}, "a", "petrification"); for (let i = 0; i < 10; i++) st = T.tickStatusEffects(st, 1).statusByCharId; return !!st.a?.petrification && !T.canActThisRound(st.a); })());
}

// ---------------- ガチャの種類（通常・分野）：複合特化は通常ガチャだけ ----------------
{
  const s = makeStore(); await call(s, "get_state", {}, "gp1", T0);
  const give = async (n) => { const g = await s.load("gp1"); g.state.crystals = n; await s.save("gp1", g.state, g.version); };
  const idsOf = async (pool, times) => { const out = []; for (let i = 0; i < times; i++) { await give(500); const r = await call(s, "gacha", { count: 10, pool }, "gp1", Date.now()); if (r.status !== 200) return { err: r.body.error }; out.push(...r.body.results.map((x) => x.id)); } return { ids: out }; };
  const OWNSUB = { calc: "sp_calc_", eq: "sp_eq_", func: "sp_func_", geo: "sp_geo_", data: "sp_data_" };
  let ok = true;
  for (const [pool, prefix] of Object.entries(OWNSUB)) { const r = await idsOf(pool, 12); if (r.err || !r.ids.every((id) => id.startsWith(prefix))) ok = false; }
  t("分野ガチャ: その分野の単元特化だけが出る（複合特化は出ない）", ok);
  const rn = await idsOf("normal", 60);
  t("通常ガチャ: 複合特化(sp2_)も、単元特化も出る", rn.ids.some((id) => id.startsWith("sp2_")) && rn.ids.some((id) => id.startsWith("sp_")));
  t("分野ガチャの仲間の数: 各分野12体＝合計60体・通常は140体", ["calc", "eq", "func", "geo", "data"].every((p) => T.poolSize(p) === 12) && T.poolSize("normal") === 140);
  await give(500);
  const bad = await call(s, "gacha", { count: 10, pool: "hack" }, "gp1", Date.now());
  t("ガチャの種類: 知らない種類は拒否（クリスタルも減らない）", bad.status === 400 && bad.body.error === "bad-pool" && (await s.load("gp1")).state.crystals === 500);
  const before = (await s.load("gp1")).state.pity.pulls;
  await call(s, "gacha", { count: 1, pool: "geo" }, "gp1", Date.now());
  await call(s, "gacha", { count: 1, pool: "normal" }, "gp1", Date.now() + 1);
  t("天井は、ガチャの種類が変わっても共通（回数が続けて数えられる）", (await s.load("gp1")).state.pity.pulls === before + 2);
  const legacy = await call(s, "gacha", { count: 1 }, "gp1", Date.now() + 2);
  t("ガチャの種類を指定しない申請は、通常ガチャになる（古い画面との互換）", legacy.status === 200);
}

// ---------------- 管理モード：章ボス全部クリア ----------------
{
  const s0 = T.initialThirdState();
  const r = T.applyAdminOp(s0, "clearAllBosses", { grade: 1 });
  const g1 = T.getGrade ? null : null;
  const st = r.state;
  t("管理: 中1の章ボス全部クリア→中1の学年クリアが付き、裏ボス1体目が開く", r.ok && !!st.gradeDone[1] && !st.gradeDone[2] && T.secretOpen(st, 1, 0) && !T.secretOpen(st, 2, 0) && st.crystals === s0.crystals, r.message);
  const all = T.applyAdminOp(s0, "clearAllBosses", { grade: "all" });
  t("管理: 全学年を指定すると、3学年ぶん付く・章ボスは全部クリア扱い", all.ok && [1, 2, 3].every((g) => !!all.state.gradeDone[g]) && Object.keys(all.state.bossDone).length >= 21);
  t("管理: 不正な学年は拒否", !T.applyAdminOp(s0, "clearAllBosses", { grade: 9 }).ok);
  t("管理: クリアした後は、その学年の小単元のバトルが全部開く（順番ロックが外れる）", (() => { const u = T.chaptersForGrade(1).flatMap((c) => c.units.map((x) => x.id)); return u.every((id) => T.battleOpen(st, 1, id)); })());
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
