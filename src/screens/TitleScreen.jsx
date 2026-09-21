// ============================================================
// TitleScreen.jsx — タイトル画面（背景：title-bg.jpg のファンタジー数学アート）
//  ・背景画像をフルブリードで表示。画像中央の光のリング＋三角定規を主役にする。
//  ・上に「数学ラボ」、下（祭壇のあたり）に「はじめる」等を配置。読みやすさ用スクリム付き。
//  ・画像にすでに数式・図形が多いので、装飾の動きは控えめ（淡い浮遊シンボル＋きらめき）。
//  ・タイトル文字を5回すばやくタップで管理用モード（隠しコマンド）。
// ============================================================
import { useEffect, useRef, useState } from "react";
import * as bgm from "../audio/bgm.js";
import { getFxSpeed, prefersReducedMotion } from "../engine/fxSpeed.js";

const GLYPHS = [
  { c: "π", x: "7%", y: "21%", d: 0 }, { c: "∑", x: "89%", y: "27%", d: 1.2 },
  { c: "√", x: "10%", y: "67%", d: 2 }, { c: "∞", x: "88%", y: "69%", d: .7 },
];

export default function TitleScreen({ onEnter, onAdmin, onHowTo, onCharacter }) {
  const tapRef = useRef({ n: 0, t: 0 });
  const holdRef = useRef(null);
  const speedRef = useRef(getFxSpeed());
  const [complete, setComplete] = useState(() => speedRef.current === "off" || prefersReducedMotion());
  const finishRef = useRef(null);
  useEffect(() => {
    bgm.play("op");
    const speed = speedRef.current;
    if (speed !== "off" && !prefersReducedMotion()) {
      finishRef.current = setTimeout(() => setComplete(true), speed === "fast" ? 1500 : 3000);
    }
    return () => { clearTimeout(holdRef.current); clearTimeout(finishRef.current); };
  }, []);
  function secretTap() {
    const now = Date.now();
    const s = tapRef.current;
    s.n = now - s.t < 800 ? s.n + 1 : 1;
    s.t = now;
    if (s.n >= 5) { s.n = 0; onAdmin?.(); }
  }

  function beginHold() { holdRef.current = setTimeout(() => { tapRef.current.n = 0; onAdmin?.(); }, 1100); }
  function endHold() { clearTimeout(holdRef.current); holdRef.current = null; }
  function skipIntro(e) {
    if (complete || e.target.closest("button, .title-lockup")) return;
    clearTimeout(finishRef.current);
    setComplete(true);
  }
  return <div className={`app title-art title-speed-${speedRef.current} ${complete ? "title-ready" : "title-entering"}`} onPointerDown={skipIntro}>
    <div className="title-whiteout" aria-hidden />
    <div className="title-sky" aria-hidden /><div className="title-vignette" aria-hidden />
    <div className="title-sigil" aria-hidden><span>∴</span><span>△</span><span>∑</span><span>◇</span></div>
    {GLYPHS.map((g) => <span className="title-glyph" key={g.c} style={{ left: g.x, top: g.y, animationDelay: `${g.d}s` }} aria-hidden>{g.c}</span>)}
    <main className="title-stage-v4">
      <div className="title-lockup" onClick={secretTap} onPointerDown={beginHold} onPointerUp={endHold} onPointerLeave={endHold} onPointerCancel={endHold}>
        <div className="title-overline">THE ASTRAL ACADEMY PRESENTS</div><h1>MATH LABO</h1>
        <div className="title-jp"><span />数学ラボ３<span /></div><p>THE CHRONICLES OF NUMBERS</p>
      </div>
      <nav className="title-menu" aria-label="タイトルメニュー">
        <button onClick={onEnter}><span>◇</span> はじめる <span>◇</span></button>
        {onHowTo && <button onClick={onHowTo}><span>◇</span> 遊び方 <span>◇</span></button>}
        {onCharacter && <button onClick={onCharacter}><span>◇</span> キャラ <span>◇</span></button>}
      </nav><div className="title-audio-note">SOUND ON　·　音楽が流れます</div>
      {!complete && <div className="title-skip-note">TAP OUTSIDE THE TITLE TO SKIP</div>}
    </main>
  </div>;
}
