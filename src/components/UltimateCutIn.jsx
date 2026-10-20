import { useEffect, useRef } from "react";
import HeroImg from "./HeroImg.jsx";
import { cutInDuration } from "../engine/fxSpeed.js";
import "./UltimateCutIn.css";

// onComplete は一度だけ呼ぶ。クリック/タップは攻撃を止めず、演出だけを短縮する。
export default function UltimateCutIn({ ultimate, heroSrc, speed = "normal", onComplete }) {
  const done = useRef(false);
  const finish = () => {
    if (done.current) return;
    done.current = true;
    onComplete?.();
  };

  useEffect(() => {
    const duration = cutInDuration(speed);
    if (!duration) { finish(); return undefined; }
    const timer = window.setTimeout(finish, duration);
    return () => window.clearTimeout(timer);
  }, [speed]); // このコンポーネントは必殺技ごとに key で作り直す

  if (speed === "off") return null;
  return (
    <button type="button" className={`ultimate-cutin fx-${speed}`} onClick={finish} aria-label="必殺技演出をスキップ">
      <span className="ultimate-cutin__shade" />
      <span className="ultimate-cutin__rays" />
      <span className="ultimate-cutin__beam" style={{ "--ult-color": ultimate.color || "#f472b6" }} />
      <span className="ultimate-cutin__particles" aria-hidden="true">✦　·　✧　·　✦</span>
      {heroSrc && <HeroImg src={heroSrc} alt="" className="ultimate-cutin__hero" />}
      <span className="ultimate-cutin__words">
        <b>{ultimate.icon}</b><strong>{ultimate.name}</strong><em>いくよ！</em>
      </span>
      <span className="ultimate-cutin__skip">タップでスキップ</span>
    </button>
  );
}
