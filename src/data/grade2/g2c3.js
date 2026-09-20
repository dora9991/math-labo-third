// ============================================================
// g2c3 — 中2「一次関数」（★自動作問版）
//  数値で答える問題は numChoices、式 y=ax+b・交点(x,y) は専用ダミー。
//  係数・座標を整数に保ち、答えが必ず整数になるよう構成する。
// ============================================================
import { polyStr, neg, exprChoices, numChoices } from "../_algebra.js";

const p = (id, build, skill = null) => ({ id, build, skill });
const rnz = (r, a, b) => { let v = 0; while (v === 0) v = r(a, b); return v; };

const H = {
  rate: { h1: "一次関数 y=ax+b の変化の割合は、いつも a（xの係数）", h2: "yの増加量 = 変化の割合 × xの増加量" },
  eq: { h1: "傾き=変化の割合=a、切片=x が0のときの y=b", h2: "通る点を y=ax+b に代入して b を求める" },
  graph: { h1: "交点は2式の y を等しいとおいて x を求める", h2: "求めた x をどちらかの式に代入して y を出す" },
};
const linStr = (a, b) => "y=" + polyStr([{ c: a, v: { x: 1 } }, { c: b, v: {} }]);
const pointStr = (x, y) => `(${neg(x)}, ${neg(y)})`;

// ============================================================
// ── u1 変化の割合・増加量（答えは数値）──
// ============================================================

// [u1 easy①] 変化の割合（= a）  ※既存テンプレ
function genRate(r, level) {
  const a = rnz(r, -5, 5), b = rnz(r, -6, 6);
  if (level === "easy") {
    return { q: `一次関数 ${linStr(a, b)} の変化の割合を求めなさい。`, ans: a, choices: numChoices(a, r, [b, -a, a + b]), h1: H.rate.h1, h2: H.rate.h2 };
  }
  // xが p→q に増えるときの y の増加量 = a(q−p)
  const pq0 = r(-4, 2), d = r(2, 5), q0 = pq0 + d;
  const inc = a * d;
  return { q: `一次関数 ${linStr(a, b)} で、x が ${neg(pq0)} から ${neg(q0)} まで増えるとき、y の増加量を求めなさい。`, ans: inc, choices: numChoices(inc, r, [a, d, a + d, -inc]), h1: H.rate.h1, h2: H.rate.h2 };
}

// [u1 easy②] 切片（= b）
function genRateE_intercept(r) {
  const a = rnz(r, -5, 5), b = rnz(r, -7, 7);
  return { q: `一次関数 ${linStr(a, b)} の切片を求めなさい。`, ans: b, choices: numChoices(b, r, [a, -b, a + b]), h1: H.eq.h1, h2: "切片は x=0 のときの y の値（=b）" };
}
// [u1 easy③] x=0 のときの y（= b）
function genRateE_x0(r) {
  const a = rnz(r, -5, 5), b = rnz(r, -7, 7);
  return { q: `一次関数 ${linStr(a, b)} で、x=0 のときの y の値を求めなさい。`, ans: b, choices: numChoices(b, r, [a, -b, a]), h1: "x=0 を式に代入する", h2: "ax+b で x=0 なら y=b（切片）" };
}
// [u1 easy④] x=1 のときの y（= a+b）
function genRateE_x1(r) {
  const a = rnz(r, -5, 5), b = rnz(r, -6, 6);
  const y = a + b;
  return { q: `一次関数 ${linStr(a, b)} で、x=1 のときの y の値を求めなさい。`, ans: y, choices: numChoices(y, r, [a, b, a - b]), h1: "x=1 を式に代入する", h2: `${neg(a)}×1${b < 0 ? "−" + (-b) : "+" + b} を計算する` };
}
// [u1 easy⑤] 指定の x での y（= a*x0+b、x0 は小さい整数）
function genRateE_val(r) {
  const a = rnz(r, -4, 4), b = rnz(r, -6, 6), x0 = rnz(r, 2, 4);
  const y = a * x0 + b;
  return { q: `一次関数 ${linStr(a, b)} で、x=${x0} のときの y の値を求めなさい。`, ans: y, choices: numChoices(y, r, [a + b, a * x0, b - a * x0]), h1: "x の値を式に代入する", h2: `${neg(a)}×${x0}${b < 0 ? "−" + (-b) : "+" + b}` };
}
// [u1 easy⑥] 負の x での y
function genRateE_valNeg(r) {
  const a = rnz(r, -4, 4), b = rnz(r, -6, 6), x0 = -rnz(r, 2, 4);
  const y = a * x0 + b;
  return { q: `一次関数 ${linStr(a, b)} で、x=${neg(x0)} のときの y の値を求めなさい。`, ans: y, choices: numChoices(y, r, [a * x0, b, -y]), h1: "負の x も そのまま代入する", h2: `${neg(a)}×(${neg(x0)})${b < 0 ? "−" + (-b) : "+" + b}` };
}
// [u1 easy⑦] 変化の割合（係数が分かりにくい並びでも = a）
function genRateE_rate2(r) {
  const a = rnz(r, -6, 6), b = rnz(r, -5, 5);
  return { q: `一次関数 ${linStr(a, b)} について、x が 1 増えると y はいくつ増えますか。`, ans: a, choices: numChoices(a, r, [b, -a, a + b]), h1: "x が1増えると y は a 増える", h2: "変化の割合 a がそのまま答え" };
}
// [u1 easy⑧] 比例 y=ax の変化の割合
function genRateE_prop(r) {
  const a = rnz(r, -6, 6);
  return { q: `比例 y=${neg(a)}x の変化の割合を求めなさい。`, ans: a, choices: numChoices(a, r, [-a, a + 1, a - 1]), h1: "比例も一次関数の仲間で、変化の割合は a", h2: "y=ax の a が変化の割合（=傾き）" };
}
// [u1 easy⑨] y の増加量（x が1増えるとき×n、小さい数）
function genRateE_incSmall(r) {
  const a = rnz(r, -5, 5), b = rnz(r, -6, 6), d = r(2, 4);
  const inc = a * d;
  return { q: `一次関数 ${linStr(a, b)} で、x が ${d} 増えるときの y の増加量を求めなさい。`, ans: inc, choices: numChoices(inc, r, [a, a + d, -inc]), h1: H.rate.h1, h2: `y の増加量 = ${neg(a)}×${d}` };
}
// [u1 easy⑩] x が減るときの y の増加量（負の Δx）
function genRateE_dec(r) {
  const a = rnz(r, -4, 4), b = rnz(r, -6, 6), d = r(2, 4);
  const inc = a * (-d);
  return { q: `一次関数 ${linStr(a, b)} で、x が ${d} 減るときの y の増加量を求めなさい。`, ans: inc, choices: numChoices(inc, r, [a, a * d, -inc]), h1: "x の増加量は −（減った分）", h2: `y の増加量 = ${neg(a)}×(${neg(-d)})` };
}

// [u1 standard①] y の増加量 = a·Δx  ※既存テンプレ
// （genRate(level="standard") を使う）
// [u1 standard②] x の増加量 = Δy / a（割り切れるよう構成）
function genRateS_dx(r) {
  const a = rnz(r, -5, 5), b = rnz(r, -6, 6), dx = r(2, 5);
  const dy = a * dx;
  return { q: `一次関数 ${linStr(a, b)} で、y が ${neg(dy)} 増えるとき、x はいくつ増えますか。`, ans: dx, choices: numChoices(dx, r, [dy, a, -dx]), h1: "x の増加量 = y の増加量 ÷ 変化の割合", h2: `${neg(dy)} ÷ ${neg(a)} = ${dx}` };
}
// [u1 standard③] 2点から変化の割合 Δy/Δx
function genRateS_two(r) {
  const a = rnz(r, -5, 5), x1 = rnz(r, -4, 2), x2 = x1 + r(1, 4), b = rnz(r, -6, 6);
  const y1 = a * x1 + b, y2 = a * x2 + b;
  return { q: `2点 (${neg(x1)}, ${neg(y1)})、(${neg(x2)}, ${neg(y2)}) を通る直線の変化の割合を求めなさい。`, ans: a, choices: numChoices(a, r, [-a, y2 - y1, x2 - x1]), h1: "変化の割合 = (yの増加量)÷(xの増加量)", h2: `(${neg(y2)}−(${neg(y1)})) ÷ (${neg(x2)}−(${neg(x1)}))` };
}
// [u1 standard④] x=p から x=q への y の増加量（任意区間）
function genRateS_inc(r) {
  const a = rnz(r, -5, 5), b = rnz(r, -6, 6), x1 = rnz(r, -4, 2), x2 = x1 + r(2, 5);
  const inc = a * (x2 - x1);
  return { q: `一次関数 ${linStr(a, b)} で、x が ${neg(x1)} から ${neg(x2)} まで増えるときの y の増加量を求めなさい。`, ans: inc, choices: numChoices(inc, r, [a, x2 - x1, -inc]), h1: H.rate.h1, h2: `${neg(a)}×(${neg(x2)}−(${neg(x1)}))` };
}
// [u1 standard⑤] y の値の差 = a·Δx を別表現で
function genRateS_diff(r) {
  const a = rnz(r, -5, 5), b = rnz(r, -6, 6), x1 = rnz(r, -3, 1), x2 = x1 + r(2, 4);
  const y1 = a * x1 + b, y2 = a * x2 + b;
  return { q: `一次関数 ${linStr(a, b)} で、x=${neg(x1)} のときと x=${neg(x2)} のときの y の差（後−前）を求めなさい。`, ans: y2 - y1, choices: numChoices(y2 - y1, r, [a, x2 - x1, -(y2 - y1)]), h1: "y の差 = 変化の割合 × x の差", h2: `${neg(a)}×(${neg(x2)}−(${neg(x1)}))` };
}
// [u1 standard⑥] 変化の割合が与えられ、Δx から Δy
function genRateS_givenRate(r) {
  const a = rnz(r, -6, 6), dx = r(2, 6);
  const dy = a * dx;
  return { q: `ある一次関数の変化の割合は ${neg(a)} です。x が ${dx} 増えるとき、y はいくつ増えますか。`, ans: dy, choices: numChoices(dy, r, [a, dx, -dy]), h1: "y の増加量 = 変化の割合 × x の増加量", h2: `${neg(a)}×${dx}` };
}
// [u1 standard⑦] Δy と Δx から変化の割合
function genRateS_rateFrom(r) {
  const a = rnz(r, -5, 5), dx = r(2, 5);
  const dy = a * dx;
  return { q: `ある一次関数で、x が ${dx} 増えると y は ${neg(dy)} 増えます。変化の割合を求めなさい。`, ans: a, choices: numChoices(a, r, [dy, dx, -a]), h1: "変化の割合 = y の増加量 ÷ x の増加量", h2: `${neg(dy)} ÷ ${dx} = ${neg(a)}` };
}
// [u1 standard⑧] x が減るとき y がいくつ変わるか（任意区間）
function genRateS_decRange(r) {
  const a = rnz(r, -5, 5), b = rnz(r, -6, 6), x1 = rnz(r, 1, 4), x2 = x1 - r(2, 4);
  const inc = a * (x2 - x1);
  return { q: `一次関数 ${linStr(a, b)} で、x が ${neg(x1)} から ${neg(x2)} まで変わるときの y の増加量を求めなさい。`, ans: inc, choices: numChoices(inc, r, [a, x1 - x2, -inc]), h1: "x の増加量は（後−前）で負になることもある", h2: `${neg(a)}×(${neg(x2)}−(${neg(x1)}))` };
}
// [u1 standard⑨] 比例定数（y=ax）を1点から
function genRateS_propConst(r) {
  const a = rnz(r, -5, 5), x0 = rnz(r, 2, 5);
  const y0 = a * x0;
  return { q: `y は x に比例し、x=${x0} のとき y=${neg(y0)} です。変化の割合を求めなさい。`, ans: a, choices: numChoices(a, r, [y0, x0, -a]), h1: "比例 y=ax の変化の割合は a", h2: `a = ${neg(y0)} ÷ ${x0} = ${neg(a)}` };
}
// [u1 standard⑩] 切片を1点と傾きから（b = y−ax）→ 数値で答える
function genRateS_bFromPoint(r) {
  const a = rnz(r, -4, 4), x0 = rnz(r, -3, 3), y0 = rnz(r, -6, 6);
  const b = y0 - a * x0;
  return { q: `傾き ${neg(a)} の直線が点 (${neg(x0)}, ${neg(y0)}) を通ります。切片 b を求めなさい。`, ans: b, choices: numChoices(b, r, [y0, a * x0, -b]), h1: "y=ax+b に点を代入して b を求める", h2: `b = ${neg(y0)} − ${neg(a)}×(${neg(x0)})` };
}

// [u1 advanced①] 変域 p≤x≤q のときの y の変化量（最大−最小）
function genRateA_range(r) {
  const a = rnz(r, -5, 5), b = rnz(r, -6, 6), p0 = rnz(r, -4, 1), q0 = p0 + r(2, 5);
  const yp = a * p0 + b, yq = a * q0 + b;
  const span = Math.abs(yq - yp);
  return { q: `一次関数 ${linStr(a, b)} で、x の変域が ${neg(p0)}≦x≦${neg(q0)} のとき、y の変域の幅（最大−最小）を求めなさい。`, ans: span, choices: numChoices(span, r, [yq - yp, Math.abs(a), q0 - p0]), h1: "y の変域の幅 = |変化の割合| × x の幅", h2: `|${neg(a)}|×(${neg(q0)}−(${neg(p0)}))` };
}
// [u1 advanced②] 速さ：水そう（毎分 a L、初め b L）
function genRateA_tank(r) {
  const a = rnz(r, 2, 6), b = r(2, 12), t = r(3, 8);
  const y = a * t + b;
  return { q: `水が ${b}L 入った水そうに、毎分 ${a}L ずつ水を入れます。${t} 分後の水の量(L)を求めなさい。`, ans: y, choices: numChoices(y, r, [a * t, b + a, a + t]), h1: "y = （毎分の量）×（時間）＋（初めの量）", h2: `y = ${a}×${t} + ${b}` };
}
// [u1 advanced③] 速さ：道のり（初め b km から毎分 a km）
function genRateA_move(r) {
  const a = rnz(r, 2, 6), b = r(1, 10), t = r(3, 8);
  const y = a * t + b;
  return { q: `A町から ${b}km の地点を出発し、毎時 ${a}km で進みます。${t} 時間後にA町から何 km の地点にいますか。`, ans: y, choices: numChoices(y, r, [a * t, b, a + t]), h1: "道のり = 速さ × 時間 ＋ 初めの位置", h2: `y = ${a}×${t} + ${b}` };
}
// [u1 advanced④] ろうそく（初め b cm、毎分 a cm 減る）の長さ
function genRateA_candle(r) {
  const a = rnz(r, 1, 3), b = r(12, 24), t = r(2, 6);
  const y = b - a * t;
  if (y < 0) return { skip: true };
  return { q: `長さ ${b}cm のろうそくが、火をつけると毎分 ${a}cm ずつ短くなります。${t} 分後の長さ(cm)を求めなさい。`, ans: y, choices: numChoices(y, r, [b, a * t, b + a * t]), h1: "y = 初めの長さ − （毎分減る量）×（時間）", h2: `y = ${b} − ${a}×${t}` };
}
// [u1 advanced⑤] 水そうが空になる時刻（b÷a が割り切れる構成）
function genRateA_empty(r) {
  const a = rnz(r, 2, 5), t = r(3, 8);
  const b = a * t; // 空になるのに t 分
  return { q: `水が ${b}L 入った水そうから、毎分 ${a}L ずつ排水します。空になるのは何分後ですか。`, ans: t, choices: numChoices(t, r, [b, a, t + 1]), h1: "空になる時間 = 全体量 ÷ 毎分の量", h2: `${b} ÷ ${a} = ${t}` };
}
// [u1 advanced⑥] グラフから変化の割合（傾き）を読む
function genRateA_graphRate(r) {
  const a = rnz(r, -4, 4), dx = r(2, 4);
  const dy = a * dx;
  return { q: `あるグラフ（直線）は、右へ ${dx} 進むと上へ ${neg(dy)} 進みます。この直線の変化の割合を求めなさい。`, ans: a, choices: numChoices(a, r, [dy, dx, -a]), h1: "変化の割合 = 縦の変化 ÷ 横の変化", h2: `${neg(dy)} ÷ ${dx} = ${neg(a)}` };
}
// [u1 advanced⑦] y=ax+b で y が 0 になる x（割り切れる構成）
function genRateA_xzero(r) {
  const a = rnz(r, 1, 5), x0 = rnz(r, -4, 4);
  const b = -a * x0; // y=0 のとき x=x0
  return { q: `一次関数 ${linStr(a, b)} で、y=0 となる x の値を求めなさい。`, ans: x0, choices: numChoices(x0, r, [b, a, -x0]), h1: "y=0 を代入して x を解く", h2: `${neg(a)}x${b < 0 ? "−" + (-b) : "+" + b}=0 を解く` };
}
// [u1 advanced⑧] 2つの量：料金（基本料 b＋1個 a 円）
function genRateA_fee(r) {
  const a = rnz(r, 30, 80), b = r(100, 300), n = r(3, 8);
  const y = a * n + b;
  return { q: `基本料金 ${b}円に、1個あたり ${a}円かかります。${n} 個買うときの合計金額(円)を求めなさい。`, ans: y, choices: numChoices(y, r, [a * n, b, a + n]), h1: "合計 = 基本料金 ＋ 1個の値段 × 個数", h2: `y = ${b} + ${a}×${n}` };
}
// [u1 advanced⑨] 2人の進み方の差（同時刻での距離差）
function genRateA_meet(r) {
  const a = rnz(r, 2, 5), c = rnz(r, 2, 5);
  let d2 = c; while (d2 === a) d2 = rnz(r, 2, 6);
  const t = r(3, 7);
  const diff = Math.abs((a - d2) * t);
  return { q: `兄は毎分 ${a}m、弟は毎分 ${d2}m で同じ向きに同時に出発します。${t} 分後の2人の距離(m)を求めなさい。`, ans: diff, choices: numChoices(diff, r, [(a + d2) * t, Math.abs(a - d2), a * t]), h1: "2人の距離 = 速さの差 × 時間", h2: `|${a}−${d2}|×${t}` };
}
// [u1 advanced⑩] 変域 → y の最小値（a の符号で場合分け）
function genRateA_min(r) {
  const a = rnz(r, -5, 5), b = rnz(r, -6, 6), p0 = rnz(r, -4, 1), q0 = p0 + r(2, 5);
  const yp = a * p0 + b, yq = a * q0 + b;
  const mn = Math.min(yp, yq);
  return { q: `一次関数 ${linStr(a, b)} で、x の変域が ${neg(p0)}≦x≦${neg(q0)} のとき、y の最小値を求めなさい。`, ans: mn, choices: numChoices(mn, r, [Math.max(yp, yq), a, b]), h1: "a>0 なら x 最小で y 最小、a<0 なら x 最大で y 最小", h2: "両端の y を求めて小さい方を選ぶ" };
}

// ============================================================
// ── u2 傾き・切片・式の決定（答えは式 linStr または数値）──
// ============================================================

// [u2 easy①][u2 standard①][u2 advanced①] ※既存テンプレ
function genEq(r, level) {
  if (level === "easy") {
    const a = rnz(r, -5, 5), b = rnz(r, -7, 7);
    const ans = linStr(a, b);
    const variants = [linStr(b, a), linStr(-a, b), linStr(a, -b)];
    return { q: `傾きが ${neg(a)}、切片が ${neg(b)} の一次関数の式を求めなさい。`, ans, choices: exprChoices(ans, variants, [linStr(a, b + 1), linStr(a + 1, b)], r), h1: H.eq.h1, h2: H.eq.h2 };
  }
  if (level === "standard") {
    // 傾き a で点(x1,y1)を通る → b = y1 − a x1
    const a = rnz(r, -4, 4), x1 = rnz(r, -4, 4), y1 = rnz(r, -6, 6);
    const b = y1 - a * x1;
    const ans = linStr(a, b);
    const variants = [linStr(a, y1), linStr(-a, b), linStr(a, -b)];
    return { q: `傾きが ${neg(a)} で、点(${neg(x1)}, ${neg(y1)}) を通る直線の式を求めなさい。`, ans, choices: exprChoices(ans, variants, [linStr(a, b + 1), linStr(a, b - 1)], r), h1: H.eq.h1, h2: H.eq.h2 };
  }
  // 2点を通る式（傾きが整数になるよう構成）
  const x1 = rnz(r, -4, 2), a = rnz(r, -3, 3), x2 = x1 + rnz(r, 1, 3);
  const b = rnz(r, -6, 6);
  const y1 = a * x1 + b, y2 = a * x2 + b;
  const ans = linStr(a, b);
  const variants = [linStr(a, y1), linStr(-a, b), linStr(a, -b)];
  return { q: `2点(${neg(x1)}, ${neg(y1)})、(${neg(x2)}, ${neg(y2)}) を通る直線の式を求めなさい。`, ans, choices: exprChoices(ans, variants, [linStr(a + 1, b), linStr(a, b + 1)], r), h1: H.eq.h1, h2: H.eq.h2 };
}

// [u2 easy②] 傾き a・切片 b の値（数値で傾きを答える）
function genEqE_slope(r) {
  const a = rnz(r, -6, 6), b = rnz(r, -6, 6);
  return { q: `一次関数 ${linStr(a, b)} の傾きを求めなさい。`, ans: a, choices: numChoices(a, r, [b, -a, a + b]), h1: "傾き=変化の割合=a（xの係数）", h2: "y=ax+b の a が傾き" };
}
// [u2 easy③] 比例 y=ax の式（傾き＝a、切片0）
function genEqE_prop(r) {
  const a = rnz(r, -6, 6);
  const ans = linStr(a, 0);
  return { q: `傾きが ${neg(a)} で、原点を通る直線の式を求めなさい。`, ans, choices: exprChoices(ans, [linStr(-a, 0), linStr(a, 1), linStr(a, a)], [linStr(a + 1, 0), linStr(a - 1, 0)], r), h1: "原点を通る → 切片 b=0", h2: "y=ax の形になる" };
}
// [u2 easy④] 切片だけ与え傾き0…ではなく、切片 b の式（傾き与え）言い換え
function genEqE_fromWords(r) {
  const a = rnz(r, -5, 5), b = rnz(r, -7, 7);
  const ans = linStr(a, b);
  return { q: `x の係数が ${neg(a)}、定数項が ${neg(b)} の一次関数の式を書きなさい。`, ans, choices: exprChoices(ans, [linStr(b, a), linStr(a, -b), linStr(-a, b)], [linStr(a, b + 1), linStr(a + 1, b)], r), h1: "x の係数=傾き、定数項=切片", h2: "y=ax+b にあてはめる" };
}
// [u2 easy⑤] y軸との交点の座標（=(0,b)）→ 点で答える
function genEqE_yint(r) {
  const a = rnz(r, -5, 5), b = rnz(r, -6, 6);
  const ans = pointStr(0, b);
  return { q: `一次関数 ${linStr(a, b)} のグラフが y 軸と交わる点の座標を求めなさい。`, ans, choices: exprChoices(ans, [pointStr(b, 0), pointStr(0, a), pointStr(0, -b)], [pointStr(0, b + 1), pointStr(0, b - 1)], r), h1: "y 軸との交点は x=0 のとき", h2: "x=0 を代入すると y=b、点は (0, b)" };
}
// [u2 easy⑥] 切片の値（数値）
function genEqE_intercept(r) {
  const a = rnz(r, -5, 5), b = rnz(r, -7, 7);
  return { q: `一次関数 ${linStr(a, b)} の切片を求めなさい。`, ans: b, choices: numChoices(b, r, [a, -b, a + b]), h1: "切片=x が0のときの y=b", h2: "y=ax+b の b が切片" };
}
// [u2 easy⑦] 平行な直線の傾き（同じ a）→ 数値
function genEqE_parallelSlope(r) {
  const a = rnz(r, -6, 6), b = rnz(r, -5, 5);
  return { q: `直線 ${linStr(a, b)} に平行な直線の傾きを求めなさい。`, ans: a, choices: numChoices(a, r, [-a, b, a + 1]), h1: "平行な直線は傾きが等しい", h2: "傾きは a のまま" };
}
// [u2 easy⑧] 傾きと切片から（切片0以外、別パラメータ域）
function genEqE_make(r) {
  const a = rnz(r, -7, 7), b = rnz(r, -8, 8);
  const ans = linStr(a, b);
  return { q: `傾き ${neg(a)}、切片 ${neg(b)} の直線の式を求めなさい。`, ans, choices: exprChoices(ans, [linStr(b, a), linStr(-a, -b), linStr(a, -b)], [linStr(a, b + 2), linStr(a + 1, b)], r), h1: H.eq.h1, h2: "y=ax+b にそのまま入れる" };
}
// [u2 easy⑨] x軸との交点（y=0、割り切れる）→ 数値 x
function genEqE_xint(r) {
  const a = rnz(r, 1, 5), x0 = rnz(r, -4, 4);
  const b = -a * x0;
  return { q: `一次関数 ${linStr(a, b)} のグラフが x 軸と交わる点の x 座標を求めなさい。`, ans: x0, choices: numChoices(x0, r, [b, -x0, a]), h1: "x 軸との交点は y=0 のとき", h2: `${neg(a)}x${b < 0 ? "−" + (-b) : "+" + b}=0 を解く` };
}
// [u2 easy⑩] 与えられた傾きで切片0の比例式の傾きを答える（逆）
function genEqE_readProp(r) {
  const a = rnz(r, -6, 6);
  return { q: `比例 y=${neg(a)}x の傾きを求めなさい。`, ans: a, choices: numChoices(a, r, [-a, a + 1, a - 1]), h1: "比例 y=ax の a が傾き", h2: "切片は 0" };
}

// [u2 standard②] 切片 b と1点から傾き（割り切れる）→ 式
function genEqS_fromInt(r) {
  const a = rnz(r, -4, 4), b = rnz(r, -6, 6), x0 = rnz(r, 2, 4);
  const y0 = a * x0 + b;
  const ans = linStr(a, b);
  return { q: `切片が ${neg(b)} で、点 (${neg(x0)}, ${neg(y0)}) を通る直線の式を求めなさい。`, ans, choices: exprChoices(ans, [linStr(-a, b), linStr(a, -b), linStr(b, a)], [linStr(a + 1, b), linStr(a, b + 1)], r), h1: "切片 b は分かっているので、点から a を求める", h2: `a = (${neg(y0)}−${neg(b)}) ÷ ${x0}` };
}
// [u2 standard③] 平行（傾き同じ）で1点を通る式
function genEqS_parallel(r) {
  const a = rnz(r, -4, 4), x1 = rnz(r, -3, 3), y1 = rnz(r, -6, 6), bo = rnz(r, -5, 5);
  const b = y1 - a * x1;
  const ans = linStr(a, b);
  return { q: `直線 ${linStr(a, bo)} に平行で、点 (${neg(x1)}, ${neg(y1)}) を通る直線の式を求めなさい。`, ans, choices: exprChoices(ans, [linStr(a, bo), linStr(-a, b), linStr(a, -b)], [linStr(a, b + 1), linStr(a, b - 1)], r), h1: "平行 → 傾きは同じ a。点から切片 b を求める", h2: `b = ${neg(y1)} − ${neg(a)}×(${neg(x1)})` };
}
// [u2 standard④] 傾きと1点（別域）で式
function genEqS_slopePoint(r) {
  const a = rnz(r, -5, 5), x1 = rnz(r, -3, 3), y1 = rnz(r, -7, 7);
  const b = y1 - a * x1;
  const ans = linStr(a, b);
  return { q: `傾き ${neg(a)} で点 (${neg(x1)}, ${neg(y1)}) を通る直線の式を求めなさい。`, ans, choices: exprChoices(ans, [linStr(a, y1), linStr(-a, b), linStr(a, -b)], [linStr(a, b + 1), linStr(a, b - 1)], r), h1: H.eq.h1, h2: H.eq.h2 };
}
// [u2 standard⑤] 切片 b の値を1点と傾きから（数値）
function genEqS_bValue(r) {
  const a = rnz(r, -4, 4), x1 = rnz(r, -4, 4), y1 = rnz(r, -7, 7);
  const b = y1 - a * x1;
  return { q: `傾き ${neg(a)} の直線が点 (${neg(x1)}, ${neg(y1)}) を通るとき、切片を求めなさい。`, ans: b, choices: numChoices(b, r, [y1, a * x1, -b]), h1: "y=ax+b に代入して b を求める", h2: `b = ${neg(y1)} − ${neg(a)}×(${neg(x1)})` };
}
// [u2 standard⑥] 傾き a を2点から（数値）
function genEqS_slopeFrom2(r) {
  const a = rnz(r, -5, 5), x1 = rnz(r, -4, 2), x2 = x1 + r(1, 4), b = rnz(r, -6, 6);
  const y1 = a * x1 + b, y2 = a * x2 + b;
  return { q: `2点 (${neg(x1)}, ${neg(y1)})、(${neg(x2)}, ${neg(y2)}) を通る直線の傾きを求めなさい。`, ans: a, choices: numChoices(a, r, [-a, y2 - y1, x2 - x1]), h1: "傾き = (y の増加量)÷(x の増加量)", h2: `(${neg(y2)}−(${neg(y1)})) ÷ (${neg(x2)}−(${neg(x1)}))` };
}
// [u2 standard⑦] y軸上の点(0,b)ともう1点から式
function genEqS_yPoint(r) {
  const b = rnz(r, -6, 6), a = rnz(r, -4, 4), x2 = rnz(r, 2, 4);
  const y2 = a * x2 + b;
  const ans = linStr(a, b);
  return { q: `2点 (0, ${neg(b)})、(${neg(x2)}, ${neg(y2)}) を通る直線の式を求めなさい。`, ans, choices: exprChoices(ans, [linStr(a, x2), linStr(-a, b), linStr(a, -b)], [linStr(a + 1, b), linStr(a, b + 1)], r), h1: "(0,b) が切片。もう1点から傾きを求める", h2: `a = (${neg(y2)}−${neg(b)}) ÷ ${x2}` };
}
// [u2 standard⑧] 切片を2点から（数値、b = y − ax）
function genEqS_intFrom2(r) {
  const a = rnz(r, -4, 4), x1 = rnz(r, -4, 2), x2 = x1 + r(1, 4), b = rnz(r, -6, 6);
  const y1 = a * x1 + b, y2 = a * x2 + b;
  return { q: `2点 (${neg(x1)}, ${neg(y1)})、(${neg(x2)}, ${neg(y2)}) を通る直線の切片を求めなさい。`, ans: b, choices: numChoices(b, r, [a, y1, -b]), h1: "まず傾き a を求め、b = y − ax", h2: `a を求めてから b = ${neg(y1)} − a×(${neg(x1)})` };
}
// [u2 standard⑨] 変化の割合と1点から式
function genEqS_ratePoint(r) {
  const a = rnz(r, -4, 4), x1 = rnz(r, -3, 3), y1 = rnz(r, -6, 6);
  const b = y1 - a * x1;
  const ans = linStr(a, b);
  return { q: `変化の割合が ${neg(a)} で、x=${neg(x1)} のとき y=${neg(y1)} となる一次関数の式を求めなさい。`, ans, choices: exprChoices(ans, [linStr(a, y1), linStr(-a, b), linStr(a, -b)], [linStr(a, b + 1), linStr(a, b - 1)], r), h1: "変化の割合=傾き a。点から b を求める", h2: `b = ${neg(y1)} − ${neg(a)}×(${neg(x1)})` };
}
// [u2 standard⑩] x切片(p,0)と傾きから式
function genEqS_fromXint(r) {
  const a = rnz(r, -4, 4), x0 = rnz(r, -4, 4);
  const b = -a * x0; // (x0,0) を通る
  const ans = linStr(a, b);
  return { q: `傾き ${neg(a)} で、点 (${neg(x0)}, 0) を通る直線の式を求めなさい。`, ans, choices: exprChoices(ans, [linStr(a, x0), linStr(-a, b), linStr(a, -b)], [linStr(a, b + 1), linStr(a, b - 1)], r), h1: "(x0,0) を y=ax+b に代入して b を求める", h2: `b = 0 − ${neg(a)}×(${neg(x0)})` };
}

// [u2 advanced②] 2点から式（傾きが負、別域）
function genEqA_two2(r) {
  const a = rnz(r, -4, -1), x1 = rnz(r, -3, 2), x2 = x1 + r(1, 4), b = rnz(r, -6, 6);
  const y1 = a * x1 + b, y2 = a * x2 + b;
  const ans = linStr(a, b);
  return { q: `2点 (${neg(x1)}, ${neg(y1)})、(${neg(x2)}, ${neg(y2)}) を通る直線の式を求めなさい。`, ans, choices: exprChoices(ans, [linStr(-a, b), linStr(a, y1), linStr(a, -b)], [linStr(a + 1, b), linStr(a, b + 1)], r), h1: "傾き a=(yの差)÷(xの差)、b=y−ax", h2: H.eq.h2 };
}
// [u2 advanced③] グラフ（2交点を読む）から式：x切片・y切片
function genEqA_intercepts(r) {
  const a = rnz(r, 1, 4), x0 = rnz(r, -4, -1);
  const b = -a * x0; // x切片 x0、y切片 b
  const ans = linStr(a, b);
  return { q: `x 軸と (${neg(x0)}, 0)、y 軸と (0, ${neg(b)}) で交わる直線の式を求めなさい。`, ans, choices: exprChoices(ans, [linStr(b, x0), linStr(-a, b), linStr(a, -b)], [linStr(a + 1, b), linStr(a, b + 1)], r), h1: "(0,b) が切片。傾き a=(yの差)÷(xの差)", h2: `a = (${neg(b)}−0) ÷ (0−(${neg(x0)}))` };
}
// [u2 advanced④] 文章題：料金の式（a 円/個 + 基本 b）→ 式
function genEqA_feeEq(r) {
  const a = rnz(r, 20, 60), b = r(100, 400);
  const ans = linStr(a, b);
  return { q: `1個 ${a}円の品物を x 個買い、送料 ${b}円を加えた代金を y 円とする。y を x の式で表しなさい。`, ans, choices: exprChoices(ans, [linStr(b, a), linStr(a, -b), linStr(a + b, 0)], [linStr(a, b + 10), linStr(a + 1, b)], r), h1: "代金 = 1個の値段 × 個数 ＋ 送料", h2: `y = ${a}x + ${b}` };
}
// [u2 advanced⑤] 文章題：水そう（毎分 a L 増、初め b L）→ 式
function genEqA_tankEq(r) {
  const a = rnz(r, 2, 6), b = r(2, 15);
  const ans = linStr(a, b);
  return { q: `${b}L 入った水そうに毎分 ${a}L ずつ入れる。x 分後の水の量を y L とするとき、y を x の式で表しなさい。`, ans, choices: exprChoices(ans, [linStr(b, a), linStr(a, -b), linStr(a, 0)], [linStr(a, b + 1), linStr(a + 1, b)], r), h1: "y = （毎分の量）x ＋（初めの量）", h2: `y = ${a}x + ${b}` };
}
// [u2 advanced⑥] 文章題：ろうそく（毎分 a cm 減、初め b cm）→ 式
function genEqA_candleEq(r) {
  const a = rnz(r, 1, 3), b = r(12, 24);
  const ans = linStr(-a, b);
  return { q: `長さ ${b}cm のろうそくが毎分 ${a}cm 短くなる。x 分後の長さを y cm とするとき、y を x の式で表しなさい。`, ans, choices: exprChoices(ans, [linStr(a, b), linStr(-a, -b), linStr(b, -a)], [linStr(-a, b + 1), linStr(-(a + 1), b)], r), h1: "y = 初めの長さ −（毎分減る量）x", h2: `y = ${b} − ${a}x` };
}
// [u2 advanced⑦] 切片0で1点を通る比例式（負の点）
function genEqA_propPoint(r) {
  const a = rnz(r, -5, 5), x0 = rnz(r, 2, 5);
  const y0 = a * x0;
  const ans = linStr(a, 0);
  return { q: `原点を通り、点 (${neg(x0)}, ${neg(y0)}) を通る直線の式を求めなさい。`, ans, choices: exprChoices(ans, [linStr(-a, 0), linStr(a, y0), linStr(y0, 0)], [linStr(a + 1, 0), linStr(a - 1, 0)], r), h1: "原点を通る → 切片0、y=ax", h2: `a = ${neg(y0)} ÷ ${x0} = ${neg(a)}` };
}
// [u2 advanced⑧] 平行で y軸上の点を通る式
function genEqA_parallelY(r) {
  const a = rnz(r, -4, 4), bo = rnz(r, -5, 5), b = rnz(r, -6, 6);
  let b2 = b; if (b2 === bo) b2 = bo + 1;
  const ans = linStr(a, b2);
  return { q: `直線 ${linStr(a, bo)} に平行で、点 (0, ${neg(b2)}) を通る直線の式を求めなさい。`, ans, choices: exprChoices(ans, [linStr(a, bo), linStr(-a, b2), linStr(a, -b2)], [linStr(a, b2 + 1), linStr(a + 1, b2)], r), h1: "平行 → 傾き同じ。(0,b2) が切片", h2: `y = ${neg(a)}x ${b2 < 0 ? "−" + (-b2) : "+" + b2}` };
}
// [u2 advanced⑨] 3点のうち2点で式を決め、検算的に式を答える
function genEqA_three(r) {
  const a = rnz(r, -3, 3), b = rnz(r, -5, 5), x1 = rnz(r, -3, 0), x2 = x1 + r(2, 4);
  const y1 = a * x1 + b, y2 = a * x2 + b;
  const ans = linStr(a, b);
  return { q: `点 (${neg(x1)}, ${neg(y1)}) と (${neg(x2)}, ${neg(y2)}) を通る直線の式を求めなさい。`, ans, choices: exprChoices(ans, [linStr(a, y2), linStr(-a, b), linStr(a, -b)], [linStr(a + 1, b), linStr(a, b + 1)], r), h1: "傾き a を出してから b=y−ax", h2: H.eq.h2 };
}
// [u2 advanced⑩] 変化の割合と切片から式（言い換え総合）
function genEqA_rateInt(r) {
  const a = rnz(r, -5, 5), b = rnz(r, -7, 7);
  const ans = linStr(a, b);
  return { q: `変化の割合が ${neg(a)}、グラフが点 (0, ${neg(b)}) を通る一次関数の式を求めなさい。`, ans, choices: exprChoices(ans, [linStr(b, a), linStr(-a, b), linStr(a, -b)], [linStr(a, b + 1), linStr(a + 1, b)], r), h1: "変化の割合=傾き a、(0,b) が切片", h2: "y=ax+b にあてはめる" };
}

// ============================================================
// ── u3 グラフと変域・交点（答えは数値 または 点 pointStr）──
// ============================================================

// [u3 easy①][u3 standard①][u3 advanced①] ※既存テンプレ
function genGraph(r, level) {
  if (level === "easy") {
    // a>0：x の変域 p≤x≤q のときの y の最大値 = a q + b
    const a = r(1, 5), b = rnz(r, -6, 6), p0 = rnz(r, -4, 1), q0 = p0 + r(2, 5);
    const mx = a * q0 + b;
    return { q: `一次関数 ${linStr(a, b)} で、x の変域が ${neg(p0)}≦x≦${neg(q0)} のとき、y の最大値を求めなさい。`, ans: mx, choices: numChoices(mx, r, [a * p0 + b, a * q0, q0 + b]), h1: "a>0 のとき、xが大きいほど y も大きい", h2: "x の最大値を式に代入する" };
  }
  // 交点（x0,y0 を整数で決め、2直線を逆算）
  const x0 = rnz(r, -4, 4), y0 = rnz(r, -5, 5);
  const a1 = rnz(r, -4, 4); let a2 = rnz(r, -4, 4); if (a2 === a1) a2 = a1 + 1;
  const b1 = y0 - a1 * x0, b2 = y0 - a2 * x0;
  if (level === "standard") {
    return { q: `2直線 ${linStr(a1, b1)} と ${linStr(a2, b2)} の交点の x 座標を求めなさい。`, ans: x0, choices: numChoices(x0, r, [y0, -x0, b1, b2]), h1: H.graph.h1, h2: H.graph.h2 };
  }
  const ans = pointStr(x0, y0);
  const variants = [pointStr(y0, x0), pointStr(-x0, y0), pointStr(x0, -y0)];
  return { q: `2直線 ${linStr(a1, b1)} と ${linStr(a2, b2)} の交点の座標を求めなさい。`, ans, choices: exprChoices(ans, variants, [pointStr(x0 + 1, y0), pointStr(x0, y0 + 1)], r), h1: H.graph.h1, h2: H.graph.h2 };
}

// [u3 easy②] a<0：変域での y の最小値（= a*qmax+b、x大で y小）
function genGraphE_minNeg(r) {
  const a = -r(1, 5), b = rnz(r, -6, 6), p0 = rnz(r, -4, 1), q0 = p0 + r(2, 5);
  const mn = a * q0 + b;
  return { q: `一次関数 ${linStr(a, b)} で、x の変域が ${neg(p0)}≦x≦${neg(q0)} のとき、y の最小値を求めなさい。`, ans: mn, choices: numChoices(mn, r, [a * p0 + b, a * q0, b]), h1: "a<0 のとき、x が大きいほど y は小さい", h2: "x の最大値を代入すると y は最小" };
}
// [u3 easy③] a>0：変域での y の最小値（x小で y小）
function genGraphE_minPos(r) {
  const a = r(1, 5), b = rnz(r, -6, 6), p0 = rnz(r, -4, 1), q0 = p0 + r(2, 5);
  const mn = a * p0 + b;
  return { q: `一次関数 ${linStr(a, b)} で、x の変域が ${neg(p0)}≦x≦${neg(q0)} のとき、y の最小値を求めなさい。`, ans: mn, choices: numChoices(mn, r, [a * q0 + b, a * p0, b]), h1: "a>0 のとき、x が小さいほど y も小さい", h2: "x の最小値を代入する" };
}
// [u3 easy④] a<0：変域での y の最大値（x小で y大）
function genGraphE_maxNeg(r) {
  const a = -r(1, 5), b = rnz(r, -6, 6), p0 = rnz(r, -4, 1), q0 = p0 + r(2, 5);
  const mx = a * p0 + b;
  return { q: `一次関数 ${linStr(a, b)} で、x の変域が ${neg(p0)}≦x≦${neg(q0)} のとき、y の最大値を求めなさい。`, ans: mx, choices: numChoices(mx, r, [a * q0 + b, a * p0, b]), h1: "a<0 のとき、x が小さいほど y は大きい", h2: "x の最小値を代入すると y は最大" };
}
// [u3 easy⑤] y軸との交点 x座標（=0 でなく y座標を聞く→数値 b）
function genGraphE_yint(r) {
  const a = rnz(r, -5, 5), b = rnz(r, -6, 6);
  return { q: `一次関数 ${linStr(a, b)} のグラフが y 軸と交わる点の y 座標を求めなさい。`, ans: b, choices: numChoices(b, r, [a, -b, 0]), h1: "y 軸との交点は x=0 のとき", h2: "x=0 を代入すると y=b" };
}
// [u3 easy⑥] x軸との交点 x座標（y=0、割り切れる）
function genGraphE_xint(r) {
  const a = rnz(r, 1, 5), x0 = rnz(r, -4, 4);
  const b = -a * x0;
  return { q: `一次関数 ${linStr(a, b)} のグラフが x 軸と交わる点の x 座標を求めなさい。`, ans: x0, choices: numChoices(x0, r, [b, -x0, a]), h1: "x 軸との交点は y=0 のとき", h2: `${neg(a)}x${b < 0 ? "−" + (-b) : "+" + b}=0 を解く` };
}
// [u3 easy⑦] 点が直線上にあるときの y（代入）
function genGraphE_onLine(r) {
  const a = rnz(r, -4, 4), b = rnz(r, -6, 6), x0 = rnz(r, -3, 3);
  const y = a * x0 + b;
  return { q: `一次関数 ${linStr(a, b)} のグラフ上で、x=${neg(x0)} に対応する y の値を求めなさい。`, ans: y, choices: numChoices(y, r, [a, b, a * x0]), h1: "x を代入して y を求める", h2: `y = ${neg(a)}×(${neg(x0)})${b < 0 ? "−" + (-b) : "+" + b}` };
}
// [u3 easy⑧] 変域の幅から y の変域の幅（|a|×幅）
function genGraphE_span(r) {
  const a = rnz(r, -5, 5), b = rnz(r, -6, 6), w = r(2, 5);
  const span = Math.abs(a) * w;
  return { q: `一次関数 ${linStr(a, b)} で、x の変域の幅が ${w} のとき、y の変域の幅を求めなさい。`, ans: span, choices: numChoices(span, r, [a, w, a * w]), h1: "y の変域の幅 = |傾き| × x の幅", h2: `|${neg(a)}|×${w}` };
}
// [u3 easy⑨] 直線上の点の x（y を与え、割り切れる）
function genGraphE_xFromY(r) {
  const a = rnz(r, 1, 5), x0 = rnz(r, -4, 4), b = rnz(r, -6, 6);
  const y0 = a * x0 + b;
  return { q: `一次関数 ${linStr(a, b)} のグラフ上で、y=${neg(y0)} となる x の値を求めなさい。`, ans: x0, choices: numChoices(x0, r, [y0, b, -x0]), h1: "y の値を代入して x を解く", h2: `${neg(a)}x${b < 0 ? "−" + (-b) : "+" + b}=${neg(y0)}` };
}
// [u3 easy⑩] 原点を通る直線が点を通るときの y
function genGraphE_propVal(r) {
  const a = rnz(r, -5, 5), x0 = rnz(r, 2, 4);
  const y = a * x0;
  return { q: `比例 y=${neg(a)}x のグラフで、x=${x0} のときの y を求めなさい。`, ans: y, choices: numChoices(y, r, [a, x0, -y]), h1: "x を代入する", h2: `y = ${neg(a)}×${x0}` };
}

// [u3 standard②] 交点の y 座標
function genGraphS_yInter(r) {
  const x0 = rnz(r, -4, 4), y0 = rnz(r, -5, 5);
  const a1 = rnz(r, -4, 4); let a2 = rnz(r, -4, 4); if (a2 === a1) a2 = a1 + 1;
  const b1 = y0 - a1 * x0, b2 = y0 - a2 * x0;
  return { q: `2直線 ${linStr(a1, b1)} と ${linStr(a2, b2)} の交点の y 座標を求めなさい。`, ans: y0, choices: numChoices(y0, r, [x0, -y0, b1]), h1: H.graph.h1, h2: "x を求めてから式に代入し y を出す" };
}
// [u3 standard③] 直線と x 軸の交点 x（標準域）
function genGraphS_xaxis(r) {
  const a = rnz(r, -5, 5); if (a === 0) return { skip: true };
  const x0 = rnz(r, -4, 4);
  const b = -a * x0;
  return { q: `直線 ${linStr(a, b)} と x 軸の交点の x 座標を求めなさい。`, ans: x0, choices: numChoices(x0, r, [b, -x0, a]), h1: "x 軸上は y=0", h2: `${neg(a)}x${b < 0 ? "−" + (-b) : "+" + b}=0` };
}
// [u3 standard④] 2直線の交点が y 軸上（x=0）になる構成→交点 y
function genGraphS_onY(r) {
  const b = rnz(r, -6, 6), a1 = rnz(r, -4, 4); let a2 = rnz(r, -4, 4); if (a2 === a1) a2 = a1 + 1;
  // 両方とも切片 b（=交点(0,b)）
  return { q: `2直線 ${linStr(a1, b)} と ${linStr(a2, b)} の交点の y 座標を求めなさい。`, ans: b, choices: numChoices(b, r, [0, a1, -b]), h1: "切片が同じ → 交点は y 軸上 (0,b)", h2: "x=0 のとき両方 y=b" };
}
// [u3 standard⑤] 平行でない2直線の交点 x（別域）
function genGraphS_xInter2(r) {
  const x0 = rnz(r, -5, 5), y0 = rnz(r, -6, 6);
  const a1 = rnz(r, -3, 3); let a2 = rnz(r, -3, 3); if (a2 === a1) a2 = a1 + 2;
  const b1 = y0 - a1 * x0, b2 = y0 - a2 * x0;
  return { q: `2直線 ${linStr(a1, b1)} と ${linStr(a2, b2)} の交点の x 座標を求めなさい。`, ans: x0, choices: numChoices(x0, r, [y0, -x0, b2]), h1: H.graph.h1, h2: H.graph.h2 };
}
// [u3 standard⑥] 交点座標（点で答える、別域）
function genGraphS_point(r) {
  const x0 = rnz(r, -4, 4), y0 = rnz(r, -5, 5);
  const a1 = rnz(r, -3, 3); let a2 = rnz(r, -3, 3); if (a2 === a1) a2 = a1 + 2;
  const b1 = y0 - a1 * x0, b2 = y0 - a2 * x0;
  const ans = pointStr(x0, y0);
  return { q: `2直線 ${linStr(a1, b1)} と ${linStr(a2, b2)} の交点の座標を求めなさい。`, ans, choices: exprChoices(ans, [pointStr(y0, x0), pointStr(-x0, y0), pointStr(x0, -y0)], [pointStr(x0 + 1, y0), pointStr(x0, y0 + 1)], r), h1: H.graph.h1, h2: H.graph.h2 };
}
// [u3 standard⑦] 直線が点を通るか→通るときの y（変域つき言い換え）
function genGraphS_through(r) {
  const a = rnz(r, -4, 4), b = rnz(r, -6, 6), x0 = rnz(r, 2, 4);
  const y = a * x0 + b;
  return { q: `直線 ${linStr(a, b)} が点 (${x0}, ?) を通るとき、? にあてはまる y を求めなさい。`, ans: y, choices: numChoices(y, r, [a, b, a * x0]), h1: "x を代入して y を求める", h2: `y = ${neg(a)}×${x0}${b < 0 ? "−" + (-b) : "+" + b}` };
}
// [u3 standard⑧] x 軸・直線・y 軸でできる三角形の面積（割り切れる）
function genGraphS_area(r) {
  const a = rnz(r, 1, 4), x0 = -rnz(r, 1, 4); // x切片 x0<0、y切片 b>0
  const b = -a * x0; // b=−a*x0>0
  // 面積 = (1/2)*|x切片|*|y切片|
  const area2 = Math.abs(x0) * Math.abs(b);
  if (area2 % 2 !== 0) return { skip: true };
  const area = area2 / 2;
  return { q: `直線 ${linStr(a, b)} と x 軸、y 軸で囲まれた三角形の面積を求めなさい。`, ans: area, choices: numChoices(area, r, [area2, Math.abs(b), Math.abs(x0)]), h1: "x 切片・y 切片を求め、(1/2)×底辺×高さ", h2: `底辺=|${neg(x0)}|、高さ=${b}、面積=その積÷2` };
}
// [u3 standard⑨] 2直線の交点を1点と傾き2つから（負傾き混在）
function genGraphS_mix(r) {
  const x0 = rnz(r, -4, 4), y0 = rnz(r, -5, 5);
  const a1 = rnz(r, 1, 4), a2 = -rnz(r, 1, 4);
  const b1 = y0 - a1 * x0, b2 = y0 - a2 * x0;
  return { q: `2直線 ${linStr(a1, b1)} と ${linStr(a2, b2)} の交点の x 座標を求めなさい。`, ans: x0, choices: numChoices(x0, r, [y0, -x0, b1]), h1: "y を等しいとおいて x を解く", h2: `${linStr(a1, b1)} と ${linStr(a2, b2)} の右辺を等号で結ぶ` };
}
// [u3 standard⑩] x の変域から y の変域（最大・最小の差を聞かず最大値）
function genGraphS_rangeMax(r) {
  const a = rnz(r, -5, 5), b = rnz(r, -6, 6), p0 = rnz(r, -4, 1), q0 = p0 + r(2, 5);
  const yp = a * p0 + b, yq = a * q0 + b;
  const mx = Math.max(yp, yq);
  return { q: `一次関数 ${linStr(a, b)} で、x の変域が ${neg(p0)}≦x≦${neg(q0)} のとき、y の最大値を求めなさい。`, ans: mx, choices: numChoices(mx, r, [Math.min(yp, yq), a, b]), h1: "両端の y を計算して大きい方", h2: "傾きの符号で大小が決まる" };
}

// [u3 advanced②] 交点座標（負傾き混在、点で答える）
function genGraphA_point2(r) {
  const x0 = rnz(r, -4, 4), y0 = rnz(r, -5, 5);
  const a1 = rnz(r, 1, 4), a2 = -rnz(r, 1, 4);
  const b1 = y0 - a1 * x0, b2 = y0 - a2 * x0;
  const ans = pointStr(x0, y0);
  return { q: `2直線 ${linStr(a1, b1)} と ${linStr(a2, b2)} の交点の座標を求めなさい。`, ans, choices: exprChoices(ans, [pointStr(y0, x0), pointStr(-x0, y0), pointStr(x0, -y0)], [pointStr(x0 + 1, y0), pointStr(x0, y0 + 1)], r), h1: H.graph.h1, h2: H.graph.h2 };
}
// [u3 advanced③] 速さ：出会い算（向かい合う2人が出会う時刻）
function genGraphA_meet(r) {
  const v1 = rnz(r, 2, 6), v2 = rnz(r, 2, 6);
  const t = r(3, 7);
  const dist = (v1 + v2) * t; // t 分で出会うよう全長を決める
  return { q: `${dist}m 離れた2地点から、毎分 ${v1}m と毎分 ${v2}m で向かい合って同時に出発します。出会うのは何分後ですか。`, ans: t, choices: numChoices(t, r, [dist, v1 + v2, t + 1]), h1: "出会う時間 = 全体の距離 ÷ 速さの和", h2: `${dist} ÷ (${v1}+${v2})` };
}
// [u3 advanced④] 速さ：追いつき算（速さの差）
function genGraphA_chase(r) {
  const slow = rnz(r, 2, 5), fast = slow + rnz(r, 1, 4), head = r(2, 6);
  const t = r(3, 7);
  const gap = (fast - slow) * t; // t 分で追いつくよう先行距離を決める
  return { q: `弟が ${gap}m 先にいます。兄が毎分 ${fast}m、弟が毎分 ${slow}m で同じ向きに進むとき、兄が弟に追いつくのは何分後ですか。`, ans: t, choices: numChoices(t, r, [gap, fast - slow, t + 1]), h1: "追いつく時間 = 先行距離 ÷ 速さの差", h2: `${gap} ÷ (${fast}−${slow})` };
}
// [u3 advanced⑤] 三角形の面積（2直線と x 軸、割り切れる）
function genGraphA_triArea(r) {
  // y=ax+b と y=cx+d が x 軸上の異なる点で交わり、上で交わる三角形…簡易版：
  // 直線 y=a x + b と x 軸、x=k の縦線で囲む台形ではなく、原点と2点の三角形
  const a = rnz(r, 1, 4), x0 = -rnz(r, 2, 4);
  const b = -a * x0; // x切片 x0、y切片 b
  const base = Math.abs(x0), height = Math.abs(b);
  const area2 = base * height;
  if (area2 % 2 !== 0) return { skip: true };
  return { q: `直線 ${linStr(a, b)} が x 軸・y 軸と作る三角形の面積を求めなさい。`, ans: area2 / 2, choices: numChoices(area2 / 2, r, [area2, base, height]), h1: "x 切片と y 切片を求めて (1/2)×底辺×高さ", h2: `底辺 ${base}、高さ ${height}` };
}
// [u3 advanced⑥] グラフの読み取り：2点から傾きを読み変化量
function genGraphA_readInc(r) {
  const a = rnz(r, -4, 4), b = rnz(r, -6, 6), x1 = rnz(r, -3, 1), x2 = x1 + r(2, 5);
  const inc = a * (x2 - x1);
  return { q: `直線 ${linStr(a, b)} のグラフで、x が ${neg(x1)} から ${neg(x2)} まで変わるときの y の増加量を求めなさい。`, ans: inc, choices: numChoices(inc, r, [a, x2 - x1, -inc]), h1: "y の増加量 = 傾き × x の増加量", h2: `${neg(a)}×(${neg(x2)}−(${neg(x1)}))` };
}
// [u3 advanced⑦] 直線が通る点の個数ではなく、変域から対応する x（逆算、割り切れる）
function genGraphA_xfromYadv(r) {
  const a = rnz(r, 1, 5), x0 = rnz(r, -5, 5), b = rnz(r, -6, 6);
  const y0 = a * x0 + b;
  return { q: `直線 ${linStr(a, b)} 上の点で、y 座標が ${neg(y0)} である点の x 座標を求めなさい。`, ans: x0, choices: numChoices(x0, r, [y0, b, -x0]), h1: "y を代入して x を解く", h2: `${neg(a)}x${b < 0 ? "−" + (-b) : "+" + b}=${neg(y0)}` };
}
// [u3 advanced⑧] 料金グラフ：2区間（基本料 b＋a 円/分）で y を読む
function genGraphA_feeRead(r) {
  const a = rnz(r, 10, 40), b = r(100, 300), x0 = r(3, 9);
  const y = a * x0 + b;
  return { q: `基本料 ${b}円、1分 ${a}円の通話。x 分のとき料金 y=${a}x+${b}（円）。${x0} 分のときの料金を求めなさい。`, ans: y, choices: numChoices(y, r, [a * x0, b, a + x0]), h1: "x に分数を入れて y を計算", h2: `y = ${a}×${x0} + ${b}` };
}
// [u3 advanced⑨] 平行な2直線の y の差（同じ x で b の差）
function genGraphA_gap(r) {
  const a = rnz(r, -4, 4), b1 = rnz(r, -6, 6); let b2 = rnz(r, -6, 6); if (b2 === b1) b2 = b1 + 2;
  const gap = Math.abs(b1 - b2);
  return { q: `平行な2直線 ${linStr(a, b1)} と ${linStr(a, b2)} について、同じ x での y の差を求めなさい。`, ans: gap, choices: numChoices(gap, r, [b1 - b2, a, b1 + b2]), h1: "傾きが同じ平行線 → y の差は切片の差で一定", h2: `|${neg(b1)}−(${neg(b2)})|` };
}
// [u3 advanced⑩] 3直線が1点で交わる：与えられた2直線の交点座標（点）
function genGraphA_threeMeet(r) {
  const x0 = rnz(r, -4, 4), y0 = rnz(r, -5, 5);
  const a1 = rnz(r, -3, 3); let a2 = rnz(r, -3, 3); if (a2 === a1) a2 = a1 + 2;
  const b1 = y0 - a1 * x0, b2 = y0 - a2 * x0;
  const ans = pointStr(x0, y0);
  return { q: `2直線 ${linStr(a1, b1)}、${linStr(a2, b2)} が交わる点の座標を求めなさい。`, ans, choices: exprChoices(ans, [pointStr(y0, x0), pointStr(-x0, y0), pointStr(x0, -y0)], [pointStr(x0 + 1, y0), pointStr(x0, y0 + 1)], r), h1: H.graph.h1, h2: H.graph.h2 };
}

// ============================================================
// ── 各 unit の problems を組み立てる（各レベル10問＋oni10問）──
// ============================================================
const U1 = "g2c3u1", U2 = "g2c3u2", U3 = "g2c3u3";
const SK1 = "S-FUN-RATE", SK2 = "S-FUN-EQ", SK3 = "S-FUN-GRAPH";

// u1 oni（応用の難問・答えは1つの数値）
function genOniU1_a(r) { // 速さ：途中で速さが変わる距離
  const v1 = rnz(r, 2, 5), t1 = r(2, 4), v2 = rnz(r, 2, 5), t2 = r(2, 4);
  const d = v1 * t1 + v2 * t2;
  return { q: `ある人が毎分 ${v1}m で ${t1} 分歩いたあと、毎分 ${v2}m で ${t2} 分歩きました。進んだ道のりの合計(m)を求めなさい。`, ans: d, choices: numChoices(d, r, [v1 * t1, v2 * t2, (v1 + v2) * (t1 + t2)]), h1: "区間ごとに 速さ×時間 を出して合計", h2: `${v1}×${t1} + ${v2}×${t2}` };
}
function genOniU1_b(r) { // 2量の同時刻一致（追いつき：時刻）
  const a = rnz(r, 2, 5), head = r(6, 20);
  const b2 = rnz(r, 1, a - 1 > 0 ? a - 1 : 1);
  const diff = a - b2; if (diff <= 0 || head % diff !== 0) return { skip: true };
  const t = head / diff;
  return { q: `A は毎分 ${a}m、B は ${head}m 先から毎分 ${b2}m で同じ向きに同時に進みます。A が B に追いつくのは何分後ですか。`, ans: t, choices: numChoices(t, r, [head, diff, t + 1]), h1: "追いつく時間 = 先行距離 ÷ 速さの差", h2: `${head} ÷ (${a}−${b2})` };
}
function genOniU1_c(r) { // 変化の割合の応用：傾きから区間のyの変化
  const a = rnz(r, -6, 6), x1 = rnz(r, -5, 0), x2 = x1 + r(3, 7);
  const inc = a * (x2 - x1);
  return { q: `変化の割合が ${neg(a)} の一次関数で、x が ${neg(x1)} から ${neg(x2)} まで変わるときの y の増加量を求めなさい。`, ans: inc, choices: numChoices(inc, r, [a, x2 - x1, -inc]), h1: "y の増加量 = 変化の割合 × x の増加量", h2: `${neg(a)}×(${neg(x2)}−(${neg(x1)}))` };
}
function genOniU1_d(r) { // 水そう：2本の管で満水になる時間
  const cap = r(4, 12) * 6, in1 = rnz(r, 2, 6), in2 = rnz(r, 2, 6);
  const sum = in1 + in2; if (cap % sum !== 0) return { skip: true };
  const t = cap / sum;
  return { q: `容量 ${cap}L の水そうに、毎分 ${in1}L と毎分 ${in2}L の管で同時に入れます。満水になるのは何分後ですか。`, ans: t, choices: numChoices(t, r, [cap, sum, t + 1]), h1: "満水時間 = 容量 ÷ 毎分入る量の合計", h2: `${cap} ÷ (${in1}+${in2})` };
}
function genOniU1_e(r) { // 料金プラン比較：等しくなる利用回数
  // 等しくなる回数 n を先に決め、db=da*n と逆算して必ず割り切れるようにする
  const a2 = rnz(r, 10, 40), da = rnz(r, 10, 40), a1 = a2 + da;
  const n = r(2, 8), db = da * n;
  const base1 = r(2, 8) * 100, base2 = base1 + db;
  return { q: `A料金は基本 ${base1}円＋1回 ${a1}円、B料金は基本 ${base2}円＋1回 ${a2}円。料金が等しくなる利用回数を求めなさい。`, ans: n, choices: numChoices(n, r, [db, da, n + 1]), h1: "2つの式を等しいとおいて回数を解く", h2: `${base1}+${a1}x = ${base2}+${a2}x` };
}
function genOniU1_f(r) { // 速さ：往復の平均でなく合計時間→距離
  const v = rnz(r, 3, 8), t = r(4, 10);
  const half = v * t;
  return { q: `毎分 ${v}m で ${t} 分進んで折り返し、同じ速さで戻りました。往復で進んだ道のり(m)を求めなさい。`, ans: 2 * half, choices: numChoices(2 * half, r, [half, v + t, v * t * 2 + v]), h1: "片道 = 速さ×時間、往復はその2倍", h2: `${v}×${t}×2` };
}
function genOniU1_g(r) { // 変化の割合が分かり、ある x での y（切片も逆算）
  const a = rnz(r, 2, 5), x1 = rnz(r, -4, 4), y1 = rnz(r, -8, 8), x2 = x1 + r(2, 5);
  const b = y1 - a * x1, y2 = a * x2 + b;
  return { q: `変化の割合 ${a} の一次関数が点 (${neg(x1)}, ${neg(y1)}) を通ります。x=${neg(x2)} のときの y を求めなさい。`, ans: y2, choices: numChoices(y2, r, [y1, a * x2, b]), h1: "まず切片 b=y−ax、次に x を代入", h2: `b=${neg(y1)}−${a}×(${neg(x1)}) を求めてから y=${a}x+b` };
}
function genOniU1_h(r) { // ばね：自然長 b cm、1g で a cm 伸びる
  const a = rnz(r, 1, 3), b = r(8, 16), w = r(3, 9);
  const y = a * w + b;
  return { q: `自然長 ${b}cm のばねに 1g で ${a}cm 伸びるおもりを下げます。${w}g のおもりでの全長(cm)を求めなさい。`, ans: y, choices: numChoices(y, r, [a * w, b, a + w]), h1: "全長 = 自然長 ＋ 1g の伸び × おもりの重さ", h2: `y = ${b} + ${a}×${w}` };
}
function genOniU1_i(r) { // 2点から変化の割合（負・大きめ域）
  const a = rnz(r, -7, 7), x1 = rnz(r, -6, 0), x2 = x1 + r(2, 6), b = rnz(r, -8, 8);
  const y1 = a * x1 + b, y2 = a * x2 + b;
  return { q: `2点 (${neg(x1)}, ${neg(y1)})、(${neg(x2)}, ${neg(y2)}) を通る直線の変化の割合を求めなさい。`, ans: a, choices: numChoices(a, r, [-a, y2 - y1, x2 - x1]), h1: "変化の割合 = y の増加量 ÷ x の増加量", h2: `(${neg(y2)}−(${neg(y1)})) ÷ (${neg(x2)}−(${neg(x1)}))` };
}
function genOniU1_j(r) { // ろうそく：2本のうち一方が燃え尽きる時刻
  const a = rnz(r, 1, 3), L = a * r(4, 9);
  const t = L / a;
  return { q: `長さ ${L}cm のろうそくが毎分 ${a}cm 短くなります。燃え尽きるのは何分後ですか。`, ans: t, choices: numChoices(t, r, [L, a, t + 1]), h1: "燃え尽き時間 = 長さ ÷ 毎分減る量", h2: `${L} ÷ ${a}` };
}

// u2 oni（式を求める応用・答えは式 linStr）
function genOniU2_a(r) { // 2直線の交点を通り傾き与え→式
  const x0 = rnz(r, -3, 3), y0 = rnz(r, -5, 5), a = rnz(r, -4, 4);
  const b = y0 - a * x0;
  const ans = linStr(a, b);
  return { q: `点 (${neg(x0)}, ${neg(y0)}) を通り、傾きが ${neg(a)} の直線の式を求めなさい。`, ans, choices: exprChoices(ans, [linStr(a, y0), linStr(-a, b), linStr(a, -b)], [linStr(a, b + 1), linStr(a + 1, b)], r), h1: "y=ax+b に点を代入して b を求める", h2: `b=${neg(y0)}−${neg(a)}×(${neg(x0)})` };
}
function genOniU2_b(r) { // 2点（負傾き・大域）から式
  const a = rnz(r, -5, -1), x1 = rnz(r, -4, 1), x2 = x1 + r(2, 5), b = rnz(r, -7, 7);
  const y1 = a * x1 + b, y2 = a * x2 + b;
  const ans = linStr(a, b);
  return { q: `2点 (${neg(x1)}, ${neg(y1)})、(${neg(x2)}, ${neg(y2)}) を通る直線の式を求めなさい。`, ans, choices: exprChoices(ans, [linStr(-a, b), linStr(a, y1), linStr(a, -b)], [linStr(a + 1, b), linStr(a, b + 1)], r), h1: "傾き a=(yの差)÷(xの差)、b=y−ax", h2: H.eq.h2 };
}
function genOniU2_c(r) { // 平行で2点目を満たす式（傾き固定、点で b）
  const a = rnz(r, -4, 4), bo = rnz(r, -5, 5), x1 = rnz(r, -3, 3), y1 = rnz(r, -7, 7);
  const b = y1 - a * x1;
  const ans = linStr(a, b);
  return { q: `${linStr(a, bo)} に平行で点 (${neg(x1)}, ${neg(y1)}) を通る直線の式を求めなさい。`, ans, choices: exprChoices(ans, [linStr(a, bo), linStr(-a, b), linStr(a, -b)], [linStr(a, b + 1), linStr(a, b - 1)], r), h1: "平行 → 傾き同じ。点から b を求める", h2: `b=${neg(y1)}−${neg(a)}×(${neg(x1)})` };
}
function genOniU2_d(r) { // 切片と x切片から式
  const a = rnz(r, 1, 4), x0 = rnz(r, -4, -1);
  const b = -a * x0;
  const ans = linStr(a, b);
  return { q: `x 軸と (${neg(x0)}, 0)、y 軸と (0, ${neg(b)}) で交わる直線の式を求めなさい。`, ans, choices: exprChoices(ans, [linStr(b, x0), linStr(-a, b), linStr(a, -b)], [linStr(a + 1, b), linStr(a, b + 1)], r), h1: "(0,b) が切片、傾き=(yの差)÷(xの差)", h2: `a=(${neg(b)}−0)÷(0−(${neg(x0)}))` };
}
function genOniU2_e(r) { // 文章題：xとyの対応表から式（毎分 a＋初め b）
  const a = rnz(r, 2, 6), b = r(2, 12);
  const ans = linStr(a, b);
  return { q: `x=0 のとき y=${b}、x が1増えるごとに y が ${a} 増える一次関数の式を求めなさい。`, ans, choices: exprChoices(ans, [linStr(b, a), linStr(a, -b), linStr(a, 0)], [linStr(a, b + 1), linStr(a + 1, b)], r), h1: "x が1増えると y は a 増える → 傾き a、x=0 の y が切片", h2: `y=${a}x+${b}` };
}
function genOniU2_f(r) { // 3点のうち1点は誤り…ではなく2点から式（標準大域）
  const a = rnz(r, -4, 4), b = rnz(r, -7, 7), x1 = rnz(r, -4, 0), x2 = x1 + r(2, 5);
  const y1 = a * x1 + b, y2 = a * x2 + b;
  const ans = linStr(a, b);
  return { q: `表で x=${neg(x1)} のとき y=${neg(y1)}、x=${neg(x2)} のとき y=${neg(y2)} です。y を x の式で表しなさい。`, ans, choices: exprChoices(ans, [linStr(a, y2), linStr(-a, b), linStr(a, -b)], [linStr(a + 1, b), linStr(a, b + 1)], r), h1: "傾き a を求めてから b=y−ax", h2: H.eq.h2 };
}
function genOniU2_g(r) { // 料金の式（基本＋単価）→ 式
  const a = rnz(r, 30, 90), b = r(150, 500);
  const ans = linStr(a, b);
  return { q: `初期費用 ${b}円、1回 ${a}円かかるサービスを x 回使うときの合計 y 円を x の式で表しなさい。`, ans, choices: exprChoices(ans, [linStr(b, a), linStr(a, -b), linStr(a + b, 0)], [linStr(a, b + 10), linStr(a + 1, b)], r), h1: "合計 = 単価 × 回数 ＋ 初期費用", h2: `y=${a}x+${b}` };
}
function genOniU2_h(r) { // 原点を通り点を通る比例式
  const a = rnz(r, -6, 6), x0 = rnz(r, 2, 5);
  const y0 = a * x0;
  const ans = linStr(a, 0);
  return { q: `原点と点 (${neg(x0)}, ${neg(y0)}) を通る直線の式を求めなさい。`, ans, choices: exprChoices(ans, [linStr(-a, 0), linStr(a, y0), linStr(y0, 0)], [linStr(a + 1, 0), linStr(a - 1, 0)], r), h1: "原点を通る → y=ax、a=y÷x", h2: `a=${neg(y0)}÷${x0}=${neg(a)}` };
}
function genOniU2_i(r) { // y切片を点(0,b)、傾きを変化の割合で与え式
  const a = rnz(r, -5, 5), b = rnz(r, -7, 7);
  const ans = linStr(a, b);
  return { q: `グラフが点 (0, ${neg(b)}) を通り、変化の割合が ${neg(a)} の一次関数の式を求めなさい。`, ans, choices: exprChoices(ans, [linStr(b, a), linStr(-a, b), linStr(a, -b)], [linStr(a, b + 1), linStr(a + 1, b)], r), h1: "(0,b) が切片、変化の割合=傾き a", h2: `y=${neg(a)}x${b < 0 ? "−" + (-b) : "+" + b}` };
}
function genOniU2_j(r) { // 切片と1点から式（大域）
  const a = rnz(r, -5, 5), b = rnz(r, -8, 8), x0 = rnz(r, 2, 5);
  const y0 = a * x0 + b;
  const ans = linStr(a, b);
  return { q: `切片 ${neg(b)} で、点 (${neg(x0)}, ${neg(y0)}) を通る直線の式を求めなさい。`, ans, choices: exprChoices(ans, [linStr(-a, b), linStr(a, -b), linStr(b, a)], [linStr(a + 1, b), linStr(a, b + 1)], r), h1: "切片 b は既知。a=(y−b)÷x", h2: `a=(${neg(y0)}−${neg(b)})÷${x0}` };
}

// u3 oni（グラフ・面積・速さの難問・答えは数値 または 点）
function genOniU3_a(r) { // 三角形の面積（2直線と x 軸）
  // 直線1: y=a1 x + b1（x切片 p）、直線2: y=a2 x + b2（x切片 q）、交点(x0,y0)
  const x0 = rnz(r, -2, 2), y0 = rnz(r, 2, 6);
  const a1 = rnz(r, 1, 3), a2 = -rnz(r, 1, 3);
  const b1 = y0 - a1 * x0, b2 = y0 - a2 * x0;
  const p = -b1 / a1, q = -b2 / a2;
  if (!Number.isInteger(p) || !Number.isInteger(q)) return { skip: true };
  const base = Math.abs(q - p);
  const area2 = base * Math.abs(y0);
  if (area2 % 2 !== 0) return { skip: true };
  return { q: `2直線 ${linStr(a1, b1)}、${linStr(a2, b2)} と x 軸で囲まれた三角形の面積を求めなさい。`, ans: area2 / 2, choices: numChoices(area2 / 2, r, [area2, base, Math.abs(y0)]), h1: "x 軸上の2交点を底辺、交点の y を高さに", h2: `底辺=|${p}−(${q})|、高さ=${Math.abs(y0)}` };
}
function genOniU3_b(r) { // 速さ：途中で休む（合計時間と距離の文章題・数値）
  const v = rnz(r, 3, 8), t1 = r(2, 5), t2 = r(2, 5);
  const d = v * (t1 + t2);
  return { q: `毎分 ${v}m で ${t1} 分進み、少し休んでから同じ速さで ${t2} 分進みました。進んだ道のり(m)の合計を求めなさい。`, ans: d, choices: numChoices(d, r, [v * t1, v * t2, v + t1 + t2]), h1: "休んでも速さは同じ → 速さ×（進んだ時間の合計）", h2: `${v}×(${t1}+${t2})` };
}
function genOniU3_c(r) { // 2直線の交点座標（大域・点）
  const x0 = rnz(r, -5, 5), y0 = rnz(r, -6, 6);
  const a1 = rnz(r, -4, 4); let a2 = rnz(r, -4, 4); if (a2 === a1) a2 = a1 + 2;
  const b1 = y0 - a1 * x0, b2 = y0 - a2 * x0;
  const ans = pointStr(x0, y0);
  return { q: `2直線 ${linStr(a1, b1)}、${linStr(a2, b2)} の交点の座標を求めなさい。`, ans, choices: exprChoices(ans, [pointStr(y0, x0), pointStr(-x0, y0), pointStr(x0, -y0)], [pointStr(x0 + 1, y0), pointStr(x0, y0 + 1)], r), h1: H.graph.h1, h2: H.graph.h2 };
}
function genOniU3_d(r) { // 出会い算（距離と速さの和、時刻）
  const v1 = rnz(r, 3, 7), v2 = rnz(r, 3, 7), t = r(4, 9);
  const dist = (v1 + v2) * t;
  return { q: `${dist}m 離れた2人が、毎分 ${v1}m と毎分 ${v2}m で向かい合って同時に出発します。出会うのは何分後ですか。`, ans: t, choices: numChoices(t, r, [dist, v1 + v2, t + 1]), h1: "出会う時間 = 距離 ÷ 速さの和", h2: `${dist} ÷ (${v1}+${v2})` };
}
function genOniU3_e(r) { // x切片・y切片から原点三角形の面積
  const a = rnz(r, 1, 4), x0 = -rnz(r, 2, 4);
  const b = -a * x0;
  const area2 = Math.abs(x0) * Math.abs(b);
  if (area2 % 2 !== 0) return { skip: true };
  return { q: `直線 ${linStr(a, b)} と x 軸、y 軸で囲まれた三角形の面積を求めなさい。`, ans: area2 / 2, choices: numChoices(area2 / 2, r, [area2, Math.abs(x0), Math.abs(b)]), h1: "x 切片と y 切片を求めて (1/2)×底辺×高さ", h2: `底辺 ${Math.abs(x0)}、高さ ${Math.abs(b)}` };
}
function genOniU3_f(r) { // 変域 → y の変域の幅（大域）
  const a = rnz(r, -6, 6), b = rnz(r, -7, 7), p0 = rnz(r, -5, 0), q0 = p0 + r(3, 7);
  const span = Math.abs(a) * (q0 - p0);
  return { q: `一次関数 ${linStr(a, b)} で、${neg(p0)}≦x≦${neg(q0)} のときの y の変域の幅（最大−最小）を求めなさい。`, ans: span, choices: numChoices(span, r, [Math.abs(a), q0 - p0, a * (q0 - p0)]), h1: "y の幅 = |傾き| × x の幅", h2: `|${neg(a)}|×(${neg(q0)}−(${neg(p0)}))` };
}
function genOniU3_g(r) { // 追いつき（先行距離・速さの差・時刻）
  const slow = rnz(r, 2, 5), fast = slow + rnz(r, 1, 4), t = r(4, 9);
  const gap = (fast - slow) * t;
  return { q: `${gap}m 先を行く人を、速さの差 ${fast - slow}m/分（毎分 ${fast}m と毎分 ${slow}m）で追います。追いつくのは何分後ですか。`, ans: t, choices: numChoices(t, r, [gap, fast - slow, t + 1]), h1: "追いつく時間 = 先行距離 ÷ 速さの差", h2: `${gap} ÷ ${fast - slow}` };
}
function genOniU3_h(r) { // 交点 x（負傾き混在・大域）
  const x0 = rnz(r, -5, 5), y0 = rnz(r, -6, 6);
  const a1 = rnz(r, 1, 4), a2 = -rnz(r, 1, 4);
  const b1 = y0 - a1 * x0, b2 = y0 - a2 * x0;
  return { q: `2直線 ${linStr(a1, b1)}、${linStr(a2, b2)} の交点の x 座標を求めなさい。`, ans: x0, choices: numChoices(x0, r, [y0, -x0, b1]), h1: "y を等しいとおいて x を解く", h2: H.graph.h2 };
}
function genOniU3_i(r) { // 料金の交差（2プランが等しくなる x、割り切れる）
  // 交点 x を先に決め、db=da*x と逆算して必ず割り切れるようにする
  const a2 = rnz(r, 5, 18), da = rnz(r, 10, 40), a1 = a2 + da;
  const x = r(2, 8), b1 = r(1, 5) * 100, b2 = b1 + da * x;
  return { q: `直線 y=${a1}x+${b1} と y=${a2}x+${b2} の交点の x 座標を求めなさい。`, ans: x, choices: numChoices(x, r, [da * x, da, x + 1]), h1: "2式の y を等しいとおいて x を解く", h2: `${a1}x+${b1}=${a2}x+${b2}` };
}
function genOniU3_j(r) { // 平行線間の y の差（一定、大域）
  const a = rnz(r, -5, 5), b1 = rnz(r, -8, 8); let b2 = rnz(r, -8, 8); if (b2 === b1) b2 = b1 + 3;
  const gap = Math.abs(b1 - b2);
  return { q: `平行な2直線 ${linStr(a, b1)}、${linStr(a, b2)} の、同じ x における y の差を求めなさい。`, ans: gap, choices: numChoices(gap, r, [b1 - b2, a, b1 + b2]), h1: "平行線は y の差が切片の差で一定", h2: `|${neg(b1)}−(${neg(b2)})|` };
}

export const chapter = {
  id: "g2c3",
  name: "一次関数",
  emoji: "📈",
  color: "#f59e0b",
  grade: 2,
  units: [
    {
      id: U1, name: "変化の割合・増加量", emoji: "📊", desc: "変化の割合=a",
      problems: {
        easy: [
          p(U1 + "e1", (r) => genRate(r, "easy"), SK1),
          p(U1 + "e2", genRateE_intercept, SK1),
          p(U1 + "e3", genRateE_x0, SK1),
          p(U1 + "e4", genRateE_x1, SK1),
          p(U1 + "e5", genRateE_val, SK1),
          p(U1 + "e6", genRateE_valNeg, SK1),
          p(U1 + "e7", genRateE_rate2, SK1),
          p(U1 + "e8", genRateE_prop, SK1),
          p(U1 + "e9", genRateE_incSmall, SK1),
          p(U1 + "e10", genRateE_dec, SK1),
        ],
        standard: [
          p(U1 + "s1", (r) => genRate(r, "standard"), SK1),
          p(U1 + "s2", genRateS_dx, SK1),
          p(U1 + "s3", genRateS_two, SK1),
          p(U1 + "s4", genRateS_inc, SK1),
          p(U1 + "s5", genRateS_diff, SK1),
          p(U1 + "s6", genRateS_givenRate, SK1),
          p(U1 + "s7", genRateS_rateFrom, SK1),
          p(U1 + "s8", genRateS_decRange, SK1),
          p(U1 + "s9", genRateS_propConst, SK1),
          p(U1 + "s10", genRateS_bFromPoint, SK1),
        ],
        advanced: [
          p(U1 + "a1", genRateA_range, SK1),
          p(U1 + "a2", genRateA_tank, SK1),
          p(U1 + "a3", genRateA_move, SK1),
          p(U1 + "a4", genRateA_candle, SK1),
          p(U1 + "a5", genRateA_empty, SK1),
          p(U1 + "a6", genRateA_graphRate, SK1),
          p(U1 + "a7", genRateA_xzero, SK1),
          p(U1 + "a8", genRateA_fee, SK1),
          p(U1 + "a9", genRateA_meet, SK1),
          p(U1 + "a10", genRateA_min, SK1),
        ],
        oni: [
          p(U1 + "o1", genOniU1_a, SK1),
          p(U1 + "o2", genOniU1_b, SK1),
          p(U1 + "o3", genOniU1_c, SK1),
          p(U1 + "o4", genOniU1_d, SK1),
          p(U1 + "o5", genOniU1_e, SK1),
          p(U1 + "o6", genOniU1_f, SK1),
          p(U1 + "o7", genOniU1_g, SK1),
          p(U1 + "o8", genOniU1_h, SK1),
          p(U1 + "o9", genOniU1_i, SK1),
          p(U1 + "o10", genOniU1_j, SK1),
        ],
      },
    },
    {
      id: U2, name: "傾き・切片・式の決定", emoji: "✏️", desc: "y=ax+b を求める",
      problems: {
        easy: [
          p(U2 + "e1", (r) => genEq(r, "easy"), SK2),
          p(U2 + "e2", genEqE_slope, SK2),
          p(U2 + "e3", genEqE_prop, SK2),
          p(U2 + "e4", genEqE_fromWords, SK2),
          p(U2 + "e5", genEqE_yint, SK2),
          p(U2 + "e6", genEqE_intercept, SK2),
          p(U2 + "e7", genEqE_parallelSlope, SK2),
          p(U2 + "e8", genEqE_make, SK2),
          p(U2 + "e9", genEqE_xint, SK2),
          p(U2 + "e10", genEqE_readProp, SK2),
        ],
        standard: [
          p(U2 + "s1", (r) => genEq(r, "standard"), SK2),
          p(U2 + "s2", genEqS_fromInt, SK2),
          p(U2 + "s3", genEqS_parallel, SK2),
          p(U2 + "s4", genEqS_slopePoint, SK2),
          p(U2 + "s5", genEqS_bValue, SK2),
          p(U2 + "s6", genEqS_slopeFrom2, SK2),
          p(U2 + "s7", genEqS_yPoint, SK2),
          p(U2 + "s8", genEqS_intFrom2, SK2),
          p(U2 + "s9", genEqS_ratePoint, SK2),
          p(U2 + "s10", genEqS_fromXint, SK2),
        ],
        advanced: [
          p(U2 + "a1", (r) => genEq(r, "advanced"), SK2),
          p(U2 + "a2", genEqA_two2, SK2),
          p(U2 + "a3", genEqA_intercepts, SK2),
          p(U2 + "a4", genEqA_feeEq, SK2),
          p(U2 + "a5", genEqA_tankEq, SK2),
          p(U2 + "a6", genEqA_candleEq, SK2),
          p(U2 + "a7", genEqA_propPoint, SK2),
          p(U2 + "a8", genEqA_parallelY, SK2),
          p(U2 + "a9", genEqA_three, SK2),
          p(U2 + "a10", genEqA_rateInt, SK2),
        ],
        oni: [
          p(U2 + "o1", genOniU2_a, SK2),
          p(U2 + "o2", genOniU2_b, SK2),
          p(U2 + "o3", genOniU2_c, SK2),
          p(U2 + "o4", genOniU2_d, SK2),
          p(U2 + "o5", genOniU2_e, SK2),
          p(U2 + "o6", genOniU2_f, SK2),
          p(U2 + "o7", genOniU2_g, SK2),
          p(U2 + "o8", genOniU2_h, SK2),
          p(U2 + "o9", genOniU2_i, SK2),
          p(U2 + "o10", genOniU2_j, SK2),
        ],
      },
    },
    {
      id: U3, name: "一次関数のグラフと変域・交点", emoji: "🪡", desc: "変域・交点",
      problems: {
        easy: [
          p(U3 + "e1", (r) => genGraph(r, "easy"), SK3),
          p(U3 + "e2", genGraphE_minNeg, SK3),
          p(U3 + "e3", genGraphE_minPos, SK3),
          p(U3 + "e4", genGraphE_maxNeg, SK3),
          p(U3 + "e5", genGraphE_yint, SK3),
          p(U3 + "e6", genGraphE_xint, SK3),
          p(U3 + "e7", genGraphE_onLine, SK3),
          p(U3 + "e8", genGraphE_span, SK3),
          p(U3 + "e9", genGraphE_xFromY, SK3),
          p(U3 + "e10", genGraphE_propVal, SK3),
        ],
        standard: [
          p(U3 + "s1", (r) => genGraph(r, "standard"), SK3),
          p(U3 + "s2", genGraphS_yInter, SK3),
          p(U3 + "s3", genGraphS_xaxis, SK3),
          p(U3 + "s4", genGraphS_onY, SK3),
          p(U3 + "s5", genGraphS_xInter2, SK3),
          p(U3 + "s6", genGraphS_point, SK3),
          p(U3 + "s7", genGraphS_through, SK3),
          p(U3 + "s8", genGraphS_area, SK3),
          p(U3 + "s9", genGraphS_mix, SK3),
          p(U3 + "s10", genGraphS_rangeMax, SK3),
        ],
        advanced: [
          p(U3 + "a1", (r) => genGraph(r, "advanced"), SK3),
          p(U3 + "a2", genGraphA_point2, SK3),
          p(U3 + "a3", genGraphA_meet, SK3),
          p(U3 + "a4", genGraphA_chase, SK3),
          p(U3 + "a5", genGraphA_triArea, SK3),
          p(U3 + "a6", genGraphA_readInc, SK3),
          p(U3 + "a7", genGraphA_xfromYadv, SK3),
          p(U3 + "a8", genGraphA_feeRead, SK3),
          p(U3 + "a9", genGraphA_gap, SK3),
          p(U3 + "a10", genGraphA_threeMeet, SK3),
        ],
        oni: [
          p(U3 + "o1", genOniU3_a, SK3),
          p(U3 + "o2", genOniU3_b, SK3),
          p(U3 + "o3", genOniU3_c, SK3),
          p(U3 + "o4", genOniU3_d, SK3),
          p(U3 + "o5", genOniU3_e, SK3),
          p(U3 + "o6", genOniU3_f, SK3),
          p(U3 + "o7", genOniU3_g, SK3),
          p(U3 + "o8", genOniU3_h, SK3),
          p(U3 + "o9", genOniU3_i, SK3),
          p(U3 + "o10", genOniU3_j, SK3),
        ],
      },
    },
  ],
};
