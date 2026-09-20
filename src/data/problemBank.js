// ============================================================
// problemBank.js — PDF教材（中1 全7章）から抽出した「実問題バンク」
//
// 出典: 1_1〜1_7 の問題/解答PDF（正の数・負の数／文字の式／方程式／
//       比例と反比例／平面図形／空間図形／データの活用）。
// データ実体は problem_bank.json（1問1オブジェクト・全701問）。
// タグ語彙は『数学ラボ_問題DB_中1全7章.xlsx』のタグ辞書が唯一の正。
//
// 各問題オブジェクト:
//   { id, source:{file,set,number}, grade, chapter("c1"..."c7"), unit, subunit,
//     skillTags:[...診断スキルタグ], appSkill(S-NEG-xxx|null),
//     format("計算|一行問題|文章題|作図|証明|選択"),
//     cognitive, difficulty("★1基礎|★2標準|★3応用"), level(1|2|3),
//     misconception, points, timeSec,
//     q(問題文), answer(解答・文字列), answerNumeric(数値|null),
//     autoGradable(数値1問で自動採点可), confidence, flag }
//
// 章IDは既存アプリの章ID（c1〜c7）に一致しているので、章選択画面とそのまま噛み合う。
// ============================================================

import BANK from "./problem_bank.json";

export const PROBLEM_BANK = BANK;

/** 章ID(c1..c7) → 問題配列 */
export const BANK_BY_CHAPTER = PROBLEM_BANK.reduce((m, p) => {
  (m[p.chapter] ||= []).push(p);
  return m;
}, {});

/** 難易度ラベル → level(1..3) はデータ側の p.level を使えばよい */
export const LEVEL_LABEL = { 1: "基礎", 2: "標準", 3: "応用" };

/** id で1問取得 */
export function getProblem(id) {
  return PROBLEM_BANK.find((p) => p.id === id) || null;
}

/** 章で絞り込む */
export function getByChapter(chapter) {
  return BANK_BY_CHAPTER[chapter] || [];
}

/** 診断スキルタグで絞り込む（複数タグ問題はいずれか一致でヒット） */
export function getBySkillTag(tag) {
  return PROBLEM_BANK.filter((p) => p.skillTags.includes(tag));
}

/** 自動採点できる問題か（flagなし＆数値解答あり） */
export function isAutoGradable(p) {
  return !!p && p.autoGradable === true;
}

/**
 * 数値解答の自動採点。利用者入力(string|number)を正規化して比較。
 * 分数・記述・作図は autoGradable=false なので呼び出し側で除外すること。
 */
export function checkAnswer(problem, userInput) {
  if (!problem || problem.answerNumeric == null) return null; // 採点不能
  const norm = (v) =>
    Number(String(v).replace(/[＋+]/g, "").replace(/[－ー]/g, "-").replace(/\s/g, ""));
  return norm(userInput) === Number(problem.answerNumeric);
}

/**
 * 出題セットを選ぶ。
 * @param {object} opts
 *   chapter         章ID（省略で全章）
 *   skillTag        診断スキルタグで絞る（省略可）
 *   difficulty      "★1基礎"|"★2標準"|"★3応用"（省略可）
 *   level           1|2|3（difficulty の別指定。省略可）
 *   count           出題数（省略で全件）
 *   autoGradableOnly true なら自動採点可の問題だけ
 *   shuffle         true でシャッフル
 */
export function pickProblems(opts = {}) {
  let pool = opts.chapter ? getByChapter(opts.chapter) : PROBLEM_BANK.slice();
  if (opts.skillTag) pool = pool.filter((p) => p.skillTags.includes(opts.skillTag));
  if (opts.difficulty) pool = pool.filter((p) => p.difficulty === opts.difficulty);
  if (opts.level) pool = pool.filter((p) => p.level === opts.level);
  if (opts.autoGradableOnly) pool = pool.filter(isAutoGradable);
  if (opts.shuffle) {
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
  }
  return typeof opts.count === "number" ? pool.slice(0, opts.count) : pool;
}

/** 章ごとの収録数など、画面表示用の軽い統計 */
export function bankStats() {
  const byChapter = {};
  for (const p of PROBLEM_BANK) {
    const c = (byChapter[p.chapter] ||= { total: 0, autoGradable: 0 });
    c.total++;
    if (p.autoGradable) c.autoGradable++;
  }
  return { total: PROBLEM_BANK.length, byChapter };
}
