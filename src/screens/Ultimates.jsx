// ============================================================
// Ultimates.jsx — 必殺技一覧（2026-07-19設計）
//  💰コインでガチャを回して必殺技を集める（ダブりなし）。所持している中から
//  1つを選んで装備する（バトルの「必殺技」ボタンで使う技）。
//  1発のダメージ倍率はどんなに強くても最大 ULT_MULT_CAP(5)倍まで。
//  設計: Obsidian「設計_単元別戦闘力とHP1000化_2026-07-18」
// ============================================================
import { useState } from "react";
import Header from "../components/Header.jsx";
import { ULTIMATES, ultimateMult, ultimateGachaCost } from "../data/ultimates.js";
import * as sfx from "../audio/sfx.js";

function inflictSummary(inf) {
  if (!inf) return "";
  if (inf.kind === "poison") return `毒${inf.turns}T`;
  if (inf.kind === "stun") return `しびれ${Math.round(inf.chance * 100)}%`;
  return "";
}

export default function Ultimates({ player, onPull, onEquip, onBack }) {
  const owned = player.ownedUltimates || {};
  const equippedId = player.equippedUltimate;
  const coins = player.coins ?? 0;
  const ownedCount = ULTIMATES.filter((u) => owned[u.id]).length;
  const allOwned = ownedCount >= ULTIMATES.length;
  const [result, setResult] = useState(null); // ガチャで出た必殺技（演出）

  // ダブり無しガチャなので、すでに引いた回数＝所持数-1（最初の1つは無償配布）
  const pullsSoFar = Math.max(0, ownedCount - 1);
  const cost = ultimateGachaCost(pullsSoFar);
  const canPull = !allOwned && coins >= cost;

  function doPull() {
    if (!canPull) return;
    const got = onPull();
    if (!got) return;
    sfx.unlock();
    setResult(got);
    setTimeout(() => setResult(null), 1800);
  }

  return (
    <div className="app">
      <Header player={player} back="ホーム" onBack={onBack} />
      <div className="content">
        <div className="pg-ttl">💥 必殺技一覧</div>
        <div className="pg-sub">💰コインでガチャを回して必殺技を集めよう（ダブりなし）。1発のダメージ倍率はどんなに強くても最大5倍まで。所持している中から1つを選んで装備する。</div>

        <div className="glass" style={{ padding: "10px 16px", display: "flex", justifyContent: "space-around", marginBottom: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 900, color: "#cceebb" }}>
            所持：{ownedCount} / {ULTIMATES.length}
          </span>
          <span style={{ fontSize: 13, fontWeight: 900, color: "#fde047" }}>
            💰 {coins}
          </span>
        </div>

        <button
          onClick={doPull}
          disabled={!canPull}
          data-sfx="none"
          style={{
            width: "100%", marginBottom: 12, padding: "13px 14px", borderRadius: 13, cursor: canPull ? "pointer" : "not-allowed",
            border: canPull ? "2px solid #f472b6" : "1px solid rgba(255,255,255,.15)",
            background: canPull ? "linear-gradient(135deg,#ec4899,#db2777)" : "rgba(255,255,255,.05)",
            color: canPull ? "#fff" : "rgba(255,255,255,.4)", fontWeight: 900, fontSize: 14, textAlign: "center",
          }}
        >
          🎰 必殺技ガチャを回す（💰{cost}）
          <div style={{ fontSize: 9.5, fontWeight: 700, marginTop: 3, opacity: 0.85 }}>
            {allOwned ? "ぜんぶ集めたよ！" : "1回ごとに+200G（リセットなし）"}
          </div>
        </button>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {ULTIMATES.map((u) => {
            const have = !!owned[u.id];
            const isEq = equippedId === u.id;
            return (
              <div
                key={u.id}
                className="glass"
                style={{
                  padding: "10px 11px", borderRadius: 12, opacity: have ? 1 : 0.55,
                  border: isEq ? "2px solid #fde047" : "1px solid rgba(255,255,255,.12)",
                  boxShadow: isEq ? "0 0 0 2px rgba(253,224,71,.25)" : undefined,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 16 }}>{have ? u.icon : "❔"}</span>
                  <span style={{ fontSize: 12.5, fontWeight: 900, color: "#fff" }}>{have ? u.name : "？？？"}</span>
                  {isEq && <span style={{ fontSize: 10, fontWeight: 900, color: "#fde047", marginLeft: "auto" }}>装備中</span>}
                </div>
                <div style={{ fontSize: 9.5, color: "#88aa88", marginTop: 4, lineHeight: 1.3 }}>{have ? u.desc : "ガチャで手に入るよ"}</div>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: "#cceebb", marginTop: 3, lineHeight: 1.3 }}>
                  倍率 {ultimateMult(u)}倍{u.lifesteal ? ` ・ 吸収${Math.round(u.lifesteal * 100)}%` : ""}{u.inflict ? ` ・ ${inflictSummary(u.inflict)}` : ""}
                </div>
                {have && (
                  <button
                    onClick={() => !isEq && onEquip(u.id)}
                    disabled={isEq}
                    data-sfx="none"
                    style={{
                      marginTop: 7, width: "100%", padding: "7px 6px", borderRadius: 8, fontSize: 9.5, fontWeight: 900,
                      cursor: isEq ? "default" : "pointer", fontFamily: "inherit",
                      border: `1px solid ${isEq ? "#fde047" : "rgba(255,255,255,.3)"}`,
                      background: isEq ? "rgba(253,224,71,.16)" : "rgba(255,255,255,.06)",
                      color: isEq ? "#fde047" : "#fff",
                    }}
                  >
                    {isEq ? "✓ 装備中" : "これを装備する"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ガチャ演出：出た必殺技をかんたんに知らせる */}
      {result && (
        <div style={{ position: "fixed", top: "20%", left: "50%", transform: "translateX(-50%)", zIndex: 60, pointerEvents: "none", padding: "0 16px" }}>
          <div className="glass" style={{
            padding: "16px 24px", borderRadius: 14, textAlign: "center",
            border: `2px solid ${result.color || "#f472b6"}`, background: "rgba(20,10,20,.92)", boxShadow: `0 0 28px ${result.color || "#f472b6"}88`,
          }}>
            <div style={{ fontSize: 28 }}>{result.icon}</div>
            <div style={{ fontSize: 14, fontWeight: 900, color: result.color || "#f472b6" }}>
              「{result.name}」を手に入れた！
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
