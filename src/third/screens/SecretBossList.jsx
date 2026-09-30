// ============================================================
// SecretBossList.jsx — 裏ボスの一覧（やり込み。公開前・?secret=1 の時だけメニューから来られる）。
//  その学年の7体を、推奨レベルの低い順に並べる。開いているものだけ挑戦できる。
// ============================================================
import { useGame } from "../ThirdContext.jsx";
import { getViewGrade } from "../gradeView.js";
import { secretLadder, secretOpen, secretCleared, secretFirstExp, SECRET } from "../secretBoss.js";
import { levelFromExp, expOf } from "../expCurve.js";
import { monsterImageUrl } from "../data/monsterImages.js";

export default function SecretBossList({ nav }) {
  const { save, charactersById } = useGame();
  const grade = getViewGrade();
  const list = secretLadder(grade);
  const gradeClear = !!save.gradeDone?.[grade];
  const members = save.party.filter(Boolean).map((id) => charactersById[id]).filter(Boolean);
  const avg = members.length ? Math.round(members.reduce((a, c) => a + levelFromExp(expOf(save.owned[c.id], grade), c.rarity), 0) / members.length) : 0;
  return (
    <div className="mw-fantasy-screen">
      <div className="mw-fantasy-topbar">
        <button className="mw-fantasy-back" onClick={() => nav.exit()}>← もどる</button>
        <span className="mw-fantasy-title" style={{ fontSize: "1.1rem" }}>裏ボス（中{grade}）</span>
        <span className="mw-fantasy-coin">💎 {save.crystals}</span>
      </div>
      <div className="mw-fantasy-panel" style={{ lineHeight: 1.7, fontSize: 13, color: "#ffe9b3" }}>
        {gradeClear ? "とても強い相手が、7体まっている。HPが高くて、長い戦いになるよ。" : "中" + grade + "の全章と章ボスをクリアすると、裏ボスに挑戦できるよ。"}
        <br />いまのパーティ（中{grade}）の平均レベル：<b>Lv{avg}</b>　※推奨レベルは「SR・URの編成なら」の目安（レア度が高いほど強い）
      </div>
      {list.map((b) => {
        const open = secretOpen(save, grade, b.index), done = secretCleared(save, grade, b.index);
        return (
          <div key={b.id} className="mw-fantasy-panel" style={{ display: "grid", gridTemplateColumns: "72px 1fr", gap: 12, alignItems: "center", opacity: open || done ? 1 : 0.55 }}>
            {monsterImageUrl({ id: b.id }, "small") ? <img src={monsterImageUrl({ id: b.id }, "small")} alt="" style={{ width: 72, height: 72, objectFit: "contain", filter: open || done ? "none" : "brightness(.2)" }} draggable={false} /> : <div />}
            <div>
              <div style={{ fontWeight: 900 }}>{open || done ? b.name : "？？？"}　<span style={{ color: "#fde047" }}>推奨 Lv{b.recLevel}</span>{done ? "　✅" : ""}</div>
              <div style={{ fontSize: 12, color: "#c9d6d8" }}>{open || done ? b.desc : "ひとつ前の裏ボスをたおすと あらわれる"}</div>
              <div style={{ fontSize: 11.5, color: "#9be7ef", marginTop: 2 }}>HP {b.hp.toLocaleString()}　初回 💎{SECRET.firstCrystals[b.index]}＋経験値 {secretFirstExp(b.index).toLocaleString()}</div>
              <button className="mw-diff-btn" style={{ marginTop: 6 }} disabled={!open} onClick={() => nav.go("battle", { grade, kind: "secretBoss", secretIndex: b.index })}>{open ? "⚔️ 挑戦する" : "🔒"}</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
