// ============================================================
// supabase/functions/third-api — 数学ラボ3のサーバー（仲間・ガチャ・バトル報酬）
//  ★デプロイ用の1ファイルは `npm run build:third-api` で作る（bundle/index.ts）。
//    Supabaseダッシュボード → Edge Functions → 新規作成(名前: third-api) → その中身を貼り付ける。
//  仕組み：ログイン中の生徒(JWT)だけが呼べる。生徒の状態は third_player_state に**サーバーだけが**書く
//   （RLSでクライアント書き込み禁止）。ガチャの抽選・チケット・経験値は、ブラウザの保存を書き換えても変わらない。
//  SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY は Supabase が自動で注入する。
// ============================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handle, handleAdmin } from "./handler.js";
import { dailyArgs } from "./logging.js";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const rand = () => crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296; // ガチャは暗号品質の乱数


// ============================================================
// 管理者用（先生の合言葉 TEACHER_PASS が必要。生徒のJWTは使わない）
//  admin_stats … クラスの分析（ログイン・プレイ時間・回答数・生徒ごとの詳細・問題ごとの正答率）
//  admin_grant … 対象の生徒のゲーム状態を調整（チケット・全クリア・仲間など）
// ============================================================
const JST = (t: number | string | Date) => new Date(new Date(t).getTime() + 9 * 3600 * 1000).toISOString().slice(0, 10);

async function pageAll(db: any, table: string, cols: string, order = "id") {
  const rows: any[] = [];
  const PAGE = 1000;
  for (let page = 0; page < 60; page++) {
    const { data, error } = await db.from(table).select(cols).order(order, { ascending: true }).range(page * PAGE, page * PAGE + PAGE - 1);
    if (error) return { rows, error };
    rows.push(...(data || []));
    if (!data || data.length < PAGE) break;
  }
  return { rows, error: null };
}

async function adminStats(db: any) {
  const now = Date.now();
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) days.push(JST(now - i * 86400000));
  const since7 = days[0];

  const { data: students, error: se } = await db.from("students").select("id, name, class_code, created_at, last_login").order("created_at");
  if (se) return { error: String(se.message || se) };
  const { data: states } = await db.from("third_player_state").select("student_id, tickets, updated_at, state");
  const stateBy: Record<string, any> = {};
  for (const r of states || []) stateBy[r.student_id] = r;

  // 解答ログ（ms列が無い環境でも動くように、失敗したらmsなしで取り直す）
  let att = await pageAll(db, "third_attempts", "student_id, unit_id, difficulty, template_id, seed, ok, mode, ms, created_at");
  if (att.error) att = await pageAll(db, "third_attempts", "student_id, unit_id, difficulty, template_id, seed, ok, mode, created_at");
  // ログイン履歴（third_login_log がまだ無ければ空）
  const lg = await pageAll(db, "third_login_log", "student_id, at", "at");
  const loginLogMissing = !!lg.error;

  const loginDaysBy: Record<string, Set<string>> = {};
  const addLogin = (sid: string, d: string) => { (loginDaysBy[sid] ||= new Set()).add(d); };
  for (const r of lg.rows) addLogin(r.student_id, JST(r.at));
  for (const st of students || []) if (st.last_login) addLogin(st.id, JST(st.last_login));

  const per: Record<string, any> = {};
  const problems: Record<string, any> = {};
  const activeByDay: Record<string, Set<string>> = {};
  for (const r of att.rows) {
    const p = (per[r.student_id] ||= { t: 0, c: 0, a7: 0, ms7: 0, msAll: 0, units: {} });
    p.t += 1; if (r.ok) p.c += 1;
    const u = (p.units[r.unit_id || "?"] ||= { t: 0, c: 0 });
    u.t += 1; if (r.ok) u.c += 1;
    const ms = Number(r.ms) || 0;
    p.msAll += ms;
    const d = JST(r.created_at);
    addLogin(r.student_id, d); // 解いた日はログインした日
    if (d >= since7) { p.a7 += 1; p.ms7 += ms; (activeByDay[d] ||= new Set()).add(r.student_id); }
    if (r.template_id) {
      const k = r.template_id;
      const q = (problems[k] ||= { u: r.unit_id, l: r.difficulty, t: 0, c: 0, seed: null });
      q.t += 1; if (r.ok) q.c += 1;
      if (r.seed != null) q.seed = r.seed;
    }
  }

  const out = (students || []).map((s: any) => {
    const st = stateBy[s.id]?.state || {};
    const p = per[s.id] || { t: 0, c: 0, a7: 0, ms7: 0, msAll: 0, units: {} };
    const medals = st.medals || {};
    const practiceDone = Object.values(medals.practiceN || {}).filter((n: any) => Number(n) >= 5).length;
    const weak = Object.entries(p.units).filter(([, v]: any) => v.t >= 5).map(([id, v]: any) => ({ unitId: id, t: v.t, c: v.c }))
      .sort((a: any, b: any) => a.c / a.t - b.c / b.t).slice(0, 3);
    return {
      id: s.id, name: s.name || "(名前なし)", loginId: s.class_code || "", createdAt: s.created_at, lastLogin: s.last_login || null,
      crystals: st.crystals ?? (stateBy[s.id]?.tickets ?? 0), coins: st.coins || 0,
      party: Array.isArray(st.party) ? st.party : [], owned: Object.keys(st.owned || {}).length,
      medalPractice: practiceDone, medalHaichi: Object.keys(medals.haichi || {}).length,
      attempts: p.t, correct: p.c, answers7d: p.a7, playMs7d: p.ms7, playMsAll: p.msAll,
      loginDays: [...(loginDaysBy[s.id] || [])].sort().reverse().slice(0, 30),
      units: p.units, weakUnits: weak,
    };
  });

  const dayRows = days.map((d) => ({ date: d, logins: out.filter((s: any) => (loginDaysBy[s.id] || new Set()).has(d)).length, active: (activeByDay[d] || new Set()).size }));
  const loginUsers7 = out.filter((s: any) => days.some((d) => (loginDaysBy[s.id] || new Set()).has(d))).length;
  const activeUsers7 = out.filter((s: any) => s.answers7d > 0).length;
  const totalMs7 = out.reduce((a: number, s: any) => a + s.playMs7d, 0);
  const totalA7 = out.reduce((a: number, s: any) => a + s.answers7d, 0);
  const week = {
    days: dayRows, loginUsers: loginUsers7, activeUsers: activeUsers7,
    avgPlayMin: activeUsers7 ? Math.round((totalMs7 / activeUsers7 / 60000) * 10) / 10 : 0,
    avgAnswers: activeUsers7 ? Math.round((totalA7 / activeUsers7) * 10) / 10 : 0,
    playTimeAvailable: att.rows.some((r: any) => Number(r.ms) > 0),
  };
  return { ok: true, generatedAt: new Date().toISOString(), loginLogMissing, week, students: out, problems, attemptsTotal: att.rows.length };
}

// 学習ログ（third_daily / third_sessions / third_medals / third_answer_log）を読む。表がまだ無い環境では missing:true で返す。
async function adminDaily(db: any, days = 14) {
  const since = JST(Date.now() - (Math.max(1, Math.min(90, days)) - 1) * 86400000);
  const { data, error } = await db.from("third_daily").select("student_id, day, solved, correct, ms, battle_n, practice_n, haichi_n, medals, logins, active_ms, first_at, last_at").gte("day", since).order("day", { ascending: false });
  if (error) return { ok: true, missing: true, since, rows: [] };
  return { ok: true, missing: false, since, rows: data || [] };
}

async function adminStudentLog(db: any, targetId: string, days = 30, answers = 200) {
  if (!targetId) return { error: "no-target" };
  const since = JST(Date.now() - (Math.max(1, Math.min(180, days)) - 1) * 86400000);
  const lim = Math.max(1, Math.min(500, answers));
  const [daily, sessions, medals, log] = await Promise.all([
    db.from("third_daily").select("day, solved, correct, ms, battle_n, practice_n, haichi_n, medals, logins, active_ms, first_at, last_at").eq("student_id", targetId).gte("day", since).order("day", { ascending: false }),
    db.from("third_sessions").select("started_at, last_seen_at, active_ms").eq("student_id", targetId).order("started_at", { ascending: false }).limit(40),
    db.from("third_medals").select("unit_id, kind, earned_at").eq("student_id", targetId).order("earned_at", { ascending: false }).limit(300),
    db.from("third_answer_log").select("created_at, unit_id, difficulty, mode, q, ans, user_answer, ok, mistake_tag, ms, counted, result").eq("student_id", targetId).order("created_at", { ascending: false }).limit(lim),
  ]);
  return {
    ok: true, since,
    missing: { daily: !!daily.error, sessions: !!sessions.error, answers: !!log.error },
    daily: daily.data || [], sessions: sessions.data || [], medals: medals.data || [], answers: log.data || [],
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method-not-allowed" }, 405);

  let payload: { action?: string } & Record<string, unknown> = {};
  try { payload = await req.json(); } catch { return json({ error: "bad-json" }, 400); }

  // 管理者：合言葉で認証（生徒のJWTは使わない）
  if (String(payload.action || "").startsWith("admin_")) {
    const expect = Deno.env.get("TEACHER_PASS") || "";
    if (!expect || String(payload.pass || "") !== expect) return json({ error: "unauthorized" }, 401);
    const adb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
    if (payload.action === "admin_stats") return json(await adminStats(adb));
    if (payload.action === "admin_daily") return json(await adminDaily(adb, Number(payload.days) || 14));
    if (payload.action === "admin_student_log") return json(await adminStudentLog(adb, String(payload.targetId || ""), Number(payload.days) || 30, Number(payload.answers) || 200));
    if (payload.action === "admin_grant") {
      const astore = {
        async load(uid: string) {
          const { data } = await adb.from("third_player_state").select("state, updated_at").eq("student_id", uid).maybeSingle();
          return data ? { state: data.state, version: data.updated_at } : null;
        },
        async save(uid: string, state: { crystals: number }, prev: string | null) {
          const row = { student_id: uid, state, tickets: state.crystals, updated_at: new Date().toISOString() }; // ※表の tickets 列は「クリスタル」の表示用ミラー
          if (prev === null) { const { error } = await adb.from("third_player_state").insert(row); return !error; }
          const { data, error } = await adb.from("third_player_state").update(row).eq("student_id", uid).eq("updated_at", prev).select("student_id");
          return !error && (data?.length ?? 0) === 1;
        },
      };
      const r = await handleAdmin({ op: String(payload.op || ""), args: (payload.args as Record<string, unknown>) || {}, targetId: String(payload.targetId || ""), store: astore });
      return json(r.body, r.status);
    }
    return json({ error: "unknown-admin-action" }, 400);
  }

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

  const db = createClient(url, service); // service_role：RLSを越えて書けるのはここだけ
  const store = {
    async load(uid: string) {
      const { data } = await db.from("third_player_state").select("state, updated_at").eq("student_id", uid).maybeSingle();
      return data ? { state: data.state, version: data.updated_at } : null;
    },
    // 楽観的排他：読んだ時点の updated_at と同じ時だけ書く（連打・二重送信での二重取得を防ぐ）
    async save(uid: string, state: { crystals: number; party: unknown[] }, prevVersion: string | null) {
      const row = { student_id: uid, state, tickets: state.crystals, updated_at: new Date().toISOString() }; // ※表の tickets 列は「クリスタル」の表示用ミラー
      if (prevVersion === null) {
        const { error } = await db.from("third_player_state").insert(row);
        return !error;
      }
      const { data, error } = await db.from("third_player_state").update(row).eq("student_id", uid).eq("updated_at", prevVersion).select("student_id");
      return !error && (data?.length ?? 0) === 1;
    },
    async logAttempts(uid: string, rows: { unitId: string; level: string; seed: number; ok: boolean; mode?: string; templateId?: string | null; ms?: number }[]) {
      if (!rows.length) return;
      const base = rows.map((r) => ({ student_id: uid, unit_id: r.unitId, difficulty: r.level, seed: r.seed, ok: r.ok, mode: r.mode || "battle" }));
      // template_id・ms は管理者の分析用。ms列がまだ無い環境でも記録が落ちないよう、失敗したら列なしで入れ直す
      const full = rows.map((r, i) => ({ ...base[i], template_id: r.templateId ?? null, ms: Math.round(Number(r.ms) || 0) }));
      const { error } = await db.from("third_attempts").insert(full);
      if (error) await db.from("third_attempts").insert(rows.map((r, i) => ({ ...base[i], template_id: r.templateId ?? null })));
    },
    // ---- 学習ログ（記録の失敗はゲームを止めない。表が無い環境では何もしないだけ）
    // 解答の中身：同じ問題(seed)は二重に入れない。新しく入った行だけを返す（1日の集計は、その行だけを足す）
    async logAnswers(uid: string, rows: Record<string, unknown>[]) {
      const { data, error } = await db.from("third_answer_log")
        .upsert(rows.map((r) => ({ student_id: uid, ...r })), { onConflict: "student_id,mode,unit_id,difficulty,seed", ignoreDuplicates: true })
        .select("ok, ms, mode");
      if (error) { console.error("logAnswers:", error.message); return []; }
      return data || [];
    },
    async logMedals(uid: string, medals: { unitId: string; kind: string }[], now: number) {
      const { error } = await db.from("third_medals").upsert(medals.map((m) => ({ student_id: uid, unit_id: m.unitId, kind: m.kind, earned_at: new Date(now).toISOString() })), { onConflict: "student_id,unit_id,kind", ignoreDuplicates: true });
      if (error) console.error("logMedals:", error.message);
    },
    async bumpDaily(uid: string, a: Record<string, unknown>) {
      const { error } = await db.rpc("third_bump_daily", { p_student: uid, ...a });
      if (error) console.error("bumpDaily:", error.message);
    },
    // 滞在時間：1分おきの ping。前回からの経過を足す（放置・スリープは 90 秒までしか数えない）
    async ping(uid: string, sid: string, now: number) {
      const { data: cur, error: e0 } = await db.from("third_sessions").select("last_seen_at").eq("student_id", uid).eq("sid", sid).maybeSingle();
      if (e0) { console.error("ping:", e0.message); return; }
      const iso = new Date(now).toISOString();
      if (!cur) {
        const { error } = await db.from("third_sessions").insert({ student_id: uid, sid, started_at: iso, last_seen_at: iso, active_ms: 0 });
        if (!error) await this.bumpDaily(uid, dailyArgs({ logins: 1, now })); // 1日のログイン回数
        return;
      }
      const delta = Math.max(0, Math.min(now - Date.parse(cur.last_seen_at), 90_000));
      const { data: row } = await db.from("third_sessions").select("active_ms").eq("student_id", uid).eq("sid", sid).maybeSingle();
      await db.from("third_sessions").update({ last_seen_at: iso, active_ms: (Number(row?.active_ms) || 0) + delta }).eq("student_id", uid).eq("sid", sid);
      if (delta > 0) await this.bumpDaily(uid, dailyArgs({ activeMs: delta, now }));
    },
    async logGacha(uid: string, rows: { id: string; rarity: string; isNew: boolean }[]) {
      if (!rows.length) return;
      await db.from("third_gacha_log").insert(rows.map((r) => ({ student_id: uid, pool: "standard", result_id: r.id, rarity: r.rarity, is_new: r.isNew, tickets_used: 5 })));
    },
  };

  const r = await handle({ action: String(payload.action || ""), body: payload, userId, store, rand });
  return json(r.body, r.status);
});
