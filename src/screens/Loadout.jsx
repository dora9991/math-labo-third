// ============================================================
// Loadout.jsx — 単元別スキルのロードアウト（2026-07-18〜19設計）
//  各章にはDランク（無償）の弱いスキルが最初からあり、小単元ボス撃破で得た
//  クリスタルを使って確実に1段階ずつ強化できる（D→C→B→A→S→SS・ガチャではない）。
//  クリスタルは大切なアイテムなので、レベルアップ前に確認ダイアログを挟み、
//  実行後はファンファーレ＋「〇〇がレベルアップした！」の演出を出す。
//  ここでは所持スキルから最大2つを選んで装備する（2列表示）。
//  設計: Obsidian「設計_単元別戦闘力とHP1000化_2026-07-18」
// ============================================================
import { useState } from "react";
import Header from "../components/Header.jsx";
import { CHAPTER_SKILLS, chapterSkillTier, SKILL_RANK_ORDER_WITH_D, chapterSkillLevelUpCost } from "../data/chapterSkills.js";
import { chaptersForGrade } from "../data/index.js";
import * as sfx from "../audio/sfx.js";

const RANK_COLOR = { D: "#94a3b8", C: "#4ade80", B: "#38bdf8", A: "#a78bfa", S: "#f472b6", SS: "#fde047" };

function tierSummary(chapterId, rank) {
  const t = chapterSkillTier(chapterId, rank);
  if (!t) return "";
  const parts = [];
  if (t.turns != null) parts.push(`${t.turns}ターン`);
  if (t.mult != null) parts.push(`与ダメ+${Math.round((t.mult - 1) * 100)}%`);
  if (t.reduce != null) parts.push(`被ダメ−${Math.round(t.reduce * 100)}%`);
  if (t.regenPct != null) parts.push(`${t.regenEvery}ターンごと回復${Math.round(t.regenPct * 100)}%`);
  return parts.join(" ・ ");
}

export default function Loadout({ player, onToggle, onLevelUp, onBack }) {
  const equipped = player.equippedSkills || [];
  const owned = player.ownedChapterSkills || {};
  const crystals = player.crystals ?? 0;
  // 中1の7章を対象に一覧（今回の試作の範囲）
  const chapters = chaptersForGrade(1);
  const [confirmId, setConfirmId] = useState(null);   // レベルアップ確認中の章id
  const [celebrate, setCelebrate] = useState(null);   // { name, rank } レベルアップ演出

  function doLevelUp(chapterId, name, nextRank) {
    onLevelUp(chapterId);
    sfx.levelUp();
    setConfirmId(null);
    setCelebrate({ name, rank: nextRank });
    setTimeout(() => setCelebrate(null), 1800);
  }

  const confirmDef = confirmId ? CHAPTER_SKILLS[confirmId] : null;
  const confirmRank = confirmId ? (owned[confirmId] || "D") : null;
  const confirmNext = confirmRank ? SKILL_RANK_ORDER_WITH_D[SKILL_RANK_ORDER_WITH_D.indexOf(confirmRank) + 1] : null;
  const confirmCost = confirmId ? chapterSkillLevelUpCost(confirmId, confirmRank) : null;

  return (
    <div className="app">
      <Header player={player} back="ホーム" onBack={onBack} />
      <div className="content">
        <div className="pg-ttl">🎒 ロードアウト</div>
        <div className="pg-sub">各章のスキルから最大2つ選んで装備しよう。Dランクは最初から使える。小単元ボスを倒すとクリスタルがもらえ、クリスタルでスキルを確実に1段階強化できる（いつかは全部SSに！）。</div>

        <div className="glass" style={{ padding: "10px 16px", display: "flex", justifyContent: "space-around", marginBottom: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 900, color: equipped.length >= 2 ? "#fde047" : "#cceebb" }}>
            装備中：{equipped.length} / 2
          </span>
          <span style={{ fontSize: 13, fontWeight: 900, color: "#67e8f9" }}>
            💎 クリスタル：{crystals}
          </span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {chapters.map((ch) => {
            const def = CHAPTER_SKILLS[ch.id];
            if (!def) return null;
            const rank = owned[ch.id] || "D";
            const isEq = equipped.includes(ch.id);
            const canEquip = isEq || equipped.length < 2;
            const isMaxRank = rank === "SS";
            const levelUpCost = chapterSkillLevelUpCost(ch.id, rank);
            const canLevelUp = !isMaxRank && crystals >= levelUpCost;
            const nextRank = SKILL_RANK_ORDER_WITH_D[SKILL_RANK_ORDER_WITH_D.indexOf(rank) + 1];
            return (
              <div
                key={ch.id}
                className="glass"
                style={{
                  padding: "10px 11px", borderRadius: 12,
                  border: isEq ? "2px solid #fde047" : "1px solid rgba(255,255,255,.12)",
                  boxShadow: isEq ? "0 0 0 2px rgba(253,224,71,.25)" : undefined,
                }}
              >
                <button
                  onClick={() => canEquip && onToggle(ch.id)}
                  disabled={!canEquip}
                  data-sfx="none"
                  style={{
                    display: "block", width: "100%", textAlign: "left", background: "none", border: "none", padding: 0,
                    cursor: canEquip ? "pointer" : "not-allowed", opacity: canEquip ? 1 : 0.5, fontFamily: "inherit",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 16 }}>{def.icon}</span>
                    <span style={{ fontSize: 12.5, fontWeight: 900, color: "#fff" }}>{def.name}</span>
                    {isEq && <span style={{ fontSize: 10, fontWeight: 900, color: "#fde047", marginLeft: "auto" }}>✓</span>}
                  </div>
                  <div style={{ marginTop: 3 }}>
                    <span style={{ fontSize: 10, fontWeight: 900, color: RANK_COLOR[rank], background: "rgba(255,255,255,.08)", borderRadius: 7, padding: "1px 6px" }}>{rank}ランク</span>
                  </div>
                  <div style={{ fontSize: 9.5, color: "#88aa88", marginTop: 4, lineHeight: 1.3 }}>{ch.emoji} {ch.name}</div>
                  <div style={{ fontSize: 10.5, fontWeight: 700, color: "#cceebb", marginTop: 3, lineHeight: 1.3 }}>{tierSummary(ch.id, rank)}</div>
                </button>
                {onLevelUp && (
                  <button
                    onClick={(e) => { e.stopPropagation(); canLevelUp && setConfirmId(ch.id); }}
                    disabled={!canLevelUp}
                    data-sfx="none"
                    style={{
                      marginTop: 7, width: "100%", padding: "7px 6px", borderRadius: 8, fontSize: 9.5, fontWeight: 900,
                      cursor: canLevelUp ? "pointer" : "not-allowed", fontFamily: "inherit", lineHeight: 1.3,
                      border: `1px solid ${canLevelUp ? "#67e8f9" : "rgba(255,255,255,.15)"}`,
                      background: canLevelUp ? "rgba(103,232,249,.12)" : "rgba(255,255,255,.04)",
                      color: canLevelUp ? "#67e8f9" : "rgba(255,255,255,.35)",
                    }}
                  >
                    {isMaxRank ? "SS（最大）" : `🔺 ${nextRank}へ（💎${levelUpCost}）`}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* レベルアップ確認ダイアログ（クリスタルは大切なので必ず確認する） */}
      {confirmDef && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.62)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div className="glass" style={{ maxWidth: 320, width: "100%", padding: "22px 20px", borderRadius: 16, textAlign: "center", border: "2px solid #67e8f9" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>{confirmDef.icon}</div>
            <div style={{ fontSize: 15, fontWeight: 900, color: "#fff", marginBottom: 6 }}>「{confirmDef.name}」をレベルアップしますか？</div>
            <div style={{ fontSize: 12.5, fontWeight: 800, color: "#67e8f9", marginBottom: 18 }}>
              {confirmRank}ランク → {confirmNext}ランク（💎{confirmCost}消費）
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setConfirmId(null)} data-sfx="none" style={{
                flex: 1, padding: "11px", borderRadius: 10, cursor: "pointer", fontFamily: "inherit",
                border: "1px solid rgba(255,255,255,.2)", background: "rgba(255,255,255,.06)", color: "#fff", fontWeight: 800, fontSize: 13,
              }}>キャンセル</button>
              <button onClick={() => doLevelUp(confirmId, confirmDef.name, confirmNext)} data-sfx="none" style={{
                flex: 1, padding: "11px", borderRadius: 10, cursor: "pointer", fontFamily: "inherit", border: "none",
                background: "linear-gradient(135deg,#22c55e,#10b981)", color: "#fff", fontWeight: 900, fontSize: 13,
              }}>はい！</button>
            </div>
          </div>
        </div>
      )}

      {/* レベルアップ演出（ファンファーレ音とセットで出す） */}
      {celebrate && (
        <div style={{ position: "fixed", top: "20%", left: "50%", transform: "translateX(-50%)", zIndex: 60, pointerEvents: "none", padding: "0 16px" }}>
          <div className="glass" style={{
            padding: "16px 24px", borderRadius: 14, textAlign: "center",
            border: "2px solid #fde047", background: "rgba(23,20,5,.92)", boxShadow: "0 0 28px rgba(253,224,71,.55)",
          }}>
            <div style={{ fontSize: 14, fontWeight: 900, color: "#fde047" }}>
              ✨ 「{celebrate.name}」が{celebrate.rank}ランクにレベルアップした！
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
