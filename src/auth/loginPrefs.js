// ============================================================
// loginPrefs.js — ログイン画面の使い勝手用の小さな設定（機微情報なし）。
//  ・rememberedId … 前回使ったID（次回プレフィル用。IDは秘密情報ではない）
//  ・autoLogin    … 「自動ログイン」チェックの状態。trueならAuthGateがセッションを
//                    そのまま使う。falseなら次回訪問時に明示的にサインアウトし、
//                    共有端末で前の生徒のログインが残らないようにする。
// ============================================================
const ID_KEY = "ml2_login_id";
const REMEMBER_KEY = "ml2_auto_login";

export function getRememberedId() {
  try { return localStorage.getItem(ID_KEY) || ""; } catch { return ""; }
}
export function setRememberedId(id) {
  try { if (id) localStorage.setItem(ID_KEY, id); else localStorage.removeItem(ID_KEY); } catch { /* noop */ }
}
export function getAutoLogin() {
  try { return localStorage.getItem(REMEMBER_KEY) === "1"; } catch { return false; }
}
export function setAutoLogin(on) {
  try { if (on) localStorage.setItem(REMEMBER_KEY, "1"); else localStorage.removeItem(REMEMBER_KEY); } catch { /* noop */ }
}
