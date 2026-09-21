// 小単元ごとの敵行動ゲージ ＝ 基準秒数 × 単元ごとの係数。
//  基準秒数は balance.js（テストプレイヤーで調整。雑魚22秒・ボス18秒・序盤+7秒）。
//  係数は「暗算中心=.8〜.9／標準=1／複数手順・図・文章題=1.3〜1.6」。未登録は1。
import { GAUGE, gaugeBaseSeconds } from "./balance.js";
export const DEFAULT_GAUGE_SECONDS = GAUGE.mob;

// 数値だけをここに集約しているので、先生は unitId の値を変えるだけで調整できる。
export const UNIT_GAUGE_MULTIPLIERS = {
  // 中1: 基本計算は短く、複合・文章・図は長く
  u1: .8, u2: .9, u3: .9, u4: 1.0, u5: 1.3, u6: 1.1,
  v1: .9, v2: .9, v3: 1.0, v4: 1.1, v5: 1.3,
  e1: 1.1, e2: 1.2, e3: 1.3, e4: 1.2, e5: 1.5,
  h1: 1.1, h2: 1.1, h3: 1.3, h4: 1.2, h5: 1.5,
  z1: 1.2, z2: 1.3, z3: 1.3, z4: 1.2,
  k1: 1.0, k2: 1.3, k3: 1.4, k4: 1.1,
  d1: 1.2, d2: 1.3, d3: 1.3,
  // 中2: 手順を追う代数・関数・場合分けは長め
  g2c1u1: 1.0, g2c1u2: .9, g2c1u3: 1.0, g2c1u4: .9, g2c1u5: 1.1, g2c1u6: 1.3,
  g2c2u1: 1.3, g2c2u2: 1.2, g2c2u3: 1.5,
  g2c3u1: 1.3, g2c3u2: 1.4, g2c3u3: 1.5,
  g2c4u1: 1.1, g2c4u2: 1.2,
  g2c5u1: 1.3, g2c5u2: 1.3, g2c5u3: 1.4,
  g2c6u1: 1.4, g2c6u2: 1.2, g2c6u3: 1.5,
  // 中3: 根号・二次方程式・証明的な図形/活用は十分な読解時間を確保
  g3c1u1: 1.0, g3c1u2: .9, g3c1u3: 1.2, g3c1u4: 1.2, g3c1u5: 1.0, g3c1u6: 1.3, g3c1u7: 1.3, g3c1u8: 1.5,
  g3c2u1: 1.1, g3c2u2: 1.3, g3c2u3: 1.3, g3c2u4: 1.2, g3c2u5: 1.4,
  g3c3u1: 1.3, g3c3u2: 1.3, g3c3u3: 1.5, g3c3u4: 1.3, g3c3u5: 1.6,
  g3c4u1: 1.3, g3c4u2: 1.2, g3c4u3: 1.4, g3c4u4: 1.6,
  g3c5u1: 1.2, g3c5u2: 1.4, g3c5u3: 1.6,
  g3c6u1: 1.3, g3c6u2: 1.4, g3c6u3: 1.5,
  g3c7u1: 1.3, g3c7u2: 1.3, g3c7u3: 1.5, g3c7u4: 1.6,
  g3c8u1: 1.1, g3c8u2: 1.3, g3c8u3: 1.5,
};

/** その小単元のゲージ秒数。isBoss＝ボスの波か／tier＝カリキュラム上の位置(0〜1・序盤は少し長い)。 */
export function gaugeSecondsFor(unitId, isBoss = false, tier = 1) {
  return Math.max(8, Math.round(gaugeBaseSeconds(isBoss, tier) * (UNIT_GAUGE_MULTIPLIERS[unitId] ?? 1)));
}

/** 不正解でゲージが進む秒数＝その波のゲージの半分。 */
export function wrongPenaltySecondsFor(unitId, isBoss = false, tier = 1) {
  return gaugeSecondsFor(unitId, isBoss, tier) / 2;
}
