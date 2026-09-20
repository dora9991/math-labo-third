// ============================================================
// BackupBox.jsx — データのバックアップ（ファイル保存／復元）
//  ブラウザのキャッシュ削除や端末変更でデータが消えても、
//  ここで保存したファイルからいつでも元に戻せる。
//  生徒も先生も使えるよう、遊び方画面と管理モードに置く。
// ============================================================
import { useState, useRef } from "react";

export default function BackupBox({ onExport, onImport }) {
  const [msg, setMsg] = useState(null); // { ok, text }
  const fileRef = useRef(null);

  function pick(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    onImport(file, (ok, err) => {
      setMsg(ok
        ? { ok: true, text: "✅ 復元しました！データが元に戻りました。" }
        : { ok: false, text: "⚠️ 復元できませんでした：" + (err || "ファイルを確認してください") });
    });
  }

  return (
    <div className="glass" style={{ padding: "14px 16px", borderLeft: "4px solid #4ade80" }}>
      <div style={{ fontSize: 14, fontWeight: 900, color: "#fff", marginBottom: 6 }}>💾 データのバックアップ</div>
      <div style={{ fontSize: 11.5, color: "rgba(255,255,255,.65)", lineHeight: 1.6, marginBottom: 10 }}>
        進み具合をファイルに保存できます。<b style={{ color: "#fff" }}>機種変更や、まちがってデータが消えたとき</b>に、
        保存したファイルから元に戻せます。ときどき保存しておくと安心です。
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={() => { onExport(); setMsg({ ok: true, text: "💾 バックアップファイルを保存しました。" }); }} data-sfx="none"
          style={{ flex: 1, padding: "11px", borderRadius: 11, border: "none", background: "#16a34a", color: "#fff", fontWeight: 900, cursor: "pointer", fontSize: 13 }}>
          💾 保存する
        </button>
        <button onClick={() => fileRef.current?.click()} data-sfx="none"
          style={{ flex: 1, padding: "11px", borderRadius: 11, border: "1px solid rgba(255,255,255,.25)", background: "rgba(255,255,255,.06)", color: "#fff", fontWeight: 800, cursor: "pointer", fontSize: 13 }}>
          📂 復元する
        </button>
        <input ref={fileRef} type="file" accept="application/json,.json" onChange={pick} style={{ display: "none" }} />
      </div>
      {msg && (
        <div style={{ marginTop: 9, fontSize: 11.5, fontWeight: 700, color: msg.ok ? "#4ade80" : "#fca5a5" }}>
          {msg.text}
        </div>
      )}
    </div>
  );
}
