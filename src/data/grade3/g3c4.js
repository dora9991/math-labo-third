// ============================================================
// g3c4 — 中3「関数 y=ax²」（★自動作問版）
//  式は y=ax²（monoStr）、変域・変化の割合・利用は数値。整数に保つ。
//  各単元 easy/standard/advanced/oni を各10テンプレ（id を分けるだけで
//  乱数シードにより別問題になる。解は build 内で逆算するので必ず正答）。
// ============================================================
import { monoStr, neg, exprChoices, numChoices } from "../_algebra.js";

const p = (id, build, skill = null) => ({ id, build, skill });
const rnz = (r, a, b) => { let v = 0; while (v === 0) v = r(a, b); return v; };
const rpick = (r, arr) => arr[r(0, arr.length - 1)];
const q2 = (a) => `y=${monoStr(a, { x: 2 })}`;

const H = {
  eq: { h1: "y=ax² に通る点の x,y を代入して a を求める", h2: "a = y ÷ x²" },
  range: { h1: "a>0 のとき|x|が大きいほど y も大きい。a<0 は逆", h2: "x の変域の端と、0を含むかを調べる" },
  rate: { h1: "y=ax² の変化の割合 = a×(p+q)（x が p→q）", h2: "(yの増加量)÷(xの増加量) を計算" },
  use: { h1: "y=ax² に値を代入する", h2: "x を入れて y、または y を入れて x²→x" },
};

// ── u1 式・代入（a を求める／y を求める／a を求めて y を求める） ──
function genEq(r, level) {
  if (level === "easy") {
    // a が与えられ、x を代入して y を求める（最も基本）
    const a = rnz(r, -4, 4), x1 = rnz(r, 1, 5), y = a * x1 * x1;
    return {
      q: `関数 y=${monoStr(a, { x: 2 })} で、x=${neg(x1)} のときの y の値を求めなさい。`,
      ans: y,
      choices: numChoices(y, r, [a * x1, -a * x1 * x1, a + x1 * x1]),
      h1: H.use.h1, h2: `${a}×${x1}²=${a}×${x1 * x1}=${y}`,
    };
  }
  if (level === "standard") {
    // 通る点から a を求める（式 y=ax² を答える）
    const a = rnz(r, -4, 4), x1 = rnz(r, 1, 4), y1 = a * x1 * x1;
    const ans = q2(a);
    return {
      q: `y は x² に比例し、x=${x1} のとき y=${neg(y1)} です。y を x の式で表しなさい。`,
      ans,
      choices: exprChoices(ans, [`y=${monoStr(a, { x: 1 })}`, q2(-a), q2(y1)], [q2(a + 1), q2(a - 1)], r),
      h1: H.eq.h1, h2: `a=${y1}÷${x1 * x1}=${a}`,
    };
  }
  if (level === "advanced") {
    // 点から a を決め、別の x の y を求める（2段階）
    const a = rnz(r, -4, 4), x1 = rnz(r, 1, 4), y1 = a * x1 * x1;
    let x2 = rnz(r, 1, 5); if (x2 === x1) x2 += 1;
    const y2 = a * x2 * x2;
    return {
      q: `y は x² に比例し、x=${x1} のとき y=${neg(y1)} です。x=${neg(x2)} のときの y の値を求めなさい。`,
      ans: y2,
      choices: numChoices(y2, r, [a * x2, -y2, a * x1 * x2]),
      h1: H.eq.h1, h2: `a=${y1}÷${x1 * x1}=${a}、y=${a}×${x2 * x2}=${y2}`,
    };
  }
  // oni（u1）: 比例定数・点の応用（y の値の比から a 不要で求める）
  const a = rnz(r, -3, 3), x1 = rnz(r, 1, 3), y1 = a * x1 * x1;
  const x2 = x1 + r(1, 3), y2 = a * x2 * x2;
  return {
    q: `関数 y=ax² で、x=${x1} のとき y=${neg(y1)} です。x=${neg(x2)} のときの y の値を求めなさい。`,
    ans: y2,
    choices: numChoices(y2, r, [a * x2, y1 + (x2 - x1), -y2]),
    h1: "まず a=y÷x² で a を求める", h2: `a=${y1}÷${x1 * x1}=${a}、y=${a}×${x2 * x2}=${y2}`,
  };
}

// ── u2 変域（最大・最小） ──
function genRange(r, level) {
  if (level === "easy") {
    // a>0、x≧0 の範囲で最大値（0 を含まない単調増加）
    const a = r(1, 4), p0 = r(0, 3), q0 = p0 + r(1, 4);
    const mx = a * q0 * q0;
    return {
      q: `関数 y=${monoStr(a, { x: 2 })} で、x の変域が ${p0}≦x≦${q0} のとき、y の最大値を求めなさい。`,
      ans: mx,
      choices: numChoices(mx, r, [a * p0 * p0, a * q0, (a * q0) * (a * q0)]),
      h1: H.range.h1, h2: `x=${q0} のとき最大、${a}×${q0}²=${mx}`,
    };
  }
  if (level === "standard") {
    // a>0、変域が0をまたぐ → 最大は端、最小は0
    const a = r(1, 4), p0 = rnz(r, -4, -1), q0 = r(1, 4);
    const ask = r(0, 1) === 1;
    if (ask) {
      const mx = a * Math.max(p0 * p0, q0 * q0);
      const farx = Math.abs(p0) >= Math.abs(q0) ? p0 : q0;
      return {
        q: `関数 y=${monoStr(a, { x: 2 })} で、x の変域が ${neg(p0)}≦x≦${q0} のとき、y の最大値を求めなさい。`,
        ans: mx,
        choices: numChoices(mx, r, [a * Math.min(p0 * p0, q0 * q0), 0, a * Math.abs(farx)]),
        h1: H.range.h1, h2: `|x|が最大の x=${neg(farx)} で最大、${a}×${farx * farx}=${mx}`,
      };
    }
    return {
      q: `関数 y=${monoStr(a, { x: 2 })} で、x の変域が ${neg(p0)}≦x≦${q0} のとき、y の最小値を求めなさい。`,
      ans: 0,
      choices: numChoices(0, r, [a * p0 * p0, a * q0 * q0, a]),
      h1: "0 を含む変域で a>0 なら最小は x=0 の y=0", h2: `x=0 を含むので最小は 0`,
    };
  }
  if (level === "advanced") {
    // a<0：最大・最小が逆転（0を含む変域）
    const a = rnz(r, -4, -1), p0 = rnz(r, -4, -1), q0 = r(1, 4);
    const ask = r(0, 1) === 1;
    if (ask) {
      // a<0、0を含む → 最大は x=0 の y=0
      return {
        q: `関数 y=${monoStr(a, { x: 2 })} で、x の変域が ${neg(p0)}≦x≦${q0} のとき、y の最大値を求めなさい。`,
        ans: 0,
        choices: numChoices(0, r, [a * p0 * p0, a * q0 * q0, a]),
        h1: "a<0 で 0 を含む変域なら最大は x=0 の y=0", h2: `x=0 を含むので最大は 0`,
      };
    }
    const farx = Math.abs(p0) >= Math.abs(q0) ? p0 : q0;
    const mn = a * farx * farx; // a<0 なので最小
    return {
      q: `関数 y=${monoStr(a, { x: 2 })} で、x の変域が ${neg(p0)}≦x≦${q0} のとき、y の最小値を求めなさい。`,
      ans: mn,
      choices: numChoices(mn, r, [0, a * Math.min(p0 * p0, q0 * q0), -mn]),
      h1: "a<0 では|x|が最大の所で y が最小", h2: `x=${neg(farx)} で最小、${a}×${farx * farx}=${mn}`,
    };
  }
  // oni（u2）: 変域から a を逆算（y の変域 0≦y≦M が与えられ a を求める）
  const a = r(1, 4), q0 = r(2, 5), p0 = rnz(r, -q0, -1);
  const M = a * q0 * q0; // x が 0 をまたぐので max は端、min は 0
  return {
    q: `関数 y=ax² (a>0) で、x の変域が ${neg(p0)}≦x≦${q0} のとき、y の変域は 0≦y≦${M} でした。a の値を求めなさい。`,
    ans: a,
    choices: numChoices(a, r, [M, M / (q0 * q0) + 1, q0]),
    h1: "y の最大は|x|が最大の端で起きる", h2: `${M}=a×${q0}² → a=${M}÷${q0 * q0}=${a}`,
  };
}

// ── u3 変化の割合 = a(p+q) ──
function genRate(r, level) {
  if (level === "easy") {
    // a>0、p<q の正方向、a 小さめで素直
    const a = r(1, 3), p0 = r(1, 3), q0 = p0 + r(1, 3);
    const rate = a * (p0 + q0);
    return {
      q: `関数 y=${monoStr(a, { x: 2 })} で、x が ${p0} から ${q0} まで増えるときの変化の割合を求めなさい。`,
      ans: rate,
      choices: numChoices(rate, r, [a, p0 + q0, a * (q0 - p0)]),
      h1: H.rate.h1, h2: `${a}×(${p0}+${q0})=${rate}`,
    };
  }
  if (level === "standard") {
    // a の符号・p の符号を一般化
    const a = rnz(r, -4, 4), p0 = rnz(r, -4, 3), q0 = p0 + r(1, 4);
    const rate = a * (p0 + q0);
    return {
      q: `関数 y=${monoStr(a, { x: 2 })} で、x が ${neg(p0)} から ${neg(q0)} まで増えるときの変化の割合を求めなさい。`,
      ans: rate,
      choices: numChoices(rate, r, [a, p0 + q0, a * (q0 - p0)]),
      h1: H.rate.h1, h2: `${a}×(${p0}+${q0})=${rate}`,
    };
  }
  if (level === "advanced") {
    // 変化の割合が与えられ a を求める（逆算）。p+q≠0 になるよう選ぶ
    let a, p0, q0, s;
    do { a = rnz(r, -4, 4); p0 = rnz(r, -4, 3); q0 = p0 + r(1, 4); s = p0 + q0; } while (s === 0);
    const rate = a * s;
    return {
      q: `関数 y=ax² で、x が ${neg(p0)} から ${neg(q0)} まで増えるときの変化の割合が ${neg(rate)} でした。a の値を求めなさい。`,
      ans: a,
      choices: numChoices(a, r, [rate, s, -a]),
      h1: "変化の割合 = a(p+q)。これを a について解く", h2: `${rate}=a×(${p0}+${q0})=a×${s} → a=${a}`,
    };
  }
  // oni（u3）: 1次関数と変化の割合が等しくなる条件（a(p+q)=傾き から a 等を求める）
  let a, p0, q0, s;
  do { a = rnz(r, 1, 4); p0 = rnz(r, -3, 2); q0 = p0 + r(1, 3); s = p0 + q0; } while (s === 0);
  const m = a * s; // 求める「1次関数の傾き」＝変化の割合
  return {
    q: `関数 y=${monoStr(a, { x: 2 })} で x が ${neg(p0)} から ${neg(q0)} まで増えるときの変化の割合は、ある1次関数 y=mx+1 の傾き m と等しい。m を求めなさい。`,
    ans: m,
    choices: numChoices(m, r, [a, s, a * (q0 - p0)]),
    h1: "y=ax² の変化の割合 a(p+q) を求め、それが m に等しい", h2: `m=${a}×(${p0}+${q0})=${m}`,
  };
}

// ── u4 利用（文章題） ──
function genUse(r, level) {
  if (level === "easy") {
    // 時間→距離（素直に代入）
    const a = r(2, 6), t = r(2, 6), y = a * t * t;
    return {
      q: `ある斜面で、ボールは ${a}x² (x は秒) の式で進みます。${t} 秒間に進む距離は何mですか。`,
      ans: y,
      choices: numChoices(y, r, [a * t, a + t * t, (a * t) * (a * t)]),
      h1: "x に時間を代入する", h2: `${a}×${t}²=${y}`,
    };
  }
  if (level === "standard") {
    // 距離→時間（y=ax² から x²→x、割り切れる形）
    const a = r(2, 6), t = r(2, 6), y = a * t * t;
    return {
      q: `ある斜面で、ボールは ${a}x² (x は秒) の式で進みます。${y}m 進むのは何秒後ですか。`,
      ans: t,
      choices: numChoices(t, r, [y, y / a, a]),
      h1: "y に距離を入れて x を求める", h2: `x²=${y}÷${a}=${t * t}、x=${t}`,
    };
  }
  if (level === "advanced") {
    // 平均の速さ＝変化の割合（落下 y=ax²、t1→t2 秒の平均速度）
    const a = r(2, 5), t1 = r(1, 3), t2 = t1 + r(1, 3);
    const avg = a * (t1 + t2); // (y2-y1)/(t2-t1) = a(t1+t2)
    return {
      q: `物体の落下距離が y=${monoStr(a, { x: 2 })} (x は秒, y はm) のとき、${t1} 秒後から ${t2} 秒後までの平均の速さ (m/秒) を求めなさい。`,
      ans: avg,
      choices: numChoices(avg, r, [a, a * (t2 - t1), a * t1 * t2]),
      h1: "平均の速さ = (距離の増加量)÷(時間の増加量) = a(t1+t2)", h2: `${a}×(${t1}+${t2})=${avg}`,
    };
  }
  // oni（u4）: 料金など実生活モデルから式を立てて値を求める（2段階）
  const a = r(2, 5), t = r(3, 6), y = a * t * t;
  const t2 = t + r(1, 3), y2 = a * t2 * t2;
  return {
    q: `落下距離が時間の2乗に比例し、${t} 秒で ${y}m 落ちます。同じ運動で ${t2} 秒では何m落ちますか。`,
    ans: y2,
    choices: numChoices(y2, r, [y + a * (t2 - t), a * t2, y * t2 / t]),
    h1: "まず y=ax² の a を求める（a=y÷x²）", h2: `a=${y}÷${t * t}=${a}、y=${a}×${t2 * t2}=${y2}`,
  };
}

// ── 各レベル10問ずつ（id は e1..e10 / s1..s10 / a1..a10 / o1..o10）。
//  生成関数は r（乱数シード）で振る舞いが変わるので、id を分けるだけで
//  別々の問題になる。解は build 内で逆算しており必ず正答。 ──
const N = 10;
const series = (idp, suf, mk, skill) =>
  Array.from({ length: N }, (_, i) => p(idp + suf + (i + 1), mk, skill));
const lv = (fn, idp, skill) => ({
  easy: series(idp, "e", (r) => fn(r, "easy"), skill),
  standard: series(idp, "s", (r) => fn(r, "standard"), skill),
  advanced: series(idp, "a", (r) => fn(r, "advanced"), skill),
  oni: series(idp, "o", (r) => fn(r, "oni"), skill),
});

export const chapter = {
  id: "g3c4",
  name: "関数 y=ax²",
  emoji: "📉",
  color: "#fbbf24",
  grade: 3,
  units: [
    { id: "g3c4u1", name: "y=ax²の式を求める", emoji: "✏️", desc: "a を求める", problems: lv(genEq, "g3c4u1", "S-FUNQ-EQ") },
    { id: "g3c4u2", name: "y=ax²の変域", emoji: "📊", desc: "最大・最小", problems: lv(genRange, "g3c4u2", "S-FUNQ-RANGE") },
    { id: "g3c4u3", name: "変化の割合", emoji: "📈", desc: "a(p+q)", problems: lv(genRate, "g3c4u3", "S-FUNQ-RATE") },
    { id: "g3c4u4", name: "y=ax²の利用（文章題）", emoji: "💡", desc: "あてはめ", problems: lv(genUse, "g3c4u4", "S-FUNQ-USE") },
  ],
};
