// ============================================================
// elementaryBank.js — 小4〜小6「学び直し」用バンク（隠し導線で使う）
//
// 【ねらい】中学でつまずく原因が小学校の計算にあるとき（小数の乗除・分数の
//   四則・わり算・割合 など）、表の学年選択には出さずに、必要な小学校の単元
//   だけをそっと出せるようにする裏側のデータ層。
//
// 【実体】elementaryBank.json（scripts/extract_elementary.py が
//   ../../math-labo4/data の小4-6 DBから "自動採点できる計算系" を抽出して生成）。
//   各問題は既存の静的バンク(problem_bank.json)と噛み合う形：
//     { id, grade("小4".."小6"), gradeNum(4..6), unit, unitId, subunit,
//       q, answer, answerNumeric, autoGradable, level(1|2|3),
//       difficultyLabel, format, misconception, skillTags, prereqTags, source }
//
//   answer は整数/小数/単純分数のみ（engine/scoring.js の parseAnswer が
//   "1/6" や "-5" もそのまま数値化できるので isCorrect で採点可能）。
//
// 【再生成】 node 不要・Python のみ：
//     python3 scripts/extract_elementary.py
//   取り込む単元を変えたいときは同スクリプトの KEEP_UNITS を編集する。
// ============================================================
import BANK from "./elementaryBank.json";

export const ELEM_BANK = BANK;

/** 難易度 level(1|2|3) ↔ 既存UIの easy/standard/advanced */
export const ELEM_LEVEL_KEY = { 1: "easy", 2: "standard", 3: "advanced" };

/** id で1問取得 */
export function getElemProblem(id) {
  return ELEM_BANK.find((p) => p.id === id) || null;
}

/** 学年(4|5|6)で絞り込む */
export function elemByGrade(gradeNum) {
  return ELEM_BANK.filter((p) => p.gradeNum === gradeNum);
}

/** 単元名 or unitId で絞り込む（学び直しドリルの母集団＝プール） */
export function elemPoolForUnit(unitOrId) {
  return ELEM_BANK.filter((p) => p.unit === unitOrId || p.unitId === unitOrId);
}

/** 実在する単元の一覧（UIの「もどる単元」ボタン用）。データから動的に作る。 */
export function elemUnits() {
  const seen = new Map();
  for (const p of ELEM_BANK) {
    if (!seen.has(p.unitId)) {
      seen.set(p.unitId, { unitId: p.unitId, unit: p.unit, grade: p.grade, gradeNum: p.gradeNum, count: 0 });
    }
    seen.get(p.unitId).count++;
  }
  return [...seen.values()].sort((a, b) => a.gradeNum - b.gradeNum || a.unitId.localeCompare(b.unitId));
}

// ── 学び直しマップ：中学の章でつまずいたら戻る小学校の単元 ──────────────
//   キー＝中学の章ID（index.js の c1..c7 / g2c1.. / g3c1..）。
//   値 ＝小学校の単元名（elementaryBank.json の unit と一致）。優先度順。
//   ※図形・データ系の中学章は対応する小学計算バンクが無いので空（[]）。
//   ※ここを増やせば「裏の学び直し」が当たる範囲が広がる、教師が読める対応表。
export const REMEDIATION = {
  // ── 中1 ──
  c1: ["わり算の筆算", "小数の乗除", "分数の加減", "分数の乗除", "整数の性質", "計算のきまり"], // 正の数・負の数
  c2: ["分数の加減", "分数の乗除", "計算のきまり"],                                  // 文字の式
  c3: ["分数の加減", "分数の乗除", "割合", "計算のきまり"],                            // 方程式
  c4: ["割合", "単位量あたり", "比例・反比例"],                                       // 比例と反比例
  c5: [], c6: [], c7: [],                                                          // 平面/空間/データ（小学計算バンク対象外）
  // ── 中2 ──
  g2c1: ["分数の加減", "分数の乗除", "計算のきまり"],   // 式の計算
  g2c2: ["分数の加減", "分数の乗除", "割合"],           // 連立方程式
  g2c3: ["割合", "単位量あたり", "比例・反比例"],        // 一次関数
  g2c4: [], g2c5: [], g2c6: [],
  // ── 中3 ──
  g3c1: ["分数の乗除", "計算のきまり", "整数の性質"],   // 式の展開と因数分解
};

/** 中学の章IDから、戻るべき小学校の単元名（実在するものだけ）を返す */
export function remediationUnitsFor(chapterId) {
  const want = REMEDIATION[chapterId] || [];
  const have = new Set(ELEM_BANK.map((p) => p.unit));
  return want.filter((u) => have.has(u));
}

/** 中学の章IDに対応する小学校の問題プール（学び直しドリルの母集団） */
export function elemPoolForChapter(chapterId) {
  const units = new Set(remediationUnitsFor(chapterId));
  return ELEM_BANK.filter((p) => units.has(p.unit));
}
