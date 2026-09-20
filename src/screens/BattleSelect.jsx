// ============================================================
// BattleSelect.jsx — バトルする相手を選ぶ画面
//  小単元ごとのモンスター → 章ボス → 最終ボス。
//  解放はタイムアタックの達成と撃破で進む（engine/unlock.js）。
//  未解放はロック表示。新しく解放された敵には「✨ NEW」＆入室時にバナー。
// ============================================================
import { useState, useEffect } from "react";
import Header from "../components/Header.jsx";
import MonsterSprite from "../components/MonsterSprite.jsx";
import { MONSTERS } from "../data/monsters.js";
import { allChapters } from "../data/index.js";
import { getPlayerBattleStats, battleBonuses } from "../engine/battle.js";
import { levelTitle, playerLevel } from "../engine/scoring.js";
import { isUnlocked, newlyUnlockedIds, unlockHint, isChapterMastered } from "../engine/unlock.js";
import { CHAPTER_SKILLS } from "../data/chapterSkills.js";

const AI_TAG = {
  plain: "", healer: "回復してくる", mage: "魔法を使う",
  charger: "力をためる", super: "超必殺をためる", fire: "炎を吐く",
};

// 背景の星
function Stars() {
  const stars = Array.from({ length: 40 }, (_, i) => {
    const sz = Math.random() * 2 + 0.5;
    return (
      <div key={i} className="bstar" style={{
        width: sz, height: sz, top: `${Math.random() * 90}%`, left: `${Math.random() * 100}%`,
        "--d": `${(Math.random() * 2 + 1).toFixed(1)}s`, animationDelay: `${(Math.random() * 3).toFixed(1)}s`,
      }} />
    );
  });
  return <div className="battle-stars">{stars}</div>;
}

export default function BattleSelect({ player, clearedIds, onSelect, onBack, onSeen, onClaimSkill = null, onOpenLoadout = null }) {
  const cleared = clearedIds || new Set();
  const lv = playerLevel(player);            // 現在ワールド（学年）のレベル
  const bonuses = battleBonuses(player);     // 装備＋計算王の上昇率
  const stats = getPlayerBattleStats(lv, bonuses);
  const calcPct = Math.round((bonuses.calcAtkPct || 0) * 100); // 計算王ボーナス（攻撃%）
  const world = player.world || 1;           // ★今いるワールド（学年）の敵だけを表示

  // このワールドに属するモンスターIDの集合（NEW通知もこのワールド内だけ数える）
  const inWorld = (m) => m && m.grade === world;

  // 入室した瞬間の「新しく解放された敵」を覚えておく（バナー＆NEWバッジ用・このワールド内のみ）
  //  小単元ボス(unitSmallBoss)はこの画面にカードを出さない（学習サイクルから挑む専用）ので、
  //  NEW集計に含めると「見つからない新しい敵」の幽霊カウントになる。ここでは除外する。
  const [newly] = useState(() => new Set(
    newlyUnlockedIds(player, cleared).filter((id) => {
      const m = MONSTERS.find((x) => x.id === id);
      return inWorld(m) && m.kind !== "unitSmallBoss";
    })
  ));
  // 見たことにする（次回からはNEWを出さない）
  useEffect(() => {
    if (newly.size && onSeen) onSeen([...newly]);
  }, []); // eslint-disable-line

  // このワールドの最終ボス・サンプル・章・裏ボス
  const finalBoss = MONSTERS.find((m) => m.kind === "finalBoss" && m.grade === world);
  const secretBosses = MONSTERS
    .filter((m) => m.kind === "secretBoss" && m.grade === world)
    .sort((a, b) => a.secretTier - b.secretTier);
  // 裏ボスの入口は魔王を倒してから見せる（それまでは存在を隠す）
  const maouCleared = finalBoss ? cleared.has(finalBoss.id) : false;
  const sample = MONSTERS.find((m) => m.kind === "sample" && m.grade === world);
  const chapters = allChapters().filter((c) => c.grade === world);
  const GRADE_LABEL = { 1: "中1", 2: "中2", 3: "中3" };

  function MonsterCard({ m }) {
    const unlocked = isUnlocked(player, cleared, m);
    const isCleared = cleared.has(m.id);
    const isNew = newly.has(m.id);
    const tough = lv < m.minLv;
    const veryTough = lv < m.minLv - 6;

    if (!unlocked) {
      // ロック表示：何をすれば解放されるかを伝える
      return (
        <div className="bt-panel bt-select-card" style={{ borderColor: "rgba(255,255,255,.12)", opacity: 0.7 }}>
          <div className="bt-select-mini" style={{ borderColor: "rgba(255,255,255,.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30 }}>🔒</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 900, color: "rgba(255,255,255,.55)" }}>？？？</div>
            <div style={{ fontSize: 10.5, color: "#7a9a7a", lineHeight: 1.4, marginTop: 3 }}>{unlockHint(m)}</div>
          </div>
        </div>
      );
    }

    return (
      <button
        className="bt-panel bt-select-card"
        onClick={() => onSelect(m)}
        style={{ borderColor: m.color + "88", position: "relative", overflow: "hidden" }}
      >
        {isNew && (
          <div style={{
            position: "absolute", left: 6, top: 6, zIndex: 4,
            fontSize: 11, fontWeight: 900, color: "#fde047",
            background: "rgba(0,0,0,.5)", border: "1px solid #fde047", borderRadius: 8, padding: "1px 7px",
            textShadow: "0 0 8px rgba(250,204,21,.8)",
          }}>✨ NEW</div>
        )}
        {isCleared && (
          <div style={{
            position: "absolute", right: 8, top: "50%", transform: "translateY(-50%) rotate(-15deg)",
            fontFamily: "'M PLUS Rounded 1c','DotGothic16',sans-serif",
            fontSize: 28, fontWeight: 900, color: "#fde047",
            border: "4px solid #fde047", borderRadius: 10, padding: "2px 10px",
            textShadow: "0 0 10px rgba(250,204,21,.8)",
            boxShadow: "0 0 14px rgba(250,204,21,.5), inset 0 0 12px rgba(250,204,21,.3)",
            opacity: 0.92, pointerEvents: "none", zIndex: 3,
          }}>CLEAR!</div>
        )}
        <div className="bt-select-mini" style={{ borderColor: m.color }}>
          <MonsterSprite monster={m} mini />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 900, color: m.color }}>
            {m.name}
            {veryTough && <span style={{ fontSize: 10, color: "#ff6b6b", marginLeft: 6 }}>☠ かなり手強い</span>}
            {tough && !veryTough && <span style={{ fontSize: 10, color: "#fbbf24", marginLeft: 6 }}>⚠ 手強い</span>}
          </div>
          <div style={{ fontSize: 11, color: "#88aa88" }}>テーマ：{m.unit} ・ 推奨Lv.{m.minLv}</div>
          <div className="bt-select-stats">
            <span className="bt-select-stat">HP {m.hp}</span>
            <span className="bt-select-stat">攻撃 {m.atk}</span>
            <span className="bt-select-stat" style={{ background: "rgba(251,191,36,.2)", color: "#fbbf24" }}>撃破 +{m.reward}XP</span>
          </div>
          {(m.roleTag || AI_TAG[m.ai]) && (
            <div className="bt-select-stats" style={{ marginTop: 3 }}>
              {m.roleTag && <span className="bt-select-stat" style={{ background: "rgba(129,140,248,.18)", color: "#c7d2fe" }}>{m.roleTag}</span>}
              {AI_TAG[m.ai] && <span className="bt-select-stat" style={{ background: "rgba(244,114,182,.18)", color: "#fbcfe8" }}>{AI_TAG[m.ai]}</span>}
            </div>
          )}
        </div>
      </button>
    );
  }

  return (
    <div className="battle-app">
      <Stars />
      <div className="battle-ground" />
      <Header player={player} back="ホーム" onBack={onBack} />
      <div className="battle-content">
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 20, fontWeight: 900, color: "#7fff7f", letterSpacing: 2 }}>⚔️ バトルモード</div>
          {onOpenLoadout && (
            <button onClick={onOpenLoadout} data-sfx="none" style={{
              marginTop: 6, padding: "6px 14px", borderRadius: 10, cursor: "pointer",
              border: "1px solid rgba(196,181,253,.5)", background: "rgba(139,92,246,.15)",
              color: "#d8b4fe", fontSize: 12, fontWeight: 800,
            }}>🎒 ロードアウト（装備中のスキルを選ぶ）</button>
          )}
          <div style={{ fontSize: 13, fontWeight: 900, color: "#fde047", marginTop: 2 }}>
            🌍 {GRADE_LABEL[world] || `中${world}`}ワールド
          </div>
          <div style={{ fontSize: 12, color: "#88aa88", marginTop: 2 }}>
            あなた：Lv.{lv} {levelTitle(lv)} ／ HP {stats.maxHp} ・ 攻撃 {stats.atk} ・ 制限 {stats.timer}秒
          </div>
          {calcPct > 0 && (
            <div style={{ fontSize: 11, fontWeight: 800, color: "#d8b4fe", marginTop: 3 }}>
              🧮 計算王ボーナス：攻撃 +{calcPct}%（計算王への道でこのワールドの章をクリア）
            </div>
          )}
          <div style={{ fontSize: 11, color: "#5a8a5a", marginTop: 2 }}>
            ワールド（学年）ごとに Lv1 から冒険！タイムアタックで難易度を1つ★1にすると単元の敵が出現。全単元を3難易度すべて★1（計算マスター）で章ボスへ！学年は「ホーム」で切り替えできるよ。
          </div>
        </div>

        {/* 新しく解放された敵のお知らせ */}
        {newly.size > 0 && (
          <div className="bt-panel" style={{ borderColor: "#fde047", background: "rgba(250,204,21,.12)", textAlign: "center" }}>
            <div style={{ fontSize: 14, fontWeight: 900, color: "#fde047" }}>✨ 新しい敵キャラが増えた！</div>
            <div style={{ fontSize: 11, color: "#cceebb", marginTop: 2 }}>{newly.size}体の新しい相手に挑戦できるよ！</div>
          </div>
        )}

        {/* 入門サンプル（最初から戦える・1体だけ） */}
        {sample && (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "12px 2px 6px", borderBottom: "1px solid rgba(127,255,127,.35)", paddingBottom: 4 }}>
              <span style={{ fontSize: 18 }}>🌟</span>
              <span style={{ fontSize: 14, fontWeight: 900, color: "#7fff7f" }}>まずはここから（れんしゅう）</span>
            </div>
            <MonsterCard m={sample} />
          </div>
        )}

        {/* このワールド（学年）の章ごとに：小単元モンスター → 章ボス */}
        {chapters.map((ch) => {
          const units = MONSTERS.filter((m) => m.kind === "unit" && m.chapterId === ch.id);
          const boss = MONSTERS.find((m) => m.kind === "chapterBoss" && m.chapterId === ch.id);
          const ladder = MONSTERS.filter((m) => m.kind === "unitBoss" && m.chapterId === ch.id).sort((a, b) => a.tier - b.tier);
          return (
            <div key={ch.id}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "12px 2px 6px", borderBottom: `1px solid ${ch.color}55`, paddingBottom: 4 }}>
                <span style={{ fontSize: 18 }}>{ch.emoji}</span>
                <span style={{ fontSize: 14, fontWeight: 900, color: ch.color }}>{ch.name}</span>
              </div>
              {onClaimSkill && isChapterMastered(player, ch.id) && !player.ownedChapterSkills?.[ch.id] && (
                <button onClick={() => onClaimSkill(ch.id)} data-sfx="none" style={{
                  width: "100%", margin: "0 0 8px", padding: "9px 10px", borderRadius: 10, cursor: "pointer",
                  border: "1px solid #fde047", background: "rgba(250,204,21,.14)", color: "#fde047",
                  fontSize: 12.5, fontWeight: 900, textAlign: "center",
                }}>
                  🎁 計算マスター達成！「{CHAPTER_SKILLS[ch.id]?.name}」のスキルガチャを引く
                </button>
              )}
              {player.ownedChapterSkills?.[ch.id] && (
                <div style={{ fontSize: 11, fontWeight: 800, color: "#a7f3d0", margin: "0 2px 6px" }}>
                  ✨ {CHAPTER_SKILLS[ch.id]?.name}（{player.ownedChapterSkills[ch.id]}ランク）を獲得済み
                </div>
              )}
              {units.map((m) => <MonsterCard key={m.id} m={m} />)}
              {boss && <MonsterCard key={boss.id} m={boss} />}
              {ladder.length > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, margin: "8px 2px 4px" }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: ch.color }}>🪜 ボスの梯子（応用・BP制）</span>
                </div>
              )}
              {ladder.map((m) => <MonsterCard key={m.id} m={m} />)}
            </div>
          );
        })}

        {/* 最終ボス */}
        {finalBoss && (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "16px 2px 6px", borderBottom: "1px solid #e879f955", paddingBottom: 4 }}>
              <span style={{ fontSize: 18 }}>👑</span>
              <span style={{ fontSize: 14, fontWeight: 900, color: "#e879f9" }}>最終決戦</span>
            </div>
            <MonsterCard m={finalBoss} />
          </div>
        )}

        {/* 裏ボス（隠しボス）：魔王を倒すと出現。段階的に解放される“もっと強い敵” */}
        {maouCleared && secretBosses.length > 0 && (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "16px 2px 6px", borderBottom: "1px solid rgba(244,114,182,.4)", paddingBottom: 4 }}>
              <span style={{ fontSize: 18 }}>💀</span>
              <span style={{ fontSize: 14, fontWeight: 900, color: "#f472b6" }}>裏ボス（隠しボス）</span>
              <span style={{ fontSize: 10, color: "#88aa88" }}>推奨Lv80〜300・段階的に出現</span>
            </div>
            {secretBosses.map((m) => <MonsterCard key={m.id} m={m} />)}
          </div>
        )}
      </div>
    </div>
  );
}
