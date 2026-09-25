import { getStatsAtLevel } from "../growthCurve.js";
import { levelFromExp, expOf } from "../expCurve.js";
import { getViewGrade } from "../gradeView.js";
import MonsterPortrait from "./MonsterPortrait.jsx";
import SubjectPentagon from "./SubjectPentagon.jsx";

const STATUS_LABEL = {
  poison: "毒",
  paralysis: "麻痺",
  seal: "封印",
  slow: "スロー",
  confusion: "混乱",
  petrification: "石化",
};

// パーティ編成画面でキャラの絵柄をタップすると出す「強さのポップアップ」。
// 2026-09-17追加：レベル・HP・5角形(5パラメータ)・スキル・能力(耐性)をまとめて見せる。
export default function CharacterPopup({ character, save, onClose }) {
  if (!character) return null;
  const level = levelFromExp(expOf(save.owned[character.id], getViewGrade()), character.rarity);
  const stats = getStatsAtLevel(character, level);

  return (
    <div className="mw-modal-backdrop" onClick={onClose}>
      <div className="mw-modal-card" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div style={{ width: 64 }}>
            <MonsterPortrait character={character} size="small" />
          </div>
          <div style={{ flex: 1 }}>
            <span className={`mw-rarity mw-rarity-${character.rarity}`}>{character.rarity}</span>{" "}
            <strong>{character.name}</strong>
            <div style={{ opacity: 0.75, fontWeight: 600, fontSize: "0.85rem" }}>{character.theme}</div>
          </div>
        </div>

        <div className="mw-modal-stat-row">
          <span>
            Lv.{stats.level}
            {stats.isMaxLevel ? "（MAX）" : ` / ${stats.levelCap}`}
          </span>
          <span>HP {stats.hp}</span>
        </div>

        <SubjectPentagon subjects={character.subjects} />

        {character.skill && (
          <div className="mw-dex-skill">
            <span className="mw-dex-skill-icon">{character.skill.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700 }}>{character.skill.name}</div>
              {character.skill.desc && (
                <div style={{ opacity: 0.8, fontSize: "0.8rem" }}>{character.skill.desc}</div>
              )}
            </div>
          </div>
        )}

        {character.resistances && (
          <div>
            <div className="mw-dex-resist-title">能力（毒/麻痺/封印/スロー/混乱/石化耐性）</div>
            <div className="mw-dex-resist-row">
              {Object.entries(STATUS_LABEL).map(([key, label]) => (
                <div className="mw-dex-resist-chip" key={key}>
                  <span className="mw-dex-resist-label">{label}</span>
                  <span className="mw-dex-resist-value">{character.resistances[key]}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <button className="mw-fantasy-back" onClick={onClose}>
          とじる
        </button>
      </div>
    </div>
  );
}
