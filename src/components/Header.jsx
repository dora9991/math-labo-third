// Header.jsx — 画面上部の共通ヘッダー（コイン・連続日数・レベル＝サイクルクリア数 or 戻るボタン）
//  ※学年えらび（中1/中2/中3）はホーム画面の大きな3列ボタンに移設（携帯で押しやすく）。
import { levelColor, playerLevel, clearedCyclesInWorld } from "../engine/scoring.js";
import { chaptersForGrade } from "../data/index.js";
import { isGuest } from "../auth/session.js";

export default function Header({ player, back, onBack }) {
  const lv = playerLevel(player);   // 現在ワールドのレベル＝1＋クリア単元数
  const col = levelColor(lv);
  // バーは「この学年で何単元のサイクルをクリアしたか」を表す
  const cleared = clearedCyclesInWorld(player);
  const total = chaptersForGrade(player?.world || 1).reduce((s, c) => s + (c.units?.length || 0), 0);
  const pct = total > 0 ? Math.min(100, (cleared / total) * 100) : 0;
  return (
    <div className="hdr">
      <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
        <span className="logo" role="button" tabIndex={0} style={{ cursor: "pointer" }} title="トップメニューへ"
          onClick={() => window.dispatchEvent(new CustomEvent("ml3:requestMenu"))}
          onKeyDown={(e) => { if (e.key === "Enter") window.dispatchEvent(new CustomEvent("ml3:requestMenu")); }}>
          <small>ASTRA ACADEMY</small> 数学ラボ3
        </span>
        {isGuest() && <span className="hdr-guest">ゲスト</span>}
      </div>
      <div className="hdr-r">
        {back ? (
          <button className="back-btn" onClick={onBack}>← {back}</button>
        ) : (
          <>
            <div className="chip cs"><span aria-hidden>✦</span>{player.streaks}日</div>
            <div className="chip cl">
              <span style={{ fontSize: 11, fontWeight: 700, color: col }}>Lv.{lv}</span>
              <div className="xpm"><div className="xpf" style={{ width: pct + "%", background: col }} /></div>
              <span className="xpt">{cleared}/{total}単元</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
