// ============================================================
// RankCard.jsx — 「やりこみ段位」のカード（ホームの小カード／学習記録の詳細カード）
//  段位は engine/rank.js（正解数＋学んだ日数）から計算する。見た目だけの部品。
// ============================================================
import { RANKS, rankFor, yarikomiStats, POINTS_PER_DAY } from "../engine/rank.js";

const EMOJI = { kyu: "🔰", dan: "🥋", meijin: "👑" };

/** 段位バッジ（四角い札に段位名） */
export function RankBadge({ rank, size = 48 }) {
  return (
    <div style={{
      flexShrink: 0, width: size, height: size, borderRadius: Math.round(size * 0.26), display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", lineHeight: 1.05,
      background: `linear-gradient(145deg, ${rank.color}55, ${rank.color}1f)`,
      border: `2px solid ${rank.color}`, boxShadow: `0 0 14px ${rank.color}55`,
    }}>
      <span style={{ fontSize: Math.round(size * 0.3) }}>{EMOJI[rank.kind]}</span>
      <span style={{ fontSize: Math.round(size * (rank.name.length > 2 ? 0.27 : 0.33)), fontWeight: 900, color: rank.color, whiteSpace: "nowrap" }}>{rank.name}</span>
    </div>
  );
}

/**
 * @param {boolean} detail  true なら内訳・段位の一覧つき（学習記録用）。false は1行の小カード（ホーム用）。
 * @param {() => void} onClick  小カードを押したときの動き（無ければ押せない見た目）
 */
export default function RankCard({ player, records, detail = false, onClick = null }) {
  const st = yarikomiStats(player, records);
  const rank = rankFor(st.points);
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      {...(onClick ? { onClick, "data-sfx": "none" } : {})}
      className="glass"
      style={{
        display: "block", width: "100%", textAlign: "left", fontFamily: "inherit", color: "#fff",
        padding: detail ? "14px" : "10px 12px", margin: "0 0 12px", cursor: onClick ? "pointer" : "default",
        border: `1.5px solid ${rank.color}66`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <RankBadge rank={rank} size={detail ? 58 : 46} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6, flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,.6)" }}>やりこみ段位</span>
            <span style={{ fontSize: detail ? 19 : 16, fontWeight: 900, color: rank.color }}>{rank.name}</span>
            <span style={{ marginLeft: "auto", fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,.55)" }}>{st.points.toLocaleString()}P</span>
          </div>
          <div style={{ height: 8, borderRadius: 999, background: "rgba(255,255,255,.1)", margin: "6px 0 4px", overflow: "hidden" }}>
            <div style={{ width: `${rank.pct}%`, height: "100%", borderRadius: 999, background: `linear-gradient(90deg, ${rank.color}, ${rank.color}aa)`, transition: "width .5s ease" }} />
          </div>
          <div style={{ fontSize: 10.5, fontWeight: 700, color: "rgba(255,255,255,.65)" }}>
            {rank.next ? `次の「${rank.next.name}」まで あと ${rank.toNext.toLocaleString()}P` : "最高位の名人！ すごい！"}
          </div>
        </div>
        {onClick && <span style={{ fontSize: 14, color: "rgba(255,255,255,.4)" }}>›</span>}
      </div>

      {detail && (
        <>
          <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
            {[
              { label: "正解した問題", value: `${st.correct.toLocaleString()}問`, color: "#4ade80" },
              { label: `学んだ日（1日${POINTS_PER_DAY}P）`, value: `${st.days}日`, color: "#fbbf24" },
              { label: "やりこみP", value: `${st.points.toLocaleString()}P`, color: rank.color },
            ].map((b) => (
              <div key={b.label} style={{ flex: 1, textAlign: "center", padding: "7px 2px", borderRadius: 10, background: "rgba(255,255,255,.05)" }}>
                <div style={{ fontSize: 15, fontWeight: 900, color: b.color }}>{b.value}</div>
                <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,.5)", marginTop: 2 }}>{b.label}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.62)", lineHeight: 1.6, marginTop: 10 }}>
            段位は「正解した問題の数」と「学んだ日の数」で上がるよ。まちがいは数えないから、<b style={{ color: "#fde047" }}>あてずっぽうでは上がらない</b>。毎日すこしずつがいちばんの近道！
          </div>
          <details style={{ marginTop: 8 }}>
            <summary style={{ cursor: "pointer", fontSize: 11.5, fontWeight: 800, color: "#c4b5fd" }}>段位の一覧を見る</summary>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, marginTop: 8 }}>
              {RANKS.map((r, i) => (
                <div key={r.name} style={{
                  padding: "5px 4px", borderRadius: 9, textAlign: "center", fontSize: 11, fontWeight: 800,
                  color: i <= rank.idx ? r.color : "rgba(255,255,255,.35)",
                  background: i === rank.idx ? `${r.color}26` : "rgba(255,255,255,.04)",
                  border: `1px solid ${i === rank.idx ? r.color : "rgba(255,255,255,.1)"}`,
                }}>
                  {r.name}<div style={{ fontSize: 9, fontWeight: 700, opacity: 0.8 }}>{r.min.toLocaleString()}P〜</div>
                </div>
              ))}
            </div>
          </details>
        </>
      )}
    </Tag>
  );
}
