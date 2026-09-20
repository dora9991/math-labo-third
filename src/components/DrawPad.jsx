// ============================================================
// DrawPad.jsx — 手書き計算スペース
// 指やマウスで自由に書ける計算用キャンバス。ステップアップ等で使用。
//  - ポインタ操作（マウス／タッチ／ペン）で線を描く
//  - ペンの色を選べる（黒・赤・青・緑・オレンジ）
//  - 消しゴム（なぞった部分だけ消す）／「全消去」ボタン
//  - devicePixelRatio に合わせて高解像度で描画（線がにじまない）
// 表示中にマウントされる前提（非表示で mount すると寸法が 0 になるため）。
// ============================================================
import { useRef, useEffect, useState } from "react";

// 選べるペンの色（先頭が既定）
const COLORS = [
  { id: "ink", value: "#1e1b4b", label: "黒" },
  { id: "red", value: "#dc2626", label: "赤" },
  { id: "blue", value: "#2563eb", label: "青" },
  { id: "green", value: "#16a34a", label: "緑" },
  { id: "orange", value: "#f59e0b", label: "橙" },
];
const PEN_WIDTH = 2.6;   // ペンの太さ
const ERASER_WIDTH = 22; // 消しゴムの太さ（広めに消せる）

export default function DrawPad({ height = 220 }) {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const drawing = useRef(false);
  const last = useRef({ x: 0, y: 0 });

  const [color, setColor] = useState(COLORS[0].value); // 現在のペン色
  const [erasing, setErasing] = useState(false);       // 消しゴムモードか
  // 描画ごとに最新の color/erasing を参照するための ref（クロージャ対策）
  const tool = useRef({ color: COLORS[0].value, erasing: false });
  useEffect(() => { tool.current = { color, erasing }; }, [color, erasing]);

  // 初期化：表示サイズに合わせて解像度を決め、ペンの見た目を整える
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, Math.round(rect.width * ratio));
    canvas.height = Math.max(1, Math.round(rect.height * ratio));
    const ctx = canvas.getContext("2d");
    ctx.scale(ratio, ratio);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctxRef.current = ctx;
  }, []);

  // 描く直前に、今のツール（ペン色 or 消しゴム）をコンテキストへ反映する
  function applyTool() {
    const ctx = ctxRef.current;
    if (tool.current.erasing) {
      ctx.globalCompositeOperation = "destination-out"; // なぞった部分を透明に
      ctx.lineWidth = ERASER_WIDTH;
      ctx.strokeStyle = "rgba(0,0,0,1)";
      ctx.fillStyle = "rgba(0,0,0,1)";
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.lineWidth = PEN_WIDTH;
      ctx.strokeStyle = tool.current.color;
      ctx.fillStyle = tool.current.color;
    }
  }

  function pos(e) {
    const rect = canvasRef.current.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function down(e) {
    e.preventDefault();
    canvasRef.current.setPointerCapture?.(e.pointerId);
    drawing.current = true;
    last.current = pos(e);
    applyTool();
    // 点だけ打っても見える（消しゴムなら点状に消える）ように小さな円を描く
    const ctx = ctxRef.current;
    ctx.beginPath();
    ctx.arc(last.current.x, last.current.y, (tool.current.erasing ? ERASER_WIDTH : PEN_WIDTH) / 2, 0, Math.PI * 2);
    ctx.fill();
  }

  function move(e) {
    if (!drawing.current) return;
    e.preventDefault();
    const p = pos(e);
    const ctx = ctxRef.current;
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
  }

  function up() {
    drawing.current = false;
  }

  function clear() {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    const prev = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = "source-over";
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = prev;
  }

  const swatch = 22; // 色ボタンの直径

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6, gap: 8, flexWrap: "wrap" }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.55)" }}>
          ✏️ 計算スペース（手書きでメモ）
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {/* 色パレット */}
          {COLORS.map((c) => {
            const active = !erasing && color === c.value;
            return (
              <button
                key={c.id}
                onClick={() => { setColor(c.value); setErasing(false); }}
                data-sfx="none"
                aria-label={`${c.label}ペン`}
                title={`${c.label}ペン`}
                style={{
                  width: swatch, height: swatch, borderRadius: "50%", cursor: "pointer",
                  background: c.value, padding: 0,
                  border: active ? "3px solid #fff" : "2px solid rgba(255,255,255,.35)",
                  boxShadow: active ? "0 0 0 2px rgba(255,255,255,.35)" : "none",
                }}
              />
            );
          })}
          {/* 消しゴム */}
          <button
            onClick={() => setErasing((v) => !v)}
            data-sfx="none"
            title="消しゴム"
            style={{
              fontSize: 13, fontWeight: 800, color: "#fff", cursor: "pointer",
              padding: "4px 10px", borderRadius: 9,
              border: erasing ? "2px solid #fff" : "1px solid rgba(255,255,255,.2)",
              background: erasing ? "rgba(255,255,255,.22)" : "rgba(255,255,255,.08)",
            }}
          >
            🧽 消しゴム
          </button>
          {/* 全消去 */}
          <button
            onClick={clear}
            data-sfx="none"
            title="全部消す"
            style={{
              fontSize: 11, fontWeight: 800, color: "#fff", cursor: "pointer",
              padding: "5px 12px", borderRadius: 9, border: "1px solid rgba(255,255,255,.2)",
              background: "rgba(255,255,255,.08)",
            }}
          >
            全消去
          </button>
        </div>
      </div>
      <canvas
        ref={canvasRef}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerLeave={up}
        style={{
          width: "100%", height, display: "block",
          background: "rgba(255,255,255,.97)", borderRadius: 12,
          border: "2px solid rgba(255,255,255,.15)", touchAction: "none",
          cursor: erasing ? "cell" : "crosshair",
        }}
      />
    </div>
  );
}
