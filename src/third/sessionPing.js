// ============================================================
// sessionPing.js — ログイン中の滞在時間をサーバーに知らせる（1分おき。サーバーの時計で計測）。
//  ・画面が見えている間だけ送る＝放置・別タブ・スリープの時間は増えない。
//  ・タブごとに識別子(sid)を持ち、サーバーが「ログイン1回ぶん」として記録する（開始時刻・最後に動いた時刻・滞在時間）。
//  ・ゲスト・ローカルモードでは何もしない。失敗してもゲームは止めない。
// ============================================================
import { thirdApi, THIRD_SERVER } from "./thirdApi.js";
import { isGuest } from "../auth/session.js";

const SID_KEY = "ml3_sid";
const EVERY_MS = 60_000;

function sid() {
  try {
    let v = sessionStorage.getItem(SID_KEY);
    if (!v) { v = (globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`); sessionStorage.setItem(SID_KEY, v); }
    return v;
  } catch { return "tab-" + Math.random().toString(36).slice(2); }
}

/** アプリ起動時に1回呼ぶ。止める関数を返す。 */
export function startSessionPing() {
  if (typeof document === "undefined" || !THIRD_SERVER) return () => {};
  const id = sid();
  const send = () => { if (!isGuest() && document.visibilityState === "visible") thirdApi.ping(id).catch(() => {}); };
  send();
  const timer = setInterval(send, EVERY_MS);
  document.addEventListener("visibilitychange", send);
  return () => { clearInterval(timer); document.removeEventListener("visibilitychange", send); };
}
