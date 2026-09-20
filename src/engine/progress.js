// ============================================================
// progress.js — 進捗・アンロック判定
// 「どの単元が解放済みか」「ある単元で取った星」などの判定ロジック。
// 保存データ(playerState)を読むだけで、保存方法(local/server)には依存しない。
// ============================================================
import {
  CYCLE_PRACTICE_TARGET, CYCLE_RELEARN_TARGET,
  MASTER_CYCLE_COIN, MASTER_CYCLE_CRYSTAL, isUnitCycleCleared,
} from "./scoring.js";
import { GEAR_STONE_CAP } from "./gear.js";

/** ある単元・難易度で取得済みの星を返す */
export function getStars(playerState, unitId, level) {
  return playerState?.stars?.[`${unitId}-${level}`] || 0;
}

/**
 * 単元が解放されているか。
 *  すべての小単元を最初から開放する。以前は「前の単元を★1クリアで解放」だったが、
 *  苦手な子が途中で詰まると先に進めず離脱しやすかったため、順番不問でどこからでも
 *  挑戦できるようにした（得意/苦手の可視化と「苦手ミックス」での復習を活かす方針）。
 */
export function isUnitUnlocked() {
  return true;
}

/** ある単元を「簡単・普通・難しい」全て★1以上で取れているか（仲間にする条件） */
export function unitFullyStarred(playerState, unitId) {
  return ["easy", "standard", "advanced"].every((lv) => getStars(playerState, unitId, lv) >= 1);
}

/** 章ごとの獲得星合計（達成度の表示用） */
export function chapterStarTotal(playerState, chapter, levelKeys) {
  let total = 0;
  for (const u of chapter.units) {
    for (const lv of levelKeys) total += getStars(playerState, u.id, lv);
  }
  return total;
}

// ============================================================
// サイクル進捗のルール（レベル/クリスタル/石/クリア/復習/診断）
//  ★純関数のみ★ 副作用（React更新・演出・sfx・Date.now）は含めない。
//  App.jsx（client 楽観更新）と、将来のサーバ（権威計算）が**同じこのルール**を使う。
//  設計: 10_Projects/math-labo/設計_サーバ移行とチート対策_2026-06-28.md（Step1）
// ============================================================

// 定数もここから参照できるよう再輸出（将来 import 先をここに寄せられる）
export {
  CYCLE_PRACTICE_TARGET, CYCLE_RELEARN_TARGET,
  MASTER_CYCLE_COIN, MASTER_CYCLE_CRYSTAL, isUnitCycleCleared, GEAR_STONE_CAP,
};

/** サイクル進捗（ためす/なおすの正解数）を増やした後の cycle エントリ（prev は不変） */
export function nextCycleCounts(prev = {}, { practice = 0, relearn = 0 } = {}) {
  return {
    ...prev,
    practiceN: (prev.practiceN || 0) + practice,
    relearnN: (prev.relearnN || 0) + relearn,
    lecture: !!prev.lecture, cleared: !!prev.cleared,
  };
}

/** 「なおす」クリア条件：学び直しで目標数正解、または直すべき間違いがそもそも無い */
export function naosuSatisfied(relearnN = 0, hasMistakes = false) {
  return (relearnN || 0) >= CYCLE_RELEARN_TARGET || !hasMistakes;
}

/** この学年で「サイクルクリア済み」の単元数（＝レベルの素）。unitsInWorld はその学年の全単元 */
export function clearedCountInWorld(cycleMap = {}, unitsInWorld = []) {
  return unitsInWorld.filter((u) => cycleMap[u.id]?.cleared).length;
}

/** レベル＝1＋クリア単元数。extraClearedId を渡すとその単元を「今クリアした」と仮定して数える */
export function levelAfterClear(cycleMap = {}, unitsInWorld = [], extraClearedId = null) {
  const map = extraClearedId
    ? { ...cycleMap, [extraClearedId]: { ...(cycleMap[extraClearedId] || {}), cleared: true } }
    : cycleMap;
  return 1 + clearedCountInWorld(map, unitsInWorld);
}

/** 間隔反復：クリア済み単元を解き直した時に付与すべきマイルストーン（["d1"]/["d7"]/["d1","d7"]/[]） */
export function reviewMilestonesToGrant(cyc = {}, nowMs = 0) {
  if (!cyc.cleared || !cyc.clearedAt) return [];
  const days = (nowMs - cyc.clearedAt) / 86400000;
  const give = [];
  if (days >= 1 && !cyc.r1) give.push("d1"); // 初クリアから1日以上
  if (days >= 7 && !cyc.r7) give.push("d7"); // 初クリアから1週間以上
  return give;
}

/** 診断結果を skillStats にラチェット反映（正解スキルだけ m を 0.8 以上へ・下げない）。純粋 */
export function ratchetSkillStats(skillStats = {}, results = [], today = "") {
  const ss = { ...skillStats };
  for (const r of results) {
    if (r.ok && r.skill) {
      const prev = ss[r.skill] || { m: 0.5, n: 0 };
      ss[r.skill] = { m: Math.max(prev.m ?? 0.5, 0.8), n: (prev.n || 0) + 1, last: today };
    }
  }
  return ss;
}

// ============================================================
// 難易度ナビ（れんしゅう／バトル中の自動レベル調整）— §④
//  「普通」から始まり、
//   ・その小単元で 2問まちがえたら 1段さげる（かんたんが下限）
//   ・5問連続で正解したら 1段あげる（発展が上限）
//  応用モードは別枠で、最初から「鬼」を出す（この関数は使わない）。
//  ★純関数★ 段が変わったら wrong/streak をリセット（新しい段で仕切り直し）。
// ============================================================
export const PRACTICE_LEVELS = ["easy", "standard", "advanced"]; // かんたん→ふつう→発展
export const DIFF_DOWN_WRONG = 2;  // その小単元で2問まちがえたら下げる（連続でなく累計）
export const DIFF_UP_STREAK = 5;   // 5問連続正解で上げる

/** 難易度ナビの初期状態（既定＝ふつう） */
export function initDifficulty(level = "standard") {
  return { level, wrong: 0, streak: 0 };
}

/** 1問の正誤から次の難易度状態を返す。
 *  返り値 { level, wrong, streak, changed }（changed は段が変わったら true）。 */
export function nextDifficulty(state, ok) {
  const L = PRACTICE_LEVELS;
  const s = { ...initDifficulty(), ...(state || {}) };
  let idx = L.indexOf(s.level);
  if (idx < 0) idx = L.indexOf("standard");
  let wrong = s.wrong || 0;
  let streak = s.streak || 0;
  if (ok) streak += 1;
  else { wrong += 1; streak = 0; }
  if (streak >= DIFF_UP_STREAK && idx < L.length - 1) {        // 5連正解で1段↑
    idx += 1; wrong = 0; streak = 0;
  } else if (wrong >= DIFF_DOWN_WRONG && idx > 0) {            // 累計2ミスで1段↓
    idx -= 1; wrong = 0; streak = 0;
  }
  return { level: L[idx], wrong, streak, changed: L[idx] !== s.level };
}
