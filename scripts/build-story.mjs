// docs/story-scripts/grade{1,2,3}.md → src/third/story/storyData.json
import fs from "node:fs";
const GRADE_CH = {
  1: ["c1","c2","c3","c4","c5","c6","c7"],
  2: ["g2c1","g2c2","g2c3","g2c4","g2c5","g2c6"],
  3: ["g3c1","g3c2","g3c3","g3c4","g3c5","g3c6","g3c7","g3c8"],
};
// 背景の切り替え（その行のテキストに一致したら、その行から背景を変える）
const BG_RULES = {
  1: { prologue: [["bg_room_night"], [/足もとには、どこまでも続く雲の海/, "bg_sky_bridge"], [/天文台の扉をくぐった/, "bg_hall"], [/その夜。ミオは、きみを小さな部屋/, "bg_dorm"]],
       finale: { "〔扉〕": "bg_noctus_room", "〔魔王のあと〕": "bg_noctus_room", "〔エピローグ〕": "bg_sky_bridge" } },
  2: { prologue: [["bg_hall"], [/望遠鏡から、光の橋/, "bg_sky_bridge"]],
       finale: { "〔扉〕": "bg_g2c5", "〔エピローグ〕": "bg_hall" } },
  3: { prologue: [["bg_hall"], [/望遠鏡から、光の階段/, "bg_g3_tower"]],
       finale: { "〔扉〕": "bg_g3_top", "〔魔王のあと〕": "bg_g3_top", "〔ナギ〕": "bg_g3_nagiroom", "〔エピローグ": "bg_kikimimi", rules: [[/ある晴れた朝/, "bg_rooftop"]] } },
};
const HUMAN = { "ミオ":"mio","カヲル":"kaoru","館長":"kancho","ジン":"jin","ナギ":"nagi","ミラ":"mira","ノクス":"noctus","鏡のミオ":"mio" };
const ALLY = { "シロフクロウバード":"sp093","クラゲの精霊":"sp081","スノーレオパード":"sp042","サクラスネーク":"sp019","ボーダーコリー":"sp137" };
const FOE = new Set(["強敵","主","魔王"]);
const SUFFIX = /（(通信|声|記憶|日記|まぼろし)）$/;
const EXPRESSIONLESS = new Set(["mio","kaoru","kancho","jin","nagi","mira","noctus"]);

function emotion(t) {
  if (/^(え(?!へ)|はあ|うそ)|！？|えっ|しゃべった|!\?/.test(t)) return "surprised";
  if (/ありがと|よかった|うれし|えへへ|ふふ|へへ|ただいま|おかえり|すごい|おいしい|あったか|笑いあ|おそいよ/.test(t)) return "happy";
  if (/ごめん|すまな|さびし|泣|ひとり|後悔|つらい|こわい|こわかった|もういいや|遅い/.test(t)) return "sad";
  if (/ちがう|だめ|やめ|うるさい|たおさない|とかす|お願い|許せ|行こう|迎えに/.test(t)) return "angry";
  return null;
}
function line(raw) {
  const s = raw.trim();
  const m = s.match(/^([^：]{1,14})：(.*)$/);
  if (m) {
    const name = m[1], t = m[2].trim();
    if (name === "ナレーター") return { k: "nar", t };
    const base = name.replace(SUFFIX, "");
    const suffix = (name.match(SUFFIX) || [])[1] || null;
    if (FOE.has(name)) return { k: "say", who: "foe", n: name === "主" ? "主" : name === "魔王" ? "魔王" : "？？？", t };
    if (HUMAN[base] || ALLY[base]) {
      const b = { k: "say", who: HUMAN[base] || ALLY[base], n: name, t };
      if (HUMAN[base] && EXPRESSIONLESS.has(HUMAN[base])) { const e = emotion(t); if (e) b.e = e; }
      if (suffix === "通信" || suffix === "声" || suffix === "日記") b.voice = suffix; // 立ち絵は出さない
      if (suffix === "記憶") b.mem = true;
      return b;
    }
    return { k: "nar", t: s }; // 未知の話者は地の文として出す
  }
  return { k: "nar", t: s };
}

function parse(grade) {
  const src = fs.readFileSync(`docs/story-scripts/grade${grade}.md`, "utf8").split("\n");
  const start = src.findIndex((l) => l.startsWith("## プロローグ")), end = src.findIndex((l) => l.startsWith("## 批評"));
  const ids = GRADE_CH[grade];
  const out = { prologue: [], chapters: {}, finale: [] };
  let part = null, chapter = null, section = null, phase = "pre", chNo = 0;
  const bgr = BG_RULES[grade];
  let curBg = null;
  const push = (b) => {
    if (part === "prologue") {
      for (const r of bgr.prologue) if (r.length === 1 ? !out.prologue.length : r[0].test(b.t || "")) { curBg = r[r.length - 1]; }
      if (curBg) b.bg = curBg;
      out.prologue.push(b);
    } else if (part === "finale") {
      const f = bgr.finale; const key = Object.keys(f).find((k) => k !== "rules" && section?.startsWith(k));
      if (key) curBg = f[key];
      for (const r of f.rules || []) if (r[0].test(b.t || "")) curBg = r[1];
      if (curBg) b.bg = curBg;
      b.sec = section || ""; // BGMの切り替え用（〔扉〕/〔魔王のあと〕/〔ナギ〕/〔エピローグ…〕）
      out.finale.push(b);
    } else if (part === "chapter" && chapter) {
      if (section === "door") chapter.door.push(b);
      else if (section === "boss") chapter.bossPre.push(b);
      else if (section === "bossPost") chapter.bossPost.push(b);
      else if (section?.sub) chapter.subs[section.sub][phase].push(b);
    }
  };
  for (let i = start; i < end; i++) {
    const s = src[i].trim();
    if (!s || s === "---") continue;
    if (s.startsWith("## ")) {
      const h = s.slice(3);
      if (h.startsWith("プロローグ")) { part = "prologue"; }
      else if (h.startsWith("最終章")) { part = "finale"; curBg = null; }
      else { part = "chapter"; chNo++; chapter = out.chapters[ids[chNo - 1]] = { title: h.replace(/^第\d+章　/, ""), door: [], subs: {}, bossPre: [], bossPost: [] }; }
      section = null; continue;
    }
    if (s.startsWith("### ")) {
      const h = s.slice(4);
      if (part === "finale") { section = h; continue; }
      if (part !== "chapter") continue;
      let m;
      if (h.startsWith("〔扉〕")) section = "door";
      else if (h.startsWith("〔主のあと〕") || h.startsWith("〔魔王のあと〕")) { section = "bossPost"; }
      else if (h.startsWith("〔主〕")) section = "boss";
      else if ((m = h.match(/^(\d+)-(\d+)（(.+)）　(.+)$/))) { const no = +m[2]; section = { sub: no }; chapter.subs[no] = { title: m[4], unit: m[3], pre: [], post: [] }; phase = "pre"; }
      else section = null;
      continue;
    }
    if (s.startsWith(">")) { if (part) push({ k: "nar", t: "――戦いが、はじまった。そして、終わった。" }); continue; }
    if (/^\*\*〔カゲが晴れて〕\*\*/.test(s)) { phase = "post"; continue; }
    if (/^\*\*〔出発〕\*\*/.test(s)) continue;
    let m;
    if ((m = s.match(/^\*\*(【.+】)\*\*$/))) { push({ k: "label", t: m[1] }); continue; }
    if (s.startsWith("**")) continue;
    if (s.startsWith("##")) continue;
    push(line(s));
  }
  return out;
}
const data = {};
for (const g of [1, 2, 3]) data[g] = parse(g);
fs.mkdirSync("src/third/story", { recursive: true });
fs.writeFileSync("src/third/story/storyData.json", JSON.stringify(data));
for (const g of [1, 2, 3]) {
  const d = data[g]; let subs = 0, beats = d.prologue.length + d.finale.length;
  for (const c of Object.values(d.chapters)) { beats += c.door.length + c.bossPre.length + c.bossPost.length; for (const s of Object.values(c.subs)) { subs++; beats += s.pre.length + s.post.length; } }
  console.log(`中${g}: 章${Object.keys(d.chapters).length} 小単元${subs} 場面行${beats} prologue${d.prologue.length} finale${d.finale.length}`);
}
