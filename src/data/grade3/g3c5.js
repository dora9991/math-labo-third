// ============================================================
// g3c5 — 中3「相似な図形」（★自動作問版）
//  比例式・面積比/体積比・影の測定。整数になるよう構成。
// ============================================================
import { exprChoices, numChoices } from "../_algebra.js";

const p = (id, build, skill = null) => ({ id, build, skill });
const rpick = (r, arr) => arr[r(0, arr.length - 1)];
const COP = [[1, 2], [2, 3], [1, 3], [3, 4], [2, 5], [3, 5], [1, 4], [4, 5], [3, 7]]; // 互いに素

const H = {
  prop: { h1: "a:b=c:x のとき、外側どうし・内側どうしの積が等しい（ax=bc）", h2: "x = b×c ÷ a" },
  ratio: { h1: "相似比 m:n のとき、面積比 m²:n²、体積比 m³:n³", h2: "辺の比を2乗すると面積比、3乗すると体積比" },
};

// u1 比例式とxの値： a:b = c:x
function genProp(r, level) {
  const [pp, qq] = rpick(r, COP);                  // 比 pp:qq（互いに素）
  const s = level === "easy" ? r(2, 4) : r(2, 5);  // 左側の倍率
  const u = level === "easy" ? r(2, 4) : level === "standard" ? r(3, 6) : r(5, 9); // 右側の倍率（発展ほど大きい）
  const A = pp * s, B = qq * s, C = pp * u, D = qq * u; // A:B = C:D（必ず成立）
  if (level === "easy") {
    return { q: `比例式 ${A}:${B} = ${C}:x が成り立つとき、x の値を求めなさい。`, ans: D, choices: numChoices(D, r, [C, B, C - A + B]), h1: H.prop.h1, h2: `x=${B}×${C}÷${A}=${D}` };
  }
  if (level === "standard") {
    return { q: `比例式 ${A}:${B} = x:${D} が成り立つとき、x の値を求めなさい。`, ans: C, choices: numChoices(C, r, [D, A, A + D - B]), h1: H.prop.h1, h2: `x=${A}×${D}÷${B}=${C}` };
  }
  // 発展：x が内項（大きめの数）
  return { q: `比例式 ${A}:x = ${C}:${D} が成り立つとき、x の値を求めなさい。`, ans: B, choices: numChoices(B, r, [C, D, A + D - C]), h1: "a:x=c:d のとき a×d = x×c", h2: `x=${A}×${D}÷${C}=${B}` };
}

// u2 面積比・体積比
function genRatio(r, level) {
  const [m, n] = rpick(r, COP);
  if (level === "advanced") {
    const ans = `${m * m * m}:${n * n * n}`;
    return { q: `相似比が ${m}:${n} の2つの立体の体積比を求めなさい。`, ans, choices: exprChoices(ans, [`${m}:${n}`, `${m * m}:${n * n}`, `${n * n * n}:${m * m * m}`], [`${m * m}:${n * n * n}`], r), h1: H.ratio.h1, h2: `${m}³:${n}³=${m * m * m}:${n * n * n}` };
  }
  const ans = `${m * m}:${n * n}`;
  return { q: `相似比が ${m}:${n} の2つの図形の面積比を求めなさい。`, ans, choices: exprChoices(ans, [`${m}:${n}`, `${m * m * m}:${n * n * n}`, `${n * n}:${m * m}`], [`${m}:${n * n}`], r), h1: H.ratio.h1, h2: `${m}²:${n}²=${m * m}:${n * n}` };
}

// u3 影と測定（相似の利用）
function genShadow(r) {
  const h = r(1, 3), s = r(1, 4), t = r(2, 5);
  const treeShadow = s * t, x = h * t;
  return { q: `高さ ${h}m の棒の影が ${s}m のとき、同じ時刻に影が ${treeShadow}m の木の高さは何mですか。`, ans: x, choices: numChoices(x, r, [treeShadow - s + h, h + treeShadow - s, treeShadow]), h1: "同じ時刻なら 高さ:影 の比は等しい", h2: `${h}:${s} = x:${treeShadow} → x=${x}` };
}

// ── 🔥鬼（oni）：各単元の応用難問。答えは1つの数値、必ず割り切れる構成 ──

// u1 鬼：平行線と線分の比／中点連結の応用。DE//BC, AD:DB=p:q, DE → BC を求める
//   AD:AB = p:(p+q) より DE:BC = p:(p+q) なので BC = DE×(p+q)÷p（pで割り切れる長さにする）
function genOniProp(r) {
  const [pp, qq] = rpick(r, COP);
  const k = r(2, 6);
  const DE = pp * k;                       // DE は pp の倍数 → BC が必ず整数
  const BC = DE * (pp + qq) / pp;          // = (pp+qq)×k
  return { q: `△ABC で DE//BC、点D・EはそれぞれAB・AC上にあります。AD:DB=${pp}:${qq}、DE=${DE} のとき、BC の長さを求めなさい。`, ans: BC, choices: numChoices(BC, r, [DE + qq, DE * qq / pp + DE, DE + DE]), h1: "DE//BC のとき AD:AB=DE:BC（AD:AB=AD:(AD+DB)）", h2: `DE:BC=${pp}:${pp + qq} → BC=${DE}×${pp + qq}÷${pp}=${BC}` };
}

// u2 鬼：相似比から実際の面積・体積を求める。小さい方の面積/体積→大きい方
//   面積比 m²:n²（または体積比 m³:n³）。S=m²t と置けば大きい方 n²t は必ず整数
function genOniRatio(r) {
  const [m, n] = rpick(r, COP);            // m<n
  const t = r(2, 6);
  if (r(0, 1) === 0) {
    const Ssmall = m * m * t, Sbig = n * n * t;
    return { q: `相似な2つの図形があり、相似比は ${m}:${n} です。小さい方の面積が ${Ssmall}cm² のとき、大きい方の面積を求めなさい。`, ans: Sbig, choices: numChoices(Sbig, r, [Ssmall * n / m, Ssmall + (n - m), Ssmall * (n - m)]), h1: H.ratio.h1, h2: `面積比 ${m}²:${n}²=${m * m}:${n * n}。${Ssmall}×${n * n}÷${m * m}=${Sbig}` };
  }
  const Vsmall = m * m * m * t, Vbig = n * n * n * t;
  return { q: `相似な2つの立体があり、相似比は ${m}:${n} です。小さい方の体積が ${Vsmall}cm³ のとき、大きい方の体積を求めなさい。`, ans: Vbig, choices: numChoices(Vbig, r, [Vsmall * n / m, Vsmall * (n * n) / (m * m), Vsmall + Vsmall]), h1: H.ratio.h1, h2: `体積比 ${m}³:${n}³=${m * m * m}:${n * n * n}。${Vsmall}×${n * n * n}÷${m * m * m}=${Vbig}` };
}

// u3 鬼：縮図（地図の縮尺）の応用。縮尺 1:N、地図上 a cm → 実際の距離（m）
//   実際の長さ = a×N cm = a×N÷100 m（100で割り切れる N のみ採用）
function genOniShadow(r) {
  const N = rpick(r, [1000, 2000, 5000, 10000, 25000, 50000]);
  const aCm = r(2, 12);
  const realM = aCm * N / 100;             // N は全て100の倍数 → 必ず整数
  return { q: `縮尺 1:${N} の地図上で、2地点間の長さが ${aCm}cm でした。実際の距離は何mですか。`, ans: realM, choices: numChoices(realM, r, [aCm * N, realM / 10, realM * 10]), h1: "縮尺 1:N は『地図上の長さ×N＝実際の長さ』。単位はcm→mに直す", h2: `${aCm}×${N}=${aCm * N}cm=${realM}m` };
}

// 各レベル10問に拡張：同じ生成器を id を変えて10個並べる（毎回ランダム生成）
const tens = (idp, suffix, build, skill) =>
  Array.from({ length: 10 }, (_, i) => p(idp + suffix + (i + 1), build, skill));

const lv = (fn, oni, idp, skill) => ({
  easy: tens(idp, "e", (r) => fn(r, "easy"), skill),
  standard: tens(idp, "s", (r) => fn(r, "standard"), skill),
  advanced: tens(idp, "a", (r) => fn(r, "advanced"), skill),
  oni: tens(idp, "o", (r) => oni(r), skill),
});

export const chapter = {
  id: "g3c5",
  name: "相似な図形",
  emoji: "🔺",
  color: "#a78bfa",
  grade: 3,
  units: [
    { id: "g3c5u1", name: "比例式とxの値", emoji: "➗", desc: "a:b=c:x", problems: lv(genProp, genOniProp, "g3c5u1", "S-SIM-PROP") },
    { id: "g3c5u2", name: "相似な図形の面積比・体積比", emoji: "📐", desc: "m²:n²・m³:n³", problems: lv(genRatio, genOniRatio, "g3c5u2", "S-SIM-RATIO") },
    { id: "g3c5u3", name: "相似の利用（影と測定）", emoji: "🌳", desc: "影で高さを測る", problems: lv(genShadow, genOniShadow, "g3c5u3", "S-SIM-USE") },
  ],
};
