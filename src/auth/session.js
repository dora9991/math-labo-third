// ============================================================
// session.js — いまログイン中のユーザーid（保存キーと記録の名寄せに使う）。
//  認証OFF（Supabase未設定）や未ログインのときは null。
//  localStore / recordSchema がこれを読み、ログイン中はそのuidで保存を分ける。
//  ※このファイルは何も import しない（循環参照を避けるため）。
// ============================================================
let _uid = null;
const subs = new Set();

export function setActiveUid(uid) {
  _uid = uid || null;
  for (const f of subs) { try { f(_uid); } catch { /* noop */ } }
}
export function getActiveUid() { return _uid; }
export function onActiveUid(fn) { subs.add(fn); return () => subs.delete(fn); }
