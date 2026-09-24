// ============================================================
// AdminThirdPanel.jsx — 【管理者用】数学ラボ3の分析と、管理ツール（管理モード内）。
//  ・1週間のまとめ：ログイン人数／解答した人数／平均プレイ時間／平均回答数／日別のログイン
//  ・生徒ごとの詳細：進み具合(メダル)・パーティ・平均正答率・回答数・プレイ時間・ログインした日・単元ごとの正答率
//  ・正答率が低い問題（10回以上答えられたもの）のピックアップ
//  ・解答画面の右上に「みんなの正答率」を出すスイッチ
//  ・管理ツール：クリスタル／全クリア／仲間の追加・調整（サーバーの状態を直接変える。合言葉が必要）
//  プレイ時間は「解答にかけた時間」の合計（動画を見ている時間などは含まない・推定）。
// ============================================================
import { useEffect, useMemo, useState } from "react";
import { AUTH_ENABLED, supabase } from "../auth/supabase.js";
import { GRADES, findUnitById } from "../data/index.js";
import { SPECIALIST_ROSTER } from "../third/specialistRoster.js";
import { generatePractice } from "../third/problemSource.js";
import AdminLogsPanel from "./AdminLogsPanel.jsx";
import { adminAvailable, adminStats, adminGrant, PASS_KEY, saveProblemRates, isRateOverlayOn, setRateOverlay, ratesSavedAt } from "../third/adminApi.js";

const ROSTER = Object.fromEntries(SPECIALIST_ROSTER.map((c) => [c.id, c]));
const TOTAL_UNITS = Object.values(GRADES).reduce((a, cs) => a + cs.reduce((b, c) => b + (c.units || []).length, 0), 0);
const LEVEL_JA = { easy: "簡単", standard: "普通", advanced: "難しい", oni: "鬼", normal: "普通", hard: "難しい" };

const rateColor = (pct) => (pct >= 80 ? "#4ade80" : pct >= 50 ? "#fbbf24" : "#f87171");
const pct = (c, t) => (t > 0 ? Math.round((c / t) * 100) : null);
const fmtMin = (ms) => (ms > 0 ? `${Math.round((ms / 60000) * 10) / 10}分` : "—");
const md = (d) => { const [, m, dd] = String(d).split("-"); return `${Number(m)}/${Number(dd)}`; };
const unitName = (id) => findUnitById(id)?.name || id;

const inp = { fontSize: 14, fontWeight: 800, padding: "8px 10px", borderRadius: 10, border: "1px solid rgba(255,255,255,.2)", background: "rgba(255,255,255,.06)", color: "#fff", fontFamily: "inherit", width: 84 };
const btn = (bg = "rgba(255,255,255,.1)") => ({ fontSize: 12.5, fontWeight: 800, padding: "8px 12px", borderRadius: 10, border: "1px solid rgba(255,255,255,.2)", background: bg, color: "#fff", cursor: "pointer", fontFamily: "inherit" });
const primary = { ...btn("#6366f1"), border: "none" };
const box = { padding: "14px 16px" };
const dim = { fontSize: 11.5, color: "rgba(255,255,255,.6)" };

function Stat({ label, value, sub }) {
  return (
    <div style={{ flex: "1 1 120px", background: "rgba(255,255,255,.06)", borderRadius: 12, padding: "10px 12px" }}>
      <div style={{ fontSize: 11, color: "rgba(255,255,255,.6)", fontWeight: 700 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 900 }}>{value}</div>
      {sub && <div style={{ fontSize: 10.5, color: "rgba(255,255,255,.5)" }}>{sub}</div>}
    </div>
  );
}

// ---- 管理ツール（チケット・全クリア・仲間）。run(op,args) を呼ぶだけ。
function GrantTools({ run, busy }) {
  const [n, setN] = useState("10");
  const [exp, setExp] = useState("5000");
  const [brk, setBrk] = useState("2");
  const [ask, setAsk] = useState(null); // 確認待ちの操作 { op, args, label }
  const go = (op, args, label, confirm = false) => (confirm ? setAsk({ op, args, label }) : run(op, args));
  return (
    <div style={{ marginTop: 10, padding: 10, borderRadius: 12, background: "rgba(0,0,0,.25)" }}>
      <div style={{ fontSize: 12, fontWeight: 900, marginBottom: 8 }}>🛠️ 管理ツール（この生徒のゲーム状態を直接変えます）</div>
      <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", marginBottom: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 800 }}>💎 クリスタル</span>
        <input style={inp} inputMode="numeric" value={n} onChange={(e) => setN(e.target.value)} />
        <button style={btn()} disabled={busy} onClick={() => go("addCrystals", { n: Number(n) })}>＋追加</button>
        <button style={btn()} disabled={busy} onClick={() => go("setCrystals", { n: Number(n) })}>この数にする</button>
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
        <button style={btn()} disabled={busy} onClick={() => go("clearAllMedals", {}, "全小単元のメダル（はいち・れんしゅう）を全部そろえて、バトルを全解放します", true)}>🏅 全クリア（メダル全部）</button>
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 800 }}>🐾 仲間を追加</span>
        <button style={btn()} disabled={busy} onClick={() => go("grantCompanions", { mode: "all" })}>全員</button>
        {["UR", "SR", "R", "N"].map((r) => <button key={r} style={btn()} disabled={busy} onClick={() => go("grantCompanions", { mode: "rarity", rarity: r })}>{r}</button>)}
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 800 }}>💪 全員の強さ</span>
        <span style={dim}>経験値</span><input style={inp} inputMode="numeric" value={exp} onChange={(e) => setExp(e.target.value)} />
        <span style={dim}>凸(0〜4)</span><input style={{ ...inp, width: 56 }} inputMode="numeric" value={brk} onChange={(e) => setBrk(e.target.value)} />
        <button style={btn()} disabled={busy} onClick={() => go("setCompanionGrowth", { exp: Number(exp), breaks: Number(brk) })}>そろえる</button>
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <button style={btn()} disabled={busy} onClick={() => go("resetCompanions", {}, "仲間を最初の5体に戻します", true)}>仲間を最初の5体に戻す</button>
        <button style={btn("rgba(239,68,68,.25)")} disabled={busy} onClick={() => go("resetAll", {}, "この生徒のゲーム状態（仲間・チケット・メダル）を最初に戻します。元に戻せません", true)}>状態を全部リセット</button>
      </div>
      {ask && (
        <div style={{ marginTop: 10, padding: 10, borderRadius: 10, background: "rgba(248,113,113,.15)", border: "1px solid rgba(248,113,113,.4)" }}>
          <div style={{ fontSize: 12.5, fontWeight: 800, marginBottom: 8 }}>{ask.label}。よろしいですか？</div>
          <div style={{ display: "flex", gap: 8 }}>
            <button style={btn("#ef4444")} onClick={() => { const a = ask; setAsk(null); run(a.op, a.args); }}>はい</button>
            <button style={btn()} onClick={() => setAsk(null)}>やめる</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminThirdPanel() {
  const server = adminAvailable();
  const [pass, setPass] = useState(() => { try { return localStorage.getItem(PASS_KEY) || ""; } catch { return ""; } });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [data, setData] = useState(null);
  const [openId, setOpenId] = useState(null);
  const [overlay, setOverlay] = useState(isRateOverlayOn());
  const [myId, setMyId] = useState(null);

  useEffect(() => {
    if (!AUTH_ENABLED) return;
    supabase.auth.getUser().then(({ data: d }) => setMyId(d?.user?.id || null)).catch(() => {});
  }, []);

  async function load() {
    if (!pass.trim() || busy) return;
    setBusy(true); setErr("");
    try { localStorage.setItem(PASS_KEY, pass); } catch { /* noop */ }
    const res = await adminStats(pass);
    if (!res.ok) { setErr(res.error === "unauthorized" ? "合言葉がちがいます" : `取得できませんでした（${res.error}）`); setData(null); }
    else { setData(res); saveProblemRates(res.problems || {}); }
    setBusy(false);
  }

  async function toggleOverlay() {
    const next = !overlay;
    setRateOverlay(next); setOverlay(next);
    if (next && !data && pass.trim()) load();
  }

  async function run(targetId, op, args) {
    if (busy) return;
    setBusy(true); setErr(""); setMsg("");
    const res = await adminGrant(pass, targetId, op, args);
    if (!res.ok) setErr(res.error === "unauthorized" ? "合言葉がちがいます" : `実行できませんでした（${res.error}）`);
    else { setMsg(res.message || "実行しました"); if (server) { setBusy(false); await load(); return; } }
    setBusy(false);
  }

  // 正答率が低い問題（10回以上答えられたもの）
  const hard = useMemo(() => {
    if (!data?.problems) return [];
    return Object.entries(data.problems).filter(([, p]) => p.t >= 10).map(([id, p]) => ({ id, ...p, rate: p.c / p.t }))
      .sort((a, b) => a.rate - b.rate).slice(0, 15).map((p) => {
        let sample = "";
        try { if (p.seed != null) sample = String(generatePractice(p.u, p.l, p.seed)?.q || "").replace(/\s+/g, " ").slice(0, 70); } catch { /* noop */ }
        return { ...p, sample };
      });
  }, [data]);

  const w = data?.week;
  const maxDay = Math.max(1, ...(w?.days || []).map((d) => d.logins));

  return (
    <div className="glass" style={box}>
      <div className="slbl">📊 ラボ3の分析・管理ツール</div>

      <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
        <input style={{ ...inp, width: 190 }} type="password" value={pass} placeholder="先生の合言葉" onChange={(e) => setPass(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") load(); }} />
        {server && <button data-sfx="none" style={primary} disabled={busy || !pass.trim()} onClick={load}>{busy ? "…" : data ? "更新" : "読み込み"}</button>}
      </div>
      {!server && <div style={{ ...dim, marginBottom: 8 }}>※サーバー未接続（開発モード）：分析は出ません。下の管理ツールは、この端末のテスト用データだけを変えます。</div>}
      {err && <div style={{ fontSize: 12.5, fontWeight: 700, color: "#fca5a5", marginBottom: 8 }}>⚠️ {err}</div>}
      {msg && <div style={{ fontSize: 12.5, fontWeight: 700, color: "#86efac", marginBottom: 8 }}>✅ {msg}</div>}

      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 800, marginBottom: 10, cursor: "pointer" }}>
        <input type="checkbox" checked={overlay} onChange={toggleOverlay} />
        解答画面の右上に「みんなの正答率」を表示する
        <span style={dim}>{ratesSavedAt() ? `（集計：${new Date(ratesSavedAt()).toLocaleString("ja-JP", { month: "numeric", day: "numeric", hour: "numeric", minute: "numeric" })}時点）` : "（先に読み込みが必要）"}</span>
      </label>

      {!server && (
        <div style={{ marginBottom: 10 }}>
          <GrantTools busy={busy} run={(op, args) => run("local", op, args)} />
        </div>
      )}

      {data && (
        <>
          {data.loginLogMissing && <div style={{ fontSize: 12, color: "#fcd34d", marginBottom: 8 }}>ℹ️ ログイン履歴の表（third_login_log）がまだ無いため、日付は最後のログインと解いた日から推定しています（docs/supabase_third_setup.sql の⑥を実行すると正確になります）。</div>}

          {/* 1週間のまとめ */}
          <div style={{ fontSize: 12.5, fontWeight: 900, margin: "6px 0" }}>📅 直近1週間</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
            <Stat label="ログインした人" value={`${w.loginUsers}人`} sub={`全${data.students.length}人中`} />
            <Stat label="問題を解いた人" value={`${w.activeUsers}人`} />
            <Stat label="平均プレイ時間" value={w.playTimeAvailable ? `${w.avgPlayMin}分` : "—"} sub={w.playTimeAvailable ? "解いた人1人あたり（解答時間の推定）" : "SQL⑥の実行後に集計されます"} />
            <Stat label="平均回答数" value={`${w.avgAnswers}問`} sub="解いた人1人あたり" />
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "flex-end", height: 84, marginBottom: 4 }}>
            {w.days.map((d) => (
              <div key={d.date} style={{ flex: 1, textAlign: "center" }}>
                <div style={{ fontSize: 10.5, fontWeight: 800 }}>{d.logins}</div>
                <div style={{ height: Math.max(3, (d.logins / maxDay) * 52), background: "#6366f1", borderRadius: 4 }} />
                <div style={{ fontSize: 10, color: "rgba(255,255,255,.55)" }}>{md(d.date)}</div>
              </div>
            ))}
          </div>
          <div style={{ ...dim, marginBottom: 12 }}>棒＝その日ログインした人数</div>

          {/* 正答率が低い問題 */}
          <div style={{ fontSize: 12.5, fontWeight: 900, margin: "6px 0" }}>⚠️ 正答率が低い問題（10回以上答えられたもの）</div>
          {hard.length === 0 ? <div style={{ ...dim, marginBottom: 12 }}>まだありません（データがたまると出ます。問題の「型」ごとに集計）</div> : (
            <div style={{ marginBottom: 12 }}>
              {hard.map((p) => (
                <div key={p.id} style={{ borderTop: "1px solid rgba(255,255,255,.08)", padding: "6px 0" }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
                    <span style={{ fontWeight: 900, color: rateColor(p.rate * 100), minWidth: 44 }}>{Math.round(p.rate * 100)}%</span>
                    <span style={{ fontSize: 12.5, fontWeight: 800, flex: 1 }}>{unitName(p.u)} ・ {LEVEL_JA[p.l] || p.l}</span>
                    <span style={dim}>{p.c}/{p.t}回</span>
                  </div>
                  {p.sample && <div style={{ fontSize: 11.5, color: "rgba(255,255,255,.65)", marginTop: 2 }}>例：{p.sample}</div>}
                </div>
              ))}
            </div>
          )}

          {/* 学習ログ（サーバーに残っている日ごとの記録・ログイン・メダル・解答の中身） */}
          <AdminLogsPanel pass={pass} students={data.students} />

          {/* 生徒ごと */}
          <div style={{ fontSize: 12.5, fontWeight: 900, margin: "6px 0" }}>👥 生徒ごとの詳細（{data.students.length}人）</div>
          {data.students.map((s) => {
            const open = openId === s.id;
            const p = pct(s.correct, s.attempts);
            const unitRows = Object.entries(s.units || {}).map(([id, v]) => ({ id, ...v, rate: v.c / v.t })).sort((a, b) => a.rate - b.rate);
            return (
              <div key={s.id} style={{ borderTop: "1px solid rgba(255,255,255,.1)", padding: "8px 0" }}>
                <button data-sfx="none" onClick={() => setOpenId(open ? null : s.id)}
                  style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", color: "#fff", cursor: "pointer", fontFamily: "inherit", textAlign: "left", padding: 0 }}>
                  <span style={{ fontSize: 13.5, fontWeight: 900, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {s.name}{s.id === myId ? "（自分）" : ""} <span style={{ fontWeight: 700, fontSize: 11, color: "rgba(255,255,255,.45)" }}>ID:{s.loginId}</span>
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,.7)" }}>{s.attempts}問{p != null ? `・${p}%` : ""}</span>
                  <span style={{ fontSize: 10.5, color: "rgba(255,255,255,.45)" }}>{s.loginDays?.[0] ? `最終 ${md(s.loginDays[0])}` : "未ログイン"}</span>
                  <span style={{ fontSize: 10, color: "rgba(255,255,255,.5)" }}>{open ? "▲" : "▼"}</span>
                </button>
                {open && (
                  <div style={{ marginTop: 8, fontSize: 12.5 }}>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                      <Stat label="進み具合" value={`${s.medalHaichi + s.medalPractice}/${TOTAL_UNITS * 2}`} sub={`はいち${s.medalHaichi}・れんしゅう${s.medalPractice}（メダル）`} />
                      <Stat label="平均正答率" value={p != null ? `${p}%` : "—"} sub={`${s.correct}/${s.attempts}問`} />
                      <Stat label="回答数" value={`${s.answers7d}問`} sub={`1週間（累計${s.attempts}問）`} />
                      <Stat label="プレイ時間" value={fmtMin(s.playMs7d)} sub={`1週間（累計${fmtMin(s.playMsAll)}）`} />
                    </div>
                    <div style={{ marginBottom: 6 }}><b>パーティ：</b>{(s.party || []).filter(Boolean).map((id) => ROSTER[id]?.name || id).join("、") || "—"}
                      <span style={dim}>　所持{s.owned}体・💎{s.crystals}個</span></div>
                    <div style={{ marginBottom: 6 }}><b>ログインした日：</b>{(s.loginDays || []).length ? s.loginDays.map(md).join("、") : "—"}</div>
                    <div style={{ marginBottom: 6 }}>
                      <b>単元ごとの正答率（低い順）：</b>
                      {unitRows.length === 0 ? " —" : unitRows.slice(0, 8).map((u) => (
                        <div key={u.id} style={{ display: "flex", gap: 8 }}>
                          <span style={{ width: 42, fontWeight: 900, color: rateColor(u.rate * 100) }}>{Math.round(u.rate * 100)}%</span>
                          <span style={{ flex: 1 }}>{unitName(u.id)}</span><span style={dim}>{u.c}/{u.t}</span>
                        </div>
                      ))}
                    </div>
                    {s.weakUnits?.length > 0 && <div style={{ marginBottom: 6 }}><b>要フォロー：</b>{s.weakUnits.map((u) => `${unitName(u.unitId)}（${Math.round((u.c / u.t) * 100)}%）`).join("、")}</div>}
                    <GrantTools busy={busy} run={(op, args) => run(s.id, op, args)} />
                  </div>
                )}
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
