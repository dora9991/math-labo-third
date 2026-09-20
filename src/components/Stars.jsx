// Stars.jsx — 星0〜3個の表示部品
export default function Stars({ count, size = 16 }) {
  return (
    <span style={{ fontSize: size, letterSpacing: 1 }}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          style={{
            opacity: i < count ? 1 : 0.18,
            filter: i < count ? "drop-shadow(0 0 3px gold)" : "none",
          }}
        >
          ⭐
        </span>
      ))}
    </span>
  );
}
