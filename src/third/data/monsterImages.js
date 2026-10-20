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

// ID専用の敵画像（2026-09-21〜 敵デザイン刷新）。by-id/{full,small}/<monsterId>.webp があればそれを最優先で使い、
// hue-rotate も掛けない。無い敵は従来どおりアート型(13種)＋色違いにフォールバックする。
const idFullGlob = import.meta.glob("../assets/monsters/by-id/full/*.webp", { eager: true, query: "?url", import: "default" });
const idSmallGlob = import.meta.glob("../assets/monsters/by-id/small/*.webp", { eager: true, query: "?url", import: "default" });
const byId = (glob) => { const m = {}; for (const path in glob) m[path.split("/").pop().replace(".webp", "")] = glob[path]; return m; };
export const MON_IMG_BY_ID_FULL = byId(idFullGlob);
export const MON_IMG_BY_ID_SMALL = byId(idSmallGlob);
import { ENEMY_ALIAS } from "./enemyAlias.js";
/** ID専用画像が無い敵の「色違い」割り当て（docs/enemy-work/make-alias.py が自動生成）。 */
export function enemyAliasOf(character) { return (character?.id && ENEMY_ALIAS[character.id]) || null; }
/** この敵にID専用の画像があるか。 */
export function hasIdImage(character) { return !!(character && character.id && MON_IMG_BY_ID_FULL[character.id]); }

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
  if (character?.id) {
    const own = (size === "small" ? MON_IMG_BY_ID_SMALL : MON_IMG_BY_ID_FULL)[character.id] || MON_IMG_BY_ID_FULL[character.id];
    if (own) return own;
    const al = ENEMY_ALIAS[character.id];
    if (al) {
      const via = (size === "small" ? MON_IMG_BY_ID_SMALL : MON_IMG_BY_ID_FULL)[al.base] || MON_IMG_BY_ID_FULL[al.base];
      if (via) return via;
    }
  }
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
  if (hasIdImage(character)) return "none"; // ID専用画像は元の色のまま
  const al = enemyAliasOf(character); // 色違い割り当て: 元の絵を章のアクセント色へ回す
  if (al && MON_IMG_BY_ID_FULL[al.base]) return al.hue ? `hue-rotate(${al.hue}deg)` : "none";
  const hue = Number.isFinite(character?.imgHue) ? character.imgHue : hueFromId(character?.id || "");
  if (!hue) return "none";
  return `hue-rotate(${hue}deg)`;
}
