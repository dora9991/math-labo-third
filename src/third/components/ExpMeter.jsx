// ExpMeter.jsx — バトル後の経験値メーター。もらった経験値ぶん、メーターが増えていく。
// レベルが上がるたびにレベルアップ音が鳴り、メーターの右に「レベルアップ！」が出る。余りがあればそのままメーターが動き続け、もらった分で止まる。
import { useEffect, useRef, useState } from "react";
import { expProgress } from "../expCurve.js";
import { playLevelUpSound } from "../fx/sound.js";
import MonsterPortrait from "./MonsterPortrait.jsx";
import "./expMeter.css";

let lastUpSound = 0; // 5人が同時にレベルアップしても、音は重ならないようにする
const upSound = () => { const t = performance.now(); if (t - lastUpSound > 250) { lastUpSound = t; playLevelUpSound(); } };

/** @param {{character:object, from:number, to:number, delay?:number}} p */
export default function ExpMeter({ character, from, to, delay = 0 }) {
  const gain = Math.max(0, to - from);
  const [cur, setCur] = useState(from);
  const [ups, setUps] = useState(0);
  const lvRef = useRef(expProgress(from, character.rarity).level);
  useEffect(() => {
    if (!gain) return undefined;
    const dur = Math.min(3200, 1100 + gain * 6); // たくさんもらうほど少し長く動く
    let raf = 0, t0 = 0;
    const tick = (now) => {
      if (!t0) t0 = now;
      const k = Math.min(1, (now - t0) / dur);
      const v = from + gain * k; // 一定の速さで増やす
      const lv = expProgress(v, character.rarity).level;
      if (lv > lvRef.current) { const d = lv - lvRef.current; lvRef.current = lv; setUps((n) => n + d); upSound(); }
      setCur(v);
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    const timer = setTimeout(() => { raf = requestAnimationFrame(tick); }, delay);
    return () => { clearTimeout(timer); cancelAnimationFrame(raf); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const p = expProgress(Math.round(cur), character.rarity);
  const pct = p.isMax ? 100 : Math.min(100, (p.current / p.need) * 100);
  return (
    <div className={`xm-row ${ups ? "is-up" : ""}`}>
      <div className="xm-face"><MonsterPortrait character={character} size="small" /></div>
      <div className="xm-main">
        <div className="xm-top">
          <span className="xm-name">{character.name}</span>
          <span className="xm-lv">Lv.{p.level}</span>
          <span className="xm-gain">+{gain} EXP</span>
        </div>
        <div className="xm-barwrap">
          <div className={`xm-bar ${p.isMax ? "is-max" : ""}`}><div className="xm-fill" style={{ width: `${pct}%` }} /></div>
          {ups > 0 && <span className="xm-lvup">レベルアップ！</span>}
        </div>
        <div className="xm-sub">{p.isMax ? "レベルMAX" : `次のレベルまで あと ${p.need - p.current}`}</div>
      </div>
    </div>
  );
}
