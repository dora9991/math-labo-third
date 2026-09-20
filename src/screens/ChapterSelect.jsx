// ============================================================
// ChapterSelect.jsx — 章 → 単元 → 難易度 を選ぶ画面
// ============================================================
import { useState } from "react";
import Header from "../components/Header.jsx";
import Stars from "../components/Stars.jsx";
import { CHAPTERS, LEVEL_KEYS, LEVEL_LABEL, LEVEL_COLOR } from "../data/index.js";
import { getStars, isUnitUnlocked } from "../engine/progress.js";
import { videoUrlFor } from "../data/videoLinks.js";
import { hasLessonMedia } from "../data/lessonMedia.js";

export default function ChapterSelect({ player, mode, chapters = CHAPTERS, onStart, onLesson, onBack }) {
  const [chapter, setChapter] = useState(null);
  const [unit, setUnit] = useState(null);

  const modeLabel = { timeAttack: "⏱ タイムアタック", slow: "🌱 じっくり" }[mode] || "";

  // 難易度を選ぶ段階
  if (chapter && unit) {
    return (
      <div className="app">
        <Header player={player} back={chapter.name} onBack={() => setUnit(null)} />
        <div className="content">
          <div className="pg-ttl">{unit.emoji} {unit.name}</div>
          <div className="pg-sub">{unit.desc} ・ 難易度をえらぼう</div>
          {/* 「鬼」は unit.problems.oni を持つ単元だけ、発展の下に4枚目として出す */}
          {[...LEVEL_KEYS, ...(unit.problems?.oni ? ["oni"] : [])].map((lv) => {
            const cls = lv === "easy" ? "easy-bg" : lv === "standard" ? "std-bg" : "adv-bg";
            const st = getStars(player, unit.id, lv);
            const isOni = lv === "oni";
            const em = lv === "easy" ? "🌱" : lv === "standard" ? "🔥" : lv === "advanced" ? "⚡" : "👹";
            const sub = lv === "easy" ? "基本をしっかり" : lv === "standard" ? "応用に挑戦" : lv === "advanced" ? "難問に全力" : "発展の上・限界に挑戦";
            return (
              <button key={lv} className={`lv-card ${cls}`} onClick={() => onStart(chapter, unit, lv)}
                style={isOni ? { background: "linear-gradient(135deg,#6b21a8,#a855f7)", border: "1px solid rgba(216,180,254,.5)" } : undefined}>
                <div className="lv-em">{em}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 900 }}>{LEVEL_LABEL[lv]}{isOni && " 🔥"}</div>
                  <div style={{ fontSize: 11, opacity: 0.75 }}>{sub}</div>
                  <div style={{ marginTop: 4 }}><Stars count={st} size={12} /></div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // 単元を選ぶ段階
  if (chapter) {
    return (
      <div className="app">
        <Header player={player} back="単元選択" onBack={() => setChapter(null)} />
        <div className="content">
          <div className="pg-ttl" style={{ color: chapter.color }}>{chapter.emoji} {chapter.name}</div>
          <div className="pg-sub">{modeLabel}</div>
          {chapter.units.map((u, idx) => {
            const unlocked = isUnitUnlocked(player, chapter, idx);
            const cleared = LEVEL_KEYS.every((lv) => getStars(player, u.id, lv) >= 1);
            const vurl = videoUrlFor(u.id);
            return (
              <div key={u.id} style={{ display: "flex", gap: 8, alignItems: "stretch", marginBottom: 8 }}>
                <button
                  className="chap-card"
                  style={{ flex: 1, margin: 0, background: unlocked ? "rgba(255,255,255,.06)" : "rgba(255,255,255,.03)", opacity: unlocked ? 1 : 0.4, cursor: unlocked ? "pointer" : "not-allowed" }}
                  disabled={!unlocked}
                  onClick={() => unlocked && setUnit(u)}
                >
                  <div className="chap-em">{unlocked ? u.emoji : "🔒"}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 800 }}>
                      {u.name}
                      {unlocked && cleared && (
                        <span style={{ fontSize: 11, fontWeight: 900, color: "#1e1b4b", background: "#fde047", borderRadius: 6, padding: "1px 7px", marginLeft: 8 }}>CLEAR!</span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,.4)" }}>
                      {unlocked ? u.desc : "前の単元をクリアで解放"}
                    </div>
                    {unlocked && (
                      <div style={{ display: "flex", gap: 6, marginTop: 5, flexWrap: "wrap" }}>
                        {LEVEL_KEYS.map((lv) => (
                          <span key={lv} style={{ fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 6, background: LEVEL_COLOR[lv] + "22", color: LEVEL_COLOR[lv] }}>
                            {LEVEL_LABEL[lv]} {"⭐".repeat(getStars(player, u.id, lv)) || "○"}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </button>
                {onLesson && hasLessonMedia(u.id) ? (
                  <button
                    onClick={() => onLesson(u)}
                    data-sfx="none"
                    title="動画を見ながらプリントに書き込む（学習はいつでもOK）"
                    style={{ width: 56, flexShrink: 0, borderRadius: 14, border: "1px solid rgba(99,102,241,.5)", background: "rgba(99,102,241,.16)", color: "#c7d2fe", cursor: "pointer", fontSize: 10, fontWeight: 800, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2 }}
                  >
                    <span style={{ fontSize: 18 }}>📺✏️</span>動画＋<br />プリント
                  </button>
                ) : vurl && (
                  <button
                    onClick={() => window.open(vurl, "_blank", "noopener")}
                    data-sfx="none"
                    title="19chの解説動画を見る"
                    style={{ width: 56, flexShrink: 0, borderRadius: 14, border: "1px solid rgba(239,68,68,.4)", background: "rgba(239,68,68,.12)", color: "#fca5a5", cursor: "pointer", fontSize: 11, fontWeight: 800, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2 }}
                  >
                    <span style={{ fontSize: 20 }}>📺</span>解説
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // 章を選ぶ段階
  return (
    <div className="app">
      <Header player={player} back="ホーム" onBack={onBack} />
      <div className="content">
        <div className="pg-ttl">単元を選ぼう</div>
        <div className="pg-sub">{modeLabel}</div>
        {chapters.length === 0 && (
          <div className="glass" style={{ padding: 18, textAlign: "center", color: "rgba(255,255,255,.7)" }}>
            この学年の問題は準備中です。
          </div>
        )}
        {chapters.map((c) => (
          <button key={c.id} className="chap-card" style={{ background: `linear-gradient(135deg, ${c.color}cc, ${c.color}88)` }} onClick={() => setChapter(c)}>
            <div className="chap-em">{c.emoji}</div>
            <div style={{ flex: 1 }}>
              <div className="chap-nm">{c.name}</div>
              <div className="chap-sub">中学{c.grade}年 ・ {c.units.length}単元</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
