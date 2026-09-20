// ============================================================
// monsterImages.js — モンスター画像（アート型ごとに1枚）の解決とリカラー
//  ・画像は src/assets/monsters/{full,small}/<art>.webp（vite が bundle）。
//  ・full=バトル用（大きめ）／small=コレクション図鑑用（小さめ）。
//  ・画像は10アート型＋boss/maou/sample のみ。足りないぶんは
//    各モンスターの id から算出した hue で「色違い」表示して個体差を出す。
// ============================================================

// vite の glob import で {パス: url} を得る → アート名キーに変換
const fullGlob = import.meta.glob("../assets/monsters/full/*.webp", { eager: true, query: "?url", import: "default" });
const smallGlob = import.meta.glob("../assets/monsters/small/*.webp", { eager: true, query: "?url", import: "default" });

function byArt(glob) {
  const m = {};
  for (const path in glob) {
    const art = path.split("/").pop().replace(".webp", "");
    m[art] = glob[path];
  }
  return m;
}

export const MON_IMG_FULL = byArt(fullGlob);
export const MON_IMG_SMALL = byArt(smallGlob);

/** モンスターの「画像アート種別」を返す（finalBoss→maou / sample→sample / それ以外は art） */
export function monsterImgArt(monster) {
  if (!monster) return null;
  if (monster.imgArt) return monster.imgArt;
  if (monster.kind === "finalBoss") return "maou";
  if (monster.kind === "sample") return "sample";
  if (monster.kind === "chapterBoss") return "boss";
  return monster.art || null;
}

/** アート種別＋サイズから画像URLを返す（無ければ null＝SVGにフォールバック） */
export function monsterImageUrl(monster, size = "full") {
  const art = monsterImgArt(monster);
  if (!art) return null;
  const table = size === "small" ? MON_IMG_SMALL : MON_IMG_FULL;
  return table[art] || null;
}

/** 文字列から安定したhue(0〜359)を作る（同じidは常に同じ色違いになる）。
 *  FNV-1aベースでよく分散させ、連番id（u1,u2,…）でも色が大きく変わるようにする。 */
export function hueFromId(id = "") {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  // murmur3風ファイナライザで十分に攪拌（近接id=末尾だけ違うidでも色が大きく変わる）
  h ^= h >>> 16; h = Math.imul(h, 2246822507) >>> 0;
  h ^= h >>> 13; h = Math.imul(h, 3266489909) >>> 0;
  h ^= h >>> 16;
  return (h >>> 0) % 360;
}

/** モンスターのリカラー用 CSS filter。imgHue があればそれを使う。 */
export function monsterImgFilter(monster) {
  const hue = Number.isFinite(monster?.imgHue) ? monster.imgHue : hueFromId(monster?.id || "");
  if (!hue) return "none";
  return `hue-rotate(${hue}deg)`;
}
