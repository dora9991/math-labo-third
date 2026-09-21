// 数学ラボ3 リリース手順を1コマンドにまとめる。  使い方:  npm run release [-- --dry] [-- --skip-fn] [-- --skip-site]
//   1) サーバー側ロジックの自動テスト → 2) 関数(third-api)を1ファイルにビルド → 3) Supabaseへ登録
//   4) サイトを本番設定でビルドして GitHub Pages へ公開 → 5) 公開サイトが新しいビルドに切り替わるまで確認
//  前提: ・初回だけ `npx supabase@2.117.0 login` を済ませておく（ブラウザで承認）  ・.env.local に VITE_THIRD_SERVER=1
//  --dry     : テストとビルドだけ行い、登録・公開はしない（手順の確認用）
//  --skip-fn : 関数の登録を省く（サイトだけ更新したい時）  --skip-site : サイトの公開を省く
import { execSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
const args = new Set(process.argv.slice(2));
const dry = args.has("--dry");
const run = (cmd, opts = {}) => { console.log(`\n$ ${cmd}`); execSync(cmd, { stdio: "inherit", ...opts }); };
const step = (n, t) => console.log(`\n===== ${n}. ${t} =====`);

const env = readFileSync(".env.local", "utf8");
if (!/^VITE_THIRD_SERVER=1/m.test(env)) { console.error("❌ .env.local に VITE_THIRD_SERVER=1 がありません（サーバー版として公開できません）"); process.exit(1); }
const ref = /project_id = "([^"]+)"/.exec(readFileSync("scripts/build-third-api.mjs", "utf8"))?.[1];
if (!ref) { console.error("❌ project_id が見つかりません（scripts/build-third-api.mjs）"); process.exit(1); }

step(1, "サーバー側ロジックの自動テスト"); run("npm run test:third-api");
step(2, "関数(third-api)を1ファイルにビルド"); run("npm run build:third-api");
if (!dry && !args.has("--skip-fn")) {
  step(3, `Supabase(${ref}) へ関数を登録`);
  run(`npx --yes supabase@2.117.0 functions deploy third-api --project-ref ${ref} --use-api`, { cwd: "dist-fn/deploy" });
} else console.log("\n(3. 関数の登録は省略)");
if (!dry && !args.has("--skip-site")) {
  step(4, "サイトをビルドして GitHub Pages へ公開"); run("npm run deploy");
  step(5, "公開サイトが新しいビルドになるまで確認");
  const local = readdirSync("dist/assets").find((f) => /^index-.*\.js$/.test(f));
  const url = "https://dora9991.github.io/math-labo-third/";
  let ok = false;
  for (let i = 0; i < 40 && !ok; i++) { const html = await fetch(url + "?t=" + Date.now()).then((r) => r.text()).catch(() => ""); ok = html.includes(local); if (!ok) await new Promise((r) => setTimeout(r, 6000)); }
  console.log(ok ? `✅ 公開を確認: ${url}（${local}）` : "⚠️ まだ切り替わっていません。数分後にもう一度開いて確認してください");
} else console.log("\n(4-5. サイトの公開は省略)");
