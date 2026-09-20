// AudioToggle.jsx — 右下に出る音楽ミュート切替ボタン
import { useState } from "react";
import * as bgm from "../audio/bgm.js";

export default function AudioToggle() {
  const [muted, setMuted] = useState(bgm.isMuted());
  return (
    <button className="mute-btn" title="音楽オン/オフ" onClick={() => setMuted(bgm.toggleMute())}>
      {muted ? "🔇" : "🔊"}
    </button>
  );
}
