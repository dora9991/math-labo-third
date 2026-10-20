// ============================================================
// HaichiStudio.jsx — はいちモードの「動画学習スタジオ」
//  参考デモ(math-labo7/lesson-demo.html)準拠の高機能ビューア：
//   ・表示切替：動画＋プリント／動画のみ／プリントのみ
//   ・ならべ方：縦／横／入れ替え、境界バーをドラッグして大きさ可変
//   ・前／次レッスン送り（その大単元内）
//   ・モード：👆操作（動画再生・PDFスクロール）／✏️書く（プリントに手書き）
//   ・ペン：色・太さ・消しゴム・全消し
//   ・視聴ポイント：YouTube IFrame APIで再生を計測（約6割で onWatched）
//  下部に「この動画の練習問題を解く」ボタン（合格でバッジ）。
//  動画はYouTube公式埋め込み、プリントは19chのPDF読み込み。著作権は葉一さん／19ch.tv。
// ============================================================
import { useEffect, useRef, useState } from "react";
import Header from "../components/Header.jsx";
import * as bgm from "../audio/bgm.js";

const PEN_COLORS = ["#111111", "#ef4444", "#2563eb", "#16a34a", "#f59e0b"];
const PEN_SIZES = [
  { label: "極細", size: 1.2 },
  { label: "細", size: 2 },
  { label: "中", size: 4 },
  { label: "太", size: 8 },
];
const viewerSrc = (pdf) => "https://docs.google.com/viewer?embedded=true&url=" + encodeURIComponent(pdf);
const lessonKey = (grade, n) => `g${grade}m${n}`;

// YouTube IFrame Player API を一度だけ読み込む
function loadYT() {
  return new Promise((resolve) => {
    if (window.YT && window.YT.Player) return resolve(window.YT);
    if (!document.getElementById("yt-iframe-api")) {
      const s = document.createElement("script");
      s.id = "yt-iframe-api"; s.src = "https://www.youtube.com/iframe_api";
      document.body.appendChild(s);
    }
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { prev && prev(); resolve(window.YT); };
    const iv = setInterval(() => { if (window.YT && window.YT.Player) { clearInterval(iv); resolve(window.YT); } }, 300);
  });
}

export default function HaichiStudio({ player, grade, section, lesson, watchedMap = {}, passedMap = {}, onChangeLesson, onWatched, onPractice, onBack }) {
  const lessons = section.lessons;
  const idx = Math.max(0, lessons.findIndex((l) => l.n === lesson.n));
  const L = lessons[idx] || lesson;
  const key = lessonKey(grade, L.n);
  const passed = !!passedMap[key];
  const hasPractice = (L.u || []).length > 0;

  const embedSrc = `https://www.youtube-nocookie.com/embed/${L.yt}?rel=0&modestbranding=1&enablejsapi=1`;
  const frameId = "haichi-yt-player";

  // 表示・レイアウト
  const [content, setContent] = useState("both"); // both | video | pdf
  const [layout, setLayout] = useState("vert");    // vert | horiz（PC以外用。PCは常に横並び）
  const [swapped, setSwapped] = useState(false);
  const [videoShare, setVideoShare] = useState(0.5); // PC以外：ドラッグで可変

  // PC画面（横幅900px以上）では、左右の仕切りをドラッグさせず、3段階の固定比率にする。
  //  「左小・右大／左右同じ／左大・右小」。ここでいう「左」は入れ替え(swapped)前の並び順。
  const [isDesktop, setIsDesktop] = useState(() => typeof window !== "undefined" && window.matchMedia("(min-width: 900px)").matches);
  const [desktopPreset, setDesktopPreset] = useState("equal"); // small | equal | big（左ペインの比率）
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(min-width: 900px)");
    const onChange = () => setIsDesktop(mq.matches);
    onChange();
    mq.addEventListener ? mq.addEventListener("change", onChange) : mq.addListener(onChange);
    return () => (mq.removeEventListener ? mq.removeEventListener("change", onChange) : mq.removeListener(onChange));
  }, []);
  const DESKTOP_LEFT_SHARE = { small: 0.35, equal: 0.5, big: 0.65 };

  // 手書き
  const [mode, setMode] = useState("move");        // move | draw
  const [color, setColor] = useState(PEN_COLORS[0]);
  const [size, setSize] = useState(PEN_SIZES[0].size);
  const [erasing, setErasing] = useState(false);

  // ステージの幅と画面の高さ（動画16:9・プリント(A4横)の縦横比に合わせて、ステージの高さを決めるのに使う）
  const [stageBox, setStageBox] = useState({ w: 0, vh: typeof window !== "undefined" ? window.innerHeight : 800 });
  const splitRef = useRef(null), pdfPaneRef = useRef(null), boardRef = useRef(null), ctxRef = useRef(null);
  const drawing = useRef(false), strokesRef = useRef([]), curRef = useRef(null);
  const modeRef = useRef(mode), colorRef = useRef(color), sizeRef = useRef(size), eraseRef = useRef(erasing);
  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { colorRef.current = color; }, [color]);
  useEffect(() => { sizeRef.current = size; }, [size]);
  useEffect(() => { eraseRef.current = erasing; }, [erasing]);

  // ── キャンバス描画（幅基準の正規化座標。PDFの拡大に追従） ──
  function redraw() {
    const cv = boardRef.current, ctx = ctxRef.current;
    if (!cv || !ctx) return;
    ctx.clearRect(0, 0, cv.width, cv.height);
    for (const s of strokesRef.current) {
      if (!s.points.length) continue;
      const X = (p) => p.fx * cv.width, Y = (p) => p.fy * cv.height; // fx=幅基準・fy=高さ基準（posOfと対応させる）
      const lw = (s.erasing ? s.size * 3 : s.size) * (cv.width / (s.w0 || 1));
      ctx.save(); ctx.lineCap = "round"; ctx.lineJoin = "round";
      ctx.globalCompositeOperation = s.erasing ? "destination-out" : "source-over";
      ctx.strokeStyle = s.color; ctx.lineWidth = lw;
      ctx.beginPath(); ctx.moveTo(X(s.points[0]), Y(s.points[0]));
      for (let i = 1; i < s.points.length; i++) ctx.lineTo(X(s.points[i]), Y(s.points[i]));
      if (s.points.length === 1) ctx.lineTo(X(s.points[0]) + 0.1, Y(s.points[0]) + 0.1);
      ctx.stroke(); ctx.restore();
    }
  }
  function resizeBoard() {
    const cv = boardRef.current; if (!cv) return;
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
    if (window.ResizeObserver && pdfPaneRef.current) {
      ro = new ResizeObserver(() => requestAnimationFrame(resizeBoard));
      ro.observe(pdfPaneRef.current);
    }
    return () => { window.removeEventListener("resize", onR); ro && ro.disconnect(); };
  }, []); // eslint-disable-line
  // レイアウト変更でペイン寸法が変わるので合わせ直す
  useEffect(() => { requestAnimationFrame(resizeBoard); }, [content, layout, swapped, videoShare, isDesktop, desktopPreset]); // eslint-disable-line
  // レッスンが変わったら手書きを消す
  useEffect(() => { strokesRef.current = []; redraw(); }, [L.yt]); // eslint-disable-line

  // 【2026-09-22】fx は幅基準、fy は高さ基準で正規化する（前は fy も幅で割っていたため、
  //  ペインの横幅だけが変わる＝プリセット切替のたびに書き込みが縦にずれて見える不具合があった）。
  function posOf(e) {
    const cv = boardRef.current, r = cv.getBoundingClientRect();
    return { fx: (e.clientX - r.left) / (r.width || 1), fy: (e.clientY - r.top) / (r.height || 1) };
  }
  function down(e) {
    if (modeRef.current !== "draw") return;
    e.preventDefault();
    boardRef.current.setPointerCapture?.(e.pointerId);
    drawing.current = true;
    const w0 = boardRef.current.getBoundingClientRect().width;
    curRef.current = { color: colorRef.current, size: sizeRef.current, erasing: eraseRef.current, w0, points: [posOf(e)] };
    strokesRef.current.push(curRef.current); redraw();
  }
  function move(e) {
    if (!drawing.current || modeRef.current !== "draw") return;
    e.preventDefault();
    curRef.current.points.push(posOf(e)); redraw();
  }
  function up() { drawing.current = false; }
  function clearBoard() { strokesRef.current = []; redraw(); }

  // ── 境界バーのドラッグで動画／プリントの大きさを変える ──
  const dragRef = useRef(false);
  function dividerDown(e) { dragRef.current = true; e.currentTarget.setPointerCapture?.(e.pointerId); e.preventDefault(); }
  function dividerMove(e) {
    if (!dragRef.current || !splitRef.current) return;
    const r = splitRef.current.getBoundingClientRect();
    let b = layout === "horiz" ? (e.clientX - r.left) / r.width : (e.clientY - r.top) / r.height;
    b = Math.max(0.15, Math.min(0.85, b));
    setVideoShare(swapped ? 1 - b : b);
  }
  function dividerUp() { dragRef.current = false; }

  // ── 視聴ポイント（約6割視聴で1回だけ onWatched）＋ BGMダッキング（動画再生中はBGMをオフ、
  //     止まったらはいちモードの控えめ音量に戻す）。視聴済みレッスンでも、BGM連動のために
  //     プレイヤーへのイベント登録は常に行う（旧実装は視聴済みだと登録自体をスキップしていた）。
  const firedRef = useRef(false);
  useEffect(() => {
    firedRef.current = !!watchedMap[key]; // 既に視聴済みなら計測しない（BGM連動はする）
    let yp, poll, sec = 0, alive = true;
    loadYT().then((YT) => {
      if (!alive || !YT) return;
      try {
        yp = new YT.Player(frameId, {
          events: {
            onStateChange: (e) => {
              if (e.data === YT.PlayerState.PLAYING) {
                bgm.setDuckLevel(0); // 動画の音を聞きやすく、BGMをオフに
                clearInterval(poll);
                if (firedRef.current || !onWatched) return;
                poll = setInterval(() => {
                  sec += 1;
                  const dur = (yp.getDuration && yp.getDuration()) || 0;
                  const need = dur > 0 ? Math.min(dur * 0.6, dur - 5) : 120;
                  if (!firedRef.current && sec >= need) { firedRef.current = true; clearInterval(poll); onWatched(key); }
                }, 1000);
              } else {
                clearInterval(poll);
                // 一時停止／終了でBGMをはいちモードの控えめ音量に戻す（バッファリング等では戻さない）
                if (e.data === YT.PlayerState.PAUSED || e.data === YT.PlayerState.ENDED) bgm.setDuckLevel(0.35);
                if (e.data === YT.PlayerState.ENDED && !firedRef.current && onWatched) { firedRef.current = true; onWatched(key); }
              }
            },
          },
        });
      } catch {}
    });
    return () => {
      alive = false;
      clearInterval(poll);
      try { yp && yp.destroy && yp.destroy(); } catch {}
      bgm.setDuckLevel(0.35); // レッスン切替・画面離脱時：はいちモードの控えめ音量に戻す（離脱時は上のApp側の効果がさらに1へ戻す）
    };
  }, [L.yt]); // eslint-disable-line

  // キーボード：Q=操作／W=書く
  useEffect(() => {
    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const k = (e.key || "").toLowerCase();
      if (k === "q") setMode("move");
      else if (k === "w") setMode("draw");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    // スクロールバーの出入り(約15px)で高さが行ったり来たりしないよう、20px未満の幅の変化は無視する
    const measure = () => setStageBox((b) => {
      const w = splitRef.current?.clientWidth || 0, vh = window.innerHeight;
      return Math.abs(w - b.w) < 20 && vh === b.vh && b.w > 0 ? b : { w, vh };
    });
    measure();
    let ro;
    if (window.ResizeObserver && splitRef.current) { ro = new ResizeObserver(measure); ro.observe(splitRef.current); }
    window.addEventListener("resize", measure);
    return () => { ro && ro.disconnect(); window.removeEventListener("resize", measure); };
  }, []);

  const drawMode = mode === "draw";
  // PCは常に横並び固定（縦／横の切替そのものを出さない）。それ以外（タブレット・スマホ）は従来どおり。
  const splitDir = content === "both" ? (isDesktop ? "horiz" : layout) : "horiz";
  const videoHidden = content === "pdf", pdfHidden = content === "video";
  const single = content !== "both";
  // PC：3段階固定比率（ドラッグ不可）。それ以外：ドラッグで自由に変えた比率（videoShare）。
  const leftShare = DESKTOP_LEFT_SHARE[desktopPreset];
  const effectiveVideoShare = isDesktop ? (swapped ? 1 - leftShare : leftShare) : videoShare;
  const videoStyle = { order: swapped ? 2 : 0, flexGrow: single ? 1 : effectiveVideoShare, display: videoHidden ? "none" : undefined };
  const pdfStyle = { order: swapped ? 0 : 2, flexGrow: single ? 1 : (1 - effectiveVideoShare), display: pdfHidden ? "none" : undefined };

  // ステージの高さ：動画(16:9)とプリント(A4横 約1.41:1)の縦横比に合わせる。左右に並べるときは、
  //  それぞれのペイン幅から必要な高さを出して大きい方に合わせる（もう一方はうすい余白）。画面の高さの8割までに収める。
  const VIDEO_AR = 16 / 9, PDF_AR = 842 / 595;
  let stageH = "76vh";
  if (splitDir === "horiz" && stageBox.w > 0) {
    const gap = isDesktop && !single ? 14 : 0;
    const divider = !single && !isDesktop ? 22 : 0;
    const avail = Math.max(0, stageBox.w - gap - divider);
    const wV = single ? avail : avail * effectiveVideoShare;
    const wP = single ? avail : avail * (1 - effectiveVideoShare);
    const need = single ? (content === "video" ? wV / VIDEO_AR : wP / PDF_AR) : Math.max(wV / VIDEO_AR, wP / PDF_AR);
    stageH = Math.round(Math.min(Math.max(need, 260), stageBox.vh * 0.8)) + "px";
  }

  const seg = (active) => ({ ...toolBtn, background: active ? "#6366f1" : "rgba(255,255,255,.08)" });

  return (
    <div className="app haichi-studio">
      <Header player={player} back="一覧へ" onBack={onBack} />
      <div className="content" style={{ paddingBottom: 24 }}>
        {/* ── ツールバー ── */}
        <div className="haichi-toolbar" style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", marginBottom: 8 }}>
          {/* レッスン送り */}
          <div style={grp}>
            <button data-sfx="none" onClick={() => onChangeLesson(lessons[(idx - 1 + lessons.length) % lessons.length])} style={toolBtn}>◀ 前</button>
            <span style={{ fontSize: 11.5, fontWeight: 900, minWidth: 120, textAlign: "center", padding: "0 4px" }}>中{grade}-{L.n} {L.t}</span>
            <button data-sfx="none" onClick={() => onChangeLesson(lessons[(idx + 1) % lessons.length])} style={toolBtn}>次 ▶</button>
          </div>
          {/* 確認問題へ（画面の下までスクロールしなくても、いつでも押せるように上にも置く） */}
          {onPractice && hasPractice && (
            <button data-sfx="none" onClick={() => onPractice(L)}
              style={{ ...toolBtn, padding: "9px 14px", fontSize: 12.5, color: "#0b2a1a", border: "1px solid #16a34a",
                background: passed ? "linear-gradient(135deg,#f59e0b,#fbbf24)" : "linear-gradient(135deg,#4ade80,#86efac)" }}>
              {passed ? "🏅 確認問題をもう一度" : "📝 確認問題へ（5問）"}
            </button>
          )}
          {/* 表示 */}
          <div style={grp}>
            <span style={lbl}>表示</span>
            <button data-sfx="none" onClick={() => setContent("both")} style={seg(content === "both")}>動画＋プリント</button>
            <button data-sfx="none" onClick={() => setContent("video")} style={seg(content === "video")}>動画</button>
            <button data-sfx="none" onClick={() => setContent("pdf")} style={seg(content === "pdf")}>プリント</button>
          </div>
          {/* ならべ方：PCは左右の大きさを3段階の固定比率でえらぶ（ドラッグ・縦並びは無し）。
              それ以外（タブレット・スマホ）は従来どおり縦／横の切替＋ドラッグでの可変。 */}
          {isDesktop ? (
            <div style={grp}>
              <span style={lbl}>大きさ</span>
              <button data-sfx="none" onClick={() => setDesktopPreset("small")} style={seg(desktopPreset === "small")} disabled={single}>左小・右大</button>
              <button data-sfx="none" onClick={() => setDesktopPreset("equal")} style={seg(desktopPreset === "equal")} disabled={single}>左右同じ</button>
              <button data-sfx="none" onClick={() => setDesktopPreset("big")} style={seg(desktopPreset === "big")} disabled={single}>左大・右小</button>
              <button data-sfx="none" onClick={() => setSwapped((s) => !s)} style={toolBtn} disabled={single}>⇄ 入れ替え</button>
            </div>
          ) : (
            <div style={grp}>
              <span style={lbl}>ならべ方</span>
              <button data-sfx="none" onClick={() => setLayout("vert")} style={seg(layout === "vert" && content === "both")} disabled={single}>⬍ 縦</button>
              <button data-sfx="none" onClick={() => setLayout("horiz")} style={seg(layout === "horiz" && content === "both")} disabled={single}>⬌ 横</button>
              <button data-sfx="none" onClick={() => setSwapped((s) => !s)} style={toolBtn} disabled={single}>⇄ 入れ替え</button>
            </div>
          )}
          {/* モード */}
          <div style={grp}>
            <span style={lbl}>モード</span>
            <button data-sfx="none" onClick={() => setMode("move")} style={seg(mode === "move")}>👆 操作</button>
            <button data-sfx="none" onClick={() => setMode("draw")} style={seg(mode === "draw")}>✏️ 書く</button>
          </div>
          {/* ペン */}
          <div style={grp}>
            <span style={lbl}>ペン</span>
            {PEN_COLORS.map((c) => (
              <button key={c} data-sfx="none" className="pen-swatch" onClick={() => { setColor(c); setErasing(false); setMode("draw"); }}
                style={{ "--pen": c, width: 22, height: 22, borderRadius: 6, background: c, cursor: "pointer", padding: 0,
                  border: color === c && !erasing && drawMode ? "3px solid #fff" : "2px solid rgba(255,255,255,.25)" }} />
            ))}
            {PEN_SIZES.map((s) => (
              <button key={s.label} data-sfx="none" onClick={() => { setSize(s.size); setErasing(false); if (mode !== "draw") setMode("draw"); }}
                style={seg(size === s.size && !erasing && drawMode)}>{s.label}</button>
            ))}
            <button data-sfx="none" onClick={() => { setErasing(true); if (mode !== "draw") setMode("draw"); }} style={seg(erasing && drawMode)}>消しゴム</button>
            <button data-sfx="none" onClick={clearBoard} style={toolBtn}>全消し</button>
          </div>
        </div>

        {/* ── ステージ（動画／プリントの分割表示＋手書き） ── */}
        <div className="haichi-stage"
          ref={splitRef}
          style={{ display: "flex", flexDirection: splitDir === "vert" ? "column" : "row", width: "100%", height: stageH,
            gap: isDesktop && !single ? 14 : 0 }}
        >
          {/* 動画ペイン */}
          <div style={{ position: "relative", background: "#000", borderRadius: 12, overflow: "hidden", minHeight: 0, minWidth: 0, flexBasis: 0, border: "1px solid rgba(255,255,255,.12)", ...videoStyle }}>
            <span style={paneTag}>▶ 解説動画（YouTube）</span>
            <iframe
              id={frameId}
              title="解説動画"
              src={embedSrc}
              style={{ width: "100%", height: "100%", border: 0, display: "block" }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
            />
          </div>

          {/* 仕切りバー（両方表示のときだけ・ドラッグでリサイズ）。PCは固定比率なのでドラッグ仕切りは出さない
              （パネル間のすき間は上の stage の gap で確保する）。 */}
          {!single && !isDesktop && (
            <div
              onPointerDown={dividerDown} onPointerMove={dividerMove} onPointerUp={dividerUp} onPointerCancel={dividerUp}
              style={{
                order: 1, flex: "0 0 14px", display: "flex", alignItems: "center", justifyContent: "center",
                margin: splitDir === "vert" ? "4px 0" : "0 4px", borderRadius: 8, background: "rgba(255,255,255,.1)",
                cursor: splitDir === "vert" ? "row-resize" : "col-resize", touchAction: "none",
              }}>
              <span style={{ background: "rgba(255,255,255,.55)", borderRadius: 99, width: splitDir === "vert" ? 34 : 4, height: splitDir === "vert" ? 4 : 34 }} />
            </div>
          )}

          {/* プリントペイン（手書きを重ねる） */}
          <div ref={pdfPaneRef} style={{ position: "relative", background: "#fff", borderRadius: 12, overflow: "hidden", minHeight: 0, minWidth: 0, flexBasis: 0, border: "1px solid rgba(255,255,255,.12)", ...pdfStyle }}>
            <span style={paneTag}>📄 ワークシート（19ch）</span>
            <button data-sfx="none" onClick={() => window.open(L.pdf, "_blank", "noopener")} style={{ ...paneTag, left: "auto", right: 8, pointerEvents: "auto", cursor: "pointer", border: 0 }}>↗ 別タブ</button>
            <iframe title="ワークシート" src={viewerSrc(L.pdf)} style={{ width: "100%", height: "100%", border: 0, display: "block", background: "#fff" }} />
            <canvas
              ref={boardRef}
              onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", zIndex: 5,
                touchAction: drawMode ? "none" : "auto", pointerEvents: drawMode ? "auto" : "none", cursor: drawMode ? "crosshair" : "default" }}
            />
          </div>
        </div>

        <div style={{ fontSize: 11, color: "rgba(255,255,255,.55)", margin: "8px 2px 0", lineHeight: 1.6 }}>
          {drawMode ? "✏️ 書くモード：プリントの上に手書きできます（スクロール・動画操作は「👆操作」へ）"
            : "👆 操作モード：動画の再生・プリントのスクロールができます（書くときは「✏️書く」へ）"}
        </div>

        {/* ── 練習問題ボタン（下に固定。合格でバッジ） ── */}
        {onPractice && hasPractice && (
          <button className="haichi-practice-command"
            data-sfx="none"
            onClick={() => onPractice(L)}
            style={{
              width: "100%", margin: "14px 0 2px", padding: "14px 16px", borderRadius: 14, cursor: "pointer",
              border: "2px solid rgba(255,255,255,.22)", color: "#fff", textAlign: "left",
              background: passed ? "linear-gradient(135deg,#f59e0b,#fbbf24)" : "linear-gradient(135deg,#22c55e,#10b981)",
              display: "flex", alignItems: "center", gap: 12, boxShadow: "0 5px 16px rgba(16,185,129,.32)",
            }}>
            <span style={{ fontSize: 32, lineHeight: 1 }}>{passed ? "🏅" : "📝"}</span>
            <span>
              <span style={{ fontSize: 16, fontWeight: 900, display: "block" }}>{passed ? "確認クリア済み！もう一度ためす" : "確認問題！これが解けたらOK（5問）"}</span>
              <span style={{ fontSize: 11.5, fontWeight: 700, opacity: .92 }}>{passed ? "復習にもう一回チャレンジしてもOK" : "5問解けたらクリア！動画で学んだ内容の確認だよ"}</span>
            </span>
          </button>
        )}

        <div style={{ fontSize: 10.5, color: "rgba(255,255,255,.4)", textAlign: "center", marginTop: 12, lineHeight: 1.6 }}>
          ※ 動画は <b>YouTube公式埋め込み</b>、プリントは <b>19ch のPDFを読み込み表示</b>。著作権は葉一「とある男が授業をしてみた」／出典 19ch.tv に帰属。
        </div>
      </div>
    </div>
  );
}

const toolBtn = { padding: "7px 10px", borderRadius: 9, border: "1px solid rgba(255,255,255,.14)", cursor: "pointer", fontFamily: "inherit", fontSize: 11.5, fontWeight: 800, color: "#fff", background: "rgba(255,255,255,.08)", lineHeight: 1 };
const grp = { display: "flex", alignItems: "center", gap: 4, padding: 3, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 12 };
const lbl = { fontSize: 10, color: "rgba(255,255,255,.55)", padding: "0 4px", fontWeight: 800 };
const paneTag = { position: "absolute", top: 8, left: 8, zIndex: 3, fontSize: 10, fontWeight: 800, color: "#fff", background: "rgba(0,0,0,.55)", padding: "3px 8px", borderRadius: 999 };
