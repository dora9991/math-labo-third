// ============================================================
// items.js — 新アイテムシステム（2026-07-19復活・ガチャ方式）
//  旧 engine/items.js（ショップで購入・1個だけ所持）とは別物・共存させる。
//  ガチャで手に入れ、最大10個までストック（合計）、バトルには最大2種類まで持ち込める。
//  設計: Obsidian「設計_単元別戦闘力とHP1000化_2026-07-18」
// ============================================================

export const ITEM_STOCK_MAX = 10;    // ストック上限（全種類合計の個数）
export const ITEM_BRING_MAX = 2;     // バトルに持ち込める種類数
// ガチャ費用（2026-07-19値上げ）：その日の1回目は150G、2回目以降は1回ごとに+50G。
// 翌日になるとまた150Gから（player.itemGachaPullsToday/itemGachaLastPullDateで管理・App.jsx側）。
export const ITEM_GACHA_BASE_COST = 150;
export const ITEM_GACHA_STEP_COST = 50;

/** その日pullsToday回すでに引いている状態で、次の1回にかかる費用 */
export function itemGachaCost(pullsToday) {
  return ITEM_GACHA_BASE_COST + ITEM_GACHA_STEP_COST * (pullsToday || 0);
}

// HP回復は最大HPに対する割合（%）で効く＝れんしゅうスライム戦(HP1000)でもハート制の戦いでも同じ感覚で使える。
// SP回復・継続回復（ターンごとに%回復）も同様に、強い効果ほどガチャで少し出づらい重みにしてある。
export const ITEMS = [
  // ── HP回復（4段階。強いほど出づらい） ──
  { id: "heal_1", name: "回復薬",       icon: "🧪", kind: "healPct", pct: 0.30, weight: 0.16, color: "#4ade80", desc: "HPを最大の30%回復する" },
  { id: "heal_2", name: "上級回復薬",   icon: "💊", kind: "healPct", pct: 0.50, weight: 0.10, color: "#22c55e", desc: "HPを最大の50%回復する" },
  { id: "heal_3", name: "特上回復薬",   icon: "🍶", kind: "healPct", pct: 0.70, weight: 0.06, color: "#16a34a", desc: "HPを最大の70%回復する" },
  { id: "heal_4", name: "万能回復薬",   icon: "⚗️", kind: "healPct", pct: 1.00, weight: 0.02, color: "#065f46", desc: "HPを全回復する" },
  // ── SP回復（3段階。強いほど出づらい） ──
  { id: "sp_1", name: "気付けの粉",   icon: "✨", kind: "sp", power: 3,  weight: 0.14, color: "#60a5fa", desc: "SPを3回復する" },
  { id: "sp_2", name: "魔力の結晶",   icon: "🔮", kind: "sp", power: 6,  weight: 0.08, color: "#818cf8", desc: "SPを6回復する" },
  { id: "sp_3", name: "賢者の秘薬",   icon: "💎", kind: "sp", power: 10, weight: 0.03, color: "#4f46e5", desc: "SPを全回復する（+10）" },
  // ── 継続回復（毎ターン最大HPの%ぶん回復。3ターン。強いほど出づらい） ──
  { id: "regen_1", name: "癒しの葉",   icon: "🍃", kind: "regenPct", regenPct: 0.20, turns: 3, weight: 0.08, color: "#86efac", desc: "3ターン、毎ターンHPが最大の20%回復する" },
  { id: "regen_2", name: "再生の実",   icon: "🌺", kind: "regenPct", regenPct: 0.40, turns: 3, weight: 0.03, color: "#f472b6", desc: "3ターン、毎ターンHPが最大の40%回復する" },
  // ── 状態異常治療 ──
  { id: "cure_poison", name: "毒消し草",       icon: "🌿", kind: "curePoison",             weight: 0.16, color: "#a3e635", desc: "毒を治す" },
  { id: "cure_status", name: "万能薬",         icon: "💠", kind: "cureStatus",             weight: 0.02, color: "#67e8f9", desc: "眠り・毒・時間妨害・麻痺をすべて治す" },
  // ── バフ系 ──
  { id: "atk_up",      name: "闘志の実",       icon: "🔥", kind: "atkUp",      mult: 1.5, turns: 3, weight: 0.06, color: "#fca5a5", desc: "3ターン 与えるダメージ+50%" },
  { id: "dmg_reduce",  name: "守りのお守り",   icon: "🛡️", kind: "dmgReduce", reduce: 0.4, turns: 3, weight: 0.06, color: "#93c5fd", desc: "3ターン 受けるダメージ-40%" },
];

export function findItem(id) {
  return ITEMS.find((i) => i.id === id) || null;
}

/** アイテムガチャを1回引く → itemId（重み付き抽選） */
export function rollItemGacha(rand = Math.random) {
  const t = rand();
  let acc = 0;
  for (const it of ITEMS) { acc += it.weight; if (t < acc) return it.id; }
  return ITEMS[ITEMS.length - 1].id;
}

/** アイテムの効果を短い一言に（アイテム画面・バトル画面で共通表示） */
export function itemSummary(item) {
  if (!item) return "";
  if (item.kind === "healPct") return `HP+${Math.round(item.pct * 100)}%`;
  if (item.kind === "sp") return `SP+${item.power}`;
  if (item.kind === "regenPct") return `${item.turns}T 毎ターンHP+${Math.round(item.regenPct * 100)}%`;
  if (item.kind === "curePoison") return "どく治療";
  if (item.kind === "cureStatus") return "状態異常ぜんぶ治療";
  if (item.kind === "atkUp") return `${item.turns}T 与ダメ+${Math.round((item.mult - 1) * 100)}%`;
  if (item.kind === "dmgReduce") return `${item.turns}T 被ダメ-${Math.round(item.reduce * 100)}%`;
  return item.desc || "";
}
