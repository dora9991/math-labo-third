// ============================================================
// UpdateNews.jsx — メニュー上部の「アップデート情報」。
//  ・折りたたみ時：最新のお知らせのタイトルが1行だけ見える（一部だけ表示）。
//  ・タップで開くと全部の履歴が見られる。開いたら「NEW」バッジは消える（既読）。
//  ・未読の更新があるときは、初回訪問時に一度だけポップアップでも知らせる
//    （2026-07-19追記：バナーに気づかず見逃す生徒がいるため）。
//  ・既読管理は localStorage だけで完結（Homeにpropsを足さない・自己完結）。
// ============================================================
import { useState } from "react";
import { UPDATES } from "../data/updates.js";

const SEEN_KEY = "ml2_last_seen_update";

function fmtDate(iso) {
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${Number(m[2])}/${Number(m[3])}` : iso;
}

export default function UpdateNews() {
  const latest = UPDATES[0];
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState(() => { try { return localStorage.getItem(SEEN_KEY) || ""; } catch { return ""; } });
  // 前回訪問時からの未読ぶんだけ（ISO日付は文字列比較で新旧判定できる）
  const unseenUpdates = UPDATES.filter((u) => u.date > seen);
  const [showPopup, setShowPopup] = useState(() => unseenUpdates.length > 0);
  if (!latest) return null;

  const isNew = unseenUpdates.length > 0;

  function markSeen() {
    if (!isNew) return;
    try { localStorage.setItem(SEEN_KEY, latest.date); } catch { /* noop */ }
    setSeen(latest.date);
  }

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next) markSeen();
  }

  function closePopup() {
    setShowPopup(false);
    markSeen();
  }

  const A = "#fbbf24"; // アクセント（お知らせ色）

  return (
    <>
      <div style={{ margin: "0 0 12px", borderRadius: 12, overflow: "hidden",
        background: "rgba(251,191,36,.10)", border: `1px solid ${isNew ? "rgba(251,191,36,.6)" : "rgba(251,191,36,.28)"}` }}>
        {/* 折りたたみバー：最新タイトルが1行だけ見える */}
        <button data-sfx="none" onClick={toggle} style={{
          width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "10px 13px",
          background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", color: "#fff", textAlign: "left",
        }}>
          <span style={{ fontSize: 15, flexShrink: 0 }}>📢</span>
          <span style={{ fontSize: 10.5, fontWeight: 900, color: A, flexShrink: 0, letterSpacing: 0.5 }}>おしらせ</span>
          {isNew && (
            <span style={{ fontSize: 9, fontWeight: 900, color: "#3a2a00", background: A, borderRadius: 999, padding: "1px 6px", flexShrink: 0 }}>NEW</span>
          )}
          <span style={{ flex: 1, minWidth: 0, fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,.82)",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {latest.title}
          </span>
          <span style={{ fontSize: 10, fontWeight: 900, color: "rgba(255,255,255,.5)", flexShrink: 0 }}>{open ? "▲ とじる" : "▼ もっと見る"}</span>
        </button>

        {/* 展開：全履歴 */}
        {open && (
          <div style={{ padding: "2px 13px 13px", maxHeight: 320, overflowY: "auto" }}>
            {UPDATES.map((u, i) => (
              <div key={i} style={{ padding: "9px 0", borderTop: i === 0 ? "1px solid rgba(251,191,36,.2)" : "1px solid rgba(255,255,255,.08)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 10, fontWeight: 900, color: A, background: "rgba(251,191,36,.15)", borderRadius: 6, padding: "1px 7px", flexShrink: 0 }}>{fmtDate(u.date)}</span>
                  <span style={{ fontSize: 12.5, fontWeight: 900, color: "#fff" }}>{u.title}</span>
                </div>
                <ul style={{ margin: 0, padding: "0 0 0 18px" }}>
                  {u.body.map((line, j) => (
                    <li key={j} style={{ fontSize: 11.5, fontWeight: 600, color: "rgba(255,255,255,.75)", lineHeight: 1.6, marginBottom: 2 }}>{line}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 初回ポップアップ：前回訪問からの未読ぶんをまとめて知らせる（1回とじたら既読） */}
      {showPopup && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.62)", zIndex: 70, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div className="glass" style={{ maxWidth: 380, width: "100%", maxHeight: "80vh", display: "flex", flexDirection: "column", borderRadius: 16, border: "2px solid #fbbf24" }}>
            <div style={{ padding: "18px 20px 4px", flexShrink: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 900, color: "#fde047", display: "flex", alignItems: "center", gap: 6 }}>📢 アップデートのお知らせ</div>
            </div>
            <div style={{ padding: "6px 20px 4px", overflowY: "auto", flex: 1 }}>
              {unseenUpdates.map((u, i) => (
                <div key={i} style={{ padding: "10px 0", borderTop: i === 0 ? "none" : "1px solid rgba(255,255,255,.08)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 10, fontWeight: 900, color: A, background: "rgba(251,191,36,.15)", borderRadius: 6, padding: "1px 7px", flexShrink: 0 }}>{fmtDate(u.date)}</span>
                    <span style={{ fontSize: 13, fontWeight: 900, color: "#fff" }}>{u.title}</span>
                  </div>
                  <ul style={{ margin: 0, padding: "0 0 0 18px" }}>
                    {u.body.map((line, j) => (
                      <li key={j} style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,.8)", lineHeight: 1.6, marginBottom: 2 }}>{line}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div style={{ padding: "10px 20px 18px", flexShrink: 0 }}>
              <button onClick={closePopup} data-sfx="none" style={{
                width: "100%", padding: "12px", borderRadius: 11, cursor: "pointer", fontFamily: "inherit", border: "none",
                background: "linear-gradient(135deg,#f59e0b,#fbbf24)", color: "#3a2a00", fontWeight: 900, fontSize: 14,
              }}>わかった！</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
