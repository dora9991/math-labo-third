// ============================================================
// ThirdDex.jsx — 図鑑。仲間になったことがある子（state.dex）だけ絵柄と名前が見える。
//  まだ出会っていない子は「？？？」のシルエット。合成で手放しても図鑑には残る（core.js の dex）。
//  レア度タブで絞り込み。タップで詳細（強さ・スキル・耐性）のポップアップを開く。
// ============================================================
import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useGame } from "../ThirdContext.jsx";
import { SPECIALIST_ROSTER } from "../specialistRoster.js";
import MonsterPortrait from "../components/MonsterPortrait.jsx";
import CharacterPopup from "../components/CharacterPopup.jsx";
import "./dex.css";

const RARITY_TABS = ["all", "N", "R", "SR", "UR"];
const RARITY_LABEL = { all: "すべて", N: "N", R: "R", SR: "SR", UR: "UR" };
const RARITY_RANK = { N: 0, R: 1, SR: 2, UR: 3 };
const SORTED = [...SPECIALIST_ROSTER].sort((a, b) => RARITY_RANK[b.rarity] - RARITY_RANK[a.rarity] || a.id.localeCompare(b.id));

export default function ThirdDex({ nav }) {
  const { save, charactersById } = useGame();
  const [tab, setTab] = useState("all");
  const [popupCharId, setPopupCharId] = useState(null);
  const dex = save.dex || {};

  const gotCount = useMemo(() => SPECIALIST_ROSTER.filter((c) => dex[c.id]).length, [dex]);
  const byRarity = useMemo(() => {
    const m = { N: [0, 0], R: [0, 0], SR: [0, 0], UR: [0, 0] };
    for (const c of SPECIALIST_ROSTER) { m[c.rarity][1]++; if (dex[c.id]) m[c.rarity][0]++; }
    return m;
  }, [dex]);
  const list = tab === "all" ? SORTED : SORTED.filter((c) => c.rarity === tab);

  return (
    <div className="app dx-app">
      <div className="dx-top">
        <button className="dx-back" onClick={() => nav.exit()} data-sfx="none">← もどる</button>
        <div className="dx-title">📖 図鑑</div>
        <div className="dx-count">{gotCount} / {SPECIALIST_ROSTER.length}体</div>
      </div>

      <div className="dx-tabs" role="tablist">
        {RARITY_TABS.map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} className={`dx-tab dx-tab-${t} ${tab === t ? "on" : ""}`} onClick={() => setTab(t)} data-sfx="none">
            {RARITY_LABEL[t]}
            {t !== "all" && <small>{byRarity[t][0]}/{byRarity[t][1]}</small>}
          </button>
        ))}
      </div>

      <div className="dx-grid">
        {list.map((c) => {
          const got = !!dex[c.id];
          const owned = !!save.owned[c.id];
          const spares = save.spares?.[c.id] || 0;
          return (
            <button
              key={c.id}
              className={`dx-cell ${got ? "" : "is-unknown"}`}
              data-sfx="none"
              onClick={() => got && setPopupCharId(c.id)}
            >
              <MonsterPortrait character={got ? charactersById[c.id] : { rarity: c.rarity }} size="small" />
              <div className="dx-cell-name">{got ? c.name : "？？？"}</div>
              {got && <div className="dx-cell-sub">{owned ? "なかま" : spares > 0 ? `予備×${spares}` : "図鑑のみ"}</div>}
            </button>
          );
        })}
      </div>

      {popupCharId && createPortal(
        <CharacterPopup character={charactersById[popupCharId]} save={save} onClose={() => setPopupCharId(null)} />,
        document.body
      )}
    </div>
  );
}
