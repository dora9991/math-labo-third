// ============================================================
// g2c6 — 中2「確率と統計」（★自動作問版）
//  場合の数は数値(numChoices)、確率は約分した分数(frac)で4択。
// ============================================================
import { frac, exprChoices, numChoices } from "../_algebra.js";

const p = (id, build, skill = null) => ({ id, build, skill });

const H = {
  count: { h1: "並べる(順列)は順番を区別、選ぶ(組合せ)は順番を区別しない", h2: "nから r個を並べる=n×(n−1)×…、選ぶ=それ÷(r×…×1)" },
  prob: { h1: "確率 =（あてはまる場合の数）÷（全部の場合の数）", h2: "最後にかならず約分する。さいころ2個は全部で36通り" },
};
const fact = (n) => { let f = 1; for (let i = 2; i <= n; i++) f *= i; return f; };
const nPr = (n, r) => { let v = 1; for (let i = 0; i < r; i++) v *= (n - i); return v; };
const nCr = (n, r) => nPr(n, r) / fact(r);

// 分数の4択（ありがちな誤答：余事象・分子±1・約分まわり）
function fchoices(num, den, r) {
  const correct = frac(num, den);
  const cand = [frac(den - num, den), frac(num + 1, den), frac(num - 1, den), frac(num + 2, den), frac(num, den + 1), String(num)];
  return exprChoices(correct, cand, [frac(num + 3, den), frac(Math.max(0, num - 2), den)], r);
}

// ── 数え上げの道具（答えは全部数えて出す＝式の立て方の間違いが入らない） ──
const perms = (arr, k) => { const out = []; const go = (cur, rest) => { if (cur.length === k) { out.push(cur); return; } rest.forEach((x, i) => go([...cur, x], rest.filter((_, j) => j !== i))); }; go([], arr); return out; };
const range1 = (n) => Array.from({ length: n }, (_, i) => i + 1);
const pick = (r, arr) => arr[r(0, arr.length - 1)];
const dice2 = () => { const o = []; for (let x = 1; x <= 6; x++) for (let y = 1; y <= 6; y++) o.push([x, y]); return o; };
const countIf = (arr, f) => arr.filter(f).length;
const PAIRS = [["シャツ", "枚", "ズボン", "本"], ["パン", "種類", "飲み物", "種類"], ["ぼうし", "個", "くつ", "足"]];

// ── u1 場合の数 ──（2026-09-30：各難度で数種類の場面を出すように。以前は1種類ずつで同じ問題ばかりだった）
function genCount(r, level) {
  if (level === "easy") {
    const t = r(0, 2);
    if (t === 0) { const n = r(3, 5), a = fact(n); return { q: `${n}人が1列に並ぶ並び方は何通りですか。`, ans: a, choices: numChoices(a, r, [n * n, n * (n - 1), n]), h1: H.count.h1, h2: "1列の並び方 = n×(n−1)×…×1" }; }
    if (t === 1) { const [A, ua, B, ub] = pick(r, PAIRS), x = r(2, 5), y = r(2, 4), a = x * y; return { q: `${A}が${x}${ua}、${B}が${y}${ub}あります。${A}と${B}を1つずつ選ぶ組み合わせは何通りですか。`, ans: a, choices: numChoices(a, r, [x + y, x * y * 2, x * x]), h1: "樹形図をかくと、1つの○に対して△が全部つながる", h2: `${x}×${y}` }; }
    const n = r(2, 4), a = 2 ** n; return { q: `1枚の硬貨を${n}回投げるとき、表と裏の出方は全部で何通りですか。`, ans: a, choices: numChoices(a, r, [2 * n, n * n, 2 ** (n - 1)]), h1: "1回ごとに表・裏の2通りずつ", h2: `2を${n}回かける` };
  }
  if (level === "standard") {
    const t = r(0, 2);
    if (t === 0) { const n = r(4, 6), rr = r(2, 3), a = nPr(n, rr); return { q: `${n}人から${rr}人を選んで1列に並べる並べ方は何通りですか。`, ans: a, choices: numChoices(a, r, [nCr(n, rr), Math.pow(n, rr), n * rr]), h1: H.count.h1, h2: "並べる=n×(n−1)×…（r個ぶん）" }; }
    if (t === 1) { const n = r(4, 6), a = perms(range1(n), 2).length; return { q: `1から${n}までの数字が1つずつ書かれた${n}枚のカードから2枚を並べて、2けたの整数をつくる。整数は全部で何個できますか。`, ans: a, choices: numChoices(a, r, [n * n, nCr(n, 2), 2 * n]), h1: "十の位→一の位の順に、使えるカードを数える", h2: `${n}×${n - 1}` }; }
    const n = r(4, 7), a = n * (n - 1); return { q: `${n}人の中から、班長と副班長を1人ずつ選ぶ選び方は何通りですか。`, ans: a, choices: numChoices(a, r, [nCr(n, 2), n * 2, n * n]), h1: "班長と副班長は役割がちがう＝順番を区別する", h2: `${n}×${n - 1}` };
  }
  if (level === "advanced") {
    const t = r(0, 3);
    if (t === 0) { const n = r(4, 7), rr = r(2, 3), a = nCr(n, rr); return { q: `${n}人から${rr}人を選ぶ選び方は何通りですか。`, ans: a, choices: numChoices(a, r, [nPr(n, rr), n * rr, n]), h1: H.count.h1, h2: "選ぶ=並べる ÷ (r×…×1)" }; }
    if (t === 1) { const n = r(4, 8), a = nCr(n, 2); return { q: `${n}チームで、どのチームとも1回ずつ試合をする（総当たり戦）。試合は全部で何試合ですか。`, ans: a, choices: numChoices(a, r, [n * (n - 1), n * 2, n]), h1: "AとBの試合と、BとAの試合は同じ", h2: `${n}×${n - 1}÷2` }; }
    if (t === 2) { const n = r(4, 6), cards = Array.from({ length: n }, (_, i) => i), a = countIf(perms(cards, 2), (pp) => pp[0] !== 0); return { q: `0から${n - 1}までの数字が1つずつ書かれた${n}枚のカードから2枚を並べて、2けたの整数をつくる。整数は全部で何個できますか。`, ans: a, choices: numChoices(a, r, [n * (n - 1), (n - 1) * (n - 2), n * n]), h1: "十の位に 0 は置けない", h2: `十の位は${n - 1}通り、一の位は残りの${n - 1}通り` }; }
    const n = r(5, 8), a = (n * (n - 3)) / 2; return { q: `${n}角形の対角線は、全部で何本ありますか。`, ans: a, choices: numChoices(a, r, [n * (n - 3), nCr(n, 2), n]), h1: "1つの頂点から引ける対角線は(頂点の数−3)本", h2: `${n}×${n - 3}÷2（同じ線を2回数えている）` };
  }
  const t = r(0, 3);
  if (t === 0) {
    const aMen = r(2, 3), bWomen = r(2, 3), n = aMen + bWomen, a = bWomen * (bWomen - 1) * fact(n - 2);
    return { q: `男子 ${aMen} 人、女子 ${bWomen} 人の合計 ${n} 人を1列に並べるとき、両端がともに女子になる並べ方は何通りですか。`, ans: a, choices: numChoices(a, r, [fact(n), bWomen * fact(n - 2), aMen * (aMen - 1) * fact(n - 2)]), h1: H.count.h1, h2: `両端の女子=${bWomen}×${bWomen - 1}通り、残り${n - 2}人=${fact(n - 2)}通り。かけ合わせる` };
  }
  if (t === 1) {
    const m = r(3, 5), w = r(3, 5), a = m * nCr(w, 2);
    return { q: `男子${m}人、女子${w}人の中から、男子1人と女子2人の代表を選ぶ選び方は何通りですか。`, ans: a, choices: numChoices(a, r, [m * w * (w - 1), nCr(m + w, 3), m + nCr(w, 2)]), h1: "男子の選び方と女子の選び方を別々に数えて、かける", h2: `${m}×（${w}人から2人を選ぶ${nCr(w, 2)}通り）` };
  }
  if (t === 2) {
    const n = r(4, 5), cards = Array.from({ length: n }, (_, i) => i), a = countIf(perms(cards, 3), (pp) => pp[0] !== 0 && pp[2] % 2 === 0);
    return { q: `0から${n - 1}までの数字が1つずつ書かれた${n}枚のカードから3枚を並べて、3けたの整数をつくる。偶数は何個できますか。`, ans: a, choices: numChoices(a, r, [countIf(perms(cards, 3), (pp) => pp[0] !== 0), countIf(perms(cards, 3), (pp) => pp[2] % 2 === 0), a + n]), h1: "一の位が 0 のときと、0 以外の偶数のときで分けて数える", h2: "百の位に 0 は置けないことに注意" };
  }
  const n = r(4, 6), a = 2 * fact(n - 1);
  return { q: `A、Bをふくむ${n}人が1列に並ぶとき、AとBがとなり合う並び方は何通りですか。`, ans: a, choices: numChoices(a, r, [fact(n - 1), fact(n), (n - 1) * 2]), h1: "となり合うAとBを1人とみなして並べ、あとでAとBの入れかえを考える", h2: `(${n - 1}人の並び方)×2` };
}

// ── u2 確率の基本（さいころ・硬貨・カード・くじ・じゃんけん） ──
const DIE_EV = [
  ["偶数の目", (x) => x % 2 === 0], ["奇数の目", (x) => x % 2 === 1], ["3の倍数の目", (x) => x % 3 === 0], ["素数の目", (x) => [2, 3, 5].includes(x)], ["6の約数の目", (x) => 6 % x === 0],
];
function genProbBasic(r, level) {
  if (level === "easy") {
    const t = r(0, 2);
    if (t === 0) { const a = r(2, 6), fav = 7 - a; return { q: `1個のさいころを投げるとき、${a} 以上の目が出る確率を求めなさい。`, ans: frac(fav, 6), choices: fchoices(fav, 6, r), h1: H.prob.h1, h2: `${a}以上は ${fav} 通り。${fav}/6 を約分` }; }
    if (t === 1) { const [name, f] = pick(r, DIE_EV), fav = countIf(range1(6), f); return { q: `1個のさいころを投げるとき、${name}が出る確率を求めなさい。`, ans: frac(fav, 6), choices: fchoices(fav, 6, r), h1: H.prob.h1, h2: `全部で6通り。${name}は ${fav} 通り` }; }
    const n = r(5, 12), k = pick(r, [2, 3]), fav = Math.floor(n / k);
    return { q: `1から${n}までの数字が1つずつ書かれた${n}枚のカードから1枚ひくとき、${k}の倍数が出る確率を求めなさい。`, ans: frac(fav, n), choices: fchoices(fav, n, r), h1: H.prob.h1, h2: `${k}の倍数のカードは ${fav} 枚` };
  }
  if (level === "standard") {
    const t = r(0, 2);
    if (t === 0) { const k = r(0, 2), fav = [1, 2, 1][k]; return { q: `2枚の硬貨を同時に投げるとき、表がちょうど ${k} 枚出る確率を求めなさい。`, ans: frac(fav, 4), choices: fchoices(fav, 4, r), h1: H.prob.h1, h2: "表裏の出方は全部で 2×2=4 通り" }; }
    if (t === 1) { const n = r(5, 12), k = r(1, n - 2); return { q: `${n}本のうち、あたりが${k}本入っているくじがある。このくじを1本ひくとき、はずれる確率を求めなさい。`, ans: frac(n - k, n), choices: fchoices(n - k, n, r), h1: H.prob.h1, h2: `はずれは ${n - k} 本` }; }
    const who = pick(r, ["あいこになる", "Aさんが勝つ"]), fav = 3;
    return { q: `AさんとBさんの2人が1回じゃんけんをするとき、${who}確率を求めなさい。`, ans: frac(fav, 9), choices: fchoices(fav, 9, r), h1: "2人の手の出し方は全部で 3×3=9 通り", h2: `${who}のは3通り` };
  }
  if (level === "advanced") {
    const t = r(0, 2);
    if (t === 0) { const k = r(0, 3), fav = [1, 3, 3, 1][k]; return { q: `3枚の硬貨を同時に投げるとき、表がちょうど ${k} 枚出る確率を求めなさい。`, ans: frac(fav, 8), choices: fchoices(fav, 8, r), h1: H.prob.h1, h2: "出方は全部で 2×2×2=8 通り" }; }
    if (t === 1) { const d = r(0, 3), fav = countIf(dice2(), ([x, y]) => Math.abs(x - y) === d); return { q: `2つのさいころを同時に投げるとき、出た目の差が ${d} になる確率を求めなさい。`, ans: frac(fav, 36), choices: fchoices(fav, 36, r), h1: "表（6×6のマス）をかいて数える", h2: `差が${d}は ${fav} 通り` }; }
    const fav = countIf(dice2(), ([x, y]) => x === y);
    return { q: `2つのさいころを同時に投げるとき、同じ目が出る確率を求めなさい。`, ans: frac(fav, 36), choices: fchoices(fav, 36, r), h1: "(1,1)(2,2)… と数える", h2: `全部で36通り。同じ目は ${fav} 通り` };
  }
  const t = r(0, 2);
  if (t === 0) { const k = r(1, 3), counts = [1, 3, 3, 1]; let fav = 0; for (let x = k; x <= 3; x++) fav += counts[x]; return { q: `3枚の硬貨を同時に投げるとき、表が ${k} 枚以上出る確率を求めなさい。`, ans: frac(fav, 8), choices: fchoices(fav, 8, r), h1: H.prob.h1, h2: `出方は全部で8通り。表が${k}枚以上は ${fav} 通り。${fav}/8 を約分` }; }
  if (t === 1) { const v = r(1, 6), fav = countIf(dice2(), ([x, y]) => x === v || y === v); return { q: `2つのさいころを同時に投げるとき、少なくとも一方は ${v} の目が出る確率を求めなさい。`, ans: frac(fav, 36), choices: fchoices(fav, 36, r), h1: "「少なくとも一方」は「どちらも出ない」場合を全体からひく", h2: `どちらも${v}でないのは 5×5=25 通り` }; }
  const hands = [0, 1, 2], all = []; for (const a of hands) for (const b of hands) for (const c of hands) all.push([a, b, c]);
  const aiko = countIf(all, (h) => new Set(h).size !== 2); // 全員同じ か 3種類ぜんぶ
  return { q: `A、B、Cの3人が1回じゃんけんをするとき、あいこになる確率を求めなさい。`, ans: frac(aiko, 27), choices: fchoices(aiko, 27, r), h1: "3人の手の出し方は全部で 3×3×3=27 通り", h2: "あいこ＝全員同じ手(3通り)＋全員ちがう手(6通り)" };
}

// ── u3 確率の応用（玉・2つのさいころ・くじ） ──
const sumCount = (k) => 6 - Math.abs(k - 7);     // 2つのさいころで和がkになる通り数
function genProbAdv(r, level) {
  if (level === "easy") {
    if (r(0, 1)) { const red = r(2, 5), white = r(2, 5), tot = red + white; return { q: `赤玉 ${red} 個と白玉 ${white} 個が入った袋から1個取り出すとき、赤玉が出る確率を求めなさい。`, ans: frac(red, tot), choices: fchoices(red, tot, r), h1: H.prob.h1, h2: `全部で${tot}個、赤は${red}個。${red}/${tot} を約分` }; }
    const a = r(1, 4), b = r(1, 4), c = r(1, 4), tot = a + b + c;
    return { q: `赤玉${a}個、白玉${b}個、青玉${c}個が入った袋から1個取り出すとき、青玉ではない確率を求めなさい。`, ans: frac(a + b, tot), choices: fchoices(a + b, tot, r), h1: "青玉ではない＝赤玉か白玉", h2: `${a + b}/${tot} を約分` };
  }
  if (level === "standard") {
    if (r(0, 1)) { const k = r(3, 11), fav = sumCount(k); return { q: `2つのさいころを同時に投げるとき、出た目の和が ${k} になる確率を求めなさい。`, ans: frac(fav, 36), choices: fchoices(fav, 36, r), h1: H.prob.h1, h2: `和が${k}は ${fav} 通り。${fav}/36 を約分` }; }
    const k = pick(r, [4, 6, 12]), fav = countIf(dice2(), ([x, y]) => x * y === k);
    return { q: `2つのさいころを同時に投げるとき、出た目の積が ${k} になる確率を求めなさい。`, ans: frac(fav, 36), choices: fchoices(fav, 36, r), h1: "表（6×6のマス）をかいて数える", h2: `積が${k}は ${fav} 通り` };
  }
  if (level === "advanced") {
    if (r(0, 1)) { const k = r(8, 11); let fav = 0; for (let x = k; x <= 12; x++) fav += sumCount(x); return { q: `2つのさいころを同時に投げるとき、出た目の和が ${k} 以上になる確率を求めなさい。`, ans: frac(fav, 36), choices: fchoices(fav, 36, r), h1: H.prob.h1, h2: `和が${k}以上の通り数を数えて 36 で割る` }; }
    const red = r(2, 4), white = r(2, 4), tot = red + white;
    return { q: `赤玉${red}個と白玉${white}個が入った袋から、同時に2個取り出すとき、2個とも赤玉である確率を求めなさい。`, ans: frac(nCr(red, 2), nCr(tot, 2)), choices: fchoices(nCr(red, 2), nCr(tot, 2), r), h1: "玉に番号をつけて、2個の取り出し方を全部数える", h2: `全部で${nCr(tot, 2)}通り、2個とも赤は${nCr(red, 2)}通り` };
  }
  const t = r(0, 2);
  if (t === 0) { const m = r(2, 4); let fav = 0; for (let x = 1; x <= 6; x++) for (let y = 1; y <= 6; y++) if ((x * y) % m === 0) fav++; return { q: `2つのさいころを同時に投げるとき、出た目の積が ${m} の倍数になる確率を求めなさい。`, ans: frac(fav, 36), choices: fchoices(fav, 36, r), h1: H.prob.h1, h2: `36通りのうち積が${m}の倍数は ${fav} 通り。${fav}/36 を約分` }; }
  if (t === 1) { const red = r(2, 4), white = r(2, 4), tot = red + white, fav = nCr(tot, 2) - nCr(red, 2); return { q: `赤玉${red}個と白玉${white}個が入った袋から、同時に2個取り出すとき、少なくとも1個は白玉である確率を求めなさい。`, ans: frac(fav, nCr(tot, 2)), choices: fchoices(fav, nCr(tot, 2), r), h1: "「少なくとも1個は白」＝全体から「2個とも赤」をひく", h2: `2個とも赤は${nCr(red, 2)}通り、全部で${nCr(tot, 2)}通り` }; }
  const n = r(5, 10), k = r(2, Math.min(4, n - 2));
  return { q: `${n}本のうちあたりが${k}本入っているくじを、AさんとBさんがこの順に1本ずつひく（ひいたくじはもどさない）。Bさんがあたる確率を求めなさい。`, ans: frac(k, n), choices: fchoices(k, n, r), h1: "Aがあたった場合と、はずれた場合に分けて考える", h2: "くじは、ひく順番に関係なく、あたる確率は同じになる" };
}

// ── u4 四分位範囲・箱ひげ図 ──
const median = (arr) => { const n = arr.length, mid = Math.floor(n / 2); return n % 2 ? arr[mid] : (arr[mid - 1] + arr[mid]) / 2; };
function quartiles(arr) {
  const n = arr.length, mid = Math.floor(n / 2);
  const lower = arr.slice(0, mid);
  const upper = n % 2 ? arr.slice(mid + 1) : arr.slice(mid);
  return { q1: median(lower), med: median(arr), q3: median(upper) };
}
function genData(r, n, lo, hi) {
  const set = new Set();
  while (set.size < n) set.add(r(lo, hi));
  return [...set].sort((a, b) => a - b);
}
function genQuartile(r, level) {
  if (level === "easy") {
    const arr = genData(r, 7, 1, 30);
    const med = median(arr);
    return { q: `あるデータを小さい順に並べると次のようになった。中央値を求めなさい。\n${arr.join(", ")}`, ans: med, choices: numChoices(med, r, [arr[2], arr[4]]), h1: "データを小さい順に並べたときの真ん中の値", h2: `中央値=${med}` };
  }
  if (level === "standard") {
    const arr = genData(r, 7, 1, 30);
    const { q1, q3 } = quartiles(arr);
    const askQ1 = r(0, 1) === 0;
    const ans = askQ1 ? q1 : q3;
    return { q: `あるデータを小さい順に並べると次のようになった。第${askQ1 ? "1" : "3"}四分位数を求めなさい。\n${arr.join(", ")}`, ans, choices: numChoices(ans, r, [askQ1 ? q3 : q1, median(arr)]), h1: "中央値で前半・後半に分け、それぞれの中央値が第1・第3四分位数", h2: `第1四分位数=${q1}、第3四分位数=${q3}` };
  }
  if (level === "advanced") {
    const arr = genData(r, 9, 1, 40);
    const { q1, q3 } = quartiles(arr);
    const iqr = q3 - q1;
    return { q: `あるデータを小さい順に並べると次のようになった。四分位範囲（第3四分位数−第1四分位数）を求めなさい。\n${arr.join(", ")}`, ans: iqr, choices: numChoices(iqr, r, [q3, q1, arr[arr.length - 1] - arr[0]]), h1: "四分位範囲=第3四分位数−第1四分位数", h2: `${q3}−${q1}=${iqr}` };
  }
  // oni：五数要約（最小・Q1・中央値・Q3・最大）から範囲 or 四分位範囲を読み取る
  const arr = genData(r, 9, 1, 50);
  const { q1, q3, med } = quartiles(arr);
  const min = arr[0], max = arr[arr.length - 1];
  const askRange = r(0, 1) === 0;
  const range = max - min, iqr = q3 - q1;
  const ans = askRange ? range : iqr;
  return { q: `あるデータの箱ひげ図から、最小値${min}、第1四分位数${q1}、中央値${med}、第3四分位数${q3}、最大値${max}であることがわかった。${askRange ? "範囲（最大値−最小値）" : "四分位範囲（第3四分位数−第1四分位数）"}を求めなさい。`, ans, choices: numChoices(ans, r, [askRange ? iqr : range, max - q1]), h1: askRange ? "範囲=最大値−最小値" : "四分位範囲=第3四分位数−第1四分位数", h2: askRange ? `${max}−${min}=${range}` : `${q3}−${q1}=${iqr}` };
}

// 各レベル10問ずつ（同じ作問関数を10通りの乱数で出す。id は連番で重複なし）＋ oni を新設
const N = 10;
const seq = (fn, idp, level, tag, skill) =>
  Array.from({ length: N }, (_, i) => p(`${idp}${tag}${i + 1}`, (r) => fn(r, level), skill));
const lv = (fn, idp, skill) => ({
  easy: seq(fn, idp, "easy", "e", skill),
  standard: seq(fn, idp, "standard", "s", skill),
  advanced: seq(fn, idp, "advanced", "a", skill),
  oni: seq(fn, idp, "oni", "o", skill),
});

export const chapter = {
  id: "g2c6",
  name: "確率と統計",
  emoji: "🎲",
  color: "#22d3ee",
  grade: 2,
  units: [
    { id: "g2c6u1", name: "場合の数（順列・組み合わせ）", emoji: "🔢", desc: "並べる・選ぶ", problems: lv(genCount, "g2c6u1", "S-PRB-COUNT") },
    { id: "g2c6u2", name: "確率の基本（さいころ・硬貨）", emoji: "🎲", desc: "場合÷全部", problems: lv(genProbBasic, "g2c6u2", "S-PRB-BASIC") },
    { id: "g2c6u3", name: "確率の応用（玉・2つのさいころ）", emoji: "🔴", desc: "玉・2個のさいころ", problems: lv(genProbAdv, "g2c6u3", "S-PRB-ADV") },
    { id: "g2c6u4", name: "四分位範囲・箱ひげ図", emoji: "📦", desc: "中央値・四分位数・範囲", problems: lv(genQuartile, "g2c6u4", "S-STAT-QUARTILE") },
  ],
};
