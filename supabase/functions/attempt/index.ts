// ============================================================
// supabase/functions/attempt — サーバ権威の解答受付（Step3）
//
//  役割：生徒が1問解くたびに、ここへ {unitId, level, templateId, seed, userAnswer, mode} を送る。
//   サーバは自己申告を信じず、seed から問題を作り直して採点(grade.js)し、
//   その結果だけで player_state（レベル/クリスタル/石など）を更新する。
//   → 生徒が localStorage を書き換えても、サーバが認めた解答しか報酬にならない。
//
//  ★重要★ player_state / attempts は RLS でクライアント書き込み禁止。ここ（service_role）だけが書く。
//
//  デプロイ:  supabase functions deploy attempt --no-verify-jwt=false
//   （事前に docs/supabase_setup.sql を実行。SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY は自動注入）
//  ※ 中核ロジック（採点・状態遷移）は src/engine/{grade,applyAttempt}.js を共有し、Nodeでテスト済み。
//    ここはその純関数を DB と繋ぐ薄い層。
// ============================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { GRADES } from "../../../src/data/index.js";
import { findHaichiLessonForUnit } from "../../../src/data/haichiCourse.js";
import { applyAttempt, applyLecturePass } from "../../../src/engine/applyAttempt.js";
import { initialPlayerState } from "../../../src/store/recordSchema.js";

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

  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const authHeader = req.headers.get("Authorization") || "";

  // ① 呼び出した生徒を特定（本人のJWTで検証）。service_role は書き込み専用に別クライアント。
  const asUser = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userErr } = await asUser.auth.getUser();
  if (userErr || !userData?.user) return json({ error: "unauthorized" }, 401);
  const uid = userData.user.id;

  const svc = createClient(url, serviceKey, { auth: { persistSession: false } });

  // ② 現在の player_state を取得（無ければ初期化）
  const { data: row } = await svc.from("player_state").select("state").eq("student_id", uid).maybeSingle();
  let state = row?.state && Object.keys(row.state).length ? row.state : initialPlayerState(uid);

  const body = await req.json().catch(() => ({}));
  const { unitId, level, templateId, seed, userAnswer, mode, lessonKey } = body || {};

  const world = state.world || 1;
  const unitsInWorld = (GRADES[world] || []).flatMap((c: any) => c.units || []);
  const nowMs = Date.now();

  // ③-a 講義（確認問題）合格の記録：mode:"lecture"
  if (mode === "lecture") {
    if (!lessonKey) return json({ error: "no-lessonKey" }, 400);
    const res = applyLecturePass(state, lessonKey, { unitsInWorld });
    state = res.state;
    await svc.from("player_state").upsert(mirror(uid, state), { onConflict: "student_id" });
    return json({ ok: true, level: res.level, state });
  }

  // ③-b 採点対象（practice/battle/relearn/applied）
  if (!unitId || !level || !templateId) return json({ error: "bad-input" }, 400);
  const lf = findHaichiLessonForUnit(unitId);
  const lessonK = lf ? `g${lf.grade}m${lf.lesson.n}` : null;
  const lectureOK = !lessonK || !!(state.haichiPassed && state.haichiPassed[lessonK]);
  // ※ なおす(naosu)の「間違いが残っているか」はクライアント側の間違いノートで管理。
  //   サーバは苦手ノートを持たないため unitHasMistakes=false（＝サーバは naosu を厳しくしない）。
  const deps = { unitsInWorld, unitHasMistakes: false, lectureOK, nowMs };

  const result = applyAttempt(state, { unitId, level, templateId, seed, userAnswer, mode }, deps);
  state = result.state;

  // ④ 解答ログを追記（分析・不正検知用）＋ player_state を保存（どちらも service_role）
  await svc.from("attempts").insert({
    student_id: uid, unit_id: unitId, level, template_id: templateId,
    seed: seed ?? null, ok: result.ok, mode: mode ?? null,
  });
  await svc.from("player_state").upsert(mirror(uid, state), { onConflict: "student_id" });

  return json({ ok: result.ok, cleared: result.cleared, level: result.level, events: result.events, state });
});

// player_state 行の形（state 本体＋検索/表示用のミラー列）
function mirror(uid: string, state: any) {
  const world = state.world || 1;
  return {
    student_id: uid,
    state,
    world,
    level: 1 + ((state.worldCleared && state.worldCleared[world]) || 0),
    coins: state.coins ?? 0,
    crystals: state.crystals ?? 0,
    updated_at: new Date().toISOString(),
  };
}
