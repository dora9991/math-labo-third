import { GACHA } from "./gachaConfig.js";
// ============================================================
// growthCurve.js — レア度別のレベル上限とステータス成長カーブ
//  2026-09-11追加：
//
//  GACHA_ROSTER（gachaRoster.js）に格納されている hp/atk は
//  「そのキャラのレベルMAX（上限）到達時の数値」として扱う。
//  レベル1〜上限のあいだは、このファイルの statAtLevel() で
//  hp/atk を上限値からスケールダウンして算出する。
//
//  【レベル上限（レア度で決まる・kazu指定）】
//    N=30 / R=40 / SR=50 / UR=70
//    レアが高いほど育成に時間がかかる代わりに天井が高い
//    （8/11設計「誰でも最強になれるが最初は上限あり」のレア度版）。
//
//  【成長カーブ＝一次関数（線形）】
//    レベル1 を上限値の GROWTH_START_RATIO(=30%) とし、
//    レベル上限で100%（＝GACHA_ROSTERの生データそのまま）になるよう線形補間する。
//    シンプルさ優先（9/9・3回目の一貫方針＝基本はシンプルに）で、
//    折れ線・二次カーブ等は採用していない。開始比率30%は仮置き
//    （#todo 実プレイでの体感を見て調整）。
//
//  【5パラメータ(calc/eq/func/geo/data)は対象外】
//    レベルでは成長させない。5パラメータは「そのキャラの得意/不得意の形」
//    （ゼロサムの内訳）を表す指標で、クリティカル式が直接参照するため、
//    レベルで動かすとゼロサムの意味（誰でも最強を防ぐ）が別の変数で
//    崩れてしまう。育成で伸ばすのは hp/atk（＝生の強さ）だけ、
//    得意分野の"形"はレベルに関わらず固定、という役割分担にした。
// ============================================================

export const LEVEL_CAP_BY_RARITY = {
  N: 30,
  R: 40,
  SR: 50,
  UR: 70,
};

// レベル1時点で上限値の何%まで出ているか（仮置き・#todo調整）
export const GROWTH_START_RATIO = 0.5;

// ------------------------------------------------------------
// 【数学ラボ3・2026-09-21】火力の幅を「初期N×5(Lv1)→最強UR×5(Lv70)で約10倍」に収める。
//  math-worldは約25〜30倍（ラボ1のインフレの種）だったため、
//   ・Lv1の開始比率を 30% → 50% に引き上げ（GROWTH_START_RATIO）
//   ・レア度による上限値の差を「基準値からの累乗(指数<1)」で圧縮（compressMax）
//  の2つで縮める。指数が小さいほどレア度差が縮む（1.0でmath-worldと同じ）。
//  hp/atkの元データ(specialistRoster.js等)はそのまま。ここで換算するだけ。
// ------------------------------------------------------------
export const POWER_EXPONENT = { atk: 0.6, hp: 0.85 };
const POWER_REF = { atk: 200, hp: 900 }; // N（ノーマル）の上限値の目安（＝圧縮の基準点）
export function compressMax(maxStat, kind = "atk") {
  const ref = POWER_REF[kind] ?? POWER_REF.atk;
  const g = POWER_EXPONENT[kind] ?? 1;
  return ref * Math.pow(Math.max(1, maxStat) / ref, g);
}

/** そのレア度のレベル上限を返す。未知のレア度は安全側でNの上限を返す。 */
export function getLevelCap(rarity) {
  return LEVEL_CAP_BY_RARITY[rarity] ?? LEVEL_CAP_BY_RARITY.N;
}

/**
 * 上限値(maxStat)・現在レベル・レア度から、そのレベル時点のステータスを返す。
 * レベルは 1〜上限にクランプする（上限を超えた入力・0以下の入力も安全に丸める）。
 * レベル上限に達すると必ず maxStat と等しくなる（＝「上限の数値になる」を保証）。
 */
export function statAtLevel(maxStat, level, rarity, kind = "atk") {
  maxStat = compressMax(maxStat, kind);
  const cap = getLevelCap(rarity);
  const lv = Math.min(Math.max(1, Math.round(level)), cap);
  if (cap <= 1) return Math.round(maxStat);
  const ratio =
    GROWTH_START_RATIO +
    (1 - GROWTH_START_RATIO) * ((lv - 1) / (cap - 1));
  return Math.round(maxStat * ratio);
}

/**
 * キャラ(GACHA_ROSTERの1件)とレベルから、そのレベル時点のhp/atkを算出して返す。
 * subjects（5パラメータ）はレベルに関わらずキャラ本来の値をそのまま返す。
 */
export function getStatsAtLevel(character, level) {
  // 限界突破(凸)：ガチャの被りごとに hp/atk が +5%（最大4回＝+20%）。character.breaks に入っている。
  const boost = 1 + GACHA.breakBonus * Math.min(GACHA.maxBreaks, Math.max(0, character.breaks || 0));
  const cap = getLevelCap(character.rarity);
  const lv = Math.min(Math.max(1, Math.round(level)), cap);
  return {
    level: lv,
    levelCap: cap,
    isMaxLevel: lv === cap,
    hp: Math.round(statAtLevel(character.hp, lv, character.rarity, "hp") * boost),
    atk: Math.round(statAtLevel(character.atk, lv, character.rarity, "atk") * boost),
    subjects: character.subjects,
  };
}
