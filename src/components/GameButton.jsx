// Presentation-only shell: existing screens retain every action and handler.
export default function GameButton({ children, tone = "blue", className = "", badge, icon, ...props }) {
  return <button className={`game-btn game-btn--${tone} ${className}`} {...props}>
    <span className="game-btn__bevel" aria-hidden /><span className="game-btn__shine" aria-hidden />
    <span className="game-btn__spark game-btn__spark--a" aria-hidden>✦</span><span className="game-btn__spark game-btn__spark--b" aria-hidden>◇</span>
    {icon && <span className="game-btn__icon" aria-hidden>{icon}</span>}<span className="game-btn__label">{children}</span>
    {badge && <span className="game-btn__badge">{badge}</span>}
  </button>;
}
