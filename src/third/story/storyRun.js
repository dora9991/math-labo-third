// ============================================================
// storyRun.js — ストーリーの「いつ・どの場面を出すか」の決定と、見た場面の記録。
//  場面のデータは storyData.json（docs/story-scripts/*.md から scripts/build-story.mjs で生成）。
//  出すタイミング：
//    バトル開始前   … その学年の導入(初回のみ) → 章の扉(初回のみ) → 小単元の「強敵あらわる」／章ボスの「主」
//    勝利（報酬）前 … 小単元の「カゲが晴れて」／章ボスの「主のあと」→（学年最後の章なら）最終章
//  一度見た場面は出さない（localStorage）。スキップも「見た」に数える。
// ============================================================
import STORY from "./storyData.json";
import { getChapter } from "../data/storyMap.js";

const SEEN_KEY = "mathLabo3_story_seen_v1";
export function loadSeen() {
  try { return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) || "[]")); } catch { return new Set(); }
}
export function saveSeen(set) {
  try { localStorage.setItem(SEEN_KEY, JSON.stringify([...set])); } catch { /* 保存できなくても進行は止めない */ }
}

// 章ID → 背景ID（c1→bg_g1c1 / g2c3→bg_g2c3）
export const chapterBg = (chapterId) => "bg_" + (/^c\d/.test(chapterId) ? "g1" + chapterId : chapterId);
const LAST = { 1: "c7", 2: "g2c6", 3: "g3c8" };

/** 今の画面(nav)の前に出す場面のリスト（未視聴のものだけ）。 */
export function scenesFor(nav, seen) {
  const p = nav?.params || {};
  if (!p.grade || !p.chapterId || (nav.screen !== "battle" && nav.screen !== "reward")) return [];
  const data = STORY[p.grade];
  const ch = data?.chapters?.[p.chapterId];
  if (!ch) return [];
  const wc = getChapter(p.grade, p.chapterId);
  const bg = chapterBg(p.chapterId);
  const out = [];
  const add = (key, beats, extra = {}) => { if (beats?.length && !seen.has(key)) out.push({ key, beats, bg, grade: p.grade, chapterId: p.chapterId, ...extra }); };
  const chNo = Object.keys(data.chapters).indexOf(p.chapterId) + 1;

  if (nav.screen === "battle") {
    add(`${p.grade}:prologue`, data.prologue, { bg: "bg_hall", kind: "prologue" });
    add(`${p.grade}:${p.chapterId}:door`, ch.door, { kind: "door", title: `第${chNo}章　${ch.title}`, enemyId: wc?.chapterBoss?.id });
    if (p.kind === "subUnit") {
      const sub = wc?.subUnits.find((s) => s.id === p.subUnitId);
      const s = sub && ch.subs[sub.order];
      if (s) add(`${p.grade}:${p.chapterId}:s${sub.order}:pre`, s.pre, { kind: "pre", title: `${chNo}-${sub.order}　${s.title}`, enemyId: sub.boss?.id });
    } else if (p.kind === "chapterBoss") {
      add(`${p.grade}:${p.chapterId}:boss:pre`, ch.bossPre, { kind: "bossPre", title: `${ch.title}の主`, enemyId: wc?.chapterBoss?.id });
    }
  } else if (nav.screen === "reward") {
    if (p.kind === "subUnit") {
      const sub = wc?.subUnits.find((s) => s.id === p.subUnitId);
      const s = sub && ch.subs[sub.order];
      if (s) add(`${p.grade}:${p.chapterId}:s${sub.order}:post`, s.post, { kind: "post", title: `${chNo}-${sub.order}　${s.title}`, enemyId: sub.boss?.id });
    } else if (p.kind === "chapterBoss") {
      add(`${p.grade}:${p.chapterId}:boss:post`, ch.bossPost, { kind: "bossPost", title: `${ch.title}の主`, enemyId: wc?.chapterBoss?.id });
      if (p.chapterId === LAST[p.grade]) add(`${p.grade}:finale`, data.finale, { kind: "finale", title: "最終章" });
    }
  }
  return out;
}

// ---- BGM（Suno制作の story_* ）。場面の種類・背景・「記憶／日記」かどうかで、行ごとに曲を決める ----
const DAILY_BG = new Set(["bg_hall", "bg_dorm", "bg_kikimimi", "bg_rooftop"]);
/** scene.beats の各行で鳴らす曲名の配列を返す（同じ名前が続く間は曲は途切れない）。 */
export function bgmTracks(scene) {
  const g = scene.grade || 1;
  const theme = `story_g${g}`;
  const epi = `story_epilogue_g${g}`;
  let bg = scene.bg, mem = false;
  return scene.beats.map((b) => {
    if (b.bg) bg = b.bg;
    if (b.k === "label" || (b.k === "say" && (b.mem || b.voice === "日記"))) mem = true;
    else if (b.k === "say") mem = false; // 現実に戻った台詞
    switch (scene.kind) {
      case "prologue":
        if (g === 3) return theme;
        if (g === 1) return DAILY_BG.has(bg) ? "story_daily" : "story_prologue";
        return DAILY_BG.has(bg) ? "story_daily" : theme;   // 中2：日常 → 光の橋でジンの島のテーマへ
      case "door": return theme;
      case "pre": return "story_dread";
      case "post": return "story_relief";
      case "bossPre": return "story_boss_pre";
      case "bossPost":
        if (mem) return "story_memory";
        return scene.chapterId === "g2c6" ? "story_epilogue_g2" : "story_sad"; // 中2最終章のボス後＝ジンとミラの再会
      case "finale": {
        const sec = b.sec || "";
        if (sec.startsWith("〔扉〕")) return "story_finale_gate";
        if (g === 2) return "story_g3";          // 中2エピローグ：次の島（白い塔）が見える
        return epi;                              // 〔ノクスのあと〕〔魔王のあと〕〔ナギ〕〔エピローグ〕
      }
      default: return null;
    }
  });
}
