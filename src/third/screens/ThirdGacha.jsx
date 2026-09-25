// ============================================================
// ThirdGacha.jsx — ガチャ画面（数学ラボ3）。クリスタル(💎)で引く。抽選は**サーバー**が行う（ローカルモードは開発用）。
//  演出は math-world の派手なガチャ（カプセル→光の爆発→シルエット→レア度演出）を流用。
//  10連は「一番レアな1体」を派手に演出したあと、全結果の一覧を出す。
// ============================================================
import { useState } from "react";
import { useGame } from "../ThirdContext.jsx";
import { GACHA } from "../gachaConfig.js";
import { monsterImageUrl, monsterImgFilter } from "../data/monsterImages.js";
import MonsterPortrait from "../components/MonsterPortrait.jsx";

const RARITY_CONFIG = {
  N: { label: "ノーマル", glow: "#dfe3ff", shakeMs: 450, rays: 8, particles: 12, flashes: 1 },
  R: { label: "レア", glow: "#7fd0ff", shakeMs: 600, rays: 12, particles: 20, flashes: 1 },
  SR: { label: "スーパーレア", glow: "#ffd166", shakeMs: 800, rays: 18, particles: 32, flashes: 2 },
  UR: { label: "ウルトラレア", glow: "#ff9ecb", shakeMs: 1000, rays: 26, particles: 48, flashes: 3 },
};
const RANK = { N: 0, R: 1, SR: 2, UR: 3 };
const CAPSULE_FALL_MS = 450, CAPSULE_CRACK_MS = 300, BURST_MS = 500, SILHOUETTE_MS = 450;
const cfgOf = (r) => RARITY_CONFIG[r] || RARITY_CONFIG.N;

function Particles({ count, glow }) {
  return (
    <div className="mw-gacha-burst-layer">
      {Array.from({ length: count }, (_, i) => {
        const angle = (i / count) * Math.PI * 2 + (Math.random() * 0.3 - 0.15);
        const dist = 90 + Math.random() * 90;
        return <span key={i} className="mw-gacha-particle" style={{ "--dx": `${Math.cos(angle) * dist}px`, "--dy": `${Math.sin(angle) * dist}px`, "--gacha-glow": glow, animationDelay: `${Math.random() * 0.12}s` }} />;
      })}
    </div>
  );
}
function Rays({ count, glow }) {
  return (
    <div className="mw-gacha-burst-layer">
      {Array.from({ length: count }, (_, i) => <span key={i} className="mw-gacha-ray" style={{ "--angle": `${(i / count) * 360}deg`, "--gacha-glow": glow, animationDelay: `${(i % 3) * 0.03}s` }} />)}
    </div>
  );
}
const Flashes = ({ count }) => <>{Array.from({ length: count }, (_, i) => <span key={i} className="mw-gacha-flash" style={{ animationDelay: `${i * 0.18}s` }} />)}</>;

export default function ThirdGacha({ nav }) {
  const { save, actions, charactersById, mode } = useGame();
  const [phase, setPhase] = useState("idle"); // idle | capsuleFall | capsuleShake | capsuleCrack | burst | silhouette | reveal | list
  const [results, setResults] = useState([]);
  const [top, setTop] = useState(null);
  const [error, setError] = useState(null);
  const busy = phase !== "idle" && phase !== "list";
  const cfg = top ? cfgOf(top.rarity) : RARITY_CONFIG.N;

  async function pull(count) {
    if (busy) return;
    setError(null);
    const r = await actions.pullGacha(count);
    if (!r.ok) { setError(r.error === "not-enough-crystals" ? "クリスタルが足りないよ" : "うまくいかなかったよ。もういちど"); return; }
    const best = [...r.results].sort((a, b) => RANK[b.rarity] - RANK[a.rarity])[0];
    setResults(r.results);
    setTop(best);
    setPhase("capsuleFall");
    const c = cfgOf(best.rarity);
    const tShake = CAPSULE_FALL_MS, tCrack = tShake + c.shakeMs, tBurst = tCrack + CAPSULE_CRACK_MS, tSil = tBurst + BURST_MS, tRev = tSil + SILHOUETTE_MS;
    setTimeout(() => setPhase("capsuleShake"), tShake);
    setTimeout(() => setPhase("capsuleCrack"), tCrack);
    setTimeout(() => setPhase("burst"), tBurst);
    setTimeout(() => setPhase("silhouette"), tSil);
    setTimeout(() => setPhase("reveal"), tRev);
  }

  const topChar = top ? charactersById[top.id] : null;
  const isRevealed = phase === "reveal";

  return (
    <div className="mw-fantasy-screen">
      <div className="mw-fantasy-topbar">
        <button className="mw-fantasy-back" onClick={() => nav.back()} disabled={busy}>← もどる</button>
        <span className="mw-fantasy-title" style={{ fontSize: "1.1rem" }}>ガチャ</span>
        <span className="mw-fantasy-coin">💎 {save.crystals}</span>
      </div>

      {mode === "guest" && (
        <div style={{ fontSize: 11, color: "#ffe9b3", textAlign: "center" }}>👤 ゲストで遊び中：データは のこりません</div>
      )}
      {mode === "local" && (
        <div style={{ fontSize: 11, color: "#ffb4b4", textAlign: "center" }}>⚠️ 開発用のローカルモード（この端末の保存。サーバーではありません）</div>
      )}

      {phase !== "list" && (
        <div className="mw-fantasy-panel mw-gacha-stage" style={{ "--gacha-glow": cfg.glow }}>
          {phase === "idle" && (
            <div className="mw-gacha-idle">
              <div className="mw-gacha-machine">🎰</div>
              <div className="mw-gacha-tap-hint">クリスタルで仲間をよぼう！</div>
              <div style={{ fontSize: 12, color: "#ffe9b3", marginTop: 6, lineHeight: 1.7 }}>
                ダブると「限界突破」で強くなるよ（最大{GACHA.maxBreaks}回・+{Math.round(GACHA.breakBonus * GACHA.maxBreaks * 100)}%）<br />
                {GACHA.srGuaranteeEvery}回に1回はSR以上・あと{Math.max(0, GACHA.urPity - (save.pity?.sinceUR || 0))}回でUR確定
              </div>
            </div>
          )}
          {phase !== "idle" && (
            <div className="mw-gacha-capsule-area">
              {(phase === "burst" || phase === "silhouette" || phase === "reveal") && (<><Rays count={cfg.rays} glow={cfg.glow} /><Particles count={cfg.particles} glow={cfg.glow} /></>)}
              {phase === "burst" && <Flashes count={cfg.flashes} />}
              {(phase === "capsuleFall" || phase === "capsuleShake" || phase === "capsuleCrack") && (
                <div className={`mw-gacha-capsule phase-${phase === "capsuleFall" ? "fall" : phase === "capsuleShake" ? "shake" : "crack"}`}>
                  <div className="mw-gacha-capsule-top" /><div className="mw-gacha-capsule-bottom" />
                </div>
              )}
              {(phase === "silhouette" || phase === "reveal") && topChar && (
                <div className="mw-gacha-reveal-col">
                  {monsterImageUrl(topChar, "full") ? (
                    <img src={monsterImageUrl(topChar, "full")} alt="" className={`mw-gacha-silhouette-img ${isRevealed ? "revealed" : ""}`} style={{ filter: isRevealed ? monsterImgFilter(topChar) : undefined }} />
                  ) : <div className={`mw-gacha-silhouette-fallback ${isRevealed ? "revealed" : ""}`}>❓</div>}
                  {isRevealed && (
                    <>
                      <div className={`mw-gacha-rarity-banner mw-rarity-banner-${top.rarity}`}>{cfg.label}{top.rarity === "SR" || top.rarity === "UR" ? "！！" : "！"}</div>
                      <div className={`mw-rarity mw-rarity-${top.rarity}`}>{top.rarity}</div>
                      <div className="mw-fantasy-title" style={{ fontSize: "1.15rem" }}>{topChar.name}</div>
                      <div style={{ color: "#ffe9b3", opacity: 0.85 }}>{top.isNew ? "🆕 あたらしい仲間！" : top.converted ? `限界突破MAX → 🪙+${GACHA.overflowCoins}　💎+${top.refund || 0}` : `限界突破 ★${top.breaks}　💎+${top.refund || 0}`}</div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
          {error && <div style={{ color: "#ffb4b4", marginTop: 8 }}>{error}</div>}
        </div>
      )}

      {phase === "list" && (
        <div className="mw-fantasy-panel">
          <div className="mw-bench-title">けっか（{results.length}体）</div>
          <div className="mw-bench-grid">
            {results.map((r, i) => (
              <div key={i} style={{ position: "relative", textAlign: "center" }}>
                <MonsterPortrait character={charactersById[r.id]} size="small" />
                <div style={{ fontSize: 10, fontWeight: 900, color: r.isNew ? "#7cff8a" : "#ffe9b3" }}>{r.isNew ? "NEW" : r.converted ? `🪙+${GACHA.overflowCoins}` : `★${r.breaks}`}{!r.isNew && r.refund ? ` 💎+${r.refund}` : ""}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {phase === "idle" && (
        <>
          <button className="mw-fantasy-item" style={{ justifyContent: "center" }} onClick={() => pull(1)} disabled={save.crystals < GACHA.costPerPull}>
            <span className="mw-fantasy-icon">💎</span>1回引く（💎×{GACHA.costPerPull}）
          </button>
          <button className="mw-fantasy-item" style={{ justifyContent: "center" }} onClick={() => pull(GACHA.packSize)} disabled={save.crystals < GACHA.costPerPull * GACHA.packSize}>
            <span className="mw-fantasy-icon">💎</span>{GACHA.packSize}連（💎×{GACHA.costPerPull * GACHA.packSize}）・SR以上が1体かくてい！
          </button>
          <div style={{ fontSize: 11.5, color: "#c9b98f", textAlign: "center", lineHeight: 1.7 }}>クリスタルは、確認問題・れんしゅう（むずかしさごと）・バトル・章のボスを「はじめてクリア」したり、章や学年をクリアしたり、「今日の目標」（5問せいかい）やクリア済みバトルの周回（1日5回まで）でもらえるよ。</div>
        </>
      )}
      {isRevealed && results.length > 1 && (
        <button className="mw-fantasy-item" style={{ justifyContent: "center" }} onClick={() => setPhase("list")}><span className="mw-fantasy-icon">📋</span>ぜんぶ見る</button>
      )}
      {(isRevealed || phase === "list") && (
        <button className="mw-fantasy-item" style={{ justifyContent: "center" }} onClick={() => { setPhase("idle"); setTop(null); }}><span className="mw-fantasy-icon">🔄</span>もういちど引く</button>
      )}
      <button className="mw-fantasy-item" style={{ justifyContent: "center" }} onClick={() => nav.go("party", {}, { replace: true })} disabled={busy}><span className="mw-fantasy-icon">🛡️</span>パーティ編成へ</button>
    </div>
  );
}
