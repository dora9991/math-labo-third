// ============================================================
// Items.jsx — アイテム（2026-07-19復活・ガチャ方式）
//  💰コインでガチャを回してアイテムを集める（HP回復・SP回復・毒消し・万能薬・
//  攻撃力アップ・被ダメ軽減）。ストックは合計10個まで、バトルへの持ち込みは
//  最大2種類まで選んで装備する（ロードアウトと同じ2列・トグル方式）。
//  設計: Obsidian「設計_単元別戦闘力とHP1000化_2026-07-18」
// ============================================================
import { useState } from "react";
import Header from "../components/Header.jsx";
import { ITEMS, itemSummary, ITEM_STOCK_MAX, ITEM_BRING_MAX, itemGachaCost } from "../data/items.js";
import * as sfx from "../audio/sfx.js";

export default function Items({ player, onPull, onToggle, onBack }) {
  const stock = player.items || {};
  const equipped = player.equippedItems || [];
  const coins = player.coins ?? 0;
  const stockTotal = Object.values(stock).reduce((a, b) => a + (b || 0), 0);
  const [result, setResult] = useState(null); // ガチャで出たアイテム（演出）

  // その日すでに何回引いたか（日付が変わっていれば0にリセット。App.jsxのtodayStr()と同じ形式）
  const todayJa = new Date().toLocaleDateString("ja-JP");
  const pullsToday = player.itemGachaLastPullDate === todayJa ? (player.itemGachaPullsToday || 0) : 0;
  const cost = itemGachaCost(pullsToday);
  const canPull = coins >= cost && stockTotal < ITEM_STOCK_MAX;

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
        <div className="pg-ttl">🧪 アイテム</div>
        <div className="pg-sub">💰コインでガチャを回してアイテムを手に入れよう。ストックは合計{ITEM_STOCK_MAX}個まで。バトルには最大{ITEM_BRING_MAX}種類まで持ち込める。</div>

        <div className="glass" style={{ padding: "10px 16px", display: "flex", justifyContent: "space-around", marginBottom: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 900, color: equipped.length >= ITEM_BRING_MAX ? "#fde047" : "#cceebb" }}>
            持ち込み：{equipped.length} / {ITEM_BRING_MAX}
          </span>
          <span style={{ fontSize: 13, fontWeight: 900, color: stockTotal >= ITEM_STOCK_MAX ? "#fbbf24" : "#a7f3d0" }}>
            📦 ストック：{stockTotal} / {ITEM_STOCK_MAX}
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
            border: canPull ? "2px solid #4ade80" : "1px solid rgba(255,255,255,.15)",
            background: canPull ? "linear-gradient(135deg,#22c55e,#16a34a)" : "rgba(255,255,255,.05)",
            color: canPull ? "#fff" : "rgba(255,255,255,.4)", fontWeight: 900, fontSize: 14, textAlign: "center",
          }}
        >
          🎰 アイテムガチャを回す（💰{cost}）
          <div style={{ fontSize: 9.5, fontWeight: 700, marginTop: 3, opacity: 0.85 }}>
            {stockTotal >= ITEM_STOCK_MAX ? "ストックがいっぱい！使ってから引こう" : "1回ごとに+50G・翌日また150Gから"}
          </div>
        </button>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {ITEMS.map((it) => {
            const count = stock[it.id] || 0;
            const have = count > 0;
            const isEq = equipped.includes(it.id);
            const canEquip = isEq || equipped.length < ITEM_BRING_MAX;
            return (
              <div
                key={it.id}
                className="glass"
                style={{
                  padding: "10px 11px", borderRadius: 12, opacity: have ? 1 : 0.55,
                  border: isEq ? "2px solid #fde047" : "1px solid rgba(255,255,255,.12)",
                  boxShadow: isEq ? "0 0 0 2px rgba(253,224,71,.25)" : undefined,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 16 }}>{it.icon}</span>
                  <span style={{ fontSize: 12.5, fontWeight: 900, color: "#fff" }}>{it.name}</span>
                  {isEq && <span style={{ fontSize: 10, fontWeight: 900, color: "#fde047", marginLeft: "auto" }}>✓</span>}
                </div>
                <div style={{ fontSize: 9.5, color: "#88aa88", marginTop: 4, lineHeight: 1.3 }}>{it.desc}</div>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: "#cceebb", marginTop: 3, lineHeight: 1.3 }}>{itemSummary(it)}</div>
                <div style={{ marginTop: 6, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 10.5, fontWeight: 900, color: have ? "#67e8f9" : "rgba(255,255,255,.35)" }}>所持 ×{count}</span>
                  <button
                    onClick={() => have && canEquip && onToggle(it.id)}
                    disabled={!have || !canEquip}
                    data-sfx="none"
                    style={{
                      padding: "5px 10px", borderRadius: 8, fontSize: 10, fontWeight: 900, fontFamily: "inherit",
                      cursor: have && canEquip ? "pointer" : "not-allowed",
                      border: `1px solid ${isEq ? "#fde047" : have && canEquip ? "rgba(255,255,255,.3)" : "rgba(255,255,255,.12)"}`,
                      background: isEq ? "rgba(253,224,71,.16)" : "rgba(255,255,255,.05)",
                      color: isEq ? "#fde047" : have && canEquip ? "#fff" : "rgba(255,255,255,.3)",
                    }}
                  >
                    {isEq ? "外す" : "持ち込む"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ガチャ演出：出たアイテムをかんたんに知らせる */}
      {result && (
        <div style={{ position: "fixed", top: "20%", left: "50%", transform: "translateX(-50%)", zIndex: 60, pointerEvents: "none", padding: "0 16px" }}>
          <div className="glass" style={{
            padding: "16px 24px", borderRadius: 14, textAlign: "center",
            border: `2px solid ${result.color || "#4ade80"}`, background: "rgba(10,20,10,.92)", boxShadow: `0 0 28px ${result.color || "#4ade80"}88`,
          }}>
            <div style={{ fontSize: 28 }}>{result.icon}</div>
            <div style={{ fontSize: 14, fontWeight: 900, color: result.color || "#4ade80" }}>
              「{result.name}」を手に入れた！
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
