// ============================================================
// rng.js — 乱数ユーティリティ（ゲームエンジンの最下層）
// 問題生成で使う「○以上○以下の整数をランダムに返す」関数。
// ここを差し替えれば「毎回同じ問題を出す（テスト用）」なども可能。
// ============================================================

/** min 以上 max 以下の整数をランダムに返す */
export function rng(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** 配列からランダムに1要素を返す（空配列なら null） */
export function pick(arr) {
  if (!arr || arr.length === 0) return null;
  return arr[Math.floor(Math.random() * arr.length)];
}

/** 配列をシャッフルした新しい配列を返す（元配列は壊さない） */
export function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}
