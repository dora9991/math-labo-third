// ============================================================
// ResultReview.jsx — 結果画面の共通「間違い＋復習導線」ブロック
//
//  単元テスト・タイムアタック・ステップアップ の結果画面で使い回す。
//   ・間違えた問題を「小単元」ごとにまとめて表示
//   ・小単元ごとに「✏️学び直す」「📺解説（葉一さんの動画＋プリント or 19ch）」へ誘導
//   ・特に苦手な単元（weakUnits）をチップで提示し、学び直しモードへ
//
//  どの結果画面（明るいカード／暗いカード）に置いても読めるよう、
//  自前の白カードとして自己完結したスタイルにしている。
//  各ハンドラは渡されたときだけボタンを出す（任意配線）。
// ============================================================
import MathText from "./MathText.jsx";
import { findUnitById, findChapterByUnitId } from "../data/index.js";
import { videoUrlFor } from "../data/videoLinks.js";
import { hasHaichiLessonForUnit } from "../data/haichiCourse.js";

const GRADE_LABEL = { 1: "中1", 2: "中2", 3: "中3" };

export default function ResultReview({
  wrongs = [],
  unit = null,            // 単一単元モード（タイムアタック等）の補完用
  weakUnits = [],
  onRelearn,              // (unit) => void
  onHaichi,               // (unit) => void
  onOpenRelearnList,      // () => void
}) {
  if (!wrongs.length && !weakUnits.length) return null;

  // 間違いを小単元ごとにまとめる（unitId 無しは補完 unit→無ければ「その他」）
  const groups = {};
  for (const w of wrongs) {
    const key = w.unitId || unit?.id || "_other";
    (groups[key] ||= []).push(w);
  }
  const keys = Object.keys(groups);

  return (
    <div style={card}>
      <div style={head}>📝 まちがい直し・復習</div>

      {/* 特に苦手な単元（あれば） */}
      {weakUnits.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <div style={sub}>🎯 特に苦手な単元</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {weakUnits.slice(0, 3).map((w) => (
              <button key={w.unitId} data-sfx="none"
                onClick={() => (onRelearn ? onRelearn(w.unit) : onOpenRelearnList && onOpenRelearnList())}
                style={chip} title="この単元を学び直す">
                {w.unit?.emoji || "📌"} {w.unit?.name || w.unitId}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 間違えた問題：小単元ごと */}
      {keys.map((key) => {
        const u = key === "_other" ? null : (findUnitById(key) || (unit && unit.id === key ? unit : null));
        const chap = key === "_other" ? null : findChapterByUnitId(key);
        const vurl = u ? videoUrlFor(key) : null;
        const list = groups[key];
        const color = chap?.color || "#6366f1";
        return (
          <div key={key} style={{ borderTop: "1px solid #eef0f8", paddingTop: 9, marginTop: 9 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <span style={{ fontSize: 14 }}>{u?.emoji || "📝"}</span>
              <span style={{ fontSize: 13, fontWeight: 900, color: "#1e1b4b" }}>{u ? u.name : "その他の問題"}</span>
              {chap && <span style={{ fontSize: 10, fontWeight: 800, color: "#94a3b8" }}>{GRADE_LABEL[chap.grade] || ""} ・ {chap.name}</span>}
              <span style={{ marginLeft: "auto", fontSize: 11, color: "#94a3b8" }}>{list.length}問</span>
            </div>

            {/* 復習アクション */}
            {u && (
              <div style={{ display: "flex", gap: 7, margin: "8px 0 2px" }}>
                {onRelearn && (
                  <button data-sfx="none" onClick={() => onRelearn(u)} style={btnPrimary}>
                    ✏️ この単元を学び直す
                  </button>
                )}
                {onHaichi && hasHaichiLessonForUnit(key) ? (
                  <button data-sfx="none" onClick={() => onHaichi(u)} style={btnHaichi} title="葉一さんの動画＋プリントに書き込み">
                    📺 動画＋プリント
                  </button>
                ) : vurl ? (
                  <button data-sfx="none" onClick={() => window.open(vurl, "_blank", "noopener")} style={btnHaichi} title="19chの解説ページ">
                    📺 解説
                  </button>
                ) : null}
              </div>
            )}

            {/* 間違えた問題（各単元 最大3問） */}
            {list.slice(0, 3).map((w, i) => (
              <div key={i} style={{ padding: "5px 0", borderTop: i ? "1px solid #f3f4fb" : "none" }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: "#334155", wordBreak: "break-word" }}><MathText>{w.q}</MathText></div>
                <div style={{ fontSize: 11, color: "#94a3b8" }}>
                  正解: <strong style={{ color: "#16a34a" }}><MathText>{String(w.ans)}</MathText></strong>
                </div>
              </div>
            ))}
            {list.length > 3 && <div style={{ fontSize: 10.5, color: "#94a3b8", marginTop: 2 }}>ほか {list.length - 3} 問</div>}
          </div>
        );
      })}

      {onOpenRelearnList && (
        <button data-sfx="none" onClick={onOpenRelearnList} style={btnList}>📖 学び直しモードでまとめて復習する</button>
      )}
    </div>
  );
}

const card = { background: "#fff", color: "#1e1b4b", border: "1px solid #e6e8f5", borderRadius: 12, padding: "12px 13px", margin: "10px 0", textAlign: "left", boxShadow: "0 2px 10px rgba(30,27,75,.06)" };
const head = { fontSize: 13, fontWeight: 900, color: "#4f46e5", marginBottom: 8 };
const sub = { fontSize: 11, fontWeight: 800, color: "#94a3b8", marginBottom: 5 };
const chip = { fontSize: 11, fontWeight: 800, color: "#92400e", background: "rgba(251,191,36,.2)", border: "1px solid rgba(251,191,36,.5)", borderRadius: 999, padding: "4px 10px", cursor: "pointer", fontFamily: "inherit" };
const btnPrimary = { flex: 1, padding: "9px 8px", borderRadius: 10, border: "none", cursor: "pointer", fontSize: 12.5, fontWeight: 900, color: "#fff", fontFamily: "inherit", background: "linear-gradient(135deg,#0ea5e9,#6366f1)" };
const btnHaichi = { flexShrink: 0, padding: "9px 12px", borderRadius: 10, cursor: "pointer", fontSize: 12, fontWeight: 800, color: "#dc2626", fontFamily: "inherit", border: "1px solid rgba(239,68,68,.4)", background: "rgba(239,68,68,.1)" };
const btnList = { width: "100%", marginTop: 11, padding: "10px", borderRadius: 10, border: "1px solid #c7d2fe", cursor: "pointer", fontSize: 12.5, fontWeight: 800, color: "#4f46e5", fontFamily: "inherit", background: "rgba(99,102,241,.08)" };
