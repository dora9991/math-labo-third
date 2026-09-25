// Reward.jsx — バトル勝利画面。表示する報酬は**サーバーが検証して認めた値**（params.res）。
import { useEffect } from "react";
import { playCorrectSound } from "../fx/sound.js";

const REASON = {
  "not-enough-correct": "正解がたりなかったので、ごほうびはなかったよ",
  "daily-limit": "きょうのごほうびは もうもらったよ（またあした）",
  "boss-repeat": "このボスのごほうびは もうもらったよ（何度でも挑戦できるよ）",
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
        {!res && (
          <div className="mw-reward-pop" style={{ color: "#c9b98f", animationDelay: "0.2s", textAlign: "center", lineHeight: 1.7 }}>
            お試しの総まとめバトルだから、ごほうびはないよ。<br />
            その章の小単元のバトルを ぜんぶクリアすると、<br />はじめてのクリアで💎クリスタルがもらえる本番になるよ！
          </div>
        )}
        {res && !res.ok && (
          <div className="mw-reward-pop" style={{ color: "#ffb4b4", animationDelay: "0.2s", textAlign: "center" }}>
            ごほうびを受け取れなかったよ<br />（{ERROR[res.error] || "つながらなかったよ"}）
          </div>
        )}
        {r && (
          <>
            <div className="mw-reward-pop" style={{ color: "#ffe9b3", animationDelay: "0.2s" }}>経験値 +{r.exp}（仲間ひとりずつ +{r.perMember ?? 0}）</div>
            <div className="mw-reward-pop" style={{ color: "#ffe9b3", animationDelay: "0.3s" }}>🪙 +{r.coins}</div>
            {r.kind === "chapterBoss" && r.isFirstClear && <div className="mw-reward-pop" style={{ color: "#ffe066", fontWeight: 900, animationDelay: "0.36s" }}>👑 章ボスを はじめて たおした！</div>}
            {(r.newMedals || []).some((m) => m.kind === "battle") && <div className="mw-reward-pop" style={{ color: "#fde047", fontWeight: 900, animationDelay: "0.38s" }}>⚔️ バトルメダル ゲット！</div>}
            {r.crystals > 0 && (
              <div className="mw-reward-pop" style={{ color: "#7cff8a", fontWeight: 900, fontSize: "1.2rem", animationDelay: "0.42s" }}>💎 クリスタル +{r.crystals}！</div>
            )}
            {r.chapterBonus > 0 && <div className="mw-reward-pop" style={{ color: "#7cff8a", fontWeight: 900, fontSize: "1.1rem", animationDelay: "0.5s" }}>🎊 章クリアボーナス！ 💎 +{r.chapterBonus}</div>}
            {r.gradeBonus > 0 && <div className="mw-reward-pop" style={{ color: "#fde047", fontWeight: 900, fontSize: "1.15rem", animationDelay: "0.54s" }}>🏆 学年クリアボーナス！ 💎 +{r.gradeBonus}</div>}
            {r.dailyMission > 0 && <div className="mw-reward-pop" style={{ color: "#7cff8a", fontWeight: 900, animationDelay: "0.6s" }}>📅 今日の目標たっせい！ 💎 +{r.dailyMission}</div>}
            {isFirstClear && r.kind !== "chapterBoss" && <div className="mw-reward-pop" style={{ color: "#ffe066", fontWeight: 700, animationDelay: "0.58s" }}>はじめてのクリア！</div>}
            {!r.granted && <div className="mw-reward-pop" style={{ color: "#c9b98f", animationDelay: "0.3s" }}>{REASON[r.reason] || ""}</div>}
            {r.granted && r.reason && <div className="mw-reward-pop" style={{ color: "#c9b98f", animationDelay: "0.5s" }}>{REASON[r.reason]}</div>}
          </>
        )}
      </div>
      {(r?.crystals || 0) + (r?.chapterBonus || 0) + (r?.gradeBonus || 0) + (r?.dailyMission || 0) >= 5 && (
        <button className="mw-fantasy-item" style={{ justifyContent: "center" }} onClick={() => nav.go("gacha", {}, { replace: true })}>
          <span className="mw-fantasy-icon">🎰</span>ガチャを引く
        </button>
      )}
      <button className="mw-fantasy-item" style={{ justifyContent: "center" }} onClick={() => nav.exit()}>つぎへ</button>
    </div>
  );
}
