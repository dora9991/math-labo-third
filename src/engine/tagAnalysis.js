// ============================================================
// tagAnalysis.js — 診断スキルタグ単位の苦手分析エンジン
//
// 生徒の解答記録（正誤）を受け取り、「診断スキルタグ」「小単元」「章」
// それぞれの粒度で正答率を集計し、苦手分野を自動で浮かび上がらせる。
//
//   問題は複数の診断スキルタグを持つことがある。1問の正誤は、その問題が
//   持つ全タグに加算する（＝そのタグの実力測定に寄与させる）。
//
// 入力:  attempts = [{ id, correct:boolean }, ...]   ← problemBank の id
// 出力:  { byTag, bySubunit, byChapter, weakTags, weakSubunits, summary }
//
// 既存の習熟度推定(engine/mastery.js, skills.js の S-NEG)とは別レイヤー。
// c1 は appSkill(S-NEG-xxx) も持つので、必要なら既存エンジンへも橋渡し可能
// （bridgeToAppSkills を参照）。
// ============================================================

import { PROBLEM_BANK, getProblem } from "../data/problemBank.js";

const WEAK = 0.6;   // これ未満 = 要復習
const SHAKY = 0.8;  // これ未満 = やや不安

function band(rate) {
  if (rate < WEAK) return "weak";
  if (rate < SHAKY) return "shaky";
  return "ok";
}
function blank() {
  return { attempted: 0, correct: 0, rate: null, band: null };
}
function bump(bucket, ok) {
  bucket.attempted++;
  if (ok) bucket.correct++;
}
function finalize(map) {
  for (const k of Object.keys(map)) {
    const b = map[k];
    b.rate = b.attempted ? b.correct / b.attempted : null;
    b.band = b.rate == null ? null : band(b.rate);
  }
  return map;
}

/**
 * 正誤記録を集計する。
 * @param {Array<{id:string, correct:boolean}>} attempts
 */
export function analyzeAttempts(attempts = []) {
  const byTag = {};
  const bySubunit = {};
  const byChapter = {};
  let scored = 0;

  for (const a of attempts) {
    const p = getProblem(a.id);
    if (!p) continue;
    scored++;
    const ok = !!a.correct;

    for (const tag of p.skillTags) {
      (byTag[tag] ||= { ...blank(), chapter: p.chapter, subunit: p.subunit });
      bump(byTag[tag], ok);
    }
    const subKey = `${p.chapter} / ${p.subunit}`;
    (bySubunit[subKey] ||= { ...blank(), chapter: p.chapter, subunit: p.subunit });
    bump(bySubunit[subKey], ok);

    (byChapter[p.chapter] ||= { ...blank(), unit: p.unit });
    bump(byChapter[p.chapter], ok);
  }

  finalize(byTag);
  finalize(bySubunit);
  finalize(byChapter);

  const weakTags = Object.entries(byTag)
    .filter(([, b]) => b.rate != null && b.rate < SHAKY)
    .sort((a, b) => a[1].rate - b[1].rate)
    .map(([tag, b]) => ({ tag, ...b }));

  const weakSubunits = Object.entries(bySubunit)
    .filter(([, b]) => b.rate != null && b.rate < SHAKY)
    .sort((a, b) => a[1].rate - b[1].rate)
    .map(([key, b]) => ({ key, ...b }));

  const totalCorrect = attempts.filter((a) => a.correct).length;
  return {
    byTag,
    bySubunit,
    byChapter,
    weakTags,
    weakSubunits,
    summary: {
      scored,
      correct: totalCorrect,
      rate: scored ? totalCorrect / scored : null,
    },
  };
}

/**
 * 苦手タグから「次に出すべき復習問題」を提案する。
 * @param {Array} weakTags  analyzeAttempts().weakTags
 * @param {number} perTag   1タグあたり何問出すか
 */
export function recommendReview(weakTags, perTag = 3) {
  const out = [];
  const seen = new Set();
  for (const w of weakTags) {
    const cands = PROBLEM_BANK.filter(
      (p) => p.skillTags.includes(w.tag) && p.autoGradable && !seen.has(p.id)
    ).slice(0, perTag);
    for (const c of cands) {
      seen.add(c.id);
      out.push(c);
    }
  }
  return out;
}

/**
 * c1（正負の数）の問題は appSkill(S-NEG-xxx) を持つ。
 * 既存 mastery/skills エンジンへ渡すため、appSkill単位の正誤に畳み込む。
 */
export function bridgeToAppSkills(attempts = []) {
  const bySkill = {};
  for (const a of attempts) {
    const p = getProblem(a.id);
    if (!p || !p.appSkill) continue;
    (bySkill[p.appSkill] ||= { attempted: 0, correct: 0 });
    bySkill[p.appSkill].attempted++;
    if (a.correct) bySkill[p.appSkill].correct++;
  }
  return bySkill;
}
