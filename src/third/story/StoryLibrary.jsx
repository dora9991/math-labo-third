// ============================================================
// StoryLibrary.jsx — 「📖 ものがたり」：これまでのお話をいつでも見返す一覧。
//  ・章ごとに、章のはじまり／小単元／章ボス／最終章。「見た」か「その小単元をクリアした」ら見られる（まだの所は🔒）。
//  ・まだ見ていない所は NEW。押すと会話画面が始まり、見終わる（スキップも）と「見た」になる。
//  ・上のスイッチで「バトルの前後に自動で出す」をオフにできる（オフでも NEW と見返しは使える）。
// ============================================================
import { useState } from "react";
import { createPortal } from "react-dom";
import * as bgm from "../../audio/bgm.js";
import StoryPlayer from "./StoryPlayer.jsx";
import { libraryFor, loadSeen, saveSeen, isStoryAuto, setStoryAuto } from "./storyRun.js";

const row = (locked) => ({ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "10px 12px", marginBottom: 6, borderRadius: 12, border: "1px solid rgba(255,255,255,.18)", background: locked ? "rgba(255,255,255,.03)" : "rgba(255,255,255,.08)", color: locked ? "rgba(255,255,255,.4)" : "#fff", fontFamily: "inherit", fontSize: 14, fontWeight: 800, textAlign: "left", cursor: locked ? "default" : "pointer" });

export default function StoryLibrary({ grade, state }) {
  const [seen, setSeen] = useState(() => loadSeen());
  const [auto, setAuto] = useState(() => isStoryAuto());
  const [play, setPlay] = useState(null); // { scenes, i }
  const groups = libraryFor(grade, state, seen);

  const finishScene = (key) => setSeen((prev) => { const n = new Set(prev); n.add(key); saveSeen(n); return n; });
  const onDone = () => {
    const cur = play;
    finishScene(cur.scenes[cur.i].key);
    if (cur.i + 1 < cur.scenes.length) setPlay({ ...cur, i: cur.i + 1 });
    else { setPlay(null); bgm.play("menu"); } // 見終わったらメニューの曲に戻す
  };

  // 会話画面は画面全体を覆う。メニューの切り替え演出(transform)の内側だと位置がずれるので、body に直接描く
  if (play) return createPortal(<StoryPlayer key={play.scenes[play.i].key} scene={play.scenes[play.i]} onDone={onDone} />, document.body);

  return (
    <div>
      <div className="menu-section-title"><div>📖 ものがたり</div><small>これまでのお話を、いつでも見返せるよ</small></div>
      <label className="glass" style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", marginBottom: 14, cursor: "pointer", fontSize: 13.5, fontWeight: 800 }}>
        <input type="checkbox" checked={auto} onChange={(e) => { setAuto(e.target.checked); setStoryAuto(e.target.checked); }} />
        バトルの前とあとに、ものがたりを自動で見る<span style={{ fontWeight: 600, fontSize: 11.5, color: "rgba(255,255,255,.65)" }}>（オフでもここから見られるよ）</span>
      </label>
      {groups.map((g) => (
        <div key={g.id} style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12.5, fontWeight: 900, color: "#fde68a", margin: "4px 2px 6px" }}>{g.title}</div>
          {g.items.map((it, idx) => (
            <button key={idx} data-sfx="none" disabled={!it.unlocked} style={row(!it.unlocked)} onClick={() => it.unlocked && setPlay({ scenes: it.scenes, i: 0 })}>
              <span style={{ flex: 1 }}>{it.unlocked ? "" : "🔒 "}{it.label}</span>
              {it.isNew && <span style={{ fontSize: 10.5, fontWeight: 900, padding: "2px 8px", borderRadius: 999, background: "#ef4444", color: "#fff" }}>NEW</span>}
              {it.unlocked && !it.isNew && <span style={{ fontSize: 11, color: "rgba(255,255,255,.5)" }}>見た</span>}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}
