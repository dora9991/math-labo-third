// ============================================================
// Admin.jsx — 管理用モード（先生向け・隠しコマンドで開く）
//  タイトル画面のロゴを5回すばやくタップ（または長押し）すると開く（生徒には見えない）。
//  中身＝数学ラボ3の分析・管理ツール（AdminThirdPanel：生徒一覧・クラスのようす・学習ログ・ご意見箱・設定のタブ）・データのバックアップ。
//  2026-09-30：旧ラボ2由来の設定（レベル・コイン・SP・星・モンスター・スキル）は、ラボ3では使わないため取り除いた。
// ============================================================
import Header from "../components/Header.jsx";
import BackupBox from "../components/BackupBox.jsx";
import AdminThirdPanel from "../components/AdminThirdPanel.jsx";

export default function Admin({ player, onExport, onImport, onBack }) {
  return (
    <div className="app">
      <Header player={player} back="ホーム" onBack={onBack} />
      <div className="content adm-page">
        <div className="pg-ttl">🛠️ 管理用モード</div>
        <div className="pg-sub">先生用：クラスのようすの確認と、生徒の状態の調整ができます（生徒には見えない隠しモード）</div>

        {/* ラボ3の分析（生徒一覧・クラスのようす・学習ログ・ご意見箱）と管理ツール（サーバー記録・先生の合言葉が必要） */}
        <AdminThirdPanel />

        {/* データのバックアップ（保存・復元） */}
        {onExport && onImport && <BackupBox onExport={onExport} onImport={onImport} />}
      </div>
    </div>
  );
}
