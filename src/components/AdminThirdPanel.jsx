// ============================================================
// AdminThirdPanel.jsx — 【管理者用】数学ラボ3の分析と、管理ツール（管理モード内）。
//  タブで分ける：
//   ・👥 生徒一覧：ログインの状態を色で表示（今日／1週間以内／1週間以上なし／未ログイン）。件数つきでしぼりこめる。
//     まだ一度もログインしていない生徒は、表の一番下にまとめて表示（開くと名前が並ぶ）。
//     生徒をタップすると詳細：進み具合・正答率・回答数・プレイ時間・単元ごとの正答率（棒）・ログインした日（4週間のカレンダー）・
//     パーティ・解答の中身（学習ログ）・管理ツール（クリスタル／全クリア／仲間の追加・調整）。
//   ・📊 クラスのようす：直近1週間のまとめ・日別のログイン・クラスで正答率が低い単元・正答率が低い問題（10回以上答えられたもの）
//   ・🗂 学習ログ：生徒 × 日付の表（AdminLogsPanel）
//   ・📮 ご意見箱：生徒から届いた意見（FeedbackBox。合言葉は上で入れたものを使う）
//   ・⚙️ 設定：解答画面の右上に「みんなの正答率」を出すスイッチ
//  プレイ時間は「解答にかけた時間」の合計（動画を見ている時間などは含まない・推定）。
//  2026-09-30：見にくいという声を受けて作り直し（表形式・文字を大きく・色分け・未ログインは下へ・タブ分け）。
//  見た目の確認は、開発サーバーで ?adminMock を付けると、ダミーの生徒データで表示できる（adminMock.js）。
// ============================================================
import { useEffect, useMemo, useState } from "react";
import { AUTH_ENABLED, supabase } from "../auth/supabase.js";
import { GRADES, findUnitById } from "../data/index.js";
import { SPECIALIST_ROSTER } from "../third/specialistRoster.js";
import { generatePractice } from "../third/problemSource.js";
import AdminLogsPanel, { StudentDetail } from "./AdminLogsPanel.jsx";
import FeedbackBox from "./FeedbackBox.jsx";
import { analyzeLearner, recommendToday, unitsFromAdmin, guessGrade, LEVEL_NAME } from "../third/recommend.js";
import { ADMIN_MOCK, adminAvailable, adminStats, adminGrant, PASS_KEY, saveProblemRates, isRateOverlayOn, setRateOverlay, ratesSavedAt } from "../third/adminApi.js";
import "./admin.css";

const ROSTER = Object.fromEntries(SPECIALIST_ROSTER.map((c) => [c.id, c]));
const TOTAL_UNITS = Object.values(GRADES).reduce((a, cs) => a + cs.reduce((b, c) => b + (c.units || []).length, 0), 0);
const LEVEL_JA = { easy: "簡単", standard: "普通", advanced: "難しい", oni: "鬼", normal: "普通", hard: "難しい" };
const DAY = 86400000;
const UI_KEY = "ml3_admin_ui";

const rateColor = (p) => (p >= 80 ? "var(--adm-good)" : p >= 60 ? "var(--adm-mid)" : "var(--adm-bad)");
const pct = (c, t) => (t > 0 ? Math.round((c / t) * 100) : null);
const fmtMin = (ms) => (ms > 0 ? `${Math.round((ms / 60000) * 10) / 10}分` : "—");
const md = (d) => { const [, m, dd] = String(d).split("-"); return `${Number(m)}/${Number(dd)}`; };
const JST = (t) => new Date(new Date(t).getTime() + 9 * 3600 * 1000).toISOString().slice(0, 10);
const unitName = (id) => findUnitById(id)?.name || id;
const loadUi = () => { try { return JSON.parse(localStorage.getItem(UI_KEY) || "{}") || {}; } catch { return {}; } };

// ---- 生徒一覧の道具
// 学校コード形式のID（E-101236＝学校E・コード10・1年2組36番）からクラスを読み取る。自由なIDは「その他」
export function classOf(loginId) {
  const m = /^([A-Z])-(\d{2})(\d)(\d)(\d{2})$/.exec(String(loginId || ""));
  return m ? { key: `${m[1]}-${m[2]}:${m[3]}-${m[4]}`, label: `${m[3]}年${m[4]}組（${m[1]}-${m[2]}）`, short: `${m[3]}年${m[4]}組${Number(m[5])}番`, no: Number(m[5]) } : { key: "other", label: "その他のID", short: "", no: 0 };
}
// ログインの状態：最後にログインした日（日本時間）から何日たったか
const STATUS = {
  today: { label: "今日ログイン", color: "var(--adm-today)" },
  week: { label: "1週間以内", color: "var(--adm-week)" },
  away: { label: "1週間以上ログインなし", color: "var(--adm-away)" },
  never: { label: "まだ一度もログインしていない", color: "var(--adm-never)" },
};
function daysSince(day, today) { return day ? Math.round((Date.parse(today) - Date.parse(day)) / DAY) : null; }
function statusOf(s, today) { const d = daysSince(s.loginDays?.[0], today); return d == null ? "never" : d <= 0 ? "today" : d < 7 ? "week" : "away"; }
const lastLabel = (d) => (d == null ? "未ログイン" : d <= 0 ? "今日" : d === 1 ? "昨日" : `${d}日前`);
// 要フォロー＝5問以上答えて正答率60%未満の単元（サーバーが出す「低い順の上位3つ」から）
const followUnits = (s) => (s.weakUnits || []).filter((u) => u.t >= 5 && u.c / u.t < 0.6);
const byId = (a, b) => String(a.loginId || "").localeCompare(String(b.loginId || ""), "ja", { numeric: true });
const SORTS = {
  number: { label: "出席番号（ID）順", cmp: byId },
  recent: { label: "最後にログインした順", cmp: (a, b) => String(b.loginDays?.[0] || "").localeCompare(String(a.loginDays?.[0] || "")) || byId(a, b) },
  answers7d: { label: "この1週間の回答数が多い順", cmp: (a, b) => (b.answers7d || 0) - (a.answers7d || 0) || byId(a, b) },
  rateLow: { label: "正答率が低い順", cmp: (a, b) => ((a.attempts ? a.correct / a.attempts : 2) - (b.attempts ? b.correct / b.attempts : 2)) || byId(a, b) },
  follow: { label: "要フォローの単元が多い順", cmp: (a, b) => followUnits(b).length - followUnits(a).length || ((a.attempts ? a.correct / a.attempts : 2) - (b.attempts ? b.correct / b.attempts : 2)) },
  name: { label: "名前順", cmp: (a, b) => String(a.name || "").localeCompare(String(b.name || ""), "ja") },
};
const FILTERS = [
  ["all", "全員", null, () => true],
  ["today", "今日ログイン", STATUS.today.color, (s, st) => st === "today"],
  ["week", "1週間以内", STATUS.week.color, (s, st) => st === "week"],
  ["away", "1週間以上なし", STATUS.away.color, (s, st) => st === "away"],
  ["never", "未ログイン", STATUS.never.color, (s, st) => st === "never"],
  ["follow", "要フォローあり", "var(--adm-bad)", (s) => followUnits(s).length > 0],
  ["lowRate", "正答率60%未満", "var(--adm-mid)", (s) => s.attempts >= 20 && s.correct / s.attempts < 0.6],
];

const FILTER_HELP = {
  all: "登録されている生徒全員（未ログインの生徒は表の一番下にまとめて表示）",
  today: "今日（日本時間）ログインした生徒",
  week: "最後のログインが1〜6日前の生徒",
  away: "最後のログインから7日以上たっている生徒",
  never: "まだ一度もログインしていない生徒",
  follow: "5問以上答えて正答率が60%未満の単元がある生徒",
  lowRate: "20問以上答えて、全体の正答率が60%未満の生徒",
};

function csvOf(rows) {
  const esc = (v) => { const t = v == null ? "" : String(v); return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t; };
  return "﻿" + rows.map((r) => r.map(esc).join(",")).join("\r\n"); // BOM付き＝Excelで文字化けしない
}
function downloadCsv(name, text) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a"); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function Card({ k, v, s, color }) {
  return (
    <div className="adm-card">
      <div className="k">{k}</div>
      <div className="v" style={color ? { color } : undefined}>{v}</div>
      {s && <div className="s">{s}</div>}
    </div>
  );
}
const Bar = ({ p, color }) => <span className="adm-bar"><i style={{ width: `${Math.max(0, Math.min(100, p))}%`, background: color }} /></span>;

// ---- 管理ツール（チケット・全クリア・仲間）。run(op,args) を呼ぶだけ。
function GrantTools({ run, busy }) {
  const [n, setN] = useState("10");
  const [exp, setExp] = useState("5000");
  const [brk, setBrk] = useState("2");
  const [ask, setAsk] = useState(null); // 確認待ちの操作 { op, args, label }
  const go = (op, args, label, confirm = false) => (confirm ? setAsk({ op, args, label }) : run(op, args));
  const b = "adm-btn is-small";
  return (
    <div className="adm-grant">
      <div className="row"><span className="lb">🛠️ この生徒のゲーム状態を直接変えます</span></div>
      <div className="row">
        <span className="lb">💎 クリスタル</span>
        <input inputMode="numeric" value={n} onChange={(e) => setN(e.target.value)} aria-label="クリスタルの数" />
        <button className={b} disabled={busy} onClick={() => go("addCrystals", { n: Number(n) })}>＋追加</button>
        <button className={b} disabled={busy} onClick={() => go("setCrystals", { n: Number(n) })}>この数にする</button>
      </div>
      <div className="row">
        <button className={b} disabled={busy} onClick={() => go("clearAllMedals", {}, "全小単元のメダル（はいち・れんしゅう・バトル）を全部そろえて、バトルを全解放します", true)}>🏅 全クリア（メダル全部）</button>
        <span className="lb">👑 章ボス全部クリア</span>
        {[["all", "全学年"], [1, "中1"], [2, "中2"], [3, "中3"]].map(([g, label]) => <button key={g} className={b} disabled={busy} onClick={() => go("clearAllBosses", { grade: g }, `${label}の章ボスを全部クリアしたことにして、学年クリアにします（クリスタルは付きません。裏ボスが出てきます）`, true)}>{label}</button>)}
      </div>
      <div className="row">
        <span className="lb">🐾 仲間を追加</span>
        <button className={b} disabled={busy} onClick={() => go("grantCompanions", { mode: "all" })}>全員</button>
        {["UR", "SR", "R", "N"].map((r) => <button key={r} className={b} disabled={busy} onClick={() => go("grantCompanions", { mode: "rarity", rarity: r })}>{r}</button>)}
      </div>
      <div className="row">
        <span className="lb">💪 全員の強さ</span>
        <small>経験値</small><input inputMode="numeric" value={exp} onChange={(e) => setExp(e.target.value)} aria-label="経験値" />
        <small>凸(0〜4)</small><input style={{ width: 60 }} inputMode="numeric" value={brk} onChange={(e) => setBrk(e.target.value)} aria-label="凸" />
        <button className={b} disabled={busy} onClick={() => go("setCompanionGrowth", { exp: Number(exp), breaks: Number(brk) })}>そろえる</button>
      </div>
      <div className="row" style={{ marginBottom: 0 }}>
        <button className={b} disabled={busy} onClick={() => go("resetCompanions", {}, "仲間を最初の5体に戻します", true)}>仲間を最初の5体に戻す</button>
        <button className={`${b} is-danger`} disabled={busy} onClick={() => go("resetAll", {}, "この生徒のゲーム状態（仲間・チケット・メダル）を最初に戻します。元に戻せません", true)}>状態を全部リセット</button>
      </div>
      {ask && (
        <div className="adm-note is-err">
          <div style={{ marginBottom: 8 }}>{ask.label}。よろしいですか？</div>
          <div className="adm-actions">
            <button className="adm-btn is-danger" onClick={() => { const a = ask; setAsk(null); run(a.op, a.args); }}>はい</button>
            <button className="adm-btn" onClick={() => setAsk(null)}>やめる</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---- 生徒1人の行（表の1行）
function StudentRow({ s, today, open, self, onToggle }) {
  const st = statusOf(s, today);
  const d = daysSince(s.loginDays?.[0], today);
  const p = pct(s.correct, s.attempts);
  const medals = (s.medalHaichi || 0) + (s.medalPractice || 0);
  const follow = followUnits(s);
  const cl = classOf(s.loginId);
  return (
    <button data-sfx="none" className={`adm-row${open ? " is-open" : ""}${st === "never" ? " is-quiet" : ""}`} onClick={onToggle} aria-expanded={open}>
      <span className="adm-dot" style={{ background: STATUS[st].color }} title={STATUS[st].label} />
      <span className="adm-name">
        <b>{s.name}{self && <em>自分</em>}</b>
        <small>{cl.short ? `${cl.short}・` : ""}ID {s.loginId || "—"}</small>
      </span>
      <span className="adm-last" style={{ color: STATUS[st].color }}>{lastLabel(d)}</span>
      <span className="adm-num"><i className="adm-lbl">今週の回答</i><b>{s.answers7d || 0}<small> 問</small></b><small>{fmtMin(s.playMs7d)}</small></span>
      <span className="adm-rate">
        <i className="adm-lbl">正答率（累計）</i>
        {p == null ? <b style={{ color: "var(--adm-dim)" }}>—</b> : <><b style={{ color: rateColor(p) }}>{p}%</b><Bar p={p} color={rateColor(p)} /></>}
        <small>{s.attempts ? `${s.correct}/${s.attempts}問` : "まだ解いていない"}</small>
      </span>
      <span className="adm-prog"><i className="adm-lbl">メダル</i><b>{medals}<small> / {TOTAL_UNITS * 2}</small></b><Bar p={(medals / (TOTAL_UNITS * 2)) * 100} color="#a78bfa" /></span>
      <span className="adm-weak">
        {follow.slice(0, 2).map((u) => <span key={u.unitId} className="adm-tag" title={`${unitName(u.unitId)}：${u.c}/${u.t}問`}>{unitName(u.unitId)} {pct(u.c, u.t)}%</span>)}
        {follow.length > 2 && <span className="adm-tag">+{follow.length - 2}</span>}
      </span>
      <span className="adm-caret">{open ? "▲" : "▼"}</span>
    </button>
  );
}

// ---- 生徒をひらいたときの詳細
// おすすめのカードの「すること」
const actionJa = (c) => (c.action === "haichi" ? "動画・確認問題で学ぶ" : c.action === "relearn" ? "まちがいノートをなおす" : `${LEVEL_NAME[c.level] || "普通"}を5問`);

function StudentDetailPanel({ s, today, pass, busy, run, server }) {
  const [showLog, setShowLog] = useState(false);
  const [showTools, setShowTools] = useState(false);
  const [allUnits, setAllUnits] = useState(false);
  const p = pct(s.correct, s.attempts);
  // 生徒の画面と同じエンジンで、理解度（難しさ・新しさを考えた推定）と「今日のおすすめ」を出す（サーバーの記録だけで計算）
  const { A, cards } = useMemo(() => {
    const units = unitsFromAdmin(s.units);
    const A = analyzeLearner({ units, tags: s.tags || {}, medalState: { medals: s.medals || {} }, grade: guessGrade(units) });
    return { A, cards: recommendToday(A) };
  }, [s]);
  const unitRows = Object.entries(s.units || {}).map(([id, v]) => ({ id, ...v, rate: v.t ? v.c / v.t : 0, x: A.insights[id] }))
    .sort((a, b) => (a.x?.understanding ?? a.rate) - (b.x?.understanding ?? b.rate) || b.t - a.t);
  const login = new Set(s.loginDays || []);
  const cal = Array.from({ length: 28 }, (_, i) => JST(Date.parse(today) - (27 - i) * DAY));
  const medals = (s.medalHaichi || 0) + (s.medalPractice || 0);
  return (
    <div className="adm-detail">
      <div className="adm-cards">
        <Card k="平均正答率" v={p != null ? `${p}%` : "—"} s={`${s.correct}/${s.attempts}問（累計）`} color={p != null ? rateColor(p) : undefined} />
        <Card k="この1週間の回答数" v={`${s.answers7d || 0}問`} s={`累計 ${s.attempts}問`} />
        <Card k="この1週間のプレイ時間" v={fmtMin(s.playMs7d)} s={`累計 ${fmtMin(s.playMsAll)}（解答時間の推定）`} />
        <Card k="進み具合（メダル）" v={`${medals} / ${TOTAL_UNITS * 2}`} s={`はいち ${s.medalHaichi}・れんしゅう ${s.medalPractice}`} />
      </div>

      <div className="adm-sec">
        <div className="t">🧭 ラボのおすすめ <small>この生徒のメニューに出ている「今日のおすすめ」（中{A.grade}・サーバーの記録から）</small></div>
        {cards.length === 0 ? <div className="adm-muted">—</div> : (
          <div className="adm-recs">
            {cards.map((c) => (
              <div key={`${c.slot}-${c.unitId}`} className={`adm-rec adm-rec--${c.slot}`}>
                <b>{c.icon} {c.title}</b>
                <span className="u">{unitName(c.unitId)}{c.grade !== A.grade ? `（中${c.grade}）` : ""}　<em>{actionJa(c)}</em></span>
                <span className="why">{c.reason}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="adm-sec">
        <div className="t">📚 単元ごとの理解度（低い順） <small>理解度＝難しさと新しさを考えた推定（「普通」の問題の予想正答率）。右は実際の正解数</small></div>
        {unitRows.length === 0 ? <div className="adm-muted">まだ問題を解いていません。</div> : (
          <>
            {(allUnits ? unitRows : unitRows.slice(0, 8)).map((u) => {
              const up = Math.round((u.x?.understanding ?? u.rate) * 100);
              const few = u.x ? u.x.provisional : u.t < 5;
              const lvText = u.x ? ["easy", "standard", "advanced", "oni"].filter((lv) => u.x.acc[lv]).map((lv) => `${LEVEL_NAME[lv]}${u.x.acc[lv][1]}/${u.x.acc[lv][0]}`).join(" ") : `${u.c}/${u.t}`;
              return (
                <div key={u.id} className="adm-unit" style={few ? { opacity: 0.6 } : undefined} title={few ? "まだ問題が少ないので、参考程度" : lvText}>
                  <span className="n" title={unitName(u.id)}>{unitName(u.id)}{few ? "（少）" : ""}{u.x?.tags?.[0]?.n >= 2 ? ` 🏷️${u.x.tags[0].label}×${u.x.tags[0].n}` : ""}</span>
                  <Bar p={up} color={u.x?.band?.color || rateColor(up)} />
                  <span className="r" style={{ color: u.x?.band?.color || rateColor(up) }}>{up}% <small>{lvText}</small></span>
                </div>
              );
            })}
            {unitRows.length > 8 && <button className="adm-btn is-small" style={{ marginTop: 6 }} onClick={() => setAllUnits(!allUnits)}>{allUnits ? "少なく表示" : `全部見る（${unitRows.length}単元）`}</button>}
          </>
        )}
      </div>

      <div className="adm-sec">
        <div className="t">📅 ログインした日（直近4週間・緑＝ログインした日）</div>
        <div className="adm-cal">
          {cal.map((d) => <span key={d} className={`${login.has(d) ? "on" : ""}${d === today ? " today" : ""}`} title={md(d)}>{Number(d.slice(8))}</span>)}
        </div>
      </div>

      <div className="adm-sec">
        <div className="t">🐾 パーティ <small>所持 {s.owned}体・💎 {s.crystals}個</small></div>
        <div className="adm-party">{(s.party || []).filter(Boolean).length ? s.party.filter(Boolean).map((id, i) => <span key={`${id}-${i}`}>{ROSTER[id]?.name || id}</span>) : <span>—</span>}</div>
      </div>

      <div className="adm-actions">
        {server && <button className="adm-btn" onClick={() => setShowLog(!showLog)}>{showLog ? "📝 解答の中身を閉じる" : "📝 解答の中身・日ごとの記録を見る"}</button>}
        <button className="adm-btn" onClick={() => setShowTools(!showTools)}>{showTools ? "🛠️ 管理ツールを閉じる" : "🛠️ 管理ツール（クリスタル・仲間など）"}</button>
      </div>
      {showLog && <StudentDetail pass={pass} student={s} onClose={() => setShowLog(false)} />}
      {showTools && <div style={{ marginTop: 10 }}><GrantTools busy={busy} run={run} /></div>}
    </div>
  );
}

// ---- 👥 生徒一覧
function StudentsTab({ students, today, myId, pass, busy, run, server, ui, setUi }) {
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState(null);
  const [neverOpen, setNeverOpen] = useState(false);
  const filter = FILTERS.some(([k]) => k === ui.filter) ? ui.filter : "all";
  const sortKey = SORTS[ui.sort] ? ui.sort : "number";

  const needle = q.trim().toLowerCase();
  const base = useMemo(() => students.filter((st) => !needle || String(st.name || "").toLowerCase().includes(needle) || String(st.loginId || "").toLowerCase().includes(needle)), [students, needle]);
  const withSt = useMemo(() => base.map((s) => ({ s, st: statusOf(s, today) })), [base, today]);
  const count = (k) => withSt.filter(({ s, st }) => FILTERS.find((f) => f[0] === k)[3](s, st)).length;
  const pred = FILTERS.find((f) => f[0] === filter)[3];
  // 「全員」のときは、未ログインの生徒を表から外して一番下にまとめる
  const main = withSt.filter(({ s, st }) => pred(s, st) && (filter === "never" || st !== "never")).map((x) => x.s).sort(filter === "never" ? byId : SORTS[sortKey].cmp);
  const never = filter === "all" ? withSt.filter((x) => x.st === "never").map((x) => x.s).sort(byId) : [];
  // 出席番号順のときは、クラスの切れ目に見出しを入れる
  const groupByClass = sortKey === "number" && new Set(main.map((s) => classOf(s.loginId).key)).size > 1;

  function exportCsv() {
    const head = ["クラス", "出席番号", "ID", "名前", "状態", "最後にログインした日", "累計の回答数", "累計の正答率(%)", "この1週間の回答数", "この1週間のプレイ時間(分)", "累計のプレイ時間(分)", "はいちメダル", "れんしゅうメダル", "ログインした日数(記録)", "仲間の数", "クリスタル", "要フォローの単元(60%未満)"];
    const rows = [...main, ...never].map((st) => [
      classOf(st.loginId).label, classOf(st.loginId).no || "", st.loginId, st.name, STATUS[statusOf(st, today)].label, st.loginDays?.[0] || "", st.attempts, st.attempts ? Math.round((st.correct / st.attempts) * 100) : "",
      st.answers7d, Math.round((st.playMs7d || 0) / 6000) / 10, Math.round((st.playMsAll || 0) / 6000) / 10, st.medalHaichi, st.medalPractice,
      (st.loginDays || []).length, st.owned, st.crystals, followUnits(st).map((u) => `${unitName(u.unitId)}(${pct(u.c, u.t)}%)`).join(" / "),
    ]);
    downloadCsv(`数学ラボ3_生徒一覧_${today}.csv`, csvOf([head, ...rows]));
  }

  let lastCls = null;
  return (
    <>
      <div className="adm-chips" role="group" aria-label="状態でしぼりこむ">
        {FILTERS.map(([k, label, color]) => (
          <button key={k} data-sfx="none" className="adm-chip" aria-pressed={filter === k} onClick={() => setUi({ filter: k })} title={FILTER_HELP[k]}>
            {color && <span className="adm-dot" style={{ background: color }} />}{label} <b>{count(k)}</b>
          </button>
        ))}
      </div>
      <div className="adm-tools">
        <input value={q} placeholder="🔍 名前・IDで探す" onChange={(e) => setQ(e.target.value)} aria-label="名前・IDで探す" />
        <select value={sortKey} onChange={(e) => setUi({ sort: e.target.value })} aria-label="並び替え" disabled={filter === "never"}>
          {Object.entries(SORTS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <button className="adm-btn is-small" onClick={exportCsv} disabled={!main.length && !never.length}>⬇ CSVで保存（{main.length + never.length}人）</button>
      </div>

      <div className="adm-table">
        <div className="adm-thead" aria-hidden="true">
          <span /><span>名前・クラス</span><span>最後のログイン</span><span>今週の回答</span><span>正答率（累計）</span><span>メダル</span><span>要フォローの単元（60%未満）</span><span />
        </div>
        {main.length === 0 && <div className="adm-empty">{filter === "never" ? "未ログインの生徒はいません 🎉" : "条件にあう生徒はいません"}</div>}
        {main.map((s) => {
          const c = classOf(s.loginId);
          const head = groupByClass && c.key !== lastCls ? <div className="adm-group">{c.key === "other" ? "その他のID" : c.label}</div> : null;
          lastCls = c.key;
          const open = openId === s.id;
          return (
            <div key={s.id}>
              {head}
              <StudentRow s={s} today={today} open={open} self={s.id === myId} onToggle={() => setOpenId(open ? null : s.id)} />
              {open && <StudentDetailPanel s={s} today={today} pass={pass} busy={busy} server={server} run={(op, args) => run(s.id, op, args)} />}
            </div>
          );
        })}
      </div>

      {never.length > 0 && (
        <div className="adm-never">
          <button data-sfx="none" onClick={() => setNeverOpen(!neverOpen)} aria-expanded={neverOpen}>
            <span className="adm-dot" style={{ background: STATUS.never.color }} />
            <span style={{ flex: 1 }}>まだ一度もログインしていない生徒 <b>{never.length}人</b></span>
            <small>{neverOpen ? "閉じる ▲" : "名前を見る ▼"}</small>
          </button>
          {neverOpen && (
            <div className="adm-never-grid">
              {never.map((s) => <div key={s.id}><b>{s.name}</b><small>{classOf(s.loginId).short || "その他"}・ID {s.loginId || "—"}</small></div>)}
            </div>
          )}
        </div>
      )}
    </>
  );
}

// ---- 📊 クラスのようす（選んだクラスで集計しなおす。問題ごとの正答率だけは全体）
function ClassTab({ students, today, hard, clsLabel }) {
  const days7 = Array.from({ length: 7 }, (_, i) => JST(Date.parse(today) - (6 - i) * DAY));
  const has = (s, d) => (s.loginDays || []).includes(d);
  const login7 = students.filter((s) => days7.some((d) => has(s, d))).length;
  const active = students.filter((s) => s.answers7d > 0);
  const never = students.filter((s) => !(s.loginDays || []).length).length;
  const avgMin = active.length ? Math.round((active.reduce((a, s) => a + (s.playMs7d || 0), 0) / active.length / 60000) * 10) / 10 : 0;
  const avgAns = active.length ? Math.round((active.reduce((a, s) => a + (s.answers7d || 0), 0) / active.length) * 10) / 10 : 0;
  const perDay = days7.map((d) => ({ d, n: students.filter((s) => has(s, d)).length }));
  const maxDay = Math.max(1, ...perDay.map((x) => x.n));
  // 単元ごとのクラス正答率（5問以上解いた生徒の数と、そのうち60%未満の生徒の数も）
  const units = useMemo(() => {
    const m = {};
    for (const s of students) for (const [id, v] of Object.entries(s.units || {})) {
      const u = (m[id] ||= { id, t: 0, c: 0, n: 0, low: 0 });
      u.t += v.t; u.c += v.c;
      if (v.t >= 5) { u.n += 1; if (v.c / v.t < 0.6) u.low += 1; }
    }
    return Object.values(m).filter((u) => u.t >= 10).sort((a, b) => a.c / a.t - b.c / b.t).slice(0, 12);
  }, [students]);
  return (
    <>
      <div className="adm-panel">
        <div className="adm-h">📅 直近1週間 <small>{clsLabel}</small></div>
        <div className="adm-kpis">
          <Card k="ログインした人" v={`${login7}人`} s={`${students.length}人中`} />
          <Card k="問題を解いた人" v={`${active.length}人`} s={`${students.length}人中`} />
          <Card k="平均プレイ時間" v={`${avgMin}分`} s="解いた人1人あたり（解答時間の推定）" />
          <Card k="平均回答数" v={`${avgAns}問`} s="解いた人1人あたり" />
          <Card k="まだ一度もログインしていない" v={`${never}人`} color={never ? "var(--adm-away)" : undefined} />
        </div>
        <div className="adm-chart" aria-label="日ごとのログイン人数">
          {perDay.map(({ d, n }) => (
            <div key={d}>
              <span>{n}</span>
              <span className="bar" style={{ height: Math.max(4, (n / maxDay) * 84) }} />
              <span className="d">{md(d)}{d === today ? "（今日）" : ""}</span>
            </div>
          ))}
        </div>
        <div className="adm-muted" style={{ marginTop: 6 }}>棒＝その日にログインした人数</div>
      </div>

      <div className="adm-panel">
        <div className="adm-h">📚 クラスで正答率が低い単元 <small>{clsLabel}・10問以上答えられた単元</small></div>
        {units.length === 0 ? <div className="adm-muted">まだデータがありません。</div> : (
          <div className="adm-list">
            {units.map((u) => {
              const p = pct(u.c, u.t);
              return (
                <div key={u.id}>
                  <span className="p" style={{ color: rateColor(p) }}>{p}%</span>
                  <b>{unitName(u.id)}</b>
                  <small>{u.c}/{u.t}問</small>
                  <span className="ex">5問以上解いた {u.n}人のうち、60%未満が <b style={{ color: u.low ? "#fecaca" : undefined }}>{u.low}人</b></span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="adm-panel">
        <div className="adm-h">⚠️ 正答率が低い問題 <small>学年全体・10回以上答えられた「型」</small></div>
        {hard.length === 0 ? <div className="adm-muted">まだありません（データがたまると出ます。問題の「型」ごとに集計）</div> : (
          <div className="adm-list">
            {hard.map((p) => (
              <div key={p.id}>
                <span className="p" style={{ color: rateColor(p.rate * 100) }}>{Math.round(p.rate * 100)}%</span>
                <b>{unitName(p.u)}・{LEVEL_JA[p.l] || p.l}</b>
                <small>{p.c}/{p.t}回</small>
                {p.sample && <span className="ex">例：{p.sample}</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

export default function AdminThirdPanel() {
  const server = adminAvailable();
  const [pass, setPass] = useState(() => { try { return localStorage.getItem(PASS_KEY) || ""; } catch { return ""; } });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [data, setData] = useState(null);
  const [loadedAt, setLoadedAt] = useState(null);
  const [overlay, setOverlay] = useState(isRateOverlayOn());
  const [myId, setMyId] = useState(null);
  const [ui, setUiState] = useState(loadUi); // { tab, cls, filter, sort }（この端末に覚えておく）
  const setUi = (patch) => setUiState((u) => { const n = { ...u, ...patch }; try { localStorage.setItem(UI_KEY, JSON.stringify(n)); } catch { /* noop */ } return n; });
  const tab = ["students", "class", "logs", "feedback", "settings"].includes(ui.tab) ? ui.tab : "students";
  const today = JST(Date.now());

  useEffect(() => {
    if (!AUTH_ENABLED) return;
    supabase.auth.getUser().then(({ data: d }) => setMyId(d?.user?.id || null)).catch(() => {});
  }, []);
  // 合言葉が保存されていれば、開いたときに自動で読み込む（ダミーデータのときも）
  useEffect(() => { if (server && (ADMIN_MOCK || pass.trim())) load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function load() {
    if ((!pass.trim() && !ADMIN_MOCK) || busy) return;
    setBusy(true); setErr("");
    try { if (pass.trim()) localStorage.setItem(PASS_KEY, pass); } catch { /* noop */ }
    const res = await adminStats(pass);
    if (!res.ok) { setErr(res.error === "unauthorized" ? "合言葉がちがいます" : `取得できませんでした（${res.error}）`); setData(null); }
    else { setData(res); setLoadedAt(Date.now()); saveProblemRates(res.problems || {}); }
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
        try { if (p.seed != null) sample = String(generatePractice(p.u, p.l, p.seed)?.q || "").replace(/\s+/g, " ").slice(0, 80); } catch { /* noop */ }
        return { ...p, sample };
      });
  }, [data]);

  // クラス（全タブ共通のしぼりこみ）
  const classes = useMemo(() => {
    const m = new Map();
    for (const st of data?.students || []) { const c = classOf(st.loginId); if (!m.has(c.key)) m.set(c.key, { ...c, n: 0 }); m.get(c.key).n++; }
    return [...m.values()].sort((a, b) => (a.key === "other") - (b.key === "other") || a.key.localeCompare(b.key));
  }, [data]);
  const cls = ui.cls && classes.some((c) => c.key === ui.cls) ? ui.cls : "all";
  const clsStudents = useMemo(() => (data?.students || []).filter((st) => cls === "all" || classOf(st.loginId).key === cls), [data, cls]);
  const clsLabel = cls === "all" ? "すべてのクラス" : classes.find((c) => c.key === cls)?.label || "";
  const neverN = clsStudents.filter((s) => !(s.loginDays || []).length).length;

  const TABS = [["students", "👥 生徒一覧"], ["class", "📊 クラスのようす"], ["logs", "🗂 学習ログ"], ["feedback", "📮 ご意見箱"], ["settings", "⚙️ 設定"]];

  return (
    <div className="adm">
      <div className="glass">
        <div className="adm-connect">
          <div className="adm-title">📊 数学ラボ3　クラスのようす</div>
          {server && !ADMIN_MOCK && (
            <input type="password" value={pass} placeholder="先生の合言葉" onChange={(e) => setPass(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") load(); }} aria-label="先生の合言葉" />
          )}
          {server && <button data-sfx="none" className="adm-btn is-primary" disabled={busy || (!pass.trim() && !ADMIN_MOCK)} onClick={load}>{busy ? "読み込み中…" : data ? "🔄 更新" : "読み込み"}</button>}
          {data && classes.length > 1 && (
            <select value={cls} onChange={(e) => setUi({ cls: e.target.value })} aria-label="クラス" style={{ fontSize: 14.5, fontWeight: 800, padding: "9px 11px", borderRadius: 12, fontFamily: "inherit" }}>
              <option value="all">すべてのクラス（{data.students.length}人）</option>
              {classes.map((c) => <option key={c.key} value={c.key}>{c.label}（{c.n}人）</option>)}
            </select>
          )}
        </div>
        {data && <div className="adm-muted" style={{ marginTop: 8 }}>{clsLabel}・{clsStudents.length}人（うち未ログイン {neverN}人）{loadedAt ? `・${new Date(loadedAt).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })} 時点` : ""}{ADMIN_MOCK ? "・⚠️ダミーデータ（開発用）" : ""}</div>}
        {!data && server && !busy && !err && <div className="adm-muted" style={{ marginTop: 8 }}>先生の合言葉を入れて「読み込み」を押すと、生徒の一覧が出ます。</div>}
        {!server && <div className="adm-note is-info">サーバー未接続（開発モード）：分析は出ません。下の管理ツールは、この端末のテスト用データだけを変えます。</div>}
        {err && <div className="adm-note is-err">⚠️ {err}</div>}
        {msg && <div className="adm-note is-ok">✅ {msg}</div>}
        {data?.loginLogMissing && <div className="adm-note is-info">ℹ️ ログイン履歴の表（third_login_log）がまだ無いため、日付は最後のログインと解いた日から推定しています（docs/supabase_third_setup.sql の⑥を実行すると正確になります）。</div>}
      </div>

      {!server && <GrantTools busy={busy} run={(op, args) => run("local", op, args)} />}

      {data && (
        <>
          <div className="adm-tabs" role="tablist">
            {TABS.map(([k, label]) => (
              <button key={k} data-sfx="none" role="tab" className="adm-tab" aria-selected={tab === k} onClick={() => setUi({ tab: k })}>{label}</button>
            ))}
          </div>

          {tab === "students" && <StudentsTab students={clsStudents} today={today} myId={myId} pass={pass} busy={busy} run={run} server={server} ui={ui} setUi={setUi} />}
          {tab === "class" && <ClassTab students={clsStudents} today={today} hard={hard} clsLabel={clsLabel} />}
          {tab === "logs" && <AdminLogsPanel pass={pass} students={clsStudents} />}
          {tab === "feedback" && <FeedbackBox pass={pass} />}
          {tab === "settings" && (
            <div className="adm-panel">
              <div className="adm-h">⚙️ 設定</div>
              <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 15, fontWeight: 800, cursor: "pointer" }}>
                <input type="checkbox" checked={overlay} onChange={toggleOverlay} style={{ width: 20, height: 20 }} />
                解答画面の右上に「みんなの正答率」を表示する
              </label>
              <div className="adm-muted" style={{ marginTop: 6 }}>{ratesSavedAt() ? `集計：${new Date(ratesSavedAt()).toLocaleString("ja-JP", { month: "numeric", day: "numeric", hour: "numeric", minute: "numeric" })}時点（「更新」を押すと新しくなります）` : "先に読み込みが必要です"}</div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
