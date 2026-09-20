// ============================================================
// data/toketa/moji.js — とけた！の「文字式」問題を math-labo へ移植。
//  ・各問題が「解き方ステップ(steps)」と「誤答パターン付き4択(distractors)」を持つ。
//  ・問題文(q)の表記は math-labo 流（半角 +−() ）に正規化。ヒント(steps/コーチ)は
//    とけた流（全角）のまま＝表示は math-labo、ヒントは toketa の要望どおり。
//  ・文字式は答え(ans)・誤答(val)が「文字列（式）」のことが多い。文字列のまま保持する。
//  出典: toketa/src/content/moji.js（PDF由来 problem_bank.json「文字の式」の型を反映）。
// ============================================================
const ri = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const shuffle = (a) => a.map((v) => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map((x) => x[1]);
const num = (n) => (n < 0 ? `−${-n}` : `${n}`);                 // 3 / −3
const spe = (n) => (n < 0 ? `−${-n}` : `＋${n}`);                // ＋3 / −3
const term = (k, v = "x") => (k === 1 ? v : k === -1 ? `−${v}` : `${k}${v}`); // x / −x / 3x
// 一次式 ax＋b を文字列に（全角＋−）
function lin(a, b) {
  const ax = a === 0 ? "" : term(a);
  if (b === 0) return ax || "0";
  if (!ax) return num(b);
  return ax + (b > 0 ? `＋${b}` : `−${-b}`);
}
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

// 問題文だけ math-labo 流（半角）に正規化する。ヒントは全角のまま。
export function nrm(s) {
  return String(s)
    .replace(/＋/g, "+").replace(/−/g, "-")
    .replace(/（/g, "(").replace(/）/g, ")")
    .replace(/\s*([+\-×÷])\s*/g, "$1");
}

// つまづきの正体（診断タグ → ラベルと直し方の一言）
export const MISC = {
  "coef-sign": { label: "係数の符号", coach: "文字の前の数を、符号もふくめて読むよ" },
  "omit-one": { label: "1の省略", coach: "1×x は x、−1×x は −x。1は書かないよ" },
  "omit-mul": { label: "×を残した", coach: "文字どうし・数と文字の × は省くよ。4×x は 4x" },
  "order-num": { label: "数を後ろに書いた", coach: "数は文字の「前」に書くよ。x×4 は 4x（x4 ではない）" },
  "div-frac": { label: "わり算は分数", coach: "÷ は分数で書くよ。x÷3 は x/3" },
  "subst-sign": { label: "代入の符号", coach: "負の数を代入したら、符号もそのまま計算しよう" },
  "subst-mul": { label: "代入のかけ算", coach: "3x の x に 4 を入れたら 3×4。3 と 4 を「たさない」よ" },
  "mul-like": { label: "同類項をかけた", coach: "同類項は係数を「たす」よ（かけない）" },
  "drop-var": { label: "文字を落とした", coach: "文字（x）はそのまま残すよ。3a＋2a＝5a" },
  "dist-miss": { label: "分配のかけ忘れ", coach: "かっこの外の数を、中の「全部」にかけるよ" },
  "mix-term": { label: "文字と数を混ぜた", coach: "文字の項と数の項は別べつにまとめるよ（4a と 7 はたせない）" },
  "sign-flip": { label: "符号の取り違え", coach: "＋・− を逆にしていないかな？" },
  "calc": { label: "計算ミス", coach: "おしい！もう一度ゆっくり計算してみよう" },
};

// === 表記ルール用の小道具 ===
// x÷n の正しい表記（n は正の数、頭の符号 s は ±1）
const fracStr = (s, body, n) => `${s < 0 ? "−" : ""}${body}/${n}`;

// 1. 文字式の表記ルール（積・商）
//    実問題: x×4→4x / 0.5×x→0.5x / 1×n→n / −x÷6→−x/6 / 5x÷2→5x/2 など
function genRule() {
  const r = Math.random();
  const vs = ["x", "a", "y", "n"];
  const v = vs[ri(0, vs.length - 1)];
  // (a) 数×文字 → 係数を前に（×を省く）
  if (r < 0.30) {
    const a = ri(2, 9);
    return { q: `${a} × ${v} を、文字式の表し方で書くと？`, ans: `${a}${v}`,
      steps: ["数は文字の前に書く", "× の記号は省く"],
      distractors: opts(`${a}${v}`, [
        { val: `${v}${a}`, tag: "order-num" },
        { val: `${a}×${v}`, tag: "omit-mul" },
        { val: `${a}＋${v}`, tag: "calc" }]) };
  }
  // (b) 1×文字・(−1)×文字 → 1を省略（符号は残す）
  if (r < 0.50) {
    const neg = Math.random() < 0.5;
    const ans = neg ? `−${v}` : `${v}`;
    return { q: `${neg ? "（−1）" : "1"} × ${v} を、文字式の表し方で書くと？`, ans,
      steps: ["1 は省略する", neg ? "符号（−）は残す" : "そのまま文字だけになる"],
      distractors: opts(ans, [
        { val: neg ? `−1${v}` : `1${v}`, tag: "omit-one" },
        { val: neg ? `${v}` : `−${v}`, tag: "sign-flip" },
        { val: `${v}1`, tag: "omit-one" }]) };
  }
  // (c) 文字÷数 → 分数で表す（×÷の混同を診断）
  if (r < 0.75) {
    const n = ri(2, 8), neg = Math.random() < 0.5;
    const ans = fracStr(neg ? -1 : 1, v, n);
    return { q: `${neg ? `−${v}` : v} ÷ ${n} を、文字式の表し方で書くと？`, ans,
      steps: ["÷ は分数で書く（わる数を下に）", "文字を分子に、わる数を分母にしよう"],
      distractors: opts(ans, [
        { val: `${neg ? "−" : ""}${v}÷${n}`, tag: "div-frac" },
        { val: fracStr(neg ? -1 : 1, n, v), tag: "div-frac" },
        { val: fracStr(neg ? 1 : -1, v, n), tag: "sign-flip" }]) };
  }
  // (d) 係数つき文字÷数 → 5x÷2 → 5x/2（約分できない＝既約になる係数・分母だけ使う）
  const a = ri(2, 7);
  const gcd = (x, y) => (y ? gcd(y, x % y) : x);
  const cand = [2, 3, 4, 5, 6].filter((k) => k !== a && gcd(a, k) === 1);
  const n = cand[ri(0, cand.length - 1)];
  const ans = `${a}${v}/${n}`;
  return { q: `${a}${v} ÷ ${n} を、文字式の表し方で書くと？`, ans,
    steps: ["÷ は分数で書く", `分子は ${a}${v}、分母は ${n}`],
    distractors: opts(ans, [
      { val: `${a}${v}÷${n}`, tag: "div-frac" },
      { val: `${n}${v}/${a}`, tag: "div-frac" },
      { val: `${a}/${n}${v}`, tag: "calc" }]) };
}

// 2. 式の値（代入）
//    実問題: x=4のとき6x→24 / x=4のとき3+2x→11 / a=−2のとき3a+5→−1 など
function genValue() {
  const r = Math.random();
  // (a) 1項（kx）の代入
  if (r < 0.34) {
    let x = ri(-6, 8); if (x === 0) x = -4;
    const a = ri(2, 7);
    const ans = a * x;
    return { q: `x ＝ ${num(x)} のとき　${term(a)}　の値は？`, ans,
      steps: [`x に ${num(x)} を代入：${a}×（${num(x)}）`, "この式を計算しよう"],
      distractors: opts(ans, [
        { val: a + x, tag: "subst-mul" },
        { val: a * Math.abs(x), tag: "subst-sign" }]) };
  }
  // (b) kx + b の代入（実問題 3+2x / 3a+5 型）
  let x = ri(-5, 6); if (x === 0) x = -3;
  const a = ri(2, 5); let b = ri(-8, 8); if (b === 0) b = 4;
  const ans = a * x + b;
  const tail = spe(b);
  const front = Math.random() < 0.4; // 3+2x のように数が前に来る型も出す
  const expr = front ? `${b > 0 ? b : `（${num(b)}）`}＋${term(a)}` : `${term(a)}${tail}`;
  return { q: `x ＝ ${num(x)} のとき　${expr}　の値は？`, ans,
    steps: [`x に ${num(x)} を代入：${a}×（${num(x)}）${tail}`, "この式を計算しよう"],
    distractors: opts(ans, [
      { val: a * Math.abs(x) + b, tag: "subst-sign" },
      { val: a * x - b, tag: "sign-flip" },
      { val: (a + x) + b, tag: "subst-mul" }]) };
}

// 3. 同類項をまとめる
//    実問題: −3x−8x→−11x / 5a−15a→−10a / −6a+5a→−a / x+x→2x など
function genLike() {
  const vs = ["x", "a", "y"];
  const v = vs[ri(0, vs.length - 1)];
  let a = (Math.random() < 0.5 ? -1 : 1) * ri(1, 9);
  let b = (Math.random() < 0.5 ? -1 : 1) * ri(1, 9);
  let s = a + b;
  if (s === 0) b += (b > 0 ? 1 : -1); // 0x を避ける
  if (a * b === a + b) b += 1;        // 「かけた」誤答が正解と重ならないように
  s = a + b;
  const ans = term(s, v);
  const A1 = a === 1 ? `${v}` : a === -1 ? `−${v}` : `${a}${v}`;
  const join = b < 0 ? ` − ${term(Math.abs(b), v)}` : ` ＋ ${term(b, v)}`;
  // 誤答候補（係数値ベース）を集め、答えと重複しないものから3つ選ぶ
  const cand = [
    { c: a * b, tag: "mul-like" },     // 係数をかけてしまう
    { c: -s, tag: "sign-flip" },       // 符号の取り違え
    { c: s + 1, tag: "calc" }, { c: s - 1, tag: "calc" }, { c: s + 2, tag: "calc" },
  ];
  const wrongs = [{ val: `${s}`, tag: "drop-var" }];   // 文字を落とした（文字列なので答えと不一致）
  const used = new Set([s]);
  for (const { c, tag } of cand) { if (wrongs.length >= 3) break; if (!used.has(c)) { used.add(c); wrongs.push({ val: term(c, v), tag }); } }
  return { q: `${A1}${join} ＝ ？`, ans,
    steps: ["同類項は、係数（文字の前の数）をたす", `${a} ${b < 0 ? "−" : "＋"} ${Math.abs(b)} を計算して、文字はそのまま残そう`],
    distractors: opts(ans, wrongs) };
}

// 4. 分配法則（展開）
//    実問題: 2(x+3)→2x+6 / −7(2a−1)→−14a+7 / (5a−2)×6→30a−12 / (3x+4)×(−3)→−9x−12
function genDist() {
  const r = Math.random();
  // (a) a(x ± b) … 外の数 a は負も出す、中は kx ± c
  if (r < 0.55) {
    const a = (Math.random() < 0.4 ? -1 : 1) * ri(2, 7);
    const k = ri(1, 4), c = (Math.random() < 0.5 ? -1 : 1) * ri(1, 6);
    const ans = lin(a * k, a * c);
    const inner = lin(k, c);
    return { q: `${num(a)}（${inner}） を展開すると？`, ans,
      steps: ["外の数を、かっこの中の全部にかける", `${num(a)}×${term(k)} と ${num(a)}×（${num(c)}） をそれぞれ計算しよう`],
      distractors: opts(ans, [
        { val: lin(a * k, c), tag: "dist-miss" },
        { val: lin(k, a * c), tag: "dist-miss" },
        { val: lin(a * k, -a * c), tag: "sign-flip" }]) };
  }
  // (b) (kx ± c) × a … うしろに数をかける型（負の数も）
  const a = (Math.random() < 0.4 ? -1 : 1) * ri(2, 7);
  const k = ri(1, 5), c = (Math.random() < 0.5 ? -1 : 1) * ri(1, 6);
  const ans = lin(a * k, a * c);
  const inner = lin(k, c);
  return { q: `（${inner}）×（${num(a)}） を展開すると？`, ans,
    steps: ["かっこの中の全部に、外の数をかける", `${term(k)}×（${num(a)}） と （${num(c)}）×（${num(a)}） をそれぞれ計算しよう`],
    distractors: opts(ans, [
      { val: lin(a * k, c), tag: "dist-miss" },
      { val: lin(k, a * c), tag: "dist-miss" },
      { val: lin(a * k, -a * c), tag: "sign-flip" }]) };
}

// 5. 一次式の加減・乗除
//    実問題(加減): 2x+(9x−6)→11x−6 / (−2x+7)+6x→4x+7 / (7a−8)+(−6a−7)→a−15
//    実問題(乗除): 4a×5→20a / 3x×(−2)→−6x / (−1)×5x→−5x / (−6)×(−6a)→36a
function genCalc() {
  const r = Math.random();
  // (a) 一次式どうしの加法・減法
  if (r < 0.6) {
    const a = (Math.random() < 0.4 ? -1 : 1) * ri(1, 7);
    const c = (Math.random() < 0.4 ? -1 : 1) * ri(1, 7);
    const b = (Math.random() < 0.5 ? -1 : 1) * ri(1, 9);
    const d = (Math.random() < 0.5 ? -1 : 1) * ri(1, 9);
    const minus = Math.random() < 0.45;
    let X = minus ? a - c : a + c;
    let B = minus ? b - d : b + d;
    if (X === 0) X = 1;        // 数の項だけにならないように（一次式を保つ）
    if (B === 0) B = 2;
    const ans = lin(X, B);
    const wrongs = [];
    if (minus) wrongs.push({ val: lin(a - c, b + d), tag: "sign-flip" }); // ひき算の符号を数に分配し忘れ
    wrongs.push({ val: lin(minus ? a + c : a - c, B), tag: "calc" });
    wrongs.push({ val: lin(X, B + (B >= 0 ? 1 : -1)), tag: "calc" });
    wrongs.push({ val: lin(X, B - (B >= 0 ? 1 : -1)), tag: "calc" });
    wrongs.push({ val: lin(X + 1, B), tag: "calc" });
    return { q: `（${lin(a, b)}）${minus ? "−" : "＋"}（${lin(c, d)}） ＝ ？`, ans,
      steps: ["文字どうし・数どうしをまとめる",
        `文字：${a}${minus ? "−" : "＋"}（${num(c)}）、　数：${b}${minus ? "−" : "＋"}（${num(d)}） をそれぞれ計算しよう`],
      distractors: opts(ans, wrongs) };
  }
  // (b) 一次式と数の乗除（単項式 × 数）… 実問題 4a×5 / 3x×(−2) / (−6)×(−6a)
  const vs = ["x", "a", "y"];
  const v = vs[ri(0, vs.length - 1)];
  let k = (Math.random() < 0.4 ? -1 : 1) * ri(1, 7);
  let a = (Math.random() < 0.4 ? -1 : 1) * ri(2, 7);
  if (k === 0) k = 1;
  const ans = term(k * a, v);
  // 出題の向き（数が前 or 後ろ）をランダムに
  const front = Math.random() < 0.5;
  const q = front ? `（${num(a)}）×${term(k, v)} ＝ ？` : `${term(k, v)}×（${num(a)}） ＝ ？`;
  const p = k * a;
  const cand = [
    { c: k + a, tag: "calc" },         // かけずにたしてしまう
    { c: -p, tag: "sign-flip" },       // 符号の取り違え
    { c: p + 1, tag: "calc" }, { c: p - 1, tag: "calc" }, { c: p + 2, tag: "calc" },
  ];
  const wrongs = [{ val: `${p}`, tag: "drop-var" }];   // 文字を落とした
  const used = new Set([p]);
  for (const { c, tag } of cand) { if (wrongs.length >= 3) break; if (!used.has(c)) { used.add(c); wrongs.push({ val: term(c, v), tag }); } }
  return { q, ans,
    steps: ["係数（数）どうしをかけて、文字はそのまま残す", `${k}×（${num(a)}） を計算して、文字 ${v} をつけよう`],
    distractors: opts(ans, wrongs) };
}

// math-labo の v単元ID → その単元にふさわしい toketa ジェネレータ群
// （toketa/moji.js CHAPTER.units の haichiUnit で対応：v1=rule / v2=value / v3=like,calc / v4=dist）
const UNIT_MAP = {
  v1: [genRule],            // 文字式の表し方
  v2: [genValue],           // 式の値（代入）
  v3: [genLike, genCalc],   // 同類項をまとめる／加減・乗除
  v4: [genDist],            // 分配法則（展開）
};

/** その単元に toketa ヒント付き問題があるか */
export function has(unitId) {
  return !!UNIT_MAP[unitId];
}

/**
 * math-labo 互換の toketa 問題を1問作る。無ければ null。
 * 返り値: { q(半角), ans, steps[], distractors[{val,tag}], viz?, unitId, toketa:true }
 * ※ 文字式は ans/val が文字列（式）のこともある。そのまま返す。
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
