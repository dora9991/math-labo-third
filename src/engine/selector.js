// ============================================================
// selector.js — アダプティブ出題セレクタ（次の一問を選ぶ）
//
// 『構想と計画.md』2-6 の出題ポリシー：
//   ①狙い：習熟度が低い／久しく触っていないスキルを優先ターゲットに
//   ②難易度：そのスキルで期待正答率≈0.75になる難易度を選ぶ
//   ③混ぜる：たまに他スキルをインターリーブ（定着確認・飽き防止）
//
// 章(chapter)の問題テンプレを「スキル×難易度」で索引化し、
// skillStats（習熟度の記録）を見て1件えらんで返すだけの純関数。
// 返り値は data/generator の buildTemplate にそのまま渡せる形。
// ============================================================
import { pick } from "./rng.js";
import { levelDifficulty, targetDifficulty, INITIAL_MASTERY } from "./mastery.js";

/**
 * 章のテンプレを平らな索引にする。
 * @returns {Array} [{ chapterId, unitId, level, templateId, skill }]
 */
export function buildIndex(chapter) {
  const out = [];
  for (const unit of chapter.units) {
    for (const level of ["easy", "standard", "advanced"]) {
      const templates = unit.problems?.[level] || [];
      for (const t of templates) {
        out.push({
          chapterId: chapter.id,
          unitId: unit.id,
          level,
          templateId: t.id,
          skill: t.skill || null,
        });
      }
    }
  }
  return out.filter((e) => e.skill); // スキル未タグは対象外
}

/**
 * 次に出す一問を選ぶ。
 * @param {object} chapter      CHAPTERS の1章
 * @param {object} skillStats   { [skillId]: { m, n, last } }
 * @param {object} opts         { index?, lastTemplateId?, targetSkill?, interleaveProb? }
 * @returns {object|null} { chapterId, unitId, level, templateId, skill }
 */
export function pickNext(chapter, skillStats = {}, opts = {}) {
  const index = opts.index || buildIndex(chapter);
  if (index.length === 0) return null;

  const skills = [...new Set(index.map((e) => e.skill))];
  const mOf = (s) => skillStats?.[s]?.m ?? INITIAL_MASTERY;
  const nOf = (s) => skillStats?.[s]?.n ?? 0;

  // ── ① ターゲットスキルを決める ───────────────
  let target;
  if (opts.targetSkill && skills.includes(opts.targetSkill)) {
    target = opts.targetSkill; // 「このスキルを練習」と指定された場合（Notebookからの起動など）
  } else {
    const interleave = Math.random() < (opts.interleaveProb ?? 0.25);
    if (interleave) {
      target = pick(skills); // たまにランダムで混ぜる
    } else {
      // 習熟度が低い順 → 同点なら試行回数が少ない順 → ランダム
      target = [...skills].sort((a, b) => (mOf(a) - mOf(b)) || (nOf(a) - nOf(b)) || (Math.random() - 0.5))[0];
    }
  }

  // ── ② 期待正答率≈0.75 になる難易度を選ぶ ─────
  const want = targetDifficulty(mOf(target), 0.75);
  const levelsForSkill = [...new Set(index.filter((e) => e.skill === target).map((e) => e.level))];
  let level = levelsForSkill
    .map((l) => ({ l, d: levelDifficulty(l) }))
    .sort((x, y) => Math.abs(x.d - want) - Math.abs(y.d - want))[0]?.l || "easy";

  // ── ②' 連続正解/不正解による難易度バイアス ───────
  //  levelBias>0：連続正解 → 難しい方へ ／ levelBias<0：連続不正解 → 易しい方へ
  if (opts.levelBias) {
    const ORDER = ["easy", "standard", "advanced"];
    const avail = ORDER.filter((l) => levelsForSkill.includes(l));
    if (avail.length) {
      const cur = Math.max(0, avail.indexOf(level));
      const next = Math.max(0, Math.min(avail.length - 1, cur + opts.levelBias));
      level = avail[next];
    }
  }

  // ── ③ (skill, level) の中からテンプレを1つ（直前と同じは避ける）──
  let cands = index.filter((e) => e.skill === target && e.level === level);
  if (opts.lastTemplateId) {
    const filtered = cands.filter((e) => e.templateId !== opts.lastTemplateId);
    if (filtered.length) cands = filtered;
  }
  return pick(cands) || null;
}
