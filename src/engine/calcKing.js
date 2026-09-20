// ============================================================
// calcKing.js — 「計算王への道」用の出題エンジン（単元ごと）
//
//  プレイヤーが選んだ小単元の「ハイレベル問題」を1問ずつ出す。
//  ハイレベル＝暗算が厳しい問題(isHardProblem)を優先。無ければ発展。
//  間違えたら終了。連続正解数と、5問を解き終わるタイムを競う。
// ============================================================
import { genProblemSeeded, isHardProblem } from "./generator.js";
import { pick } from "./rng.js";
import { calcKingPoolFor } from "../data/calcKingProblems.js";

/**
 * 「途中計算や文章の読み取りで“式を書く”作業が要る」問題か。
 *  ・isHardProblem（√・小数・分数）… 手で計算しないと解けない
 *  ・文章題（日本語の文が含まれ、ある程度長い）… 読み取って式を立てる
 * チャレンジでは、こういう“作業の要る問題”を優先して並べる。
 */
export function needsWork(p) {
  if (!p) return false;
  if (isHardProblem(p)) return true;
  const q = String(p.q || "");
  if (q.length >= 16 && /[、。]/.test(q)) return true; // 文章題＝読み取って式を立てる
  return false;
}

/**
 * 選んだ単元のハイレベル問題を1問返す（直近に出たIDは避ける）。
 * @param {object} unit 出題する小単元
 * @param {string[]} recent 直近に出した問題ID
 * @returns {object|null} { q, ans, id, unitName, ... }
 */
export function nextCalcProblem(unit, recent = []) {
  if (!unit) return null;
  // ④ 応用は「鬼」問題を最優先で出す（各単元10問用意）。無ければ発展→標準にフォールバック。
  for (let i = 0; i < 16; i++) {
    const p = genProblemSeeded(unit, "oni", recent);
    if (p) return { ...p, unitName: unit.name };
  }
  // 鬼が無い単元：暗算が厳しい発展を優先
  for (let i = 0; i < 16; i++) {
    const p = genProblemSeeded(unit, "advanced", recent);
    if (p && isHardProblem(p)) return { ...p, unitName: unit.name };
  }
  const p = genProblemSeeded(unit, "advanced", recent) || genProblemSeeded(unit, "standard", recent);
  return p ? { ...p, unitName: unit.name } : null;
}

/**
 * 章（単元）全体から、作業の要る発展問題を1問返す。小単元をまたいで出題する。
 * チャレンジは「小単元」ではなく「単元（章）」の大きな括りで挑むためのもの。
 * @param {object} chapter 出題する章（units[] を持つ）
 * @param {string[]} recent 直近に出した問題ID
 * @returns {object|null} { q, ans, id, unitName(=章名), subName(=小単元名), ... }
 */
export function nextChapterCalcProblem(chapter, recent = []) {
  if (!chapter) return null;
  // ⓪ 教科書の章末・発展の「文章問題プール」があれば最優先で出す（手書き計算が要る厳選問題）
  const pool = calcKingPoolFor(chapter.id);
  if (pool.length) {
    const usable = pool.filter((p) => !recent.includes(p.id));
    const from = usable.length ? usable : pool;
    const p = pick(from);
    if (p) return { ...p, unitName: chapter.name, subName: "文章・発展" };
  }
  const units = chapter.units || (chapter.problems ? [chapter] : []);
  if (!units.length) return null;
  // ④ 応用は「鬼」問題を最優先（各単元10問）。小単元をまたいでランダムに出す。
  for (let i = 0; i < 28; i++) {
    const u = pick(units);
    const p = genProblemSeeded(u, "oni", recent);
    if (p) return { ...p, unitName: chapter.name, subName: u.name };
  }
  // ① 鬼が尽きたら「作業の要る発展問題」を探す
  for (let i = 0; i < 28; i++) {
    const u = pick(units);
    const p = genProblemSeeded(u, "advanced", recent);
    if (p && needsWork(p)) return { ...p, unitName: chapter.name, subName: u.name };
  }
  // ② 見つからなければ、どれかの発展（無ければ標準）をそのまま出す
  for (let i = 0; i < 10; i++) {
    const u = pick(units);
    const p = genProblemSeeded(u, "advanced", recent) || genProblemSeeded(u, "standard", recent);
    if (p) return { ...p, unitName: chapter.name, subName: u.name };
  }
  return null;
}

/** ミリ秒を mm:ss.x（小数1桁）に整形 */
export function formatTime(ms) {
  if (ms == null) return "--:--";
  const t = Math.max(0, ms);
  const m = Math.floor(t / 60000);
  const s = Math.floor((t % 60000) / 1000);
  const d = Math.floor((t % 1000) / 100);
  return `${m}:${String(s).padStart(2, "0")}.${d}`;
}
