// ============================================================
// g2c5 — 中2「三角形と四角形」（★自動作問版・角度/長さ/面積＝数値）
//  二等辺三角形の角、平行四辺形の角・周、特別な四角形と面積。すべて整数になるよう構成。
// ============================================================
import { numChoices } from "../_algebra.js";

const p = (id, build, skill = null) => ({ id, build, skill });

const H = {
  isos: { h1: "二等辺三角形は2つの底角が等しい。3つの角の和は180°", h2: "底角 = (180−頂角)÷2 ／ 頂角 = 180−底角×2" },
  para: { h1: "平行四辺形は、向かい合う角が等しく、となり合う角の和は180°", h2: "向かい合う辺も等しい。周 = (たて+よこ)×2" },
  area: { h1: "平行四辺形の面積 = 底辺×高さ", h2: "ひし形の面積 = 対角線×対角線÷2" },
};

// ── u1 二等辺三角形・正三角形 ──
function genIsos(r, level) {
  if (level === "easy") {
    const apex = 2 * r(10, 55);            // 偶数20〜110 → 底角は整数
    const base = (180 - apex) / 2;
    return { q: `頂角が ${apex}° の二等辺三角形の1つの底角は何度ですか。`, ans: base, choices: numChoices(base, r, [180 - apex, apex / 2, 90 - apex]), h1: H.isos.h1, h2: H.isos.h2 };
  }
  const base = r(30, 80);
  const apex = 180 - 2 * base;
  if (level === "standard") {
    return { q: `底角が ${base}° の二等辺三角形の頂角は何度ですか。`, ans: apex, choices: numChoices(apex, r, [180 - base, base, 90 - base]), h1: H.isos.h1, h2: H.isos.h2 };
  }
  // advanced: 底角がbase°のとき、頂角の外角は？（=180−頂角=2×底角）
  const ext = 2 * base;
  return { q: `底角が ${base}° の二等辺三角形で、頂角の外角は何度ですか。`, ans: ext, choices: numChoices(ext, r, [apex, base, 180 - base]), h1: "外角 = 180 − 頂角", h2: "頂角=180−底角×2 を使って 180−頂角 を計算" };
}

// ── u2 平行四辺形の性質 ──
function genPara(r, level) {
  const a = r(40, 140);
  if (level === "easy") {
    return { q: `平行四辺形ABCDで ∠A=${a}° のとき、向かい合う ∠C は何度ですか。`, ans: a, choices: numChoices(a, r, [180 - a, 90, 360 - a]), h1: H.para.h1, h2: "向かい合う角は等しい" };
  }
  if (level === "standard") {
    const nb = 180 - a;
    return { q: `平行四辺形ABCDで ∠A=${a}° のとき、となりの ∠B は何度ですか。`, ans: nb, choices: numChoices(nb, r, [a, 90, 360 - a]), h1: H.para.h1, h2: "となり合う角の和は180°" };
  }
  // advanced: 周の長さ
  const s1 = r(3, 12), s2 = r(3, 12), per = 2 * (s1 + s2);
  return { q: `平行四辺形で となり合う辺が ${s1}cm と ${s2}cm のとき、周の長さは何cmですか。`, ans: per, choices: numChoices(per, r, [s1 + s2, s1 * s2, 2 * s1 + s2]), h1: H.para.h1, h2: "周 = (たて+よこ)×2" };
}

// ── u3 特別な平行四辺形・面積 ──
function genArea(r, level) {
  if (level === "easy") {
    const b = r(3, 12), h = r(3, 12), s = b * h;
    return { q: `底辺 ${b}cm、高さ ${h}cm の平行四辺形の面積は何cm²ですか。`, ans: s, choices: numChoices(s, r, [b + h, 2 * (b + h), b * h / 2 | 0]), h1: H.area.h1, h2: "面積 = 底辺×高さ" };
  }
  if (level === "standard") {
    const d1 = 2 * r(2, 7), d2 = r(3, 12), s = d1 * d2 / 2;  // d1偶数 → 整数
    return { q: `対角線が ${d1}cm と ${d2}cm のひし形の面積は何cm²ですか。`, ans: s, choices: numChoices(s, r, [d1 * d2, d1 + d2, d1 * d2 / 2 + d1]), h1: H.area.h2, h2: "ひし形の面積 = 対角線×対角線÷2" };
  }
  // advanced: 面積と底辺から高さ
  const b = r(3, 10), h = r(3, 12), s = b * h;
  return { q: `面積が ${s}cm²、底辺が ${b}cm の平行四辺形の高さは何cmですか。`, ans: h, choices: numChoices(h, r, [s - b, b, s / b + 1 | 0]), h1: H.area.h1, h2: "高さ = 面積 ÷ 底辺" };
}

const lv = (fn, idp, skill) => ({
  easy: [p(idp + "e", (r) => fn(r, "easy"), skill)],
  standard: [p(idp + "s", (r) => fn(r, "standard"), skill)],
  advanced: [p(idp + "a", (r) => fn(r, "advanced"), skill)],
});

// ============================================================
// 追加問題（各unit easy/standard/advanced/oni を10問ずつに増量）
//  既存の p(...e / ...s / ...a) を先頭に残し、末尾に追記。
//  すべて角度・長さ・面積の「数値」で答える（証明系なし）。
// ============================================================

const Hmid = { h1: "三角形の中点連結定理：中点を結ぶ線分は底辺に平行で長さは半分", h2: "中点連結による線分 = 底辺 ÷ 2" };
const Hsum = { h1: "三角形の内角の和は180°、外角は隣り合わない2つの内角の和に等しい", h2: "外角 = 内角2つの和 ／ 残りの角 = 180 − 他の2角" };

// ── u1 二等辺三角形・正三角形（追加） ──
// easy: 基本の角
const U1E = [
  (r) => { const apex = 2 * r(15, 60); const base = (180 - apex) / 2; return { q: `頂角が ${apex}° の二等辺三角形の1つの底角は何度ですか。`, ans: base, choices: numChoices(base, r, [180 - apex, apex, 90 - apex]), h1: H.isos.h1, h2: H.isos.h2 }; },
  (r) => { const base = r(35, 75); const apex = 180 - 2 * base; return { q: `底角が ${base}° の二等辺三角形の頂角は何度ですか。`, ans: apex, choices: numChoices(apex, r, [base, 180 - base, 2 * base]), h1: H.isos.h1, h2: H.isos.h2 }; },
  (r) => { return { q: `正三角形の1つの内角は何度ですか。`, ans: 60, choices: numChoices(60, r, [90, 180, 120]), h1: "正三角形は3辺・3角がすべて等しい", h2: "内角の和180°を3等分 → 180÷3" }; },
  (r) => { const apex = 2 * r(20, 65); const base = (180 - apex) / 2; return { q: `二等辺三角形で頂角が ${apex}° です。等しい2つの底角の一方は何度ですか。`, ans: base, choices: numChoices(base, r, [apex, 180 - apex, 90 - apex / 2 | 0]), h1: H.isos.h1, h2: H.isos.h2 }; },
  (r) => { const base = r(40, 70); return { q: `二等辺三角形の2つの底角はそれぞれ等しいです。一方の底角が ${base}° のとき、もう一方の底角は何度ですか。`, ans: base, choices: numChoices(base, r, [180 - 2 * base, 90 - base, 180 - base]), h1: H.isos.h1, h2: "二等辺三角形の底角は左右で等しい" }; },
  (r) => { const apex = 2 * r(10, 40); const base = (180 - apex) / 2; return { q: `頂角が ${apex}° の二等辺三角形の底角は何度ですか。`, ans: base, choices: numChoices(base, r, [180 - apex, apex, 90 - apex]), h1: H.isos.h1, h2: H.isos.h2 }; },
  (r) => { const base = r(50, 80); const apex = 180 - 2 * base; return { q: `底角が ${base}° の二等辺三角形で、頂角は何度ですか。`, ans: apex, choices: numChoices(apex, r, [base, 2 * base, 180 - base]), h1: H.isos.h1, h2: H.isos.h2 }; },
  (r) => { return { q: `二等辺三角形の3つの内角の和は何度ですか。`, ans: 180, choices: numChoices(180, r, [90, 360, 60]), h1: "どんな三角形でも内角の和は180°", h2: "三角形の内角の和 = 180°" }; },
  (r) => { const s = r(3, 12); return { q: `1辺が ${s}cm の正三角形の周の長さは何cmですか。`, ans: 3 * s, choices: numChoices(3 * s, r, [2 * s, 4 * s, s * s]), h1: "正三角形は3辺の長さが等しい", h2: "周 = 1辺 × 3" }; },
  (r) => { const leg = r(4, 12); return { q: `二等辺三角形の等しい2辺がそれぞれ ${leg}cm です。この2辺の長さの合計は何cmですか。`, ans: 2 * leg, choices: numChoices(2 * leg, r, [leg, 3 * leg, leg * leg]), h1: "二等辺三角形は2辺が等しい", h2: "等しい2辺の合計 = 1辺 × 2" }; },
];
// standard: 角の計算（やや複合）
const U1S = [
  (r) => { const base = r(30, 75); const apex = 180 - 2 * base; return { q: `底角が ${base}° の二等辺三角形の頂角は何度ですか。`, ans: apex, choices: numChoices(apex, r, [180 - base, base, 90 - base]), h1: H.isos.h1, h2: H.isos.h2 }; },
  (r) => { const apex = 2 * r(15, 55); const base = (180 - apex) / 2; return { q: `頂角が ${apex}° の二等辺三角形で、2つの底角の和は何度ですか。`, ans: 2 * base, choices: numChoices(2 * base, r, [base, apex, 180 - 2 * base]), h1: H.isos.h1, h2: "底角の和 = 180 − 頂角" }; },
  (r) => { const base = r(35, 70); return { q: `二等辺三角形の底角が ${base}° のとき、頂角の外角は何度ですか。`, ans: 2 * base, choices: numChoices(2 * base, r, [180 - 2 * base, base, 180 - base]), h1: Hsum.h1, h2: "頂角の外角 = 底角2つの和 = 2×底角" }; },
  (r) => { const apex = 2 * r(20, 50); const base = (180 - apex) / 2; return { q: `頂角が ${apex}° の二等辺三角形で、1つの底角の外角は何度ですか。`, ans: 180 - base, choices: numChoices(180 - base, r, [base, apex, 180 - apex]), h1: "外角 = 180 − その内角", h2: "底角=(180−頂角)÷2 を求めてから 180−底角" }; },
  (r) => { const half = r(15, 40); const apex = 2 * half; const base = (180 - apex) / 2; return { q: `二等辺三角形の頂角を二等分すると一方が ${half}° になりました。底角は何度ですか。`, ans: base, choices: numChoices(base, r, [apex, half, 90 - half]), h1: H.isos.h1, h2: "頂角 = 二等分した角×2、底角=(180−頂角)÷2" }; },
  (r) => { const base = r(40, 65); const apex = 180 - 2 * base; return { q: `二等辺三角形の等しい2つの底角がそれぞれ ${base}° です。残りの頂角は何度ですか。`, ans: apex, choices: numChoices(apex, r, [base, 2 * base, 180 - base]), h1: H.isos.h1, h2: "頂角 = 180 − 底角×2" }; },
  (r) => { const a = r(40, 70), b = r(40, 70); return { q: `三角形の2つの内角が ${a}° と ${b}° のとき、残りの内角は何度ですか。`, ans: 180 - a - b, choices: numChoices(180 - a - b, r, [a + b, 180 - a, 180 - b]), h1: Hsum.h1, h2: "残りの角 = 180 − 他の2角" }; },
  (r) => { const apex = 2 * r(25, 55); const base = (180 - apex) / 2; return { q: `頂角が ${apex}° の二等辺三角形で、頂角と1つの底角の和は何度ですか。`, ans: apex + base, choices: numChoices(apex + base, r, [base, apex, 2 * base]), h1: H.isos.h1, h2: "底角=(180−頂角)÷2 を求めて頂角と足す" }; },
  (r) => { const base = r(45, 70); return { q: `二等辺三角形の底角が ${base}° のとき、底角2つの和は何度ですか。`, ans: 2 * base, choices: numChoices(2 * base, r, [base, 180 - base, 180 - 2 * base]), h1: H.isos.h1, h2: "底角は等しいので底角×2" }; },
  (r) => { const base = r(50, 75); const apex = 180 - 2 * base; return { q: `底角が ${base}° の二等辺三角形で、頂角の外角は何度ですか。`, ans: 180 - apex, choices: numChoices(180 - apex, r, [apex, base, 180 - base]), h1: "外角 = 180 − 内角", h2: "頂角=180−底角×2 を求めて 180−頂角" }; },
];
// advanced: 外角・複合
const U1A = [
  (r) => { const base = r(30, 80); const apex = 180 - 2 * base; return { q: `底角が ${base}° の二等辺三角形で、頂角の外角は何度ですか。`, ans: 2 * base, choices: numChoices(2 * base, r, [apex, base, 180 - base]), h1: "外角 = 180 − 頂角", h2: "頂角=180−底角×2 を使って 180−頂角" }; },
  (r) => { const top = r(20, 50); const apex = 2 * top; const base = (180 - apex) / 2; return { q: `二等辺三角形ABCで AB=AC、頂角Aを通る線で頂角を二等分すると ${top}° です。底角Bは何度ですか。`, ans: base, choices: numChoices(base, r, [apex, top, 90 - top]), h1: H.isos.h1, h2: "頂角=二等分した角×2、底角=(180−頂角)÷2" }; },
  (r) => { const base = r(35, 70); const ext = 180 - base; return { q: `二等辺三角形の1つの底角が ${base}° のとき、その底角の外角は何度ですか。`, ans: ext, choices: numChoices(ext, r, [base, 2 * base, 180 - 2 * base]), h1: "外角 = 180 − 内角", h2: "底角の外角 = 180 − 底角" }; },
  (r) => { const x = r(20, 45); return { q: `二等辺三角形の頂角が底角より ${3 * x}° 大きく、底角が ${x}° です。頂角は何度ですか。`, ans: x + 3 * x, choices: numChoices(4 * x, r, [x, 3 * x, 180 - 2 * x]), h1: "頂角 = 底角 + 差", h2: `頂角 = ${x} + ${3 * x}` }; },
  (r) => { const base = r(40, 65); const apex = 180 - 2 * base; return { q: `頂角の二等分線をひいた二等辺三角形で、底角が ${base}° です。頂角を二等分した1つの角は何度ですか。`, ans: apex / 2, choices: numChoices(apex / 2, r, [apex, base, 180 - apex]), h1: H.isos.h1, h2: "頂角=180−底角×2、それを2でわる" }; },
  (r) => { const a = r(50, 80); const b = a; const c = 180 - a - b; return { q: `二等辺三角形で等しい底角がそれぞれ ${a}° のとき、頂角の外角は何度ですか。`, ans: 180 - c, choices: numChoices(180 - c, r, [c, a, 2 * a]), h1: "外角 = 180 − 内角", h2: "頂角 = 180 − 底角×2 を求めて 180−頂角" }; },
  (r) => { const half = r(20, 40); const apex = 2 * half; const base = (180 - apex) / 2; return { q: `二等辺三角形で頂角の半分が ${half}° です。底角と頂角の差は何度ですか（絶対値）。`, ans: Math.abs(base - apex), choices: numChoices(Math.abs(base - apex), r, [base, apex, base + apex]), h1: H.isos.h1, h2: "底角=(180−頂角)÷2 を求めて |底角−頂角|" }; },
  (r) => { const ext = 2 * r(35, 65); const base = ext / 2; const apex = 180 - 2 * base; return { q: `二等辺三角形で頂角の外角が ${ext}° です。頂角は何度ですか。`, ans: apex, choices: numChoices(apex, r, [ext, base, 180 - ext]), h1: "外角 = 180 − 内角", h2: "頂角 = 180 − 外角" }; },
  (r) => { const base = r(40, 70); const apex = 180 - 2 * base; return { q: `二等辺三角形の底角が ${base}° のとき、頂角と底角の差は何度ですか（絶対値）。`, ans: Math.abs(apex - base), choices: numChoices(Math.abs(apex - base), r, [apex, base, apex + base]), h1: H.isos.h1, h2: "頂角=180−底角×2 を求めて 頂角と底角の差" }; },
  (r) => { const a = r(40, 70); const apex = 180 - 2 * a; return { q: `二等辺三角形ABCで AB=AC、∠B=${a}° です。∠Aと∠Cの和は何度ですか。`, ans: apex + a, choices: numChoices(apex + a, r, [apex, a, 2 * a]), h1: H.isos.h1, h2: "∠C=∠B=底角、∠A=頂角。和を求める" }; },
];
// oni: 応用の難問（答えは1つの数値）
const U1O = [
  (r) => { const x = r(20, 35); const apex = 180 - 4 * x; return { q: `二等辺三角形で底角が頂角の2倍より ${x}° 大きく、底角がそれぞれ ${2 * x}° と頂角が ${apex}° の関係を満たします。頂角は何度ですか。（頂角 = 180 − 底角×2）`, ans: apex, choices: numChoices(apex, r, [2 * x, 4 * x, x]), h1: H.isos.h1, h2: "頂角 = 180 − 底角×2" }; },
  (r) => { const base = r(36, 50); const apex = 180 - 2 * base; const half = apex / 2; const ans = base + half; return { q: `二等辺三角形ABC（AB=AC）で底角 ${base}° です。頂角の二等分線が底辺と交わる点をDとすると、△ABDの∠ADBは何度ですか。`, ans, choices: numChoices(ans, r, [base, apex, half]), h1: "△ABDの内角和=180、∠BAD=頂角÷2、∠B=底角", h2: `∠ADB = 180 − ${base} − ${half}` }; },
  (r) => { const t = r(20, 30); const apex = t; const base = (180 - apex) / 2; const ext = 2 * base; return { q: `頂角 ${apex}° の二等辺三角形で、底辺を延長してできる頂角まわりではなく、頂角の外角の大きさは何度ですか。`, ans: 180 - apex, choices: numChoices(180 - apex, r, [ext, base, apex]), h1: "外角 = 180 − その内角", h2: `頂角の外角 = 180 − ${apex}` }; },
  (r) => { const x = r(25, 40); const base = 2 * x; const apex = 180 - 2 * base; return { q: `二等辺三角形の頂角が ${apex}° で、底角が ${base}° です。底角と頂角の差は何度ですか（絶対値）。`, ans: Math.abs(base - apex), choices: numChoices(Math.abs(base - apex), r, [base, apex, base + apex]), h1: H.isos.h1, h2: `|${base} − ${apex}|` }; },
  (r) => { const a = r(40, 55); const apex1 = 180 - 2 * a; const inner = apex1; const ans = (180 - inner) / 2; return { q: `底角 ${a}° の二等辺三角形ABC（AB=AC）の頂角と等しい頂角をもつ別の二等辺三角形があります。その三角形の底角は何度ですか。`, ans, choices: numChoices(ans, r, [a, apex1, 2 * a]), h1: H.isos.h1, h2: `頂角=${apex1}、底角=(180−${apex1})÷2` }; },
  (r) => { const half = r(25, 40); const apex = 2 * half; const base = (180 - apex) / 2; const ans = base - half; return { q: `二等辺三角形で頂角を二等分すると一方が ${half}° です。底角からこの二等分角を引いた差は何度ですか。`, ans, choices: numChoices(ans, r, [base, half, apex]), h1: H.isos.h1, h2: `底角=(180−${apex})÷2、差=底角−${half}` }; },
  (r) => { const b = r(45, 65); const apex = 180 - 2 * b; const ans = b + apex; return { q: `二等辺三角形ABC（AB=AC、∠B=${b}°）で、∠Aと∠Bの和は何度ですか。`, ans, choices: numChoices(ans, r, [b, apex, 2 * b]), h1: H.isos.h1, h2: `∠A=180−2×${b}、∠Bと足す` }; },
  (r) => { const ext = 2 * r(50, 70); const base = ext / 2; const apex = 180 - 2 * base; const ans = apex; return { q: `二等辺三角形で頂角の外角が ${ext}° のとき、頂角は何度ですか。`, ans, choices: numChoices(ans, r, [ext, base, 180 - base]), h1: "外角 = 180 − 内角", h2: `頂角 = 180 − ${ext}` }; },
  (r) => { const base = r(40, 70); const apex = 180 - 2 * base; const ans = Math.abs(2 * base - apex); return { q: `底角 ${base}° の二等辺三角形で、底角2つの和から頂角を引いた差は何度ですか（絶対値）。`, ans, choices: numChoices(ans, r, [apex, base, 2 * base]), h1: H.isos.h1, h2: `(2×${base}) − (180−2×${base}) の絶対値` }; },
  (r) => { const n = [3, 4, 5, 6, 10, 12][r(0, 5)]; const ans = 180 * (n - 2) / n; return { q: `正${n}角形の1つの内角は何度ですか。`, ans, choices: numChoices(ans, r, [360 / n, 180 - 360 / n, 180 * (n - 2)]), h1: "正多角形の内角の和 = 180×(辺の数−2)", h2: `1つの内角 = 180×(${n}−2)÷${n}` }; },
];

// ── u2 平行四辺形の性質（追加） ──
// easy: 向かい合う角・辺
const U2E = [
  (r) => { const a = r(40, 140); return { q: `平行四辺形ABCDで ∠A=${a}° のとき、向かい合う ∠C は何度ですか。`, ans: a, choices: numChoices(a, r, [180 - a, 90, 360 - a]), h1: H.para.h1, h2: "向かい合う角は等しい" }; },
  (r) => { const a = r(40, 140); const b = 180 - a; return { q: `平行四辺形ABCDで ∠A=${a}° のとき、となりの ∠B は何度ですか。`, ans: b, choices: numChoices(b, r, [a, 90, 360 - a]), h1: H.para.h1, h2: "となり合う角の和は180°" }; },
  (r) => { const s = r(3, 12); return { q: `平行四辺形ABCDで AB=${s}cm のとき、向かい合う辺 CD は何cmですか。`, ans: s, choices: numChoices(s, r, [2 * s, s + 1, s * s]), h1: H.para.h1, h2: "平行四辺形は向かい合う辺が等しい" }; },
  (r) => { const a = r(50, 130); return { q: `平行四辺形で1つの角が ${a}° のとき、それと向かい合う角は何度ですか。`, ans: a, choices: numChoices(a, r, [180 - a, 90, 360 - a]), h1: H.para.h1, h2: "向かい合う角は等しい" }; },
  (r) => { const s = r(4, 11); return { q: `平行四辺形ABCDで BC=${s}cm のとき、向かい合う辺 AD は何cmですか。`, ans: s, choices: numChoices(s, r, [2 * s, s + 2, s - 1]), h1: H.para.h1, h2: "向かい合う辺は等しい" }; },
  (r) => { const a = r(45, 135); const b = 180 - a; return { q: `平行四辺形ABCDで ∠A=${a}° のとき、となりの ∠D は何度ですか。`, ans: b, choices: numChoices(b, r, [a, 90, 360 - a]), h1: H.para.h1, h2: "となり合う角の和は180°" }; },
  (r) => { const a = r(60, 120); return { q: `平行四辺形で ∠B=${a}° のとき、向かい合う ∠D は何度ですか。`, ans: a, choices: numChoices(a, r, [180 - a, 90, 360 - a]), h1: H.para.h1, h2: "向かい合う角は等しい" }; },
  (r) => { const s1 = r(3, 10), s2 = r(3, 10); return { q: `平行四辺形のとなり合う辺が ${s1}cm と ${s2}cm のとき、向かい合う辺の合計（${s1}cm の辺2本分）は何cmですか。`, ans: 2 * s1, choices: numChoices(2 * s1, r, [s1, 2 * s2, s1 + s2]), h1: H.para.h1, h2: "向かい合う辺は等しいので同じ長さが2本" }; },
  (r) => { const a = r(50, 130); return { q: `平行四辺形の4つの内角の和は何度ですか。`, ans: 360, choices: numChoices(360, r, [180, 90, 720]), h1: "四角形の内角の和は360°", h2: "どんな四角形でも内角の和 = 360°" }; },
  (r) => { const a = r(40, 140); const c = a; return { q: `平行四辺形ABCDで ∠A=${a}° です。∠A と ∠C の和は何度ですか。`, ans: a + c, choices: numChoices(a + c, r, [a, 180, 360 - a]), h1: H.para.h1, h2: "∠C=∠A（向かい合う角）なので 2×∠A" }; },
];
// standard: となり合う角・辺・周の一部
const U2S = [
  (r) => { const a = r(40, 140); const b = 180 - a; return { q: `平行四辺形ABCDで ∠A=${a}° のとき、となりの ∠B は何度ですか。`, ans: b, choices: numChoices(b, r, [a, 90, 360 - a]), h1: H.para.h1, h2: "となり合う角の和は180°" }; },
  (r) => { const a = r(40, 140); const c = a, b = 180 - a; return { q: `平行四辺形ABCDで ∠A=${a}° のとき、∠B と ∠C の和は何度ですか。`, ans: b + c, choices: numChoices(b + c, r, [a, 180, 360]), h1: H.para.h1, h2: "∠B=180−∠A、∠C=∠A を足す" }; },
  (r) => { const s1 = r(3, 12), s2 = r(3, 12); return { q: `平行四辺形で となり合う辺が ${s1}cm と ${s2}cm のとき、周の長さは何cmですか。`, ans: 2 * (s1 + s2), choices: numChoices(2 * (s1 + s2), r, [s1 + s2, s1 * s2, 2 * s1 + s2]), h1: H.para.h1, h2: "周 = (たて+よこ)×2" }; },
  (r) => { const a = r(50, 130); const sum = 360 - 2 * a; return { q: `平行四辺形ABCDで ∠A=∠C=${a}° です。残りの ∠B と ∠D の和は何度ですか。`, ans: sum, choices: numChoices(sum, r, [a, 360, 180]), h1: "四角形の内角の和は360°", h2: `∠B+∠D = 360 − 2×${a}` }; },
  (r) => { const per = 2 * r(6, 16); const s1 = r(2, per / 2 - 1); const s2 = per / 2 - s1; return { q: `平行四辺形の周が ${per}cm で、1辺が ${s1}cm のとき、となり合うもう1辺は何cmですか。`, ans: s2, choices: numChoices(s2, r, [s1, per / 2, per - s1]), h1: H.para.h1, h2: "周÷2 = となり合う2辺の和。そこから1辺を引く" }; },
  (r) => { const a = r(40, 140); const b = 180 - a; return { q: `平行四辺形ABCDで ∠C=${a}° のとき、となりの ∠D は何度ですか。`, ans: b, choices: numChoices(b, r, [a, 90, 360 - a]), h1: H.para.h1, h2: "となり合う角の和は180°（∠C と ∠D はとなり合う）" }; },
  (r) => { const s = r(4, 12); return { q: `となり合う2辺が等しく ${s}cm の平行四辺形（ひし形）の周の長さは何cmですか。`, ans: 4 * s, choices: numChoices(4 * s, r, [2 * s, 3 * s, s * s]), h1: "ひし形は4辺がすべて等しい", h2: "周 = 1辺 × 4" }; },
  (r) => { const a = r(40, 80); return { q: `平行四辺形ABCDで ∠A=${a}° のとき、∠A と となりの ∠B の差は何度ですか（絶対値）。`, ans: Math.abs((180 - a) - a), choices: numChoices(Math.abs((180 - a) - a), r, [a, 180 - a, 180]), h1: H.para.h1, h2: `∠B=180−${a}、差=|∠A−∠B|` }; },
  (r) => { const per = 2 * r(8, 18); const s2 = r(3, 9); const s1 = per / 2 - s2; return { q: `平行四辺形の周が ${per}cm、1辺が ${s2}cm のとき、向かい合う辺をふくめた ${s2}cm の辺2本の合計は何cmですか。`, ans: 2 * s2, choices: numChoices(2 * s2, r, [s2, per - 2 * s2, s1]), h1: H.para.h1, h2: "向かい合う辺は等しいので 2本で 2×辺" }; },
  (r) => { const a = r(55, 125); return { q: `平行四辺形で ∠A=${a}° のとき、4つの角のうち ${a}° の角は全部で何個ありますか。`, ans: 2, choices: numChoices(2, r, [1, 4, 3]), h1: H.para.h1, h2: "向かい合う角が等しいので ∠A と ∠C の2個" }; },
];
// advanced: 周・複合・角の組合せ
const U2A = [
  (r) => { const s1 = r(3, 12), s2 = r(3, 12), per = 2 * (s1 + s2); return { q: `平行四辺形で となり合う辺が ${s1}cm と ${s2}cm のとき、周の長さは何cmですか。`, ans: per, choices: numChoices(per, r, [s1 + s2, s1 * s2, 2 * s1 + s2]), h1: H.para.h1, h2: "周 = (たて+よこ)×2" }; },
  (r) => { const a = r(40, 80); const b = 180 - a; return { q: `平行四辺形ABCDで ∠A=${a}° です。∠B の大きさから ∠A を引いた差は何度ですか（∠Bはとなりの角）。`, ans: b - a, choices: numChoices(b - a, r, [a, b, a + b]), h1: H.para.h1, h2: `∠B=180−${a}、差=∠B−∠A` }; },
  (r) => { const per = 2 * r(8, 20); const s1 = r(3, per / 2 - 3); const s2 = per / 2 - s1; return { q: `周が ${per}cm の平行四辺形で、たてが ${s1}cm のとき よこは何cmですか。`, ans: s2, choices: numChoices(s2, r, [s1, per / 2, per - s1]), h1: H.para.h1, h2: "よこ = 周÷2 − たて" }; },
  (r) => { const a = r(50, 130); const half = a / 2 | 0; const exA = 180 - a; return { q: `平行四辺形ABCDで ∠A=${a}° のとき、∠A の外角は何度ですか。`, ans: 180 - a, choices: numChoices(180 - a, r, [a, 2 * a, 360 - a]), h1: "外角 = 180 − 内角", h2: `∠A の外角 = 180 − ${a}` }; },
  (r) => { const s1 = r(4, 12), s2 = r(4, 12); const half = s1 + s2; return { q: `平行四辺形のとなり合う辺が ${s1}cm と ${s2}cm のとき、周の半分は何cmですか。`, ans: s1 + s2, choices: numChoices(s1 + s2, r, [2 * (s1 + s2), s1 * s2, s1]), h1: H.para.h1, h2: "周の半分 = となり合う2辺の和" }; },
  (r) => { const a = r(40, 70); const b = 180 - a; return { q: `平行四辺形の4つの角は ${a}°、${b}°、${a}°、${b}° です。大きいほうの角は何度ですか。`, ans: Math.max(a, b), choices: numChoices(Math.max(a, b), r, [Math.min(a, b), 90, 180]), h1: H.para.h1, h2: "向かい合う角は等しく、となり合う角の和は180°" }; },
  (r) => { const a = r(50, 130); return { q: `平行四辺形ABCDで ∠A=${a}° です。4つの内角のうち、${a}° でない角の1つは何度ですか。`, ans: 180 - a, choices: numChoices(180 - a, r, [a, 90, 360 - a]), h1: H.para.h1, h2: `となり合う角 = 180 − ${a}` }; },
  (r) => { const per = 2 * r(10, 22); const s1 = r(4, per / 2 - 2); const s2 = per / 2 - s1; const diff = Math.abs(s1 - s2); return { q: `平行四辺形の周が ${per}cm、1辺が ${s1}cm のとき、となり合う2辺の長さの差は何cmですか（絶対値）。`, ans: diff, choices: numChoices(diff, r, [s1, s2, per / 2]), h1: H.para.h1, h2: `もう1辺=周÷2−${s1}、その差をとる` }; },
  (r) => { const a = r(60, 110); const c = a; return { q: `平行四辺形ABCDで ∠A=${a}° です。∠A と ∠C（向かい合う角）の和は何度ですか。`, ans: 2 * a, choices: numChoices(2 * a, r, [a, 180, 360 - a]), h1: H.para.h1, h2: `∠C=∠A=${a} なので和は 2×${a}` }; },
  (r) => { const s1 = r(3, 10), s2 = r(3, 10); const per = 2 * (s1 + s2); return { q: `平行四辺形で 短いほうの辺が ${Math.min(s1, s2)}cm、長いほうの辺が ${Math.max(s1, s2)}cm です。周の長さは何cmですか。`, ans: per, choices: numChoices(per, r, [s1 + s2, 2 * Math.max(s1, s2), s1 * s2]), h1: H.para.h1, h2: "周 = (短い辺+長い辺)×2" }; },
];
// oni: 応用の難問
const U2O = [
  (r) => { const a = r(40, 70); const ratioOther = 180 - a; return { q: `平行四辺形のとなり合う2つの角の比が ${a}：${ratioOther} となるように一方が ${a}° です。大きいほうの角は何度ですか。`, ans: Math.max(a, ratioOther), choices: numChoices(Math.max(a, ratioOther), r, [Math.min(a, ratioOther), 90, 180]), h1: H.para.h1, h2: "となり合う角の和は180°。大きいほうを選ぶ" }; },
  (r) => { const k = r(2, 5); const small = 180 / (k + 1); const big = 180 - small; return { q: `平行四辺形のとなり合う2つの角の比が 1：${k} です。小さいほうの角は何度ですか。`, ans: small, choices: numChoices(small, r, [big, 90, 180]), h1: "となり合う角の和は180°", h2: `小さい角 = 180 ÷ (1+${k})` }; },
  (r) => { const s1 = r(4, 9), s2 = r(4, 9); const per = 2 * (s1 + s2); return { q: `周が ${per}cm の平行四辺形で、となり合う辺の差が ${Math.abs(s1 - s2)}cm、短い辺が ${Math.min(s1, s2)}cm です。長い辺は何cmですか。`, ans: Math.max(s1, s2), choices: numChoices(Math.max(s1, s2), r, [Math.min(s1, s2), per / 2, per]), h1: H.para.h1, h2: "長い辺 = 短い辺 + 差" }; },
  (r) => { const a = r(50, 80); const b = 180 - a; const ans = b - a; return { q: `平行四辺形ABCDで ∠A=${a}° です。となりの角 ∠B と ∠A の差は何度ですか。`, ans, choices: numChoices(ans, r, [a, b, a + b]), h1: H.para.h1, h2: `∠B=180−${a}、差=∠B−${a}` }; },
  (r) => { const per = 4 * r(3, 8); const side = per / 4; return { q: `周が ${per}cm のひし形の1辺は何cmですか。`, ans: side, choices: numChoices(side, r, [per / 2, per, side * 2]), h1: "ひし形は4辺が等しい", h2: `1辺 = 周 ÷ 4 = ${per}÷4` }; },
  (r) => { const a = r(55, 125); const half = a / 2; const ans = Number.isInteger(half) ? half : Math.round(half); return { q: `平行四辺形ABCDで ∠A=${2 * Math.round(a / 2)}° です。∠A を二等分した1つの角は何度ですか。`, ans: Math.round(a / 2), choices: numChoices(Math.round(a / 2), r, [a, 180 - a, 90]), h1: H.para.h1, h2: "二等分した角 = ∠A ÷ 2" }; },
  (r) => { const a = r(40, 75); const c = a, b = 180 - a, d = 180 - a; const ans = a + b + c + d; return { q: `平行四辺形の4つの内角が ${a}°、${180 - a}°、${a}°、${180 - a}° です。4つの角の和は何度ですか。`, ans, choices: numChoices(ans, r, [180, 720, a + b]), h1: "四角形の内角の和は360°", h2: "平行四辺形の4つの角の和は常に360°" }; },
  (r) => { const big = r(100, 140); const small = 180 - big; const ans = big - small; return { q: `平行四辺形のとなり合う2つの角のうち、大きいほうが ${big}° です。大きい角と小さい角の差は何度ですか。`, ans, choices: numChoices(ans, r, [big, small, 180]), h1: H.para.h1, h2: `小さい角=180−${big}、差をとる` }; },
  (r) => { const s1 = r(5, 12), s2 = r(3, s1 - 1); const per = 2 * (s1 + s2); const ans = per; return { q: `平行四辺形ABCDで AB=${s1}cm、BC=${s2}cm です。周の長さは何cmですか。`, ans, choices: numChoices(ans, r, [s1 + s2, 2 * s1, 2 * s2]), h1: H.para.h1, h2: `周 = 2×(${s1}+${s2})` }; },
  (r) => { const a = r(40, 70); const apexLike = 180 - 2 * a < 0 ? 180 - a : 180 - a; const b = 180 - a; const ans = b; return { q: `平行四辺形ABCDで対角線BDをひくと△ABDができます。∠A=${a}° のとき、平行四辺形のとなりの角 ∠B は何度ですか。`, ans, choices: numChoices(ans, r, [a, 90, 360 - a]), h1: H.para.h1, h2: `となり合う角の和は180° → ∠B=180−${a}` }; },
];

// ── u3 特別な平行四辺形・面積（追加） ──
// easy: 平行四辺形の面積など
const U3E = [
  (r) => { const b = r(3, 12), h = r(3, 12); return { q: `底辺 ${b}cm、高さ ${h}cm の平行四辺形の面積は何cm²ですか。`, ans: b * h, choices: numChoices(b * h, r, [b + h, 2 * (b + h), b * h / 2 | 0]), h1: H.area.h1, h2: "面積 = 底辺×高さ" }; },
  (r) => { const s = r(3, 12); return { q: `1辺が ${s}cm の正方形の面積は何cm²ですか。`, ans: s * s, choices: numChoices(s * s, r, [4 * s, 2 * s, s + s]), h1: "正方形の面積 = 1辺×1辺", h2: `面積 = ${s}×${s}` }; },
  (r) => { const a = r(3, 12), b = r(3, 12); return { q: `たて ${a}cm、よこ ${b}cm の長方形の面積は何cm²ですか。`, ans: a * b, choices: numChoices(a * b, r, [2 * (a + b), a + b, a * b / 2 | 0]), h1: "長方形の面積 = たて×よこ", h2: `面積 = ${a}×${b}` }; },
  (r) => { const d1 = 2 * r(2, 7), d2 = r(3, 12); const s = d1 * d2 / 2; return { q: `対角線が ${d1}cm と ${d2}cm のひし形の面積は何cm²ですか。`, ans: s, choices: numChoices(s, r, [d1 * d2, d1 + d2, s + d1]), h1: H.area.h2, h2: "ひし形の面積 = 対角線×対角線÷2" }; },
  (r) => { const b = r(4, 12), h = r(3, 10); return { q: `底辺 ${b}cm、高さ ${h}cm の平行四辺形の面積は何cm²ですか。`, ans: b * h, choices: numChoices(b * h, r, [b + h, b * h / 2 | 0, 2 * b]), h1: H.area.h1, h2: "面積 = 底辺×高さ" }; },
  (r) => { const s = r(4, 11); return { q: `1辺が ${s}cm の正方形の周の長さは何cmですか。`, ans: 4 * s, choices: numChoices(4 * s, r, [2 * s, s * s, 3 * s]), h1: "正方形は4辺が等しい", h2: "周 = 1辺×4" }; },
  (r) => { const a = r(3, 10), b = r(3, 10); return { q: `たて ${a}cm、よこ ${b}cm の長方形の周の長さは何cmですか。`, ans: 2 * (a + b), choices: numChoices(2 * (a + b), r, [a + b, a * b, 2 * a + b]), h1: "長方形の周 = (たて+よこ)×2", h2: `周 = 2×(${a}+${b})` }; },
  (r) => { const d1 = 2 * r(3, 8), d2 = 2 * r(2, 6); const s = d1 * d2 / 2; return { q: `対角線が ${d1}cm と ${d2}cm のひし形の面積は何cm²ですか。`, ans: s, choices: numChoices(s, r, [d1 * d2, d1 + d2, s + d2]), h1: H.area.h2, h2: "ひし形の面積 = 対角線×対角線÷2" }; },
  (r) => { const b = r(5, 12), h = 2 * r(1, 3); const s = b * h / 2; return { q: `底辺 ${b}cm、高さ ${h}cm の三角形の面積は何cm²ですか。`, ans: s, choices: numChoices(s, r, [b * h, b + h, b]), h1: "三角形の面積 = 底辺×高さ÷2", h2: `面積 = ${b}×${h}÷2` }; },
  (r) => { const s = r(3, 9); return { q: `1辺が ${s}cm の正方形の面積は何cm²ですか。`, ans: s * s, choices: numChoices(s * s, r, [4 * s, 2 * s, s * s + s]), h1: "正方形の面積 = 1辺×1辺", h2: `面積 = ${s}²` }; },
];
// standard: ひし形・長方形・対角線
const U3S = [
  (r) => { const d1 = 2 * r(2, 7), d2 = r(3, 12); const s = d1 * d2 / 2; return { q: `対角線が ${d1}cm と ${d2}cm のひし形の面積は何cm²ですか。`, ans: s, choices: numChoices(s, r, [d1 * d2, d1 + d2, s + d1]), h1: H.area.h2, h2: "ひし形の面積 = 対角線×対角線÷2" }; },
  (r) => { const b = r(4, 12), h = r(3, 12); const s = b * h; return { q: `面積が ${s}cm²、底辺が ${b}cm の平行四辺形の高さは何cmですか。`, ans: h, choices: numChoices(h, r, [s - b, b, s / b + 1 | 0]), h1: H.area.h1, h2: "高さ = 面積 ÷ 底辺" }; },
  (r) => { const a = r(3, 12); const s = a * a; return { q: `面積が ${s}cm² の正方形の1辺は何cmですか。`, ans: a, choices: numChoices(a, r, [s, 2 * a, a + 1]), h1: "正方形の面積 = 1辺×1辺", h2: `1辺 = √面積 = √${s}` }; },
  (r) => { const a = r(3, 12), area = a * r(3, 12); const b = area / a; return { q: `面積が ${area}cm²、たてが ${a}cm の長方形のよこは何cmですか。`, ans: b, choices: numChoices(b, r, [a, area, area - a]), h1: "長方形の面積 = たて×よこ", h2: "よこ = 面積 ÷ たて" }; },
  (r) => { const d1 = 2 * r(3, 8), area = d1 * r(3, 10) / 2 * 2; const d2 = 2 * area / d1; return { q: `面積が ${area}cm²、1つの対角線が ${d1}cm のひし形で、もう1つの対角線は何cmですか。`, ans: d2, choices: numChoices(d2, r, [d1, area, area / d1 | 0]), h1: H.area.h2, h2: "もう1つの対角線 = 面積×2 ÷ もう一方の対角線" }; },
  (r) => { const a = r(4, 12), b = r(4, 12); const s = a * b; return { q: `たて ${a}cm、よこ ${b}cm の長方形の面積は何cm²ですか。`, ans: s, choices: numChoices(s, r, [2 * (a + b), a + b, a * b / 2 | 0]), h1: "長方形の面積 = たて×よこ", h2: `面積 = ${a}×${b}` }; },
  (r) => { const d1 = 2 * r(3, 9), d2 = 2 * r(2, 7); const s = d1 * d2 / 2; return { q: `正方形の対角線が ${d1}cm のとき、対角線2本の長さが等しいので対角線が ${d1}cm と ${d1}cm のひし形（正方形）の面積は何cm²ですか。`, ans: d1 * d1 / 2, choices: numChoices(d1 * d1 / 2, r, [d1 * d1, d1, 2 * d1]), h1: "正方形もひし形の一種：対角線×対角線÷2", h2: `面積 = ${d1}×${d1}÷2` }; },
  (r) => { const b = r(4, 12), h = 2 * r(2, 6); const s = b * h / 2; return { q: `底辺 ${b}cm、高さ ${h}cm の三角形の面積は何cm²ですか。`, ans: s, choices: numChoices(s, r, [b * h, b + h, b]), h1: "三角形の面積 = 底辺×高さ÷2", h2: `面積 = ${b}×${h}÷2` }; },
  (r) => { const b = r(4, 12), h = r(3, 12); const s = b * h; return { q: `平行四辺形の面積が ${s}cm²、高さが ${h}cm のとき、底辺は何cmですか。`, ans: b, choices: numChoices(b, r, [h, s, s - h]), h1: H.area.h1, h2: "底辺 = 面積 ÷ 高さ" }; },
  (r) => { const a = 2 * r(2, 5); const s = a * a / 2; return { q: `1辺が ${a}cm の正方形の対角線でできる2つの直角二等辺三角形の、1つの面積は何cm²ですか。`, ans: s, choices: numChoices(s, r, [a * a, a, 2 * a]), h1: "正方形を対角線で2等分", h2: `面積 = (1辺×1辺)÷2 = ${a}×${a}÷2` }; },
];
// advanced: 高さ逆算・複合・対角線
const U3A = [
  (r) => { const b = r(3, 10), h = r(3, 12), s = b * h; return { q: `面積が ${s}cm²、底辺が ${b}cm の平行四辺形の高さは何cmですか。`, ans: h, choices: numChoices(h, r, [s - b, b, s / b + 1 | 0]), h1: H.area.h1, h2: "高さ = 面積 ÷ 底辺" }; },
  (r) => { const d1 = 2 * r(3, 8); const area = d1 * 2 * r(2, 7) / 2; const d2 = 2 * area / d1; return { q: `ひし形の面積が ${area}cm²、1つの対角線が ${d1}cm のとき、もう1つの対角線は何cmですか。`, ans: d2, choices: numChoices(d2, r, [d1, area, area / d1 | 0]), h1: H.area.h2, h2: "もう一方の対角線 = 面積×2 ÷ 対角線" }; },
  (r) => { const a = r(3, 10), s = a * a; return { q: `面積が ${s}cm² の正方形の周の長さは何cmですか。`, ans: 4 * a, choices: numChoices(4 * a, r, [a, s, 2 * a]), h1: "正方形：面積=1辺²、周=1辺×4", h2: `1辺=√${s}=${a}、周=${a}×4` }; },
  (r) => { const a = r(4, 12), per = 2 * (a + r(3, 10)); const b = per / 2 - a; const s = a * b; return { q: `周が ${per}cm の長方形で、たてが ${a}cm のとき面積は何cm²ですか。`, ans: s, choices: numChoices(s, r, [per, a * a, per / 2 | 0]), h1: "長方形：よこ=周÷2−たて、面積=たて×よこ", h2: `よこ=${per}÷2−${a}=${b}、面積=${a}×${b}` }; },
  (r) => { const big = r(3, 10), area = big * r(3, 8); const small = area / big; return { q: `平行四辺形ABCDの面積が ${area}cm² です。底辺BCを ${big}cm とすると、その底辺に対する高さは何cmですか。`, ans: small, choices: numChoices(small, r, [big, area, area - big]), h1: H.area.h1, h2: "高さ = 面積 ÷ 底辺" }; },
  (r) => { const d = 2 * r(3, 8); const area = d * d / 2; return { q: `正方形の対角線が ${d}cm のとき、面積は何cm²ですか。（正方形の面積 = 対角線×対角線÷2）`, ans: area, choices: numChoices(area, r, [d * d, d, 2 * d]), h1: "正方形の面積 = 対角線²÷2", h2: `面積 = ${d}×${d}÷2` }; },
  (r) => { const b = r(4, 12), h = r(4, 12); const para = b * h; const tri = para / 2 % 1 === 0 ? para / 2 : para; return { q: `底辺 ${b}cm、高さ ${h}cm の平行四辺形と、同じ底辺・高さの三角形があります。平行四辺形の面積は三角形の面積の何倍ですか。`, ans: 2, choices: numChoices(2, r, [1, 4, 3]), h1: "三角形=底辺×高さ÷2、平行四辺形=底辺×高さ", h2: "平行四辺形は三角形の2倍" }; },
  (r) => { const d1 = 2 * r(3, 7), d2 = 2 * r(3, 7); const s = d1 * d2 / 2; return { q: `対角線が ${d1}cm と ${d2}cm のひし形の面積と等しい面積をもつ、底辺 ${d1}cm の平行四辺形の高さは何cmですか。`, ans: s / d1, choices: numChoices(s / d1, r, [d1, d2, s]), h1: "面積をそろえる：平行四辺形の面積=ひし形の面積", h2: `高さ = (${d1}×${d2}÷2) ÷ ${d1}` }; },
  (r) => { const a = r(4, 10), inner = r(1, a - 1); const s = a * a - inner * inner; return { q: `1辺 ${a}cm の正方形から、1辺 ${inner}cm の正方形を切り取った残りの面積は何cm²ですか。`, ans: s, choices: numChoices(s, r, [a * a, inner * inner, (a - inner) * (a - inner)]), h1: "残り面積 = 大きい正方形 − 小さい正方形", h2: `${a}² − ${inner}²` }; },
  (r) => { const b = r(4, 12), h = 2 * r(2, 6); const s = b * h / 2; return { q: `底辺 ${b}cm、高さ ${h}cm の平行四辺形を対角線で2つの三角形に分けたとき、1つの三角形の面積は何cm²ですか。`, ans: s, choices: numChoices(s, r, [b * h, b + h, b]), h1: "平行四辺形を対角線で2等分", h2: `三角形の面積 = (${b}×${h}) ÷ 2` }; },
];
// oni: 応用の難問
const U3O = [
  (r) => { const b = r(5, 12), h = r(4, 10); const para = b * h; const tri = para; return { q: `底辺 ${b}cm、高さ ${h}cm の平行四辺形の面積と、底辺 ${b}cm の三角形の面積が等しくなりました。三角形の高さは何cmですか。`, ans: 2 * h, choices: numChoices(2 * h, r, [h, b, para]), h1: "三角形の面積=底辺×高さ÷2 を平行四辺形の面積に等しくおく", h2: `底辺×三角形高さ÷2 = ${para} → 高さ = ${para}×2÷${b}` }; },
  (r) => { const d1 = 2 * r(3, 7), d2 = 2 * r(3, 7); const s = d1 * d2 / 2; const sq = s; return { q: `対角線が ${d1}cm と ${d2}cm のひし形と同じ面積の正方形の面積は何cm²ですか。`, ans: s, choices: numChoices(s, r, [d1 * d2, d1 + d2, s + d1]), h1: "同じ面積：ひし形=対角線×対角線÷2", h2: `面積 = ${d1}×${d2}÷2` }; },
  (r) => { const a = 2 * r(2, 5); const s = a * a / 2; return { q: `1辺 ${a}cm の正方形の各辺の中点を結んでできる正方形の面積は何cm²ですか。（中点正方形は元の半分）`, ans: s, choices: numChoices(s, r, [a * a, a, 2 * a]), h1: "中点を結んだ正方形は元の正方形の面積の半分", h2: `面積 = ${a}² ÷ 2` }; },
  (r) => { const b = r(4, 10), h = r(4, 10), s = b * h; const newB = 2 * b; return { q: `底辺 ${b}cm、高さ ${h}cm の平行四辺形の底辺を2倍にし、高さは変えないと、新しい面積は元の面積の何倍ですか。`, ans: 2, choices: numChoices(2, r, [1, 4, 3]), h1: "面積=底辺×高さ。底辺だけ2倍にすると面積も2倍", h2: "底辺2倍 → 面積2倍" }; },
  (r) => { const a = r(4, 10), b = r(4, 10); const big = a * b; const ans = a * (2 * b); return { q: `たて ${a}cm、よこ ${b}cm の長方形の よこだけを2倍にした長方形の面積は何cm²ですか。`, ans, choices: numChoices(ans, r, [a * b, a + 2 * b, 2 * (a + b)]), h1: "長方形の面積 = たて×よこ", h2: `面積 = ${a}×(${b}×2)` }; },
  (r) => { const d1 = 2 * r(4, 9); const d2 = d1; const s = d1 * d2 / 2; return { q: `対角線の長さが等しく ともに ${d1}cm のひし形（正方形）の面積は何cm²ですか。`, ans: s, choices: numChoices(s, r, [d1 * d1, d1, 2 * d1]), h1: "対角線が等しいひし形＝正方形：対角線²÷2", h2: `面積 = ${d1}×${d1}÷2` }; },
  (r) => { const b = r(6, 12), h1v = r(2, 5), h2v = r(2, 5); const s = b * (h1v + h2v); return { q: `底辺が共通で ${b}cm、高さが ${h1v}cm と ${h2v}cm の2つの平行四辺形の面積の合計は何cm²ですか。`, ans: s, choices: numChoices(s, r, [b * h1v, b * h2v, h1v + h2v]), h1: "それぞれ 底辺×高さ を求めて足す", h2: `${b}×${h1v} + ${b}×${h2v}` }; },
  (r) => { const a = r(4, 12), area = a * a; return { q: `面積が ${area}cm² の正方形の周の長さは何cmですか。`, ans: 4 * a, choices: numChoices(4 * a, r, [area, a, 2 * a]), h1: "正方形：1辺=√面積、周=1辺×4", h2: `1辺=√${area}=${a}、周=${a}×4` }; },
  (r) => { const big = r(6, 12), small = r(2, big - 2); const ringPair = big * big - small * small; return { q: `1辺 ${big}cm の正方形の中央に1辺 ${small}cm の正方形の穴をあけた図形の面積は何cm²ですか。`, ans: ringPair, choices: numChoices(ringPair, r, [big * big, small * small, big * small]), h1: "残り面積 = 外の正方形 − 内の正方形", h2: `${big}² − ${small}²` }; },
  (r) => { const d1 = 4 * r(2, 4), d2 = 2 * r(3, 7); const s = d1 * d2 / 2; const ans = s / 4; return { q: `対角線が ${d1}cm と ${d2}cm のひし形を対角線で4つの直角三角形に分けたとき、1つの三角形の面積は何cm²ですか。`, ans, choices: numChoices(ans, r, [s, s / 2, d1 + d2]), h1: "ひし形の面積=対角線×対角線÷2、それを4等分", h2: `(${d1}×${d2}÷2) ÷ 4` }; },
];

// 既存の先頭1問を残しつつ、追加配列をマップして10問にそろえるヘルパー
const lvN = (idp, skill, fn, U) => ({
  easy: [p(idp + "e", (r) => fn(r, "easy"), skill), ...U.E.map((g, i) => p(`${idp}e${i + 2}`, g, skill))],
  standard: [p(idp + "s", (r) => fn(r, "standard"), skill), ...U.S.map((g, i) => p(`${idp}s${i + 2}`, g, skill))],
  advanced: [p(idp + "a", (r) => fn(r, "advanced"), skill), ...U.A.map((g, i) => p(`${idp}a${i + 2}`, g, skill))],
  oni: U.O.map((g, i) => p(`${idp}o${i + 1}`, g, skill)),
});

export const chapter = {
  id: "g2c5",
  name: "三角形と四角形",
  emoji: "🔻",
  color: "#fb7185",
  grade: 2,
  units: [
    { id: "g2c5u1", name: "二等辺三角形・正三角形", emoji: "🔺", desc: "底角・頂角", problems: lvN("g2c5u1", "S-GEO-ISOS", genIsos, { E: U1E.slice(0, 9), S: U1S.slice(0, 9), A: U1A.slice(0, 9), O: U1O }) },
    { id: "g2c5u2", name: "平行四辺形の性質", emoji: "▱", desc: "角・周", problems: lvN("g2c5u2", "S-GEO-PARA", genPara, { E: U2E.slice(0, 9), S: U2S.slice(0, 9), A: U2A.slice(0, 9), O: U2O }) },
    { id: "g2c5u3", name: "特別な平行四辺形・面積", emoji: "🟧", desc: "面積", problems: lvN("g2c5u3", "S-GEO-QAREA", genArea, { E: U3E.slice(0, 9), S: U3S.slice(0, 9), A: U3A.slice(0, 9), O: U3O }) },
  ],
};
