// ============================================================
// AdminLogsPanel.jsx — 【管理者用】学習ログ（サーバーに残っている生徒の記録）を見る。
//  ・クラスの1日ごとの表：生徒 × 日付＝その日に解いた問題数（色が濃いほど多い）。ログインだけの日は「ログイン」。
//  ・生徒をタップ：日ごとの記録（問題数・正解・正答率・解答時間・滞在時間・メダル・ログイン回数・初回/最終時刻）／
//                ログイン履歴（開始時刻・滞在時間）／メダル獲得／解答の中身（問題文・正解・生徒の答え・○×・誤答タグ・時間）
//  記録は数学ラボ3のサーバー（third_daily / third_sessions / third_medals / third_answer_log）。合言葉が必要。
// ============================================================
import { useState } from "react";
import { findUnitById } from "../data/index.js";
import MathText from "./MathText.jsx";
import { adminAvailable, adminDaily, adminStudentLog } from "../third/adminApi.js";

const JST = (t) => new Date(new Date(t).getTime() + 9 * 3600 * 1000).toISOString().slice(0, 10);
const md = (d) => { const [, m, dd] = String(d).split("-"); return `${Number(m)}/${Number(dd)}`; };
const hm = (t) => (t ? new Date(t).toLocaleTimeString("ja-JP", { timeZone: "Asia/Tokyo", hour: "2-digit", minute: "2-digit" }) : "—");
const mdhm = (t) => (t ? new Date(t).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—");
const mins = (ms) => (Number(ms) > 0 ? `${Math.max(1, Math.round(Number(ms) / 60000))}分` : "—");
const secs = (ms) => (Number(ms) > 0 ? `${Math.round(Number(ms) / 100) / 10}秒` : "—");
const pct = (c, t) => (t > 0 ? Math.round((c / t) * 100) : null);
const unitName = (id) => findUnitById(id)?.name || id;
const MODE_JA = { battle: "バトル", practice: "れんしゅう", confirm: "はいち確認" };
const RESULT_JA = { win: "勝ち", lose: "負け", abandon: "途中でやめた" };
const KIND_JA = { haichi: "はいち", practice: "れんしゅう" };
const LEVEL_JA = { easy: "簡単", standard: "普通", advanced: "難しい", oni: "鬼" };

const dim = { fontSize: 11.5, color: "rgba(255,255,255,.6)" };
const btn = { fontSize: 12.5, fontWeight: 800, padding: "8px 12px", borderRadius: 10, border: "1px solid rgba(255,255,255,.2)", background: "rgba(255,255,255,.1)", color: "#fff", cursor: "pointer", fontFamily: "inherit" };
const th = { padding: "4px 6px", fontSize: 10.5, fontWeight: 700, color: "rgba(255,255,255,.6)", textAlign: "center", whiteSpace: "nowrap" };
const cellBg = (n) => (n <= 0 ? "rgba(255,255,255,.04)" : `rgba(99,102,241,${Math.min(0.85, 0.2 + n / 40)})`);
const MISSING = "学習ログの表がまだ作られていません。docs/supabase_third_logging_2026-09-25.sql を Supabase の SQL Editor で実行し、third-api を再デプロイしてください。";

function Table({ children }) {
  return <div style={{ overflowX: "auto" }}><table style={{ borderCollapse: "collapse", width: "100%", fontSize: 12 }}>{children}</table></div>;
}

function StudentDetail({ pass, student, onClose }) {
  const [d, setD] = useState(null);
  const [err, setErr] = useState("");
  const [wrongOnly, setWrongOnly] = useState(false);
  const [busy, setBusy] = useState(false);
  async function load() {
    setBusy(true); setErr("");
    const r = await adminStudentLog(pass, student.id, 30, 200);
    if (!r.ok) setErr(`取得できませんでした（${r.error}）`); else setD(r);
    setBusy(false);
  }
  if (!d && !busy && !err) load();
  const answers = (d?.answers || []).filter((a) => !wrongOnly || !a.ok);
  const missing = d && (d.missing.daily || d.missing.answers);
  return (
    <div style={{ background: "rgba(255,255,255,.05)", borderRadius: 12, padding: 12, marginTop: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <b style={{ flex: 1, fontSize: 14 }}>{student.name} の学習ログ</b>
        <button data-sfx="none" style={btn} onClick={load} disabled={busy}>{busy ? "…" : "更新"}</button>
        <button data-sfx="none" style={btn} onClick={onClose}>閉じる</button>
      </div>
      {err && <div style={{ color: "#fca5a5", fontSize: 12.5 }}>⚠️ {err}</div>}
      {missing && <div style={{ color: "#fcd34d", fontSize: 12.5, marginBottom: 8 }}>ℹ️ {MISSING}</div>}
      {d && (
        <>
          <b style={{ fontSize: 12.5 }}>📅 日ごとの記録（直近30日）</b>
          {d.daily.length === 0 ? <div style={dim}>まだ記録がありません。</div> : (
            <Table>
              <thead><tr>{["日付", "解いた問題", "正解", "正答率", "解答時間", "滞在", "メダル", "ログイン", "はじめ〜おわり"].map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead>
              <tbody>{d.daily.map((r) => (
                <tr key={r.day} style={{ borderTop: "1px solid rgba(255,255,255,.08)", textAlign: "center" }}>
                  <td style={{ padding: "4px 6px", fontWeight: 800 }}>{md(r.day)}</td>
                  <td style={{ fontWeight: 900 }}>{r.solved}問<span style={dim}>（戦{r.battle_n}・練{r.practice_n}・確{r.haichi_n}）</span></td>
                  <td>{r.correct}</td><td>{pct(r.correct, r.solved) ?? "—"}{pct(r.correct, r.solved) != null ? "%" : ""}</td>
                  <td>{mins(r.ms)}</td><td>{mins(r.active_ms)}</td><td>{r.medals || "—"}</td><td>{r.logins}回</td>
                  <td style={dim}>{hm(r.first_at)}〜{hm(r.last_at)}</td>
                </tr>
              ))}</tbody>
            </Table>
          )}

          <b style={{ fontSize: 12.5, display: "block", marginTop: 12 }}>🔑 ログイン履歴（直近）</b>
          {d.sessions.length === 0 ? <div style={dim}>まだ記録がありません。</div> : (
            <div style={{ fontSize: 12, lineHeight: 1.8 }}>{d.sessions.slice(0, 15).map((s, i) => (
              <div key={i}>{mdhm(s.started_at)} 〜 {hm(s.last_seen_at)}　<span style={dim}>（滞在 {mins(s.active_ms)}）</span></div>
            ))}</div>
          )}

          <b style={{ fontSize: 12.5, display: "block", marginTop: 12 }}>🏅 メダルを取った日</b>
          {d.medals.length === 0 ? <div style={dim}>まだ記録がありません。</div> : (
            <div style={{ fontSize: 12, lineHeight: 1.8 }}>{d.medals.slice(0, 30).map((m, i) => (
              <div key={i}>{mdhm(m.earned_at)}　{KIND_JA[m.kind] || m.kind}　{m.unit_id.startsWith("nv:") ? unitName(m.unit_id.slice(3)) : unitName(m.unit_id)}</div>
            ))}</div>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12 }}>
            <b style={{ fontSize: 12.5, flex: 1 }}>📝 解答の中身（新しい順・200件まで）</b>
            <label style={{ fontSize: 12, fontWeight: 700 }}><input type="checkbox" checked={wrongOnly} onChange={(e) => setWrongOnly(e.target.checked)} /> まちがいだけ</label>
          </div>
          {answers.length === 0 ? <div style={dim}>まだ記録がありません。</div> : answers.map((a, i) => (
            <div key={i} style={{ borderTop: "1px solid rgba(255,255,255,.08)", padding: "6px 0", fontSize: 12.5 }}>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "baseline" }}>
                <b style={{ color: a.ok ? "#4ade80" : "#f87171" }}>{a.ok ? "○" : "×"}</b>
                <span style={dim}>{mdhm(a.created_at)}　{MODE_JA[a.mode] || a.mode}{a.result ? `（${RESULT_JA[a.result] || a.result}）` : ""}　{LEVEL_JA[a.difficulty] || a.difficulty}　{unitName(a.unit_id)}　{secs(a.ms)}{a.counted ? "" : "　※報酬・メダルには数えず"}</span>
              </div>
              <div style={{ margin: "2px 0" }}><MathText>{a.q || ""}</MathText></div>
              <div><span style={dim}>正解：</span><b><MathText>{a.ans || ""}</MathText></b>　<span style={dim}>生徒の答え：</span><b style={{ color: a.ok ? "#4ade80" : "#fca5a5" }}><MathText>{a.user_answer || ""}</MathText></b>
                {a.mistake_tag && <span style={{ ...dim, marginLeft: 8 }}>誤答タイプ：{a.mistake_tag}</span>}</div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

export default function AdminLogsPanel({ pass, students = [] }) {
  const [days, setDays] = useState(14);
  const [rows, setRows] = useState(null);
  const [missing, setMissing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [openId, setOpenId] = useState(null);
  if (!adminAvailable()) return null;

  async function load(n = days) {
    setBusy(true); setErr("");
    const r = await adminDaily(pass, n);
    if (!r.ok) setErr(`取得できませんでした（${r.error}）`); else { setRows(r.rows); setMissing(!!r.missing); }
    setBusy(false);
  }
  const today = Date.now();
  const dates = Array.from({ length: days }, (_, i) => JST(today - (days - 1 - i) * 86400000));
  const by = {};
  for (const r of rows || []) (by[r.student_id] ||= {})[r.day] = r;
  const total = (sid) => Object.values(by[sid] || {}).reduce((a, r) => a + r.solved, 0);
  const sorted = [...students].sort((a, b) => total(b.id) - total(a.id));

  return (
    <div className="glass" style={{ padding: "14px 16px", marginTop: 12 }}>
      <div className="slbl">🗂 学習ログ（サーバーの記録）</div>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 8 }}>
        <button data-sfx="none" style={btn} disabled={busy || !pass.trim()} onClick={() => load()}>{busy ? "…" : rows ? "更新" : "読み込み"}</button>
        {[7, 14, 30].map((n) => <button key={n} data-sfx="none" style={{ ...btn, opacity: days === n ? 1 : 0.55 }} onClick={() => { setDays(n); if (rows) load(n); }}>{n}日</button>)}
        <span style={dim}>その日に解いた問題数（日本時間）。生徒の名前をタップすると、解答の中身まで見られます。</span>
      </div>
      {err && <div style={{ color: "#fca5a5", fontSize: 12.5 }}>⚠️ {err}</div>}
      {missing && <div style={{ color: "#fcd34d", fontSize: 12.5, marginBottom: 8 }}>ℹ️ {MISSING}</div>}
      {rows && !missing && (
        <Table>
          <thead><tr><th style={{ ...th, textAlign: "left" }}>生徒</th>{dates.map((d) => <th key={d} style={th}>{md(d)}</th>)}<th style={th}>計</th></tr></thead>
          <tbody>{sorted.map((s) => (
            <tr key={s.id} style={{ borderTop: "1px solid rgba(255,255,255,.08)" }}>
              <td style={{ padding: "4px 6px", whiteSpace: "nowrap" }}>
                <button data-sfx="none" onClick={() => setOpenId(openId === s.id ? null : s.id)} style={{ background: "none", border: "none", color: "#fff", fontWeight: 800, fontFamily: "inherit", cursor: "pointer", padding: 0, textDecoration: "underline" }}>{s.name}</button>
              </td>
              {dates.map((d) => {
                const r = by[s.id]?.[d];
                return <td key={d} title={r ? `正解${r.correct}/${r.solved}・解答${mins(r.ms)}・滞在${mins(r.active_ms)}・メダル${r.medals}・ログイン${r.logins}回` : ""}
                  style={{ textAlign: "center", background: cellBg(r?.solved || 0), fontWeight: 800, minWidth: 26 }}>{r ? (r.solved > 0 ? r.solved : "ロ") : ""}</td>;
              })}
              <td style={{ textAlign: "center", fontWeight: 900 }}>{total(s.id)}</td>
            </tr>
          ))}</tbody>
        </Table>
      )}
      {rows && !missing && <div style={{ ...dim, marginTop: 4 }}>数字＝解いた問題数／「ロ」＝ログインしただけ（解いていない）／空欄＝記録なし</div>}
      {openId && <StudentDetail key={openId} pass={pass} student={students.find((s) => s.id === openId) || { id: openId, name: "" }} onClose={() => setOpenId(null)} />}
    </div>
  );
}
