// ============================================================
// scaffold.js — 「足場（前提もどり）」：すでに躓いている子への B-1 ロジック
//  確認問題に落ちた単元について、スキルDAG(data/skills.js の prereqs)をたどり、
//  「前の単元で練習でき・まだ習得していない」前提スキルを1つ返す。
//  → UIは「🔍 ここが土台かも：『◯◯』を3問」を出し、その前提を練習させてから元に戻す。
//  ・前提が概念スキル(練習問題が無い)の時は、それを直接前提に持つ"練習できるスキル"に翻訳する。
//  ・戻り先は必ず「今より前の単元」に限る（先の単元・同じ単元には戻さない）。
//  設計: 10_Projects/math-labo/設計_すでに躓いている子への足場_2026-06-28.md
// ============================================================
import { SKILLS } from "../data/skills.js";
import { chaptersForGrade, findChapterByUnitId } from "../data/index.js";
import { elemPoolForChapter } from "../data/elementaryBank.js";
import { THETA, INITIAL_MASTERY } from "./mastery.js";

const LEVELS = ["easy", "standard", "advanced"];

// 「練習できるスキル→単元配列」と「単元id→カリキュラム順(連番)」の索引（初回だけ構築・キャッシュ）
let _idx = null, _order = null;
function build() {
  if (_idx) return;
  _idx = {}; _order = {};
  let seq = 0;
  for (const g of [1, 2, 3]) {
    for (const ch of chaptersForGrade(g)) {
      for (const u of ch.units || []) {
        _order[u.id] = seq++;
        for (const s of skillsOfUnit(u)) (_idx[s] = _idx[s] || []).push(u);
      }
    }
  }
}

// その単元の問題テンプレが練習するスキル集合（テンプレは p(id,build,skill) で .skill を持つ）
function skillsOfUnit(unit) {
  const set = new Set();
  for (const lv of LEVELS) for (const t of unit?.problems?.[lv] || []) if (t.skill) set.add(t.skill);
  return [...set];
}

// 練習できる(=どこかの単元の問題に出る)スキルか
function practiceable(s) { return !!(_idx[s] && _idx[s].length); }

// 章の小学リメディ問題を、StepUpSimple が食べられる「合成ユニット」にする（B-2）。
//  小学の各問題は静的({q, answerNumeric})なので build() でそのまま返す。
//  StepUpSimple は easy/standard/advanced のどれかをランダムに引くので、全レベルに同じプールを入れて空を防ぐ。
function elemUnitForUnit(unit) {
  const ch = findChapterByUnitId(unit.id);
  if (!ch) return null;
  const pool = elemPoolForChapter(ch.id);
  if (!pool.length) return null;
  const tmpl = pool.map((p) => ({
    id: p.id, skill: null,
    build: () => ({ q: p.q, ans: p.answerNumeric != null ? p.answerNumeric : p.answer, h1: "", h2: "" }),
  }));
  return { id: "elem-" + ch.id, name: "小学のふくしゅう", emoji: "🧮", problems: { easy: tmpl, standard: tmpl, advanced: tmpl } };
}

// スキル s を「練習できるスキル」に翻訳：
//  そのまま練習できればそれ／概念なら、それを直接 prereq に持つ練習可能スキルへ展開。
function toPracticeable(s, out) {
  if (practiceable(s)) { out.add(s); return; }
  for (const q of Object.keys(SKILLS)) {
    if (practiceable(q) && (SKILLS[q].prereqs || []).includes(s)) out.add(q);
  }
}

/**
 * その単元でつまずいた時の「土台（前提）」を1つ返す。見つからなければ null（＝戻る先なし＝再挑戦のみ）。
 *  @param {object} unit  いま躓いている単元
 *  @param {object} skillStats  player.skillStats（{ [skillId]: { m } }）
 *  @returns {{ skillId, skillName, unit, fromUnitId } | null}
 */
export function findScaffold(unit, skillStats = {}) {
  if (!unit) return null;
  build();
  const curOrder = _order[unit.id] ?? Infinity;
  // 1) この単元のスキルの「1段前の前提」を、練習できるスキルに翻訳して集める
  const candSkills = new Set();
  for (const s of skillsOfUnit(unit)) {
    for (const p of SKILLS[s]?.prereqs || []) toPracticeable(p, candSkills);
  }
  // 2) 各候補に「今より前の単元で・最も近い戻り先」を割り当て、未習得(m<THETA)に絞る
  const cands = [];
  for (const q of candSkills) {
    const earlier = (_idx[q] || []).filter((u) => (_order[u.id] ?? Infinity) < curOrder);
    if (!earlier.length) continue; // 前に戻れる単元が無いスキルは対象外
    earlier.sort((a, b) => (_order[b.id] ?? 0) - (_order[a.id] ?? 0)); // 直前に近い順
    const m = skillStats[q]?.m ?? INITIAL_MASTERY;
    if (m >= THETA) continue; // すでに習得済みは出さない
    cands.push({ q, m, diff: SKILLS[q]?.difficulty ?? 3, home: earlier[0] });
  }
  if (cands.length) {
    // 習熟が低い → 難易度が低い（より土台）順
    cands.sort((a, b) => a.m - b.m || a.diff - b.diff);
    const best = cands[0];
    return { kind: "unit", skillId: best.q, skillName: SKILLS[best.q]?.name || best.q, unit: best.home, fromUnitId: unit.id };
  }
  // B-2：中1の前提が無い（＝最も土台の単元）なら、小学の復習へ降りる
  const elem = elemUnitForUnit(unit);
  if (elem) return { kind: "elem", skillId: elem.id, skillName: "小学のふくしゅう", unit: elem, fromUnitId: unit.id };
  return null;
}
