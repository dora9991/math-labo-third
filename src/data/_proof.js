// ============================================================
// _proof.js — 合同・相似の「証明」問題（穴うめ・選択式）
//  証明の文章を作り、空欄［ア］［イ］に入る「理由」「等しい辺・角」「合同(相似)条件」を4択で選ぶ。
//  頂点の文字はランダムに付け替える。すべて r（seed付き乱数）だけで作るので、サーバーが同じ問題を再現できる。
//   type: why=根拠 / cond=合同・相似条件 / stmt=等式・比 / concl=合同・相似から言えること / two=根拠＋条件
// ============================================================

const LABEL_SETS = [
  ["A", "B", "C", "D", "E", "F"],
  ["P", "Q", "R", "S", "T", "U"],
  ["G", "H", "I", "J", "K", "L"],
];
const CIRC = ["①", "②", "③", "④"];
const rpick = (r, arr) => arr[r(0, arr.length - 1)];
function shuffle(r, arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = r(0, i); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
const uniq = (arr) => [...new Set(arr)];
// 正解＋まちがい候補から4択（重複なし・順番はシャッフル）
function mkChoices(r, ans, wrongs) {
  const w = uniq(wrongs).filter((x) => x !== ans);
  return shuffle(r, [ans, ...w.slice(0, 3)]);
}

// ── 根拠（理由）の候補。まちがいの選択肢は、その種類の中から選ぶ ──
const REASON_POOL = {
  side: ["仮定", "共通な辺", "平行四辺形の向かい合う辺は等しい", "二等辺三角形の底角は等しい", "対頂角は等しい"],
  angle: ["対頂角は等しい", "平行線の錯角は等しい", "平行線の同位角は等しい", "共通な角", "二等辺三角形の底角は等しい"],
  ratio: ["仮定", "共通な辺", "共通な角", "対頂角は等しい"],
};

// ── 合同条件・相似条件 ──
const COND_CONG = {
  SSS: "3組の辺がそれぞれ等しい",
  SAS: "2組の辺とその間の角がそれぞれ等しい",
  ASA: "1組の辺とその両端の角がそれぞれ等しい",
  RHS: "直角三角形の斜辺と他の1辺がそれぞれ等しい",
};
const CONG_TRAP = "3組の角がそれぞれ等しい";
const COND_SIM = {
  S3: "3組の辺の比がすべて等しい",
  S2: "2組の辺の比とその間の角がそれぞれ等しい",
  A2: "2組の角がそれぞれ等しい",
};
const SIM_TRAP = "1組の辺とその両端の角がそれぞれ等しい";

// ── ケース（証明のもと）。$1〜$6 は頂点の文字に置き換わる ──
//  tri1/tri2 は「対応する順」に並べた頂点。steps は証明の各行。
const CONG_CASES = [
  { // 対頂角 → 2辺とその間の角
    setup: "線分$1$2と線分$3$4が点$5で交わっていて、$1$5=$2$5、$3$5=$4$5である。",
    tri1: ["$1", "$5", "$3"], tri2: ["$2", "$5", "$4"], cond: "SAS",
    steps: [
      { stmt: "$1$5=$2$5", why: "仮定", kind: "side" },
      { stmt: "$3$5=$4$5", why: "仮定", kind: "side" },
      { stmt: "∠$1$5$3=∠$2$5$4", why: "対頂角は等しい", kind: "angle" },
    ],
  },
  { // 錯角＋対頂角 → 1辺とその両端の角
    setup: "線分$1$4と線分$2$3が点$5で交わっていて、$1$2∥$4$3、$1$5=$4$5である。",
    tri1: ["$1", "$2", "$5"], tri2: ["$4", "$3", "$5"], cond: "ASA",
    steps: [
      { stmt: "$1$5=$4$5", why: "仮定", kind: "side" },
      { stmt: "∠$1$5$2=∠$4$5$3", why: "対頂角は等しい", kind: "angle" },
      { stmt: "∠$2$1$5=∠$3$4$5", why: "平行線の錯角は等しい", kind: "angle" },
    ],
  },
  { // 共通な辺 → 3辺
    setup: "△$1$2$3で、点$4は辺$2$3上の点で、$1$2=$1$3、$2$4=$3$4である。",
    tri1: ["$1", "$2", "$4"], tri2: ["$1", "$3", "$4"], cond: "SSS",
    steps: [
      { stmt: "$1$2=$1$3", why: "仮定", kind: "side" },
      { stmt: "$2$4=$3$4", why: "仮定", kind: "side" },
      { stmt: "$1$4=$1$4", why: "共通な辺", kind: "side" },
    ],
  },
  { // 直角三角形 → 斜辺と他の1辺
    setup: "四角形$1$2$3$4で、∠$1$2$3=∠$4$3$2=90°、$1$3=$4$2である。",
    tri1: ["$1", "$2", "$3"], tri2: ["$4", "$3", "$2"], cond: "RHS",
    steps: [
      { stmt: "∠$1$2$3=∠$4$3$2", why: "仮定", kind: "angle" },
      { stmt: "$1$3=$4$2", why: "仮定", kind: "side" },
      { stmt: "$2$3=$3$2", why: "共通な辺", kind: "side" },
    ],
  },
  { // 平行四辺形 → 3辺
    setup: "平行四辺形$1$2$3$4に、対角線$1$3をひく。",
    tri1: ["$1", "$2", "$3"], tri2: ["$3", "$4", "$1"], cond: "SSS",
    steps: [
      { stmt: "$1$2=$3$4", why: "平行四辺形の向かい合う辺は等しい", kind: "side", ex: ["仮定"] },
      { stmt: "$2$3=$4$1", why: "平行四辺形の向かい合う辺は等しい", kind: "side", ex: ["仮定"] },
      { stmt: "$1$3=$3$1", why: "共通な辺", kind: "side" },
    ],
  },
];

const SIM_CASES = [
  { // DE∥BC → 2組の角
    setup: "△$1$2$3で、辺$1$2上に点$4、辺$1$3上に点$5をとり、$4$5∥$2$3とする。",
    tri1: ["$1", "$4", "$5"], tri2: ["$1", "$2", "$3"], cond: "A2",
    steps: [
      { stmt: "∠$4$1$5=∠$2$1$3", why: "共通な角", kind: "angle" },
      { stmt: "∠$1$4$5=∠$1$2$3", why: "平行線の同位角は等しい", kind: "angle" },
    ],
  },
  { // 対頂角＋錯角 → 2組の角
    setup: "線分$1$4と線分$2$3が点$5で交わっていて、$1$2∥$4$3である。",
    tri1: ["$1", "$2", "$5"], tri2: ["$4", "$3", "$5"], cond: "A2",
    steps: [
      { stmt: "∠$1$5$2=∠$4$5$3", why: "対頂角は等しい", kind: "angle" },
      { stmt: "∠$2$1$5=∠$3$4$5", why: "平行線の錯角は等しい", kind: "angle" },
    ],
  },
  { // 辺の比＋共通な角 → 2組の辺の比とその間の角
    setup: "△$1$2$3で、辺$1$2上に点$4、辺$1$3上に点$5をとり、$1$4:$1$2=$1$5:$1$3とする。",
    tri1: ["$1", "$4", "$5"], tri2: ["$1", "$2", "$3"], cond: "S2",
    steps: [
      { stmt: "$1$4:$1$2=$1$5:$1$3", why: "仮定", kind: "ratio" },
      { stmt: "∠$4$1$5=∠$2$1$3", why: "共通な角", kind: "angle" },
    ],
  },
  { // 直角三角形の高さ → 2組の角
    setup: "∠$1=90°の直角三角形$1$2$3で、頂点$1から辺$2$3に垂線$1$4をひく。",
    tri1: ["$4", "$2", "$1"], tri2: ["$1", "$2", "$3"], cond: "A2",
    steps: [
      { stmt: "∠$2$4$1=∠$2$1$3", why: "仮定", kind: "angle" },
      { stmt: "∠$4$2$1=∠$1$2$3", why: "共通な角", kind: "angle" },
    ],
  },
  { // 3辺の比 → 3組の辺の比
    setup: "△$1$2$3と△$4$5$6で、$1$2:$4$5=$2$3:$5$6=$3$1:$6$4である。",
    tri1: ["$1", "$2", "$3"], tri2: ["$4", "$5", "$6"], cond: "S3",
    steps: [
      { stmt: "$1$2:$4$5=$2$3:$5$6", why: "仮定", kind: "ratio" },
      { stmt: "$2$3:$5$6=$3$1:$6$4", why: "仮定", kind: "ratio" },
    ],
  },
];

// ── 文字の付けかえと、対応する辺・角の導出 ──
const sub = (s, lab) => s.replace(/\$(\d)/g, (_, d) => lab[Number(d) - 1]);
const segKey = (s) => s.split("").sort().join("");

function corr(t1, t2) { // 三角形の頂点 [a,b,c] と [d,e,f]（対応する順）から
  const [a, b, c] = t1, [d, e, f] = t2;
  return {
    sides: [[a + b, d + e], [b + c, e + f], [a + c, d + f]],
    angles: [[`∠${b}${a}${c}`, `∠${e}${d}${f}`], [`∠${a}${b}${c}`, `∠${d}${e}${f}`], [`∠${a}${c}${b}`, `∠${d}${f}${e}`]],
  };
}

function build(r, cases, cong) {
  const ci = r(0, cases.length - 1); // rpick と同じ乱数の使い方（図の番号にも使う）
  const cs = cases[ci];
  const lab = rpick(r, LABEL_SETS);
  const T = (s) => sub(s, lab);
  const t1 = cs.tri1.map(T), t2 = cs.tri2.map(T);
  const sym = cong ? "≡" : "∽";
  const goal = `△${t1.join("")}${sym}△${t2.join("")}`;
  const steps = cs.steps.map((st) => ({ ...st, stmt: T(st.stmt) }));
  return { cs, cong, sym, goal, t1, t2, steps, setup: T(cs.setup), corr: corr(t1, t2), fig: { kind: cong ? "cong" : "sim", idx: ci, lab } };
}

const BLANK = ["［ア］", "［イ］"];

// 証明の文章。blankWhy=空欄にする行の番号(or -1)、blankCond=結論の条件を空欄にするか
function proofText(P, { blankWhy = -1, blankStmt = -1, blankCond = false, blankWhyLabel = BLANK[0], blankCondLabel = BLANK[1] }) {
  const condPhrase = P.cong ? COND_CONG[P.cs.cond] : COND_SIM[P.cs.cond];
  const lines = P.steps.map((st, i) => {
    const stmt = i === blankStmt ? BLANK[0] : st.stmt;
    const why = i === blankWhy ? `（${blankWhyLabel}）` : `（${st.why}）`;
    return `　${stmt}　…${CIRC[i]}　${why}`;
  });
  const nums = P.steps.map((_, i) => CIRC[i]).join("");
  const concl = `${nums}より、${blankCond ? blankCondLabel : condPhrase}ので、${P.goal}。`;
  return `【問題】${P.setup}\n${P.goal} であることを証明する。\n\n【証明】\n△${P.t1.join("")} と △${P.t2.join("")} において、\n${lines.join("\n")}\n${concl}`;
}

// 等式・比のまちがい候補（同じ種類・対応がずれたもの）
function wrongStmts(P, step) {
  const valid = new Set();
  P.corr.sides.forEach(([x, y]) => valid.add(`${segKey(x)}=${segKey(y)}`));
  P.steps.forEach((s) => valid.add(s.stmt));
  const out = [];
  if (step.kind === "side" || step.kind === "angle") {
    const list = step.kind === "side" ? P.corr.sides : P.corr.angles;
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
      if (i === j) continue;
      const s = `${list[i][0]}=${list[j][1]}`;
      const trivial = step.kind === "side" ? segKey(list[i][0]) === segKey(list[j][1]) : list[i][0] === list[j][1];
      const sameAsStep = P.steps.some((x) => x.stmt === s);
      if (!trivial && !sameAsStep) out.push(s);
    }
    return out;
  }
  // 比：x1:y1=x2:y2 の形から、逆さ・入れかえのまちがいを作る
  const m = step.stmt.match(/^(..):(..)=(..):(..)$/);
  if (!m) return out;
  const [, x1, y1, x2, y2] = m;
  return [`${x1}:${y1}=${y2}:${x2}`, `${y1}:${x1}=${x2}:${y2}`, `${x1}:${x2}=${y2}:${y1}`];
}

// 導けること（合同：辺・角が等しい／相似：比が等しい）の正解とまちがい
function conclusionSet(P, r) {
  const used = new Set(P.steps.map((s) => s.stmt));
  if (P.cong) {
    const all = [...P.corr.sides.map(([x, y]) => `${x}=${y}`), ...P.corr.angles.map(([x, y]) => `${x}=${y}`)]
      .filter((s) => !used.has(s) && s.split("=")[0] !== s.split("=")[1]);
    const ans = rpick(r, all);
    const kind = ans.startsWith("∠") ? "angle" : "side";
    const bad = wrongStmts(P, { kind, stmt: ans });
    return { ans, wrongs: shuffle(r, bad) };
  }
  const [a, b, c] = P.t1, [d, e, f] = P.t2;
  const x = [a + b, b + c, a + c], y = [d + e, e + f, d + f];
  const valids = [[0, 1], [0, 2], [1, 2]].map(([i, k]) => `${x[i]}:${y[i]}=${x[k]}:${y[k]}`).filter((s) => !used.has(s));
  const ans = rpick(r, valids.length ? valids : [`${x[0]}:${y[0]}=${x[1]}:${y[1]}`]);
  const [, x1, y1, x2, y2] = ans.match(/^(..):(..)=(..):(..)$/);
  return { ans, wrongs: [`${x1}:${y1}=${y2}:${x2}`, `${y1}:${x1}=${x2}:${y2}`, `${x1}:${x2}=${y2}:${y1}`] };
}

const HINT = {
  why: {
    h1: "その行の「等しい」が、図のどんな関係から言えるかを考えよう",
    h2: "対頂角・錯角・同位角・共通な辺（角）・仮定のどれかを、問題の条件と見くらべる",
  },
  cond: {
    h1: "①②③で言えた「辺」と「角」を、数えて並べてみよう",
    h2: "辺・角・辺の並びなら「2組の辺とその間の角」、角・辺・角なら「1組の辺とその両端の角」、辺が3つなら「3組の辺」",
  },
  stmt: {
    h1: "頂点は、書いた順に対応している（△ABC≡△DEF なら A↔D、B↔E、C↔F）",
    h2: "対応する頂点どうしを結んだ辺・角が、等しい組になる",
  },
  condSim: {
    h1: "①②で言えた「角」や「辺の比」を、数えて並べてみよう",
    h2: "角が2組なら「2組の角」、比が2組と間の角なら「2組の辺の比とその間の角」、比が3組なら「3組の辺の比」",
  },
};

function gen(r, level, cases, cong) {
  const P = build(r, cases, cong);
  const F = (o) => ({ ...o, fig: P.fig }); // 図（ProofFigure）の情報を添える
  const condAns = cong ? COND_CONG[P.cs.cond] : COND_SIM[P.cs.cond];
  const condWrongs = cong
    ? Object.entries(COND_CONG).filter(([k]) => k !== P.cs.cond).map(([, v]) => v).concat(CONG_TRAP)
    : Object.values(COND_SIM).filter((v) => v !== condAns).concat(SIM_TRAP);
  const condChoices = () => mkChoices(r, condAns, cong ? [CONG_TRAP, ...shuffle(r, condWrongs.filter((x) => x !== CONG_TRAP))] : shuffle(r, condWrongs));
  const whyOf = (i) => {
    const st = P.steps[i];
    const pool = REASON_POOL[st.kind].filter((x) => x !== st.why && !(st.ex || []).includes(x));
    return mkChoices(r, st.why, shuffle(r, pool));
  };
  const hintCond = cong ? HINT.cond : HINT.condSim;

  if (level === "easy") {
    const i = r(0, P.steps.length - 1);
    const st = P.steps[i];
    return F({ q: `${proofText(P, { blankWhy: i })}\n\n［ア］にあてはまる理由はどれですか。`, ans: st.why, choices: whyOf(i), h1: HINT.why.h1, h2: HINT.why.h2 });
  }
  if (level === "standard") {
    return F({ q: `${proofText(P, { blankCond: true })}\n\n［イ］にあてはまる${cong ? "合同" : "相似"}条件はどれですか。`, ans: condAns, choices: condChoices(), h1: hintCond.h1, h2: hintCond.h2 });
  }
  if (level === "advanced") {
    if (r(0, 1) === 0) {
      // 空欄に入る等式・比（理由は見えている）
      const i = r(0, P.steps.length - 1);
      const st = P.steps[i];
      const wr = shuffle(r, wrongStmts(P, st));
      return F({ q: `${proofText(P, { blankStmt: i })}\n\n［ア］にあてはまる式はどれですか。`, ans: st.stmt, choices: mkChoices(r, st.stmt, wr), h1: HINT.stmt.h1, h2: HINT.stmt.h2 });
    }
    const cset = conclusionSet(P, r);
    return F({
      q: `${proofText(P, {})}\n\n${P.goal} が示せたので、${cong ? "合同な図形の対応する辺・角は等しい" : "相似な図形の対応する辺の比は等しい"}。このとき、正しく言えるのはどれですか。`,
      ans: cset.ans, choices: mkChoices(r, cset.ans, cset.wrongs), h1: HINT.stmt.h1, h2: HINT.stmt.h2,
    });
  }
  // oni：根拠［ア］と条件［イ］を組みで選ぶ
  const i = r(0, P.steps.length - 1);
  const st = P.steps[i];
  const wrongWhy = shuffle(r, REASON_POOL[st.kind].filter((x) => x !== st.why && !(st.ex || []).includes(x)));
  const wrongCond = shuffle(r, condWrongs);
  const pair = (w, c) => `ア：${w}　イ：${c}`;
  const ans = pair(st.why, condAns);
  const wrongs = [pair(wrongWhy[0], condAns), pair(st.why, wrongCond[0]), pair(wrongWhy[1] || wrongWhy[0], wrongCond[1] || wrongCond[0])];
  return F({ q: `${proofText(P, { blankWhy: i, blankCond: true })}\n\n［ア］［イ］にあてはまる組みあわせはどれですか。`, ans, choices: mkChoices(r, ans, wrongs), h1: hintCond.h1, h2: hintCond.h2 });
}

// 図の情報（fig）を問題に添える。画面が ProofFigure で描く（seedから同じ図を再現できる）
export const genCongProof = (r, level) => gen(r, level, CONG_CASES, true);
export const genSimProof = (r, level) => gen(r, level, SIM_CASES, false);
