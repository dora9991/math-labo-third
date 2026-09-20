// 自動作問の構造検証：全章×全単元×全難易度で多数生成し、
//  ① choices が4つ ② 4つすべて相異 ③ ans が choices に含まれる ④ 文字列が壊れていない
//  を確認。失敗を一覧で出し、各単元のサンプルも数件表示（数学的妥当性は目視用）。
import { readdirSync } from "node:fs";

const r = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const norm = (s) => String(s).replace(/\s/g, "");
const bad = (s) => /undefined|null|NaN|\bxNaN|\/0\b/.test(String(s));

const files = [
  "../src/data/grade2/g2c1.js", "../src/data/grade2/g2c2.js", "../src/data/grade2/g2c3.js",
  "../src/data/grade2/g2c4.js", "../src/data/grade2/g2c5.js", "../src/data/grade2/g2c6.js",
  "../src/data/grade3/c1_shiki.js", "../src/data/grade3/g3c2.js", "../src/data/grade3/g3c3.js",
  "../src/data/grade3/g3c4.js", "../src/data/grade3/g3c5.js", "../src/data/grade3/g3c6.js",
  "../src/data/grade3/g3c7.js", "../src/data/grade3/g3c8.js",
];

let totalFail = 0;
const samples = [];

for (const f of files) {
  const mod = await import(new URL(f, import.meta.url));
  const ch = mod.chapter;
  for (const u of ch.units) {
    for (const level of ["easy", "standard", "advanced", "oni"]) {
      const tpls = u.problems?.[level] || [];
      const fails = [];
      let shown = 0;
      for (const t of tpls) {
        for (let i = 0; i < 250; i++) {
          let m = null;
          for (let k = 0; k < 30; k++) { const x = t.build(r); if (x && !x.skip) { m = x; break; } }
          if (!m) { fails.push("生成不能"); break; }
          const errs = [];
          if (!m.q || bad(m.q)) errs.push("q壊れ:" + m.q);
          if (m.ans == null || bad(m.ans)) errs.push("ans壊れ:" + m.ans);
          if (m.choices) {
            if (m.choices.length !== 4) errs.push("choices数=" + m.choices.length);
            const set = new Set(m.choices.map(norm));
            if (set.size !== m.choices.length) errs.push("choices重複:" + m.choices.join("|"));
            if (!set.has(norm(m.ans))) errs.push("ans∉choices ans=" + m.ans + " ch=" + m.choices.join("|"));
            if (m.choices.some(bad)) errs.push("choices壊れ:" + m.choices.join("|"));
          }
          if (errs.length) { fails.push(`${t.id}: ${errs[0]} [q=${m.q} a=${m.ans}]`); }
          const SHOW = new Set(["g2c5", "g2c6", "g3c1", "g3c2", "g3c3", "g3c4", "g3c5", "g3c6", "g3c7", "g3c8"]);
          if (SHOW.has(ch.id) && i < 2 && shown < 2) { samples.push(`  [${ch.id} ${u.id} ${level}] ${m.q}  →  ${m.ans}   {${(m.choices || []).join(", ")}}`); shown++; }
        }
      }
      if (fails.length) {
        totalFail += fails.length;
        console.log(`✗ ${ch.id}/${u.id}/${level}  失敗${fails.length}件`);
        console.log("   例: " + fails.slice(0, 3).join("\n   例: "));
      }
    }
  }
}

console.log("\n==== サンプル（数学的妥当性は目視で確認） ====");
console.log(samples.join("\n"));
console.log(`\n==== 構造検証 失敗合計: ${totalFail} ====`);
