// ============================================================
// BattleDialPicker.jsx — バトルの強さダイヤル（🌱サクサク／⚖️ふつう／🔥激ムズ）の選択UI
//  ・バトル選択画面（suggestion つき・説明つき）と、「ためす」パネル（compact）で共通に使う。
//  ・倍率の中身は engine/dial.js。ここは見た目と選択だけ。
//  ・suggestion（連敗・連勝からの提案）は押すとそのダイヤルに切り替える。「このまま」で今回は閉じる。
// ============================================================
import { useState } from "react";
import { DIALS, DIAL_KEYS, dialFor } from "../engine/dial.js";

export default function BattleDialPicker({ dial = "normal", onChange, suggestion = null, compact = false }) {
  const cur = dialFor(dial);
  const [dismissed, setDismissed] = useState(false); // 提案を「このまま」で閉じた（この画面を開いている間だけ）
  const sug = suggestion && !dismissed ? { ...suggestion, to: DIALS[suggestion.to] } : null;

  return (
    <div style={{
      margin: compact ? "0" : "8px 0 4px", padding: compact ? "7px 8px" : "10px 12px", borderRadius: 12, textAlign: "left",
      background: "rgba(255,255,255,.05)", border: `1px solid ${cur.key === "normal" ? "rgba(255,255,255,.16)" : cur.color + "88"}`,
    }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 6 }}>
        <span style={{ fontSize: compact ? 11 : 12.5, fontWeight: 900, color: "#fff" }}>⚙️ バトルの強さ</span>
        <span style={{ fontSize: compact ? 9.5 : 10.5, fontWeight: 700, color: "rgba(255,255,255,.55)" }}>いつでも変えられるよ</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
        {DIAL_KEYS.map((k) => {
          const d = DIALS[k];
          const on = k === cur.key;
          return (
            <button key={k} type="button" aria-pressed={on} onClick={() => !on && onChange?.(k)} style={{
              padding: compact ? "6px 2px" : "8px 4px", borderRadius: 10, cursor: on ? "default" : "pointer", fontFamily: "inherit",
              border: `2px solid ${on ? d.color : "rgba(255,255,255,.14)"}`,
              background: on ? `${d.color}2e` : "rgba(255,255,255,.04)",
              color: on ? "#fff" : "rgba(255,255,255,.6)", lineHeight: 1.25,
            }}>
              <div style={{ fontSize: compact ? 14 : 17 }}>{d.icon}</div>
              <div style={{ fontSize: compact ? 11.5 : 13, fontWeight: 900, color: on ? d.color : undefined }}>{d.label}</div>
              {!compact && <div style={{ fontSize: 9.5, fontWeight: 700, opacity: 0.85, marginTop: 1 }}>{d.short}</div>}
            </button>
          );
        })}
      </div>

      <div style={{ fontSize: compact ? 10 : 11, fontWeight: 700, color: "rgba(255,255,255,.7)", lineHeight: 1.55, marginTop: 7 }}>
        {cur.desc}
      </div>

      {sug && (
        <div style={{ marginTop: 8, padding: "8px 10px", borderRadius: 10, background: `${sug.to.color}1f`, border: `1px solid ${sug.to.color}77` }}>
          <div style={{ fontSize: 11.5, fontWeight: 800, color: "#fff", lineHeight: 1.5 }}>
            💡 {sug.kind === "down"
              ? `つづけて負けちゃったね。「${sug.to.label}」にしてみる？（いつでも戻せるよ）`
              : `${sug.streak}れんしょう！ 「${sug.to.label}」に挑戦してみる？`}
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
            <button type="button" onClick={() => onChange?.(sug.to.key)} style={{
              flex: 1.4, padding: "7px 6px", borderRadius: 9, border: "none", cursor: "pointer", fontFamily: "inherit",
              fontSize: 12, fontWeight: 900, color: "#10142a", background: sug.to.color,
            }}>{sug.to.icon} {sug.to.label}にする</button>
            <button type="button" onClick={() => setDismissed(true)} style={{
              flex: 1, padding: "7px 6px", borderRadius: 9, cursor: "pointer", fontFamily: "inherit",
              fontSize: 12, fontWeight: 800, color: "rgba(255,255,255,.8)", background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.18)",
            }}>このまま</button>
          </div>
        </div>
      )}
    </div>
  );
}
