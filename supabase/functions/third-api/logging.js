// ============================================================
// logging.js — 生徒の学習ログ（解答の中身・1日ごとの集計・メダル履歴）を作る純ロジック。DBに依存しない（Nodeでテスト可能）。
//  方針：ログの「中身」は生徒のブラウザが言ってきたことではなく、**サーバーが seed から問題を作り直して**書く。
//        → 問題文・正解・正誤・誤答タグはサーバーの計算結果。生徒が送るのは「どの問題(seed)に何と答えたか・何ms」だけ。
//  記録の失敗でゲームは止めない（recordLogs は例外を握りつぶす）。store に logAnswers が無い（ローカルモード）ときは何もしない。
//  store: { logAnswers(uid, rows) → 新しく入った行の配列 [{ok, ms, mode}]（同じ問題は二重に入れない）,
//           logMedals(uid, medals, now), bumpDaily(uid, args), ping(uid, sid, now) }
// ============================================================
import { generateThirdProblem, generatePractice, practiceCorrect } from "../../../src/third/problemSource.js";
import { dayKey } from "../../../src/third/core.js";
import { DIFFICULTY_KEYS } from "../../../src/third/balance.js";

export const MAX_LOG_ATTEMPTS = 120;
// 問題の「型」のID（正答率を型ごとに集計する用）。テンプレIDがあればそれ、無いもの（とけた式など）は数字を伏せた問題文で代用する
const problemTypeId = (q, unitId) => q?.id ?? `${unitId}:${String(q?.q || "").replace(/[+\-−]?\d+(\.\d+)?/g, "#").replace(/\s+/g, "").slice(0, 36)}`;
const cut = (s, n) => (s == null ? null : String(s).slice(0, n));

/** 解答の記録（third_answer_log 用の行）を作る。mode: "battle" | "practice" | "confirm"。rows＝報酬・メダルの検証を通した解答（counted の判定に使う）。 */
export function contentRows({ mode, attempts, rows = [], ctx = {} }) {
  const verified = new Map(rows.map((r) => [r.key, !!r.ok])); // key → サーバーが検証で「正解」と認めたか
  const list = Array.isArray(attempts) ? attempts.slice(0, MAX_LOG_ATTEMPTS) : [];
  const out = [];
  for (const a of list) {
    if (!a || typeof a.unitId !== "string" || !DIFFICULTY_KEYS.includes(a.level)) continue;
    if (!Number.isInteger(a.seed) || a.seed < 0 || a.seed > 0xffffffff) continue;
    const ms = Number(a.ms);
    const msOk = Number.isFinite(ms) && ms >= 0 && ms <= 10 * 60 * 1000 ? Math.round(ms) : null;
    let q, correct, ok, tag = null, tid, key;
    if (mode === "battle") {
      const p = generateThirdProblem(a.unitId, a.level, a.seed);
      if (!p) continue;
      q = p.question; correct = p.choices[p.correctIndex]; ok = correct === String(a.answer);
      if (!ok) tag = p.tags?.[String(a.answer)] ?? null;
      tid = p.templateId ?? `${a.unitId}:${a.level}`;
      key = `${a.unitId}:${a.level}:${a.seed}`;
    } else {
      const p = generatePractice(a.unitId, a.level, a.seed);
      if (!p) continue;
      q = p.q; correct = p.ans; ok = practiceCorrect(p, a.answer);
      if (!ok) tag = (p.distractors || []).find((d) => String(d.val) === String(a.answer))?.tag ?? null;
      tid = problemTypeId(p, a.unitId);
      key = `p:${a.unitId}:${a.level}:${a.seed}`;
    }
    out.push({
      unit_id: a.unitId, difficulty: a.level, mode,
      q: cut(q, 600), ans: cut(correct, 200), user_answer: cut(a.answer, 200),
      ok: !!ok, mistake_tag: cut(tag, 60), seed: a.seed, template_id: cut(tid, 120), ms: msOk,
      // 報酬・メダルに数えた解答か：検証を通り、かつ（正解なら）正解と認められたもの。速すぎて正解に数えなかった解答・重複・報告のみの解答は false
      counted: verified.has(key) && verified.get(key) === !!ok,
      grade: ctx.grade ?? null, chapter_id: ctx.chapterId ?? null, sub_unit_id: ctx.subUnitId ?? null, result: ctx.result ?? null,
    });
  }
  return out;
}

const MODE_COL = { battle: "p_battle", practice: "p_practice", confirm: "p_haichi" };

/** 新しく記録できた解答・メダル・ログインから、third_daily に足す量（rpc third_bump_daily の引数）を作る。 */
export function dailyArgs({ inserted = [], medals = 0, logins = 0, activeMs = 0, now }) {
  const a = { p_day: dayKey(now), p_solved: 0, p_correct: 0, p_ms: 0, p_battle: 0, p_practice: 0, p_haichi: 0, p_medals: medals, p_logins: logins, p_active_ms: Math.round(activeMs) };
  for (const r of inserted) {
    a.p_solved += 1;
    if (r.ok) a.p_correct += 1;
    a.p_ms += Math.max(0, Number(r.ms) || 0);
    if (MODE_COL[r.mode]) a[MODE_COL[r.mode]] += 1;
  }
  return a;
}

/** 検証の結果を受けて、解答の中身・メダル・1日の集計を記録する。失敗してもゲームは止めない。 */
export async function recordLogs({ store, userId, mode, attempts, rows, ctx, newMedals = [], now }) {
  try {
    if (!store?.logAnswers) return;
    const content = contentRows({ mode, attempts, rows, ctx });
    const inserted = content.length ? (await store.logAnswers(userId, content)) || [] : [];
    const medals = newMedals.map((m) => ({ unitId: m.kind === "haichi" ? m.key : m.unitId, kind: m.kind })).filter((m) => m.unitId && m.kind);
    if (medals.length) await store.logMedals?.(userId, medals, now);
    if (inserted.length || medals.length) await store.bumpDaily?.(userId, dailyArgs({ inserted, medals: medals.length, now }));
  } catch { /* 記録の失敗でゲームを止めない */ }
}

/** バトル終了報告（勝敗・途中でやめた場合・お試し・章ボス）の入力を検査する。 */
export function checkReport(body) {
  const b = body && typeof body === "object" ? body : {};
  const grade = Number(b.grade);
  const result = ["win", "lose", "abandon"].includes(b.result) ? b.result : null;
  if (![1, 2, 3].includes(grade) || !result) return { ok: false, error: "bad-report" };
  const at = Array.isArray(b.attempts) ? b.attempts : null;
  if (!at || !at.length || at.length > MAX_LOG_ATTEMPTS) return { ok: false, error: "bad-attempts" };
  return { ok: true, attempts: at, ctx: { grade, chapterId: cut(b.chapterId, 20), subUnitId: cut(b.subUnitId, 40), result } };
}
