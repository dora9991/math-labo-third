// ============================================================
// bgm.js — BGM（背景音楽）の管理
//  1つの音声プレイヤーを使い回し、画面に合わせて曲を切り替える。
//  ブラウザは「最初のユーザー操作」までは音を鳴らせないので、
//  スタート画面のボタンで unlock() してから再生を始める。
//
//  曲ファイルは public/bgm/ に置く（URLは /bgm/xxx.mp3）。
// ============================================================
// 公開先のフォルダ階層が変わっても鳴るよう、相対パス（BASE_URL）を前につける。
const BASE = import.meta.env.BASE_URL; // 例: "./" や "/リポジトリ名/"
const FILES = {
  op: BASE + "bgm/op.mp3",                 // タイトル（OP）
  menu: BASE + "bgm/menu.mp3",             // メニュー（以前のBGMに戻す）
  calcplay: BASE + "bgm/menu_select.mp3",   // 計算王への道のプレイ中（スタート後）
  timeattack: BASE + "bgm/timeattack.mp3", // タイムアタック中
  timeattack_end: BASE + "bgm/timeattack_end.mp3", // タイムアタック終了時
  slow: BASE + "bgm/slow.mp3",             // じっくり
  unittest: BASE + "bgm/unittest.mp3",     // 単元テスト
  battle: BASE + "bgm/battle.mp3",         // 通常戦闘
  boss: BASE + "bgm/boss.mp3",             // ボス戦
  victory: BASE + "bgm/victory.mp3",       // 勝利
  defeat: BASE + "bgm/defeat.mp3",         // 敗北
};

let el = null;          // 再生用の <audio>
let current = null;     // 今鳴っている曲名
let unlocked = false;
let muted = false;
try { muted = localStorage.getItem("bgm_muted") === "1"; } catch {}

// 曲ごとの音量。タイトル(op)は大きめ、その他は控えめ（効果音を聞き取りやすく）。
const VOLUME = { op: 0.6 };
const DEFAULT_VOLUME = 0.28;

function ensure() {
  if (!el) {
    el = new Audio();
    el.loop = true;
    el.volume = DEFAULT_VOLUME;
    el.muted = muted;
  }
  return el;
}

/** 最初のユーザー操作で呼ぶ（音声を解禁） */
export function unlock() {
  unlocked = true;
  ensure();
}

/** 曲を再生（同じ曲が既に鳴っていれば何もしない） */
export function play(name, { loop = true } = {}) {
  const src = FILES[name];
  if (!src) return;
  ensure();
  if (current === name && !el.paused) return;
  current = name;
  el.src = src;
  el.loop = loop;
  el.muted = muted;
  el.volume = VOLUME[name] != null ? VOLUME[name] : DEFAULT_VOLUME;
  const p = el.play();
  if (p && p.catch) p.catch(() => {}); // 自動再生ブロック時は無視
}

/** 停止 */
export function stop() {
  if (el) { el.pause(); current = null; }
}

/** ミュート切替（true=ミュート中を返す） */
export function toggleMute() {
  muted = !muted;
  try { localStorage.setItem("bgm_muted", muted ? "1" : "0"); } catch {}
  if (el) el.muted = muted;
  return muted;
}

export function isMuted() { return muted; }
