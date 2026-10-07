// ============================================================
// HypeFx.jsx — 新バトル(ThirdBattle)の「派手さ」担当（2026-10-07）。見た目だけの部品。
//  生徒のご意見「技名」「もっと動きがほしい」と、kazuの「エフェクトの派手な演出を」への対応。
//
//  ・ThirdBattle の舞台(.mw-battle-stage)の中に重ねる、操作を邪魔しないDOMの層（pointer-events:none）。
//    PixiのBattleFXとは別物。ダメージ・HP・出題・報酬・敵の行動には一切さわらない。
//  ・ref から呼ぶ：
//      move({ name, icon, finisher })   通常こうげきの技名（連続正解・とどめは「奥義」）
//      hardIntro()                      激ムズ突入の演出（暗赤の縁取り＋「激ムズ突入！」）
//      kill({ boss })                   撃破フィニッシュ（金のフラッシュ＋「撃破！」）
//      flash(kind)                      フラッシュだけ（"soft" | "gold" | "red"）
//      shake(strength)                  舞台をゆらす（"small" | "big"）
//  ・演出の速さ設定(speed)に従う：normal=そのまま／fast=半分の長さ／off=何も出さない。
//    OSの「視差効果を減らす」はfxSpeed側で"off"になるので、ここでも自動的に止まる。
//  ・HardModeChip … 舞台の左上に出す小さなON/OFFボタン。最初の解答まではタップで切り替え、
//    そのあとは固定（ONなら🔥バッジだけ残る）。
// ============================================================
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import "./hypeFx.css";

const MAX_ITEMS = 6;

/** 舞台のDOM要素を、Web Animations APIで短くゆらす（CSSクラスの付け外しをしないので他の演出と衝突しない）。 */
function shakeElement(el, strength, k) {
  if (!el || typeof el.animate !== "function") return;
  const a = strength === "big" ? 9 : 4;
  try {
    el.animate(
      [
        { transform: "translate(0,0)" },
        { transform: `translate(${-a}px, ${a * 0.4}px)` },
        { transform: `translate(${a}px, ${-a * 0.5}px)` },
        { transform: `translate(${-a * 0.7}px, ${-a * 0.3}px)` },
        { transform: `translate(${a * 0.5}px, ${a * 0.3}px)` },
        { transform: "translate(0,0)" },
      ],
      { duration: Math.round((strength === "big" ? 380 : 240) * k), easing: "ease-out" },
    );
  } catch { /* ゆれなくても進行には影響しない */ }
}

const HypeFx = forwardRef(function HypeFx({ speed = "normal", targetRef }, ref) {
  const [items, setItems] = useState([]);
  const idRef = useRef(0);
  const timersRef = useRef(new Set());
  const speedRef = useRef(speed);
  speedRef.current = speed;

  useEffect(() => () => {
    timersRef.current.forEach((t) => window.clearTimeout(t));
    timersRef.current.clear();
  }, []);

  const k = () => (speedRef.current === "fast" ? 0.5 : 1);

  const push = useCallback((item, ms) => {
    if (speedRef.current === "off") return;
    const id = ++idRef.current;
    const life = Math.round(ms * k());
    setItems((prev) => [...prev.slice(-(MAX_ITEMS - 1)), { ...item, id, life }]);
    const t = window.setTimeout(() => {
      timersRef.current.delete(t);
      setItems((prev) => prev.filter((x) => x.id !== id));
    }, life + 60);
    timersRef.current.add(t);
  }, []);

  useImperativeHandle(ref, () => ({
    move({ name, icon, finisher = false } = {}) {
      if (!name) return;
      // 技名は前のものを置き換える（連打で積み重ならない）
      setItems((prev) => prev.filter((x) => x.type !== "move"));
      push({ type: "move", name, icon, finisher }, finisher ? 1150 : 760);
      if (finisher) { push({ type: "flash", kind: "gold" }, 340); push({ type: "slash" }, 520); }
    },
    hardIntro() {
      push({ type: "hard" }, 1700);
      push({ type: "flash", kind: "red" }, 420);
      shakeElement(targetRef?.current, "big", k());
    },
    kill({ boss = false } = {}) {
      push({ type: "kill", boss }, boss ? 1300 : 900);
      if (boss) push({ type: "flash", kind: "gold" }, 520); // ふつうの撃破の金の光はBattleFX側(playDefeat)にあるので、重ねない
      shakeElement(targetRef?.current, boss ? "big" : "small", k());
    },
    flash(kind = "soft") { push({ type: "flash", kind }, 300); },
    shake(strength = "small") { if (speedRef.current !== "off") shakeElement(targetRef?.current, strength, k()); },
  }), [push, targetRef]);

  return (
    <div className="mw-hype" aria-hidden="true" style={{ "--hype-k": speed === "fast" ? 0.5 : 1 }}>
      {items.map((it) => {
        const style = { animationDuration: `${it.life}ms` };
        if (it.type === "flash") return <div key={it.id} className={`mw-hype-flash is-${it.kind}`} style={style} />;
        if (it.type === "slash") return <div key={it.id} className="mw-hype-slash" style={style}><i /><i /></div>;
        if (it.type === "move") {
          return (
            <div key={it.id} className={`mw-hype-move ${it.finisher ? "is-finisher" : ""}`} style={style}>
              {it.finisher && <span className="mw-hype-tag">奥義</span>}
              <span className="mw-hype-name">{it.icon ? `${it.icon} ` : ""}{it.name}</span>
            </div>
          );
        }
        if (it.type === "hard") {
          return (
            <div key={it.id} className="mw-hype-hard" style={style}>
              <div className="mw-hype-hard-vignette" />
              <div className="mw-hype-hard-banner">
                <span className="mw-hype-hard-title">🔥 激ムズ突入！</span>
                <span className="mw-hype-hard-sub">こうげき ½ ／ 敵のこうげき ×1.25</span>
              </div>
            </div>
          );
        }
        if (it.type === "kill") {
          return <div key={it.id} className={`mw-hype-kill ${it.boss ? "is-boss" : ""}`} style={style}>{it.boss ? "BOSS 撃破！" : "撃破！"}</div>;
        }
        return null;
      })}
    </div>
  );
});

export default HypeFx;

/**
 * 舞台の左上の「🔥 激ムズ」ボタン。
 *  locked=false … ON/OFFをタップで切り替え（バトルが始まる前だけ）。
 *  locked=true  … ONなら🔥バッジだけ表示（切り替え不可）。OFFなら何も出さない。
 */
export function HardModeChip({ on, locked, onToggle }) {
  if (locked) return on ? <div className="mw-hard-chip is-on is-locked" title="激ムズモード中">🔥 激ムズ</div> : null;
  return (
    <button
      type="button"
      className={`mw-hard-chip ${on ? "is-on" : ""}`}
      aria-pressed={on}
      onClick={() => onToggle(!on)}
      title="こうげき½・敵のこうげき×1.25（最初の解答まで切りかえできます）"
    >
      <span className="mw-hard-chip-dot" />
      🔥 激ムズ {on ? "ON" : "OFF"}
    </button>
  );
}
