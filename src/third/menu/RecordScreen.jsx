// RecordScreen.jsx — 学習の記録：前回のログイン日／本日といた問題数／1週間の記録／学習の目安。
//  既存の records（挑戦記録）から集計する（新しい保存データは増やさない。前回ログイン日だけ player.prevLoginDate）。
import { useMemo } from "react";
import { dayKeyBefore, daySummary, weekSummary, weeklyTier } from "../../engine/studyLog.js";
import GameButton from "../../components/GameButton.jsx";

const DAILY_MINUTES = 15;            // 1日の目安（集中して15分）
const DAILY_QUESTIONS = 30;          // ≒ 15分 ÷ 30秒/問
const WD = ["日", "月", "火", "水", "木", "金", "土"];

function Card({ icon, title, children }) {
  return (
    <div className="glass menu-record-card" style={{ padding: 14, marginBottom: 12 }}>
      <div className="menu-card-heading"><span aria-hidden>{icon}</span>{title}</div>
      {children}
    </div>
  );
}

export default function RecordScreen({ player, records, onWeakness }) {
  const todayKey = useMemo(() => dayKeyBefore(0), []);
  const today = useMemo(() => daySummary(records, todayKey), [records, todayKey]);
  const week = useMemo(() => weekSummary(records, 7), [records]);
  const tier = weeklyTier(week.questions);
  const days = useMemo(() => {
    const out = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      out.push({ label: `${d.getMonth() + 1}/${d.getDate()}`, wd: WD[d.getDay()], q: daySummary(records, dayKeyBefore(i)).questions, today: i === 0 });
    }
    return out;
  }, [records]);
  const maxQ = Math.max(10, ...days.map((d) => d.q));
  const pct = Math.min(100, Math.round((today.questions / DAILY_QUESTIONS) * 100));

  return (
    <div>
      <div className="menu-section-title">学習の記録</div>

      <Card icon="I" title="前回のログイン日">
        <div style={{ fontSize: 20, fontWeight: 900, color: "#7dd3fc" }}>{player.prevLoginDate || "きょうがはじめて（または記録なし）"}</div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,.72)", marginTop: 4 }}>きょう：{todayKey}　・　連続 {player.streaks ?? 0} 日</div>
      </Card>

      <Card icon="II" title="きょう といた問題">
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span style={{ fontSize: 34, fontWeight: 900, color: "#4ade80" }}>{today.questions}</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,.6)" }}>問　（正解 {today.correct} 問）</span>
        </div>
        {today.questions === 0 && <div style={{ fontSize: 12, color: "rgba(255,255,255,.5)", marginTop: 6 }}>まだ記録がないよ。これから頑張ろう！</div>}
      </Card>

      <Card icon="III" title="1週間の記録">
        <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 130, padding: "0 2px" }}>
          {days.map((d) => (
            <div key={d.label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", height: "100%" }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: d.q ? "#fde68a" : "rgba(255,255,255,.6)", marginBottom: 3 }}>{d.q}</div>
              <div style={{ width: "100%", height: `${Math.max(3, (d.q / maxQ) * 82)}%`, borderRadius: 6,
                background: d.today ? "linear-gradient(180deg,#fde68a,#f59e0b)" : "linear-gradient(180deg,#7dd3fc,#3b82f6)", opacity: d.q ? 1 : 0.25 }} />
              <div style={{ fontSize: 12, color: d.today ? "#fde68a" : "rgba(255,255,255,.72)", marginTop: 4, fontWeight: 700 }}>{d.wd}</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,.6)" }}>{d.label}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 10, fontSize: 13, fontWeight: 800, color: "#fff" }}>
          1週間で <span style={{ color: "#fde047", fontSize: 18 }}>{week.questions}</span> 問
          {tier.label && <span style={{ marginLeft: 8, color: tier.color || "#4ade80" }}>{tier.label}</span>}
        </div>
      </Card>

      <Card icon="IV" title="学習の目安">
        <div style={{ fontSize: 13, color: "rgba(255,255,255,.85)", lineHeight: 1.7 }}>
          1日 <b style={{ color: "#fde047" }}>{DAILY_MINUTES}分（約{DAILY_QUESTIONS}問）</b> を、集中してとりくむのが目安だよ。
        </div>
        <div style={{ height: 12, borderRadius: 999, background: "rgba(255,255,255,.1)", overflow: "hidden", margin: "10px 0 6px" }}>
          <div style={{ width: `${pct}%`, height: "100%", background: pct >= 100 ? "linear-gradient(90deg,#4ade80,#fde047)" : "linear-gradient(90deg,#7dd3fc,#3b82f6)", transition: "width .5s" }} />
        </div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,.7)" }}>
          きょう {today.questions} / {DAILY_QUESTIONS} 問（{pct}%）　{pct >= 100 ? "目安クリア！" : `あと ${DAILY_QUESTIONS - today.questions} 問`}
        </div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,.68)", marginTop: 8, lineHeight: 1.6 }}>
          1週間の目安：OK! 1〜10問／Good! 11〜30問／Great! 31問〜。休むことも大事。むりせず続けよう。
        </div>
      </Card>

      {onWeakness && (
        <GameButton tone="mint" icon="✚" onClick={onWeakness}><strong>まちがいをなおす</strong><small>弱点克服モード</small></GameButton>
      )}
    </div>
  );
}
