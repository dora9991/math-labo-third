// ============================================================
// g3c2 — 中3「平方根」（★自動作問版）
//  √ の簡約は sqrtStr。答えは a√b 形・整数・√結合など。
// ============================================================
import { sqrtStr, neg, exprChoices, numChoices, sup } from "../_algebra.js";

const p = (id, build, skill = null) => ({ id, build, skill });
const rpick = (r, arr) => arr[r(0, arr.length - 1)];
const SQF = [2, 3, 5, 6, 7, 10];           // 平方因数を持たない（squarefree）小さな数
const PRM = [2, 3, 5, 7];

const H = {
  root: { h1: "√(平方数)は根号がはずれる。aの平方根は ±√a", h2: "a²=◯ なら ◯の平方根は ±a" },
  trans: { h1: "√の中の平方因数をくくり出す（√(m²k)=m√k）", h2: "a√b は √(a²b) に直せる" },
  muldiv: { h1: "√a×√b=√(ab)。最後に平方因数をくくり出す", h2: "係数は係数どうし、根号は根号どうし" },
  addsub: { h1: "√の中が同じものだけ、係数をたし引きできる", h2: "まず √ を簡単にして、同類の√をまとめる" },
  dist: { h1: "分配法則で展開。(√a+√b)(√a−√b)=a−b", h2: "(√a+√b)²=a+b+2√(ab)" },
};
const sumStr = (t1, t2) => t1 + "+" + t2;        // 2つの正の√項をつなぐ

// u1 平方根を求める・根号をはずす
function genRoot(r, level) {
  const m = r(2, 13);
  if (level === "easy") {
    return { q: `√${m * m} を簡単にしなさい。`, ans: m, choices: numChoices(m, r, [m * m, m * 2, m + 1]), h1: H.root.h1, h2: `${m}²=${m * m} だから √${m * m}=${m}` };
  }
  if (level === "standard") {
    const ans = `±${m}`;
    return { q: `${m * m} の平方根を求めなさい。`, ans, choices: exprChoices(ans, [`${m}`, `${neg(-m)}`, `±${m * m}`], [`±${m + 1}`, `±${m - 1}`], r), h1: H.root.h1, h2: `±√${m * m}=±${m}` };
  }
  const k = rpick(r, SQF), mm = r(2, 5), n = mm * mm * k;
  const ans = sqrtStr(1, n);
  return { q: `√${n} を簡単にしなさい。`, ans, choices: exprChoices(ans, [sqrtStr(mm, k), `${mm * k}`, sqrtStr(1, n) + "?" === ans ? sqrtStr(mm + 1, k) : sqrtStr(mm + 1, k)], [sqrtStr(mm - 1, k), `√${n}`], r), h1: H.trans.h1, h2: `√${n}=√(${mm * mm}×${k})=${mm}√${k}` };
}

// u2 根号の変形（a√b ⇄ √a）・大小
function genTrans(r, level) {
  if (level === "easy") {
    const k = rpick(r, SQF), mm = r(2, 5), n = mm * mm * k;
    const ans = sqrtStr(1, n);
    return { q: `√${n} を a√b の形にしなさい。`, ans, choices: exprChoices(ans, [sqrtStr(mm, k * 1) === ans ? sqrtStr(mm + 1, k) : sqrtStr(mm + 1, k), `${mm * k}`, `${mm}√${k * mm}`], [sqrtStr(mm - 1, k), `√${n}`], r), h1: H.trans.h1, h2: `${mm}√${k}` };
  }
  if (level === "standard") {
    const a = r(2, 5), b = rpick(r, PRM), N = a * a * b;
    const ans = `√${N}`;
    return { q: `${a}√${b} を √a の形（根号1つ）にしなさい。`, ans, choices: exprChoices(ans, [`√${a * b}`, `√${a * a * a * b}`, `√${a + b}`], [`√${N + b}`, `√${N - b}`], r), h1: H.trans.h2, h2: `${a}√${b}=√(${a * a}×${b})=√${N}` };
  }
  // 大小比較
  const m = r(3, 6), n = rpick(r, [m * m - r(1, 4), m * m + r(1, 4)]);
  const bigger = n > m * m ? `√${n}` : `${m}`;
  return { q: `√${n} と ${m} で、大きいのはどちらですか。`, ans: bigger, choices: exprChoices(bigger, [n > m * m ? `${m}` : `√${n}`, `√${m}`, `${n}`], [], r), h1: "整数mは √(m²) と比べる", h2: `${m}=√${m * m} と √${n} を比べる` };
}

// u3 根号の乗法・除法
function genMulDiv(r, level) {
  if (level === "easy") {
    const pool = [2, 3, 5, 6, 7];
    const a = rpick(r, pool); let b = rpick(r, pool); if (b === a) b = pool[(pool.indexOf(a) + 1) % pool.length]; // a≠b（積が平方数にならないよう）
    const ans = sqrtStr(1, a * b);
    return { q: `√${a} × √${b} を計算しなさい。`, ans, choices: exprChoices(ans, [`√${a + b}`, `${a * b}`, sqrtStr(2, a * b)], [sqrtStr(1, a * b + 1), `√${a * b + 1}`], r), h1: H.muldiv.h1, h2: `√${a}×√${b}=√${a * b}` };
  }
  if (level === "standard") {
    const a = r(2, 4), c = r(2, 4), bd = [2, 3, 5];
    const b = rpick(r, bd); let d = rpick(r, bd); if (d === b) d = bd[(bd.indexOf(b) + 1) % bd.length]; // b≠d（根号が残るように）
    const ans = sqrtStr(a * c, b * d);
    return { q: `${a}√${b} × ${c}√${d} を計算しなさい。`, ans, choices: exprChoices(ans, [sqrtStr(a + c, b * d), sqrtStr(a * c, b + d), sqrtStr(a * c, b * d * 2)], [sqrtStr(a * c + 1, b * d), sqrtStr(a * c, b * d + 1)], r), h1: H.muldiv.h2, h2: `係数 ${a}×${c}=${a * c}、根号 √${b}×√${d}=√${b * d}` };
  }
  // 約分できる除法： (a√(b·k)) ÷ √k = a√b の逆構成
  const b = rpick(r, [2, 3, 5, 6]), k = rpick(r, [2, 3, 5]), a = r(2, 5);
  const N = b * k;
  const ans = sqrtStr(a, b);
  return { q: `${a}√${N} ÷ √${k} を計算しなさい。`, ans, choices: exprChoices(ans, [sqrtStr(a, N * k), sqrtStr(a, b * k), `${a * b}`], [sqrtStr(a + 1, b)], r), h1: "√どうしは √(わり算) にできる", h2: `√${N}÷√${k}=√${b}` };
}

// u4 根号の加法・減法
function genAddSub(r, level) {
  if (level !== "advanced") {
    const c = rpick(r, PRM), a = r(2, 6), b = r(1, 5);
    const sub = level === "standard" && a !== b;
    const co = sub ? a - b : a + b;
    const ans = sqrtStr(co, c);
    return { q: `${a}√${c} ${sub ? "−" : "+"} ${b}√${c} を計算しなさい。`, ans, choices: exprChoices(ans, [sqrtStr(sub ? a + b : a - b, c), sqrtStr(co, c * 2), `${co}√${c * 2}`], [sqrtStr(co + 1, c)], r), h1: H.addsub.h1, h2: `係数を ${sub ? `${a}−${b}` : `${a}+${b}`}=${co}、√${c}はそのまま` };
  }
  // 簡単にしてから： √(m²c) + √(k²c) = (m+k)√c
  const c = rpick(r, PRM), m = r(2, 4), k = r(2, 4);
  const n1 = m * m * c, n2 = k * k * c;
  const ans = sqrtStr(m + k, c);
  return { q: `√${n1} + √${n2} を計算しなさい。`, ans, choices: exprChoices(ans, [sqrtStr(1, n1 + n2), sqrtStr(m * k, c), `${m + k}√${c * 2}`], [sqrtStr(m + k + 1, c)], r), h1: H.addsub.h2, h2: `√${n1}=${m}√${c}、√${n2}=${k}√${c} → ${m + k}√${c}` };
}

// u5 分配法則・展開と値
function genDistr(r, level) {
  if (level === "easy") {
    const [a, b, c] = [rpick(r, PRM), rpick(r, PRM), rpick(r, PRM)];
    if (b === c || a * b === a * c) return { skip: true };
    const t1 = sqrtStr(1, a * b), t2 = sqrtStr(1, a * c);
    const ans = sumStr(t1, t2);
    return { q: `√${a}(√${b}+√${c}) を計算しなさい。`, ans, choices: exprChoices(ans, [sumStr(sqrtStr(1, a + b), sqrtStr(1, a + c)), sumStr(t1, sqrtStr(1, a * c + 1)), sqrtStr(1, a * b + a * c)], [sumStr(sqrtStr(2, a * b), t2)], r), h1: H.dist.h1, h2: `√${a}×√${b}=√${a * b}、√${a}×√${c}=√${a * c}` };
  }
  if (level === "standard") {
    let a = rpick(r, [2, 3, 5, 6, 7, 11]), b = rpick(r, [2, 3, 5, 6, 7, 11]);
    if (a === b) b = a + 1;
    const ans = a - b;
    return { q: `(√${a}+√${b})(√${a}−√${b}) を計算しなさい。`, ans, choices: numChoices(ans, r, [a + b, -(a - b), a * b]), h1: H.dist.h1, h2: `(√a+√b)(√a−√b)=a−b=${a}−${b}` };
  }
  // (√a+√b)² = a+b + 2√(ab)
  const a = rpick(r, PRM), b = rpick(r, PRM.filter((x) => x !== a)), k = a + b;
  const rad = sqrtStr(2, a * b);
  const ans = neg(k) + "+" + rad;
  return { q: `(√${a}+√${b})² を計算しなさい。`, ans, choices: exprChoices(ans, [`${k}`, neg(k) + "+" + sqrtStr(1, a * b), neg(a * b) + "+" + rad], [neg(k + 1) + "+" + rad], r), h1: H.dist.h2, h2: `${a}+${b}+2√${a * b}` };
}

// u6 近似値と有効数字
const EXPS = [-3, -2, -1, 1, 2, 3, 4, 5, 6];
function mantissaOf(k, r) {
  const digits = [r(1, 9)];
  for (let i = 1; i < k; i++) digits.push(r(0, 9));
  return digits;
}
const mantissaStr = (digits) => (digits.length === 1 ? String(digits[0]) : digits[0] + "." + digits.slice(1).join(""));

function genSigFig(r) { // 有効数字の桁数
  const k = r(1, 4);
  const digits = mantissaOf(k, r);
  const n = rpick(r, EXPS);
  const m = mantissaStr(digits);
  return { q: `次の近似値は、有効数字が何桁ですか。　${m}×10${sup(n)}`, ans: k, choices: numChoices(k, r, [k + 1, Math.max(1, k - 1)]), h1: "1≦a<10 の a の部分の桁数が、そのまま有効数字の桁数になる", h2: `${m} は ${k}桁` };
}
function genToSci(r) { // 測定値を a×10ⁿ の形に
  const k = r(2, 3);
  const digits = mantissaOf(k, r);
  const s = r(1, 4);
  const mantInt = Number(digits.join(""));
  const V = mantInt * Math.pow(10, s);
  const n = (k - 1) + s;
  const m = mantissaStr(digits);
  const ans = `${m}×10${sup(n)}`;
  const wrongMant = `${mantInt}×10${sup(s)}`;
  return { q: `${V}（有効数字${k}桁）を、整数部分が1けたの数×10の累乗の形で表しなさい。`, ans, choices: exprChoices(ans, [`${m}×10${sup(n + 1)}`, `${m}×10${sup(n - 1)}`, wrongMant], [`${m}×10${sup(n + 2)}`], r), h1: "整数部分が1桁になるよう小数点を動かした桁数ぶん、10の指数にする", h2: `${V}=${m}×10${sup(n)}` };
}
function genRange(r) { // 真の値の範囲（誤差の限界）
  const wide = r(0, 1) === 0;
  const half = wide ? 5 : 0.5;
  const baseUnit = wide ? 10 : 1;
  const M = r(3, 30) * baseUnit;
  const lo = M - half, hi = M + half;
  const askLo = r(0, 1) === 0;
  const ans = askLo ? lo : hi;
  return {
    q: `${wide ? "十の位" : "小数第1位"}を四捨五入したところ、測定値は${M}になった。真の値の範囲を a≦真の値<b で表すとき、${askLo ? "a" : "b"}の値を求めなさい。`,
    ans,
    choices: numChoices(ans, r, [askLo ? hi : lo, M]),
    h1: "四捨五入する前の値の範囲は、その位のちょうど半分ずつ前後に広がる",
    h2: `真の値の範囲は ${lo}≦真の値<${hi}`,
  };
}
function genApprox(r, level) {
  if (level === "easy") return genSigFig(r);
  if (level === "standard") return genToSci(r);
  return genRange(r); // advanced
}

// 🔥鬼：有理化（分母に√）。答えが a√b になる形に限定（割り切れる）。
function genOniSqrt(r) {
  const b = rpick(r, [2, 3, 5, 7]), k = r(2, 5), a = b * k;   // a/√b = k√b
  const ans = sqrtStr(k, b);
  const q = `${a}/√${b} を有理化して簡単にしなさい。`;
  const variants = [`${a}√${b}/${b}`, sqrtStr(a, b), sqrtStr(k, b * b)];
  const fill = [sqrtStr(k + 1, b), sqrtStr(k - 1 || 1, b), `${a}/√${b}`];
  return { q, ans, choices: exprChoices(ans, variants, fill, r), h1: "分母と分子に √b をかけて分母を整数にする", h2: `${a}/√${b}=${a}√${b}/${b}=${k}√${b}` };
}

// 各レベル10問に拡張：同じ生成器でも id を変えて10問ぶん並べる
// （毎回ランダム生成・答えは sqrtStr 等の構成法で必ず正しい書式になる）
const tens = (idp, suffix, build, skill) =>
  Array.from({ length: 10 }, (_, i) => p(idp + suffix + (i + 1), build, skill));

const lv = (fn, idp, skill) => ({
  easy: tens(idp, "e", (r) => fn(r, "easy"), skill),
  standard: tens(idp, "s", (r) => fn(r, "standard"), skill),
  advanced: tens(idp, "a", (r) => fn(r, "advanced"), skill),
  oni: tens(idp, "o", (r) => genOniSqrt(r), skill), // 🔥鬼（全単元共通：有理化）
});

export const chapter = {
  id: "g3c2",
  name: "平方根",
  emoji: "√",
  color: "#38bdf8",
  grade: 3,
  units: [
    { id: "g3c2u1", name: "平方根を求める・根号をはずす", emoji: "🔎", desc: "√の意味", problems: lv(genRoot, "g3c2u1", "S-SQRT-ROOT") },
    { id: "g3c2u2", name: "根号の変形（a√b ⇄ √a）・大小比較", emoji: "🔄", desc: "a√b と √a", problems: lv(genTrans, "g3c2u2", "S-SQRT-TRANS") },
    { id: "g3c2u3", name: "根号の乗法・除法", emoji: "✖️", desc: "√の積・商", problems: lv(genMulDiv, "g3c2u3", "S-SQRT-MULDIV") },
    { id: "g3c2u4", name: "根号の加法・減法", emoji: "➕", desc: "同類の√をまとめる", problems: lv(genAddSub, "g3c2u4", "S-SQRT-ADDSUB") },
    { id: "g3c2u5", name: "分配法則・展開と値の計算", emoji: "🟰", desc: "√の展開", problems: lv(genDistr, "g3c2u5", "S-SQRT-DIST") },
    { id: "g3c2u6", name: "近似値と有効数字", emoji: "📏", desc: "a×10ⁿの形・真の値の範囲", problems: lv(genApprox, "g3c2u6", "S-SQRT-APPROX") },
  ],
};
