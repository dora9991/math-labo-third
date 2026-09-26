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
  const [typed, setTyped] = useState({ i: 0, n: 0 }); // どの行の何文字目まで出したか（行が変わった瞬間は 0 文字扱い＝前の行の全文が一瞬出るのを防ぐ）
  const doneRef = useRef(false);
  const b = beats[i];

  // いまの行までの登場人物と最新の表情。立ち絵の「場所」は登場した時に決めたまま動かさない
  //  （再び喋った人が末尾に回って左右が入れ替わる、を防ぐ）。場所が足りない時は、いちばん長く喋っていない人が退場する。
  const { slots, showFoe, bgId, exprs } = useMemo(() => {
    const sl = [null, null, null]; const used = {}; const ex = {}; let foe = false; let bg = scene.bg;
    const cap = () => (foe ? 2 : 3);
    const place = (who, n) => {
      let at = sl.indexOf(who);
      if (at < 0 || at >= cap()) {
        if (at >= 0) sl[at] = null;
        at = sl.findIndex((v, k) => v === null && k < cap());
        if (at < 0) { // 満員：最後に喋ったのが最も古い人と入れ替える
          let old = 0; for (let k = 1; k < cap(); k++) if ((used[sl[k]] ?? -1) < (used[sl[old]] ?? -1)) old = k;
          at = old;
        }
        sl[at] = who;
      }
      used[who] = n;
    };
    for (let n = 0; n <= i; n++) {
      const x = beats[n];
      if (x.bg) bg = x.bg;
      if (x.k !== "say") continue;
      if (x.who === "foe") {
        if (!foe) { foe = true; if (sl[2]) { const w = sl[2]; sl[2] = null; place(w, used[w] ?? n); } }
        continue;
      }
      if (x.voice) continue; // 通信・声・日記は立ち絵なし
      place(x.who, n);
      ex[x.who] = { e: x.e || ex[x.who]?.e || null, mem: !!x.mem };
    }
    return { slots: sl, showFoe: foe, bgId: bg, exprs: ex };
  }, [beats, i, scene.bg]);

  // BGM：行ごとの曲（同じ曲が続く間は途切れない。会話が終わったら次の画面のBGMに切り替わる）
  const tracks = useMemo(() => bgmTracks(scene), [scene]);
  const track = tracks[i];
  useEffect(() => { if (track) bgm.play(track); }, [track]);

  const text = b?.t || "";
  const shown = typed.i === i ? typed.n : 0;
  useEffect(() => {
    if (!text) return;
    const id = setInterval(() => setTyped((t) => {
      const n = t.i === i ? t.n : 0;
      if (n >= text.length) { clearInterval(id); return t; }
      return { i, n: n + 1 };
    }), TYPE_MS);
    return () => clearInterval(id);
  }, [i, text]);

  const finish = () => { if (doneRef.current) return; doneRef.current = true; onDone(); };
  const next = () => {
    if (!b) return;
    if (shown < text.length) { setTyped({ i, n: text.length }); return; }
    if (i + 1 >= beats.length) finish(); else setI(i + 1);
  };
  useEffect(() => {
    const h = (ev) => { if (ev.key === "Enter" || ev.key === " " || ev.key === "ArrowRight") { ev.preventDefault(); next(); } };
    window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h);
  });

  const speaker = b?.k === "say" ? b : null;
  const enemyUrl = scene.enemyId ? monsterImageUrl({ id: scene.enemyId }, "full") : null;
  const slotClass = showFoe && enemyUrl ? ["st-slot-l1", "st-slot-l2"] : ["st-slot-l1", "st-slot-c", "st-slot-r"];
  const isLabel = b?.k === "label";
  const bgUrl = BGS[bgId] || BGS[scene.bg] || null;

  return (
    <div className="st-root" onPointerDown={next} role="dialog" aria-label="ストーリー">
      <div className="st-bg" style={bgUrl ? { backgroundImage: `url(${bgUrl})` } : undefined} />
      <div className="st-shade" />
      {scene.title && <div className="st-title">{scene.title}</div>}
      <button className="st-skip" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); finish(); }}>スキップ ▶▶</button>

      <div className={`st-stage ${showFoe && enemyUrl ? "has-foe" : ""}`}>
        {showFoe && enemyUrl && (
          <img className={`st-foe ${speaker?.who === "foe" ? "is-on" : ""}`} src={enemyUrl} alt="" draggable={false} />
        )}
        {slots.slice(0, slotClass.length).map((who, idx) => {
          if (!who) return null;
          const c = exprs[who] || {};
          const url = portraitUrl(who, c.e);
          if (!url) return null;
          const active = speaker && !speaker.voice && speaker.who === who;
          return <img key={who} className={`st-chara ${slotClass[idx]} ${ALLY_ART[who] ? "is-ally" : ""} ${active ? "is-on" : ""} ${c.mem ? "is-mem" : ""}`} src={url} alt="" draggable={false} />;
        })}
      </div>

      {isLabel ? (
        <div className="st-label"><span>{text.replace(/[【】]/g, "")}</span><i>タップで つづき</i></div>
      ) : (
        <div className={`st-box ${speaker ? "is-say" : "is-nar"} ${speaker?.who === "foe" ? "is-foe" : ""}`}>
          {speaker && <div className="st-name">{speaker.n}{speaker.voice ? `（${speaker.voice}）` : ""}</div>}
          <p className={speaker?.who === "foe" ? "st-foe-text" : ""}><span>{text.slice(0, shown)}</span><span className="st-rest">{text.slice(shown)}</span>{shown >= text.length && <span className="st-caret">▼</span>}</p>
        </div>
      )}
    </div>
  );
}
