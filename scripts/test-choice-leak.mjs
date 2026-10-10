// 4択の「答えの当てやすさ」の検査：選択肢の並びから、答えを推測できる法則がないかを数える。
//  きっかけ（2026-10-10 生徒）：「答えが17なら必ず-17もあり、符号が反対のものが1つだけ。その反対側を選べば答えになる」。
//  方法：実際の問題生成（generateThirdProblem）で、全単元×全難易度×たくさんの seed の数値4択を作り、
//        各選択肢に「特徴」（符号が1つだけ違う／反対の符号の相棒がいる／値の順位…）を付けて、
//        その特徴を持つ選択肢が「答え」だった割合を出す。何の手がかりも無ければ 25%（4択の偶然）になる。
//  合格の目安：どの特徴も 25% ± 4pt 以内（偏りが大きいと、解かずに当てられる）。
//  実行: npm run test:choice-leak [-- 1問あたりのseed数(既定30)] [-- --show]（--show は表だけ出して失敗でも終了コード0）
import { build } from "esbuild";
import { execSync } from "node:child_process";
execSync("node scripts/gen-problem-version.mjs", { stdio: "ignore" });
await build({
  stdin: { contents: `export { generateThirdProblem } from "./src/third/problemSource.js"; export { chaptersForGrade } from "./src/data/index.js";`, resolveDir: process.cwd(), loader: "js" },
  bundle: true, format: "esm", platform: "node", outfile: "dist-fn/_leak.mjs", loader: { ".json": "json" }, logLevel: "error",
});
const T = await import("../dist-fn/_leak.mjs");

const N = Number(process.argv.find((a) => /^\d+$/.test(a)) || 30);
const SHOW = process.argv.includes("--show");
const LEVELS = ["easy", "standard", "advanced", "oni"];
const num = (s) => { const t = String(s).replace(/\s/g, "").replace(/−/g, "-"); return /^-?\d+(\.\d+)?$/.test(t) ? Number(t) : null; };
const units = [];
for (const g of [1, 2, 3]) for (const c of T.chaptersForGrade(g)) for (const u of c.units || []) units.push(u.id);

// 特徴：選択肢 j（値 v、全体 vals）に付ける名前。同じ特徴の選択肢が複数ある時は、そのうち1つでも答えなら「当たり」にせず、
// 「その特徴を持つ選択肢1つあたり、答えである確率」を出す（＝偶然なら 25%）。
function features(vals, j) {
  const v = vals[j];
  const pos = vals.filter((x) => x > 0).length, neg = vals.filter((x) => x < 0).length;
  const f = [];
  const lone = pos === 1 && neg === 3 ? vals.findIndex((x) => x > 0) : neg === 1 && pos === 3 ? vals.findIndex((x) => x < 0) : -1;
  if (lone >= 0) {
    if (j === lone) f.push("符号が1つだけ違う（その本人）");
    else if (v === -vals[lone]) f.push("符号が1つだけ違う値の反対（生徒の法則）");
    else f.push("符号が1つだけ違う並びの、ほかの値");
  }
  const partner = vals.some((x, k) => k !== j && x === -v && v !== 0);
  f.push(partner ? "反対の符号の相棒がいる" : "相棒がいない");
  const sortedV = [...vals].sort((a, b) => a - b);
  f.push(`値の順位${sortedV.indexOf(v) + 1}番目（小さい順）`);
  const absSorted = [...new Set(vals.map(Math.abs))].sort((a, b) => a - b);
  if (absSorted.length === 4) f.push(`絶対値の順位${absSorted.indexOf(Math.abs(v)) + 1}番目`);
  const dist = vals.map((x) => vals.reduce((s, y) => s + Math.abs(x - y), 0));
  const minD = Math.min(...dist);
  if (dist.filter((d) => d === minD).length === 1) f.push(dist[j] === minD ? "ほかとの距離の合計が最小（まん中）" : "まん中ではない");
  const mean = vals.reduce((s, x) => s + x, 0) / 4;
  const dm = vals.map((x) => Math.abs(x - mean)); const minM = Math.min(...dm);
  if (dm.filter((d) => d === minM).length === 1) f.push(dm[j] === minM ? "平均にいちばん近い" : "平均から遠い");
  f.push(v > 0 ? "正の数" : v < 0 ? "負の数" : "0");
  if (pos > 0 && neg > 0) f.push(pos === neg ? "正負が2対2" : "正負が偏っている");
  return f;
}

// ---- 先に「こわれていないか」を確かめる（必ず通す）：同じ seed なら同じ問題／4択は4つとも別／正解の位置が正しい
let broken = 0;
{
  let checked = 0;
  for (const lv of LEVELS) for (const uid of units.slice(0, 80)) for (let k = 0; k < 6; k++) {
    const seed = (k * 40503 + uid.length * 131 + 7) >>> 0;
    let p1, p2; try { p1 = T.generateThirdProblem(uid, lv, seed); p2 = T.generateThirdProblem(uid, lv, seed); } catch (e) { broken++; continue; }
    if (!p1) continue; checked++;
    const same = JSON.stringify([p1.question, p1.choices, p1.correctIndex]) === JSON.stringify([p2.question, p2.choices, p2.correctIndex]);
    const distinct = new Set(p1.choices.map((c) => String(c).replace(/\s/g, ""))).size === p1.choices.length;
    const idxOk = Number.isInteger(p1.correctIndex) && p1.correctIndex >= 0 && p1.correctIndex < p1.choices.length;
    if (!same || !distinct || !idxOk) { broken++; if (broken <= 5) console.log(`❌ こわれた問題: ${uid}/${lv}/seed${seed} 再現=${same} 別々=${distinct} 位置=${idxOk}`); }
  }
  console.log(`${broken === 0 ? "✅" : "❌"} 再現性・4択の有効性の確認 ${checked} 問（こわれ ${broken}）`);
  if (broken) process.exit(1);
}

const out = {};   // level → feature → { hit, cnt }
let setsAll = 0;
for (const lv of LEVELS) {
  const m = (out[lv] = new Map());
  let sets = 0;
  for (const uid of units) {
    for (let k = 0; k < N; k++) {
      let p; try { p = T.generateThirdProblem(uid, lv, (k * 2654435761 + uid.length * 977 + uid.charCodeAt(uid.length - 1) * 31 + 12345) >>> 0); } catch { p = null; }
      if (!p || p.choices.length !== 4) continue;
      const vals = p.choices.map(num);
      if (vals.some((x) => x === null) || new Set(vals).size !== 4) continue;
      sets++;
      for (let j = 0; j < 4; j++) for (const name of features(vals, j)) {
        const e = m.get(name) || { hit: 0, cnt: 0 }; e.cnt++; if (j === p.correctIndex) e.hit++; m.set(name, e);
      }
    }
  }
  setsAll += sets; out[lv].sets = sets;
}

// ---- 表示と合否 ----
//  合否の対象は 簡単・難しい・鬼（自動で作る4択＋テンプレの4択）。「普通」は手書きの誤答（とけた式。理由つきヒントの
//  元になっている）を含むため、表示するだけで合否には入れない。
//  ・符号に関する特徴（符号が1つだけ違う／反対の符号の相棒）が偶然(25%)から10pt以上ずれたら不合格
//  ・そのほかの特徴は15pt以上ずれたら不合格（4pt〜15pt は「偏りあり」と表示するだけ）
const SIGN_FEATURE = /符号が1つだけ違う|相棒/;
let fails = 0, worst = { pt: 0, name: "", lv: "" };
for (const lv of LEVELS) {
  const gated = lv !== "standard";
  console.log(`\n■ ${lv}（数値4択 ${out[lv].sets} 問）${gated ? "" : "　※手書きの誤答（とけた式）を含むため、合否には入れない"}`);
  const rows = [...out[lv].entries()].filter(([n]) => n !== "sets").sort((a, b) => a[0].localeCompare(b[0], "ja"));
  for (const [name, e] of rows) {
    if (e.cnt < 120) continue; // 少なすぎる特徴は数えない
    const rate = (100 * e.hit) / e.cnt, dev = rate - 25;
    const se = Math.sqrt((0.25 * 0.75) / e.cnt) * 100;
    const noisy = Math.abs(dev) > Math.max(4, 2.5 * se);
    const limit = SIGN_FEATURE.test(name) ? 10 : 15;
    const fail = gated && Math.abs(dev) > Math.max(limit, 2.5 * se);
    if (fail) fails++;
    if (gated && Math.abs(dev) > Math.abs(worst.pt)) worst = { pt: dev, name, lv };
    console.log(`${fail ? "❌" : noisy ? "△ " : "  "} ${name.padEnd(34, "　")} 答えの確率 ${rate.toFixed(1).padStart(5)}%（${e.cnt}個中）${fail ? "  ← 不合格" : noisy ? "  ← 少し偏り" : ""}`);
  }
}
console.log(`\n最大のずれ（簡単・難しい・鬼）: ${worst.pt >= 0 ? "+" : ""}${worst.pt.toFixed(1)}pt（${worst.lv}・${worst.name}）／ 不合格の特徴: ${fails} 件`);
if (fails === 0) console.log("✅ 選択肢の並びから答えを当てられる強い法則（符号・相棒）は見つかりませんでした");
else console.log(`❌ ${fails} 件の特徴で、答えの確率が偶然(25%)から大きくずれています`);
process.exit(fails === 0 || SHOW ? 0 : 1);
