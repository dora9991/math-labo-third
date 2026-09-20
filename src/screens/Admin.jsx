// ============================================================
// Admin.jsx — 管理用モード（先生向け・隠しコマンドで開く）
//  レベル・コイン・SP・クリア状況・スキル・HPなどを自由に設定できる。
//  タイトル画面の📐を5回すばやくタップすると開く（生徒には見えない）。
// ============================================================
import { useState } from "react";
import Header from "../components/Header.jsx";
import BackupBox from "../components/BackupBox.jsx";
import ClassStats from "../components/ClassStats.jsx";
import FeedbackBox from "../components/FeedbackBox.jsx";
import { MONSTERS } from "../data/monsters.js";
import { levelTitle, playerLevel } from "../engine/scoring.js";

// ※ Row はコンポーネントの外で定義する。中で定義すると毎レンダーで型が変わり、
//   入力欄が作り直されてフォーカスが外れ、「1文字打つと入力が終わる」不具合になる。
const Row = ({ label, children }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
    <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,.7)" }}>{label}</span>
    {children}
  </div>
);

export default function Admin({ player, records, admin, onExport, onImport, onBack }) {
  const lv = playerLevel(player); // 現在ワールド（学年）のレベル
  const [lvInput, setLvInput] = useState(String(lv));
  const [coinInput, setCoinInput] = useState(String(player.coins ?? 0));
  const [crystalInput, setCrystalInput] = useState(String(player.crystals ?? 0));
  const [spInput, setSpInput] = useState(String(player.sp ?? 0));
  const [confirmReset, setConfirmReset] = useState(false);

  const clearedCount = new Set(
    (records || []).filter((r) => r.mode === "battle" && r.extra && r.extra.result === "win").map((r) => r.extra.monsterId)
  ).size;
  const ownedSkills = (player.ownedSkills || []).length;

  const field = { fontSize: 15, fontWeight: 800, padding: "9px 12px", borderRadius: 10, border: "1px solid rgba(255,255,255,.2)", background: "rgba(255,255,255,.06)", color: "#fff", width: 90, fontFamily: "inherit" };
  const setBtn = { fontSize: 13, fontWeight: 900, padding: "9px 16px", borderRadius: 10, border: "none", background: "#6366f1", color: "#fff", cursor: "pointer", fontFamily: "inherit" };
  const actBtn = { fontSize: 13, fontWeight: 800, padding: "11px", borderRadius: 11, border: "1px solid rgba(255,255,255,.2)", background: "rgba(255,255,255,.06)", color: "#fff", cursor: "pointer", fontFamily: "inherit", width: "100%" };

  return (
    <div className="app">
      <Header player={player} back="ホーム" onBack={onBack} />
      <div className="content">
        <div className="pg-ttl">🛠️ 管理用モード</div>
        <div className="pg-sub">先生用：値を自由に設定できます（生徒には見えない隠しモード）</div>

        {/* クラス全員の成績（サーバー記録・先生の合言葉が必要） */}
        <ClassStats />

        {/* 生徒からのご意見箱（サーバー記録・先生の合言葉が必要） */}
        <FeedbackBox />

        {/* 現状サマリ */}
        <div className="glass" style={{ padding: "12px 14px", display: "flex", gap: 8, flexWrap: "wrap", fontSize: 12, color: "rgba(255,255,255,.7)" }}>
          <span>Lv.{lv}（{levelTitle(lv)}）</span>・
          <span>💰{player.coins ?? 0}</span>・
          <span>💎{player.crystals ?? 0}</span>・
          <span>⚡SP {player.sp ?? 0}/10</span>・
          <span>撃破 {clearedCount}/{MONSTERS.length}体</span>・
          <span>スキル {ownedSkills}個</span>
        </div>

        {/* 数値設定 */}
        <div className="glass" style={{ padding: "14px 16px" }}>
          <div className="slbl">🔢 数値を設定</div>
          <Row label="レベル（1〜99）">
            <input style={field} value={lvInput} inputMode="numeric" onChange={(e) => setLvInput(e.target.value)} />
            <button style={setBtn} data-sfx="none" onClick={() => admin.setLevel(Number(lvInput))}>設定</button>
          </Row>
          <Row label="コイン">
            <input style={field} value={coinInput} inputMode="numeric" onChange={(e) => setCoinInput(e.target.value)} />
            <button style={setBtn} data-sfx="none" onClick={() => admin.setCoins(Number(coinInput))}>設定</button>
          </Row>
          <Row label="クリスタル💎">
            <input style={field} value={crystalInput} inputMode="numeric" onChange={(e) => setCrystalInput(e.target.value)} />
            <button style={setBtn} data-sfx="none" onClick={() => admin.setCrystals(Number(crystalInput))}>設定</button>
          </Row>
          <Row label="SP（0〜10）">
            <input style={field} value={spInput} inputMode="numeric" onChange={(e) => setSpInput(e.target.value)} />
            <button style={setBtn} data-sfx="none" onClick={() => admin.setSp(Number(spInput))}>設定</button>
          </Row>
        </div>

        {/* データのバックアップ（保存・復元） */}
        {onExport && onImport && <BackupBox onExport={onExport} onImport={onImport} />}

        {/* ワンタッチ操作 */}
        <div className="glass" style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 9 }}>
          <div className="slbl">⚡ クリア状況・解放</div>
          <button style={actBtn} data-sfx="none" onClick={admin.maxAllStars}>⭐ 全単元の星をMAX（全モンスター解放）</button>
          <button style={actBtn} data-sfx="none" onClick={admin.clearAllMonsters}>👾 全モンスターを撃破済みにする（章ボス・魔王も）</button>
          <button style={actBtn} data-sfx="none" onClick={admin.unlockAllSkills}>✨ 全スキルを解放</button>
          <button style={actBtn} data-sfx="none" onClick={admin.fullHeal}>❤️ HPを全回復</button>
        </div>

        {/* リセット */}
        <div className="glass" style={{ padding: "14px 16px" }}>
          <div className="slbl">⚠️ 危険な操作</div>
          {!confirmReset ? (
            <button style={{ ...actBtn, borderColor: "rgba(248,113,113,.4)", background: "rgba(248,113,113,.1)", color: "#fca5a5" }} data-sfx="none" onClick={() => setConfirmReset(true)}>
              🗑️ 進捗を初期化する
            </button>
          ) : (
            <div>
              <div style={{ fontSize: 12, color: "#fca5a5", marginBottom: 8 }}>本当に全データを初期化しますか？（元に戻せません）</div>
              <div style={{ display: "flex", gap: 10 }}>
                <button style={{ ...actBtn, width: "auto", flex: 1 }} data-sfx="none" onClick={() => setConfirmReset(false)}>やめる</button>
                <button style={{ ...actBtn, width: "auto", flex: 1, border: "none", background: "#ef4444", color: "#fff" }} data-sfx="none" onClick={() => { admin.resetProgress(); setConfirmReset(false); }}>初期化する</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
