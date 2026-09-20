// ============================================================
// UnitTest.jsx — 単元テスト（文字入力式）
//  章の全単元から出題。1問ずつ自分で答えを入力 → 採点。
//  最後に得点・単元ごとの正誤・まちがいの正解を表示（ノートにも保存）。
// ============================================================
import { useState, useEffect, useRef } from "react";
import Header from "../components/Header.jsx";
import { BigWord } from "../components/Decorations.jsx";
import * as sfx from "../audio/sfx.js";
import { genUnitTest, unitTestTimeLimit, formatTime } from "../engine/unitTest.js";
import { isCorrect, unitTestXp } from "../engine/scoring.js";
import ResultReview from "../components/ResultReview.jsx";

export default function UnitTest({ player, chapter, onComplete, onBack, weakUnits = [], onRelearn, onHaichi, onOpenRelearnList }) {
  // 章を網羅：各小単元から標準・発展を複数問（DB由来の実問題を優先・重複回避）
  const [questions] = useState(() => genUnitTest(chapter, { perUnitPerLevel: 2 }));
  const limit = useRef(unitTestTimeLimit(questions.length)).current; // 制限時間（秒）
  const [timeLeft, setTimeLeft] = useState(limit);
  const [idx, setIdx] = useState(0);
  const [input, setInput] = useState("");
  const [answers, setAnswers] = useState([]); // {q, ans, userAns, ok, unitId, unitName, level}
  const [flash, setFlash] = useState(null);   // "ok" | "ng"
  const [phase, setPhase] = useState("intro"); // intro | playing | finish | end
  const inputRef = useRef(null);
  const savedRef = useRef(false);
  const answersRef = useRef([]);

  useEffect(() => { if (phase === "playing") inputRef.current?.focus(); }, [idx, phase]);

  // 採点を確定する（時間切れ・最終問題の両方から呼ぶ）
  function finishTest(finalAnswers) {
    if (savedRef.current) return;
    savedRef.current = true;
    setPhase("finish");
    const correct = finalAnswers.filter((a) => a.ok).length;
    const xp = unitTestXp({ correct, total: finalAnswers.length });
    onComplete({ chapter, answers: finalAnswers, correct, total: finalAnswers.length, xp });
  }

  // カウントダウン（プレイ中のみ）。0になったら時間切れで採点へ。
  useEffect(() => {
    if (phase !== "playing") return;
    const id = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) { clearInterval(id); finishTest(answersRef.current); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [phase]);

  function submit() {
    const q = questions[idx];
    if (!q || input === "") return;
    const ok = isCorrect(input, q.ans);
    ok ? sfx.correct() : sfx.wrong();
    setFlash(ok ? "ok" : "ng");
    setTimeout(() => setFlash(null), 300);
    const rec = { q: q.q, ans: q.ans, userAns: parseFloat(input), ok, unitId: q.unitId, unitName: q.unitName, level: q.level };
    const next = [...answers, rec];
    setAnswers(next);
    answersRef.current = next; // タイマー（時間切れ）から最新の回答を参照できるように
    setInput("");
    if (idx + 1 >= questions.length) {
      finishTest(next);
    } else {
      setIdx((i) => i + 1);
    }
  }

  // ---- 結果画面 ----
  if (phase === "end") {
    const correct = answers.filter((a) => a.ok).length;
    const total = answers.length;
    const pct = total ? Math.round((correct / total) * 100) : 0;
    // 単元ごとの正誤集計
    const byUnit = {};
    for (const a of answers) {
      byUnit[a.unitId] = byUnit[a.unitId] || { name: a.unitName, c: 0, t: 0 };
      byUnit[a.unitId].t++; if (a.ok) byUnit[a.unitId].c++;
    }
    const units = Object.values(byUnit);
    const wrongs = answers.filter((a) => !a.ok);
    return (
      <div className="app">
        <Header player={player} />
        <div className="content">
          <div className="res-card">
            <div style={{ textAlign: "center", marginBottom: 10 }}>
              <div className="big-n" style={{ color: pct >= 80 ? "#16a34a" : pct >= 50 ? "#4f46e5" : "#dc2626" }}>{pct}<span style={{ fontSize: 24 }}>点</span></div>
              <div style={{ fontSize: 13, color: "#94a3b8" }}>{correct} / {total} 問正解 ・ {chapter.name}</div>
              <div style={{ marginTop: 8 }}><span className="xp-pill">✨ +{unitTestXp({ correct, total })} XP</span></div>
            </div>

            <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", margin: "4px 0 6px" }}>単元ごとの結果</div>
            {units.map((u, i) => {
              const p = u.t ? Math.round((u.c / u.t) * 100) : 0;
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", borderBottom: "1px solid #f0f0f8" }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#1e1b4b", minWidth: 110 }}>{u.name}</span>
                  <div style={{ flex: 1, height: 8, background: "#f0f4ff", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ width: p + "%", height: "100%", background: p >= 70 ? "#4ade80" : p >= 40 ? "#fb923c" : "#f87171" }} />
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 800, color: "#4f46e5", minWidth: 34, textAlign: "right" }}>{u.c}/{u.t}</span>
                </div>
              );
            })}

            {/* まちがい直し・復習導線（小単元ごとに学び直し／葉一さんの解説へ） */}
            <ResultReview
              wrongs={wrongs}
              weakUnits={weakUnits}
              onRelearn={onRelearn}
              onHaichi={onHaichi}
              onOpenRelearnList={onOpenRelearnList}
            />

            <div className="res-acts" style={{ marginTop: 12 }}>
              <button className="rbtn s" onClick={onBack}>📝 章を選ぶ</button>
              <button className="rbtn p" onClick={onBack}>🏠 戻る</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---- 出題中 ----
  const q = questions[idx];
  if (!q) {
    return (
      <div className="app">
        <Header player={player} back="戻る" onBack={onBack} />
        <div className="content"><div className="glass">この章の問題が見つかりませんでした。</div></div>
      </div>
    );
  }
  const progress = ((idx) / questions.length) * 100;
  return (
    <div className="app">
      {phase === "intro" && <BigWord text="START!" color="#4ade80" onDone={() => setPhase("playing")} />}
      {phase === "finish" && <BigWord text="終了！" color="#fbbf24" onDone={() => setPhase("end")} />}
      <Header player={player} back="やめる" onBack={onBack} />
      <div className="content">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,.5)" }}>{chapter.emoji} {chapter.name}</span>
          <span style={{ fontSize: 13, fontWeight: 800, color: "rgba(255,255,255,.75)" }}>{idx + 1} / {questions.length}問</span>
        </div>
        {/* 制限時間 */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <span style={{ fontSize: 16 }}>⏳</span>
          <div style={{ flex: 1, height: 8, background: "rgba(255,255,255,.12)", borderRadius: 4, overflow: "hidden" }}>
            <div style={{ width: (timeLeft / limit) * 100 + "%", height: "100%", borderRadius: 4, transition: "width 1s linear", background: timeLeft > limit * 0.4 ? "#4ade80" : timeLeft > limit * 0.2 ? "#fbbf24" : "#f87171" }} />
          </div>
          <span style={{ fontFamily: "'M PLUS Rounded 1c',sans-serif", fontSize: 15, fontWeight: 900, minWidth: 52, textAlign: "right", color: timeLeft > limit * 0.2 ? "#e2e8f0" : "#f87171" }}>{formatTime(timeLeft)}</span>
        </div>
        <div style={{ height: 8, background: "rgba(255,255,255,.12)", borderRadius: 4, overflow: "hidden", marginBottom: 12 }}>
          <div style={{ width: progress + "%", height: "100%", background: "linear-gradient(90deg,#818cf8,#c084fc)", transition: "width .3s" }} />
        </div>

        <div className={"qcard" + (flash === "ok" ? " fok" : flash === "ng" ? " fng" : "")} style={flash === "ok" ? { background: "#f0fdf4" } : flash === "ng" ? { background: "#fff1f2" } : undefined}>
          <span className="q-pill">{q.unitName} ・ {q.level === "advanced" ? "発展" : "標準"}</span>
          <div className="q-text">{q.q}</div>
          <div className="ans-row">
            <input
              ref={inputRef} className="ans-in" type="text" inputMode="text" value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && input !== "") submit(); }}
              placeholder="答えを入力…"
            />
            <button className="ok-btn" data-sfx="none" onClick={submit} disabled={input === ""}>{idx + 1 >= questions.length ? "採点" : "次へ"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
