// ============================================================
// problemSource.js — 数学ラボ3のバトル用「問題の出どころ」。
//  math-worldのバトルは generateMathLaboProblem(chapterId, difficulty, grade) で
//  4択問題(question/choices/correctIndex/hint1/hint2)をもらう作りだった。
//  ラボ3では、ラボ3自身の問題エンジン（generator.js＝seed付きでサーバー採点の下地になる／
//  toketa＝誤答の理由つきヒント）から同じ形で返す。
//  世界側の小単元ID(m_c1_u3)→ラボ3の単元ID(u3)への変換もここで行う。
// ============================================================
import { chaptersForGrade, findUnitById } from "../data/index.js";
import { genProblemSeeded, makeChoices } from "../engine/generator.js";
import { genToketa, hasToketa } from "../data/toketa/index.js";
import { answerMatches } from "../engine/scoring.js";
import { labUnitIdForBattle } from "./link.js";
import { withSeed, newSeed } from "./seeded.js";

import { DIFFICULTY_KEYS } from "./balance.js"; // 難度の名前・ダメージ倍率は balance.js に一元化

const shuffle = (a) => a.map((v) => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map((x) => x[1]);
const pickFrom = (arr) => arr[Math.floor(Math.random() * arr.length)];

/** 世界側の章ID("c1"…) → その章のラボ3単元IDの配列（章ボス戦などで使う） */
export function labUnitIdsOfChapter(grade, chapterId) {
  const ch = chaptersForGrade(grade).find((c) => c.id === chapterId);
  return ch ? (ch.units || []).map((u) => u.id) : [];
}

/**
 * 1問を4択で返す。**seed から完全に再現できる**（問題文・選択肢の並び・正解の位置まで同じ）。
 * → サーバーは同じ関数を同じ seed で呼んで、本当の正誤を判定できる（チート対策）。
 * @param {string} unitId ラボ3の単元ID
 * @param {string} difficulty easy|standard|advanced|oni
 * @param {number} [seed] 省略時は新しい seed を引く
 */
export function generateThirdProblem(unitId, difficulty = "standard", seed = newSeed()) {
  const unit = findUnitById(unitId);
  if (!unit) return null;
  const level = DIFFICULTY_KEYS.includes(difficulty) ? difficulty : "standard";
  const s32 = seed >>> 0;
  return withSeed(s32, () => {
    for (let tries = 0; tries < 6; tries++) {
      const q = hasToketa(unitId) ? genToketa(unitId) : genProblemSeeded(unit, level);
      if (!q) continue;
      let choices;
      if (q.toketa && Array.isArray(q.distractors)) choices = shuffle(q.distractors.map((d) => String(d.val)));
      else if (Array.isArray(q.choices) && q.choices.length) choices = shuffle(q.choices.map(String));
      else choices = shuffle(makeChoices(q.ans).map(String));
      if (choices.length < 2) continue; // 4択にできない(記述式)問題は引き直す
      const ansStr = String(q.ans);
      const correctIndex = choices.findIndex((c) =>
        Array.isArray(q.choices) && q.choices.length
          ? c.replace(/\s/g, "") === ansStr.replace(/\s/g, "")
          : answerMatches(c, q.ans)
      );
      if (correctIndex < 0) continue;
      return {
        question: q.q, choices, correctIndex, hint1: q.h1, hint2: q.h2,
        unitId, level, seed: s32, templateId: q.id ?? null,
        toketa: !!q.toketa, steps: q.steps || null,
        // 誤答の診断タグ（選択肢の文字列→タグ）。toketa問題のみ
        tags: q.toketa ? Object.fromEntries(q.distractors.map((d) => [String(d.val), d.tag || null])) : null,
      };
    }
    return null;
  });
}

/** バトル用：戦闘の種類に応じて出題する単元を決めて1問返す。 */
export function generateBattleProblem({ subUnitId, grade, chapterId }, difficulty) {
  const one = labUnitIdForBattle({ grade, chapterId, subUnitId });
  if (one) return generateThirdProblem(one, difficulty);
  const ids = labUnitIdsOfChapter(grade, chapterId);
  return generateThirdProblem(ids.length ? pickFrom(ids) : "u1", difficulty);
}

// ------------------------------------------------------------
// 練習(れんしゅう)・確認問題(はいち)用：seed から**完全に再現できる**1問（サーバーが採点し直せる）。
//  画面(SlowMode/StepUpSimple)とサーバーが同じこの関数を使う。選択肢の並びは画面ごとに自由に作ってよい
//  （サーバーが見るのは「正解の値」だけ）。
// ------------------------------------------------------------
export function generatePractice(unitOrId, level, seed = newSeed()) {
  const unit = typeof unitOrId === "string" ? findUnitById(unitOrId) : unitOrId;
  if (!unit) return null;
  const s32 = seed >>> 0;
  // ★再現の条件は seed だけ（「直前と同じ型を避ける」などの画面側の事情を入れると、サーバーが作り直した問題とずれる）
  return withSeed(s32, () => {
    // 「普通」は とけた式（誤答の理由を診断するヒントつき）がある単元ではそれを使う。簡単/難しい/鬼は難度別の問題。
    const q = (level === "standard" && hasToketa(unit.id) && genToketa(unit.id)) || genProblemSeeded(unit, level, null);
    return q ? { ...q, pseed: s32, plevel: level } : null; // plevel＝この問題を作った時の難度（toketa問題にはlevelが無いので必ず持たせる）
  });
}

/** 画面用：直前と同じ型(recentIds)を避けたいので、違う型になる seed が出るまで何度か引く。どの seed でも再現は seed だけで決まる。 */
export function generatePracticeAvoiding(unitOrId, level, recentIds = []) {
  const recent = Array.isArray(recentIds) ? recentIds : recentIds == null ? [] : [recentIds];
  let q = null;
  for (let i = 0; i < 6; i++) {
    q = generatePractice(unitOrId, level, newSeed());
    if (!q || !recent.includes(q.id)) break;
  }
  return q;
}

/** 選んだ答え val が、問題 q の正解か（画面の ansEq と同じ判定）。 */
export function practiceCorrect(q, val) {
  if (Array.isArray(q.choices) && q.choices.length) return String(val).replace(/\s/g, "") === String(q.ans).replace(/\s/g, "");
  return answerMatches(val, q.ans); // 式の答え(y＝5x・−n/4・π など)も文字列でそろえて判定する
}
