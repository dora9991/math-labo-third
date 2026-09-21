// third-api を、Supabaseダッシュボードに貼り付けられる「1ファイル」にまとめる。
//  出力: supabase/functions/third-api/bundle/index.ts
import { execSync } from "node:child_process";
import { build } from "esbuild";
import { mkdirSync, statSync } from "node:fs";
execSync("node scripts/gen-problem-version.mjs", { stdio: "inherit" });
mkdirSync("supabase/functions/third-api/bundle", { recursive: true });
await build({
  entryPoints: ["supabase/functions/third-api/index.ts"], bundle: true, format: "esm", platform: "neutral",
  outfile: "supabase/functions/third-api/bundle/index.ts", loader: { ".json": "json" },
  external: ["https://*"], mainFields: ["module", "main"], legalComments: "none", minify: true, logLevel: "info",
});
// Supabase CLI で「関数だけ」デプロイするための最小構成（Docker不要・--use-api でサーバー側ビルド）
import { copyFileSync, writeFileSync } from "node:fs";
mkdirSync("dist-fn/deploy/supabase/functions/third-api", { recursive: true });
copyFileSync("supabase/functions/third-api/bundle/index.ts", "dist-fn/deploy/supabase/functions/third-api/index.ts");
writeFileSync("dist-fn/deploy/supabase/config.toml", 'project_id = "mtzhbiadzqjhvhzzdsbn"\n\n[functions.third-api]\nverify_jwt = true\n');
console.log("OK ->", "supabase/functions/third-api/bundle/index.ts", Math.round(statSync("supabase/functions/third-api/bundle/index.ts").size / 1024) + "KB");
