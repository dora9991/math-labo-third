// 問題データ(生成ロジック)の版を、ファイルのハッシュから作って src/third/problemVersion.js に書く。
//  クライアントとサーバーで「同じseedから同じ問題」になる前提が崩れていないか（版がずれていないか）の確認に使う。
//  npm run build の前に自動実行される（prebuild）。サーバー用バンドルの作成時にも実行する。
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
const files = [];
const walk = (d) => { for (const f of readdirSync(d).sort()) { const p = join(d, f); statSync(p).isDirectory() ? walk(p) : /\.(js|json)$/.test(f) && files.push(p); } };
walk("src/data");
for (const f of ["src/engine/generator.js", "src/engine/seed.js", "src/engine/rng.js", "src/engine/grade.js", "src/third/seeded.js", "src/third/problemSource.js", "src/third/link.js"]) files.push(f);
const h = createHash("sha1");
for (const f of files) h.update(f).update(readFileSync(f));
const v = h.digest("hex").slice(0, 12);
const out = `// 自動生成（scripts/gen-problem-version.mjs）。手で編集しない。問題データ/生成ロジックのハッシュ。\nexport const PROBLEM_VERSION = "${v}";\n`;
let cur = ""; try { cur = readFileSync("src/third/problemVersion.js", "utf8"); } catch {}
if (cur !== out) writeFileSync("src/third/problemVersion.js", out);
console.log("PROBLEM_VERSION", v);
