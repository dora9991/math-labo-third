// ============================================================
// StudyLog.jsx — 学習記録（2026-07-29設計・2026-08-04改修）
//  「今日／昨日の学習記録」＝学習時間目安・単元別に何問解いたか。15分以上集中していたら祝う演出。
//  「直近7日間の記録」＝といた問題数の合計を、縦の短いメーター（OK!/Good!/Great!）で見せる。
//  ※新しい保存データは増やさず、既存の records（挑戦記録）から算出する。
// ============================================================
import { useEffect, useMemo } from "react";
import Header from "../components/Header.jsx";
import * as sfx from "../audio/sfx.js";
import { dayKeyBefore, daySummary, weekSummary, weeklyTier, weeklyMeterPct } from "../engine/studyLog.js";

const PRAISE_MESSAGES = [
  "15分もの間、集中して数学に向き合えたね。その積み重ねが力になる！",
  "がんばり、しっかり記録に残っているよ。この調子で続けよう。",
  "集中して取り組めた証拠が出たよ。自分をほめてあげよう！",
  "コツコツ続ける力、ちゃんとついてきているよ。",
  "本気で向き合えた時間だったね。",
];

function StatBlock({ label, value, color }) {
  return (
    <div style={{ flex: 1, textAlign: "center" }}>
      <div style={{ fontSize: 18, fontWeight: 900, color }}>{value}</div>
      <div style={{ fontSize: 9.5, fontWeight: 700, color: "rgba(255,255,255,.5)", marginTop: 2 }}>{label}</div>
    </div>
  );
}

// 1日ぶんの記録カード（今日・昨日で共通の見た目＝横並びの数値＋単元内訳）
function DayCard({ icon, title, dateKey, summary, emptyText, playSound }) {
  const praise = PRAISE_MESSAGES[summary.units.length % PRAISE_MESSAGES.length];
  useEffect(() => {
    if (playSound && summary.focused) { try { sfx.levelUp(); } catch {} }
  }, [playSound, summary.focused]);

  return (
    <div className="glass" style={{ padding: 14, marginBottom: 12 }}>
      <div style={{ fontSize: 13, fontWeight: 900, color: "#fff", marginBottom: 10 }}>
        {icon} {title} <span style={{ fontSize: 10.5, fontWeight: 700, color: "rgba(255,255,255,.45)" }}>（{dateKey}）</span>
      </div>

      {summary.questions === 0 ? (
        <div style={{ fontSize: 12, color: "rgba(255,255,255,.5)", padding: "10px 2px", lineHeight: 1.6 }}>{emptyText}</div>
      ) : (
        <>
          <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
            <StatBlock label="学習時間の目安" value={`${summary.minutes}分`} color="#7dd3fc" />
            <StatBlock label="といた問題数" value={`${summary.questions}問`} color="#4ade80" />
            <StatBlock label="正解数" value={`${summary.correct}問`} color="#fbbf24" />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {summary.units.map((u) => (
              <div key={u.unitId} style={{
                display: "flex", alignItems: "center", gap: 8, fontSize: 12,
                padding: "6px 9px", borderRadius: 9, background: "rgba(255,255,255,.05)",
              }}>
                <span style={{ fontSize: 15 }}>{u.emoji}</span>
                <span style={{ flex: 1, color: "rgba(255,255,255,.85)", fontWeight: 700 }}>{u.name}</span>
                <span style={{ fontWeight: 900, color: "#fde047" }}>{u.questions}問</span>
              </div>
            ))}
          </div>

          {summary.focused && (
            <div style={{
              marginTop: 12, padding: "14px", borderRadius: 13, textAlign: "center",
              background: "linear-gradient(135deg,rgba(251,191,36,.20),rgba(74,222,128,.14))",
              border: "1.5px solid rgba(251,191,36,.5)",
              animation: "rankUpPop .5s cubic-bezier(.2,1.4,.4,1) both",
            }}>
              <div style={{ fontSize: 30, lineHeight: 1 }}>🎉</div>
              <div style={{ fontSize: 15, fontWeight: 900, color: "#fde047", margin: "5px 0 3px" }}>素晴らしい！</div>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: "rgba(255,255,255,.85)", lineHeight: 1.6 }}>{praise}</div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// 週間メーター：縦・短め。OK!(下)→Good!(中)→Great!(上)の3ゾーンを積み上げ、現在値ぶん下から光らせる
function WeeklyVerticalMeter({ questions }) {
  const tier = weeklyTier(questions);
  const pct = weeklyMeterPct(questions);
  const H = 108;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ position: "relative", width: 26, height: H, borderRadius: 9, overflow: "hidden", border: "1px solid rgba(255,255,255,.14)",
        background: "linear-gradient(0deg, rgba(125,211,252,.14) 0%, rgba(125,211,252,.14) 25%, rgba(74,222,128,.14) 25%, rgba(74,222,128,.14) 75%, rgba(251,191,36,.14) 75%, rgba(251,191,36,.14) 100%)" }}>
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: `${pct}%`, background: tier.color || "rgba(255,255,255,.3)", transition: "height .6s ease", boxShadow: tier.color ? `0 0 10px ${tier.color}` : "none" }} />
        <div style={{ position: "absolute", left: 0, right: 0, bottom: "25%", height: 1.5, background: "rgba(0,0,0,.3)" }} />
        <div style={{ position: "absolute", left: 0, right: 0, bottom: "75%", height: 1.5, background: "rgba(0,0,0,.3)" }} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", height: H, padding: "2px 0" }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 900, color: "#fbbf24" }}>Great!</div>
          <div style={{ fontSize: 8.5, fontWeight: 700, color: "rgba(255,255,255,.4)" }}>31問〜</div>
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 900, color: "#4ade80" }}>Good!</div>
          <div style={{ fontSize: 8.5, fontWeight: 700, color: "rgba(255,255,255,.4)" }}>11〜30問</div>
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 900, color: "#7dd3fc" }}>OK!</div>
          <div style={{ fontSize: 8.5, fontWeight: 700, color: "rgba(255,255,255,.4)" }}>1〜10問</div>
        </div>
      </div>
    </div>
  );
}

export default function StudyLog({ player, records, onBack }) {
  const todayKey = useMemo(() => dayKeyBefore(0), []);
  const yesterdayKey = useMemo(() => dayKeyBefore(1), []);
  const today = useMemo(() => daySummary(records, todayKey), [records, todayKey]);
  const yesterday = useMemo(() => daySummary(records, yesterdayKey), [records, yesterdayKey]);
  const week = useMemo(() => weekSummary(records, 7), [records]);
  const tier = weeklyTier(week.questions);

  return (
    <div className="app">
      <Header player={player} back="ホーム" onBack={onBack} />
      <div className="content">
        <div className="pg-ttl">📅 学習記録</div>
        <div className="pg-sub">今日・昨日と、直近7日間の「といた問題」がひと目でわかるよ</div>

        <DayCard icon="📆" title="今日の学習記録" dateKey={todayKey} summary={today}
          emptyText="今日はまだ記録がないよ。これから頑張ろう！" playSound />
        <DayCard icon="📆" title="昨日の学習記録" dateKey={yesterdayKey} summary={yesterday}
          emptyText="昨日は学習の記録がなかったよ。" />

        {/* ===== 直近7日間の記録 ===== */}
        <div className="glass" style={{ padding: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 900, color: "#fff", marginBottom: 4 }}>📈 直近7日間の記録</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 16 }}>
            <span style={{ fontSize: 26, fontWeight: 900, color: "#fff" }}>{week.questions}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,.5)" }}>問といた</span>
            {tier.label && (
              <span style={{
                marginLeft: "auto", fontSize: 13, fontWeight: 900, color: tier.color,
                padding: "3px 10px", borderRadius: 999, background: `color-mix(in srgb, ${tier.color} 16%, transparent)`,
                border: `1px solid ${tier.color}`,
              }}>{tier.label}</span>
            )}
          </div>

          <WeeklyVerticalMeter questions={week.questions} />

          {/* 日別のミニ内訳 */}
          <div style={{ display: "flex", gap: 4, marginTop: 20 }}>
            {week.days.map((d) => {
              const label = d.dayKey.split("/").slice(1).join("/"); // "2026/7/29" → "7/29"
              const h = Math.max(4, Math.min(40, d.questions * 2));
              return (
                <div key={d.dayKey} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <div style={{ height: 40, display: "flex", alignItems: "flex-end" }}>
                    <div style={{ width: 14, height: h, borderRadius: 4, background: d.questions > 0 ? "#818cf8" : "rgba(255,255,255,.1)" }} />
                  </div>
                  <span style={{ fontSize: 8.5, fontWeight: 700, color: "rgba(255,255,255,.45)" }}>{label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
