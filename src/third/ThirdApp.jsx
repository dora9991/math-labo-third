// ============================================================
// ThirdApp.jsx — math-worldのバトル／パーティ編成をラボ3に組み込む入口。
//  ラボ3のApp.jsxからは screen="third" で開き、start={screen, params} で最初の画面を指定する。
//   ・party  … パーティ編成（PartyFormation）
//   ・battle … バトル（ThirdBattle）→ 勝利で reward。メダル2枚(はいち＋れんしゅう)が無い小単元は入れない
//  world側の nav API（go/back/resetTo/flashTo）をそのまま提供し、exit() でラボ3のホームへ戻る。
//  セーブは ThirdContext（localStorage: mathLabo3_third_save_v1）。将来はサーバーを正にする（設計メモ参照）。
// ============================================================
import { useEffect, useState } from "react";
import * as bgm from "../audio/bgm.js";
import { ThirdProvider, useGame } from "./ThirdContext.jsx";
import { playUiTapSound } from "./fx/sound.js";
import PartyFormation from "./screens/PartyFormation.jsx";
import ThirdBattle from "./screens/ThirdBattle.jsx";
import Reward from "./screens/Reward.jsx";
import ThirdGacha from "./screens/ThirdGacha.jsx";
import { isBattleOpen } from "./medals.js";
import { labUnitIdForBattle } from "./link.js";
import { getFxSpeed } from "../engine/fxSpeed.js";
import "./third.css";

const SCREENS = { party: PartyFormation, battle: ThirdBattle, reward: Reward, gacha: ThirdGacha };
const FLASH_IN_MS = 280;
const FLASH_SETTLE_MS = 60;

function useNav(initial, exit) {
  const [stack, setStack] = useState([initial]);
  const [flashOpacity, setFlashOpacity] = useState(0);
  const [navKey, setNavKey] = useState(0);
  const current = stack[stack.length - 1];
  function go(screen, params = {}, { replace = false } = {}) {
    playUiTapSound();
    setNavKey((k) => k + 1);
    setStack((s) => [...(replace ? s.slice(0, -1) : s), { screen, params }]);
  }
  function back() {
    playUiTapSound();
    setNavKey((k) => k + 1);
    setStack((s) => (s.length > 1 ? s.slice(0, -1) : s));
  }
  function resetTo(screen, params = {}) {
    setNavKey((k) => k + 1);
    setStack([{ screen, params }]);
  }
  function flashTo(screen, params = {}, opts = {}) {
    setFlashOpacity(1);
    setTimeout(() => {
      go(screen, params, opts);
      setTimeout(() => setFlashOpacity(0), FLASH_SETTLE_MS);
    }, FLASH_IN_MS);
  }
  return { ...current, go, back, resetTo, flashTo, exit, flashOpacity, navKey };
}

// メダルゲート：サーバーが認めたメダル2枚(はいち＋れんしゅう)が無い小単元のバトルには入れない。
//  （申請の時にもサーバーが同じ確認をする。ここは画面上の案内）
function MedalGate({ nav, onExit, children }) {
  const { save } = useGame();
  if (nav.screen === "battle" && nav.params?.kind === "subUnit" && !nav.params?.demo) {
    const unitId = labUnitIdForBattle(nav.params);
    if (unitId && !isBattleOpen(save, unitId)) {
      return (
        <div className="mw-fantasy-panel mw-center" style={{ minHeight: "40vh", marginTop: 40 }}>
          <div style={{ fontSize: "2.4rem" }}>🔒</div>
          <div className="mw-fantasy-title">まだ バトルは ひらいていないよ</div>
          <div style={{ color: "#ffe9b3", margin: "8px 0" }}>「学ぶ」と「練習」のメダルを2まい集めよう。</div>
          <button className="mw-btn primary" onClick={onExit}>もどる</button>
        </div>
      );
    }
  }
  return children;
}

export default function ThirdApp({ player, start, onExit }) {
  const nav = useNav(start || { screen: "party", params: {} }, onExit);
  const Screen = SCREENS[nav.screen] || PartyFormation;

  // 画面ごとのBGM（バトル中の曲＝通常/小単元ボス/章ボス/敗北は ThirdBattle が切り替える）
  useEffect(() => {
    if (nav.screen === "party" || nav.screen === "gacha") bgm.play("coop"); // 仲間と協力する画面
    else if (nav.screen === "reward") {
      const k = nav.params?.kind;
      if (k === "finalBoss") bgm.play("ending", { loop: false });
      else bgm.play("victory", { loop: false });
    }
  }, [nav.screen, nav.params]);

  return (
    <ThirdProvider>
      <div className="mw-app">
        <div key={nav.navKey} className={`mw-screen-enter mw-screen-enter--${getFxSpeed()}`}>
          <MedalGate nav={nav} onExit={onExit}>
            <Screen params={nav.params} nav={nav} />
          </MedalGate>
        </div>
        <div className="mw-whiteout" style={{ opacity: nav.flashOpacity, pointerEvents: nav.flashOpacity > 0 ? "auto" : "none" }} />
      </div>
    </ThirdProvider>
  );
}
