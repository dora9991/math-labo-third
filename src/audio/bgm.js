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
  op: BASE + "bgm/title.m4a",              // タイトル（2026-09-21：数学ラボ3のタイトルBGMに差し替え）
  menu: BASE + "bgm/menu3.m4a",            // メニュー画面（数学ラボ3）
  calcplay: BASE + "bgm/menu_select.mp3",   // 計算王への道のプレイ中（スタート後）
  timeattack: BASE + "bgm/timeattack.mp3", // タイムアタック中
  timeattack_end: BASE + "bgm/timeattack_end.mp3", // タイムアタック終了時
  slow: BASE + "bgm/practice.m4a",         // れんしゅうモード（じっくり・ステップアップ・学び直し・確認問題の練習）
  unittest: BASE + "bgm/unittest.mp3",     // 単元テスト
  battle: BASE + "bgm/battle3.m4a",        // 通常戦闘（雑魚の波）
  boss: BASE + "bgm/subboss.m4a",          // 小単元ボス戦闘
  chapterboss: BASE + "bgm/chapterboss.m4a", // 章のボス（章ボス／最終ボス）
  victory: BASE + "bgm/victory3.m4a",      // 戦闘勝利（1回だけ流す）
  defeat: BASE + "bgm/defeat3.m4a",        // 戦闘敗北（1回だけ流す）
  ending: BASE + "bgm/ending.m4a",         // エンディング（最終ボス撃破のごほうび画面）
  coop: BASE + "bgm/coop.m4a",             // 協力プレイ（パーティ編成・ガチャ＝仲間と協力する画面）
};

let el = null;          // 再生用の <audio>
let current = null;     // 今鳴っている曲名
let unlocked = false;
let muted = false;
try { muted = localStorage.getItem("ml3_bgm_muted") === "1"; } catch {}

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
  try { localStorage.setItem("ml3_bgm_muted", muted ? "1" : "0"); } catch {}
  if (el) el.muted = muted;
  return muted;
}

export function isMuted() { return muted; }
