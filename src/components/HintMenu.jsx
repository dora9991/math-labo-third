// ============================================================
// HintMenu.jsx — 診断データ(とけた式)を持たない問題用のヒント。
//  選択肢の下の黄色い「ヒント」ボタン → 困り感の一覧 → 押した困り感のヒントを表示。
//  中身は問題の h1（考え方）/ h2（式・計算）を、困り感ごとに割り当てて出す。
// ============================================================
import { useState, useEffect } from "react";
import { UNIT_HINTS } from "../data/unitHints.js";

export default function HintMenu({ problem }) {
  const [open, setOpen] = useState(false);
  const [pick, setPick] = useState(null);
  useEffect(() => { setOpen(false); setPick(null); }, [problem]);

  if (!problem) return null;

  // 単元ごとの「こまりごと」（unitHints.js）＋ この問題そのもののヒント（h1/h2）
  const unitItems = (UNIT_HINTS[problem.unitId] || []).map(([label, text], i) => ({ key: "u" + i, label, text }));
  const items = [
    ...unitItems,
    ...(problem.h1 ? [{ key: "start", label: "この問題、何から手をつければいい？", text: problem.h1 }] : []),
    ...(problem.h2 ? [{ key: "calc", label: "この問題の式・計算を見たい", text: problem.h2 }] : []),
  ];
  const cur = items.find((it) => it.key === pick);
  if (items.length === 0) return null;

  if (!open) {
    return <button className="hint-yellow-btn" data-sfx="none" onClick={() => setOpen(true)}>ヒント</button>;
  }

  return (
    <div className="toketa-hint">
      {!cur && (
        <>
          <div style={{ fontSize: 13, fontWeight: 900, marginBottom: 4 }}>どこで まよってる？ えらんでね 👇</div>
          {items.map((it) => (
            <button key={it.key} className="toketa-hint__pick" onClick={() => setPick(it.key)}>{it.label}</button>
          ))}
        </>
      )}
      {cur && (
        <>
          <div style={{ fontSize: 13, fontWeight: 900 }}>🙋 {cur.label}</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#854d0e", lineHeight: 1.6, margin: "6px 0" }}>💡 {cur.text}</div>
          <button className="toketa-hint__sub" onClick={() => setPick(null)}>ほかのこまりごと</button>
        </>
      )}
    </div>
  );
}
