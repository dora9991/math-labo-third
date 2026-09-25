// third-api（サーバー側ロジック）の自動テスト。サーバーと同じバンドル手順で組み、メモリ上のストアで動かす。
//  実行: npm run test:third-api
import { build } from "esbuild";
import { execSync } from "node:child_process";
execSync("node scripts/gen-problem-version.mjs", { stdio: "ignore" });
await build({
  stdin: { contents: `export * from "./supabase/functions/third-api/handler.js"; export { applyAdminOp } from "./src/third/adminOps.js"; export { haichiKeyForUnit } from "./src/third/core.js"; export { generateThirdProblem } from "./src/third/problemSource.js"; export * from "./src/third/core.js"; export { getSubUnitClearExpReward, expOf } from "./src/third/expCurve.js"; export { tierOf } from "./src/third/balance.js"; export { SUBUNIT_SEQUENCE } from "./src/third/data/storyMap.js"; export { RAID, RAID_LADDER, raidStats, titlesOf } from "./src/third/raid.js"; export { GACHA, REWARD, VERIFY, MEDAL, STARTER_PARTY, CRYSTAL, BOSS_REWARD, DAILY, SYNTH } from "./src/third/gachaConfig.js"; export { generatePractice, generatePracticeAvoiding, practiceCorrect } from "./src/third/problemSource.js"; export { HAICHI_COURSE } from "./src/data/haichiCourse.js"; export { worldBattleFor } from "./src/third/link.js"; export { chaptersForGrade } from "./src/data/index.js";`, resolveDir: process.cwd(), loader: "js" },
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
  const tot = 3000, rate = (k) => counts[k] / tot;
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
  t("章ボス初撃破: クリスタル5個＋コイン100", b.status === 200 && b.body.rewards.kind === "chapterBoss" && b.body.rewards.crystals === T.CRYSTAL.chapterBossFirst && b.body.rewards.coins === T.BOSS_REWARD.firstCoins && b.body.state.crystals === before.crystals + T.CRYSTAL.chapterBossFirst, JSON.stringify(b.body.rewards || b.body));
  b = await call(s, "claim", { claim: bossClaim("boss2-" + Math.random().toString(36).slice(2, 10), 8000000) }, "ch1", now); now += 5 * MIN;
  t("章ボス: 2回目以降は報酬なし（何度でも挑戦はできる）", b.status === 200 && b.body.rewards.crystals === 0 && b.body.rewards.coins === 0 && b.body.rewards.reason === "boss-repeat");
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
    for (let i = 0; i < 7; i++) { const r = await call(s, "claim", { claim: subClaim(ch, 0, 10100000 + i * 100, now) }, "rp1", now); now += 3 * MIN; got.push(r.body.rewards.crystals); }
    t("周回ボーナス: 初回は💎2、2回目以降は1日5回まで💎1（6回目からは0）", first.body.rewards.crystals === T.REWARD.firstCrystals && JSON.stringify(got) === JSON.stringify([1, 1, 1, 1, 1, 0, 0]), JSON.stringify(got));
    // 翌日はまた5回
    now = T0 + 26 * 60 * MIN; const nx = await call(s, "claim", { claim: subClaim(ch, 0, 10900000, now) }, "rp1", now);
    t("周回ボーナス: 翌日（日本時間）はまた💎1がもらえる", nx.body.rewards.crystals === 1, JSON.stringify(nx.body.rewards));
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

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
