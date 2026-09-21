// Reward.jsx — バトル勝利画面。表示する報酬は**サーバーが検証して認めた値**（params.res）。
import { useEffect } from "react";
import { playCorrectSound } from "../fx/sound.js";

const REASON = {
  "not-enough-correct": "正解がたりなかったので、ごほうびはなかったよ",
  "daily-limit": "きょうのごほうびは もうもらったよ（またあした）",
};
const ERROR = {
  "client-outdated": "アプリが古いよ。ページを読み込み直してね",
  "too-soon": "すこし間をあけてね",
  "duplicate-claim": "もう受け取ったよ",
  "time-mismatch": "時間が合わなかったよ",
};

export default function Reward({ nav, params }) {
  const res = params.res || null;
  const r = res?.rewards;
  useEffect(() => {
    playCorrectSound();
  }, []);
  const isFirstClear = !!r?.isFirstClear;

  return (
    <div className="mw-fantasy-screen">
      <div className="mw-fantasy-panel mw-center" style={{ minHeight: "50vh" }}>
        <div className="mw-reward-pop" style={{ fontSize: "2.8rem", animationDelay: "0s" }}>🎉</div>
        <div className="mw-fantasy-title mw-reward-pop" style={{ fontSize: "1.4rem", animationDelay: "0.08s" }}>クリア！</div>
        {res && !res.ok && (
          <div className="mw-reward-pop" style={{ color: "#ffb4b4", animationDelay: "0.2s", textAlign: "center" }}>
            ごほうびを受け取れなかったよ<br />（{ERROR[res.error] || "つながらなかったよ"}）
          </div>
        )}
        {r && (
          <>
            <div className="mw-reward-pop" style={{ color: "#ffe9b3", animationDelay: "0.2s" }}>経験値 +{r.exp}（仲間ひとりずつ +{r.perMember ?? 0}）</div>
            <div className="mw-reward-pop" style={{ color: "#ffe9b3", animationDelay: "0.3s" }}>🪙 +{r.coins}</div>
            {r.tickets > 0 && (
              <div className="mw-reward-pop" style={{ color: "#7cff8a", fontWeight: 900, fontSize: "1.2rem", animationDelay: "0.42s" }}>🎫 ガチャチケット +{r.tickets}！</div>
            )}
            {isFirstClear && <div className="mw-reward-pop" style={{ color: "#ffe066", fontWeight: 700, animationDelay: "0.5s" }}>はじめてのクリア！</div>}
            {!r.granted && <div className="mw-reward-pop" style={{ color: "#c9b98f", animationDelay: "0.3s" }}>{REASON[r.reason] || ""}</div>}
            {r.granted && r.reason && <div className="mw-reward-pop" style={{ color: "#c9b98f", animationDelay: "0.5s" }}>{REASON[r.reason]}</div>}
          </>
        )}
      </div>
      {r?.tickets > 0 && (
        <button className="mw-fantasy-item" style={{ justifyContent: "center" }} onClick={() => nav.go("gacha", {}, { replace: true })}>
          <span className="mw-fantasy-icon">🎰</span>ガチャを引く
        </button>
      )}
      <button className="mw-fantasy-item" style={{ justifyContent: "center" }} onClick={() => nav.exit()}>つぎへ</button>
    </div>
  );
}
