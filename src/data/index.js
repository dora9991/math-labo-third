// ============================================================
// data/index.js — 全章を束ねる窓口
// 画面側は CHAPTERS をこのファイルから読み込むだけでよい。
// 新しい章を足すときは import を1行追加して CHAPTERS に並べるだけ。
// ============================================================
import { chapter as c1 } from "./grade1/c1_seisu.js";
import { chapter as c2 } from "./grade1/c2_moji.js";
import { chapter as c3 } from "./grade1/c3_houteishiki.js";
import { chapter as c4 } from "./grade1/c4_hirei.js";
import { chapter as c5 } from "./grade1/c5_heimen.js";
import { chapter as c6 } from "./grade1/c6_kukan.js";
import { chapter as c7 } from "./grade1/c7_data.js";
// 中2
import { chapter as g2c1 } from "./grade2/g2c1.js";
import { chapter as g2c2 } from "./grade2/g2c2.js";
import { chapter as g2c3 } from "./grade2/g2c3.js";
import { chapter as g2c4 } from "./grade2/g2c4.js";
import { chapter as g2c5 } from "./grade2/g2c5.js";
import { chapter as g2c6 } from "./grade2/g2c6.js";
// 中3
import { chapter as g3c1 } from "./grade3/c1_shiki.js"; // 式の展開と因数分解
import { chapter as g3c2 } from "./grade3/g3c2.js";
import { chapter as g3c3 } from "./grade3/g3c3.js";
import { chapter as g3c4 } from "./grade3/g3c4.js";
import { chapter as g3c5 } from "./grade3/g3c5.js";
import { chapter as g3c6 } from "./grade3/g3c6.js";
import { chapter as g3c7 } from "./grade3/g3c7.js";
import { chapter as g3c8 } from "./grade3/g3c8.js";

// CHAPTERS は中1（既存のバトル・チャレンジ・苦手などが参照する基準。変更しない）
export const CHAPTERS = [c1, c2, c3, c4, c5, c6, c7];

// 学年ごとの章。タイムアタック等は選択中の学年の章を使う。
const CHAPTERS_G2 = [g2c1, g2c2, g2c3, g2c4, g2c5, g2c6];
const CHAPTERS_G3 = [g3c1, g3c2, g3c3, g3c4, g3c5, g3c6, g3c7, g3c8];
export const GRADES = { 1: CHAPTERS, 2: CHAPTERS_G2, 3: CHAPTERS_G3 };

/** 指定学年の章一覧 */
export function chaptersForGrade(grade) {
  return GRADES[grade] || [];
}
/** 章がある学年だけ返す（UIの学年ボタン用） */
export function gradesWithChapters() {
  return [1, 2, 3].filter((g) => (GRADES[g] || []).length > 0);
}

// 難易度の共通定義（画面でラベル・色に使う）
// 進行・習得の基準になる3段階（★ここは変えない。全難易度クリア＝この3つ）
export const LEVEL_KEYS = ["easy", "standard", "advanced"];
// 「鬼」は得意な子向けの“発展の上”の挑戦枠。LEVEL_KEYS には入れない（進行判定に影響させない）。
//  unit.problems.oni を持つ単元だけ、難易度選択に4枚目のカードとして出る。
export const ONI = "oni";
export const LEVEL_LABEL = { easy: "かんたん", standard: "ふつう", advanced: "発展", oni: "鬼" };
export const LEVEL_COLOR = { easy: "#4ade80", standard: "#fb923c", advanced: "#f87171", oni: "#a855f7" };

/** 章ID・単元IDから単元を探す（全学年から） */
export function findUnit(chapterId, unitId) {
  for (const list of Object.values(GRADES)) {
    const u = list.find((c) => c.id === chapterId)?.units.find((u) => u.id === unitId);
    if (u) return u;
  }
  return undefined;
}

/** 単元IDだけから単元を探す（全学年から。章IDが無い記録＝バトルの誤答などで使う） */
export function findUnitById(unitId) {
  for (const list of Object.values(GRADES)) {
    for (const c of list) {
      const u = c.units.find((u) => u.id === unitId);
      if (u) return u;
    }
  }
  return undefined;
}

/** 章IDから章を探す（全学年から。計算王＝章単位の記録に使う） */
export function findChapterById(chapterId) {
  for (const list of Object.values(GRADES)) {
    const c = list.find((c) => c.id === chapterId);
    if (c) return c;
  }
  return undefined;
}

/** 単元IDからその単元が属する章を探す（学年・色・解説動画の特定に使う） */
export function findChapterByUnitId(unitId) {
  for (const list of Object.values(GRADES)) {
    for (const c of list) {
      if (c.units.some((u) => u.id === unitId)) return c;
    }
  }
  return undefined;
}

/** 全単元を平らな配列で返す（記録表示などに便利） */
export function allUnits() {
  return CHAPTERS.flatMap((c) => c.units);
}

/** 全学年の章を学年順（中1→中2→中3）で平らに返す。
 *  ★RPG進行（モンスター・章ボス・魔王・単元テスト・ステータス）はこれを土台にする。 */
export function allChapters() {
  return [...(GRADES[1] || []), ...(GRADES[2] || []), ...(GRADES[3] || [])];
}

// ── 章の「部類」ラベル ─────────────────────────────────
// 章名だけだと「なにをする単元か」が分かりにくい、という生徒のご意見（2026-10-06）への対応。
// 例：正の数と負の数 →（計算）。章を一覧する画面で、章名の横に出す。
//  kind＝色分けの種類（calc 計算 / graph 関数・グラフ / figure 図形 / data データ）。
//  新しい章を足したら、ここに1行足すだけでよい（無い章は何も出さない＝壊れない）。
const CHAPTER_TAGS = {
  // 中1
  c1: ["計算", "calc"], c2: ["計算", "calc"], c3: ["計算・文章題", "calc"],
  c4: ["関数・グラフ", "graph"], c5: ["図形", "figure"], c6: ["図形", "figure"], c7: ["データ", "data"],
  // 中2
  g2c1: ["計算", "calc"], g2c2: ["計算・文章題", "calc"], g2c3: ["関数・グラフ", "graph"],
  g2c4: ["図形", "figure"], g2c5: ["図形", "figure"], g2c6: ["データ", "data"],
  // 中3
  g3c1: ["計算", "calc"], g3c2: ["計算", "calc"], g3c3: ["計算・文章題", "calc"], g3c4: ["関数・グラフ", "graph"],
  g3c5: ["図形", "figure"], g3c6: ["図形", "figure"], g3c7: ["図形", "figure"], g3c8: ["データ", "data"],
};
export const CHAPTER_TAG_COLOR = { calc: "#fbbf24", graph: "#38bdf8", figure: "#f472b6", data: "#34d399" };

/** 章（または章ID）の部類ラベルを返す。{ label, kind, color } / 無ければ null */
export function chapterTag(chapterOrId) {
  const id = typeof chapterOrId === "string" ? chapterOrId : chapterOrId?.id;
  const t = CHAPTER_TAGS[id];
  return t ? { label: t[0], kind: t[1], color: CHAPTER_TAG_COLOR[t[1]] } : null;
}
