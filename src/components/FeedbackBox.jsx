// ============================================================
// FeedbackBox.jsx — 先生用：生徒から届いた「ご意見箱」の一覧（管理モード内）。
//  Edge Function `feedback-list` から全件（新しい順）を取得して表示する。
//  先生の合言葉（TEACHER_PASS・ClassStatsと共通）が必要。合言葉はこの端末に記憶される。
// ============================================================
import { useState } from "react";
import { AUTH_ENABLED, supabase } from "../auth/supabase.js";

const PASS_KEY = "ml2_teacher_pass";
const CAT_LABEL = {
  good: { label: "⭐️ たのしい", color: "#fbbf24" },
  trouble: { label: "😕 こまった", color: "#f87171" },
  bug: { label: "🐛 バグ・エラー", color: "#f472b6" },
  request: { label: "💡 こうしてほしい", color: "#60a5fa" },
  other: { label: "💬 その他", color: "#a78bfa" },
};

function fmtDate(iso) {
  if (!iso) return "—";
  try { const d = new Date(iso); return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; } catch { return "—"; }
}

export default function FeedbackBox() {
  const [pass, setPass] = useState(() => { try { return localStorage.getItem(PASS_KEY) || ""; } catch { return ""; } });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [data, setData] = useState(null);
  const [filter, setFilter] = useState("all");

  if (!AUTH_ENABLED) return null; // サーバー未設定なら出さない

  async function load() {
    if (!pass.trim() || busy) return;
    setBusy(true); setErr("");
    try {
      try { localStorage.setItem(PASS_KEY, pass); } catch { /* noop */ }
      const { data: res, error } = await supabase.functions.invoke("feedback-list", { body: { pass } });
      if (error) throw new Error(String(error.message || error));
      if (!res?.ok) throw new Error(res?.error === "unauthorized" ? "合言葉がちがいます" : String(res?.error || "取得できませんでした"));
      setData(res);
    } catch (e) {
      setErr(e.message || "取得できませんでした");
      setData(null);
    }
    setBusy(false);
  }

  const inp = { fontSize: 14, fontWeight: 800, padding: "9px 12px", borderRadius: 10, border: "1px solid rgba(255,255,255,.2)", background: "rgba(255,255,255,.06)", color: "#fff", fontFamily: "inherit", flex: 1, minWidth: 0 };
  const rows = data ? (filter === "all" ? data.feedback : data.feedback.filter((f) => f.category === filter)) : [];

  return (
    <div className="glass" style={{ padding: "14px 16px" }}>
      <div className="slbl">📮 ご意見箱（サーバー記録）</div>
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <input style={inp} type="password" value={pass} placeholder="先生の合言葉" onChange={(e) => setPass(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") load(); }} />
        <button data-sfx="none" onClick={load} disabled={busy || !pass.trim()}
          style={{ fontSize: 13, fontWeight: 900, padding: "9px 16px", borderRadius: 10, border: "none", background: busy ? "rgba(255,255,255,.15)" : "#6366f1", color: "#fff", cursor: busy ? "wait" : "pointer", fontFamily: "inherit" }}>
          {busy ? "…" : data ? "更新" : "読み込み"}
        </button>
      </div>
      {err && <div style={{ fontSize: 12.5, fontWeight: 700, color: "#fca5a5", marginBottom: 8 }}>⚠️ {err}</div>}

      {data && (
        <div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
            <button data-sfx="none" onClick={() => setFilter("all")}
              style={{ fontSize: 11, fontWeight: 800, padding: "5px 10px", borderRadius: 999, cursor: "pointer", fontFamily: "inherit",
                border: `1.5px solid ${filter === "all" ? "#fff" : "rgba(255,255,255,.2)"}`, background: filter === "all" ? "rgba(255,255,255,.15)" : "transparent", color: "#fff" }}>
              すべて（{data.feedback.length}）
            </button>
            {Object.entries(CAT_LABEL).map(([id, c]) => {
              const n = data.feedback.filter((f) => f.category === id).length;
              if (!n) return null;
              return (
                <button key={id} data-sfx="none" onClick={() => setFilter(id)}
                  style={{ fontSize: 11, fontWeight: 800, padding: "5px 10px", borderRadius: 999, cursor: "pointer", fontFamily: "inherit",
                    border: `1.5px solid ${filter === id ? c.color : "rgba(255,255,255,.2)"}`, background: filter === id ? `${c.color}26` : "transparent", color: filter === id ? "#fff" : "rgba(255,255,255,.7)" }}>
                  {c.label}（{n}）
                </button>
              );
            })}
          </div>

          {rows.length === 0 ? (
            <div style={{ fontSize: 12.5, color: "rgba(255,255,255,.5)", padding: "8px 0" }}>まだ意見がありません</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {rows.map((f) => {
                const c = CAT_LABEL[f.category] || CAT_LABEL.other;
                return (
                  <div key={f.id} style={{ padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,.05)", borderLeft: `3px solid ${c.color}` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 11, fontWeight: 900, color: c.color }}>{c.label}</span>
                      <span style={{ fontSize: 12, fontWeight: 800, color: "#fff" }}>{f.name || "(名前なし)"}</span>
                      <span style={{ fontSize: 10.5, fontWeight: 700, color: "rgba(255,255,255,.4)" }}>ID:{f.login_id || "?"}</span>
                      <span style={{ fontSize: 10.5, color: "rgba(255,255,255,.4)", marginLeft: "auto" }}>{fmtDate(f.created_at)}</span>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,.9)", whiteSpace: "pre-wrap", lineHeight: 1.55 }}>{f.message}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
