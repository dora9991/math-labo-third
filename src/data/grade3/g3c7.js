// ============================================================
// g3c7 — 中3「三平方の定理」（★自動作問版）
//  三平方数(ピタゴラス数)で整数、それ以外は √ を簡約して答える。
// ============================================================
import { sqrtStr, neg, exprChoices, numChoices } from "../_algebra.js";

const p = (id, build, skill = null) => ({ id, build, skill });
const rpick = (r, arr) => arr[r(0, arr.length - 1)];
const TRI = [[3, 4, 5], [6, 8, 10], [5, 12, 13], [8, 15, 17], [9, 12, 15], [7, 24, 25], [20, 21, 29], [9, 40, 41]];

const H = {
  basic: { h1: "直角三角形では a²+b²=c²（c は斜辺）", h2: "斜辺 c=√(a²+b²)、他の辺 b=√(c²−a²)" },
  special: { h1: "直角二等辺(45°)は 1:1:√2、30°60°90°は 1:2:√3", h2: "辺の比にあてはめて求める" },
  plane: { h1: "対角線や高さは直角三角形をつくって三平方の定理", h2: "正方形の対角線=1辺×√2、長方形=√(縦²+横²)" },
  space: { h1: "2点間の距離=√((xの差)²+(yの差)²)", h2: "直方体の対角線=√(縦²+横²+高さ²)" },
};


// ============================================================
// 2026-09-30：各難度を「幅の広い生成器」にする（それまでは9〜10問の固定問題が中心で、同じ問題ばかり出た）
//  ピタゴラス数は k 倍、√ の答えはランダムな2辺から。鬼は2段階の問題も入れる。
// ============================================================
const isSq = (n) => Number.isInteger(Math.sqrt(n));
const triple = (r, kMax = 3) => { const [a, b, c] = rpick(r, TRI.slice(0, 6)); const k = r(1, kMax); return r(0, 1) ? [a * k, b * k, c * k] : [b * k, a * k, c * k]; };
const nonTriple = (r, max = 8) => { let a, b, g = 0; do { a = r(1, max); b = r(1, max); g++; } while (isSq(a * a + b * b) && g < 50); return [a, b]; };
const QUAD = [[1, 2, 2, 3], [2, 3, 6, 7], [1, 4, 8, 9], [4, 4, 7, 9], [2, 6, 9, 11], [6, 6, 7, 11], [3, 4, 12, 13]]; // a²+b²+c²=d²

function genU1(r, level) {
  if (level === "easy") { const [a, b, c] = triple(r); return { q: `直角をはさむ2辺が ${a}cm と ${b}cm の直角三角形の斜辺の長さは何cmですか。`, ans: c, choices: numChoices(c, r, [a + b, c - 1, b]), h1: H.basic.h1, h2: `√(${a}²+${b}²)=√${a * a + b * b}=${c}` }; }
  if (level === "standard") { const [a, b, c] = triple(r); return { q: `斜辺が ${c}cm、他の1辺が ${a}cm の直角三角形の残りの辺の長さは何cmですか。`, ans: b, choices: numChoices(b, r, [c - a, c + a, a]), h1: H.basic.h1, h2: `√(${c}²−${a}²)=√${c * c - a * a}=${b}` }; }
  if (level === "advanced") { const [a, b] = nonTriple(r), n = a * a + b * b, ans = sqrtStr(1, n); return { q: `直角をはさむ2辺が ${a}cm と ${b}cm の直角三角形の斜辺の長さを求めなさい。`, ans, choices: exprChoices(ans, [`${a + b}`, `√${n + 1}`, `${a * b}`], [sqrtStr(1, n + 2), `√${n}`], r), h1: H.basic.h1, h2: `√(${a}²+${b}²)=√${n}` }; }
  let c, a, g = 0; do { c = r(4, 12); a = r(1, c - 1); g++; } while (isSq(c * c - a * a) && g < 50);
  const n = c * c - a * a, ans = sqrtStr(1, n);
  return { q: `斜辺が ${c}cm、他の1辺が ${a}cm の直角三角形の残りの辺の長さを求めなさい。`, ans, choices: exprChoices(ans, [`${c - a}`, sqrtStr(1, c * c + a * a), `√${n + 1}`], [sqrtStr(1, n + 2)], r), h1: "残りの辺 b は b²=c²−a²", h2: `√(${c}²−${a}²)=√${n}` };
}
function genU2(r, level) {
  if (level === "easy") { const L = r(2, 12), ans = sqrtStr(L, 2); return { q: `直角二等辺三角形で、直角をはさむ辺が ${L}cm のとき、斜辺の長さを求めなさい。`, ans, choices: exprChoices(ans, [`${L}`, `${2 * L}`, sqrtStr(L, 3)], [sqrtStr(L + 1, 2)], r), h1: H.special.h1, h2: `${L}×√2＝${L}√2` }; }
  if (level === "standard") { const sh = r(2, 12); if (r(0, 1)) { const ans = sqrtStr(sh, 3); return { q: `30°,60°,90° の直角三角形で、最も短い辺が ${sh}cm のとき、残りの直角をはさむ辺（60°の対辺）の長さを求めなさい。`, ans, choices: exprChoices(ans, [`${2 * sh}`, sqrtStr(sh, 2), `${sh}`], [sqrtStr(sh + 1, 3)], r), h1: H.special.h1, h2: `短い辺×√3＝${sh}√3` }; } return { q: `30°,60°,90° の直角三角形で、最も短い辺が ${sh}cm のとき、斜辺の長さは何cmですか。`, ans: 2 * sh, choices: numChoices(2 * sh, r, [sh, 3 * sh, sh + 2]), h1: H.special.h1, h2: `斜辺＝短い辺×2` }; }
  if (level === "advanced") { const Hh = 2 * r(2, 12), ans = sqrtStr(Hh / 2, 2); return { q: `直角二等辺三角形で、斜辺が ${Hh}cm のとき、直角をはさむ1辺の長さを求めなさい。`, ans, choices: exprChoices(ans, [`${Hh / 2}`, sqrtStr(Hh, 2), `${Hh}`], [sqrtStr(Hh / 2 + 1, 2)], r), h1: H.special.h1, h2: `斜辺÷√2＝${Hh}/√2＝${Hh / 2}√2` }; }
  if (r(0, 1)) { const hh = 2 * r(2, 12), ans = sqrtStr(hh / 2, 3); return { q: `30°,60°,90° の直角三角形で、斜辺が ${hh}cm のとき、最も長い辺（60°の対辺）の長さを求めなさい。`, ans, choices: exprChoices(ans, [`${hh / 2}`, sqrtStr(hh, 3), `${hh}`], [sqrtStr(hh / 2 + 1, 3)], r), h1: H.special.h1, h2: `斜辺の半分×√3` }; }
  const m = r(2, 10);
  return { q: `30°,60°,90° の直角三角形で、60°の対辺が ${m}√3cm のとき、斜辺の長さは何cmですか。`, ans: 2 * m, choices: numChoices(2 * m, r, [m, 3 * m, 2 * m + 2]), h1: "1:2:√3 のどこに当たるかを考える", h2: `短い辺=${m}、斜辺=${m}×2` };
}
function genU3(r, level) {
  if (level === "easy") { const sd = r(2, 12), ans = sqrtStr(sd, 2); return { q: `1辺 ${sd}cm の正方形の対角線の長さを求めなさい。`, ans, choices: exprChoices(ans, [`${sd}`, `${2 * sd}`, sqrtStr(sd, 3)], [sqrtStr(sd + 1, 2)], r), h1: H.plane.h2, h2: `${sd}×√2＝${sd}√2` }; }
  if (level === "standard") { const [a, b] = nonTriple(r, 9), n = a * a + b * b, ans = sqrtStr(1, n); return { q: `縦 ${a}cm、横 ${b}cm の長方形の対角線の長さを求めなさい。`, ans, choices: exprChoices(ans, [`${a + b}`, `√${n + 2}`, `${a * b}`], [sqrtStr(1, n + 1)], r), h1: H.plane.h2, h2: `√(${a}²+${b}²)=√${n}` }; }
  if (level === "advanced") { const sd = 2 * r(2, 12), ans = sqrtStr(sd / 2, 3); return { q: `1辺 ${sd}cm の正三角形の高さを求めなさい。`, ans, choices: exprChoices(ans, [sqrtStr(sd, 3), `${sd / 2}`, sqrtStr(sd / 2, 2)], [sqrtStr(sd / 2 + 1, 3)], r), h1: "高さは1辺の半分を底辺とする直角三角形で求める", h2: `(${sd}/2)×√3＝${sd / 2}√3` }; }
  if (r(0, 1)) { const sd = 2 * r(2, 12), k = (sd * sd) / 4, ans = sqrtStr(k, 3); return { q: `1辺 ${sd}cm の正三角形の面積を求めなさい。（単位は cm²）`, ans, choices: exprChoices(ans, [`${(sd * sd) / 2}`, sqrtStr(sd, 3), `${sd * sd}`], [sqrtStr(k + 1, 3)], r), h1: "正三角形の面積＝(1/2)×1辺×高さ。高さ=(1辺÷2)×√3", h2: `(1/2)×${sd}×${sd / 2}√3＝${k}√3` }; }
  const [hf, hgt, c] = triple(r, 2), base = 2 * hf, area = hf * hgt;
  return { q: `2辺が ${c}cm、底辺が ${base}cm の二等辺三角形の面積を求めなさい。（単位は cm²）`, ans: area, choices: numChoices(area, r, [base * hgt, base * c / 2, hf * c]), h1: "頂点から底辺に垂線をひくと、底辺が半分に分かれる", h2: `高さ=√(${c}²−${hf}²)=${hgt}、面積=${base}×${hgt}÷2` };
}
function genU4(r, level) {
  if (level === "easy") { const [a, b, c] = triple(r), x1 = r(-3, 3), y1 = r(-3, 3); return { q: `2点 A(${neg(x1)}, ${neg(y1)})、B(${neg(x1 + a)}, ${neg(y1 + b)}) の間の距離を求めなさい。`, ans: c, choices: numChoices(c, r, [a + b, c - 1, a]), h1: H.space.h1, h2: `√(${a}²+${b}²)=${c}` }; }
  if (level === "standard") { const [a, b] = nonTriple(r, 7), x1 = r(-3, 3), y1 = r(-3, 3), n = a * a + b * b, ans = sqrtStr(1, n), sx = r(0, 1) ? 1 : -1; return { q: `2点 A(${neg(x1)}, ${neg(y1)})、B(${neg(x1 + sx * a)}, ${neg(y1 - b)}) の間の距離を求めなさい。`, ans, choices: exprChoices(ans, [`${a + b}`, `√${n + 1}`, `${a * b}`], [sqrtStr(1, n + 2)], r), h1: H.space.h1, h2: `x の差 ${a}、y の差 ${b} → √(${a}²+${b}²)=√${n}` }; }
  if (level === "advanced") { const a = r(1, 7), b = r(1, 7), c = r(1, 7), n = a * a + b * b + c * c, ans = sqrtStr(1, n); return { q: `縦 ${a}cm、横 ${b}cm、高さ ${c}cm の直方体の対角線の長さを求めなさい。`, ans, choices: exprChoices(ans, [`${a + b + c}`, `√${n + 1}`, sqrtStr(1, a * a + b * b)], [sqrtStr(1, n + 2)], r), h1: H.space.h2, h2: `√(${a}²+${b}²+${c}²)=√${n}` }; }
  if (r(0, 1)) { const a = r(2, 12); return { q: `1辺 ${a}cm の立方体の対角線の長さを求めなさい。`, ans: sqrtStr(a, 3), choices: exprChoices(sqrtStr(a, 3), [`${3 * a}`, sqrtStr(a, 2), `${a}`], [sqrtStr(1, 3 * a * a + 1)], r), h1: H.space.h2, h2: `√(${a}²+${a}²+${a}²)=${a}√3` }; }
  const [a, b, c, d] = rpick(r, QUAD), k = r(1, 2);
  return { q: `縦 ${a * k}cm、横 ${b * k}cm の直方体の対角線の長さが ${d * k}cm のとき、高さは何cmですか。`, ans: c * k, choices: numChoices(c * k, r, [d * k - a * k, (d - b) * k, (a + b) * k]), h1: "対角線²＝縦²＋横²＋高さ² から高さを逆算する", h2: `高さ²=${d * k}²−${a * k}²−${b * k}²` };
}
const ten = (idp, letter, fn, level, skill) => Array.from({ length: 10 }, (_, i) => p(`${idp}${letter}${i + 1}`, (r) => fn(r, level), skill));
const lv10 = (fn, idp, skill) => ({ easy: ten(idp, "e", fn, "easy", skill), standard: ten(idp, "s", fn, "standard", skill), advanced: ten(idp, "a", fn, "advanced", skill), oni: ten(idp, "o", fn, "oni", skill) });

export const chapter = {
  id: "g3c7",
  name: "三平方の定理",
  emoji: "📐",
  color: "#fb7185",
  grade: 3,
  units: [
    { id: "g3c7u1", name: "三平方の定理（辺の長さを求める）", emoji: "📏", desc: "a²+b²=c²", problems: lv10(genU1, "g3c7u1", "S-PYT-BASIC") },
    { id: "g3c7u2", name: "三平方の定理（特別な直角三角形）", emoji: "🔺", desc: "1:1:√2 / 1:2:√3", problems: lv10(genU2, "g3c7u2", "S-PYT-SPECIAL") },
    { id: "g3c7u3", name: "三平方の定理（平面図形への利用）", emoji: "⬛", desc: "対角線・高さ", problems: lv10(genU3, "g3c7u3", "S-PYT-PLANE") },
    { id: "g3c7u4", name: "三平方の定理（座標・空間図形）", emoji: "🧊", desc: "距離・対角線", problems: lv10(genU4, "g3c7u4", "S-PYT-SPACE") },
  ],
};
