// ============================================================
// ChapterTag.jsx — 章名の横に出す「部類」ラベル（計算／関数・グラフ／図形／データ）
//  例：正の数と負の数 [計算]。章の色が背景でも読めるよう、うすい黒地のピルにする。
// ============================================================
import { chapterTag } from "../data/index.js";

export default function ChapterTag({ chapter, style }) {
  const t = chapterTag(chapter);
  if (!t) return null;
  return (
    <span style={{
      display: "inline-block", verticalAlign: "middle", marginLeft: 6, padding: "1px 7px", borderRadius: 999,
      fontSize: 10, fontWeight: 900, lineHeight: 1.5, whiteSpace: "nowrap",
      color: t.color, background: "rgba(10,10,30,.55)", border: `1px solid ${t.color}88`,
      ...style,
    }}>{t.label}</span>
  );
}
