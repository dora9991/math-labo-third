// ============================================================
// c3_houteishiki.js — 中1「方程式」
// 小テスト準拠：解き方の基本／小数・分数／両辺に項／比例式／文章題
// 答えはすべて「x の値」など数値。
// ============================================================
const p = (id, build) => ({ id, build });

export const chapter = {
  id: "c3",
  name: "方程式",
  emoji: "⚖️",
  color: "#fb923c",
  grade: 1,
  units: [
    {
      id: "e1",
      name: "方程式の解き方①",
      emoji: "🔑",
      desc: "移項の基本",
      problems: {
        easy: [
          p("e1e1", (r) => { const x = r(1, 10), b = r(1, 9); return { q: `x+${b}=${x + b}　x=？`, ans: x, h1: `${b}を右辺へ移項`, h2: `x=${x + b}-${b}=${x}` }; }),
          p("e1e2", (r) => { const x = r(1, 10), b = r(1, 9); return { q: `x-${b}=${x - b}　x=？`, ans: x, h1: `-${b}を移項`, h2: `x=${x - b}+${b}=${x}` }; }),
          p("e1e3", (r) => { const x = r(1, 10), a = r(2, 5); return { q: `${a}x=${a * x}　x=？`, ans: x, h1: `両辺を${a}で割る`, h2: `x=${a * x}÷${a}=${x}` }; }),
          p("e1e4", (r) => { const x = r(1, 8), b = r(x, 12); return { q: `${b}-x=${b - x}　x=？`, ans: x, h1: "xを右辺、数を左辺へ移項", h2: `x=${b}-${b - x}=${x}` }; }),
          p("e1e5", (r) => { const x = r(1, 10), b = r(1, 9); return { q: `${b}+x=${x + b}　x=？`, ans: x, h1: `${b}を右辺へ移項`, h2: `x=${x + b}-${b}=${x}` }; }),
          p("e1e6", (r) => { const x = r(2, 9), a = r(2, 6); return { q: `${a}x=${a * x}　x=？`, ans: x, h1: `両辺を${a}で割る`, h2: `x=${a * x}÷${a}=${x}` }; }),
          p("e1e7", (r) => { const x = r(1, 9), b = r(1, 8); return { q: `x-${b}=${x - b}　x=？`, ans: x, h1: `-${b}を移項`, h2: `x=${x - b}+${b}=${x}` }; }),
          p("e1e8", (r) => { const x = r(1, 9), b = r(1, 9); return { q: `x+${b}=${x + b}　x=？`, ans: x, h1: `${b}を移項`, h2: `x=${x + b}-${b}=${x}` }; }),
          p("e1e9", (r) => { const x = r(2, 8), a = r(2, 5); return { q: `-${a}x=${-a * x}　x=？`, ans: x, h1: `両辺を-${a}で割る`, h2: `x=${-a * x}÷(-${a})=${x}` }; }),
          p("e1e10", (r) => { const x = r(1, 9), b = r(1, 9); return { q: `x+${b}=${x + b}　x=？`, ans: x, h1: `${b}を右辺へ`, h2: `x=${x}` }; }),
        ],
        standard: [
          p("e1s1", (r) => { const x = r(1, 10), a = r(2, 5), b = r(1, 8); return { q: `${a}x+${b}=${a * x + b}　x=？`, ans: x, h1: `${b}を移項`, h2: `${a}x=${a * x} → x=${x}` }; }),
          p("e1s2", (r) => { const x = r(1, 8), a = r(2, 4), b = r(1, 6); return { q: `${a}x-${b}=${a * x - b}　x=？`, ans: x, h1: `-${b}を移項`, h2: `${a}x=${a * x} → x=${x}` }; }),
          p("e1s3", (r) => { const x = r(1, 8), a = r(2, 3), b = r(1, 6); return { q: `${a}(x-${b})=${a * (x - b)}　x=？`, ans: x, h1: "展開してから", h2: `${a}x-${a * b}=${a * (x - b)} → x=${x}` }; }),
          p("e1s4", (r) => { const x = r(1, 6), a = r(2, 4), b = r(a * x, a * x + 9); return { q: `${b}-${a}x=${b - a * x}　x=？`, ans: x, h1: `${a}xを右辺、数を左辺へ移項`, h2: `${a}x=${a * x} → x=${x}` }; }),
          p("e1s5", (r) => { const x = r(1, 9), a = r(2, 5), b = r(1, 7); return { q: `${a}x+${b}=${a * x + b}　x=？`, ans: x, h1: `${b}を移項`, h2: `${a}x=${a * x} → x=${x}` }; }),
          p("e1s6", (r) => { const x = r(1, 8), a = r(3, 6), b = r(1, 8); return { q: `${a}x-${b}=${a * x - b}　x=？`, ans: x, h1: `-${b}を移項`, h2: `${a}x=${a * x} → x=${x}` }; }),
          p("e1s7", (r) => { const x = r(1, 7), a = r(2, 4), b = r(1, 5); return { q: `${a}(x+${b})=${a * (x + b)}　x=？`, ans: x, h1: "展開してから", h2: `${a}x+${a * b}=${a * (x + b)} → x=${x}` }; }),
          p("e1s8", (r) => { const x = r(2, 8), a = r(2, 5); return { q: `${a}x+${a}=${a * x + a}　x=？`, ans: x, h1: `${a}を移項`, h2: `${a}x=${a * x} → x=${x}` }; }),
          p("e1s9", (r) => { const x = r(1, 8), a = r(2, 4), b = r(1, 6); return { q: `${b}+${a}x=${b + a * x}　x=？`, ans: x, h1: `${b}を移項`, h2: `${a}x=${a * x} → x=${x}` }; }),
          p("e1s10", (r) => { const x = r(1, 7), a = r(2, 4), b = r(1, 6); return { q: `${a}x-${b}=${a * x - b}　x=？`, ans: x, h1: `-${b}を移項`, h2: `${a}x=${a * x} → x=${x}` }; }),
        ],
        advanced: [
          p("e1a1", (r) => { const x = r(2, 6), a = r(2, 3), b = r(1, 4); return { q: `${a}(x+${b})-${b}=${a * x + a * b - b}　x=？`, ans: x, h1: "左辺を展開", h2: `${a}x=${a * x} → x=${x}` }; }),
          p("e1a2", (r) => { const x = r(1, 5), a = r(2, 4), b = r(2, 4), c = r(1, 4); return { q: `${a}x-(${b}x-${c})=${a * x - (b * x - c)}　x=？`, ans: x, h1: "括弧を外す", h2: `${a - b}x+${c}=… → x=${x}`, skip: a === b }; }),
          p("e1a3", (r) => { const x = r(2, 6), a = r(2, 4), b = r(1, 5); return { q: `${a}(x+${b})=${a * (x + b)}　x=？`, ans: x, h1: "左辺を展開", h2: `${a}x+${a * b}=${a * (x + b)} → x=${x}` }; }),
          p("e1a4", (r) => { const x = r(2, 6), b = r(1, 5); return { q: `2(x+${b})+3(x-${b})=${5 * x - b}　x=？`, ans: x, h1: "展開してまとめる", h2: `5x-${b}=${5 * x - b} → x=${x}` }; }),
          p("e1a5", (r) => { const x = r(2, 6), a = r(2, 3), b = r(1, 4); return { q: `${a}(x-${b})+${b}=${a * (x - b) + b}　x=？`, ans: x, h1: "左辺を展開", h2: `${a}x-${a * b - b}=… → x=${x}` }; }),
          p("e1a6", (r) => { const x = r(2, 6), a = r(2, 4), b = r(1, 4), c = r(1, 4); return { q: `${a}(x+${b})+${c}=${a * (x + b) + c}　x=？`, ans: x, h1: "左辺を展開", h2: `${a}x+${a * b + c}=… → x=${x}` }; }),
          p("e1a7", (r) => { const x = r(2, 5), b = r(1, 4); return { q: `3(x+${b})-2(x-${b})=${x + 5 * b}　x=？`, ans: x, h1: "展開してまとめる", h2: `x+${5 * b}=${x + 5 * b} → x=${x}` }; }),
          p("e1a8", (r) => { const x = r(2, 6), a = r(2, 4), b = r(1, 3), c = r(1, 4); return { q: `${a}(x-${b})-${c}=${a * (x - b) - c}　x=？`, ans: x, h1: "左辺を展開", h2: `${a}x-${a * b + c}=… → x=${x}` }; }),
          p("e1a9", (r) => { const x = r(2, 6), a = r(2, 4), b = r(1, 4), c = r(1, 3); return { q: `${a}(x+${b})-${c}(x+${b})=${(a - c) * (x + b)}　x=？`, ans: x, h1: "共通の(x+b)でまとめる", h2: `${a - c}(x+${b})=${(a - c) * (x + b)} → x=${x}`, skip: a === c }; }),
          p("e1a10", (r) => { const x = r(2, 6), b = r(1, 4); return { q: `2(x+${b})+3(x+${b})=${5 * x + 5 * b}　x=？`, ans: x, h1: "展開してまとめる", h2: `5x+${5 * b}=${5 * x + 5 * b} → x=${x}` }; }),
        ],
      },
    },
    {
      id: "e2",
      name: "方程式の解き方②",
      emoji: "🔓",
      desc: "小数・分数の方程式",
      problems: {
        easy: [
          p("e2e1", (r) => { const x = r(2, 8), a = r(2, 4); return { q: `x/${a}=${x / a}　x=？`, ans: x, h1: `両辺に${a}をかける`, h2: `x=${x / a}×${a}=${x}`, skip: x % a !== 0 }; }),
          p("e2e2", (r) => { const x = r(2, 8), a = r(2, 4), b = r(1, 6); return { q: `x/${a}+${b}=${x / a + b}　x=？`, ans: x, h1: `${b}を移項→${a}倍`, h2: `x/${a}=${x / a} → x=${x}`, skip: x % a !== 0 }; }),
          p("e2e3", (r) => { const x = r(2, 9), a = r(2, 5); return { q: `0.${a}x=${(0.1 * a * x).toFixed(1)}　x=？`, ans: x, h1: "両辺を10倍する", h2: `${a}x=${a * x} → x=${x}` }; }),
          p("e2e4", (r) => { const x = r(2, 8), a = r(2, 4); return { q: `x/${a}-1=${x / a - 1}　x=？`, ans: x, h1: `1を移項→${a}倍`, h2: `x/${a}=${x / a} → x=${x}`, skip: x % a !== 0 }; }),
          p("e2e5", (r) => { const x = r(2, 9), a = r(2, 5); return { q: `x/${a}=${x / a}　x=？`, ans: x, h1: `両辺に${a}をかける`, h2: `x=${x / a}×${a}=${x}`, skip: x % a !== 0 }; }),
          p("e2e6", (r) => { const x = r(2, 9), a = r(2, 5); return { q: `0.${a}x=${(0.1 * a * x).toFixed(1)}　x=？`, ans: x, h1: "両辺を10倍する", h2: `${a}x=${a * x} → x=${x}` }; }),
          p("e2e7", (r) => { const x = r(2, 8), a = r(2, 4), b = r(1, 5); return { q: `x/${a}-${b}=${x / a - b}　x=？`, ans: x, h1: `${b}を移項→${a}倍`, h2: `x/${a}=${x / a} → x=${x}`, skip: x % a !== 0 }; }),
          p("e2e8", (r) => { const x = r(2, 8), a = r(2, 4), b = r(1, 5); return { q: `x/${a}+${b}=${x / a + b}　x=？`, ans: x, h1: `${b}を移項→${a}倍`, h2: `x/${a}=${x / a} → x=${x}`, skip: x % a !== 0 }; }),
          p("e2e9", (r) => { const x = r(2, 9), a = r(2, 5); return { q: `0.${a}x=${(0.1 * a * x).toFixed(1)}　x=？`, ans: x, h1: "両辺を10倍", h2: `${a}x=${a * x} → x=${x}` }; }),
          p("e2e10", (r) => { const x = r(2, 8), a = r(2, 4); return { q: `x/${a}+2=${x / a + 2}　x=？`, ans: x, h1: `2を移項→${a}倍`, h2: `x/${a}=${x / a} → x=${x}`, skip: x % a !== 0 }; }),
        ],
        standard: [
          p("e2s1", (r) => { const x = r(2, 8), a = r(2, 3), b = r(1, 4); return { q: `(x+${b})/${a}=${(x + b) / a}　x=？`, ans: x, h1: `両辺に${a}をかける`, h2: `x+${b}=${x + b} → x=${x}`, skip: (x + b) % a !== 0 }; }),
          p("e2s2", (r) => { const x = r(2, 8), a = r(2, 4); return { q: `0.${a}x=${(0.1 * a * x).toFixed(1)}　x=？`, ans: x, h1: `両辺を10倍`, h2: `${a}x=${a * x} → x=${x}` }; }),
          // バリエーション追加（同じ問題ばかりにならないよう小数・分数の標準を増やす）
          p("e2s3", (r) => { const x = r(2, 6), a = r(2, 4); return { q: `x/${a}-${1}=${x / a - 1}　x=？`, ans: x, h1: `両辺に${a}をかける`, h2: `x-${a}=${x - a} → x=${x}`, skip: x % a !== 0 }; }),
          p("e2s4", (r) => { const x = r(2, 8), a = r(2, 5); const c = (0.1 * a * x); return { q: `0.${a}x+1=${(c + 1).toFixed(1)}　x=？`, ans: x, h1: `1を移項→10倍`, h2: `${a}x=${a * x} → x=${x}` }; }),
          p("e2s5", (r) => { const x = r(2, 6), a = r(2, 3); return { q: `(x-${1})/${a}=${(x - 1) / a}　x=？`, ans: x, h1: `両辺に${a}をかける`, h2: `x-1=${x - 1} → x=${x}`, skip: (x - 1) % a !== 0 }; }),
          p("e2s6", (r) => { const x = r(2, 8), a = r(2, 4), b = r(1, 4); return { q: `(x+${b})/${a}=${(x + b) / a}　x=？`, ans: x, h1: `両辺に${a}をかける`, h2: `x+${b}=${x + b} → x=${x}`, skip: (x + b) % a !== 0 }; }),
          p("e2s7", (r) => { const x = r(2, 8), a = r(2, 5); const c = (0.1 * a * x); return { q: `0.${a}x-1=${(c - 1).toFixed(1)}　x=？`, ans: x, h1: `1を移項→10倍`, h2: `${a}x=${a * x} → x=${x}` }; }),
          p("e2s8", (r) => { const x = r(2, 6), a = r(2, 4), b = r(1, 4); return { q: `x/${a}+${b}=${x / a + b}　x=？`, ans: x, h1: `${b}を移項→${a}倍`, h2: `x/${a}=${x / a} → x=${x}`, skip: x % a !== 0 }; }),
          p("e2s9", (r) => { const x = r(2, 8), a = r(2, 5); const c = (0.1 * a * x); return { q: `0.${a}x+2=${(c + 2).toFixed(1)}　x=？`, ans: x, h1: `2を移項→10倍`, h2: `${a}x=${a * x} → x=${x}` }; }),
          p("e2s10", (r) => { const x = r(2, 7), a = r(2, 3); return { q: `(x+2)/${a}=${(x + 2) / a}　x=？`, ans: x, h1: `両辺に${a}をかける`, h2: `x+2=${x + 2} → x=${x}`, skip: (x + 2) % a !== 0 }; }),
        ],
        advanced: [
          p("e2a1", () => { return { q: `x/2-x/3=1　x=？`, ans: 6, h1: "両辺×6", h2: "3x-2x=6 → x=6" }; }),
          p("e2a2", () => { return { q: `x/2=(x+2)/3　x=？`, ans: 4, h1: "両辺×6", h2: "3x=2x+4 → x=4" }; }),
          p("e2a3", () => { return { q: `(x-1)/2=(x-4)/3　x=？`, ans: -5, h1: "両辺×6", h2: "3(x-1)=2(x-4) → 3x-3=2x-8 → x=-5" }; }),
          p("e2a4", () => { return { q: `0.5x-1=0.2x+0.5　x=？`, ans: 5, h1: "両辺×10", h2: "5x-10=2x+5 → 3x=15 → x=5" }; }),
          p("e2a5", () => { return { q: `x/3+x/2=5　x=？`, ans: 6, h1: "両辺×6", h2: "2x+3x=30 → 5x=30 → x=6" }; }),
          p("e2a6", () => { return { q: `x/4=(x-3)/2　x=？`, ans: 6, h1: "両辺×4", h2: "x=2(x-3) → x=2x-6 → x=6" }; }),
          p("e2a7", () => { return { q: `(x+1)/2=(x+5)/4　x=？`, ans: 3, h1: "両辺×4", h2: "2(x+1)=x+5 → 2x+2=x+5 → x=3" }; }),
          p("e2a8", () => { return { q: `0.3x+0.5=0.1x+1.1　x=？`, ans: 3, h1: "両辺×10", h2: "3x+5=x+11 → 2x=6 → x=3" }; }),
          p("e2a9", () => { return { q: `0.2(x-1)=0.5x-2　x=？`, ans: 6, h1: "両辺×10", h2: "2(x-1)=5x-20 → 2x-2=5x-20 → -3x=-18 → x=6" }; }),
          p("e2a10", () => { return { q: `(2x-1)/3=(x+2)/2　x=？`, ans: 8, h1: "両辺×6", h2: "2(2x-1)=3(x+2) → 4x-2=3x+6 → x=8" }; }),
        ],
      },
    },
    {
      id: "e3",
      name: "両辺に文字がある式",
      emoji: "↔️",
      desc: "文字を左辺に集める",
      problems: {
        easy: [
          p("e3e1", (r) => { const x = r(2, 8), a = r(3, 6), c = r(2, a - 1); return { q: `${a}x=${c}x+${(a - c) * x}　x=？`, ans: x, h1: "文字を左辺へ", h2: `${a - c}x=${(a - c) * x} → x=${x}` }; }),
          p("e3e2", (r) => { const x = r(1, 6); return { q: `11x=2x+${9 * x}　x=？`, ans: x, h1: "9x=…", h2: `9x=${9 * x} → x=${x}` }; }),
          p("e3e3", (r) => { const x = r(2, 6), a = r(3, 6), c = r(1, a - 1); return { q: `${a}x-${(a - c) * x}=${c}x　x=？`, ans: x, h1: "文字を左、数を右へ", h2: `${a - c}x=${(a - c) * x} → x=${x}` }; }),
          p("e3e4", (r) => { const x = r(2, 7); return { q: `8x=3x+${5 * x}　x=？`, ans: x, h1: "5x=…", h2: `5x=${5 * x} → x=${x}` }; }),
          p("e3e5", (r) => { const x = r(2, 8), a = r(4, 7), c = r(1, a - 2); return { q: `${a}x=${c}x+${(a - c) * x}　x=？`, ans: x, h1: "文字を左辺へ", h2: `${a - c}x=${(a - c) * x} → x=${x}` }; }),
          p("e3e6", (r) => { const x = r(2, 6); return { q: `10x=4x+${6 * x}　x=？`, ans: x, h1: "6x=…", h2: `6x=${6 * x} → x=${x}` }; }),
          p("e3e7", (r) => { const x = r(2, 7), a = r(4, 7), c = r(1, a - 2); return { q: `${a}x-${(a - c) * x}=${c}x　x=？`, ans: x, h1: "文字を左、数を右へ", h2: `${a - c}x=${(a - c) * x} → x=${x}` }; }),
          p("e3e8", (r) => { const x = r(2, 6); return { q: `9x=5x+${4 * x}　x=？`, ans: x, h1: "4x=…", h2: `4x=${4 * x} → x=${x}` }; }),
          p("e3e9", (r) => { const x = r(2, 7), a = r(3, 6), c = r(1, a - 1); return { q: `${c}x+${(a - c) * x}=${a}x　x=？`, ans: x, h1: "両辺の文字を比べる", h2: `${a - c}x=${(a - c) * x} → x=${x}` }; }),
          p("e3e10", (r) => { const x = r(2, 6); return { q: `7x=4x+${3 * x}　x=？`, ans: x, h1: "3x=…", h2: `3x=${3 * x} → x=${x}` }; }),
        ],
        standard: [
          p("e3s1", (r) => { const x = r(1, 6), a = r(3, 5), b = r(1, 6), c = r(1, a - 1); return { q: `${a}x+${b}=${c}x+${(a - c) * x + b}　x=？`, ans: x, h1: "文字を左、数を右へ", h2: `${a - c}x=${(a - c) * x} → x=${x}` }; }),
          p("e3s2", (r) => { const x = r(2, 6); return { q: `6x+3=2x+${4 * x + 3}　x=？`, ans: x, h1: "4x=…", h2: `4x=${4 * x} → x=${x}` }; }),
          p("e3s3", (r) => { const x = r(2, 6), a = r(3, 6), c = r(1, a - 1), d = r(1, 5); const b = d + (a - c) * x; return { q: `${a}x-${b}=${c}x-${d}　x=？`, ans: x, h1: "文字を左、数を右へ移項", h2: `${a - c}x=${(a - c) * x} → x=${x}` }; }),
          p("e3s4", (r) => { const x = r(2, 6); return { q: `7x-4=3x+${4 * x - 4}　x=？`, ans: x, h1: "4x=…", h2: `4x=${4 * x} → x=${x}` }; }),
          p("e3s5", (r) => { const x = r(1, 6), a = r(4, 6), b = r(1, 6), c = r(1, a - 2); return { q: `${a}x+${b}=${c}x+${(a - c) * x + b}　x=？`, ans: x, h1: "文字を左、数を右へ", h2: `${a - c}x=${(a - c) * x} → x=${x}` }; }),
          p("e3s6", (r) => { const x = r(2, 6); return { q: `5x+2=2x+${3 * x + 2}　x=？`, ans: x, h1: "3x=…", h2: `3x=${3 * x} → x=${x}` }; }),
          p("e3s7", (r) => { const x = r(2, 6), a = r(4, 6), c = r(1, a - 2), d = r(1, 5); const b = d + (a - c) * x; return { q: `${a}x-${b}=${c}x-${d}　x=？`, ans: x, h1: "文字を左、数を右へ移項", h2: `${a - c}x=${(a - c) * x} → x=${x}` }; }),
          p("e3s8", (r) => { const x = r(2, 6); return { q: `8x-5=4x+${4 * x - 5}　x=？`, ans: x, h1: "4x=…", h2: `4x=${4 * x} → x=${x}` }; }),
          p("e3s9", (r) => { const x = r(2, 5), a = r(3, 5), b = r(1, 5), c = r(1, a - 1); return { q: `${a}x-${b}=${c}x+${(a - c) * x - b}　x=？`, ans: x, h1: "文字を左、数を右へ", h2: `${a - c}x=${(a - c) * x} → x=${x}` }; }),
          p("e3s10", (r) => { const x = r(2, 6); return { q: `9x+1=5x+${4 * x + 1}　x=？`, ans: x, h1: "4x=…", h2: `4x=${4 * x} → x=${x}` }; }),
        ],
        advanced: [
          p("e3a1", (r) => { const x = r(2, 6), a = r(2, 3), b = r(1, 4), c = r(2, 4); const rhs = a * x + b; const dd = rhs - c * x; const rhsStr = dd === 0 ? `${c}x` : dd > 0 ? `${c}x+${dd}` : `${c}x-${-dd}`; return { q: `${a}x+${b}=${rhsStr}　x=？`, ans: x, h1: "移項して整理", h2: `x=${x}`, skip: a === c }; }),
          p("e3a2", (r) => { const x = r(2, 6), a = r(3, 5), c = r(1, a - 1), b = r(1, 4); const e = (a - c) * x - a * b; const rhsStr = e >= 0 ? `${c}x+${e}` : `${c}x-${-e}`; return { q: `${a}(x-${b})=${rhsStr}　x=？`, ans: x, h1: "左辺を展開して移項", h2: `${a}x-${a * b}=… → x=${x}` }; }),
          p("e3a3", (r) => { const x = r(2, 6), a = r(3, 5), c = r(1, a - 1), b = r(1, 4); const e = (a - c) * x + a * b; return { q: `${a}(x+${b})=${c}x+${e}　x=？`, ans: x, h1: "左辺を展開して移項", h2: `${a}x+${a * b}=${c}x+${e} → x=${x}` }; }),
          p("e3a4", (r) => { const x = r(2, 6), a = r(3, 5), b = r(1, a - 1), c = r(1, 4); return { q: `${a}x-${b}(x-${c})=${(a - b) * x + b * c}　x=？`, ans: x, h1: "括弧を外す", h2: `${a - b}x+${b * c}=… → x=${x}` }; }),
          p("e3a5", (r) => { const x = r(2, 6), a = r(3, 5), c = r(1, a - 1), b = r(1, 4); const e = (a - c) * x + a * b; return { q: `${a}(x+${b})=${c}x+${e}　x=？`, ans: x, h1: "左辺を展開して移項", h2: `${a}x+${a * b}=${c}x+${e} → x=${x}` }; }),
          p("e3a6", (r) => { const x = r(2, 6), a = r(3, 5), c = r(1, a - 1), b = r(1, 4); const e = (a - c) * x - a * b; const rhsStr = e >= 0 ? `${c}x+${e}` : `${c}x-${-e}`; return { q: `${a}(x-${b})=${rhsStr}　x=？`, ans: x, h1: "左辺を展開して移項", h2: `${a}x-${a * b}=… → x=${x}` }; }),
          p("e3a7", (r) => { const x = r(2, 6), a = r(2, 4), b = r(1, 4), c = r(1, 4); return { q: `${a}x+${b}(x+${c})=${(a + b) * x + b * c}　x=？`, ans: x, h1: "括弧を外す", h2: `${a + b}x+${b * c}=… → x=${x}` }; }),
          p("e3a8", (r) => { const x = r(2, 6), a = r(2, 3), c = r(1, 4); const lc = a + 1; return { q: `${a}(x+${c})+x=${lc * x + a * c}　x=？`, ans: x, h1: "左辺を展開してまとめる", h2: `${lc}x+${a * c}=… → x=${x}` }; }),
          p("e3a9", (r) => { const x = r(2, 6), a = r(3, 5), c = r(1, a - 2), b = r(1, 4); const e = (a - c) * x + (a - c) * b; return { q: `${a}(x+${b})=${c}(x+${b})+${e - 0}　x=？`, ans: x, h1: "両辺を展開して移項", h2: `${a - c}x+${(a - c) * b}=${e} → x=${x}` }; }),
          p("e3a10", (r) => { const x = r(2, 6), a = r(2, 4), b = r(1, 3), c = r(1, 4); return { q: `${a}x-${b}(x+${c})=${(a - b) * x - b * c}　x=？`, ans: x, h1: "括弧を外す（符号注意）", h2: `${a - b}x-${b * c}=… → x=${x}`, skip: a === b }; }),
        ],
      },
    },
    {
      id: "e4",
      name: "比例式",
      emoji: "🟰",
      desc: "a:b=c:d → ad=bc",
      problems: {
        easy: [
          p("e4e1", (r) => { const k = r(2, 6); return { q: `2:3=${2 * k}:x　x=？`, ans: 3 * k, h1: "2×x=3×(2k)", h2: `x=${3 * k}` }; }),
          p("e4e2", (r) => { const k = r(2, 5); return { q: `x:12=${k}:3　x=？`, ans: 4 * k, h1: "3×x=12×k", h2: `x=${4 * k}` }; }),
          p("e4e3", (r) => { const k = r(2, 6); return { q: `5:2=${5 * k}:x　x=？`, ans: 2 * k, h1: "5×x=2×(5k)", h2: `x=${2 * k}` }; }),
          p("e4e4", (r) => { const k = r(2, 5); return { q: `3:4=x:${4 * k}　x=？`, ans: 3 * k, h1: "3×(4k)=4×x", h2: `x=${3 * k}` }; }),
          p("e4e5", (r) => { const k = r(2, 6); return { q: `4:5=${4 * k}:x　x=？`, ans: 5 * k, h1: "4×x=5×(4k)", h2: `x=${5 * k}` }; }),
          p("e4e6", (r) => { const k = r(2, 5); return { q: `x:6=${k}:2　x=？`, ans: 3 * k, h1: "2×x=6×k", h2: `x=${3 * k}` }; }),
          p("e4e7", (r) => { const k = r(2, 6); return { q: `7:3=${7 * k}:x　x=？`, ans: 3 * k, h1: "7×x=3×(7k)", h2: `x=${3 * k}` }; }),
          p("e4e8", (r) => { const k = r(2, 5); return { q: `2:5=x:${5 * k}　x=？`, ans: 2 * k, h1: "2×(5k)=5×x", h2: `x=${2 * k}` }; }),
          p("e4e9", (r) => { const k = r(2, 6); return { q: `3:2=${3 * k}:x　x=？`, ans: 2 * k, h1: "3×x=2×(3k)", h2: `x=${2 * k}` }; }),
          p("e4e10", (r) => { const k = r(2, 5); return { q: `x:9=${k}:3　x=？`, ans: 3 * k, h1: "3×x=9×k", h2: `x=${3 * k}` }; }),
        ],
        standard: [
          p("e4s1", (r) => { const a = r(2, 4), b = r(3, 6), k = r(2, 4); return { q: `${a}:${b}=${a * k}:x　x=？`, ans: b * k, h1: "ad=bc", h2: `x=${b * k}` }; }),
          p("e4s2", (r) => { const k = r(2, 5); return { q: `6:5=${6 * k}:x　x=？`, ans: 5 * k, h1: "比を同じ倍率に", h2: `x=${5 * k}` }; }),
          p("e4s3", (r) => { const a = r(2, 5), b = r(3, 6), k = r(2, 4); return { q: `${a}:${b}=x:${b * k}　x=？`, ans: a * k, h1: "ad=bc", h2: `x=${a * k}` }; }),
          p("e4s4", (r) => { const k = r(2, 4); return { q: `8:3=${8 * k}:x　x=？`, ans: 3 * k, h1: "比を同じ倍率に", h2: `x=${3 * k}` }; }),
          p("e4s5", (r) => { const a = r(2, 4), b = r(3, 6), k = r(2, 4); return { q: `${a}:${b}=${a * k}:x　x=？`, ans: b * k, h1: "ad=bc", h2: `x=${b * k}` }; }),
          p("e4s6", (r) => { const k = r(2, 5); return { q: `7:4=${7 * k}:x　x=？`, ans: 4 * k, h1: "比を同じ倍率に", h2: `x=${4 * k}` }; }),
          p("e4s7", (r) => { const a = r(2, 5), b = r(3, 6), k = r(2, 4); return { q: `${a}:${b}=x:${b * k}　x=？`, ans: a * k, h1: "ad=bc", h2: `x=${a * k}` }; }),
          p("e4s8", (r) => { const k = r(2, 4); return { q: `9:5=${9 * k}:x　x=？`, ans: 5 * k, h1: "比を同じ倍率に", h2: `x=${5 * k}` }; }),
          p("e4s9", (r) => { const a = r(3, 5), b = r(2, 4), k = r(2, 4); return { q: `${a}:${b}=x:${b * k}　x=？`, ans: a * k, h1: "ad=bc", h2: `x=${a * k}` }; }),
          p("e4s10", (r) => { const a = r(2, 4), b = r(3, 5), k = r(2, 4); return { q: `${a}:${b}=${a * k}:x　x=？`, ans: b * k, h1: "ad=bc", h2: `x=${b * k}` }; }),
        ],
        advanced: [
          p("e4a1", (r) => { const a = r(2, 4), b = r(3, 6), tot = (a + b) * r(3, 6); return { q: `${a}:${b}=x:(${tot}-x)　x=？`, ans: a * tot / (a + b), h1: `${a}(${tot}-x)=${b}x`, h2: `x=${a * tot / (a + b)}`, skip: (a * tot) % (a + b) !== 0 }; }),
          p("e4a2", (r) => { const a = r(2, 5), b = r(2, 5), m = r(2, 6); const tot = (a + b) * m; return { q: `${a}:${b}=(${tot}-x):x　x=？`, ans: b * m, h1: `${a}x=${b}(${tot}-x)`, h2: `x=${b * m}` }; }),
          p("e4a3", (r) => { const a = r(2, 4), b = r(2, 4), k = r(2, 5); return { q: `${a}:${b}=${a * k}:(x+${b})　x=？`, ans: b * (k - 1), h1: `${a}(x+${b})=${b}×${a * k}`, h2: `x=${b * (k - 1)}` }; }),
          p("e4a4", (r) => { const b = r(2, 5), k = r(2, 5); return { q: `3:${b}=${3 * k}:x　x=？`, ans: b * k, h1: `3×x=${b}×${3 * k}`, h2: `x=${b * k}` }; }),
          p("e4a5", (r) => { const a = r(2, 4), b = r(3, 5), tot = (a + b) * r(3, 6); return { q: `${a}:${b}=x:(${tot}-x)　x=？`, ans: a * tot / (a + b), h1: `${a}(${tot}-x)=${b}x`, h2: `x=${a * tot / (a + b)}`, skip: (a * tot) % (a + b) !== 0 }; }),
          p("e4a6", (r) => { const a = r(2, 5), b = r(2, 5), m = r(2, 6); const tot = (a + b) * m; return { q: `${a}:${b}=(${tot}-x):x　x=？`, ans: b * m, h1: `${a}x=${b}(${tot}-x)`, h2: `x=${b * m}` }; }),
          p("e4a7", (r) => { const a = r(2, 4), b = r(2, 4), k = r(3, 5); return { q: `${a}:${b}=${a * k}:(x+${b})　x=？`, ans: b * (k - 1), h1: `${a}(x+${b})=${b}×${a * k}`, h2: `x=${b * (k - 1)}` }; }),
          p("e4a8", (r) => { const b = r(2, 5), k = r(2, 5); return { q: `4:${b}=${4 * k}:x　x=？`, ans: b * k, h1: `4×x=${b}×${4 * k}`, h2: `x=${b * k}` }; }),
          p("e4a9", (r) => { const a = r(2, 4), b = r(2, 4), k = r(3, 5); return { q: `${a}:${b}=(x-${b}):${b * k}　x=？`, ans: a * k + b, h1: `${a}×${b * k}=${b}(x-${b})`, h2: `x-${b}=${a * k} → x=${a * k + b}` }; }),
          p("e4a10", (r) => { const a = r(2, 4), b = r(2, 5), m = r(2, 5); const tot = (a + b) * m; return { q: `${a}:${b}=x:(${tot}-x)　x=？`, ans: a * m, h1: `${a}(${tot}-x)=${b}x`, h2: `x=${a * m}` }; }),
        ],
      },
    },
    {
      id: "e5",
      name: "方程式の文章題",
      emoji: "📐",
      desc: "代金・過不足・速さ",
      problems: {
        easy: [
          p("e5e1", (r) => { const x = r(5, 20), add = r(5, 15); return { q: `ある数xに${add}を足すと${x + add}。xは？`, ans: x, h1: `x+${add}=${x + add}`, h2: `x=${x}` }; }),
          p("e5e2", (r) => { const x = r(5, 20), m = r(2, 4); return { q: `ある数xを${m}倍すると${x * m}。xは？`, ans: x, h1: `${m}x=${x * m}`, h2: `x=${x}` }; }),
          p("e5e3", (r) => { const x = r(6, 20), sub = r(2, 5); return { q: `ある数xから${sub}をひくと${x - sub}。xは？`, ans: x, h1: `x-${sub}=${x - sub}`, h2: `x=${x}` }; }),
          p("e5e4", (r) => { const x = r(3, 12), m = r(2, 4); return { q: `ある数xを${m}倍して1を足すと${x * m + 1}。xは？`, ans: x, h1: `${m}x+1=${x * m + 1}`, h2: `${m}x=${x * m} → x=${x}` }; }),
          p("e5e5", (r) => { const x = r(5, 20), add = r(3, 12); return { q: `ある数xに${add}を足すと${x + add}。xは？`, ans: x, h1: `x+${add}=${x + add}`, h2: `x=${x}` }; }),
          p("e5e6", (r) => { const x = r(2, 8), m = r(2, 5); return { q: `ある数xを${m}倍すると${x * m}。xは？`, ans: x, h1: `${m}x=${x * m}`, h2: `x=${x}` }; }),
          p("e5e7", (r) => { const x = r(8, 20), sub = r(3, 7); return { q: `ある数xから${sub}をひくと${x - sub}。xは？`, ans: x, h1: `x-${sub}=${x - sub}`, h2: `x=${x}` }; }),
          p("e5e8", (r) => { const x = r(3, 10), m = r(2, 4), b = r(2, 5); return { q: `ある数xを${m}倍して${b}を足すと${x * m + b}。xは？`, ans: x, h1: `${m}x+${b}=${x * m + b}`, h2: `${m}x=${x * m} → x=${x}` }; }),
          p("e5e9", (r) => { const x = r(4, 12), m = r(2, 4), b = r(2, 6); return { q: `ある数xを${m}倍して${b}をひくと${x * m - b}。xは？`, ans: x, h1: `${m}x-${b}=${x * m - b}`, h2: `${m}x=${x * m} → x=${x}` }; }),
          p("e5e10", (r) => { const x = r(2, 8), a = r(2, 4); return { q: `ある数xを${a}でわると${x / a}。xは？`, ans: x, h1: `x÷${a}=${x / a}`, h2: `x=${x / a}×${a}=${x}`, skip: x % a !== 0 }; }),
        ],
        standard: [
          p("e5s1", (r) => { const x = r(10, 25), diff = r(3, 10); return { q: `2つの数の和が${2 * x + diff}、差が${diff}。大きい方は？`, ans: x + diff, h1: "x+y=和, x-y=差", h2: `大きい方=${x + diff}` }; }),
          p("e5s2", (r) => { const n = r(4, 8), e = r(3, 6), extra = r(2, 5); return { q: `${n}人に${e}個ずつ配ると${extra}個余る。全部で何個？`, ans: n * e + extra, h1: `${n}×${e}+${extra}`, h2: `${n * e + extra}個` }; }),
          p("e5s3", (r) => { const x = r(5, 15), w = r(3, 8); return { q: `横より縦が${w}cm長い長方形があり、周の長さは${2 * (2 * x + w)}cm。横の長さ(cm)は？`, ans: x, h1: `横をx, 縦をx+${w}とする`, h2: `2(x+(x+${w}))=${2 * (2 * x + w)} → x=${x}` }; }),
          p("e5s4", (r) => { const n = r(4, 9), e = r(3, 6), short = r(1, 4); return { q: `${n}人に${e}個ずつ配ると${short}個足りない。みかんは何個？`, ans: n * e - short, h1: `${n}×${e}-${short}`, h2: `${n * e - short}個` }; }),
          p("e5s5", (r) => { const x = r(10, 30), price = r(2, 5); return { q: `1個${price}円のあめをx個買うと${price * x}円。x個は？`, ans: x, h1: `${price}x=${price * x}`, h2: `x=${x}` }; }),
          p("e5s6", (r) => { const x = r(5, 15), w = r(2, 6); return { q: `横より縦が${w}cm長い長方形の周の長さは${2 * (2 * x + w)}cm。横(cm)は？`, ans: x, h1: `横をx,縦をx+${w}`, h2: `2(2x+${w})=${2 * (2 * x + w)} → x=${x}` }; }),
          p("e5s7", (r) => { const n = r(5, 9), e = r(2, 5), extra = r(2, 6); return { q: `${n}人に${e}個ずつ配ると${extra}個余る。全部で何個？`, ans: n * e + extra, h1: `${n}×${e}+${extra}`, h2: `${n * e + extra}個` }; }),
          p("e5s8", (r) => { const x = r(10, 25), diff = r(2, 8); return { q: `2つの数の和が${2 * x + diff}、差が${diff}。小さい方は？`, ans: x, h1: "大-小=差,大+小=和", h2: `小さい方=${x}` }; }),
          p("e5s9", (r) => { const x = r(5, 15), price = r(40, 90); return { q: `1個${price}円のパンをx個買うと代金は${price * x}円。x個は？`, ans: x, h1: `${price}x=${price * x}`, h2: `x=${x}` }; }),
          p("e5s10", (r) => { const m = r(3, 6), x = r(6, 18); return { q: `りんごをx人に${m}個ずつ分けると${m * x}個必要。x人は？`, ans: x, h1: `${m}x=${m * x}`, h2: `x=${x}` }; }),
        ],
        advanced: [
          p("e5a1", (r) => { const e = r(4, 6), short = r(1, 3), extra = r(1, 3); return { q: `1人に${e}個ずつ配ると${short}個足りず、${e - 1}個ずつだと${extra}個余る。人数は？`, ans: short + extra, h1: "1人あたり1個差", h2: `(${short}+${extra})÷1=${short + extra}人` }; }),
          p("e5a2", (r) => { const v1 = 100, v2 = 60, lead = 800; const t = lead / (v1 - v2); return { q: `弟が${lead}m先を分速${v2}mで進み、姉が分速${v1}mで追う。何分後に追いつく？`, ans: t, h1: "差の速さで追う", h2: `${lead}÷(${v1}-${v2})=${t}分後` }; }),
          p("e5a3", (r) => { const n = r(3, 10); return { q: `連続する3つの整数の和が${3 * n}。まん中の数は？`, ans: n, h1: "まん中をxとすると (x-1)+x+(x+1)=3x", h2: `3x=${3 * n} → x=${n}` }; }),
          p("e5a4", (r) => { const v1 = 70, v2 = 50, dist = r(2, 6) * 120; const t = dist / (v1 + v2); return { q: `${dist}m離れた2地点からAとBが向かい合って同時に出発。Aは分速${v1}m、Bは分速${v2}m。何分後に出会う？`, ans: t, h1: "速さの和で近づく", h2: `${dist}÷(${v1}+${v2})=${t}分後` }; }),
          p("e5a5", (r) => { const n = r(3, 10); return { q: `連続する3つの整数の和が${3 * n}。一番大きい数は？`, ans: n + 1, h1: "まん中をxとすると和は3x", h2: `3x=${3 * n} → x=${n} → 大=${n + 1}` }; }),
          p("e5a6", (r) => { const e = r(4, 6), short = r(1, 3), extra = r(1, 3); return { q: `1人に${e}個ずつ配ると${short}個足りず、${e - 1}個ずつだと${extra}個余る。人数は？`, ans: short + extra, h1: "1人あたり1個差", h2: `(${short}+${extra})÷1=${short + extra}人` }; }),
          p("e5a7", (r) => { const v1 = 80, v2 = 60, lead = r(2, 6) * 200; const t = lead / (v1 - v2); return { q: `弟が${lead}m先を分速${v2}mで進み、姉が分速${v1}mで追う。何分後に追いつく？`, ans: t, h1: "差の速さで追う", h2: `${lead}÷(${v1}-${v2})=${t}分後` }; }),
          p("e5a8", (r) => { const x = r(8, 20); return { q: `兄は弟より6才上で、2人の年齢の和は${2 * x + 6}才。弟は何才？`, ans: x, h1: "弟をxとすると兄はx+6", h2: `x+(x+6)=${2 * x + 6} → 2x=${2 * x} → x=${x}` }; }),
          p("e5a9", (r) => { const x = r(5, 15), c = r(2, 8); return { q: `ある数xの3倍から${c}をひくと、xの2倍に等しい。xは？`, ans: c, h1: "3x-c=2x", h2: `3x-${c}=2x → x=${c}` }; }),
          p("e5a10", (r) => { const n = r(2, 8); return { q: `連続する2つの偶数の和が${4 * n + 2}。小さい方は？`, ans: 2 * n, h1: "小をxとすると x+(x+2)=和", h2: `2x+2=${4 * n + 2} → x=${2 * n}` }; }),
        ],
      },
    },
  ],
};

// 🔥鬼：かっこを含む1次方程式（整数解）。全単元共通の難問。答えは数値（4択は自動生成）。
function fmtLin(b, q) {
  if (b === 0) return "" + q;
  let s = b === 1 ? "x" : b === -1 ? "−x" : b + "x";
  if (q !== 0) s += (q > 0 ? "+" + q : "−" + (-q));
  return s;
}
function genOniC3(r) {
  const x0 = (r(0, 1) ? 1 : -1) * r(1, 7);
  const a = r(2, 5);
  let b; do { b = (r(0, 1) ? 1 : -1) * r(0, 4); } while (b === a);
  let p0 = 0; while (p0 === 0) p0 = (r(0, 1) ? 1 : -1) * r(1, 5);
  const q0 = (a - b) * x0 + a * p0;     // a(x+p0)=bx+q0 が x=x0 を解にもつ
  const lhs = `${a}(x${p0 > 0 ? "+" + p0 : "−" + (-p0)})`;
  return { q: `${lhs} = ${fmtLin(b, q0)} を解きなさい。`, ans: x0, h1: "かっこを展開してから、xを左・数を右に移項する", h2: "移項で符号が変わる。最後にxの係数で割る" };
}
// 🔥鬼の追加バンク（応用の難問・整数解）。genOniC3 と合わせて各単元10個になるよう、
//   ここで9個の「応用」難問ジェネレータを用意し、forEach で単元IDを付けて配る。
const oniBank = [
  // 連続整数・数の問題
  (r) => { const n = r(3, 12); return { q: `連続する3つの整数の和が${3 * n}になる。一番小さい整数を求めなさい。`, ans: n - 1, h1: "まん中をxとすると (x-1)+x+(x+1)=3x", h2: `3x=${3 * n} → x=${n} → 小=${n - 1}` }; },
  (r) => { const n = r(2, 9); return { q: `連続する2つの奇数の和が${4 * n}になる。大きい方の奇数を求めなさい。`, ans: 2 * n + 1, h1: "小をxとすると x+(x+2)=和", h2: `2x+2=${4 * n} → x=${2 * n - 1} → 大=${2 * n + 1}` }; },
  // 速さ・追いつき
  (r) => { const v1 = 90, v2 = 60, lead = r(2, 6) * 300; const t = lead / (v1 - v2); return { q: `弟が${lead}m先を分速${v2}mで歩き、姉が分速${v1}mで追いかける。姉が弟に追いつくのは何分後か。`, ans: t, h1: "1分で(姉-弟)だけ差がちぢむ", h2: `${lead}÷(${v1}-${v2})=${t}分後` }; },
  // 出会い算
  (r) => { const v1 = 75, v2 = 45, dist = r(2, 6) * 120; const t = dist / (v1 + v2); return { q: `${dist}m離れた2地点からA・Bが向かい合って同時に出発。Aは分速${v1}m、Bは分速${v2}m。出会うのは何分後か。`, ans: t, h1: "1分で(A+B)だけ近づく", h2: `${dist}÷(${v1}+${v2})=${t}分後` }; },
  // 過不足算
  (r) => { const extra = r(2, 5), short = r(2, 5), e = r(4, 6); return { q: `あめを1人に${e - 1}個ずつ配ると${extra}個余り、${e}個ずつだと${short}個足りない。子どもの人数を求めなさい。`, ans: extra + short, h1: "1人あたり1個の差が(余り+不足)に相当", h2: `(${extra}+${short})÷1=${extra + short}人` }; },
  // 年齢算
  (r) => { const d = r(20, 30), c = r(6, 10), yrs = (d - 3 * c) / 2; return { q: `今、親は${d}才・子は${c}才。親の年齢が子の年齢の3倍になるのは何年後か。`, ans: yrs, h1: "x年後 → 親(d+x)=3(子c+x)", h2: `${d}+x=3(${c}+x) → x=${yrs}`, skip: !Number.isInteger(yrs) || yrs < 0 }; },
  // 代金（連立を1元化）
  (r) => { const ap = r(40, 80), bp = ap + r(20, 40), n = r(3, 8); const total = ap * n + bp * (n + 1); return { q: `1個${ap}円のりんごをx個、1個${bp}円のなしを(x+1)個買うと合計${total}円。りんごの個数xを求めなさい。`, ans: n, h1: `${ap}x+${bp}(x+1)=${total}`, h2: `${ap + bp}x+${bp}=${total} → x=${n}` }; },
  // 整数の各位
  (r) => { const t = r(1, 7), o = t + r(1, 2); const num = 10 * t + o; return { q: `2けたの整数があり、十の位は${t}。一の位を十の位より大きい数にして、各位の数の和が${t + o}になるとき、一の位の数を求めなさい。`, ans: o, h1: "一の位をxとして t+x=和", h2: `${t}+x=${t + o} → x=${o}` }; },
  // 食塩水・割合（整数解）
  (r) => { const base = r(2, 5) * 100, add = r(1, 4) * 50; const ans = add; return { q: `${base}gの水に食塩を加えてよくかき混ぜたら全体が${base + add}gになった。加えた食塩は何gか。`, ans, h1: "加えた食塩をxとすると base+x=全体", h2: `${base}+x=${base + add} → x=${add}` }; },
];
chapter.units.forEach((u) => {
  const oni = [p(u.id + "oni", genOniC3)];
  oniBank.forEach((g, i) => oni.push(p(`${u.id}o${i + 2}`, g)));
  u.problems.oni = oni;
});
