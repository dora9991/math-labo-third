// 生成器の健全性チェック：4択が4個・正解を含む・重複なし。各単元/難易度をN回試行。
import { chapter } from "../src/data/grade2/g2c1.js";

const r = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const N = 800;
const norm = (s) => String(s).replace(/\s/g, "");
let fails = 0;

for (const u of chapter.units) {
  for (const lv of ["easy", "standard", "advanced"]) {
    const tmpl = u.problems[lv][0];
    const samples = [];
    for (let i = 0; i < N; i++) {
      const m = tmpl.build(r);
      const problems = [];
      const ch = m.choices || [];
      const set = new Set(ch.map(norm));
      const issues = [];
      if (!m.q || !m.ans) issues.push("q/ans欠落");
      if (ch.length !== 4) issues.push(`choices=${ch.length}`);
      if (set.size !== 4) issues.push("重複");
      if (!set.has(norm(m.ans))) issues.push("正解が選択肢に無い");
      if (/undefined|NaN|Infinity/.test(m.q + m.ans + ch.join(""))) issues.push("不正トークン");
      if (issues.length) {
        fails++;
        if (fails <= 20) console.log(`✗ ${u.id}/${lv}: ${issues.join(",")} | q="${m.q}" ans="${m.ans}" choices=[${ch.join(" , ")}]`);
      }
      if (i < 3) samples.push(`   ${m.q}  →  ${m.ans}   [${m.choices.join(" / ")}]`);
    }
    console.log(`● ${u.id} (${u.name}) / ${lv} ── skill=${tmpl.skill}`);
    samples.forEach((s) => console.log(s));
  }
}
console.log(fails === 0 ? "\n✅ 異常なし（全" + (chapter.units.length * 3 * N) + "試行）" : `\n❌ 異常 ${fails} 件`);
