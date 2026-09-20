// ============================================================
// mastery.js — 習熟度推定エンジン（Elo / IRT 型）
//
// 『アダプティブ数学_構想と計画.md』2-2 の式をそのまま実装。
//   期待正答率 e = σ(k·(m − d))
//   更新       m ← m + α·(r − e)      r=結果(1/0)
//
// パラメータは決定事項どおり仮置き（実データで調整）：θ=0.7, α=0.1, k=5。
// 純関数だけ。UI・保存には依存しない（同じ関数を他モードからも呼べる）。
// ============================================================

export const THETA = 0.7;   // 習熟とみなす閾値（診断・クリア判定に使う）
export const ALPHA = 0.1;   // 学習率（1手でどれだけ動かすか）
export const K = 5;         // ロジスティックの傾き

// 難易度ラベル → 正規化難易度 d（0〜1）。easy/standard/advanced。
export const LEVEL_DIFFICULTY = { easy: 0.30, standard: 0.55, advanced: 0.80 };

/** 難易度ラベルを d(0〜1) に変換 */
export function levelDifficulty(level) {
  return LEVEL_DIFFICULTY[level] ?? 0.5;
}

/** ロジスティック関数 */
export function sigma(x) {
  return 1 / (1 + Math.exp(-x));
}

/** 習熟度の初期値（まだ一度も解いていないスキル） */
export const INITIAL_MASTERY = 0.5;

/** 0〜1にクランプ */
function clamp01(x) {
  return Math.max(0, Math.min(1, x));
}

/** 習熟度 m・難易度 d のとき、その問題の期待正答率 */
export function expectedCorrect(m, d) {
  return sigma(K * (m - d));
}

/**
 * 1手ぶん習熟度を更新する。
 * @param {number} m 現在の習熟度(0〜1)
 * @param {number} d 問題の正規化難易度(0〜1)
 * @param {number} r 結果（1=正解, 0=不正解）
 * @returns {number} 更新後の習熟度(0〜1)
 */
export function updateMastery(m, d, r) {
  const e = expectedCorrect(m, d);
  return clamp01(m + ALPHA * (r - e));
}

/**
 * 期待正答率を target（既定0.75）にしたい難易度 d を返す。
 *   e = σ(k(m−d)) = target  ⟺  d = m − ln(target/(1−target)) / k
 * 「簡単すぎず難しすぎない、ちょうど伸びる難易度」（フロー＝学習効率の共通解）。
 */
export function targetDifficulty(m, target = 0.75) {
  return m - Math.log(target / (1 - target)) / K;
}
