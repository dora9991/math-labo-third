// ============================================================
// CalcPracticePick.jsx — 単元（章）/小単元のえらび画面
//  ・既定（小単元モード）：章の中の小単元を1つ選ぶ → onPick(章, 小単元)
//    例「単元別じっくり練習」。
//  ・chapterMode：章そのものを選ぶ → onPick(章) 。
//    例「計算王への道」＝単元（章）の大きな括りで挑戦する。
// ============================================================
import { useState } from "react";
import Header from "../components/Header.jsx";
import { allChapters } from "../data/index.js";
import { videoUrlFor } from "../data/videoLinks.js";

const GRADE_LABEL = { 1: "中1", 2: "中2", 3: "中3" };

export default function CalcPracticePick({ player, onPick, onBack, chapterMode = false, title = "📚 単元別じっくり練習", subtitle = "単元を選んで、時間制限なしで練習しよう（間違えても止まりません）" }) {
  const chapters = allChapters();
  const grades = [...new Set(chapters.map((c) => c.grade))];
  const [g, setG] = useState(grades[0] || 1);

  return (
    <div className="app">
      <Header player={player} back="もどる" onBack={onBack} />
      <div className="content">
        <div className="pg-ttl">{title}</div>
        <div className="pg-sub">{subtitle}</div>

        {/* 学年タブ */}
        <div style={{ display: "flex", gap: 8, marginBottom: 4 }}>
          {grades.map((gr) => (
            <button key={gr} onClick={() => setG(gr)} data-sfx="none"
              style={{
                flex: 1, padding: "8px 4px", borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 900,
                border: g === gr ? "2px solid #38bdf8" : "1px solid rgba(255,255,255,.15)",
                background: g === gr ? "rgba(56,189,248,.2)" : "rgba(255,255,255,.05)", color: "#fff",
              }}>{GRADE_LABEL[gr] || `中${gr}`}</button>
          ))}
        </div>

        {/* chapterMode：章そのものを1つのボタンにして「単元（章）の大きな括り」で選ばせる */}
        {chapterMode
          ? chapters.filter((c) => c.grade === g).map((c) => (
              <button key={c.id} onClick={() => onPick(c)} data-sfx="none" className="glass"
                style={{
                  width: "100%", textAlign: "left", cursor: "pointer", padding: "12px 14px",
                  borderLeft: `4px solid ${c.color}`, border: "1px solid rgba(255,255,255,.1)",
                  borderLeftWidth: 4, borderLeftColor: c.color,
                }}>
                <div style={{ fontSize: 15, fontWeight: 900, color: "#fff" }}>{c.emoji} {c.name}</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,.5)", marginTop: 5, lineHeight: 1.6 }}>
                  {c.units.map((u) => u.name).join("・")}
                </div>
              </button>
            ))
          : chapters.filter((c) => c.grade === g).map((c) => (
              <div key={c.id} className="glass" style={{ padding: "10px 12px" }}>
                <div style={{ fontSize: 13, fontWeight: 900, color: c.color, marginBottom: 8 }}>{c.emoji} {c.name}</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
                  {c.units.map((u) => {
                    const vurl = videoUrlFor(u.id);
                    return (
                      <div key={u.id} style={{ display: "flex", gap: 4 }}>
                        <button onClick={() => onPick(c, u)} data-sfx="none"
                          style={{
                            flex: 1, minWidth: 0, padding: "9px 8px", borderRadius: 10, border: "1px solid rgba(255,255,255,.15)",
                            background: "rgba(255,255,255,.05)", color: "#fff", fontSize: 12, fontWeight: 800,
                            cursor: "pointer", textAlign: "left",
                          }}>{u.emoji || "✏️"} {u.name}</button>
                        {vurl && (
                          <button onClick={() => window.open(vurl, "_blank", "noopener")} data-sfx="none" title="19chの解説動画"
                            style={{ flexShrink: 0, width: 36, borderRadius: 10, border: "1px solid rgba(239,68,68,.4)", background: "rgba(239,68,68,.12)", cursor: "pointer", fontSize: 16 }}>📺</button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
      </div>
    </div>
  );
}
