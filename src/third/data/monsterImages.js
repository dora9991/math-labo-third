// ============================================================
// monsterImages.js — モンスター画像（アート型ごとに1枚）の解決とリカラー。
//
// 2026-09-12：数学ラボ2の `src/data/monsterImages.js` と
//   `src/assets/monsters/{full,small}/*.webp`（13アート型）をそのまま
//   移植した。ロジックは同一——画像はアート型ごとに1枚しかないので、
//   CSSのhue-rotateフィルタでIDから決定論的に色を変え、個体差を出す。
// ============================================================

const fullGlob = import.meta.glob("../assets/monsters/full/*.webp", {
  eager: true,
  query: "?url",
  import: "default",
});
const smallGlob = import.meta.glob("../assets/monsters/small/*.webp", {
  eager: true,
  query: "?url",
  import: "default",
});

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

/** キャラの「画像アート種別」を返す（finalBoss→maou / sample→sample / chapterBoss→boss / それ以外はart）。 */
export function monsterImgArt(character) {
  if (!character) return null;
  if (character.imgArt) return character.imgArt;
  if (character.kind === "finalBoss") return "maou";
  if (character.kind === "sample") return "sample";
  if (character.kind === "chapterBoss") return "boss";
  return character.art || null;
}

/** アート種別＋サイズから画像URLを返す（無ければnull＝呼び出し側でプレースホルダーにフォールバック）。 */
export function monsterImageUrl(character, size = "full") {
  const art = monsterImgArt(character);
  if (!art) return null;
  const table = size === "small" ? MON_IMG_SMALL : MON_IMG_FULL;
  return table[art] || null;
}

/** 文字列から安定したhue(0〜359)を作る（同じidは常に同じ色違いになる）。 */
export function hueFromId(id = "") {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  h ^= h >>> 16;
  h = Math.imul(h, 2246822507) >>> 0;
  h ^= h >>> 13;
  h = Math.imul(h, 3266489909) >>> 0;
  h ^= h >>> 16;
  return (h >>> 0) % 360;
}

/** キャラのリカラー用CSS filter。imgHueがあればそれを使う。 */
export function monsterImgFilter(character) {
  const hue = Number.isFinite(character?.imgHue) ? character.imgHue : hueFromId(character?.id || "");
  if (!hue) return "none";
  return `hue-rotate(${hue}deg)`;
}
