// ============================================================
// g2c4 — 中2「平行と合同」（★自動作問版・角度＝数値）
//  多角形の内角の和 180(n−2)、正n角形の1内角 180(n−2)/n、1外角 360/n。
// ============================================================
import { numChoices } from "../_algebra.js";

const p = (id, build, skill = null) => ({ id, build, skill });
const rpick = (r, arr) => arr[r(0, arr.length - 1)];

const H = {
  sum: { h1: "n角形は (n−2) 個の三角形に分けられる", h2: "内角の和 = 180°×(n−2)" },
  reg: { h1: "正多角形は角がすべて等しい。外角の和はいつも360°", h2: "1つの外角=360÷n、1つの内角=180−(外角)" },
  tri: { h1: "三角形の内角の和は 180°", h2: "わからない角 = 180 − (他の2つの角)" },
  par: { h1: "平行線では同位角・錯角は等しい", h2: "一直線（180°）や対頂角の関係を使う" },
  ext: { h1: "三角形の外角は、隣にない2つの内角の和に等しい", h2: "外角 = 内角①＋内角②" },
};
// 360 を割り切る n（正多角形で内角・外角が整数になる）
const NICE_N = [3, 4, 5, 6, 8, 9, 10, 12];

function genSum(r, level) {
  if (level === "advanced") {
    const n = r(5, 12), S = 180 * (n - 2);
    return { q: `内角の和が ${S}° の多角形は何角形ですか。（角の数を答えなさい）`, ans: n, choices: numChoices(n, r, [n + 2, n - 2, S / 180]), h1: H.sum.h1, h2: "n−2 = 内角の和÷180、n = それ＋2" };
  }
  const n = level === "easy" ? r(3, 8) : r(8, 15);
  const S = 180 * (n - 2);
  return { q: `${n}角形の内角の和は何度ですか。`, ans: S, choices: numChoices(S, r, [180 * n, 180 * (n - 1), 360]), h1: H.sum.h1, h2: H.sum.h2 };
}

function genReg(r, level) {
  const n = rpick(r, NICE_N);
  const ext = 360 / n, intA = 180 * (n - 2) / n;
  if (level === "easy") {
    return { q: `正${n}角形の1つの外角は何度ですか。`, ans: ext, choices: numChoices(ext, r, [intA, 360, n]), h1: H.reg.h1, h2: "1つの外角 = 360 ÷ n" };
  }
  if (level === "standard") {
    return { q: `正${n}角形の1つの内角は何度ですか。`, ans: intA, choices: numChoices(intA, r, [ext, 180 - n, 180]), h1: H.reg.h1, h2: "1つの内角 = 180 − (1つの外角)" };
  }
  // 外角から n を求める
  return { q: `1つの外角が ${ext}° の正多角形は正何角形ですか。（角の数を答えなさい）`, ans: n, choices: numChoices(n, r, [ext, n + 1, 360 - ext]), h1: H.reg.h1, h2: "n = 360 ÷ (1つの外角)" };
}

// ============================================================
// ▼ Unit1（多角形の内角の和）— 各レベル10問
//   easy=角度の基本（対頂角・同位角・錯角・一直線）
//   standard=平行線と角・三角形の角
//   advanced=多角形の内角・外角の和・複合
//   oni=応用の難問（答えは1つの数値＝角度）
// ============================================================

const U1_EASY = [
  p("g2c4u1e", (r) => genSum(r, "easy"), "S-GEO-ANGSUM"),
  // 対頂角は等しい
  p("g2c4u1e2", (r) => { const a = r(20, 70); return { q: `2直線が交わってできる角の1つが ${a}° のとき、その対頂角は何度ですか。`, ans: a, choices: numChoices(a, r, [180 - a, 90 - a, 360 - a]), h1: "対頂角は等しい", h2: `対頂角 = ${a}°` }; }),
  // 一直線上の角（補角）
  p("g2c4u1e3", (r) => { const a = r(30, 150); return { q: `一直線上にならんだ2つの角のうち、一方が ${a}° のとき、もう一方は何度ですか。`, ans: 180 - a, choices: numChoices(180 - a, r, [a, 90 - a, 360 - a]), h1: "一直線は 180°", h2: `180 − ${a}` }; }),
  // 同位角は等しい（平行線）
  p("g2c4u1e4", (r) => { const a = r(30, 120); return { q: `平行な2直線に1本の直線が交わっています。ある同位角が ${a}° のとき、それと等しい同位角は何度ですか。`, ans: a, choices: numChoices(a, r, [180 - a, 90 - a, a + 10]), h1: "平行線の同位角は等しい", h2: `同位角 = ${a}°` }; }),
  // 錯角は等しい（平行線）
  p("g2c4u1e5", (r) => { const a = r(30, 120); return { q: `平行な2直線に1本の直線が交わっています。ある錯角が ${a}° のとき、それと等しい錯角は何度ですか。`, ans: a, choices: numChoices(a, r, [180 - a, 90 - a, a + 15]), h1: "平行線の錯角は等しい", h2: `錯角 = ${a}°` }; }),
  // 同位角と一直線（同側内角）
  p("g2c4u1e6", (r) => { const a = r(40, 130); return { q: `平行線で、ある角の同位角が ${a}° です。その同位角と一直線をつくる角は何度ですか。`, ans: 180 - a, choices: numChoices(180 - a, r, [a, 90, 360 - a]), h1: "同位角は等しく、一直線は180°", h2: `180 − ${a}` }; }),
  // 直角の残り
  p("g2c4u1e7", (r) => { const a = r(15, 75); return { q: `直角（90°）を ${a}° と □° に分けました。□ は何度ですか。`, ans: 90 - a, choices: numChoices(90 - a, r, [a, 180 - a, 90 + a]), h1: "直角は 90°", h2: `90 − ${a}` }; }),
  // 三角形の内角（残り1つ）
  p("g2c4u1e8", (r) => { const a = r(30, 80), b = r(30, 80); return { q: `三角形の2つの内角が ${a}° と ${b}° のとき、残りの内角は何度ですか。`, ans: 180 - a - b, choices: numChoices(180 - a - b, r, [a + b, 90 - a, 180 - a]), h1: H.tri.h1, h2: `180 − ${a} − ${b}` }; }),
  // 1周（360°）の残り
  p("g2c4u1e9", (r) => { const a = r(60, 160); return { q: `1点のまわり（360°）を ${a}° と □° に分けました。□ は何度ですか。`, ans: 360 - a, choices: numChoices(360 - a, r, [a, 180 - a, 90]), h1: "1点のまわりは 360°", h2: `360 − ${a}` }; }),
  // 二等辺三角形の頂角から底角
  p("g2c4u1e10", (r) => { const top = 2 * r(15, 50); return { q: `二等辺三角形の頂角が ${top}° です。1つの底角は何度ですか。`, ans: (180 - top) / 2, choices: numChoices((180 - top) / 2, r, [top, 180 - top, 90]), h1: "二等辺三角形の2つの底角は等しい", h2: `(180 − ${top}) ÷ 2` }; }),
];

const U1_STANDARD = [
  p("g2c4u1s", (r) => genSum(r, "standard"), "S-GEO-ANGSUM"),
  // 三角形の内角（残り1つ・大きめ）
  p("g2c4u1s2", (r) => { const a = r(20, 60), b = r(20, 60); return { q: `三角形の2つの内角が ${a}° と ${b}° です。3つめの内角は何度ですか。`, ans: 180 - a - b, choices: numChoices(180 - a - b, r, [a + b, 90, 180]), h1: H.tri.h1, h2: `180 − (${a}＋${b})` }; }),
  // 平行線＋三角形（錯角を使って残りの角）
  p("g2c4u1s3", (r) => { const a = r(30, 70), b = r(30, 70); return { q: `平行線にはさまれた三角形で、錯角からわかる2つの内角が ${a}° と ${b}° でした。残りの内角は何度ですか。`, ans: 180 - a - b, choices: numChoices(180 - a - b, r, [a + b, a, b]), h1: "錯角は等しい→三角形の内角がそろう", h2: `180 − ${a} − ${b}` }; }),
  // 三角形の外角
  p("g2c4u1s4", (r) => { const a = r(30, 70), b = r(30, 70); return { q: `三角形の内角が ${a}° と ${b}° のとき、もう1つの内角の外角は何度ですか。`, ans: a + b, choices: numChoices(a + b, r, [180 - a - b, a, b]), h1: H.ext.h1, h2: `外角 = ${a} ＋ ${b}` }; }, "S-GEO-EXTANG"),
  // 平行線・折れ線（くいちがい）：間の角
  p("g2c4u1s5", (r) => { const a = r(30, 70), b = r(30, 70); return { q: `平行な2直線の間にできた折れ点の角度を求めます。上の同位角が ${a}°、下の同位角が ${b}° のとき、折れ点の角は何度ですか。`, ans: a + b, choices: numChoices(a + b, r, [180 - a - b, a, b]), h1: "補助線を1本平行に引くと、錯角2つの和になる", h2: `${a} ＋ ${b}` }; }, "S-GEO-PARALLEL"),
  // 二等辺三角形の底角から頂角
  p("g2c4u1s6", (r) => { const base = r(40, 75); return { q: `二等辺三角形の1つの底角が ${base}° です。頂角は何度ですか。`, ans: 180 - 2 * base, choices: numChoices(180 - 2 * base, r, [base, 2 * base, 180 - base]), h1: "底角は2つとも等しい", h2: `180 − ${base} × 2` }; }),
  // 直角三角形の残りの鋭角
  p("g2c4u1s7", (r) => { const a = r(20, 70); return { q: `直角三角形の1つの鋭角が ${a}° です。もう1つの鋭角は何度ですか。`, ans: 90 - a, choices: numChoices(90 - a, r, [a, 180 - a, 90 + a]), h1: "直角三角形は1つが90°", h2: `90 − ${a}（残り2角の和は90°）` }; }),
  // 平行線：同側内角から
  p("g2c4u1s8", (r) => { const a = r(50, 130); return { q: `平行線で同じ側にある2つの内角のうち、一方が ${a}° です。もう一方は何度ですか。`, ans: 180 - a, choices: numChoices(180 - a, r, [a, 360 - a, 90]), h1: "平行線の同側内角の和は180°", h2: `180 − ${a}` }; }, "S-GEO-PARALLEL"),
  // 三角形：1角が他の角の関係から（x＋2x＋…ではなく数値で）
  p("g2c4u1s9", (r) => { const a = r(40, 90); return { q: `三角形で、等しい2つの内角がそれぞれ ${a}° です。残りの内角は何度ですか。`, ans: 180 - 2 * a, choices: numChoices(180 - 2 * a, r, [a, 2 * a, 90]), h1: H.tri.h1, h2: `180 − ${a} × 2` }; }),
  // 三角形の外角（外角から内角）
  p("g2c4u1s10", (r) => { const ext = r(100, 150), a = r(30, ext - 30); return { q: `三角形の外角が ${ext}° で、隣にない内角の1つが ${a}° です。隣にないもう1つの内角は何度ですか。`, ans: ext - a, choices: numChoices(ext - a, r, [ext, a, 180 - ext]), h1: H.ext.h1, h2: `${ext} − ${a}` }; }, "S-GEO-EXTANG"),
];

const U1_ADVANCED = [
  p("g2c4u1a", (r) => genSum(r, "advanced"), "S-GEO-ANGSUM"),
  // n角形の内角の和
  p("g2c4u1a2", (r) => { const n = r(5, 12), S = 180 * (n - 2); return { q: `${n}角形の内角の和は何度ですか。`, ans: S, choices: numChoices(S, r, [180 * n, 180 * (n - 1), 360]), h1: H.sum.h1, h2: H.sum.h2 }; }, "S-GEO-ANGSUM"),
  // 多角形の外角の和（いつも360）
  p("g2c4u1a3", (r) => { const n = r(5, 12); return { q: `${n}角形の外角の和は何度ですか。`, ans: 360, choices: numChoices(360, r, [180 * (n - 2), 180, 180 * n]), h1: "多角形の外角の和はいつも360°", h2: "頂点の数に関係なく360°" }; }, "S-GEO-EXTSUM"),
  // 内角の和から角の数
  p("g2c4u1a4", (r) => { const n = r(6, 14), S = 180 * (n - 2); return { q: `内角の和が ${S}° の多角形は何角形ですか。（角の数を答えなさい）`, ans: n, choices: numChoices(n, r, [n + 1, n - 1, S / 180]), h1: H.sum.h1, h2: "n = (内角の和÷180) ＋ 2" }; }, "S-GEO-ANGSUM"),
  // 多角形の内角（残り1つ）— 四角形
  p("g2c4u1a5", (r) => { const a = r(60, 100), b = r(60, 100), c = r(60, 100); return { q: `四角形の3つの内角が ${a}°、${b}°、${c}° です。残りの内角は何度ですか。`, ans: 360 - a - b - c, choices: numChoices(360 - a - b - c, r, [a + b + c, 180 - a, 360]), h1: "四角形の内角の和は360°", h2: `360 − ${a} − ${b} − ${c}` }; }),
  // 多角形の内角（残り1つ）— 五角形
  p("g2c4u1a6", (r) => { const a = r(90, 120), b = r(90, 120), c = r(90, 120), d = r(90, 120); const S = 540; return { q: `五角形の4つの内角が ${a}°、${b}°、${c}°、${d}° です。残りの内角は何度ですか。`, ans: S - a - b - c - d, choices: numChoices(S - a - b - c - d, r, [a + b, 360, 180]), h1: "五角形の内角の和は540°", h2: `540 − (${a}＋${b}＋${c}＋${d})` }; }),
  // 外角から角の数
  p("g2c4u1a7", (r) => { const n = rpick(r, NICE_N), ext = 360 / n; return { q: `多角形のすべての外角が ${ext}° で等しいとき、何角形ですか。（角の数を答えなさい）`, ans: n, choices: numChoices(n, r, [ext, n + 1, 360 - ext]), h1: "外角の和は360°", h2: `n = 360 ÷ ${ext}` }; }),
  // 1つの内角と外角の関係
  p("g2c4u1a8", (r) => { const intA = r(100, 160); return { q: `多角形の1つの内角が ${intA}° のとき、その頂点の外角は何度ですか。`, ans: 180 - intA, choices: numChoices(180 - intA, r, [intA, 360 - intA, 90]), h1: "内角と外角は一直線上にある", h2: `外角 = 180 − ${intA}` }; }),
  // 内角の和の差（n角形と(n−1)角形）
  p("g2c4u1a9", (r) => { const n = r(6, 12); return { q: `頂点が1つふえて ${n - 1}角形から ${n}角形になると、内角の和は何度ふえますか。`, ans: 180, choices: numChoices(180, r, [360, 90, 180 * (n - 2)]), h1: "三角形が1つふえる", h2: "ふえる和はいつも180°" }; }),
  // 三角形3つの外角の和
  p("g2c4u1a10", (r) => { const a = r(40, 70), b = r(40, 70); const c = 180 - a - b; const e1 = 180 - a, e2 = 180 - b, e3 = 180 - c; return { q: `三角形の内角が ${a}°、${b}°、${c}° です。3つの外角の和は何度ですか。`, ans: e1 + e2 + e3, choices: numChoices(e1 + e2 + e3, r, [180, 270, 180 * 3]), h1: "三角形でも外角の和は360°", h2: `(180−${a})＋(180−${b})＋(180−${c})` }; }, "S-GEO-EXTSUM"),
];

const U1_ONI = [
  // ★ 平行線＋ジグザグ（補助線で錯角2回）
  p("g2c4u1o1", (r) => { const a = r(30, 60), b = r(40, 70); return { q: `平行な2直線 ℓ／m の間に折れ線がある。ℓ側で錯角が ${a}°、m側で錯角が ${b}° のとき、折れ点（間の頂点）の角は何度ですか。`, ans: a + b, choices: numChoices(a + b, r, [180 - a - b, 360 - a - b, a]), h1: "折れ点を通る平行な補助線を引く", h2: `錯角の和 ${a}＋${b}` }; }, "S-GEO-PARALLEL"),
  // ★ 星形（5つの頂角の和は180°）
  p("g2c4u1o2", (r) => { return { q: `五芒星（星形五角形）のとがった5つの角をすべて足すと何度ですか。`, ans: 180, choices: numChoices(180, r, [360, 540, 90]), h1: "外角の三角形をたどると、5つの角の和は1つの三角形の内角の和になる", h2: "とがった5角の和 = 180°" }; }),
  // ★ 折り返し（折り目）：もとの角の半分
  p("g2c4u1o3", (r) => { const a = 2 * r(20, 40); return { q: `紙テープを折り返したら、重なってできた角が ${a}° になった。折り目とテープのへりがつくる角は何度ですか。（折り返しで同じ大きさの角が2つできる）`, ans: a / 2, choices: numChoices(a / 2, r, [a, 180 - a, 90 - a / 2]), h1: "折り返すと角が二等分される", h2: `${a} ÷ 2` }; }),
  // ★ 三角形の角の二等分線が作る角（90 + C/2）
  p("g2c4u1o4", (r) => { const c = 2 * r(20, 50); return { q: `三角形ABCで、頂点AとBの内角の二等分線が点Iで交わる。∠C = ${c}° のとき、∠AIB は何度ですか。`, ans: 90 + c / 2, choices: numChoices(90 + c / 2, r, [180 - c, c, 90]), h1: "∠AIB = 180 − (A＋B)/2、A＋B = 180−C", h2: `90 ＋ ${c}÷2` }; }),
  // ★ 外角の二等分線が作る角（C/2）
  p("g2c4u1o5", (r) => { const c = 2 * r(20, 45); return { q: `三角形ABCで、頂点AとBの外角の二等分線が交わる点を Iₑ とする。∠C = ${c}° のとき、∠AIₑB は何度ですか。`, ans: 90 - c / 2, choices: numChoices(90 - c / 2, r, [90 + c / 2, c, 90]), h1: "∠AIₑB = 90 − C/2", h2: `90 − ${c}÷2` }; }),
  // ★ 正多角形の対角線がつくる角（中心と二等辺）
  p("g2c4u1o6", (r) => { const n = rpick(r, [5, 6, 9, 10, 12]); const intA = 180 * (n - 2) / n; return { q: `正${n}角形で、となり合う2辺がつくる内角の半分（対角線が内角を二等分したときの1つの角）は何度ですか。`, ans: intA / 2, choices: numChoices(intA / 2, r, [intA, 360 / n, 90]), h1: `正${n}角形の1つの内角 = ${intA}°`, h2: `${intA} ÷ 2` }; }),
  // ★ 内角の和が外角の和の k 倍になる n
  p("g2c4u1o7", (r) => { const k = r(2, 6); const n = 2 * k + 2; const S = 180 * (n - 2); return { q: `内角の和が外角の和（360°）の ${k} 倍になる多角形は何角形ですか。（角の数を答えなさい）`, ans: n, choices: numChoices(n, r, [n + 2, n - 2, S / 180]), h1: "内角の和 = 180(n−2)、外角の和 = 360", h2: `180(n−2) = 360×${k} を解く` }; }, "S-GEO-ANGSUM"),
  // ★ 平行線＋三角形（くさび形・3角の関係）
  p("g2c4u1o8", (r) => { const a = r(30, 60), b = r(30, 60); return { q: `平行線にはさまれた三角形で、2つの底角が錯角からそれぞれ ${a}° と ${b}° とわかった。頂角（残りの角）の外角は何度ですか。`, ans: a + b, choices: numChoices(a + b, r, [180 - a - b, a, b]), h1: "外角 = 隣にない2内角の和", h2: `${a} ＋ ${b}` }; }, "S-GEO-EXTANG"),
  // ★ 多角形の内角の和を直接（大きい n）
  p("g2c4u1o9", (r) => { const n = r(15, 30), S = 180 * (n - 2); return { q: `${n}角形の内角の和は何度ですか。`, ans: S, choices: numChoices(S, r, [180 * n, 360, 180 * (n - 1)]), h1: H.sum.h1, h2: H.sum.h2 }; }, "S-GEO-ANGSUM"),
  // ★ 重なる三角形（ブーメラン形）：へこんだ角 = 3角の和
  p("g2c4u1o10", (r) => { const a = r(20, 40), b = r(20, 40), c = r(20, 40); return { q: `ブーメラン形（くぼみのある四角形）で、外側の3つの角が ${a}°、${b}°、${c}° のとき、くぼんだ部分の角（へこみの内角）は何度ですか。`, ans: a + b + c, choices: numChoices(a + b + c, r, [360 - a - b - c, 180 - a, a + b]), h1: "へこんだ角 = 残り3つの角の和", h2: `${a} ＋ ${b} ＋ ${c}` }; }),
];

// ============================================================
// ▼ Unit2（正多角形の内角・外角）— 各レベル10問
// ============================================================

const U2_EASY = [
  p("g2c4u2e", (r) => genReg(r, "easy"), "S-GEO-REGPOLY"),
  // 正多角形の外角（別 n）
  p("g2c4u2e2", (r) => { const n = rpick(r, NICE_N), ext = 360 / n; return { q: `正${n}角形の1つの外角は何度ですか。`, ans: ext, choices: numChoices(ext, r, [180 * (n - 2) / n, 360, n]), h1: "外角の和は360°", h2: `360 ÷ ${n}` }; }, "S-GEO-REGPOLY"),
  // 正三角形の1内角
  p("g2c4u2e3", (r) => { return { q: `正三角形の1つの内角は何度ですか。`, ans: 60, choices: numChoices(60, r, [120, 90, 180]), h1: "正三角形は3つの角が等しい", h2: "180 ÷ 3 = 60" }; }),
  // 正方形の1内角
  p("g2c4u2e4", (r) => { return { q: `正方形（正四角形）の1つの内角は何度ですか。`, ans: 90, choices: numChoices(90, r, [60, 120, 360]), h1: "正方形の角はすべて直角", h2: "360 ÷ 4 = 90" }; }),
  // 外角の和
  p("g2c4u2e5", (r) => { const n = rpick(r, NICE_N); return { q: `正${n}角形の外角の和は何度ですか。`, ans: 360, choices: numChoices(360, r, [180, 180 * (n - 2), n]), h1: "外角の和はいつも360°", h2: "頂点の数に関係なく360°" }; }),
  // 正六角形の外角
  p("g2c4u2e6", (r) => { return { q: `正六角形の1つの外角は何度ですか。`, ans: 60, choices: numChoices(60, r, [120, 90, 360]), h1: "外角 = 360 ÷ 6", h2: "360 ÷ 6 = 60" }; }),
  // 正多角形の内角＝180−外角
  p("g2c4u2e7", (r) => { const n = rpick(r, NICE_N), ext = 360 / n; return { q: `正${n}角形の1つの外角は ${ext}° です。1つの内角は何度ですか。`, ans: 180 - ext, choices: numChoices(180 - ext, r, [ext, 360 - ext, 90]), h1: "内角と外角の和は180°", h2: `180 − ${ext}` }; }, "S-GEO-REGPOLY"),
  // 正五角形の外角
  p("g2c4u2e8", (r) => { return { q: `正五角形の1つの外角は何度ですか。`, ans: 72, choices: numChoices(72, r, [108, 60, 360]), h1: "外角 = 360 ÷ 5", h2: "360 ÷ 5 = 72" }; }),
  // 正方形の外角
  p("g2c4u2e9", (r) => { return { q: `正方形の1つの外角は何度ですか。`, ans: 90, choices: numChoices(90, r, [60, 120, 45]), h1: "外角 = 360 ÷ 4", h2: "360 ÷ 4 = 90" }; }),
  // 正八角形の外角
  p("g2c4u2e10", (r) => { return { q: `正八角形の1つの外角は何度ですか。`, ans: 45, choices: numChoices(45, r, [135, 60, 90]), h1: "外角 = 360 ÷ 8", h2: "360 ÷ 8 = 45" }; }),
];

const U2_STANDARD = [
  p("g2c4u2s", (r) => genReg(r, "standard"), "S-GEO-REGPOLY"),
  // 正多角形の1内角（別 n）
  p("g2c4u2s2", (r) => { const n = rpick(r, NICE_N), intA = 180 * (n - 2) / n; return { q: `正${n}角形の1つの内角は何度ですか。`, ans: intA, choices: numChoices(intA, r, [360 / n, 180, 180 - n]), h1: "1つの内角 = 180×(n−2)÷n", h2: `または 180 − (360 ÷ ${n})` }; }, "S-GEO-REGPOLY"),
  // 正六角形の内角
  p("g2c4u2s3", (r) => { return { q: `正六角形の1つの内角は何度ですか。`, ans: 120, choices: numChoices(120, r, [60, 90, 108]), h1: "180 − (360÷6)", h2: "180 − 60 = 120" }; }),
  // 正五角形の内角
  p("g2c4u2s4", (r) => { return { q: `正五角形の1つの内角は何度ですか。`, ans: 108, choices: numChoices(108, r, [72, 120, 90]), h1: "180 − (360÷5)", h2: "180 − 72 = 108" }; }),
  // 内角の和（正多角形）
  p("g2c4u2s5", (r) => { const n = rpick(r, NICE_N), S = 180 * (n - 2); return { q: `正${n}角形の内角の和は何度ですか。`, ans: S, choices: numChoices(S, r, [180 * n, 360, 180 * (n - 2) / n]), h1: H.sum.h1, h2: H.sum.h2 }; }, "S-GEO-ANGSUM"),
  // 内角からnを求める
  p("g2c4u2s6", (r) => { const n = rpick(r, NICE_N), intA = 180 * (n - 2) / n, ext = 360 / n; return { q: `1つの内角が ${intA}° の正多角形は正何角形ですか。（角の数を答えなさい）`, ans: n, choices: numChoices(n, r, [intA, n + 1, ext]), h1: "外角 = 180 − 内角、n = 360 ÷ 外角", h2: `外角 = ${ext}°、n = 360 ÷ ${ext}` }; }, "S-GEO-REGPOLY"),
  // 中心角（正n角形を中心から分ける）
  p("g2c4u2s7", (r) => { const n = rpick(r, NICE_N); return { q: `正${n}角形を中心から各頂点に線を引くと、中心のまわりが等しく分かれます。中心にできる1つの角は何度ですか。`, ans: 360 / n, choices: numChoices(360 / n, r, [180 * (n - 2) / n, 180, n]), h1: "中心のまわりは360°", h2: `360 ÷ ${n}` }; }),
  // 正三角形の外角
  p("g2c4u2s8", (r) => { return { q: `正三角形の1つの外角は何度ですか。`, ans: 120, choices: numChoices(120, r, [60, 90, 360]), h1: "外角 = 180 − 内角(60)", h2: "180 − 60 = 120（または 360÷3）" }; }),
  // 正多角形（中心に集まる正多角形のしきつめ）— 内角
  p("g2c4u2s9", (r) => { const n = rpick(r, [3, 4, 6]); const intA = 180 * (n - 2) / n; return { q: `正${n}角形を1点のまわりにすき間なくしきつめるには、1点に何枚集まりますか。（1つの内角は ${intA}°）`, ans: 360 / intA, choices: numChoices(360 / intA, r, [intA, n, 6]), h1: "1点のまわり360°を内角でうめる", h2: `360 ÷ ${intA}` }; }),
  // 正十角形の内角
  p("g2c4u2s10", (r) => { return { q: `正十角形の1つの内角は何度ですか。`, ans: 144, choices: numChoices(144, r, [36, 120, 150]), h1: "180 − (360÷10)", h2: "180 − 36 = 144" }; }),
];

const U2_ADVANCED = [
  p("g2c4u2a", (r) => genReg(r, "advanced"), "S-GEO-REGPOLY"),
  // 外角からnを求める（別 n）
  p("g2c4u2a2", (r) => { const n = rpick(r, NICE_N), ext = 360 / n; return { q: `1つの外角が ${ext}° の正多角形は正何角形ですか。（角の数を答えなさい）`, ans: n, choices: numChoices(n, r, [ext, n + 1, 360 - ext]), h1: "n = 360 ÷ 外角", h2: `360 ÷ ${ext}` }; }, "S-GEO-REGPOLY"),
  // 内角からnを求める
  p("g2c4u2a3", (r) => { const n = rpick(r, NICE_N), intA = 180 * (n - 2) / n, ext = 360 / n; return { q: `1つの内角が ${intA}° の正多角形は正何角形ですか。（角の数を答えなさい）`, ans: n, choices: numChoices(n, r, [intA, n + 2, ext]), h1: "外角 = 180 − 内角", h2: `外角 ${ext}°、n = 360 ÷ ${ext}` }; }, "S-GEO-REGPOLY"),
  // 正十二角形の内角
  p("g2c4u2a4", (r) => { return { q: `正十二角形の1つの内角は何度ですか。`, ans: 150, choices: numChoices(150, r, [30, 144, 120]), h1: "180 − (360÷12)", h2: "180 − 30 = 150" }; }),
  // 内角と外角の比から n
  p("g2c4u2a5", (r) => { const n = rpick(r, [5, 6, 8, 9, 10, 12]); const intA = 180 * (n - 2) / n, ext = 360 / n; return { q: `ある正多角形は、1つの内角が1つの外角の ${intA / ext} 倍です。何角形ですか。（角の数を答えなさい）`, ans: n, choices: numChoices(n, r, [n + 1, n - 1, intA / ext]), h1: "内角＋外角=180°、内角=外角×倍率", h2: `外角×(1＋倍率)=180 → 外角=${ext}°、n=360÷${ext}` }; }, "S-GEO-REGPOLY"),
  // 2つの正多角形の内角の和（しきつめ・3種）
  p("g2c4u2a6", (r) => { return { q: `正三角形・正方形・正六角形の「1つの内角」を1つずつ足すと何度ですか。`, ans: 60 + 90 + 120, choices: numChoices(60 + 90 + 120, r, [360, 180, 300]), h1: "それぞれ 60°・90°・120°", h2: "60 ＋ 90 ＋ 120 = 270" }; }),
  // 正多角形の対角線の本数 → ではなく角：星形にしたときのとがり角
  p("g2c4u2a7", (r) => { const n = rpick(r, [5, 6, 8]); const ext = 360 / n; return { q: `正${n}角形の各頂点で、辺をのばしてできる外角は ${ext}° です。外角を全部足すと何度ですか。`, ans: 360, choices: numChoices(360, r, [ext * n, 180, ext]), h1: "外角の和はいつも360°", h2: `${ext} × ${n} = 360` }; }),
  // 正多角形：内角の和が与えられ n→1内角
  p("g2c4u2a8", (r) => { const n = rpick(r, NICE_N), S = 180 * (n - 2), intA = S / n; return { q: `正${n}角形の内角の和は ${S}° です。1つの内角は何度ですか。`, ans: intA, choices: numChoices(intA, r, [S, 360 / n, 180]), h1: "1つの内角 = 内角の和 ÷ n", h2: `${S} ÷ ${n}` }; }, "S-GEO-REGPOLY"),
  // 正多角形：外角が整数になる最大 n（12角形=30°）→ 30°のn
  p("g2c4u2a9", (r) => { return { q: `1つの外角が 30° の正多角形は正何角形ですか。（角の数を答えなさい）`, ans: 12, choices: numChoices(12, r, [30, 11, 150]), h1: "n = 360 ÷ 外角", h2: "360 ÷ 30 = 12" }; }),
  // 正多角形：内角が外角より a° 大きい → n
  p("g2c4u2a10", (r) => { const n = rpick(r, [5, 6, 8, 9, 10]); const intA = 180 * (n - 2) / n, ext = 360 / n; const diff = intA - ext; return { q: `1つの内角が1つの外角より ${diff}° 大きい正多角形は正何角形ですか。（角の数を答えなさい）`, ans: n, choices: numChoices(n, r, [n + 1, n - 1, diff]), h1: "内角＋外角=180、内角−外角=差", h2: `外角 = (180 − ${diff}) ÷ 2 = ${ext}°、n = 360 ÷ ${ext}` }; }, "S-GEO-REGPOLY"),
];

const U2_ONI = [
  // ★ しきつめ：正三角形と正方形を組み合わせ、1点に集まる枚数の角
  p("g2c4u2o1", (r) => { return { q: `1つの点のまわりに、正三角形(60°)と正方形(90°)と正六角形(120°)を1枚ずつ並べたら、残りのすき間は何度ですか。`, ans: 360 - 60 - 90 - 120, choices: numChoices(360 - 60 - 90 - 120, r, [270, 0, 360]), h1: "1点のまわりは360°", h2: "360 − (60＋90＋120) = 90" }; }),
  // ★ 正多角形2種でしきつめ：正方形と正三角形混合（1点に正方形3＋…）→ 角の和
  p("g2c4u2o2", (r) => { return { q: `正方形を2枚と正三角形を3枚、1点のまわりにすき間なく並べられますか。並べた角の合計は何度になりますか。`, ans: 90 * 2 + 60 * 3, choices: numChoices(90 * 2 + 60 * 3, r, [330, 300, 270]), h1: "正方形90°×2、正三角形60°×3", h2: "180 ＋ 180 = 360（ちょうど敷きつめられる）" }; }),
  // ★ 内角と外角の比 m:1 → n
  p("g2c4u2o3", (r) => { const m = rpick(r, [2, 3, 4, 5]); const ext = 180 / (m + 1); const n = 360 / ext; return { q: `1つの内角と1つの外角の比が ${m}:1 の正多角形は正何角形ですか。（角の数を答えなさい・答えは整数）`, ans: n, choices: numChoices(n, r, [m, n + 1, ext]), h1: "内角＋外角=180°、内角:外角=" + m + ":1", h2: `外角 = 180 ÷ ${m + 1} = ${ext}°、n = 360 ÷ ${ext}` }; }, "S-GEO-REGPOLY"),
  // ★ 星形正多角形のとがり角（正n角形を一つおきに結ぶ）
  p("g2c4u2o4", (r) => { const n = 5; const tip = 180 - 2 * (360 / n); return { q: `正${n}角形の頂点を1つおきに結んでできる星形（五芒星）の、1つのとがった角は何度ですか。`, ans: tip, choices: numChoices(tip, r, [360 / n, 180 * (n - 2) / n, 180 - 360 / n]), h1: "とがり角 = 180 − 2×(中心角)、中心角=360/n", h2: `180 − 2×${360 / n} = 36` }; }),
  // ★ 正多角形の内角の和が外角の和の k 倍 → n
  p("g2c4u2o5", (r) => { const k = r(3, 7); const n = 2 * k + 2; return { q: `内角の和が外角の和（360°）の ${k} 倍に等しい正多角形は正何角形ですか。（角の数を答えなさい）`, ans: n, choices: numChoices(n, r, [n + 2, n - 2, 2 * k]), h1: "180(n−2) = 360k", h2: `n − 2 = 2×${k} → n = ${n}` }; }, "S-GEO-ANGSUM"),
  // ★ 正多角形の1内角を3等分した1つの角
  p("g2c4u2o6", (r) => { const n = rpick(r, [3, 6, 12]); const intA = 180 * (n - 2) / n; return { q: `正${n}角形の1つの内角(${intA}°)を3等分した、1つ分の角は何度ですか。`, ans: intA / 3, choices: numChoices(intA / 3, r, [intA, intA / 2, 360 / n]), h1: `1内角 = ${intA}°`, h2: `${intA} ÷ 3` }; }),
  // ★ 2つの正多角形：1点で正n角形2枚＋正m角形 → mを求める…は難。代わり：辺の数の差と内角差
  p("g2c4u2o7", (r) => { return { q: `正六角形と正方形を辺で1枚ずつくっつけたとき、くっつけた辺の両側にできる、外側のすき間の角は何度ですか。（内角120°と90°の外側）`, ans: 360 - 120 - 90, choices: numChoices(360 - 120 - 90, r, [210, 180, 30]), h1: "1点のまわり360°から内角2つを引く", h2: "360 − 120 − 90 = 150" }; }),
  // ★ 正多角形の対角線が中心でつくる角（正n角形の中心角×k）
  p("g2c4u2o8", (r) => { const n = rpick(r, [6, 8, 12]); const k = r(2, n / 2); return { q: `正${n}角形の中心から各頂点に線を引いたとき、${k} 個分の中心角をまとめた角は何度ですか。（中心角=360÷${n}）`, ans: (360 / n) * k, choices: numChoices((360 / n) * k, r, [360 / n, 360, 180]), h1: `中心角 = 360 ÷ ${n}`, h2: `${360 / n} × ${k}` }; }),
  // ★ 正多角形の内角が 170° に近い：内角→n（177°など整数解のもの）
  p("g2c4u2o9", (r) => { const n = rpick(r, [20, 24, 36, 40]); const ext = 360 / n, intA = 180 - ext; return { q: `1つの内角が ${intA}° の正多角形は正何角形ですか。（角の数を答えなさい）`, ans: n, choices: numChoices(n, r, [intA, ext, n + 2]), h1: "外角 = 180 − 内角、n = 360 ÷ 外角", h2: `外角 = ${ext}°、n = 360 ÷ ${ext}` }; }, "S-GEO-REGPOLY"),
  // ★ 正多角形のしきつめ可否（内角が360の約数になる n=3,4,6 のみ）
  p("g2c4u2o10", (r) => { const n = rpick(r, [3, 4, 6]); const intA = 180 * (n - 2) / n; return { q: `正${n}角形だけで平面をすき間なくしきつめるとき、1つの点に何枚集まりますか。（1内角 ${intA}°）`, ans: 360 / intA, choices: numChoices(360 / intA, r, [intA, n, 360 / n]), h1: "1点のまわり360°を内角でちょうどうめる", h2: `360 ÷ ${intA}` }; }),
];

const lv = (fn, idp, skill) => ({
  easy: [p(idp + "e", (r) => fn(r, "easy"), skill)],
  standard: [p(idp + "s", (r) => fn(r, "standard"), skill)],
  advanced: [p(idp + "a", (r) => fn(r, "advanced"), skill)],
});

export const chapter = {
  id: "g2c4",
  name: "平行と合同",
  emoji: "📐",
  color: "#a78bfa",
  grade: 2,
  units: [
    { id: "g2c4u1", name: "多角形の内角の和", emoji: "🔺", desc: "180×(n−2)", problems: { easy: U1_EASY, standard: U1_STANDARD, advanced: U1_ADVANCED, oni: U1_ONI } },
    { id: "g2c4u2", name: "正多角形の内角・外角", emoji: "⬡", desc: "1つの内角・外角", problems: { easy: U2_EASY, standard: U2_STANDARD, advanced: U2_ADVANCED, oni: U2_ONI } },
  ],
};
