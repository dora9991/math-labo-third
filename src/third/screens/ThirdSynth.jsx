// ============================================================
// ThirdSynth.jsx — 合成・強化。合成するキャラを、ほかの仲間の経験値にする（1体＝200＋その子の経験値÷2）。
//  ・強くする子を先にえらぶ → 合成するキャラをタップでまとめて選ぶ（予備はタップするたびに1体ずつ増える）→ 下の「合成する」で一気に合成。
//  ・素材：ガチャで被った「予備」（経験値0なので1体200）／持っている仲間（パーティ外。合成するとその子はいなくなる。図鑑には残る）
//  ・予備は「限界突破」に使うこともできる（凸＋1・最大4）。
//  計算と保存はサーバー(third-api)。この画面は選んで押すだけ。合成の演出は SynthFx。
// ============================================================
import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useGame } from "../ThirdContext.jsx";
import { levelFromExp, expOf } from "../expCurve.js";
import { getViewGrade } from "../gradeView.js";
import { getLevelCap } from "../growthCurve.js";
import { GACHA, SYNTH } from "../gachaConfig.js";
import { monsterImageUrl } from "../data/monsterImages.js";
import { playGachaChargeSound, playGachaBurstSound } from "../fx/sound.js";
import MonsterPortrait from "../components/MonsterPortrait.jsx";
import ExpMeter from "../components/ExpMeter.jsx";
import "./synth.css";

const RARITY_RANK = { N: 0, R: 1, SR: 2, UR: 3 };
const ERR = { "in-party": "パーティに入っている子は使えないよ", "use-spare-first": "その子は予備が あるので、予備から使ってね", "no-spare": "予備が足りないよ", "max-breaks": "限界突破は もう最大だよ", "same-character": "同じ子どうしは合成できないよ", "bad-material": "その子は もういないよ。画面を読み込み直してね" };
const tabBtn = (on) => ({ flex: 1, padding: "9px 6px", borderRadius: 10, fontSize: 13, fontWeight: 900, cursor: "pointer", fontFamily: "inherit", color: "#fff", border: on ? "2px solid #fde047" : "1px solid rgba(255,255,255,.25)", background: on ? "rgba(253,224,71,.16)" : "rgba(255,255,255,.06)" });

/** 合成の演出：素材が中心に吸い込まれ → 光 → 強くする子が弾ける → 経験値メーターがのびる。 */
function SynthFx({ fx, onClose }) {
  // fx: { phase:"charge"|"done", target, mats:[char], gain, from, to, lvBefore, lvAfter }
  const done = fx.phase === "done";
  return createPortal(
    <div className="sfx" onClick={done ? undefined : undefined}>
      <div className="sfx-stage">
        <div className={`sfx-glow ${fx.phase === "charge" ? "charge" : ""}`} />
        {fx.mats.slice(0, 8).map((c, i, a) => (
          <div key={c.id + i} className="sfx-mat go" style={{ "--a": `${(360 / a.length) * i}deg`, "--i": i }}>
            {monsterImageUrl(c, "small") && <img src={monsterImageUrl(c, "small")} alt="" draggable={false} />}
          </div>
        ))}
        <div className={`sfx-core ${done ? "pop" : ""}`}>
          {monsterImageUrl(fx.target, "full") && <img src={monsterImageUrl(fx.target, "full")} alt={fx.target.name} draggable={false} />}
        </div>
        {done && (
          <>
            <div className="sfx-ring burst" /><div className="sfx-ring burst b2" />
            {Array.from({ length: 28 }, (_, i) => <span key={i} className="sfx-spark burst" style={{ "--a": `${i * (360 / 28)}deg`, "--d": `${120 + (i % 5) * 34}px`, "--i": i }} />)}
          </>
        )}
        <div className={`sfx-flash ${done ? "burst" : ""}`} />
      </div>
      <div className="sfx-title">{done ? (fx.lvAfter > fx.lvBefore ? "LEVEL UP!" : "SYNTHESIS!") : "合 成 中 …"}</div>
      {done && (
        <div className="sfx-result">
          <div className="sfx-gain">経験値 +{fx.gain}</div>
          <ExpMeter character={fx.target} from={fx.from} to={fx.to} delay={450} />
          <button className="sfx-ok" onClick={onClose}>OK</button>
        </div>
      )}
    </div>,
    document.body
  );
}

export default function ThirdSynth({ nav }) {
  const { save, actions, charactersById } = useGame();
  const grade = getViewGrade(); // 合成は「いま見ている学年」の強さ（経験値）で行う
  const [tab, setTab] = useState("spare"); // "spare"（ダブり）| "owned"（持っている子）
  const [target, setTarget] = useState(null); // 強くする子
  const [changing, setChanging] = useState(true); // 強くする子の一覧を開いているか
  const [selSpare, setSelSpare] = useState({}); // { id: 個数 }
  const [selOwned, setSelOwned] = useState({}); // { id: true }
  const [lastSpare, setLastSpare] = useState(null); // 限界突破に使う予備の子
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [fx, setFx] = useState(null);

  const sortChars = (ids) => ids.map((id) => charactersById[id]).filter(Boolean).sort((a, b) => RARITY_RANK[b.rarity] - RARITY_RANK[a.rarity] || (save.owned[b.id]?.n || 0) - (save.owned[a.id]?.n || 0));
  const spareIds = Object.keys(save.spares || {}).filter((id) => save.owned[id] && save.spares[id] > 0);
  const spareChars = useMemo(() => sortChars(spareIds), [save]); // eslint-disable-line
  const ownedMaterialIds = Object.keys(save.owned).filter((id) => !save.party.includes(id) && !(save.spares?.[id] > 0) && id !== target);
  const ownedChars = useMemo(() => sortChars(ownedMaterialIds), [save, target]); // eslint-disable-line
  const allChars = useMemo(() => sortChars(Object.keys(save.owned)), [save]); // eslint-disable-line

  // 選択の中身（いなくなった子の選択は無視する）
  const spareSel = Object.entries(selSpare).filter(([id, n]) => n > 0 && (save.spares?.[id] || 0) >= 1).map(([id, n]) => ({ id, source: "spare", count: Math.min(n, save.spares[id]) }));
  const ownedSel = Object.keys(selOwned).filter((id) => selOwned[id] && ownedMaterialIds.includes(id)).map((id) => ({ id, source: "owned" }));
  const materials = [...spareSel, ...ownedSel];
  const gain = spareSel.reduce((a, m) => a + m.count * SYNTH.baseExp, 0) + ownedSel.reduce((a, m) => a + SYNTH.baseExp + Math.floor(expOf(save.owned[m.id], grade) * SYNTH.expRate), 0);
  const tChar = target ? charactersById[target] : null;
  const tExp = target && save.owned[target] ? expOf(save.owned[target], grade) : 0;
  const lvNow = tChar ? levelFromExp(tExp, tChar.rarity) : 0;
  const lvAfter = tChar ? levelFromExp(tExp + gain, tChar.rarity) : 0;
  const atCap = tChar && lvNow >= getLevelCap(tChar.rarity);
  const matCount = spareSel.reduce((a, m) => a + m.count, 0) + ownedSel.length;
  const canSynth = !!target && materials.length > 0 && !busy;
  const canBreak = !busy && lastSpare && save.owned[lastSpare] && (save.spares?.[lastSpare] || 0) > 0 && (save.owned[lastSpare].breaks || 0) < GACHA.maxBreaks;

  function pickTarget(id) { setTarget(id); setChanging(false); setMsg(null); setSelOwned((o) => { const n = { ...o }; delete n[id]; return n; }); }
  function tapSpare(id) { // タップするたびに 0→1→…→全部→0
    setMsg(null); setLastSpare(id);
    setSelSpare((s) => { const have = save.spares?.[id] || 0; const cur = s[id] || 0; return { ...s, [id]: cur >= have ? 0 : cur + 1 }; });
  }
  function tapOwned(id) { setMsg(null); setSelOwned((s) => ({ ...s, [id]: !s[id] })); }
  function selectAll() {
    if (tab === "spare") setSelSpare(Object.fromEntries(spareIds.map((id) => [id, save.spares[id]])));
    else setSelOwned(Object.fromEntries(ownedMaterialIds.map((id) => [id, true])));
  }
  function clearSel() { if (tab === "spare") setSelSpare({}); else setSelOwned({}); }
  function pickTab(t) { setTab(t); setMsg(null); }

  async function synth() {
    if (!canSynth) return;
    const snap = { target: tChar, mats: materials.flatMap((m) => Array.from({ length: Math.min(m.count || 1, 3) }, () => charactersById[m.id])).filter(Boolean), gain, from: tExp, to: tExp + gain, lvBefore: lvNow, lvAfter };
    setBusy(true); setMsg(null);
    setFx({ ...snap, phase: "charge" }); playGachaChargeSound("SR");
    const t0 = Date.now();
    const r = await actions.synthesize({ targetId: target, materials: materials.map((m) => (m.source === "spare" ? { id: m.id, source: "spare", count: m.count } : { id: m.id, source: "owned" })), grade });
    const wait = Math.max(0, 1500 - (Date.now() - t0)); // 演出の溜めの長さ
    if (wait) await new Promise((res) => setTimeout(res, wait));
    setBusy(false);
    if (r.ok) {
      playGachaBurstSound(lvAfter > lvNow ? "UR" : "SR");
      setFx({ ...snap, gain: r.gain, to: snap.from + r.gain, phase: "done" });
      setSelSpare({}); setSelOwned({}); setLastSpare(null); // 使った子は選択から外す（一覧からも消える）
    } else { setFx(null); setMsg({ ok: false, text: ERR[r.error] || "うまくいかなかったよ" }); }
  }
  async function doBreak() {
    if (!canBreak) return;
    setBusy(true); setMsg(null);
    const r = await actions.limitBreak(lastSpare);
    setBusy(false);
    if (r.ok) setMsg({ ok: true, text: `💠 ${charactersById[lastSpare]?.name} が 限界突破！ ★${r.breaks}` });
    else setMsg({ ok: false, text: ERR[r.error] || "うまくいかなかったよ" });
  }

  const Grid = ({ chars, onPick, badge, isOn, count }) => (
    <div className="mw-bench-grid">
      {chars.map((c) => (
        <button key={c.id} className={`mw-portrait-btn mw-bench-item sy-pick ${isOn?.(c) ? "on" : ""}`} onClick={() => onPick(c.id)} style={{ position: "relative" }}>
          {count?.(c) > 0 && <span className="sy-check">{count(c)}</span>}
          <MonsterPortrait character={c} size="small" />
          {badge?.(c)}
        </button>
      ))}
    </div>
  );

  return (
    <div className="mw-fantasy-screen">
      <div className="mw-fantasy-topbar">
        <button className="mw-fantasy-back" onClick={() => nav.back()}>← もどる</button>
        <span className="mw-fantasy-title" style={{ fontSize: "1.1rem" }}>合成・強化</span>
        <span className="mw-fantasy-coin">💎 {save.crystals}</span>
      </div>

      <div className="mw-fantasy-panel">
        <div className="mw-bench-title">① 強くする子をえらぶ（中{grade}の強さ）</div>
        {tChar && !changing ? (
          <div className="sy-target">
            {monsterImageUrl(tChar, "full") ? <img src={monsterImageUrl(tChar, "full")} alt={tChar.name} draggable={false} /> : <div />}
            <div>
              <div className="sy-tname"><span className={`mw-rarity mw-rarity-${tChar.rarity}`}>{tChar.rarity}</span> {tChar.name}</div>
              <div className="sy-tlv">Lv {lvNow}{matCount > 0 && lvAfter > lvNow ? <span style={{ color: "#fde047" }}> → {lvAfter}</span> : ""}</div>
              <div style={{ fontSize: 11.5, color: "#c9d6d8" }}>{atCap ? "レベル上限！" : `経験値 ${tExp}`}</div>
              <button className="mw-diff-btn" style={{ marginTop: 6 }} onClick={() => setChanging(true)}>えらびなおす</button>
            </div>
          </div>
        ) : (
          <Grid chars={allChars} onPick={pickTarget} isOn={(c) => c.id === target} badge={(c) => <span className="mw-spare-badge">Lv{levelFromExp(expOf(save.owned[c.id], grade), c.rarity)}</span>} />
        )}
      </div>

      <div className="mw-fantasy-panel">
        <div className="mw-bench-title">② 合成するキャラをえらぶ（タップでいくつでも／経験値として力をあずけるよ）</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <button style={tabBtn(tab === "spare")} onClick={() => pickTab("spare")}>ダブり（予備）{spareChars.length ? `　${spareChars.length}種` : ""}</button>
          <button style={tabBtn(tab === "owned")} onClick={() => pickTab("owned")}>持っている子</button>
        </div>
        {(tab === "spare" ? spareChars : ownedChars).length === 0 ? (
          <div style={{ color: "#c9b98f", fontSize: 12.5, lineHeight: 1.7, textAlign: "center", padding: "10px 0" }}>
            {tab === "spare" ? "ダブりの子は まだいないよ。ガチャで同じ子が出ると、ここに「予備」として残るよ。" : "パーティに入っていない子が いないよ。"}
          </div>
        ) : (
          <>
            <div className="sy-tools">
              <button onClick={selectAll}>ぜんぶ選ぶ</button>
              <button onClick={clearSel}>選びなおす</button>
            </div>
            {tab === "spare"
              ? <Grid chars={spareChars} onPick={tapSpare} isOn={(c) => (selSpare[c.id] || 0) > 0} count={(c) => selSpare[c.id] || 0} badge={(c) => <span className="mw-spare-badge">×{save.spares[c.id]}</span>} />
              : <Grid chars={ownedChars} onPick={tapOwned} isOn={(c) => !!selOwned[c.id]} count={(c) => (selOwned[c.id] ? 1 : 0)} badge={(c) => <span className="mw-spare-badge">Exp {expOf(save.owned[c.id], grade)}</span>} />}
          </>
        )}
        {tab === "owned" && ownedSel.length > 0 && <div style={{ fontSize: 11.5, color: "#ffb4b4", marginTop: 8 }}>※ 合成したキャラは、力をあずけて旅立ちます（仲間からははなれますが、図鑑には残ります）</div>}
        {canBreak && (
          <button className="mw-fantasy-item" style={{ justifyContent: "center", marginTop: 10, width: "100%" }} onClick={doBreak}>
            <span className="mw-fantasy-icon">💠</span>予備を使って「{charactersById[lastSpare]?.name}」を限界突破（★{save.owned[lastSpare].breaks} → ★{save.owned[lastSpare].breaks + 1}）
          </button>
        )}
        {msg && <div style={{ marginTop: 8, fontWeight: 900, color: msg.ok ? "#7cff8a" : "#ffb4b4", textAlign: "center" }}>{msg.text}</div>}
      </div>

      <button className="mw-fantasy-item" style={{ justifyContent: "center" }} onClick={() => nav.go("gacha", {}, { replace: true })}><span className="mw-fantasy-icon">🎰</span>ガチャへ</button>

      <div style={{ height: 96 }} />
      {createPortal(
      <div className="sy-bar">
        <div className="sum">
          {!target ? "① 強くする子を えらんでね" : matCount === 0 ? "② 合成するキャラを えらんでね" : <>{matCount}体 → {tChar?.name}<br /><b>経験値 +{gain}</b>　Lv {lvNow} → <b style={{ color: lvAfter > lvNow ? "#fde047" : "#7cff8a" }}>{lvAfter}</b>{atCap ? "（上限！むだになるよ）" : ""}</>}
        </div>
        <button className="sy-go" disabled={!canSynth} onClick={synth}>{busy ? "…" : "合成！"}</button>
      </div>,
        document.body
      )}

      {fx && <SynthFx fx={fx} onClose={() => setFx(null)} />}
    </div>
  );
}
