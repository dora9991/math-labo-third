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

/**
 * 4択の選択肢を作る（タイムアタック用）。正解＋それらしいダミー3つ。
 * @param {number} ans 正解の値
 * @returns {number[]} シャッフル済みの4択
 */
export function makeChoices(ans) {
  const a = Number(ans);
  if (!Number.isFinite(a)) return [ans]; // 数値でない答え（記述など）は4択にしない
  const isInt = Number.isInteger(a);
  const round = (x) => (isInt ? Math.round(x) : Math.round(x * 10) / 10);
  const choices = new Set([a]);

  // ① よくある誤答を“1つだけ”ダミーに入れる（あてずっぽうで当たりにくいよう、似すぎる罠は1つに絞る）
  //    符号ミス(-a) … 正負の数で多い間違い／ 絶対値(|a|) … 負の答えのとき
  const traps = [];
  if (a !== 0 && -a !== a) traps.push(round(-a));
  if (a < 0) traps.push(round(Math.abs(a)));
  for (const t of traps) {
    if (choices.size >= 2) break;
    if (Number.isFinite(t) && !choices.has(t)) choices.add(t);
  }

  // ② 残りは「正解の近く」のもっともらしい値で埋める。
  //    ズレ幅を答えの大きさに比例させ、不自然に離れた選択肢を出さない。
  const mag = Math.max(1, Math.abs(a));
  const baseDeltas = isInt
    ? [1, 2, 3, 4, 5, -1, -2, -3]
    : [0.1, 0.2, 0.5, 1, -0.1, -0.2, -0.5];
  // 答えが大きい整数のときは ±10〜20% のズレも候補に混ぜる
  const scaled = isInt && mag >= 20
    ? [Math.round(mag * 0.1), -Math.round(mag * 0.1), Math.round(mag * 0.2)].filter((d) => d !== 0)
    : [];
  const deltas = [...baseDeltas, ...scaled];

  let guard = 0;
  while (choices.size < 4 && guard < 300) {
    guard++;
    const cand = round(a + pick(deltas));
    if (Number.isFinite(cand)) choices.add(cand);
  }
  // それでも足りない場合の保険
  let fb = 1;
  while (choices.size < 4) choices.add(round(a + fb++));

  return [...choices].sort(() => Math.random() - 0.5);
}
