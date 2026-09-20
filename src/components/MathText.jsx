// ============================================================
// MathText.jsx — 数学テキストの表示（分数を上下に重ねて表示する）
//
//  問題文・選択肢・答えに含まれる「a/b」を、横棒つきの縦書き分数で表示する。
//  例： "x=2, y=−1/2" → 「x=2, y=−」＋（1 を 2 の上に重ねた分数）
//       "x/3+y/2=1"   → 分数(x/3) + "+" + 分数(y/2) + "=1"
//
//  分子・分母は「数字／かっこの式／1文字の英字・π・√」を対象にする。
//  （km/h のような単位や英単語の / は中学数学の問題文には出ないため、実害なし）
// ============================================================

// 分子・分母になれるトークン：数字 / (かっこの式) / 1文字（英字・π・√）
const TOKEN = "(?:\\d+|\\([^()]+\\)|[A-Za-zπ√])";
// 符号(任意) + 分子 + "/" + 分母
const FRAC_RE = new RegExp(`([-−])?(${TOKEN})\\/(${TOKEN})`, "g");

function Frac({ num, den }) {
  return (
    <span style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", justifyContent: "center", verticalAlign: "middle", margin: "0 .12em", lineHeight: 1.05 }}>
      <span style={{ padding: "0 .2em", fontSize: ".82em" }}>{num}</span>
      <span style={{ borderTop: "1.5px solid currentColor", padding: "0 .2em", fontSize: ".82em", width: "100%", textAlign: "center" }}>{den}</span>
    </span>
  );
}

/** 文字列を、分数だけ縦書きにしたReact要素に変換して表示する。 */
export default function MathText({ children, style }) {
  const s = children == null ? "" : String(children);
  if (!s) return <span style={style} />;

  const parts = [];
  let last = 0;
  let m;
  FRAC_RE.lastIndex = 0;
  let key = 0;
  while ((m = FRAC_RE.exec(s)) !== null) {
    const [whole, sign, num, den] = m;
    if (m.index > last) parts.push(s.slice(last, m.index));
    if (sign) parts.push(sign);
    parts.push(<Frac key={key++} num={num} den={den} />);
    last = m.index + whole.length;
  }
  if (last < s.length) parts.push(s.slice(last));

  return <span style={style}>{parts}</span>;
}
