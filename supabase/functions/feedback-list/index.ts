// ============================================================
// supabase/functions/feedback-list — 先生用：生徒から届いた「ご意見箱」を全件返す。
//
//  feedback テーブルは生徒本人の insert しか許可していない（RLSで他人の行は読めない）ため、
//  先生はこの関数（service_role＝RLS素通し）経由でだけ全員分を見られる。
//  認証：TEACHER_PASS（Supabaseのシークレット、teacher関数と共通）との一致で判定。
//   設定: npx supabase secrets set TEACHER_PASS=好きな合言葉（teacher関数と同じ値でOK）
//   デプロイ: npx supabase functions deploy feedback-list --use-api --no-verify-jwt
// ============================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method" }, 405);

  const body = await req.json().catch(() => ({}));
  const pass = String(body?.pass || "");
  const expect = Deno.env.get("TEACHER_PASS") || "";
  if (!expect || pass !== expect) return json({ error: "unauthorized" }, 401);

  const svc = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });

  const { data: rows, error } = await svc
    .from("feedback")
    .select("id, name, login_id, category, message, created_at")
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) return json({ error: String(error.message || error) }, 500);

  return json({ ok: true, feedback: rows || [] });
});
