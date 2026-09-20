// ============================================================
// ToketaHint.jsx — とけた！式の3段ヒント（正負）。
//  ① つまづき選択メニュー（子どもの声）→ ② 対比「くらべてみよう」＋コーチ
//  → ③ お手本ステップを順番に。数式は math-labo の MathText で表示。
//  problem は toketa 問題（{ steps[], distractors[{val,tag}] }）を想定。
// ============================================================
import { useState, useEffect } from "react";
import MathText from "./MathText.jsx";
import { SYM, CONTRAST, hintTags } from "../data/toketa/help.js";
import { MISC } from "../data/toketa/index.js";

const BOX = { background: "#fef9c3", border: "1px solid #fde047", borderRadius: 11, padding: "10px 12px", marginBottom: 11, color: "#854d0e" };
const PICK = { display: "block", width: "100%", textAlign: "left", margin: "5px 0", padding: "9px 11px", borderRadius: 9, border: "1px solid #fcd34d", background: "#fffbeb", color: "#854d0e", fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "inherit" };
const SUBBTN = { padding: "7px 11px", borderRadius: 9, border: "1px solid #fcd34d", background: "#fffbeb", color: "#92400e", fontWeight: 800, fontSize: 12, cursor: "pointer", fontFamily: "inherit" };

function ContrastBox({ data }) {
  return (
    <div style={{ background: "#fffbeb", border: "1px dashed #f59e0b", borderRadius: 9, padding: "8px 10px", margin: "6px 0" }}>
      <div style={{ fontSize: 12, fontWeight: 900, color: "#b45309", marginBottom: 4 }}>⚖️ {data.ttl}</div>
      {data.rows.map((r, i) => (
        <div key={i} style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "baseline", fontSize: 13, padding: "2px 0" }}>
          <span style={{ fontWeight: 800 }}><MathText>{r.e}</MathText></span>
          <span style={{ color: "#16a34a", fontWeight: 900 }}><MathText>{r.v}</MathText></span>
          {r.n && <span style={{ fontSize: 11, color: "#a16207" }}>{r.n}</span>}
        </div>
      ))}
      {data.tip && <div style={{ fontSize: 12, fontWeight: 800, color: "#b45309", marginTop: 4 }}>💡 {data.tip}</div>}
    </div>
  );
}

export default function ToketaHint({ problem, compact = false }) {
  const [reveal, setReveal] = useState(false);
  const [hintTag, setHintTag] = useState(null);
  const [stepN, setStepN] = useState(0);
  // 問題が変わったらリセット
  useEffect(() => { setReveal(false); setHintTag(null); setStepN(0); }, [problem]);

  if (!problem || (!Array.isArray(problem.steps) && !Array.isArray(problem.distractors))) return null;
  const tags = hintTags(problem);
  const steps = problem.steps || [];

  if (!reveal) {
    return (
      <button className="rbtn s" style={{ fontSize: 12, padding: "7px 13px", marginBottom: 11 }} onClick={() => setReveal(true)}>
        💡 ヒントを見る
      </button>
    );
  }

  return (
    <div style={BOX}>
      {/* ① つまづき選択メニュー */}
      {!hintTag && stepN === 0 && (
        <>
          <div style={{ fontSize: 13, fontWeight: 900, marginBottom: 4 }}>どこで まよってる？ えらんでね 👇</div>
          {tags.map((tag) => (
            // 「計算ミス」は抽象的な励ましではなく、具体的なお手本（式の計算）へ直行する
            <button key={tag} style={PICK} onClick={() => (tag === "calc" ? setStepN(1) : setHintTag(tag))}>{SYM[tag] || (MISC[tag]?.label ? `「${MISC[tag].label}」かも` : "ここ かも")}</button>
          ))}
          <button style={{ ...PICK, background: "#eef2ff", border: "1px solid #c7d2fe", color: "#3730a3" }} onClick={() => setStepN(1)}>🪜 解き方を じゅんばんに見る（お手本）</button>
        </>
      )}

      {/* ② 対比＋コーチ */}
      {hintTag && (
        <>
          <div style={{ fontSize: 13, fontWeight: 900 }}>🙋 {SYM[hintTag] || MISC[hintTag]?.label}</div>
          {MISC[hintTag]?.coach && <div style={{ fontSize: 13, fontWeight: 700, margin: "4px 0" }}>🧭 {MISC[hintTag].coach}</div>}
          {CONTRAST[hintTag] && <ContrastBox data={CONTRAST[hintTag]} />}
          <div style={{ display: "flex", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
            <button style={SUBBTN} onClick={() => setHintTag(null)}>← ほかのつまづき</button>
            {steps.length > 0 && stepN === 0 && <button style={SUBBTN} onClick={() => setStepN(1)}>🪜 お手本も見る</button>}
          </div>
        </>
      )}

      {/* ③ お手本ステップ */}
      {stepN > 0 && (
        <div style={{ marginTop: hintTag ? 8 : 0 }}>
          {steps.slice(0, stepN).map((s, i) => (
            <div key={i} style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.6, padding: "2px 0" }}>💡 <MathText>{s}</MathText></div>
          ))}
          {stepN < steps.length && (
            <button style={{ ...SUBBTN, marginTop: 6 }} onClick={() => setStepN((v) => Math.min(steps.length, v + 1))}>▼ もうちょっと</button>
          )}
        </div>
      )}
    </div>
  );
}
