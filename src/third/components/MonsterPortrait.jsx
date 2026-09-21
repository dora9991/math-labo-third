import { monsterImageUrl, monsterImgFilter } from "../data/monsterImages.js";

// 四角枠に囲まれたキャラ画像。画像が無いアート型のときは絵文字にフォールバック。
// frameless=true のときは枠なし（敵表示用。2026-09-12指示：敵は四角枠を外す）。
export default function MonsterPortrait({
  character,
  size = "small",
  selected = false,
  ready = false,
  footer,
  frameless = false,
}) {
  const url = character ? monsterImageUrl(character, size) : null;
  const filter = character ? monsterImgFilter(character) : "none";
  const rarity = character?.rarity;

  if (frameless) {
    return url ? (
      <img
        src={url}
        alt={character?.name || ""}
        className="mw-portrait-bare-img"
        style={{ filter }}
        draggable={false}
      />
    ) : (
      <div className="mw-portrait-bare-fallback">{character ? "❓" : ""}</div>
    );
  }

  const frame = (
    <div className="mw-portrait-wrap">
      <div
        className={`mw-portrait-frame ${rarity ? `mw-portrait-${rarity}` : ""} ${
          selected ? "mw-portrait-selected" : ""
        } ${ready ? "mw-portrait-ready" : ""}`}
      >
        {url ? (
          <img
            src={url}
            alt={character.name}
            className="mw-portrait-img"
            style={{ filter }}
            draggable={false}
          />
        ) : (
          <div className="mw-portrait-fallback">{character ? "❓" : ""}</div>
        )}
      </div>
      {/* 右下のレア度バッジ（2026-09-18追加）。R/SR/URはキラキラ演出つき。 */}
      {rarity && <div className={`mw-rarity-badge mw-rarity-badge-${rarity}`}>{rarity}</div>}
    </div>
  );

  if (!footer) return frame;
  return (
    <div className="mw-portrait-col">
      {frame}
      <div className="mw-portrait-footer">{footer}</div>
    </div>
  );
}
