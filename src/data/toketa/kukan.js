// ============================================================
// data/toketa/kukan.js — とけた！の「空間図形」問題を math-labo へ移植。
//  ・各問題が「解き方ステップ(steps)」と「誤答パターン付き4択(distractors)」を持つ。
//  ・問題文(q)の表記は math-labo 流（半角 +−() ）に正規化。ヒント(steps/コーチ)は
//    とけた流（全角）のまま＝表示は math-labo、ヒントは toketa の要望どおり。
//  ・steps は「式の立て方（公式＋代入）」までで止め、最終の答えは書かない。
//  出典: toketa/src/content/kukan.js（直方体/角柱/角錐/円柱の体積、球の表面積・体積）。
// ============================================================
const ri = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const shuffle = (a) => a.map((v) => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map((x) => x[1]);
const pit = (n) => (n === 0 ? "0" : n === 1 ? "π" : `${n}π`); // 円・おうぎ形の Nπ 表記

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
// 「Nπ」の4択：係数(数値)で重複なし4つを作ってから Nπ 表記に変換（数値padが効く）
function optsPi(coef, wrongs) {
  return opts(coef, wrongs).map((o) => ({ val: pit(o.val), tag: o.tag }));
}

// 問題文だけ math-labo 流（半角）に正規化する。ヒントは全角のまま。
export function nrm(s) {
  return String(s)
    .replace(/＋/g, "+").replace(/−/g, "-")
    .replace(/（/g, "(").replace(/）/g, ")")
    .replace(/\s*([+\-×÷])\s*/g, "$1");
}

// つまづきの正体（診断タグ → ラベルと直し方の一言）
export const MISC = {
  "pyramid-third": { label: "錐の ÷3 忘れ", coach: "角錐・円錐の体積は、柱の 1/3（÷3）だよ" },
  "vol-base": { label: "体積の公式", coach: "体積 ＝ 底面積 × 高さ だよ" },
  "surf-vol": { label: "体積と表面積の混同", coach: "表面積は『面の面積の合計』。体積とはちがうよ" },
  "calc": { label: "計算ミス", coach: "おしい！もう一度ゆっくり計算してみよう" },
};

function genBox() {
  if (Math.random() < 0.4) { const a = ri(2, 6); return { q: `1辺 ${a} の立方体の体積は？`, ans: a * a * a,
    steps: ["体積 ＝ 1辺 × 1辺 × 1辺", `${a}×${a}×${a} を計算しよう`], distractors: opts(a * a * a, [{ val: a * a * 6, tag: "surf-vol" }, { val: a * 3, tag: "calc" }]) }; }
  const a = ri(2, 6), b = ri(2, 6), c = ri(2, 6); return { q: `たて${a}・よこ${b}・高さ${c} の直方体の体積は？`, ans: a * b * c,
    steps: ["体積 ＝ たて×よこ×高さ", `${a}×${b}×${c} を計算しよう`], distractors: opts(a * b * c, [{ val: a + b + c, tag: "vol-base" }, { val: 2 * (a * b + b * c + c * a), tag: "surf-vol" }]) };
}
function genPrism() {
  const base = ri(6, 20), h = ri(3, 9);
  return { q: `底面積 ${base}、高さ ${h} の角柱の体積は？`, ans: base * h,
    steps: ["体積 ＝ 底面積 × 高さ", `${base}×${h} を計算しよう`],
    distractors: opts(base * h, [{ val: base + h, tag: "vol-base" }, { val: Math.round(base * h / 3), tag: "pyramid-third" }]) };
}
function genPyramid() {
  const base = 3 * ri(2, 7), h = ri(2, 9), ans = base * h / 3;
  return { q: `底面積 ${base}、高さ ${h} の角錐の体積は？`, ans,
    steps: ["角錐の体積 ＝ 底面積 × 高さ ÷ 3", `${base}×${h}÷3 を計算しよう`],
    distractors: opts(ans, [{ val: base * h, tag: "pyramid-third" }, { val: base + h, tag: "vol-base" }]) };
}
function genCyl() {
  const r = ri(2, 6), h = ri(2, 8), coef = r * r * h;
  return { q: `底面の半径 ${r}、高さ ${h} の円柱の体積は？（π）`, ans: pit(coef),
    steps: ["体積 ＝ πr² × 高さ", `π×${r}×${r}×${h} を計算しよう`],
    distractors: optsPi(coef, [{ val: 2 * r * h, tag: "vol-base" }, { val: r * r, tag: "calc" }, { val: Math.round(coef / 3), tag: "pyramid-third" }]) };
}
function genSphere() {
  if (Math.random() < 0.35) {
    // 体積 ＝ 4/3πr³（係数が整数になる r＝3,6,9 で出題）
    const r = [3, 6, 9][ri(0, 2)], coef = (4 * r * r * r) / 3;
    return { q: `半径 ${r} の球の体積は？（π）`, ans: pit(coef),
      steps: ["球の体積 ＝ 4/3πr³", `4/3×π×${r}³ を計算しよう`],
      distractors: optsPi(coef, [{ val: 4 * r * r, tag: "surf-vol" }, { val: 4 * r * r * r, tag: "calc" }, { val: r * r * r, tag: "calc" }]) };
  }
  const r = ri(2, 9), coef = 4 * r * r;
  return { q: `半径 ${r} の球の表面積は？（π）`, ans: pit(coef),
    steps: ["球の表面積 ＝ 4πr²", `4×π×${r}×${r} を計算しよう`],
    distractors: optsPi(coef, [{ val: 2 * r * r, tag: "surf-vol" }, { val: 4 * r, tag: "calc" }, { val: r * r, tag: "calc" }]) };
}

// toketa の haichiUnit → その単元にふさわしい toketa ジェネレータ群
//  k2: 直方体/立方体・角柱・角錐・円柱の体積 / k4: 球の表面積・体積
const UNIT_MAP = {
  k2: [genBox, genPrism, genPyramid, genCyl],
  k4: [genSphere],
};

/** その単元に toketa ヒント付き問題があるか */
export function has(unitId) {
  return !!UNIT_MAP[unitId];
}

/**
 * math-labo 互換の toketa 問題を1問作る。無ければ null。
 * 返り値: { q(半角), ans, steps[], distractors[{val,tag}], viz?, unitId, toketa:true }
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
