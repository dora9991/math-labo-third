// ============================================================
// StatusDetail.jsx — 自分のステータス詳細（苦手の可視化）
//  単元(章)ごとに、小単元(ユニット)の 理解度・正答率・AIの一言 を一覧する。
// ============================================================
import { useState } from "react";
import Header from "../components/Header.jsx";
import { allChapters, LEVEL_LABEL, LEVEL_COLOR } from "../data/index.js";
import { buildStatusReport } from "../engine/insight.js";
import { countOk } from "../engine/unitMastery.js";

const pct = (a) => (a == null ? "—" : Math.round(a * 100) + "%");

export default function StatusDetail({ player, records, onBack }) {
  const chapters = allChapters();
  const report = buildStatusReport(chapters, player, records || []);
  const mastery = player.unitMastery || {};
  const totalUnits = report.reduce((s, c) => s + c.units.length, 0);
  // 最初の章だけ開いておく
  const [open, setOpen] = useState(() => ({ [chapters[0]?.id]: true }));
  const toggle = (id) => setOpen((o) => ({ ...o, [id]: !o[id] }));

  return (
    <div className="app">
      <Header player={player} back="ホーム" onBack={onBack} />
      <div className="content">
        <div className="pg-ttl">📋 理解度の詳細</div>
        <div className="pg-sub">単元・小単元ごとの理解度と正答率、AIからの一言が見られるよ</div>

        {/* 習得（OK）した小単元の数。4問連続正解でOKになる */}
        <div className="glass" style={{ padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,.7)" }}>✓ 習得した小単元（4問連続正解でOK）</span>
          <span style={{ fontSize: 16, fontWeight: 900, color: "#4ade80" }}>{countOk(mastery)} / {totalUnits}</span>
        </div>

        {report.map(({ chapter, units }) => {
          // 章の平均理解度
          const done = units.filter((u) => u.understanding.band !== "none");
          const avg = done.length ? Math.round(done.reduce((s, u) => s + u.understanding.pct, 0) / done.length) : 0;
          const isOpen = !!open[chapter.id];
          return (
            <div key={chapter.id} className="glass" style={{ padding: 0, overflow: "hidden" }}>
              {/* 章ヘッダ（クリックで開閉） */}
              <button
                data-sfx="none"
                onClick={() => toggle(chapter.id)}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "13px 14px",
                  background: "none", border: "none", cursor: "pointer", fontFamily: "inherit",
                  borderLeft: `4px solid ${chapter.color}`,
                }}
              >
                <span style={{ fontSize: 20 }}>{chapter.emoji}</span>
                <span style={{ flex: 1, textAlign: "left", fontSize: 14, fontWeight: 900, color: "#fff" }}>{chapter.name}</span>
                <span style={{ fontSize: 12, fontWeight: 800, color: chapter.color }}>
                  {done.length ? `理解度 ${avg}%` : "未挑戦"}
                </span>
                <span style={{ fontSize: 12, color: "rgba(255,255,255,.45)" }}>{isOpen ? "▲" : "▼"}</span>
              </button>

              {/* 小単元一覧 */}
              {isOpen && (
                <div style={{ padding: "0 14px 12px" }}>
                  {units.map(({ unit, understanding, accuracy, attempts, comment, levels }) => {
                    const m = mastery[unit.id] || { pt: 0, streak: 0, ok: false };
                    return (
                    <div key={unit.id} style={{ padding: "11px 0", borderTop: "1px solid rgba(255,255,255,.07)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 800, color: "rgba(255,255,255,.85)", flex: 1 }}>
                          {unit.emoji} {unit.name}
                        </span>
                        {m.ok && (
                          <span style={{ fontSize: 10, fontWeight: 900, padding: "2px 8px", borderRadius: 8, color: "#052e16", background: "#4ade80" }}>
                            ✓ OK
                          </span>
                        )}
                        <span style={{
                          fontSize: 10, fontWeight: 900, padding: "2px 8px", borderRadius: 8,
                          color: understanding.color, background: `color-mix(in srgb, ${understanding.color} 18%, transparent)`,
                        }}>
                          {understanding.label}
                        </span>
                      </div>

                      {/* 習得確認ポイント（4連続正解でOK・ミスで-10） */}
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                        <span style={{ fontSize: 10, color: "rgba(255,255,255,.45)", width: 44 }}>確認</span>
                        <div style={{ flex: 1, height: 6, background: "rgba(255,255,255,.1)", borderRadius: 4, overflow: "hidden" }}>
                          <div style={{ width: m.pt + "%", height: "100%", background: m.ok ? "#4ade80" : "#38bdf8", borderRadius: 4, transition: "width .4s" }} />
                        </div>
                        <span style={{ fontSize: 10, fontWeight: 800, color: m.ok ? "#4ade80" : "#7dd3fc", minWidth: 52, textAlign: "right" }}>
                          {m.ok ? "習得" : `あと${Math.max(0, 4 - (m.streak || 0))}連続`}
                        </span>
                      </div>

                      {/* 理解度バー */}
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                        <span style={{ fontSize: 10, color: "rgba(255,255,255,.45)", width: 44 }}>理解度</span>
                        <div style={{ flex: 1, height: 8, background: "rgba(255,255,255,.1)", borderRadius: 5, overflow: "hidden" }}>
                          <div style={{ width: understanding.pct + "%", height: "100%", background: understanding.color, borderRadius: 5, transition: "width .4s" }} />
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 800, color: understanding.color, minWidth: 34, textAlign: "right" }}>{understanding.pct}%</span>
                      </div>

                      {/* 難易度別の正答率＋星 */}
                      <div style={{ display: "flex", gap: 6, marginBottom: 7, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 10, color: "rgba(255,255,255,.45)", width: 44 }}>
                          正答率 {pct(accuracy)}
                        </span>
                        {levels.map((lv) => (
                          <span key={lv.level} style={{
                            fontSize: 10, fontWeight: 700, padding: "1px 7px", borderRadius: 7,
                            color: LEVEL_COLOR[lv.level],
                            background: "rgba(255,255,255,.05)",
                            opacity: lv.attempts > 0 || lv.stars > 0 ? 1 : 0.4,
                          }}>
                            {LEVEL_LABEL[lv.level]} {"★".repeat(lv.stars)}{lv.attempts > 0 ? ` ${pct(lv.accuracy)}` : ""}
                          </span>
                        ))}
                      </div>

                      {/* AIの一言 */}
                      <div style={{
                        fontSize: 11, color: "rgba(255,255,255,.7)", lineHeight: 1.5,
                        background: "rgba(129,140,248,.1)", borderRadius: 9, padding: "7px 10px",
                        borderLeft: "3px solid #818cf8",
                      }}>
                        🤖 {comment}
                      </div>
                    </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
