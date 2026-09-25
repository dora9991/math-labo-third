// ============================================================
// ThirdSynth.jsx — 合成・強化。いらない仲間を、ほかの仲間の経験値にする（1体＝200＋その子の経験値÷2）。
//  ・素材：ガチャで被った「予備」（経験値0なので1体200）／持っている仲間（パーティ外。合成するとその子はいなくなる。図鑑には残る）
//  ・予備は「限界突破」に使うこともできる（凸＋1・最大4）。
//  計算と保存はサーバー(third-api)。この画面は選んで押すだけ。
// ============================================================
import { useMemo, useState } from "react";
import { useGame } from "../ThirdContext.jsx";
import { levelFromExp, expOf } from "../expCurve.js";
import { getViewGrade } from "../gradeView.js";
import { getLevelCap } from "../growthCurve.js";
import { GACHA, SYNTH } from "../gachaConfig.js";
import MonsterPortrait from "../components/MonsterPortrait.jsx";

const RARITY_RANK = { N: 0, R: 1, SR: 2, UR: 3 };
const ERR = { "in-party": "パーティに入っている子は使えないよ", "use-spare-first": "その子は予備が あるので、予備から使ってね", "no-spare": "予備が足りないよ", "max-breaks": "限界突破は もう最大だよ", "same-character": "同じ子どうしは合成できないよ" };
const tabBtn = (on) => ({ flex: 1, padding: "9px 6px", borderRadius: 10, fontSize: 13, fontWeight: 900, cursor: "pointer", fontFamily: "inherit", color: "#fff", border: on ? "2px solid #fde047" : "1px solid rgba(255,255,255,.25)", background: on ? "rgba(253,224,71,.16)" : "rgba(255,255,255,.06)" });

export default function ThirdSynth({ nav }) {
  const { save, actions, charactersById } = useGame();
  const [tab, setTab] = useState("spare"); // "spare"（ダブり）| "owned"（持っている子）
  const [material, setMaterial] = useState(null); // 素材のキャラID
  const [target, setTarget] = useState(null); // 強くする子
  const [count, setCount] = useState(1);
  const grade = getViewGrade(); // 合成は「いま見ている学年」の強さ（経験値）で行う
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const sortChars = (ids) => ids.map((id) => charactersById[id]).filter(Boolean).sort((a, b) => RARITY_RANK[b.rarity] - RARITY_RANK[a.rarity] || (save.owned[b.id]?.n || 0) - (save.owned[a.id]?.n || 0));
  const spareIds = Object.keys(save.spares || {}).filter((id) => save.owned[id] && save.spares[id] > 0);
  const spareChars = useMemo(() => sortChars(spareIds), [save]); // eslint-disable-line
  const ownedMaterialIds = Object.keys(save.owned).filter((id) => !save.party.includes(id) && !(save.spares?.[id] > 0));
  const ownedChars = useMemo(() => sortChars(ownedMaterialIds), [save]); // eslint-disable-line
  const allChars = useMemo(() => sortChars(Object.keys(save.owned)), [save]); // eslint-disable-line

  const list = tab === "spare" ? spareChars : ownedChars;
  const source = tab === "spare" ? "spare" : "owned";
  const have = source === "spare" ? save.spares?.[material] || 0 : 1;
  const useCount = source === "spare" ? Math.min(Math.max(1, count), have || 1) : 1;
  const gain = !material ? 0 : source === "spare" ? useCount * SYNTH.baseExp : SYNTH.baseExp + Math.floor(expOf(save.owned[material], grade) * SYNTH.expRate);
  const tChar = target ? charactersById[target] : null;
  const tExp = target ? expOf(save.owned[target], grade) : 0;
  const lvNow = tChar ? levelFromExp(tExp, tChar.rarity) : 0;
  const lvAfter = tChar ? levelFromExp(tExp + gain, tChar.rarity) : 0;
  const atCap = tChar && lvNow >= getLevelCap(tChar.rarity);
  const canSynth = !!material && !!target && !busy && (source === "spare" || material !== target);
  const canBreak = source === "spare" && material && save.owned[material] && (save.spares?.[material] || 0) > 0 && (save.owned[material].breaks || 0) < GACHA.maxBreaks;

  function pickTab(t) { setTab(t); setMaterial(null); setCount(1); setMsg(null); }

  async function synth() {
    if (!canSynth) return;
    setBusy(true); setMsg(null);
    const r = await actions.synthesize({ materialId: material, targetId: target, source, count: useCount, grade });
    setBusy(false);
    if (r.ok) { setMsg({ ok: true, text: `✨ ${tChar?.name} に 経験値 +${r.gain}！` }); setMaterial(null); setCount(1); }
    else setMsg({ ok: false, text: ERR[r.error] || "うまくいかなかったよ" });
  }
  async function doBreak() {
    if (!canBreak || busy) return;
    setBusy(true); setMsg(null);
    const r = await actions.limitBreak(material);
    setBusy(false);
    if (r.ok) { setMsg({ ok: true, text: `💠 ${charactersById[material]?.name} が 限界突破！ ★${r.breaks}` }); setCount(1); }
    else setMsg({ ok: false, text: ERR[r.error] || "うまくいかなかったよ" });
  }

  const Grid = ({ chars, selectedId, onPick, badge }) => (
    <div className="mw-bench-grid">
      {chars.map((c) => (
        <button key={c.id} className="mw-portrait-btn mw-bench-item" onClick={() => onPick(c.id)} style={{ position: "relative" }}>
          <MonsterPortrait character={c} size="small" selected={selectedId === c.id} />
          {badge?.(c)}
        </button>
      ))}
    </div>
  );
  const spareBadge = (c) => (save.spares?.[c.id] > 0 ? <span className="mw-spare-badge">予備×{save.spares[c.id]}</span> : null);

  return (
    <div className="mw-fantasy-screen">
      <div className="mw-fantasy-topbar">
        <button className="mw-fantasy-back" onClick={() => nav.back()}>← もどる</button>
        <span className="mw-fantasy-title" style={{ fontSize: "1.1rem" }}>合成・強化</span>
        <span className="mw-fantasy-coin">💎 {save.crystals}</span>
      </div>

      <div className="mw-fantasy-panel">
        <div className="mw-bench-title">① いらない子をえらぶ（合成すると経験値になるよ）</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <button style={tabBtn(tab === "spare")} onClick={() => pickTab("spare")}>ダブり（予備）{spareChars.length ? `　${spareChars.length}種` : ""}</button>
          <button style={tabBtn(tab === "owned")} onClick={() => pickTab("owned")}>持っている子</button>
        </div>
        {list.length === 0 ? (
          <div style={{ color: "#c9b98f", fontSize: 12.5, lineHeight: 1.7, textAlign: "center", padding: "10px 0" }}>
            {tab === "spare" ? "ダブりの子は まだいないよ。ガチャで同じ子が出ると、ここに「予備」として残るよ。" : "パーティに入っていない子が いないよ。"}
          </div>
        ) : <Grid chars={list} selectedId={material} onPick={(id) => { setMaterial(id); setCount(1); setMsg(null); }} badge={tab === "spare" ? spareBadge : (c) => <span className="mw-spare-badge">Exp {expOf(save.owned[c.id], grade)}</span>} />}
        {material && source === "spare" && have > 1 && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginTop: 10 }}>
            <button className="menu-step-btn" onClick={() => setCount((n) => Math.max(1, n - 1))} aria-label="へらす">−</button>
            <span style={{ fontWeight: 900 }}>{useCount} 体 / 予備 {have} 体</span>
            <button className="menu-step-btn" onClick={() => setCount((n) => Math.min(have, n + 1))} aria-label="ふやす">＋</button>
            <button className="mw-diff-btn" onClick={() => setCount(have)}>ぜんぶ</button>
          </div>
        )}
      </div>

      <div className="mw-fantasy-panel">
        <div className="mw-bench-title">② 強くする子をえらぶ</div>
        <Grid chars={allChars} selectedId={target} onPick={(id) => { setTarget(id); setMsg(null); }} badge={(c) => <span className="mw-spare-badge">Lv{levelFromExp(expOf(save.owned[c.id], grade), c.rarity)}</span>} />
      </div>

      <div className="mw-fantasy-panel mw-center" style={{ lineHeight: 1.8, minHeight: 0 }}>
        {!material || !target ? (
          <div style={{ color: "#c9b98f", fontSize: 13 }}>{!material ? "① いらない子を えらんでね" : "② 強くする子を えらんでね"}</div>
        ) : (
          <>
            <div style={{ fontSize: 13, color: "#ffe9b3" }}>{charactersById[material]?.name}{source === "spare" ? ` ×${useCount}` : ""} → {tChar?.name}</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: "#7cff8a" }}>経験値 +{gain}</div>
            <div style={{ fontSize: 12.5, color: "#ffe9b3" }}>Lv {lvNow} → <b style={{ color: lvAfter > lvNow ? "#fde047" : "#ffe9b3" }}>Lv {lvAfter}</b>{atCap ? "（レベル上限！経験値はむだになるよ）" : ""}</div>
            {source === "owned" && <div style={{ fontSize: 11.5, color: "#ffb4b4" }}>※ {charactersById[material]?.name} は仲間からいなくなります（図鑑には残ります）</div>}
            {material === target && source === "owned" && <div style={{ fontSize: 11.5, color: "#ffb4b4" }}>同じ子どうしは合成できないよ</div>}
          </>
        )}
        {msg && <div style={{ marginTop: 6, fontWeight: 900, color: msg.ok ? "#7cff8a" : "#ffb4b4" }}>{msg.text}</div>}
      </div>

      <button className="mw-fantasy-item" style={{ justifyContent: "center" }} disabled={!canSynth} onClick={synth}><span className="mw-fantasy-icon">🔄</span>{busy ? "…" : "合成する"}</button>
      {canBreak && (
        <button className="mw-fantasy-item" style={{ justifyContent: "center" }} disabled={busy} onClick={doBreak}>
          <span className="mw-fantasy-icon">💠</span>予備を使って「{charactersById[material]?.name}」を限界突破（★{save.owned[material].breaks} → ★{save.owned[material].breaks + 1}）
        </button>
      )}
      <button className="mw-fantasy-item" style={{ justifyContent: "center" }} onClick={() => nav.go("gacha", {}, { replace: true })}><span className="mw-fantasy-icon">🎰</span>ガチャへ</button>
    </div>
  );
}
