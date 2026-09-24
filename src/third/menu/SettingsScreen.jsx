// SettingsScreen.jsx — 設定：学年の変更（1年/2年/3年→「◯年に変更しました！」）／アラーム（5〜60分）。
//  アラームは player.alarm = { min, endAt } に保存（endAt＝鳴る時刻(ms)。null＝未セット）。鳴らすのは App の AlarmOverlay。
import { useEffect, useState } from "react";
import GameButton from "../../components/GameButton.jsx";
import { canLogout, requestLogout } from "../../auth/session.js";
import { isGuest } from "../../auth/session.js";

const fmt = (ms) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

export default function SettingsScreen({ player, grade, onSetGrade, updatePlayer, onFeedback }) {
  const [gradeOpen, setGradeOpen] = useState(false);
  const [confirmOut, setConfirmOut] = useState(false);
  const [msg, setMsg] = useState("");
  const [min, setMin] = useState(player.alarm?.min || 15);
  const endAt = player.alarm?.endAt || null;
  const [, tick] = useState(0);
  useEffect(() => {
    if (!endAt) return undefined;
    const id = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [endAt]);

  const pickGrade = (g) => {
    onSetGrade?.(g);
    setMsg(`${g}年に変更しました！`);
    setGradeOpen(false);
  };
  const setAlarm = () => updatePlayer?.((p) => ({ ...p, alarm: { min, endAt: Date.now() + min * 60000 } }));
  const cancelAlarm = () => updatePlayer?.((p) => ({ ...p, alarm: { min: p.alarm?.min || min, endAt: null } }));

  return (
    <div>
      <div className="menu-section-title">設定</div>

      <div className="glass menu-settings-card" style={{ padding: 14, marginBottom: 14 }}>
        <div className="menu-card-heading">学年の変更　<span>いまは {grade}年</span></div>
        <GameButton tone="blue" onClick={() => setGradeOpen((v) => !v)}>学年の変更</GameButton>
        {gradeOpen && (
          <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
            {[1, 2, 3].map((g) => (
              <button key={g} onClick={() => pickGrade(g)} style={{
                flex: 1, padding: "14px 0", borderRadius: 14, fontSize: 20, fontWeight: 900, cursor: "pointer", color: "#fff",
                border: g === grade ? "3px solid #fde047" : "1px solid rgba(255,255,255,.25)",
                background: g === grade ? "rgba(253,224,71,.18)" : "rgba(255,255,255,.07)",
              }}>{g}年</button>
            ))}
          </div>
        )}
        {msg && <div className="menu-confirmation">{msg}</div>}
      </div>

      <div className="glass menu-settings-card" style={{ padding: 14, marginBottom: 14 }}>
        <div className="menu-card-heading">アラームを設定</div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14 }}>
          <button className="menu-step-btn" onClick={() => setMin((m) => Math.max(5, m - 5))} aria-label="5分へらす">−</button>
          <div style={{ minWidth: 96, textAlign: "center" }}>
            <span style={{ fontSize: 40, fontWeight: 900, color: "#fde047" }}>{min}</span>
            <span style={{ fontSize: 16, fontWeight: 800, color: "rgba(255,255,255,.75)" }}> 分</span>
          </div>
          <button className="menu-step-btn" onClick={() => setMin((m) => Math.min(60, m + 5))} aria-label="5分ふやす">＋</button>
        </div>
        <input className="menu-range" type="range" min={5} max={60} step={5} value={min} onChange={(e) => setMin(Number(e.target.value))} style={{ width: "100%", margin: "12px 0 4px" }} />
        <div className="menu-range-labels" style={{ display: "flex", justifyContent: "space-between", color: "rgba(255,255,255,.7)" }}><span>5分</span><span>60分</span></div>
        {endAt ? (
          <div style={{ marginTop: 12, textAlign: "center" }}>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,.75)" }}>セット中：あと <b style={{ fontSize: 24, color: "#4ade80" }}>{fmt(endAt - Date.now())}</b></div>
            <div style={{ marginTop: 10 }}><GameButton tone="danger" onClick={cancelAlarm}>アラームをやめる</GameButton></div>
          </div>
        ) : (
          <div style={{ marginTop: 12 }}><GameButton tone="gold" icon="⏰" onClick={setAlarm}>{min}分のアラームをセット</GameButton></div>
        )}
        <div style={{ fontSize: 12, color: "rgba(255,255,255,.7)", marginTop: 8, lineHeight: 1.6 }}>時間になったら音と画面でおしらせするよ。どの画面にいても鳴ります（アプリを開いている間）。</div>
      </div>

      {onFeedback && <GameButton tone="mint" icon="✉" onClick={onFeedback}><strong>ご意見箱</strong><small>先生にメッセージを送る</small></GameButton>}

      {canLogout() && (
        <div style={{ marginTop: 14 }}>
          {!confirmOut ? (
            <GameButton tone="danger" onClick={() => setConfirmOut(true)}>
              <strong>{isGuest() ? "ゲストをおわる" : "ログアウト"}</strong>
              <small>{isGuest() ? "データは消えます" : "べつの人がつかうとき"}</small>
            </GameButton>
          ) : (
            <div className="glass menu-settings-card" style={{ padding: 14 }}>
              <div style={{ fontWeight: 900, marginBottom: 10 }}>{isGuest() ? "ゲストをおわりますか？（データは消えます）" : "ログアウトしますか？"}</div>
              <div style={{ display: "flex", gap: 10 }}>
                <GameButton tone="danger" onClick={() => requestLogout()}>はい</GameButton>
                <GameButton tone="blue" onClick={() => setConfirmOut(false)}>いいえ</GameButton>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
