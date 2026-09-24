// MedalToast.jsx — サーバーがメダルを認めた瞬間の「メダルゲット！」表示（数秒で消える。タップでも閉じる）
import { useEffect } from "react";
import { findUnitById } from "../../data/index.js";
import { HAICHI_COURSE } from "../../data/haichiCourse.js";
import * as sfx from "../../audio/sfx.js";

function labelOf(m) {
  if (m.kind === "crystal") return { icon: "💎", title: `クリスタル +${m.n}`, sub: m.label || "", crystal: true };
  if (m.kind === "practice") return { icon: "✏️", title: "れんしゅうメダル", sub: findUnitById(m.unitId)?.name || "" };
  const key = m.key || "";
  if (key.startsWith("nv:")) return { icon: "📺", title: "はいちメダル", sub: findUnitById(key.slice(3))?.name || "" };
  const mm = /^g([123])m(\d+)$/.exec(key);
  let title = "";
  if (mm) for (const sec of HAICHI_COURSE[Number(mm[1])] || []) { const l = sec.lessons.find((x) => x.n === Number(mm[2])); if (l) title = l.t; }
  return { icon: "📺", title: "はいちメダル", sub: title };
}

export default function MedalToast({ medals, onDone }) {
  useEffect(() => {
    try { sfx.levelUp(); } catch { /* 音が出せない環境では無視 */ }
    const t = setTimeout(onDone, 3800);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div onClick={onDone} style={{ position: "fixed", left: 0, right: 0, top: 72, zIndex: 300, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: "0 16px", pointerEvents: "auto" }}>
      {medals.map((m, i) => {
        const l = labelOf(m);
        return (
          <div key={i} className="glass" style={{ maxWidth: 360, width: "100%", padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, border: "2px solid #fde047", background: "rgba(23,21,54,.96)", animation: "rankUpPop .5s cubic-bezier(.2,1.4,.4,1) both" }}>
            <span style={{ fontSize: 34, display: "grid", placeItems: "center", width: 52, height: 52, borderRadius: "50%", background: "radial-gradient(circle at 35% 30%,#fff7c2,#fbbf24 55%,#b45309)", boxShadow: "0 0 14px rgba(251,191,36,.6)" }}>{l.icon}</span>
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: 15, fontWeight: 900, color: l.crystal ? "#7dd3fc" : "#fde047" }}>{l.crystal ? `💎 ${l.title}！` : `🏅 ${l.title}ゲット！`}</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,.8)", marginTop: 2 }}>{l.sub}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
