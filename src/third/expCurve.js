// ============================================================
// expCurve.js — 経験値→レベルの換算。
// 2026-09-18：kazu指定の必要経験値テーブルに置き換えた（以前は20+lv*8の仮置き）。
//   Lv1→2から10レベルごとに区切り、区切りが変わるたびにステップがほぼ倍になる
//   （1〜9は+30/Lv、10〜19は+50、20〜29は+100、30〜39は+200、40〜49は+400、
//    50〜59は+800、60〜69は+1600。Lv69→70で32000、レア度のレベル上限
//    （growthCurve.js）の最大値=UR70と一致する）。
//   レベル上限に達したら経験値をこれ以上レベルに反映しない。
// ============================================================

import { getLevelCap } from "./growthCurve.js";
import { getSubUnitCurriculumPosition } from "./data/storyMap.js";

export function expToNext(level) {
  if (level <= 9) return 30 * (level + 1);
  if (level <= 19) return 350 + 50 * (level - 10);
  if (level <= 29) return 900 + 100 * (level - 20);
  if (level <= 39) return 2000 + 200 * (level - 30);
  if (level <= 49) return 4200 + 400 * (level - 40);
  if (level <= 59) return 8600 + 800 * (level - 50);
  return 17600 + 1600 * (level - 60); // level 60〜69
}

/** 累積EXPからレベルを算出する（レア度の上限でクランプ）。 */
export function levelFromExp(totalExp, rarity) {
  const cap = getLevelCap(rarity);
  let level = 1;
  let remaining = totalExp;
  while (level < cap) {
    const need = expToNext(level);
    if (remaining < need) break;
    remaining -= need;
    level += 1;
  }
  return level;
}

/** 指定レベルに到達するのに必要な累計EXP（管理モードの「レベルを指定」用）。 */
export function expForLevel(targetLevel) {
  let total = 0;
  for (let lv = 1; lv < targetLevel; lv++) total += expToNext(lv);
  return total;
}

// ============================================================
// 小単元クリア報酬（2026-09-21改訂・kazu指定）：「1回のクリアで上がるレベル数」で設計する。
//   最初の小単元＝約1.5レベル上がる ／ 最後の小単元＝約1/3レベル（＝3回クリアで1レベル）。
//   その間は幾何補間でなだらかに減る（全学年通し87小単元。1周でLv68前後。上限Lv70は周回・ボスで届く）。
//   経験値テーブル(expToNext)は変えず、「今のレベルから r レベル分」の経験値を報酬にする。
// ============================================================
const REWARD_LEVELS_START = 1.5;
const REWARD_LEVELS_END = 1 / 3;

/** 端数レベル(1.5＝Lv1とLv2の中間…Lv2に向かう途中ではなく、Lv1→2の半分)に対応する累計EXP。 */
function expAtLevelFloat(x) {
  const lv = Math.floor(x);
  return expForLevel(lv) + (x - lv) * expToNext(lv);
}

let rewardCache = null;
function subUnitRewardTable(total) {
  if (rewardCache && rewardCache.length === total) return rewardCache;
  const q = total > 1 ? Math.pow(REWARD_LEVELS_END / REWARD_LEVELS_START, 1 / (total - 1)) : 1;
  let level = 1;
  rewardCache = Array.from({ length: total }, (_, i) => {
    const next = Math.min(70, level + REWARD_LEVELS_START * Math.pow(q, i));
    const gain = Math.round(expAtLevelFloat(next) - expAtLevelFloat(level));
    level = next;
    return gain;
  });
  return rewardCache;
}

/** その小単元を丸ごとクリアしたときの総獲得経験値（カリキュラム上の位置で決まる）。 */
export function getSubUnitClearExpReward(grade, chapterId, subUnitId) {
  const { index, total } = getSubUnitCurriculumPosition(grade, chapterId, subUnitId);
  const table = subUnitRewardTable(Math.max(total, 1));
  if (index < 0 || total <= 1) return table[0];
  return table[index];
}

export function expProgress(totalExp, rarity) {
  const level = levelFromExp(totalExp, rarity);
  const cap = getLevelCap(rarity);
  if (level >= cap) return { level, cap, current: 0, need: 0, isMax: true };
  let remaining = totalExp;
  for (let lv = 1; lv < level; lv++) remaining -= expToNext(lv);
  return { level, cap, current: remaining, need: expToNext(level), isMax: false };
}
