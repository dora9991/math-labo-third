// ============================================================
// adminApi.js — 管理者（先生）用の窓口。Edge Function `third-api` の admin_* を、先生の合言葉つきで呼ぶ。
//  ・サーバーモード：分析(admin_stats)・生徒の状態調整(admin_grant)。合言葉が違えば 401。
//  ・ローカルモード（開発用）：この端末のテスト用データだけを、同じ操作(adminOps)で調整できる。
//  ・問題ごとの正答率は端末に保存(ml3_problem_rates)し、解答画面の右上バッジ(ProblemRateBadge)が読む。
// ============================================================
import { supabase, AUTH_ENABLED } from "../auth/supabase.js";
import { THIRD_SERVER, localAdminGrant } from "./thirdApi.js";

export const PASS_KEY = "ml3_teacher_pass";
const RATES_KEY = "ml3_problem_rates";
const OVERLAY_KEY = "ml3_rate_overlay";

export const adminAvailable = () => AUTH_ENABLED && THIRD_SERVER;

async function call(action, pass, body = {}) {
  try {
    const { data, error } = await supabase.functions.invoke("third-api", { body: { action, pass, ...body } });
    if (error) {
      let b = null;
      try { b = await error.context.json(); } catch { /* 本文なし */ }
      return { ok: false, error: b?.error || String(error.message || "server-error") };
    }
    return data?.error ? { ok: false, error: data.error } : { ok: true, ...data };
  } catch {
    return { ok: false, error: "network" };
  }
}

export const adminStats = (pass) => call("admin_stats", pass);
// 学習ログ：クラス全員の1日ごとの集計／1人ぶんの詳細（日ごと・ログイン・メダル・解答の中身）
export const adminDaily = (pass, days = 14) => call("admin_daily", pass, { days });
export const adminStudentLog = (pass, targetId, days = 30, answers = 200) => call("admin_student_log", pass, { targetId, days, answers });
export function adminGrant(pass, targetId, op, args = {}) {
  if (!adminAvailable()) return localAdminGrant(op, args);
  return call("admin_grant", pass, { targetId, op, args });
}

// ---- 問題ごとの正答率（解答画面の右上に出す用）
export function saveProblemRates(problems) {
  try { localStorage.setItem(RATES_KEY, JSON.stringify({ at: Date.now(), problems })); } catch { /* noop */ }
}
export function getProblemRate(typeId) {
  try {
    const raw = localStorage.getItem(RATES_KEY);
    const p = raw ? JSON.parse(raw).problems?.[typeId] : null;
    return p ? { t: p.t, c: p.c } : null;
  } catch { return null; }
}
export function ratesSavedAt() {
  try { return JSON.parse(localStorage.getItem(RATES_KEY) || "null")?.at || null; } catch { return null; }
}
export const isRateOverlayOn = () => { try { return localStorage.getItem(OVERLAY_KEY) === "1"; } catch { return false; } };
export const setRateOverlay = (on) => { try { localStorage.setItem(OVERLAY_KEY, on ? "1" : "0"); } catch { /* noop */ } };
