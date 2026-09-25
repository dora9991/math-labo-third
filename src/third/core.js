// ============================================================
// core.js — 数学ラボ3「仲間・ガチャ・バトル報酬」の中核ロジック（純関数）。
//  ★サーバー(Edge Function `third-api`)と、開発用のローカルモードが**同じこのコード**を使う★
//   ・状態(state)は、サーバーモードでは third_player_state（クライアントは書き込み不可）に保存される。
//   ・ガチャの抽選・チケット・経験値・仲間の所持は、すべてここで計算＝ブラウザの保存を書き換えても無効。
//   ・バトルの報酬は「サーバーがseedから問題を作り直して採点した正解数」だけで決まる（自己申告は使わない）。
//  設計: Obsidian 設計メモ_math-labo-third_ゲームシステム論点整理（2026-09-21）
// ============================================================
import { SPECIALIST_ROSTER } from "./specialistRoster.js";
import { STARTER_PARTY, PARTY_SIZE, GACHA, REWARD, VERIFY, MEDAL, CREDIT, CRYSTAL, BOSS_REWARD, DAILY, SYNTH } from "./gachaConfig.js";
import { DIFFICULTY_KEYS } from "./balance.js";
import { labUnitIdForBattle } from "./link.js";
import { generateThirdProblem, generatePractice, practiceCorrect, labUnitIdsOfChapter } from "./problemSource.js";
import { getChapter, getGrade } from "./data/storyMap.js";
import { findHaichiLessonForUnit, HAICHI_COURSE } from "../data/haichiCourse.js";
import { getSubUnitClearExpReward } from "./expCurve.js";
import { PROBLEM_VERSION } from "./problemVersion.js";

export { PROBLEM_VERSION };

/** 問題の「型」のID。テンプレIDがある問題はそれ、無いもの（とけた式など）は数字を伏せた問題文で代用する（正答率を型ごとに集計する用）。 */
export const problemTypeId = (q, unitId) => q?.id ?? `${unitId}:${String(q?.q || "").replace(/[+\-−]?\d+(\.\d+)?/g, "#").replace(/\s+/g, "").slice(0, 36)}`;

const ROSTER_BY_ID = Object.fromEntries(SPECIALIST_ROSTER.map((c) => [c.id, c]));
const POOL = { N: [], R: [], SR: [], UR: [] };
for (const c of SPECIALIST_ROSTER) POOL[c.rarity]?.push(c.id);

/** JST基準の日付キー（1日の上限用） */
export const dayKey = (now) => new Date(now + 9 * 3600 * 1000).toISOString().slice(0, 10);

export function initialThirdState() {
  return {
    v: 2,
    crystals: 0, // ガチャの通貨（旧ガチャチケット）。5個で1回
    coins: 0,
    owned: Object.fromEntries(STARTER_PARTY.map((id, i) => [id, { exp: 0, breaks: 0, n: i + 1 }])), // n＝入手した順
    acqSeq: STARTER_PARTY.length,
    spares: {}, // ガチャで被った子の予備の数 { id: 個数 }。合成（経験値にする）か限界突破に使う
    dex: Object.fromEntries(STARTER_PARTY.map((id) => [id, 1])), // 図鑑：一度でも仲間にした子（合成でいなくなっても残る）
    party: [...STARTER_PARTY],
    cleared: {}, // { "grade:chapter:subUnit": { first: ms, count } }
    chapterDone: {}, // 章クリアボーナス（その章の小単元を全部はじめてクリア）を受け取った章 { "grade:chapter": ms }
    bossDone: {}, // 章ボスを はじめて倒して報酬を受け取った章 { "grade:chapter": ms }
    pity: { pulls: 0, sinceSR: 0, sinceUR: 0 },
    seenSeeds: [], // 使用済みの解答(seed)。同じ解答の使い回しを防ぐ
    claimIds: [],
    lastClaimAt: 0,
    daily: { date: null, repeat: 0, ok: 0, mission: false }, // 1日の集計：周回の回数／検証済みの正解数／毎日の目標を達成したか
    gradeDone: {}, // 学年クリアボーナスを受け取った学年 { "1": ms }
    medals: { practiceN: {}, haichi: {}, pracLv: {}, battle: {} }, // メダル：れんしゅうの検証済み正解数／はいち(確認問題)の合格／難易度ごとの正解数（クリスタル用）
    credit: { ms: 0, at: 0 }, // 実時間の持ち分
  };
}

/** 欠けた項目の補完と、存在しないキャラの除去（旧データ・壊れたデータ対策） */
export function normalizeThirdState(s) {
  const base = initialThirdState();
  if (!s || typeof s !== "object") return base;
  const out = { ...base, ...s };
  out.owned = {};
  for (const [id, v] of Object.entries(s.owned || {})) {
    if (ROSTER_BY_ID[id]) out.owned[id] = { exp: Math.max(0, Number(v?.exp) || 0), breaks: Math.min(GACHA.maxBreaks, Math.max(0, Number(v?.breaks) || 0)), n: Number(v?.n) || 0 };
  }
  for (const id of STARTER_PARTY) if (!out.owned[id]) out.owned[id] = { exp: 0, breaks: 0, n: 0 };
  let seq = Math.max(Number(s.acqSeq) || 0, ...Object.values(out.owned).map((o) => o.n));
  for (const o of Object.values(out.owned)) if (!o.n) o.n = ++seq;
  out.acqSeq = seq;
  out.spares = {};
  for (const [id, n] of Object.entries(s.spares || {})) if (ROSTER_BY_ID[id] && Number(n) > 0) out.spares[id] = Math.floor(Number(n));
  out.dex = { ...(s.dex && typeof s.dex === "object" ? s.dex : {}) };
  for (const id of Object.keys(out.owned)) out.dex[id] = out.dex[id] || 1;
  let party = Array.isArray(s.party) ? s.party.slice(0, PARTY_SIZE) : [...STARTER_PARTY];
  party = party.map((id) => (id && out.owned[id] ? id : null));
  while (party.length < PARTY_SIZE) party.push(null);
  out.party = [...new Set(party.filter(Boolean))].length === party.filter(Boolean).length ? party : [...STARTER_PARTY];
  // 旧ガチャチケット(1枚=1回)は、クリスタル(5個=1回)に換算して引き継ぐ
  out.crystals = Math.max(0, Math.round(Number(s.crystals ?? (Number(s.tickets) || 0) * GACHA.costPerPull) || 0));
  delete out.tickets;
  out.coins = Math.max(0, Number(out.coins) || 0);
  out.pity = { ...base.pity, ...(s.pity || {}) };
  out.cleared = s.cleared && typeof s.cleared === "object" ? s.cleared : {};
  out.chapterDone = s.chapterDone && typeof s.chapterDone === "object" ? s.chapterDone : {};
  out.bossDone = s.bossDone && typeof s.bossDone === "object" ? s.bossDone : {};
  out.gradeDone = s.gradeDone && typeof s.gradeDone === "object" ? s.gradeDone : {};
  out.seenSeeds = Array.isArray(s.seenSeeds) ? s.seenSeeds.slice(-VERIFY.seenSeedsKeep) : [];
  out.claimIds = Array.isArray(s.claimIds) ? s.claimIds.slice(-VERIFY.claimIdsKeep) : [];
  out.daily = { ...base.daily, ...(s.daily || {}) };
  const m = s.medals && typeof s.medals === "object" ? s.medals : {};
  out.medals = { practiceN: { ...(m.practiceN || {}) }, haichi: { ...(m.haichi || {}) }, pracLv: { ...(m.pracLv || {}) }, battle: { ...(m.battle || {}) } };
  // バトルメダル：すでに初クリアしている小単元は、バトルメダルもゲット済みにする（メダル3枚化の前からの記録を引き継ぐ）
  for (const [key, c] of Object.entries(out.cleared)) {
    const [g, chapterId, subUnitId] = key.split(":");
    const uid = labUnitIdForBattle({ grade: Number(g), chapterId, subUnitId });
    if (uid && !out.medals.battle[uid]) out.medals.battle[uid] = c?.first || 1;
  }
  out.credit = { ms: Math.max(0, Number(s.credit?.ms) || 0), at: Number(s.credit?.at) || 0 };
  return out;
}

// ---------------- ガチャ ----------------
function rollRarity(rand, pity) {
  if (pity.sinceUR >= GACHA.urPity) return "UR"; // 天井
  const r = rand();
  let acc = 0;
  for (const k of ["UR", "SR", "R", "N"]) {
    acc += GACHA.rates[k];
    if (r < acc) return k;
  }
  return "N";
}

/**
 * ガチャを引く。count は 1 か GACHA.packSize。チケットが足りなければ何も変えずにエラー。
 * @returns {{ok:boolean, error?:string, state?:object, results?:object[]}}
 */
export function pullGacha(state, count, rand = Math.random) {
  if (count !== 1 && count !== GACHA.packSize) return { ok: false, error: "bad-count" };
  const cost = count * GACHA.costPerPull;
  if (state.crystals < cost) return { ok: false, error: "not-enough-crystals" };
  const s = structuredClone(state);
  s.crystals -= cost;
  const results = [];
  const rollUpgrade = () => (rand() < GACHA.rates.UR / (GACHA.rates.SR + GACHA.rates.UR) ? "UR" : "SR");
  for (let i = 0; i < count; i++) {
    s.pity.pulls += 1;
    s.pity.sinceSR += 1;
    s.pity.sinceUR += 1;
    let rarity = rollRarity(rand, s.pity);
    // 10連：最後の1回までにSR以上が出ていなければ、その1回をSR以上にする（10連は必ずSR以上が1体）
    if (count === GACHA.packSize && i === count - 1 && !results.some((x) => x.rarity === "SR" || x.rarity === "UR") && rarity !== "SR" && rarity !== "UR") rarity = rollUpgrade();
    if (rarity === "UR") { s.pity.sinceUR = 0; s.pity.sinceSR = 0; }
    else if (rarity === "SR") s.pity.sinceSR = 0;
    const ids = POOL[rarity];
    const id = ids[Math.min(ids.length - 1, Math.floor(rand() * ids.length))];
    const cur = s.owned[id];
    let isNew = false, spare = false, refund = 0;
    if (!cur) { s.owned[id] = { exp: 0, breaks: 0, n: ++s.acqSeq }; s.dex[id] = 1; isNew = true; }
    else { s.spares[id] = (s.spares[id] || 0) + 1; spare = true; refund = CRYSTAL.dupRefund; } // 被った子は「予備」として残る（合成か限界突破に使える）
    s.crystals += refund; // 被りの還元：外れた感じをやわらげる
    results.push({ id, rarity, isNew, breaks: s.owned[id].breaks, converted: false, spare, spares: s.spares[id] || 0, refund });
  }
  return { ok: true, state: s, results };
}

// ---------------- 合成・限界突破 ----------------
/**
 * 合成：いらない仲間を、ほかの仲間の経験値にする（1体＝200＋その子の経験値÷2）。
 *  source "spare"：ガチャで被った予備（経験値0なので1体＝200。count個まとめて）
 *  source "owned"：持っている仲間（パーティ外・予備が無い子）。合成するとその子は仲間からいなくなる（図鑑には残る）
 */
export function synthesize(state, req) {
  const targetId = req?.targetId, materialId = req?.materialId, source = req?.source;
  if (typeof targetId !== "string" || !state.owned[targetId]) return { ok: false, error: "bad-target" };
  const s = structuredClone(state);
  let gain = 0, used = 0;
  if (source === "spare") {
    const have = s.spares[materialId] || 0;
    const count = Number.isInteger(req?.count) ? req.count : 1;
    if (!have || count < 1 || count > have) return { ok: false, error: "no-spare" };
    s.spares[materialId] = have - count;
    if (!s.spares[materialId]) delete s.spares[materialId];
    gain = count * SYNTH.baseExp; used = count;
  } else if (source === "owned") {
    const m = s.owned[materialId];
    if (!m) return { ok: false, error: "bad-material" };
    if (materialId === targetId) return { ok: false, error: "same-character" };
    if (s.party.includes(materialId)) return { ok: false, error: "in-party" };
    if ((s.spares[materialId] || 0) > 0) return { ok: false, error: "use-spare-first" };
    gain = SYNTH.baseExp + Math.floor((m.exp || 0) * SYNTH.expRate);
    delete s.owned[materialId]; used = 1;
  } else return { ok: false, error: "bad-source" };
  s.owned[targetId].exp += gain;
  return { ok: true, state: s, gain, used };
}

/** 限界突破：予備を1つ使って、その子の凸を+1（最大 GACHA.maxBreaks）。 */
export function limitBreak(state, id) {
  if (typeof id !== "string" || !state.owned[id]) return { ok: false, error: "bad-target" };
  if ((state.spares[id] || 0) < 1) return { ok: false, error: "no-spare" };
  if (state.owned[id].breaks >= GACHA.maxBreaks) return { ok: false, error: "max-breaks" };
  const s = structuredClone(state);
  s.spares[id] -= 1; if (!s.spares[id]) delete s.spares[id];
  s.owned[id].breaks += 1;
  return { ok: true, state: s, breaks: s.owned[id].breaks };
}

// ---------------- パーティ編成 ----------------
export function setParty(state, party) {
  if (!Array.isArray(party) || party.length !== PARTY_SIZE) return { ok: false, error: "bad-party" };
  const ids = party.filter(Boolean);
  if (new Set(ids).size !== ids.length) return { ok: false, error: "duplicate" };
  for (const id of ids) if (!state.owned[id]) return { ok: false, error: "not-owned" };
  if (!ids.length) return { ok: false, error: "empty" };
  return { ok: true, state: { ...state, party: party.map((x) => x || null) } };
}

// ---------------- バトル結果の検証と報酬 ----------------
/**
 * 申請(claim)を検証する。サーバーが seed から問題を作り直して、本当の正誤を数える。
 * claim = { nonce, pv, grade, chapterId, kind:"subUnit", subUnitId, attempts:[{unitId, level, seed, answer, ms}] }
 */
export function verifyClaim(claim, state, now) {
  const fail = (error) => ({ ok: false, error });
  if (!claim || typeof claim !== "object") return fail("bad-claim");
  if (claim.pv !== PROBLEM_VERSION) return fail("client-outdated"); // 問題データの版がずれている→再読み込み
  if (typeof claim.nonce !== "string" || claim.nonce.length < 8 || claim.nonce.length > 80) return fail("bad-nonce");
  if (state.claimIds.includes(claim.nonce)) return fail("duplicate-claim");
  if (claim.kind !== "subUnit" && claim.kind !== "chapterBoss") return fail("unsupported-kind");
  let allowed, unitId;
  if (claim.kind === "subUnit") {
    unitId = labUnitIdForBattle({ grade: claim.grade, chapterId: claim.chapterId, subUnitId: claim.subUnitId });
    if (!unitId) return fail("unknown-unit");
    allowed = [unitId];
  } else { // 章ボス：その章の小単元のバトルメダルがすべてそろっている（＝全部のバトルをクリアした）時だけ。出題はその章のどの単元でもよい
    allowed = labUnitIdsOfChapter(claim.grade, claim.chapterId);
    if (!allowed.length) return fail("unknown-unit");
    if (!allowed.every((id) => unitMedalsOf(state, id).battle)) return fail("medals-missing");
    unitId = claim.chapterId;
  }
  const at = Array.isArray(claim.attempts) ? claim.attempts : null;
  if (!at || !at.length || at.length > VERIFY.maxAttempts) return fail("bad-attempts");
  if (now - state.lastClaimAt < VERIFY.minClaimIntervalMs) return fail("too-soon");

  const seen = new Set(state.seenSeeds);
  const rows = [];
  let correct = 0, sumMs = 0;
  for (const a of at) {
    if (!a || !allowed.includes(a.unitId) || !DIFFICULTY_KEYS.includes(a.level) || !Number.isInteger(a.seed) || a.seed < 0 || a.seed > 0xffffffff) continue;
    const ms = Number(a.ms);
    if (!Number.isFinite(ms) || ms < 0 || ms > 10 * 60 * 1000) continue;
    const uid = a.unitId;
    const key = `${uid}:${a.level}:${a.seed}`;
    if (seen.has(key)) continue; // 同じ問題の使い回しは数えない
    seen.add(key);
    const p = generateThirdProblem(uid, a.level, a.seed);
    if (!p) continue;
    const ok = p.choices[p.correctIndex] === String(a.answer) && ms >= VERIFY.minMsPerAnswer;
    sumMs += ms;
    if (ok) correct += 1;
    rows.push({ key, unitId: uid, level: a.level, seed: a.seed, ok, ms, templateId: p.templateId ?? `${uid}:${a.level}` });
  }
  return { ok: true, unitId, rows, correct, total: rows.length, sumMs, seenSeeds: [...seen] };
}

/** 検証を通した申請にご褒美を与える。 */
/** 日付が変わっていたら、1日の集計をリセットする（日本時間） */
function rollDaily(s, now) {
  const today = dayKey(now);
  if (s.daily.date !== today) s.daily = { date: today, repeat: 0, ok: 0, mission: false };
}
/** 毎日の目標：その日の検証済みの正解が5問に届いたら、クリスタル1個（1日1回）。付けた個数を返す。 */
function dailyMission(s, corrects, now) {
  rollDaily(s, now);
  s.daily.ok = (s.daily.ok || 0) + Math.max(0, corrects);
  if (!s.daily.mission && s.daily.ok >= DAILY.missionTarget) { s.daily.mission = true; s.crystals += CRYSTAL.dailyMission; return CRYSTAL.dailyMission; }
  return 0;
}
/** 学年クリアボーナス：その学年の全章で「章クリアボーナス」と「章ボス初撃破」がそろったら、クリスタル30個（学年ごとに1回）。付けた個数を返す。 */
function awardGradeClear(s, grade, now) {
  const g = getGrade(Number(grade));
  if (!g || s.gradeDone[grade]) return 0;
  const all = g.chapters.length > 0 && g.chapters.every((c) => s.chapterDone[`${grade}:${c.chapterId}`] && s.bossDone[`${grade}:${c.chapterId}`]);
  if (!all) return 0;
  s.gradeDone[grade] = now; s.crystals += CRYSTAL.gradeClear;
  return CRYSTAL.gradeClear;
}

export function applyClaim(state, claim, now) {
  const res = applyClaimCore(state, claim, now);
  if (res.ok && res.state) { // どの結果でも、検証済みの正解は「毎日の目標」に数える
    const dm = dailyMission(res.state, res.verified?.correct || 0, now);
    if (res.rewards) res.rewards.dailyMission = dm;
  }
  return res;
}

function applyClaimCore(state, claim, now) {
  const v = verifyClaim(claim, state, now);
  if (!v.ok) return v;
  const s = structuredClone(state);
  // 実時間の持ち分：解答時間の合計は、サーバー時計で実際に経過した分を超えられない（機械的な高速連投を防ぐ）
  accrue(s, now);
  if (!spend(s, v.sumMs)) return { ok: false, error: "time-mismatch" };
  s.claimIds = [...s.claimIds, claim.nonce].slice(-VERIFY.claimIdsKeep);
  s.seenSeeds = v.seenSeeds.slice(-VERIFY.seenSeedsKeep);
  s.lastClaimAt = now;
  const verified = { correct: v.correct, total: v.total, needed: VERIFY.minCorrect };
  if (v.correct < VERIFY.minCorrect) {
    return { ok: true, state: s, rewards: { granted: false, reason: "not-enough-correct", crystals: 0, coins: 0, exp: 0, isFirstClear: false }, verified, rows: v.rows };
  }
  if (claim.kind === "chapterBoss") { // 章ボス：はじめて倒した時だけ、クリスタルとコイン（周回は報酬なし）
    const bkey = `${claim.grade}:${claim.chapterId}`;
    const firstBoss = !s.bossDone[bkey];
    let crystals = 0, coins = 0;
    if (firstBoss) { crystals = CRYSTAL.chapterBossFirst; coins = BOSS_REWARD.firstCoins; s.bossDone[bkey] = now; }
    s.crystals += crystals; s.coins += coins;
    const gradeBonus = firstBoss ? awardGradeClear(s, claim.grade, now) : 0;
    return { ok: true, state: s, rewards: { granted: true, reason: firstBoss ? null : "boss-repeat", crystals, gradeBonus, coins, exp: 0, perMember: 0, isFirstClear: firstBoss, kind: "chapterBoss" }, verified, rows: v.rows };
  }
  const key = `${claim.grade}:${claim.chapterId}:${claim.subUnitId}`;
  const first = !s.cleared[key];
  rollDaily(s, now);
  let crystals = 0, coins = 0, exp = 0, reason = null;
  const baseExp = getSubUnitClearExpReward(claim.grade, claim.chapterId, claim.subUnitId);
  if (first) {
    crystals = REWARD.firstCrystals; coins = REWARD.firstCoins; exp = baseExp;
  } else if (s.daily.repeat < REWARD.repeatDailyMax) {
    coins = REWARD.repeatCoins; exp = Math.round(baseExp * REWARD.repeatExpRate);
    if (s.daily.repeat < REWARD.repeatCrystalMax) crystals = REWARD.repeatCrystals; // 周回ボーナス（1日5回まで）
    s.daily.repeat += 1;
  } else reason = "daily-limit";
  s.cleared[key] = { first: s.cleared[key]?.first || now, count: (s.cleared[key]?.count || 0) + 1 };
  const newMedals = [];
  if (!s.medals.battle[v.unitId]) { s.medals.battle[v.unitId] = now; newMedals.push({ kind: "battle", unitId: v.unitId }); } // バトルメダル：はじめてクリアした時
  // 章クリアボーナス：その章の小単元を全部はじめてクリアした時（章ごとに1回）
  let chapterBonus = 0;
  const wc = getChapter(claim.grade, claim.chapterId);
  const ck = `${claim.grade}:${claim.chapterId}`;
  if (first && wc && !s.chapterDone[ck] && wc.subUnits.every((su) => s.cleared[`${claim.grade}:${claim.chapterId}:${su.id}`])) {
    chapterBonus = CRYSTAL.chapterClear; s.chapterDone[ck] = now;
  }
  s.crystals += crystals + chapterBonus;
  s.coins += coins;
  const gradeBonus = chapterBonus > 0 ? awardGradeClear(s, claim.grade, now) : 0;
  const members = s.party.filter(Boolean);
  const perMember = members.length ? Math.floor(exp / members.length) : 0;
  for (const id of members) s.owned[id].exp += perMember;
  return { ok: true, state: s, rewards: { granted: true, reason, crystals, chapterBonus, gradeBonus, coins, exp, perMember, isFirstClear: first, newMedals }, verified, rows: v.rows };
}

// ---------------- 実時間の持ち分 ----------------
/** 実際に経過した時間ぶんの持ち分を足し、解答にかかった ms を使う。足りなければ false（stateは変えない）。 */
function accrue(s, now) {
  const at = s.credit.at || now;
  s.credit = { ms: Math.min(CREDIT.capMs, s.credit.ms + Math.max(0, now - at)), at: now };
}
function spend(s, ms) {
  if (ms > s.credit.ms + CREDIT.slackMs) return false;
  s.credit.ms = Math.max(0, s.credit.ms - ms);
  return true;
}

// ---------------- メダル ----------------
/** はいちメダルのキー：単元に対応する動画レッスン(g1m3 など)、動画が無い単元は nv:単元ID。 */
export function haichiKeyForUnit(unitId) {
  const f = findHaichiLessonForUnit(unitId);
  return f ? `g${f.grade}m${f.lesson.n}` : `nv:${unitId}`;
}
export function unitMedalsOf(state, unitId) {
  const haichi = !!state?.medals?.haichi?.[haichiKeyForUnit(unitId)];
  const practiceN = Math.min(MEDAL.practiceTarget, state?.medals?.practiceN?.[unitId] || 0);
  const practice = practiceN >= MEDAL.practiceTarget;
  const battle = !!state?.medals?.battle?.[unitId];
  return { haichi, practice, practiceN, battle, count: (haichi ? 1 : 0) + (practice ? 1 : 0) + (battle ? 1 : 0) };
}

// 確認問題のキー → 出題してよい単元IDの一覧（動画レッスンの u、動画なしは単元そのもの）
function unitsForHaichiKey(key) {
  if (typeof key !== "string") return null;
  if (key.startsWith("nv:")) return [key.slice(3)];
  const m = /^g([123])m(\d+)$/.exec(key);
  if (!m) return null;
  for (const section of HAICHI_COURSE[Number(m[1])] || []) {
    const l = section.lessons.find((x) => x.n === Number(m[2]));
    if (l) return l.u || [];
  }
  return null;
}

// 練習・確認の解答1件を検証する（seedから問題を作り直して採点）。返り値：{ok(=正解かつ最短時間以上), counted(=検証できた), row}
function verifyPracticeAttempt(a, seen) {
  if (!a || typeof a.unitId !== "string" || !DIFFICULTY_KEYS.includes(a.level)) return null;
  if (!Number.isInteger(a.seed) || a.seed < 0 || a.seed > 0xffffffff) return null;
  const ms = Number(a.ms);
  if (!Number.isFinite(ms) || ms < 0 || ms > 10 * 60 * 1000) return null;
  const key = `p:${a.unitId}:${a.level}:${a.seed}`;
  if (seen.has(key)) return null;
  const q = generatePractice(a.unitId, a.level, a.seed);
  if (!q) return null;
  const ok = practiceCorrect(q, a.answer) && ms >= MEDAL.minMsPerAnswer;
  return { key, ok, ms, unitId: a.unitId, level: a.level, seed: a.seed, templateId: problemTypeId(q, a.unitId) };
}

const LEVEL_JA = { easy: "簡単", standard: "普通", advanced: "難しい", oni: "鬼" };
/** れんしゅう：その難易度の検証済み正解が目標(5問)に届いた最初の1回だけ、クリスタルを付ける（周回では増えない）。 */
function awardPracticeLevel(s, r, events) {
  const byUnit = (s.medals.pracLv[r.unitId] ||= {});
  const before = byUnit[r.level] || 0;
  if (before >= CRYSTAL.practiceLevelTarget) return;
  byUnit[r.level] = before + 1;
  if (byUnit[r.level] >= CRYSTAL.practiceLevelTarget) {
    s.crystals += CRYSTAL.practiceLevelFirst;
    events.push({ n: CRYSTAL.practiceLevelFirst, label: `れんしゅう（${LEVEL_JA[r.level] || r.level}）はじめてクリア`, unitId: r.unitId });
  }
}

/** れんしゅう：検証済みの正解を数え、メダルの進捗を進める。 */
export function applyPractice(state, req, now) {
  const at = Array.isArray(req?.attempts) ? req.attempts : null;
  if (!at || !at.length || at.length > MEDAL.maxAttemptsPerRequest) return { ok: false, error: "bad-attempts" };
  const s = structuredClone(state);
  accrue(s, now);
  const seen = new Set(s.seenSeeds);
  const rows = [];
  const newMedals = [];
  const crystalEvents = [];
  let correct = 0;
  for (const a of at) {
    const r = verifyPracticeAttempt(a, seen);
    if (!r) continue;
    if (!spend(s, r.ms)) break; // 実時間が足りない（速すぎる連投）→ここから先は数えない
    seen.add(r.key);
    rows.push(r);
    if (r.ok) {
      correct += 1;
      const before = s.medals.practiceN[r.unitId] || 0;
      const after = Math.min(MEDAL.practiceTarget, before + 1);
      s.medals.practiceN[r.unitId] = after;
      if (before < MEDAL.practiceTarget && after >= MEDAL.practiceTarget) newMedals.push({ kind: "practice", unitId: r.unitId });
      awardPracticeLevel(s, r, crystalEvents);
    }
  }
  s.seenSeeds = [...seen].slice(-VERIFY.seenSeedsKeep);
  const dm = dailyMission(s, correct, now);
  if (dm) crystalEvents.push({ n: dm, label: "今日の目標（5問せいかい）" });
  return { ok: true, state: s, verified: { correct, total: rows.length }, newMedals, crystalEvents, rows };
}

/** はいち(確認問題)：1ラウンド(5問)の解答から、80%以上の正解ならメダル。 */
export function applyConfirm(state, req, now) {
  const allowed = unitsForHaichiKey(req?.key);
  if (!allowed || !allowed.length) return { ok: false, error: "unknown-lesson" };
  const at = Array.isArray(req.attempts) ? req.attempts : null;
  if (!at || at.length < MEDAL.confirmRound || at.length > MEDAL.maxAttemptsPerRequest) return { ok: false, error: "bad-attempts" };
  const s = structuredClone(state);
  accrue(s, now);
  const seen = new Set(s.seenSeeds);
  const rows = [];
  let correct = 0;
  for (const a of at) {
    if (!allowed.includes(a?.unitId)) continue;
    const r = verifyPracticeAttempt(a, seen);
    if (!r) continue;
    if (!spend(s, r.ms)) break;
    seen.add(r.key);
    rows.push(r);
    if (r.ok) correct += 1;
  }
  s.seenSeeds = [...seen].slice(-VERIFY.seenSeedsKeep);
  const total = rows.length;
  const passed = total >= MEDAL.confirmRound && correct / total >= MEDAL.confirmPassRate;
  const newMedals = [];
  const crystalEvents = [];
  if (passed && !s.medals.haichi[req.key]) {
    s.medals.haichi[req.key] = now;
    newMedals.push({ kind: "haichi", key: req.key });
    s.crystals += CRYSTAL.confirmFirst; // 確認問題にはじめて合格：クリスタル
    crystalEvents.push({ n: CRYSTAL.confirmFirst, label: "確認問題に はじめて合格" });
  }
  const dm = dailyMission(s, correct, now);
  if (dm) crystalEvents.push({ n: dm, label: "今日の目標（5問せいかい）" });
  return { ok: true, state: s, verified: { correct, total, passed }, newMedals, crystalEvents, rows };
}
