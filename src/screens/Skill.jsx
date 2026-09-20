// ============================================================
// Skill.jsx — バトルで使うスキルをセットする画面
//  ・スロット1（SP5枠）・スロット2（SP10枠）にそれぞれ1つ装備する
//  ・所持スキル(ownedSkills)から選ぶ。未所持はスキルガチャ（クリスタル）で入手
// ============================================================
import Header from "../components/Header.jsx";
import { skillsForSlot, SKILL_RARITY } from "../engine/battle.js";
import SkillGachaBox from "../components/SkillGachaBox.jsx";

// 未所持スキルの入手方法（スキルガチャ）
function dropHint(s) {
  const rar = SKILL_RARITY[s.rarity];
  return rar ? `🔒 ガチャ（${rar.label}）` : "🔒 ガチャで入手";
}

export default function Skill({ player, onEquip, onPullSkill, onBack }) {
  const owned = player.ownedSkills || ["time2x", "ultimate"];
  const equip = player.equip || { 1: "time2x", 2: "ultimate" };

  return (
    <div className="app">
      <Header player={player} back="ホーム" onBack={onBack} />
      <div className="content">
        <div className="pg-ttl">✨ スキルセット</div>
        <div className="pg-sub">バトルでSPを使って発動するスキルを、スロットごとに選ぼう</div>

        {/* スキルガチャ（クリスタルで新しいスキルを入手） */}
        <SkillGachaBox player={player} onPull={onPullSkill} />

        {[1, 2].map((slot) => {
          const cands = skillsForSlot(slot);
          const cost = cands[0]?.cost ?? (slot === 1 ? 5 : 10);
          return (
            <div key={slot} className="glass" style={{ padding: "14px 16px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <span style={{ fontSize: 14, fontWeight: 900, color: "#fff" }}>スロット{slot}</span>
                <span style={{ fontSize: 11, fontWeight: 800, color: "#fbbf24" }}>発動 {cost} SP</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {cands.map((s) => {
                  const isOwned = owned.includes(s.id);
                  const isEquipped = equip[slot] === s.id && isOwned;
                  return (
                    <button
                      key={s.id}
                      data-sfx="none"
                      onClick={() => { if (isOwned) onEquip(slot, s.id); }}
                      style={{
                        textAlign: "left", cursor: "pointer", fontFamily: "inherit",
                        padding: 12, borderRadius: 12,
                        border: `2px solid ${isEquipped ? s.color : "rgba(255,255,255,.12)"}`,
                        background: isEquipped ? `color-mix(in srgb, ${s.color} 20%, transparent)` : "rgba(255,255,255,.04)",
                        opacity: isOwned ? 1 : 0.6,
                        display: "flex", flexDirection: "column", gap: 5,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                        <span style={{ fontSize: 22 }}>{isOwned ? s.icon : "❓"}</span>
                        <span style={{ fontSize: 13, fontWeight: 900, color: "#fff" }}>{isOwned ? s.name : "？？？"}</span>
                      </div>
                      <div style={{ fontSize: 10.5, color: "rgba(255,255,255,.6)", lineHeight: 1.4, minHeight: 30 }}>{isOwned ? s.desc : "まだ手に入れていないスキル"}</div>
                      <div style={{
                        fontSize: 10, fontWeight: 800, textAlign: "center", padding: "4px 0", borderRadius: 8,
                        color: isEquipped ? s.color : isOwned ? "rgba(255,255,255,.55)" : "#fbbf24",
                        background: isEquipped ? `color-mix(in srgb, ${s.color} 18%, transparent)` : "rgba(255,255,255,.05)",
                      }}>
                        {isEquipped ? "✓ 装備中" : isOwned ? "装備する" : dropHint(s)}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}

        <div style={{ fontSize: 11, color: "rgba(255,255,255,.4)", textAlign: "center", lineHeight: 1.6, marginTop: 4 }}>
          ※ スキルはバトル中、SPがたまると発動できます。<br />
          新しいスキルは、上の<b style={{ color: "#67e8f9" }}>スキルガチャ</b>（クリスタル💎）で手に入ります（全{skillsForSlot(1).length + skillsForSlot(2).length}種）。クリスタルは<b style={{ color: "#fde047" }}>タイムアタック（星1つ以上＆正答率60%以上で+1）</b>や、初めてのモンスター撃破（通常+5・ボス+10）で貯まります。
        </div>
      </div>
    </div>
  );
}
