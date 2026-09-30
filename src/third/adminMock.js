// ============================================================
// adminMock.js — 【開発用】管理画面の見た目を確かめるための「ダミーの生徒データ」。
//  開発サーバーで URL に ?adminMock を付けたときだけ使う（本番のビルドでは読み込まれない）。
//  本物の生徒データは使わない。名前・IDはすべて架空。乱数は固定（毎回同じ内容）。
// ============================================================
import { GRADES } from "../data/index.js";
import { SPECIALIST_ROSTER } from "./specialistRoster.js";

const DAY = 86400000;
const JST = (t) => new Date(new Date(t).getTime() + 9 * 3600 * 1000).toISOString().slice(0, 10);
function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

const SEI = ["佐藤", "鈴木", "高橋", "田中", "伊藤", "渡辺", "山本", "中村", "小林", "加藤", "吉田", "山田", "佐々木", "松本", "井上", "木村"];
const MEI = ["陽翔", "蓮", "結衣", "葵", "湊", "陽菜", "大和", "凛", "悠真", "美咲", "颯太", "芽依", "樹", "さくら", "陸", "心春"];
const UNITS = GRADES[1].flatMap((c) => c.units || []).map((u) => u.id);

let cache = null;
function build() {
  const r = rng(20260930);
  const now = Date.now();
  const days7 = Array.from({ length: 7 }, (_, i) => JST(now - (6 - i) * DAY));
  const students = [];
  const classes = [[2, 34], [3, 33]];
  let k = 0;
  for (const [kumi, n] of classes) {
    for (let no = 1; no <= n; no++, k++) {
      const x = r();
      // 状態の割合：今日 25%・1週間以内 35%・1週間以上 15%・未ログイン 25%
      const kind = x < 0.25 ? "today" : x < 0.6 ? "week" : x < 0.75 ? "away" : "never";
      const last = kind === "today" ? 0 : kind === "week" ? 1 + Math.floor(r() * 6) : kind === "away" ? 7 + Math.floor(r() * 20) : null;
      const loginDays = [];
      if (last != null) {
        loginDays.push(JST(now - last * DAY));
        for (let d = last + 1; d < last + 28; d++) if (r() < 0.35) loginDays.push(JST(now - d * DAY));
      }
      const skill = 0.35 + r() * 0.6; // この子の正答率のめやす
      const units = {};
      let t = 0, c = 0;
      if (last != null) {
        const nu = 2 + Math.floor(r() * 9);
        for (let i = 0; i < nu; i++) {
          const id = UNITS[Math.min(UNITS.length - 1, Math.floor(r() * 14))];
          const ut = 3 + Math.floor(r() * 40);
          const rate = Math.max(0.05, Math.min(1, skill + (r() - 0.5) * 0.5));
          const uc = Math.round(ut * rate);
          const u = (units[id] ||= { t: 0, c: 0 });
          u.t += ut; u.c += uc; t += ut; c += uc;
        }
      }
      // 難易度ごとの内訳・直近の並び・最後の日（本物の admin_stats と同じ形）
      for (const u of Object.values(units)) {
        const rate = u.c / u.t, split = { easy: Math.round(u.t * 0.35), advanced: Math.round(u.t * 0.2) };
        split.standard = u.t - split.easy - split.advanced;
        const rt = { easy: Math.min(1, rate + 0.15), standard: rate, advanced: Math.max(0, rate - 0.2) };
        u.lv = Object.fromEntries(Object.entries(split).filter(([, n]) => n > 0).map(([lv, n]) => [lv, [n, Math.round(n * rt[lv])]]));
        u.seq = Array.from({ length: Math.min(30, u.t) }, () => { const lv = r() < 0.35 ? "easy" : r() < 0.7 ? "standard" : "advanced"; const ch = lv[0]; return r() < rt[lv] ? ch.toUpperCase() : ch; }).join("");
        u.last = loginDays[Math.floor(r() * Math.min(3, loginDays.length))] || null;
        u.n = u.t;
      }
      const weakUnits = Object.entries(units).filter(([, v]) => v.t >= 5).map(([unitId, v]) => ({ unitId, t: v.t, c: v.c }))
        .sort((a, b) => a.c / a.t - b.c / b.t).slice(0, 3);
      const a7 = last != null && last < 7 ? Math.floor(r() * 90) : 0;
      const owned = last == null ? 0 : 5 + Math.floor(r() * 30);
      students.push({
        id: `mock-${k}`, name: `${SEI[Math.floor(r() * SEI.length)]} ${MEI[Math.floor(r() * MEI.length)]}`,
        loginId: `E-101${kumi}${String(no).padStart(2, "0")}`, createdAt: new Date(now - 40 * DAY).toISOString(),
        lastLogin: last == null ? null : new Date(now - last * DAY).toISOString(),
        crystals: Math.floor(r() * 60), coins: 0,
        party: last == null ? [] : SPECIALIST_ROSTER.slice(k % 20, (k % 20) + 5).map((ch) => ch.id), owned,
        medalPractice: last == null ? 0 : Math.floor(r() * 25), medalHaichi: last == null ? 0 : Math.floor(r() * 30),
        attempts: t, correct: c, answers7d: a7, playMs7d: a7 * (9000 + r() * 20000), playMsAll: t * (9000 + r() * 20000),
        loginDays, units, weakUnits,
      });
    }
  }
  // 先生の確認用アカウント（自由なID）
  students.push({ id: "mock-teacher", name: "先生（確認用）", loginId: "teacher-test", createdAt: new Date(now - 60 * DAY).toISOString(), lastLogin: new Date(now).toISOString(),
    crystals: 999, coins: 0, party: SPECIALIST_ROSTER.slice(0, 5).map((ch) => ch.id), owned: 60, medalPractice: 40, medalHaichi: 50,
    attempts: 420, correct: 391, answers7d: 35, playMs7d: 900000, playMsAll: 9000000, loginDays: [JST(now)], units: {}, weakUnits: [] });

  const has = (s, d) => s.loginDays.includes(d);
  const week = {
    days: days7.map((d) => ({ date: d, logins: students.filter((s) => has(s, d)).length, active: students.filter((s) => has(s, d) && s.answers7d > 0).length })),
    loginUsers: students.filter((s) => days7.some((d) => has(s, d))).length,
    activeUsers: students.filter((s) => s.answers7d > 0).length,
    playTimeAvailable: true,
  };
  const act = students.filter((s) => s.answers7d > 0);
  week.avgPlayMin = act.length ? Math.round((act.reduce((a, s) => a + s.playMs7d, 0) / act.length / 60000) * 10) / 10 : 0;
  week.avgAnswers = act.length ? Math.round((act.reduce((a, s) => a + s.answers7d, 0) / act.length) * 10) / 10 : 0;

  const problems = {};
  UNITS.slice(0, 14).forEach((u, i) => ["easy", "standard", "advanced"].forEach((l, j) => {
    const tt = 10 + Math.floor(r() * 80);
    problems[`${u}:${l}:${i}${j}`] = { u, l, t: tt, c: Math.round(tt * (0.25 + r() * 0.7)), seed: 1000 + i * 17 + j };
  }));
  return { ok: true, generatedAt: new Date(now).toISOString(), loginLogMissing: false, week, students, problems, attemptsTotal: students.reduce((a, s) => a + s.attempts, 0) };
}

function daily(days) {
  const st = build();
  const r = rng(77);
  const now = Date.now();
  const rows = [];
  for (const s of st.students) for (const d of s.loginDays) {
    if (d < JST(now - (days - 1) * DAY)) continue;
    const solved = r() < 0.15 ? 0 : 3 + Math.floor(r() * 40);
    rows.push({ student_id: s.id, day: d, solved, correct: Math.round(solved * (0.4 + r() * 0.55)), ms: solved * 15000, battle_n: Math.floor(solved / 2), practice_n: Math.ceil(solved / 2), haichi_n: 0, medals: Math.floor(r() * 3), logins: 1 + Math.floor(r() * 2), active_ms: solved * 22000 + 120000, first_at: `${d}T07:10:00Z`, last_at: `${d}T07:45:00Z` });
  }
  return { ok: true, missing: false, since: JST(now - (days - 1) * DAY), rows };
}

function studentLog(targetId) {
  const s = build().students.find((x) => x.id === targetId);
  const d = daily(30).rows.filter((x) => x.student_id === targetId);
  const answers = Object.entries(s?.units || {}).slice(0, 4).flatMap(([u], i) => [0, 1, 2].map((j) => ({
    created_at: new Date(Date.now() - (i * 3 + j) * 3600e3).toISOString(), unit_id: u, difficulty: "standard", mode: j === 0 ? "battle" : "practice",
    q: "3x - 5 = 2x + 4 を解きなさい。", ans: "x=9", user_answer: j === 1 ? "x=-1" : "x=9", ok: j !== 1, mistake_tag: j === 1 ? "移項の符号" : null, ms: 12000 + j * 4000, counted: true, result: j === 0 ? "win" : null,
  })));
  return { ok: true, daily: d, sessions: d.map((x) => ({ started_at: x.first_at, last_seen_at: x.last_at, active_ms: x.active_ms })), medals: [], answers, missing: { daily: false, answers: false } };
}

export function mockAdminCall(action, body = {}) {
  if (action === "admin_stats") return (cache ||= build());
  if (action === "admin_daily") return daily(Number(body.days) || 14);
  if (action === "admin_student_log") return studentLog(body.targetId);
  if (action === "admin_grant") return { ok: true, message: "（ダミー）実行したことにしました" };
  if (action === "feedback_list") return { ok: true, feedback: [
    { id: 1, category: "request", name: "佐藤 陽翔", login_id: "E-101201", created_at: new Date(Date.now() - 3600e3).toISOString(), message: "ボスが強すぎるので、ヒントがほしいです。" },
    { id: 2, category: "good", name: "田中 結衣", login_id: "E-101305", created_at: new Date(Date.now() - 86400e3).toISOString(), message: "仲間が増えるのがたのしい！" },
    { id: 3, category: "bug", name: "鈴木 蓮", login_id: "E-101210", created_at: new Date(Date.now() - 2 * 86400e3).toISOString(), message: "答えを入れたのに不正解になった（分数のとき）" },
  ] };
  return { ok: false, error: "mock-unknown" };
}
