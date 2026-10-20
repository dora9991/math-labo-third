// ============================================================
// ProblemRateBadge.jsx — 【管理者用】いま解いている問題の「みんなの正答率」を、問題カードの右上に出す。
//  管理モードで「解答画面の右上に正答率を表示」をONにした端末だけ表示される（生徒には出ない）。
//  正答率は管理モードで読み込んだサーバー集計（端末に保存）から引く。問題の「型」ごとの集計。
// ============================================================
import { problemTypeId } from "../third/core.js";
import { isRateOverlayOn, getProblemRate } from "../third/adminApi.js";

export default function ProblemRateBadge({ q, unitId }) {
  if (!q || !isRateOverlayOn()) return null;
  const r = getProblemRate(problemTypeId(q, unitId));
  const pct = r && r.t > 0 ? Math.round((r.c / r.t) * 100) : null;
  const color = pct == null ? "#cbd5e1" : pct >= 80 ? "#4ade80" : pct >= 50 ? "#fbbf24" : "#f87171";
  return (
    <div title="この問題の型のみんなの正答率（管理者だけに表示）"
      style={{ position: "absolute", top: 10, right: 12, zIndex: 3, padding: "3px 10px", borderRadius: 999, fontSize: 12, fontWeight: 900,
        background: "rgba(10,20,40,.82)", color, border: `1px solid ${color}`, whiteSpace: "nowrap" }}>
      {pct == null ? "正答率 データなし" : `正答率 ${pct}%（${r.c}/${r.t}）`}
    </div>
  );
}
