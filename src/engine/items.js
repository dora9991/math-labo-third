// ============================================================
// items.js — アイテムの定義（ショップ＆バトルで使う）
//
// アイテムはバトル中に「1つだけ」持てる。使うと無くなる（消費）。
// コインはタイムアタックで稼ぎ、ショップで購入する。
// 4種類×3段階（tier）。レベルが上がると上位tierがショップに解放され、
// 効果も段階的に強くなる。
//
//   price    … 購入に必要なコイン
//   unlockLv … この値以上のレベルでショップに並ぶ
//   tier     … 1〜3（同じ kind 内の強さ段階）
//   kind     … 効果の種類（バトル側で分岐）
//     "heal"   … HPを最大の value 割合ぶん回復
//     "atk2x"  … turns ターンのあいだ 攻撃ダメージ2倍
//     "guard"  … turns ターンのあいだ 受けるダメージを reduce 倍に軽減
//     "sp"     … スキルポイントを value ぶん貯める
// ============================================================
export const ITEMS = [
  // ── 回復（HP%） 30% / 50% / 100% ──
  { id: "heal1", name: "やくそう", icon: "🧪", price: 100, unlockLv: 1, tier: 1,
    kind: "heal", value: 0.3, color: "#86efac", desc: "HPを最大の30%回復する" },
  { id: "heal2", name: "良いやくそう", icon: "🧪", price: 300, unlockLv: 8, tier: 2,
    kind: "heal", value: 0.5, color: "#4ade80", desc: "HPを最大の50%回復する" },
  { id: "heal3", name: "エリクサー", icon: "🍶", price: 800, unlockLv: 20, tier: 3,
    kind: "heal", value: 1.0, color: "#22c55e", desc: "HPを全回復する（100%）" },

  // ── SP回復 +3 / +6 / +10 ──
  { id: "sp1", name: "スキルの書", icon: "📜", price: 200, unlockLv: 1, tier: 1,
    kind: "sp", value: 3, color: "#d8b4fe", desc: "スキルポイントを3ためる" },
  { id: "sp2", name: "スキルの本", icon: "📖", price: 500, unlockLv: 8, tier: 2,
    kind: "sp", value: 6, color: "#c084fc", desc: "スキルポイントを6ためる" },
  { id: "sp3", name: "スキルの宝典", icon: "📚", price: 1000, unlockLv: 20, tier: 3,
    kind: "sp", value: 10, color: "#a855f7", desc: "スキルポイントを10ためる（満タン）" },

  // ── 攻撃力アップ（2倍×Nターン） 1 / 3 / 5 ──
  { id: "atk1", name: "ちからのまもり", icon: "💪", price: 200, unlockLv: 1, tier: 1,
    kind: "atk2x", turns: 1, color: "#fcd34d", desc: "次の1回の攻撃ダメージが2倍" },
  { id: "atk2", name: "ちからのお守り", icon: "🔥", price: 500, unlockLv: 12, tier: 2,
    kind: "atk2x", turns: 3, color: "#fbbf24", desc: "3ターンのあいだ 攻撃ダメージが2倍" },
  { id: "atk3", name: "覇王のまもり", icon: "⚡", price: 1000, unlockLv: 24, tier: 3,
    kind: "atk2x", turns: 5, color: "#f59e0b", desc: "5ターンのあいだ 攻撃ダメージが2倍" },

  // ── 防御（被ダメ軽減×Nターン） 1/2×2 / 1/3×2 / 1/4×3 ──
  { id: "guard1", name: "まもりの盾", icon: "🛡️", price: 150, unlockLv: 1, tier: 1,
    kind: "guard", reduce: 0.5, turns: 2, color: "#93c5fd", desc: "2ターンのあいだ 受けるダメージが1/2" },
  { id: "guard2", name: "鋼の盾", icon: "🛡️", price: 400, unlockLv: 12, tier: 2,
    kind: "guard", reduce: 0.34, turns: 2, color: "#60a5fa", desc: "2ターンのあいだ 受けるダメージが約1/3" },
  { id: "guard3", name: "聖なる盾", icon: "🛡️", price: 1000, unlockLv: 24, tier: 3,
    kind: "guard", reduce: 0.25, turns: 3, color: "#3b82f6", desc: "3ターンのあいだ 受けるダメージが1/4" },

  // ── 仲間にする「魔物のエサ」──
  // バトル中に使うとその敵に「エサ」をマーク。たおすと一定確率で仲間になる
  //  （ザコ50%／ボス25%・その敵の単元を簡単/普通/難しい全て★1以上が条件）。
  { id: "bait", name: "魔物のエサ", icon: "🍖", price: 500, unlockLv: 1, tier: 1,
    kind: "bait", color: "#fca5a5", desc: "バトル中に使い、その敵をたおすと仲間になることがある（ザコ50%/ボス25%・要★条件）" },
];

// 旧セーブの item id を新tier1 id へ読み替える（後方互換）
const LEGACY = { heal: "heal1", sp5: "sp1", atk2x: "atk1", guard: "guard1" };

/** id からアイテム定義を引く（旧idは新idへフォールバック） */
export function findItem(id) {
  if (!id) return null;
  return ITEMS.find((i) => i.id === id) || ITEMS.find((i) => i.id === LEGACY[id]) || null;
}

/** 指定レベルで解放済みのアイテム一覧 */
export function itemsForLevel(lv) {
  return ITEMS.filter((i) => lv >= i.unlockLv);
}

/** ショップの「治療」（HP全回復）にかかるコイン（定額100） */
export function treatCost(lv) {
  return 100;
}
