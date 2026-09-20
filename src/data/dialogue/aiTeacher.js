// ============================================================
// aiTeacher.js — ブラウザ側のAI先生クライアント
//  中継サーバー(scripts/teacher-server.mjs)に問い合わせる。
//  サーバーが起動していてキーがあれば「本物のAI先生」、無ければ false を返し
//  画面側は台本モード(teacher.js)に自動フォールバックする。
// ============================================================

// 中継先。公開デプロイ時は VITE_TEACHER_URL でWorker等のURLに差し替える。
const RELAY = import.meta.env.VITE_TEACHER_URL || "http://localhost:8787";

let _avail = null; // 健康チェックの結果をキャッシュ（null=未確認）

// AI先生が使えるか？（サーバー起動＋キーあり）
export async function aiHealth() {
  if (_avail !== null) return _avail;
  try {
    const r = await fetch(RELAY + "/health", { method: "GET" });
    const j = await r.json();
    _avail = !!j.ok;
  } catch {
    _avail = false; // サーバー未起動 → 台本モードへ
  }
  return _avail;
}

// 生徒の1ターンを送り、先生の返答 {reaction, message, board_add, done} を受け取る
export async function aiRespond(payload) {
  const r = await fetch(RELAY + "/api/teacher", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!r.ok) throw new Error("relay " + r.status);
  const j = await r.json();
  if (j.error) throw new Error(j.error);
  return j;
}
