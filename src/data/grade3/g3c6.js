// ============================================================
// g3c6 — 中3「円」（★自動作問版・角度＝数値）
//  円周角と中心角、内接四角形、接弦角。
// ============================================================
import { numChoices } from "../_algebra.js";

const p = (id, build, skill = null) => ({ id, build, skill });

const H = {
  inscribed: { h1: "同じ弧に対する円周角は中心角の半分", h2: "中心角 = 円周角 × 2、円周角 = 中心角 ÷ 2" },
  cyclic: { h1: "円に内接する四角形は、向かい合う角の和が180°", h2: "∠A+∠C=180°、∠B+∠D=180°" },
  tangent: { h1: "接線と弦のつくる角は、その弦に対する円周角に等しい（接弦角）", h2: "接線と半径（接点）は垂直＝90°" },
};

// u1 円周角と中心角
function genInscribed(r, level) {
  if (level === "easy") {
    const ic = r(20, 80), ce = 2 * ic;
    return { q: `ある弧に対する円周角が ${ic}° のとき、その弧に対する中心角は何度ですか。`, ans: ce, choices: numChoices(ce, r, [ic, ic / 2, 180 - ic]), h1: H.inscribed.h1, h2: `中心角 = ${ic}×2 = ${ce}` };
  }
  if (level === "standard") {
    const ic = r(15, 80), ce = 2 * ic;
    return { q: `ある弧に対する中心角が ${ce}° のとき、その弧に対する円周角は何度ですか。`, ans: ic, choices: numChoices(ic, r, [ce, ce * 2, 180 - ce]), h1: H.inscribed.h1, h2: `円周角 = ${ce}÷2 = ${ic}` };
  }
  // 直径に対する円周角は90°（半円）
  const ic = 90, given = r(20, 60);
  return { q: `半円の弧（直径）に対する円周角は何度ですか。`, ans: ic, choices: numChoices(ic, r, [180, 45, given]), h1: "直径に対する円周角は必ず90°", h2: "中心角180°の半分で90°" };
}

// u2 円に内接する四角形
function genCyclic(r) {
  const a = r(60, 130), opp = 180 - a;
  return { q: `円に内接する四角形ABCDで ∠A=${a}° のとき、向かい合う ∠C は何度ですか。`, ans: opp, choices: numChoices(opp, r, [a, 360 - a, 90]), h1: H.cyclic.h1, h2: `∠C = 180 − ${a} = ${opp}` };
}

// u3 接線と円周角（接弦角）
function genTangent(r, level) {
  if (level === "advanced") {
    return { q: `円の接線と、接点を通る半径とのつくる角は何度ですか。`, ans: 90, choices: numChoices(90, r, [180, 45, 60]), h1: H.tangent.h2, h2: "接線⊥半径（接点）で90°" };
  }
  const a = r(25, 75);
  return { q: `円の接線と弦のつくる角が ${a}° のとき、その弦に対する円周角は何度ですか。`, ans: a, choices: numChoices(a, r, [180 - a, 2 * a, 90 - a]), h1: H.tangent.h1, h2: `接弦角の定理より ${a}°` };
}

// ============================================================
// 追加問題（各unit easy/standard/advanced/oni を各10問に）
//  ・build は {q, ans, h1, h2} を返す（ans＝角度の数値）
//  ・円周角の定理：中心角の半分／同弧で等しい／半円で90°
// ============================================================

// ---- u1 円周角と中心角 ----
const U1_EASY = [
  p("g3c6u1e2", (r) => { const ce = 2 * r(20, 80); return { q: `中心角が ${ce}° の弧に対する円周角は何度ですか。`, ans: ce / 2, h1: H.inscribed.h1, h2: `円周角 = ${ce}÷2 = ${ce / 2}` }; }, "S-CIRC-INSC"),
  p("g3c6u1e3", (r) => { const ic = r(15, 70); return { q: `円周角が ${ic}° のとき、同じ弧に対する中心角は何度ですか。`, ans: 2 * ic, h1: H.inscribed.h1, h2: `中心角 = ${ic}×2 = ${2 * ic}` }; }, "S-CIRC-INSC"),
  p("g3c6u1e4", (r) => { const ic = r(20, 60); return { q: `同じ弧に対する円周角どうしは等しい。円周角の1つが ${ic}° のとき、もう1つの円周角は何度ですか。`, ans: ic, h1: H.inscribed.h1, h2: `同じ弧の円周角は等しく ${ic}°` }; }, "S-CIRC-INSC"),
  p("g3c6u1e5", (r) => { const ce = 2 * r(25, 75); return { q: `弧ABに対する中心角が ${ce}° です。弧ABに対する円周角∠APBは何度ですか。`, ans: ce / 2, h1: H.inscribed.h1, h2: `${ce}÷2 = ${ce / 2}` }; }, "S-CIRC-INSC"),
  p("g3c6u1e6", (r) => { const ic = r(30, 80); return { q: `円周角 ${ic}° に対する中心角は、その円周角の何度ですか（中心角の大きさを答えよ）。`, ans: 2 * ic, h1: H.inscribed.h1, h2: `${ic}×2 = ${2 * ic}` }; }, "S-CIRC-INSC"),
  p("g3c6u1e7", (r) => { return { q: `半円の弧（直径）に対する円周角は何度ですか。`, ans: 90, h1: "直径に対する円周角は必ず90°", h2: "中心角180°の半分で90°" }; }, "S-CIRC-INSC"),
  p("g3c6u1e8", (r) => { const ce = 2 * r(40, 85); return { q: `中心Oで、弧に対する中心角が ${ce}° のとき、その弧に対する円周角を求めよ。`, ans: ce / 2, h1: H.inscribed.h1, h2: `${ce}÷2 = ${ce / 2}` }; }, "S-CIRC-INSC"),
  p("g3c6u1e9", (r) => { const ic = r(35, 80); return { q: `円周角が ${ic}° のとき、その2倍が中心角になります。中心角は何度ですか。`, ans: 2 * ic, h1: H.inscribed.h1, h2: `${ic}×2 = ${2 * ic}` }; }, "S-CIRC-INSC"),
  p("g3c6u1e10", (r) => { const ce = 2 * r(15, 60); return { q: `弧の中心角が ${ce}° のとき、その弧の上に立つ円周角はいくつですか。`, ans: ce / 2, h1: H.inscribed.h1, h2: `${ce}÷2 = ${ce / 2}` }; }, "S-CIRC-INSC"),
];
const U1_STANDARD = [
  p("g3c6u1s2", (r) => { const ce = 2 * r(20, 70); return { q: `中心角 ${ce}° の弧に対する円周角∠Pを求めよ。`, ans: ce / 2, h1: H.inscribed.h1, h2: `${ce}÷2 = ${ce / 2}` }; }, "S-CIRC-INSC"),
  p("g3c6u1s3", (r) => { const a = r(20, 60), b = r(20, 60); return { q: `三角形ABCが円に内接し、円周角∠ABCに対する弧ACの中心角が ${2 * a}° です。∠ABCは何度ですか。`, ans: a, h1: H.inscribed.h1, h2: `${2 * a}÷2 = ${a}` }; }, "S-CIRC-INSC"),
  p("g3c6u1s4", (r) => { const ic = r(25, 70); return { q: `点A,B,Pが円周上にある。弧ABに対する円周角∠APBが ${ic}° のとき、弧ABに対する中心角∠AOBは何度ですか。`, ans: 2 * ic, h1: H.inscribed.h1, h2: `${ic}×2 = ${2 * ic}` }; }, "S-CIRC-INSC"),
  p("g3c6u1s5", (r) => { const x = r(20, 55); return { q: `直径ABと円周上の点Pでできる∠APBは90°。∠PAB=${x}° のとき ∠PBA は何度ですか。`, ans: 90 - x, h1: "直径に対する円周角は90°", h2: `三角形の内角の和より 180−90−${x} = ${90 - x}` }; }, "S-CIRC-INSC"),
  p("g3c6u1s6", (r) => { const ce = 2 * r(30, 70); return { q: `弧ABに対する中心角が ${ce}° のとき、弧AB上にない点Pがつくる円周角∠APBを求めよ。`, ans: ce / 2, h1: H.inscribed.h1, h2: `${ce}÷2 = ${ce / 2}` }; }, "S-CIRC-INSC"),
  p("g3c6u1s7", (r) => { const a = r(25, 65); return { q: `同じ弧に対する2つの円周角∠APB, ∠AQB がある。∠APB=${a}° のとき ∠AQB は何度ですか。`, ans: a, h1: H.inscribed.h1, h2: `同じ弧の円周角は等しく ${a}°` }; }, "S-CIRC-INSC"),
  p("g3c6u1s8", (r) => { const x = r(25, 60); return { q: `半円の直径ABと点Pで、∠APB=90°。∠ABP=${x}° のとき ∠BAP は何度ですか。`, ans: 90 - x, h1: "直径に対する円周角は90°", h2: `180−90−${x} = ${90 - x}` }; }, "S-CIRC-INSC"),
  p("g3c6u1s9", (r) => { const ic = r(30, 75); return { q: `円周角が ${ic}° のとき、それに対する中心角の大きさを求めよ。`, ans: 2 * ic, h1: H.inscribed.h1, h2: `${ic}×2 = ${2 * ic}` }; }, "S-CIRC-INSC"),
  p("g3c6u1s10", (r) => { const ce = 2 * r(35, 80); return { q: `中心角 ${ce}° に対応する円周角を求めよ。`, ans: ce / 2, h1: H.inscribed.h1, h2: `${ce}÷2 = ${ce / 2}` }; }, "S-CIRC-INSC"),
];
const U1_ADVANCED = [
  p("g3c6u1a2", (r) => { const a = r(20, 50), b = r(20, 50); return { q: `円周上に A,B,C,P があり、弧ABの円周角∠APB=${a}°、弧BCの円周角∠BPC=${b}°。弧ACの円周角∠APC は何度ですか。`, ans: a + b, h1: H.inscribed.h1, h2: `隣り合う円周角の和 ${a}+${b} = ${a + b}` }; }, "S-CIRC-INSC"),
  p("g3c6u1a3", (r) => { const x = r(25, 60); return { q: `直径ABと点Pで∠APB=90°。∠PAB=${x}° のとき、弧PBに対する中心角∠POB（中心O）は何度ですか。`, ans: 2 * x, h1: "円周角∠PAB は弧PBに立つ → 中心角はその2倍", h2: `${x}×2 = ${2 * x}` }; }, "S-CIRC-INSC"),
  p("g3c6u1a4", (r) => { const a = r(30, 70); return { q: `中心O、弦ABで三角形OABは二等辺三角形。∠OAB=${a}° のとき、弧ABに対する中心角∠AOB は何度ですか。`, ans: 180 - 2 * a, h1: "OA=OBの二等辺三角形の頂角", h2: `180−${a}×2 = ${180 - 2 * a}` }; }, "S-CIRC-INSC"),
  p("g3c6u1a5", (r) => { const a = r(30, 70); return { q: `中心O、OA=OBで∠AOB=${2 * a}°。このとき底角∠OAB は何度ですか。`, ans: 90 - a, h1: "二等辺三角形 OAB の底角", h2: `(180−${2 * a})÷2 = ${90 - a}` }; }, "S-CIRC-INSC"),
  p("g3c6u1a6", (r) => { const a = r(20, 55); return { q: `円周上のA,B,Pで∠PAB=${a}°、∠PBA=${a}°（PA=PB）。弧ABに対する中心角∠AOB は何度ですか。`, ans: 2 * (180 - 2 * a), h1: "まず円周角∠APB→その2倍が中心角", h2: `∠APB=180−2×${a}=${180 - 2 * a}、中心角=${180 - 2 * a}×2=${2 * (180 - 2 * a)}` }; }, "S-CIRC-INSC"),
  p("g3c6u1a7", (r) => { const x = r(30, 70); return { q: `直径ABの円周上に点Cがあり∠ABC=${x}°。∠BAC は何度ですか。`, ans: 90 - x, h1: "直径ABに対する∠ACB=90°", h2: `180−90−${x} = ${90 - x}` }; }, "S-CIRC-INSC"),
  p("g3c6u1a8", (r) => { const a = r(20, 45), b = r(20, 45); return { q: `円周上にP,A,Bがあり、∠APB=${a + b}° は弧ABの円周角。弧AB上の点Mで弧を分け、弧AMの円周角が ${a}° のとき、弧MBの円周角は何度ですか。`, ans: b, h1: "弧の分割：円周角も分けて和になる", h2: `${a + b}−${a} = ${b}` }; }, "S-CIRC-INSC"),
  p("g3c6u1a9", (r) => { const a = r(30, 60); return { q: `中心Oで弧ABの中心角∠AOB=${2 * a}°。点Pが優弧上にあるとき円周角∠APB は何度ですか。`, ans: a, h1: H.inscribed.h1, h2: `${2 * a}÷2 = ${a}` }; }, "S-CIRC-INSC"),
  p("g3c6u1a10", (r) => { const a = r(25, 55); return { q: `円周上A,B,Cで三角形ABCがあり∠A=${a}°。辺BCに対する中心角∠BOC は何度ですか。`, ans: 2 * a, h1: "∠A は弧BC の円周角", h2: `${a}×2 = ${2 * a}` }; }, "S-CIRC-INSC"),
];
const U1_ONI = [
  p("g3c6u1o1", (r) => { const a = r(30, 50), b = r(30, 50); return { q: `三角形ABCが円Oに内接し、∠B=${a}°、∠C=${b}°。弧BC（∠Aが立つ弧）に対する中心角∠BOC は何度ですか。`, ans: 2 * (180 - a - b), h1: "∠A=180−∠B−∠C、∠A は弧BCの円周角", h2: `∠A=180−${a}−${b}=${180 - a - b}、中心角=${180 - a - b}×2=${2 * (180 - a - b)}` }; }, "S-CIRC-INSC"),
  p("g3c6u1o2", (r) => { const x = r(20, 40); return { q: `直径ABの円周上に点P。∠PAB=${x}° のとき、弧BPに対する円周角を直径ABの反対側の点Qがつくる。∠BQP は何度ですか。`, ans: x, h1: "弧BPに対する円周角は同じ大きさ", h2: `∠BAP=${x}° と同じ弧BP上の円周角だから ${x}` }; }, "S-CIRC-INSC"),
  p("g3c6u1o3", (r) => { const a = r(25, 55); return { q: `中心O、弦ABに対する中心角∠AOB=${2 * a}°。中心Oから弦ABに下ろした垂線と半径OAのなす角は何度ですか。`, ans: a, h1: "二等辺三角形OABの頂角を垂線が二等分", h2: `${2 * a}÷2 = ${a}` }; }, "S-CIRC-INSC"),
  p("g3c6u1o4", (r) => { const a = r(20, 50); return { q: `円に内接する四角形ABCDで、弧BCDに対する円周角∠BAD=${a}°。弧BAD（反対側）に対する中心角∠BOD（中心O・劣弧側）は ∠BAD の2倍。それは何度ですか。`, ans: 2 * a, h1: H.inscribed.h1, h2: `${a}×2 = ${2 * a}` }; }, "S-CIRC-INSC"),
  p("g3c6u1o5", (r) => { const x = r(20, 35), y = r(20, 35); return { q: `円周上にA,B,C,Dが順にあり、弧ABの円周角=${x}°、弧CDの円周角=${y}°。弦ACと弦BDの交点でできる角（弧ABと弧CDの円周角の和）は何度ですか。`, ans: x + y, h1: "交わる弦：交角＝両弧の円周角の和", h2: `${x}+${y} = ${x + y}` }; }, "S-CIRC-INSC"),
  p("g3c6u1o6", (r) => { const a = r(30, 60); return { q: `中心O、OA=OB、∠OAB=${a}°。点Pが弧AB（優弧側）上にあるときの円周角∠APB は何度ですか。`, ans: 90 - a, h1: "中心角∠AOB＝180−2×∠OAB、円周角はその半分", h2: `中心角=${180 - 2 * a}、円周角=${180 - 2 * a}÷2=${90 - a}` }; }, "S-CIRC-INSC"),
  p("g3c6u1o7", (r) => { const a = r(40, 70); return { q: `直径AB上にない点Cで∠ACB=90°。∠CAB=${a}° のとき、弧BCに対する中心角∠BOC は何度ですか。`, ans: 2 * a, h1: "∠CAB は弧BC の円周角（∠A）", h2: `${a}×2 = ${2 * a}` }; }, "S-CIRC-INSC"),
  p("g3c6u1o8", (r) => { const a = r(20, 40), b = r(20, 40); return { q: `円周上にP,A,Bがあり∠APB は弧ABの円周角。同じ弧上の別の点Qで三角形QABを作り∠QAB=${a}°、∠QBA=${b}°。円周角∠APB は何度ですか。`, ans: 180 - a - b, h1: "∠AQB=∠APB（同弧）、∠AQB=180−∠QAB−∠QBA", h2: `180−${a}−${b} = ${180 - a - b}` }; }, "S-CIRC-INSC"),
  p("g3c6u1o9", (r) => { const a = r(25, 55); return { q: `半円（直径AB）上に点P、∠ABP=${a}°。点Pにおける弧APの中点をMとすると弧AMの円周角は ∠ABP の半分。それは何度ですか。`, ans: a / 2, h1: "中点で弧を半分→円周角も半分", h2: `${a}÷2 = ${a / 2}` }; }, "S-CIRC-INSC"),
  p("g3c6u1o10", (r) => { const a = r(30, 60); return { q: `円に内接する正三角形でない三角形ABCがあり∠A=${a}°、AB=ACで∠B=∠C。∠B は何度ですか。`, ans: 90 - a / 2, h1: "二等辺三角形の底角", h2: `(180−${a})÷2 = ${90 - a / 2}` }; }, "S-CIRC-INSC"),
];

// ---- u2 円に内接する四角形 ----
const U2_EASY = [
  p("g3c6u2e2", (r) => { const b = r(50, 130), d = 180 - b; return { q: `円に内接する四角形ABCDで ∠B=${b}° のとき、向かい合う ∠D は何度ですか。`, ans: d, h1: H.cyclic.h1, h2: `∠D = 180 − ${b} = ${d}` }; }, "S-CIRC-CYC"),
  p("g3c6u2e3", (r) => { const a = r(60, 120), c = 180 - a; return { q: `円に内接する四角形で1つの角が ${a}° のとき、向かい合う角は何度ですか。`, ans: c, h1: H.cyclic.h1, h2: `180 − ${a} = ${c}` }; }, "S-CIRC-CYC"),
  p("g3c6u2e4", (r) => { const a = r(70, 110); return { q: `円に内接する四角形ABCDで ∠A=${a}°。∠A+∠C=180° から ∠C を求めよ。`, ans: 180 - a, h1: H.cyclic.h1, h2: `180 − ${a} = ${180 - a}` }; }, "S-CIRC-CYC"),
  p("g3c6u2e5", (r) => { const b = r(55, 125); return { q: `円に内接する四角形で ∠B=${b}° のとき ∠D を求めよ（向かい合う角）。`, ans: 180 - b, h1: H.cyclic.h1, h2: `180 − ${b} = ${180 - b}` }; }, "S-CIRC-CYC"),
  p("g3c6u2e6", (r) => { const a = r(80, 130); return { q: `円に内接する四角形で1組の対角のうち一方が ${a}°。もう一方は何度ですか。`, ans: 180 - a, h1: H.cyclic.h1, h2: `180 − ${a} = ${180 - a}` }; }, "S-CIRC-CYC"),
  p("g3c6u2e7", (r) => { const c = r(60, 120); return { q: `円に内接する四角形ABCDで ∠C=${c}° のとき ∠A は何度ですか。`, ans: 180 - c, h1: H.cyclic.h1, h2: `180 − ${c} = ${180 - c}` }; }, "S-CIRC-CYC"),
  p("g3c6u2e8", (r) => { const d = r(65, 115); return { q: `円に内接する四角形ABCDで ∠D=${d}° のとき ∠B は何度ですか。`, ans: 180 - d, h1: H.cyclic.h1, h2: `180 − ${d} = ${180 - d}` }; }, "S-CIRC-CYC"),
  p("g3c6u2e9", (r) => { const a = r(90, 130); return { q: `円に内接する四角形で1つの角が ${a}°（鈍角）のとき、向かい合う角は何度ですか。`, ans: 180 - a, h1: H.cyclic.h1, h2: `180 − ${a} = ${180 - a}` }; }, "S-CIRC-CYC"),
  p("g3c6u2e10", (r) => { const a = r(60, 90); return { q: `円に内接する四角形で1つの角が ${a}°（鋭角〜直角）のとき、向かい合う角は何度ですか。`, ans: 180 - a, h1: H.cyclic.h1, h2: `180 − ${a} = ${180 - a}` }; }, "S-CIRC-CYC"),
];
const U2_STANDARD = [
  p("g3c6u2s2", (r) => { const a = r(60, 110), b = r(60, 110); return { q: `円に内接する四角形ABCDで ∠A=${a}°、∠B=${b}°。∠C と ∠D の和は何度ですか。`, ans: 360 - a - b, h1: "四角形の内角の和は360°", h2: `360 − ${a} − ${b} = ${360 - a - b}` }; }, "S-CIRC-CYC"),
  p("g3c6u2s3", (r) => { const a = r(70, 120); return { q: `円に内接する四角形ABCDで ∠A=${a}°。∠A の外角（隣の頂点側の外角）は、向かい合う ∠C に等しい。∠C は何度ですか。`, ans: 180 - a, h1: H.cyclic.h1, h2: `内接四角形の外角＝対角。180−${a}=${180 - a}` }; }, "S-CIRC-CYC"),
  p("g3c6u2s4", (r) => { const a = r(60, 120); return { q: `円に内接する四角形で ∠A=${a}°。∠A の外角は何度ですか（外角＝対角 ∠C）。`, ans: 180 - a, h1: "内接四角形の外角＝向かい合う内角", h2: `180 − ${a} = ${180 - a}` }; }, "S-CIRC-CYC"),
  p("g3c6u2s5", (r) => { const a = r(70, 110), b = r(70, 110); return { q: `円に内接する四角形ABCDで ∠A=${a}°、∠B=${b}°。∠C を求めよ。`, ans: 180 - a, h1: H.cyclic.h1, h2: `∠C=180−∠A=180−${a}=${180 - a}` }; }, "S-CIRC-CYC"),
  p("g3c6u2s6", (r) => { const a = r(70, 110), b = r(70, 110); return { q: `円に内接する四角形ABCDで ∠A=${a}°、∠B=${b}°。∠D を求めよ。`, ans: 180 - b, h1: H.cyclic.h1, h2: `∠D=180−∠B=180−${b}=${180 - b}` }; }, "S-CIRC-CYC"),
  p("g3c6u2s7", (r) => { const a = r(2, 4); const A = 30 * a; return { q: `円に内接する四角形で ∠A:∠C = 1:2 で ∠A=${A}° のとき ∠C を求めよ（∠A+∠C=180°になるか確認しつつ実際の∠C）。`, ans: 180 - A, h1: H.cyclic.h1, h2: `∠C=180−${A}=${180 - A}` }; }, "S-CIRC-CYC"),
  p("g3c6u2s8", (r) => { const c = r(60, 120); return { q: `円に内接する四角形ABCDで ∠C=${c}° のとき、∠A の外角を求めよ（外角＝∠C）。`, ans: c, h1: "内接四角形の外角＝向かい合う内角", h2: `∠Aの外角=∠C=${c}` }; }, "S-CIRC-CYC"),
  p("g3c6u2s9", (r) => { const a = r(60, 115); return { q: `円に内接する四角形ABCDで ∠A=${a}°。∠C を求めよ。`, ans: 180 - a, h1: H.cyclic.h1, h2: `180 − ${a} = ${180 - a}` }; }, "S-CIRC-CYC"),
  p("g3c6u2s10", (r) => { const b = r(55, 125); return { q: `円に内接する四角形ABCDで ∠B=${b}°。∠D を求めよ。`, ans: 180 - b, h1: H.cyclic.h1, h2: `180 − ${b} = ${180 - b}` }; }, "S-CIRC-CYC"),
];
const U2_ADVANCED = [
  p("g3c6u2a2", (r) => { const a = r(50, 80); return { q: `円に内接する四角形ABCDで ∠A=${a}°、∠B=${a}°。∠C と ∠D をそれぞれ求めると、∠C は何度ですか。`, ans: 180 - a, h1: H.cyclic.h1, h2: `∠C=180−∠A=${180 - a}` }; }, "S-CIRC-CYC"),
  p("g3c6u2a3", (r) => { const a = r(60, 100); return { q: `円に内接する四角形ABCDで、対角線BDを引くと∠ADB=${a}°、弧ABの円周角∠ADB に等しい∠ACB がある。∠ACB は何度ですか。`, ans: a, h1: "同じ弧ABに対する円周角は等しい", h2: `∠ADB=∠ACB=${a}` }; }, "S-CIRC-CYC"),
  p("g3c6u2a4", (r) => { const a = r(70, 110); return { q: `円に内接する四角形ABCDで ∠BAD=${a}°。∠BCD を求め、さらに四角形の残り2角の和 ∠ABC+∠ADC は何度ですか。`, ans: 180, h1: "残り1組の対角の和も180°", h2: `∠ABC+∠ADC = 180` }; }, "S-CIRC-CYC"),
  p("g3c6u2a5", (r) => { const a = r(40, 70), b = r(40, 70); return { q: `円に内接する四角形ABCDで、三角形ABDにおいて∠ABD=${a}°、∠ADB=${b}°。∠A（=∠BAD）は何度ですか。`, ans: 180 - a - b, h1: "三角形の内角の和180°", h2: `180−${a}−${b} = ${180 - a - b}` }; }, "S-CIRC-CYC"),
  p("g3c6u2a6", (r) => { const a = r(50, 80); const A = 2 * a; return { q: `円に内接する四角形ABCDで ∠A:∠C=2:1。∠A は何度ですか（∠A+∠C=180°）。`, ans: 120, h1: H.cyclic.h1, h2: `2x+x=180 → x=60、∠A=2×60=120` }; }, "S-CIRC-CYC"),
  p("g3c6u2a7", (r) => { const a = r(40, 80); return { q: `円に内接する四角形ABCDで ∠B:∠D=1:3。∠D は何度ですか（∠B+∠D=180°）。`, ans: 135, h1: H.cyclic.h1, h2: `x+3x=180 → x=45、∠D=3×45=135` }; }, "S-CIRC-CYC"),
  p("g3c6u2a8", (r) => { const a = r(60, 100); return { q: `円に内接する四角形ABCDで ∠A=${a}°、CD//AB（等脚台形）。∠D は何度ですか。`, ans: 180 - a, h1: "AB//CD より同側内角の和180°（=対角の和とも一致）", h2: `180 − ${a} = ${180 - a}` }; }, "S-CIRC-CYC"),
  p("g3c6u2a9", (r) => { const a = r(50, 70); return { q: `円に内接する四角形ABCDで ∠A=${a}°、∠B=${a + 20}°。∠D を求めよ。`, ans: 180 - (a + 20), h1: H.cyclic.h1, h2: `∠D=180−∠B=180−${a + 20}=${180 - (a + 20)}` }; }, "S-CIRC-CYC"),
  p("g3c6u2a10", (r) => { const a = r(60, 110); return { q: `円に内接する四角形ABCDで ∠ABC=${a}°。直線ABを延長した点Eで ∠CBE（外角）は何度ですか。`, ans: 180 - a, h1: "一直線上の角の和は180°", h2: `180 − ${a} = ${180 - a}` }; }, "S-CIRC-CYC"),
];
const U2_ONI = [
  p("g3c6u2o1", (r) => { const a = r(40, 60), b = r(40, 60); return { q: `円に内接する四角形ABCDで、三角形ABDにおいて∠DAB=${a}°、∠ABD=${b}°。向かい合う ∠C（=∠BCD）は何度ですか。`, ans: 180 - a, h1: "∠A＝∠DAB、∠C＝180−∠A", h2: `∠C=180−${a}=${180 - a}` }; }, "S-CIRC-CYC"),
  p("g3c6u2o2", (r) => { const a = r(50, 80); return { q: `円に内接する四角形ABCDで ∠A=${a}°。対角線で分けた弧から、弧BCDに対する中心角（∠Aの2倍）は何度ですか。`, ans: 2 * a, h1: "∠A は弧BCD の円周角→中心角はその2倍", h2: `${a}×2 = ${2 * a}` }; }, "S-CIRC-CYC"),
  p("g3c6u2o3", (r) => { return { q: `円に内接する四角形ABCDで ∠A:∠B:∠C:∠D = 2:3:?:? と続くとき、∠A=60°なら∠Cは（∠A+∠C=180°）何度ですか。`, ans: 120, h1: H.cyclic.h1, h2: `180−60=120` }; }, "S-CIRC-CYC"),
  p("g3c6u2o4", (r) => { const a = r(40, 70); return { q: `円に内接する四角形ABCDで ∠A=${a}°、∠B=${a}°（AB は弦）。∠C+∠D を求めると何度ですか。`, ans: 360 - 2 * a, h1: "四角形の内角の和360°", h2: `360−${a}−${a} = ${360 - 2 * a}` }; }, "S-CIRC-CYC"),
  p("g3c6u2o5", (r) => { const a = r(30, 50); return { q: `円に内接する四角形ABCDで、∠DBC=${a}°（弧DCの円周角）。同じ弧DCに対する∠DAC は何度ですか。`, ans: a, h1: "同じ弧DCに対する円周角は等しい", h2: `∠DAC=∠DBC=${a}` }; }, "S-CIRC-CYC"),
  p("g3c6u2o6", (r) => { const a = r(60, 90); return { q: `円に内接する四角形ABCDで ∠BAD=${a}°、対角線ACが∠BADを二等分するとき∠BAC は何度ですか。`, ans: a / 2, h1: "二等分→半分", h2: `${a}÷2 = ${a / 2}` }; }, "S-CIRC-CYC"),
  p("g3c6u2o7", (r) => { const a = r(50, 70), b = r(50, 70); return { q: `円に内接する四角形ABCDで ∠A=${a}°、∠B=${b}°。∠C と ∠D の差 ∠C−∠D の絶対値は何度ですか。`, ans: Math.abs((180 - a) - (180 - b)), h1: "∠C=180−A、∠D=180−B", h2: `|(180−${a})−(180−${b})| = ${Math.abs(b - a)}` }; }, "S-CIRC-CYC"),
  p("g3c6u2o8", (r) => { const a = r(60, 100); return { q: `円に内接する四角形ABCDで ∠ABC=${a}°。辺CBの延長上の点Eでの外角∠ABE と、向かい合う∠ADC は等しい。∠ADC は何度ですか。`, ans: 180 - a, h1: "内接四角形の外角＝対角", h2: `∠ADC=180−∠ABC=180−${a}=${180 - a}` }; }, "S-CIRC-CYC"),
  p("g3c6u2o9", (r) => { const a = r(40, 60); return { q: `円に内接する四角形ABCDが等脚台形（AD//BC）で ∠B=${a}°。∠A は何度ですか（AD//BCより∠A+∠B=180°）。`, ans: 180 - a, h1: "AD//BC の同側内角の和180°", h2: `180 − ${a} = ${180 - a}` }; }, "S-CIRC-CYC"),
  p("g3c6u2o10", (r) => { const a = r(2, 5); const A = 20 * a; return { q: `円に内接する四角形ABCDで ∠A=${A}°、∠B=∠Aより40°大きい。∠D を求めよ。`, ans: 180 - (A + 40), h1: H.cyclic.h1, h2: `∠B=${A + 40}、∠D=180−${A + 40}=${180 - (A + 40)}` }; }, "S-CIRC-CYC"),
];

// ---- u3 接線と円周角（接弦角） ----
const U3_EASY = [
  p("g3c6u3e2", (r) => { const a = r(25, 75); return { q: `円の接線と弦のつくる角（接弦角）が ${a}° のとき、その弦に対する円周角は何度ですか。`, ans: a, h1: H.tangent.h1, h2: `接弦角の定理より ${a}°` }; }, "S-CIRC-TAN"),
  p("g3c6u3e3", (r) => { return { q: `円の接線と、接点を通る半径とのつくる角は何度ですか。`, ans: 90, h1: H.tangent.h2, h2: "接線⊥半径で90°" }; }, "S-CIRC-TAN"),
  p("g3c6u3e4", (r) => { const a = r(30, 70); return { q: `接点Aで引いた接線と弦ABのなす角が ${a}°。弦ABに対する円周角∠APB は何度ですか。`, ans: a, h1: H.tangent.h1, h2: `接弦角＝円周角＝${a}` }; }, "S-CIRC-TAN"),
  p("g3c6u3e5", (r) => { const a = r(20, 60); return { q: `弦ABに対する円周角が ${a}° のとき、接点Aでの接弦角（接線と弦ABのなす角）は何度ですか。`, ans: a, h1: H.tangent.h1, h2: `円周角＝接弦角＝${a}` }; }, "S-CIRC-TAN"),
  p("g3c6u3e6", (r) => { const a = r(35, 80); return { q: `接弦角が ${a}° のとき、同じ弦に対する円周角を求めよ。`, ans: a, h1: H.tangent.h1, h2: `${a}°` }; }, "S-CIRC-TAN"),
  p("g3c6u3e7", (r) => { return { q: `円の中心Oから接点Tに引いた半径OTと接線のなす角は何度ですか。`, ans: 90, h1: H.tangent.h2, h2: "半径⊥接線で90°" }; }, "S-CIRC-TAN"),
  p("g3c6u3e8", (r) => { const a = r(25, 65); return { q: `接線と弦のつくる角が ${a}°。この弦に対する円周角はいくつですか。`, ans: a, h1: H.tangent.h1, h2: `${a}°` }; }, "S-CIRC-TAN"),
  p("g3c6u3e9", (r) => { const a = r(30, 75); return { q: `円周角が ${a}° のとき、その弦の端での接弦角を求めよ。`, ans: a, h1: H.tangent.h1, h2: `接弦角＝円周角＝${a}` }; }, "S-CIRC-TAN"),
  p("g3c6u3e10", (r) => { const a = r(40, 80); return { q: `接弦角が ${a}°。同じ弧の円周角を求めよ。`, ans: a, h1: H.tangent.h1, h2: `${a}°` }; }, "S-CIRC-TAN"),
];
const U3_STANDARD = [
  p("g3c6u3s2", (r) => { const a = r(30, 70); return { q: `接点Aでの接線と弦ABのなす角が ${a}°。弦ABに対する中心角∠AOB（接弦角→円周角→中心角）は何度ですか。`, ans: 2 * a, h1: "接弦角＝円周角、中心角＝円周角×2", h2: `${a}×2 = ${2 * a}` }; }, "S-CIRC-TAN"),
  p("g3c6u3s3", (r) => { const a = r(20, 60); return { q: `弦ABの両端での2つの接弦角は、弦ABに対する円周角に等しい。一方の接弦角が ${a}° のとき、もう一方の弧に対する円周角は何度ですか。`, ans: 180 - a, h1: "弦の反対側の弧の円周角は 180−（同弧の円周角）", h2: `180 − ${a} = ${180 - a}` }; }, "S-CIRC-TAN"),
  p("g3c6u3s4", (r) => { const a = r(30, 70); return { q: `接線TAと弦ABで接弦角∠TAB=${a}°。三角形OABが二等辺（OA=OB）のとき、底角∠OAB は何度ですか。中心角∠AOB=${2 * a}° を使うこと。`, ans: 90 - a, h1: "中心角=2×接弦角、底角=(180−中心角)/2", h2: `(180−${2 * a})÷2 = ${90 - a}` }; }, "S-CIRC-TAN"),
  p("g3c6u3s5", (r) => { const a = r(25, 65); return { q: `接弦角が ${a}° のとき、その弦に対する円周角と中心角の和は何度ですか。`, ans: a + 2 * a, h1: "円周角=接弦角、中心角=2×接弦角", h2: `${a}+${2 * a} = ${3 * a}` }; }, "S-CIRC-TAN"),
  p("g3c6u3s6", (r) => { const a = r(40, 80); return { q: `接線と弦のなす角が ${a}°（鋭角側）。同じ接点の反対側の接弦角は何度ですか。`, ans: 180 - a, h1: "接線は一直線、両側の角の和は180°", h2: `180 − ${a} = ${180 - a}` }; }, "S-CIRC-TAN"),
  p("g3c6u3s7", (r) => { const a = r(30, 70); return { q: `接点Tで接線を引き、弦TAに対する接弦角が ${a}°。弦TAに対する中心角を求めよ。`, ans: 2 * a, h1: "中心角＝円周角×2、円周角＝接弦角", h2: `${a}×2 = ${2 * a}` }; }, "S-CIRC-TAN"),
  p("g3c6u3s8", (r) => { const a = r(20, 50), b = r(20, 50); return { q: `三角形ABCの頂点Aで接線を引くと、弦ABとの接弦角=∠ACB=${a}°、弦ACとの接弦角=∠ABC=${b}°。∠BAC は何度ですか。`, ans: 180 - a - b, h1: "三角形の内角の和180°", h2: `180−${a}−${b} = ${180 - a - b}` }; }, "S-CIRC-TAN"),
  p("g3c6u3s9", (r) => { const a = r(30, 75); return { q: `接弦角∠TAB=${a}° のとき、弦ABに対する円周角∠APB を求めよ。`, ans: a, h1: H.tangent.h1, h2: `${a}°` }; }, "S-CIRC-TAN"),
  p("g3c6u3s10", (r) => { return { q: `円外の点Pから引いた2本の接線の接点をA,Bとする。半径OAと接線PAのなす角は何度ですか。`, ans: 90, h1: H.tangent.h2, h2: "接線⊥半径で90°" }; }, "S-CIRC-TAN"),
];
const U3_ADVANCED = [
  p("g3c6u3a2", (r) => { const a = r(20, 50), b = r(20, 50); return { q: `円に内接する三角形ABCの頂点Aで接線を引く。弦ABとの接弦角=${a}°（=∠ACB）、弦ACとの接弦角=${b}°（=∠ABC）。∠A は何度ですか。`, ans: 180 - a - b, h1: "接弦角＝対辺の円周角、内角の和180°", h2: `180−${a}−${b} = ${180 - a - b}` }; }, "S-CIRC-TAN"),
  p("g3c6u3a3", (r) => { const a = r(30, 60); return { q: `円外の点Pから2本の接線PA,PBを引く。∠APB=${2 * a}° のとき、PA=PBの二等辺三角形の底角∠PAB は何度ですか。`, ans: 90 - a, h1: "PA=PB の二等辺三角形", h2: `(180−${2 * a})÷2 = ${90 - a}` }; }, "S-CIRC-TAN"),
  p("g3c6u3a4", (r) => { const a = r(40, 70); return { q: `円外の点Pから2接線PA,PBを引き、∠PAB=${a}°（PA=PB）。∠APB は何度ですか。`, ans: 180 - 2 * a, h1: "二等辺三角形の頂角", h2: `180−${a}×2 = ${180 - 2 * a}` }; }, "S-CIRC-TAN"),
  p("g3c6u3a5", (r) => { const a = r(30, 70); return { q: `接点Aでの接線と弦ABの接弦角が ${a}°。弦ABに対する中心角∠AOB を求めよ。`, ans: 2 * a, h1: "接弦角→円周角→中心角(×2)", h2: `${a}×2 = ${2 * a}` }; }, "S-CIRC-TAN"),
  p("g3c6u3a6", (r) => { const a = r(35, 65); return { q: `円外の点Pから接線PA（接点A）を引き、弦ABがある。接弦角∠PAB=${a}° のとき、弦ABに対する円周角∠ACB（弧の同じ側）は何度ですか。`, ans: a, h1: H.tangent.h1, h2: `接弦角＝円周角＝${a}` }; }, "S-CIRC-TAN"),
  p("g3c6u3a7", (r) => { const a = r(30, 60), b = r(30, 60); return { q: `点Aで接線を引いた円に三角形ABCが内接。接線と弦ABの接弦角=${a}°、∠ABC=${b}°。∠BAC は何度ですか（接弦角=∠ACB=${a}°）。`, ans: 180 - a - b, h1: "接弦角＝対角の円周角∠ACB、内角の和180°", h2: `180−${a}−${b} = ${180 - a - b}` }; }, "S-CIRC-TAN"),
  p("g3c6u3a8", (r) => { const a = r(40, 80); return { q: `円外の点Pから接線PT（接点T）と中心Oを結ぶ。∠OPT=${90 - a}° のとき ∠POT は何度ですか（∠OTP=90°）。`, ans: a, h1: "三角形OTP の内角の和、∠OTP=90°", h2: `180−90−(90−${a}) = ${a}` }; }, "S-CIRC-TAN"),
  p("g3c6u3a9", (r) => { const a = r(50, 70); return { q: `円外の点Pから2接線PA,PBを引き四角形OAPB（Oは中心）を作る。∠OAP=∠OBP=90°、∠APB=${2 * (90 - a)}° のとき ∠AOB は何度ですか。`, ans: 2 * a, h1: "四角形の内角の和360°、∠OAP=∠OBP=90°", h2: `360−90−90−${2 * (90 - a)} = ${2 * a}` }; }, "S-CIRC-TAN"),
  p("g3c6u3a10", (r) => { const a = r(30, 60); return { q: `接点Aで接線を引き、弦ABの接弦角が ${a}°。弦ABの反対側の弧に対する円周角は何度ですか。`, ans: 180 - a, h1: "反対側の弧の円周角＝180−（接弦角）", h2: `180 − ${a} = ${180 - a}` }; }, "S-CIRC-TAN"),
];
const U3_ONI = [
  p("g3c6u3o1", (r) => { const a = r(30, 50), b = r(30, 50); return { q: `円に内接する三角形ABCの頂点Aで接線を引く。弦ABとの接弦角=${a}°、弦ACとの接弦角=${b}°。弦BCに対する中心角∠BOC は何度ですか（∠BAC の2倍）。`, ans: 2 * (180 - a - b), h1: "∠BAC＝180−（2つの接弦角）、中心角＝∠BAC×2", h2: `∠A=${180 - a - b}、中心角=${180 - a - b}×2=${2 * (180 - a - b)}` }; }, "S-CIRC-TAN"),
  p("g3c6u3o2", (r) => { const a = r(20, 40); return { q: `円外の点Pから2接線PA,PBを引く。弧AB（劣弧）の中心角∠AOB=${180 - 2 * a}° のとき、∠APB は何度ですか（OAPB の内角の和360°、∠OAP=∠OBP=90°）。`, ans: 2 * a, h1: "∠APB=180−∠AOB", h2: `360−90−90−${180 - 2 * a} = ${2 * a}` }; }, "S-CIRC-TAN"),
  p("g3c6u3o3", (r) => { const a = r(35, 65); return { q: `接点Aで接線を引き、弦ABの接弦角=${a}°。弦AB上に円周角∠APB と、反対弧の円周角∠AQB がある。∠APB+∠AQB は何度ですか。`, ans: 180, h1: "同弧と反対弧の円周角の和は180°", h2: `${a}+（180−${a}）= 180` }; }, "S-CIRC-TAN"),
  p("g3c6u3o4", (r) => { const a = r(30, 60); return { q: `円外の点Pから接線PT（接点T）。中心Oで∠TPO=${a}°、∠OTP=90°。半径OTと線分OPのなす角∠TOP は何度ですか。`, ans: 90 - a, h1: "三角形OTP の内角の和180°、∠OTP=90°", h2: `180−90−${a} = ${90 - a}` }; }, "S-CIRC-TAN"),
  p("g3c6u3o5", (r) => { const a = r(20, 45), b = r(20, 45); return { q: `頂点Aで接線を引いた円に三角形ABCが内接。弦ABの接弦角=${a}°（=∠ACB）、弦ACの接弦角=${b}°（=∠ABC）。弦BCに対する円周角∠BAC は何度ですか。`, ans: 180 - a - b, h1: "接弦角＝対角の円周角、内角の和180°", h2: `180−${a}−${b} = ${180 - a - b}` }; }, "S-CIRC-TAN"),
  p("g3c6u3o6", (r) => { const a = r(50, 75); return { q: `円外の点Pから2接線PA,PB。∠PAB=${a}°（PA=PB）。弦ABに対する中心角∠AOB は何度ですか（接弦角∠PAB＝円周角→中心角×2）。`, ans: 2 * a, h1: "接弦角∠PAB＝弦ABの円周角→中心角はその2倍", h2: `${a}×2 = ${2 * a}` }; }, "S-CIRC-TAN"),
  p("g3c6u3o7", (r) => { const a = r(40, 70); return { q: `円外の点Pから2接線PA,PBを引く。∠APB=${2 * (90 - a)}° のとき、弦ABに対する円周角（優弧側）∠ACB は何度ですか。`, ans: a, h1: "∠AOB=180−∠APB、円周角＝中心角÷2", h2: `∠AOB=${2 * a}、円周角=${2 * a}÷2=${a}` }; }, "S-CIRC-TAN"),
  p("g3c6u3o8", (r) => { const a = r(30, 55); return { q: `接点Aで接線、弦ABの接弦角=${a}°。弦ABの中点Mと中心Oで∠OAM（半径OAと弦のなす角）は何度ですか（接弦角と∠OAB は余角、∠OAB=90−${a}）。`, ans: 90 - a, h1: "半径OAと接線は90°、接弦角を引く", h2: `90 − ${a} = ${90 - a}` }; }, "S-CIRC-TAN"),
  p("g3c6u3o9", (r) => { const a = r(25, 50); return { q: `円に内接する四角形ABCDの頂点Aで接線を引くと、弦ADとの接弦角=${a}°（=∠ACD の弧の円周角∠ABD）。同じ弧ADに対する円周角∠ACD は何度ですか。`, ans: a, h1: "接弦角＝弦ADに対する円周角（同弧）", h2: `∠ACD=${a}` }; }, "S-CIRC-TAN"),
  p("g3c6u3o10", (r) => { const a = r(30, 55); return { q: `頂点Aで接線を引いた円に三角形ABCが内接し、AB=AC（二等辺）。弦ABの接弦角=${a}° のとき、底角∠ABC は何度ですか（接弦角∠(接線,AB)＝∠ACB＝∠ABC）。`, ans: a, h1: "AB=AC より∠ABC=∠ACB、接弦角＝∠ACB", h2: `∠ABC=${a}` }; }, "S-CIRC-TAN"),
];

const lv = (fn, idp, skill, extra) => ({
  easy: [p(idp + "e", (r) => fn(r, "easy"), skill), ...(extra.easy || [])],
  standard: [p(idp + "s", (r) => fn(r, "standard"), skill), ...(extra.standard || [])],
  advanced: [p(idp + "a", (r) => fn(r, "advanced"), skill), ...(extra.advanced || [])],
  oni: [...(extra.oni || [])],
});

export const chapter = {
  id: "g3c6",
  name: "円",
  emoji: "⭕",
  color: "#22d3ee",
  grade: 3,
  units: [
    { id: "g3c6u1", name: "円周角と中心角", emoji: "🎯", desc: "中心角=円周角×2", problems: lv(genInscribed, "g3c6u1", "S-CIRC-INSC", { easy: U1_EASY, standard: U1_STANDARD, advanced: U1_ADVANCED, oni: U1_ONI }) },
    { id: "g3c6u2", name: "円に内接する四角形", emoji: "⬜", desc: "対角の和180°", problems: lv(genCyclic, "g3c6u2", "S-CIRC-CYC", { easy: U2_EASY, standard: U2_STANDARD, advanced: U2_ADVANCED, oni: U2_ONI }) },
    { id: "g3c6u3", name: "接線と円周角", emoji: "📏", desc: "接弦角・接線⊥半径", problems: lv(genTangent, "g3c6u3", "S-CIRC-TAN", { easy: U3_EASY, standard: U3_STANDARD, advanced: U3_ADVANCED, oni: U3_ONI }) },
  ],
};
