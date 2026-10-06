// ============================================================
// BattleFx.jsx — バトルの「動き」の部品（技名バナー・斬撃エフェクト）
//  TurnBattle（中1）と Battle（中2・3）で共通に使う。見た目だけで、ダメージ等には一切関与しない。
//  fx の key が変わるたびに再生する（同じ技が続いても毎回アニメが走る）。
// ============================================================

/** 技名バナー：ステージ上部に「アイコン＋技名！」がポップして消える。奥義は金色で大きく。 */
export function MoveNameFx({ fx }) {
  if (!fx) return null;
  return (
    <div key={fx.key} className={"bt-move-name" + (fx.finisher ? " is-finisher" : "")} style={{ "--mc": fx.color || "#7dd3fc" }}>
      {fx.finisher && <span className="bt-move-tag">奥義</span>}
      <span className="bt-move-ic">{fx.icon}</span>
      <span>{fx.name}！</span>
    </div>
  );
}

/** 斬撃：敵に重ねて斜めの光が走る。奥義・必殺技はバッテン斬り。 */
export function SlashFx({ fx }) {
  if (!fx) return null;
  return <div key={fx.key} className={"bt-slash" + (fx.cross ? " cross" : "")} style={{ "--mc": fx.color || "#7dd3fc" }} />;
}
