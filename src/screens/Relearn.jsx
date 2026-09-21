// ============================================================
// Relearn.jsx — 学び直しモード（間違いノート＋学び直しの一本化）
//
//  押すと「自分が間違えた問題の一覧」が単元ごとに出る。
//  各単元で：
//    ✏️ 学び直し … その単元を時間制限なしで練習（1問15XP＝1.5倍・学習のコア。クリスタルは出ない）
//    📺 解説     … 葉一さん（19ch）の解説動画ページへ
//  各問題で：✓ できた … その問題をノートから消す
//
//  ※ タイムアタック・バトル・単元テストなど、全モードの誤答が貯まる。
// ============================================================
import Header from "../components/Header.jsx";
import MathText from "../components/MathText.jsx";
import { findUnitById, findChapterByUnitId } from "../data/index.js";
import { videoUrlFor } from "../data/videoLinks.js";
import { hasHaichiLessonForUnit } from "../data/haichiCourse.js";
import { MISC as TOKETA_MISC } from "../data/toketa/index.js";

const GRADE_LABEL = { 1: "中1", 2: "中2", 3: "中3" };

// その単元の学び直しの段階を、間違いの pendingAt から判定（App.jsx の relearnPhase と同じ規則）。
//  fresh=まだ / pendingToday=今日〈仮なおし〉・確認は明日 / confirm=翌日以降・あと1問でカンペキ
function phaseOf(list, today) {
  const pend = list.find((m) => m.pendingAt);
  if (!pend) return "fresh";
  return pend.pendingAt === today ? "pendingToday" : "confirm";
}

export default function Relearn({ player, mistakes = [], onRelearn, onHaichi, onBack, focusUnitId = null, onSeeAll = null }) {
  const today = new Date().toLocaleDateString("ja-JP");
  // 間違いを単元ごとにまとめる（単元が分からないものは「その他」へ）
  const groups = {};
  for (const m of mistakes) {
    const key = m.unitId || "_other";
    (groups[key] ||= []).push(m);
  }
  // サイクルの「なおす」から来たときは、その小単元だけにしぼる。
  const focusUnit = focusUnitId ? findUnitById(focusUnitId) : null;
  const keys = focusUnitId ? Object.keys(groups).filter((k) => k === focusUnitId) : Object.keys(groups);
  const focusEmpty = focusUnitId && keys.length === 0;

  return (
    <div className="app legacy-relearn">
      <Header player={player} back="ホーム" onBack={onBack} />
      <div className="content">
        <div className="pg-ttl">{focusUnitId ? `📖 学び直し・${focusUnit ? focusUnit.name : "この単元"}` : "🩹 弱点克服モード"}</div>
        <div className="pg-sub">まちがいは<b style={{ color: "#fde047" }}>たからもの</b>。<b style={{ color: "#7dd3fc" }}>2回れんぞく正解</b>でなおせて、<b style={{ color: "#86efac" }}>つぎの日にもう1問</b>とけたらカンペキ（ノートから消える）。1問 +15XP。</div>
        {/* よくあるまちがいパターン（誤答タグの累計＝価値づけの分析結果）。全体一覧のときだけ表示 */}
        {!focusUnitId && (() => {
          const stats = player?.mistakeTagStats || {};
          const top = Object.entries(stats).filter(([, s]) => s.count > 0).sort((a, b) => b[1].count - a[1].count).slice(0, 3);
          if (!top.length) return null;
          return (
            <div className="glass" style={{ padding: "10px 12px", marginBottom: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 900, color: "#fbbf24", marginBottom: 6 }}>📊 よくあるまちがいパターン</div>
              {top.map(([tag, s]) => (
                <div key={tag} style={{ fontSize: 12.5, color: "rgba(255,255,255,.8)", padding: "2px 0" }}>
                  {TOKETA_MISC[tag]?.label || tag} × {s.count}回
                </div>
              ))}
            </div>
          );
        })()}

        {/* この単元だけ表示中：全部の弱点一覧へ */}
        {focusUnitId && onSeeAll && (
          <button data-sfx="none" onClick={onSeeAll} style={{ margin: "0 0 10px", padding: "9px 12px", borderRadius: 10, cursor: "pointer",
            fontSize: 12.5, fontWeight: 800, color: "#c4b5fd", border: "1px solid rgba(167,139,250,.4)", background: "rgba(167,139,250,.10)" }}>
            🩹 弱点克服モード（ぜんぶの学び直しを見る）→
          </button>
        )}

        {(focusEmpty || mistakes.length === 0) ? (
          <div className="glass">
            <div className="empty">
              <div className="empty-icon">🎉</div>
              <p>いまは学び直す問題がありません！<br />タイムアタックやバトルでつまずくと、ここに集まります。</p>
            </div>
          </div>
        ) : (
          keys.map((key) => {
            const unit = key === "_other" ? null : findUnitById(key);
            const chap = key === "_other" ? null : findChapterByUnitId(key);
            const vurl = unit ? videoUrlFor(key) : null;
            const color = chap?.color || "#94a3b8";
            const list = groups[key];
            const phase = phaseOf(list, today);
            // 段階ごとのボタン見た目・文言（fresh=なおす / confirm=あと1問 / pendingToday=あした確認）
            const btn = {
              fresh:   { bg: "linear-gradient(135deg,#0ea5e9,#6366f1)", main: "✏️ この単元を学び直す", sub: "2回れんぞく正解でなおせる" },
              confirm: { bg: "linear-gradient(135deg,#22c55e,#10b981)", main: "🔄 あと1問でカンペキ！", sub: "きのうなおした所を確認しよう" },
            }[phase];
            return (
              <div key={key} className="glass" style={{ padding: "12px 13px", marginBottom: 12, borderLeft: `4px solid ${color}` }}>
                {/* 単元ヘッダー */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 15 }}>{unit?.emoji || "📝"}</span>
                  <span style={{ fontSize: 14, fontWeight: 900, color }}>
                    {unit ? unit.name : "その他の問題"}
                  </span>
                  {chap && (
                    <span style={{ fontSize: 10, fontWeight: 800, color: "rgba(255,255,255,.5)" }}>
                      {GRADE_LABEL[chap.grade] || ""} ・ {chap.name}
                    </span>
                  )}
                  {phase === "pendingToday" && (
                    <span style={{ fontSize: 10, fontWeight: 900, color: "#fde047", background: "rgba(56,189,248,.15)", border: "1px solid rgba(56,189,248,.5)", borderRadius: 999, padding: "2px 8px" }}>⏳ あした確認</span>
                  )}
                  <span style={{ marginLeft: "auto", fontSize: 11, color: "rgba(255,255,255,.5)" }}>{list.length}問</span>
                </div>

                {/* アクション：学び直し ＋ 解説動画 */}
                <div style={{ display: "flex", gap: 7, margin: "9px 0 4px" }}>
                  {unit && onRelearn && phase !== "pendingToday" && (
                    <button data-sfx="none" onClick={() => onRelearn(unit)}
                      style={{ flex: 1, padding: "9px 8px", borderRadius: 10, border: "none", cursor: "pointer",
                        fontSize: 13, fontWeight: 900, color: "#fff", background: btn.bg, lineHeight: 1.3 }}>
                      {btn.main}<br /><span style={{ fontSize: 10, fontWeight: 700, opacity: .85 }}>{btn.sub}</span>
                    </button>
                  )}
                  {unit && phase === "pendingToday" && (
                    <div style={{ flex: 1, padding: "9px 8px", borderRadius: 10, textAlign: "center",
                      fontSize: 12.5, fontWeight: 800, color: "#7dd3fc", background: "rgba(56,189,248,.1)", border: "1px dashed rgba(56,189,248,.45)", lineHeight: 1.35 }}>
                      ✅ 今日はなおせた！<br /><span style={{ fontSize: 10, fontWeight: 700, opacity: .85 }}>あした もう1問でカンペキ</span>
                    </div>
                  )}
                  {unit && onHaichi && hasHaichiLessonForUnit(key) ? (
                    <button data-sfx="none" onClick={() => onHaichi(unit)} title="葉一さんの動画＋プリントに書き込み"
                      style={{ flexShrink: 0, padding: "10px 12px", borderRadius: 10, cursor: "pointer",
                        fontSize: 12.5, fontWeight: 800, color: "#fca5a5",
                        border: "1px solid rgba(239,68,68,.4)", background: "rgba(239,68,68,.12)" }}>
                      📺 動画＋プリント
                    </button>
                  ) : vurl ? (
                    <button data-sfx="none" onClick={() => window.open(vurl, "_blank", "noopener")} title="19chの解説動画"
                      style={{ flexShrink: 0, padding: "10px 14px", borderRadius: 10, cursor: "pointer",
                        fontSize: 13, fontWeight: 800, color: "#fca5a5",
                        border: "1px solid rgba(239,68,68,.4)", background: "rgba(239,68,68,.12)" }}>
                      📺 解説
                    </button>
                  ) : null}
                </div>

                {/* 間違えた問題たち */}
                {list.map((m) => (
                  <div key={m.id} style={{ padding: "7px 0", borderTop: "1px solid rgba(255,255,255,.08)" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", wordBreak: "break-word" }}><MathText>{m.q}</MathText></div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,.55)" }}>正解: <strong style={{ color: "#4ade80" }}><MathText>{m.ans}</MathText></strong></div>
                    {m.mistakeTag && TOKETA_MISC[m.mistakeTag] && (
                      <div style={{ fontSize: 11, color: "#fbbf24", marginTop: 2 }}>🏷️ {TOKETA_MISC[m.mistakeTag].label}</div>
                    )}
                  </div>
                ))}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
