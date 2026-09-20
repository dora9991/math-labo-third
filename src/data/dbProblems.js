// ============================================================
// dbProblems.js — 問題DB（problem_bank.json）の実問題をゲームの小単元に橋渡し
//
// イマイチな自動生成問題を、教科書由来の良質な実問題で底上げする。
// 自動採点できる（answerNumeric を持つ）問題だけを使い、
// 章×小単元(subunit) → ゲームの小単元(unitId) にマッピングして取り込む。
//   ・前半 c1〜c4 を対象（DBが厚い）。後半は従来どおり手続き生成。
//   ・generator.js が出題のたびに dbTemplatesFor(unitId, level) を見て、
//     DB問題があれば優先的に出す（手続き生成は変化球として残す）。
// ============================================================
import { PROBLEM_BANK } from "./problemBank.js";

// DBの「章/小単元」→ ゲームの小単元ID（c1〜c4のみ）
const SUBUNIT_TO_UNIT = {
  // c1 正の数と負の数
  //  ※「符号と数量の表現」は答えを「+2」のように符号付きで書く問題で、
  //    4択（数値）では+が消えてしまうため取り込まない。
  "c1/大小関係": "u1",
  "c1/加法": "u2",
  "c1/減法": "u3",
  "c1/加減の混合": "u3",
  "c1/乗法": "u4",
  "c1/除法": "u4",
  "c1/乗除の混合": "u4",
  "c1/累乗": "u4",
  "c1/四則の混合・分配法則": "u5",
  "c1/正負の数の利用": "u5",
  // c2 文字の式
  "c2/式の値（代入）": "v2",
  // c3 方程式
  "c3/等式の性質で解く": "e1",
  "c3/移項して解く（ax+b=c）": "e2",
  "c3/かっこを含む方程式": "e2",
  "c3/小数係数の方程式": "e2",
  "c3/分数係数の方程式": "e2",
  "c3/分数・小数係数の方程式": "e2",
  "c3/両辺に文字がある方程式": "e3",
  "c3/比例式・分数＝分数": "e4",
  "c3/文章題": "e5",
  // c4 比例と反比例
  "c4/比例の利用": "h5",
  "c4/反比例の利用": "h5",
};

// DBの level(1/2/3) → ゲームの難易度
function levelKey(lv) {
  if (lv >= 3) return "advanced";
  if (lv === 2) return "standard";
  return "easy";
}

// 誤答パターン(misconception)を短いヒントに。無ければ無難なヒント。
function hintOf(p) {
  if (p.misconception) {
    const m = String(p.misconception).split(/／|\/|、/)[0]; // 先頭の1つだけ
    return `気をつけよう：${m}`;
  }
  return "ヒント：途中式を書いて、ひとつずつ計算しよう";
}

// 起動時に1回だけ index を作る： INDEX[unitId][level] = [template...]
const INDEX = {};
for (const p of PROBLEM_BANK) {
  if (!p.autoGradable) continue;
  if (p.answerNumeric == null || !Number.isFinite(Number(p.answerNumeric))) continue;
  const unitId = SUBUNIT_TO_UNIT[`${p.chapter}/${p.subunit}`];
  if (!unitId) continue;
  const lv = levelKey(p.level);
  const ans = Number(p.answerNumeric);
  const tmpl = {
    id: `db_${p.id}`,
    fromDb: true,
    skill: p.appSkill || null,
    // build は手続きテンプレと同じ形（rngは無視して固定問題を返す）
    build: () => ({ q: p.q, ans, h1: hintOf(p), h2: "答えの符号にも気をつけよう" }),
  };
  ((INDEX[unitId] ||= {})[lv] ||= []).push(tmpl);
}

/** 小単元×難易度のDB実問題テンプレを返す（無ければ空配列） */
export function dbTemplatesFor(unitId, level) {
  return (INDEX[unitId] && INDEX[unitId][level]) || [];
}

/** 取り込んだDB問題の総数（デバッグ・確認用） */
export function dbProblemCount() {
  let n = 0;
  for (const u of Object.values(INDEX)) for (const arr of Object.values(u)) n += arr.length;
  return n;
}
