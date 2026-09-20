// ============================================================
// g3c7 — 中3「三平方の定理」（★自動作問版）
//  三平方数(ピタゴラス数)で整数、それ以外は √ を簡約して答える。
// ============================================================
import { sqrtStr, neg, exprChoices, numChoices } from "../_algebra.js";

const p = (id, build, skill = null) => ({ id, build, skill });
const rpick = (r, arr) => arr[r(0, arr.length - 1)];
const TRI = [[3, 4, 5], [6, 8, 10], [5, 12, 13], [8, 15, 17], [9, 12, 15], [7, 24, 25], [20, 21, 29], [9, 40, 41]];
const NONTRI = [[2, 3], [2, 2], [3, 5], [1, 3], [2, 5], [3, 7], [4, 5], [1, 4], [5, 6]];

const H = {
  basic: { h1: "直角三角形では a²+b²=c²（c は斜辺）", h2: "斜辺 c=√(a²+b²)、他の辺 b=√(c²−a²)" },
  special: { h1: "直角二等辺(45°)は 1:1:√2、30°60°90°は 1:2:√3", h2: "辺の比にあてはめて求める" },
  plane: { h1: "対角線や高さは直角三角形をつくって三平方の定理", h2: "正方形の対角線=1辺×√2、長方形=√(縦²+横²)" },
  space: { h1: "2点間の距離=√((xの差)²+(yの差)²)", h2: "直方体の対角線=√(縦²+横²+高さ²)" },
};

// u1 辺の長さ
function genBasic(r, level) {
  if (level === "easy") {
    const [a, b, c] = rpick(r, TRI);
    return { q: `直角をはさむ2辺が ${a}cm と ${b}cm の直角三角形の斜辺の長さは何cmですか。`, ans: c, choices: numChoices(c, r, [a + b, c - 1, b]), h1: H.basic.h1, h2: `√(${a}²+${b}²)=√${a * a + b * b}=${c}` };
  }
  if (level === "standard") {
    const [a, b, c] = rpick(r, TRI);
    return { q: `斜辺が ${c}cm、他の1辺が ${a}cm の直角三角形の残りの辺の長さは何cmですか。`, ans: b, choices: numChoices(b, r, [c - a, c + a, a]), h1: H.basic.h1, h2: `√(${c}²−${a}²)=√${c * c - a * a}=${b}` };
  }
  const [a, b] = rpick(r, NONTRI), n = a * a + b * b, ans = sqrtStr(1, n);
  return { q: `直角をはさむ2辺が ${a}cm と ${b}cm の直角三角形の斜辺の長さを求めなさい。`, ans, choices: exprChoices(ans, [`${a + b}`, `√${n + 1}`, `${a * b}`], [sqrtStr(1, n + 1), `√${n}`], r), h1: H.basic.h1, h2: `√(${a}²+${b}²)=√${n}` };
}

// u2 特別な直角三角形
function genSpecial(r, level) {
  if (level === "easy") {
    const L = r(2, 8), ans = sqrtStr(L, 2);
    return { q: `直角二等辺三角形で、直角をはさむ辺が ${L}cm のとき、斜辺の長さを求めなさい。`, ans, choices: exprChoices(ans, [`${L}`, `${2 * L}`, sqrtStr(L, 3)], [sqrtStr(L + 1, 2)], r), h1: H.special.h1, h2: `${L}×√2＝${L}√2` };
  }
  if (level === "standard") {
    const s = r(2, 8), ans = sqrtStr(s, 3);
    return { q: `30°,60°,90° の直角三角形で、最も短い辺が ${s}cm のとき、残りの直角をはさむ辺（60°の対辺）の長さを求めなさい。`, ans, choices: exprChoices(ans, [`${2 * s}`, sqrtStr(s, 2), `${s}`], [sqrtStr(s + 1, 3)], r), h1: H.special.h1, h2: `短い辺×√3＝${s}√3` };
  }
  const Heven = 2 * r(2, 6), ans = sqrtStr(Heven / 2, 2);   // 斜辺H → 1辺 = H/√2 = (H/2)√2
  return { q: `直角二等辺三角形で、斜辺が ${Heven}cm のとき、直角をはさむ1辺の長さを求めなさい。`, ans, choices: exprChoices(ans, [`${Heven / 2}`, sqrtStr(Heven, 2), `${Heven}`], [sqrtStr(Heven / 2 + 1, 2)], r), h1: H.special.h1, h2: `斜辺÷√2＝${Heven}/√2＝${Heven / 2}√2` };
}

// u3 平面図形への利用
function genPlane(r, level) {
  if (level === "easy") {
    const s = r(2, 9), ans = sqrtStr(s, 2);
    return { q: `1辺 ${s}cm の正方形の対角線の長さを求めなさい。`, ans, choices: exprChoices(ans, [`${s}`, `${2 * s}`, sqrtStr(s, 3)], [sqrtStr(s, 2 * 1) === ans ? sqrtStr(s + 1, 2) : sqrtStr(s + 1, 2)], r), h1: H.plane.h2, h2: `${s}×√2＝${s}√2` };
  }
  if (level === "standard") {
    const [a, b] = rpick(r, NONTRI), n = a * a + b * b, ans = sqrtStr(1, n);
    return { q: `縦 ${a}cm、横 ${b}cm の長方形の対角線の長さを求めなさい。`, ans, choices: exprChoices(ans, [`${a + b}`, `√${n + 2}`, `${a * b}`], [sqrtStr(1, n + 1)], r), h1: H.plane.h2, h2: `√(${a}²+${b}²)=√${n}` };
  }
  const sEven = 2 * r(2, 6), ans = sqrtStr(sEven / 2, 3);    // 正三角形の高さ = (s/2)√3
  return { q: `1辺 ${sEven}cm の正三角形の高さを求めなさい。`, ans, choices: exprChoices(ans, [sqrtStr(sEven, 3), `${sEven / 2}`, sqrtStr(sEven / 2, 2)], [sqrtStr(sEven / 2 + 1, 3)], r), h1: "高さは1辺の半分を底辺とする直角三角形で求める", h2: `(${sEven}/2)×√3＝${sEven / 2}√3` };
}

// u4 座標・空間図形
function genSpace(r, level) {
  if (level === "easy") {
    const [a, b, c] = rpick(r, TRI), x1 = r(-3, 3), y1 = r(-3, 3);
    return { q: `2点 A(${neg(x1)}, ${neg(y1)})、B(${neg(x1 + a)}, ${neg(y1 + b)}) の間の距離を求めなさい。`, ans: c, choices: numChoices(c, r, [a + b, c - 1, a]), h1: H.space.h1, h2: `√(${a}²+${b}²)=${c}` };
  }
  if (level === "standard") {
    const [a, b] = rpick(r, NONTRI), x1 = r(-2, 2), y1 = r(-2, 2), n = a * a + b * b, ans = sqrtStr(1, n);
    return { q: `2点 A(${neg(x1)}, ${neg(y1)})、B(${neg(x1 + a)}, ${neg(y1 + b)}) の間の距離を求めなさい。`, ans, choices: exprChoices(ans, [`${a + b}`, `√${n + 1}`, `${a * b}`], [sqrtStr(1, n + 2)], r), h1: H.space.h1, h2: `√(${a}²+${b}²)=√${n}` };
  }
  const a = r(2, 6), b = r(2, 6), c = r(2, 6), n = a * a + b * b + c * c, ans = sqrtStr(1, n);
  return { q: `縦 ${a}cm、横 ${b}cm、高さ ${c}cm の直方体の対角線の長さを求めなさい。`, ans, choices: exprChoices(ans, [`${a + b + c}`, `√${n + 1}`, sqrtStr(1, a * a + b * b)], [sqrtStr(1, n + 2)], r), h1: H.space.h2, h2: `√(${a}²+${b}²+${c}²)=√${n}` };
}

// ============================================================
// 固定問題（各レベル10問にするための追記分。a²+b²=c² を満たす値で作成）
// ============================================================

// ── u1 辺の長さ ──
// easy: ピタゴラス数で斜辺（整数）
const U1E = [[3, 4, 5], [6, 8, 10], [5, 12, 13], [8, 15, 17], [9, 12, 15], [7, 24, 25], [20, 21, 29], [9, 40, 41], [12, 16, 20]];
const u1easy = U1E.map(([a, b, c], i) => p(`g3c7u1e${i + 2}`, () => ({ q: `直角をはさむ2辺が ${a}cm と ${b}cm の直角三角形の斜辺の長さは何cmですか。`, ans: c, choices: numChoices(c, null, [a + b, c - 1, b]), h1: H.basic.h1, h2: `√(${a}²+${b}²)=√${a * a + b * b}=${c}` }), "S-PYT-BASIC"));
// standard: 斜辺と1辺から残りの辺（整数）。[a=与える辺, b=答え, c=斜辺]
const U1S = [[3, 4, 5], [8, 6, 10], [5, 12, 13], [8, 15, 17], [12, 9, 15], [7, 24, 25], [20, 21, 29], [40, 9, 41], [12, 16, 20]];
const u1std = U1S.map(([a, b, c], i) => p(`g3c7u1s${i + 2}`, () => ({ q: `斜辺が ${c}cm、他の1辺が ${a}cm の直角三角形の残りの辺の長さは何cmですか。`, ans: b, choices: numChoices(b, null, [c - a, c + a, a]), h1: H.basic.h1, h2: `√(${c}²−${a}²)=√${c * c - a * a}=${b}` }), "S-PYT-BASIC"));
// advanced: ピタゴラス数でない2辺から斜辺（√）
const U1A = [[2, 3], [2, 2], [3, 5], [1, 3], [2, 5], [3, 7], [4, 5], [1, 4], [5, 6]];
const u1adv = U1A.map(([a, b], i) => { const n = a * a + b * b, ans = sqrtStr(1, n); return p(`g3c7u1a${i + 2}`, () => ({ q: `直角をはさむ2辺が ${a}cm と ${b}cm の直角三角形の斜辺の長さを求めなさい。`, ans, choices: exprChoices(ans, [`${a + b}`, `√${n + 1}`, `${a * b}`], [sqrtStr(1, n + 1), `√${n}`], null), h1: H.basic.h1, h2: `√(${a}²+${b}²)=√${n}` }), "S-PYT-BASIC"); });
// oni: より大きい2辺の斜辺（√）。答えは1つに定まる
const U1O = [[11, 13], [6, 10], [7, 9], [10, 11], [6, 9], [4, 8], [11, 11], [5, 9], [7, 11], [8, 9]];
const u1oni = U1O.map(([a, b], i) => { const n = a * a + b * b, ans = sqrtStr(1, n); return p(`g3c7u1o${i + 1}`, () => ({ q: `直角をはさむ2辺が ${a}cm と ${b}cm の直角三角形の斜辺の長さを求めなさい。`, ans, choices: exprChoices(ans, [`${a + b}`, `√${n + 1}`, `${a * b}`], [sqrtStr(1, n + 2), `√${n}`], null), h1: H.basic.h1, h2: `√(${a}²+${b}²)=√${n}=${ans}` }), "S-PYT-BASIC"); });

// ── u2 特別な直角三角形 ──
// easy: 直角二等辺、直角をはさむ辺L → 斜辺 L√2
const U2E = [2, 3, 4, 5, 6, 7, 8, 9, 11];
const u2easy = U2E.map((L, i) => { const ans = sqrtStr(L, 2); return p(`g3c7u2e${i + 2}`, () => ({ q: `直角二等辺三角形で、直角をはさむ辺が ${L}cm のとき、斜辺の長さを求めなさい。`, ans, choices: exprChoices(ans, [`${L}`, `${2 * L}`, sqrtStr(L, 3)], [sqrtStr(L + 1, 2)], null), h1: H.special.h1, h2: `${L}×√2＝${L}√2` }), "S-PYT-SPECIAL"); });
// standard: 30-60-90、最も短い辺s → 60°の対辺 s√3
const U2S = [2, 3, 4, 5, 6, 7, 8, 9, 11];
const u2std = U2S.map((s, i) => { const ans = sqrtStr(s, 3); return p(`g3c7u2s${i + 2}`, () => ({ q: `30°,60°,90° の直角三角形で、最も短い辺が ${s}cm のとき、残りの直角をはさむ辺（60°の対辺）の長さを求めなさい。`, ans, choices: exprChoices(ans, [`${2 * s}`, sqrtStr(s, 2), `${s}`], [sqrtStr(s + 1, 3)], null), h1: H.special.h1, h2: `短い辺×√3＝${s}√3` }), "S-PYT-SPECIAL"); });
// advanced: 直角二等辺、斜辺H(偶数) → 1辺 (H/2)√2
const U2A = [4, 6, 8, 10, 12, 14, 16, 18, 22];
const u2adv = U2A.map((Hh, i) => { const ans = sqrtStr(Hh / 2, 2); return p(`g3c7u2a${i + 2}`, () => ({ q: `直角二等辺三角形で、斜辺が ${Hh}cm のとき、直角をはさむ1辺の長さを求めなさい。`, ans, choices: exprChoices(ans, [`${Hh / 2}`, sqrtStr(Hh, 2), `${Hh}`], [sqrtStr(Hh / 2 + 1, 2)], null), h1: H.special.h1, h2: `斜辺÷√2＝${Hh}/√2＝${Hh / 2}√2` }), "S-PYT-SPECIAL"); });
// oni: 30-60-90、斜辺h(偶数) → 最も長い辺（60°の対辺）= (h/2)√3
const U2O = [4, 6, 8, 10, 12, 14, 16, 18, 20, 22];
const u2oni = U2O.map((hh, i) => { const ans = sqrtStr(hh / 2, 3); return p(`g3c7u2o${i + 1}`, () => ({ q: `30°,60°,90° の直角三角形で、斜辺が ${hh}cm のとき、最も長い辺（60°の対辺）の長さを求めなさい。`, ans, choices: exprChoices(ans, [`${hh / 2}`, sqrtStr(hh, 3), `${hh}`], [sqrtStr(hh / 2 + 1, 3)], null), h1: H.special.h1, h2: `斜辺の半分×√3＝(${hh}/2)√3＝${ans}` }), "S-PYT-SPECIAL"); });

// ── u3 平面図形への利用 ──
// easy: 1辺sの正方形 → 対角線 s√2
const U3E = [2, 3, 4, 5, 6, 7, 8, 9, 11];
const u3easy = U3E.map((s, i) => { const ans = sqrtStr(s, 2); return p(`g3c7u3e${i + 2}`, () => ({ q: `1辺 ${s}cm の正方形の対角線の長さを求めなさい。`, ans, choices: exprChoices(ans, [`${s}`, `${2 * s}`, sqrtStr(s, 3)], [sqrtStr(s + 1, 2)], null), h1: H.plane.h2, h2: `${s}×√2＝${s}√2` }), "S-PYT-PLANE"); });
// standard: 縦a横bの長方形（非ピタゴラス）→ 対角線 √(a²+b²)
const U3S = [[2, 3], [2, 2], [3, 5], [1, 3], [2, 5], [3, 7], [4, 5], [1, 4], [5, 6]];
const u3std = U3S.map(([a, b], i) => { const n = a * a + b * b, ans = sqrtStr(1, n); return p(`g3c7u3s${i + 2}`, () => ({ q: `縦 ${a}cm、横 ${b}cm の長方形の対角線の長さを求めなさい。`, ans, choices: exprChoices(ans, [`${a + b}`, `√${n + 2}`, `${a * b}`], [sqrtStr(1, n + 1)], null), h1: H.plane.h2, h2: `√(${a}²+${b}²)=√${n}` }), "S-PYT-PLANE"); });
// advanced: 1辺s(偶数)の正三角形 → 高さ (s/2)√3
const U3A = [4, 6, 8, 10, 12, 14, 16, 18, 22];
const u3adv = U3A.map((s, i) => { const ans = sqrtStr(s / 2, 3); return p(`g3c7u3a${i + 2}`, () => ({ q: `1辺 ${s}cm の正三角形の高さを求めなさい。`, ans, choices: exprChoices(ans, [sqrtStr(s, 3), `${s / 2}`, sqrtStr(s / 2, 2)], [sqrtStr(s / 2 + 1, 3)], null), h1: "高さは1辺の半分を底辺とする直角三角形で求める", h2: `(${s}/2)×√3＝${s / 2}√3` }), "S-PYT-PLANE"); });
// oni: 1辺s(偶数)の正三角形の面積 = (s²/4)√3
const U3O = [4, 6, 8, 10, 12, 14, 16, 18, 20, 22];
const u3oni = U3O.map((s, i) => { const k = (s * s) / 4, ans = sqrtStr(k, 3); return p(`g3c7u3o${i + 1}`, () => ({ q: `1辺 ${s}cm の正三角形の面積を求めなさい。（単位は cm²）`, ans, choices: exprChoices(ans, [`${(s * s) / 2}`, sqrtStr(s, 3), `${s * s}`], [sqrtStr(k + 1, 3)], null), h1: "正三角形の面積＝(1/2)×1辺×高さ。高さ=(s/2)√3", h2: `(1/2)×${s}×${s / 2}√3＝${k}√3` }), "S-PYT-PLANE"); });

// ── u4 座標・空間図形 ──
// easy: 2点間の距離（ピタゴラス数）→ 整数
const U4E = [[3, 4, 5], [6, 8, 10], [5, 12, 13], [8, 15, 17], [9, 12, 15], [7, 24, 25], [20, 21, 29], [9, 40, 41], [12, 16, 20]];
const u4easy = U4E.map(([a, b, c], i) => p(`g3c7u4e${i + 2}`, () => ({ q: `2点 A(0, 0)、B(${a}, ${b}) の間の距離を求めなさい。`, ans: c, choices: numChoices(c, null, [a + b, c - 1, a]), h1: H.space.h1, h2: `√(${a}²+${b}²)=√${a * a + b * b}=${c}` }), "S-PYT-SPACE"));
// standard: 2点間の距離（非ピタゴラス）→ √
const U4S = [[2, 3], [2, 2], [3, 5], [1, 3], [2, 5], [3, 7], [4, 5], [1, 4], [5, 6]];
const u4std = U4S.map(([a, b], i) => { const n = a * a + b * b, ans = sqrtStr(1, n); return p(`g3c7u4s${i + 2}`, () => ({ q: `2点 A(0, 0)、B(${a}, ${b}) の間の距離を求めなさい。`, ans, choices: exprChoices(ans, [`${a + b}`, `√${n + 1}`, `${a * b}`], [sqrtStr(1, n + 2)], null), h1: H.space.h1, h2: `√(${a}²+${b}²)=√${n}` }), "S-PYT-SPACE"); });
// advanced: 直方体の対角線 √(a²+b²+c²)
const U4A = [[2, 3, 4], [1, 2, 2], [2, 2, 2], [3, 4, 5], [1, 2, 3], [2, 3, 6], [4, 4, 7], [2, 4, 4], [1, 4, 8]];
const u4adv = U4A.map(([a, b, c], i) => { const n = a * a + b * b + c * c, ans = sqrtStr(1, n); return p(`g3c7u4a${i + 2}`, () => ({ q: `縦 ${a}cm、横 ${b}cm、高さ ${c}cm の直方体の対角線の長さを求めなさい。`, ans, choices: exprChoices(ans, [`${a + b + c}`, `√${n + 1}`, sqrtStr(1, a * a + b * b)], [sqrtStr(1, n + 2)], null), h1: H.space.h2, h2: `√(${a}²+${b}²+${c}²)=√${n}` }), "S-PYT-SPACE"); });
// oni: 立方体の対角線 = 1辺×√3
const U4O = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const u4oni = U4O.map((a, i) => { const n = 3 * a * a, ans = sqrtStr(a, 3); return p(`g3c7u4o${i + 1}`, () => ({ q: `1辺 ${a}cm の立方体の対角線の長さを求めなさい。`, ans, choices: exprChoices(ans, [`${3 * a}`, sqrtStr(a, 2), `${a}`], [sqrtStr(1, n + 1)], null), h1: H.space.h2, h2: `√(${a}²+${a}²+${a}²)=√${n}＝${a}√3` }), "S-PYT-SPACE"); });

const lv = (fn, idp, skill) => ({ easy: [p(idp + "e", (r) => fn(r, "easy"), skill)], standard: [p(idp + "s", (r) => fn(r, "standard"), skill)], advanced: [p(idp + "a", (r) => fn(r, "advanced"), skill)] });

export const chapter = {
  id: "g3c7",
  name: "三平方の定理",
  emoji: "📐",
  color: "#fb7185",
  grade: 3,
  units: [
    { id: "g3c7u1", name: "三平方の定理（辺の長さを求める）", emoji: "📏", desc: "a²+b²=c²", problems: { easy: [p("g3c7u1e", (r) => genBasic(r, "easy"), "S-PYT-BASIC"), ...u1easy], standard: [p("g3c7u1s", (r) => genBasic(r, "standard"), "S-PYT-BASIC"), ...u1std], advanced: [p("g3c7u1a", (r) => genBasic(r, "advanced"), "S-PYT-BASIC"), ...u1adv], oni: u1oni } },
    { id: "g3c7u2", name: "三平方の定理（特別な直角三角形）", emoji: "🔺", desc: "1:1:√2 / 1:2:√3", problems: { easy: [p("g3c7u2e", (r) => genSpecial(r, "easy"), "S-PYT-SPECIAL"), ...u2easy], standard: [p("g3c7u2s", (r) => genSpecial(r, "standard"), "S-PYT-SPECIAL"), ...u2std], advanced: [p("g3c7u2a", (r) => genSpecial(r, "advanced"), "S-PYT-SPECIAL"), ...u2adv], oni: u2oni } },
    { id: "g3c7u3", name: "三平方の定理（平面図形への利用）", emoji: "⬛", desc: "対角線・高さ", problems: { easy: [p("g3c7u3e", (r) => genPlane(r, "easy"), "S-PYT-PLANE"), ...u3easy], standard: [p("g3c7u3s", (r) => genPlane(r, "standard"), "S-PYT-PLANE"), ...u3std], advanced: [p("g3c7u3a", (r) => genPlane(r, "advanced"), "S-PYT-PLANE"), ...u3adv], oni: u3oni } },
    { id: "g3c7u4", name: "三平方の定理（座標・空間図形）", emoji: "🧊", desc: "距離・対角線", problems: { easy: [p("g3c7u4e", (r) => genSpace(r, "easy"), "S-PYT-SPACE"), ...u4easy], standard: [p("g3c7u4s", (r) => genSpace(r, "standard"), "S-PYT-SPACE"), ...u4std], advanced: [p("g3c7u4a", (r) => genSpace(r, "advanced"), "S-PYT-SPACE"), ...u4adv], oni: u4oni } },
  ],
};
