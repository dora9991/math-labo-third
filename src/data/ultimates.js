// ============================================================
// ultimates.js — 必殺技ガチャ（2026-07-19設計・同日追記で20種類に拡張）
//  お金（💰コイン）を払ってガチャを回し、必殺技を集める（ダブりなし）。
//  1発のダメージ倍率はどんなに強くても最大5倍まで（ULT_MULT_CAP）。倍率は3.5などの
//  小数もOK。一部は状態異常（敵への毒・しびれ）も付与できるが、強くなりすぎないよう
//  毒はごく少量の固定ダメージ・しびれは低確率&1ターンのみに抑えてある。
//  設計: Obsidian「設計_単元別戦闘力とHP1000化_2026-07-18」
// ============================================================

export const ULT_MULT_CAP = 5;               // 1発ダメージの最大倍率（絶対上限）
// ガチャ費用（2026-07-19値上げ）：1回目700G、2回目以降は1回ごとに+200G（リセット無し＝集めるほど高くなる）。
export const ULTIMATE_GACHA_BASE_COST = 700;
export const ULTIMATE_GACHA_STEP_COST = 200;
export const DEFAULT_ULTIMATE_ID = "fire";   // 最初から持っている必殺技（recordSchema.jsの初期値と一致させる）

/** pullsSoFar回すでに引いている（＝ダブり無しなのでownedUltimatesの所持数-1と同じ）状態で、次の1回にかかる費用 */
export function ultimateGachaCost(pullsSoFar) {
  return ULTIMATE_GACHA_BASE_COST + ULTIMATE_GACHA_STEP_COST * (pullsSoFar || 0);
}

export const ULTIMATES = [
  // ── 初級（3.0倍・状態異常なし） ──
  { id: "fire",       name: "ファイアバースト",   icon: "🔥", mult: 3.0, weight: 0.09, color: "#f87171", desc: "紅蓮の一撃（最初から使える）" },
  { id: "aqua",       name: "アクアブラスト",     icon: "💧", mult: 3.0, weight: 0.09, color: "#60a5fa", desc: "奔流の一撃" },
  { id: "wind",       name: "ウィンドスラッシュ", icon: "🌪️", mult: 3.0, weight: 0.09, color: "#a7f3d0", desc: "疾風の一撃" },
  // ── 中級（3.5倍・状態異常なし） ──
  { id: "rock",       name: "ロックスマッシュ",   icon: "🪨", mult: 3.5, weight: 0.07, color: "#d6bc8c", desc: "岩石の一撃" },
  { id: "thunder",    name: "サンダーストライク", icon: "⚡", mult: 3.5, weight: 0.07, color: "#facc15", desc: "雷光の一撃" },
  { id: "ice",        name: "アイスニードル",     icon: "❄️", mult: 3.5, weight: 0.07, color: "#7dd3fc", desc: "氷結の一撃" },
  // ── 中級・状態異常つき（威力控えめの3.0倍） ──
  { id: "shadow",     name: "シャドウバインド",   icon: "🌑", mult: 3.0, weight: 0.06, color: "#a78bfa", desc: "闇の一撃。低確率で敵をしびれさせる",
    inflict: { kind: "stun", turns: 1, chance: 0.35 } },
  { id: "venom",      name: "ヴェナムファング",   icon: "🐍", mult: 3.0, weight: 0.06, color: "#a3e635", desc: "毒牙の一撃。敵に少しだけ毒を残す",
    inflict: { kind: "poison", turns: 2, dmg: 25 } },
  // ── 上級（4.0倍・状態異常なし） ──
  { id: "meteor",     name: "メテオ",             icon: "☄️", mult: 4.0, weight: 0.045, color: "#fb923c", desc: "隕石の一撃" },
  { id: "quake",      name: "アースクエイク",     icon: "🌋", mult: 4.0, weight: 0.045, color: "#c2410c", desc: "大地の一撃" },
  { id: "tempest",    name: "テンペスト",         icon: "🌊", mult: 4.0, weight: 0.045, color: "#0ea5e9", desc: "大嵐の一撃" },
  { id: "blaze",      name: "ブレイズカノン",     icon: "💥", mult: 4.0, weight: 0.045, color: "#ef4444", desc: "業火の一撃" },
  // ── 上級・特殊効果つき（威力を抑えて3.5倍） ──
  { id: "drain",      name: "ドレインタッチ",     icon: "🦇", mult: 3.5, weight: 0.035, color: "#c084fc", desc: "与えたダメージの25%を吸収して自分のHPを回復",
    lifesteal: 0.25 },
  { id: "plague",     name: "プレイグタッチ",     icon: "🦂", mult: 3.0, weight: 0.035, color: "#84cc16", desc: "呪毒の一撃。敵に少しだけ毒を残す",
    inflict: { kind: "poison", turns: 2, dmg: 25 } },
  { id: "stormbind",  name: "ストームバインド",   icon: "🌀", mult: 3.5, weight: 0.035, color: "#818cf8", desc: "電磁の一撃。低確率で敵をしびれさせる",
    inflict: { kind: "stun", turns: 1, chance: 0.35 } },
  // ── 特級（4.5倍・状態異常なし） ──
  { id: "holyray",    name: "ホーリーレイ",       icon: "✨", mult: 4.5, weight: 0.02, color: "#fde047", desc: "光の一撃" },
  { id: "voidcannon", name: "ヴォイドキャノン",   icon: "🕳️", mult: 4.5, weight: 0.02, color: "#6b7280", desc: "虚空の一撃" },
  // ── 特級・状態異常つき（威力を抑えて4.0倍） ──
  { id: "dragonroar", name: "ドラゴンロア",       icon: "🐉", mult: 4.0, weight: 0.015, color: "#22d3ee", desc: "竜の咆哮。低確率で敵をしびれさせる",
    inflict: { kind: "stun", turns: 1, chance: 0.35 } },
  // ── 最高レア（5.0倍・最大倍率） ──
  { id: "judgment",   name: "しんぱん",           icon: "⚖️", mult: 5.0, weight: 0.03, color: "#f472b6", desc: "最大倍率！ 裁きの一撃" },
  { id: "ultima",     name: "アルティマ",         icon: "🌟", mult: 5.0, weight: 0.03, color: "#fde047", desc: "最大倍率！ 光り輝く一撃" },
];

export function findUltimate(id) {
  return ULTIMATES.find((u) => u.id === id) || ULTIMATES[0];
}

/** 必殺技ガチャを1回引く → ultimateId（重み付き抽選。poolを渡すとその中だけで抽選＝ダブり無し用） */
export function rollUltimateGacha(pool = ULTIMATES, rand = Math.random) {
  const total = pool.reduce((s, u) => s + u.weight, 0);
  if (total <= 0) return null;
  let t = rand() * total, acc = 0;
  for (const u of pool) { acc += u.weight; if (t < acc) return u.id; }
  return pool[pool.length - 1].id;
}

/** 実際に使う倍率（データ側の値が万一CAPを超えていても安全側にクランプ） */
export function ultimateMult(ult) {
  return Math.min(ULT_MULT_CAP, ult?.mult || 3);
}
