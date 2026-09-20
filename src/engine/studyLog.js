// ============================================================
// studyLog.js — 「学習記録」画面の集計ロジック（2026-07-29設計）
//  records（挑戦記録の配列。makeRecordで作られる1回ぶんの結果）から、
//  日別・週別の学習量を集計する。新しい保存項目は増やさず、既存recordsだけから算出する。
//  学習「時間」は実測でなく、1問あたりの目安秒数からの推定値（分かりやすさ優先）。
// ============================================================
import { findUnitById, findChapterByUnitId } from "../data/index.js";

const SEC_PER_QUESTION = 30; // 1問あたりの目安時間（読む・考える・答える）
const FOCUS_MINUTES_TARGET = 15; // これ以上で「集中してがんばった」扱い
const WEEK_METER_MAX = 40; // 週間メーターの見た目上の満タン値（31以上はGreat!ゾーンに収まる）

/** createdAt（ISO文字列）から日付キーを作る。todayStr()と同じ書式（toLocaleDateString("ja-JP")）に揃える */
function dayKeyOf(iso) {
  try { return new Date(iso).toLocaleDateString("ja-JP"); } catch { return null; }
}

/** 「基準日」から n日ぶん遡った日付キー（0=基準日そのもの, 1=前日, ...） */
export function dayKeyBefore(n, base = new Date()) {
  const d = new Date(base);
  d.setDate(d.getDate() - n);
  return d.toLocaleDateString("ja-JP");
}

/** 1日ぶんのまとめ：合計問題数・正解数・推定学習分数・単元別の内訳 */
export function daySummary(records, dayKey) {
  let questions = 0, correct = 0;
  const byUnit = new Map(); // unitId -> 問題数
  for (const r of records || []) {
    if (!r.createdAt || dayKeyOf(r.createdAt) !== dayKey) continue;
    const q = (r.correct || 0) + (r.wrong || 0);
    if (q <= 0) continue;
    questions += q;
    correct += r.correct || 0;
    if (r.unitId) byUnit.set(r.unitId, (byUnit.get(r.unitId) || 0) + q);
  }
  const units = [...byUnit.entries()]
    .map(([unitId, uq]) => {
      const unit = findUnitById(unitId);
      const chapter = findChapterByUnitId(unitId);
      return { unitId, questions: uq, name: unit?.name || unitId, emoji: unit?.emoji || "📘", chapterName: chapter?.name || "" };
    })
    .sort((a, b) => b.questions - a.questions);
  const minutes = Math.round((questions * SEC_PER_QUESTION) / 60);
  return { dayKey, questions, correct, minutes, units, focused: minutes >= FOCUS_MINUTES_TARGET };
}

/** 直近n日ぶん（基準日を含む）の日別内訳＋合計問題数 */
export function weekSummary(records, n = 7, base = new Date()) {
  const days = Array.from({ length: n }, (_, i) => {
    const dayKey = dayKeyBefore(n - 1 - i, base); // 古い→新しい順
    return { dayKey, questions: daySummary(records, dayKey).questions };
  });
  const questions = days.reduce((s, d) => s + d.questions, 0);
  return { days, questions };
}

/** 週間の問題数から達成ラベルを決める（1〜10=OK！ 11〜30=Good！ 31〜=Great！） */
export function weeklyTier(questions) {
  if (questions >= 31) return { label: "Great!", color: "#fbbf24" };
  if (questions >= 11) return { label: "Good!", color: "#4ade80" };
  if (questions >= 1) return { label: "OK!", color: "#7dd3fc" };
  return { label: "", color: "rgba(255,255,255,.35)" };
}

/** 週間メーターの見た目の満タン率（0〜100%）。WEEK_METER_MAXで頭打ち */
export function weeklyMeterPct(questions) {
  return Math.max(0, Math.min(100, Math.round((questions / WEEK_METER_MAX) * 100)));
}
