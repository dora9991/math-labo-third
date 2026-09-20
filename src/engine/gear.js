// ============================================================
// gear.js — ガチャで手に入る装備（武器＝攻撃力アップ／防具＝最大HPアップ）
//
//  ・武器・防具とも 10段階（レアリティ）。
//  ・出やすさ（％）は 共通 → レア の順に
//      18 / 14 / 12 / 10 / 9 / 9 / 8 / 8 / 8 / 4   （合計100％。最高レアは4％）
//  ・手に入れた装備はコレクション図鑑に記録。1つずつ装備してバトルを強化。
// ============================================================

/** ガチャ1回のねだん（コイン） */
export const GACHA_COST = 500;

// レアリティ（tier1=共通 〜 tier10=最高）。weight=出やすさ%／pct=ステータス上昇率
// 上昇率は最大40%（武器が強すぎないように）。
const TIER_DEF = [
  { key: "t1",  label: "ノーマル",       color: "#94a3b8", weight: 18, pct: 0.03 },
  { key: "t2",  label: "ブロンズ",       color: "#b08d57", weight: 14, pct: 0.05 },
  { key: "t3",  label: "シルバー",       color: "#cbd5e1", weight: 12, pct: 0.07 },
  { key: "t4",  label: "ゴールド",       color: "#fbbf24", weight: 10, pct: 0.10 },
  { key: "t5",  label: "プラチナ",       color: "#67e8f9", weight: 9,  pct: 0.13 },
  { key: "t6",  label: "レア",           color: "#38bdf8", weight: 9,  pct: 0.16 },
  { key: "t7",  label: "スーパーレア",   color: "#a78bfa", weight: 8,  pct: 0.20 },
  { key: "t8",  label: "エピック",       color: "#f472b6", weight: 8,  pct: 0.26 },
  { key: "t9",  label: "レジェンド",     color: "#fb923c", weight: 8,  pct: 0.33 },
  { key: "t10", label: "ミシック",       color: "#fde047", weight: 4,  pct: 0.40 },
  // ── ここから特殊効果つきの上位レア（とてもレア）。pctに加えて special 効果を持つ ──
  { key: "t11", label: "エンシェント",   color: "#34d399", weight: 3,   pct: 0.46 },
  { key: "t12", label: "セレスティアル", color: "#22d3ee", weight: 2,   pct: 0.52 },
  { key: "t13", label: "アビサル",       color: "#f472b6", weight: 1.5, pct: 0.60 },
  { key: "t14", label: "ジェネシス",     color: "#fef08a", weight: 1,   pct: 0.70 },
];

export const GEAR_RARITY = Object.fromEntries(TIER_DEF.map((t) => [t.key, t]));
export const RARITY_ORDER = TIER_DEF.map((t) => t.key);

// 各段階の名前・アイコン（tier1→tier14）。
//  ・special … 武器/防具の特殊効果（バトルで効く）。
//      lifesteal : 与えたダメージの割合ぶんHP回復（武器）
//      critPct   : コンボ会心ボーナスを上乗せ（武器）
//      regenPct  : 毎問 最大HPの割合ぶん自動回復（防具）
//      startSp   : バトル開始時のSPを増やす（防具）
const WEAPONS = [
  { name: "木のぼう",     icon: "🪵" },
  { name: "銅のつるぎ",   icon: "🗡️" },
  { name: "鉄のつるぎ",   icon: "⚔️" },
  { name: "鋼のつるぎ",   icon: "🔪" },
  { name: "騎士の剣",     icon: "🛡️" },
  { name: "炎のつるぎ",   icon: "🔥" },
  { name: "雷鳴の剣",     icon: "⚡" },
  { name: "氷結の剣",     icon: "❄️" },
  { name: "竜殺しの剣",   icon: "🐲" },
  { name: "神話の剣",     icon: "🌟" },
  { name: "業火の大剣",   icon: "🌋", special: { lifesteal: 0.12 } },
  { name: "天空の聖剣",   icon: "⚜️", special: { lifesteal: 0.18 } },
  { name: "破滅の魔剣",   icon: "🔱", special: { lifesteal: 0.25 } },
  { name: "創世の剣",     icon: "🌠", special: { lifesteal: 0.30, critPct: 0.3 } },
];
const ARMORS = [
  { name: "ぬののふく",   icon: "👕" },
  { name: "革のよろい",   icon: "🧥" },
  { name: "銅のよろい",   icon: "🦺" },
  { name: "鉄のよろい",   icon: "🛡️" },
  { name: "鋼の鎧",       icon: "⛓️" },
  { name: "騎士の鎧",     icon: "🏵️" },
  { name: "聖騎士の鎧",   icon: "✨" },
  { name: "竜鱗の鎧",     icon: "🐉" },
  { name: "不滅の鎧",     icon: "💠" },
  { name: "神話の鎧",     icon: "👑" },
  { name: "再生の鎧",     icon: "🌿", special: { regenPct: 0.05 } },
  { name: "守護神の鎧",   icon: "🛡️", special: { regenPct: 0.08, startSp: 2 } },
  { name: "不死鳥の鎧",   icon: "🔥", special: { regenPct: 0.10, startSp: 3 } },
  { name: "創世の鎧",     icon: "🌌", special: { regenPct: 0.12, startSp: 4 } },
];

/** 装備一覧（武器14種・防具14種＝計28種。t11以降は special 効果つき） */
export const GEAR = TIER_DEF.flatMap((t, i) => [
  { id: `w${i + 1}`, type: "weapon", rarity: t.key, name: WEAPONS[i].name, icon: WEAPONS[i].icon, pct: t.pct, color: t.color, special: WEAPONS[i].special || null },
  { id: `a${i + 1}`, type: "armor",  rarity: t.key, name: ARMORS[i].name,  icon: ARMORS[i].icon,  pct: t.pct, color: t.color, special: ARMORS[i].special || null },
]);

/** id から装備定義を引く */
export function findGear(id) {
  return GEAR.find((g) => g.id === id) || null;
}

/** 種類（weapon/armor）の装備一覧を返す（図鑑表示用。レア順） */
export function gearOfType(type) {
  return GEAR.filter((g) => g.type === type);
}

/**
 * ガチャを1回引く → 当たった装備id。
 *  レアリティを重みで抽選 → 種類を決定 → その段階の装備を返す。
 *  type に "weapon" / "armor" を渡すと、その種類だけを引く（武器ガチャ・防具ガチャ）。
 *  未指定（null）なら従来どおり武器/防具を50%ずつ。
 */
export function rollGacha(rand = Math.random, type = null) {
  const total = TIER_DEF.reduce((s, t) => s + t.weight, 0);
  let t = rand() * total;
  let chosen = TIER_DEF[0];
  for (const tier of TIER_DEF) {
    if ((t -= tier.weight) < 0) { chosen = tier; break; }
  }
  const gtype = type === "weapon" || type === "armor" ? type : (rand() < 0.5 ? "weapon" : "armor");
  const pool = GEAR.filter((g) => g.rarity === chosen.key && g.type === gtype);
  return (pool[Math.floor(rand() * pool.length)] || GEAR[0]).id;
}

/** gacha フィールドの既定形（後方互換の補完に使う） */
export function defaultGacha(g) {
  return { owned: (g && g.owned) || {}, weapon: (g && g.weapon) || null, armor: (g && g.armor) || null };
}

// ── 剣石・鎧石（応用クリアの報酬で少しずつ育つ・上限あり）─────────────
//  応用問題を初クリアした単元ごとに 剣石+1・鎧石+1。1個につき攻撃力／最大HPが
//  少しだけ上がり、GEAR_STONE_CAP 個で頭打ち（青天井にしない＝飲まれ対策）。
export const GEAR_STONE_PCT = 0.02; // 石1個あたり +2%
export const GEAR_STONE_CAP = 15;   // 上限15個（＝最大 +30%）。装備と合わせて過剰にならないよう抑制
/** 剣石・鎧石による上昇率 { atkPct, hpPct }（上限あり） */
export function gearStoneBonuses(player) {
  const g = player?.gear || {};
  const sword = Math.min(GEAR_STONE_CAP, g.swordStones || 0);
  const armor = Math.min(GEAR_STONE_CAP, g.armorStones || 0);
  return { atkPct: sword * GEAR_STONE_PCT, hpPct: armor * GEAR_STONE_PCT };
}

/** 装備中の武器・防具＋剣石/鎧石からステータス上昇率を返す（バトルで使う） */
export function gearBonuses(player) {
  const g = player?.gacha || {};
  const w = findGear(g.weapon);
  const a = findGear(g.armor);
  const st = gearStoneBonuses(player);
  return { atkPct: (w ? w.pct : 0) + st.atkPct, hpPct: (a ? a.pct : 0) + st.hpPct };
}

/** 装備中の武器・防具の特殊効果を合算して返す（バトルで使う）。
 *  lifesteal/critPct（武器）＋ regenPct/startSp（防具）を足し合わせる。 */
export function gearSpecials(player) {
  const g = player?.gacha || {};
  const out = { lifesteal: 0, critPct: 0, regenPct: 0, startSp: 0 };
  for (const id of [g.weapon, g.armor]) {
    const sp = findGear(id)?.special;
    if (!sp) continue;
    for (const k of Object.keys(out)) out[k] += sp[k] || 0;
  }
  return out;
}

/** 特殊効果を日本語の短い説明にする（ショップ・図鑑の表示用） */
export function gearSpecialText(gear) {
  const s = gear?.special;
  if (!s) return "";
  const parts = [];
  if (s.lifesteal) parts.push(`🧛 与ダメの${Math.round(s.lifesteal * 100)}%HP回復`);
  if (s.critPct) parts.push("🎯 会心ボーナス強化");
  if (s.regenPct) parts.push(`🌿 毎問HP+${Math.round(s.regenPct * 100)}%`);
  if (s.startSp) parts.push(`⚡ 開始SP+${s.startSp}`);
  return parts.join(" ・ ");
}
