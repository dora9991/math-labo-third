// ============================================================
// MedalCase.jsx — メダル画面（数学ラボ3）
//  章をえらぶ → 小単元ごとに「はいち」「れんしゅう」のメダル2枚。
//  2枚そろうと ⚔️バトル が出現。はいち/れんしゅうに報酬は無く、メダルが成果。
//  見た目は仮置き（デザインはCodex側で後日仕上げる想定）。判定は third/medals.js。
// ============================================================
import { useState } from "react";
import { chaptersForGrade } from "../data/index.js";
import { unitMedals, medalSummary, MEDAL_PRACTICE_TARGET } from "./medals.js";
import { worldBattleFor } from "./link.js";

function Medal({ on, label, icon, sub }) {
  return (
    <div style={{ flex: 1, minWidth: 0, textAlign: "center" }}>
      <div style={{
        width: 44, height: 44, margin: "0 auto 3px", borderRadius: "50%", display: "grid", placeItems: "center", fontSize: 21,
        background: on ? "radial-gradient(circle at 35% 30%,#fff7c2,#fbbf24 55%,#b45309)" : "rgba(255,255,255,.06)",
        border: on ? "2px solid #fde68a" : "2px dashed rgba(255,255,255,.22)",
        boxShadow: on ? "0 0 12px rgba(251,191,36,.55)" : "none", filter: on ? "none" : "grayscale(1) opacity(.45)",
      }}>{icon}</div>
      <div style={{ fontSize: 10.5, fontWeight: 800, color: on ? "#fde68a" : "rgba(255,255,255,.55)" }}>{label}</div>
      {sub && <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,.5)" }}>{sub}</div>}
    </div>
  );
}

export default function MedalCase({ player, grade = 1, onHaichi, onPractice, onBattle }) {
  const chapters = chaptersForGrade(grade);
  const [ci, setCi] = useState(0);
  const ch = chapters[Math.min(ci, Math.max(0, chapters.length - 1))];
  if (!ch) return null;
  const units = ch.units || [];
  const all = chapters.flatMap((c) => c.units || []);
  const total = medalSummary(player, all);
  const here = medalSummary(player, units);

  const btn = (onClick, label, bg, disabled = false) => (
    <button data-sfx="none" disabled={disabled} onClick={onClick} style={{
      flex: 1, minWidth: 0, padding: "8px 4px", borderRadius: 9, fontSize: 11.5, fontWeight: 800, color: "#fff",
      cursor: disabled ? "not-allowed" : "pointer", background: disabled ? "rgba(255,255,255,.08)" : bg,
      border: "1px solid rgba(255,255,255,.18)", opacity: disabled ? 0.6 : 1,
    }}>{label}</button>
  );

  return (
    <section className="menu-medal-case" style={{ margin: "0 0 14px", padding: "12px 10px", borderRadius: 14, background: "rgba(251,191,36,.07)", border: "1px solid rgba(251,191,36,.3)" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 4 }}>
        <span style={{ fontSize: 14, fontWeight: 900, color: "#fde68a" }}>🏅 メダル</span>
        <span style={{ fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,.7)" }}>ぜんぶで {total.count} / {total.total} まい・バトル {total.battlesOpen} / {total.units} 解放</span>
      </div>
      <div style={{ fontSize: 10.5, color: "rgba(255,255,255,.6)", marginBottom: 8, lineHeight: 1.5 }}>
        「はいち」と「れんしゅう」のメダルを2まい集めると、その小単元のバトルが出現するよ。あわてず、じぶんのペースでOK。
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
        {chapters.map((c, i) => (
          <button key={c.id} data-sfx="none" onClick={() => setCi(i)} style={{
            padding: "5px 9px", borderRadius: 9, cursor: "pointer", fontSize: 11, fontWeight: 800,
            border: i === ci ? `2px solid ${c.color}` : "1px solid rgba(255,255,255,.14)",
            background: i === ci ? `${c.color}33` : "rgba(255,255,255,.05)", color: i === ci ? "#fff" : "rgba(255,255,255,.6)",
          }}>{c.emoji} {c.name}</button>
        ))}
      </div>
      <div style={{ fontSize: 10.5, fontWeight: 800, color: "#fde68a", marginBottom: 8 }}>{ch.name}：{here.count} / {here.total} まい</div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {units.map((u) => {
          const m = unitMedals(player, u.id);
          return (
            <div key={u.id} style={{
              padding: "9px", borderRadius: 11, background: "rgba(255,255,255,.04)",
              border: m.battleOpen ? "2px solid #fde047" : "1px solid rgba(255,255,255,.1)",
              boxShadow: m.battleOpen ? "0 0 0 2px rgba(253,224,71,.25)" : undefined,
            }}>
              <div style={{ fontSize: 12.5, fontWeight: 800, color: "#fff", marginBottom: 7 }}>{u.emoji ? u.emoji + " " : ""}{u.name}</div>
              <div style={{ display: "flex", gap: 10, marginBottom: 8 }}>
                <Medal on={m.haichi} icon="📺" label="はいち" sub={m.haichi ? "ゲット！" : "確認問題に合格"} />
                <Medal on={m.practice} icon="✏️" label="れんしゅう" sub={m.practice ? "ゲット！" : `${m.practiceN} / ${MEDAL_PRACTICE_TARGET}問`} />
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                {btn(() => onHaichi?.(u), "📺 はいち", "linear-gradient(135deg,#ef4444,#dc2626)")}
                {btn(() => onPractice?.(ch, u), "✏️ れんしゅう", "linear-gradient(135deg,#22c55e,#10b981)")}
                {btn(() => onBattle?.(ch, u), m.battleOpen ? "⚔️ バトル" : "🔒 バトル", "linear-gradient(135deg,#f59e0b,#b45309)", !m.battleOpen || !worldBattleFor(grade, ch, u))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
