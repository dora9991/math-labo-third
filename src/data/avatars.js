// ============================================================
// avatars.js — 自分のキャラのテンプレート（最初に選べるモデル）
//  手書きや画像読み込みの前に、ここから1つ選んでもOK。
//  player.avatar = { type:"template", id } または { type:"image", src:dataURL }
// ============================================================
export const AVATAR_TEMPLATES = [
  { id: "penguin", emoji: "🐧", bg: "linear-gradient(135deg,#60a5fa,#2563eb)", name: "ぺんぎん" },
  { id: "fox",     emoji: "🦊", bg: "linear-gradient(135deg,#fb923c,#ea580c)", name: "きつね" },
  { id: "cat",     emoji: "🐱", bg: "linear-gradient(135deg,#f472b6,#db2777)", name: "ねこ" },
  { id: "dragon",  emoji: "🐲", bg: "linear-gradient(135deg,#4ade80,#16a34a)", name: "ドラゴン" },
  { id: "robot",   emoji: "🤖", bg: "linear-gradient(135deg,#94a3b8,#475569)", name: "ロボット" },
  { id: "wizard",  emoji: "🧙", bg: "linear-gradient(135deg,#c084fc,#7c3aed)", name: "まほうつかい" },
  { id: "star",    emoji: "⭐", bg: "linear-gradient(135deg,#fde047,#f59e0b)", name: "スター" },
  { id: "alien",   emoji: "👾", bg: "linear-gradient(135deg,#5eead4,#0d9488)", name: "エイリアン" },
  { id: "unicorn", emoji: "🦄", bg: "linear-gradient(135deg,#f0abfc,#a855f7)", name: "ユニコーン" },
];

export function findAvatarTemplate(id) {
  return AVATAR_TEMPLATES.find((a) => a.id === id) || null;
}
