// ============================================================
// QuestionText.jsx — 問題文の表示（★5：よみあげ・ふりがな対応）
//
//  furigana=true → 数学用語にルビ（ふりがな）を付けて表示（reading.js の辞書）。
//                  ※ふりがな表示中は分数の縦書きは行わない（読みやすさ優先）。
//  furigana=false → これまで通り MathText（分数を縦書き）で表示。
//  readAloud=true → 新しい問題が出るたびに自動で読み上げる。
//  いつでも 🔊 ボタンで読み上げ／止める（設定OFFでも手動で聞ける）。
// ============================================================
import { useEffect, useRef } from "react";
import MathText from "./MathText.jsx";
import { rubyParts, speakText, stopSpeak, speechAvailable } from "../engine/reading.js";

function RubyText({ text }) {
  const parts = rubyParts(text);
  return (
    <span>
      {parts.map((p, i) =>
        typeof p === "string"
          ? <span key={i}>{p}</span>
          : <ruby key={i}>{p.b}<rt style={{ fontSize: ".55em", fontWeight: 700, color: "#6d28d9" }}>{p.r}</rt></ruby>
      )}
    </span>
  );
}

export default function QuestionText({ text, furigana = false, readAloud = false, style, showButton = true }) {
  const canSpeak = speechAvailable();

  // 新しい問題になったら（readAloud=ON のとき）自動で読み上げ
  const lastRef = useRef(null);
  useEffect(() => {
    if (readAloud && canSpeak && text && text !== lastRef.current) {
      lastRef.current = text;
      speakText(text);
    }
    return () => stopSpeak();
  }, [text, readAloud, canSpeak]);

  return (
    <span style={style}>
      {furigana ? <RubyText text={text} /> : <MathText>{text}</MathText>}
      {showButton && canSpeak && (
        <button
          type="button" data-sfx="none" title="読み上げ"
          onClick={(e) => { e.stopPropagation(); speakText(text); }}
          style={{
            marginLeft: 8, verticalAlign: "middle", border: "none", cursor: "pointer",
            background: "rgba(99,102,241,.14)", borderRadius: 9, padding: "3px 8px", fontSize: ".7em",
          }}
        >🔊</button>
      )}
    </span>
  );
}
