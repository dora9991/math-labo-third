// ============================================================
// Diagnose.jsx — B-3「どこから始める？」診断（章ごとの軽いチェック）
//  ・各小単元から1問ずつ(標準→易→発展の順でフォールバック)出す。時間無制限・"テスト"でなく"チェック"。
//  ・終わると「理解度マップ」＝単元ごとに ○できてる / 🔧ここを練習 と、おすすめスタート地点を出す。
//  ・正解した単元のスキルは skillStats を上げる(ラチェット＝下げない)。→足場/危ない判定に反映。
//  設計: 10_Projects/math-labo/設計_すでに躓いている子への足場_2026-06-28.md（B-3）／構想_診断と習熟度制
// ============================================================
import { useState } from "react";
import Header from "../components/Header.jsx";
import CharBubble from "../components/CharBubble.jsx";
import MathText from "../components/MathText.jsx";
import QuestionText from "../components/QuestionText.jsx";
import * as sfx from "../audio/sfx.js";
import { genProblem, makeChoices } from "../engine/generator.js";
import { isCorrect } from "../engine/scoring.js";

// その単元の1問（標準→易→発展でフォールバック）＋4択を作る
function makeItem(unit) {
  const p = genProblem(unit, "standard") || genProblem(unit, "easy") || genProblem(unit, "advanced");
  if (!p) return null;
  return { unit, problem: p, choices: makeChoices(p.ans) };
}

export default function Diagnose({ player, chapter, onApply, onStartUnit, onBack }) {
  const [items] = useState(() => (chapter.units || []).map(makeItem).filter(Boolean));
  const [idx, setIdx] = useState(0);
  const [results, setResults] = useState([]); // { unit, unitId, skill, ok }
  const [done, setDone] = useState(false);

  if (!items.length) {
    return (
      <div className="app">
        <Header player={player} back="もどる" onBack={onBack} />
        <div className="content"><div className="glass">この章のチェック問題が見つかりませんでした。</div></div>
      </div>
    );
  }

  function answer(choice) {
    const it = items[idx];
    const ok = isCorrect(choice, it.problem.ans);
    ok ? sfx.correct() : sfx.wrong();
    const next = [...results, { unit: it.unit, unitId: it.unit.id, skill: it.problem.skill || null, ok }];
    setResults(next);
    if (idx + 1 >= items.length) {
      onApply?.(next); // skillStats をラチェット（正解スキルだけ上げる）
      setDone(true);
    } else {
      setIdx(idx + 1);
    }
  }

  // ── 結果＝理解度マップ ──
  if (done) {
    const firstWeak = results.find((r) => !r.ok);
    const allOk = results.every((r) => r.ok);
    return (
      <div className="app">
        <Header player={player} back="とじる" onBack={onBack} />
        <div className="content">
          <div className="pg-ttl">🩺 {chapter.name}のチェックけっか</div>
          <div className="pg-sub">できてる所はとばしてOK。<b style={{ color: "#fde047" }}>🔧 の所から</b>はじめよう。</div>

          <div style={{ display: "flex", flexDirection: "column", gap: 7, margin: "12px 0" }}>
            {results.map((r) => (
              <div key={r.unitId} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 11,
                background: r.ok ? "rgba(34,197,94,.10)" : "rgba(251,191,36,.10)",
                border: r.ok ? "1px solid rgba(34,197,94,.4)" : "1px solid rgba(251,191,36,.5)" }}>
                <span style={{ fontSize: 20, flexShrink: 0 }}>{r.ok ? "✅" : "🔧"}</span>
                <span style={{ flex: 1, fontSize: 13.5, fontWeight: 800, color: "#fff" }}>{r.unit.emoji ? r.unit.emoji + " " : ""}{r.unit.name}</span>
                <span style={{ fontSize: 11, fontWeight: 800, color: r.ok ? "#86efac" : "#fbbf24" }}>{r.ok ? "できてる" : "ここを練習"}</span>
              </div>
            ))}
          </div>

          {allOk ? (
            <div style={{ padding: "12px 14px", borderRadius: 12, background: "rgba(34,197,94,.14)", border: "1px solid rgba(34,197,94,.5)", textAlign: "center", marginBottom: 12 }}>
              <div style={{ fontSize: 16, fontWeight: 900, color: "#86efac" }}>🎉 ぜんぶできてる！すごい！</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,.7)", marginTop: 2 }}>応用やバトルに進んでもOK！</div>
            </div>
          ) : firstWeak && (
            <button data-sfx="none" onClick={() => onStartUnit?.(firstWeak.unit)} style={{
              width: "100%", padding: "15px 14px", borderRadius: 14, border: "none", cursor: "pointer", marginBottom: 10,
              background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", fontWeight: 900, fontSize: 15, lineHeight: 1.4,
              boxShadow: "0 8px 22px rgba(99,102,241,.45)" }}>
              ▶ ここから始めよう<br /><span style={{ fontSize: 12.5, opacity: 0.95 }}>{firstWeak.unit.emoji ? firstWeak.unit.emoji + " " : ""}{firstWeak.unit.name}</span>
            </button>
          )}

          <button data-sfx="back" onClick={onBack} style={{ width: "100%", padding: 13, borderRadius: 12, border: "1px solid rgba(255,255,255,.2)", background: "rgba(255,255,255,.06)", color: "#fff", fontWeight: 800, cursor: "pointer", fontSize: 14 }}>学習サイクルにもどる</button>
        </div>
      </div>
    );
  }

  // ── 出題 ──
  const it = items[idx];
  return (
    <div className="app">
      <Header player={player} back="やめる" onBack={onBack} />
      <div className="content">
        <div className="pg-ttl">🩺 {chapter.name}のチェック</div>
        <div className="pg-sub">どこができてるか、さっと見るだけ。まちがえてもOK！</div>

        {/* 進捗 */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "8px 0 10px" }}>
          <span style={{ fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,.55)" }}>{idx + 1}/{items.length}</span>
          <div style={{ flex: 1, display: "flex", gap: 3 }}>
            {items.map((_, i) => (
              <span key={i} style={{ flex: 1, height: 8, borderRadius: 3, background: i < idx ? "linear-gradient(180deg,#818cf8,#6366f1)" : "rgba(255,255,255,.08)" }} />
            ))}
          </div>
        </div>

        <CharBubble text="これ、わかるかな？" avatar={player.avatar} />
        <div style={{ margin: "8px 0 6px", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.55)" }}>{it.unit.emoji ? it.unit.emoji + " " : ""}{it.unit.name}</div>

        <div className="glass" style={{ padding: 20, textAlign: "center" }}>
          <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: 0.5, marginBottom: 16 }}>
            <QuestionText text={it.problem.q} furigana={!!player.furigana} readAloud={!!player.readAloud} />
          </div>
          <div className="choices-grid">
            {it.choices.map((c, i) => (
              <button key={i} className="choice-btn" data-sfx="none" onClick={() => answer(c)}><MathText>{c}</MathText></button>
            ))}
          </div>
          <button data-sfx="none" onClick={() => answer("__skip__")} style={{ marginTop: 14, padding: "9px 16px", borderRadius: 10, border: "1px dashed rgba(255,255,255,.25)", background: "transparent", color: "rgba(255,255,255,.6)", fontWeight: 700, cursor: "pointer", fontSize: 12 }}>
            わからない・とばす
          </button>
        </div>
      </div>
    </div>
  );
}
