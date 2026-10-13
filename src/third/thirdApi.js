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
  gacha: (count, pool = "normal") => call("gacha", { count, pool }),
  setParty: (party) => call("set_party", { party }),
  synthesize: (req) => call("synthesize", req), // 合成するキャラを経験値にする
  limitBreak: (id) => call("limit_break", { id }), // 予備を使って限界突破
  claim: (claim) => call("claim", { claim }),
  practice: (attempts) => call("practice", { attempts }),
  confirm: (key, attempts) => call("confirm", { key, attempts }),
  report: (r) => call("report", r), // バトル終了の報告（負け・途中でやめた・お試し・章ボスの解答も学習ログに残す）
  // マルチプレイの部屋（サーバーモードのみ）
  roomMine: () => call("room_mine"),
  roomGet: (code) => call("room_get", { code }),
  roomCreate: () => call("room_create"),
  roomJoin: (code) => call("room_join", { code }),
  roomLeave: (code) => call("room_leave", { code }),
  roomStart: (code) => call("room_start", { code }),
  // 協力バトル「みんなの冒険」（同時に答える。2026-10-09）
  roomBattleState: (code) => call("room_battle_state", { code }), // どのステージから始められるか
  roomBattleStart: (code, index) => call("room_battle_start", { code, index }),
  roomBattleReady: (code) => call("room_battle_ready", { code }), // 開始前の場面を読み終えた
  roomBattleSync: (code) => call("room_battle_sync", { code }), // 1〜2秒おき：期限を過ぎていれば結果が出る
  roomBattleAnswer: (code, answer, nextLevel) => call("room_battle_answer", { code, answer, nextLevel }),
  roomBattleClaim: (code) => call("room_battle_claim", { code }), // 勝ったあと、自分のごほうびを受け取る
  ping: (sid) => call("ping", { sid }), // 滞在時間の計測（1分おき）
  profile: () => call("my_profile"), // おすすめ用：自分の解答を単元×難易度に集計したもの（サーバーが無いときは source:"none"）
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
    async patch(fn) { // 開発用：いまのローカル状態を関数で書き換える（例：patch((s) => { s.gradeDone = { 1: 1 }; })）
      const cur = await localStore.load();
      const base = (await thirdApi.getState()).body.state;
      const next = structuredClone(cur?.state || base); fn(next);
      await localStore.save("local", next, cur ? cur.version : null);
      return true;
    },
    /** 開発用・裏ボスの試し戦：その学年をクリア済みにし、全員を仲間にして、指定のレア度・レベルの5体をパーティに入れる。
     *  例：await __thirdDev.secretTest({ rarity: "SR", level: 30 })   /   await __thirdDev.secretTest({ rarity: "UR", level: 70, breaks: 3 })
     *  clear: 最初の何体を「倒した」ことにするか（2体目以降に挑戦したい時）。 */
    async secretTest({ rarity = "SR", level = 30, breaks = 0, clear = 0, crystals = 500 } = {}) {
      const { SPECIALIST_ROSTER } = await import("./specialistRoster.js");
      const { expForLevel } = await import("./expCurve.js");
      const exp = expForLevel(level);
      const pick = (cat, nth = 0) => SPECIALIST_ROSTER.filter((c) => c.rarity === rarity && c.id.startsWith("sp_") && c.skill.category === cat)[nth];
      const team = [pick("aoeDamage"), pick("singleDamage"), pick("singleDamage", 1), pick("heal"), pick("cure")].map((c) => c.id);
      await this.patch((s) => {
        s.gradeDone = { 1: 1, 2: 1, 3: 1 };
        s.secret = { cleared: Object.fromEntries(Array.from({ length: clear }, (_, i) => [`1:${i}`, 1])), daily: { date: null, n: 0 } };
        let n = 0;
        for (const c of SPECIALIST_ROSTER) s.owned[c.id] = { exp, exp2: exp, exp3: exp, breaks: c.rarity === "UR" ? breaks : 0, n: s.owned[c.id]?.n || ++n + 1000 };
        s.party = team;
        s.crystals = crystals;
      });
      return { party: team, level, rarity, breaks, clear };
    },
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
