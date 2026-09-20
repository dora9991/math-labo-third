// ============================================================
// data/toketa/heimen.js — とけた！の「平面図形」問題を math-labo へ移植。
//  ・角の計算 → 三角形の角 → 円周・円の面積 → おうぎ形の弧 → おうぎ形の面積。
//  ・各問題が「解き方ステップ(steps)」と「誤答パターン付き4択(distractors)」を持つ。
//  ・円・おうぎ形の答えは「Nπ」の形（文字列）。
//  ・問題文(q)の表記は math-labo 流（半角 +−() ）に正規化。ヒント(steps/コーチ)は
//    とけた流（全角）のまま＝表示は math-labo、ヒントは toketa の要望どおり。
//  出典: toketa/src/content/heimen.js。
// ============================================================
const ri = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const shuffle = (a) => a.map((v) => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map((x) => x[1]);
// 円・おうぎ形の Nπ 表記
const pit = (n) => (n === 0 ? "0" : n === 1 ? "π" : `${n}π`);

// 問題文だけ math-labo 流（半角）に正規化する。ヒントは全角のまま。
export function nrm(s) {
  return String(s)
    .replace(/＋/g, "+").replace(/−/g, "-")
    .replace(/（/g, "(").replace(/）/g, ")")
    .replace(/\s*([+\-×÷])\s*/g, "$1");
}

// つまづきの正体（診断タグ → ラベルと直し方の一言）
export const MISC = {
  "supp-comp": { label: "補角と余角の取り違え", coach: "一直線は180°、直角は90°。どちらから引くか確認しよう" },
  "angle-sum": { label: "内角の和", coach: "三角形の角の和は 180° だよ" },
  "circ-area": { label: "円周と面積の混同", coach: "円周は 2πr、面積は πr²（半径×半径）だよ" },
  "fan-frac": { label: "中心角の割合", coach: "おうぎ形は 円 ×（中心角 ÷ 360）だよ" },
  "calc": { label: "計算ミス", coach: "おしい！もう一度ゆっくり計算してみよう" },
};

// 正解＋誤答候補から重複なし4択（数値なら近い数=calcで補完／式は候補3つ必須）
function opts(ans, wrongs) {
  const m = new Map(); m.set(ans, null);
  for (const w of wrongs) { if (m.size >= 4) break; if (w && !m.has(w.val)) m.set(w.val, w.tag); }
  if (typeof ans === "number") {
    let d = 1;
    while (m.size < 4) { for (const v of [ans + d, ans - d]) { if (m.size < 4 && !m.has(v)) m.set(v, "calc"); } if (++d > 14) break; }
  }
  return shuffle([...m].map(([val, tag]) => ({ val, tag })));
}
// 「Nπ」の4択：係数(数値)で重複なし4つを作ってから Nπ 表記に変換
function optsPi(coef, wrongs) {
  return opts(coef, wrongs).map((o) => ({ val: pit(o.val), tag: o.tag }));
}

// ── 1. 角の計算（対頂角・補角） ──
function genAngle() {
  const r = Math.random();
  if (r < 0.4) { const x = ri(20, 160); return { q: `一直線の上にある角。${x}° のとなりの角は？`, ans: 180 - x,
    steps: ["一直線は 180°", `180 − ${x} を計算しよう`], distractors: opts(180 - x, [{ val: x, tag: "supp-comp" }, { val: 90 - x > 0 ? 90 - x : x + 5, tag: "supp-comp" }]) }; }
  if (r < 0.7) { const x = ri(10, 80); return { q: `直角を2つに分けた角。一方が ${x}° のとき、もう一方は？`, ans: 90 - x,
    steps: ["直角は 90°", `90 − ${x} を計算しよう`], distractors: opts(90 - x, [{ val: 180 - x, tag: "supp-comp" }, { val: x, tag: "supp-comp" }]) }; }
  const x = ri(20, 160); return { q: `2直線が交わってできる、${x}° の対頂角は？`, ans: x,
    steps: ["対頂角は等しい", "向かい合う角どうしは同じ大きさだよ"], distractors: opts(x, [{ val: 180 - x, tag: "supp-comp" }, { val: 90, tag: "calc" }]) };
}
// ── 2. 三角形の角（和は180°） ──
function genTri() {
  const a = ri(30, 80), b = ri(30, 80), ans = 180 - a - b;
  return { q: `三角形の2つの角が ${a}° と ${b}°。残りの角は？`, ans,
    steps: ["三角形の内角の和は 180°", `180 − ${a} − ${b} を計算しよう`],
    distractors: opts(ans, [{ val: a + b, tag: "angle-sum" }, { val: 360 - a - b, tag: "angle-sum" }]) };
}
// ── 3. 円周と円の面積 ──
function genCircle() {
  const r = ri(2, 9);
  if (Math.random() < 0.5) { return { q: `半径 ${r} の円の円周は？（π を使って）`, ans: pit(2 * r),
    steps: ["円周 ＝ 2πr", `2×π×${r} を計算しよう`], distractors: optsPi(2 * r, [{ val: r * r, tag: "circ-area" }, { val: r, tag: "calc" }, { val: 4 * r, tag: "calc" }]) }; }
  return { q: `半径 ${r} の円の面積は？（π を使って）`, ans: pit(r * r),
    steps: ["面積 ＝ πr²", `π×${r}×${r} を計算しよう`], distractors: optsPi(r * r, [{ val: 2 * r, tag: "circ-area" }, { val: 2 * r * r, tag: "calc" }, { val: r, tag: "calc" }]) };
}
// ── 4. おうぎ形の弧の長さ ──
function genArc() {
  const o = [[180, ri(2, 9)], [90, 2 * ri(1, 4)], [120, 3 * ri(1, 3)], [60, 3 * ri(1, 3)]][ri(0, 3)];
  const deg = o[0], r = o[1], coef = r * deg / 180;
  return { q: `半径 ${r}、中心角 ${deg}° のおうぎ形の弧の長さは？（π）`, ans: pit(coef),
    steps: ["弧 ＝ 2πr ×（中心角 ÷ 360）", `2π×${r}×（${deg}÷360）を計算しよう`],
    distractors: optsPi(coef, [{ val: 2 * r, tag: "fan-frac" }, { val: coef * 2, tag: "calc" }]) };
}
// ── 5. おうぎ形の面積 ──
function genFan() {
  const o = [[90, 2 * ri(1, 4)], [180, 2 * ri(1, 4)], [120, [3, 6][ri(0, 1)]]][ri(0, 2)];
  const deg = o[0], r = o[1], coef = r * r * deg / 360;
  return { q: `半径 ${r}、中心角 ${deg}° のおうぎ形の面積は？（π）`, ans: pit(coef),
    steps: ["面積 ＝ πr² ×（中心角 ÷ 360）", `π×${r}×${r}×（${deg}÷360）を計算しよう`],
    distractors: optsPi(coef, [{ val: r * r, tag: "fan-frac" }, { val: coef * 2, tag: "calc" }]) };
}

// toketa の平面図形 単元ID（CHAPTER.units の haichiUnit）→ そのジェネレータ群
//  z1: hm-angle / hm-tri、 z3: hm-circle / hm-arc / hm-fan
const UNIT_MAP = {
  z1: [genAngle, genTri],
  z3: [genCircle, genArc, genFan],
};

/** その単元に toketa ヒント付き問題があるか */
export function has(unitId) {
  return !!UNIT_MAP[unitId];
}

/**
 * math-labo 互換の toketa 問題を1問作る。無ければ null。
 * 返り値: { q(半角), ans, steps[], distractors[{val,tag}], viz, unitId, toketa:true }
 */
export function gen(unitId) {
  const gens = UNIT_MAP[unitId];
  if (!gens) return null;
  const g = gens[Math.floor(Math.random() * gens.length)];
  const p = g();
  return {
    q: nrm(p.q), ans: p.ans, steps: p.steps, distractors: p.distractors,
    viz: p.viz || null, unitId, toketa: true,
  };
}
