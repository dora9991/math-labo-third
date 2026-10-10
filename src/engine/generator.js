// ============================================================
// generator.js — 問題生成エンジン
// 「単元(unit) と 難易度(level)」を渡すと、1問ぶんの問題オブジェクトを返す。
//
// データ側の各問題は { id, build(rng), skill? } の形をしている（data/ を参照）。
//  - id    : 問題テンプレートの識別子
//  - build : 乱数関数を受け取り {q, ans, h1, h2, skip?} を返す関数
//  - skill : このテンプレが主に練習するスキルID（data/skills.js を指す）
//
// この層がデータの形に依存する唯一の場所。データの並べ方を変えても
// 画面側は「genProblem / buildTemplate を呼ぶだけ」で済むようにしている。
// ============================================================
import { rng, pick } from "./rng.js";
import { randomSeed } from "./seed.js";
import { buildSeeded } from "./grade.js";
import { dbTemplatesFor } from "../data/dbProblems.js";
import { SIGN_MIXED } from "./signMixed.js";

// DB実問題を出す割合（手続き生成より優先。手続きは変化球として残す）
const DB_PREFER = 0.65;

/**
 * skip フラグを考慮して1つのテンプレを最大10回まで作り直して生成する。
 * @returns {object|null} { q, ans, h1, h2, id, unitId, skill, level }
 */
function makeFromTemplate(template, unit, level) {
  if (!template) return null;
  for (let i = 0; i < 10; i++) {
    const made = template.build(rng);
    if (made && !made.skip) {
      return { ...made, id: template.id, unitId: unit.id, skill: template.skill || null, level };
    }
  }
  return null;
}

// ── Step2：seed から決定的に1問を作る（サーバが再現・採点するための土台）──
//  makeFromTemplate と同じ skip ループを、seed 由来の r で回すので q/ans が完全に再現される。
//  ★純粋（Math.random を使わない）★ ので Deno の Edge Function からも同じ結果で呼べる。

/** テンプレIDと seed から1問を決定的に作る（採点と同じ grade.buildSeeded を使う＝ズレない） */
export function buildFromSeed(unit, level, templateId, seed) {
  return buildSeeded(unit, level, templateId, seed);
}

/** ランダム seed で1問を作り、seed も一緒に返す（クライアントが「あとで再現できる問題」を出す用）。
 *  DB由来（固定 q/ans）のテンプレは seed 不要なので seed=null で返す。手続き生成のみ seed を持つ。 */
export function genProblemSeeded(unit, level, lastId = null) {
  const proc = unit?.problems?.[level] || [];
  if (proc.length === 0) {
    const p = genProblem(unit, level, lastId); // DB専用単元など：従来どおり（再現不要）
    return p ? { ...p, seed: null } : null;
  }
  const recent = Array.isArray(lastId) ? lastId : lastId == null ? [] : [lastId];
  const usable = proc.filter((t) => !recent.includes(t.id));
  const from = usable.length ? usable : proc;
  // seed を引いて作る。まれに skip 続きで null になるテンプレがあるので、数回だけ引き直す。
  for (let tries = 0; tries < 8; tries++) {
    const t = pick(from);
    const seed = randomSeed();
    const p = buildFromSeed(unit, level, t.id, seed);
    if (p) return p; // p.seed から server が同じ q/ans を再現できる
  }
  const p = genProblem(unit, level, lastId); // 最後の保険（seed なし）
  return p ? { ...p, seed: null } : null;
}

/**
 * 1問を生成する（ランダムなテンプレを選ぶ。タイムアタック・じっくり用）。
 * @param {object} unit  - 単元オブジェクト（problems[level] を持つ）
 * @param {string} level - "easy" | "standard" | "advanced"
 * @param {string|null} lastId - 直前に出した問題ID（連続で同じを避ける）
 * @returns {object|null} { id, unitId, q, ans, h1, h2, skill, level }
 */
export function genProblem(unit, level, lastId = null) {
  const proc = unit?.problems?.[level] || [];
  const db = dbTemplatesFor(unit?.id, level); // DB由来の実問題（c1〜c4のみ）
  if (proc.length === 0 && db.length === 0) return null;

  // DBプールが小さいと同じ問題ばかりになるので、プール数に応じて出題率を下げる
  //  （例：DBが1問しかない単元は約18%だけDB、残りは手続き生成で変化を出す）
  const prefer = Math.min(DB_PREFER, db.length * 0.18);
  const useDb = db.length > 0 && (proc.length === 0 || Math.random() < prefer);
  const pool = useDb ? db : proc;

  // 直近に出した id は除外（同じ問題の連続・かたよりを避ける）。
  //  lastId は文字列（直前1問）でも配列（直近数問の履歴）でもよい。
  const recent = Array.isArray(lastId) ? lastId : lastId == null ? [] : [lastId];
  const usable = pool.filter((t) => !recent.includes(t.id));
  const chosen = pick(usable.length ? usable : pool);
  return makeFromTemplate(chosen, unit, level);
}

/**
 * テンプレIDを指定して1問を生成する（アダプティブ出題＝selector の結果から作る用）。
 * @param {object} unit       - 単元オブジェクト
 * @param {string} level      - 難易度
 * @param {string} templateId - data 側のテンプレID（例 "u2e3"）
 * @returns {object|null}
 */
export function buildTemplate(unit, level, templateId) {
  const templates = unit?.problems?.[level] || [];
  const t = templates.find((x) => x.id === templateId);
  return makeFromTemplate(t, unit, level);
}

/**
 * 「暗算が非常に厳しい」問題か（√・小数・分数が絡む）。
 *  true の問題はタイムアタックから外し、計算王への道（単元別じっくり）で扱う。
 *   ・√ が出る（答え/問題）          … 2次方程式・平方根・三平方 など
 *   ・小数（\d.\d）が出る            … 小数計算・小数係数
 *   ・答えが分数（/ を含む）          … 分数の答え
 *   ・問題に分数係数（/数）           … 例 x/3+y/2=1。反比例 y=a/x（/英字）は対象外
 */
export function isHardProblem(p) {
  if (!p) return false;
  const q = String(p.q || "");
  const a = String(p.ans ?? "");
  if (/√/.test(q + a)) return true;       // √が絡む（平方根・2次・三平方 など）
  if (/\d\.\d/.test(q + a)) return true;  // 小数が出る（小数計算・小数係数）
  if (/\/\s*\d/.test(q)) return true;     // 問題に分数係数（例 x/3+y/2、(2/3)ab）。反比例 y=a/x は対象外
  return false;
}

// ============================================================
// 4択の誤答の作り方（2026-10-10 作り直し）
//
//  きっかけ：生徒が「答えが17なら必ず-17もあり、符号が反対のものが1つだけ。その反対側を選べば答えになる」
//  という法則を見つけた。以前は「答えの符号を反転した値(-答え)を必ず1つ＋答えの近くの値」で作っていたため、
//  この法則で約97%当たり、答えが「小さい順の2・3番目」に偏るなど、解かずに当てられる手がかりが多かった。
//  今は、選択肢の並びから答えが推測できないように、次のようにする（検査: npm run test:choice-leak）。
//
//   ・same（既定）  4つとも答えと同じ符号にする。大きさは答えの近くから選び、答えが「小さい順の何番目」に
//                   なるかを同じ確率にする。符号が1つだけ違う値、符号を反転した相棒、が生まれない。
//   ・mirror        符号の判断が問題の肝（答えが負になる割合が30〜70%）のテンプレ用。{答え, -答え, y, -y}
//                   のように、反対の符号どうしを必ず「対」にして出す。符号の間違いは選べるが、
//                   符号も「相棒がいるか」も、答えを選ぶ手がかりにならない。
//   モードはテンプレごとに src/engine/signMixed.js（scripts/gen-sign-mixed.mjs が作る）で決まる。
// ============================================================

/** テンプレIDから4択の作り方（same / mirror）を決める（符号が問題の肝のテンプレだけ mirror） */
export const choiceMode = (templateId) => (SIGN_MIXED.has(templateId) ? "mirror" : "same");

/** 答え a の近くの誤答候補を k 個返す（互いに別・答えと別・taken と別）。
 *  ・隣どうしの間隔を同じ分布から作った「k+1 個の列」を作り、答えをその列の「ランダムな位置」に置く。
 *    → 答えが「いちばん小さい／大きい」「まん中」「平均に近い」のどれかに偏らない
 *      （以前は答えの近くに誤答を寄せていたので、答えがまん中に来やすかった）。
 *  ・答えが小さいときは間隔も小さくして、0 より下に列を作れない分の偏りを防ぐ。
 *  ・既定は「大きさ（絶対値）」を返す（0以上）。allowNeg なら符号つきの値をそのまま返す（答えが 0 のとき）。 */
function nearMagnitudes(a, k, taken = [], allowNeg = false) {
  const isInt = Number.isInteger(a);
  const round = (x) => (isInt ? Math.round(x) : Math.round(x * 10) / 10);
  const base = allowNeg ? a : Math.abs(a);
  const m0 = Math.abs(a);
  const steps = isInt ? [1, 2, 3, 4, 5, 6, 7, 8, 10] : [0.1, 0.2, 0.3, 0.5, 1, 1.5, 2];
  if (isInt && m0 >= 20) for (const r of [0.1, 0.15, 0.2]) steps.push(Math.max(1, Math.round(m0 * r)));
  const limit = Math.max(m0 / k, steps[0]);
  const pool = steps.filter((g) => g <= limit + 1e-9);
  const gaps = pool.length ? pool : [steps[0]];
  for (let tries = 0; tries < 60; tries++) {
    const g = Array.from({ length: k }, () => gaps[Math.floor(Math.random() * gaps.length)]);
    const pos = [0]; for (const x of g) pos.push(pos[pos.length - 1] + x); // 列の各位置（0, g1, g1+g2, …）
    const feasible = [];
    for (let r = 0; r <= k; r++) if (allowNeg || base + pos[0] - pos[r] >= -1e-9) feasible.push(r); // 0 より下にならない位置
    const r = feasible[Math.floor(Math.random() * feasible.length)];
    const out = [];
    for (let i = 0; i <= k; i++) if (i !== r) out.push(round(base + pos[i] - pos[r]));
    if (out.some((v) => v === base || taken.includes(v)) || new Set(out).size !== out.length) continue;
    return out;
  }
  const out = []; // 保険：答えより大きい値で埋める
  for (let fb = 1; out.length < k; fb++) { const c = round(base + fb); if (!taken.includes(c)) out.push(c); }
  return out;
}

const fisherYates = (arr) => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

/**
 * 4択の選択肢を作る。正解＋それらしいダミー3つ（数値の答え用）。
 * @param {number} ans 正解の値
 * @param {{mode?: "same"|"mirror"}} [opts] mode … 上の説明を参照（既定 same）
 * @returns {number[]} シャッフル済みの4択
 */
export function makeChoices(ans, opts = {}) {
  const a = Number(ans);
  if (!Number.isFinite(a)) return [ans]; // 数値でない答え（記述など）は4択にしない
  const sign = a < 0 ? -1 : 1;
  const mags = (k, taken = []) => nearMagnitudes(a, k, taken);
  let vals;
  if (opts.mode === "mirror" && a !== 0) {
    const [y] = mags(1, [0]);                       // 0 だと -0 と重なるので使わない
    vals = [a, -a, y, -y];                          // 反対の符号どうしが対（x と -x、y と -y）
  } else if (a === 0) {
    vals = [0, ...nearMagnitudes(0, 3, [], true)];  // 0 には符号が無い（正負の両方に並べる）
  } else {
    vals = [a, ...mags(3).map((m) => sign * m)];   // 4つとも答えと同じ符号
    // 答えが小さいときは誤答に 0 も出す（答えが 0 の問題もあるので、「0 があれば答え」にならないように）
    if (Math.abs(a) <= 6 && !vals.includes(0) && Math.random() < 0.11) vals[1 + Math.floor(Math.random() * 3)] = 0;
  }
  return fisherYates(vals.map((v) => (v === 0 ? 0 : v)));
}

/**
 * 問題のテンプレートが自分で作った数値の4択（文字列）から、「符号が1つだけ違う」「符号を反転した相棒が1組だけいる」
 * という、答えを推測できる並びを取りのぞく。そうでなければそのまま返す。答えの文字列は変えない。
 * 手書きの誤答（理由つきヒント＝とけた式）には使わない。
 * @param {string[]} choices 4択（文字列）
 * @param {string|number} ans 正解
 * @param {"same"|"mirror"} [mode]
 * @returns {string[]}
 */
export function deLeakChoices(choices, ans, mode = "same") {
  const num = (s) => { const t = String(s).replace(/\s/g, "").replace(/−/g, "-"); return /^-?\d+(\.\d+)?$/.test(t) ? Number(t) : null; };
  if (!Array.isArray(choices) || choices.length !== 4) return choices;
  const vals = choices.map(num);
  if (vals.some((v) => v === null) || new Set(vals).size !== 4) return choices;
  const a = num(ans);
  const ai = choices.findIndex((c) => String(c).replace(/\s/g, "") === String(ans).replace(/\s/g, ""));
  if (a === null || ai < 0 || a === 0) return choices;
  const hasUnicodeMinus = choices.some((c) => String(c).includes("−"));
  const fmt = (v) => (v < 0 ? (hasUnicodeMinus ? "−" : "-") + Math.abs(v) : String(v));
  // 「答えの近くの数を並べただけ」の4択（意味のある誤答が無い）は、自動生成と同じ作り方に置きかえる
  //  （手書きだと、答えがまん中の2つに偏りやすい）。意味のある誤答（和と積を取りちがえた値など）は残す。
  const band = Math.max(5, 0.25 * Math.abs(a));
  if (vals.every((v, i) => i === ai || Math.abs(v - a) <= band)) {
    const made = makeChoices(a, { mode }).map((v) => (v === a ? choices[ai] : fmt(v)));
    return made.length === 4 ? made : choices;
  }
  const pos = vals.filter((v) => v > 0).length, neg = vals.filter((v) => v < 0).length;
  const pairs = vals.filter((v, i) => v !== 0 && vals.indexOf(-v) > i).length; // 反転して同じ値になる組の数
  const lone = (pos === 1 && neg === 3) || (neg === 1 && pos === 3);
  if (!lone && pairs !== 1) return choices; // 手がかりになる並びではない → そのまま
  const sign = a < 0 ? -1 : 1;
  let out;
  if (mode === "mirror") {
    // {答え, -答え, y, -y}：y は、答え以外でいちばん答えに近い大きさの誤答（無ければ新しく作る）
    const cands = vals.map((v, i) => ({ m: Math.abs(v), i })).filter((x) => x.i !== ai && x.m !== Math.abs(a) && x.m !== 0);
    cands.sort((p, q) => Math.abs(p.m - Math.abs(a)) - Math.abs(q.m - Math.abs(a)));
    const y = cands.length ? cands[0].m : nearMagnitudes(a, 1, [0])[0];
    out = [choices[ai], fmt(-a), fmt(sign * y), fmt(-sign * y)];
  } else {
    // 答えと反対の符号の誤答は、符号を直した値にする（すでにあれば、近い値を新しく作る）
    const used = new Set(vals);
    out = choices.map((c, i) => {
      if (i === ai || vals[i] === 0 || Math.sign(vals[i]) === sign) return c;
      used.delete(vals[i]);
      let nv = -vals[i];
      if (used.has(nv)) nv = sign * nearMagnitudes(a, 1, [...used].map(Math.abs))[0];
      used.add(nv);
      return fmt(nv);
    });
  }
  return fisherYates(out);
}
