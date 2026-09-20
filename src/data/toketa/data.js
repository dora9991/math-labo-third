// ============================================================
// data/toketa/data.js — とけた！の「データの活用」（中1 第7章）を math-labo へ移植。
//  平均値 → 中央値 → 最頻値 → 範囲 → 相対度数。
//  ・各問題が「解き方ステップ(steps)」と「誤答パターン付き4択(distractors)」を持つ。
//  ・問題文(q)の表記は math-labo 流（半角）に正規化。ヒント(steps/コーチ)は全角のまま。
//  ・steps は「解き方の道すじ」までで、最後の数値答えは出さない（seisu.js と同じ流儀）。
//  出典: toketa/src/content/data.js。答えは小数（平均・相対度数）もそのまま。
// ============================================================

// ── 共通の小道具（toketa/src/content/_util.js からインライン展開）──
const ri = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const shuffle = (a) => a.map((v) => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map((x) => x[1]);
// 正解＋誤答候補から重複なし4択（数値なら近い数=calcで補完）
function opts(ans, wrongs) {
  const m = new Map(); m.set(ans, null);
  for (const w of wrongs) { if (m.size >= 4) break; if (w && !m.has(w.val)) m.set(w.val, w.tag); }
  if (typeof ans === "number") {
    let d = 1;
    while (m.size < 4) { for (const v of [ans + d, ans - d]) { if (m.size < 4 && !m.has(v)) m.set(v, "calc"); } if (++d > 14) break; }
  }
  return shuffle([...m].map(([val, tag]) => ({ val, tag })));
}

// 問題文だけ math-labo 流（半角）に正規化する。ヒントは全角のまま。
export function nrm(s) {
  return String(s)
    .replace(/＋/g, "+").replace(/−/g, "-")
    .replace(/（/g, "(").replace(/）/g, ")")
    .replace(/\s*([+\-×÷])\s*/g, "$1");
}

// つまづきの正体（診断タグ → ラベルと直し方の一言）
export const MISC = {
  "mean-sum": { label: "平均の計算", coach: "平均 ＝ 合計 ÷ 個数 だよ" },
  "median-sort": { label: "中央値は並べ替え", coach: "小さい順に並べてから、まん中の値だよ" },
  "rep-confuse": { label: "代表値の取り違え", coach: "平均・中央値・最頻値・範囲はちがうもの。何を聞かれているか確認" },
  "calc": { label: "計算ミス", coach: "おしい！もう一度ゆっくり計算してみよう" },
};

const set = (n, lo, hi) => Array.from({ length: n }, () => ri(lo, hi));

// ── 平均値 ──
function genMean() {
  const n = 5, arr = set(n, 2, 10);
  let sum = arr.reduce((a, b) => a + b, 0);
  arr[n - 1] += (n - (sum % n)) % n; // 合計が n で割り切れるように調整
  sum = arr.reduce((a, b) => a + b, 0);
  const ans = sum / n;
  return { q: `${arr.join("、")} の平均値は？`, ans,
    steps: [`まず合計をもとめる：${arr.join("＋")} を計算`, `平均 ＝ 合計 ÷ 個数（÷ ${n}）を計算しよう`],
    distractors: opts(ans, [{ val: sum, tag: "mean-sum" }, { val: Math.max(...arr), tag: "rep-confuse" }]) };
}
// ── 中央値 ──
function genMedian() {
  const n = 5, arr = set(n, 1, 20), sorted = [...arr].sort((a, b) => a - b), ans = sorted[2];
  return { q: `${arr.join("、")} の中央値は？`, ans,
    steps: [`小さい順に並べる：${sorted.join("、")}`, "まん中（3番目）の値が中央値。何番目かを数えよう"],
    distractors: opts(ans, [{ val: arr[2], tag: "median-sort" }, { val: Math.round(arr.reduce((a, b) => a + b, 0) / n), tag: "rep-confuse" }]) };
}
// ── 最頻値 ──
function genMode() {
  const m = ri(2, 9);
  let p = ri(2, 9); while (p === m) p = ri(2, 9);
  let q = ri(2, 9); while (q === m) q = ri(2, 9);
  const arr = shuffle([m, m, m, p, q]);
  return { q: `${arr.join("、")} の最頻値は？`, ans: m,
    steps: ["それぞれの値が何回出てくるか数える", "いちばん多く出てくる値が最頻値だよ"],
    distractors: opts(m, [{ val: Math.max(...arr), tag: "rep-confuse" }, { val: Math.min(...arr), tag: "calc" }]) };
}
// ── 範囲（最大−最小）──
function genRange() {
  const arr = set(6, 1, 30), mx = Math.max(...arr), mn = Math.min(...arr), ans = mx - mn;
  return { q: `${arr.join("、")} の範囲は？`, ans,
    steps: [`範囲 ＝ 最大 − 最小`, `いちばん大きい数から いちばん小さい数を ひこう`],
    distractors: opts(ans, [{ val: mx, tag: "rep-confuse" }, { val: mx + mn, tag: "calc" }]) };
}
// ── 相対度数 ──
function genRel() {
  const total = [10, 20, 25, 50][ri(0, 3)];
  const f = ri(1, total / 2);
  const r2 = (v) => Math.round(v * 100) / 100;
  const ans = r2(f / total);
  return { q: `全体 ${total} 人のうち ${f} 人。相対度数は？`, ans,
    steps: ["相対度数 ＝ その度数 ÷ 合計", `${f} ÷ ${total} を計算しよう`],
    distractors: opts(ans, [{ val: f, tag: "rep-confuse" }, { val: r2(ans + 0.1), tag: "calc" }, { val: r2(ans + 0.05), tag: "calc" }]) };
}

// toketa の haichiUnit（配置単元ID）→ その単元にふさわしい toketa ジェネレータ群。
// CHAPTER_DATA.units の haichiUnit で解決：d1=平均/中央/最頻/範囲、d2=相対度数。
const UNIT_MAP = {
  d1: [genMean, genMedian, genMode, genRange],
  d2: [genRel],
};

/** その単元に toketa ヒント付き問題があるか */
export function has(unitId) {
  return !!UNIT_MAP[unitId];
}

/**
 * math-labo 互換の toketa 問題を1問作る。無ければ null。
 * 返り値: { q(半角), ans, steps[], distractors[{val,tag}], viz?, unitId, toketa:true }
 */
export function gen(unitId) {
  const gens = UNIT_MAP[unitId];
  if (!gens) return null;
  const g = gens[Math.floor(Math.random() * gens.length)];
  const p = g();
  return {
    q: nrm(p.q), ans: p.ans, steps: p.steps, distractors: p.distractors,
    viz: p.viz || null, unitId, toketa: true,
  };
}
