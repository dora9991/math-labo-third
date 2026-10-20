import { useEffect, useRef, useState } from "react";
import { fxScale, getFxSpeed, prefersReducedMotion } from "../engine/fxSpeed.js";

// 主人公と敵のDOM座標を使う、プレイヤー側攻撃専用の軽量エフェクト。
// `attack.id` を更新すると再生し、着弾フレームで onImpact を一度だけ呼ぶ。
export default function AttackOrbFx({ attack, sourceRef, targetRef, onImpact, fxSpeed }) {
  const [fx, setFx] = useState(null);
  const timers = useRef([]);
  const impactRef = useRef(onImpact);
  impactRef.current = onImpact;

  useEffect(() => () => {
    timers.current.forEach(clearTimeout);
    document.documentElement.classList.remove("attack-impact-shake");
  }, []);

  useEffect(() => {
    if (!attack?.id || !sourceRef.current || !targetRef.current) return;
    timers.current.forEach(clearTimeout);
    const source = sourceRef.current.getBoundingClientRect();
    const target = targetRef.current.getBoundingClientRect();
    const start = { x: source.left + source.width * 0.68, y: source.top + source.height * 0.38 };
    const end = { x: target.left + target.width * 0.5, y: target.top + target.height * 0.42 };
    const speed = prefersReducedMotion() ? "off" : (fxSpeed || getFxSpeed());
    const reduced = speed === "off";
    const scale = fxScale(speed);
    const next = { ...attack, start, end, dx: end.x - start.x, dy: end.y - start.y, reduced, speed, scale };
    setFx(next);
    const impact = () => {
      document.documentElement.classList.add("attack-impact-shake");
      impactRef.current?.(attack.id);
      setFx((current) => current?.id === attack.id ? { ...current, impact: true } : current);
    };
    timers.current = [
      setTimeout(impact, reduced ? 55 : Math.round(830 * scale)),
      setTimeout(() => {
        document.documentElement.classList.remove("attack-impact-shake");
        setFx((current) => current?.id === attack.id ? null : current);
      }, reduced ? 180 : Math.round(1420 * scale)),
    ];
  }, [attack, sourceRef, targetRef]);

  if (!fx) return null;
  const symbols = ["π", "∑", "√", "∞"];
  const sparks = Array.from({ length: fx.strong ? 18 : 12 }, (_, i) => i);
  return (
    <div className={`attack-orb-fx${fx.strong ? " strong" : ""}${fx.reduced ? " reduced" : ""}`} style={{ "--fx-scale": fx.scale }} aria-hidden="true">
      {!fx.reduced && <div className="orb-charge" style={{ left: fx.start.x, top: fx.start.y }}>
        <i /><i /><i />
      </div>}
      {!fx.reduced && <div className="attack-orb" style={{ left: fx.start.x, top: fx.start.y, "--dx": `${fx.dx}px`, "--dy": `${fx.dy}px`, "--arc": `${Math.min(-34, fx.dy - 36)}px` }}>
        <b className="orb-core" /><b className="orb-ring ring-a" /><b className="orb-ring ring-b" />
        <span className="orb-trail" />
        {symbols.map((symbol, i) => <em key={symbol} style={{ "--i": i }}>{symbol}</em>)}
      </div>}
      {fx.impact && <>
        <div className="orb-white-flash" />
        {!fx.reduced && <div className="orb-impact" style={{ left: fx.end.x, top: fx.end.y }}>
          <i className="shock one" /><i className="shock two" />
          <i className="impact-rays" />
          {sparks.map((i) => <b key={i} className="orb-spark" style={{ "--a": `${i * (360 / sparks.length)}deg`, "--d": `${34 + (i % 5) * 13}px`, "--delay": `${(i % 4) * 18}ms` }} />)}
        </div>}
      </>}
    </div>
  );
}
