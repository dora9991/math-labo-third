// ============================================================
// link.js — ラボ3の単元 ⇄ math-worldの小単元 の対応づけ。
//  章ID(c1…, g2c1…, g3c1…)と各章の小単元の数は両者で完全に一致しているため、
//  「その章の何番目の単元か」で対応させる（中1 32・中2 20・中3 35＝全87単元）。
// ============================================================
import { getChapter } from "./data/storyMap.js";
import { chaptersForGrade } from "../data/index.js";

/** ラボ3の(学年・章・単元)から、ワールド側のバトル起動パラメータを返す。無ければnull。 */
export function worldBattleFor(grade, chapter, unit) {
  const wc = getChapter(grade, chapter?.id);
  if (!wc) return null;
  const idx = (chapter.units || []).findIndex((u) => u.id === unit?.id);
  const sub = idx >= 0 ? wc.subUnits[idx] : null;
  return sub ? { grade, chapterId: chapter.id, kind: "subUnit", subUnitId: sub.id } : null;
}

/** バトル起動パラメータから、出題に使うラボ3の単元IDを返す（章ボス等でsubUnitIdが無ければnull）。 */
export function labUnitIdForBattle({ grade, chapterId, subUnitId }) {
  const wc = getChapter(grade, chapterId);
  const sub = wc?.subUnits.find((s) => s.id === subUnitId);
  if (!sub) return null;
  const ch = chaptersForGrade(grade).find((c) => c.id === chapterId);
  return ch?.units?.[sub.order - 1]?.id || null;
}
