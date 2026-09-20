// ============================================================
// data/toketa/houteishiki.js — とけた！の「方程式」問題を math-labo へ移植。
//  ・各問題が「解き方ステップ(steps)」と「誤答パターン付き4択(distractors)」を持つ。
//  ・問題文(q)の表記は math-labo 流（半角 +−() ）に正規化。ヒント(steps/コーチ)は
//    とけた流（全角）のまま＝表示は math-labo、ヒントは toketa の要望どおり。
//  ・お手本(steps)は「式の立て方・方法」までで止め、最終的な答えは見せない。
//  出典: toketa/src/content/houteishiki.js（PDF由来 problem_bank.json「方程式」の型を反映）。
// ============================================================

// _util.js から必要なものをインライン化（このモジュールを自己完結にする）
const ri = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const shuffle = (a) => a.map((v) => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map((x) => x[1]);
const num = (n) => (n < 0 ? `−${-n}` : `${n}`);            // 3 / −3

const nz = (v) => (v === 0 ? 1 : v);                       // 0を避ける
const pm = (v) => (v >= 0 ? `＋ ${v}` : `− ${-v}`);         // 項のあとの ＋b / −b

// 正解＋誤答候補から重複なし4択（数値なら近い数=calcで補完）
function opts(ans, wrongs) {
  const m = new Map(); m.set(ans, null);
  for (const w of wrongs) { if (m.size >= 4) break; if (w && !m.has(w.val)) m.set(w.val, w.tag); }
  if (typeof ans === "number") {
    let d = 1;
    while (m.size < 4) { for (const v of [ans + d, ans - d]) { if (m.size < 4 && !m.has(v)) m.set(v, "calc"); } if (++d > 14) break; }
  }
  return shuffle([...m].map(([val, tag]) => ({ val, tag })));
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
  "move-sign": { label: "移項の符号", coach: "反対側に移すときは、符号を変えるよ" },
  "wrong-op": { label: "逆の計算", coach: "たし算はひき算で、かけ算はわり算で「もどす」よ" },
  "div-both": { label: "両辺をわる", coach: "片方だけでなく、両辺を同じ数でわるよ" },
  "dist-miss": { label: "かっこの展開", coach: "かっこの外の数を、中の全部にかけるよ" },
  "calc": { label: "計算ミス", coach: "おしい！もう一度ゆっくり計算してみよう" },
};

// 1. 等式の性質（1ステップ）： x±a=b / ax=b / x÷a=b
function genStep() {
  const r = Math.random();
  if (r < 0.28) {
    const x = nz(ri(-9, 12)), a = ri(1, 9), b = x + a;
    return { q: `x ＋ ${a} ＝ ${num(b)}`, ans: x,
      steps: [`両辺から ${a} をひく`, `x ＝ ${num(b)} − ${a} を計算しよう`],
      distractors: opts(x, [{ val: b + a, tag: "move-sign" }, { val: b, tag: "wrong-op" }]) };
  }
  if (r < 0.56) {
    const x = nz(ri(-9, 12)), a = ri(1, 9), b = x - a;
    return { q: `x − ${a} ＝ ${num(b)}`, ans: x,
      steps: [`両辺に ${a} をたす`, `x ＝ ${num(b)} ＋ ${a} を計算しよう`],
      distractors: opts(x, [{ val: b - a, tag: "move-sign" }, { val: b, tag: "wrong-op" }]) };
  }
  if (r < 0.82) {
    const a = ri(2, 6), x = nz(ri(-8, 9)), b = a * x;
    return { q: `${a}x ＝ ${num(b)}`, ans: x,
      steps: [`両辺を ${a} でわる`, `x ＝ ${num(b)} ÷ ${a} を計算しよう`],
      distractors: opts(x, [{ val: b - a, tag: "wrong-op" }, { val: b, tag: "wrong-op" }]) };
  }
  const a = ri(2, 6), x = a * nz(ri(-6, 6)), b = x / a;
  return { q: `x ÷ ${a} ＝ ${num(b)}`, ans: x,
    steps: [`両辺に ${a} をかける`, `x ＝ ${num(b)} × ${a} を計算しよう`],
    distractors: opts(x, [{ val: b, tag: "wrong-op" }, { val: b + a, tag: "calc" }]) };
}

// 2. 移項して解く（ax + b = c）
function genIko() {
  const a = ri(2, 6), x = nz(ri(-7, 9)), b = (Math.random() < 0.5 ? -1 : 1) * ri(1, 12), c = a * x + b;
  return { q: `${a}x ${pm(b)} ＝ ${num(c)}`, ans: x,
    steps: [`${num(b)} を移項：${a}x ＝ ${num(c)} ${pm(-b)} ＝ ${num(c - b)}`, `両辺を ${a} でわる：x ＝ ${num(c - b)} ÷ ${a} を計算しよう`],
    distractors: opts(x, [{ val: Math.round((c + b) / a), tag: "move-sign" }, { val: c - b, tag: "div-both" }]) };
}

// 3. 両辺に文字がある方程式（ax + b = cx + d）
function genBoth() {
  const a = ri(3, 8), c = ri(1, a - 1), x = nz(ri(-6, 8)), b = (Math.random() < 0.5 ? -1 : 1) * ri(1, 10), d = (a - c) * x + b;
  return { q: `${a}x ${pm(b)} ＝ ${c}x ${pm(d)}`, ans: x,
    steps: [`文字を左・数を右へ移項：${a}x − ${c}x ＝ ${num(d)} ${pm(-b)}`, `${a - c}x ＝ ${num(d - b)}`, `両辺を ${a - c} でわろう`],
    distractors: opts(x, [{ val: Math.round((d - b) / (a + c)), tag: "move-sign" }, { val: d - b, tag: "div-both" }]) };
}

// 4. かっこを含む方程式： a(x+b)=c / a(x+b)=cx+d
function genParen() {
  const a = ri(2, 5), b = (Math.random() < 0.5 ? -1 : 1) * ri(1, 6), x = nz(ri(-5, 8));
  if (Math.random() < 0.5) {
    const c = a * (x + b);
    return { q: `${a}（x ${pm(b)}） ＝ ${num(c)}`, ans: x,
      steps: [`展開：${a}x ${pm(a * b)} ＝ ${num(c)}`, `${num(a * b)} を移項：${a}x ＝ ${num(c - a * b)}`, `両辺を ${a} でわろう`],
      distractors: opts(x, [{ val: Math.round((c - b) / a), tag: "dist-miss" }, { val: Math.round(c / a), tag: "dist-miss" }]) };
  }
  const c = ri(1, a - 1), d = (a - c) * x + a * b;
  return { q: `${a}（x ${pm(b)}） ＝ ${c}x ${pm(d)}`, ans: x,
    steps: [`展開：${a}x ${pm(a * b)} ＝ ${c}x ${pm(d)}`, `移項：${a - c}x ＝ ${num(d - a * b)}`, `両辺を ${a - c} でわろう`],
    distractors: opts(x, [{ val: Math.round((d - b) / (a - c)), tag: "dist-miss" }, { val: d - a * b, tag: "div-both" }]) };
}

// 5. 比例式・分数＝数： (x+a)÷b = c
function genCross() {
  const b = ri(2, 6), c = nz(ri(-5, 6)), a = (Math.random() < 0.5 ? -1 : 1) * ri(1, 8), x = b * c - a;
  return { q: `(x ${pm(a)}) ÷ ${b} ＝ ${num(c)}`, ans: x,
    steps: [`両辺に ${b} をかける：x ${pm(a)} ＝ ${num(b * c)}`, `${num(a)} を移項：x ＝ ${num(b * c)} ${pm(-a)} を計算しよう`],
    distractors: opts(x, [{ val: b * c + a, tag: "move-sign" }, { val: c - a, tag: "div-both" }]) };
}

// 6. 文章題（ある数・代金・おつり）
function genWord() {
  const r = Math.random();
  if (r < 0.34) {
    const x = ri(2, 12), a = ri(2, 5), b = ri(1, 9), c = a * x + b;
    return { q: `ある数を ${a}倍して ${b} をたすと ${c} になった。ある数は？`, ans: x,
      steps: [`ある数を x とすると ${a}x ＋ ${b} ＝ ${c}`, `${a}x ＝ ${c - b} の形にして解こう`],
      distractors: opts(x, [{ val: Math.round((c + b) / a), tag: "move-sign" }, { val: c - b, tag: "div-both" }]) };
  }
  if (r < 0.67) {
    const price = ri(80, 200), n = ri(3, 8), box = ri(50, 150), total = price * n + box;
    return { q: `1個 ${price}円のおかしを何個かと、${box}円の箱を買って ${total}円。おかしは何個？`, ans: n,
      steps: [`個数を x とすると ${price}x ＋ ${box} ＝ ${total}`, `${price}x ＝ ${total - box} の形にして解こう`],
      distractors: opts(n, [{ val: Math.round(total / price), tag: "move-sign" }, { val: n + 1, tag: "div-both" }]) };
  }
  const price = ri(80, 200), n = ri(3, 8), change = ri(20, 150), pay = price * n + change;
  return { q: `${pay}円で ${n}個の品物を買うと、おつりが ${change}円。品物1個の値段は？`, ans: price,
    steps: [`1個を x とすると ${n}x ＋ ${change} ＝ ${pay}`, `${n}x ＝ ${pay - change} の形にして解こう`],
    distractors: opts(price, [{ val: Math.round(pay / n), tag: "div-both" }, { val: price + ri(1, 10), tag: "calc" }]) };
}

// math-labo の単元ID → その単元にふさわしい toketa ジェネレータ群
//  e1←eq-step / e2←eq-iko,eq-paren / e3←eq-both / e4←eq-cross / e5←eq-word
const UNIT_MAP = {
  e1: [genStep],
  e2: [genIko, genParen],
  e3: [genBoth],
  e4: [genCross],
  e5: [genWord],
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
