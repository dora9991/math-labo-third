// ============================================================
// StoryPlayer.jsx — 会話（ビジュアルノベル風）画面。背景＋立ち絵＋会話ウィンドウ。
//  タップ/クリック/Enter/スペースで次へ。文字は少しずつ表示（もう一度タップで全文表示）。右上の「スキップ」で場面を飛ばす。
//  beats: [{k:"nar"|"say"|"label", who, n, t, e, bg, voice, mem}]（storyData.json）
// ============================================================
import { useEffect, useMemo, useRef, useState } from "react";
import { monsterImageUrl } from "../data/monsterImages.js";
import * as bgm from "../../audio/bgm.js";
import { bgmTracks } from "./storyRun.js";
import "./story.css";

const charGlob = import.meta.glob("../assets/story/characters/*.webp", { eager: true, query: "?url", import: "default" });
const bgGlob = import.meta.glob("../assets/story/backgrounds/*.webp", { eager: true, query: "?url", import: "default" });
const byName = (g) => Object.fromEntries(Object.entries(g).map(([p, u]) => [p.split("/").pop().replace(".webp", ""), u]));
const CHARS = byName(charGlob);
const BGS = byName(bgGlob);
const ALLY_ART = { sp093: 1, sp081: 1, sp042: 1, sp019: 1, sp137: 1 };
const TYPE_MS = 26;

function portraitUrl(who, e) {
  if (ALLY_ART[who]) return monsterImageUrl({ art: who }, "full");
  return (e && CHARS[`${who}_${e}`]) || CHARS[who] || null;
}

export default function StoryPlayer({ scene, onDone }) {
  const beats = scene.beats;
  const [i, setI] = useState(0);
  const [shown, setShown] = useState(0);
  const doneRef = useRef(false);
  const b = beats[i];

  // いまの行までの登場人物（最大3人・新しい順に入れ替え）と、最新の表情
  const { cast, showFoe, bgId } = useMemo(() => {
    const list = []; let foe = false; let bg = scene.bg;
    for (let n = 0; n <= i; n++) {
      const x = beats[n];
      if (x.bg) bg = x.bg;
      if (x.k !== "say") continue;
      if (x.who === "foe") { foe = true; continue; }
      if (x.voice) continue; // 通信・声・日記は立ち絵なし
      const at = list.findIndex((c) => c.who === x.who);
      const item = { who: x.who, e: x.e || (at >= 0 ? list[at].e : null), mem: !!x.mem };
      if (at >= 0) list.splice(at, 1);
      list.push(item);
      if (list.length > 3) list.shift();
    }
    return { cast: list, showFoe: foe, bgId: bg };
  }, [beats, i, scene.bg]);

  // BGM：行ごとの曲（同じ曲が続く間は途切れない。会話が終わったら次の画面のBGMに切り替わる）
  const tracks = useMemo(() => bgmTracks(scene), [scene]);
  const track = tracks[i];
  useEffect(() => { if (track) bgm.play(track); }, [track]);

  const text = b?.t || "";
  useEffect(() => {
    setShown(0);
    if (!text) return;
    const id = setInterval(() => setShown((s) => { if (s >= text.length) { clearInterval(id); return s; } return s + 1; }), TYPE_MS);
    return () => clearInterval(id);
  }, [i, text]);

  const finish = () => { if (doneRef.current) return; doneRef.current = true; onDone(); };
  const next = () => {
    if (!b) return;
    if (shown < text.length) { setShown(text.length); return; }
    if (i + 1 >= beats.length) finish(); else setI(i + 1);
  };
  useEffect(() => {
    const h = (ev) => { if (ev.key === "Enter" || ev.key === " " || ev.key === "ArrowRight") { ev.preventDefault(); next(); } };
    window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h);
  });

  const speaker = b?.k === "say" ? b : null;
  const enemyUrl = scene.enemyId ? monsterImageUrl({ id: scene.enemyId }, "full") : null;
  const humanSlots = showFoe && enemyUrl ? ["st-slot-l1", "st-slot-l2"] : ["st-slot-l1", "st-slot-c", "st-slot-r"];
  const visible = cast.slice(-humanSlots.length);
  const isLabel = b?.k === "label";
  const bgUrl = BGS[bgId] || BGS[scene.bg] || null;

  return (
    <div className="st-root" onPointerDown={next} role="dialog" aria-label="ストーリー">
      <div className="st-bg" style={bgUrl ? { backgroundImage: `url(${bgUrl})` } : undefined} />
      <div className="st-shade" />
      {scene.title && <div className="st-title">{scene.title}</div>}
      <button className="st-skip" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); finish(); }}>スキップ ▶▶</button>

      <div className="st-stage">
        {showFoe && enemyUrl && (
          <img className={`st-foe ${speaker?.who === "foe" ? "is-on" : ""}`} src={enemyUrl} alt="" draggable={false} />
        )}
        {visible.map((c, idx) => {
          const url = portraitUrl(c.who, c.e);
          if (!url) return null;
          const active = speaker && !speaker.voice && speaker.who === c.who;
          return <img key={c.who} className={`st-chara ${humanSlots[idx]} ${ALLY_ART[c.who] ? "is-ally" : ""} ${active ? "is-on" : ""} ${c.mem ? "is-mem" : ""}`} src={url} alt="" draggable={false} />;
        })}
      </div>

      {isLabel ? (
        <div className="st-label"><span>{text.replace(/[【】]/g, "")}</span><i>タップで つづき</i></div>
      ) : (
        <div className={`st-box ${speaker ? "is-say" : "is-nar"} ${speaker?.who === "foe" ? "is-foe" : ""}`}>
          {speaker && <div className="st-name">{speaker.n}{speaker.voice ? `（${speaker.voice}）` : ""}</div>}
          <p className={speaker?.who === "foe" ? "st-foe-text" : ""}>{text.slice(0, shown)}<span className="st-caret">{shown >= text.length ? "▼" : ""}</span></p>
        </div>
      )}
    </div>
  );
}
