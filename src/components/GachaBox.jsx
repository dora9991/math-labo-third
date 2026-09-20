// ============================================================
// GachaBox.jsx — ショップ内のガチャ＆コレクション図鑑
//  ・「ガチャを引く」を押すとガチャマシンが登場
//  ・「回す」を押すとノブが回り、マシンが揺れ、カプセルが出てきて
//    ピカーンと光って GET! 演出。手に入れた装備は図鑑に記録される。
//  ・装備は1つずつ装備してバトル（攻撃力・最大HP）を強化できる。
// ============================================================
import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { GEAR, GEAR_RARITY, GACHA_COST, gearOfType, defaultGacha, gearSpecialText } from "../engine/gear.js";

// ガチャマシンのドーム内に飾るカプセル（見た目だけ）
const DOME_CAPS = [
  { x: 16, y: 58, col: "#f87171" }, { x: 52, y: 26, col: "#60a5fa" }, { x: 92, y: 38, col: "#fbbf24" },
  { x: 22, y: 98, col: "#34d399" }, { x: 68, y: 84, col: "#c084fc" }, { x: 104, y: 96, col: "#f472b6" },
];

const btnGo = {
  padding: "12px 18px", borderRadius: 12, border: "none", cursor: "pointer",
  fontSize: 15, fontWeight: 900, color: "#fff", background: "linear-gradient(135deg,#a855f7,#ec4899)",
};
const btnGhost = {
  padding: "12px 16px", borderRadius: 12, border: "1px solid rgba(255,255,255,.25)",
  background: "rgba(255,255,255,.08)", color: "#fff", fontWeight: 800, fontSize: 13, cursor: "pointer",
};

export default function GachaBox({ player, onPull, onEquip }) {
  const coins = player.coins ?? 0;
  const g = defaultGacha(player.gacha);
  const owned = g.owned || {};
  const afford = coins >= GACHA_COST;

  const [stage, setStage] = useState(null);   // null | machine | spin | flash | done
  const [reveal, setReveal] = useState(null);  // 当たった装備
  const [pullType, setPullType] = useState("weapon"); // 引いているガチャの種類（武器/防具）
  const timers = useRef([]);
  const clearTimers = () => { timers.current.forEach(clearTimeout); timers.current = []; };
  useEffect(() => () => clearTimers(), []);

  function open(type) {
    if (!afford) return;
    clearTimers();
    setPullType(type);
    setReveal(null);
    setStage("machine");
  }
  function spin() {
    const gear = onPull?.(pullType);
    if (!gear) { setStage(null); return; } // コイン不足など
    clearTimers();
    setReveal(gear);
    setStage("spin");
    timers.current.push(setTimeout(() => setStage("flash"), 1550));
    timers.current.push(setTimeout(() => setStage("done"), 2050));
  }
  function close() { clearTimers(); setStage(null); setReveal(null); }

  const collected = GEAR.filter((g) => owned[g.id] > 0).length;

  return (
    <div className="glass" style={{ padding: "12px 14px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 900, color: "#fff" }}>🎁 装備ガチャ</div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,.5)" }}>図鑑 {collected}/{GEAR.length}</div>
      </div>
      <div style={{ fontSize: 11, color: "rgba(255,255,255,.55)", lineHeight: 1.6, marginBottom: 10 }}>
        武器ガチャ（攻撃力アップ）と防具ガチャ（最大HPアップ）に分かれています。ほしい方を選んで引こう。
        <b style={{ color: "#fbbf24" }}>ウルトラレアは1/20</b>！集めて装備しよう。
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <button onClick={() => open("weapon")} disabled={!afford} data-sfx="none"
          style={{
            padding: "12px 8px", borderRadius: 12, border: "none",
            cursor: !afford ? "not-allowed" : "pointer", fontSize: 14, fontWeight: 900, color: "#fff",
            background: !afford ? "rgba(255,255,255,.12)" : "linear-gradient(135deg,#ef4444,#f97316)",
          }}>
          ⚔️ 武器ガチャ<br /><span style={{ fontSize: 11, opacity: .9 }}>💰{GACHA_COST}</span>
        </button>
        <button onClick={() => open("armor")} disabled={!afford} data-sfx="none"
          style={{
            padding: "12px 8px", borderRadius: 12, border: "none",
            cursor: !afford ? "not-allowed" : "pointer", fontSize: 14, fontWeight: 900, color: "#fff",
            background: !afford ? "rgba(255,255,255,.12)" : "linear-gradient(135deg,#3b82f6,#06b6d4)",
          }}>
          🛡️ 防具ガチャ<br /><span style={{ fontSize: 11, opacity: .9 }}>💰{GACHA_COST}</span>
        </button>
      </div>
      {!afford && (
        <div style={{ fontSize: 11, color: "#fca5a5", fontWeight: 800, textAlign: "center", marginTop: 6 }}>
          コインが足りない（💰{GACHA_COST}）
        </div>
      )}

      {/* 図鑑（武器・防具ごと） */}
      {["weapon", "armor"].map((type) => (
        <div key={type} style={{ marginTop: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,.5)", marginBottom: 6 }}>
            {type === "weapon" ? "⚔️ 武器（攻撃力）" : "🛡️ 防具（最大HP）"}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
            {gearOfType(type).map((item) => {
              const has = (owned[item.id] || 0) > 0;
              const equipped = g[type] === item.id;
              const rar = GEAR_RARITY[item.rarity];
              return (
                <div key={item.id} style={{
                  padding: "8px 9px", borderRadius: 10, background: "rgba(255,255,255,.05)",
                  border: `1px solid ${has ? rar.color + "66" : "rgba(255,255,255,.08)"}`, opacity: has ? 1 : 0.55,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 18, filter: has ? "none" : "grayscale(1) brightness(.6)" }}>{has ? item.icon : "❓"}</span>
                    <span style={{ fontSize: 8.5, fontWeight: 800, color: rar.color, background: "rgba(255,255,255,.06)", padding: "1px 5px", borderRadius: 6 }}>{rar.label}</span>
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: "#fff", marginTop: 4 }}>{has ? item.name : "？？？"}</div>
                  <div style={{ fontSize: 10, color: rar.color, fontWeight: 700 }}>
                    {type === "weapon" ? "攻撃" : "HP"} {has ? `+${Math.round(item.pct * 100)}%` : "+？？？"}{has && owned[item.id] > 1 ? ` ×${owned[item.id]}` : ""}
                  </div>
                  {has && item.special && (
                    <div style={{ fontSize: 8.5, color: "#fde047", fontWeight: 800, marginTop: 2, lineHeight: 1.3 }}>{gearSpecialText(item)}</div>
                  )}
                  {has && (
                    <button onClick={() => onEquip?.(type, equipped ? null : item.id)} data-sfx="none"
                      style={{
                        width: "100%", marginTop: 6, padding: "5px", borderRadius: 8, border: "none", cursor: "pointer",
                        fontSize: 10.5, fontWeight: 900, color: "#fff",
                        background: equipped ? "#16a34a" : "rgba(255,255,255,.14)",
                      }}>
                      {equipped ? "✓ 装備中" : "装備する"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* ===== ガチャ演出オーバーレイ（body直下に出して全画面で表示） ===== */}
      {stage && createPortal(
        <div className="gacha-ov" onClick={stage === "done" ? close : undefined}>
          <div className="gacha-stage" onClick={(e) => e.stopPropagation()}>
            {/* マシン */}
            <div className={"gacha-machine" + (stage === "spin" ? " shaking" : "")}>
              <div className="gm-dome">
                {DOME_CAPS.map((c, i) => (
                  <span key={i} className="gm-cap" style={{ left: c.x, top: c.y, background: c.col }} />
                ))}
              </div>
              <div className="gm-neck" />
              <div className="gm-body">
                <div className={"gm-knob" + (stage === "spin" ? " spin" : "")} />
                <div className="gm-slot" />
              </div>
            </div>

            {/* 出てくるカプセル（中身はまだ秘密。レアリティ色だけ見える） */}
            {stage === "spin" && reveal && (
              <div className="gacha-capsule drop"
                style={{ background: `linear-gradient(to bottom, #fff 0 50%, ${reveal.color} 50% 100%)` }} />
            )}

            {/* ピカーン */}
            {(stage === "flash" || stage === "done") && (<><div className="gacha-rays" /><div className="gacha-burst" /></>)}

            {/* GET! */}
            {stage === "done" && reveal && (
              <div className="gacha-get">
                <div style={{ fontSize: 13, fontWeight: 900, color: reveal.color, letterSpacing: 3 }}>{GEAR_RARITY[reveal.rarity].label} GET!</div>
                <div className="gacha-get-icon">{reveal.icon}</div>
                <div style={{ fontSize: 20, fontWeight: 900, color: "#fff" }}>{reveal.name}</div>
                <div style={{ fontSize: 12, fontWeight: 800, color: reveal.color, marginTop: 3 }}>
                  {reveal.type === "weapon" ? "攻撃力" : "最大HP"} +{Math.round(reveal.pct * 100)}%
                </div>
                {reveal.special && (
                  <div style={{ fontSize: 11, fontWeight: 800, color: "#fde047", marginTop: 3 }}>{gearSpecialText(reveal)}</div>
                )}
              </div>
            )}

            {/* 操作ボタン */}
            <div style={{ position: "relative", zIndex: 6, width: "100%", display: "flex", gap: 8, justifyContent: "center", marginTop: 16 }}>
              {stage === "machine" && (<>
                <button onClick={close} data-sfx="none" style={btnGhost}>やめる</button>
                <button onClick={spin} data-sfx="none" style={btnGo}>{pullType === "weapon" ? "⚔️ 武器ガチャを回す" : "🛡️ 防具ガチャを回す"}（💰{GACHA_COST}）</button>
              </>)}
              {stage === "done" && (<>
                <button onClick={close} data-sfx="none" style={btnGhost}>とじる</button>
                {coins >= GACHA_COST && <button onClick={spin} data-sfx="none" style={btnGo}>🔄 もう一回（💰{GACHA_COST}）</button>}
              </>)}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
