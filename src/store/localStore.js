// ============================================================
// localStore.js — 保存層（ローカル実装・データ消失に強い設計）
//
// 「保存・読み込みの窓口」をここに集約する。画面側はこの関数だけを呼ぶ。
//
// ★データを絶対に失わないための工夫★
//  1) 二重保存：メインキーに加えて「自動バックアップキー」にも前回値を退避。
//     → メインが壊れても、読み込み時にバックアップから自動復元する。
//  2) 安全な読み込み：壊れたデータでも、初期化（空）で上書きしない。
//     正規化(normalize)が失敗しても、生のデータをできるだけ残す。
//  3) 手動バックアップ：exportData/importData でファイルに保存・復元できる。
//     （ブラウザのキャッシュ削除や端末変更に備える）
//
// 将来サーバー保存にするときは、同じ関数名で supabase 版を作り、import 先を差し替える。
// ============================================================
import { getOrCreateLocalStudentId, initialPlayerState, normalizePlayerState } from "./recordSchema.js";
import { getActiveUid } from "../auth/session.js";

// 保存キー。ログイン中はユーザーidで分ける（同じ端末で複数人が別々の進捗を持てる）。
//  認証OFF/未ログインは従来の共通キー（後方互換で既存データを引き継ぐ）。
const BASE = "mathApp2_data_v1";
const KEY = () => { const u = getActiveUid(); return u ? `${BASE}__${u}` : BASE; };
const BAK = () => `${KEY()}_bak`; // 自動バックアップ（前回保存時の中身）

function safeGet(k) {
  try { return localStorage.getItem(k); } catch { return null; }
}
function safeSet(k, v) {
  try { localStorage.setItem(k, v); return true; } catch (e) { console.warn("保存に失敗:", e); return false; }
}

function freshData() {
  return { player: initialPlayerState(getOrCreateLocalStudentId()), records: [], mistakes: [] };
}

// 生JSONを安全にデータ化（normalizeが失敗しても生プレイヤーを残す）
function parseData(raw) {
  const data = JSON.parse(raw); // 不正JSONならここで例外
  try {
    data.player = normalizePlayerState(data.player);
  } catch (e) {
    console.warn("正規化に失敗。生のプレイヤーデータを保持します:", e);
    // player はそのまま残す（消さない）
  }
  if (!Array.isArray(data.records)) data.records = [];
  if (!Array.isArray(data.mistakes)) data.mistakes = [];
  if (!data.player) data.player = initialPlayerState(getOrCreateLocalStudentId());
  return data;
}

// 読み込み：メイン→（壊れていれば）バックアップ→（無ければ）初期データ
function readAll() {
  const raw = safeGet(KEY());
  if (raw) {
    try { return parseData(raw); }
    catch (e) { console.warn("メインデータが読めません。バックアップから復元を試みます:", e); }
  }
  const bak = safeGet(BAK());
  if (bak) {
    try {
      const d = parseData(bak);
      console.warn("バックアップからデータを復元しました。");
      // 復元できたらメインにも書き戻しておく（次回から正常に）
      safeSet(KEY(), JSON.stringify(d));
      return d;
    } catch (e) { console.warn("バックアップも読めません:", e); }
  }
  // 本当に何も無いときだけ初期データ（ここで既存データを壊すことはない）
  return freshData();
}

// 書き込み：書く前に「今の中身」をバックアップへ退避してから上書きする
function writeAll(data) {
  let json;
  try { json = JSON.stringify(data); } catch (e) { console.warn("保存データの変換に失敗:", e); return; }
  const cur = safeGet(KEY());
  // 直前の正常データをバックアップへ（破壊的更新の保険）。空→中身ありの初回は退避しない。
  if (cur && cur !== json) safeSet(BAK(), cur);
  safeSet(KEY(), json);
}

/** 全データを読み込む */
export function load() {
  return readAll();
}

/** プレイヤー状態を保存 */
export function savePlayerState(player) {
  const data = readAll();
  data.player = { ...player, updatedAt: new Date().toISOString() };
  writeAll(data);
  return data.player;
}

/** 挑戦記録を1件追加して、追加後の records を返す */
export function addRecord(record) {
  const data = readAll();
  data.records.push(record);
  writeAll(data);
  return data.records;
}

/** 間違いを追加（同じ問題文があれば置き換え）。最新40件まで保持 */
export function addMistakes(mistakes) {
  if (!mistakes || mistakes.length === 0) return readAll().mistakes;
  const data = readAll();
  const qSet = new Set(mistakes.map((m) => m.q));
  data.mistakes = [...data.mistakes.filter((m) => !qSet.has(m.q)), ...mistakes].slice(-40);
  writeAll(data);
  return data.mistakes;
}

/** 間違いノートから1件削除 */
export function removeMistake(id) {
  const data = readAll();
  data.mistakes = data.mistakes.filter((m) => m.id !== id);
  writeAll(data);
  return data.mistakes;
}

/** 間違いノートから、その単元の問題をまとめて削除（翌日確認まで解けて＝完全になおった時に使う） */
export function removeMistakesByUnit(unitId) {
  const data = readAll();
  data.mistakes = data.mistakes.filter((m) => m.unitId !== unitId);
  writeAll(data);
  return data.mistakes;
}

/** その単元の間違いを「仮なおし済み（pendingAt=日付）」にする。まだノートには残す（翌日確認まで）。
 *  学び直しで連続正解して〈仮なおし〉になった時に使う。翌日以降に1問正解すれば removeMistakesByUnit で消える。 */
export function markUnitRelearnPending(unitId, dateStr) {
  const data = readAll();
  data.mistakes = data.mistakes.map((m) => (m.unitId === unitId ? { ...m, pendingAt: dateStr } : m));
  writeAll(data);
  return data.mistakes;
}

/** すべてのデータを初期状態に戻す（管理モードの「進捗リセット」用）。studentId は引き継ぐ */
export function resetAll() {
  const data = freshData();
  writeAll(data);
  return data;
}

// ── 手動バックアップ（ファイルへ保存／ファイルから復元） ─────────────
/** 今のデータをJSON文字列で書き出す（ファイル保存用） */
export function exportData() {
  return JSON.stringify(readAll());
}

/** JSON文字列からデータを復元して保存する（ファイル復元用）。失敗時は例外を投げる */
export function importData(json) {
  const data = JSON.parse(json); // 不正JSONなら例外
  if (!data || typeof data !== "object" || !data.player) {
    throw new Error("バックアップの形式が正しくありません。");
  }
  data.player = normalizePlayerState(data.player);
  if (!Array.isArray(data.records)) data.records = [];
  if (!Array.isArray(data.mistakes)) data.mistakes = [];
  writeAll(data);
  return data;
}
