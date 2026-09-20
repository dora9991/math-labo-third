// ============================================================
// supabase/functions/teacher — 先生用：クラス全員の成績集計を返す。
//
//  生徒のデータ(students/attempts/player_state)はRLSで本人しか読めないため、
//  先生はこの関数（service_role＝RLS素通し）経由でだけ全員分を見られる。
//  認証：TEACHER_PASS（Supabaseのシークレット）との一致で判定。
//   設定: npx supabase secrets set TEACHER_PASS=好きな合言葉
//   デプロイ: npx supabase functions deploy teacher --use-api --no-verify-jwt
//
//  返すもの（生徒ごと）:
//   name / loginId / level(=1+クリア単元数) / coins / crystals / lastActive / lastLogin /
//   units: { 小単元ID: { t:解答数, c:正解数 } }  ← attempts をサーバー側で集計（正答率の元）
//   cleared: [クリア済み小単元ID]                ← player_state.state.cycle（サーバー権威）
//   log: [{ createdAt, unitId, level, mode, q, ans, userAnswer, ok, mistakeTag }, ...]
//     ← answer_log（解答の中身。直近30件・新しい順）。lastLoginは「解いていなくても
//        ログインだけした」痕跡（students.last_login、AuthGate.jsxが毎回更新）。
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

  // ① 生徒一覧（last_login＝ログイン履歴。何も解かず開いただけでもここだけは残る）
  const { data: students, error: se } = await svc
    .from("students").select("id, name, class_code, created_at, last_login").order("created_at");
  if (se) return json({ error: String(se.message || se) }, 500);

  // ② サーバー権威の状態（レベル・クリア済み単元）
  const { data: states } = await svc
    .from("player_state").select("student_id, level, coins, crystals, updated_at, state");
  const stateBy: Record<string, any> = {};
  for (const s of states || []) stateBy[s.student_id] = s;

  // ③ 解答ログを全件ページングで集計（生徒×小単元の 正答数/解答数）
  //    ※データが数万件を超えて重くなったら SQL ビュー集計に置き換える。
  const agg: Record<string, Record<string, { t: number; c: number }>> = {};
  const lastAt: Record<string, string> = {};
  const totalBy: Record<string, number> = {};
  const PAGE = 1000;
  let from = 0;
  let truncated = false;
  for (let page = 0; page < 100; page++) {
    const { data: rows, error: ae } = await svc
      .from("attempts").select("student_id, unit_id, ok, created_at")
      .order("id", { ascending: true }).range(from, from + PAGE - 1);
    if (ae) return json({ error: String(ae.message || ae) }, 500);
    for (const r of rows || []) {
      const sid = r.student_id, uid = r.unit_id || "?";
      const u = ((agg[sid] ||= {})[uid] ||= { t: 0, c: 0 });
      u.t += 1; if (r.ok) u.c += 1;
      totalBy[sid] = (totalBy[sid] || 0) + 1;
      if (!lastAt[sid] || r.created_at > lastAt[sid]) lastAt[sid] = r.created_at;
    }
    if (!rows || rows.length < PAGE) break;
    from += PAGE;
    if (page === 99) truncated = true;
  }

  // ④ 解答の中身ログ（answer_log）：生徒ごとに直近30件だけ持たせる（教師が見返す用・重くしすぎない）。
  const LOG_PER_STUDENT = 30;
  const logBy: Record<string, any[]> = {};
  {
    const { data: rows, error: le } = await svc
      .from("answer_log")
      .select("student_id, unit_id, level, mode, q, ans, user_answer, ok, mistake_tag, created_at")
      .order("created_at", { ascending: false })
      .limit(3000);
    if (le) return json({ error: String(le.message || le) }, 500);
    for (const r of rows || []) {
      const arr = (logBy[r.student_id] ||= []);
      if (arr.length < LOG_PER_STUDENT) arr.push(r);
    }
  }

  const out = (students || []).map((s) => {
    const st = stateBy[s.id];
    const cycle = st?.state?.cycle || {};
    return {
      id: s.id,
      name: s.name || "(名前なし)",
      loginId: s.class_code || "",
      createdAt: s.created_at,
      level: st?.level ?? 1,
      coins: st?.coins ?? 0,
      crystals: st?.crystals ?? 0,
      lastActive: lastAt[s.id] || st?.updated_at || null,
      lastLogin: s.last_login || null,
      attempts: totalBy[s.id] || 0,
      units: agg[s.id] || {},
      cleared: Object.keys(cycle).filter((k) => cycle[k]?.cleared),
      log: (logBy[s.id] || []).map((r) => ({
        createdAt: r.created_at, unitId: r.unit_id, level: r.level, mode: r.mode,
        q: r.q, ans: r.ans, userAnswer: r.user_answer, ok: r.ok, mistakeTag: r.mistake_tag,
      })),
    };
  });

  return json({ ok: true, truncated, students: out });
});
