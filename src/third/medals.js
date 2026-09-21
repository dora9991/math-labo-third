// ============================================================
// medals.js — 数学ラボ3の「メダル」判定（純関数）。**メダルはサーバーが付与した記録(state.medals)だけを見る**。
//  小単元ごとにメダルは2枚：
//    ・はいちメダル   … 確認問題(5問)で80%以上の正解（サーバーが問題を作り直して採点）
//    ・れんしゅうメダル … れんしゅうで検証済みの正解を15問ためる（サーバーが採点）
//  2枚そろうと、その小単元の「バトル」が出現（解放）。バトルの申請もサーバーがメダルを確認する。
//  はいち・れんしゅうにコイン/チケット/経験値の報酬は付けない（メダル収集が成果）。
//  state ＝ thirdApi.getState() の state（未取得(null)の間は「メダルなし」として扱う）。
// ============================================================
import { unitMedalsOf } from "./core.js";
import { MEDAL } from "./gachaConfig.js";

export const MEDAL_PRACTICE_TARGET = MEDAL.practiceTarget;

/** 1つの小単元のメダル状況 */
export function unitMedals(state, unitId) {
  return unitMedalsOf(state, unitId);
}
export const hasHaichiMedal = (state, unitId) => unitMedals(state, unitId).haichi;
export const hasPracticeMedal = (state, unitId) => unitMedals(state, unitId).practice;
export const practiceProgress = (state, unitId) => unitMedals(state, unitId).practiceN;
/** その小単元のバトルが出現（解放）しているか */
export const isBattleOpen = (state, unitId) => unitMedals(state, unitId).battleOpen;

/** 単元の配列に対するメダル総数／満点／バトル解放数 */
export function medalSummary(state, units = []) {
  let count = 0, open = 0;
  for (const u of units) {
    const m = unitMedals(state, u.id);
    count += m.count;
    if (m.battleOpen) open += 1;
  }
  return { count, total: units.length * 2, battlesOpen: open, units: units.length };
}
