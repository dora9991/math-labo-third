// ============================================================
// Character.jsx — 自分のキャラを設定する画面
//  ・キャラクター（立ち絵）から選ぶ
//  ・手書きで描く（書いた絵をキャラにできる／消しゴムつき）
//  ・画像を読み込む（お気に入りのイラストを縮小して取り込む）
//  ・名前もつけられる
// ============================================================
import { useRef, useEffect, useState } from "react";
import Header from "../components/Header.jsx";
import Avatar from "../components/Avatar.jsx";
import { HERO_AVATARS, HERO_PRICE, STARTER_HERO_ID } from "../data/heroes.js";
import HeroImg from "../components/HeroImg.jsx";

const OUT_SIZE = 240; // 保存する画像の一辺（px）。小さくしてlocalStorageを軽く保つ

// 画像(dataURL)を正方形に切り出して縮小し、JPEGのdataURLにして返す
function squashImage(src, cb) {
  const img = new Image();
  img.onload = () => {
    const c = document.createElement("canvas");
    c.width = OUT_SIZE; c.height = OUT_SIZE;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, OUT_SIZE, OUT_SIZE);
    // cover（短辺に合わせて中央切り出し）
    const s = Math.min(img.width, img.height);
    const sx = (img.width - s) / 2, sy = (img.height - s) / 2;
    ctx.drawImage(img, sx, sy, s, s, 0, 0, OUT_SIZE, OUT_SIZE);
    cb(c.toDataURL("image/jpeg", 0.82));
  };
  img.src = src;
}

const PEN_COLORS = ["#1e1b4b", "#ef4444", "#f59e0b", "#22c55e", "#3b82f6", "#a855f7", "#ec4899", "#000000"];

// ペンの太さ（線幅px）。極細・細・太から選べる。
const PEN_SIZES = [
  { id: "xfine", label: "極細", w: 2 },
  { id: "fine", label: "細", w: 5 },
  { id: "thick", label: "太", w: 11 },
];

export default function Character({ player, onSetAvatar, onSetName, onBuyHero, onBack }) {
  const coins = player.coins ?? 0;
  const ownedHeroes = player.ownedHeroes || [STARTER_HERO_ID];
  const [tab, setTab] = useState("hero"); // hero | draw | upload
  const [nameInput, setNameInput] = useState(player.name || "");
  const [color, setColor] = useState(PEN_COLORS[0]);
  const [penW, setPenW] = useState(PEN_SIZES[1].w); // ペンの太さ（既定＝細）
  const [erasing, setErasing] = useState(false); // 消しゴムモード（白で上書き）
  const [preview, setPreview] = useState(null); // 取り込み中のプレビュー（dataURL）

  // ── 手書きキャンバス ──
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const drawing = useRef(false);
  const last = useRef({ x: 0, y: 0 });
  const colorRef = useRef(color);
  useEffect(() => { colorRef.current = color; }, [color]);
  const penWRef = useRef(penW);
  useEffect(() => { penWRef.current = penW; }, [penW]);
  const erasingRef = useRef(erasing);
  useEffect(() => { erasingRef.current = erasing; }, [erasing]);

  // 手書きタブを開いたらキャンバスを初期化（白背景）
  useEffect(() => {
    if (tab !== "draw") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, Math.round(rect.width * ratio));
    canvas.height = Math.max(1, Math.round(rect.height * ratio));
    const ctx = canvas.getContext("2d");
    ctx.scale(ratio, ratio);
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, rect.width, rect.height);
    ctx.lineWidth = 5; ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctxRef.current = ctx;
  }, [tab]);

  function posOf(e) {
    const rect = canvasRef.current.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }
  function down(e) {
    e.preventDefault();
    canvasRef.current.setPointerCapture?.(e.pointerId);
    drawing.current = true;
    last.current = posOf(e);
    const ctx = ctxRef.current;
    const er = erasingRef.current;
    ctx.fillStyle = er ? "#fff" : colorRef.current;
    ctx.beginPath(); ctx.arc(last.current.x, last.current.y, er ? 12 : penWRef.current / 2, 0, Math.PI * 2); ctx.fill();
  }
  function move(e) {
    if (!drawing.current) return;
    e.preventDefault();
    const p = posOf(e);
    const ctx = ctxRef.current;
    const er = erasingRef.current;
    ctx.strokeStyle = er ? "#fff" : colorRef.current;
    ctx.lineWidth = er ? 24 : penWRef.current; // 消しゴムは太く／ペンは選んだ太さ
    ctx.beginPath(); ctx.moveTo(last.current.x, last.current.y); ctx.lineTo(p.x, p.y); ctx.stroke();
    last.current = p;
  }
  function up() { drawing.current = false; }
  function clearCanvas() {
    const canvas = canvasRef.current, ctx = ctxRef.current;
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, rect.width, rect.height);
  }
  function useDrawing() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    squashImage(canvas.toDataURL("image/png"), (out) => onSetAvatar({ type: "image", src: out }));
  }

  // ── 画像読み込み ──
  function onFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => squashImage(reader.result, (out) => setPreview(out));
    reader.readAsDataURL(file);
    e.target.value = ""; // 同じファイルを再選択できるように
  }

  const tabBtn = (id, label) => (
    <button
      onClick={() => { setTab(id); setPreview(null); }}
      data-sfx="none"
      style={{
        flex: 1, padding: "9px", borderRadius: 10, border: "none", cursor: "pointer", fontFamily: "inherit",
        fontSize: 12, fontWeight: 900, color: "#fff",
        background: tab === id ? "#6366f1" : "rgba(255,255,255,.07)",
      }}
    >{label}</button>
  );

  return (
    <div className="app">
      <Header player={player} back="ホーム" onBack={onBack} />
      <div className="content">
        <div className="pg-ttl">🎨 キャラクター</div>
        <div className="pg-sub">お気に入りのキャラを選んだり、自分で描いたりできるよ</div>

        {/* 今のキャラ＆名前 */}
        <div className="glass" style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: 14 }}>
          <Avatar avatar={player.avatar} size={64} ring="rgba(255,255,255,.3)" />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,.45)", marginBottom: 4 }}>ニックネーム</div>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                value={nameInput} maxLength={10} placeholder="ニックネーム（10文字まで）"
                onChange={(e) => setNameInput(e.target.value)}
                style={{ flex: 1, minWidth: 0, width: 0, fontSize: 14, fontWeight: 800, padding: "8px 10px", borderRadius: 9, border: "1px solid rgba(255,255,255,.2)", background: "rgba(255,255,255,.06)", color: "#fff", fontFamily: "inherit" }}
              />
              <button onClick={() => onSetName(nameInput)} data-sfx="none"
                style={{ flexShrink: 0, fontSize: 12, fontWeight: 900, padding: "8px 14px", borderRadius: 9, border: "none", background: "#6366f1", color: "#fff", cursor: "pointer" }}>
                決定
              </button>
            </div>
          </div>
        </div>

        {/* タブ */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {tabBtn("hero", "🦸 キャラクター")}
          {tabBtn("draw", "✏️ 手書き")}
          {tabBtn("upload", "🖼️ 画像")}
        </div>

        {/* ヒーロー（立ち絵） */}
        {tab === "hero" && (
          <div className="glass" style={{ padding: "14px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <div className="slbl" style={{ margin: 0 }}>冒険者を選ぼう（ホームやバトルに登場）</div>
              <span style={{ fontSize: 11, fontWeight: 900, color: "#fbbf24" }}>💰 {coins}</span>
            </div>
            <div style={{ fontSize: 10.5, color: "rgba(255,255,255,.45)", marginBottom: 10, lineHeight: 1.5 }}>
              最初のキャラは無料。ほかは <b style={{ color: "#fbbf24" }}>💰{HERO_PRICE}</b> で購入すると使えるよ（タイムアタックでコインを稼ごう）。
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
              {HERO_AVATARS.map((h) => {
                const selected = player.avatar?.type === "hero" && player.avatar.id === h.id;
                const owned = ownedHeroes.includes(h.id);
                const canBuy = coins >= HERO_PRICE;
                return (
                  <button key={h.id} data-sfx="none"
                    onClick={() => { owned ? onSetAvatar({ type: "hero", id: h.id }) : onBuyHero?.(h.id); }}
                    style={{
                      cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                      padding: 6, borderRadius: 12, fontFamily: "inherit", position: "relative", overflow: "hidden",
                      background: selected ? "rgba(253,224,71,.12)" : "rgba(255,255,255,.04)",
                      border: `2px solid ${selected ? "#fde047" : owned ? "rgba(255,255,255,.1)" : "rgba(251,191,36,.28)"}`,
                    }}>
                    <div style={{ height: 96, width: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <HeroImg src={h.src} alt={h.name}
                        style={{ maxHeight: "100%", maxWidth: "100%", objectFit: "contain", filter: owned ? "none" : "grayscale(.75) brightness(.55)" }} />
                    </div>
                    {/* 未所持：ロック＋価格 */}
                    {!owned && (
                      <div style={{
                        position: "absolute", top: 6, right: 6, fontSize: 10, fontWeight: 900,
                        color: canBuy ? "#3a2a00" : "#fff", borderRadius: 999, padding: "2px 7px",
                        background: canBuy ? "linear-gradient(135deg,#f59e0b,#fbbf24)" : "rgba(0,0,0,.55)",
                        border: canBuy ? "none" : "1px solid rgba(255,255,255,.3)",
                      }}>💰{HERO_PRICE}</div>
                    )}
                    <span style={{ fontSize: 9.5, color: selected ? "#fde047" : owned ? "rgba(255,255,255,.6)" : "rgba(255,255,255,.4)", fontWeight: 800, textAlign: "center", lineHeight: 1.2 }}>
                      {owned ? (selected ? "✓ " : "") + h.name : "🔒 " + h.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 手書き */}
        {tab === "draw" && (
          <div className="glass" style={{ padding: "14px 16px" }}>
            <div className="slbl">自分のキャラを描こう</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8, alignItems: "center" }}>
              {PEN_COLORS.map((c) => (
                <button key={c} data-sfx="none" onClick={() => { setColor(c); setErasing(false); }}
                  style={{ width: 26, height: 26, borderRadius: "50%", background: c, cursor: "pointer", border: !erasing && color === c ? "3px solid #fff" : "2px solid rgba(255,255,255,.25)" }} />
              ))}
              <button data-sfx="none" onClick={() => setErasing((v) => !v)}
                style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 10px", borderRadius: 999, cursor: "pointer", fontFamily: "inherit", fontSize: 11.5, fontWeight: 900, color: "#fff", background: erasing ? "#6366f1" : "rgba(255,255,255,.08)", border: erasing ? "2px solid #fff" : "2px solid rgba(255,255,255,.25)" }}>
                🧽 消しゴム
              </button>
            </div>
            {/* ペンの太さ：極細・細・太 */}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10, alignItems: "center" }}>
              <span style={{ fontSize: 11.5, fontWeight: 800, color: "rgba(255,255,255,.55)", marginRight: 2 }}>太さ</span>
              {PEN_SIZES.map((s) => {
                const active = !erasing && penW === s.w;
                return (
                  <button key={s.id} data-sfx="none" onClick={() => { setPenW(s.w); setErasing(false); }}
                    style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 999, cursor: "pointer", fontFamily: "inherit", fontSize: 11.5, fontWeight: 900, color: "#fff", background: active ? "#6366f1" : "rgba(255,255,255,.08)", border: active ? "2px solid #fff" : "2px solid rgba(255,255,255,.25)" }}>
                    <span style={{ width: 16, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ width: 14, height: s.w, borderRadius: 999, background: active ? "#fff" : "rgba(255,255,255,.7)" }} />
                    </span>
                    {s.label}
                  </button>
                );
              })}
            </div>
            <canvas
              ref={canvasRef}
              onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerLeave={up}
              style={{ width: "100%", height: 280, display: "block", background: "#fff", borderRadius: 12, border: "2px solid rgba(255,255,255,.15)", touchAction: "none", cursor: "crosshair" }}
            />
            <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
              <button onClick={() => { clearCanvas(); setErasing(false); }} data-sfx="none"
                style={{ flex: 1, padding: "11px", borderRadius: 11, border: "1px solid rgba(255,255,255,.2)", background: "rgba(255,255,255,.06)", color: "#fff", fontWeight: 800, cursor: "pointer", fontSize: 13 }}>
                全部消す
              </button>
              <button onClick={useDrawing} data-sfx="none"
                style={{ flex: 2, padding: "11px", borderRadius: 11, border: "none", background: "#6366f1", color: "#fff", fontWeight: 900, cursor: "pointer", fontSize: 13 }}>
                この絵をキャラにする
              </button>
            </div>
          </div>
        )}

        {/* 画像読み込み */}
        {tab === "upload" && (
          <div className="glass" style={{ padding: "14px 16px" }}>
            <div className="slbl">画像を読み込む</div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
              {preview ? (
                <img src={preview} alt="プレビュー" style={{ width: 140, height: 140, borderRadius: "50%", objectFit: "cover", border: "2px solid rgba(255,255,255,.3)" }} />
              ) : (
                <div style={{ width: 140, height: 140, borderRadius: "50%", background: "rgba(255,255,255,.05)", border: "2px dashed rgba(255,255,255,.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "rgba(255,255,255,.4)", textAlign: "center", padding: 10 }}>
                  画像を選ぶと<br />ここに出ます
                </div>
              )}
              <label data-sfx="none"
                style={{ fontSize: 13, fontWeight: 900, padding: "10px 18px", borderRadius: 11, background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.2)", color: "#fff", cursor: "pointer" }}>
                🖼️ 画像を選ぶ
                <input type="file" accept="image/*" onChange={onFile} style={{ display: "none" }} />
              </label>
              {preview && (
                <button onClick={() => { onSetAvatar({ type: "image", src: preview }); setPreview(null); }} data-sfx="none"
                  style={{ width: "100%", padding: "11px", borderRadius: 11, border: "none", background: "#6366f1", color: "#fff", fontWeight: 900, cursor: "pointer", fontSize: 13 }}>
                  この画像をキャラにする
                </button>
              )}
            </div>
            <div style={{ fontSize: 10.5, color: "rgba(255,255,255,.4)", marginTop: 10, lineHeight: 1.5 }}>
              ※ 画像は自動で正方形に縮小して保存します（端末の中だけに保存・外部には送られません）。
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
