// ============================================================
// Partners.jsx — なかま（仲間モンスター）画面
//  ・エサで仲間にしたモンスターが並ぶ。コイン/クリスタルで「餐やり」して育成。
//  ・「ストック」最大4体まで編成。うち1体を「アクティブ」にするとバトルに参戦。
//    （アクティブ1体だけが主人公とともに戦う。残り3体は控え＝参戦しない）
// ============================================================
import Header from "../components/Header.jsx";
import MonsterSprite from "../components/MonsterSprite.jsx";
import { findMonster } from "../data/monsters.js";
import {
  feedCost, partnerMaxLevel, partnerTierOf, allyStats, FEED_KINDS, PARTY_MAX,
  partnerHpLv, partnerAtkLv,
} from "../engine/partners.js";

const TIER_LABEL = { unit: "なかま", boss: "章ボス", final: "魔王" };
const TIER_COLOR = { unit: "rgba(103,232,249,.6)", boss: "#f472b6", final: "#fde047" };

export default function Partners({ player, onFeed, onToggleParty, onSetActive, onBack }) {
  const coins = player.coins ?? 0;
  const crystals = player.crystals ?? 0;
  const partners = player.partners || {};
  const party = Array.isArray(player.party) ? player.party : [];
  const activeId = player.activePartner || null;

  const list = Object.keys(partners)
    .map((id) => ({ id, mon: findMonster(id), hpLv: partnerHpLv(partners[id]), atkLv: partnerAtkLv(partners[id]) }))
    .filter((x) => x.mon);

  return (
    <div className="app">
      <Header player={player} back="ホーム" onBack={onBack} />
      <div className="content">
        <div className="pg-ttl">🐾 なかま</div>
        <div className="pg-sub">エサで仲間にしたモンスターを育てて、ストック(最大{PARTY_MAX})に編成。1体を「アクティブ」にするとバトルに参戦！</div>

        {/* ストック状況 */}
        <div className="glass" style={{ padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 12, fontWeight: 800, color: "rgba(255,255,255,.7)" }}>ストック編成</span>
          <span style={{ fontSize: 14, fontWeight: 900, color: party.length >= PARTY_MAX ? "#f472b6" : "#67e8f9" }}>{party.length} / {PARTY_MAX} 体</span>
        </div>

        {list.length === 0 ? (
          <div className="glass">
            <div className="empty">
              <div className="empty-icon">🥚</div>
              <p>まだ仲間がいません。<br />ショップで「🍖魔物のエサ」を買い、バトル中に使ってからその敵をたおすと仲間になります（ザコ50%/ボス25%・要★条件）。</p>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {list.map(({ id, mon, hpLv, atkLv }) => {
              const tier = partnerTierOf(mon);
              const maxLv = partnerMaxLevel(mon);
              const hpMaxed = hpLv >= maxLv;
              const atkMaxed = atkLv >= maxLv;
              const st = allyStats(mon, hpLv, atkLv);
              const inParty = party.includes(id);
              const isActive = id === activeId;
              const partyFull = party.length >= PARTY_MAX;
              const hpCost = feedCost(hpLv, "hp");      // HPアップ＝お金
              const atkCost = feedCost(atkLv, "atk");   // 攻撃アップ＝クリスタル
              const canHp = !hpMaxed && coins >= hpCost.coins;
              const canAtk = !atkMaxed && crystals >= atkCost.crystals;
              return (
                <div key={id} className="glass" style={{ padding: "10px 12px", border: `1.5px solid ${isActive ? "#fbbf24" : inParty ? TIER_COLOR[tier] : "rgba(255,255,255,.08)"}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 52, height: 52, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <MonsterSprite monster={mon} mini state="idle" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 13.5, fontWeight: 900, color: "#fff" }}>{mon.name}</span>
                        <span style={{ fontSize: 9, fontWeight: 800, color: TIER_COLOR[tier], border: `1px solid ${TIER_COLOR[tier]}`, borderRadius: 999, padding: "1px 6px" }}>{TIER_LABEL[tier]}</span>
                        {isActive && <span style={{ fontSize: 9, fontWeight: 900, color: "#3a2a00", background: "#fbbf24", borderRadius: 999, padding: "1px 7px" }}>⚔️ 参戦中</span>}
                      </div>
                      <div style={{ fontSize: 11, fontWeight: 800, marginTop: 2, display: "flex", gap: 10, flexWrap: "wrap" }}>
                        <span style={{ color: "#f87171" }}>❤️HP{st.maxHp} <span style={{ opacity: .8 }}>Lv.{hpLv}{hpMaxed ? "(最大)" : `/${maxLv}`}</span></span>
                        <span style={{ color: "#67e8f9" }}>⚔️攻撃{st.atk} <span style={{ opacity: .8 }}>Lv.{atkLv}{atkMaxed ? "(最大)" : `/${maxLv}`}</span></span>
                      </div>
                      <div style={{ display: "flex", gap: 4, marginTop: 5 }}>
                        <div style={{ flex: 1, height: 6, background: "rgba(255,255,255,.1)", borderRadius: 4, overflow: "hidden" }}>
                          <div style={{ width: (hpLv / maxLv) * 100 + "%", height: "100%", background: "linear-gradient(90deg,#f87171,#fbbf24)" }} />
                        </div>
                        <div style={{ flex: 1, height: 6, background: "rgba(255,255,255,.1)", borderRadius: 4, overflow: "hidden" }}>
                          <div style={{ width: (atkLv / maxLv) * 100 + "%", height: "100%", background: "linear-gradient(90deg,#22d3ee,#67e8f9)" }} />
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* 編成・アクティブ */}
                  <div style={{ display: "flex", gap: 7, marginTop: 9 }}>
                    <button data-sfx="none" disabled={!inParty && partyFull} onClick={() => onToggleParty(id)}
                      style={{ flex: 1, padding: "8px", borderRadius: 9, border: "none", cursor: (!inParty && partyFull) ? "default" : "pointer", fontFamily: "inherit", fontSize: 11.5, fontWeight: 900,
                        background: inParty ? "rgba(244,114,182,.25)" : (partyFull ? "rgba(255,255,255,.06)" : "rgba(255,255,255,.1)"), color: inParty ? "#f9a8d4" : (partyFull ? "rgba(255,255,255,.35)" : "#fff") }}>
                      {inParty ? "ストックから外す" : partyFull ? "ストック満員" : "ストックに入れる"}
                    </button>
                    <button data-sfx="none" disabled={!inParty} onClick={() => onSetActive(id)}
                      style={{ flex: 1, padding: "8px", borderRadius: 9, border: "none", cursor: inParty ? "pointer" : "default", fontFamily: "inherit", fontSize: 11.5, fontWeight: 900,
                        background: isActive ? "#fbbf24" : (inParty ? "rgba(251,191,36,.18)" : "rgba(255,255,255,.06)"), color: isActive ? "#3a2a00" : (inParty ? "#fbbf24" : "rgba(255,255,255,.3)") }}>
                      {isActive ? "✓ 参戦中" : "参戦させる"}
                    </button>
                  </div>
                  {/* 育成：HP=お金で / 攻撃=クリスタルで 別々に強化 */}
                  <div style={{ display: "flex", gap: 7, marginTop: 7 }}>
                    <button data-sfx="none" disabled={!canHp} onClick={() => onFeed(id, "hp")}
                      style={{ flex: 1, padding: "8px", borderRadius: 9, border: "none", cursor: canHp ? "pointer" : "default", fontFamily: "inherit", fontSize: 11.5, fontWeight: 900,
                        background: canHp ? "linear-gradient(135deg,#f59e0b,#fbbf24)" : "rgba(255,255,255,.06)", color: canHp ? "#3a2a00" : "rgba(255,255,255,.35)" }}>
                      {hpMaxed ? "HP最大" : `${FEED_KINDS.hp.icon}HPアップ 💰${hpCost.coins}`}
                    </button>
                    <button data-sfx="none" disabled={!canAtk} onClick={() => onFeed(id, "atk")}
                      style={{ flex: 1, padding: "8px", borderRadius: 9, border: "none", cursor: canAtk ? "pointer" : "default", fontFamily: "inherit", fontSize: 11.5, fontWeight: 900,
                        background: canAtk ? "linear-gradient(135deg,#22d3ee,#67e8f9)" : "rgba(255,255,255,.06)", color: canAtk ? "#063b44" : "rgba(255,255,255,.35)" }}>
                      {atkMaxed ? "攻撃最大" : `${FEED_KINDS.atk.icon}攻撃アップ 💎${atkCost.crystals}`}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div style={{ marginTop: 8, fontSize: 11, color: "rgba(255,255,255,.45)", textAlign: "center", lineHeight: 1.6 }}>
          バトルでは「主人公の攻撃→参戦中の仲間が追撃」。主人公HPが30%以下になると仲間がかばってくれます（仲間HP0で退場）。
        </div>
      </div>
    </div>
  );
}
