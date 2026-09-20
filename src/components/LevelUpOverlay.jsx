// ============================================================
// LevelUpOverlay.jsx — レベルアップ時の全画面演出
//  紙吹雪＋「LEVEL UP!」＋新しいレベル/称号を表示。約2.4秒で自動的に閉じる。
// ============================================================
import { useEffect, useMemo } from "react";
import { levelTitle, levelColor } from "../engine/scoring.js";

const CONFETTI = ["#fbbf24", "#4ade80", "#60a5fa", "#f472b6", "#a855f7", "#34d399"];

export default function LevelUpOverlay({ level, onDone }) {
  useEffect(() => {
    const t = setTimeout(() => onDone && onDone(), 2400);
    return () => clearTimeout(t);
  }, [onDone]);

  const pieces = useMemo(
    () => Array.from({ length: 60 }, (_, i) => ({
      left: Math.random() * 100,
      delay: Math.random() * 0.6,
      dur: 1.4 + Math.random() * 1.2,
      size: 7 + Math.random() * 8,
      color: CONFETTI[i % CONFETTI.length],
      rot: Math.random() * 360,
    })),
    []
  );

  return (
    <div className="lvup-overlay">
      <div className="lvup-confetti">
        {pieces.map((p, i) => (
          <span key={i} style={{
            left: p.left + "%", width: p.size, height: p.size * 0.6, background: p.color,
            animationDelay: p.delay + "s", animationDuration: p.dur + "s", transform: `rotate(${p.rot}deg)`,
          }} />
        ))}
      </div>
      <div className="lvup-box">
        <div className="lvup-burst">⭐</div>
        <div className="lvup-title">LEVEL UP!</div>
        <div className="lvup-lv" style={{ color: levelColor(level) }}>Lv.{level}</div>
        <div className="lvup-name">{levelTitle(level)} になった！</div>
      </div>
    </div>
  );
}
