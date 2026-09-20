// ============================================================
// UnitTestSelect.jsx — 単元テストの章を選ぶ画面（今いる学年のみ）
// ============================================================
import Header from "../components/Header.jsx";
import { chaptersForGrade } from "../data/index.js";
import { unitTestTimeLimit, formatTime } from "../engine/unitTest.js";

const GRADE_LABEL = { 1: "中1", 2: "中2", 3: "中3" };

export default function UnitTestSelect({ player, grade = 1, onStart, onBack }) {
  const chapters = chaptersForGrade(grade); // ★今いる学年の章だけ（全学年混在を修正）
  return (
    <div className="app">
      <Header player={player} back="ホーム" onBack={onBack} />
      <div className="content">
        <div className="pg-ttl">📝 単元テスト</div>
        <div className="pg-sub">章を選ぶと、その章の全単元から出題されます（文字入力で回答・制限時間あり）</div>
        <div style={{ fontSize: 13, fontWeight: 900, color: "#818cf8", margin: "14px 2px 6px", borderBottom: "1px solid rgba(129,140,248,.35)", paddingBottom: 4 }}>
          {GRADE_LABEL[grade] || `中学${grade}年`}
        </div>
        {chapters.length === 0 ? (
          <div className="glass" style={{ padding: 16, textAlign: "center" }}>この学年の単元テストは準備中です。</div>
        ) : (
          chapters.map((c) => {
            const qCount = c.units.length * 2; // 標準＋発展（小単元あたり）
            const limit = unitTestTimeLimit(qCount);
            return (
              <button
                key={c.id}
                className="chap-card"
                style={{ background: `linear-gradient(135deg, ${c.color}cc, ${c.color}88)` }}
                onClick={() => onStart(c)}
              >
                <div className="chap-em">{c.emoji}</div>
                <div style={{ flex: 1 }}>
                  <div className="chap-nm">{c.name}</div>
                  <div className="chap-sub">全{c.units.length}単元 ・ ⏳制限 {formatTime(limit)}前後</div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
