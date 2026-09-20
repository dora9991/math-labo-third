// ============================================================
// g2c1 — 中2「式の計算」（★自動作問版）
//  中1と同じ {id, build(rng)→{q,ans,h1,h2,choices}, skill} の形で、
//  毎回ちがう係数の問題を生成し、式の答え＋ありがちな誤答の4択を自動でつくる。
//  skill タグにより、習熟度推定・アダプティブ出題・分析の対象になる。
// ============================================================
import { polyStr, monoStr, varStr, sup, mulMono, divMono, rnz, rpick, exprChoices } from "../_algebra.js";

const p = (id, build, skill = null) => ({ id, build, skill });

// 段階ヒント（答えは出さず考え方を導く）
const H = {
  add:   { h1: "同じ文字どうし(xとx、yとy)と、数だけの項を、それぞれ集めよう", h2: "ひき算は後ろの( )の符号を全部反対にしてから、文字ごとにまとめる" },
  mul:   { h1: "数は数どうし、文字は文字どうしをかけよう", h2: "まず符号(＋か−)を決め、次に数、同じ文字は指数を足す" },
  pow:   { h1: "( )²や( )³は、中の数も文字も全部その回数だけかける", h2: "(−3x)²=(−3)²×x²のように、係数と文字に分けて累乗する" },
  div:   { h1: "わり算は分数の形にして約分する考え方", h2: "数は数で約分、同じ文字は指数を引く。符号も忘れずに" },
  mix:   { h1: "÷は逆数のかけ算に直して、全部かけ算にしよう", h2: "先に符号、次に数、最後に文字。前から順に計算する" },
  solve: { h1: "解きたい文字だけを左に残し、ほかは全部右へ移そう", h2: "= をまたいで移すと符号が反対になる。最後に係数で割る" },
};

// 負の単項式は ( ) でくくって表示
const fac = (c, v) => (c < 0 ? `(${monoStr(c, v)})` : monoStr(c, v));
// 予備のダミー（答えの各項を±1,±2ずらす）
const fillersPoly = (terms) => {
  const out = [];
  for (let i = 0; i < terms.length; i++) for (const d of [1, -1, 2, -2]) {
    out.push(polyStr(terms.map((t, j) => (j === i ? { ...t, c: t.c + d } : t))));
  }
  return out;
};

// ── u1 多項式の加法・減法 ─────────────────────────
function genAddSub(r, level) {
  const withK = level !== "easy";
  const sub = level === "advanced" ? true : level === "standard" ? r(0, 1) === 1 : false;
  const max = level === "advanced" ? 9 : level === "standard" ? 8 : 6;
  const mk = () => ({ x: rnz(r, -max, max), y: rnz(r, -max, max), k: withK ? rnz(r, -max, max) : 0 });
  const P = mk(), Q = mk();
  const toTerms = (o) => [{ c: o.x, v: { x: 1 } }, { c: o.y, v: { y: 1 } }, ...(withK ? [{ c: o.k, v: {} }] : [])];
  const s = sub ? -1 : 1;
  const ansT = [{ c: P.x + s * Q.x, v: { x: 1 } }, { c: P.y + s * Q.y, v: { y: 1 } }, ...(withK ? [{ c: P.k + s * Q.k, v: {} }] : [])];
  const ans = polyStr(ansT);
  const q = `(${polyStr(toTerms(P))})${sub ? "−" : "+"}(${polyStr(toTerms(Q))}) を計算しなさい。`;
  const variants = [];
  if (sub) variants.push(polyStr([{ c: P.x - Q.x, v: { x: 1 } }, { c: P.y + Q.y, v: { y: 1 } }, ...(withK ? [{ c: P.k + Q.k, v: {} }] : [])])); // 後ろの( )の最初だけ符号変え
  variants.push(polyStr([{ c: P.x + s * Q.x, v: { x: 1 } }, { c: P.y - s * Q.y, v: { y: 1 } }, ...(withK ? [{ c: P.k + s * Q.k, v: {} }] : [])])); // 1項だけ符号ミス
  variants.push(polyStr([{ c: P.x - s * Q.x, v: { x: 1 } }, { c: P.y - s * Q.y, v: { y: 1 } }, ...(withK ? [{ c: P.k - s * Q.k, v: {} }] : [])])); // 加減取り違え
  return { q, ans, choices: exprChoices(ans, variants, fillersPoly(ansT), r), h1: H.add.h1, h2: H.add.h2 };
}

// ── u2 単項式の乗法 ─────────────────────────────
function genMul(r, level) {
  const max = level === "advanced" ? 6 : 5;
  let m1, m2;
  if (level === "easy") { m1 = { c: rnz(r, 2, max), v: { x: 1 } }; m2 = { c: rnz(r, -max, max), v: { y: 1 } }; }
  else if (level === "standard") { const sv = rpick(r, ["x", "y", "a"]); m1 = { c: rnz(r, -max, max), v: { [sv]: 1 } }; m2 = { c: rnz(r, -max, max), v: { [sv]: 1 } }; }
  else { m1 = { c: rnz(r, -max, max), v: { x: rnz(r, 1, 2), y: 1 } }; m2 = { c: rnz(r, -max, max), v: { x: 1, y: 1 } }; }
  const A = mulMono(m1, m2);
  const ans = monoStr(A.c, A.v);
  const q = `${fac(m1.c, m1.v)} × ${fac(m2.c, m2.v)} を計算しなさい。`;
  const wrongPow = {}; for (const k in A.v) wrongPow[k] = 1; // 指数を足し忘れ（x²→x）
  const variants = [
    monoStr(-A.c, A.v),                         // 符号ミス
    monoStr(m1.c + m2.c, A.v),                  // 係数を足してしまう
    monoStr(A.c, wrongPow),                     // 指数の足し忘れ
  ];
  const fill = [monoStr(A.c + 1, A.v), monoStr(A.c - 1, A.v), monoStr(A.c + 2, A.v)];
  return { q, ans, choices: exprChoices(ans, variants, fill, r), h1: H.mul.h1, h2: H.mul.h2 };
}

// ── u3 累乗を含む単項式 ───────────────────────────
function genPow(r, level) {
  const n = level === "advanced" ? rpick(r, [2, 3]) : 2;
  const base = level === "easy"
    ? { c: rnz(r, 2, 5), v: { x: 1 } }
    : level === "standard"
      ? { c: rnz(r, -5, -2), v: { [rpick(r, ["a", "x"])]: 1 } }
      : { c: rnz(r, -4, 4) || 2, v: { x: 1, y: 1 } };
  const av = {}; for (const k in base.v) av[k] = base.v[k] * n;
  const A = { c: Math.pow(base.c, n), v: av };
  const ans = monoStr(A.c, A.v);
  const q = `(${monoStr(base.c, base.v)})${sup(n)} を計算しなさい。`;
  const keepSign = base.c < 0 && n % 2 === 0 ? -Math.abs(A.c) : A.c; // 符号を消し忘れ
  const variants = [
    monoStr(keepSign === A.c ? -A.c : keepSign, A.v),  // 符号ミス（偶数乗で−のまま等）
    monoStr(base.c * n, A.v),                          // 係数を「×n」してしまう
    monoStr(base.c, A.v),                              // 係数を累乗し忘れ
  ];
  const fill = [monoStr(A.c + 1, A.v), monoStr(A.c - 1, A.v), monoStr(-A.c + 1, A.v), monoStr(A.c + 2, A.v)];
  return { q, ans, choices: exprChoices(ans, variants, fill, r), h1: H.pow.h1, h2: H.pow.h2 };
}

// ── u4 単項式の除法 ─────────────────────────────
function genDiv(r, level) {
  const max = level === "advanced" ? 5 : 4;
  let divisor, quo;
  if (level === "easy") { divisor = { c: rnz(r, 2, max), v: { a: 1 } }; quo = { c: rnz(r, 2, max), v: { b: 1 } }; }
  else if (level === "standard") { divisor = { c: rnz(r, -max, max), v: { x: 1 } }; quo = { c: rnz(r, -max, max), v: { y: 1 } }; }
  else { divisor = { c: rnz(r, -max, max), v: { x: 1, y: 1 } }; quo = { c: rnz(r, -max, max), v: { x: rnz(r, 1, 2) } }; }
  const dividend = mulMono(quo, divisor);           // 割り切れるように構成
  const ans = monoStr(quo.c, quo.v);
  const q = `${monoStr(dividend.c, dividend.v)} ÷ ${fac(divisor.c, divisor.v)} を計算しなさい。`;
  const variants = [
    monoStr(-quo.c, quo.v),                          // 符号ミス
    monoStr(dividend.c - divisor.c, quo.v),          // 係数を引いてしまう
    monoStr(quo.c, dividend.v),                      // 文字をそのまま残す（指数を引き忘れ）
  ];
  const fill = [monoStr(quo.c + 1, quo.v), monoStr(quo.c - 1, quo.v), monoStr(quo.c + 2, quo.v)];
  return { q, ans, choices: exprChoices(ans, variants, fill, r), h1: H.div.h1, h2: H.div.h2 };
}

// ── u5 乗除の混じった計算（A ÷ B × C） ────────────────
function genMix(r, level) {
  const max = level === "advanced" ? 4 : 3;
  const B = { c: rnz(r, 2, max), v: { a: 1 } };
  const Q = level === "advanced" ? { c: rnz(r, -max, max), v: { a: 1 } } : { c: rnz(r, 2, max), v: { b: 1 } };
  const C = level === "easy" ? { c: rnz(r, 2, max), v: { b: 1 } } : { c: rnz(r, -max, max), v: { b: 1 } };
  const A = mulMono(Q, B);                           // A÷B=Q（割り切れる）
  const R = mulMono(Q, C);                           // 答え
  const ans = monoStr(R.c, R.v);
  const q = `${monoStr(A.c, A.v)} ÷ ${fac(B.c, B.v)} × ${fac(C.c, C.v)} を計算しなさい。`;
  const wrongPow = {}; for (const k in R.v) wrongPow[k] = 1;
  const variants = [
    monoStr(-R.c, R.v),                              // 符号ミス
    monoStr(R.c, wrongPow),                          // 指数ミス
    monoStr(A.c / B.c - C.c, R.v),                   // 最後を引いてしまう など
  ];
  const fill = [monoStr(R.c + 1, R.v), monoStr(R.c - 1, R.v), monoStr(R.c + 2, R.v), monoStr(-R.c + 1, R.v)];
  return { q, ans, choices: exprChoices(ans, variants, fill, r), h1: H.mix.h1, h2: H.mix.h2 };
}

// ── u6 等式の変形（係数±1の文字について解く＝答えは分数なし） ──
function genSolve(r, level) {
  const max = level === "advanced" ? 7 : 6;
  const A = rnz(r, 2, max);
  const c = rnz(r, -max, max);
  const plusY = r(0, 1) === 1;                       // y の符号（+y か −y か）
  // 方程式： A x (±) y = c を y について解く
  const lhs = `${monoStr(A, { x: 1 })}${plusY ? "+" : "−"}y`;
  const q = `${lhs} = ${c} を y について解きなさい。`;
  // +y: y = −Ax + c ／ −y: y = Ax − c
  const ansT = plusY ? [{ c: -A, v: { x: 1 } }, { c, v: {} }] : [{ c: A, v: { x: 1 } }, { c: -c, v: {} }];
  const ans = "y=" + polyStr(ansT);
  const variants = [
    "y=" + polyStr([{ c: plusY ? A : -A, v: { x: 1 } }, { c: plusY ? c : -c, v: {} }]),  // 移項で符号を変え忘れ
    "y=" + polyStr([{ c: -ansT[0].c, v: { x: 1 } }, { c: ansT[1].c, v: {} }]),            // x項だけ符号ミス
    "y=" + polyStr([{ c: ansT[0].c, v: { x: 1 } }, { c: -ansT[1].c, v: {} }]),            // 定数だけ符号ミス
  ];
  const fill = ["y=" + polyStr([{ c: ansT[0].c, v: { x: 1 } }, { c: ansT[1].c + 1, v: {} }]), "y=" + polyStr([{ c: ansT[0].c + 1, v: { x: 1 } }, { c: ansT[1].c, v: {} }])];
  return { q, ans, choices: exprChoices(ans, variants, fill, r), h1: H.solve.h1, h2: H.solve.h2 };
}

// 🔥鬼：累乗を含む乗除混合 (k·xᵃy)² × m·x ÷ (n·xᶜ)。発展の上の難問。
function genOni(r) {
  const A = { c: rnz(r, -4, 4), v: { x: rnz(r, 1, 2), y: 1 } };
  const num = mulMono(mulMono(A, A), { c: rnz(r, -4, 4), v: { x: 1 } }); // A² × (mx)
  const C = { c: rnz(r, 2, 4), v: { x: rnz(r, 1, 2) } };
  const R = divMono(num, C);
  if (!R) return { skip: true };
  const B = { c: num.c / (A.c * A.c), v: { x: 1 } }; // 表示用に取り出した mx
  const ans = monoStr(R.c, R.v);
  const q = `(${monoStr(A.c, A.v)})² × ${fac(B.c, B.v)} ÷ ${fac(C.c, C.v)} を計算しなさい。`;
  const wrongPow = {}; for (const k in R.v) wrongPow[k] = 1;
  const variants = [monoStr(-R.c, R.v), monoStr(R.c, wrongPow), monoStr(R.c * 2, R.v)];
  const fill = [monoStr(R.c + 1, R.v), monoStr(R.c - 1, R.v), monoStr(-R.c + 1, R.v)];
  return { q, ans, choices: exprChoices(ans, variants, fill, r), h1: "累乗を先に計算→かけ算・わり算を前から順に", h2: "( )²は係数も指数も2倍。約分・符号に注意" };
}

// 各単元：難易度ごとに生成テンプレを 10 個ずつ置く（1テンプレで毎回ちがう問題を生成）。
//  ・各レベルの 10 テンプレは同じ生成関数を使う＝呼び出しごとに係数がランダムに変わるので、
//    出題時には毎回ちがう問題になる（id は重複しないよう連番で振る）。
//  ・oni（鬼）は「その単元の発展(advanced)の難問」＋「全単元共通の累乗込み乗除混合(genOni)」を
//    交互に混ぜ、発展のさらに上の難問として 10 個用意する（答えは1つに定まる式/数値）。
const N = 10; // 各レベルの問題数
const mkList = (idp, lvl, fn, skill) =>
  Array.from({ length: N }, (_, i) => p(`${idp}${lvl}${i + 1}`, (r) => fn(r, lvl), skill));
// oni 用：その単元の generator を advanced で出す問題と、共通 genOni を交互に
const mkOni = (idp, fn, skill) =>
  Array.from({ length: N }, (_, i) =>
    p(`${idp}o${i + 1}`, (r) => (i % 2 === 0 ? genOni(r) : fn(r, "advanced")), skill)
  );
const lv = (fn, idp, skill) => ({
  easy: mkList(idp, "e", fn, skill),
  standard: mkList(idp, "s", fn, skill),
  advanced: mkList(idp, "a", fn, skill),
  oni: mkOni(idp, fn, skill), // 🔥鬼（発展の難問＋累乗を含む乗除混合）
});

export const chapter = {
  id: "g2c1",
  name: "式の計算",
  emoji: "🔣",
  color: "#34d399",
  grade: 2,
  units: [
    { id: "g2c1u1", name: "多項式の加法・減法", emoji: "✏️", desc: "同類項をまとめる", problems: lv(genAddSub, "g2c1u1", "S-EXP-ADD") },
    { id: "g2c1u2", name: "単項式の乗法", emoji: "✖️", desc: "係数の積・指数の和", problems: lv(genMul, "g2c1u2", "S-EXP-MUL") },
    { id: "g2c1u3", name: "累乗を含む単項式の計算", emoji: "🔼", desc: "( )ⁿ の計算", problems: lv(genPow, "g2c1u3", "S-EXP-POW") },
    { id: "g2c1u4", name: "単項式の除法", emoji: "➗", desc: "約分・指数の差", problems: lv(genDiv, "g2c1u4", "S-EXP-DIV") },
    { id: "g2c1u5", name: "乗除の混じった計算", emoji: "🔀", desc: "前から順に計算", problems: lv(genMix, "g2c1u5", "S-EXP-MIX") },
    { id: "g2c1u6", name: "等式の変形", emoji: "🟰", desc: "○について解く", problems: lv(genSolve, "g2c1u6", "S-EXP-SOLVE") },
  ],
};
