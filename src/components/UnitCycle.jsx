// ============================================================
// UnitCycle.jsx — 単元ごとの学習サイクル（§5の単元別サイクル）
//  「学習サイクル」バーを押すと開く。章をえらぶ → 小単元ごとに
//   [📺講義][✏️ためす][📖なおす][🧮応用] の行が出る。
//   ・ためす を押すと「れんしゅう / バトル」を選べる（その小単元で）。
//   ・講義/れんしゅう はその小単元を直接ひらく。なおす/応用は共通へ。
//   ・2026-07-19：講義未クリアでも4ボタンは最初から全部表示（心理的ハードルを下げる狙い）。
//    唯一「⚔️小単元ボス」だけは従来どおり ためす15問クリア(tameC)で解放。
// ============================================================
import { useState } from "react";
import { chaptersForGrade } from "../data/index.js";
import { findHaichiLessonForUnit } from "../data/haichiCourse.js";
import { CYCLE_PRACTICE_TARGET, CYCLE_RELEARN_TARGET } from "../engine/scoring.js";
import { isChapterMastered } from "../engine/unlock.js";

// 講義（確認問題）をクリアしたか：その単元に対応する葉一レッスンの key を引いて
//  haichiPassed（確認問題に合格した動画）に入っているかで判定する。
//  ※対応する動画が無い単元（例：四則混合の複合・確率）は、教師モード＋確認問題での
//   合格(noVideoLecturePassed)を見る。これが無いと、その単元は永久に「講義」から
//   先へ進めなくなる（動画が無い＝合格しようがない、を防ぐ）。
function lectureCleared(unitId, haichiPassed, noVideoLecturePassed) {
  const found = findHaichiLessonForUnit(unitId);
  if (!found) return !!noVideoLecturePassed?.[unitId];
  return !!haichiPassed[`g${found.grade}m${found.lesson.n}`];
}

const CALC_KING_CLEAR_STREAK = 5; // 計算王＝5問連続正解でその章クリア（engine/battle.js と一致）

export default function UnitCycle({ player, grade = 1, cycleMap = {}, haichiPassed = {}, noVideoLecturePassed = {}, calcKing = {}, mistakeUnitIds = [], onHaichi, onTeacher, onPractice, onBattle, onRelearn, onChallenge, onDiagnose, onBossChallenge, onUnitBoss }) {
  const chapters = chaptersForGrade(grade);
  const [ci, setCi] = useState(0);
  const [tame, setTame] = useState(null); // ためす選択中の unitId
  const ch = chapters[Math.min(ci, Math.max(0, chapters.length - 1))];
  if (!ch) return null;
  const units = ch.units || [];

  // cleared=true の時：黄色線で囲み、ボタン下に「✓クリア！」を出す（どこまで進んだか一目で）。
  //  sub を渡すと、ラベルの下に小さな説明文を出す（れんしゅう/バトルの誘い文句など）。
  const stepBtn = (onClick, label, bg, cleared = false, sub = null) => (
    <button data-sfx="none" onClick={onClick} style={{
      flex: 1, minWidth: 0, padding: "8px 4px", borderRadius: 9, cursor: "pointer", fontSize: 11, fontWeight: 800,
      color: "#fff", lineHeight: 1.2, background: bg,
      border: cleared ? "2px solid #fde047" : "1px solid rgba(255,255,255,.18)",
      boxShadow: cleared ? "0 0 0 2px rgba(253,224,71,.35)" : undefined,
    }}>
      <span style={{ display: "block" }}>{label}</span>
      {sub && <span style={{ display: "block", fontSize: 8.5, fontWeight: 700, opacity: .9, marginTop: 3, lineHeight: 1.3 }}>{sub}</span>}
      {cleared && <span style={{ display: "block", fontSize: 9, fontWeight: 900, color: "#fde047", marginTop: 2 }}>✓クリア！</span>}
    </button>
  );

  return (
    <div className="menu-unit-cycle" style={{ margin: "0 0 14px", padding: "10px 10px 8px", borderRadius: 14, background: "rgba(99,102,241,.08)", border: "1px solid rgba(99,102,241,.28)" }}>
      <div style={{ fontSize: 11.5, fontWeight: 800, color: "#c7d2fe", marginBottom: 8 }}>単元をえらんで、小単元ごとに 講義→ためす→なおす→応用</div>

      {/* 章えらび */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
        {chapters.map((c, i) => (
          <button key={c.id} data-sfx="none" onClick={() => { setCi(i); setTame(null); }} style={{
            padding: "5px 9px", borderRadius: 9, cursor: "pointer", fontSize: 11, fontWeight: 800,
            border: i === ci ? `2px solid ${c.color}` : "1px solid rgba(255,255,255,.14)",
            background: i === ci ? `${c.color}33` : "rgba(255,255,255,.05)", color: i === ci ? "#fff" : "rgba(255,255,255,.6)",
          }}>{c.emoji} {c.name}</button>
        ))}
      </div>

      {/* どこから始める？診断（B-3）：迷ったら章を軽くチェック */}
      {onDiagnose && (
        <button data-sfx="none" onClick={() => onDiagnose(ch)} style={{
          width: "100%", marginBottom: 10, padding: "9px 10px", borderRadius: 10, cursor: "pointer",
          border: "1px solid rgba(56,189,248,.45)", background: "rgba(56,189,248,.10)", color: "#7dd3fc",
          fontSize: 12, fontWeight: 800, lineHeight: 1.4,
        }}>🩺 どこから始める？（{ch.name}を軽くチェック）</button>
      )}

      {/* 小単元ごとの行 */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {units.map((u) => {
          const cyc = cycleMap[u.id] || {};
          const practiceN = cyc.practiceN || 0;
          const relearnN = cyc.relearnN || 0;
          const hasMistakes = mistakeUnitIds.includes(u.id);
          const danger = hasMistakes; // 正答率が落ちた合図＝この単元に未修正の間違いがある（黄色で警告）
          const lectureC = lectureCleared(u.id, haichiPassed, noVideoLecturePassed);   // 講義＝確認問題に合格
          const hasVideo = !!findHaichiLessonForUnit(u.id);                            // 動画があるか（無ければ教師モードのみ）
          const tamePct = Math.min(practiceN / CYCLE_PRACTICE_TARGET, 1);              // ためす＝15問でいっぱい
          const tameC = practiceN >= CYCLE_PRACTICE_TARGET;
          // なおす＝「講義・ためすをクリアした上で」直し完了 or 間違いゼロ（先に進む前は未クリア扱い）
          const naosuDone = lectureC && tameC && (relearnN >= CYCLE_RELEARN_TARGET || !hasMistakes);
          const naosuByZero = naosuDone && !hasMistakes && relearnN === 0;             // 間違いゼロで自動クリア（ほめる）
          const ouyouC = (calcKing[u.id]?.bestStreak || 0) >= CALC_KING_CLEAR_STREAK; // 応用＝この小単元の計算王クリア
          const cleared = !!cyc.cleared;                                              // 講義+ためす+なおす＝サイクルクリア
          // 間隔反復：クリア済みで「1日後/1週間後」の復習窓が開いていれば、解き直しで石がもらえる
          const reviewDays = cleared && cyc.clearedAt ? (Date.now() - cyc.clearedAt) / 86400000 : 0;
          const reviewReady = cleared && cyc.clearedAt && ((reviewDays >= 1 && !cyc.r1) || (reviewDays >= 7 && !cyc.r7));
          // 理解度メータ：講義25% / ためす50% / なおす12.5% / 応用12.5%（色は下のボタンと対応）
          const segs = [
            { w: 25,   fill: lectureC ? 1 : 0,  color: "#ef4444" },
            { w: 50,   fill: tamePct,           color: danger ? "#fbbf24" : "#22c55e" },
            { w: 12.5, fill: naosuDone ? 1 : 0, color: "#6366f1" },
            { w: 12.5, fill: ouyouC ? 1 : 0,    color: "#a855f7" },
          ];
          const pct = Math.round((0.25 * (lectureC ? 1 : 0) + 0.5 * tamePct + 0.125 * (naosuDone ? 1 : 0) + 0.125 * (ouyouC ? 1 : 0)) * 100);
          return (
          <div key={u.id} style={{
            background: danger ? "rgba(251,191,36,.10)" : cleared ? "rgba(59,130,246,.12)" : "rgba(255,255,255,.04)",
            borderRadius: 11, padding: "8px 9px",
            border: danger ? "2px solid #fbbf24" : cleared ? "2px solid #3b82f6" : "1px solid rgba(255,255,255,.1)",
            boxShadow: danger ? "0 0 0 2px rgba(251,191,36,.18)" : cleared ? "0 0 0 2px rgba(59,130,246,.25)" : undefined,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
              <span style={{ fontSize: 12.5, fontWeight: 800, color: "#fff", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", flex: 1, minWidth: 0 }}>
                {u.emoji ? u.emoji + " " : ""}{u.name}
              </span>
              {cleared && !danger && <span style={{ flexShrink: 0, fontSize: 10, fontWeight: 900, color: "#fff", background: "#3b82f6", borderRadius: 999, padding: "2px 8px" }}>🎉 サイクルクリア</span>}
              {danger && <span style={{ flexShrink: 0, fontSize: 10, fontWeight: 900, color: "#3a2a00", background: "#fbbf24", borderRadius: 999, padding: "2px 8px" }}>⚠️ 危ないかも</span>}
            </div>

            {reviewReady && (
              <div style={{ fontSize: 10, fontWeight: 800, color: "#fbbf24", margin: "-2px 0 6px" }}>📅 復習チャンス！もう一度ためすと 剣石・鎧石ゲット</div>
            )}

            {/* 理解度メータ（講義→ためす→なおす→応用の重みづけ進捗） */}
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6 }}>
              <span style={{ fontSize: 9.5, fontWeight: 800, color: "rgba(255,255,255,.5)", flexShrink: 0 }}>理解度</span>
              <div style={{ flex: 1, display: "flex", gap: 3, height: 9 }}>
                {segs.map((s, i) => (
                  <div key={i} style={{ flexGrow: s.w, flexBasis: 0, background: "rgba(255,255,255,.09)", borderRadius: 999, overflow: "hidden" }}>
                    <div style={{ width: `${Math.round(s.fill * 100)}%`, height: "100%", background: s.color, transition: "width .4s ease" }} />
                  </div>
                ))}
              </div>
              <span style={{ fontSize: 10, fontWeight: 900, color: pct >= 100 ? "#fde047" : "#c7d2fe", flexShrink: 0, minWidth: 26, textAlign: "right" }}>{pct}%</span>
            </div>
            {danger ? (
              <div style={{ fontSize: 10, fontWeight: 800, color: "#fbbf24", margin: "-2px 0 6px" }}>⚠️ ここがちょっと危ないかも！「なおす」で直そう</div>
            ) : naosuByZero ? (
              <div style={{ fontSize: 9.5, fontWeight: 800, color: "#86efac", margin: "-2px 0 6px" }}>💯 間違いゼロ！「なおす」は直すところなし</div>
            ) : null}

            {tame === u.id ? (
              <div style={{ display: "flex", gap: 6 }}>
                {stepBtn(() => onPractice?.(ch, u), "✏️ れんしゅう", "linear-gradient(135deg,#22c55e,#10b981)", tameC, "じっくり計算して、確実にレベルアップしよう！")}
                {onBattle && stepBtn(() => onBattle(u), "⚔️ バトル", "linear-gradient(135deg,#ef4444,#b91c1c)", false, "制限時間内にモンスターを倒せるか！？")}
                {stepBtn(() => setTame(null), "← もどる", "rgba(255,255,255,.12)")}
              </div>
            ) : (
              <>
                <div style={{ display: "flex", gap: 6 }}>
                  {/* 講義ははいち動画のみ。動画が無い単元（四則混合・確率など6単元）だけ教師モードにフォールバック */}
                  {stepBtn(() => hasVideo ? onHaichi?.(u) : onTeacher?.(u), "📺 講義", "rgba(239,68,68,.5)", lectureC)}
                  {stepBtn(() => setTame(u.id), "✏️ ためす", "rgba(34,197,94,.5)", tameC)}
                  {stepBtn(() => onRelearn?.(u), "📖 なおす", "rgba(99,102,241,.5)", naosuDone)}
                  {stepBtn(() => onChallenge?.(ch, u), "🧮 応用",
                    tameC && !ouyouC ? "linear-gradient(135deg,#a855f7,#8b5cf6)" : "rgba(139,92,246,.5)",
                    ouyouC, tameC && !ouyouC ? "ためすクリア！挑戦しよう" : null)}
                </div>
                {/* 小単元ボス（2026-07-19設計）：ためすクリアで挑戦可能。初回撃破でクリスタル獲得 */}
                {onUnitBoss && tameC && (
                  <div style={{ display: "flex", marginTop: 6 }}>
                    {stepBtn(() => onUnitBoss(u), "⚔️ 小単元ボスに挑戦", "linear-gradient(135deg,#dc2626,#f59e0b)", false, "強敵！初回撃破でクリスタル獲得")}
                  </div>
                )}
              </>
            )}
          </div>
          );
        })}

        {/* 章のまとめにチャレンジ！：全小単元クリアでボスの梯子(第1段〜)に挑戦できる */}
        {onBossChallenge && (() => {
          const mastered = isChapterMastered(player, ch.id);
          return (
            <button
              onClick={() => mastered && onBossChallenge(ch.id)}
              disabled={!mastered}
              data-sfx="none"
              style={{
                marginTop: 4, padding: "13px 14px", borderRadius: 12, cursor: mastered ? "pointer" : "not-allowed",
                border: mastered ? "2px solid #fde047" : "1px solid rgba(255,255,255,.15)",
                background: mastered ? "linear-gradient(135deg,#f59e0b,#d97706)" : "rgba(255,255,255,.05)",
                color: mastered ? "#fff" : "rgba(255,255,255,.4)", fontWeight: 900, fontSize: 13, textAlign: "center",
              }}
            >
              🏆 章のまとめにチャレンジ！
              {!mastered && <div style={{ fontSize: 10, fontWeight: 700, marginTop: 3 }}>全部の単元を計算マスターにすると挑戦できるよ</div>}
            </button>
          );
        })()}
      </div>
    </div>
  );
}
