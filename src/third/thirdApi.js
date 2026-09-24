// ============================================================
// thirdApi.js — 数学ラボ3の「仲間・ガチャ・バトル報酬」への窓口。
//  ・サーバーモード（VITE_THIRD_SERVER=1 かつ ログイン有効）：Edge Function `third-api` を呼ぶ。
//      状態はサーバーだけが持ち、ブラウザの保存を書き換えても変わらない（チート対策）。
//  ・ローカルモード（開発用・既定）：**同じ処理**(supabase/functions/third-api/handler.js)をブラウザ内で動かす。
//      保存は localStorage なので書き換え可能＝開発・確認専用。画面にもその旨を出す。
//  どちらも返り値は { status, body }（body.state に最新の状態）。
// ============================================================
import { supabase, AUTH_ENABLED } from "../auth/supabase.js";
import { isGuest, guestMem } from "../auth/session.js";
import { handle } from "../../supabase/functions/third-api/handler.js";
import { applyAdminOp } from "./adminOps.js";

export const THIRD_SERVER = AUTH_ENABLED && import.meta.env.VITE_THIRD_SERVER === "1";
export const THIRD_MODE = THIRD_SERVER ? "server" : "local";

const LOCAL_KEY = "mathLabo3_third_state_v2";
const localStore = {
  async load() {
    if (isGuest()) { const g = guestMem().get(LOCAL_KEY); return g ? JSON.parse(g) : null; } // ゲスト：メモリのみ
    try {
      const raw = localStorage.getItem(LOCAL_KEY);
      return raw ? JSON.parse(raw) : null; // { state, version }
    } catch { return null; }
  },
  async save(_u, state, prev) {
    const cur = await this.load();
    if (cur && cur.version !== prev) return false;
    if (!cur && prev !== null) return false;
    if (isGuest()) { guestMem().set(LOCAL_KEY, JSON.stringify({ state, version: (cur?.version || 0) + 1 })); return true; }
    try { localStorage.setItem(LOCAL_KEY, JSON.stringify({ state, version: (cur?.version || 0) + 1 })); } catch { return false; }
    return true;
  },
};

async function call(action, body = {}) {
  if (THIRD_SERVER && !isGuest()) { // ゲストはログインしていないのでサーバーは使えない（ブラウザ内・保存なしで動く）
    try {
      const { data, error } = await supabase.functions.invoke("third-api", { body: { action, ...body } });
      if (error) {
        let b = null;
        try { b = await error.context.json(); } catch { /* 本文なし */ }
        return { status: error.context?.status || 500, body: b || { error: String(error.message || "server-error") } };
      }
      return { status: 200, body: data };
    } catch (e) {
      return { status: 0, body: { error: "network" } };
    }
  }
  return handle({ action, body, userId: "local", store: localStore, now: Date.now(), rand: Math.random });
}

export const thirdApi = {
  getState: () => call("get_state"),
  gacha: (count) => call("gacha", { count }),
  setParty: (party) => call("set_party", { party }),
  claim: (claim) => call("claim", { claim }),
  practice: (attempts) => call("practice", { attempts }),
  confirm: (key, attempts) => call("confirm", { key, attempts }),
  report: (r) => call("report", r), // バトル終了の報告（負け・途中でやめた・お試し・章ボスの解答も学習ログに残す）
  ping: (sid) => call("ping", { sid }), // 滞在時間の計測（1分おき）
};

/** ローカルモード用：この端末のテスト用データを管理操作で調整する（サーバーモードでは使わない） */
export async function localAdminGrant(op, args = {}) {
  const cur = await localStore.load();
  const base = cur?.state || (await thirdApi.getState()).body.state;
  const r = applyAdminOp(base, op, args);
  if (!r.ok) return { ok: false, error: r.error };
  const again = await localStore.load();
  await localStore.save("local", r.state, again ? again.version : null);
  return { ok: true, message: r.message, crystals: r.state.crystals, owned: Object.keys(r.state.owned).length };
}

// 開発用（ローカルモードのみ）：コンソールから crystal を付与して動作確認できる。サーバーモードでは存在しない。
if (!THIRD_SERVER && typeof window !== "undefined") {
  window.__thirdDev = {
    async giveCrystals(n = 50) {
      const cur = await localStore.load();
      const base = (await thirdApi.getState()).body.state;
      const next = { ...(cur?.state || base), crystals: ((cur?.state || base).crystals || 0) + n };
      await localStore.save("local", next, cur ? cur.version : null);
      return next.crystals;
    },
    reset() { localStorage.removeItem(LOCAL_KEY); },
  };
}
