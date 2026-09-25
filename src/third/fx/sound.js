// ============================================================
// sound.js — 効果音。基本はWeb Audio APIでその場合成（音素材ファイルなし）。
//
// 2026-09-12：「正解/不正解の音、攻撃の発射音・着弾音を付けたい。ブラウザでは
//   限界があるか？」への回答：**限界はない。** Web Audio APIはこの用途
//   （短い効果音を低遅延で重ねて鳴らす）には十分すぎる性能があり、
//   波形をコードで合成すれば音素材(mp3/wav)は一切不要。
//
//   唯一の制約は「ブラウザの自動再生ポリシー」：ユーザー操作（タップ/
//   クリック）より前に音を鳴らすことはできない。このアプリはタイトル
//   画面のタップから始まるので実質問題にならないが、念のため毎回の
//   再生関数の中でAudioContextをresume()している。
//
// 2026-09-12（2回目）：kazu制作の実際の効果音ファイル(m4a)を追加。
//   `src/assets/sfx/` に置き、AudioBufferとして事前デコード→
//   AudioBufferSourceNodeで鳴らす（<audio>要素より低遅延・多重再生に強い）。
//   発動２.m4a(自分の攻撃開始音)→player-attack-start.m4a、
//   発動効果音.m4a(敵の攻撃開始音)→enemy-attack-start.m4a。
//
// 2026-09-12（3回目）：残り2つの実素材が届いたので差し替え完了。
//   ダメージ５.m4a(着弾音＝敵に当てた音)→hit-enemy.m4a、
//   ダメージ２.m4a(被弾音＝こちらがダメージを受けた音)→hit-player.m4a。
//   これで6種類の効果音のうち4種類が実音声、残り2種類（正解/不正解の
//   ピンポン・ブザー）だけが合成音のまま（#todo 実素材が届けば差し替え）。
// ============================================================

let ctx = null;

function getCtx() {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    ctx = new Ctx();
  }
  if (ctx.state === "suspended") {
    ctx.resume().catch(() => {});
  }
  return ctx;
}

// ---- 実音声ファイル（m4a）の再生 ----
const sfxUrls = import.meta.glob("../assets/sfx/*.m4a", { eager: true, query: "?url", import: "default" });
function sfxUrl(filename) {
  const entry = Object.entries(sfxUrls).find(([path]) => path.endsWith("/" + filename));
  return entry ? entry[1] : null;
}

const bufferCache = new Map(); // filename -> AudioBuffer(読み込み済み) | Promise(読み込み中)

function loadSfxBuffer(filename) {
  const c = getCtx();
  if (!c) return null;
  if (bufferCache.has(filename)) return bufferCache.get(filename);
  const url = sfxUrl(filename);
  if (!url) {
    console.warn(`sound.js: 音声ファイルが見つかりません: ${filename}`);
    return null;
  }
  const promise = fetch(url)
    .then((res) => res.arrayBuffer())
    .then((arr) => c.decodeAudioData(arr))
    .then((buf) => {
      bufferCache.set(filename, buf); // 読み込み完了後はAudioBuffer本体に差し替える
      return buf;
    })
    .catch((e) => {
      console.warn(`sound.js: 音声デコードに失敗: ${filename}`, e);
      bufferCache.delete(filename);
      return null;
    });
  bufferCache.set(filename, promise);
  return promise;
}

/** 実音声ファイルを鳴らす。まだデコード中でも、済み次第すぐ再生を試みる。
 *  rate: 再生速度(=ピッチ)。1未満で少し低く＝重く聞こえる（クリティカル用）。 */
// 攻撃音(球が飛ぶ音・ダメージ音)専用のバス：5体が同時に攻撃して重なっても、合計が約60%を超えないよう
//  リミッター(コンプレッサー)で頭を押さえる。他の音(正解音など)には影響しない。
const ATTACK_BUS_CEILING = 0.6;
function attackBus(c) {
  if (!c.__attackBus) {
    const comp = c.createDynamicsCompressor();
    comp.threshold.value = 20 * Math.log10(ATTACK_BUS_CEILING); // ≒ −4.4dB
    comp.knee.value = 0;
    comp.ratio.value = 20;
    comp.attack.value = 0.002;
    comp.release.value = 0.08;
    comp.connect(c.destination);
    c.__attackBus = comp;
  }
  return c.__attackBus;
}

function playSfx(filename, { gain = 0.9, rate = 1, limited = false } = {}) {
  const c = getCtx();
  if (!c) return;
  const cached = loadSfxBuffer(filename);
  if (!cached) return;
  Promise.resolve(cached).then((buffer) => {
    if (!buffer) return;
    const src = c.createBufferSource();
    src.buffer = buffer;
    src.playbackRate.value = rate;
    const g = c.createGain();
    g.gain.value = gain;
    src.connect(g);
    g.connect(limited ? attackBus(c) : c.destination);
    src.start();
  });
}

/** タイトル画面のタップ等、最初のユーザー操作で呼ぶ。AudioContextの解放に加え、
 *  実音声ファイルの事前デコードもここで済ませておく（初回再生の遅延を防ぐ）。 */
export function unlockAudio() {
  getCtx();
  loadSfxBuffer("player-attack-start.m4a");
  loadSfxBuffer("enemy-attack-start.m4a");
  loadSfxBuffer("hit-enemy.m4a");
  loadSfxBuffer("hit-player.m4a");
}

function envGain(audioCtx, { attack = 0.005, peak = 0.5, decay = 0.15, delay = 0 } = {}) {
  const g = audioCtx.createGain();
  const t0 = audioCtx.currentTime + delay;
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(peak, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + attack + decay);
  return g;
}

function tone(audioCtx, { freq, endFreq, type = "sine", duration = 0.15, gain = 0.5, delay = 0 }) {
  const osc = audioCtx.createOscillator();
  osc.type = type;
  const t0 = audioCtx.currentTime + delay;
  osc.frequency.setValueAtTime(freq, t0);
  if (endFreq) osc.frequency.exponentialRampToValueAtTime(Math.max(1, endFreq), t0 + duration);
  const g = envGain(audioCtx, { attack: 0.005, peak: gain, decay: duration, delay });
  osc.connect(g);
  g.connect(audioCtx.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.05);
}

function noiseBurst(audioCtx, { duration = 0.15, gain = 0.4, filterFreq = 1200, filterType = "bandpass", delay = 0 }) {
  const bufferSize = Math.max(1, Math.floor(audioCtx.sampleRate * duration));
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

  const src = audioCtx.createBufferSource();
  src.buffer = buffer;

  const filter = audioCtx.createBiquadFilter();
  filter.type = filterType;
  filter.frequency.value = filterFreq;

  const g = envGain(audioCtx, { attack: 0.003, peak: gain, decay: duration, delay });

  src.connect(filter);
  filter.connect(g);
  g.connect(audioCtx.destination);

  const t0 = audioCtx.currentTime + delay;
  src.start(t0);
  src.stop(t0 + duration + 0.02);
}

// 2026-09-18：「操作性・楽しさ」の検証で、戦闘の外（メニュー/画面遷移）が
// 完全に無音でタップの手応えが無いことが分かった。短い「コッ」という
// 合成音を画面遷移のたびに鳴らして、ボタンを押した実感を出す。
export function playUiTapSound() {
  const c = getCtx();
  if (!c) return;
  tone(c, { freq: 520, endFreq: 380, type: "sine", duration: 0.06, gain: 0.22 });
}

/** 正解：明るい上昇2音（ピンポン）。 */
export function playCorrectSound() {
  const c = getCtx();
  if (!c) return;
  // 【数学ラボ3】ピンポーン(正解音)を大きく：ゲイン 0.35/0.4 → 0.8/0.95（約2.3倍）。
  tone(c, { freq: 660, type: "triangle", duration: 0.09, gain: 0.8 });
  tone(c, { freq: 880, type: "triangle", duration: 0.14, gain: 0.95, delay: 0.08 });
}

/** 不正解：低いブザー音。 */
export function playIncorrectSound() {
  const c = getCtx();
  if (!c) return;
  tone(c, { freq: 220, endFreq: 140, type: "sawtooth", duration: 0.22, gain: 0.3 });
}

/** 自分の攻撃開始音（正解して3体が攻撃を始める瞬間）。kazu制作の実素材(発動２)。 */
export function playPlayerAttackStartSound() {
  // 【数学ラボ3】球が飛んでいく音：12%（5体が重なっても約60%）。0.9→0.45→0.12
  playSfx("player-attack-start.m4a", { gain: 0.12, limited: true });
}

/** 敵の攻撃開始音（反撃の予備動作＝敵が下がり始める瞬間）。kazu制作の実素材(発動効果音)。 */
export function playEnemyAttackStartSound() {
  playSfx("enemy-attack-start.m4a", { gain: 0.9 });
}

/** 攻撃の発射音（たまが飛び出す瞬間）。ミス時のみ使用（合成音のまま）。クリティカル狙い時は気持ち鋭く。 */
export function playLaunchSound({ crit = false } = {}) {
  const c = getCtx();
  if (!c) return;
  noiseBurst(c, {
    duration: crit ? 0.16 : 0.12,
    gain: crit ? 0.32 : 0.22,
    filterFreq: crit ? 2600 : 2000,
    filterType: "highpass",
  });
  tone(c, { freq: crit ? 900 : 700, endFreq: crit ? 300 : 260, type: "sine", duration: 0.12, gain: 0.15 });
}

/** 着弾音（たまが当たった瞬間）。kazu制作の実素材(ダメージ５)。クリティカルは
 *  再生速度を少し落として重く聞こえるようにしている（素材は1種類のみのため）。 */
export function playImpactSound({ crit = false } = {}) {
  // 【数学ラボ3】ダメージ(着弾)音：12%（クリティカルも同じ音量。重なっても約60%まで）
  playSfx("hit-enemy.m4a", { gain: 0.12, rate: crit ? 0.85 : 1, limited: true });
}

/** ミス（たまが届かず失速）の、こもった軽い音。 */
export function playMissSound() {
  const c = getCtx();
  if (!c) return;
  noiseBurst(c, { duration: 0.18, gain: 0.18, filterFreq: 500, filterType: "lowpass" });
}

/** 敵の攻撃がこちらに当たった(＝こちらがダメージを受けた)音。kazu制作の実素材(ダメージ２)。 */
export function playEnemyHitSound() {
  playSfx("hit-player.m4a", { gain: 0.9 });
}

/** 撃破音（華やかに）。 */
export function playDefeatSound() {
  const c = getCtx();
  if (!c) return;
  tone(c, { freq: 520, type: "triangle", duration: 0.12, gain: 0.35 });
  tone(c, { freq: 780, type: "triangle", duration: 0.14, gain: 0.4, delay: 0.09 });
  tone(c, { freq: 1040, type: "triangle", duration: 0.22, gain: 0.45, delay: 0.18 });
  noiseBurst(c, { duration: 0.3, gain: 0.3, filterFreq: 1200, filterType: "bandpass", delay: 0.18 });
}

// ---- ガチャ演出の効果音（2026-09-25）。合成音のみ。rarity: "N" | "R" | "SR" | "UR" ----
/** 溜め：光が集まって高まっていく上昇音 */
export function playGachaChargeSound(rarity = "N") {
  const c = getCtx();
  if (!c) return;
  const long = rarity === "UR" ? 2.1 : rarity === "SR" ? 1.7 : 1.4;
  tone(c, { freq: 180, endFreq: 1500, type: "sawtooth", duration: long, gain: 0.12 });
  tone(c, { freq: 360, endFreq: 2400, type: "sine", duration: long, gain: 0.14 });
  for (let i = 0; i < 8; i++) tone(c, { freq: 900 + i * 260, type: "triangle", duration: 0.09, gain: 0.07, delay: 0.25 + i * (long / 9) });
  noiseBurst(c, { duration: long, gain: 0.05, filterFreq: 2600, filterType: "highpass" });
}
/** 爆発：レア度が高いほど豪華（和音・きらめき・低音の衝撃） */
export function playGachaBurstSound(rarity = "N") {
  const c = getCtx();
  if (!c) return;
  noiseBurst(c, { duration: 0.5, gain: 0.35, filterFreq: 1800, filterType: "bandpass" });
  tone(c, { freq: 110, endFreq: 40, type: "sine", duration: 0.45, gain: 0.5 });
  const chords = { N: [523, 659], R: [523, 659, 784], SR: [523, 659, 784, 1047], UR: [523, 659, 784, 1047, 1319] };
  (chords[rarity] || chords.N).forEach((f, i) => tone(c, { freq: f, type: "triangle", duration: 0.5 + i * 0.05, gain: 0.32, delay: 0.02 + i * 0.05 }));
  if (rarity === "SR" || rarity === "UR") {
    const n = rarity === "UR" ? 14 : 8;
    for (let i = 0; i < n; i++) tone(c, { freq: 1200 + (i % 7) * 240, type: "sine", duration: 0.12, gain: 0.16, delay: 0.25 + i * 0.07 });
  }
  if (rarity === "UR") { tone(c, { freq: 1046, type: "square", duration: 0.7, gain: 0.08, delay: 0.1 }); tone(c, { freq: 1568, type: "triangle", duration: 1.0, gain: 0.2, delay: 0.5 }); }
}
/** 10連の1枚ずつ：レア度に応じた「ぽんっ」 */
export function playGachaCardSound(rarity = "N") {
  const c = getCtx();
  if (!c) return;
  const f = { N: 660, R: 784, SR: 988, UR: 1319 }[rarity] || 660;
  tone(c, { freq: f, endFreq: f * 1.5, type: "triangle", duration: 0.14, gain: rarity === "N" ? 0.22 : 0.4 });
  if (rarity === "SR" || rarity === "UR") tone(c, { freq: f * 2, type: "sine", duration: 0.35, gain: 0.25, delay: 0.06 });
}
