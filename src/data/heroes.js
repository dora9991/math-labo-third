// ============================================================
// heroes.js — 自分のキャラに選べる「ヒーロー（立ち絵）」一覧
//  player.avatar = { type:"hero", id } で選択。画像は src/assets/avatars/*.png。
//  丸アイコン（Avatar）でも、全身の立ち絵（ホーム・バトル）でも使う。
//
//  ・重複（ほぼ同じ絵）を精選し、見た目が被らない10体に絞った。
//  ・初期から使えるのは STARTER_HERO_ID（一番シンプルな男の子）だけ。
//    他は 💰HERO_PRICE コインで購入して解放する（player.ownedHeroes）。
// ============================================================
const glob = import.meta.glob("../assets/avatars/*.png", { eager: true, query: "?url", import: "default" });

function urlOf(slug) {
  for (const p in glob) if (p.endsWith("/" + slug + ".png")) return glob[p];
  return null;
}

// 初期キャラ（無料・最初から所持）＝シンプルな立ち絵の男の子
export const STARTER_HERO_ID = "hero10";
// ヒーロー1体の購入価格（コイン）
export const HERO_PRICE = 500;

export const HERO_AVATARS = [
  { id: "hero10", name: "たびびとの少年" },   // ★初期キャラ（無料）
  { id: "hero06", name: "いかずちの少年" },
  { id: "hero07", name: "やみの騎士" },
  { id: "hero11", name: "じゅうじんの戦士" },
  { id: "hero12", name: "ベテラン冒険者" },
  { id: "hero02", name: "ほのおの魔法少女" },
  { id: "hero03", name: "みずの巫女" },
  { id: "hero04", name: "こおりの魔導士" },
  { id: "hero09", name: "まほう学園の少女" },
].map((h) => ({ ...h, src: urlOf(h.id) }));

export function findHero(id) {
  return HERO_AVATARS.find((h) => h.id === id) || null;
}

/** avatar から立ち絵(全身)画像URLを返す（hero型のときだけ。それ以外は null）。
 *  ※一覧から外したidでも画像があれば解決できるよう urlOf を直接使う（旧セーブ保護）。 */
export function heroImageFor(avatar) {
  if (avatar && avatar.type === "hero") return urlOf(avatar.id) || null;
  return null;
}
