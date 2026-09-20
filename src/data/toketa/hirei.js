// ============================================================
// data/toketa/hirei.js — とけた！の「比例と反比例」問題を math-labo へ移植。
//  ・各問題が「解き方ステップ(steps)」と「誤答パターン付き4択(distractors)」を持つ。
//  ・問題文(q)の表記は math-labo 流（半角 +−() ）に正規化。ヒント(steps/コーチ)は
//    とけた流（全角）のまま＝表示は math-labo、ヒントは toketa の要望どおり。
//  ・式・変域の答えは STRING（例 "y＝2x" "y ≧ 3"）。distractors も文字列のまま。
//  出典: toketa/src/content/hirei.js（problem_bank.json「比例と反比例」の型を反映）。
// ============================================================

// ── toketa/src/content/_util.js からインライン（自己完結にするため） ──
const ri = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const shuffle = (a) => a.map((v) => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map((x) => x[1]);
const num = (n) => (n < 0 ? `−${-n}` : `${n}`); // 3 / −3
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

// hirei 固有の小道具
const nz = (v) => (v === 0 ? 1 : v);
const coefX = (a) => (a === 1 ? "x" : a === -1 ? "−x" : `${num(a)}x`); // 3x / −x / x

// 問題文だけ math-labo 流（半角）に正規化する。ヒントは全角のまま。
export function nrm(s) {
  return String(s)
    .replace(/＋/g, "+").replace(/−/g, "-")
    .replace(/（/g, "(").replace(/）/g, ")")
    .replace(/\s*([+\-×÷])\s*/g, "$1");
}

// つまづきの正体（診断タグ → ラベルと直し方の一言）
export const MISC = {
  "prop-confuse": { label: "比例と反比例の混同", coach: "比例は y＝ax（かける）、反比例は y＝a/x（わる）だよ" },
  "div-mul": { label: "かけ算・わり算の取り違え", coach: "比例定数は a＝y÷x、反比例は a＝x×y。式をたしかめよう" },
  "sign": { label: "符号の取り違え", coach: "比例定数 a の ＋・− を逆にしていないかな？" },
  "ineq": { label: "不等号の選び方", coach: "以上・以下は ≧≦（=を含む）、より大きい・小さいは ＞＜だよ" },
  "calc": { label: "計算ミス", coach: "おしい！もう一度ゆっくり計算してみよう" },
};

// base と異なる「0以外の整数」を必ず3つ集める（文字列選択肢づくり用）
function pick3(base, extra = []) {
  const out = [];
  const cands = [...extra, -base, base + 1, base - 1, base + 2, base - 2, base + 3, base - 3, 2 * base, -2 * base, base + 4, base - 4];
  for (const w of cands) { if (w !== base && w !== 0 && !out.includes(w)) out.push(w); if (out.length >= 3) break; }
  return out;
}

// 1. 比例の値（y＝ax に代入）
function genPropVal() {
  const a = nz(ri(-6, 8)), x = nz(ri(-6, 9)), ans = a * x;
  return { q: `y ＝ ${coefX(a)} で x ＝ ${num(x)} のとき y は？`, ans,
    steps: [`x に ${num(x)} を代入：${num(a)} × ${num(x)}`, "この式を計算して y を求めよう"],
    distractors: opts(ans, [{ val: a + x, tag: "prop-confuse" }, { val: -ans, tag: "sign" }]) };
}

// 2. 比例の式を求める（点・対応から y＝ax）
function genPropFind() {
  const a = nz(ri(-5, 5)), x1 = ri(2, 6), y1 = a * x1;
  const ans = `y＝${coefX(a)}`;
  const ws = pick3(a);
  const wrongs = ws.map((w) => ({ val: `y＝${coefX(w)}`, tag: w === -a ? "sign" : "div-mul" }));
  return { q: `x ＝ ${x1} のとき y ＝ ${num(y1)}。y を x の式で表すと？`, ans,
    steps: ["比例は y＝ax。a ＝ y ÷ x", `a ＝ ${num(y1)} ÷ ${x1} を計算して、y＝ax の a に入れよう`],
    distractors: shuffle([{ val: ans, tag: null }, ...wrongs]) };
}

// 3. 反比例の値（y＝a/x に代入）
function genInvVal() {
  const x = nz(ri(-6, 6)), q = nz(ri(-6, 8)), a = x * q, ans = q;
  return { q: `y ＝ ${num(a)}/x で x ＝ ${num(x)} のとき y は？`, ans,
    steps: [`x に ${num(x)} を代入：${num(a)} ÷ ${num(x)}`, "この式を計算して y を求めよう"],
    distractors: opts(ans, [{ val: a, tag: "prop-confuse" }, { val: -ans, tag: "sign" }]) };
}

// 4. 反比例の式を求める（x=p,y=q から y＝a/x、a＝xy）
function genInvFind() {
  const p = nz(ri(-6, 6)), q = nz(ri(-6, 6)), a = p * q;
  const ans = `y＝${num(a)}/x`;
  const ws = pick3(a, [a + p, a - p]);
  const wrongs = ws.map((w) => ({ val: `y＝${num(w)}/x`, tag: w === -a ? "sign" : "div-mul" }));
  return { q: `x ＝ ${num(p)} のとき y ＝ ${num(q)} となる反比例の式は？`, ans,
    steps: ["反比例は y＝a/x。a ＝ x × y", `a ＝ ${num(p)} × ${num(q)} を計算して、y＝a/x の a に入れよう`],
    distractors: shuffle([{ val: ans, tag: null }, ...wrongs]) };
}

// 5. 比例の利用（点を通る比例で、別のxのyを求める）
function genUse() {
  const a = nz(ri(-5, 5)), x1 = ri(2, 6), y1 = a * x1, x2 = nz(ri(-6, 8)), ans = a * x2;
  return { q: `比例 y＝ax のグラフが点（${x1}, ${num(y1)}）を通る。x ＝ ${num(x2)} のときの y は？`, ans,
    steps: [`まず a ＝ ${num(y1)} ÷ ${x1} で比例定数を求める`, `求めた a を y＝ax に入れ、x ＝ ${num(x2)} を代入して計算しよう`],
    distractors: opts(ans, [{ val: a + x2, tag: "prop-confuse" }, { val: -ans, tag: "sign" }]) };
}

// 6. 変域（不等号で表す）
function genRange() {
  const n = nz(ri(-8, 9)), v = Math.random() < 0.5 ? "x" : "y";
  const types = [
    { word: `${num(n)} 以上`, ans: `${v} ≧ ${num(n)}` },
    { word: `${num(n)} 以下`, ans: `${v} ≦ ${num(n)}` },
    { word: `${num(n)} より大きい`, ans: `${v} ＞ ${num(n)}` },
    { word: `${num(n)} より小さい`, ans: `${v} ＜ ${num(n)}` },
  ];
  const t = types[ri(0, 3)];
  return { q: `${v} が ${t.word} とき、${v} の変域を表すと？`, ans: t.ans,
    steps: ["「以上・以下」は ≧・≦（その数をふくむ）", "「より大きい・小さい」は ＞・＜（その数をふくまない）"],
    distractors: shuffle(types.map((x) => ({ val: x.ans, tag: x.ans === t.ans ? null : "ineq" }))) };
}

// math-labo の toketa 単元ID → その単元にふさわしい toketa ジェネレータ群
// （元 CHAPTER_HIREI.units の haichiUnit をキーに集約）
const UNIT_MAP = {
  h1: [genPropVal, genPropFind, genRange], // 比例の値・比例の式・変域
  h2: [genInvVal, genInvFind],             // 反比例の値・反比例の式
  h5: [genUse],                            // 比例の利用（点を通る）
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
