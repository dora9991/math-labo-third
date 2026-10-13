import { useEffect, useRef, useState } from "react";
import { getStatsAtLevel } from "../growthCurve.js";
import { expProgress, expOf, levelFromExp } from "../expCurve.js";
import { monsterImageUrl, monsterImgFilter } from "../data/monsterImages.js";
import "./characterPopup.css";
import "./expMeter.css";
import { getViewGrade } from "../gradeView.js";
import SubjectPentagon from "./SubjectPentagon.jsx";
import { useGame } from "../ThirdContext.jsx";
import { NICK_MAX, clipNick, cleanNick, nickLength, displayName } from "../nick.js";

const STATUS_LABEL = {
  poison: "毒",
  paralysis: "麻痺",
  sleep: "眠り",
  confusion: "混乱",
  petrification: "石化",
};

// パーティ編成画面でキャラの絵柄をタップすると出す「強さのポップアップ」。
// レベル・次のレベルまでの経験値・積み上げた経験値・HP/ATK・5角形・スキル・耐性を、レア度の色で見せる。
// 経験値（強さ）は学年ごと：いま見ている学年の強さを大きく、ほかの学年のレベルも下に並べる。
const MAX_HP = 1900, MAX_ATK = 650; // バーの目盛り（超えたら満タン扱い）

export default function CharacterPopup({ character, save, onClose }) {
  const { actions } = useGame();
  const own = character ? save.owned[character.id] : null;
  const saved = own?.nick || "";
  const [draft, setDraft] = useState(saved);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState(null); // { ok, text }：つけた／もどした／失敗 のひとこと
  const noteTimer = useRef(0);
  useEffect(() => () => clearTimeout(noteTimer.current), []);
  useEffect(() => { setDraft(saved); setNote(null); }, [character?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!character) return null;
  const grade = getViewGrade();
  const flash = (n) => { setNote(n); clearTimeout(noteTimer.current); noteTimer.current = setTimeout(() => setNote(null), 2600); };
  const commit = async (value) => {
    if (busy) return;
    setBusy(true);
    const r = await actions.setNick(character.id, value);
    setBusy(false);
    if (r.ok) { setDraft(r.nick); flash({ ok: true, text: r.nick ? `「${r.nick}」と よぶよ！` : "もとの名前にもどしたよ" }); }
    else flash({ ok: false, text: "うまくいかなかったよ。もういちど ためしてね" });
  };
  const wanted = cleanNick(draft);
  const changed = wanted !== saved;
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
          <div className="cp-name">{displayName(character)}</div>
          <div className="cp-theme">{saved ? `もとの名前：${character.name}　` : ""}{character.theme}</div>
        </div>

        {own && (
          <div className="cp-sec cp-nick">
            <label className="cp-nick-label" htmlFor="cp-nick-input">ニックネーム</label>
            <div className="cp-nick-row">
              <input
                id="cp-nick-input" className="cp-nick-input" value={draft} placeholder={`${NICK_MAX}文字まで（例：ぷにお）`}
                autoComplete="off" autoCorrect="off" spellCheck={false} enterKeyHint="done"
                onChange={(e) => setDraft(clipNick(e.target.value))}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.nativeEvent.isComposing && changed && !busy) commit(wanted); }}
              />
              <button className="cp-nick-btn" disabled={!changed || busy} onClick={() => commit(wanted)} data-sfx="none">{busy ? "…" : wanted || !saved ? "つける" : "もどす"}</button>
            </div>
            <div className="cp-nick-sub">
              <span className={note ? (note.ok ? "ok" : "ng") : ""}>{note ? note.text : saved ? "自分にだけ見えるよ" : "好きな名前をつけられるよ（自分にだけ見えるよ）"}</span>
              <span>{nickLength(draft)} / {NICK_MAX}</span>
            </div>
            {saved && <button className="cp-nick-reset" onClick={() => commit("")} disabled={busy} data-sfx="none">もとの名前にもどす</button>}
          </div>
        )}

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
