// ============================================================
// Decorations.jsx — 演出と背景装飾のまとめ
//   BigWord      … 「START!」「終了！」などの大きな文字オーバーレイ
//   MathBackdrop … メニュー用の背景（ふんわり光る玉＋ただよう数学記号）
//   StarField    … 星空（バトル用）
// ============================================================
import { useEffect, useMemo } from "react";

/** 画面中央に大きな文字を一瞬出す。duration後に onDone を呼ぶ。 */
export function BigWord({ text, color = "#ffffff", onDone, duration = 1100 }) {
  useEffect(() => {
    const t = setTimeout(() => onDone && onDone(), duration);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line
  return (
    <div className="bigword-overlay">
      <div className="bigword" style={{ color }}>{text}</div>
    </div>
  );
}

const SYMBOLS = ["＋", "−", "×", "÷", "√", "π", "∞", "≠", "△", "□", "％", "∑", "°", "½", "x", "y"];

/** メニューなどの背景装飾（数学記号＋ぼかし玉） */
export function MathBackdrop() {
  const syms = useMemo(
    () => Array.from({ length: 16 }, (_, i) => ({
      ch: SYMBOLS[i % SYMBOLS.length],
      top: Math.random() * 100,
      left: Math.random() * 100,
      size: 18 + Math.random() * 40,
      d: (3 + Math.random() * 4).toFixed(1),
      delay: (Math.random() * 3).toFixed(1),
    })),
    []
  );
  const blobs = [
    { c: "#6366f1", t: 8, l: 6, s: 240 },
    { c: "#a855f7", t: 58, l: 68, s: 280 },
    { c: "#14b8a6", t: 78, l: 12, s: 220 },
    { c: "#f472b6", t: 22, l: 78, s: 200 },
  ];
  return (
    <div className="deco-layer">
      {blobs.map((b, i) => (
        <div key={i} className="deco-blob" style={{ background: b.c, top: b.t + "%", left: b.l + "%", width: b.s, height: b.s }} />
      ))}
      {syms.map((s, i) => (
        <span key={i} className="deco-sym" style={{ top: s.top + "%", left: s.left + "%", fontSize: s.size, "--d": s.d + "s", animationDelay: s.delay + "s" }}>{s.ch}</span>
      ))}
    </div>
  );
}

/** 星空（バトル背景用） */
export function StarField({ count = 55 }) {
  const stars = useMemo(
    () => Array.from({ length: count }, () => ({
      sz: Math.random() * 2.2 + 0.5,
      top: Math.random() * 92,
      left: Math.random() * 100,
      d: (Math.random() * 2 + 1).toFixed(1),
      delay: (Math.random() * 3).toFixed(1),
    })),
    [count]
  );
  return (
    <div className="battle-stars">
      {stars.map((s, i) => (
        <div key={i} className="bstar" style={{ width: s.sz, height: s.sz, top: s.top + "%", left: s.left + "%", "--d": s.d + "s", animationDelay: s.delay + "s" }} />
      ))}
    </div>
  );
}
