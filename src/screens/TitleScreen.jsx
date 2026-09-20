// ============================================================
// TitleScreen.jsx — タイトル画面（背景：title-bg.jpg のファンタジー数学アート）
//  ・背景画像をフルブリードで表示。画像中央の光のリング＋三角定規を主役にする。
//  ・上に「数学ラボ」、下（祭壇のあたり）に「はじめる」等を配置。読みやすさ用スクリム付き。
//  ・画像にすでに数式・図形が多いので、装飾の動きは控えめ（淡い浮遊シンボル＋きらめき）。
//  ・タイトル文字を5回すばやくタップで管理用モード（隠しコマンド）。
// ============================================================
import { useEffect, useRef } from "react";
import * as bgm from "../audio/bgm.js";

const BG = import.meta.env.BASE_URL + "title-bg.jpg";

// 画像のすき間（左右の暗い帯）に淡く漂わせる数式シンボル
const GLYPHS = [
  { c: "π", x: "6%", y: "20%", s: 22, d: 0 },
  { c: "∑", x: "90%", y: "30%", s: 24, d: 1.2 },
  { c: "√", x: "8%", y: "62%", s: 20, d: 2.1 },
  { c: "∞", x: "92%", y: "66%", s: 22, d: 0.6 },
  { c: "÷", x: "12%", y: "84%", s: 18, d: 1.7 },
  { c: "×", x: "88%", y: "86%", s: 18, d: 2.6 },
];
// きらめく星（明滅するだけ）
const SPARKS = [
  { x: "20%", y: "14%", d: 0 }, { x: "74%", y: "12%", d: 0.8 }, { x: "50%", y: "8%", d: 1.5 },
  { x: "30%", y: "48%", d: 0.4 }, { x: "68%", y: "52%", d: 1.1 }, { x: "84%", y: "44%", d: 2.0 },
  { x: "16%", y: "40%", d: 1.8 }, { x: "58%", y: "70%", d: 0.6 },
];

export default function TitleScreen({ onEnter, onAdmin, onHowTo, onCharacter }) {
  useEffect(() => { bgm.play("op"); }, []);

  // 隠しコマンド：タイトル文字を5回すばやくタップで管理用モードへ
  const tapRef = useRef({ n: 0, t: 0 });
  function secretTap() {
    const now = Date.now();
    const s = tapRef.current;
    s.n = now - s.t < 800 ? s.n + 1 : 1;
    s.t = now;
    if (s.n >= 5) { s.n = 0; onAdmin?.(); }
  }

  return (
    <div className="app title-art" style={{ position: "relative", overflow: "hidden", alignItems: "stretch", justifyContent: "stretch" }}>
      <style>{`
        @keyframes titleFloat { 0%,100%{ transform: translateY(0) } 50%{ transform: translateY(-7px) } }
        @keyframes titleGlow { 0%,100%{ filter: drop-shadow(0 0 10px rgba(125,211,252,.55)) } 50%{ filter: drop-shadow(0 0 22px rgba(167,139,250,.85)) } }
        @keyframes glyphDrift { 0%,100%{ transform: translateY(0) rotate(0deg); opacity:.35 } 50%{ transform: translateY(-14px) rotate(8deg); opacity:.7 } }
        @keyframes sparkTwinkle { 0%,100%{ opacity:.15; transform: scale(.7) } 50%{ opacity:.95; transform: scale(1.15) } }
        @keyframes ctaPulse { 0%,100%{ box-shadow: 0 6px 22px rgba(99,102,241,.55) } 50%{ box-shadow: 0 6px 34px rgba(167,139,250,.85) } }
      `}</style>

      {/* 背景アート */}
      <div style={{ position: "absolute", inset: 0, zIndex: 0, backgroundImage: `url(${BG})`, backgroundSize: "cover", backgroundPosition: "center top", backgroundColor: "#0a0820" }} />
      {/* 読みやすさ用スクリム（上＝タイトル下＝ボタンを少し暗く、中央のリングは見せる） */}
      <div style={{ position: "absolute", inset: 0, zIndex: 1,
        background: "linear-gradient(180deg, rgba(8,6,26,.62) 0%, rgba(8,6,26,.12) 22%, rgba(8,6,26,0) 46%, rgba(8,6,26,.35) 74%, rgba(6,4,20,.88) 100%)" }} />

      {/* 淡い浮遊シンボル */}
      {GLYPHS.map((g, i) => (
        <span key={i} aria-hidden style={{ position: "absolute", left: g.x, top: g.y, zIndex: 1, fontSize: g.s, fontWeight: 900,
          color: "rgba(186,230,253,.6)", textShadow: "0 0 10px rgba(99,102,241,.7)",
          animation: `glyphDrift ${5 + i}s ease-in-out ${g.d}s infinite`, pointerEvents: "none" }}>{g.c}</span>
      ))}
      {/* きらめく星 */}
      {SPARKS.map((p, i) => (
        <span key={"s" + i} aria-hidden style={{ position: "absolute", left: p.x, top: p.y, zIndex: 1, width: 4, height: 4, borderRadius: "50%",
          background: "#e0f2fe", boxShadow: "0 0 8px 2px rgba(186,230,253,.8)",
          animation: `sparkTwinkle ${2.4 + (i % 3) * 0.7}s ease-in-out ${p.d}s infinite`, pointerEvents: "none" }} />
      ))}

      {/* 前面コンテンツ：タイトルとボタンを画面の上下中央寄りにまとめて配置 */}
      <div style={{ position: "relative", zIndex: 2, width: "100%", maxWidth: 480, margin: "0 auto", minHeight: "100dvh",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        padding: "calc(env(safe-area-inset-top, 0px) + 30px) 22px calc(env(safe-area-inset-bottom, 0px) + 26px)" }}>

        {/* タイトル（暗いガラスのバナーを敷いて、明るい背景の上でもくっきり読める） */}
        <div onClick={secretTap} style={{ cursor: "default", userSelect: "none", textAlign: "center", animation: "titleFloat 5.5s ease-in-out infinite",
          padding: "14px 26px 16px", borderRadius: 22,
          background: "rgba(8,6,26,.42)", backdropFilter: "blur(5px)", WebkitBackdropFilter: "blur(5px)",
          border: "1px solid rgba(255,255,255,.15)", boxShadow: "0 10px 32px rgba(0,0,0,.4)" }}>
          {/* 数学ラボ：明るい単色＋黒フチ＋発光で最も視認性を優先 */}
          <div style={{ fontSize: 46, fontWeight: 900, letterSpacing: 1, color: "#f5f7ff", lineHeight: 1.1,
            WebkitTextStroke: "1.5px rgba(6,4,20,.92)", paintOrder: "stroke fill",
            textShadow: "0 2px 4px rgba(0,0,0,.95), 0 0 16px rgba(125,211,252,.7), 0 0 28px rgba(167,139,250,.55)",
            animation: "titleGlow 4s ease-in-out infinite" }}>数学ラボ2</div>
          <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: 3, color: "#cbd5ff", marginTop: 4, textShadow: "0 1px 4px rgba(0,0,0,.95)" }}>～ MATH LAB ～</div>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: "#dbeafe", marginTop: 8, textShadow: "0 1px 4px rgba(0,0,0,.95)" }}>解いて、戦って、レベルアップ！</div>
        </div>

        {/* タイトルとボタンの間の余白（背景のリングを少し見せる。固定幅にして
            両方が画面中央付近に集まるようにする） */}
        <div style={{ height: "13vh", minHeight: 70, maxHeight: 150 }} />

        {/* 下部：祭壇の上にボタン */}
        <button onClick={onEnter} style={{
          width: "100%", maxWidth: 300, padding: "15px 18px", borderRadius: 16, cursor: "pointer", border: "2px solid rgba(255,255,255,.3)",
          fontSize: 18, fontWeight: 900, color: "#fff", background: "linear-gradient(135deg,#6366f1,#a855f7)",
          animation: "ctaPulse 2.6s ease-in-out infinite" }}>▶ はじめる</button>

        <div style={{ display: "flex", gap: 10, marginTop: 12, width: "100%", maxWidth: 300 }}>
          {onHowTo && <button className="title-link" style={{ flex: 1, backdropFilter: "blur(4px)", background: "rgba(15,18,38,.55)" }} onClick={onHowTo}>📖 遊び方</button>}
          {onCharacter && <button className="title-link" style={{ flex: 1, backdropFilter: "blur(4px)", background: "rgba(15,18,38,.55)" }} onClick={onCharacter}>🎨 キャラ</button>}
        </div>

        <div style={{ fontSize: 11, color: "rgba(226,232,255,.8)", marginTop: 14, textShadow: "0 1px 6px rgba(0,0,0,.9)" }}>♪ 音楽が流れます</div>
      </div>
    </div>
  );
}
