const LABELS = { normal: "ふつう", fast: "はやい", off: "オフ" };

export default function FxSpeedToggle({ speed, onChange }) {
  return (
    <div className="fx-speed-toggle" aria-label="演出スピード">
      <span>演出:</span>
      {Object.entries(LABELS).map(([value, label]) => (
        <button key={value} type="button" className={speed === value ? "is-active" : ""} onClick={() => onChange(value)} aria-pressed={speed === value}>{label}</button>
      ))}
    </div>
  );
}
