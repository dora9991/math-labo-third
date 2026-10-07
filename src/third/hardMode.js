// ============================================================
// hardMode.js — バトルの「激ムズモード」（2026-10-07）。純関数/定数のみ。
//  生徒のご意見「一撃の攻撃が少なく相手のダメージが多い激ムズモードを追加してほしい」への対応。
//
//  ・バトルが始まる前（最初の解答まで）にON/OFFできる。バトル中は切り替え不可（負けそうな時にOFFにできない）。
//  ・選んだ状態は端末に覚えておく（次のバトルも同じ）。お試し戦(demo)と裏ボスでは使えない（裏ボスはもともと推奨Lvで勝率約45%の設計）。
//  ・動かすのは「自分が与えるダメージ」と「敵がパーティに与えるダメージ」だけ。
//      dealt … 与ダメ倍率。1回の正解で1体から削れる上限(capFrac)にも同じ倍率をかける
//              ＝必要な正解数が約 1/dealt 倍（学習量のフロアも同じ倍率で増える）。
//      taken … 敵の行動ダメージの倍率。
//  ・ごほうび（経験値・コイン・クリスタル・メダル）は**変えない**。報酬はサーバーが解答記録から決めており、
//    激ムズで必要な正解が増えてもサーバーの検証（最低正解数・最大解答数300）の範囲に収まる。
//  数値の調整はここの HARD_MODE だけでよい。
// ============================================================

export const HARD_MODE = { dealt: 0.5, taken: 1.25 };
export const NORMAL_MODE = { dealt: 1, taken: 1 };

export const HARD_MODE_KEY = "mathApp3_hardMode";

/** 保存されている「激ムズ」の選択（保存できない環境・未設定は false＝ふつう） */
export function loadHardMode() {
  try { return window.localStorage.getItem(HARD_MODE_KEY) === "1"; } catch { return false; }
}
export function saveHardMode(on) {
  try { window.localStorage.setItem(HARD_MODE_KEY, on ? "1" : "0"); } catch { /* 保存できなくても今回のバトルは続ける */ }
  return !!on;
}

/** on=true なら激ムズの倍率、false なら倍率1（＝今までと完全に同じ） */
export function modeFor(on) {
  return on ? HARD_MODE : NORMAL_MODE;
}

/** 与えるダメージに倍率をかける（最低1） */
export function scaleDealt(dmg, on) {
  return Math.max(1, Math.round((Number(dmg) || 0) * modeFor(on).dealt));
}

/** 1回で1体から削れる上限(ダメージ)に倍率をかける（最低1）。上限は「必要な正解数の下限」を決める。 */
export function scaleCap(cap, on) {
  const c = Number(cap);
  return Number.isFinite(c) ? Math.max(1, Math.round(c * modeFor(on).dealt)) : c;
}

/** 敵の行動ダメージに倍率をかける（0はそのまま0、ほかは最低1） */
export function scaleTaken(dmg, on) {
  const d = Number(dmg) || 0;
  return d <= 0 ? 0 : Math.max(1, Math.round(d * modeFor(on).taken));
}
