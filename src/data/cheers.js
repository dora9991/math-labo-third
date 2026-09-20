// ============================================================
// cheers.js — 自キャラの応援セリフ（タイムアタック＆バトル共通）
//  状況ごとにバリエーションを持たせ、キャラが「喋っている」感を出す。
// ============================================================
export const CHEER_HIT = [
  "いいぞ！", "ナイス！", "その調子！", "あたり！", "すごい！", "つよい！",
  "やるね！", "かんぺき！", "さすが！", "てんさい！", "おみごと！", "ばっちり！",
  "いけてる！", "ナイスファイト！", "あってる！", "グッド！",
];
export const CHEER_STREAK = [
  "コンボ継続！", "とまらない！", "燃えてきた！", "ノリノリ！",
  "連撃だ！", "いけいけ！", "止まらないよ！", "神ってる！",
];
export const CHEER_FEVER = [
  "フィーバーだ！", "畳みかけろ！", "今だ、一気に！", "大チャンス！", "ぶっ飛ばせ！",
];
export const CHEER_LAST = [
  "ラスト！もう一撃！", "のこりわずか！", "最後まで！", "ふんばって！", "ねばれ！",
];
export const CHEER_MISS = [
  "ドンマイ！", "次いこう！", "切りかえて！", "おしい！", "気にしない！", "次は当てる！", "まだまだ！",
];
export const CHEER_KILL = [
  "やった！", "たおした！", "ナイス撃破！", "つぎ来い！", "かっこいい！", "スッキリ！",
];
export const CHEER_HURT = [
  "いてっ！", "くっ…！", "だいじょうぶ！", "まだやれる！", "ひるむな！", "へっちゃら！", "うっ…！",
];

const pick = (a) => a[Math.floor(Math.random() * a.length)];

/** 正解時の応援（連続・フィーバー・残り時間を加味） */
export function pickHitCheer({ streak = 0, fever = false, timeLeft = 99 } = {}) {
  if (fever) return pick(CHEER_FEVER);
  if (timeLeft <= 5) return pick(CHEER_LAST);
  if (streak >= 5) return pick(CHEER_STREAK);
  return pick(CHEER_HIT);
}
export const pickMissCheer = () => pick(CHEER_MISS);
export const pickKillCheer = () => pick(CHEER_KILL);
export const pickHurtCheer = () => pick(CHEER_HURT);
