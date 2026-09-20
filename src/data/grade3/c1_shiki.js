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
  const a = rnz(r, -8, 8), diff = r(0, 1) === 1;
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
  const a = rnz(r, -6, 6), b = rnz(r, -6, 6);
  const ans = `${binom(a)}${binom(b)}`;
  const q = `${polyStr([{ c: 1, v: { x: 2 } }, { c: a + b, v: { x: 1 } }, { c: a * b, v: {} }])} を因数分解しなさい。`;
  const variants = [`${binom(-a)}${binom(-b)}`, `${binom(a)}${binom(-b)}`, `${binom(-a)}${binom(b)}`];
  const fill = [`${binom(a + 1)}${binom(b)}`, `${binom(a)}${binom(b + 1)}`, `${binom(a - 1)}${binom(b)}`];
  return { q, ans, choices: exprChoices(ans, variants, fill, r), h1: H.fac.h1, h2: H.fac.h2 };
}

// u7 平方・差の因数分解
function genFactorSq(r) {
  const a = rnz(r, 1, 9), diff = r(0, 1) === 1;
  let ans, q;
  if (diff) { ans = `${binom(a)}${binom(-a)}`; q = `${polyStr([{ c: 1, v: { x: 2 } }, { c: -a * a, v: {} }])} を因数分解しなさい。`; }
  else { const s = r(0, 1) ? 1 : -1; ans = `${binom(s * a)}²`; q = `${polyStr([{ c: 1, v: { x: 2 } }, { c: 2 * s * a, v: { x: 1 } }, { c: a * a, v: {} }])} を因数分解しなさい。`; }
  const variants = diff
    ? [`${binom(a)}${binom(a)}`, `${binom(a)}²`, `${binom(-a)}${binom(-a)}`]
    : [`${binom(a)}${binom(-a)}`, `${binom(2 * a)}²`, `${binom(a)}²+1`];
  const fill = [`${binom(a + 1)}${binom(-a)}`, `${binom(a)}${binom(-(a + 1))}`, `${binom(a + 1)}²`];
  return { q, ans, choices: exprChoices(ans, variants, fill, r), h1: H.sq.h1, h2: "x²−a²=(x+a)(x−a)、x²±2ax+a²=(x±a)²" };
}

// u8 式の計算の利用（和と差で数値計算）
function genUse(r) {
  const base = r(2, 9) * 10, d = r(1, 4);     // (base−d)(base+d)=base²−d²
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

// 各単元：難易度ごとに生成テンプレを 10 個ずつ置く（1テンプレで毎回ちがう問題を生成）。
//  ・各レベルの 10 テンプレは同じ生成関数 fn を使う＝呼び出しごとに係数がランダムに変わるので、
//    出題時には毎回ちがう問題になる（id は重複しないよう連番で振る）。
//  ・oni（鬼）は「全単元共通の (ax+b)(cx+d) 展開 genOniExpn」と「その単元の generator fn」を
//    交互に混ぜ、発展のさらに上の難問として 10 個用意する（答えは1つに定まる式/数値）。
const N = 10; // 各レベルの問題数
const mkList = (idp, lvl, fn, skill) =>
  Array.from({ length: N }, (_, i) => p(`${idp}${lvl}${i + 1}`, (r) => fn(r), skill));
const mkOni = (idp, fn, skill) =>
  Array.from({ length: N }, (_, i) =>
    p(`${idp}o${i + 1}`, (r) => (i % 2 === 0 ? genOniExpn(r) : fn(r)), skill)
  );
const lv = (fn, idp, skill) => ({
  easy: mkList(idp, "e", fn, skill),
  standard: mkList(idp, "s", fn, skill),
  advanced: mkList(idp, "a", fn, skill),
  oni: mkOni(idp, fn, skill), // 🔥鬼（共通の(ax+b)(cx+d)展開＋その単元の難問）
});

export const chapter = {
  id: "g3c1",
  name: "式の展開と因数分解",
  emoji: "🧮",
  color: "#34d399",
  grade: 3,
  units: [
    { id: "g3c1u1", name: "単項式×多項式（展開）", emoji: "✖️", desc: "分配法則", problems: lv(genDist, "g3c1u1", "S-EXPN-DIST") },
    { id: "g3c1u2", name: "多項式÷単項式（除法）", emoji: "➗", desc: "各項を割る", problems: lv(genDivPoly, "g3c1u2", "S-EXPN-DIV") },
    { id: "g3c1u3", name: "乗法公式 (x+a)(x+b)", emoji: "🟰", desc: "和が真ん中・積が定数", problems: lv(genMulFormula, "g3c1u3", "S-EXPN-MUL") },
    { id: "g3c1u4", name: "平方・和と差の公式", emoji: "⏫", desc: "(x±a)²・(x+a)(x−a)", problems: lv(genSquare, "g3c1u4", "S-EXPN-SQ") },
    { id: "g3c1u5", name: "共通因数でくくる", emoji: "📦", desc: "共通因数", problems: lv(genCommon, "g3c1u5", "S-FACT-CF") },
    { id: "g3c1u6", name: "因数分解 x²+(a+b)x+ab", emoji: "🧩", desc: "2数を見つける", problems: lv(genFactor, "g3c1u6", "S-FACT-STD") },
    { id: "g3c1u7", name: "平方・差の因数分解", emoji: "🔷", desc: "公式で因数分解", problems: lv(genFactorSq, "g3c1u7", "S-FACT-SQ") },
    { id: "g3c1u8", name: "式の計算の利用", emoji: "💡", desc: "くふうして計算", problems: lv(genUse, "g3c1u8", "S-EXPN-USE") },
  ],
};
