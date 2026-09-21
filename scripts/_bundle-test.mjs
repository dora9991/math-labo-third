// 決定性の確認：同じseedで2回作って完全一致するか（全87単元×4難度×複数seed）
import { build } from "esbuild";
await build({ entryPoints: ["src/third/problemSource.js"], bundle: true, format: "esm", platform: "node", outfile: "dist-fn/_ps.mjs", loader: { ".json": "json" }, logLevel: "error" });
const { generateThirdProblem } = await import("../dist-fn/_ps.mjs");
const { chaptersForGrade } = await import("../dist-fn/_ps.mjs").then(async () => ({ chaptersForGrade: (await import("../src/data/index.js")).chaptersForGrade }));
let n = 0, bad = 0, nulls = 0;
for (const g of [1, 2, 3]) for (const c of chaptersForGrade(g)) for (const u of c.units) for (const lv of ["easy", "standard", "advanced", "oni"]) for (let k = 0; k < 6; k++) {
  const seed = (Math.random() * 4e9) >>> 0;
  const a = generateThirdProblem(u.id, lv, seed), b = generateThirdProblem(u.id, lv, seed);
  n++;
  if (!a || !b) { nulls++; continue; }
  if (JSON.stringify(a) !== JSON.stringify(b)) { bad++; if (bad < 4) console.log("MISMATCH", u.id, lv, seed); }
}
console.log({ tested: n, nulls, mismatches: bad });
