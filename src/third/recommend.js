// ============================================================
// recommend.js — 「今日のおすすめ」を一人ひとりに合わせて選ぶエンジン（純関数・画面や保存に依存しない）。
//  設計: Obsidian 10_Projects/math-labo/設計メモ_math-labo-third_おすすめ個別化_2026-09-30（案A）
//
//  ① 単元ごとの「理解度」を推定する
//     Elo/IRT型：正解の確率 = σ(k(θ − d))。d＝難易度の位置（簡単0.30・普通0.55・難しい0.80・鬼1.00）、k=5。
//     θ（その単元の力）は「直近30問（新しいほど重い）＋それより前（軽く）」から、事前分布＝その子の全体の力（その単元を除く）に寄せて推定。
//     → データが少ない単元は、その子のふだんの力に近い値になる（3問まちがえただけで「にがて」扱いしない）。
//     理解度＝「その単元の『普通』の問題を今解いたら何%正解できそうか」＝σ(k(θ − 0.55))。
//  ② 3枚のおすすめを選ぶ
//     🌱のびしろ（苦手の克服）：理解度・誤答タグ・まちがいノート・先生の小テストから。土台の単元もにがてなら、土台から。
//     🔁ふくしゅう（忘れかけ）：できていた単元で、しばらくやっていないもの（忘却の半減期は解いた量で長くなる）。
//     🚀ちょうせん（得意をのばす：難しい・鬼）／➡️つぎへ（次の単元）。
//     難易度は「期待正答率がねらい（のびしろ0.75・ふくしゅう0.8・ちょうせん0.6）に一番近いもの」。
//  パラメータは REC に集めた（仮置き→実データで調整）。
// ============================================================
import { GRADES, findUnitById, findChapterByUnitId } from "../data/index.js";
import { hasHaichiLessonForUnit } from "../data/haichiCourse.js";
import { MISC as TOKETA_MISC } from "../data/toketa/index.js";
import { unitMedals } from "./medals.js";
import { LEVELS, LEVEL_OF_CODE } from "./learnerProfile.js";
import { prereqsOf } from "./unitPrereqs.js";

export const REC = {
  d: { easy: 0.3, standard: 0.55, advanced: 0.8, oni: 1.0 }, // 難易度の位置（mastery.js の値＋鬼）
  k: 5,
  prior: 0.55, priorSd: 0.3,   // まだ何も解いていない子の「全体の力」
  unitSd: 0.28,                // 単元の力は、全体の力からこのくらい離れうる（データが少ないほど全体の力に寄る）
  recency: 0.95,               // 直近30問の重み（1問さかのぼるごとに ×0.95。30問前は約0.2）
  oldWeight: 0.25,             // 30問より前の記録の重み
  minEvidence: 4,              // これ未満の問題数では「のびしろ」「得意」を決めない（小テスト・まちがいノートは別）
  growBelow: 0.65,             // 理解度がこれ未満＝のびしろ候補
  rootBelow: 0.55,             // 土台の単元がこれ未満なら、土台からやりなおす
  reviewAfterDays: 7,          // これ以上あいたら「ふくしゅう」候補
  reviewMinForget: 0.3,        // 忘れかけ度（1−記憶の残り）がこれ以上
  strongAbove: 0.8,            // これ以上＝得意（ちょうせん候補）
  strongLearner: 0.8,          // 全体の理解度がこれ以上の子は「つぎへ」より「ちょうせん」を先に
  target: { grow: 0.75, review: 0.8, challenge: 0.6, next: 0.75 },
  relearnAt: 3,                // まちがいノートにこの数以上あれば「なおす」
};

export const LEVEL_NAME = { easy: "簡単", standard: "普通", advanced: "難しい", oni: "鬼" };
export const BANDS = [
  { key: "grow", min: 0, label: "のびしろ", color: "#fb923c" },
  { key: "almost", min: 0.45, label: "もう少し", color: "#fbbf24" },
  { key: "ok", min: 0.65, label: "できた", color: "#4ade80" },
  { key: "great", min: 0.85, label: "とくい", color: "#60a5fa" },
];
export const SLOT = {
  grow: { icon: "🌱", title: "のびしろ", sub: "ここを直すと一気にラクになる" },
  review: { icon: "🔁", title: "ふくしゅう", sub: "わすれないうちに" },
  challenge: { icon: "🚀", title: "ちょうせん", sub: "得意をもっとのばそう" },
  next: { icon: "➡️", title: "つぎへ", sub: "新しい単元に進もう" },
};

const sig = (x) => 1 / (1 + Math.exp(-x));
export const expected = (theta, level) => sig(REC.k * (theta - REC.d[level]));
export const understandingOf = (theta) => expected(theta, "standard");
export const bandOf = (u) => [...BANDS].reverse().find((b) => u >= b.min) || BANDS[0];
const DAY = 86400000;
const JST = (t) => new Date(new Date(t).getTime() + 9 * 3600 * 1000).toISOString().slice(0, 10);
const daysBetween = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / DAY);
const tagLabel = (tag) => TOKETA_MISC?.[tag]?.label || tag;

// ---- ① 観測を「難易度ごとの重みつき回数」にまとめる（重みW・重みつき正解S）。尤度はこの4組だけで決まる
const blank = () => ({ easy: [0, 0], standard: [0, 0], advanced: [0, 0], oni: [0, 0] });
function levelStats(stat) {
  const L = blank();
  if (!stat) return L;
  const seq = String(stat.seq || "");
  const inSeq = blank();
  let w = 1;
  for (let i = seq.length - 1; i >= 0; i--, w *= REC.recency) { // 新しい問題ほど重い
    const ch = seq[i];
    const lv = LEVEL_OF_CODE[ch.toLowerCase()];
    if (!lv) continue;
    const ok = ch !== ch.toLowerCase();
    L[lv][0] += w; if (ok) L[lv][1] += w;
    inSeq[lv][0] += 1; if (ok) inSeq[lv][1] += 1;
  }
  for (const lv of LEVELS) { // 直近30問より前の記録は、軽い重みで
    const [t, c] = stat.lv?.[lv] || [0, 0];
    const tOld = Math.max(0, t - inSeq[lv][0]);
    const cOld = Math.max(0, Math.min(tOld, c - inSeq[lv][1]));
    L[lv][0] += REC.oldWeight * tOld; L[lv][1] += REC.oldWeight * cOld;
  }
  return L;
}
const evidenceOf = (L) => LEVELS.reduce((a, lv) => a + L[lv][0], 0);
const scaled = (L, k) => Object.fromEntries(LEVELS.map((lv) => [lv, [L[lv][0] * k, L[lv][1] * k]]));
const addStats = (A, B, sign = 1) => Object.fromEntries(LEVELS.map((lv) => [lv, [Math.max(0, A[lv][0] + sign * B[lv][0]), Math.max(0, A[lv][1] + sign * B[lv][1])]]));
// 事後確率が最大になる θ（ロジスティック×正規分布は山が1つなので、三分探索でよい）
function mapTheta(L, mu, sd) {
  const f = (th) => {
    let ll = -((th - mu) ** 2) / (2 * sd * sd);
    for (const lv of LEVELS) {
      const [W, S] = L[lv];
      if (!W) continue;
      const e = Math.min(1 - 1e-6, Math.max(1e-6, expected(th, lv)));
      ll += S * Math.log(e) + (W - S) * Math.log(1 - e);
    }
    return ll;
  };
  let lo = -0.6, hi = 1.8;
  for (let i = 0; i < 50; i++) {
    const m1 = lo + (hi - lo) / 3, m2 = hi - (hi - lo) / 3;
    if (f(m1) < f(m2)) lo = m1; else hi = m2;
  }
  return (lo + hi) / 2;
}

/** 難易度を選ぶ：期待正答率が target に一番近いもの（同じなら易しい方） */
export function pickLevel(theta, target = 0.75, allowed = LEVELS) {
  let best = allowed[0], bestD = Infinity;
  for (const lv of allowed) {
    const d = Math.abs(expected(theta, lv) - target);
    if (d < bestD - 1e-9) { bestD = d; best = lv; }
  }
  return best;
}

// ---- 単元の一覧（学年順＝カリキュラム順）
const ORDER = [];
for (const g of [1, 2, 3]) for (const ch of GRADES[g] || []) for (const u of ch.units || []) ORDER.push({ grade: g, chapter: ch, unit: u });
const ORDER_INDEX = Object.fromEntries(ORDER.map((x, i) => [x.unit.id, i]));

/**
 * 生徒の状態を分析する（おすすめ・理解度マップ・先生の画面で共通）。
 * @param {object} p
 *  units   … learnerProfile の集計 { unitId: { lv, seq, last, n } }
 *  tags    … 単元ごとの誤答タグ { unitId: { tag: 回数 } }
 *  mistakes… まちがいノート（端末）[{ unitId, mistakeTag }]
 *  medalState … サーバーのゲーム状態（メダル）／ medals … 管理画面から渡すときの state.medals
 *  quizWeakUnits … 先生の小テストで見つかった苦手 [{ unitId }]
 *  grade … いま表示している学年 / now … 時刻（テスト用）
 */
export function analyzeLearner({ units = {}, tags = {}, mistakes = [], medalState = null, quizWeakUnits = [], grade = 1, now = Date.now() } = {}) {
  const today = JST(now);
  // 全体の力：全単元の観測を合わせて推定（1つの単元が多すぎても引っぱられすぎないよう、単元ごとに重みの上限をかける）
  const per = {};
  let G = blank();
  for (const [id, st] of Object.entries(units)) {
    const L = levelStats(st);
    const e = evidenceOf(L);
    const capped = e > 12 ? scaled(L, 12 / e) : L;
    per[id] = { L, capped, e };
    G = addStats(G, capped);
  }
  const globalTheta = evidenceOf(G) > 0 ? mapTheta(G, REC.prior, REC.priorSd) : REC.prior;
  const open = {};
  for (const m of mistakes || []) if (m?.unitId) open[m.unitId] = (open[m.unitId] || 0) + 1;
  const quiz = new Set((quizWeakUnits || []).map((w) => w.unitId));

  const insights = {};
  for (const { grade: g, chapter, unit } of ORDER) {
    const st = units[unit.id];
    const pu = per[unit.id];
    const ev = pu ? pu.e : 0;
    // その単元の事前分布＝「その単元を除いた」全体の力（同じ解答を二重に数えない）
    const G0 = pu ? addStats(G, pu.capped, -1) : G;
    const prior = pu ? (evidenceOf(G0) > 0 ? mapTheta(G0, REC.prior, REC.priorSd) : REC.prior) : globalTheta;
    const theta = pu && ev > 0 ? mapTheta(pu.L, prior, REC.unitSd) : prior;
    const u = understandingOf(theta);
    const tagList = Object.entries(tags[unit.id] || {}).map(([tag, n]) => ({ tag, n, label: tagLabel(tag) })).sort((a, b) => b.n - a.n);
    const acc = {};
    for (const lv of LEVELS) if (st?.lv?.[lv]?.[0]) acc[lv] = st.lv[lv];
    const correctAll = LEVELS.reduce((a, lv) => a + (st?.lv?.[lv]?.[1] || 0), 0);
    const days = st?.last ? Math.max(0, daysBetween(st.last, today)) : null;
    const halfLife = 4 + 1.5 * Math.min(30, correctAll); // 解いた量が多いほど忘れにくい（4〜49日）
    const retention = days == null ? 1 : Math.pow(2, -days / halfLife);
    insights[unit.id] = {
      unitId: unit.id, unit, chapter, grade: g,
      n: st?.n || 0, evidence: ev, theta, understanding: u,
      band: (st?.n || 0) === 0 ? null : bandOf(u), provisional: ev < REC.minEvidence,
      acc, last: st?.last || null, days, retention, forget: 1 - retention,
      openMistakes: open[unit.id] || 0, tags: tagList, quizWeak: quiz.has(unit.id),
      medals: unitMedals(medalState, unit.id), hasVideo: hasHaichiLessonForUnit(unit.id),
    };
  }
  return { insights, globalTheta, globalUnderstanding: understandingOf(globalTheta), grade, today };
}

// ---- ② おすすめのカード
function evidenceText(x) {
  const parts = [];
  for (const lv of LEVELS) if (x.acc[lv]) parts.push(`${LEVEL_NAME[lv]} ${x.acc[lv][1]}/${x.acc[lv][0]}`);
  return parts.join("・");
}
function actionFor(x, slot) {
  const theta = x.theta;
  if (slot === "grow") {
    if (x.openMistakes >= REC.relearnAt && x.understanding >= 0.45) return { action: "relearn" };
    if (!x.medals.haichi && x.understanding < 0.45) return { action: "haichi" };
    return { action: "practice", level: pickLevel(theta, REC.target.grow, ["easy", "standard", "advanced"]) };
  }
  if (slot === "review") return { action: "practice", level: pickLevel(theta - 0.1 * x.forget, REC.target.review, ["easy", "standard", "advanced"]) };
  if (slot === "challenge") return { action: "practice", level: masteredAt(x, "advanced") ? "oni" : "advanced" }; // できている段の1つ上
  // next
  if (!x.medals.haichi) return { action: "haichi" };
  return { action: "practice", level: pickLevel(theta, REC.target.next, ["easy", "standard", "advanced"]) };
}
// その難易度を「できた」と言える（5問以上・7割以上）
const masteredAt = (x, lv) => { const a = x.acc[lv]; return !!a && a[0] >= 5 && a[1] / a[0] >= 0.7; };
function card(slot, x, extra = {}) {
  const a = actionFor(x, slot);
  return {
    slot, ...SLOT[slot], unitId: x.unitId, unit: x.unit, chapter: x.chapter, grade: x.grade,
    ...a, understanding: x.understanding, band: x.band, evidence: evidenceText(x), provisional: x.provisional, ...extra,
  };
}
function actionText(c) {
  if (c.action === "haichi") return c.hasVideo === false ? "確認問題で学ぼう" : "動画で学んでから確認問題";
  if (c.action === "relearn") return "まちがいノートの問題をなおそう";
  return `${LEVEL_NAME[c.level]}を5問`;
}

/** 土台をたどる：その単元の土台（2段まで）で、にがてな単元があれば一番上流のもの */
function findRoot(A, unitId) {
  const seen = new Set([unitId]);
  let best = null;
  const walk = (id, depth) => {
    if (depth > 2) return;
    for (const p of prereqsOf(id)) {
      if (seen.has(p)) continue;
      seen.add(p);
      const x = A.insights[p];
      if (!x) continue;
      if (!x.provisional && x.understanding < REC.rootBelow && (!best || depth > best.depth || (depth === best.depth && x.understanding < best.x.understanding))) best = { x, depth };
      walk(p, depth + 1);
    }
  };
  walk(unitId, 1);
  return best?.x || null;
}

/** a が b の土台（2段まで）か */
function isFoundationOf(a, b) {
  const one = prereqsOf(b);
  return one.includes(a) || one.some((p) => prereqsOf(p).includes(a));
}

/**
 * 今日のおすすめ（最大3枚）。A＝analyzeLearner の結果。
 * 返り値の各カード：{ slot, icon, title, unitId, unit, chapter, action:"practice"|"relearn"|"haichi", level?, reason, evidence, understanding, band, root? }
 */
export function recommendToday(A, { max = 3 } = {}) {
  const X = Object.values(A.insights);
  const inGrade = X.filter((x) => x.grade === A.grade);
  const used = new Set();
  const cards = [];

  // 🌱 のびしろ
  const growPool = inGrade.filter((x) => (!x.provisional && x.understanding < REC.growBelow) || x.quizWeak || x.openMistakes >= 2);
  const growScore = (x) => {
    const evid = Math.min(1, x.evidence / 6);
    let s = Math.max(0, 0.75 - x.understanding) * 100 * evid;
    s += Math.min(20, x.openMistakes * 4);
    if ((x.tags[0]?.n || 0) >= 2) s += 10;
    if (x.quizWeak) s += 35;
    if (x.days != null && x.days <= 14) s += 5; // いま学んでいるところを優先
    return s;
  };
  const grow = growPool.sort((a, b) => growScore(b) - growScore(a))[0];
  if (grow) {
    const upstream = findRoot(A, grow.unitId); // 土台もにがて → 土台から
    const target = upstream || grow;
    // 逆に、選んだ単元が「ほかのにがてな単元の土台」なら、そのことも伝える
    const dependent = upstream ? grow : growPool.find((x) => x.unitId !== grow.unitId && isFoundationOf(grow.unitId, x.unitId));
    const reasons = [];
    if (upstream) reasons.push(`「${grow.unit.name}」でつまずくのは、土台の「${upstream.unit.name}」が原因かも。まずはここから`);
    else {
      if (dependent) reasons.push(`「${dependent.unit.name}」の土台になる単元`);
      if (grow.quizWeak) reasons.push("授業の小テストでつまずいた単元");
      if ((grow.tags[0]?.n || 0) >= 2) reasons.push(`「${grow.tags[0].label}」のまちがいが${grow.tags[0].n}回`);
      if (grow.openMistakes >= 2) reasons.push(`まちがいノートに${grow.openMistakes}問`);
      if (!grow.provisional) reasons.push(`いまの理解度 ${Math.round(grow.understanding * 100)}%`);
    }
    const c = card("grow", target, { root: dependent ? { unitId: dependent.unitId, name: dependent.unit.name } : null });
    c.hasVideo = target.hasVideo;
    c.reason = `${reasons.join("／")}。`;
    cards.push(c);
    used.add(target.unitId);
  }

  // ➡️ つぎへ／🚀 ちょうせん の候補（つぎへ＝最近学んだ単元のあとで、まだ練習していない最初の単元）
  const recentStudied = inGrade.filter((x) => x.last).sort((a, b) => String(b.last).localeCompare(String(a.last)) || ORDER_INDEX[b.unitId] - ORDER_INDEX[a.unitId])[0];
  const startAt = recentStudied ? inGrade.indexOf(recentStudied) : 0;
  const notDone = (x) => !x.medals.practice && x.evidence < 5 && !used.has(x.unitId);
  const nextUnit = inGrade.slice(startAt).find(notDone) || inGrade.find(notDone) || null;
  // ちょうせん：得意な単元のうち、鬼まではできていないもの（最近学んだ単元を優先）
  const chScore = (x) => x.understanding + (x.days != null && x.days <= 14 ? 0.1 : 0);
  const challengeUnit = inGrade
    .filter((x) => !used.has(x.unitId) && !x.provisional && x.understanding >= REC.strongAbove && !masteredAt(x, "oni"))
    .sort((a, b) => chScore(b) - chScore(a))[0] || null;
  const strongLearner = A.globalUnderstanding >= REC.strongLearner;

  const pushNext = () => {
    if (!nextUnit || used.has(nextUnit.unitId)) return;
    const c = card("next", nextUnit);
    c.hasVideo = nextUnit.hasVideo;
    c.reason = nextUnit.medals.haichi ? "動画の確認問題は合格ずみ。練習して身につけよう" : nextUnit.hasVideo ? "まだ学んでいない単元。動画を見て、確認問題（5問）に合格しよう" : "まだ学んでいない単元。確認問題（5問）で学ぼう";
    cards.push(c); used.add(nextUnit.unitId);
  };
  const pushChallenge = () => {
    if (!challengeUnit || used.has(challengeUnit.unitId)) return;
    const c = card("challenge", challengeUnit);
    const a = challengeUnit.acc[c.level];
    const done = LEVELS.filter((lv) => challengeUnit.acc[lv]).map((lv) => `${LEVEL_NAME[lv]} ${challengeUnit.acc[lv][1]}/${challengeUnit.acc[lv][0]}`).join("・");
    c.reason = `${done ? `${done} と よくできている。` : ""}${a ? "" : "まだ解いたことのない"}「${LEVEL_NAME[c.level]}」に挑戦しよう`;
    cards.push(c); used.add(challengeUnit.unitId);
  };

  // 🔁 ふくしゅう（忘れかけ）
  const reviewPool = X.filter((x) => x.grade <= A.grade && !used.has(x.unitId) && x.n >= 5 && !x.provisional && x.understanding >= 0.5
    && x.days != null && x.days >= REC.reviewAfterDays && x.forget >= REC.reviewMinForget);
  const reviewScore = (x) => x.forget * 100 + (x.grade === A.grade ? 10 : 0) + (x.understanding < 0.75 ? 8 : 0);
  const review = reviewPool.sort((a, b) => reviewScore(b) - reviewScore(a))[0] || null;
  const pushReview = () => {
    if (review && !used.has(review.unitId)) {
      const c = card("review", review);
      c.reason = `最後に解いてから${review.days}日。${review.grade < A.grade ? `中${review.grade}の単元。` : ""}わすれかける前に、もう一度`;
      cards.push(c); used.add(review.unitId);
      return;
    }
    // 忘れかけが無いとき：れんしゅうメダルまであと少しの単元
    const near = inGrade.filter((x) => !used.has(x.unitId) && !x.medals.practice && x.medals.practiceN > 0).sort((a, b) => b.medals.practiceN - a.medals.practiceN)[0];
    if (near) {
      const c = card("review", near);
      c.title = "もう少しでメダル"; c.icon = "🏅"; c.sub = "あと少し！";
      c.reason = `あと${5 - near.medals.practiceN}問せいかいで れんしゅうメダル`;
      cards.push(c); used.add(near.unitId);
    }
  };

  if (cards.length) { // のびしろがある子：つぎへ（得意な子はちょうせん）→ ふくしゅう
    if (strongLearner && challengeUnit) pushChallenge(); else pushNext();
    pushReview();
    if (cards.length < max) (strongLearner ? pushNext : pushChallenge)();
  } else { // のびしろが無い子：つぎへ → ちょうせん → ふくしゅう
    pushNext();
    pushChallenge();
    pushReview();
  }
  return cards.slice(0, max);
}

/** 理解度マップ用：学年の単元を章ごとに並べる */
export function gradeMap(A, grade = A.grade) {
  return (GRADES[grade] || []).map((ch) => ({ chapter: ch, units: (ch.units || []).map((u) => A.insights[u.id]).filter(Boolean) }));
}

/** その単元1つのおすすめ（理解度マップから始めるとき） */
export function unitSuggestion(A, unitId) {
  const x = A.insights[unitId];
  if (!x) return null;
  const slot = x.n === 0 ? "next" : x.understanding >= REC.strongAbove && !x.provisional ? "challenge" : x.understanding < REC.growBelow ? "grow" : "review";
  const c = card(slot, x);
  c.hasVideo = x.hasVideo;
  c.reason = actionText(c);
  return c;
}

/** 単元の学年（1〜3。見つからなければ null） */
export const gradeOfUnit = (unitId) => ORDER[ORDER_INDEX[unitId]]?.grade ?? null;

/** 管理画面（admin_stats）の単元ごとの記録を、analyzeLearner が読む形にする（古いサーバーの {t,c} だけでも動く） */
export function unitsFromAdmin(units = {}) {
  const out = {};
  for (const [id, u] of Object.entries(units || {})) {
    out[id] = u?.lv ? { lv: u.lv, seq: u.seq || "", last: u.last || null, n: u.n ?? u.t ?? 0 } : { lv: { standard: [u?.t || 0, u?.c || 0] }, seq: "", last: null, n: u?.t || 0 };
  }
  return out;
}
/** いま学んでいる学年の推定：最後に解いた単元の学年（無ければ一番多く解いた学年、それも無ければ1） */
export function guessGrade(units = {}) {
  let best = null;
  for (const [id, u] of Object.entries(units || {})) {
    const g = gradeOfUnit(id);
    if (!g) continue;
    const key = `${u?.last || ""}|${String(u?.n ?? u?.t ?? 0).padStart(6, "0")}`;
    if (!best || key > best.key) best = { g, key };
  }
  return best?.g || 1;
}

export { findUnitById, findChapterByUnitId };
