// ============================================================
// PartyFormation.jsx — パーティ編成画面。
// 2026-09-17：「変更」ボタンの一覧をやめ、ドラッグ＆ドロップでの入れ替えに変更。
//   ・上段：パーティ5枠（絵のみ、半分サイズ）
//   ・下段：ガチャで手に入れた全キャラを絵柄だけで並べたグリッド（控え）
//   ・控え→パーティ枠へドラッグ＝そのキャラを編成する
//   ・パーティ枠→下の控えエリアへドラッグ＝パーティから外す
//   ・動かさずタップ＝そのキャラの強さのポップアップを表示
// 2026-09-18：パーティ枠も名前表示を外し、控えメンバーと同じ絵柄のみの
//   表記に統一。控えメンバーにレベル順/レア度順/新しい順/古い順のソートを追加。
// ============================================================
import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useGame, PARTY_SIZE } from "../ThirdContext.jsx";
import { levelFromExp, expOf } from "../expCurve.js";
import { getViewGrade } from "../gradeView.js";
import MonsterPortrait from "../components/MonsterPortrait.jsx";
import CharacterPopup from "../components/CharacterPopup.jsx";

const PARTY_SLOTS = Array.from({ length: PARTY_SIZE }, (_, i) => i);
const DRAG_THRESHOLD_PX = 10;

const RARITY_RANK = { N: 0, R: 1, SR: 2, UR: 3 };

// 「新しい順/古い順」は取得日時を別途保持していないため、save.owned
// （オブジェクト）のキー挿入順＝仲間になった順をそのまま使う（新しく
// ガチャで仲間になったキャラはobtainCharacterで末尾に追加されるので、
// 実際の並びとして成立する。最初から全員仲間の単元特化ロースターは
// specialistRoster.jsの並び順のまま一括追加されている点に注意）。
const SORT_OPTIONS = [
  { key: "levelDesc", label: "レベル順" },
  { key: "rarityDesc", label: "レア度順" },
  { key: "newest", label: "新しい順" },
  { key: "oldest", label: "古い順" },
];

export default function PartyFormation({ nav }) {
  const { save, actions, charactersById } = useGame();
  const [popupCharId, setPopupCharId] = useState(null);
  const [dragGhost, setDragGhost] = useState(null); // {charId, x, y} | null
  const [hoverSlot, setHoverSlot] = useState(null); // 控え→パーティへドラッグ中、指の下にある枠
  const [benchHover, setBenchHover] = useState(false); // パーティ→控えへドラッグ中、控えエリアの上にいるか
  const [sortKey, setSortKey] = useState("oldest");

  // pointermove/pointerupはドラッグ中ずっと同じリスナーを使い回すので、
  // 判定にReactのstateをそのまま読むと古い値を掴んでしまう（Battle.jsxの
  // ドラッグ実装と同じ理由）。判定用にはrefを、見た目の更新にはstateを使う。
  const dragRef = useRef(null); // {origin:'bench'|'party', charId, slotIndex, startX, startY, moved}
  const hoverSlotRef = useRef(null);
  const benchHoverRef = useRef(false);
  const slotRefs = useRef({}); // slot index -> el
  const benchAreaRef = useRef(null);

  // 挿入順(=仲間になった順)のリストをまず作り、古い順/新しい順はこれをそのまま
  // 使う。レベル順/レア度順はこの上で安定ソートする。
  const ownedByAcquireOrder = Object.keys(save.owned)
    .sort((a, b) => (save.owned[a].n || 0) - (save.owned[b].n || 0))
    .map((id) => charactersById[id])
    .filter(Boolean);

  const ownedList = (() => {
    switch (sortKey) {
      case "newest":
        return [...ownedByAcquireOrder].reverse();
      case "levelDesc":
        return [...ownedByAcquireOrder].sort(
          (a, b) => levelFromExp(expOf(save.owned[b.id], getViewGrade()), b.rarity) - levelFromExp(expOf(save.owned[a.id], getViewGrade()), a.rarity)
        );
      case "rarityDesc":
        return [...ownedByAcquireOrder].sort((a, b) => RARITY_RANK[b.rarity] - RARITY_RANK[a.rarity]);
      case "oldest":
      default:
        return ownedByAcquireOrder;
    }
  })();

  function startDrag(e, origin, charId, slotIndex) {
    e.preventDefault();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* 対応していない環境では無視 */
    }
    const startX = e.clientX;
    const startY = e.clientY;
    dragRef.current = { origin, charId, slotIndex, startX, startY, moved: false };

    function onMove(ev) {
      const d = dragRef.current;
      if (!d) return;
      const dx = ev.clientX - d.startX;
      const dy = ev.clientY - d.startY;
      if (Math.hypot(dx, dy) > DRAG_THRESHOLD_PX) d.moved = true;
      if (!d.moved) return;
      // fixed の基準を祖先の transform 等から切り離すため、ゴーストは body に Portal する。
      // clientX/Y は viewport 基準なので、スクロール中でも指の中心にそのまま追従する。
      setDragGhost({ charId: d.charId, x: ev.clientX, y: ev.clientY });

      if (d.origin === "bench") {
        let hovered = null;
        for (const slot of PARTY_SLOTS) {
          const el = slotRefs.current[slot];
          if (!el) continue;
          const r = el.getBoundingClientRect();
          if (ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top && ev.clientY <= r.bottom) {
            hovered = slot;
            break;
          }
        }
        hoverSlotRef.current = hovered;
        setHoverSlot(hovered);
      } else {
        const el = benchAreaRef.current;
        let inside = false;
        if (el) {
          const r = el.getBoundingClientRect();
          inside =
            ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top && ev.clientY <= r.bottom;
        }
        benchHoverRef.current = inside;
        setBenchHover(inside);
      }
    }

    function onUp() {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      const d = dragRef.current;
      dragRef.current = null;
      const dropSlot = hoverSlotRef.current;
      const dropOnBench = benchHoverRef.current;
      hoverSlotRef.current = null;
      benchHoverRef.current = false;
      setDragGhost(null);
      setHoverSlot(null);
      setBenchHover(false);

      if (!d) return;
      if (!d.moved) {
        setPopupCharId(d.charId); // 動かさずに離した＝タップ＝ポップアップ表示
        return;
      }
      if (d.origin === "bench" && dropSlot !== null) {
        actions.setPartySlot(dropSlot, d.charId);
      } else if (d.origin === "party" && dropOnBench) {
        actions.setPartySlot(d.slotIndex, null);
      }
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  }

  const popupChar = popupCharId ? charactersById[popupCharId] : null;

  return (
    <div className="mw-fantasy-screen">
      {/* パーティメンバー(上の5枠)は、下にスクロールしても固定で表示し続ける */}
      <div className="mw-party-sticky">
      <div className="mw-fantasy-topbar">
        <button className="mw-fantasy-back" onClick={() => nav.exit()}>
          ← もどる
        </button>
        <span className="mw-fantasy-title" style={{ fontSize: "1.1rem" }}>
          パーティ編成
        </span>
        <span style={{ display: "flex", gap: 6 }}>
          <button className="mw-fantasy-back" onClick={() => nav.go("synth")} aria-label="合成">🔄 合成</button>
          <button className="mw-fantasy-back" onClick={() => nav.go("gacha")} aria-label="ガチャ">🎰 💎{save.crystals}</button>
        </span>
      </div>

      <div className="mw-fantasy-panel">
        <div className="mw-party-row mw-party-row-small mw-party-edit">
          {PARTY_SLOTS.map((slot) => {
            const c = save.party[slot] ? charactersById[save.party[slot]] : null;
            return (
              <button
                key={slot}
                className={`mw-portrait-btn ${hoverSlot === slot ? "mw-slot-drop-hover" : ""}`}
                ref={(el) => {
                  slotRefs.current[slot] = el;
                }}
                onPointerDown={(e) => c && startDrag(e, "party", c.id, slot)}
              >
                <MonsterPortrait character={c} size="small" />
              </button>
            );
          })}
        </div>
      </div>
      </div>

      <div className={`mw-fantasy-panel ${benchHover ? "mw-bench-drop-hover" : ""}`} ref={benchAreaRef}>
        <div className="mw-bench-title">控えメンバー（タップで詳細／ドラッグで上のパーティ枠へ）</div>
        <div className="mw-diff-row" style={{ marginBottom: 10 }}>
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              className={`mw-diff-btn ${sortKey === opt.key ? "selected" : ""}`}
              onClick={() => setSortKey(opt.key)}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div className="mw-bench-grid">
          {ownedList.map((c) => (
            <button key={c.id} className="mw-portrait-btn mw-bench-item" style={{ position: "relative" }} onPointerDown={(e) => startDrag(e, "bench", c.id, null)}>
              <MonsterPortrait character={c} size="small" />
              {save.spares?.[c.id] > 0 && <span className="mw-spare-badge">×{save.spares[c.id] + 1}</span>}
            </button>
          ))}
        </div>
      </div>

      {dragGhost && createPortal(
        <div className="mw-drag-ghost" style={{ left: dragGhost.x, top: dragGhost.y }}>
          <MonsterPortrait character={charactersById[dragGhost.charId]} size="small" frameless />
        </div>,
        document.body
      )}

      {popupChar && createPortal(<CharacterPopup character={popupChar} save={save} onClose={() => setPopupCharId(null)} />, document.body)}
    </div>
  );
}
