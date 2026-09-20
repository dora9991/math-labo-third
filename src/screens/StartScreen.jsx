// ============================================================
// StartScreen.jsx — 一番最初の画面。「ゲームスタート」を押すと
//  音声が解禁され、オープニング映像へ進む。
// ============================================================
import { MathBackdrop } from "../components/Decorations.jsx";
import * as bgm from "../audio/bgm.js";
import * as sfx from "../audio/sfx.js";

export default function StartScreen({ onStart }) {
  function handleStart() {
    bgm.unlock();      // ユーザー操作で音声解禁
    sfx.unlock();      // 効果音も解禁
    sfx.confirm();     // ピッという決定音
    // OP曲はオープニング映像と被るのでここでは鳴らさない（映像のあと、タイトルで再生）。
    onStart();         // オープニング映像へ
  }
  return (
    <div className="app" style={{ alignItems: "center", justifyContent: "center" }}>
      <MathBackdrop />
      <div style={{ position: "relative", zIndex: 1, textAlign: "center", padding: 24 }}>
        <div style={{ fontSize: 56, marginBottom: 6 }}>📐</div>
        <div style={{ fontFamily: "'M PLUS Rounded 1c',sans-serif", fontSize: 40, fontWeight: 900, background: "linear-gradient(90deg,#818cf8,#c084fc,#38bdf8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: 2 }}>
          数学ラボ2
        </div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,.5)", marginTop: 6, marginBottom: 30 }}>MATH LAB</div>
        <button
          onClick={handleStart}
          style={{
            border: "none", borderRadius: 16, padding: "16px 40px", cursor: "pointer",
            fontFamily: "'M PLUS Rounded 1c',sans-serif", fontSize: 20, fontWeight: 900, color: "#fff",
            background: "linear-gradient(135deg,#4f46e5,#7c3aed)", boxShadow: "0 10px 30px rgba(124,58,237,.5)",
            animation: "startPulse 1.6s ease-in-out infinite",
          }}
        >
          ▶ ゲームスタート
        </button>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,.35)", marginTop: 16 }}>♪ 押すと音楽が流れます</div>
      </div>
    </div>
  );
}
