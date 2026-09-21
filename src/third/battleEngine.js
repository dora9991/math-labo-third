// ============================================================
// battleEngine.js — 戦闘の計算部分（ダメージ・クリティカル・敵の攻撃）。
//
// クリティカル式は gachaRoster.js のヘッダーコメント（9/9・3回目の叩き台）
// をそのまま採用：
//   基礎ダメージ倍率 = 0.5 + P/100
//   クリティカル率   = 5% + P×0.30%
//   クリティカル倍率 = 1.8 + P×0.004
// P = 攻撃キャラの5パラメータのうち、そのステージの章に対応する1つ
//     （CHAPTER_SUBJECT、storyMap.js参照）。5パラメータはゼロサムなので
//     得意な章では輝き、不得意な章では0.7倍・クリ率11%程度に沈む
//     （9/9・3回目の設計どおり）。プレイヤー側のこのダメージ式自体は
//     2026-09-18の敵バランス再設計でも変更していない（後述）。
//
// パーティのHPは共有1本（7/18設計の踏襲）。
// 【2026-09-16】以前はMVPとして1000固定だったが、「今のモンスター編成の合計HPが
// パーティのHPになるようにしたい」への対応で可変にした。編成・レベル・レア度が
// 伸びるほどパーティの最大HPも自然に伸びる（computePartyMaxHp参照）。
// それに合わせて敵のダメージも「今のパーティ最大HPに対する割合」で決める方式に
// 変更した（旧・敵atk絶対値方式は廃止。詳細は下のENEMY DAMAGEセクション）。
// ============================================================

import { getStatsAtLevel } from "./growthCurve.js";
import { mobStats, bossStats } from "./balance.js";

/** 今のパーティ編成からパーティ最大HPを合計する。
 * @param {object[]} partyMembers charactersById由来のキャラ本体の配列（nullを含めない）
 * @param {(character: object) => number} levelFor そのキャラの現在レベルを返す関数
 */
export function computePartyMaxHp(partyMembers, levelFor) {
  return partyMembers.reduce((sum, c) => {
    if (!c) return sum;
    return sum + getStatsAtLevel(c, levelFor(c)).hp;
  }, 0);
}

export function subjectParam(character, subject) {
  return character?.subjects?.[subject] ?? 0;
}

/** 攻撃側のP値から、基礎倍率・クリ率・クリ倍率を返す。 */
export function critProfile(P) {
  return {
    baseMultiplier: 0.5 + P / 100,
    critChance: Math.min(0.95, 0.05 + P * 0.003),
    critMultiplier: 1.8 + P * 0.004,
  };
}

/**
 * プレイヤーの1攻撃を解決する。
 * @param {object} character GACHA_ROSTERのキャラ本体
 * @param {number} level 現在レベル
 * @param {string} subject そのステージの章に対応する系統キー
 * @param {boolean} correct 出題に正解したか
 * @param {object} [options]
 * @param {number} [options.skillMultiplier=1] ダメージ系スキル(aoeDamage/singleDamage)使用時の
 *   実際の倍率（specialistRoster.jsのskill.multiplierをそのまま渡す。2026-09-18：
 *   以前は「スキル使用＝固定1.5倍」の簡易実装だったが、スキルごとのtier別倍率
 *   （1.5/2/2.5/3倍・3/4.5/6/7.5倍）をちゃんと反映するようにした）。
 * @param {number} [options.atkBuffMultiplier=1] buffAtkスキルで今かかっている
 *   攻撃力バフの倍率（無ければ1）。
 */
export function resolvePlayerAttack(character, level, subject, correct, options = {}) {
  if (!correct) {
    return { damage: 0, isCrit: false, correct: false };
  }
  const { skillMultiplier = 1, atkBuffMultiplier = 1 } = options;
  const { atk } = getStatsAtLevel(character, level);
  const P = subjectParam(character, subject);
  const { baseMultiplier, critChance, critMultiplier } = critProfile(P);
  const isCrit = Math.random() < critChance;
  let damage = atk * baseMultiplier * skillMultiplier * atkBuffMultiplier;
  if (isCrit) damage *= critMultiplier;
  return { damage: Math.max(1, Math.round(damage)), isCrit, correct: true };
}

// ============================================================
// ENEMY BALANCE（2026-09-18・kazu指定の数値で全面再設計）。
//
// 個々のキャラの生hp/atk（gachaRoster.js等に格納された値）はそのまま使うが、
// 敵側のHP・ダメージは「適正レベルのパーティならこれくらいのはず」という
// kazu指定の目安テーブルから直接算出する方式にした（以前の「章ごとに逆算した
// 成長曲線」を廃止）。
//
// 【パーティの目安HP・ATK（kazu指定の生値をそのまま関数化）】
//   HPは10レベル刻みの区切りで、区切りが変わるたびにステップがほぼ倍になる
//   （Lv1=100〜Lv9=180は+10/Lv、Lv10=200〜Lv19=380は+20/Lv、以下20/29:+40、
//    30/39:+80、40/49:+160、50/59:+320、60/70:+640、とレベル上限70=UR上限まで）。
//   ATKはHPの半分が目安（kazu指定「攻撃力平均＝HPの全て÷2」）。
//   得意単元で挑む前提なら、そこに×1.4（kazu指定）。
//     ※苦手単元の×0.7はkazu指定の参考値だが、下のベンチマークは全て
//       「得意単元で普通の難易度」を前提にしているため、この計算では未使用。
//
// 【ストーリーの通し位置→適正レベル】
//   pos1（中1第1章）をLv1、pos21（中3最終章）をLv70（UR上限）として線形に
//   割り付けた（kazu指定ではないこちら側の仮定。#todo 実測して調整）。
//
// 【雑魚の同時出現数(1〜3体)ごとの強さ目安（kazu指定のベンチマーク）】
//   3体同時（通常運転）：正解2回で1体撃破（＝波全体では正解6回）
//   2体同時：正解3回で1体撃破（＝波全体では正解6回）
//   1体だけ：正解6回で撃破（＝波全体では正解6回）
//   ボス（小ボス/章ボス/大ボス共通）：正解12回で撃破
//   「正解1回」＝パーティ5体の合計火力がその1体に全部入る前提
//   （敵1体に全火力が集中するケースを基準にする、というのは旧ベンチマークと
//    同じ考え方）。
//
// 【敵の攻撃力（kazu指定）】
//   1体だけの雑魚：2ターンに1回の攻撃で、パーティ最大HPの1/10
//   2体同時の雑魚：2ターンに1回の攻撃で、パーティ最大HPの1/20（1体あたり）
//   3体同時の雑魚：2ターンに1回の攻撃で、パーティ最大HPの1/30（1体あたり）
//   ボス：2ターンに1回の攻撃で、パーティ最大HPの1/5
//   「2ターンに1回」は頭上のカウントダウン(attackCountdown、2 or 3を抽選)と
//   対応させ、実際に3ターン溜めて撃ってきた場合は「相手のタメ具合で調整」
//   （kazu指定）の通り、2ターン基準の1.5倍のダメージにする
//   （resolveEnemyAttackのchargeFactor参照）。
// ============================================================

function averageHpAtLevel(level) {
  const lv = Math.min(70, Math.max(1, Math.round(level)));
  if (lv <= 9) return 100 + 10 * (lv - 1);
  if (lv <= 19) return 200 + 20 * (lv - 10);
  if (lv <= 29) return 400 + 40 * (lv - 20);
  if (lv <= 39) return 800 + 80 * (lv - 30);
  if (lv <= 49) return 1600 + 160 * (lv - 40);
  if (lv <= 59) return 3200 + 320 * (lv - 50);
  return 6400 + 640 * (lv - 60); // lv60〜70
}

const SPECIALTY_ATK_MULT = 1.4; // 得意単元で挑んだ場合の目安倍率（kazu指定）
function averageAtkAtLevel(level) {
  return (averageHpAtLevel(level) / 2) * SPECIALTY_ATK_MULT;
}

// c1〜c7→1〜7、g2c1〜g2c6→8〜13、g3c1〜g3c8→14〜21 の通し位置に変換。
// 章にひもづかない(finalBoss等)場合はnullを返す。
function chapterPosition(chapterId) {
  if (!chapterId) return null;
  let m = /^c(\d+)$/.exec(chapterId);
  if (m) return parseInt(m[1], 10);
  m = /^g2c(\d+)$/.exec(chapterId);
  if (m) return 7 + parseInt(m[1], 10);
  m = /^g3c(\d+)$/.exec(chapterId);
  if (m) return 13 + parseInt(m[1], 10);
  return null;
}
// 学年ごとの最終位置（finalBossの位置算出に使う）。
const GRADE_LAST_POSITION = { 1: 7, 2: 13, 3: 21 };

function appropriateLevelFor(pos) {
  return Math.round(1 + ((pos - 1) * 69) / 20);
}

// パーティ人数（GameContext.jsxのPARTY_SIZEと同じ値。循環import回避のため直書き）。
const PARTY_SIZE_FOR_BALANCE = 5;

function fullPartyRoundDamage(pos) {
  return PARTY_SIZE_FOR_BALANCE * averageAtkAtLevel(appropriateLevelFor(pos));
}

// 雑魚の同時出現数(1〜3体)ごとの「1体を倒すのに必要な正解数」と
// 「1体の1発がパーティ最大HPの何割か」（kazu指定）。
const MOB_TARGET = {
  1: { hitsToKill: 6, hitFraction: 1 / 10 },
  2: { hitsToKill: 3, hitFraction: 1 / 20 },
  3: { hitsToKill: 2, hitFraction: 1 / 30 },
};
const BOSS_TARGET = { hitsToKill: 12, hitFraction: 1 / 5 };

// 大ボス(kind="unitBoss")・学年最終ボス(kind="finalBoss")は、同じ「ボス」枠でも
// もう一段強い、というこれまでの目安を踏襲（kazu指定ではない上乗せ）。
const UNIT_BOSS_HP_MULT = 1.15;
const FINAL_BOSS_HP_MULT = 1.3;

/** そのgachaRosterエンティティの目標HP（絶対値）。kindで雑魚/小ボス/章ボス等を判定。 */
function computeEnemyHp(entry, groupSize) {
  if (entry.kind === "finalBoss") {
    const lastPos = GRADE_LAST_POSITION[entry.grade] ?? 21;
    return fullPartyRoundDamage(lastPos) * BOSS_TARGET.hitsToKill * FINAL_BOSS_HP_MULT;
  }
  const pos = chapterPosition(entry.chapterId);
  if (pos == null) return entry.hp; // secretBoss等、章にひもづかないものは元の値のまま(現状維持)
  if (entry.kind === "unitSmallBoss" || entry.kind === "chapterBoss") {
    return fullPartyRoundDamage(pos) * BOSS_TARGET.hitsToKill;
  }
  if (entry.kind === "unitBoss") {
    return fullPartyRoundDamage(pos) * BOSS_TARGET.hitsToKill * UNIT_BOSS_HP_MULT;
  }
  const target = MOB_TARGET[groupSize] || MOB_TARGET[3]; // kind === "unit"（雑魚）
  return fullPartyRoundDamage(pos) * target.hitsToKill;
}

/** その敵の1発が、パーティ最大HPの何割か（kindと同時出現数で決まる）。 */
function computeEnemyHitFraction(entry, groupSize) {
  if (
    entry.kind === "finalBoss" ||
    entry.kind === "unitSmallBoss" ||
    entry.kind === "chapterBoss" ||
    entry.kind === "unitBoss"
  ) {
    return BOSS_TARGET.hitFraction;
  }
  const pos = chapterPosition(entry.chapterId);
  if (pos == null) return 0.05; // secretBoss等、章にひもづかないものの暫定値
  return (MOB_TARGET[groupSize] || MOB_TARGET[3]).hitFraction;
}

/** 敵の頭上に出す「あと何ラウンドで反撃してくるか」の数字（2026-09-17追加）。
 * 0になった敵だけがその反撃フェーズで実際に攻撃し、攻撃し終えたらまた
 * この範囲で引き直す（Battle.jsx側の各敵のattackCountdownを参照）。 */
export function rollAttackCountdown() {
  return 2 + Math.floor(Math.random() * 2); // 2 or 3
}

/** 敵の1攻撃（パーティ共有HPへのダメージ）。「2ターンに1回でパーティ最大HPの
 *  enemy.hitFraction」を基準に、実際に溜めたターン数(enemy.attackChargeTurns)に
 *  比例させ（3ターン溜めたら1.5倍、というように）、さらに乱数±20%で決める。 */
export function resolveEnemyAttack(enemy, partyMaxHp) {
  const chargeFactor = (enemy.attackChargeTurns ?? 2) / 2;
  const variance = 0.8 + Math.random() * 0.4;
  const dmg = partyMaxHp * (enemy.hitPercent ?? 0.05) * chargeFactor * variance;
  return Math.max(1, Math.round(dmg));
}

/** グループ内の敵インスタンスを作る（1〜3組の雑魚は同一キャラを使い回す）。
 * 【数学ラボ3】HP・ダメージは balance.js の絶対値（30秒ゲージ方式）。
 * @param {number} groupSize このバトルで同時に出現する雑魚の数（1〜3）。
 * @param {number} t カリキュラム上の位置(0〜1)。 */
export function spawnEnemyGroup(baseEnemy, groupIndex, groupSize, t = 0) {
  const groupBonus = 1 + groupIndex * 0.08; // 後の組ほど少しだけ硬く・強くする
  const st = mobStats(groupSize, t);
  const hp = Math.round(st.hp * groupBonus);
  return {
    ...baseEnemy,
    instanceId: `${baseEnemy.id}_g${groupIndex}`,
    hp,
    maxHp: hp,
    dmg: Math.round(st.dmg * groupBonus),
  };
}

export function spawnBoss(bossEntry, t = 0) {
  const st = bossStats(bossEntry.kind, t);
  return {
    ...bossEntry,
    instanceId: `${bossEntry.id}_boss`,
    hp: st.hp,
    maxHp: st.hp,
    dmg: st.dmg,
  };
}

/** 敵1体の1回の行動ダメージ（絶対値＋乱数±20%）。 */
export function resolveEnemyAction(enemy) {
  const variance = 0.8 + Math.random() * 0.4;
  return Math.max(1, Math.round((enemy.dmg ?? 1) * variance));
}

// ============================================================
// 状態異常（毒/麻痺/封印/スロー/混乱/石化）システム（2026-09-18）。
//
// 【誰が誰にかけるか】kazu確認済み：敵の攻撃がパーティにかける（雑魚敵にも
// 状態異常持ちが出てくる）。プレイヤー側のダメージ系スキル(aoeDamage/
// singleDamage)は状態異常を狙わない。プレイヤー側の cure 系スキルだけが
// 「治す」側として関わる（下のcureStatusEffects参照）。
//
// 【基礎確率（kazu指定）】毒60%・麻痺50%・石化25%・封印70%・混乱50%。
//   スロー(slow)だけ指定が無かったため、同じ中位グループ（麻痺・混乱）に
//   合わせて50%を仮値にした（#todo kazuに確認）。
//   「キャラクターそれぞれに判定がある」（kazu指定）＝1体ずつ個別に抽選し、
//   そのキャラ自身の耐性(resistances、0-100。specialistRoster.js参照)で
//   基礎確率を引き下げる単純な引き算式（rollStatusInflict）。
//   敵が1回攻撃するたびに、6種類から1つだけランダムに選んで抽選する
//   （毎回全種類判定すると発生しすぎるため。rollEnemyInflictedStatus）。
//
// 【効果の中身（kazu指定・2026-09-18）】
//   毒　　：毎ターン、パーティ最大HPの1/5のダメージ。3ターン継続。
//   麻痺　：2ターンの間、行動できない（攻撃もスキルも不可）。
//   封印　：3ターンの間、スキルが使えない（通常攻撃はできる）。
//   スロー：4ターンの間、2ターンに1回しか行動できない。
//   混乱　：2ターンの間、攻撃が敵ではなく味方（＝パーティ自身の共有HP）に
//           向く。ダメージは通常の1/10。
//   石化　：治療されるまでずっと行動できない（ターン経過では治らない）。
//           パーティ全員が同時に石化した場合はその時点で敗北。
// ============================================================
const STATUS_BASE_CHANCE = {
  poison: 0.6,
  paralysis: 0.5,
  petrification: 0.25,
  seal: 0.7,
  confusion: 0.5,
  slow: 0.5, // #todo kazu指定に無かったための仮値
};

export const STATUS_DEFS = {
  poison: { durationTurns: 3, dotFraction: 1 / 12 }, // 数学ラボ3：時計は「敵の行動1回」ごと。math-worldの1/5だと重すぎるため1/12
  paralysis: { durationTurns: 2 },
  seal: { durationTurns: 3 },
  slow: { durationTurns: 4 },
  confusion: { durationTurns: 2, damageFraction: 1 / 10 },
  petrification: {}, // durationなし＝cureStatusEffectsで治すまで解除されない
};

/** その状態異常が、この1体にかかるかどうかを判定する（キャラ1体ごとに別判定）。 */
export function rollStatusInflict(statusKey, character) {
  const base = STATUS_BASE_CHANCE[statusKey];
  if (base == null) return false; // 対応していない状態異常キー
  const resist = character?.resistances?.[statusKey] ?? 0;
  const chance = Math.max(0, base - resist / 100);
  return Math.random() < chance;
}

/** 敵の1攻撃が、狙った1体に状態異常も仕掛けてくるかどうか。6種類から1つだけ
 * ランダムに選んで抽選する（毎回全種類判定すると発生しすぎるため）。
 * かからなければnullを返す。 */
export function rollEnemyInflictedStatus(targetCharacter) {
  const keys = Object.keys(STATUS_BASE_CHANCE);
  const key = keys[Math.floor(Math.random() * keys.length)];
  return rollStatusInflict(key, targetCharacter) ? key : null;
}

/** statusByCharId（{characterId: {statusKey: {turnsLeft, readyToAct?}}}）に
 * 1体ぶんの状態異常を新規付与する（同じ状態異常が既にあれば継続ターンを
 * 上書きする＝再度かかると仕切り直しになる、というシンプルな仕様）。 */
export function applyStatusEffect(statusByCharId, characterId, statusKey) {
  const def = STATUS_DEFS[statusKey];
  if (!def) return statusByCharId;
  const state = def.durationTurns ? { turnsLeft: def.durationTurns } : { active: true };
  if (statusKey === "slow") state.readyToAct = false; // かかった次のターンはまだ動けない
  return {
    ...statusByCharId,
    [characterId]: { ...statusByCharId[characterId], [statusKey]: state },
  };
}

/** そのキャラが今ラウンド行動できるか（麻痺・石化は不可、スローは4ターンの間
 * 2ターンに1回だけ）。 */
export function canActThisRound(effects) {
  if (!effects) return true;
  if (effects.paralysis || effects.petrification) return false;
  if (effects.slow && !effects.slow.readyToAct) return false;
  return true;
}

export function canUseSkillThisRound(effects) {
  return !(effects && effects.seal);
}

export function isConfusedThisRound(effects) {
  return !!(effects && effects.confusion);
}

/** パーティ全員（生存メンバー）が同時に石化しているか＝敗北条件。 */
export function isPartyAllPetrified(statusByCharId, partyMemberIds) {
  return partyMemberIds.length > 0 && partyMemberIds.every((id) => statusByCharId[id]?.petrification);
}

/** 1ラウンドぶんの状態異常の経過処理。
 *  ・毒のダメージ合計を返す（パーティ共有HPから引くのはBattle.jsx側の役目）
 *  ・スローのreadyToActを反転させる（今ターン動けたら次は動けない、を繰り返す）
 *  ・石化以外は継続ターンを1減らし、0になったものは取り除く
 * @returns {{ statusByCharId: object, poisonDamage: number }}
 */
export function tickStatusEffects(statusByCharId, partyMaxHp) {
  let poisonDamage = 0;
  const next = {};
  for (const [charId, effects] of Object.entries(statusByCharId)) {
    const nextEffects = {};
    for (const [key, state] of Object.entries(effects)) {
      if (key === "poison") {
        poisonDamage += Math.round(partyMaxHp * STATUS_DEFS.poison.dotFraction);
      }
      if (key === "petrification") {
        nextEffects[key] = state; // 治療されるまで消えない
        continue;
      }
      if (key === "slow") {
        const turnsLeft = state.turnsLeft - 1;
        if (turnsLeft > 0) nextEffects[key] = { turnsLeft, readyToAct: !state.readyToAct };
        continue;
      }
      const turnsLeft = state.turnsLeft - 1;
      if (turnsLeft > 0) nextEffects[key] = { turnsLeft };
    }
    if (Object.keys(nextEffects).length) next[charId] = nextEffects;
  }
  return { statusByCharId: next, poisonDamage };
}

/** cure系スキルで指定の状態異常（例:["poison","paralysis"]）をパーティ全員から取り除く。 */
export function cureStatusEffects(statusByCharId, cures) {
  const next = {};
  for (const [charId, effects] of Object.entries(statusByCharId)) {
    const remaining = { ...effects };
    for (const key of cures) delete remaining[key];
    if (Object.keys(remaining).length) next[charId] = remaining;
  }
  return next;
}
