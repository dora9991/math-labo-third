// ============================================================
// ClassStats.jsx — 先生用：クラス全員の成績（管理モード内）。
//  Edge Function `teacher` から全生徒の集計（サーバー記録）を取得して表示する。
//   ・単元の理解度 … クリア済み小単元（サーバー権威 cycle）＋正答率で把握
//   ・小単元の正答率 … attempts（1問ごとのサーバー採点ログ）の 正解数/解答数
//  先生の合言葉（TEACHER_PASS）が必要。合言葉はこの端末に記憶される。
// ============================================================
import { useState } from "react";
import { AUTH_ENABLED, supabase } from "../auth/supabase.js";
import { CHAPTERS } from "../data/index.js";

const PASS_KEY = "ml2_teacher_pass";

// 小単元ID → { name, chapter } の逆引き（表示順は CHAPTERS の並び）
const UNIT_INDEX = [];
for (const ch of CHAPTERS) for (const u of ch.units || []) UNIT_INDEX.push({ id: u.id, name: u.name, chapter: ch.name, grade: ch.grade });

function fmtDate(iso) {
  if (!iso) return "—";
  try { const d = new Date(iso); return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; } catch { return "—"; }
}
function rateColor(pct) {
  return pct >= 80 ? "#4ade80" : pct >= 50 ? "#fbbf24" : "#f87171";
}

export default function ClassStats() {
  const [pass, setPass] = useState(() => { try { return localStorage.getItem(PASS_KEY) || ""; } catch { return ""; } });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [data, setData] = useState(null);
  const [openId, setOpenId] = useState(null); // 展開中の生徒id

  if (!AUTH_ENABLED) return null; // サーバー未設定なら出さない

  async function load() {
    if (!pass.trim() || busy) return;
    setBusy(true); setErr("");
    try {
      try { localStorage.setItem(PASS_KEY, pass); } catch { /* noop */ }
      const { data: res, error } = await supabase.functions.invoke("teacher", { body: { pass } });
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

  return (
    <div className="glass" style={{ padding: "14px 16px" }}>
      <div className="slbl">📊 クラスの成績（サーバー記録）</div>
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
          <div style={{ fontSize: 11.5, color: "rgba(255,255,255,.55)", marginBottom: 8 }}>
            生徒 {data.students.length}人 ・ 数字は「正解数/解答数」（サーバーが採点した全モードの記録）
          </div>
          {data.students.map((s) => {
            const open = openId === s.id;
            // この生徒の小単元行（解答があるか、クリア済みのものだけ・CHAPTERS順）
            const rows = UNIT_INDEX.filter((u) => s.units[u.id] || s.cleared.includes(u.id));
            const totalC = Object.values(s.units).reduce((a, x) => a + x.c, 0);
            const pctAll = s.attempts ? Math.round((totalC / s.attempts) * 100) : null;
            return (
              <div key={s.id} style={{ borderTop: "1px solid rgba(255,255,255,.1)", padding: "8px 0" }}>
                <button data-sfx="none" onClick={() => setOpenId(open ? null : s.id)}
                  style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", color: "#fff", cursor: "pointer", fontFamily: "inherit", padding: 0, textAlign: "left" }}>
                  <span style={{ fontSize: 13.5, fontWeight: 900, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {s.name} <span style={{ fontWeight: 700, fontSize: 11, color: "rgba(255,255,255,.45)" }}>ID:{s.loginId}</span>
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 800, color: "#c7d2fe" }}>Lv.{s.level}</span>
                  <span style={{ fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,.6)" }}>{s.attempts}問{pctAll != null ? `・${pctAll}%` : ""}</span>
                  <span style={{ fontSize: 10.5, color: "rgba(255,255,255,.4)" }}>
                    {s.lastActive ? fmtDate(s.lastActive) : s.lastLogin ? `ログインのみ ${fmtDate(s.lastLogin)}` : "未ログイン"}
                  </span>
                  <span style={{ fontSize: 10, color: "rgba(255,255,255,.5)" }}>{open ? "▲" : "▼"}</span>
                </button>
                {open && (
                  rows.length === 0 && (s.log || []).length === 0 ? (
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,.5)", padding: "8px 0 2px" }}>まだ記録がありません</div>
                  ) : (
                    <div style={{ marginTop: 8 }}>
                      {rows.map((u) => {
                        const a = s.units[u.id] || { t: 0, c: 0 };
                        const pct = a.t ? Math.round((a.c / a.t) * 100) : null;
                        const cleared = s.cleared.includes(u.id);
                        return (
                          <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "3.5px 0", fontSize: 12 }}>
                            <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "rgba(255,255,255,.8)", fontWeight: 700 }}>
                              <span style={{ color: "rgba(255,255,255,.4)", fontSize: 10.5 }}>{u.chapter}｜</span>{u.name}
                            </span>
                            {cleared && <span style={{ fontSize: 10.5, fontWeight: 900, color: "#4ade80" }}>✓クリア</span>}
                            {pct != null ? (
                              <>
                                <span style={{ width: 64, textAlign: "right", fontWeight: 800, color: "rgba(255,255,255,.65)", fontVariantNumeric: "tabular-nums" }}>{a.c}/{a.t}</span>
                                <span style={{ width: 44, textAlign: "right", fontWeight: 900, color: rateColor(pct), fontVariantNumeric: "tabular-nums" }}>{pct}%</span>
                              </>
                            ) : (
                              <span style={{ width: 108, textAlign: "right", fontSize: 11, color: "rgba(255,255,255,.35)" }}>記録なし</span>
                            )}
                          </div>
                        );
                      })}
                      {/* 解答の中身（問題文・答え・正誤・誤答タグ）：直近30件・新しい順 */}
                      {(s.log || []).length > 0 && (
                        <div style={{ marginTop: 10, borderTop: "1px dashed rgba(255,255,255,.15)", paddingTop: 8 }}>
                          <div style={{ fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,.55)", marginBottom: 4 }}>
                            📝 解答の中身（直近{s.log.length}件）
                          </div>
                          <div style={{ maxHeight: 240, overflowY: "auto", display: "flex", flexDirection: "column", gap: 5 }}>
                            {s.log.map((r, i) => (
                              <div key={i} style={{
                                fontSize: 11.5, padding: "5px 7px", borderRadius: 7,
                                background: r.ok ? "rgba(74,222,128,.08)" : "rgba(248,113,113,.08)",
                                border: `1px solid ${r.ok ? "rgba(74,222,128,.25)" : "rgba(248,113,113,.25)"}`,
                              }}>
                                <div style={{ display: "flex", justifyContent: "space-between", gap: 6, color: "rgba(255,255,255,.4)", fontSize: 10 }}>
                                  <span>{fmtDate(r.createdAt)}・{r.mode || "?"}</span>
                                  <span>{r.ok ? "○ 正解" : "× 不正解"}</span>
                                </div>
                                <div style={{ color: "rgba(255,255,255,.85)", fontWeight: 700, wordBreak: "break-word" }}>{r.q || "(問題文なし)"}</div>
                                <div style={{ color: "rgba(255,255,255,.6)" }}>
                                  正解: <span style={{ color: "#4ade80", fontWeight: 800 }}>{r.ans ?? "—"}</span>
                                  {!r.ok && <> ／ 解答: <span style={{ color: "#f87171", fontWeight: 800 }}>{r.userAnswer ?? "—"}</span></>}
                                  {r.mistakeTag && <span style={{ marginLeft: 6, color: "#fbbf24" }}>🏷️ {r.mistakeTag}</span>}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                )}
              </div>
            );
          })}
          {data.truncated && <div style={{ fontSize: 11, color: "#fbbf24", marginTop: 6 }}>⚠️ 記録が多いため一部のみ集計しています</div>}
        </div>
      )}
    </div>
  );
}
