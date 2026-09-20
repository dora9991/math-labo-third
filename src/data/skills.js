// ============================================================
// skills.js — 正負の数のスキルDAG（『正負の数_スキルマスタ.xlsx』から書き出し）
//
// ★これが診断・アダプティブ出題の「正」。教師が読める・いじれる中核資産。
//   問題テンプレ(data/grade1/c1_seisu.js)の各問は meta.skill でここを指す。
//
//   SKILLS[id] = { name, type:"手続き"|"概念", measurable, prereqs:[], difficulty:1..5, provisional? }
//     measurable=true（手続き） … 正誤から習熟度を推定。アダプティブ出題の対象。
//     measurable=false（概念）   … 数値化しない。発問・記述・自己内省で扱う（診断では遡りスキップ）。
//   MISCONCEPTIONS[id] = { name, blame } … 誤答タイプ → 責任スキル（一意）
//
// ※ S-NEG-001〜032 は確定。005/041/044/051/061… は誤答タイプが指す暫定スキル。
//   S-FAC-01 は素因数分解（正負とは別単元だが c1 に含むため暫定で1つ置く）。
// ============================================================

export const SKILLS = {
  // ── 概念・大小（J1-A-01）─────────────────────────
  "S-NEG-001": { name: "負の数の意味（基準からの反対向き）", type: "概念", measurable: false, prereqs: [], difficulty: 1 },
  "S-NEG-002": { name: "数直線上に正負の数を位置づけ", type: "概念", measurable: false, prereqs: ["S-NEG-001"], difficulty: 1 },
  "S-NEG-003": { name: "絶対値の意味（0からの距離）", type: "概念", measurable: false, prereqs: ["S-NEG-002"], difficulty: 2 },
  "S-NEG-004": { name: "正負の数の大小比較", type: "手続き", measurable: true, prereqs: ["S-NEG-002", "S-NEG-003"], difficulty: 2 },
  "S-NEG-005": { name: "絶対値を求める・扱う", type: "手続き", measurable: true, prereqs: ["S-NEG-003"], difficulty: 1, provisional: true },

  // ── 加法（J1-A-02）──────────────────────────────
  "S-NEG-010": { name: "加法の意味を数直線の移動で理解", type: "概念", measurable: false, prereqs: ["S-NEG-002"], difficulty: 2 },
  "S-NEG-011": { name: "同符号の加法", type: "手続き", measurable: true, prereqs: ["S-NEG-010"], difficulty: 2 },
  "S-NEG-012": { name: "異符号の加法", type: "手続き", measurable: true, prereqs: ["S-NEG-003", "S-NEG-010"], difficulty: 3 },
  "S-NEG-013": { name: "0や打ち消しの和（a+0, a+(−a)）", type: "手続き", measurable: true, prereqs: ["S-NEG-011", "S-NEG-012"], difficulty: 2 },

  // ── 減法・加減混合（J1-A-02）────────────────────
  "S-NEG-020": { name: "減法を「符号を変えてたす」に変換", type: "手続き", measurable: true, prereqs: ["S-NEG-012"], difficulty: 3 },
  "S-NEG-021": { name: "なぜ減法が加法に直せるか説明", type: "概念", measurable: false, prereqs: ["S-NEG-010", "S-NEG-020"], difficulty: 4 },
  "S-NEG-022": { name: "減法の計算", type: "手続き", measurable: true, prereqs: ["S-NEG-020"], difficulty: 3 },
  "S-NEG-030": { name: "加減混合の式を加法だけに直す", type: "手続き", measurable: true, prereqs: ["S-NEG-013", "S-NEG-022"], difficulty: 3 },
  "S-NEG-031": { name: "項の考え方で順序を入れ替え", type: "概念", measurable: false, prereqs: ["S-NEG-030"], difficulty: 4 },
  "S-NEG-032": { name: "加減混合の計算を正しく実行", type: "手続き", measurable: true, prereqs: ["S-NEG-030", "S-NEG-031"], difficulty: 4 },

  // ── 乗除・累乗（暫定 J1-A-03）───────────────────
  "S-NEG-041": { name: "乗除の符号判定", type: "手続き", measurable: true, prereqs: ["S-NEG-012"], difficulty: 2, provisional: true },
  "S-NEG-042": { name: "乗法・除法の計算", type: "手続き", measurable: true, prereqs: ["S-NEG-041"], difficulty: 2, provisional: true },
  "S-NEG-044": { name: "累乗の計算（符号を含む）", type: "手続き", measurable: true, prereqs: ["S-NEG-042"], difficulty: 3, provisional: true },

  // ── 四則混合（暫定）─────────────────────────────
  "S-NEG-051": { name: "四則混合の計算順序", type: "手続き", measurable: true, prereqs: ["S-NEG-032", "S-NEG-042", "S-NEG-044"], difficulty: 4, provisional: true },

  // ── 文字式・利用など（暫定・c1範囲外。誤答タイプの参照先として置くだけ）──
  "S-NEG-061": { name: "代入（負の数は括弧で）", type: "手続き", measurable: true, prereqs: ["S-NEG-051"], difficulty: 3, provisional: true },
  "S-NEG-062": { name: "文章題の立式", type: "手続き", measurable: true, prereqs: ["S-NEG-051"], difficulty: 4, provisional: true },
  "S-NEG-071": { name: "分配法則の適用", type: "手続き", measurable: true, prereqs: ["S-NEG-051"], difficulty: 4, provisional: true },
  "S-NEG-072": { name: "規則性（偶奇・ペア）", type: "手続き", measurable: true, prereqs: [], difficulty: 4, provisional: true },
  "S-NEG-073": { name: "条件の場合分け・絞り込み", type: "手続き", measurable: true, prereqs: [], difficulty: 4, provisional: true },

  // ── 素因数分解（別単元・暫定）────────────────────
  "S-FAC-01": { name: "素因数分解の基本", type: "手続き", measurable: true, prereqs: [], difficulty: 2, provisional: true },

  // ── 中2「式の計算」(g2c1) ───────────────────────────
  "S-EXP-ADD":   { name: "多項式の加法・減法（同類項）", type: "手続き", measurable: true, prereqs: ["S-NEG-032"], difficulty: 2 },
  "S-EXP-MUL":   { name: "単項式の乗法（係数の積・指数の和）", type: "手続き", measurable: true, prereqs: ["S-NEG-042"], difficulty: 2 },
  "S-EXP-POW":   { name: "累乗を含む単項式の計算", type: "手続き", measurable: true, prereqs: ["S-EXP-MUL", "S-NEG-044"], difficulty: 3 },
  "S-EXP-DIV":   { name: "単項式の除法（約分・指数の差）", type: "手続き", measurable: true, prereqs: ["S-EXP-MUL"], difficulty: 3 },
  "S-EXP-MIX":   { name: "乗除の混じった計算", type: "手続き", measurable: true, prereqs: ["S-EXP-MUL", "S-EXP-DIV"], difficulty: 4 },
  "S-EXP-SOLVE": { name: "等式の変形（○について解く）", type: "手続き", measurable: true, prereqs: ["S-EXP-ADD"], difficulty: 4 },
};

// 誤答タイプ → 責任スキル（一意）。誤答値から原因スキルを当てる将来の診断に使う。
export const MISCONCEPTIONS = {
  "MC-01": { name: "絶対値の差でなく和にする", blame: "S-NEG-012" },
  "MC-02": { name: "結果の符号を大きい方に合わせ忘れ", blame: "S-NEG-012" },
  "MC-03": { name: "同符号加法で符号を落とす", blame: "S-NEG-011" },
  "MC-04": { name: "大小比較を絶対値で行う", blame: "S-NEG-004" },
  "MC-05": { name: "二重符号 −(−3) の処理ミス", blame: "S-NEG-022" },
  "MC-06": { name: "引く数だけ/前の符号まで符号変換ミス", blame: "S-NEG-020" },
  "MC-07": { name: "加減混合で一部の項だけ変換", blame: "S-NEG-030" },
  "MC-08": { name: "累積的な符号ミス", blame: "S-NEG-032" },
  "MC-09": { name: "a+(−a)=0 を意識できない", blame: "S-NEG-013" },
  "MC-10": { name: "端点を含む/含まない誤り", blame: "S-NEG-004" },
  "MC-11": { name: "絶対値を取り忘れる/片方のみ", blame: "S-NEG-005" },
  "MC-12": { name: "負の数の個数で符号判定ミス", blame: "S-NEG-041" },
  "MC-13": { name: "累乗を底×指数と誤る/符号ミス", blame: "S-NEG-044" },
  "MC-14": { name: "四則の順序ミス（加減を先に）", blame: "S-NEG-051" },
  "MC-15": { name: "代入時に負の数を()で囲まずミス", blame: "S-NEG-061" },
  "MC-16": { name: "文章題の立式の符号ミス", blame: "S-NEG-062" },
  "MC-17": { name: "分配法則の適用ミス", blame: "S-NEG-071" },
  "MC-18": { name: "規則性（偶奇/ペア）が立たない", blame: "S-NEG-072" },
  "MC-19": { name: "条件の場合分け・絞り込み漏れ", blame: "S-NEG-073" },
};

/** スキル名を返す（未知IDはそのまま返す） */
export function skillName(id) {
  return SKILLS[id]?.name || id;
}

/** 計測対象（手続き）スキルか */
export function isMeasurable(id) {
  return !!SKILLS[id]?.measurable;
}
