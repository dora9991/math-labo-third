// ============================================================
// LoginBonusOverlay.jsx — 1日1回のログインボーナス演出
//  ・通常日：+100G ／ 5日連続ごと：コインの大ボーナス。
//  ・クリスタルは「単元のサイクルをクリア」したときだけ手に入る（ログインでは出ない）。
//  ・連続ログイン日数（🔥N日）を見せて継続を後押しする。
// ============================================================
import { useEffect } from "react";
import * as sfx from "../audio/sfx.js";
import { STREAK_TARGET } from "../engine/daily.js";

// 「こんなこともできるよ！」のヒント（毎日ちがうものを1つ出す）
const TIPS = [
  "間違えた問題は「📖 学び直し」から、葉一さんの動画を見たり、もう一度練習できるよ！",
  "🧮 計算王で章をクリアすると、そのワールドのバトル攻撃力がずっと上がるよ！",
  "学年（中1・中2・中3）はホームで切りかえ。学年ごとにレベルが分かれているよ！",
  "⏱️ タイムアタックで3つの難易度すべて★をとると、バトルに新しい敵が出るよ！",
  "🎒 「アイテム」のガチャで武器・防具を集めると、バトルが有利になるよ！",
  // "つまずいた所は「🩺 こまり感クリニック」で、診断して練習できるよ！", // クリニック非表示につきヒントも一旦オフ
  "解説動画（葉一さんの19ch）は、単元えらびや学び直しの📺ボタンから見られるよ！",
  "ゴールデンタイムは、準備ができてからホームのボタンで始められるよ（15分XP1.2倍）！",
];

export default function LoginBonusOverlay({ reward, streak, crystal = 0, isFifth, onDone }) {
  useEffect(() => { try { sfx.levelUp(); } catch {} }, []);

  // 次の大ボーナスまであと何日か
  const toNext = isFifth ? 0 : STREAK_TARGET - (streak % STREAK_TARGET);
  // 連続日数でローテーションして、毎日ちがうヒントを出す
  const tip = TIPS[((streak || 1) - 1) % TIPS.length];

  return (
    <div onClick={onDone} style={bg}>
      <div onClick={(e) => e.stopPropagation()} style={card}>
        <div style={{ fontSize: 12, fontWeight: 800, color: "rgba(255,255,255,.6)" }}>ログインボーナス</div>
        <div style={{ fontSize: 30, margin: "4px 0 2px" }}>{isFifth ? "🎁✨" : "🪙"}</div>
        <div style={{ fontSize: 13, color: "#fde047", fontWeight: 800 }}>🔥 {streak}日連続ログイン！</div>
        {isFifth ? (
          <>
            {/* 5日連続の大ボーナス＝コイン（クリスタルはサイクルクリア専用） */}
            <div style={{ fontSize: 34, fontWeight: 900, color: "#fbbf24", margin: "6px 0 2px" }}>
              ＋{reward} <span style={{ fontSize: 16 }}>コイン</span>
            </div>
            <div style={{ fontSize: 12.5, color: "#86efac", fontWeight: 700, lineHeight: 1.6 }}>
              5日連続ボーナス！🎉<br />毎日つづけるとどんどんたまるよ。
            </div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 34, fontWeight: 900, color: "#fbbf24", margin: "6px 0" }}>+{reward} <span style={{ fontSize: 16 }}>コイン</span></div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.6)", lineHeight: 1.6 }}>
              あと <b style={{ color: "#fde047" }}>{toNext}日</b> 連続で <b style={{ color: "#fbbf24" }}>大ボーナス🎁</b>！
            </div>
          </>
        )}
        {/* こんなこともできるよ！（毎日ひとつ提案） */}
        <div style={{ marginTop: 14, padding: "10px 12px", borderRadius: 12, background: "rgba(129,140,248,.14)", border: "1px solid rgba(129,140,248,.4)", textAlign: "left" }}>
          <div style={{ fontSize: 11, fontWeight: 900, color: "#c7d2fe", marginBottom: 3 }}>💡 こんなこともできるよ！</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,.82)", lineHeight: 1.6 }}>{tip}</div>
        </div>
        <button onClick={onDone} data-sfx="none" style={btn}>受け取る</button>
      </div>
    </div>
  );
}

const bg = { position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 80, cursor: "pointer" };
const card = { background: "linear-gradient(160deg,#1e1b4b,#312e81)", border: "1px solid rgba(255,255,255,.15)", borderRadius: 18, padding: "22px 26px", textAlign: "center", maxWidth: 320, boxShadow: "0 18px 50px rgba(0,0,0,.5)", animation: "rankUpPop .45s cubic-bezier(.2,1.4,.4,1) both" };
const btn = { marginTop: 16, padding: "11px 28px", borderRadius: 12, border: "none", cursor: "pointer", fontSize: 15, fontWeight: 900, color: "#3a2a00", background: "linear-gradient(135deg,#f59e0b,#fbbf24)" };
