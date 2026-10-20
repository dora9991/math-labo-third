// 学習ログ（解答の中身・1日ごとの集計・メダル履歴・滞在時間）のサーバー側ロジックの自動テスト。
//  実行: npm run test:third-logging
import { build } from "esbuild";
import { execSync } from "node:child_process";
execSync("node scripts/gen-problem-version.mjs", { stdio: "ignore" });
await build({
  stdin: { contents: `export * from "./supabase/functions/third-api/handler.js"; export * from "./supabase/functions/third-api/logging.js"; export * from "./src/third/core.js"; export { MEDAL } from "./src/third/gachaConfig.js"; export { generatePractice, generateThirdProblem } from "./src/third/problemSource.js"; export { worldBattleFor } from "./src/third/link.js"; export { chaptersForGrade } from "./src/data/index.js"; export { HAICHI_COURSE } from "./src/data/haichiCourse.js";`, resolveDir: process.cwd(), loader: "js" },
  bundle: true, format: "esm", platform: "node", outfile: "dist-fn/_tl.mjs", loader: { ".json": "json" }, logLevel: "error",
});
const T = await import("../dist-fn/_tl.mjs");
let pass = 0, fail = 0;
const t = (name, cond, extra = "") => { (cond ? pass++ : fail++); console.log(`${cond ? "✅" : "❌"} ${name}${cond ? "" : "  " + extra}`); };

// ---- メモリ上のストア（本番と同じ約束：解答は (student,mode,unit,difficulty,seed) で二重に入らない。新しく入った行だけ返す）
function makeStore({ broken = false } = {}) {
  const rows = new Map(); let ver = 0;
  const S = { answers: [], medals: [], daily: {}, sessions: {}, attempts: [] };
  const bump = (uid, a) => {
    const d = (S.daily[`${uid}|${a.p_day}`] ||= { solved: 0, correct: 0, ms: 0, battle: 0, practice: 0, haichi: 0, medals: 0, logins: 0, active: 0 });
    d.solved += a.p_solved; d.correct += a.p_correct; d.ms += a.p_ms; d.battle += a.p_battle; d.practice += a.p_practice; d.haichi += a.p_haichi; d.medals += a.p_medals; d.logins += a.p_logins; d.active += a.p_active_ms;
  };
  const store = {
    S,
    async load(u) { const r = rows.get(u); return r ? { state: structuredClone(r.state), version: r.version } : null; },
    async save(u, state, prev) { const r = rows.get(u); if (!r && prev === null) { rows.set(u, { state: structuredClone(state), version: ++ver }); return true; } if (r && r.version === prev) { rows.set(u, { state: structuredClone(state), version: ++ver }); return true; } return false; },
    async logAttempts(u, x) { S.attempts.push(...x); },
    async logAnswers(u, list) {
      if (broken) throw new Error("db down");
      const fresh = [];
      for (const r of list) {
        const k = [u, r.mode, r.unit_id, r.difficulty, r.seed].join("|");
        if (r.seed != null && S.answers.some((x) => x._k === k)) continue;
        S.answers.push({ ...r, student_id: u, _k: k }); fresh.push({ ok: r.ok, ms: r.ms, mode: r.mode });
      }
      return fresh;
    },
    async logMedals(u, medals, now) { for (const m of medals) if (!S.medals.some((x) => x.u === u && x.unitId === m.unitId && x.kind === m.kind)) S.medals.push({ u, ...m, now }); },
    async bumpDaily(u, a) { if (broken) throw new Error("db down"); bump(u, a); },
    async ping(u, sid, now) {
      const k = u + "|" + sid; const cur = S.sessions[k];
      if (!cur) { S.sessions[k] = { started: now, last: now, active: 0 }; bump(u, T.dailyArgs({ logins: 1, now })); return; }
      const delta = Math.max(0, Math.min(now - cur.last, 90_000)); cur.last = now; cur.active += delta; if (delta > 0) bump(u, T.dailyArgs({ activeMs: delta, now }));
    },
  };
  return store;
}
const call = (store, action, body, u = "stu1", now, rand) => T.handle({ action, body, userId: u, store, now, rand });

const T0 = 1_800_000_000_000, MIN = 60_000;
const g1c1 = T.chaptersForGrade(1)[0];
const wb = T.worldBattleFor(1, g1c1, g1c1.units[0]);
const unitId = g1c1.units[0].id;
const dayOf = (now) => T.dayKey(now);

function practiceAttempts({ n = 5, correct = true, ms = 3000, seedBase = 100000, level = "standard", uid = unitId } = {}) {
  return Array.from({ length: n }, (_, i) => { const seed = seedBase + i; const q = T.generatePractice(uid, level, seed); return { unitId: uid, level, seed, answer: correct ? String(q.ans) : "___wrong___", ms }; });
}
function battleAttempts({ n = 6, right = 3, ms = 3000, seedBase = 900000 } = {}) {
  return Array.from({ length: n }, (_, i) => {
    const seed = seedBase + i; const level = ["easy", "standard", "advanced", "oni"][i % 4];
    const p = T.generateThirdProblem(unitId, level, seed) || T.generateThirdProblem(unitId, "standard", seed);
    return { unitId, level: p.level, seed, answer: i < right ? p.choices[p.correctIndex] : p.choices.find((_, k) => k !== p.correctIndex), ms };
  });
}

// ===== 1. れんしゅう：解答の中身と1日の集計が残る（正解も不正解も）
{ const s = makeStore(); await call(s, "get_state", {}, "u1", T0);
  const at = [...practiceAttempts({ n: 3, correct: true, seedBase: 111000 }), ...practiceAttempts({ n: 2, correct: false, seedBase: 112000 })];
  const r = await call(s, "practice", { attempts: at }, "u1", T0 + 2 * MIN);
  t("れんしゅう: 5問が解答ログに残る", r.status === 200 && s.S.answers.length === 5, JSON.stringify(r.body.verified));
  const w = s.S.answers.find((a) => !a.ok), c = s.S.answers.find((a) => a.ok);
  t("解答の中身: 問題文・正解・生徒の答え・正誤が入る", !!c.q && c.ans === String(T.generatePractice(unitId, "standard", c.seed).ans) && c.user_answer === c.ans && w.user_answer === "___wrong___" && w.ans && w.ok === false);
  t("解答の中身: 所要時間・難易度・問題の型・検証済みフラグ", c.ms === 3000 && c.difficulty === "standard" && !!c.template_id && c.counted === true && c.mode === "practice");
  const d = s.S.daily[`u1|${dayOf(T0 + 2 * MIN)}`];
  t("1日の集計: 解いた問題数5・正解3・れんしゅう5", d && d.solved === 5 && d.correct === 3 && d.practice === 5 && d.ms === 15000, JSON.stringify(d));
  // 同じ問題の再送は二重に数えない
  await call(s, "practice", { attempts: at }, "u1", T0 + 4 * MIN);
  t("再送: 同じ問題(seed)は二重に記録・集計されない", s.S.answers.length === 5 && s.S.daily[`u1|${dayOf(T0)}`].solved === 5);
  // 翌日の分は別の日として集計
  await call(s, "practice", { attempts: practiceAttempts({ n: 2, seedBase: 113000 }) }, "u1", T0 + 26 * 60 * MIN);
  t("日付をまたぐと別の日に集計される（日本時間）", s.S.daily[`u1|${dayOf(T0 + 26 * 60 * MIN)}`]?.solved === 2 && s.S.daily[`u1|${dayOf(T0)}`].solved === 5);
}

// ===== 2. 数えなかった解答（速すぎ）も、記録には残る（報酬・メダルには数えない印つき）
{ const s = makeStore(); await call(s, "get_state", {}, "u2", T0);
  await call(s, "practice", { attempts: practiceAttempts({ n: 3, ms: 300, seedBase: 221000 }) }, "u2", T0 + 2 * MIN);
  const a = s.S.answers[0];
  t("速すぎた解答: 記録には残るが counted=false（正誤は本当の答えで判定）", s.S.answers.length === 3 && a.counted === false && a.ok === true, JSON.stringify(a));
}

// ===== 3. メダル：取った日時が残る
{ const s = makeStore(); await call(s, "get_state", {}, "u3", T0);
  const r = await call(s, "practice", { attempts: practiceAttempts({ n: T.MEDAL.practiceTarget, seedBase: 331000 }) }, "u3", T0 + 2 * MIN);
  t("メダル: れんしゅうメダル獲得が記録される", r.body.newMedals.length === 1 && s.S.medals.length === 1 && s.S.medals[0].kind === "practice" && s.S.medals[0].unitId === unitId && s.S.medals[0].now === T0 + 2 * MIN, JSON.stringify(s.S.medals));
  t("メダル: 1日の集計にメダル数が入る", s.S.daily[`u3|${dayOf(T0 + 2 * MIN)}`].medals === 1);
}

// ===== 4. バトル：勝った記録(claim)＋負け・途中でやめた記録(report)。二重に数えない
{ const s = makeStore(); await call(s, "get_state", {}, "u4", T0);
  // 負け：claim ではなく report だけが来る
  const lose = battleAttempts({ n: 5, right: 2, seedBase: 441000 });
  let r = await call(s, "report", { grade: wb.grade, chapterId: wb.chapterId, subUnitId: wb.subUnitId, kind: "subUnit", result: "lose", attempts: lose }, "u4", T0 + 5 * MIN);
  t("バトルに負けても解答が記録される", r.status === 200 && s.S.answers.length === 5 && s.S.answers.every((a) => a.mode === "battle" && a.result === "lose" && a.counted === false && a.grade === wb.grade && a.chapter_id === wb.chapterId), JSON.stringify(r.body));
  t("バトル: 正解2・不正解3が正しく判定される", s.S.answers.filter((a) => a.ok).length === 2);
  const wrong = s.S.answers.find((a) => !a.ok); t("バトル: 不正解に正解の選択肢と生徒の選んだ答えが残る", !!wrong.ans && wrong.user_answer !== wrong.ans && !!wrong.q);
  const d0 = s.S.daily[`u4|${dayOf(T0 + 5 * MIN)}`]; t("バトル: 負けた分も1日の集計に入る", d0.solved === 5 && d0.battle === 5 && d0.correct === 2);
  // 同じ解答をもう一度報告しても増えない
  await call(s, "report", { grade: wb.grade, chapterId: wb.chapterId, subUnitId: wb.subUnitId, kind: "subUnit", result: "abandon", attempts: lose }, "u4", T0 + 6 * MIN);
  t("報告の再送: 二重に記録・集計されない", s.S.answers.length === 5 && s.S.daily[`u4|${dayOf(T0 + 5 * MIN)}`].solved === 5);
  // 不正な報告は拒否
  r = await call(s, "report", { grade: 9, result: "lose", attempts: lose }, "u4", T0 + 7 * MIN); t("報告: 学年が不正なら拒否(400)", r.status === 400);
  r = await call(s, "report", { grade: 1, result: "lose", attempts: [] }, "u4", T0 + 7 * MIN); t("報告: 解答が空なら拒否(400)", r.status === 400);
  r = await call(s, "report", { grade: 1, result: "cheat", attempts: lose }, "u4", T0 + 7 * MIN); t("報告: 結果の種類が不正なら拒否(400)", r.status === 400);
  r = await T.handle({ action: "report", body: { grade: 1, result: "lose", attempts: lose }, userId: null, store: s }); t("報告: 未ログインは401", r.status === 401);
  // 偽の seed（作れない問題）や欠けた項目は捨てる
  const before = s.S.answers.length;
  await call(s, "report", { grade: 1, result: "lose", attempts: [{ unitId: "nope", level: "easy", seed: 1, answer: "1", ms: 1000 }, { unitId, level: "zzz", seed: 1, answer: "1", ms: 1000 }, { unitId, level: "easy", seed: -5, answer: "1", ms: 1000 }, null] }, "u4", T0 + 8 * MIN);
  t("報告: 存在しない単元・不正な難易度・不正なseedは記録しない", s.S.answers.length === before);
  // 生徒が「正解だった」と偽っても、正誤はサーバーの計算（送れるのは答えだけ）
  const p = T.generateThirdProblem(unitId, "easy", 777000); const wr = p.choices.find((_, k) => k !== p.correctIndex);
  await call(s, "report", { grade: 1, result: "win", attempts: [{ unitId, level: "easy", seed: 777000, answer: wr, ms: 2000, ok: true, correct: true }] }, "u4", T0 + 9 * MIN);
  t("正誤は生徒の自己申告ではなくサーバーが決める", s.S.answers.at(-1).ok === false);
}

// ===== 5. 勝った小単元バトル：claim で記録され、同じ戦いの report は二重にならない
{ const s = makeStore(); await call(s, "get_state", {}, "u5", T0);
  // メダル2枚を取ってバトルを解放する（サーバーの状態を直接用意）
  const cur = await s.load("u5"); cur.state.medals.practiceN[unitId] = 5;
  const lesson = T.HAICHI_COURSE[1].flatMap((x) => x.lessons).find((l) => (l.u || []).includes(unitId));
  cur.state.medals.haichi[lesson ? `g1m${lesson.n}` : `nv:${unitId}`] = T0; await s.save("u5", cur.state, cur.version);
  const at = battleAttempts({ n: 10, right: 9, seedBase: 551000, ms: 3000 });
  const claim = { nonce: "nonce-" + Math.random().toString(36).slice(2, 12), pv: T.PROBLEM_VERSION, grade: wb.grade, chapterId: wb.chapterId, kind: "subUnit", subUnitId: wb.subUnitId, startedAt: T0, endedAt: T0 + 40_000, attempts: at };
  const r = await call(s, "claim", { claim }, "u5", T0 + 3 * MIN);
  if (r.status === 200) {
    t("勝利: 申請の解答が記録される（result=win・counted）", s.S.answers.length === 10 && s.S.answers.every((a) => a.result === "win" && a.counted === true), `n=${s.S.answers.length}`);
    await call(s, "report", { grade: wb.grade, chapterId: wb.chapterId, subUnitId: wb.subUnitId, kind: "subUnit", result: "win", attempts: at }, "u5", T0 + 3 * MIN + 1000);
    t("勝利後の報告: 二重に数えない", s.S.answers.length === 10 && s.S.daily[`u5|${dayOf(T0 + 3 * MIN)}`].solved === 10);
  } else t("勝利: 申請が通る(テスト前提)", false, JSON.stringify(r.body));
}

// ===== 6. ログイン（滞在）時間
{ const s = makeStore();
  await call(s, "ping", { sid: "tabA" }, "u6", T0);
  await call(s, "ping", { sid: "tabA" }, "u6", T0 + 60_000);
  await call(s, "ping", { sid: "tabA" }, "u6", T0 + 120_000);
  const d = s.S.daily[`u6|${dayOf(T0)}`];
  t("ping: 初回でログイン1回・滞在は経過時間ぶん増える", d.logins === 1 && d.active === 120_000, JSON.stringify(d));
  await call(s, "ping", { sid: "tabA" }, "u6", T0 + 120_000 + 3 * 3600_000); // 3時間放置(スリープ)後
  t("ping: 放置した時間は数えない（1回あたり最大90秒）", s.S.daily[`u6|${dayOf(T0)}`].active <= 120_000 + 90_000 + 1 || dayOf(T0 + 3 * 3600_000) !== dayOf(T0));
  await call(s, "ping", { sid: "tabB" }, "u6", T0 + 130_000);
  t("ping: 別のタブ(sid)は別のログインとして数える", s.S.daily[`u6|${dayOf(T0)}`].logins === 2);
  const r = await call(s, "ping", { sid: "" }, "u6", T0); t("ping: sid が空なら拒否(400)", r.status === 400);
  const r2 = await T.handle({ action: "ping", body: { sid: "x" }, userId: null, store: s }); t("ping: 未ログインは401", r2.status === 401);
}

// ===== 7. 記録の失敗でゲームは止まらない／ローカルモード（記録の道具なし）でも動く
{ const s = makeStore({ broken: true }); await call(s, "get_state", {}, "u7", T0);
  const r = await call(s, "practice", { attempts: practiceAttempts({ n: 5, seedBase: 771000 }) }, "u7", T0 + 2 * MIN);
  t("DBが落ちていても、れんしゅうの採点・メダルは通る", r.status === 200 && r.body.verified.correct === 5 && r.body.newMedals.length === 1);
  const r2 = await call(s, "report", { grade: 1, result: "lose", attempts: battleAttempts({ n: 3, seedBase: 772000 }) }, "u7", T0 + 3 * MIN);
  t("DBが落ちていても、報告は 200 で返る（ゲームは止めない）", r2.status === 200);
  const local = { load: async () => null, save: async () => true }; // ローカルモード：ログ用の道具なし
  await T.handle({ action: "get_state", body: {}, userId: "local", store: local, now: T0 });
  const r3 = await T.handle({ action: "practice", body: { attempts: practiceAttempts({ n: 3, seedBase: 773000 }) }, userId: "local", store: local, now: T0 + 2 * MIN });
  const r4 = await T.handle({ action: "ping", body: { sid: "s" }, userId: "local", store: local, now: T0 });
  const r5 = await T.handle({ action: "report", body: { grade: 1, result: "lose", attempts: battleAttempts({ n: 2, seedBase: 774000 }) }, userId: "local", store: local, now: T0 });
  t("ローカルモード(ログ用の道具なし)でもエラーにならない", r3.status === 200 && r4.status === 200 && r5.status === 200);
}

console.log(`\n${fail ? "❌" : "✅"} 学習ログ: ${pass} 項目合格 / ${fail} 項目失敗`);
process.exit(fail ? 1 : 0);
