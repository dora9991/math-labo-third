// ============================================================
// Lesson.jsx — 「動画を見ながら、19chのワークシートに書きこむ」画面
//  ・上：YouTube 埋め込みプレイヤー（動画IDがあれば再生。無ければ19chを開くボタン）
//  ・下：19ch の無料プリント(PDF)を “読み込み式” で表示し、その上に手書きを重ねる。
//      └ PDFは再ホストせず、19ch のURLを Google ドキュメントビューア経由の iframe で表示。
//        （CORS非対応・ブラウザ差を避けるため。動画は公式埋め込み＝再生/広告は葉一さんに計上）
//  ・操作モード👆＝動画再生・PDFスクロール／書くモード✏️＝プリントの上に手書き。
//  ※ 著作権は葉一「とある男が授業をしてみた」／プリント出典 19ch.tv に帰属。
// ============================================================
import { useEffect, useRef, useState } from "react";
import Header from "../components/Header.jsx";

const PEN_COLORS = ["#1e1b4b", "#ef4444", "#2563eb", "#16a34a", "#f59e0b"];
const PEN_SIZES = [
  { label: "細", size: 1.6 },
  { label: "中", size: 3 },
  { label: "太", size: 6 },
];
// 19ch のPDFをそのまま埋め込み表示するためのビューア（再ホストしない読み込み式）
const viewerSrc = (pdf) => "https://docs.google.com/viewer?embedded=true&url=" + encodeURIComponent(pdf);

// YouTube IFrame Player API を一度だけ読み込み、使える状態になったら解決する
function loadYT() {
  return new Promise((resolve) => {
    if (window.YT && window.YT.Player) return resolve(window.YT);
    if (!document.getElementById("yt-iframe-api")) {
      const s = document.createElement("script");
      s.id = "yt-iframe-api";
      s.src = "https://www.youtube.com/iframe_api";
      document.body.appendChild(s);
    }
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { prev && prev(); resolve(window.YT); };
    const iv = setInterval(() => { if (window.YT && window.YT.Player) { clearInterval(iv); resolve(window.YT); } }, 300);
  });
}

export default function Lesson({ player, unit, media, onBack, onPractice, onWatched, watched = false, passed = false }) {
  const { youtubeId, playlistId, worksheetUrl, videoPage } = media || {};
  // 視聴ポイント：単独動画＋onWatchedがあるとき（はいちモード）だけ、再生時間を計測して
  //  一定割合見たら1回だけポイント付与する。そのためJS API(enablejsapi)を有効にする。
  const trackWatch = !!onWatched && !!youtubeId && !playlistId && !watched;
  const frameId = "haichi-yt-player";
  // 埋め込みURL：再生リストがあれば章まるごと（中の動画を選べる）、無ければ単独動画。
  const embedSrc = playlistId
    ? `https://www.youtube.com/embed/${youtubeId || "videoseries"}?list=${playlistId}&rel=0&modestbranding=1`
    : youtubeId
      ? `https://www.youtube.com/embed/${youtubeId}?rel=0&modestbranding=1&enablejsapi=1`
      : null;

  // ── 手書き設定 ──
  //  mode: "move"=操作（動画/PDFを触れる）／"pen"=ペン／"erase"=消しゴム
  const [mode, setMode] = useState("move");
  const [color, setColor] = useState(PEN_COLORS[0]);
  const [size, setSize] = useState(PEN_SIZES[0].size);

  const paneRef = useRef(null);     // ワークシート枠（PDFと手書きを重ねる親）
  const boardRef = useRef(null);    // 手書きキャンバス
  const ctxRef = useRef(null);
  const drawing = useRef(false);
  const strokesRef = useRef([]);    // [{ color, size, erasing, w0, points:[{fx,fy}] }]
  const curRef = useRef(null);
  const modeRef = useRef(mode), colorRef = useRef(color), sizeRef = useRef(size);
  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { colorRef.current = color; }, [color]);
  useEffect(() => { sizeRef.current = size; }, [size]);

  // ── キャンバスのサイズ合わせ＋再描画（幅基準の正規化座標で保持＝拡大縮小に追従） ──
  function redraw() {
    const cv = boardRef.current, ctx = ctxRef.current;
    if (!cv || !ctx) return;
    ctx.clearRect(0, 0, cv.width, cv.height);
    for (const s of strokesRef.current) {
      if (!s.points.length) continue;
      const X = (p) => p.fx * cv.width, Y = (p) => p.fy * cv.width; // x,yとも幅基準＝均一スケール
      const lw = (s.erasing ? s.size * 3 : s.size) * (cv.width / (s.w0 || 1));
      ctx.save();
      ctx.lineCap = "round"; ctx.lineJoin = "round";
      ctx.globalCompositeOperation = s.erasing ? "destination-out" : "source-over";
      ctx.strokeStyle = s.color; ctx.lineWidth = lw;
      ctx.beginPath(); ctx.moveTo(X(s.points[0]), Y(s.points[0]));
      for (let i = 1; i < s.points.length; i++) ctx.lineTo(X(s.points[i]), Y(s.points[i]));
      if (s.points.length === 1) ctx.lineTo(X(s.points[0]) + 0.1, Y(s.points[0]) + 0.1);
      ctx.stroke(); ctx.restore();
    }
  }
  function resizeBoard() {
    const cv = boardRef.current;
    if (!cv) return;
    const r = cv.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.max(1, Math.round(r.width * dpr));
    cv.height = Math.max(1, Math.round(r.height * dpr));
    ctxRef.current = cv.getContext("2d");
    redraw();
  }
  useEffect(() => {
    resizeBoard();
    const onR = () => requestAnimationFrame(resizeBoard);
    window.addEventListener("resize", onR);
    let ro;
    if (window.ResizeObserver && paneRef.current) {
      ro = new ResizeObserver(() => requestAnimationFrame(resizeBoard));
      ro.observe(paneRef.current);
    }
    return () => { window.removeEventListener("resize", onR); ro && ro.disconnect(); };
  }, []); // eslint-disable-line

  // ── 視聴ポイント：動画を一定割合（約6割）見たら、1回だけ onWatched を呼ぶ ──
  const watchedFiredRef = useRef(false);
  useEffect(() => {
    if (!trackWatch || !embedSrc) return;
    let player, poll, sec = 0, alive = true;
    loadYT().then((YT) => {
      if (!alive || !YT) return;
      try {
        player = new YT.Player(frameId, {
          events: {
            onStateChange: (e) => {
              if (e.data === YT.PlayerState.PLAYING) {
                clearInterval(poll);
                poll = setInterval(() => {
                  sec += 1;
                  const dur = (player.getDuration && player.getDuration()) || 0;
                  const need = dur > 0 ? Math.min(dur * 0.6, dur - 5) : 120; // 6割 or 最大2分で達成
                  if (!watchedFiredRef.current && sec >= need) {
                    watchedFiredRef.current = true;
                    clearInterval(poll);
                    onWatched && onWatched();
                  }
                }, 1000);
              } else {
                clearInterval(poll);
                if (e.data === YT.PlayerState.ENDED && !watchedFiredRef.current) {
                  watchedFiredRef.current = true; onWatched && onWatched();
                }
              }
            },
          },
        });
      } catch {}
    });
    return () => { alive = false; clearInterval(poll); try { player && player.destroy && player.destroy(); } catch {} };
  }, [trackWatch, embedSrc]); // eslint-disable-line

  // ── 手書きハンドラ（ペン／マウス／タッチ共通） ──
  function posOf(e) {
    const cv = boardRef.current, r = cv.getBoundingClientRect();
    const w = r.width || 1;
    return { fx: (e.clientX - r.left) / w, fy: (e.clientY - r.top) / w }; // 幅で正規化
  }
  function down(e) {
    if (modeRef.current === "move") return; // 操作モードはiframeに任せる
    e.preventDefault();
    boardRef.current.setPointerCapture?.(e.pointerId);
    drawing.current = true;
    const w0 = boardRef.current.getBoundingClientRect().width;
    curRef.current = { color: colorRef.current, size: sizeRef.current, erasing: modeRef.current === "erase", w0, points: [posOf(e)] };
    strokesRef.current.push(curRef.current);
    redraw();
  }
  function move(e) {
    if (!drawing.current || modeRef.current === "move") return;
    e.preventDefault();
    curRef.current.points.push(posOf(e));
    redraw();
  }
  function up() { drawing.current = false; }
  function clearBoard() { strokesRef.current = []; redraw(); }

  const drawMode = mode !== "move";
  const tabBtn = (id, label) => (
    <button data-sfx="none" onClick={() => setMode(id)}
      style={{ ...toolBtn, background: mode === id ? "#6366f1" : "rgba(255,255,255,.08)" }}>{label}</button>
  );

  return (
    <div className="app">
      <Header player={player} back="もどる" onBack={onBack} />
      <div className="content" style={{ paddingBottom: 24 }}>
        <div className="pg-ttl" style={{ fontSize: 18 }}>📺 {unit?.name || "解説と練習"}</div>
        <div className="pg-sub">動画を見ながら、下のプリントに書きこもう（葉一さん／19ch）</div>

        {/* ── 上：動画（アプリ内で埋め込み再生） ── */}
        {embedSrc ? (
          <div style={{ position: "relative", width: "100%", paddingBottom: "56.25%", borderRadius: 14, overflow: "hidden", background: "#000", border: "1px solid rgba(255,255,255,.12)" }}>
            <iframe
              id={frameId}
              title="解説動画"
              src={embedSrc}
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : (
          <div className="glass" style={{ padding: "14px 16px", textAlign: "center" }}>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,.75)", lineHeight: 1.6, marginBottom: 10 }}>
              この単元の埋め込み動画IDは未設定です。<br />
              <span style={{ fontSize: 11, color: "rgba(255,255,255,.5)" }}>（data/lessonMedia.js に YouTube動画IDを入れると、ここで埋め込み再生できます）</span>
            </div>
            {videoPage && (
              <button data-sfx="none" onClick={() => window.open(videoPage, "_blank", "noopener")}
                style={{ ...toolBtn, background: "linear-gradient(135deg,#ef4444,#f87171)", padding: "10px 16px" }}>
                ▶ 19chで動画を見る（別タブ）
              </button>
            )}
          </div>
        )}

        {/* ── 道具バー ── */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", marginTop: 12 }}>
          {tabBtn("move", "👆 操作")}
          {tabBtn("pen", "✏️ ペン")}
          {tabBtn("erase", "🧽 消す")}
          <div style={{ display: "flex", gap: 5, marginLeft: 4 }}>
            {PEN_COLORS.map((c) => (
              <button key={c} data-sfx="none" onClick={() => { setColor(c); setMode("pen"); }}
                style={{ width: 24, height: 24, borderRadius: "50%", background: c, cursor: "pointer", border: color === c && mode === "pen" ? "3px solid #fff" : "2px solid rgba(255,255,255,.25)" }} />
            ))}
          </div>
          <div style={{ display: "flex", gap: 4, marginLeft: 4 }}>
            {PEN_SIZES.map((s) => (
              <button key={s.label} data-sfx="none" onClick={() => { setSize(s.size); if (mode === "move") setMode("pen"); }}
                style={{ ...toolBtn, padding: "6px 10px", background: size === s.size && mode !== "move" ? "#4f46e5" : "rgba(255,255,255,.08)" }}>{s.label}</button>
            ))}
          </div>
          <div style={{ flex: 1 }} />
          <button data-sfx="none" onClick={clearBoard} style={toolBtn}>全消し</button>
          {worksheetUrl && (
            <button data-sfx="none" onClick={() => window.open(worksheetUrl, "_blank", "noopener")} style={toolBtn}>↗ 別タブ</button>
          )}
        </div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,.55)", margin: "8px 2px 0", lineHeight: 1.6 }}>
          {drawMode
            ? "✏️ 書くモード：プリントの上に手書きできます（スクロールは「👆操作」へ）"
            : "👆 操作モード：プリントのスクロール・動画の再生ができます（書くときは「✏️ペン」へ）"}
        </div>

        {/* ── 下：ワークシート（19chのPDFを読み込み＋手書きを重ねる） ── */}
        <div
          ref={paneRef}
          style={{
            position: "relative", marginTop: 10, width: "100%", height: "72vh",
            borderRadius: 12, overflow: "hidden", background: "#fff",
            boxShadow: "0 8px 24px rgba(0,0,0,.4)", border: "1px solid rgba(255,255,255,.12)",
          }}
        >
          {worksheetUrl ? (
            <iframe
              title="ワークシート"
              src={viewerSrc(worksheetUrl)}
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0, background: "#fff" }}
            />
          ) : (
            // 19chのプリントが対応づいていない単元は、白紙に書ける
            <div style={{ position: "absolute", inset: 0, background: "#fff" }} />
          )}
          <canvas
            ref={boardRef}
            onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
            style={{
              position: "absolute", inset: 0, width: "100%", height: "100%",
              touchAction: drawMode ? "none" : "auto",
              pointerEvents: drawMode ? "auto" : "none",
              cursor: drawMode ? "crosshair" : "default",
            }}
          />
        </div>
        {!worksheetUrl && (
          <div className="glass" style={{ padding: "8px 12px", fontSize: 11.5, color: "rgba(255,255,255,.72)", marginTop: 10, textAlign: "center", lineHeight: 1.6 }}>
            📝 この単元のプリントはまだ対応づいていません。動画を見ながら、上の白紙に計算や考えを書きこめます。
          </div>
        )}

        {/* はいちモード：ワークシートの下に「この動画の練習問題」への導線（合格でバッジ） */}
        {onPractice && (
          <button
            data-sfx="none"
            onClick={onPractice}
            style={{
              width: "100%", margin: "14px 0 2px", padding: "14px 16px", borderRadius: 14, cursor: "pointer",
              border: "2px solid rgba(255,255,255,.22)", color: "#fff", textAlign: "left",
              background: passed ? "linear-gradient(135deg,#f59e0b,#fbbf24)" : "linear-gradient(135deg,#22c55e,#10b981)",
              display: "flex", alignItems: "center", gap: 12, boxShadow: "0 5px 16px rgba(16,185,129,.32)",
            }}
          >
            <span style={{ fontSize: 32, lineHeight: 1 }}>{passed ? "🏅" : "📝"}</span>
            <span>
              <span style={{ fontSize: 16, fontWeight: 900, display: "block" }}>
                {passed ? "合格済み！もう一度この動画の問題を解く" : "この動画の練習問題を解く"}
              </span>
              <span style={{ fontSize: 11.5, fontWeight: 700, opacity: .92 }}>
                {passed ? "復習にもう一回チャレンジしてもOK" : "動画で学んだ内容にピッタリ合った問題で確かめよう"}
              </span>
            </span>
          </button>
        )}

        <div style={{ fontSize: 10.5, color: "rgba(255,255,255,.4)", textAlign: "center", marginTop: 14, lineHeight: 1.6 }}>
          ※ 動画は <b>YouTube公式埋め込み</b>（再生・広告は葉一さんのチャンネルに計上）、プリントは
          <b> 19ch のPDFを読み込み表示</b>（再ホストしません）。著作権は
          葉一「とある男が授業をしてみた」／出典 19ch.tv に帰属します。
        </div>
      </div>
    </div>
  );
}

const toolBtn = {
  padding: "8px 12px", borderRadius: 10, border: "none", cursor: "pointer", fontFamily: "inherit",
  fontSize: 12, fontWeight: 900, color: "#fff", background: "rgba(255,255,255,.08)",
};
