// ============================================================
// partners.js — 「なかま（仲間モンスター）」のルール（純関数のみ）
//
//  ・バトルで「魔物のエサ」を使った敵をたおすと、一定確率で仲間になる
//    （ザコ50%／ボス25%・その敵の単元を簡単/普通/難しい全て★1以上が条件）。
//  ・仲間はコイン/クリスタルで「餐やり」してレベルを上げると強くなる。
//  ・「ストック」最大4体まで編成でき、そのうち1体を「アクティブ」にすると、
//    バトルに主人公とともに参戦して一緒に戦う（残り3体は控え＝参戦しない）。
//
//  ※ ここは monsters.js / battle.js を import しない（循環参照を避ける）。
//    モンスター定義が要る処理は monster オブジェクトを引数で受け取る。
// ============================================================

// ストック（編成）に入れられる最大数。うち1体だけがバトルに参戦する。
export const PARTY_MAX = 4;

// 魔物のエサの値段（items.js の bait と一致させる）
export const BAIT_COST = 500;

// 仲間になる確率（エサ使用済みの敵をたおしたとき）
export const RECRUIT_CHANCE = { zako: 0.5, boss: 0.25 };

// なかまレベルの上限（ティアが高いほど高くまで育つ＝ボスは強い仲間になる）
export const PARTNER_MAX_LEVEL = { unit: 25, boss: 40, final: 50 };

/** モンスターのティア（"unit" | "boss" | "final"）。monster.kind から判定。 */
export function partnerTierOf(monster) {
  if (!monster) return "unit";
  if (monster.kind === "finalBoss") return "final";
  if (monster.kind === "chapterBoss") return "boss";
  return "unit";
}

/** そのモンスターを仲間にできる確率（ボス/魔王=25%・それ以外=50%） */
export function recruitChance(monster) {
  const t = partnerTierOf(monster);
  return t === "unit" ? RECRUIT_CHANCE.zako : RECRUIT_CHANCE.boss;
}

/** そのモンスターのなかまレベル上限 */
export function partnerMaxLevel(monster) {
  return PARTNER_MAX_LEVEL[partnerTierOf(monster)] || PARTNER_MAX_LEVEL.unit;
}

/**
 * 仲間モンスターのバトル用ステータス（HP・攻撃力）。
 *  敵としての強さ(monster.atk)とレベルから算出（深い敵・高Lvほど強い仲間）。
 *   攻撃力 = monster.atk × (0.5 + (atkLv-1)*0.07)   ← クリスタルで強化
 *   最大HP = monster.atk × 4 × (0.6 + (hpLv-1)*0.09) ← お金で強化
 * @returns {{maxHp:number, atk:number}}
 */
export function allyStats(monster, hpLv = 1, atkLv = 1) {
  const base = Math.max(4, monster?.atk || 8);
  const hL = Math.max(1, hpLv);
  const aL = Math.max(1, atkLv);
  // ★要望により仲間をさらに強化。仲間にした直後（Lv1）の基礎値と育成の伸びを引き上げ。
  //   攻撃 = base × (1.25 + (atkLv-1)*0.16)     HP = base × 6 × (1.15 + (hpLv-1)*0.18)
  const atk = Math.max(1, Math.round(base * (1.25 + (aL - 1) * 0.16)));
  const maxHp = Math.max(12, Math.round(base * 6 * (1.15 + (hL - 1) * 0.18)));
  return { maxHp, atk };
}

// なかま育成は「HPレベル(hpLv)」「攻撃レベル(atkLv)」を別々に持つ。
//  ・HPレベル   … お金(コイン)で上げる
//  ・攻撃レベル … クリスタルで上げる
//  旧データ（単一の lv だけ）も動くよう、未設定なら lv → 両方にフォールバックする。
/** なかま記録 e の HPレベル（旧 lv 互換） */
export function partnerHpLv(e) {
  return Math.max(1, e?.hpLv ?? e?.lv ?? 1);
}
/** なかま記録 e の 攻撃レベル（旧 lv 互換） */
export function partnerAtkLv(e) {
  return Math.max(1, e?.atkLv ?? e?.lv ?? 1);
}

// 育成の種類：HP=お金で +1Lv／攻撃=クリスタルで +1Lv
export const FEED_KINDS = {
  hp:  { id: "hp",  label: "HPアップ",  icon: "❤️", stat: "hpLv",  levels: 1 },
  atk: { id: "atk", label: "攻撃アップ", icon: "⚔️", stat: "atkLv", levels: 1 },
};

/**
 * 現在レベル lv のステータスを1段階上げるコスト。
 *  HP（お金）        ：40 + lv*30 コイン
 *  攻撃（クリスタル）：2 + floor(lv/4) クリスタル
 * @returns {{coins:number, crystals:number, levels:number}}
 */
export function feedCost(lv = 1, kind = "hp") {
  const L = Math.max(1, lv);
  if (kind === "atk") {
    return { coins: 0, crystals: 2 + Math.floor(L / 4), levels: FEED_KINDS.atk.levels };
  }
  return { coins: 40 + L * 30, crystals: 0, levels: FEED_KINDS.hp.levels };
}
