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

// ---- 「ものがたりを自動で見る」の設定（既定ON。OFFでも、ものがたり画面からいつでも見られる）
const AUTO_KEY = "mathLabo3_story_auto_v1";
export function isStoryAuto() {
  try { return localStorage.getItem(AUTO_KEY) !== "0"; } catch { return true; }
}
export function setStoryAuto(on) {
  try { localStorage.setItem(AUTO_KEY, on ? "1" : "0"); } catch { /* noop */ }
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

// ---- 「ものがたり」一覧（見返し用）。場面は「見た」か「その進み具合に届いた」ら見られる。未視聴は NEW ----
/** 学年ごとの一覧。state＝サーバーの状態（cleared / bossDone）。返り値: [{ id, title, items:[{ label, unlocked, isNew, scenes }] }] */
export function libraryFor(grade, state, seen) {
  const data = STORY[grade];
  if (!data) return [];
  const cleared = state?.cleared || {}, bossDone = state?.bossDone || {};
  // 1項目＝1〜2場面。「見た」か、その進み具合に届いていれば見られる（unlockedByProgress）。1つでも未視聴なら NEW
  const entry = (label, keys, beatsList, propsList, unlockedByProgress) => {
    const usable = keys.map((k, i) => ({ k, b: beatsList[i], p: propsList[i] })).filter((x) => x.b?.length);
    if (!usable.length) return null;
    const unlocked = usable.some((x) => seen.has(x.k)) || !!unlockedByProgress;
    return { label, unlocked, isNew: unlocked && !usable.every((x) => seen.has(x.k)), scenes: usable.map((x) => ({ key: x.k, beats: x.b, ...x.p })) };
  };
  const groups = [{ id: "prologue", title: "プロローグ", items: [entry("はじまり", [`${grade}:prologue`], [data.prologue], [{ bg: "bg_hall", kind: "prologue", grade }], true)].filter(Boolean) }];
  Object.keys(data.chapters).forEach((cid, ci) => {
    const ch = data.chapters[cid], wc = getChapter(grade, cid);
    const base = { bg: chapterBg(cid), grade, chapterId: cid };
    const items = [entry("章のはじまり", [`${grade}:${cid}:door`], [ch.door], [{ ...base, kind: "door", title: `第${ci + 1}章　${ch.title}`, enemyId: wc?.chapterBoss?.id }], true)];
    for (const sub of wc?.subUnits || []) {
      const s = ch.subs[sub.order];
      if (!s) continue;
      const t = `${ci + 1}-${sub.order}　${s.title}`;
      items.push(entry(t, [`${grade}:${cid}:s${sub.order}:pre`, `${grade}:${cid}:s${sub.order}:post`], [s.pre, s.post],
        [{ ...base, kind: "pre", title: t, enemyId: sub.boss?.id }, { ...base, kind: "post", title: t, enemyId: sub.boss?.id }], !!cleared[`${grade}:${cid}:${sub.id}`]));
    }
    const bossHere = !!bossDone[`${grade}:${cid}`];
    const bt = `${ch.title}の主`;
    items.push(entry(bt, [`${grade}:${cid}:boss:pre`, `${grade}:${cid}:boss:post`], [ch.bossPre, ch.bossPost],
      [{ ...base, kind: "bossPre", title: bt, enemyId: wc?.chapterBoss?.id }, { ...base, kind: "bossPost", title: bt, enemyId: wc?.chapterBoss?.id }], bossHere));
    if (cid === LAST[grade] && data.finale?.length) items.push(entry("最終章", [`${grade}:finale`], [data.finale], [{ ...base, kind: "finale", title: "最終章" }], bossHere));
    groups.push({ id: cid, title: `第${ci + 1}章　${ch.title}`, items: items.filter(Boolean) });
  });
  return groups;
}

/** ものがたりの NEW の数（メニューの目印用） */
export function countNew(grade, state, seen) {
  return libraryFor(grade, state, seen).reduce((a, g) => a + g.items.filter((i) => i.isNew).length, 0);
}
