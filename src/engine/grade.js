// ============================================================
// grade.js — seed から問題を再現して「採点」する共通モジュール（Step2/3 の中核）
//
//  ★ここが「サーバとクライアントが同じルールで採点する」唯一の場所★
//  ・クライアント：楽観的にその場で採点して演出（従来どおり）。
//  ・サーバ(Edge Function)：ここを import して“正”として再採点し、player_state を更新。
//
//  ★JSON を読み込まない★（dbProblems/problem_bank.json に触れない）ので、
//   Deno の Edge Function からも同じ結果で安全に import できる。generator.js は
//   DB問題(JSON)を混ぜるため server からは import しない。採点は必ずこの grade.js を通す。
// ============================================================
import { makeSeededR } from "./seed.js";
import { findUnitById } from "../data/index.js";
import { answerMatches } from "./scoring.js";

/** テンプレIDと seed から1問を決定的に作る（makeFromTemplate と同じ skip ループ） */
export function buildSeeded(unit, level, templateId, seed) {
  const templates = unit?.problems?.[level] || [];
  const t = templates.find((x) => x.id === templateId);
  if (!t) return null;
  const r = makeSeededR(seed >>> 0);
  for (let i = 0; i < 10; i++) {
    const made = t.build(r);
    if (made && !made.skip) {
      return { ...made, id: t.id, unitId: unit.id, skill: t.skill || null, level, seed: seed >>> 0 };
    }
  }
  return null;
}

/**
 * サーバの“正”採点：{unitId, level, templateId, seed, userAnswer} から本当の正誤を判定する。
 *  クライアントが送ってきた「正解した」という自己申告は使わず、seed から問題を作り直して照合する。
 *  → localStorage を書き換えても、サーバが認めた解答しか報酬に繋がらない。
 * @returns {{ok:boolean, ans?:string|number, q?:string, skill?:string|null, error?:string}}
 */
export function gradeAttempt({ unitId, level, templateId, seed, userAnswer }) {
  const unit = findUnitById(unitId);
  if (!unit) return { ok: false, error: "unknown-unit" };
  if (seed == null) return { ok: false, error: "no-seed" }; // DB固定問題など seed なしは別経路
  const p = buildSeeded(unit, level, templateId, Number(seed));
  if (!p) return { ok: false, error: "cannot-rebuild" };
  return { ok: answerMatches(userAnswer, p.ans), ans: p.ans, q: p.q, skill: p.skill };
}
