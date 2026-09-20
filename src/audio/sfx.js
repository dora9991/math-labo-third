// ============================================================
// sfx.js — 効果音（Web Audio APIで合成。音声ファイル不要）
//  レトロゲーム風のブリップ音。決定・移動・正解・不正解・戻る。
//  ミュートは BGM と共通（bgm.isMuted）。
// ============================================================
import { isMuted } from "./bgm.js";

let ctx = null;

function ac() {
  if (!ctx) {
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch {}
  }
  return ctx;
}

/** 最初のユーザー操作で呼ぶ（AudioContextを起こす） */
export function unlock() {
  const c = ac();
  if (c && c.state === "suspended") c.resume();
}

// 連続した音（音程の配列）を鳴らす小さなヘルパー
function blip(freqs, opts = {}) {
  const c = ac();
  if (!c || isMuted()) return;
  // suspended のときは再開を促しつつ、同期で鳴らす（ジェスチャー内で鳴らさないと
  // ブラウザにブロックされるため、await せず即スケジュールする）。
  if (c.state === "suspended") { try { c.resume(); } catch {} }
  playBlip(c, freqs, opts);
}
function playBlip(c, freqs, { dur = 0.08, type = "square", vol = 0.16, gap = 0 } = {}) {
  if (isMuted()) return;
  const t0 = c.currentTime;
  freqs.forEach((f, i) => {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.value = f;
    o.connect(g); g.connect(c.destination);
    const st = t0 + i * (dur + gap);
    g.gain.setValueAtTime(0.0001, st);
    g.gain.linearRampToValueAtTime(vol, st + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, st + dur);
    o.start(st);
    o.stop(st + dur + 0.02);
  });
}

// カーソル移動：短いコツッ
export const move = () => blip([520], { dur: 0.035, vol: 0.13 });
// ボタン押下：ピコッ（短い2音上昇・軽め）。全ボタン共通のタップ音。
export const tap = () => blip([880, 1245], { dur: 0.04, vol: 0.16 });
// 決定：ピッ↑（2音上昇）
export const confirm = () => blip([660, 990], { dur: 0.06, vol: 0.24 });
// 戻る：ポッ↓（2音下降）
export const back = () => blip([520, 330], { dur: 0.08, vol: 0.22 });
// 正解：ピンポーン♪（明るい3音上昇・はっきり大きく）
export const correct = () =>
  blip([784, 1175, 1568, 2093], { dur: 0.11, type: "triangle", vol: 0.42, gap: 0.012 });
// 不正解：ブッブー（低く濁った2音・はっきり大きく）
export const wrong = () =>
  blip([233, 175, 117], { dur: 0.2, type: "sawtooth", vol: 0.4, gap: 0.015 });

// レベルアップ：明るいファンファーレ（ドミソド↑＋伸ばし）
export const levelUp = () => {
  blip([523, 659, 784, 1047], { dur: 0.13, type: "triangle", vol: 0.4, gap: 0.02 });
  blip([1047, 1319], { dur: 0.28, type: "triangle", vol: 0.32, gap: 0.02 });
};

// スキル発動：チャージ上昇→ドンッと炸裂（必殺技の爽快感）
export const skill = ({ ult = false } = {}) => {
  // 上昇するチャージ音
  blip([440, 660, 880, 1320], { dur: 0.07, type: "sawtooth", vol: 0.3, gap: 0.005 });
  // 炸裂（明るい和音）
  blip([1568, 1976, 2637], { dur: 0.22, type: "triangle", vol: 0.4, gap: 0.0 });
  // 低音の地ひびき（ドスン）
  blip([110, 70], { dur: 0.3, type: "square", vol: ult ? 0.34 : 0.24, gap: 0.0 });
  if (ult) {
    // 必殺技は追い打ちのきらめき
    blip([2093, 2637, 3136], { dur: 0.18, type: "triangle", vol: 0.3, gap: 0.01 });
  }
};
