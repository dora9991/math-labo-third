// AlarmOverlay.jsx — アラーム（設定で決めた分数がたった時）。どの画面でも最前面に出て、音を繰り返し鳴らす。
import { useEffect } from "react";
import * as sfx from "../../audio/sfx.js";

export default function AlarmOverlay({ minutes, onStop }) {
  useEffect(() => {
    const ring = () => { try { sfx.levelUp(); } catch { /* 音が出せない環境では無視 */ } };
    ring();
    const id = setInterval(ring, 2500);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="menu-alarm-overlay">
      <div className="glass menu-alarm-card" style={{ maxWidth: 340, width: "100%", padding: "28px 22px", textAlign: "center" }}>
        <div className="menu-alarm-sigil" aria-hidden>⌛</div>
        <div className="menu-alarm-title">{minutes}分たったよ！</div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,.8)", lineHeight: 1.7, marginBottom: 16 }}>ここまでよくがんばったね。<br />すこし休けいしよう。</div>
        <button onClick={onStop} style={{ width: "100%", padding: 14, borderRadius: 14, border: "none", fontSize: 16, fontWeight: 900, color: "#3a2a00", background: "linear-gradient(135deg,#fde047,#f59e0b)", cursor: "pointer" }}>アラームをとめる</button>
      </div>
    </div>
  );
}
