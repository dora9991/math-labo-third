// ============================================================
// WhyBox.jsx — まちがえたとき／「わからない」のあとに出す「なぜ？」の説明。
//  ・とけた式の問題：選んだ誤答のつまづき(コーチ)＋お手本ステップ
//  ・それ以外：問題の考え方(h1)と式・計算(h2)、単元のこまりごと(先頭1つ)
//  ヒントで見せる内容と同じ材料を、答えのあとに自動で見せる。
// ============================================================
import MathText from "./MathText.jsx";
import { MISC } from "../data/toketa/index.js";
import { CONTRAST } from "../data/toketa/help.js";

export default function WhyBox({ problem, mistakeTag = null }) {
  if (!problem) return null;
  const tagInfo = mistakeTag ? MISC[mistakeTag] : null;
  const steps = Array.isArray(problem.steps) ? problem.steps : [];
  const hasBody = !!(tagInfo || steps.length || problem.h1 || problem.h2);
  if (!hasBody) return null;

  return (
    <div className="toketa-hint why-box" style={{ margin: "10px 0" }}>
      <div style={{ fontSize: 13, fontWeight: 900, marginBottom: 4 }}>🔍 なぜそうなる？</div>
      {tagInfo?.label && <div style={{ fontSize: 13, fontWeight: 800 }}>🙋 「{tagInfo.label}」かも</div>}
      {tagInfo?.coach && <div style={{ fontSize: 13, fontWeight: 700, margin: "4px 0" }}>🧭 {tagInfo.coach}</div>}
      {mistakeTag && CONTRAST[mistakeTag] && (
        <div className="toketa-hint__contrast">
          <div style={{ fontSize: 12, fontWeight: 900, color: "#b45309", marginBottom: 4 }}>⚖️ {CONTRAST[mistakeTag].ttl}</div>
          {CONTRAST[mistakeTag].rows.map((r, i) => (
            <div key={i} style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "baseline", fontSize: 13 }}>
              <span style={{ fontWeight: 800 }}><MathText>{r.e}</MathText></span>
              <span style={{ color: "#16a34a", fontWeight: 900 }}><MathText>{r.v}</MathText></span>
              {r.n && <span style={{ fontSize: 11, color: "#a16207" }}>{r.n}</span>}
            </div>
          ))}
        </div>
      )}
      {steps.length > 0
        ? steps.map((s, i) => <div key={i} style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.6 }}>💡 <MathText>{s}</MathText></div>)
        : (
          <>
            {problem.h1 && <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.6 }}>💡 考え方：{problem.h1}</div>}
            {problem.h2 && <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.6 }}>✏️ 式・計算：{problem.h2}</div>}
          </>
        )}
    </div>
  );
}
