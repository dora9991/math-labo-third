// ============================================================
// g2c2 — 中2「連立方程式」（★自動作問版）
//  整数解 (x0,y0) を先に決め、そこから2つの方程式を逆算して構成（必ず割り切れる）。
//  答えは "x=◯, y=◯"。ありがちな誤答（x,y入れ替え・符号ミス）を4択に。
// ============================================================
import { polyStr, neg, exprChoices } from "../_algebra.js";

const p = (id, build, skill = null) => ({ id, build, skill });

const H = {
  kagen: { h1: "片方の文字の係数をそろえて、たすか引くかで1文字を消そう", h2: "消えた後の1次方程式を解き、求めた値をもとの式に代入する" },
  dainyu: { h1: "y=… の式を、もう一方の式の y に丸ごと代入しよう", h2: "代入して文字を1つにし、解いてからyを求める" },
};
const eqStr = (a, b, c) => `${polyStr([{ c: a, v: { x: 1 } }, { c: b, v: { y: 1 } }])}=${neg(c)}`;
const pairStr = (x, y) => `x=${neg(x)}, y=${neg(y)}`;
const rnz = (r, a, b) => { let v = 0; while (v === 0) v = r(a, b); return v; };

function makeSystem(r, max) {
  const x0 = rnz(r, -5, 5), y0 = rnz(r, -5, 5);
  let a1, b1, a2, b2, guard = 0;
  do {
    a1 = rnz(r, -max, max); b1 = rnz(r, -max, max);
    a2 = rnz(r, -max, max); b2 = rnz(r, -max, max);
    guard++;
  } while (a1 * b2 - a2 * b1 === 0 && guard < 50);
  return { x0, y0, a1, b1, c1: a1 * x0 + b1 * y0, a2, b2, c2: a2 * x0 + b2 * y0 };
}

function pairChoices(x0, y0, r) {
  const ans = pairStr(x0, y0);
  const variants = [pairStr(y0, x0), pairStr(-x0, y0), pairStr(x0, -y0), pairStr(-x0, -y0)];
  const fill = [pairStr(x0 + 1, y0), pairStr(x0, y0 + 1), pairStr(x0 - 1, y0 - 1)];
  return exprChoices(ans, variants, fill, r);
}

function genBasic(r) {
  const s = makeSystem(r, 3);
  return { q: `連立方程式 ${eqStr(s.a1, s.b1, s.c1)}、${eqStr(s.a2, s.b2, s.c2)} を解きなさい。`, ans: pairStr(s.x0, s.y0), choices: pairChoices(s.x0, s.y0, r), h1: H.kagen.h1, h2: H.kagen.h2 };
}
function genKagen(r) {
  const s = makeSystem(r, 5);
  return { q: `連立方程式 ${eqStr(s.a1, s.b1, s.c1)}、${eqStr(s.a2, s.b2, s.c2)} を解きなさい。`, ans: pairStr(s.x0, s.y0), choices: pairChoices(s.x0, s.y0, r), h1: H.kagen.h1, h2: H.kagen.h2 };
}
function genDainyu(r) {
  const x0 = rnz(r, -5, 5), y0 = rnz(r, -5, 5);
  const m = rnz(r, -3, 3);
  const k = y0 - m * x0;
  let a, b, guard = 0;
  do { a = rnz(r, -4, 4); b = rnz(r, -4, 4); guard++; } while ((a + b * m) === 0 && guard < 50);
  const c = a * x0 + b * y0;
  const eq1 = `y=${polyStr([{ c: m, v: { x: 1 } }, { c: k, v: {} }])}`;
  return { q: `連立方程式 ${eq1}、${eqStr(a, b, c)} を解きなさい。`, ans: pairStr(x0, y0), choices: pairChoices(x0, y0, r), h1: H.dainyu.h1, h2: H.dainyu.h2 };
}

// 🔥鬼：係数も解も大きめの連立（消去がやや手間。発展の上）
function genOni(r) {
  const x0 = rnz(r, -8, 8), y0 = rnz(r, -8, 8);
  let a1, b1, a2, b2, g = 0;
  do { a1 = rnz(r, -6, 6); b1 = rnz(r, -6, 6); a2 = rnz(r, -6, 6); b2 = rnz(r, -6, 6); g++; } while (a1 * b2 - a2 * b1 === 0 && g < 50);
  const c1 = a1 * x0 + b1 * y0, c2 = a2 * x0 + b2 * y0;
  return { q: `連立方程式 ${eqStr(a1, b1, c1)}、${eqStr(a2, b2, c2)} を解きなさい。`, ans: pairStr(x0, y0), choices: pairChoices(x0, y0, r), h1: "係数をそろえて1文字を消す（大きい数に注意）", h2: "消去→1次方程式→代入の順で求める" };
}

// 各レベル10問に拡張：同じ生成器でも id を変えて10問ぶん並べる（毎回ランダム生成・解は構成法で必ず正答）
const tens = (idp, suffix, fn, skill) =>
  Array.from({ length: 10 }, (_, i) => p(idp + suffix + (i + 1), fn, skill));

const lv = (fns, idp, skill) => ({
  easy: tens(idp, "e", fns.e, skill),
  standard: tens(idp, "s", fns.s, skill),
  advanced: tens(idp, "a", fns.a, skill),
  oni: tens(idp, "o", genOni, skill), // 🔥鬼（全単元共通：大係数の連立）
});

export const chapter = {
  id: "g2c2",
  name: "連立方程式",
  emoji: "🔗",
  color: "#60a5fa",
  grade: 2,
  units: [
    { id: "g2c2u1", name: "連立方程式の解き方（加減法・代入法）", emoji: "🧩", desc: "1文字を消して解く", problems: lv({ e: genBasic, s: genBasic, a: genKagen }, "g2c2u1", "S-SIM-SOLVE") },
    { id: "g2c2u2", name: "連立方程式（加減法の練習）", emoji: "➕", desc: "係数をそろえて消去", problems: lv({ e: genBasic, s: genKagen, a: genKagen }, "g2c2u2", "S-SIM-KAGEN") },
    { id: "g2c2u3", name: "連立方程式（代入法・かっこ・分数・小数）", emoji: "↪️", desc: "y=… を代入", problems: lv({ e: genDainyu, s: genDainyu, a: genDainyu }, "g2c2u3", "S-SIM-DAINYU") },
  ],
};
