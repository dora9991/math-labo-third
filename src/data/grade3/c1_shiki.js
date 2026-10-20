// ============================================================
// grade3/c1_shiki.js — 中3「式の展開と因数分解」（★自動作問版）
//  展開は多項式(polyStr)、因数分解は (x+a)(x+b) などの積を文字列で。
// ============================================================
import { polyStr, monoStr, neg, exprChoices, numChoices, gcd } from "../_algebra.js";

const p = (id, build, skill = null) => ({ id, build, skill });
const rnz = (r, a, b) => { let v = 0; while (v === 0) v = r(a, b); return v; };
const sn = (k) => (k > 0 ? "+" + k : k < 0 ? "−" + (-k) : "");   // 符号つき定数（0は空）
const binom = (a) => `(x${sn(a)})`;                               // (x+a)
const fac = (c, v) => (c < 0 ? `(${monoStr(c, v)})` : monoStr(c, v));
const fillersPoly = (terms) => {
  const out = [];
  for (let i = 0; i < terms.length; i++) for (const d of [1, -1, 2, -2]) out.push(polyStr(terms.map((t, j) => (j === i ? { ...t, c: t.c + d } : t))));
  return out;
};

const H = {
  dist: { h1: "外の項を、かっこの中のすべての項にかける（分配法則）", h2: "符号に注意。同じ文字どうしは指数を足す" },
  mul: { h1: "(x+a)(x+b)=x²+(a+b)x+ab。たし算が真ん中、かけ算が最後", h2: "真ん中の係数は a+b、定数は a×b" },
  sq: { h1: "(x+a)²=x²+2ax+a²、(x+a)(x−a)=x²−a²", h2: "平方は2ax、和と差は真ん中が消えて a²" },
  cf: { h1: "全部の項に共通な数・文字をくくり出す", h2: "くくり出した残りをかっこの中に書く" },
  fac: { h1: "かけて定数、たして1次の係数になる2数 a,b を見つける", h2: "x²+(a+b)x+ab=(x+a)(x+b)" },
};

// u1 単項式×多項式
function genDist(r) {
  const a = rnz(r, -5, 5), px = rnz(r, -5, 5), q = rnz(r, -6, 6);
  const ansT = [{ c: a * px, v: { x: 2 } }, { c: a * q, v: { x: 1 } }];
  const ans = polyStr(ansT);
  const q1 = `${monoStr(a, { x: 1 })}(${polyStr([{ c: px, v: { x: 1 } }, { c: q, v: {} }])}) を展開しなさい。`;
  const variants = [polyStr([{ c: a * px, v: { x: 2 } }, { c: q, v: { x: 1 } }]), polyStr([{ c: a + px, v: { x: 2 } }, { c: a * q, v: { x: 1 } }]), polyStr([{ c: a * px, v: { x: 2 } }, { c: -a * q, v: { x: 1 } }])];
  return { q: q1, ans, choices: exprChoices(ans, variants, fillersPoly(ansT), r), h1: H.dist.h1, h2: H.dist.h2 };
}

// u2 多項式÷単項式
function genDivPoly(r) {
  const d = rnz(r, 2, 5), q1c = rnz(r, -5, 5), q2c = rnz(r, -6, 6);
  const ansT = [{ c: q1c, v: { x: 1 } }, { c: q2c, v: {} }];
  const dividendT = [{ c: q1c * d, v: { x: 2 } }, { c: q2c * d, v: { x: 1 } }];
  const ans = polyStr(ansT);
  const q = `(${polyStr(dividendT)}) ÷ ${monoStr(d, { x: 1 })} を計算しなさい。`;
  const variants = [polyStr([{ c: q1c, v: { x: 1 } }, { c: q2c * d, v: {} }]), polyStr([{ c: q1c * d, v: { x: 1 } }, { c: q2c, v: {} }]), polyStr([{ c: -q1c, v: { x: 1 } }, { c: q2c, v: {} }])];
  return { q, ans, choices: exprChoices(ans, variants, fillersPoly(ansT), r), h1: H.dist.h1, h2: "各項を単項式で割る。文字は指数を引く" };
}

// u3 乗法公式 (x+a)(x+b)
function genMulFormula(r) {
  const a = rnz(r, -7, 7), b = rnz(r, -7, 7);
  const ansT = [{ c: 1, v: { x: 2 } }, { c: a + b, v: { x: 1 } }, { c: a * b, v: {} }];
  const ans = polyStr(ansT);
  const q = `${binom(a)}${binom(b)} を展開しなさい。`;
  const variants = [polyStr([{ c: 1, v: { x: 2 } }, { c: a * b, v: { x: 1 } }, { c: a + b, v: {} }]), polyStr([{ c: 1, v: { x: 2 } }, { c: a + b, v: { x: 1 } }, { c: -a * b, v: {} }]), polyStr([{ c: 1, v: { x: 2 } }, { c: a - b, v: { x: 1 } }, { c: a * b, v: {} }])];
  return { q, ans, choices: exprChoices(ans, variants, fillersPoly(ansT), r), h1: H.mul.h1, h2: H.mul.h2 };
}

// u4 平方・和と差の公式
function genSquare(r) {
  const a = r(0, 3) === 0 ? r(7, 9) : -r(1, 8), diff = r(0, 1) === 1; // 普通は負の数・大きめの数（簡単＝正の小さい数と重ならない）
  let ansT, q;
  if (diff) { ansT = [{ c: 1, v: { x: 2 } }, { c: -a * a, v: {} }]; q = `${binom(a)}${binom(-a)} を展開しなさい。`; }
  else { ansT = [{ c: 1, v: { x: 2 } }, { c: 2 * a, v: { x: 1 } }, { c: a * a, v: {} }]; q = `${binom(a)}² を展開しなさい。`; }
  const ans = polyStr(ansT);
  const variants = diff
    ? [polyStr([{ c: 1, v: { x: 2 } }, { c: a * a, v: {} }]), polyStr([{ c: 1, v: { x: 2 } }, { c: -2 * a, v: { x: 1 } }, { c: -a * a, v: {} }]), polyStr([{ c: 1, v: { x: 2 } }, { c: -a, v: {} }])]
    : [polyStr([{ c: 1, v: { x: 2 } }, { c: a * a, v: {} }]), polyStr([{ c: 1, v: { x: 2 } }, { c: a, v: { x: 1 } }, { c: a * a, v: {} }]), polyStr([{ c: 1, v: { x: 2 } }, { c: 2 * a, v: { x: 1 } }, { c: -a * a, v: {} }])];
  return { q, ans, choices: exprChoices(ans, variants, fillersPoly(ansT), r), h1: H.sq.h1, h2: H.sq.h2 };
}

// u5 共通因数でくくる
function genCommon(r) {
  const g0 = rnz(r, 2, 6);
  let a, b;
  // a,b は互いに素にして「最後まで」因数分解されるようにする（例: 4x+4 → 4(x+1)）
  do { a = rnz(r, -5, 5); b = rnz(r, -6, 6); } while (gcd(Math.abs(a), Math.abs(b)) !== 1);
  // 先頭(ax)が負なら符号も外に出す（教科書流: −2x−6 → −2(x+3)）
  const sign = a < 0 ? -1 : 1;
  const G = g0 * sign, ia = a * sign, ib = b * sign;   // 外に出す共通因数(符号込み)とかっこの中
  const gs = (G < 0 ? "−" : "") + Math.abs(G);
  const wrap = (t) => `${gs}(${polyStr(t)})`;
  const ans = wrap([{ c: ia, v: { x: 1 } }, { c: ib, v: {} }]);
  const q = `${polyStr([{ c: g0 * a, v: { x: 1 } }, { c: g0 * b, v: {} }])} を因数分解しなさい。`;
  const variants = [
    wrap([{ c: ia, v: { x: 1 } }, { c: -ib, v: {} }]),                                  // 定数の符号ミス
    `${Math.abs(G)}(${polyStr([{ c: a, v: { x: 1 } }, { c: b, v: {} }])})`,              // 負の符号を外に出さない
    wrap([{ c: -ia, v: { x: 1 } }, { c: ib, v: {} }]),                                   // x項の符号ミス
  ];
  const fill = [wrap([{ c: ia, v: { x: 1 } }, { c: ib + 1, v: {} }]), wrap([{ c: ia + 1, v: { x: 1 } }, { c: ib, v: {} }]), wrap([{ c: ia, v: { x: 1 } }, { c: ib - 1, v: {} }])];
  return { q, ans, choices: exprChoices(ans, variants, fill, r), h1: H.cf.h1, h2: H.cf.h2 };
}

// u6 因数分解 x²+(a+b)x+ab
function genFactor(r) {
  let a, b;
  do { a = rnz(r, -6, 6); b = rnz(r, -6, 6); } while (a > 0 && b > 0); // 普通は負の数を含む（簡単＝両方正）
  const ans = `${binom(a)}${binom(b)}`;
  const q = `${polyStr([{ c: 1, v: { x: 2 } }, { c: a + b, v: { x: 1 } }, { c: a * b, v: {} }])} を因数分解しなさい。`;
  const variants = [`${binom(-a)}${binom(-b)}`, `${binom(a)}${binom(-b)}`, `${binom(-a)}${binom(b)}`];
  const fill = [`${binom(a + 1)}${binom(b)}`, `${binom(a)}${binom(b + 1)}`, `${binom(a - 1)}${binom(b)}`];
  return { q, ans, choices: exprChoices(ans, variants, fill, r), h1: H.fac.h1, h2: H.fac.h2 };
}

// u7 平方・差の因数分解
function genFactorSq(r) {
  const diff = r(0, 1) === 1, a = diff ? r(7, 12) : rnz(r, 1, 9); // 普通：x²−a² は a=7〜12、平方は多くが (x−a)²
  let ans, q;
  if (diff) { ans = `${binom(a)}${binom(-a)}`; q = `${polyStr([{ c: 1, v: { x: 2 } }, { c: -a * a, v: {} }])} を因数分解しなさい。`; }
  else { const s = r(0, 3) === 0 ? 1 : -1; ans = `${binom(s * a)}²`; q = `${polyStr([{ c: 1, v: { x: 2 } }, { c: 2 * s * a, v: { x: 1 } }, { c: a * a, v: {} }])} を因数分解しなさい。`; }
  const variants = diff
    ? [`${binom(a)}${binom(a)}`, `${binom(a)}²`, `${binom(-a)}${binom(-a)}`]
    : [`${binom(a)}${binom(-a)}`, `${binom(2 * a)}²`, `${binom(a)}²+1`];
  const fill = [`${binom(a + 1)}${binom(-a)}`, `${binom(a)}${binom(-(a + 1))}`, `${binom(a + 1)}²`];
  return { q, ans, choices: exprChoices(ans, variants, fill, r), h1: H.sq.h1, h2: "x²−a²=(x+a)(x−a)、x²±2ax+a²=(x±a)²" };
}

// u8 式の計算の利用（和と差で数値計算）
function genUse(r) {
  const base = r(2, 9) * 10, d = r(3, 6);     // (base−d)(base+d)=base²−d²（簡単は d=1,2）
  const ans = base * base - d * d;
  const q = `くふうして計算しなさい： ${base - d} × ${base + d}`;
  const variants = [base * base, base * base + d * d, (base - d) * (base - d)];
  return { q, ans, choices: numChoices(ans, r, variants), h1: "(a−b)(a+b)=a²−b² を使う", h2: `${base}²−${d}² で計算する` };
}

// 🔥鬼：(ax+b)(cx+d) の展開（x²の係数が1でない＝発展の上）
function genOniExpn(r) {
  const a = rnz(r, 2, 4), c = rnz(r, 2, 4), b = rnz(r, -5, 5), d = rnz(r, -5, 5);
  const A = a * c, B = a * d + b * c, C = b * d;
  const ansT = [{ c: A, v: { x: 2 } }, { c: B, v: { x: 1 } }, { c: C, v: {} }];
  const ans = polyStr(ansT);
  const q = `(${a}x${sn(b)})(${c}x${sn(d)}) を展開しなさい。`;
  const variants = [
    polyStr([{ c: A, v: { x: 2 } }, { c: b * d, v: { x: 1 } }, { c: B, v: {} }]), // 真ん中と定数の取り違え
    polyStr([{ c: a + c, v: { x: 2 } }, { c: B, v: { x: 1 } }, { c: C, v: {} }]),   // x²係数を和にしてしまう
    polyStr([{ c: A, v: { x: 2 } }, { c: a * d - b * c, v: { x: 1 } }, { c: C, v: {} }]), // 真ん中の符号ミス
  ];
  return { q, ans, choices: exprChoices(ans, variants, fillersPoly(ansT), r), h1: "分配法則(FOIL)で4つの積を全部たす", h2: `x²係数=${a}×${c}、定数=${b}×${d}、真ん中=${a}×${d}+${b}×${c}` };
}

// ── 難易度別の問題（2026-09-30）。普通＝上の関数そのまま。
//  簡単＝正の小さい数・1段階／難しい＝係数つき・2文字・3項／鬼＝2段階（展開して整理・くくってから公式 など）
const sgn = (c, v = {}) => (c < 0 ? monoStr(c, v) : "+" + monoStr(c, v)); // 符号つきの項（先頭以外）
const byY = (k) => `(x${sgn(k, { y: 1 })})`; // (x+ky)

function genDistE(r) { // 3x(x+4)
  const a = r(2, 5), b = r(1, 6);
  const ansT = [{ c: a, v: { x: 2 } }, { c: a * b, v: { x: 1 } }];
  const ans = polyStr(ansT);
  const variants = [
    polyStr([{ c: a, v: { x: 2 } }, { c: b, v: { x: 1 } }]),     // 後ろの項にかけ忘れ
    polyStr([{ c: a, v: { x: 1 } }, { c: a * b, v: {} }]),       // x×x を x のまま
    polyStr([{ c: a, v: { x: 2 } }, { c: a + b, v: { x: 1 } }]), // かけ算をたし算に
  ];
  return { q: `${monoStr(a, { x: 1 })}(x+${b}) を展開しなさい。`, ans, choices: exprChoices(ans, variants, fillersPoly(ansT), r), h1: H.dist.h1, h2: H.dist.h2 };
}
function genDistA(r) { // −2a(3a−b+4)
  const k = rnz(r, -4, 4), p1 = r(1, 4), p2 = rnz(r, -4, 4), p3 = rnz(r, -5, 5);
  const ansT = [{ c: k * p1, v: { a: 2 } }, { c: k * p2, v: { a: 1, b: 1 } }, { c: k * p3, v: { a: 1 } }];
  const ans = polyStr(ansT);
  const inner = polyStr([{ c: p1, v: { a: 1 } }, { c: p2, v: { b: 1 } }, { c: p3, v: {} }]);
  const variants = [
    polyStr([{ c: k * p1, v: { a: 2 } }, { c: k * p2, v: { a: 1, b: 1 } }, { c: p3, v: {} }]),        // 最後の項にかけ忘れ
    polyStr([{ c: k * p1, v: { a: 2 } }, { c: -k * p2, v: { a: 1, b: 1 } }, { c: k * p3, v: { a: 1 } }]), // 符号ミス
    polyStr([{ c: k * p1, v: { a: 1 } }, { c: k * p2, v: { a: 1, b: 1 } }, { c: k * p3, v: {} }]),      // 文字をかけ忘れ
  ];
  return { q: `${monoStr(k, { a: 1 })}(${inner}) を展開しなさい。`, ans, choices: exprChoices(ans, variants, fillersPoly(ansT), r), h1: H.dist.h1, h2: "3つの項すべてにかける。文字が2種類でも同じ" };
}
function genDistO(r) { // 3x(x−2)−2x(x+5)
  const a = r(2, 5); let c = r(1, 4); if (c === a) c = a - 1;
  const b = rnz(r, -6, 6), d = rnz(r, -6, 6);
  const ansT = [{ c: a - c, v: { x: 2 } }, { c: a * b - c * d, v: { x: 1 } }];
  const ans = polyStr(ansT);
  const variants = [
    polyStr([{ c: a - c, v: { x: 2 } }, { c: a * b + c * d, v: { x: 1 } }]), // 後ろのかっこの符号を変え忘れ
    polyStr([{ c: a + c, v: { x: 2 } }, { c: a * b - c * d, v: { x: 1 } }]), // x²どうしをたしてしまう
    polyStr([{ c: a - c, v: { x: 2 } }, { c: a * b - d, v: { x: 1 } }]),     // 後ろの定数にかけ忘れ
  ];
  return { q: `${monoStr(a, { x: 1 })}(x${sn(b)})−${monoStr(c, { x: 1 })}(x${sn(d)}) を計算しなさい。`, ans, choices: exprChoices(ans, variants, fillersPoly(ansT), r), h1: "それぞれ展開してから、同類項をまとめる", h2: "「−○x(…)」は、かっこの中の全部の項の符号が変わる" };
}

function genDivPolyE(r) { // (6x²+9x)÷3x
  const d = r(2, 4), q1 = r(1, 5), q2 = r(1, 6);
  const ansT = [{ c: q1, v: { x: 1 } }, { c: q2, v: {} }];
  const ans = polyStr(ansT);
  const variants = [
    polyStr([{ c: q1, v: { x: 2 } }, { c: q2, v: { x: 1 } }]), // 文字を割り忘れ
    polyStr([{ c: q1, v: { x: 1 } }, { c: q2 * d, v: {} }]),   // 後ろの項を割り忘れ
    polyStr([{ c: q1 * d, v: { x: 1 } }, { c: q2, v: {} }]),   // 前の項の数を割り忘れ
  ];
  const q = `(${polyStr([{ c: q1 * d, v: { x: 2 } }, { c: q2 * d, v: { x: 1 } }])}) ÷ ${monoStr(d, { x: 1 })} を計算しなさい。`;
  return { q, ans, choices: exprChoices(ans, variants, fillersPoly(ansT), r), h1: H.dist.h1, h2: "各項を単項式で割る。文字は指数を引く" };
}
function genDivPolyA(r) { // (12x²y−8xy²)÷(−4xy)
  const D = r(2, 5) * (r(0, 1) ? -1 : 1), q1 = rnz(r, -5, 5), q2 = rnz(r, -5, 5);
  const ansT = [{ c: q1, v: { x: 1 } }, { c: q2, v: { y: 1 } }];
  const ans = polyStr(ansT);
  const variants = [
    polyStr([{ c: -q1, v: { x: 1 } }, { c: -q2, v: { y: 1 } }]),  // わる数の符号を忘れ
    polyStr([{ c: q1, v: { x: 1 } }, { c: -q2, v: { y: 1 } }]),   // 片方だけ符号ミス
    polyStr([{ c: q1, v: { x: 2 } }, { c: q2, v: { y: 2 } }]),    // 文字を割り忘れ
  ];
  const q = `(${polyStr([{ c: q1 * D, v: { x: 2, y: 1 } }, { c: q2 * D, v: { x: 1, y: 2 } }])}) ÷ ${fac(D, { x: 1, y: 1 })} を計算しなさい。`;
  return { q, ans, choices: exprChoices(ans, variants, fillersPoly(ansT), r), h1: "各項を、わる式で割る。数・x・y をそれぞれ約分", h2: "負の式で割ると、全部の項の符号が変わる" };
}
function genDivPolyO(r) { // (−8x³+12x²−4x)÷(−4x)
  const d = -r(2, 5), q1 = rnz(r, -4, 4), q2 = rnz(r, -5, 5), q3 = rnz(r, -6, 6);
  const ansT = [{ c: q1, v: { x: 2 } }, { c: q2, v: { x: 1 } }, { c: q3, v: {} }];
  const ans = polyStr(ansT);
  const variants = [
    polyStr([{ c: -q1, v: { x: 2 } }, { c: -q2, v: { x: 1 } }, { c: -q3, v: {} }]), // 符号を変え忘れ
    polyStr([{ c: q1, v: { x: 2 } }, { c: q2, v: { x: 1 } }, { c: q3, v: { x: 1 } }]), // 最後の項の文字を割り忘れ
    polyStr([{ c: q1, v: { x: 2 } }, { c: -q2, v: { x: 1 } }, { c: q3, v: {} }]),   // 真ん中だけ符号ミス
  ];
  const q = `(${polyStr([{ c: q1 * d, v: { x: 3 } }, { c: q2 * d, v: { x: 2 } }, { c: q3 * d, v: { x: 1 } }])}) ÷ (${monoStr(d, { x: 1 })}) を計算しなさい。`;
  return { q, ans, choices: exprChoices(ans, variants, fillersPoly(ansT), r), h1: "3つの項それぞれを、わる式で割る", h2: "負の数で割るので、全部の符号が反対になる" };
}

function genMulFormulaE(r) { // (x+2)(x+5)
  const a = r(1, 6), b = r(1, 6);
  const ansT = [{ c: 1, v: { x: 2 } }, { c: a + b, v: { x: 1 } }, { c: a * b, v: {} }];
  const ans = polyStr(ansT);
  const variants = [
    polyStr([{ c: 1, v: { x: 2 } }, { c: a * b, v: { x: 1 } }, { c: a + b, v: {} }]), // 和と積の取り違え
    polyStr([{ c: 1, v: { x: 2 } }, { c: a * b, v: {} }]),                             // 真ん中の項を忘れ
    polyStr([{ c: 1, v: { x: 2 } }, { c: a + b, v: { x: 1 } }, { c: a + b, v: {} }]), // 定数もたし算に
  ];
  return { q: `${binom(a)}${binom(b)} を展開しなさい。`, ans, choices: exprChoices(ans, variants, fillersPoly(ansT), r), h1: H.mul.h1, h2: H.mul.h2 };
}
function genMulFormulaA(r) { // (x+3y)(x−5y)
  const a = rnz(r, -7, 7), b = rnz(r, -7, 7);
  const ansT = [{ c: 1, v: { x: 2 } }, { c: a + b, v: { x: 1, y: 1 } }, { c: a * b, v: { y: 2 } }];
  const ans = polyStr(ansT);
  const variants = [
    polyStr([{ c: 1, v: { x: 2 } }, { c: a * b, v: { x: 1, y: 1 } }, { c: a + b, v: { y: 2 } }]), // 和と積の取り違え
    polyStr([{ c: 1, v: { x: 2 } }, { c: a + b, v: { x: 1, y: 1 } }, { c: -a * b, v: { y: 2 } }]), // 積の符号ミス
    polyStr([{ c: 1, v: { x: 2 } }, { c: a + b, v: { x: 1 } }, { c: a * b, v: {} }]),               // y を付け忘れ
  ];
  return { q: `${byY(a)}${byY(b)} を展開しなさい。`, ans, choices: exprChoices(ans, variants, fillersPoly(ansT), r), h1: "y をふくんでも (x+a)(x+b) の公式と同じ", h2: "真ん中は (a+b)xy、最後は ab·y²" };
}
function genMulFormulaO(r) { // (x+2)(x−5)−(x+3)(x−3)
  const a = rnz(r, -6, 6), b = rnz(r, -6, 6), c = r(1, 6);
  const ansT = [{ c: a + b, v: { x: 1 } }, { c: a * b + c * c, v: {} }];
  const ans = polyStr(ansT);
  const variants = [
    polyStr([{ c: a + b, v: { x: 1 } }, { c: a * b - c * c, v: {} }]),                        // 後ろを引くときの符号ミス
    polyStr([{ c: 2, v: { x: 2 } }, { c: a + b, v: { x: 1 } }, { c: a * b - c * c, v: {} }]), // x²を消し忘れ
    polyStr([{ c: a + b, v: { x: 1 } }, { c: a * b, v: {} }]),                                // c²を忘れ
  ];
  return { q: `${binom(a)}${binom(b)}−${binom(c)}${binom(-c)} を計算しなさい。`, ans, choices: exprChoices(ans, variants, fillersPoly(ansT), r), h1: "2つとも公式で展開してから引く", h2: "引くときは、後ろの式を( )に入れて全部の符号を変える" };
}

function genSquareE(r) { // (x+3)²・(x+4)(x−4)
  const a = r(1, 6), diff = r(0, 1) === 1;
  const ansT = diff ? [{ c: 1, v: { x: 2 } }, { c: -a * a, v: {} }] : [{ c: 1, v: { x: 2 } }, { c: 2 * a, v: { x: 1 } }, { c: a * a, v: {} }];
  const ans = polyStr(ansT);
  const variants = diff
    ? [polyStr([{ c: 1, v: { x: 2 } }, { c: a * a, v: {} }]), polyStr([{ c: 1, v: { x: 2 } }, { c: -2 * a, v: {} }]), polyStr([{ c: 1, v: { x: 2 } }, { c: -a, v: {} }])]
    : [polyStr([{ c: 1, v: { x: 2 } }, { c: a * a, v: {} }]), polyStr([{ c: 1, v: { x: 2 } }, { c: a, v: { x: 1 } }, { c: a * a, v: {} }]), polyStr([{ c: 1, v: { x: 2 } }, { c: 2 * a, v: { x: 1 } }, { c: 2 * a, v: {} }])];
  const q = diff ? `${binom(a)}${binom(-a)} を展開しなさい。` : `${binom(a)}² を展開しなさい。`;
  return { q, ans, choices: exprChoices(ans, variants, fillersPoly(ansT), r), h1: H.sq.h1, h2: H.sq.h2 };
}
function genSquareA(r) { // (3x−2)²・(2x+3y)(2x−3y)
  const k = r(2, 4), diff = r(0, 1) === 1;
  if (diff) {
    const b = r(1, 5);
    const ansT = [{ c: k * k, v: { x: 2 } }, { c: -b * b, v: { y: 2 } }];
    const ans = polyStr(ansT);
    const variants = [
      polyStr([{ c: k * k, v: { x: 2 } }, { c: b * b, v: { y: 2 } }]),  // 符号ミス
      polyStr([{ c: k, v: { x: 2 } }, { c: -b, v: { y: 2 } }]),         // 係数を2乗し忘れ
      polyStr([{ c: k * k, v: { x: 2 } }, { c: -2 * k * b, v: { x: 1, y: 1 } }, { c: -b * b, v: { y: 2 } }]), // 真ん中を残す
    ];
    const kx = monoStr(k, { x: 1 }), by = monoStr(b, { y: 1 });
    return { q: `(${kx}+${by})(${kx}−${by}) を展開しなさい。`, ans, choices: exprChoices(ans, variants, fillersPoly(ansT), r), h1: "(A+B)(A−B)=A²−B²。A=○x、B=△y と見る", h2: "係数も2乗する：(2x)²=4x²" };
  }
  const a = rnz(r, -5, 5);
  const ansT = [{ c: k * k, v: { x: 2 } }, { c: 2 * k * a, v: { x: 1 } }, { c: a * a, v: {} }];
  const ans = polyStr(ansT);
  const variants = [
    polyStr([{ c: k * k, v: { x: 2 } }, { c: a * a, v: {} }]),                             // 真ん中を忘れ
    polyStr([{ c: k, v: { x: 2 } }, { c: 2 * k * a, v: { x: 1 } }, { c: a * a, v: {} }]),   // 係数を2乗し忘れ
    polyStr([{ c: k * k, v: { x: 2 } }, { c: k * a, v: { x: 1 } }, { c: a * a, v: {} }]),   // 2倍し忘れ
  ];
  return { q: `(${monoStr(k, { x: 1 })}${sn(a)})² を展開しなさい。`, ans, choices: exprChoices(ans, variants, fillersPoly(ansT), r), h1: "(A+B)²=A²+2AB+B²。A=○x と見る", h2: "真ん中は 2×(○x)×(数)" };
}
function genSquareO(r) { // (x+3)²−(x+2)(x−2)
  const a = rnz(r, -6, 6), b = r(1, 6);
  const ansT = [{ c: 2 * a, v: { x: 1 } }, { c: a * a + b * b, v: {} }];
  const ans = polyStr(ansT);
  const variants = [
    polyStr([{ c: 2 * a, v: { x: 1 } }, { c: a * a - b * b, v: {} }]), // 引くときの符号ミス
    polyStr([{ c: a, v: { x: 1 } }, { c: a * a + b * b, v: {} }]),     // 2倍し忘れ
    polyStr([{ c: 2 * a, v: { x: 1 } }, { c: a * a, v: {} }]),         // b² を忘れ
  ];
  return { q: `${binom(a)}²−${binom(b)}${binom(-b)} を計算しなさい。`, ans, choices: exprChoices(ans, variants, fillersPoly(ansT), r), h1: "それぞれ公式で展開してから引く", h2: "−(x²−b²)＝−x²+b²。x² は消える" };
}

function genCommonE(r) { // 3x+6 → 3(x+2)
  const g = r(2, 6), b = r(1, 6);
  const ans = `${g}(x+${b})`;
  const variants = [`${g}(x+${g * b})`, `${g}(${g}x+${b})`, `x(${g}+${g * b})`];
  const fill = [`${g}(x+${b + 1})`, `${g + 1}(x+${b})`, `${g}(x−${b})`];
  return { q: `${polyStr([{ c: g, v: { x: 1 } }, { c: g * b, v: {} }])} を因数分解しなさい。`, ans, choices: exprChoices(ans, variants, fill, r), h1: H.cf.h1, h2: H.cf.h2 };
}
function genCommonA(r) { // 6x²−9x → 3x(2x−3)
  let a, b;
  do { a = rnz(r, -5, 5); b = rnz(r, -6, 6); } while (gcd(Math.abs(a), Math.abs(b)) !== 1);
  const g0 = r(2, 5), sign = a < 0 ? -1 : 1, G = g0 * sign, ia = a * sign, ib = b * sign;
  const gs = (G < 0 ? "−" : "") + Math.abs(G);
  const wrap = (s, t) => `${s}x(${polyStr(t)})`;
  const ans = wrap(gs, [{ c: ia, v: { x: 1 } }, { c: ib, v: {} }]);
  const variants = [
    `${gs}(${polyStr([{ c: ia, v: { x: 2 } }, { c: ib, v: { x: 1 } }])})`,   // x をくくり忘れ
    wrap(gs, [{ c: ia, v: { x: 1 } }, { c: -ib, v: {} }]),                   // 符号ミス
    `x(${polyStr([{ c: g0 * a, v: { x: 1 } }, { c: g0 * b, v: {} }])})`,     // 数をくくり忘れ
  ];
  const fill = [wrap(gs, [{ c: ia, v: { x: 1 } }, { c: ib + 1, v: {} }]), wrap(gs, [{ c: ia + 1, v: { x: 1 } }, { c: ib, v: {} }])];
  return { q: `${polyStr([{ c: g0 * a, v: { x: 2 } }, { c: g0 * b, v: { x: 1 } }])} を因数分解しなさい。`, ans, choices: exprChoices(ans, variants, fill, r), h1: "数だけでなく、共通な文字(x)もくくり出す", h2: "くくり出したあと、かっこの中に共通因数が残っていないか確かめる" };
}
function genCommonO(r) { // 2x²y−4xy+6xy² → 2xy(x−2+3y)
  let a, b, c;
  do { a = r(1, 4); b = rnz(r, -5, 5); c = rnz(r, -5, 5); } while (gcd(gcd(a, Math.abs(b)), Math.abs(c)) !== 1);
  const g0 = r(2, 5);
  const inner = (bb) => polyStr([{ c: a, v: { x: 1 } }, { c, v: { y: 1 } }, { c: bb, v: {} }]);
  const ans = `${g0}xy(${inner(b)})`;
  const variants = [
    `${g0}x(${polyStr([{ c: a, v: { x: 1, y: 1 } }, { c, v: { y: 2 } }, { c: b, v: { y: 1 } }])})`, // y をくくり忘れ
    `${g0}xy(${inner(-b)})`,                                                                        // 符号ミス
    `xy(${polyStr([{ c: g0 * a, v: { x: 1 } }, { c: g0 * c, v: { y: 1 } }, { c: g0 * b, v: {} }])})`, // 数をくくり忘れ
  ];
  const q = `${polyStr([{ c: g0 * a, v: { x: 2, y: 1 } }, { c: g0 * b, v: { x: 1, y: 1 } }, { c: g0 * c, v: { x: 1, y: 2 } }])} を因数分解しなさい。`;
  return { q, ans, choices: exprChoices(ans, variants, [`${g0}xy(${inner(b + 1)})`, `${g0 + 1}xy(${inner(b)})`], r), h1: "3つの項すべてに共通な「数・x・y」を全部くくり出す", h2: "xy でくくると、x²y→x、xy²→y、xy→1 が残る" };
}

function genFactorE(r) { // x²+7x+12 → (x+3)(x+4)
  let a = r(1, 6), b = r(1, 6); if (a > b) [a, b] = [b, a];
  const ans = `${binom(a)}${binom(b)}`;
  const variants = [`${binom(-a)}${binom(-b)}`, `${binom(a)}${binom(-b)}`, `${binom(1)}${binom(a * b)}`];
  const fill = [`${binom(a + 1)}${binom(b)}`, `${binom(a)}${binom(b + 1)}`];
  return { q: `${polyStr([{ c: 1, v: { x: 2 } }, { c: a + b, v: { x: 1 } }, { c: a * b, v: {} }])} を因数分解しなさい。`, ans, choices: exprChoices(ans, variants, fill, r), h1: H.fac.h1, h2: H.fac.h2 };
}
function genFactorA(r) { // 2x²−10x+12 → 2(x−2)(x−3)
  const k = r(2, 3), a = rnz(r, -6, 6), b = rnz(r, -6, 6);
  const ans = `${k}${binom(a)}${binom(b)}`;
  const variants = [`${binom(a)}${binom(b)}`, `${k}${binom(-a)}${binom(-b)}`, `${k}${binom(a)}${binom(-b)}`];
  const fill = [`${k}${binom(a + 1)}${binom(b)}`, `${k}${binom(a)}${binom(b + 1)}`];
  return { q: `${polyStr([{ c: k, v: { x: 2 } }, { c: k * (a + b), v: { x: 1 } }, { c: k * a * b, v: {} }])} を因数分解しなさい。`, ans, choices: exprChoices(ans, variants, fill, r), h1: "まず全部の項に共通な数をくくり出す", h2: "くくった残りを x²+(a+b)x+ab の形で因数分解" };
}
function genFactorO(r) { // x²+2xy−15y² → (x+5y)(x−3y)
  const a = rnz(r, -7, 7), b = rnz(r, -7, 7);
  const ans = `${byY(a)}${byY(b)}`;
  const variants = [`${byY(-a)}${byY(-b)}`, `${byY(a)}${byY(-b)}`, `${binom(a)}${binom(b)}`];
  const fill = [`${byY(a + 1)}${byY(b)}`, `${byY(a)}${byY(b + 1)}`];
  return { q: `${polyStr([{ c: 1, v: { x: 2 } }, { c: a + b, v: { x: 1, y: 1 } }, { c: a * b, v: { y: 2 } }])} を因数分解しなさい。`, ans, choices: exprChoices(ans, variants, fill, r), h1: "y を数のように見て、かけて ab・たして a+b になる2数をさがす", h2: "答えの両方のかっこに y が付く" };
}

function genFactorSqE(r) { // x²−16・x²+6x+9
  const a = r(1, 6), diff = r(0, 1) === 1;
  if (diff) {
    const ans = `${binom(a)}${binom(-a)}`;
    return { q: `${polyStr([{ c: 1, v: { x: 2 } }, { c: -a * a, v: {} }])} を因数分解しなさい。`, ans, choices: exprChoices(ans, [`${binom(a)}²`, `${binom(-a)}²`, `${binom(a * a)}${binom(-1)}`], [`${binom(a + 1)}${binom(-a)}`], r), h1: H.sq.h1, h2: "x²−a²=(x+a)(x−a)" };
  }
  const ans = `${binom(a)}²`;
  return { q: `${polyStr([{ c: 1, v: { x: 2 } }, { c: 2 * a, v: { x: 1 } }, { c: a * a, v: {} }])} を因数分解しなさい。`, ans, choices: exprChoices(ans, [`${binom(a)}${binom(-a)}`, `${binom(2 * a)}²`, `${binom(-a)}²`], [`${binom(a + 1)}²`], r), h1: H.sq.h1, h2: "x²+2ax+a²=(x+a)²" };
}
function genFactorSqA(r) { // 4x²−9 → (2x+3)(2x−3)、9x²−12x+4 → (3x−2)²
  const k = r(2, 4); let a; do { a = r(1, 7); } while (gcd(k, a) !== 1);
  const lin = (s) => `(${monoStr(k, { x: 1 })}${sn(s)})`;
  const kk = (s) => `(${monoStr(k * k, { x: 1 })}${sn(s)})`;
  if (r(0, 1) === 1) {
    const ans = `${lin(a)}${lin(-a)}`;
    return { q: `${polyStr([{ c: k * k, v: { x: 2 } }, { c: -a * a, v: {} }])} を因数分解しなさい。`, ans, choices: exprChoices(ans, [`${kk(a)}${kk(-a)}`, `${lin(a)}²`, `${binom(a)}${binom(-a)}`], [`${lin(a + 1)}${lin(-a)}`], r), h1: "○x² も △² も「何かの2乗」になっている", h2: `${k * k}x²=(${k}x)²、${a * a}=${a}² と見て A²−B²=(A+B)(A−B)` };
  }
  const s = r(0, 1) ? 1 : -1;
  const ans = `${lin(s * a)}²`;
  return { q: `${polyStr([{ c: k * k, v: { x: 2 } }, { c: 2 * k * s * a, v: { x: 1 } }, { c: a * a, v: {} }])} を因数分解しなさい。`, ans, choices: exprChoices(ans, [`${lin(-s * a)}²`, `${lin(s * a)}${lin(-s * a)}`, `${kk(s * a)}²`], [`${lin(s * (a + 1))}²`], r), h1: "最初と最後が2乗、真ん中が 2×A×B になっているか確かめる", h2: `${k * k}x²=(${k}x)²、${a * a}=${a}²` };
}
function genFactorSqO(r) { // 3x²−12 → 3(x+2)(x−2)、x²−6xy+9y² → (x−3y)²
  if (r(0, 1) === 1) {
    const m = r(2, 5), a = r(1, 6);
    const ans = `${m}${binom(a)}${binom(-a)}`;
    return { q: `${polyStr([{ c: m, v: { x: 2 } }, { c: -m * a * a, v: {} }])} を因数分解しなさい。`, ans, choices: exprChoices(ans, [`${binom(a)}${binom(-a)}`, `${m}${binom(-a)}²`, `${m}${binom(a)}²`], [`${m}${binom(a + 1)}${binom(-(a + 1))}`], r), h1: "まず共通因数でくくり、残りを公式で因数分解", h2: "くくった残りは x²−○² の形" };
  }
  const a = r(1, 6), s = r(0, 1) ? 1 : -1;
  const sq = (k) => `(x${sgn(k, { y: 1 })})²`;
  const ans = sq(s * a);
  return { q: `${polyStr([{ c: 1, v: { x: 2 } }, { c: 2 * s * a, v: { x: 1, y: 1 } }, { c: a * a, v: { y: 2 } }])} を因数分解しなさい。`, ans, choices: exprChoices(ans, [sq(-s * a), `${byY(s * a)}${byY(-s * a)}`, `${binom(s * a)}²`], [sq(s * (a + 1))], r), h1: "y をふくんでも (A+B)²=A²+2AB+B² が使える", h2: `${a * a}y²=(${a}y)²` };
}

function genUseE(r) { // 21×19
  const base = r(2, 9) * 10, d = r(1, 2);
  const ans = base * base - d * d;
  return { q: `くふうして計算しなさい： ${base + d} × ${base - d}`, ans, choices: numChoices(ans, r, [base * base, base * base + d * d, base * base - d]), h1: "(a+b)(a−b)=a²−b² を使う", h2: `${base}²−${d}² で計算する` };
}
function genUseA(r) { // 98²・63²−37²
  if (r(0, 1) === 1) {
    const d = rnz(r, -4, 4), n = 100 + d;
    return { q: `くふうして計算しなさい： ${n}²`, ans: n * n, choices: numChoices(n * n, r, [10000 + d * d, 10000 + 200 * d, 10000 - d * d]), h1: `${n}=100${d > 0 ? "+" : "−"}${Math.abs(d)} と見て (a+b)²=a²+2ab+b² を使う`, h2: "100²=10000 に、2×100×○ と ○² を足す(引く)" };
  }
  const a = r(51, 69), b = 100 - a;
  return { q: `くふうして計算しなさい： ${a}²−${b}²`, ans: 100 * (a - b), choices: numChoices(100 * (a - b), r, [(a - b) * (a - b), 10000, 10 * (a - b)]), h1: "a²−b²=(a+b)(a−b) を使う", h2: `(${a}+${b})×(${a}−${b})` };
}
function genUseO(r) { // x=97 のとき x²+6x+9／a+b=7, ab=10 のとき a²+b²
  if (r(0, 1) === 1) {
    const a = r(2, 5), n = r(2, 9) * 10, x = n - a;
    return { q: `x=${x} のとき、${polyStr([{ c: 1, v: { x: 2 } }, { c: 2 * a, v: { x: 1 } }, { c: a * a, v: {} }])} の値を求めなさい。`, ans: n * n, choices: numChoices(n * n, r, [(x - a) * (x - a), n * n + a * a, x * x]), h1: "代入する前に、式を因数分解してみよう", h2: `(x+${a})² になるので、x+${a} を先に計算` };
  }
  const a = r(1, 6), b = r(1, 6), s = a + b, t = a * b;
  return { q: `a+b=${s}、ab=${t} のとき、a²+b² の値を求めなさい。`, ans: s * s - 2 * t, choices: numChoices(s * s - 2 * t, r, [s * s, s * s + 2 * t, s * s - t]), h1: "(a+b)²=a²+2ab+b² を使う", h2: `a²+b²=(a+b)²−2ab` };
}

// 各単元：難易度ごとに生成テンプレを 10 個ずつ置く（1テンプレで毎回ちがう問題を生成。id は e1..e10 / s1..s10 / a1..a10 / o1..o10）。
//  鬼は、その単元の鬼問題（2段階の計算）。展開の単元(u1・u3・u4)だけ、共通の (ax+b)(cx+d) 展開を半分まぜる。
const N = 10; // 各レベルの問題数
const LV = { e: "easy", s: "standard", a: "advanced" };
const unitGen = (std, easy, adv, oni) => (r, level) => (level === "easy" ? easy(r) : level === "advanced" ? adv(r) : level === "oni" ? oni(r) : std(r));
const mkList = (idp, lvl, fn, skill) =>
  Array.from({ length: N }, (_, i) => p(`${idp}${lvl}${i + 1}`, (r) => fn(r, LV[lvl]), skill));
const mkOni = (idp, fn, skill, mixExpn) =>
  Array.from({ length: N }, (_, i) =>
    p(`${idp}o${i + 1}`, (r) => (mixExpn && i % 2 === 0 ? genOniExpn(r) : fn(r, "oni")), skill)
  );
const lv = (fn, idp, skill, mixExpn = false) => ({
  easy: mkList(idp, "e", fn, skill),
  standard: mkList(idp, "s", fn, skill),
  advanced: mkList(idp, "a", fn, skill),
  oni: mkOni(idp, fn, skill, mixExpn), // 🔥鬼
});

export const chapter = {
  id: "g3c1",
  name: "式の展開と因数分解",
  emoji: "🧮",
  color: "#34d399",
  grade: 3,
  units: [
    { id: "g3c1u1", name: "単項式×多項式（展開）", emoji: "✖️", desc: "分配法則", problems: lv(unitGen(genDist, genDistE, genDistA, genDistO), "g3c1u1", "S-EXPN-DIST", true) },
    { id: "g3c1u2", name: "多項式÷単項式（除法）", emoji: "➗", desc: "各項を割る", problems: lv(unitGen(genDivPoly, genDivPolyE, genDivPolyA, genDivPolyO), "g3c1u2", "S-EXPN-DIV") },
    { id: "g3c1u3", name: "乗法公式 (x+a)(x+b)", emoji: "🟰", desc: "和が真ん中・積が定数", problems: lv(unitGen(genMulFormula, genMulFormulaE, genMulFormulaA, genMulFormulaO), "g3c1u3", "S-EXPN-MUL", true) },
    { id: "g3c1u4", name: "平方・和と差の公式", emoji: "⏫", desc: "(x±a)²・(x+a)(x−a)", problems: lv(unitGen(genSquare, genSquareE, genSquareA, genSquareO), "g3c1u4", "S-EXPN-SQ", true) },
    { id: "g3c1u5", name: "共通因数でくくる", emoji: "📦", desc: "共通因数", problems: lv(unitGen(genCommon, genCommonE, genCommonA, genCommonO), "g3c1u5", "S-FACT-CF") },
    { id: "g3c1u6", name: "因数分解 x²+(a+b)x+ab", emoji: "🧩", desc: "2数を見つける", problems: lv(unitGen(genFactor, genFactorE, genFactorA, genFactorO), "g3c1u6", "S-FACT-STD") },
    { id: "g3c1u7", name: "平方・差の因数分解", emoji: "🔷", desc: "公式で因数分解", problems: lv(unitGen(genFactorSq, genFactorSqE, genFactorSqA, genFactorSqO), "g3c1u7", "S-FACT-SQ") },
    { id: "g3c1u8", name: "式の計算の利用", emoji: "💡", desc: "くふうして計算", problems: lv(unitGen(genUse, genUseE, genUseA, genUseO), "g3c1u8", "S-EXPN-USE") },
  ],
};
