// ============================================================
// balance.js — 数学ラボ3のバトル数値（30秒ゲージ方式・2026-09-21）。純関数/定数のみ。
//
//  ・敵の行動ゲージ(GAUGE_SECONDS)が常に進み、0で敵が行動。不正解でゲージがWRONG_PENALTY_SECONDS秒進む。
//  ・問題の難度(易/普/難/鬼)は30秒の間いつでも切替可（次の問題から適用）。難度が高いほど倍率が大きい。
//  ・インフレ対策：1回の正解で1体の敵から削れる量に上限(capFrac＝敵最大HPの割合)。
//    どれだけ強い編成でも最低 ceil(1/capFrac) 問の正解が要る（学習量のフロア）。
//  ・敵の行動ダメージは「パーティ最大HPの割合」ではなく**絶対値**。編成が育つほど耐えられる
//    ＝成長が意味を持つ（割合方式だと、HPが増えても被害が同じ割合で増えて成長が無意味になった）。
//  ・敵の強さは、カリキュラム上の位置(tier 0〜1)でなだらかに上がる（どの単元からも始められる）。
//  数値は sim-gauge-battle.mjs のシミュレーションで調整（#todo 実プレイで再調整）。
// ============================================================
import { getSubUnitCurriculumPosition, getChapter } from "./data/storyMap.js";

// 敵の行動ゲージの長さ(秒)。雑魚とボスで変えられる（ボスの方が短い＝スリル）。
export const GAUGE = { mob: 22, boss: 18, early: 7 }; // early＝序盤(tier=0)だけ足す秒数（earlyUntilまでに0へ）
export const GAUGE_SECONDS = GAUGE.mob; // 互換（既定値）
export const WRONG_PENALTY_SECONDS = 10;
// tier(0〜1)＝カリキュラム上の位置。序盤は少し長く（最初の戦闘を遊びやすく）、進むほど本来の秒数になる。
export const gaugeBaseSeconds = (isBoss, tier = 1) =>
  Math.round((isBoss ? GAUGE.boss : GAUGE.mob) + GAUGE.early * (1 - Math.min(1, Math.max(0, tier) / ENEMY.earlyUntil)));

export const DIFFICULTY_KEYS = ["easy", "standard", "advanced", "oni"];
export const DIFFICULTY_LABEL = { easy: "簡単", standard: "普通", advanced: "難しい", oni: "鬼" };
// dmgMult＝ダメージ倍率 / capFrac＝1回の正解で1体の敵から削れる上限（敵最大HPの割合）
export const DIFFICULTIES = {
  easy: { dmgMult: 0.6, capFrac: 0.15 },
  standard: { dmgMult: 1.0, capFrac: 0.25 },
  advanced: { dmgMult: 1.8, capFrac: 0.35 },
  oni: { dmgMult: 3.0, capFrac: 0.5 },
};
export const DIFFICULTY_DAMAGE_MULTIPLIER = Object.fromEntries(DIFFICULTY_KEYS.map((k) => [k, DIFFICULTIES[k].dmgMult]));
// スキル(全体/単体ダメージ)が1体から削れる上限（敵最大HPの割合）
export const SKILL_CAP_FRAC = 0.35;

// 基準値：初期パーティ(N×5・Lv1)の「1回の正解(普通)の火力」と「パーティ最大HP」
export const REF_POWER = 600;
export const REF_HP = 2000;

export const ENEMY = {
  mobHitsToKill: 6, // 雑魚の1波(1〜3体)を、初期パーティが普通で倒すのに要る正解数
  bossHitsToKill: 12, // ボスを、初期パーティが普通で倒すのに要る正解数
  mobActionFrac: 0.072, // 雑魚の1波が1回の行動で与える合計ダメージ（REF_HPに対する割合。体数で等分）
  bossActionFrac: 0.11, // ボスの1回の行動ダメージ（REF_HPに対する割合）
  hpPerTier: 2.2, // カリキュラム末尾の敵HPは先頭の 1+この値 倍
  dmgPerTier: 9, // 同、敵のダメージ
  earlyDmg: 0.42, // 序盤(tierが小さい)の敵の攻撃を弱める倍率（tier=0で×earlyDmg → earlyUntilで×1）＝最初の戦闘は勝てる
  earlyUntil: 0.3,
  bossKindMult: { unitSmallBoss: 1, chapterBoss: 1.5, unitBoss: 1.3, finalBoss: 2 },
};

/** カリキュラム上の位置(0〜1)。全学年通しの87小単元で、先頭=0・末尾=1。 */
export function tierOf(grade, chapterId, subUnitId) {
  const ch = getChapter(grade, chapterId);
  const sub = subUnitId ? subUnitId : ch?.subUnits?.[ch.subUnits.length - 1]?.id;
  const { index, total } = getSubUnitCurriculumPosition(grade, chapterId, sub);
  if (index < 0 || total <= 1) return 0;
  return index / (total - 1);
}

const hpScale = (t) => 1 + ENEMY.hpPerTier * t;
const dmgScale = (t) => (1 + ENEMY.dmgPerTier * t) * (ENEMY.earlyDmg + (1 - ENEMY.earlyDmg) * Math.min(1, t / ENEMY.earlyUntil));

/** 雑魚(同時count体)1体ぶんのHPと、1回の行動ダメージ。 */
export function mobStats(count, t = 0) {
  const c = Math.max(1, count);
  return {
    hp: Math.round((ENEMY.mobHitsToKill * REF_POWER * hpScale(t)) / c),
    dmg: Math.round((ENEMY.mobActionFrac * REF_HP * dmgScale(t)) / c),
  };
}

/** ボス(kindごとに倍率)のHPと、1回の行動ダメージ。 */
export function bossStats(kind, t = 0) {
  const m = ENEMY.bossKindMult[kind] ?? 1;
  return {
    hp: Math.round(ENEMY.bossHitsToKill * REF_POWER * hpScale(t) * m),
    dmg: Math.round(ENEMY.bossActionFrac * REF_HP * dmgScale(t) * (1 + (m - 1) * 0.5)),
  };
}

/** 1体の敵に、1回の正解で与えられる最大ダメージ。 */
export function capDamageFor(enemyMaxHp, difficulty) {
  return Math.max(1, Math.round(enemyMaxHp * (DIFFICULTIES[difficulty]?.capFrac ?? 0.25)));
}
/** その難度だけで倒す場合の最低必要正解数（学習量のフロア）。 */
export function minCorrectAnswers(difficulty) {
  return Math.ceil(1 / (DIFFICULTIES[difficulty]?.capFrac ?? 0.25));
}
