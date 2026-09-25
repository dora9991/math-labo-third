import { getStatsAtLevel } from "../growthCurve.js";
import { expProgress, expOf, levelFromExp } from "../expCurve.js";
import { monsterImageUrl, monsterImgFilter } from "../data/monsterImages.js";
import "./characterPopup.css";
import "./expMeter.css";
import { getViewGrade } from "../gradeView.js";
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
// レベル・次のレベルまでの経験値・積み上げた経験値・HP/ATK・5角形・スキル・耐性を、レア度の色で見せる。
// 経験値（強さ）は学年ごと：いま見ている学年の強さを大きく、ほかの学年のレベルも下に並べる。
const MAX_HP = 1900, MAX_ATK = 650; // バーの目盛り（超えたら満タン扱い）

export default function CharacterPopup({ character, save, onClose }) {
  if (!character) return null;
  const grade = getViewGrade();
  const own = save.owned[character.id];
  const chr = { ...character, breaks: own?.breaks || 0 };
  const total = expOf(own, grade);
  const prog = expProgress(total, character.rarity);
  const stats = getStatsAtLevel(chr, prog.level);
  const url = monsterImageUrl(character, "full");
  const pct = prog.isMax ? 100 : Math.min(100, Math.round((prog.current / prog.need) * 100));

  return (
    <div className="mw-modal-backdrop" onClick={onClose}>
      <div className={`cp-card cp-${character.rarity}`} onClick={(e) => e.stopPropagation()}>
        <div className="cp-hero">
          <span className="cp-rar">{character.rarity}</span>
          {url ? <img className="cp-art" src={url} alt={character.name} style={{ filter: monsterImgFilter(character) }} draggable={false} /> : <div style={{ fontSize: "4rem" }}>❓</div>}
          <div className="cp-name">{character.name}</div>
          <div className="cp-theme">{character.theme}</div>
        </div>

        <div className="cp-sec">
          <div className="cp-lvbox">
            <span className="cp-lvl">LEVEL</span>
            <span className="cp-lv">{stats.level}</span>
            <span className="cp-cap">{stats.isMaxLevel ? "MAX" : `上限 ${stats.levelCap}`}　中{grade}の強さ</span>
          </div>
          <div className="xm-bar" style={{ marginTop: 8 }}><div className="xm-fill" style={{ width: `${pct}%` }} /></div>
          <div className="cp-expline">
            <span>{prog.isMax ? "レベルMAX！" : <>次のレベルまで あと <b>{prog.need - prog.current}</b></>}</span>
            <span>{prog.isMax ? "" : `${prog.current} / ${prog.need}`}</span>
          </div>
          <div className="cp-total">積み上げた経験値　<b>{total.toLocaleString()}</b> EXP</div>
          <div className="cp-grades">
            {[1, 2, 3].map((g) => (
              <span key={g} className={g === grade ? "on" : ""}>中{g}　Lv.{levelFromExp(expOf(own, g), character.rarity)}</span>
            ))}
          </div>
        </div>

        <div className="cp-sec cp-stats">
          <div className="cp-stat hp"><span className="lbl">HP</span><span className="track"><i style={{ width: `${Math.min(100, (stats.hp / MAX_HP) * 100)}%` }} /></span><span className="num">{stats.hp}</span></div>
          <div className="cp-stat atk"><span className="lbl">ATK</span><span className="track"><i style={{ width: `${Math.min(100, (stats.atk / MAX_ATK) * 100)}%` }} /></span><span className="num">{stats.atk}</span></div>
        </div>

        <div className="cp-h">得意分野</div>
        <SubjectPentagon subjects={character.subjects} />

        {character.skill && (
          <>
            <div className="cp-h">スキル</div>
            <div className="mw-dex-skill" style={{ margin: "6px 16px 0" }}>
              <span className="mw-dex-skill-icon">{character.skill.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700 }}>{character.skill.name}</div>
                {character.skill.desc && <div style={{ opacity: 0.8, fontSize: "0.8rem" }}>{character.skill.desc}</div>}
              </div>
            </div>
          </>
        )}

        {character.resistances && (
          <>
            <div className="cp-h">状態異常の耐性</div>
            <div className="mw-dex-resist-row" style={{ margin: "6px 16px 0" }}>
              {Object.entries(STATUS_LABEL).map(([key, label]) => (
                <div className="mw-dex-resist-chip" key={key}>
                  <span className="mw-dex-resist-label">{label}</span>
                  <span className="mw-dex-resist-value">{character.resistances[key]}</span>
                </div>
              ))}
            </div>
          </>
        )}

        <button className="cp-close" onClick={onClose}>とじる</button>
      </div>
    </div>
  );
}
