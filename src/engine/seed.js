// ============================================================
// seed.js — 決定的な乱数（同じ seed → 同じ問題）
//  ★なぜ要るか★ サーバ(Edge Function)が「生徒が実際に見た問題」を seed から
//   もう一度作り直して採点するため（Step2＝サーバ権威／チート対策の土台）。
//   クライアントは1問ごとに seed を1つ引いて問題を作り、seed を解答と一緒に送る。
//   サーバは同じ seed＋テンプレIDから同じ q/ans を再現して照合する。
//
//  決定性の前提：問題テンプレの build(r) は、渡された r(min,max) だけで
//   q と ans を決める（rnz/rpick/rsign も r 由来）。選択肢(choices)のシャッフルは
//   表示だけの話で ans には影響しないので、採点の決定性は保たれる。
// ============================================================

/** mulberry32：32bit seed から 0..1 の擬似乱数を返す関数を作る（高速・実装が短く移植しやすい） */
export function mulberry32(seed) {
  let s = seed >>> 0;
  return function () {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** rng(min,max) と同じ使い勝手の「seed から決まる整数乱数」r を返す（build(r) にそのまま渡せる） */
export function makeSeededR(seed) {
  const rand = mulberry32(seed);
  const r = (min, max) => Math.floor(rand() * (max - min + 1)) + min;
  r._rand = rand; // 生の 0..1 が要る箇所用（choices など）
  return r;
}

/** 32bit のランダム seed（クライアントが1問ごとに引く）。0..2^32-1 */
export function randomSeed() {
  return (Math.floor(Math.random() * 0x100000000)) >>> 0;
}
