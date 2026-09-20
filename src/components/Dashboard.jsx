// ============================================================
// Dashboard.jsx — ホームの学習ダッシュボード
//  ・ステータス（レベル・XP・連続日数・累計★・正答率）
//  ・章ごとのクリア進捗バー
//  ・得意／苦手な単元（記録の正答率から）
//  ・直近3日分の学習履歴（日ごとの解答数・正解数）
// ============================================================
import { chaptersForGrade, LEVEL_KEYS } from "../data/index.js";
import { levelProgress, levelTitle, levelColor, playerLevel, playerXp } from "../engine/scoring.js";
import { getPlayerBattleStats, getEquippedSkills, SP_MAX, battleBonuses } from "../engine/battle.js";
import { heroImageFor } from "../data/heroes.js";
import HeroImg from "./HeroImg.jsx";

// 記録(records)を createdAt で日ごとにまとめ、解答数・正解数を集計する。
// 解答のある日だけを新しい順に並べ、先頭 maxDays 日ぶんを返す。
// （バトルのみで解答数0の日は履歴に出さない）
function dailyHistory(records, maxDays = 3) {
  const byDay = {};
  for (const r of records) {
    if (!r || !r.createdAt) continue;
    const d = new Date(r.createdAt);
    if (isNaN(d.getTime())) continue;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const e = byDay[key] || (byDay[key] = { key, date: d, solved: 0, correct: 0 });
    e.solved += (r.correct || 0) + (r.wrong || 0);
    e.correct += r.correct || 0;
  }
  return Object.values(byDay)
    .filter((e) => e.solved > 0)
    .sort((a, b) => (a.key < b.key ? 1 : -1))
    .slice(0, maxDays);
}

// 日付を「今日 / 昨日 / おととい / M/D」に整形する
function dayLabel(date) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = new Date(date); d.setHours(0, 0, 0, 0);
  const diff = Math.round((today - d) / 86400000);
  if (diff === 0) return "今日";
  if (diff === 1) return "昨日";
  if (diff === 2) return "おととい";
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

export default function Dashboard({ player, records = [], onDetail, grade = 1 }) {
  const chapters = chaptersForGrade(grade);
  const lv = playerLevel(player);          // 現在ワールド（学年）のレベル
  const xpPct = levelProgress(playerXp(player));
  const lvCol = levelColor(lv);
  const stars = player.stars || {};
  const battle = getPlayerBattleStats(lv, battleBonuses(player)); // バトル用 HP・攻撃力（装備＋計算王ボーナス込み）
  const sp = Math.min(SP_MAX, player.sp ?? 0); // スキルポイント（永続）

  // 記録から単元ごとの正誤を集計
  const acc = {};
  for (const r of records) {
    if (!r.unitId) continue;
    acc[r.unitId] = acc[r.unitId] || { c: 0, w: 0 };
    acc[r.unitId].c += r.correct || 0;
    acc[r.unitId].w += r.wrong || 0;
  }

  // 単元ごとの集計（★は3難易度合計 0〜9）
  const units = [];
  for (const ch of chapters) {
    for (const u of ch.units) {
      const s = LEVEL_KEYS.reduce((sum, l) => sum + (stars[`${u.id}-${l}`] || 0), 0);
      const a = acc[u.id];
      const attempts = a ? a.c + a.w : 0;
      const accuracy = attempts > 0 ? a.c / attempts : null;
      units.push({ ch, u, stars: s, accuracy, attempts });
    }
  }

  // 全体の数値
  const totalStars = units.reduce((s, x) => s + x.stars, 0);
  const totalMax = units.length * 9;
  const solved = records.reduce((s, r) => s + (r.correct || 0) + (r.wrong || 0), 0);
  const totalCorrect = records.reduce((s, r) => s + (r.correct || 0), 0);
  const overallAcc = solved > 0 ? Math.round((totalCorrect / solved) * 100) : null;

  // 得意・苦手（ある程度解いた単元のみ）
  const attempted = units.filter((x) => x.attempts >= 3 && x.accuracy != null);
  const strong = [...attempted].sort((a, b) => b.accuracy - a.accuracy).slice(0, 3);
  const weak = [...attempted].sort((a, b) => a.accuracy - b.accuracy).slice(0, 3);

  const pct = (n) => Math.round(n * 100);

  // 直近3日分の学習履歴
  const history = dailyHistory(records, 3);

  return (
    <div>
      {/* ステータス */}
      <div className="glass" style={{ padding: "13px 14px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 54, height: 54, borderRadius: "50%", flexShrink: 0,
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            background: `conic-gradient(${lvCol} ${xpPct}%, rgba(255,255,255,.1) 0)`,
          }}>
            <div style={{ width: 42, height: 42, borderRadius: "50%", background: "#1a1a2e", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
              <span style={{ fontSize: 9, color: "rgba(255,255,255,.5)", lineHeight: 1 }}>Lv</span>
              <span style={{ fontSize: 18, fontWeight: 900, color: lvCol, lineHeight: 1 }}>{lv}</span>
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 900, color: lvCol }}>{levelTitle(lv)}</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,.45)" }}>次のレベルまで {Math.round(xpPct)}%</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 18, fontWeight: 900, color: "#fbbf24" }}>🔥{player.streaks}</div>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,.4)" }}>連続日数</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 11 }}>
          <Stat label="累計⭐" value={`${totalStars}/${totalMax}`} color="#fbbf24" />
          <Stat label="解いた問題" value={solved} color="#60a5fa" />
          <Stat label="正答率" value={overallAcc == null ? "—" : overallAcc + "%"} color="#4ade80" />
        </div>

        {/* 単元・小単元ごとの理解度の詳細へ */}
        {onDetail && (
          <button
            onClick={onDetail}
            data-sfx="none"
            style={{
              width: "100%", marginTop: 10, padding: "9px", borderRadius: 11,
              border: "1px solid rgba(129,140,248,.4)", background: "rgba(129,140,248,.12)",
              color: "#c7d2fe", fontFamily: "inherit", fontWeight: 800, fontSize: 12, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            }}
          >
            📋 単元・小単元ごとの理解度を見る →
          </button>
        )}

      </div>

      {/* 章ごとのクリア進捗 */}
      <div className="glass" style={{ padding: "13px 14px" }}>
        <div className="slbl">📚 章ごとのクリア状況（中学{grade}年）</div>
        {chapters.map((ch) => {
          const us = units.filter((x) => x.ch.id === ch.id);
          const s = us.reduce((a, x) => a + x.stars, 0);
          const max = us.length * 9;
          const p = max ? (s / max) * 100 : 0;
          return (
            <div key={ch.id} style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 8 }}>
              <span style={{ fontSize: 16, width: 22, textAlign: "center" }}>{ch.emoji}</span>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,.7)", width: 92, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{ch.name}</span>
              <div style={{ flex: 1, height: 9, background: "rgba(255,255,255,.1)", borderRadius: 5, overflow: "hidden" }}>
                <div style={{ width: p + "%", height: "100%", background: `linear-gradient(90deg, ${ch.color}, ${ch.color}aa)`, borderRadius: 5, transition: "width .5s" }} />
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, color: p >= 100 ? "#4ade80" : "rgba(255,255,255,.5)", minWidth: 30, textAlign: "right" }}>{Math.round(p)}%</span>
            </div>
          );
        })}
      </div>

      {/* 得意・苦手 */}
      <div className="glass" style={{ padding: "13px 14px" }}>
        <div className="slbl">📊 得意・苦手な単元</div>
        {attempted.length === 0 ? (
          <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)", textAlign: "center", padding: "8px 0" }}>
            もう少し問題を解くと、得意・苦手が見えてきます！
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: "#4ade80", marginBottom: 5 }}>💪 得意</div>
              {strong.map((x) => (
                <UnitAcc key={x.u.id} unit={x.u} acc={pct(x.accuracy)} color="#4ade80" />
              ))}
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: "#f87171", marginBottom: 5 }}>🔥 苦手</div>
              {weak.map((x) => (
                <UnitAcc key={x.u.id} unit={x.u} acc={pct(x.accuracy)} color="#f87171" />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 直近3日分の学習履歴 */}
      <div className="glass" style={{ padding: "13px 14px" }}>
        <div className="slbl">🗓️ 学習の記録（直近3日）</div>
        {history.length === 0 ? (
          <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)", textAlign: "center", padding: "8px 0" }}>
            問題を解くと、その日の記録がここに残ります！
          </div>
        ) : (
          history.map((h) => {
            const a = h.solved > 0 ? Math.round((h.correct / h.solved) * 100) : 0;
            return (
              <div key={h.key} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 9 }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,.7)", width: 54, flexShrink: 0 }}>
                  {dayLabel(h.date)}
                </span>
                <div style={{ display: "flex", gap: 14, flex: 1 }}>
                  <span style={{ fontSize: 12 }}>
                    <span style={{ fontWeight: 900, color: "#60a5fa" }}>{h.solved}</span>
                    <span style={{ fontSize: 10, color: "rgba(255,255,255,.45)" }}> 問</span>
                  </span>
                  <span style={{ fontSize: 12 }}>
                    <span style={{ fontWeight: 900, color: "#4ade80" }}>{h.correct}</span>
                    <span style={{ fontSize: 10, color: "rgba(255,255,255,.45)" }}> 正解</span>
                  </span>
                </div>
                <span style={{ fontSize: 11, fontWeight: 800, color: "#fbbf24", minWidth: 36, textAlign: "right" }}>{a}%</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// SP（スキルポイント）ゲージ。10目盛で、スキル1(5)・スキル2(10)に到達したかが分かる。
function SpGauge({ sp, skills }) {
  return (
    <div style={{ marginTop: 9 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 10, fontWeight: 800, color: "rgba(255,255,255,.5)" }}>⚡ SP（スキルポイント）</span>
        <span style={{ fontSize: 11, fontWeight: 900, color: "#fbbf24" }}>{sp} / {SP_MAX}</span>
      </div>
      {/* 10目盛のゲージ。スキル発動ライン（5・10）に区切りを入れる */}
      <div style={{ display: "flex", gap: 2 }}>
        {Array.from({ length: SP_MAX }).map((_, i) => {
          const on = i < sp;
          const notch = i === 4 || i === 9; // 5個目・10個目の右にライン
          return (
            <span key={i} style={{
              flex: 1, height: 12, borderRadius: 2,
              background: on ? "linear-gradient(180deg,#fde047,#f59e0b)" : "rgba(255,255,255,.08)",
              boxShadow: on ? "0 0 6px rgba(251,191,36,.6)" : "none",
              borderRight: notch ? "3px solid #4ade80" : "none",
            }} />
          );
        })}
      </div>
      {/* スキルが溜まっているかのバッジ */}
      <div style={{ display: "flex", gap: 6, marginTop: 7 }}>
        {skills.map((s) => {
          const ready = sp >= s.cost;
          return (
            <div key={s.id} style={{
              flex: 1, display: "flex", alignItems: "center", gap: 5, justifyContent: "center",
              padding: "5px 6px", borderRadius: 9,
              background: ready ? `color-mix(in srgb, ${s.color} 20%, transparent)` : "rgba(255,255,255,.04)",
              border: `1px solid ${ready ? s.color : "rgba(255,255,255,.1)"}`,
              opacity: ready ? 1 : 0.55,
            }}>
              <span style={{ fontSize: 14 }}>{s.icon}</span>
              <span style={{ fontSize: 10, fontWeight: 800, color: ready ? "#fff" : "rgba(255,255,255,.5)" }}>
                {s.name}
              </span>
              <span style={{ fontSize: 9, fontWeight: 700, color: ready ? s.color : "rgba(255,255,255,.4)" }}>
                {ready ? "✓" : `${s.cost}`}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Stat({ label, value, color }) {
  return (
    <div style={{ flex: 1, background: "rgba(255,255,255,.05)", borderRadius: 10, padding: "7px 4px", textAlign: "center" }}>
      <div style={{ fontSize: 16, fontWeight: 900, color }}>{value}</div>
      <div style={{ fontSize: 9, color: "rgba(255,255,255,.4)", marginTop: 1 }}>{label}</div>
    </div>
  );
}

function UnitAcc({ unit, acc, color }) {
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, marginBottom: 2 }}>
        <span style={{ color: "rgba(255,255,255,.7)", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", maxWidth: 90 }}>{unit.emoji} {unit.name}</span>
        <span style={{ color, fontWeight: 800 }}>{acc}%</span>
      </div>
      <div style={{ height: 5, background: "rgba(255,255,255,.1)", borderRadius: 3, overflow: "hidden" }}>
        <div style={{ width: acc + "%", height: "100%", background: color, borderRadius: 3 }} />
      </div>
    </div>
  );
}
