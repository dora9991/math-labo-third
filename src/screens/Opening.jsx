// ============================================================
// Opening.jsx — オープニング映像。
//  ・「ゲームスタート」を押した直後に全画面で再生する。
//  ・画面のどこかをタップ（クリック）すると飛ばせる。
//  ・映像が終わる／飛ばすと、ブラックアウトして約1秒後に onDone()（→ タイトルへ）。
//  映像ファイルは public/opening.mp4（URLは BASE_URL + "opening.mp4"）。
// ============================================================
import { useEffect, useRef, useState } from "react";

const SRC = import.meta.env.BASE_URL + "opening.mp4";

export default function Opening({ onDone }) {
  const videoRef = useRef(null);
  const doneRef = useRef(false);   // 終了処理の二重起動を防ぐ
  const [fading, setFading] = useState(false); // ブラックアウト中か

  // 終了（映像の終わり or タップでスキップ）→ ブラックアウト→1秒後にタイトルへ
  function finish() {
    if (doneRef.current) return;
    doneRef.current = true;
    try { videoRef.current?.pause?.(); } catch {}
    setFading(true);                       // 黒画面へフェード
    setTimeout(() => onDone?.(), 1000);    // 1秒後に次の画面へ
  }

  // マウント直後に再生開始。直前のユーザー操作（スタート押下）があるので音つきで鳴ることが多い。
  // 万一ブラウザに自動再生を弾かれたら、ミュートで再生し直して映像だけは流す。
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const p = v.play?.();
    if (p && p.catch) p.catch(() => { v.muted = true; v.play?.().catch(() => {}); });
  }, []);

  return (
    <div
      onClick={finish}
      style={{
        // ビューポート単位で直接サイズ指定（祖先の transform 影響で position:fixed が
        // ビューポート基準にならず高さが潰れるのを防ぐ）。
        position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh",
        background: "#000", zIndex: 9999, cursor: "pointer", overflow: "hidden",
      }}
    >
      {/* 画面いっぱいに動画を表示（絶対配置で確実に高さを確保する）。
          objectFit: contain で映像全体が切れずに中央表示される。 */}
      <video
        ref={videoRef}
        src={SRC}
        autoPlay
        playsInline
        onEnded={finish}
        style={{
          position: "absolute", inset: 0, width: "100%", height: "100%",
          objectFit: "contain", background: "#000",
        }}
      />

      {/* タップでスキップの案内（ブラックアウト中は隠す） */}
      {!fading && (
        <div style={{
          position: "absolute", bottom: 24, right: 24,
          color: "rgba(255,255,255,.75)", fontSize: 13, fontWeight: 700,
          background: "rgba(0,0,0,.4)", padding: "6px 14px", borderRadius: 999,
          pointerEvents: "none", backdropFilter: "blur(2px)",
        }}>
          タップでスキップ ▶▶
        </div>
      )}

      {/* ブラックアウト用のオーバーレイ */}
      <div style={{
        position: "absolute", inset: 0, background: "#000", pointerEvents: "none",
        opacity: fading ? 1 : 0, transition: "opacity .35s ease",
      }} />
    </div>
  );
}
