// ============================================================
// ThirdGacha.jsx — ガチャ画面（数学ラボ3）。クリスタル(💎)で引く。抽選は**サーバー**が行う（ローカルモードは開発用）。
//  2026-09-25 全面リニューアル：召喚の間の一枚絵＋回る魔法陣＋浮かぶクリスタル → 溜め（光が集まる）→ 爆発（レア度で色・光・揺れ・音が変わる）
//   → 仲間があらわれる（UR は虹色）→ 10連は結果カードが1枚ずつ弾ける。ダブりは「予備」として残り、合成・限界突破に使える。
//  画面は body に直接描く（メニューの切り替え演出の内側だと fixed の位置がずれるため）。
// ============================================================
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useGame } from "../ThirdContext.jsx";
import { GACHA } from "../gachaConfig.js";
import { monsterImageUrl, monsterImgFilter } from "../data/monsterImages.js";
import { playGachaChargeSound, playGachaBurstSound, playGachaCardSound } from "../fx/sound.js";
import "./gacha.css";

const artGlob = import.meta.glob("../assets/gacha/*.webp", { eager: true, query: "?url", import: "default" });
const ART = Object.fromEntries(Object.entries(artGlob).map(([p, u]) => [p.split("/").pop().replace(".webp", ""), u]));

const RARITY = {
  N: { jp: "ノーマル", en: "NORMAL", stars: 1, chargeMs: 1500 },
  R: { jp: "レア", en: "RARE", stars: 2, chargeMs: 1600 },
  SR: { jp: "スーパーレア", en: "SUPER RARE", stars: 3, chargeMs: 1900 },
  UR: { jp: "ウルトラレア", en: "ULTRA RARE", stars: 5, chargeMs: 2400 },
};
const RANK = { N: 0, R: 1, SR: 2, UR: 3 };
const BURST_MS = 800;

// きらきら粒（位置・大きさ・遅れをランダムに。レア度が高いほど多い）
function Sparks({ count, seed }) {
  const items = useMemo(() => Array.from({ length: count }, (_, i) => {
    const a = (i / count) * Math.PI * 2 + Math.random() * 0.5;
    const d = 18 + Math.random() * 42;
    return { i, x: Math.cos(a) * d, y: Math.sin(a) * d, s: 4 + Math.random() * 9, delay: Math.random() * 0.6, dur: 1.1 + Math.random() * 1.2, hue: Math.floor(Math.random() * 360) };
  }), [count, seed]); // eslint-disable-line
  return (
    <div className="gx-sparks" aria-hidden>
      {items.map((p) => <i key={p.i} style={{ "--x": `${p.x}vmin`, "--y": `${p.y}vmin`, "--s": `${p.s}px`, "--h": p.hue, animationDelay: `${p.delay}s`, animationDuration: `${p.dur}s` }} />)}
    </div>
  );
}
const Stars = ({ n }) => <div className="gx-stars-row">{Array.from({ length: n }, (_, i) => <span key={i} style={{ animationDelay: `${0.25 + i * 0.12}s` }}>★</span>)}</div>;

export default function ThirdGacha({ nav }) {
  const { save, actions, charactersById, mode } = useGame();
  const [phase, setPhase] = useState("idle"); // idle | charge | burst | reveal | list
  const [results, setResults] = useState([]);
  const [top, setTop] = useState(null);
  const [error, setError] = useState(null);
  const [round, setRound] = useState(0);
  const timers = useRef([]);
  const busy = phase === "charge" || phase === "burst";
  const rar = top ? RARITY[top.rarity] : RARITY.N;

  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const later = (fn, ms) => { timers.current.push(setTimeout(fn, ms)); };

  async function pull(count) {
    if (busy) return;
    setError(null);
    const r = await actions.pullGacha(count);
    if (!r.ok) { setError(r.error === "not-enough-crystals" ? "クリスタルが足りないよ" : "うまくいかなかったよ。もういちど"); return; }
    const best = [...r.results].sort((a, b) => RANK[b.rarity] - RANK[a.rarity])[0];
    setResults(r.results); setTop(best); setRound((n) => n + 1);
    setPhase("charge");
    playGachaChargeSound(best.rarity);
    timers.current.forEach(clearTimeout); timers.current = [];
    const ch = RARITY[best.rarity].chargeMs;
    later(() => { setPhase("burst"); playGachaBurstSound(best.rarity); }, ch);
    later(() => setPhase("reveal"), ch + BURST_MS);
  }
  function skipToReveal() {
    timers.current.forEach(clearTimeout); timers.current = [];
    if (phase === "charge") playGachaBurstSound(top?.rarity);
    setPhase("reveal");
  }
  function showList() {
    setPhase("list");
    results.forEach((r, i) => later(() => playGachaCardSound(r.rarity), 160 + i * 190));
  }
  function again() { timers.current.forEach(clearTimeout); setPhase("idle"); setTop(null); }

  const topChar = top ? charactersById[top.id] : null;
  const canOne = save.crystals >= GACHA.costPerPull;
  const canTen = save.crystals >= GACHA.costPerPull * GACHA.packSize;
  const themeKey = top && phase !== "idle" ? top.rarity : "N";
  const sparkCount = { N: 14, R: 24, SR: 40, UR: 70 }[themeKey];
  const spareLine = (r) => (r.isNew ? "🆕 あたらしい仲間！" : `ダブり → 予備に ついか（×${r.spares}）　💎+${r.refund || 0}`);

  const ui = (
    <div className={`gx-root gx-t-${themeKey} gx-phase-${phase} ${phase === "burst" ? `gx-shake-${themeKey}` : ""}`}>
      <div className="gx-bg" style={ART.gacha_bg ? { backgroundImage: `url(${ART.gacha_bg})` } : undefined} />
      <div className="gx-vignette" />
      <div className="gx-twinkle" aria-hidden />

      <div className="gx-top">
        <button className="gx-back" onClick={() => nav.back()} disabled={busy} data-sfx="none">← もどる</button>
        <div className="gx-title">GACHA</div>
        <div className="gx-crystals">💎 {save.crystals}</div>
      </div>
      {mode === "guest" && <div className="gx-note">👤 ゲストで遊び中：データは のこりません</div>}
      {mode === "local" && <div className="gx-note gx-note-warn">⚠️ 開発用のローカルモード（サーバーではありません）</div>}

      {/* ---- 召喚の間：魔法陣とクリスタル ---- */}
      {(phase === "idle" || phase === "charge" || phase === "burst") && (
        <div className={`gx-stage ${phase === "charge" ? "is-charge" : ""} ${phase === "burst" ? "is-burst" : ""}`}>
          {ART.gacha_circle ? <img className="gx-circle" src={ART.gacha_circle} alt="" draggable={false} /> : <div className="gx-circle gx-circle-fallback" />}
          <div className="gx-pillars" aria-hidden><i /><i /><i /><i /><i /></div>
          {ART.gacha_crystal ? <img className="gx-crystal" src={ART.gacha_crystal} alt="" draggable={false} /> : <div className="gx-crystal gx-crystal-fallback">💎</div>}
          <div className="gx-charge-glow" />
          {phase === "idle" && <Sparks count={16} seed={round} />}
          {phase === "charge" && <Sparks count={sparkCount} seed={round} />}
          {phase === "burst" && (
            <>
              <div className="gx-flash" />
              <div className="gx-ring gx-ring-1" /><div className="gx-ring gx-ring-2" /><div className="gx-ring gx-ring-3" />
              <div className="gx-rays" />
            </>
          )}
        </div>
      )}

      {phase === "idle" && (
        <div className="gx-idle-text">
          <div className="gx-lead">クリスタルで 仲間をよぼう！</div>
          <div className="gx-sub">
            ダブった子は「予備」として のこるよ（合成で経験値に／限界突破に）<br />
            {GACHA.packSize + GACHA.packBonus}連（💎{GACHA.costPerPull * GACHA.packSize}）は 1回おまけ＆SR以上が1体かくてい・あと{Math.max(0, GACHA.urPity - (save.pity?.sinceUR || 0))}回でUR確定
          </div>
        </div>
      )}

      {busy && <button className="gx-skip" onClick={skipToReveal} data-sfx="none">スキップ ▶▶</button>}

      {/* ---- あらわれる ---- */}
      {phase === "reveal" && topChar && (
        <div className="gx-reveal" key={round}>
          <div className="gx-flash gx-flash-soft" />
          <div className="gx-rays gx-rays-big" />
          <Sparks count={sparkCount + 10} seed={round} />
          <div className={`gx-banner gx-banner-${top.rarity}`}>
            <b>{rar.en}</b>
            <span>{rar.jp}{top.rarity === "SR" || top.rarity === "UR" ? "！！" : "！"}</span>
          </div>
          <Stars n={rar.stars} />
          <div className="gx-char-wrap">
            {monsterImageUrl(topChar, "full") ? (
              <img className="gx-char" src={monsterImageUrl(topChar, "full")} alt="" draggable={false} style={{ filter: `${monsterImgFilter(topChar) === "none" ? "" : monsterImgFilter(topChar)}` }} />
            ) : <div className="gx-char gx-char-fallback">❓</div>}
          </div>
          <div className="gx-name">{topChar.name}</div>
          <div className={`gx-spare ${top.isNew ? "is-new" : ""}`}>{spareLine(top)}</div>
        </div>
      )}

      {/* ---- 10連の結果 ---- */}
      {phase === "list" && (
        <div className="gx-list" key={`list-${round}`}>
          <div className="gx-list-title">けっか　{results.length}体</div>
          <div className="gx-cards">
            {results.map((r, i) => {
              const c = charactersById[r.id];
              const url = c ? monsterImageUrl(c, "small") : null;
              return (
                <div key={i} className={`gx-card gx-card-${r.rarity}`} style={{ animationDelay: `${0.12 + i * 0.19}s` }}>
                  <div className="gx-card-rar">{r.rarity}</div>
                  {url ? <img src={url} alt="" draggable={false} style={{ filter: c ? monsterImgFilter(c) : undefined }} /> : <span>❓</span>}
                  <div className="gx-card-name">{c?.name}</div>
                  <div className={`gx-card-tag ${r.isNew ? "is-new" : ""}`}>{r.isNew ? "NEW" : `予備×${r.spares}`}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ---- ボタン ---- */}
      <div className="gx-actions">
        {phase === "idle" && (
          <>
            <button className="gx-pull gx-pull-one" onClick={() => pull(1)} disabled={!canOne} data-sfx="none">
              <span className="gx-pull-main">1回 引く</span><span className="gx-pull-cost">💎 × {GACHA.costPerPull}</span>
              {!canOne && <span className="gx-pull-lack">あと💎{GACHA.costPerPull - save.crystals}個</span>}
            </button>
            <button className="gx-pull gx-pull-ten" onClick={() => pull(GACHA.packSize)} disabled={!canTen} data-sfx="none">
              <span className="gx-pull-main">{GACHA.packSize + GACHA.packBonus}連 引く！</span><span className="gx-pull-cost">💎 × {GACHA.costPerPull * GACHA.packSize}　1回おまけ・SR以上かくてい</span>
              {!canTen && <span className="gx-pull-lack">あと💎{GACHA.costPerPull * GACHA.packSize - save.crystals}個</span>}
            </button>
            <div className="gx-help">クリスタルは、確認問題・れんしゅう・バトル・章のボスを「はじめてクリア」したり、章や学年のクリア、「今日の目標」（5問せいかい）、クリア済みバトルの周回（1日5回まで）でもらえるよ。</div>
          </>
        )}
        {error && <div className="gx-error">{error}</div>}
        {phase === "reveal" && (
          <>
            {results.length > 1 && <button className="gx-btn gx-btn-primary" onClick={showList} data-sfx="none">📋 ぜんぶ見る（{results.length}体）</button>}
            <button className="gx-btn" onClick={again} data-sfx="none">🔄 もういちど引く</button>
            <button className="gx-btn" onClick={() => nav.go("synth", {}, { replace: true })} data-sfx="none">⚗️ 合成・強化へ</button>
          </>
        )}
        {phase === "list" && (
          <>
            <button className="gx-btn gx-btn-primary" onClick={again} data-sfx="none">🔄 もういちど引く</button>
            <button className="gx-btn" onClick={() => nav.go("synth", {}, { replace: true })} data-sfx="none">⚗️ 合成・強化へ</button>
            <button className="gx-btn" onClick={() => nav.go("party", {}, { replace: true })} data-sfx="none">🛡️ パーティ編成へ</button>
          </>
        )}
        {phase === "idle" && (
          <div className="gx-links">
            <button className="gx-link" onClick={() => nav.go("synth", {}, { replace: true })} data-sfx="none">⚗️ 合成・強化</button>
            <button className="gx-link" onClick={() => nav.go("party", {}, { replace: true })} data-sfx="none">🛡️ パーティ編成</button>
          </div>
        )}
      </div>
    </div>
  );
  return createPortal(ui, document.body);
}
