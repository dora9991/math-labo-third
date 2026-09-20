// ============================================================
// data/toketa/seisu.js — とけた！の「正の数・負の数」問題を math-labo へ移植。
//  ・各問題が「解き方ステップ(steps)」と「誤答パターン付き4択(distractors)」を持つ。
//  ・問題文(q)の表記は math-labo 流（半角 +−() ）に正規化。ヒント(steps/対比/コーチ)は
//    とけた流（全角）のまま＝表示は math-labo、ヒントは toketa の要望どおり。
//  出典: toketa/src/content/seisu.js（PDF由来 problem_bank.json の型を反映）。
// ============================================================
const ri = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const shuffle = (a) => a.map((v) => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map((x) => x[1]);
const rsign = () => (Math.random() < 0.5 ? -1 : 1);
// 符号つき（かっこ付き）表記： 3→（＋3） / -3→（−3）  ※ヒント/一部qで使用
const sp = (n) => (n < 0 ? `（−${-n}）` : `（＋${n}）`);
const spe = (n) => (n < 0 ? `−${-n}` : `＋${n}`);
const nm = (n) => (n < 0 ? `−${-n}` : `${n}`);

// 問題文だけ math-labo 流（半角）に正規化する。ヒントは全角のまま。
export function nrm(s) {
  return String(s)
    .replace(/＋/g, "+").replace(/−/g, "-")
    .replace(/（/g, "(").replace(/）/g, ")")
    .replace(/\s*([+\-×÷])\s*/g, "$1");
}

// つまづきの正体（診断タグ → ラベルと直し方の一言）
export const MISC = {
  "abs-sign": { label: "絶対値の意味", coach: "絶対値は符号をとった「大きさ」。答えはいつも0以上だよ" },
  "sign-flip": { label: "符号の取り違え", coach: "答えの ＋・− を逆にしていないかな？" },
  "same-sub": { label: "同符号なのに引いた", coach: "同符号どうしは、絶対値を「たす」よ" },
  "diff-add": { label: "異符号なのに足した", coach: "符号がちがう時は、絶対値を「ひく」よ" },
  "sub-keep": { label: "ひき算の符号変え忘れ", coach: "ひき算は、ひく数の符号を変えて「たす」に直すよ" },
  "mul-sign": { label: "かけ算・わり算の符号", coach: "同符号→＋、異符号→−。符号を先に決めよう" },
  "pow-sign": { label: "累乗の符号", coach: "（−a）²は＋、−a²は−。²がどこにかかるか見よう" },
  "order": { label: "計算の順番", coach: "×・÷ を先に、＋・− はあとで計算するよ" },
  "calc": { label: "計算ミス", coach: "式の順番どおり、ひとつずつ ゆっくり計算し直してみよう" },
};

// 正解＋誤答候補から、重複なしの4択を作る（足りなければ近い数＝calcで埋める）
function four(ans, cands) {
  const m = new Map(); m.set(ans, null);
  for (const c of cands) { if (m.size >= 4) break; if (!m.has(c.val)) m.set(c.val, c.tag); }
  let d = 1;
  while (m.size < 4) { for (const v of [ans + d, ans - d]) { if (m.size < 4 && !m.has(v)) m.set(v, "calc"); } if (++d > 20) break; }
  return shuffle([...m].map(([val, tag]) => ({ val, tag })));
}

// ── 1. 大小・絶対値 ──
function genDaisho() {
  const r = Math.random();
  if (r < 0.34) {
    const n = ri(1, 12), big = Math.random() < 0.5, ans = big ? n : -n;
    return { q: `0 より ${n} ${big ? "大きい" : "小さい"}数を、符号をつけて答えよう`, ans,
      steps: ["0より大きい→＋、0より小さい→−", `0より ${n} ${big ? "大きい" : "小さい"} なら 符号は？（数は ${n}）`],
      distractors: four(ans, [{ val: -ans, tag: "sign-flip" }]) };
  }
  if (r < 0.67) {
    const a = ri(1, 12), n = Math.random() < 0.5 ? -a : a;
    return { q: `${spe(n)} の絶対値は？`, ans: a,
      steps: ["絶対値は、0からのきょり（符号をとった「大きさ」）", `${spe(n)} の マイナスを外した「大きさ」を答えよう`],
      distractors: four(a, [{ val: -a, tag: "abs-sign" }]) };
  }
  let x = rsign() * ri(1, 9), y = rsign() * ri(1, 9); if (x === y) y += 1;
  const ans = Math.max(x, y);
  return { q: `${nm(x)} と ${nm(y)}、大きいのはどっち？（その数を答えよう）`, ans,
    steps: ["数直線では、右にある数ほど大きい", "正の数は0より大きく、負の数は0より小さい"],
    distractors: four(ans, [{ val: Math.min(x, y), tag: "sign-flip" }]) };
}

// ── 2. 加法 ──
function genKahou() {
  let a = rsign() * ri(1, 12), b = rsign() * ri(1, 12);
  if (a + b === 0) b += (b > 0 ? -1 : 1);
  const ans = a + b;
  const same = (a < 0) === (b < 0);
  const A = Math.abs(a), Bb = Math.abs(b);
  const steps = same
    ? ["同符号（＋どうし／−どうし）", `絶対値をたす：${A}＋${Bb} を計算`, `符号はそのまま ${a < 0 ? "−" : "＋"}`]
    : ["異符号（＋と−）", `絶対値の大きい方から小さい方をひく：${Math.max(A, Bb)}−${Math.min(A, Bb)} を計算`, `符号は絶対値が大きい方（${(A > Bb ? a : b) < 0 ? "−" : "＋"}）`];
  const wrongs = same
    ? [{ val: -ans, tag: "sign-flip" }, { val: (a < 0 ? -1 : 1) * Math.abs(A - Bb), tag: "same-sub" }]
    : [{ val: -ans, tag: "sign-flip" }, { val: (ans >= 0 ? 1 : -1) * (A + Bb), tag: "diff-add" }];
  return { q: `${sp(a)} ＋ ${sp(b)}`, ans, viz: { start: a, delta: b, ans }, steps, distractors: four(ans, wrongs) };
}

// ── 3. 減法 ──
function genGenpou() {
  let a = rsign() * ri(1, 12), b = rsign() * ri(1, 12);
  if (a - b === 0) b += (b > 0 ? -1 : 1);
  const ans = a - b;
  return { q: `${sp(a)} − ${sp(b)}`, ans, viz: { start: a, delta: -b, ans },
    steps: ["ひき算は、ひく数の符号を変えて「たす」に直す", `${sp(a)} ＋ ${sp(-b)} の形にして、たし算で計算しよう`],
    distractors: four(ans, [{ val: a + b, tag: "sub-keep" }, { val: -ans, tag: "sign-flip" }]) };
}

// ── 4. 累乗 ──
function genPow() {
  const r = Math.random();
  if (r < 0.3) {
    const a = ri(2, 9), ans = a * a;
    return { q: `${sp(-a)}²`, ans, steps: [`（−${a}）² は (−${a})×(−${a})`, `同符号どうし → ＋。あとは ${a}×${a} を計算`],
      distractors: four(ans, [{ val: -ans, tag: "pow-sign" }, { val: a * 2, tag: "calc" }]) };
  }
  if (r < 0.6) {
    const a = ri(2, 9), ans = -(a * a);
    return { q: `−${a}²`, ans, steps: [`−${a}² は −(${a}×${a})（²が先、−はあと）`, `先に ${a}×${a} を計算して、最後に − をつけよう`],
      distractors: four(ans, [{ val: a * a, tag: "pow-sign" }, { val: -a * 2, tag: "calc" }]) };
  }
  if (r < 0.82) {
    const a = ri(2, 12), ans = a * a;
    return { q: `${a}²`, ans, steps: [`${a}² は ${a}×${a}`, `${a}×${a} を計算しよう`],
      distractors: four(ans, [{ val: a * 2, tag: "calc" }, { val: -ans, tag: "pow-sign" }]) };
  }
  const a = ri(2, 5), ans = -(a * a * a);
  return { q: `${sp(-a)}³`, ans, steps: [`（−${a}）³ は −を3回かける → 符号は −`, `${a}×${a}×${a} を計算して、符号は −`],
    distractors: four(ans, [{ val: -ans, tag: "pow-sign" }, { val: -(a * 3), tag: "calc" }]) };
}

// ── 5. 乗法・除法 ──
function genJokujo() {
  const r = Math.random();
  if (r < 0.12) {
    const a = rsign() * ri(2, 9), zeroLeft = Math.random() < 0.5;
    return { q: zeroLeft ? `0 × ${sp(a)}` : `${sp(a)} × 0`, ans: 0, steps: ["0 をかけると、いつでも 0"],
      distractors: four(0, [{ val: a, tag: "calc" }, { val: -a, tag: "calc" }]) };
  }
  const sa = rsign(), sb = rsign(), same = sa === sb;
  if (r < 0.56) {
    const a = ri(2, 9), b = ri(2, 9), ans = sa * sb * a * b;
    return { q: `${sp(sa * a)} × ${sp(sb * b)}`, ans,
      steps: [`まず符号：${same ? "同符号 → ＋" : "異符号 → −"}`, `絶対値をかける：${a}×${b} を計算`],
      distractors: four(ans, [{ val: -ans, tag: "mul-sign" }, { val: a * b * (same ? -1 : 1), tag: "mul-sign" }]) };
  }
  const b = ri(2, 9), qq = ri(2, 9), a = b * qq, ans = sa * sb * qq;
  return { q: `${sp(sa * a)} ÷ ${sp(sb * b)}`, ans,
    steps: [`まず符号：${same ? "同符号 → ＋" : "異符号 → −"}`, `絶対値をわる：${a}÷${b} を計算`],
    distractors: four(ans, [{ val: -ans, tag: "mul-sign" }, { val: qq * (same ? -1 : 1), tag: "mul-sign" }]) };
}

// ── 6. 加減の混合 ──
function genChain() {
  const n = Math.random() < 0.5 ? 3 : 4;
  let ans = rsign() * ri(1, 9);
  let q = sp(ans);
  const calcLine = [`${ans}`];
  for (let i = 1; i < n; i++) {
    const plus = Math.random() < 0.5, v = rsign() * ri(1, 9);
    q += ` ${plus ? "＋" : "−"} ${sp(v)}`;
    const add = plus ? v : -v; ans += add;
    calcLine.push(`${add < 0 ? "−" : "＋"}${Math.abs(add)}`);
  }
  return { q, ans, steps: ["ひき算は「符号を変えてたす」に直し、前から順に計算", `${calcLine.join(" ")} を前から計算しよう`],
    distractors: four(ans, [{ val: -ans, tag: "sign-flip" }, { val: ans + 2 * rsign() * ri(1, 4), tag: "calc" }]) };
}

// ── 7. 四則の混合・分配法則 ──
function genShisoku() {
  if (Math.random() < 0.55) {
    const a = rsign() * ri(1, 9), b = rsign() * ri(2, 6), c = ri(2, 6);
    const prod = b * c, ans = a + prod, leftToRight = (a + b) * c;
    return { q: `${sp(a)} ＋ ${sp(b)} × ${c}`, ans,
      steps: ["×・÷ を先に計算する", `まず ${sp(b)} × ${c} を計算`, `その結果を ${nm(a)} に たそう`],
      distractors: four(ans, [{ val: leftToRight, tag: "order" }, { val: a - prod, tag: "sign-flip" }]) };
  }
  const sa = rsign(), a = ri(2, 6), b = ri(2, 5), t1 = sa * a * b;
  const sd = rsign(), d = ri(2, 5), k = ri(1, 6), c = d * k, t2 = sd * k, ans = t1 - t2;
  return { q: `${sp(sa * a)} × ${b} − ${c} ÷ ${sp(sd * d)}`, ans,
    steps: ["×・÷ を先に計算する", `${sp(sa * a)}×${b} と ${c}÷${sp(sd * d)} をそれぞれ計算`, "できた2つを 前から ひこう"],
    distractors: four(ans, [{ val: t1 + t2, tag: "order" }, { val: -ans, tag: "sign-flip" }]) };
}

// ── 8. 文章題（気温の増減） ──
function genWord() {
  const a = ri(-5, 5), d = ri(2, 9), up = Math.random() < 0.5, ans = up ? a + d : a - d;
  const sa = a < 0 ? `−${-a}` : `${a}`;
  return { q: `朝の気温は ${sa}℃。昼までに ${d}℃ ${up ? "上がった" : "下がった"}。昼の気温は？`, ans,
    steps: [`${up ? "上がる" : "下がる"}から ${sa} ${up ? "＋" : "−"} ${d} の式になる`, "この式を計算して、℃をつけて答えよう"],
    distractors: four(ans, [{ val: up ? a - d : a + d, tag: "sign-flip" }, { val: -ans, tag: "abs-sign" }]) };
}

// math-labo の c1 単元ID → その単元にふさわしい toketa ジェネレータ群
const TOKETA_BY_UNIT = {
  u1: [genDaisho, genWord],      // 正負の意味・大小（＋文章題）
  u2: [genKahou],                // 加法
  u3: [genGenpou, genChain],     // 減法（＋加減の混合）
  u4: [genJokujo, genPow],       // 乗法・除法（＋累乗）
  u5: [genShisoku, genChain],    // 四則混合
  // u6（素因数分解）は toketa 対象外 → 従来問題にフォールバック
};

/** その単元に toketa ヒント付き問題があるか */
export function hasToketaSeisu(unitId) {
  return !!TOKETA_BY_UNIT[unitId];
}

/**
 * math-labo 互換の toketa 問題を1問作る。無ければ null。
 * 返り値: { q(半角), ans, steps[], distractors[{val,tag}], viz?, unitId, toketa:true }
 */
export function genSeisuToketa(unitId) {
  const gens = TOKETA_BY_UNIT[unitId];
  if (!gens) return null;
  const gen = gens[Math.floor(Math.random() * gens.length)];
  const p = gen();
  return {
    q: nrm(p.q), ans: p.ans, steps: p.steps, distractors: p.distractors,
    viz: p.viz || null, unitId, toketa: true,
  };
}

// 統一インターフェース（ディスパッチャ index.js 用。他章と同じ名前）
export const has = hasToketaSeisu;
export const gen = genSeisuToketa;
