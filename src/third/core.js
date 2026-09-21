// ============================================================
// core.js — 数学ラボ3「仲間・ガチャ・バトル報酬」の中核ロジック（純関数）。
//  ★サーバー(Edge Function `third-api`)と、開発用のローカルモードが**同じこのコード**を使う★
//   ・状態(state)は、サーバーモードでは third_player_state（クライアントは書き込み不可）に保存される。
//   ・ガチャの抽選・チケット・経験値・仲間の所持は、すべてここで計算＝ブラウザの保存を書き換えても無効。
//   ・バトルの報酬は「サーバーがseedから問題を作り直して採点した正解数」だけで決まる（自己申告は使わない）。
//  設計: Obsidian 設計メモ_math-labo-third_ゲームシステム論点整理（2026-09-21）
// ============================================================
import { SPECIALIST_ROSTER } from "./specialistRoster.js";
import { STARTER_PARTY, PARTY_SIZE, GACHA, REWARD, VERIFY, MEDAL, CREDIT } from "./gachaConfig.js";
import { DIFFICULTY_KEYS } from "./balance.js";
import { labUnitIdForBattle } from "./link.js";
import { generateThirdProblem, generatePractice, practiceCorrect } from "./problemSource.js";
import { findHaichiLessonForUnit, HAICHI_COURSE } from "../data/haichiCourse.js";
import { getSubUnitClearExpReward } from "./expCurve.js";
import { PROBLEM_VERSION } from "./problemVersion.js";

export { PROBLEM_VERSION };

const ROSTER_BY_ID = Object.fromEntries(SPECIALIST_ROSTER.map((c) => [c.id, c]));
const POOL = { N: [], R: [], SR: [], UR: [] };
for (const c of SPECIALIST_ROSTER) POOL[c.rarity]?.push(c.id);

/** JST基準の日付キー（1日の上限用） */
export const dayKey = (now) => new Date(now + 9 * 3600 * 1000).toISOString().slice(0, 10);

export function initialThirdState() {
  return {
    v: 1,
    tickets: 0,
    coins: 0,
    owned: Object.fromEntries(STARTER_PARTY.map((id, i) => [id, { exp: 0, breaks: 0, n: i + 1 }])), // n＝入手した順
    acqSeq: STARTER_PARTY.length,
    party: [...STARTER_PARTY],
    cleared: {}, // { "grade:chapter:subUnit": { first: ms, count } }
    pity: { pulls: 0, sinceSR: 0, sinceUR: 0 },
    seenSeeds: [], // 使用済みの解答(seed)。同じ解答の使い回しを防ぐ
    claimIds: [],
    lastClaimAt: 0,
    daily: { date: null, repeat: 0 },
    medals: { practiceN: {}, haichi: {} }, // メダル：れんしゅうの検証済み正解数／はいち(確認問題)の合格
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
  let party = Array.isArray(s.party) ? s.party.slice(0, PARTY_SIZE) : [...STARTER_PARTY];
  party = party.map((id) => (id && out.owned[id] ? id : null));
  while (party.length < PARTY_SIZE) party.push(null);
  out.party = [...new Set(party.filter(Boolean))].length === party.filter(Boolean).length ? party : [...STARTER_PARTY];
  out.tickets = Math.max(0, Number(out.tickets) || 0);
  out.coins = Math.max(0, Number(out.coins) || 0);
  out.pity = { ...base.pity, ...(s.pity || {}) };
  out.cleared = s.cleared && typeof s.cleared === "object" ? s.cleared : {};
  out.seenSeeds = Array.isArray(s.seenSeeds) ? s.seenSeeds.slice(-VERIFY.seenSeedsKeep) : [];
  out.claimIds = Array.isArray(s.claimIds) ? s.claimIds.slice(-VERIFY.claimIdsKeep) : [];
  out.daily = { ...base.daily, ...(s.daily || {}) };
  const m = s.medals && typeof s.medals === "object" ? s.medals : {};
  out.medals = { practiceN: { ...(m.practiceN || {}) }, haichi: { ...(m.haichi || {}) } };
  out.credit = { ms: Math.max(0, Number(s.credit?.ms) || 0), at: Number(s.credit?.at) || 0 };
  return out;
}

// ---------------- ガチャ ----------------
function rollRarity(rand, pity) {
  if (pity.sinceUR >= GACHA.urPity) return "UR"; // 天井
  if (pity.sinceSR >= GACHA.srGuaranteeEvery) return rand() < GACHA.rates.UR / (GACHA.rates.SR + GACHA.rates.UR) ? "UR" : "SR"; // SR以上を保証
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
  if (state.tickets < cost) return { ok: false, error: "not-enough-tickets" };
  const s = structuredClone(state);
  s.tickets -= cost;
  const results = [];
  for (let i = 0; i < count; i++) {
    s.pity.pulls += 1;
    s.pity.sinceSR += 1;
    s.pity.sinceUR += 1;
    const rarity = rollRarity(rand, s.pity);
    if (rarity === "UR") { s.pity.sinceUR = 0; s.pity.sinceSR = 0; }
    else if (rarity === "SR") s.pity.sinceSR = 0;
    const ids = POOL[rarity];
    const id = ids[Math.min(ids.length - 1, Math.floor(rand() * ids.length))];
    const cur = s.owned[id];
    let isNew = false, converted = false;
    if (!cur) { s.owned[id] = { exp: 0, breaks: 0, n: ++s.acqSeq }; isNew = true; }
    else if (cur.breaks < GACHA.maxBreaks) cur.breaks += 1;
    else { s.coins += GACHA.overflowCoins; converted = true; }
    results.push({ id, rarity, isNew, breaks: s.owned[id].breaks, converted });
  }
  return { ok: true, state: s, results };
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
  if (claim.kind !== "subUnit") return fail("unsupported-kind");
  const unitId = labUnitIdForBattle({ grade: claim.grade, chapterId: claim.chapterId, subUnitId: claim.subUnitId });
  if (!unitId) return fail("unknown-unit");
  if (!unitMedalsOf(state, unitId).battleOpen) return fail("medals-missing"); // サーバーが認めたメダル2枚が無い小単元のバトルは受け付けない
  const at = Array.isArray(claim.attempts) ? claim.attempts : null;
  if (!at || !at.length || at.length > VERIFY.maxAttempts) return fail("bad-attempts");
  if (now - state.lastClaimAt < VERIFY.minClaimIntervalMs) return fail("too-soon");

  const seen = new Set(state.seenSeeds);
  const rows = [];
  let correct = 0, sumMs = 0;
  for (const a of at) {
    if (!a || a.unitId !== unitId || !DIFFICULTY_KEYS.includes(a.level) || !Number.isInteger(a.seed) || a.seed < 0 || a.seed > 0xffffffff) continue;
    const ms = Number(a.ms);
    if (!Number.isFinite(ms) || ms < 0 || ms > 10 * 60 * 1000) continue;
    const key = `${unitId}:${a.level}:${a.seed}`;
    if (seen.has(key)) continue; // 同じ問題の使い回しは数えない
    seen.add(key);
    const p = generateThirdProblem(unitId, a.level, a.seed);
    if (!p) continue;
    const ok = p.choices[p.correctIndex] === String(a.answer) && ms >= VERIFY.minMsPerAnswer;
    sumMs += ms;
    if (ok) correct += 1;
    rows.push({ key, unitId, level: a.level, seed: a.seed, ok, ms });
  }
  return { ok: true, unitId, rows, correct, total: rows.length, sumMs, seenSeeds: [...seen] };
}

/** 検証を通した申請にご褒美を与える。 */
export function applyClaim(state, claim, now) {
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
    return { ok: true, state: s, rewards: { granted: false, reason: "not-enough-correct", tickets: 0, coins: 0, exp: 0, isFirstClear: false }, verified, rows: v.rows };
  }
  const key = `${claim.grade}:${claim.chapterId}:${claim.subUnitId}`;
  const first = !s.cleared[key];
  const today = dayKey(now);
  if (s.daily.date !== today) s.daily = { date: today, repeat: 0 };
  let tickets = 0, coins = 0, exp = 0, reason = null;
  const baseExp = getSubUnitClearExpReward(claim.grade, claim.chapterId, claim.subUnitId);
  if (first) {
    tickets = REWARD.firstTickets; coins = REWARD.firstCoins; exp = baseExp;
  } else if (s.daily.repeat < REWARD.repeatDailyMax) {
    coins = REWARD.repeatCoins; exp = Math.round(baseExp * REWARD.repeatExpRate); s.daily.repeat += 1;
  } else reason = "daily-limit";
  s.cleared[key] = { first: s.cleared[key]?.first || now, count: (s.cleared[key]?.count || 0) + 1 };
  s.tickets += tickets;
  s.coins += coins;
  const members = s.party.filter(Boolean);
  const perMember = members.length ? Math.floor(exp / members.length) : 0;
  for (const id of members) s.owned[id].exp += perMember;
  return { ok: true, state: s, rewards: { granted: true, reason, tickets, coins, exp, perMember, isFirstClear: first }, verified, rows: v.rows };
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
  return { haichi, practice, practiceN, count: (haichi ? 1 : 0) + (practice ? 1 : 0), battleOpen: haichi && practice };
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
  return { key, ok, ms, unitId: a.unitId, level: a.level, seed: a.seed };
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
    }
  }
  s.seenSeeds = [...seen].slice(-VERIFY.seenSeedsKeep);
  return { ok: true, state: s, verified: { correct, total: rows.length }, newMedals, rows };
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
  if (passed && !s.medals.haichi[req.key]) {
    s.medals.haichi[req.key] = now;
    newMedals.push({ kind: "haichi", key: req.key });
  }
  return { ok: true, state: s, verified: { correct, total, passed }, newMedals, rows };
}
