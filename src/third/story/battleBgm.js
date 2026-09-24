// 通常戦闘のBGMを「章 × 小単元の順番」で巡回させる（同じ曲を何十回も聞いて飽きないように）。
// 同じ小単元はいつも同じ曲（決定的）。隣の小単元・隣の章では別の曲になる。
// 曲を増やしたら POOL に足すだけ（bgm.js の FILES にも登録すること）。
import { getChapter } from "../data/storyMap.js";

const POOL = ["battle", "battle_g1", "battle_g3"];
const CHAPTERS = ["c1", "c2", "c3", "c4", "c5", "c6", "c7", "g2c1", "g2c2", "g2c3", "g2c4", "g2c5", "g2c6", "g3c1", "g3c2", "g3c3", "g3c4", "g3c5", "g3c6", "g3c7", "g3c8"];

export function normalBattleTrack(grade, chapterId, subUnitId) {
  const ci = Math.max(0, CHAPTERS.indexOf(chapterId));
  const sub = getChapter(grade, chapterId)?.subUnits.find((s) => s.id === subUnitId);
  const order = sub?.order || 1;
  return POOL[(ci + order - 1) % POOL.length];
}
