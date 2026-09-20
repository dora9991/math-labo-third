// ============================================================
// unitMastery.js — 小単元の「できてるか確認」ポイント
//
//  ・4問連続で正解すると、その小単元は「OK（習得）」になる。
//  ・1問まちがえると 確認ポイント(pt) が下がる（10ずつ／0〜100）。
//  ・連続正解でも pt は少しずつ上がる（+10）。4連続でMAX(100)＆OK。
//  ・OK は一度ついたら消えない（sticky）。pt は今の調子をあらわすメーター。
//
//  state: { pt:0〜100, streak:連続正解数, ok:bool }
// ============================================================
export const UM_MAX = 100;
export const UM_GAIN = 10;     // 正解で +10
export const UM_LOSS = 10;     // まちがいで -10
export const UM_STREAK_OK = 4; // この連続正解で「OK」

export function blankUM() {
  return { pt: 0, streak: 0, ok: false };
}

/** 1問の正誤を反映した新しい state を返す（純関数） */
export function updateOne(prev, ok) {
  const p = prev || blankUM();
  if (ok) {
    const streak = p.streak + 1;
    let pt = Math.min(UM_MAX, p.pt + UM_GAIN);
    let okFlag = p.ok;
    if (streak >= UM_STREAK_OK) { okFlag = true; pt = UM_MAX; } // 4連続でOK＆満タン
    return { pt, streak, ok: okFlag };
  }
  // まちがい：連続はリセット、ポイントは下がる（OKは消えない）
  return { pt: Math.max(0, p.pt - UM_LOSS), streak: 0, ok: p.ok };
}

/** 正誤の並び（時系列）をまとめて反映する */
export function foldSequence(prev, bools) {
  let s = prev || blankUM();
  for (const b of bools) s = updateOne(s, b);
  return s;
}

/** OK（習得済み）の小単元数を数える */
export function countOk(unitMastery = {}) {
  return Object.values(unitMastery).filter((m) => m && m.ok).length;
}
