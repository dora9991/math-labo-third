// Presentation-only shell: existing screens retain every action and handler.
const ICONS = {
  "📚": "book", "📊": "record", "🛡️": "shield", "⚙️": "settings", "📘": "book",
  "📺": "lesson", "✏️": "practice", "⚔️": "battle", "🔒": "lock", "👑": "crown",
  "✚": "heal", "⏰": "clock", "✉": "letter",
  "➕": "plus", "🔤": "letters", "⚖️": "balance", "📈": "graph", "🔺": "triangle", "🧊": "cube",
};

function CrestIcon({ name }) {
  const type = ICONS[name];
  if (!type) return null;
  const paths = {
    book: <><path d="M5 5.5c4-1.5 6 .2 7 2.1v10C10.8 16.3 8.7 16 5 17.5z"/><path d="M19 5.5c-4-1.5-6 .2-7 2.1v10c1.2-1.3 3.3-1.6 7-.1z"/></>,
    record: <><path d="M5 19V11M12 19V5M19 19v-6"/><path d="M3.5 19.5h17"/></>,
    shield: <path d="M12 3.5 19 6v5.5c0 4.2-2.8 7.7-7 9-4.2-1.3-7-4.8-7-9V6z"/>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="m12 3 1 2.2 2.3.8 2-1.1 1.7 1.7-1.1 2 .8 2.3L21 12l-2.2 1-.8 2.3 1.1 2-1.7 1.7-2-1.1-2.3.8L12 21l-1-2.2-2.3-.8-2 1.1-1.7-1.7 1.1-2-.8-2.3L3 12l2.2-1 .8-2.3-1.1-2 1.7-1.7 2 1.1 2.3-.8z"/></>,
    lesson: <><rect x="4" y="5" width="16" height="14" rx="1"/><path d="m10 9 5 3-5 3z"/></>,
    practice: <><path d="m5 19 3.3-.7L19 7.6 16.4 5 5.7 15.7z"/><path d="m14.8 6.6 2.6 2.6"/><path d="M5 21h14"/></>,
    battle: <><path d="m7 4 10 10M17 4 7 14"/><path d="m5 17 2 3 3-2m7-1 2 3-3 2"/></>,
    lock: <><rect x="5" y="10" width="14" height="10" rx="1"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></>,
    crown: <path d="m4 8 4 4 4-7 4 7 4-4-2 11H6zM6 21h12"/>,
    heal: <><circle cx="12" cy="12" r="8"/><path d="M12 8v8m-4-4h8"/></>,
    clock: <><circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/></>,
    letter: <><rect x="4" y="6" width="16" height="12" rx="1"/><path d="m5 7 7 6 7-6"/></>,
    plus: <><circle cx="12" cy="12" r="8"/><path d="M12 7v10M7 12h10"/></>,
    letters: <><path d="M5 19 9 5h6l4 14M7.3 13h9.4"/><path d="M18 5v7"/></>,
    balance: <><path d="M12 4v16M6 20h12M4 8h16"/><path d="m5 8-3 6h6zm14 0-3 6h6z"/></>,
    graph: <><path d="M4 19V5M4 19h16"/><path d="m6 16 4-5 3 2 5-7"/></>,
    triangle: <path d="M12 4 21 20H3zM8.8 14h6.4"/>,
    cube: <><path d="m12 3 8 4.5v9L12 21l-8-4.5v-9z"/><path d="m4 7.5 8 4.5 8-4.5M12 12v9"/></>,
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">{paths[type]}</svg>;
}

export default function GameButton({ children, tone = "blue", className = "", badge, icon, ...props }) {
  return <button className={`game-btn game-btn--${tone} ${className}`} {...props}>
    <span className="game-btn__bevel" aria-hidden />
    {icon && <span className="game-btn__icon" aria-hidden>{ICONS[icon] ? <CrestIcon name={icon} /> : icon}</span>}<span className="game-btn__label">{children}</span>
    {badge && <span className="game-btn__badge">{badge}</span>}
  </button>;
}
