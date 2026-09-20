// ============================================================
// chapterSkills.js — 単元別スキルガチャ（2026-07-18設計・データ層）
//  設計: Obsidian「設計_単元別戦闘力とHP1000化_2026-07-18」
//  各章の小単元を全クリアすると、その章のスキルガチャを1回引ける。
//  Dランクは無償（最初から持っている最弱版）。C〜SSがガチャ対象。
//  獲得したスキルは章をまたいで共通のプールに入り、どのボス戦でも
//  ロードアウト2枠から選んで装備できる（＝他章のクリアが他章のボス対策になる）。
// ============================================================

export const SKILL_GACHA_ODDS = { C: 0.38, B: 0.29, A: 0.19, S: 0.10, SS: 0.04 };
export const SKILL_RANK_ORDER = ["C", "B", "A", "S", "SS"];
// D（無償）を含めた表示用の全ランク順（低→高）
export const SKILL_RANK_ORDER_WITH_D = ["D", ...SKILL_RANK_ORDER];

// 章ID → その章の「属性」＝ボスが使う技のパターンID（engine/battleTurn.js の TURN_ENEMY_PATTERNS と対応）。
//  各章のスキルの対策先そのもの（例：c3方程式の「めざまし」はsleep対策）。
//  ボスの梯子(monsters.js)のpatternPool生成に使う。
export const CHAPTER_ENEMY_PATTERN = {
  c1: "attack", c2: "charge", c3: "sleep", c4: "poison", c5: "multi", c6: "timejam", c7: "paralysis",
};

// D→C→B→A→S→SSの5段階レベルアップに必要なクリスタル数（各段階ぶん）。
//  通常スキル(cost:2)は合計12、じかんのよろい(cost:3)だけ合計15＝重め。
//  7スキル全部を合計SSまで上げると 12×6+15 = 87 で、全学年(中1〜3)を一周クリアした
//  ぶんのクリスタル(87個・2026-07-19時点)でちょうど賄える設計（詳細はREADME等は無く本コメントが根拠）。
const STANDARD_LEVEL_COSTS = [1, 2, 2, 3, 4];   // 合計12
const PREMIUM_LEVEL_COSTS = [1, 2, 3, 4, 5];    // 合計15（じかんのよろい専用）

// 章ID → スキル定義。tiers は D〜SS の6段階。
export const CHAPTER_SKILLS = {
  c1: {
    name: "ちからをこめる", icon: "💪", kind: "dmgup", cost: 2, levelCosts: STANDARD_LEVEL_COSTS,
    theme: "与ダメバフ",
    // 2026-07-19：「2ターン+35%だと普通に1ターン殴った方がいい」というフィードバックで
    // 全ランクの上乗せ率(mult-1)を一律+50%（例：+35%→+52.5%）に引き上げ。
    tiers: {
      D:  { turns: 2, mult: 1.225 },
      C:  { turns: 2, mult: 1.375 },
      B:  { turns: 2, mult: 1.525 },
      A:  { turns: 3, mult: 1.45 },
      S:  { turns: 3, mult: 1.60 },
      SS: { turns: 4, mult: 1.525 },
    },
  },
  c2: {
    name: "みやぶり", icon: "👁️", kind: "burstGuard", cost: 2, levelCosts: STANDARD_LEVEL_COSTS,
    theme: "ため技・必殺技の被ダメ軽減",
    tiers: {
      D:  { turns: 1, reduce: 0.50 },
      C:  { turns: 2, reduce: 0.50 },
      B:  { turns: 2, reduce: 0.66 },
      A:  { turns: 3, reduce: 0.66 },
      S:  { turns: 3, reduce: 0.75 },
      SS: { turns: 4, reduce: 0.75 },
    },
  },
  c3: {
    name: "めざまし", icon: "⏰", kind: "immSleep", cost: 2, levelCosts: STANDARD_LEVEL_COSTS,
    theme: "睡眠無効",
    tiers: {
      D:  { turns: 3 },
      C:  { turns: 4 },
      B:  { turns: 5 },
      A:  { turns: 6 },
      S:  { turns: 8 },
      SS: { turns: 10 },
    },
  },
  c4: {
    name: "どくけし", icon: "🧪", kind: "immPoison", cost: 2, levelCosts: STANDARD_LEVEL_COSTS,
    theme: "毒無効",
    tiers: {
      D:  { turns: 3 },
      C:  { turns: 4 },
      B:  { turns: 5 },
      A:  { turns: 6 },
      S:  { turns: 8 },
      SS: { turns: 10, regenPct: 0.03, regenEvery: 2 },
    },
  },
  c5: {
    name: "みきりのかまえ", icon: "🥋", kind: "multiGuard", cost: 2, levelCosts: STANDARD_LEVEL_COSTS,
    theme: "連続攻撃の被ダメ軽減",
    tiers: {
      D:  { turns: 1, reduce: 0.50 },
      C:  { turns: 2, reduce: 0.50 },
      B:  { turns: 2, reduce: 0.66 },
      A:  { turns: 3, reduce: 0.66 },
      S:  { turns: 3, reduce: 0.75 },
      SS: { turns: 4, reduce: 0.75 },
    },
  },
  c6: {
    name: "じかんのよろい", icon: "🛡️", kind: "immTimejam", cost: 3, levelCosts: PREMIUM_LEVEL_COSTS,
    theme: "時間妨害無効",
    tiers: {
      D:  { turns: 2 },
      C:  { turns: 3 },
      B:  { turns: 4 },
      A:  { turns: 5 },
      S:  { turns: 6 },
      SS: { turns: 8 },
    },
  },
  c7: {
    name: "まひふうじ", icon: "🚫", kind: "paralysisResist", cost: 2, levelCosts: STANDARD_LEVEL_COSTS,
    theme: "麻痺耐性",
    tiers: {
      D:  { reduce: 0.20 },
      C:  { reduce: 0.30 },
      B:  { reduce: 0.40 },
      A:  { reduce: 0.55 },
      S:  { reduce: 0.70 },
      SS: { reduce: 1.00 },
    },
  },
};

/** そのランクの排出確率（Dは常に0＝ガチャでは出ない、無償配布のみ） */
export function skillGachaOddsFor(rank) {
  return SKILL_GACHA_ODDS[rank] || 0;
}

/** 単元スキルガチャを1回引く → ランクキー("C"〜"SS") */
export function rollChapterSkillGacha(rand = Math.random) {
  const t = rand();
  let acc = 0;
  for (const rank of SKILL_RANK_ORDER) {
    acc += SKILL_GACHA_ODDS[rank];
    if (t < acc) return rank;
  }
  return "SS"; // 丸め誤差の保険
}

/** chapterId・ランクから、そのスキルの効果値＋表示情報をまとめて返す */
export function chapterSkillTier(chapterId, rank) {
  const def = CHAPTER_SKILLS[chapterId];
  if (!def || !def.tiers[rank]) return null;
  return { ...def.tiers[rank], name: def.name, icon: def.icon, kind: def.kind, cost: def.cost, theme: def.theme, chapterId, rank };
}

/** chapterIdからスキル定義そのものを引く */
export function findChapterSkill(chapterId) {
  return CHAPTER_SKILLS[chapterId] || null;
}

/** そのスキルを currentRank から1段階上げるのに必要なクリスタル数（最大SSならnull） */
export function chapterSkillLevelUpCost(chapterId, currentRank) {
  const def = CHAPTER_SKILLS[chapterId];
  const idx = SKILL_RANK_ORDER_WITH_D.indexOf(currentRank);
  if (!def || idx < 0 || idx >= SKILL_RANK_ORDER_WITH_D.length - 1) return null;
  return def.levelCosts[idx];
}
