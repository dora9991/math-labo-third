// 「符号が問題の肝」になっているテンプレートの一覧を作って src/engine/signMixed.js に書く。
//  4択の作り方を切りかえるために使う：
//   ・答えが負になる割合が 30〜70% のテンプレ（＝正負の数など、符号の判断そのものが問われる問題）
//        → 選択肢は「＋と－の両方」を、反対の符号どうしがちょうど対（x と -x、y と -y）になるように出す
//   ・それ以外のテンプレ → 選択肢は答えと同じ符号だけを出す（符号が1つだけ違う値＝手がかり、を作らない）
//  実行: node scripts/gen-sign-mixed.mjs   （問題データ src/data を変えたら、もう一度実行する）
import { build } from "esbuild";
import { writeFileSync } from "node:fs";
await build({
  stdin: { contents: `export { buildSeeded } from "./src/engine/grade.js"; export { chaptersForGrade } from "./src/data/index.js"; export { DIFFICULTY_KEYS } from "./src/third/balance.js";`, resolveDir: process.cwd(), loader: "js" },
  bundle: true, format: "esm", platform: "node", outfile: "dist-fn/_signmixed.mjs", loader: { ".json": "json" }, logLevel: "error",
});
const T = await import("../dist-fn/_signmixed.mjs");
const num = (s) => { const t = String(s).replace(/\s/g, "").replace(/−/g, "-"); return /^-?\d+(\.\d+)?$/.test(t) ? Number(t) : null; };
const SAMPLES = 60, LO = 0.30, HI = 0.70, MIN_N = 20;
const mixed = [], stats = [];
for (const g of [1, 2, 3]) for (const ch of T.chaptersForGrade(g)) for (const unit of ch.units || []) {
  for (const lv of T.DIFFICULTY_KEYS) for (const t of unit.problems?.[lv] || []) {
    let n = 0, neg = 0;
    for (let i = 0; i < SAMPLES; i++) {
      const p = T.buildSeeded(unit, lv, t.id, (i * 2654435761 + 977) >>> 0);
      const a = p ? num(p.ans) : null;
      if (a === null) continue;
      n++; if (a < 0) neg++;
    }
    if (n < MIN_N) continue;
    const q = neg / n;
    stats.push({ id: t.id, n, q });
    if (q >= LO && q <= HI) mixed.push(t.id);
  }
}
mixed.sort();
const out = `// 自動生成（scripts/gen-sign-mixed.mjs）。手で編集しない。
// 答えが負になる割合が ${Math.round(LO * 100)}〜${Math.round(HI * 100)}% のテンプレID（＝符号の判断が問題の肝）。ここに載ったテンプレの4択は「＋と－の両方」を、
// 反対の符号どうしが対になるように出す。載っていないテンプレは、答えと同じ符号だけを出す。
export const SIGN_MIXED = new Set(${JSON.stringify(mixed)});
`;
writeFileSync("src/engine/signMixed.js", out);
console.log(`テンプレ ${stats.length} 件のうち、符号が肝（${LO}〜${HI}）: ${mixed.length} 件 → src/engine/signMixed.js`);
const byUnit = {};
for (const id of mixed) { const u = id.replace(/[a-z]\d*$/i, ""); byUnit[u] = (byUnit[u] || 0) + 1; }
console.log("単元別の件数:", JSON.stringify(byUnit));
const negRate = stats.reduce((s, x) => s + x.q * x.n, 0) / stats.reduce((s, x) => s + x.n, 0);
console.log(`全体の負の答えの割合: ${(negRate * 100).toFixed(1)}%`);
