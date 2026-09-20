// ============================================================
// g3c3 — 中3「2次方程式」（★自動作問版）
//  整数解は (x−r1)(x−r2) から逆算、√の解は sqrtStr で簡約。答えは "x=…"。
// ============================================================
import { polyStr, neg, sqrtStr, exprChoices, simpSqrt, gcd } from "../_algebra.js";

const p = (id, build, skill = null) => ({ id, build, skill });
const rnz = (r, a, b) => { let v = 0; while (v === 0) v = r(a, b); return v; };
const rpick = (r, arr) => arr[r(0, arr.length - 1)];
const SQF = [2, 3, 5, 6, 7, 10];
const PRM = [2, 3, 5, 7, 11];

const twoRoots = (a, b) => { const xs = [a, b].sort((x, y) => x - y); return xs[0] === xs[1] ? `x=${neg(xs[0])}` : `x=${neg(xs[0])}, ${neg(xs[1])}`; };
const pmRoot = (center, n) => `x=${center === 0 ? "" : neg(center)}±${sqrtStr(1, n)}`;
const eq0 = (b, c) => `${polyStr([{ c: 1, v: { x: 2 } }, { c: b, v: { x: 1 } }, { c, v: {} }])}=0`;

const H = {
  sqrt: { h1: "x²=◯ なら x=±√◯。最後に √ を簡単にする", h2: "(x+a)²=◯ なら x+a=±√◯ → x=−a±√◯" },
  fac: { h1: "左辺を因数分解して (x−p)(x−q)=0 → x=p, q", h2: "かけて定数・たして1次の係数になる2数を探す" },
  formula: { h1: "解の公式 x=(−b±√(b²−4ac))/(2a)", h2: "因数分解できるときは因数分解の方が速い" },
};

// u1 平方根の考えで解く
function genSqrtType(r, level) {
  if (level === "easy") {
    const k = r(2, 12), ans = `x=±${k}`;
    return { q: `x²=${k * k} を解きなさい。`, ans, choices: exprChoices(ans, [`x=${k}`, `x=±${k * k}`, `x=±${2 * k}`], [`x=±${k + 1}`], r), h1: H.sqrt.h1, h2: `x=±√${k * k}=±${k}` };
  }
  if (level === "standard") {
    const pp = rpick(r, PRM), ans = pmRoot(0, pp);
    return { q: `x²=${pp} を解きなさい。`, ans, choices: exprChoices(ans, [`x=${pp}`, `x=±${pp}`, pmRoot(0, pp * 2)], [`x=±√${pp + 1}`], r), h1: H.sqrt.h1, h2: `x=±√${pp}` };
  }
  const m = r(2, 4), k = rpick(r, SQF), n = m * m * k, ans = pmRoot(0, n);
  return { q: `x²=${n} を解きなさい。`, ans, choices: exprChoices(ans, [`x=±${n}`, `x=±√${n}`, pmRoot(0, n + k)], [pmRoot(0, n * 2)], r), h1: H.sqrt.h1, h2: `x=±√${n}=±${m}√${k}` };
}

// u2 (x+a)²=b
function genComplete(r, level) {
  const a = rnz(r, -6, 6);
  if (level === "easy") {
    const k = r(2, 9), ans = twoRoots(-a + k, -a - k);
    return { q: `(x${a >= 0 ? "+" + a : "−" + -a})²=${k * k} を解きなさい。`, ans, choices: exprChoices(ans, [twoRoots(a + k, a - k), twoRoots(-a + k * k, -a - k * k), twoRoots(-a, -a)], [twoRoots(-a + k + 1, -a - k)], r), h1: H.sqrt.h2, h2: `x+${a}=±${k} → x=${-a}±${k}` };
  }
  const pp = level === "standard" ? rpick(r, PRM) : (r(2, 3) ** 2) * rpick(r, SQF);
  const ans = pmRoot(-a, pp);
  return { q: `(x${a >= 0 ? "+" + a : "−" + -a})²=${pp} を解きなさい。`, ans, choices: exprChoices(ans, [pmRoot(a, pp), pmRoot(-a, pp * 2), `x=${neg(-a)}+√${pp}`], [pmRoot(-a + 1, pp)], r), h1: H.sqrt.h2, h2: `x+${a}=±√${pp}` };
}

// u3 解の公式（整数解になる方程式で公式の練習）/ u4 因数分解で解く
function genFactorSolve(r, level, hint) {
  const r1 = rnz(r, -7, 7), r2 = rnz(r, -7, 7);
  const b = -(r1 + r2), c = r1 * r2;
  const ans = twoRoots(r1, r2);
  return { q: `${eq0(b, c)} を解きなさい。`, ans, choices: exprChoices(ans, [twoRoots(-r1, -r2), twoRoots(r1, -r2), twoRoots(b, c)], [twoRoots(r1 + 1, r2), twoRoots(r1, r2 + 1)], r), h1: hint.h1, h2: hint.h2 };
}

// u5 いろいろな2次方程式（展開して整理が必要な形 → 整数解）
function genMixed(r, level) {
  const r1 = rnz(r, -6, 6), r2 = rnz(r, -6, 6);
  const b = -(r1 + r2), c = r1 * r2;
  // x² + bx = −c の形（定数を移項する練習）
  const ans = twoRoots(r1, r2);
  const lhs = polyStr([{ c: 1, v: { x: 2 } }, { c: b, v: { x: 1 } }]);
  return { q: `${lhs}=${neg(-c)} を解きなさい。`, ans, choices: exprChoices(ans, [twoRoots(-r1, -r2), twoRoots(r1, -r2), twoRoots(r1 + 1, r2)], [twoRoots(r1, r2 - 1)], r), h1: "定数を左に移して =0 の形にしてから因数分解", h2: H.fac.h2 };
}

// 🔥鬼：解の公式（a≠1・無理数解）。答えは「約分した最簡形」で表示する。
//  x=(−b±√D)/(2a) → √D=e√f に簡約し、(−b, e, 2a) の最大公約数で約分する。
const quadFmt = (nb, ne, f, den) => {
  const rad = (ne === 1 ? "" : ne) + "√" + f;
  return den === 1 ? `x=${neg(nb)}±${rad}` : `x=(${neg(nb)}±${rad})/${den}`;
};
function genOni(r) {
  let a, b, c, D;
  do {
    a = rnz(r, 2, 4); b = rnz(r, -7, 7); c = rnz(r, -5, 5);
    D = b * b - 4 * a * c;
  } while (D <= 0 || Number.isInteger(Math.sqrt(D))); // 実数かつ無理数解（公式の練習になる形）
  const eq = `${polyStr([{ c: a, v: { x: 2 } }, { c: b, v: { x: 1 } }, { c, v: {} }])}=0`;
  const { coef: e, rad: f } = simpSqrt(D);
  const den0 = 2 * a, nb0 = -b;
  const g = gcd(gcd(Math.abs(nb0), e), den0);       // (−b, √の係数, 2a) を約分
  const nb = nb0 / g, ne = e / g, den = den0 / g;
  const ans = quadFmt(nb, ne, f, den);
  const variants = [
    quadFmt(-nb, ne, f, den),                       // −b の符号ミス
    quadFmt(nb, ne, f, den === 1 ? 2 : den + 1),    // 約分・分母ミス
    quadFmt(nb, ne === 1 ? 2 : ne + 1, f, den),     // √の係数ミス
  ];
  const fill = [quadFmt(nb, ne, f + 1, den), quadFmt(nb, ne, Math.max(2, f - 1), den)];
  return { q: `${eq} を解きなさい。`, ans, choices: exprChoices(ans, variants, fill, r), h1: "解の公式 x=(−b±√(b²−4ac))/(2a)。√と分数は最後まで約分する", h2: `a=${a}, b=${b}, c=${c} を公式に代入 → 約分` };
}

// 各レベル10問ずつ（id は e1..e10 / s1..s10 / a1..a10 / o1..o10）。
//  生成関数は r（乱数シード）で振る舞いが変わるので、id を分けるだけで
//  別々の問題になる。解は build 内で逆算しており必ず正答・書式も共通。
const N = 10;
const series = (idp, suf, mk, skill) =>
  Array.from({ length: N }, (_, i) => p(idp + suf + (i + 1), mk, skill));
const lv = (fn, idp, skill, extra) => ({
  easy: series(idp, "e", (r) => fn(r, "easy", extra), skill),
  standard: series(idp, "s", (r) => fn(r, "standard", extra), skill),
  advanced: series(idp, "a", (r) => fn(r, "advanced", extra), skill),
  oni: series(idp, "o", (r) => genOni(r), skill), // 🔥鬼（全単元共通：解の公式の難問）
});

export const chapter = {
  id: "g3c3",
  name: "2次方程式",
  emoji: "🟰",
  color: "#f472b6",
  grade: 3,
  units: [
    { id: "g3c3u1", name: "平方根の考えで解く2次方程式", emoji: "√", desc: "x²=b", problems: lv(genSqrtType, "g3c3u1", "S-QUAD-SQRT") },
    { id: "g3c3u2", name: "(x+a)²=b の形で解く2次方程式", emoji: "⏹️", desc: "平方完成", problems: lv(genComplete, "g3c3u2", "S-QUAD-COMP") },
    { id: "g3c3u3", name: "解の公式で解く2次方程式", emoji: "📐", desc: "解の公式", problems: lv(genFactorSolve, "g3c3u3", "S-QUAD-FORMULA", H.formula) },
    { id: "g3c3u4", name: "因数分解で解く2次方程式", emoji: "🧩", desc: "因数分解", problems: lv(genFactorSolve, "g3c3u4", "S-QUAD-FACTOR", H.fac) },
    { id: "g3c3u5", name: "いろいろな2次方程式", emoji: "🔀", desc: "整理して解く", problems: lv(genMixed, "g3c3u5", "S-QUAD-MIX") },
  ],
};
