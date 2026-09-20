// ============================================================
// Collection.jsx — モンスター図鑑（倒したモンスターのコレクション）
//  ・倒したモンスターは小さい画像（色違い）＋名前で表示。
//  ・まだ倒していないモンスターはシルエット＋「？？？」で表示。
//  ・撃破判定はバトルの勝利記録（records）から行う。
// ============================================================
import Header from "../components/Header.jsx";
import MonsterSprite from "../components/MonsterSprite.jsx";
import { MONSTERS } from "../data/monsters.js";

const GRADE_LABEL = { 1: "中1", 2: "中2", 3: "中3" };
const KIND_LABEL = { sample: "れんしゅう", unit: "ザコ", chapterBoss: "章ボス", finalBoss: "魔王", secretBoss: "裏ボス" };

export default function Collection({ player, records, onPartners, onBack }) {
  // 撃破済みモンスターidの集合（バトルの勝利記録から）
  const defeated = new Set(
    (records || [])
      .filter((r) => r.mode === "battle" && r.extra && r.extra.result === "win")
      .map((r) => r.extra.monsterId)
  );
  // 仲間にしたモンスターidの集合（エサで仲間にした子）
  const recruited = new Set(Object.keys(player.partners || {}));
  const total = MONSTERS.length;
  const got = MONSTERS.filter((m) => defeated.has(m.id)).length;

  // 学年ごとに分ける（配列は進行順に並んでいる）
  const grades = [1, 2, 3];

  return (
    <div className="app">
      <Header player={player} back="ホーム" onBack={onBack} />
      <div className="content">
        <div className="pg-ttl">📖 モンスター図鑑</div>
        <div className="pg-sub">バトルで倒したモンスターがここに集まります</div>

        {onPartners && (
          <button className="nb-btn" onClick={onPartners} style={{ marginBottom: 10, background: "linear-gradient(135deg,#f59e0b,#f472b6)", color: "#fff" }}>
            🐾 なかまを編成・育成する →
          </button>
        )}

        {/* 収集率 */}
        <div className="glass" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px" }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,.7)" }}>コンプリート</span>
          <span style={{ fontSize: 20, fontWeight: 900, color: "#67e8f9" }}>{got} / {total}</span>
        </div>
        <div style={{ height: 8, background: "rgba(255,255,255,.1)", borderRadius: 5, overflow: "hidden", margin: "2px 2px 6px" }}>
          <div style={{ width: (total ? (got / total) * 100 : 0) + "%", height: "100%", background: "linear-gradient(90deg,#22d3ee,#a855f7)", borderRadius: 5 }} />
        </div>

        {grades.map((g) => {
          const list = MONSTERS.filter((m) => (m.grade || 1) === g);
          if (!list.length) return null;
          const gGot = list.filter((m) => defeated.has(m.id)).length;
          return (
            <div key={g} className="glass" style={{ padding: "12px 12px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <span style={{ fontSize: 14, fontWeight: 900, color: "#fff" }}>{GRADE_LABEL[g]} のモンスター</span>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,.5)" }}>{gGot}/{list.length}</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                {list.map((m) => {
                  const has = defeated.has(m.id);
                  const got = recruited.has(m.id); // 仲間にした
                  const isBoss = m.kind === "chapterBoss" || m.kind === "finalBoss" || m.kind === "secretBoss";
                  return (
                    <div key={m.id} style={{
                      position: "relative",
                      padding: "8px 6px", borderRadius: 12, textAlign: "center",
                      background: has ? "rgba(255,255,255,.05)" : "rgba(0,0,0,.18)",
                      border: `1px solid ${got ? "#fbbf24" : has ? (isBoss ? "#f472b6" : "rgba(103,232,249,.35)") : "rgba(255,255,255,.07)"}`,
                    }}>
                      {got && (
                        <span style={{ position: "absolute", top: 4, right: 4, fontSize: 8.5, fontWeight: 900, color: "#3a2a00", background: "linear-gradient(135deg,#f59e0b,#fbbf24)", borderRadius: 999, padding: "1px 6px", boxShadow: "0 0 6px #fbbf24" }}>🐾 GET</span>
                      )}
                      <div style={{ height: 64, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <MonsterSprite monster={m} mini state="idle" silhouette={!has} />
                      </div>
                      <div style={{ fontSize: 10.5, fontWeight: 900, color: has ? "#fff" : "rgba(255,255,255,.4)", marginTop: 4, lineHeight: 1.2, minHeight: 26 }}>
                        {has ? m.name : "？？？"}
                      </div>
                      <div style={{ fontSize: 8.5, fontWeight: 800, marginTop: 2, color: got ? "#fbbf24" : isBoss ? "#f9a8d4" : "rgba(255,255,255,.4)" }}>
                        {got ? "✓ 仲間" : isBoss ? KIND_LABEL[m.kind] : has ? (m.unit || "") : ""}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        <div style={{ marginTop: 6, fontSize: 11, color: "rgba(255,255,255,.4)", textAlign: "center", lineHeight: 1.6 }}>
          ※ ボスは何度でも戦えます。まだ会っていないモンスターはシルエットで表示されます。
        </div>
      </div>
    </div>
  );
}
