// ============================================================
// SkillGachaBox.jsx — スキルガチャ（クリスタルで引く）
//  ・単発（💎10）と まとめ引き 11連（💎100＝10回ぶんで1回おまけ）。最低1つ R 以上を保証。
//  ・演出は装備ガチャ（GachaBox）と同じガチャマシン方式：
//      回す → カプセル排出 → ピカーン → 1枚ずつ GET! めくり。
//    11連も1枚ずつめくり（スキップ可）、最後に全結果を一覧表示。
//  ・新規は「NEW」、被りはコイン還元を表示。所持済みは下にコレクション一覧。
// ============================================================
import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { BATTLE_SKILLS, SKILL_RARITY, SKILL_GACHA_COST_1 } from "../engine/battle.js";

const RARITY_LABEL_ORDER = ["ssr", "sr", "r", "n"];
const isRare = (r) => r === "ssr" || r === "sr"; // 演出を盛るレア度

// ガチャマシンのドーム内に飾るカプセル（見た目だけ）
const DOME_CAPS = [
  { x: 16, y: 58, col: "#f87171" }, { x: 52, y: 26, col: "#60a5fa" }, { x: 92, y: 38, col: "#fbbf24" },
  { x: 22, y: 98, col: "#34d399" }, { x: 68, y: 84, col: "#c084fc" }, { x: 104, y: 96, col: "#f472b6" },
];
const btnGo = {
  padding: "12px 18px", borderRadius: 12, border: "none", cursor: "pointer",
  fontSize: 15, fontWeight: 900, color: "#fff", background: "linear-gradient(135deg,#22d3ee,#6366f1)",
};
const btnGhost = {
  padding: "12px 16px", borderRadius: 12, border: "1px solid rgba(255,255,255,.25)",
  background: "rgba(255,255,255,.08)", color: "#fff", fontWeight: 800, fontSize: 13, cursor: "pointer",
};

export default function SkillGachaBox({ player, onPull }) {
  const crystals = player.crystals ?? 0;
  const owned = new Set(player.ownedSkills || []);
  const total = BATTLE_SKILLS.length;
  const collected = BATTLE_SKILLS.filter((s) => owned.has(s.id)).length;

  const [stage, setStage] = useState(null);   // null | spin | flash | reveal | summary
  const [results, setResults] = useState(null);
  const [idx, setIdx] = useState(0);          // 今めくっている枚数（0始まり）
  const [showList, setShowList] = useState(false); // レア度一覧（図鑑）の開閉。普段は閉じておく
  const timers = useRef([]);
  const clearTimers = () => { timers.current.forEach(clearTimeout); timers.current = []; };
  useEffect(() => () => clearTimers(), []);

  // i番目をめくる：回す → ピカーン → GET! の順に演出
  function startReveal(i, list) {
    const arr = list || results || [];
    clearTimers();
    setIdx(i);
    setStage("spin");
    const rare = isRare(arr[i]?.skill?.rarity);
    timers.current.push(setTimeout(() => setStage("flash"), 1250));
    timers.current.push(setTimeout(() => setStage("reveal"), 1250 + (rare ? 760 : 430)));
  }
  function pull() {
    if (crystals < SKILL_GACHA_COST_1 || complete) return;
    const res = onPull?.();
    if (!res || !res.length) return;
    setResults(res);
    startReveal(0, res);
  }
  function next() {
    if (results && idx < results.length - 1) startReveal(idx + 1);
    else { clearTimers(); setStage("summary"); }
  }
  function skip() { clearTimers(); setStage("summary"); }
  function close() { clearTimers(); setStage(null); setResults(null); setIdx(0); }

  const complete = collected >= total; // 全スキル入手済み（コンプリート）
  const can1 = crystals >= SKILL_GACHA_COST_1 && !complete;
  const btn = (ok) => ({
    flex: 1, padding: "13px 10px", borderRadius: 12, border: "none",
    cursor: ok ? "pointer" : "not-allowed", fontSize: 14, fontWeight: 900, color: "#fff",
    background: ok ? "linear-gradient(135deg,#22d3ee,#6366f1)" : "rgba(255,255,255,.12)",
  });

  const cur = results && results[idx];
  const curRar = cur ? (SKILL_RARITY[cur.skill?.rarity] || SKILL_RARITY.n) : null;

  return (
    <div className="glass" style={{ padding: "12px 14px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 900, color: "#fff" }}>🎴 スキルガチャ</div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,.5)" }}>図鑑 {collected}/{total}</div>
      </div>
      <div style={{ fontSize: 11, color: "rgba(255,255,255,.55)", lineHeight: 1.6, marginBottom: 10 }}>
        クリスタル💎<b style={{ color: "#67e8f9" }}>1個</b>で新しいバトルスキルが<b style={{ color: "#fde047" }}>かならず1つ</b>もらえる（被りは出ない）。
        クリスタルは<b style={{ color: "#a7f3d0" }}>単元のサイクルをクリア</b>するたびに1個たまるよ。
      </div>

      {/* クリスタル残高 */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 10px", borderRadius: 10, background: "rgba(103,232,249,.08)", marginBottom: 10 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,.65)" }}>所持クリスタル</span>
        <span style={{ fontSize: 18, fontWeight: 900, color: "#67e8f9" }}>💎 {crystals}</span>
      </div>

      {complete ? (
        <div style={{ padding: "13px 10px", borderRadius: 12, textAlign: "center", fontSize: 14, fontWeight: 900,
          color: "#fde047", background: "rgba(253,224,71,.12)", border: "1px solid rgba(253,224,71,.5)" }}>
          🎉 スキルコンプリート！（{collected}/{total}）
        </div>
      ) : (
        <button onClick={pull} disabled={!can1} data-sfx="none" style={btn(can1)}>
          スキルを1つ引く<br /><span style={{ fontSize: 11 }}>💎{SKILL_GACHA_COST_1}（被りなし）</span>
        </button>
      )}

      {/* レア度一覧（図鑑）の開閉ボタン。普段は閉じておき、押すと展開する */}
      <button onClick={() => setShowList((v) => !v)} data-sfx="none"
        style={{ ...btnGhost, width: "100%", marginTop: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
        🗂️ レア度一覧（図鑑 {collected}/{total}）{showList ? "を閉じる ▴" : "を見る ▾"}
      </button>

      {/* レア度ごとのコレクション一覧（showList のときだけ表示） */}
      {showList && RARITY_LABEL_ORDER.map((rk) => {
        const rar = SKILL_RARITY[rk];
        const list = BATTLE_SKILLS.filter((s) => s.rarity === rk);
        return (
          <div key={rk} style={{ marginTop: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: rar.color, marginBottom: 6 }}>{rar.label}</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
              {list.map((s) => {
                const has = owned.has(s.id);
                return (
                  <div key={s.id} style={{
                    padding: "8px 9px", borderRadius: 10, background: "rgba(255,255,255,.05)",
                    border: `1px solid ${has ? rar.color + "66" : "rgba(255,255,255,.08)"}`, opacity: has ? 1 : 0.5,
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 18, filter: has ? "none" : "grayscale(1) brightness(.6)" }}>{has ? s.icon : "❓"}</span>
                      <span style={{ fontSize: 11, fontWeight: 800, color: "#fff" }}>{has ? s.name : "？？？"}</span>
                    </div>
                    <div style={{ fontSize: 9.5, color: "rgba(255,255,255,.55)", marginTop: 3, lineHeight: 1.35, minHeight: 26 }}>
                      {has ? s.desc : "未入手"}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* ===== ガチャ演出オーバーレイ（body直下・全画面） ===== */}
      {stage && results && createPortal(
        <div className="gacha-ov" onClick={stage === "reveal" ? next : stage === "summary" ? close : undefined}>
          {stage === "summary" ? (
            // ── 結果一覧 ──
            <div className="gacha-stage" onClick={(e) => e.stopPropagation()} style={{ height: "auto", width: "88%", maxWidth: 360, justifyContent: "flex-start", paddingBottom: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 900, color: "#fde047", letterSpacing: 2, textAlign: "center", marginBottom: 10 }}>✨ けっか ✨</div>
              <div style={{
                display: "grid", gridTemplateColumns: results.length > 1 ? "1fr 1fr" : "1fr",
                gap: 8, maxHeight: "56vh", overflowY: "auto", padding: 2, width: "100%",
              }}>
                {results.map((r, i) => {
                  const rar = SKILL_RARITY[r.skill?.rarity] || SKILL_RARITY.n;
                  return (
                    <div key={i} style={{
                      padding: "10px 10px", borderRadius: 12, textAlign: "center",
                      background: `color-mix(in srgb, ${rar.color} 14%, rgba(0,0,0,.3))`,
                      border: `2px solid ${rar.color}`,
                      animation: `rankUpPop .4s cubic-bezier(.2,1.4,.4,1) both`, animationDelay: `${i * 0.04}s`,
                    }}>
                      <div style={{ fontSize: 9, fontWeight: 900, color: rar.color, letterSpacing: 1 }}>{rar.label}</div>
                      <div style={{ fontSize: 30, margin: "2px 0" }}>{r.skill?.icon}</div>
                      <div style={{ fontSize: 12, fontWeight: 900, color: "#fff" }}>{r.skill?.name}</div>
                      <div style={{
                        marginTop: 4, fontSize: 9.5, fontWeight: 800, borderRadius: 6, padding: "2px 0",
                        color: r.isNew ? "#fff" : "#fcd34d",
                        background: r.isNew ? rar.color : "rgba(252,211,77,.15)",
                      }}>
                        {r.isNew ? "✨ NEW!" : `被り → 💰+${r.refund}`}
                      </div>
                    </div>
                  );
                })}
              </div>
              <button onClick={close} data-sfx="none" style={{
                marginTop: 12, width: "100%", padding: 12, borderRadius: 12, border: "none",
                fontSize: 14, fontWeight: 900, color: "#fff", cursor: "pointer", background: "rgba(255,255,255,.14)",
              }}>とじる</button>
            </div>
          ) : (
            // ── マシン演出（回す → ピカーン → 1枚ずつ GET!） ──
            <div className="gacha-stage" onClick={(e) => e.stopPropagation()}>
              {/* 進捗（11連など） */}
              {results.length > 1 && (
                <div style={{ position: "absolute", top: 4, left: 0, right: 0, textAlign: "center", zIndex: 7, fontSize: 13, fontWeight: 900, color: "#67e8f9", letterSpacing: 1, textShadow: "0 0 8px rgba(103,232,249,.6)" }}>
                  {Math.min(idx + 1, results.length)} / {results.length}
                </div>
              )}

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

              {/* 出てくるカプセル（レア度色だけ見える＝期待感） */}
              {stage === "spin" && curRar && (
                <div className="gacha-capsule drop"
                  style={{ background: `linear-gradient(to bottom, #fff 0 50%, ${curRar.color} 50% 100%)` }} />
              )}

              {/* ピカーン */}
              {(stage === "flash" || stage === "reveal") && (<><div className="gacha-rays" /><div className="gacha-burst" /></>)}

              {/* GET!（1枚） */}
              {stage === "reveal" && cur && curRar && (
                <div className="gacha-get" style={{ width: 240 }}>
                  {isRare(cur.skill?.rarity) && (
                    <div style={{ fontSize: 13, fontWeight: 900, color: curRar.color, letterSpacing: 2, marginBottom: 2, animation: "startPulse .7s ease-in-out infinite", textShadow: `0 0 12px ${curRar.color}` }}>
                      ★ {curRar.label} 確定 ★
                    </div>
                  )}
                  <div style={{ fontSize: 12, fontWeight: 900, color: curRar.color, letterSpacing: 3 }}>{curRar.label} GET!</div>
                  <div className="gacha-get-icon" style={{ filter: `drop-shadow(0 0 16px ${curRar.color}) drop-shadow(0 6px 14px rgba(0,0,0,.5))` }}>{cur.skill?.icon}</div>
                  <div style={{ fontSize: 20, fontWeight: 900, color: "#fff" }}>{cur.skill?.name}</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,.72)", maxWidth: 220, margin: "4px auto 0", lineHeight: 1.4 }}>{cur.skill?.desc}</div>
                  <div style={{
                    marginTop: 8, display: "inline-block", fontSize: 11, fontWeight: 900, borderRadius: 8, padding: "3px 12px",
                    color: cur.isNew ? "#fff" : "#fcd34d", background: cur.isNew ? curRar.color : "rgba(252,211,77,.15)",
                  }}>
                    {cur.isNew ? "✨ NEW!" : `被り → 💰 +${cur.refund}`}
                  </div>
                </div>
              )}

              {/* 操作ボタン */}
              <div style={{ position: "relative", zIndex: 6, width: "100%", display: "flex", gap: 8, justifyContent: "center", marginTop: 14 }}>
                {stage === "reveal" && (<>
                  {results.length > 1 && idx < results.length - 1 && (
                    <button onClick={skip} data-sfx="none" style={btnGhost}>スキップ ⏭</button>
                  )}
                  <button onClick={next} data-sfx="none" style={btnGo}>
                    {idx < results.length - 1 ? "次へ ▶" : (results.length > 1 ? "結果を見る" : "とじる")}
                  </button>
                </>)}
              </div>
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}
