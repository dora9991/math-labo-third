// ============================================================
// StartScreen.jsx — 一番最初の画面。「ゲームスタート」を押すと
//  音声が解禁され、オープニング映像へ進む。
// ============================================================
import * as bgm from "../audio/bgm.js";
import * as sfx from "../audio/sfx.js";

export default function StartScreen({ onStart }) {
  function handleStart() {
    bgm.unlock();      // ユーザー操作で音声解禁
    sfx.unlock();      // 効果音も解禁
    sfx.confirm();     // ピッという決定音
    // OP曲はオープニング映像と被るのでここでは鳴らさない（映像のあと、タイトルで再生）。
    onStart();         // オープニング映像へ
  }
  return (
    <div className="app launch-screen">
      <div className="launch-stars" aria-hidden />
      <div className="launch-sigil" aria-hidden><i>∴</i><i>Σ</i><i>△</i><i>◇</i></div>
      <div className="launch-card">
        <div className="launch-crest" aria-hidden>✧</div>
        <div className="launch-overline">ASTRA ACADEMY</div>
        <div className="launch-title">数学ラボ３</div>
        <div className="launch-subtitle">MATH LABO · THE ASTRAL ARCHIVE</div>
        <button
          onClick={handleStart}
          className="launch-start"
        >
          <span>START</span><small>タップして音声を開始</small>
        </button>
        <div className="launch-note">TAP TO START · 音楽が流れます</div>
      </div>
    </div>
  );
}
