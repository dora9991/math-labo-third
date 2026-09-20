// ============================================================
// Shop.jsx — アイテム＆スキルのショップ
//  ・アイテム：レベルで段階解放。バトル中に1つだけ持てる（持ち替え＝破棄）
//  ・スキル：高額の「買い切り」。買うとスキル画面で装備できるようになる
//  ・コインはタイムアタックで稼ぐ
// ============================================================
import { useState } from "react";
import Header from "../components/Header.jsx";
import { ITEMS, findItem, treatCost } from "../engine/items.js";
import { getPlayerBattleStats, battleBonuses } from "../engine/battle.js";
import GachaBox from "../components/GachaBox.jsx";
import { playerLevel } from "../engine/scoring.js";

// アイテムを種別ごとにグループ表示する見出し
const KIND_LABEL = { heal: "❤️ 回復", sp: "⚡ SP回復", atk2x: "💪 攻撃アップ", guard: "🛡️ 防御", bait: "🍖 仲間にする" };
const KIND_ORDER = ["heal", "sp", "atk2x", "guard", "bait"];

export default function Shop({ player, onBuy, onDiscard, onHeal, onPullGacha, onEquipGear, onBack }) {
  const coins = player.coins ?? 0;
  const lv = playerLevel(player);
  const maxHp = getPlayerBattleStats(lv, battleBonuses(player)).maxHp;
  const curHp = player.currentHp == null ? maxHp : Math.max(0, Math.min(maxHp, player.currentHp));
  const hpFull = curHp >= maxHp;
  const treat = treatCost(lv);
  const heldId = player.item || null;
  const held = heldId ? findItem(heldId) : null;
  const [confirm, setConfirm] = useState(null);   // アイテム持ち替え確認

  function tryBuy(item) {
    if (lv < item.unlockLv) return;          // レベル未達
    if (coins < item.price) return;          // コイン不足
    if (heldId === item.id) return;          // 同じものは買わない
    if (heldId) { setConfirm(item); return; } // すでに所持 → 持ち替え確認
    onBuy(item.id);
  }
  function confirmReplace() {
    if (confirm) onBuy(confirm.id);
    setConfirm(null);
  }

  // 種別ごとにアイテムをまとめる
  const byKind = {};
  for (const it of ITEMS) (byKind[it.kind] ||= []).push(it);

  return (
    <div className="app">
      <Header player={player} back="ホーム" onBack={onBack} />
      <div className="content">
        <div className="pg-ttl">🎒 アイテム</div>
        <div className="pg-sub">タイムアタックで稼いだコインで、どうぐ・そうび・回復を手に入れよう</div>

        {/* コイン残高 */}
        <div className="glass" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px" }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,.7)" }}>所持コイン ・ Lv.{lv}</span>
          <span style={{ fontSize: 22, fontWeight: 900, color: "#fbbf24" }}>💰 {coins}</span>
        </div>

        {/* ガチャ（武器・防具のコレクション＝バトル装備） */}
        <GachaBox player={player} onPull={onPullGacha} onEquip={onEquipGear} />

        {/* 治療（HP全回復） */}
        <div className="glass" style={{ padding: "12px 16px" }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,.45)", marginBottom: 8 }}>
            🏥 治療（バトルのHPを全回復）
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 800, color: "#f87171" }}>
                ❤️ {curHp} / {maxHp}
              </div>
              <div style={{ height: 8, background: "rgba(255,255,255,.1)", borderRadius: 5, overflow: "hidden", marginTop: 4 }}>
                <div style={{ width: (curHp / maxHp) * 100 + "%", height: "100%", background: curHp > maxHp * 0.5 ? "#4ade80" : curHp > maxHp * 0.25 ? "#fbbf24" : "#f87171", borderRadius: 5 }} />
              </div>
            </div>
            <button
              onClick={onHeal}
              disabled={hpFull || coins < treat}
              data-sfx="none"
              style={{
                fontSize: 12, fontWeight: 900, padding: "10px 14px", borderRadius: 10, border: "none",
                cursor: hpFull || coins < treat ? "not-allowed" : "pointer", color: "#fff",
                background: hpFull ? "rgba(74,222,128,.3)" : coins < treat ? "rgba(255,255,255,.1)" : "#ef4444",
                whiteSpace: "nowrap",
              }}
            >
              {hpFull ? "満タン" : `💰${treat} で治療`}
            </button>
          </div>
        </div>

        {/* 持っているアイテム */}
        <div className="glass" style={{ padding: "12px 16px" }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,.45)", marginBottom: 8 }}>
            🎒 今持っているアイテム（バトルで1つだけ持てる）
          </div>
          {held ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 26 }}>{held.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 900, color: "#fff" }}>{held.name}</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,.5)" }}>{held.desc}</div>
              </div>
              <button onClick={onDiscard} data-sfx="none"
                style={{ fontSize: 11, fontWeight: 800, color: "#fca5a5", cursor: "pointer", padding: "6px 12px", borderRadius: 9, border: "1px solid rgba(248,113,113,.4)", background: "rgba(248,113,113,.1)" }}>
                捨てる
              </button>
            </div>
          ) : (
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)", textAlign: "center", padding: "6px 0" }}>
              まだ持っていません
            </div>
          )}
        </div>

        {/* アイテム（種別ごと・tier） */}
        {KIND_ORDER.map((kind) => (
          <div key={kind} className="glass" style={{ padding: "12px 14px" }}>
            <div style={{ fontSize: 12, fontWeight: 900, color: "#fff", marginBottom: 9 }}>{KIND_LABEL[kind]}</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              {byKind[kind].map((it) => {
                const locked = lv < it.unlockLv;
                const ownedNow = heldId === it.id;
                const afford = coins >= it.price;
                return (
                  <div key={it.id} style={{
                    padding: 10, borderRadius: 11, display: "flex", flexDirection: "column", gap: 5,
                    background: "rgba(255,255,255,.05)", borderTop: `3px solid ${it.color}`,
                    opacity: locked ? 0.5 : 1,
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <span style={{ fontSize: 18, filter: locked ? "grayscale(1) brightness(.7)" : "none" }}>{locked ? "❓" : it.icon}</span>
                      <span style={{ fontSize: 9, fontWeight: 800, color: it.color, background: "rgba(255,255,255,.06)", padding: "1px 5px", borderRadius: 6 }}>tier{it.tier}</span>
                    </div>
                    <div style={{ fontSize: 10.5, color: "rgba(255,255,255,.6)", lineHeight: 1.35, minHeight: 42 }}>{locked ? "？？？" : it.desc}</div>
                    {locked ? (
                      <div style={{ fontSize: 10, fontWeight: 800, color: "#94a3b8", textAlign: "center", padding: "6px 0" }}>🔒 Lv.{it.unlockLv}で解放</div>
                    ) : (
                      <button onClick={() => tryBuy(it)} disabled={ownedNow || !afford} data-sfx="none"
                        style={{
                          fontSize: 11, fontWeight: 900, padding: "6px 4px", borderRadius: 9, border: "none",
                          cursor: ownedNow || !afford ? "not-allowed" : "pointer", color: "#fff",
                          background: ownedNow ? "rgba(74,222,128,.3)" : afford ? "#6366f1" : "rgba(255,255,255,.1)",
                        }}>
                        {ownedNow ? "所持中" : afford ? `💰${it.price}` : `💰${it.price}`}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* スキルは「スキル」画面のスキルガチャ（クリスタル）で入手 */}
        <div className="glass" style={{ padding: "12px 14px" }}>
          <div style={{ fontSize: 12, fontWeight: 900, color: "#fff", marginBottom: 4 }}>✨ スキルについて</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,.55)", lineHeight: 1.6 }}>
            スキルは<b style={{ color: "#67e8f9" }}>「スキル」画面のスキルガチャ</b>（クリスタル💎）で手に入ります。
            クリスタルは<b style={{ color: "#fde047" }}>タイムアタック（星1つ以上＆正答率60%以上）</b>や、初めてのモンスター撃破で貯まります。
          </div>
        </div>

        <div style={{ marginTop: 8, fontSize: 11, color: "rgba(255,255,255,.4)", textAlign: "center", lineHeight: 1.6 }}>
          ※ アイテムは1つだけ持てます。新しく買うと今のアイテムと入れ替わります。<br />
          上位のアイテムはレベルが上がると解放されます。
        </div>
      </div>

      {/* アイテム持ち替え確認 */}
      {confirm && (
        <div onClick={() => setConfirm(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()} className="glass" style={{ maxWidth: 320, padding: 20, textAlign: "center" }}>
            <div style={{ fontSize: 30, marginBottom: 6 }}>{confirm.icon}</div>
            <div style={{ fontSize: 14, fontWeight: 900, color: "#fff", marginBottom: 8 }}>「{confirm.name}」に持ち替える？</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.6)", marginBottom: 16 }}>今持っている「{held?.name}」は無くなります（返金なし）。</div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setConfirm(null)} data-sfx="none" style={{ flex: 1, padding: "11px", borderRadius: 11, border: "1px solid rgba(255,255,255,.2)", background: "rgba(255,255,255,.06)", color: "#fff", fontWeight: 800, cursor: "pointer", fontSize: 13 }}>やめる</button>
              <button onClick={confirmReplace} data-sfx="none" style={{ flex: 1, padding: "11px", borderRadius: 11, border: "none", background: "#6366f1", color: "#fff", fontWeight: 900, cursor: "pointer", fontSize: 13 }}>持ち替える</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
