// ============================================================
// unitTest.js — 単元テストの出題エンジン
//  章を渡すと、その章の全小単元から問題を集めて1セットにする。
//  各単元から「標準」と「発展」を1問ずつ → 章を網羅したテストになる。
//  数値は生成のたびに変わる（パターンはデータ＝PDF準拠）。
// ============================================================
import { genProblem } from "./generator.js";
import { shuffle } from "./rng.js";

/**
 * 章の単元テスト問題セットを作る。
 *  章の各小単元から複数問を集めて「章を網羅」するテストにする。
 *  問題は genProblem 経由なので、教科書DB(problem_bank.json)由来の実問題が
 *  あれば優先的に混ざり、無い小単元は手続き生成でフォールバックする。
 *  同じ小単元内では直近IDを避けて重複を防ぐ。
 * @param {object} chapter CHAPTERS の1章
 * @param {object|string[]} opts 出題設定（後方互換：配列なら levels とみなす）
 *   - levels: 各小単元から出す難易度（既定：標準＋発展）
 *   - perUnitPerLevel: 小単元×各レベルで集める問題数（既定2）
 *   - maxPerUnit: 小単元あたりの上限（既定5）
 *   - maxTotal: テスト全体の上限（既定30）
 * @returns {Array} [{ q, ans, h1, h2, unitId, unitName, level }, ...]（シャッフル済み）
 */
export function genUnitTest(chapter, opts = {}) {
  const o = Array.isArray(opts) ? { levels: opts } : opts;
  const {
    levels = ["standard", "advanced"],
    perUnitPerLevel = 2,
    maxPerUnit = 5,
    maxTotal = 30,
  } = o;

  const out = [];
  for (const unit of chapter.units) {
    const recent = [];      // この小単元で直近に出したテンプレID（重複回避）
    let unitCount = 0;
    for (const level of levels) {
      for (let k = 0; k < perUnitPerLevel && unitCount < maxPerUnit; k++) {
        const q = genProblem(unit, level, recent);
        if (!q) break;       // この小単元×難易度に出せる問題が無い
        recent.push(q.id);
        out.push({ ...q, unitId: unit.id, unitName: unit.name, level });
        unitCount++;
      }
    }
  }
  return shuffle(out).slice(0, maxTotal);
}

/** 単元テストの制限時間（秒）。1問あたり60秒で計算（章の問題数に応じて変わる）。 */
export function unitTestTimeLimit(questionCount) {
  return questionCount * 60;
}

/** 秒を mm:ss 形式の文字列にする */
export function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
