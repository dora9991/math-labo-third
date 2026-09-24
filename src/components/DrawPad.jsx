// ============================================================
// DrawPad.jsx — 手書き計算スペース（はいちモードの「書く」と同じ道具）
//  - ペン5色／太さ4段階（極細・細・中・太）／消しゴム／全消し／ひとつ戻す
//  - 方眼（グリッド）の表示切替（描いた線には影響しない背景）
//  - 線は座標で覚えているので、画面の大きさが変わっても（PCの左右入れ替え・回転）書いた内容が消えずズレない
//  - ポインタ操作（マウス／タッチ／ペン）。高解像度でにじまない
// ============================================================
import { useRef, useEffect, useState } from "react";

const COLORS = [
  { id: "ink", value: "#111111", label: "黒" },
  { id: "red", value: "#ef4444", label: "赤" },
  { id: "blue", value: "#2563eb", label: "青" },
  { id: "green", value: "#16a34a", label: "緑" },
  { id: "orange", value: "#f59e0b", label: "橙" },
];
const SIZES = [
  { label: "極細", size: 1.2 },
  { label: "細", size: 2 },
  { label: "中", size: 4 },
  { label: "太", size: 8 },
];
const GRID_BG = "linear-gradient(rgba(37,99,235,.13) 1px, transparent 1px), linear-gradient(90deg, rgba(37,99,235,.13) 1px, transparent 1px)";

export default function DrawPad({ height = 220 }) {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const strokesRef = useRef([]);      // 描いた線 [{ color, size, erasing, w0, points:[{fx,fy}] }]
  const curRef = useRef(null);        // いま描いている線

  const [color, setColor] = useState(COLORS[0].value);
  const [size, setSize] = useState(SIZES[1].size);
  const [erasing, setErasing] = useState(false);
  const [grid, setGrid] = useState(false);
  const [count, setCount] = useState(0); // 「戻す」を押せるかの再描画用
  const tool = useRef({ color, size, erasing });
  useEffect(() => { tool.current = { color, size, erasing }; }, [color, size, erasing]);

  function drawStroke(ctx, cv, s, fromIdx = 0) {
    const X = (p) => p.fx * cv.width, Y = (p) => p.fy * cv.height;
    const lw = (s.erasing ? s.size * 3.5 : s.size) * (cv.width / (s.w0 || 1));
    ctx.save();
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.globalCompositeOperation = s.erasing ? "destination-out" : "source-over";
    ctx.strokeStyle = s.color; ctx.fillStyle = s.color; ctx.lineWidth = lw;
    const pts = s.points;
    if (pts.length === 1) {
      ctx.beginPath(); ctx.arc(X(pts[0]), Y(pts[0]), lw / 2, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.beginPath();
      const start = Math.max(0, fromIdx - 1);
      ctx.moveTo(X(pts[start]), Y(pts[start]));
      for (let i = start + 1; i < pts.length; i++) ctx.lineTo(X(pts[i]), Y(pts[i]));
      ctx.stroke();
    }
    ctx.restore();
  }

  function redraw() {
    const cv = canvasRef.current, ctx = ctxRef.current;
    if (!cv || !ctx) return;
    ctx.clearRect(0, 0, cv.width, cv.height);
    for (const s of strokesRef.current) if (s.points.length) drawStroke(ctx, cv, s);
  }

  function resize() {
    const cv = canvasRef.current;
    if (!cv) return;
    const r = cv.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return; // 非表示中は何もしない
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.round(r.width * dpr), h = Math.round(r.height * dpr);
    if (cv.width === w && cv.height === h && ctxRef.current) return;
    cv.width = w; cv.height = h;
    ctxRef.current = cv.getContext("2d");
    redraw();
  }

  useEffect(() => {
    resize();
    let ro;
    if (window.ResizeObserver && canvasRef.current) {
      ro = new ResizeObserver(() => requestAnimationFrame(resize));
      ro.observe(canvasRef.current);
    }
    window.addEventListener("resize", resize);
    return () => { ro && ro.disconnect(); window.removeEventListener("resize", resize); };
  }, []); // eslint-disable-line

  function posOf(e) {
    const r = canvasRef.current.getBoundingClientRect();
    return { fx: (e.clientX - r.left) / (r.width || 1), fy: (e.clientY - r.top) / (r.height || 1) };
  }

  function down(e) {
    e.preventDefault();
    if (!ctxRef.current) resize();
    canvasRef.current.setPointerCapture?.(e.pointerId);
    const t = tool.current;
    const s = { color: t.color, size: t.size, erasing: t.erasing, w0: canvasRef.current.width, points: [posOf(e)] };
    curRef.current = s;
    strokesRef.current.push(s);
    drawStroke(ctxRef.current, canvasRef.current, s);
  }
  function move(e) {
    const s = curRef.current;
    if (!s) return;
    e.preventDefault();
    s.points.push(posOf(e));
    drawStroke(ctxRef.current, canvasRef.current, s, s.points.length - 1);
  }
  function up() {
    if (curRef.current) { curRef.current = null; setCount(strokesRef.current.length); }
  }
  function undo() {
    strokesRef.current.pop();
    setCount(strokesRef.current.length);
    redraw();
  }
  function clearAll() {
    strokesRef.current = [];
    setCount(0);
    redraw();
  }

  const tBtn = (active) => ({
    padding: "6px 10px", borderRadius: 9, cursor: "pointer", fontFamily: "inherit", fontSize: 11.5, fontWeight: 800, color: "#fff", lineHeight: 1,
    border: active ? "2px solid #fff" : "1px solid rgba(255,255,255,.18)",
    background: active ? "#6366f1" : "rgba(255,255,255,.08)",
  });
  const grp = { display: "flex", alignItems: "center", gap: 4, padding: 3, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 12 };

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.55)", marginBottom: 6 }}>✏️ 計算スペース（手書きでメモ）</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", marginBottom: 8 }}>
        <div style={grp}>
          {COLORS.map((c) => {
            const active = !erasing && color === c.value;
            return (
              <button key={c.id} data-sfx="none" aria-label={`${c.label}ペン`} title={`${c.label}ペン`}
                onClick={() => { setColor(c.value); setErasing(false); }}
                style={{ width: 24, height: 24, borderRadius: "50%", cursor: "pointer", background: c.value, padding: 0,
                  border: active ? "3px solid #fff" : "2px solid rgba(255,255,255,.3)", boxShadow: active ? "0 0 0 2px rgba(255,255,255,.3)" : "none" }} />
            );
          })}
        </div>
        <div style={grp}>
          {SIZES.map((s) => (
            <button key={s.label} data-sfx="none" style={tBtn(size === s.size && !erasing)}
              onClick={() => { setSize(s.size); setErasing(false); }}>{s.label}</button>
          ))}
        </div>
        <div style={grp}>
          <button data-sfx="none" style={tBtn(erasing)} onClick={() => setErasing((v) => !v)}>🧽 消しゴム</button>
          <button data-sfx="none" style={{ ...tBtn(false), opacity: count ? 1 : .45 }} disabled={!count} onClick={undo}>↩ ひとつ戻す</button>
          <button data-sfx="none" style={tBtn(false)} onClick={clearAll}>全消し</button>
        </div>
        <div style={grp}>
          <button data-sfx="none" style={tBtn(grid)} onClick={() => setGrid((v) => !v)}>▦ 方眼</button>
        </div>
      </div>
      <canvas
        ref={canvasRef}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        onPointerLeave={up}
        style={{
          width: "100%", height, display: "block", borderRadius: 12,
          background: grid ? `${GRID_BG}, rgba(255,255,255,.97)` : "rgba(255,255,255,.97)",
          backgroundSize: grid ? "24px 24px, 24px 24px, auto" : "auto",
          border: "2px solid rgba(255,255,255,.15)", touchAction: "none",
          cursor: erasing ? "cell" : "crosshair",
        }}
      />
    </div>
  );
}
