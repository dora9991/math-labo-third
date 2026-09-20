// TimerRing.jsx — 残り時間を表す円形タイマー
export default function TimerRing({ sec, total = 40 }) {
  const r = 40;
  const circ = 2 * Math.PI * r;
  const dash = circ * (sec / total);
  const col = sec > total * 0.4 ? "#4ade80" : sec > total * 0.2 ? "#fb923c" : "#f87171";
  return (
    <svg width="96" height="96" viewBox="0 0 96 96">
      <circle cx="48" cy="48" r={r} fill="none" stroke="rgba(255,255,255,.1)" strokeWidth="7" />
      <circle
        cx="48" cy="48" r={r} fill="none" stroke={col} strokeWidth="7"
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        transform="rotate(-90 48 48)"
        style={{ transition: "stroke-dasharray .9s linear, stroke .3s" }}
      />
      <text x="48" y="48" textAnchor="middle" dominantBaseline="central"
        fill={col} fontSize="24" fontWeight="900"
        fontFamily="'M PLUS Rounded 1c', sans-serif">{sec}</text>
    </svg>
  );
}
