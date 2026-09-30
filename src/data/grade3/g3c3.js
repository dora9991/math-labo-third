// ============================================================
// g3c3 — 中3「2次方程式」（★自動作問版）
//  整数解は (x−r1)(x−r2) から逆算、√の解は sqrtStr で簡約。答えは "x=…"。
// ============================================================
import { polyStr, monoStr, neg, sqrtStr, exprChoices, simpSqrt, gcd } from "../_algebra.js";

const p = (id, build, skill = null) => ({ id, build, skill });
const rnz = (r, a, b) => { let v = 0; while (v === 0) v = r(a, b); return v; };
const rpick = (r, arr) => arr[r(0, arr.length - 1)];
const sn = (k) => (k > 0 ? "+" + k : k < 0 ? "−" + -k : ""); // 符号つき定数（0は空）
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

// u1 平方根の考えで解く（2026-09-30：普通は素数5種だけだったので、平方因数のない数と ax²=b の形を追加）
const SQFREE = [2, 3, 5, 6, 7, 10, 11, 13, 14, 15];
function genSqrtType(r, level) {
  if (level === "easy") {
    const k = r(2, 12), ans = `x=±${k}`;
    const q = r(0, 1) ? `x²=${k * k}` : `x²−${k * k}=0`;
    return { q: `${q} を解きなさい。`, ans, choices: exprChoices(ans, [`x=${k}`, `x=±${k * k}`, `x=±${2 * k}`], [`x=±${k + 1}`], r), h1: H.sqrt.h1, h2: `x=±√${k * k}=±${k}` };
  }
  if (level === "standard") {
    const pp = rpick(r, SQFREE), ans = pmRoot(0, pp), a = r(0, 1) ? 1 : r(2, 5);
    const q = a === 1 ? `x²=${pp}` : `${a}x²=${a * pp}`;
    return { q: `${q} を解きなさい。`, ans, choices: exprChoices(ans, [`x=${sqrtStr(1, pp)}`, `x=±${pp}`, pmRoot(0, pp * 2)], [`x=±√${pp + 1}`], r), h1: H.sqrt.h1, h2: a === 1 ? `x=±√${pp}` : `両辺を${a}で割って x²=${pp}` };
  }
  const m = level === "oni" ? r(2, 5) : r(2, 4), k = rpick(r, SQF), n = m * m * k, ans = pmRoot(0, n);
  const a = level === "oni" ? r(2, 4) : r(0, 1) ? 1 : r(2, 3);
  const q = level === "oni" ? `${a}x²−${a * n}=0` : a === 1 ? `x²=${n}` : `${a}x²=${a * n}`;
  return { q: `${q} を解きなさい。`, ans, choices: exprChoices(ans, [`x=±${n}`, `x=±√${n}`, pmRoot(0, n + k)], [pmRoot(0, n * 2)], r), h1: level === "oni" ? "移項して、x²の係数で割り、x²=◯ の形にする" : H.sqrt.h1, h2: `x=±√${n}=±${m}√${k}` };
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

// u2 の鬼：(2x−1)²=18 → x=(1±3√2)/2
function genCompleteOni(r) {
  const k = r(2, 3), a = rnz(r, -5, 5), m = r(1, 3), f = rpick(r, SQF), n = m * m * f;
  const g = gcd(gcd(Math.abs(a), m), k);
  const ans = quadFmt(-a / g, m / g, f, k / g);
  const variants = [quadFmt(a / g, m / g, f, k / g), quadFmt(-a, m, f, 1), quadFmt(-a / g, m / g, f, (k / g) + 1)];
  return { q: `(${k}x${sn(a)})²=${n} を解きなさい。`, ans, choices: exprChoices(ans, variants, [quadFmt(-a / g, (m / g) + 1, f, k / g)], r), h1: `${k}x${sn(a)}=±√${n} として、あとは1次方程式`, h2: `√${n}=${m === 1 ? "" : m}√${f}。最後に ${k} でわる` };
}

// u4 因数分解で解く（2026-09-30：難易度で問題を変える）
//  簡単＝正の小さい解・x²−kx=0／普通＝±の解／難しい＝共通因数でわる・移項が要る／鬼＝展開して整理してから
function genFactorSolve(r, level, hint) {
  const hh = hint || H.fac;
  if (level === "easy") {
    if (r(0, 1)) { const k = rnz(r, -7, 7), ans = twoRoots(0, k); return { q: `${polyStr([{ c: 1, v: { x: 2 } }, { c: -k, v: { x: 1 } }])}=0 を解きなさい。`, ans, choices: exprChoices(ans, [`x=${neg(k)}`, twoRoots(0, -k), twoRoots(1, k)], [twoRoots(0, k + 1)], r), h1: "共通因数 x でくくる：x(x−◯)=0", h2: "x=0 も解になる（忘れやすい）" }; }
    const r1 = r(1, 7), r2 = r(1, 7), ans = twoRoots(r1, r2);
    return { q: `${eq0(-(r1 + r2), r1 * r2)} を解きなさい。`, ans, choices: exprChoices(ans, [twoRoots(-r1, -r2), twoRoots(r1, -r2), twoRoots(r1 + r2, r1 * r2)], [twoRoots(r1 + 1, r2)], r), h1: hh.h1, h2: hh.h2 };
  }
  const r1 = rnz(r, -7, 7), r2 = rnz(r, -7, 7);
  const b = -(r1 + r2), c = r1 * r2;
  const ans = twoRoots(r1, r2);
  const choices = exprChoices(ans, [twoRoots(-r1, -r2), twoRoots(r1, -r2), twoRoots(b, c)], [twoRoots(r1 + 1, r2), twoRoots(r1, r2 + 1)], r);
  if (level === "advanced") {
    if (r(0, 1)) { const k = r(2, 3); return { q: `${polyStr([{ c: k, v: { x: 2 } }, { c: k * b, v: { x: 1 } }, { c: k * c, v: {} }])}=0 を解きなさい。`, ans, choices, h1: `まず両辺を${k}でわる`, h2: hh.h2 }; }
    return { q: `x²=${polyStr([{ c: -b, v: { x: 1 } }, { c: -c, v: {} }])} を解きなさい。`, ans, choices, h1: "右辺を左に移項して「=0」の形にする", h2: hh.h2 };
  }
  if (level === "oni") { // (x+p)(x+q)=m
    const pp = rnz(r, -5, 5), qq = b - pp, m = pp * qq - c;
    if (qq === 0 || m === 0) return { skip: true };
    return { q: `(x${sn(pp)})(x${sn(qq)})=${neg(m)} を解きなさい。`, ans, choices, h1: "左辺を展開し、右辺を移項して「=0」にしてから因数分解", h2: "(x+p)(x+q)=m のまま x+p=m などとしてはいけない" };
  }
  return { q: `${eq0(b, c)} を解きなさい。`, ans, choices, h1: hh.h1, h2: hh.h2 };
}

// u3 解の公式（2026-09-30：これまで因数分解できる式だけ＝公式を使う必要がなかった）
//  簡単＝bが偶数(x=−◯±√◯)／普通＝bが奇数((−b±√D)/2)／難しい＝aが2〜3／鬼＝移項してから公式
function formulaAns(a, b, c) {
  const D = b * b - 4 * a * c, { coef: e, rad: f } = simpSqrt(D);
  const g = gcd(gcd(Math.abs(b), e), 2 * a);
  return { nb: -b / g, ne: e / g, f, den: (2 * a) / g };
}
function genFormula(r, level) {
  let a, b, c, D, g = 0;
  do {
    a = level === "advanced" ? r(2, 3) : level === "oni" ? r(2, 4) : 1;
    b = level === "easy" ? 2 * rnz(r, -4, 4) : level === "standard" ? 2 * r(-4, 3) + 1 : rnz(r, -7, 7);
    c = rnz(r, -6, 6);
    D = b * b - 4 * a * c; g++;
  } while ((D <= 0 || Number.isInteger(Math.sqrt(D))) && g < 100);
  if (D <= 0 || Number.isInteger(Math.sqrt(D))) return { skip: true };
  const { nb, ne, f, den } = formulaAns(a, b, c);
  const ans = quadFmt(nb, ne, f, den);
  const variants = [quadFmt(-nb, ne, f, den), quadFmt(nb, ne, f, den === 1 ? 2 : den + 1), quadFmt(nb, ne === 1 ? 2 : ne + 1, f, den)];
  const fill = [quadFmt(nb, ne, f + 1, den), quadFmt(nb, ne, Math.max(2, f - 1), den)];
  const std = `${polyStr([{ c: a, v: { x: 2 } }, { c: b, v: { x: 1 } }, { c, v: {} }])}=0`;
  const q = level === "oni" ? `${polyStr([{ c: a, v: { x: 2 } }])}=${polyStr([{ c: -b, v: { x: 1 } }, { c: -c, v: {} }])}` : std;
  return { q: `${q} を解きなさい。`, ans, choices: exprChoices(ans, variants, fill, r), h1: level === "oni" ? "まず移項して ax²+bx+c=0 の形にする" : H.formula.h1, h2: `a=${a}, b=${b}, c=${c} を公式に代入し、√と分数を約分する` };
}

// u5 いろいろな2次方程式（整理してから解く）
//  簡単＝x²=kx／普通＝x²+bx=定数／難しい＝x(x+b)=c／鬼＝(x+p)(x+q)=m で解が√になる
function genMixed(r, level) {
  if (level === "easy") {
    const k = rnz(r, -8, 8), ans = twoRoots(0, k);
    return { q: `x²=${monoStr(k, { x: 1 })} を解きなさい。`, ans, choices: exprChoices(ans, [`x=${neg(k)}`, twoRoots(0, -k), twoRoots(1, k)], [twoRoots(0, k + 1)], r), h1: "右辺を移項して x²−◯x=0 → x(x−◯)=0", h2: "両辺を x でわると x=0 の解がなくなってしまう" };
  }
  const r1 = rnz(r, -6, 6), r2 = rnz(r, -6, 6);
  const b = -(r1 + r2), c = r1 * r2;
  const ans = twoRoots(r1, r2);
  const choices = exprChoices(ans, [twoRoots(-r1, -r2), twoRoots(r1, -r2), twoRoots(r1 + 1, r2)], [twoRoots(r1, r2 - 1)], r);
  if (level === "advanced") {
    if (b === 0) return { skip: true };
    return { q: `x(x${sn(b)})=${neg(-c)} を解きなさい。`, ans, choices, h1: "左辺を展開して、右辺を移項する", h2: H.fac.h2 };
  }
  if (level === "oni") {
    let pp, qq, m, D4, g = 0;
    do { pp = rnz(r, -5, 5); qq = rnz(r, -5, 5); m = rnz(r, -8, 8); D4 = ((pp + qq) / 2) ** 2 - (pp * qq - m); g++; }
    while ((pp + qq === 0 || (pp + qq) % 2 !== 0 || D4 <= 0 || Number.isInteger(Math.sqrt(D4))) && g < 200);
    if (pp + qq === 0 || (pp + qq) % 2 !== 0 || D4 <= 0 || Number.isInteger(Math.sqrt(D4))) return { skip: true };
    const h = (pp + qq) / 2, oans = pmRoot(-h, D4);
    return { q: `(x${sn(pp)})(x${sn(qq)})=${neg(m)} を解きなさい。`, ans: oans, choices: exprChoices(oans, [pmRoot(h, D4), pmRoot(-h, D4 + 1), pmRoot(-h, Math.abs(pp * qq - m))], [pmRoot(-h + 1, D4)], r), h1: "展開して整理 → 因数分解できなければ解の公式", h2: "x²+2hx+k=0 の形なら x=−h±√(h²−k)" };
  }
  const lhs = polyStr([{ c: 1, v: { x: 2 } }, { c: b, v: { x: 1 } }]);
  return { q: `${lhs}=${neg(-c)} を解きなさい。`, ans, choices, h1: "定数を左に移して =0 の形にしてから因数分解", h2: H.fac.h2 };
}

// 解の公式の答えの表示：「約分した最簡形」。
//  x=(−b±√D)/(2a) → √D=e√f に簡約し、(−b, e, 2a) の最大公約数で約分する。
const quadFmt = (nb, ne, f, den) => {
  const rad = (ne === 1 ? "" : ne) + "√" + f;
  return den === 1 ? `x=${neg(nb)}±${rad}` : `x=(${neg(nb)}±${rad})/${den}`;
};
// 各レベル10問ずつ（id は e1..e10 / s1..s10 / a1..a10 / o1..o10）。
//  生成関数は r（乱数シード）で振る舞いが変わるので、id を分けるだけで
//  別々の問題になる。解は build 内で逆算しており必ず正答・書式も共通。
const N = 10;
const series = (idp, suf, mk, skill) =>
  Array.from({ length: N }, (_, i) => p(idp + suf + (i + 1), mk, skill));
const lv = (fn, idp, skill, extra, oni = null) => ({
  easy: series(idp, "e", (r) => fn(r, "easy", extra), skill),
  standard: series(idp, "s", (r) => fn(r, "standard", extra), skill),
  advanced: series(idp, "a", (r) => fn(r, "advanced", extra), skill),
  oni: series(idp, "o", oni || ((r) => fn(r, "oni", extra)), skill), // 🔥鬼（単元ごとの難問）
});

export const chapter = {
  id: "g3c3",
  name: "2次方程式",
  emoji: "🟰",
  color: "#f472b6",
  grade: 3,
  units: [
    { id: "g3c3u1", name: "平方根の考えで解く2次方程式", emoji: "√", desc: "x²=b", problems: lv(genSqrtType, "g3c3u1", "S-QUAD-SQRT") },
    { id: "g3c3u2", name: "(x+a)²=b の形で解く2次方程式", emoji: "⏹️", desc: "平方完成", problems: lv(genComplete, "g3c3u2", "S-QUAD-COMP", null, genCompleteOni) },
    { id: "g3c3u3", name: "解の公式で解く2次方程式", emoji: "📐", desc: "解の公式", problems: lv(genFormula, "g3c3u3", "S-QUAD-FORMULA") },
    { id: "g3c3u4", name: "因数分解で解く2次方程式", emoji: "🧩", desc: "因数分解", problems: lv(genFactorSolve, "g3c3u4", "S-QUAD-FACTOR", H.fac) },
    { id: "g3c3u5", name: "いろいろな2次方程式", emoji: "🔀", desc: "整理して解く", problems: lv(genMixed, "g3c3u5", "S-QUAD-MIX") },
  ],
};
