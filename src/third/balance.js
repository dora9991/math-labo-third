// ============================================================
// balance.js — 数学ラボ3のバトル数値（30秒ゲージ方式・2026-09-21）。純関数/定数のみ。
//
//  ・敵の行動ゲージ(GAUGE_SECONDS)が常に進み、0で敵が行動。不正解でその波のゲージの半分が進む。
//  ・問題の難度(易/普/難/鬼)は30秒の間いつでも切替可（次の問題から適用）。難度が高いほど倍率が大きい。
//  ・インフレ対策：1回の正解で1体の敵から削れる量に上限(capFrac＝敵最大HPの割合)。
//    どれだけ強い編成でも最低 ceil(1/capFrac) 問の正解が要る（学習量のフロア）。
//  ・敵の行動ダメージは「パーティ最大HPの割合」ではなく**絶対値**。編成が育つほど耐えられる
//    ＝成長が意味を持つ（割合方式だと、HPが増えても被害が同じ割合で増えて成長が無意味になった）。
//  ・敵の強さは、カリキュラム上の位置(tier 0〜1)でなだらかに上がる（どの単元からも始められる）。
//  数値は sim-gauge-battle.mjs のシミュレーションで調整（#todo 実プレイで再調整）。
// ============================================================
import { getSubUnitCurriculumPosition, getChapter, SUBUNIT_SEQUENCE } from "./data/storyMap.js";

// 敵の行動ゲージの長さ(秒)。雑魚とボスで変えられる（ボスの方が短い＝スリル）。
export const GAUGE = { mob: 22, boss: 18, early: 7 }; // early＝序盤(tier=0)だけ足す秒数（earlyUntilまでに0へ）
export const GAUGE_SECONDS = GAUGE.mob; // 互換（既定値）
// tier(0〜1)＝カリキュラム上の位置。序盤は少し長く（最初の戦闘を遊びやすく）、進むほど本来の秒数になる。
export const gaugeBaseSeconds = (isBoss, tier = 1) =>
  Math.round((isBoss ? GAUGE.boss : GAUGE.mob) + GAUGE.early * (1 - Math.min(1, Math.max(0, tier) / ENEMY.earlyUntil)));

export const DIFFICULTY_KEYS = ["easy", "standard", "advanced", "oni"];
export const DIFFICULTY_LABEL = { easy: "簡単", standard: "普通", advanced: "難しい", oni: "鬼" };
// dmgMult＝ダメージ倍率 / capFrac＝1回の正解で1体の敵から削れる上限（敵最大HPの割合）
export const DIFFICULTIES = {
  // 簡単だけ、不正解で進むゲージを1/4に（2026-09-30：苦手な子が簡単を選んでも序盤・後半で負け続けていたため。playtest.mjs）
  // 2026-09-30（状態異常システム込みの通しシミュレーション playtest-journey.mjs で調整）：簡単は倍率0.7→0.8・上限15%→20%。
  //  苦手な子が簡単で戦っても、学年の後半で3%しか1回目に勝てなかった（倒すのに正解が7問以上要り、その間に敵が何度も動く）。
  easy: { dmgMult: 0.8, capFrac: 0.2, penaltyFrac: 0.25 },
  standard: { dmgMult: 1.0, capFrac: 0.25 },
  advanced: { dmgMult: 1.2, capFrac: 0.35 },
  oni: { dmgMult: 1.5, capFrac: 0.5 },
};
export const DIFFICULTY_DAMAGE_MULTIPLIER = Object.fromEntries(DIFFICULTY_KEYS.map((k) => [k, DIFFICULTIES[k].dmgMult]));
// 不正解のとき、その波のゲージ(満タンの秒数)のこの割合だけ敵の行動が近づく（バトル画面とシミュレーションで共通）
export const WRONG_PENALTY_FRAC = 0.5;
/** その難度で不正解したときに進むゲージの割合（難度ごとの penaltyFrac があればそれ） */
export const wrongPenaltyFrac = (difficulty) => DIFFICULTIES[difficulty]?.penaltyFrac ?? WRONG_PENALTY_FRAC;
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
  hpPerTier: 1.6, // カリキュラム末尾の敵HPは先頭の 1+この値 倍。2026-09-30 2.2→1.6
  dmgPerTier: 3, // 同、敵のダメージ。【2026-09-26】9→5（学年の後半で N/R/SR編成が勝てなくなっていた）→【2026-09-30】5→3（状態異常込みで、学年の最初から最後まで
  //   敵の1回のダメージがパーティHPに対して約5倍に伸び、得意な子でも学年の終わりは1回目の勝率38%だった。playtest-journey.mjs）
  earlyDmg: 0.45, // 序盤(tierが小さい)の敵の攻撃を弱める倍率（tier=0で×earlyDmg → earlyUntilで×1）＝最初の戦闘は勝てる。
  //   2026-09-30：0.42→0.32→0.45（伸び dmgPerTier を下げたので、序盤と終盤の差が大きくなりすぎないよう少し戻した）
  earlyUntil: 0.3,
  // chapterBoss 1.5→1.3（2026-09-30：苦手な子が学年の後半の章ボスに平均5〜6回負け、2割が12回でも勝てなかった）。
  //  raidBase＝協力プレイの裏ボスの土台（章ボスの以前の強さのまま。raid.js）
  bossKindMult: { unitSmallBoss: 1, chapterBoss: 1.3, unitBoss: 1.3, finalBoss: 2, raidBase: 1.5 },
};

// 状態異常のかかりやすさ（2026-09-30：バランス調整のため、ここに集めた。効果の中身＝何ターン続くか等は battleEngine.js の STATUS_DEFS）
//  実際の確率 ＝ baseChance ＋ 技のボーナス − 耐性/100（0〜95%）。耐性100はかからない。
export const STATUS_TUNING = {
  baseChance: { poison: 0.6, paralysis: 0.5, sleep: 0.5, petrification: 0.25, confusion: 0.5 },
  mobShare: 0.6, // 「得意な状態異常」を持つ雑魚の割合
  // 2026-09-30：0.45→0.30／0.3→0.15／0.35→0.2。状態異常のせいで負ける回数が約3倍になっていた（得意・普通の子の小単元の負け：状態異常なし約12回→あり約43回／学年）。
  mobAttackChance: 0.3, // 雑魚の攻撃のうち、状態異常もしかけてくる割合
  mobBonus: 0.15, // 雑魚の状態異常の攻撃のかかりやすさ（確率に足す）
  bossBonus: 0.2, // ボスの状態異常の技のかかりやすさ（確率に足す）
  secretBonus: 0.35, // 裏ボス（やり込み）の複合状態異常のかかりやすさ。裏ボスは状態異常が見せ場なので、ふつうのボスより強めにしておける
};

/**
 * 敵の強さの「位置」(0〜1)。中1は全学年通し87小単元での位置そのまま（＝従来どおり）。
 * 中2・中3は、各学年の先頭を中1の先頭と同じ強さにリセットし、学年の末尾が中1の末尾と同じになるよう伸縮する
 * （中3から始めても、中1と同じバランスで遊べる。2026-09-25）。
 */
export function tierOf(grade, chapterId, subUnitId) {
  const ch = getChapter(grade, chapterId);
  const sub = subUnitId ? subUnitId : ch?.subUnits?.[ch.subUnits.length - 1]?.id;
  const { index, total } = getSubUnitCurriculumPosition(grade, chapterId, sub);
  if (index < 0 || total <= 1) return 0;
  const g1 = SUBUNIT_SEQUENCE.filter((s) => s.grade === 1).length;
  if (Number(grade) === 1 || g1 <= 1) return index / (total - 1);
  const first = SUBUNIT_SEQUENCE.findIndex((s) => s.grade === Number(grade));
  const n = SUBUNIT_SEQUENCE.filter((s) => s.grade === Number(grade)).length;
  if (first < 0 || n <= 1) return 0;
  const g1End = (g1 - 1) / (total - 1); // 中1の末尾の位置
  return ((index - first) / (n - 1)) * g1End;
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
