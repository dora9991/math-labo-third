// ============================================================
// StatusMeter.jsx — 自分のステータス（2026-07-19設計・多角形メーター版）
//  HPは全単元共通1000。各単元(章)ごとのBP(100〜350)を7角形のレーダーチャートで見る。
//  BP100を中心から1割、BP350を10割の位置に置く（0割スタートだと最初が寂しいため）。
//  各頂点にはBPの実数値を表示。上限は最初から350（BP_MAX）まで育てられる
//  （engine/battleTurn.js chapterBPCap／BASE_BP_CAP=BP_MAXなので常に350を返す）。
// ============================================================
import Header from "../components/Header.jsx";
import { chaptersForGrade } from "../data/index.js";
import { isCalcKingCleared } from "../engine/battle.js";
import { BP_MIN, BP_MAX, chapterBPCap } from "../engine/battleTurn.js";

const SIZE = 320;
const CENTER = SIZE / 2;
const MAX_R = 118;
const FLOOR = 0.1; // BP_MINの位置＝中心から1割

function bpFrac(bp) {
  const t = Math.max(0, Math.min(1, (bp - BP_MIN) / (BP_MAX - BP_MIN)));
  return FLOOR + (1 - FLOOR) * t;
}
function angleFor(i, n) {
  return (Math.PI * 2 * i) / n - Math.PI / 2;
}
function pointAt(i, n, frac) {
  const a = angleFor(i, n);
  return [CENTER + MAX_R * frac * Math.cos(a), CENTER + MAX_R * frac * Math.sin(a)];
}

export default function StatusMeter({ player, onBack }) {
  const chapters = chaptersForGrade(1);
  const n = chapters.length;
  const bpMap = player.chapterBP || {};

  const dataPoints = chapters.map((ch, i) => {
    const bp = bpMap[ch.id] || BP_MIN;
    const clearedN = ch.units.filter((u) => isCalcKingCleared(player, u.id)).length;
    const cap = chapterBPCap(clearedN);
    return { ch, bp, cap, pt: pointAt(i, n, bpFrac(bp)) };
  });
  const polygonPoints = dataPoints.map((d) => d.pt.join(",")).join(" ");
  const RINGS = [0.25, 0.5, 0.75, 1];

  return (
    <div className="app">
      <Header player={player} back="ホーム" onBack={onBack} />
      <div className="content">
        <div className="pg-ttl">📊 自分のステータス</div>
        <div className="pg-sub">多角形は各単元のBP（100〜350、育つほど外側へ）。最初から350まで育てられる。</div>

        <div className="glass" style={{ padding: "12px", display: "flex", justifyContent: "center" }}>
          <svg viewBox={`0 0 ${SIZE} ${SIZE + 40}`} width="100%" style={{ maxWidth: 380 }}>
            {/* 背景の同心多角形（目盛り） */}
            {RINGS.map((frac, ri) => {
              const pts = Array.from({ length: n }, (_, i) => pointAt(i, n, frac).join(",")).join(" ");
              return <polygon key={ri} points={pts} fill="none" stroke="rgba(255,255,255,.14)" strokeWidth="1" />;
            })}
            {/* 中心からの軸線 */}
            {chapters.map((ch, i) => {
              const [x, y] = pointAt(i, n, 1);
              return <line key={ch.id} x1={CENTER} y1={CENTER} x2={x} y2={y} stroke="rgba(255,255,255,.14)" strokeWidth="1" />;
            })}
            {/* 実データの多角形 */}
            <polygon points={polygonPoints} fill="rgba(74,222,128,.28)" stroke="#4ade80" strokeWidth="2.5" />
            {/* 頂点の点＋外側のラベル（BP数値は頂点でなく外側にまとめる＝低い値でも重ならない） */}
            {dataPoints.map((d, i) => {
              const [x, y] = d.pt;
              const [lx, ly] = pointAt(i, n, 1.2); // ラベル位置（外側・固定）
              const capped = d.bp >= d.cap;
              return (
                <g key={d.ch.id}>
                  <circle cx={x} cy={y} r={4} fill="#4ade80" stroke="#0d1f0d" strokeWidth="1.5" />
                  <text x={lx} y={ly - 8} textAnchor="middle" fontSize="13" fontWeight="800" fill="#cceebb">{d.ch.emoji}</text>
                  <text x={lx} y={ly + 6} textAnchor="middle" fontSize="13" fontWeight="900" fill="#fde047">{d.bp}</text>
                  <text x={lx} y={ly + 18} textAnchor="middle" fontSize="8.5" fontWeight="700" fill={capped ? "#fbbf24" : "rgba(255,255,255,.45)"}>
                    上限{d.cap}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    </div>
  );
}
