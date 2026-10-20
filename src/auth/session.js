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

// ---- ゲスト（2026-09-21）：ログインせずに遊ぶ。データはこのタブの「メモリ」にだけ置き、閉じる/再読み込みで消える。
//  保存(localStorage)・サーバーへの記録には一切書かない。ゲストが変わる(入り直す)たびに空のメモリになる。
let _guest = false;
let _guestMem = new Map();
export function setGuest(on) {
  _guest = !!on;
  if (_guest) _guestMem = new Map(); // 入るたびに空から
}
export function isGuest() { return _guest; }
export function guestMem() { return _guestMem; }

// ---- ログアウト／ゲスト終了の呼び出し口。AuthGate が中身を登録し、設定画面のボタンが呼ぶ。
let _logoutFn = null;
export function setLogoutHandler(fn) { _logoutFn = fn; }
export function canLogout() { return !!_logoutFn; }
export function requestLogout() { _logoutFn?.(); }
