// ============================================================
// Feedback.jsx — 📮 ご意見箱（生徒→先生への自由記述フィードバック）
//  夏休み中など先生が直接会えない期間も、困りごと・要望・感想を届けられるように。
//  送信は必ずローカル(player.feedbackLog)にも残す＝サーバー未設定/通信失敗でも消えない。
//  先生側の閲覧は Admin.jsx の FeedbackBox（管理モード・合言葉ゲート）から。
// ============================================================
import { useState } from "react";
import Header from "../components/Header.jsx";

const CATEGORIES = [
  { id: "good", label: "⭐️ たのしい", color: "#fbbf24" },
  { id: "trouble", label: "😕 こまった", color: "#f87171" },
  { id: "bug", label: "🐛 バグ・エラー", color: "#f472b6" },
  { id: "request", label: "💡 こうしてほしい", color: "#60a5fa" },
  { id: "other", label: "💬 その他", color: "#a78bfa" },
];
const MAX_LEN = 300;

function fmtDate(ts) {
  try { const d = new Date(ts); return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; } catch { return ""; }
}

export default function Feedback({ player, onBack, onSubmit }) {
  const [category, setCategory] = useState("good");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const log = [...(player.feedbackLog || [])].reverse();

  async function send() {
    const text = message.trim();
    if (!text || busy) return;
    setBusy(true);
    await onSubmit?.({ message: text, category });
    setBusy(false);
    setMessage("");
    setDone(true);
    setTimeout(() => setDone(false), 2600);
  }

  const catBtn = (c) => ({
    padding: "9px 6px", borderRadius: 11, cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 900,
    border: `1.5px solid ${category === c.id ? c.color : "rgba(255,255,255,.15)"}`,
    background: category === c.id ? `${c.color}26` : "rgba(255,255,255,.05)",
    color: category === c.id ? "#fff" : "rgba(255,255,255,.7)",
  });

  return (
    <div className="app">
      <Header player={player} back="ホーム" onBack={onBack} />
      <div className="content">
        <div className="pg-ttl">📮 ご意見箱</div>
        <div className="pg-sub">夏休み中も使ってみた感想を聞かせてね。たのしかったこと・こまったこと・こうしてほしいこと、なんでもOK！</div>

        <div className="glass" style={{ padding: "14px 16px" }}>
          <div className="slbl">どんな意見？</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7, marginBottom: 12 }}>
            {CATEGORIES.map((c) => (
              <button key={c.id} data-sfx="none" onClick={() => setCategory(c.id)} style={catBtn(c)}>{c.label}</button>
            ))}
          </div>

          <div className="slbl">くわしく書いてね（{message.length}/{MAX_LEN}）</div>
          <textarea
            value={message}
            maxLength={MAX_LEN}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="例：バトルがたのしい！／◯◯のもんだいで答えがちがう気がする／こんな機能がほしい…"
            rows={5}
            style={{
              width: "100%", boxSizing: "border-box", fontSize: 14, fontWeight: 600, padding: "11px 13px",
              borderRadius: 12, border: "1px solid rgba(255,255,255,.2)", background: "rgba(255,255,255,.06)",
              color: "#fff", fontFamily: "inherit", resize: "vertical", lineHeight: 1.6,
            }}
          />

          <button data-sfx="none" onClick={send} disabled={!message.trim() || busy}
            style={{
              width: "100%", marginTop: 10, padding: "13px", borderRadius: 13, border: "none", cursor: (!message.trim() || busy) ? "default" : "pointer",
              fontFamily: "inherit", fontSize: 15, fontWeight: 900, color: "#fff",
              background: (!message.trim() || busy) ? "rgba(255,255,255,.1)" : "linear-gradient(135deg,#6366f1,#8b5cf6)",
              opacity: (!message.trim() || busy) ? 0.5 : 1,
            }}>
            {busy ? "送信中…" : done ? "✅ 送信したよ！ありがとう！" : "📮 先生に送る"}
          </button>
        </div>

        {log.length > 0 && (
          <div className="glass" style={{ padding: "14px 16px" }}>
            <div className="slbl">これまで送った意見</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {log.slice(0, 10).map((f, i) => {
                const c = CATEGORIES.find((x) => x.id === f.category);
                return (
                  <div key={i} style={{ padding: "9px 11px", borderRadius: 10, background: "rgba(255,255,255,.05)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 3 }}>
                      <span style={{ fontSize: 11, fontWeight: 900, color: c?.color || "#a78bfa" }}>{c?.label || "💬 その他"}</span>
                      <span style={{ fontSize: 10, color: "rgba(255,255,255,.4)" }}>{fmtDate(f.at)}</span>
                    </div>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: "rgba(255,255,255,.85)", whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{f.message}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
