// ============================================================
// ProofFigure.jsx — 合同・相似の証明問題の図（SVG）。図の仕様は data/_proofFigures.js。
//  fig = { kind: "cong"|"sim", idx, lab: [頂点の文字...] }
// ============================================================
import { CONG_FIGS, SIM_FIGS } from "../data/_proofFigures.js";

const INK = "#17265b";
const unit = (a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; return [dx / l, dy / l]; };

export default function ProofFigure({ fig }) {
  const spec = fig && (fig.kind === "cong" ? CONG_FIGS : SIM_FIGS)[fig.idx];
  if (!spec) return null;
  const P = spec.pts, lab = fig.lab || [];
  const ids = Object.keys(P).map(Number);
  const cx = ids.reduce((s, i) => s + P[i][0], 0) / ids.length, cy = ids.reduce((s, i) => s + P[i][1], 0) / ids.length;
  const mid = (a, b) => [(P[a][0] + P[b][0]) / 2, (P[a][1] + P[b][1]) / 2];

  return (
    <svg viewBox={spec.vb} role="img" aria-label="図" style={{ width: "100%", maxWidth: 360, display: "block", margin: "4px auto 10px" }}>
      {spec.lines.map(([a, b], i) => <line key={"l" + i} x1={P[a][0]} y1={P[a][1]} x2={P[b][0]} y2={P[b][1]} stroke={INK} strokeWidth="2" strokeLinecap="round" />)}
      {(spec.ticks || []).map(([a, b, n, t = 0.5], i) => {
        const m = [P[a][0] + (P[b][0] - P[a][0]) * t, P[a][1] + (P[b][1] - P[a][1]) * t], d = unit(P[a], P[b]), nrm = [-d[1], d[0]];
        return Array.from({ length: n }, (_, k) => {
          const o = (k - (n - 1) / 2) * 5;
          const cxk = m[0] + d[0] * o, cyk = m[1] + d[1] * o;
          return <line key={`t${i}-${k}`} x1={cxk - nrm[0] * 6} y1={cyk - nrm[1] * 6} x2={cxk + nrm[0] * 6} y2={cyk + nrm[1] * 6} stroke={INK} strokeWidth="2" />;
        });
      })}
      {(spec.par || []).map(([a, b], i) => {
        const m = mid(a, b), d = unit(P[a], P[b]), nrm = [-d[1], d[0]];
        const tip = [m[0] + d[0] * 4, m[1] + d[1] * 4], back = [m[0] - d[0] * 3, m[1] - d[1] * 3];
        return <polyline key={"p" + i} fill="none" stroke={INK} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          points={`${back[0] + nrm[0] * 5},${back[1] + nrm[1] * 5} ${tip[0]},${tip[1]} ${back[0] - nrm[0] * 5},${back[1] - nrm[1] * 5}`} />;
      })}
      {(spec.right || []).map(([v, p, q], i) => {
        const u = unit(P[v], P[p]), w = unit(P[v], P[q]), s = 10;
        const a = [P[v][0] + u[0] * s, P[v][1] + u[1] * s], c = [P[v][0] + w[0] * s, P[v][1] + w[1] * s], b = [a[0] + w[0] * s, a[1] + w[1] * s];
        return <polyline key={"r" + i} fill="none" stroke={INK} strokeWidth="1.6" points={`${a[0]},${a[1]} ${b[0]},${b[1]} ${c[0]},${c[1]}`} />;
      })}
      {ids.map((i) => {
        const o = (spec.off || {})[i];
        let dx, dy;
        if (o) [dx, dy] = o; else { const d = unit([cx, cy], P[i]); dx = d[0] * 14; dy = d[1] * 14; }
        return <text key={"n" + i} x={P[i][0] + dx} y={P[i][1] + dy} textAnchor="middle" dominantBaseline="central" fontSize="16" fontWeight="800" fill={INK} fontFamily="'Noto Serif JP','Shippori Mincho',serif">{lab[i - 1]}</text>;
      })}
    </svg>
  );
}
