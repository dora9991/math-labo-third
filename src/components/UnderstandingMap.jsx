// ============================================================
// UnderstandingMap.jsx — 理解度マップ（§13 診断の第一歩・§13-7 色で警告）
//  ・単元ごとの理解度を「小単元ごとに区切った横バー」＋色で見せる（自分のいまが目で分かる）。
//    （以前は8角形レーダー。子の要望で、小単元ごとに区切りのある横パラメータに変更 2026-06-24）
//  ・色の意味（§13-7：メーターは減らさない＝実績は奪わない／色＝鮮度の警告）：
//      🟦 クリア   … ok（習得・永久）＋絶好調　→ 青で塗りつぶし
//      🟨 あやしい … ok（習得は消えてない）だが pt が下がった＝少しあやふや → 黄（危ないかも！）
//      🔵 とちゅう … まだ習得前・育成中（青がpt%だけ伸びる）
//      ⬜ まだ     … 未挑戦（グレー）
//  ・チップをタップ → 学び直しへ（🟦に戻そう）。
//  データは player.unitMastery（engine/unitMastery.js の {pt, ok}）をそのまま使う。
// ============================================================
import { useState } from "react";
import { chaptersForGrade } from "../data/index.js";

// 単元の理解度状態を unitMastery から導く
function unitState(m) {
  const u = m || { pt: 0, ok: false };
  if (u.ok) {
    return (u.pt ?? 0) >= 90
      ? { key: "ok", color: "#38bdf8", label: "クリア", fill: 100, mark: "🟦" }     // 青＝クリア（塗りつぶし）
      : { key: "warn", color: "#fbbf24", label: "あやしい", fill: 100, mark: "🟨" }; // 黄＝危ないかも（実績は残し色だけ警告）
  }
  if ((u.pt ?? 0) > 0) return { key: "prog", color: "#60a5fa", label: "とちゅう", fill: u.pt, mark: "🔵" };
  return { key: "none", color: "rgba(255,255,255,.3)", label: "まだ", fill: 0, mark: "⬜" };
}

export default function UnderstandingMap({ player, grade = 1, onRelearn }) {
  const chapters = chaptersForGrade(grade);
  const um = player.unitMastery || {};
  const [ci, setCi] = useState(0);
  const ch = chapters[Math.min(ci, Math.max(0, chapters.length - 1))];
  if (!ch) return null;
  const units = ch.units || [];
  const states = units.map((u) => ({ u, st: unitState(um[u.id]) }));

  const okN = states.filter((s) => s.st.key === "ok").length;
  const warnN = states.filter((s) => s.st.key === "warn").length;

  return (
    <div className="glass" style={{ padding: "13px 14px" }}>
      <div className="slbl">🧭 理解度マップ（中{grade}）— 小単元ごとに「いま」が見える</div>

      {/* 章えらび */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, margin: "2px 0 10px" }}>
        {chapters.map((c, i) => (
          <button key={c.id} data-sfx="none" onClick={() => setCi(i)} style={{
            padding: "5px 9px", borderRadius: 9, cursor: "pointer", fontSize: 11, fontWeight: 800,
            border: i === ci ? `2px solid ${c.color}` : "1px solid rgba(255,255,255,.14)",
            background: i === ci ? `${c.color}33` : "rgba(255,255,255,.05)",
            color: i === ci ? "#fff" : "rgba(255,255,255,.6)",
          }}>{c.emoji} {c.name}</button>
        ))}
      </div>

      {/* 小単元ごとに区切った横バー：クリア=青で塗りつぶし／危ないかも=黄／とちゅう=青がpt%／まだ=グレー */}
      <div style={{ display: "flex", gap: 3, margin: "2px 0 4px", height: 26 }}>
        {states.map(({ u, st }) => (
          <button
            key={u.id} data-sfx="none" onClick={() => onRelearn?.()}
            title={`${u.name}：${st.label}`}
            style={{
              flex: 1, minWidth: 0, position: "relative", borderRadius: 5, padding: 0, cursor: "pointer", overflow: "hidden",
              background: st.key === "none" ? "rgba(255,255,255,.08)" : "rgba(255,255,255,.06)",
              border: st.key === "warn" ? "1.5px solid #fbbf24" : "1px solid rgba(255,255,255,.12)",
            }}
          >
            {/* 塗り：ok/warn は満タン、prog は pt% だけ左から */}
            <span style={{
              position: "absolute", left: 0, top: 0, bottom: 0,
              width: (st.key === "prog" ? st.fill : st.key === "none" ? 0 : 100) + "%",
              background: st.color, opacity: st.key === "prog" ? 0.85 : 1, transition: "width .4s",
            }} />
          </button>
        ))}
      </div>
      {/* バー直下に番号（小単元の区切りの目印） */}
      <div style={{ display: "flex", gap: 3, marginBottom: 9 }}>
        {states.map(({ u }, i) => (
          <span key={u.id} style={{ flex: 1, textAlign: "center", fontSize: 9, color: "rgba(255,255,255,.4)" }}>{i + 1}</span>
        ))}
      </div>

      {/* 凡例 */}
      <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: 11, margin: "2px 0 9px", fontSize: 10, color: "rgba(255,255,255,.55)" }}>
        <span>🟦 クリア</span><span>🟨 危ないかも</span><span>🔵 とちゅう</span><span>⬜ まだ</span>
      </div>

      {/* 単元チップ（タップで学び直し） */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {states.map(({ u, st }, i) => (
          <button key={u.id} data-sfx="none" onClick={() => onRelearn?.()} style={{
            display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 10, cursor: "pointer",
            border: `1px solid ${st.key === "ok" ? "rgba(56,189,248,.45)" : st.key === "warn" ? "rgba(251,191,36,.55)" : "rgba(255,255,255,.12)"}`,
            background: st.key === "warn" ? "rgba(251,191,36,.1)" : "rgba(255,255,255,.04)", color: "#fff", textAlign: "left",
          }}>
            <span style={{ fontSize: 11, fontWeight: 900, color: "rgba(255,255,255,.4)", width: 16 }}>{i + 1}</span>
            <span style={{ fontSize: 14 }}>{st.mark}</span>
            <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, fontWeight: 700, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{u.name}</span>
            <span style={{ fontSize: 11, fontWeight: 800, color: st.color }}>{st.label}</span>
            {(st.key === "warn" || st.key === "prog") && <span style={{ fontSize: 10.5, fontWeight: 800, color: "#c7d2fe" }}>直す →</span>}
          </button>
        ))}
      </div>

      <div style={{ fontSize: 10.5, color: "rgba(255,255,255,.45)", marginTop: 8, lineHeight: 1.6 }}>
        {warnN > 0
          ? `🟨「危ないかも」が${warnN}コ。“できたけど少しあやふや”のサイン。タップで学び直して🟦に戻そう！（理解度は下がらないよ）`
          : okN === states.length && states.length > 0
            ? "🟦 ぜんぶクリア！この章はバッチリ！"
            : "🟦 クリア＝バッチリ。🟨 危ないかも＝学び直しどき。理解度は下がらないから、安心して埋めよう！"}
      </div>
    </div>
  );
}
