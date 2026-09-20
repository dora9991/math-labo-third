// ============================================================
// ComingSoon.jsx — まだ作っていないモード用の仮画面。
// じっくり/バトル/単元テストは、この雛形を土台に次のステップで実装する。
// ============================================================
import Header from "../components/Header.jsx";

export default function ComingSoon({ title, onBack }) {
  return (
    <div className="app">
      <Header player={{ xp: 0, streaks: 0 }} back="ホーム" onBack={onBack} />
      <div className="content">
        <div className="pg-ttl">{title}</div>
        <div className="glass" style={{ marginTop: 12 }}>
          <div className="empty">
            <div className="empty-icon">🚧</div>
            <p style={{ lineHeight: 1.7 }}>このモードは準備中です。<br />タイムアタックと同じ仕組みで、次のステップで実装します。</p>
          </div>
        </div>
      </div>
    </div>
  );
}
