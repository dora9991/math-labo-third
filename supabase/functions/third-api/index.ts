// ============================================================
// supabase/functions/third-api — 数学ラボ3のサーバー（仲間・ガチャ・バトル報酬）
//  ★デプロイ用の1ファイルは `npm run build:third-api` で作る（bundle/index.ts）。
//    Supabaseダッシュボード → Edge Functions → 新規作成(名前: third-api) → その中身を貼り付ける。
//  仕組み：ログイン中の生徒(JWT)だけが呼べる。生徒の状態は third_player_state に**サーバーだけが**書く
//   （RLSでクライアント書き込み禁止）。ガチャの抽選・チケット・経験値は、ブラウザの保存を書き換えても変わらない。
//  SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY は Supabase が自動で注入する。
// ============================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handle } from "./handler.js";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const rand = () => crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296; // ガチャは暗号品質の乱数

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method-not-allowed" }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const authHeader = req.headers.get("Authorization") || "";
  const jwt = authHeader.replace(/^Bearer\s+/i, "");
  if (!jwt) return json({ error: "unauthorized" }, 401);

  // 誰が呼んだか：JWTをSupabase Authで検証（クライアントが送るuser idは使わない）
  const authed = createClient(url, anon, { global: { headers: { Authorization: `Bearer ${jwt}` } } });
  const { data: u, error: ue } = await authed.auth.getUser(jwt);
  if (ue || !u?.user) return json({ error: "unauthorized" }, 401);
  const userId = u.user.id;

  let payload: { action?: string } & Record<string, unknown> = {};
  try { payload = await req.json(); } catch { return json({ error: "bad-json" }, 400); }

  const db = createClient(url, service); // service_role：RLSを越えて書けるのはここだけ
  const store = {
    async load(uid: string) {
      const { data } = await db.from("third_player_state").select("state, updated_at").eq("student_id", uid).maybeSingle();
      return data ? { state: data.state, version: data.updated_at } : null;
    },
    // 楽観的排他：読んだ時点の updated_at と同じ時だけ書く（連打・二重送信での二重取得を防ぐ）
    async save(uid: string, state: { tickets: number; party: unknown[] }, prevVersion: string | null) {
      const row = { student_id: uid, state, tickets: state.tickets, updated_at: new Date().toISOString() };
      if (prevVersion === null) {
        const { error } = await db.from("third_player_state").insert(row);
        return !error;
      }
      const { data, error } = await db.from("third_player_state").update(row).eq("student_id", uid).eq("updated_at", prevVersion).select("student_id");
      return !error && (data?.length ?? 0) === 1;
    },
    async logAttempts(uid: string, rows: { unitId: string; level: string; seed: number; ok: boolean; mode?: string }[]) {
      if (!rows.length) return;
      await db.from("third_attempts").insert(rows.map((r) => ({ student_id: uid, unit_id: r.unitId, difficulty: r.level, seed: r.seed, ok: r.ok, mode: r.mode || "battle" })));
    },
    async logGacha(uid: string, rows: { id: string; rarity: string; isNew: boolean }[]) {
      if (!rows.length) return;
      await db.from("third_gacha_log").insert(rows.map((r) => ({ student_id: uid, pool: "standard", result_id: r.id, rarity: r.rarity, is_new: r.isNew, tickets_used: 1 })));
    },
  };

  const r = await handle({ action: String(payload.action || ""), body: payload, userId, store, rand });
  return json(r.body, r.status);
});
