// ============================================================
// seeded.js — 「種(seed)から同じ結果を再現する」ための道具。
//  問題の生成は Math.random を使うので、生成の間だけ Math.random を seed 由来の乱数に差し替える。
//  クライアントとサーバー(Edge Function)が同じ seed から**同じ問題・同じ選択肢の並び**を作れる
//  ＝サーバーが問題を作り直して本当の正誤を判定できる（自己申告を信じない）。
//  生成は同期処理のみ（awaitを挟まない）ので、差し替え中に他の処理と干渉しない。
// ============================================================
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** fn の実行中だけ Math.random を seed 由来にする（必ず元に戻す）。 */
export function withSeed(seed, fn) {
  const orig = Math.random;
  Math.random = mulberry32(seed);
  try {
    return fn();
  } finally {
    Math.random = orig;
  }
}

/** 新しい seed を作る（クライアントが問題を出す時に使う。32bit整数）。 */
export function newSeed() {
  return Math.floor(Math.random() * 0xffffffff) >>> 0;
}
