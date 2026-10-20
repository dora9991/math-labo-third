// 新バトル(STORY_MAP)と旧monsters.jsから、敵の一覧(ID/種別/章/単元/名前/アート型)を書き出す。
import { createServer } from "vite";
import fs from "node:fs";
const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
const sm = await server.ssrLoadModule("/src/third/data/storyMap.js");
const mon = await server.ssrLoadModule("/src/data/monsters.js");
const out = {};
const add = (m, ctx) => { if (!m || !m.id) return; out[m.id] = { id: m.id, kind: m.kind, name: m.name, theme: m.theme || ctx.theme || "", grade: m.grade ?? ctx.grade, chapterId: m.chapterId ?? ctx.chapterId, chapterName: ctx.chapterName, art: m.art, role: m.role, rarity: m.rarity, inNewBattle: ctx.third }; };
for (const g of sm.STORY_MAP) for (const ch of g.chapters) {
  const c = { grade: g.grade, chapterId: ch.chapterId, chapterName: ch.name, third: true };
  for (const su of ch.subUnits || []) { add(su.enemy, { ...c, theme: su.theme }); add(su.boss, { ...c, theme: su.theme }); }
  for (const k of Object.keys(ch)) { const v = ch[k]; if (v && typeof v === "object" && !Array.isArray(v) && v.id && v.kind) add(v, c); }
}
for (const m of mon.MONSTERS) if (!out[m.id]) add(m, { grade: m.grade, chapterId: m.chapterId, chapterName: "", theme: m.unit || "", third: false });
const list = Object.values(out);
fs.writeFileSync("docs/enemy-work/manifest.json", JSON.stringify(list, null, 1));
const c = {}; for (const m of list) { const k = m.kind + (m.inNewBattle ? "" : "(旧のみ)"); c[k] = (c[k] || 0) + 1; }
console.log(list.length, c);
await server.close();
