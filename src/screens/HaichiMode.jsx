// ============================================================
// HaichiMode.jsx — 「はいちモード」：葉一さん（19ch）のレッスンで学ぶ
//  3階層のUI：
//   ① 大単元えらび（学年→大単元の一覧）
//   ② レッスン一覧（その大単元の葉一さんの動画をサムネ付きカードで一覧）
//   ③ スタジオ（動画をアプリ内に埋め込み再生＋19chワークシート＋手書き）
//      └「この単元の練習問題を解く」で、学んだ内容にリンクした問題へ
//
//  データは data/haichiCourse.js（19ch.tv から収集した実データ：
//   再生順・実YouTube動画ID・無料プリントPDF）。
//  葉一さんの許可を得て、YouTube公式埋め込み・プリント表示を行う。
// ============================================================
import { useState } from "react";
import Header from "../components/Header.jsx";
import HaichiStudio from "./HaichiStudio.jsx";
import StepUpSimple from "./StepUpSimple.jsx";
import { HAICHI_COURSE } from "../data/haichiCourse.js";
import { findUnitById, gradesWithChapters } from "../data/index.js";

const GRADE_LABEL = { 1: "中1", 2: "中2", 3: "中3" };
const GRADE_COLOR = { 1: "#818cf8", 2: "#f43f5e", 3: "#fbbf24" };
const PASS_RATE = 100; // 確認問題の合格ライン（5問すべて正解で合格）

// レッスンの識別キー（視聴・合格の記録に使う）
const lessonKey = (grade, n) => `g${grade}m${n}`;

export default function HaichiMode({ player, grade = 1, onSetGrade, onAttempt, onWatched, onPass, onBack }) {
  const availGrades = gradesWithChapters();
  const [view, setView] = useState("sections"); // sections | lessons | studio | practice
  const [section, setSection] = useState(null);  // 選択中の大単元
  const [lesson, setLesson] = useState(null);     // 選択中のレッスン

  const sections = HAICHI_COURSE[grade] || [];
  const watchedMap = player.haichiWatched || {};
  const passedMap = player.haichiPassed || {};

  function pickGrade(g) {
    if (!availGrades.includes(g)) return;
    onSetGrade?.(g);
    setSection(null); setLesson(null); setView("sections");
  }

  // ── ③ スタジオ（デモ準拠の高機能ビューア） ──
  if (view === "studio" && lesson && section) {
    return (
      <HaichiStudio
        player={player}
        grade={grade}
        section={section}
        lesson={lesson}
        watchedMap={watchedMap}
        passedMap={passedMap}
        onChangeLesson={(L) => setLesson(L)}
        onWatched={(key) => onWatched?.(key)}
        onPractice={(L) => { setLesson(L); setView("practice"); }}
        onBack={() => setView("lessons")}
      />
    );
  }

  // ── 練習問題（学んだこととリンク）。その動画専用の単元から出題＋合格判定 ──
  if (view === "practice" && lesson) {
    const key = lessonKey(grade, lesson.n);
    const units = (lesson.u || []).map(findUnitById).filter(Boolean);
    if (units.length > 0) {
      return (
        <StepUpSimple
          key={"haichi-" + key}
          player={player}
          units={units}
          title={`確認問題：${lesson.t}`}
          roundSize={5}
          passRate={PASS_RATE}
          onAttempt={onAttempt}
          onRoundEnd={({ correct, seen }) => { if (seen > 0 && (correct / seen) * 100 >= PASS_RATE) onPass?.(key); }}
          onHome={() => setView("studio")}
        />
      );
    }
    setView("studio"); // 念のため（問題が無い場合は戻す）
  }

  // ── ② レッスン一覧（葉一さんの動画カード・サムネ付き）──
  if (view === "lessons" && section) {
    return (
      <div className="app">
        <Header player={player} back="単元一覧" onBack={() => setView("sections")} />
        <div className="content">
          <div className="pg-ttl" style={{ color: section.color }}>{section.emoji} {section.name}</div>
          <div className="pg-sub">見たい授業をえらぼう（全{section.lessons.length}本・葉一さん／19ch）</div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10, marginTop: 6 }}>
            {section.lessons.map((L) => {
              const key = lessonKey(grade, L.n);
              const w = !!watchedMap[key], p = !!passedMap[key];
              return (
              <button
                key={L.n}
                data-sfx="none"
                onClick={() => { setLesson(L); setView("studio"); }}
                style={{
                  display: "flex", flexDirection: "column", textAlign: "left", padding: 0, overflow: "hidden",
                  borderRadius: 12, cursor: "pointer", color: "#fff",
                  background: "rgba(255,255,255,.05)", border: p ? "1px solid rgba(251,191,36,.6)" : "1px solid rgba(255,255,255,.12)",
                }}>
                <span style={{ position: "relative", display: "block", width: "100%", paddingBottom: "56.25%", background: "#000" }}>
                  <img
                    loading="lazy"
                    src={`https://i.ytimg.com/vi/${L.yt}/mqdefault.jpg`}
                    alt=""
                    style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
                  />
                  <span style={{
                    position: "absolute", left: 6, top: 6, fontSize: 10, fontWeight: 900, padding: "2px 6px",
                    borderRadius: 6, background: "rgba(0,0,0,.7)", color: "#fff",
                  }}>{GRADE_LABEL[grade]}-{L.n}</span>
                  {(w || p) && (
                    <span style={{ position: "absolute", right: 6, top: 6, display: "flex", gap: 4 }}>
                      {w && <span style={{ fontSize: 11, padding: "2px 6px", borderRadius: 6, background: "rgba(0,0,0,.7)", color: "#7dd3fc", fontWeight: 900 }}>👁視聴</span>}
                      {p && <span style={{ fontSize: 11, padding: "2px 6px", borderRadius: 6, background: "rgba(245,158,11,.9)", color: "#fff", fontWeight: 900 }}>🏅合格</span>}
                    </span>
                  )}
                  <span style={{
                    position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 30, color: "#fff", textShadow: "0 2px 8px rgba(0,0,0,.6)",
                  }}>▶</span>
                </span>
                <span style={{ padding: "8px 9px 10px" }}>
                  <span style={{ fontSize: 12.5, fontWeight: 800, display: "block", lineHeight: 1.4 }}>{L.t}</span>
                  <span style={{ fontSize: 10, color: "rgba(255,255,255,.5)", display: "block", marginTop: 3 }}>葉一さん／19ch{(L.u || []).length ? "・練習あり" : ""}</span>
                </span>
              </button>
              );
            })}
          </div>

          <div style={{ fontSize: 10.5, color: "rgba(255,255,255,.4)", textAlign: "center", marginTop: 16, lineHeight: 1.7 }}>
            ※ 動画は葉一さん（とある男が授業をしてみた）の YouTube 公式埋め込み、プリントは 19ch.tv の無料プリント。
            著作権は葉一さん／19ch.tv に帰属。許可を得て掲載しています。
          </div>
        </div>
      </div>
    );
  }

  // ── ① 大単元えらび（学年→大単元）──
  return (
    <div className="app">
      <Header player={player} back="ホーム" onBack={onBack} />
      <div className="content">
        <div className="pg-ttl" style={{ fontSize: 20 }}>📺 はいちモード</div>
        <div className="pg-sub">葉一さん（19ch）の授業を見ながらプリントに書きこみ、学んだ単元の練習問題を解こう</div>

        {/* 学年えらび */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "4px 0 14px" }}>
          <span style={{ fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,.5)", whiteSpace: "nowrap" }}>学年</span>
          {[1, 2, 3].map((g) => {
            const ready = availGrades.includes(g);
            const sel = grade === g;
            const c = GRADE_COLOR[g];
            return (
              <button key={g} onClick={() => pickGrade(g)} disabled={!ready} data-sfx="none"
                style={{
                  flex: 1, padding: "8px 4px", borderRadius: 10, cursor: ready ? "pointer" : "not-allowed",
                  fontSize: 13, fontWeight: 900,
                  border: sel ? `2px solid ${c}` : `1px solid ${c}66`,
                  background: sel ? `${c}3a` : `${c}14`,
                  color: ready ? (sel ? "#fff" : c) : "rgba(255,255,255,.35)",
                  boxShadow: sel ? `0 0 12px ${c}66` : "none",
                }}>
                {GRADE_LABEL[g]}{!ready && <span style={{ fontSize: 8, display: "block", fontWeight: 700 }}>準備中</span>}
              </button>
            );
          })}
        </div>

        {/* 大単元の一覧 */}
        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          {sections.map((sec) => (
            <button
              key={sec.name}
              data-sfx="none"
              onClick={() => { setSection(sec); setLesson(null); setView("lessons"); }}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 12, textAlign: "left",
                padding: "13px 15px", borderRadius: 14, cursor: "pointer", color: "#fff",
                background: `linear-gradient(135deg, ${sec.color}28, ${sec.color}10)`,
                border: `1.5px solid ${sec.color}77`,
              }}>
              <span style={{ fontSize: 28, lineHeight: 1 }}>{sec.emoji}</span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: 16, fontWeight: 900, display: "block", color: sec.color }}>{sec.name}</span>
                <span style={{ fontSize: 11.5, color: "rgba(255,255,255,.6)" }}>葉一さんの授業 全{sec.lessons.length}本{sec.practiceChapter ? "・練習問題あり" : ""}</span>
              </span>
              <span style={{ fontSize: 15, color: "rgba(255,255,255,.55)" }}>›</span>
            </button>
          ))}
        </div>

        <div style={{ fontSize: 10.5, color: "rgba(255,255,255,.4)", textAlign: "center", marginTop: 16, lineHeight: 1.7 }}>
          ※ 動画は葉一さん（とある男が授業をしてみた）の YouTube 公式埋め込み、プリントは 19ch.tv の無料プリント。
          著作権は葉一さん／19ch.tv に帰属。許可を得て掲載しています。
        </div>
      </div>
    </div>
  );
}
