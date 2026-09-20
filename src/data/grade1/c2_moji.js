// ============================================================
// c2_moji.js — 中1「文字の式」
// 小テスト準拠：表し方／式の値（代入）／加減／乗除（分配）／四則混合
// 文字式は答えが式になるため、「係数」「定数項」「式の値」など数値で答える形にしている。
// ============================================================
const p = (id, build) => ({ id, build });

export const chapter = {
  id: "c2",
  name: "文字の式",
  emoji: "🔤",
  color: "#34d399",
  grade: 1,
  units: [
    {
      id: "v1",
      name: "文字式の表し方",
      emoji: "📝",
      desc: "積・商の表し方・係数",
      problems: {
        easy: [
          p("v1e1", (r) => { const a = r(2, 9); return { q: `a×${a} を文字式で表すと ${a}a。係数は？`, ans: a, h1: "数を文字の前に書く", h2: `係数は${a}` }; }),
          p("v1e2", (r) => { const a = r(2, 9); return { q: `x×(-${a}) を文字式にすると -${a}x。係数は？`, ans: -a, h1: "符号も含めて前に出す", h2: `係数は-${a}` }; }),
          p("v1e3", (r) => { const a = r(2, 8); return { q: `x÷${a} を分数で表すと x/□。□は？`, ans: a, h1: "a÷b=a/b", h2: `x÷${a}=x/${a}` }; }),
          p("v1e4", () => ({ q: `(-1)×x を文字式にすると -x。係数は？`, ans: -1, h1: "1は省略する", h2: "係数は-1" })),
          p("v1e5", (r) => { const a = r(2, 9); return { q: `a×a×${a} を文字式で表すと ${a}a²。係数は？`, ans: a, h1: "同じ文字の積は累乗", h2: `係数は${a}` }; }),
          p("v1e6", (r) => { const a = r(2, 9); return { q: `b×a×${a} を文字式で表すと ${a}ab。係数は？`, ans: a, h1: "文字はアルファベット順に", h2: `係数は${a}` }; }),
          p("v1e7", (r) => { const a = r(2, 8); return { q: `x÷(-${a}) を分数で表すと -x/□。□は？`, ans: a, h1: "符号を前に出す", h2: `-x/${a}` }; }),
          p("v1e8", (r) => { const a = r(2, 6); return { q: `${a}×x×y を文字式で表すと ${a}xy。係数は？`, ans: a, h1: "数を前、文字は順に", h2: `係数は${a}` }; }),
          p("v1e9", (r) => { const a = r(2, 9); return { q: `x×x×x×${a} を文字式で表すと ${a}x³。指数は？`, ans: 3, h1: "xを3回かける", h2: "x³なので指数は3" }; }),
          p("v1e10", () => ({ q: `1×a を文字式にすると a。係数は？`, ans: 1, h1: "1は省略する", h2: "係数は1" })),
        ],
        standard: [
          p("v1s1", (r) => { const a = r(2, 6), b = r(2, 6); return { q: `${a}a+${b}a を整理すると □a。□は？`, ans: a + b, h1: "同類項は係数を足す", h2: `${a}+${b}=${a + b}` }; }),
          p("v1s2", (r) => { const a = r(3, 9), b = r(1, a - 1); return { q: `${a}x-${b}x を整理すると □x。□は？`, ans: a - b, h1: "係数を引く", h2: `${a}-${b}=${a - b}` }; }),
          p("v1s3", (r) => { const a = r(2, 5), b = r(1, 6); return { q: `${a}(x+${b}) を展開したときの定数項は？`, ans: a * b, h1: "分配法則", h2: `${a}×${b}=${a * b}` }; }),
          p("v1s4", (r) => { const a = r(2, 8); return { q: `${a}x+x を整理すると □x。□は？`, ans: a + 1, h1: "xは1xと考える", h2: `${a}+1=${a + 1}` }; }),
          p("v1s5", (r) => { const a = r(2, 6), b = r(2, 6); return { q: `${a}a+${b}b-a を整理したときの a の係数は？`, ans: a - 1, h1: "aの項だけ集める", h2: `${a}-1=${a - 1}` }; }),
          p("v1s6", (r) => { const a = r(3, 9), b = r(1, a - 1); return { q: `${a}x-${b}x+x を整理すると □x。□は？`, ans: a - b + 1, h1: "係数を順に計算", h2: `${a}-${b}+1=${a - b + 1}` }; }),
          p("v1s7", (r) => { const a = r(2, 5), b = r(1, 6); return { q: `${a}(x+${b}) を展開したときの x の係数は？`, ans: a, h1: "分配法則", h2: `x の係数は${a}` }; }),
          p("v1s8", (r) => { const a = r(2, 6), b = r(2, 6); return { q: `${a}a+${b}b+${a}a を整理したときの a の係数は？`, ans: 2 * a, h1: "aの項をまとめる", h2: `${a}+${a}=${2 * a}` }; }),
          p("v1s9", (r) => { const a = r(2, 6), b = r(1, a - 1); return { q: `${a}x-${b}x を整理したときの x の係数は？`, ans: a - b, h1: "係数を引く", h2: `${a}-${b}=${a - b}` }; }),
          p("v1s10", (r) => { const a = r(2, 5), b = r(2, 6); return { q: `${a}(${b}a) を計算すると □a。□は？`, ans: a * b, h1: "係数どうしをかける", h2: `${a}×${b}=${a * b}` }; }),
        ],
        advanced: [
          p("v1a1", (r) => { const a = r(2, 4), b = r(1, 5), c = r(2, 4), d = r(1, 5); return { q: `${a}(x+${b})-${c}(x-${d}) の x の係数は？`, ans: a - c, h1: `展開: ${a}x+${a * b}-${c}x+${c * d}`, h2: `${a}-${c}=${a - c}` }; }),
          p("v1a2", (r) => { const a = r(2, 4), b = r(2, 4); return { q: `${a}x²+${b}x-${a}x²+${b} の x の係数は？`, ans: b, h1: "x²の項は打ち消し合う", h2: `残るのは${b}x` }; }),
          p("v1a3", (r) => { const a = r(2, 5), b = r(2, 4); return { q: `(${a}x+${b})÷${b}×${b} の x の係数は？`, ans: a, h1: "÷bと×bが打ち消す", h2: `係数は${a}` }; }),
          p("v1a4", (r) => { const a = r(2, 4), b = r(1, 5), c = r(2, 4); return { q: `${a}(x+${b})+${c}x の x の係数は？`, ans: a + c, h1: `${a}x+${a * b}+${c}x`, h2: `${a}+${c}=${a + c}` }; }),
          p("v1a5", (r) => { const a = r(2, 5), b = r(2, 5); return { q: `${a}x²+${b}x²-x² の x² の係数は？`, ans: a + b - 1, h1: "x²の項をまとめる", h2: `${a}+${b}-1=${a + b - 1}` }; }),
          p("v1a6", (r) => { const a = r(2, 4), b = r(1, 5), c = r(2, 4), d = r(1, 5); return { q: `${a}(x+${b})+${c}(x-${d}) の定数項は？`, ans: a * b - c * d, h1: `${a * b}-${c * d}`, h2: `${a * b - c * d}` }; }),
          p("v1a7", (r) => { const a = r(2, 4), b = r(2, 4), c = r(1, 5); return { q: `${a}x+${b}x-x+${c} の x の係数は？`, ans: a + b - 1, h1: "xの項を集める", h2: `${a}+${b}-1=${a + b - 1}` }; }),
          p("v1a8", (r) => { const a = r(2, 4), b = r(2, 5); return { q: `${a * b}x÷${a}+${b}x の x の係数は？`, ans: 2 * b, h1: `${a * b}÷${a}=${b}`, h2: `${b}+${b}=${2 * b}` }; }),
          p("v1a9", (r) => { const a = r(2, 4), b = r(2, 4); return { q: `${a}(${b}x) を計算したときの x の係数は？`, ans: a * b, h1: "係数どうしをかける", h2: `${a}×${b}=${a * b}` }; }),
          p("v1a10", (r) => { const a = r(2, 4), b = r(2, 4), c = r(2, 4); return { q: `${a}x²-${b}x²+${c}x² の x² の係数は？`, ans: a - b + c, h1: "x²の項を順にまとめる", h2: `${a}-${b}+${c}=${a - b + c}` }; }),
        ],
      },
    },
    {
      id: "v2",
      name: "式の値（代入）",
      emoji: "🔁",
      desc: "文字に数を代入して計算",
      problems: {
        easy: [
          p("v2e1", (r) => { const a = r(2, 6), x = r(1, 8); return { q: `${a}x の x=${x} のときの値は？`, ans: a * x, h1: `xに${x}を代入`, h2: `${a}×${x}=${a * x}` }; }),
          p("v2e2", (r) => { const a = r(2, 5), b = r(1, 8), x = r(1, 8); return { q: `${a}x+${b} の x=${x} のときの値は？`, ans: a * x + b, h1: `代入`, h2: `${a}×${x}+${b}=${a * x + b}` }; }),
          p("v2e3", (r) => { const a = r(2, 5), x = r(1, 5); return { q: `${a}x² の x=${x} のときの値は？`, ans: a * x * x, h1: `x²=${x * x}`, h2: `${a}×${x * x}=${a * x * x}` }; }),
          p("v2e4", (r) => { const a = r(2, 5), b = r(1, 6), x = r(2, 8); return { q: `${a}x-${b} の x=${x} のときの値は？`, ans: a * x - b, h1: `代入`, h2: `${a}×${x}-${b}=${a * x - b}` }; }),
          p("v2e5", (r) => { const b = r(2, 9), x = r(1, 8); return { q: `${b}-x の x=${x} のときの値は？`, ans: b - x, h1: `xに${x}を代入`, h2: `${b}-${x}=${b - x}` }; }),
          p("v2e6", (r) => { const a = r(2, 6), x = r(2, 8); return { q: `${a}+x の x=${x} のときの値は？`, ans: a + x, h1: `xに${x}を代入`, h2: `${a}+${x}=${a + x}` }; }),
          p("v2e7", (r) => { const a = r(2, 6), b = r(2, 6), x = r(1, 6), y = r(1, 6); return { q: `x+y の x=${x}、y=${y} のときの値は？`, ans: x + y, h1: "両方代入", h2: `${x}+${y}=${x + y}` }; }),
          p("v2e8", (r) => { const a = r(2, 6), x = r(2, 8); return { q: `${a}x の x=${x} のときの値は？`, ans: a * x, h1: `xに${x}を代入`, h2: `${a}×${x}=${a * x}` }; }),
          p("v2e9", (r) => { const a = r(2, 6), b = r(1, 8); const x = r(1, 5); return { q: `x²+${b} の x=${x} のときの値は？`, ans: x * x + b, h1: `x²=${x * x}`, h2: `${x * x}+${b}=${x * x + b}` }; }),
          p("v2e10", (r) => { const a = r(2, 6), b = r(2, 6), x = r(1, 6); return { q: `${a}x+${b}x の x=${x} のときの値は？`, ans: (a + b) * x, h1: `${a + b}x として代入`, h2: `${a + b}×${x}=${(a + b) * x}` }; }),
        ],
        standard: [
          p("v2s1", (r) => { const a = r(2, 5), b = r(1, 6), x = -r(1, 4); return { q: `${a}x+${b} の x=${x} のときの値は？`, ans: a * x + b, h1: "負の数を代入", h2: `${a}×(${x})+${b}=${a * x + b}` }; }),
          p("v2s2", (r) => { const b = r(2, 8), x = -r(2, 6); return { q: `${b}/x の x=${x} のときの値は？`, ans: b / x, h1: `xに${x}を代入`, h2: `${b}÷(${x})=${b / x}`, skip: b % x !== 0 }; }),
          p("v2s3", (r) => { const a = r(2, 4), b = r(2, 4), x = r(1, 5), y = r(1, 5); return { q: `${a}x+${b}y の x=${x}、y=${y} のとき？`, ans: a * x + b * y, h1: "両方代入", h2: `${a * x}+${b * y}=${a * x + b * y}` }; }),
          p("v2s4", (r) => { const a = r(2, 4), x = -r(1, 4); return { q: `${a}x² の x=${x} のときの値は？`, ans: a * x * x, h1: `x²は正: x²=${x * x}`, h2: `${a}×${x * x}=${a * x * x}` }; }),
          p("v2s5", (r) => { const a = r(2, 5), b = r(1, 6), x = -r(1, 5); return { q: `${a}x-${b} の x=${x} のときの値は？`, ans: a * x - b, h1: "負の数を代入", h2: `${a}×(${x})-${b}=${a * x - b}` }; }),
          p("v2s6", (r) => { const a = r(2, 4), x = -r(1, 5); return { q: `${a}+x の x=${x} のときの値は？`, ans: a + x, h1: "負の数を代入", h2: `${a}+(${x})=${a + x}` }; }),
          p("v2s7", (r) => { const a = r(2, 4), b = r(1, 5), x = -r(1, 4); return { q: `${a}x²+${b} の x=${x} のときの値は？`, ans: a * x * x + b, h1: `x²=${x * x}`, h2: `${a}×${x * x}+${b}=${a * x * x + b}` }; }),
          p("v2s8", (r) => { const a = r(2, 4), b = r(2, 4), x = r(1, 4), y = -r(1, 4); return { q: `${a}x-${b}y の x=${x}、y=${y} のとき？`, ans: a * x - b * y, h1: "yは負の数", h2: `${a * x}-(${b * y})=${a * x - b * y}` }; }),
          p("v2s9", (r) => { const a = r(2, 5), x = -r(2, 6); return { q: `x-${a} の x=${x} のときの値は？`, ans: x - a, h1: "負の数を代入", h2: `${x}-${a}=${x - a}` }; }),
          p("v2s10", (r) => { const a = r(2, 4), b = r(1, 5), x = -r(1, 4); return { q: `${a}x²-${b}x の x=${x} のとき？`, ans: a * x * x - b * x, h1: `x²=${x * x}、${b}x=${b * x}`, h2: `${a * x * x}-(${b * x})=${a * x * x - b * x}` }; }),
        ],
        advanced: [
          p("v2a1", (r) => { const a = r(1, 5), b = r(1, 5), x = -r(1, 4); return { q: `x²+${a}x+${b} の x=${x} のとき？`, ans: x * x + a * x + b, h1: `x²=${x * x}、${a}x=${a * x}`, h2: `${x * x}+(${a * x})+${b}=${x * x + a * x + b}` }; }),
          p("v2a2", (r) => { const a = r(2, 4); return { q: `${a}a+${a}b の a=3、b=-3 のとき？`, ans: 0, h1: `${a}(a+b)=${a}×0`, h2: "0" }; }),
          p("v2a3", (r) => { const a = r(2, 4), b = r(2, 4), x = r(1, 4), y = -r(1, 4); return { q: `${a}x+${b}y の x=${x}、y=${y} のとき？`, ans: a * x + b * y, h1: "yは負の数", h2: `${a * x}+(${b * y})=${a * x + b * y}` }; }),
          p("v2a4", (r) => { const a = r(1, 5), x = -r(1, 4); return { q: `x²-${a}x の x=${x} のとき？`, ans: x * x - a * x, h1: `x²=${x * x}、-${a}x=${-a * x}`, h2: `${x * x}-(${a * x})=${x * x - a * x}` }; }),
          p("v2a5", (r) => { const a = r(2, 5); return { q: `${a}a-${a}b の a=4、b=4 のとき？`, ans: 0, h1: `${a}(a-b)=${a}×0`, h2: "0" }; }),
          p("v2a6", (r) => { const a = r(1, 4), b = r(1, 4), x = -r(2, 4); return { q: `x²-${a}x+${b} の x=${x} のとき？`, ans: x * x - a * x + b, h1: `x²=${x * x}、-${a}x=${-a * x}`, h2: `${x * x}-(${a * x})+${b}=${x * x - a * x + b}` }; }),
          p("v2a7", (r) => { const a = r(2, 4), b = r(2, 4), x = -r(1, 3), y = -r(1, 3); return { q: `${a}x+${b}y の x=${x}、y=${y} のとき？`, ans: a * x + b * y, h1: "両方とも負", h2: `${a * x}+(${b * y})=${a * x + b * y}` }; }),
          p("v2a8", (r) => { const a = r(2, 4), x = -r(1, 4); return { q: `(x+${a})² の x=${x} のとき？`, ans: (x + a) * (x + a), h1: `中身: ${x}+${a}=${x + a}`, h2: `(${x + a})²=${(x + a) * (x + a)}` }; }),
          p("v2a9", (r) => { const a = r(2, 4), b = r(2, 4); return { q: `${a}(a+b)-${b}(a+b) の a=5、b=5 のとき？`, ans: (a - b) * 10, h1: `(${a}-${b})(a+b)`, h2: `(${a - b})×10=${(a - b) * 10}` }; }),
          p("v2a10", (r) => { const a = r(2, 4), x = -r(2, 4); return { q: `${a}x²-x の x=${x} のとき？`, ans: a * x * x - x, h1: `x²=${x * x}`, h2: `${a}×${x * x}-(${x})=${a * x * x - x}` }; }),
        ],
      },
    },
    {
      id: "v3",
      name: "加法・減法",
      emoji: "🔣",
      desc: "同類項をまとめる",
      problems: {
        easy: [
          p("v3e1", (r) => { const a = r(2, 6), b = r(2, 6); return { q: `(${a}x+1)+(${b}x+2) の x の係数は？`, ans: a + b, h1: "xの項を集める", h2: `${a}+${b}=${a + b}` }; }),
          p("v3e2", (r) => { const a = r(3, 8), b = r(1, a - 1); return { q: `(${a}x+3)-(${b}x+1) の x の係数は？`, ans: a - b, h1: "引く括弧の符号を逆に", h2: `${a}-${b}=${a - b}` }; }),
          p("v3e3", (r) => { const a = r(1, 8), b = r(1, 8); return { q: `(2x+${a})+(3x-${b}) の定数項は？`, ans: a - b, h1: "定数項を計算", h2: `${a}-${b}=${a - b}` }; }),
          p("v3e4", (r) => { const a = r(2, 6), b = r(1, 8), c = r(1, 8); return { q: `(${a}x-${b})+(x+${c}) の x の係数は？`, ans: a + 1, h1: "xの項を集める", h2: `${a}+1=${a + 1}` }; }),
          p("v3e5", (r) => { const a = r(2, 6), b = r(2, 6); return { q: `${a}x+${b}-x の x の係数は？`, ans: a - 1, h1: "xの項だけ集める", h2: `${a}-1=${a - 1}` }; }),
          p("v3e6", (r) => { const a = r(2, 6), b = r(2, 6); return { q: `(${a}a+1)+(${b}a+2) の a の係数は？`, ans: a + b, h1: "aの項を集める", h2: `${a}+${b}=${a + b}` }; }),
          p("v3e7", (r) => { const a = r(1, 6), b = r(1, 6), c = r(1, 6), d = r(1, 6); return { q: `(${a}x+${b})+(${c}x+${d}) の定数項は？`, ans: b + d, h1: "定数項を足す", h2: `${b}+${d}=${b + d}` }; }),
          p("v3e8", (r) => { const a = r(3, 8), b = r(1, a - 1), c = r(1, 8), d = r(1, 6); return { q: `(${a}x+${c})-(${b}x+${d}) の x の係数は？`, ans: a - b, h1: "xの係数を引く", h2: `${a}-${b}=${a - b}` }; }),
          p("v3e9", (r) => { const a = r(2, 6), b = r(2, 6); return { q: `${a}x+${b}x の x の係数は？`, ans: a + b, h1: "係数を足す", h2: `${a}+${b}=${a + b}` }; }),
          p("v3e10", (r) => { const a = r(1, 6), b = r(1, 6); return { q: `(x+${a})+(x+${b}) の定数項は？`, ans: a + b, h1: "定数項を足す", h2: `${a}+${b}=${a + b}` }; }),
        ],
        standard: [
          p("v3s1", (r) => { const a = r(2, 5), b = r(1, 6), c = r(2, 5), d = r(1, 6); return { q: `(${a}x-${b})+(${c}x+${d}) の定数項は？`, ans: -b + d, h1: "定数を足す", h2: `-${b}+${d}=${-b + d}` }; }),
          p("v3s2", (r) => { const a = r(2, 4), b = r(1, 5), c = r(1, 6); return { q: `${a}(x+${b})-${c} の x の係数は？`, ans: a, h1: `展開: ${a}x+${a * b}-${c}`, h2: `x の係数は${a}` }; }),
          p("v3s3", (r) => { const a = r(2, 4), b = r(1, 5); return { q: `(5x-${b})-(2x+${b}) の定数項は？`, ans: -2 * b, h1: `-${b}-${b}`, h2: `-${2 * b}` }; }),
          p("v3s4", (r) => { const a = r(3, 8), b = r(1, 6), c = r(1, 6), d = r(1, 6); return { q: `(${a}x+${b})-(${c}x-${d}) の定数項は？`, ans: b + d, h1: "引く括弧の符号を逆に", h2: `${b}+${d}=${b + d}` }; }),
          p("v3s5", (r) => { const a = r(2, 5), b = r(1, 6), c = r(2, 5); return { q: `${a}(x-${b})+${c}x の x の係数は？`, ans: a + c, h1: `${a}x+${c}x`, h2: `${a}+${c}=${a + c}` }; }),
          p("v3s6", (r) => { const a = r(2, 5), b = r(1, 6), c = r(2, 5), d = r(1, 6); return { q: `(${a}x+${b})-(${c}x-${d}) の x の係数は？`, ans: a - c, h1: "引く括弧の符号を逆に", h2: `${a}-${c}=${a - c}` }; }),
          p("v3s7", (r) => { const a = r(2, 4), b = r(1, 5), c = r(1, 6); return { q: `${a}(x+${b})+${c} の定数項は？`, ans: a * b + c, h1: `${a * b}+${c}`, h2: `${a * b + c}` }; }),
          p("v3s8", (r) => { const a = r(2, 5), b = r(1, 6), c = r(1, 6); return { q: `(${a}x+${b})+(${b}x+${c})+x の x の係数は？`, ans: a + b + 1, h1: "xの項を全部足す", h2: `${a}+${b}+1=${a + b + 1}` }; }),
          p("v3s9", (r) => { const a = r(4, 9), b = r(1, 6), c = r(1, a - 1), d = r(1, 6); return { q: `(${a}x-${b})-(${c}x+${d}) の定数項は？`, ans: -b - d, h1: "符号を逆に", h2: `-${b}-${d}=${-b - d}` }; }),
          p("v3s10", (r) => { const a = r(2, 4), b = r(1, 5), c = r(2, 4); return { q: `${a}(x-${b})-${c}(x-${b}) の x の係数は？`, ans: a - c, h1: `${a}x-${c}x`, h2: `${a}-${c}=${a - c}` }; }),
        ],
        advanced: [
          p("v3a1", (r) => { const a = r(2, 4), b = r(2, 4); return { q: `${a}(x+${b})-${a}(x-${b}) の定数項は？`, ans: 2 * a * b, h1: `${a * b}+${a * b}`, h2: `${2 * a * b}` }; }),
          p("v3a2", (r) => { const a = r(2, 4), b = r(2, 4), c = r(1, 4); return { q: `(${a}x²+${b}x+${c})-(${a}x²-${b}x) の x の係数は？`, ans: 2 * b, h1: "x²が消える", h2: `${b}-(-${b})=${2 * b}` }; }),
          p("v3a3", (r) => { const a = r(2, 4), b = r(1, 5), c = r(2, 4), d = r(1, 5); return { q: `${a}(x+${b})+${c}(x+${d}) の定数項は？`, ans: a * b + c * d, h1: `${a * b}+${c * d}`, h2: `${a * b + c * d}` }; }),
          p("v3a4", (r) => { const a = r(2, 4), b = r(2, 5), c = r(2, 5); return { q: `(${a}x²+${b}x)-(${a}x²+${c}x) の x の係数は？`, ans: b - c, h1: "x²が消える", h2: `${b}-${c}=${b - c}` }; }),
          p("v3a5", (r) => { const a = r(2, 4), b = r(1, 5); return { q: `${a}(x-${b})-(x-${b}) の x の係数は？`, ans: a - 1, h1: `${a}x-x`, h2: `${a}-1=${a - 1}` }; }),
          p("v3a6", (r) => { const a = r(2, 4), b = r(2, 4), c = r(1, 5); return { q: `${a}(x+${c})-${b}(x-${c}) の定数項は？`, ans: a * c + b * c, h1: `${a * c}+${b * c}`, h2: `${a * c + b * c}` }; }),
          p("v3a7", (r) => { const a = r(2, 4), b = r(2, 4), c = r(1, 4); return { q: `(${a}x²+${b}x+${c})-(${b}x+${c}) の x² の係数は？`, ans: a, h1: "xと定数が消える", h2: `残るのは${a}x²` }; }),
          p("v3a8", (r) => { const a = r(3, 5), b = r(2, 4); return { q: `${a}(x²+x)-${b}(x²-x) の x の係数は？`, ans: a + b, h1: `${a}x+${b}x`, h2: `${a}+${b}=${a + b}` }; }),
          p("v3a9", (r) => { const a = r(2, 4), b = r(1, 5), c = r(2, 4), d = r(1, 5); return { q: `${a}(x-${b})-${c}(x-${d}) の x の係数は？`, ans: a - c, h1: `${a}x-${c}x`, h2: `${a}-${c}=${a - c}` }; }),
          p("v3a10", (r) => { const a = r(2, 4), b = r(2, 4), c = r(1, 5); return { q: `(${a}x²+${c}x)+(${b}x²-${c}x) の x² の係数は？`, ans: a + b, h1: "xの項が消える", h2: `${a}+${b}=${a + b}` }; }),
        ],
      },
    },
    {
      id: "v4",
      name: "乗法・除法（分配）",
      emoji: "✳️",
      desc: "数×文字式・文字式÷数",
      problems: {
        easy: [
          p("v4e1", (r) => { const a = r(2, 6), b = r(2, 5); return { q: `${a}x×${b} の x の係数は？`, ans: a * b, h1: "係数どうしをかける", h2: `${a}×${b}=${a * b}` }; }),
          p("v4e2", (r) => { const a = r(2, 6), b = r(2, 6); return { q: `${a * b}x÷${a} の x の係数は？`, ans: b, h1: "係数を割る", h2: `${a * b}÷${a}=${b}` }; }),
          p("v4e3", (r) => { const a = r(2, 5), b = r(2, 5), c = r(1, 6); return { q: `${a}(${b}x+${c}) の x の係数は？`, ans: a * b, h1: "分配法則", h2: `${a}×${b}=${a * b}` }; }),
          p("v4e4", (r) => { const a = r(2, 6), b = r(2, 5); return { q: `${a}x×(-${b}) の x の係数は？`, ans: -a * b, h1: "係数どうしをかける", h2: `${a}×(-${b})=${-a * b}` }; }),
          p("v4e5", (r) => { const a = r(2, 6), b = r(2, 6); return { q: `-${a * b}x÷${a} の x の係数は？`, ans: -b, h1: "係数を割る", h2: `-${a * b}÷${a}=${-b}` }; }),
          p("v4e6", (r) => { const a = r(2, 6), b = r(2, 5); return { q: `${b}×${a}x の x の係数は？`, ans: a * b, h1: "係数どうしをかける", h2: `${b}×${a}=${a * b}` }; }),
          p("v4e7", (r) => { const a = r(2, 5), b = r(2, 5), c = r(1, 6); return { q: `${a}(${b}x+${c}) の定数項は？`, ans: a * c, h1: "分配法則", h2: `${a}×${c}=${a * c}` }; }),
          p("v4e8", (r) => { const a = r(2, 6), b = r(2, 6); return { q: `${a * b}x÷(-${a}) の x の係数は？`, ans: -b, h1: "符号に注意して割る", h2: `${a * b}÷(-${a})=${-b}` }; }),
          p("v4e9", (r) => { const a = r(2, 5), b = r(2, 5); return { q: `${a}×${b}x×x の x² の係数は？`, ans: a * b, h1: "係数をかける", h2: `${a}×${b}=${a * b}` }; }),
          p("v4e10", (r) => { const a = r(2, 5), b = r(2, 5), c = r(1, 6); return { q: `-${a}(${b}x-${c}) の x の係数は？`, ans: -a * b, h1: `-${a}×${b}`, h2: `${-a * b}` }; }),
        ],
        standard: [
          p("v4s1", (r) => { const a = r(2, 5), b = r(2, 5), c = r(1, 6); return { q: `${a}(${b}x+${c}) の定数項は？`, ans: a * c, h1: "分配法則", h2: `${a}×${c}=${a * c}` }; }),
          p("v4s2", (r) => { const a = r(2, 6), b = r(2, 5), c = r(1, 8); return { q: `(${a * b}x+${a * c})÷${a} の x の係数は？`, ans: b, h1: `各項を${a}で割る`, h2: `${a * b}÷${a}=${b}` }; }),
          p("v4s3", (r) => { const a = r(2, 5), b = r(2, 6), c = r(1, 6); return { q: `-${a}(${b}x-${c}) の x の係数は？`, ans: -a * b, h1: `-${a}を各項にかける`, h2: `-${a}×${b}=${-a * b}` }; }),
          p("v4s4", (r) => { const a = r(2, 5), b = r(2, 6), c = r(1, 6); return { q: `-${a}(${b}x-${c}) の定数項は？`, ans: a * c, h1: `-${a}×(-${c})`, h2: `+${a * c}` }; }),
          p("v4s5", (r) => { const a = r(2, 6), b = r(2, 5), c = r(1, 8); return { q: `(${a * b}x-${a * c})÷${a} の定数項は？`, ans: -c, h1: `各項を${a}で割る`, h2: `-${a * c}÷${a}=${-c}` }; }),
          p("v4s6", (r) => { const a = r(2, 5), b = r(2, 5), c = r(1, 6); return { q: `-${a}(${b}x+${c}) の定数項は？`, ans: -a * c, h1: `-${a}×${c}`, h2: `${-a * c}` }; }),
          p("v4s7", (r) => { const a = r(2, 6), b = r(2, 5), c = r(1, 8); return { q: `(-${a * b}x+${a * c})÷${a} の x の係数は？`, ans: -b, h1: `各項を${a}で割る`, h2: `-${a * b}÷${a}=${-b}` }; }),
          p("v4s8", (r) => { const a = r(2, 5), b = r(2, 5), c = r(1, 6); return { q: `${a}(${b}x-${c}) の x の係数は？`, ans: a * b, h1: "分配法則", h2: `${a}×${b}=${a * b}` }; }),
          p("v4s9", (r) => { const a = r(2, 4), b = r(2, 4), c = r(1, 5); return { q: `${a}(${b}x+${c})×2 の x の係数は？`, ans: 2 * a * b, h1: `${a * b}x×2`, h2: `${a * b}×2=${2 * a * b}` }; }),
          p("v4s10", (r) => { const a = r(2, 4), b = r(2, 4), c = r(1, 5); return { q: `-${a}(${b}x+${c}) の x の係数は？`, ans: -a * b, h1: `-${a}×${b}`, h2: `${-a * b}` }; }),
        ],
        advanced: [
          p("v4a1", (r) => { const a = r(2, 4), b = r(2, 4), c = r(1, 5), d = r(2, 4); return { q: `${a}(${b}x+${c})+${d}(x+${c}) の x の係数は？`, ans: a * b + d, h1: `${a * b}x+${d}x`, h2: `${a * b}+${d}=${a * b + d}` }; }),
          p("v4a2", (r) => { const a = r(2, 4), b = r(2, 4), c = r(1, 5); return { q: `${a}(${b}x+${c})-${a}(${b}x-${c}) の値は？`, ans: 2 * a * c, h1: `${a * c}+${a * c}`, h2: `${2 * a * c}` }; }),
          p("v4a3", (r) => { const a = r(2, 4), b = r(2, 3), c = r(1, 5); return { q: `${a}(${b}x+${c})÷${b} の x の係数は？`, ans: a, h1: `${a * b}x÷${b}`, h2: `係数は${a}` }; }),
          p("v4a4", (r) => { const a = r(2, 4), b = r(2, 4), c = r(1, 5), d = r(2, 4); return { q: `${a}(${b}x-${c})+${d}(x+${c}) の x の係数は？`, ans: a * b + d, h1: `${a * b}x+${d}x`, h2: `${a * b}+${d}=${a * b + d}` }; }),
          p("v4a5", (r) => { const a = r(2, 4), b = r(2, 4), c = r(1, 5); return { q: `-${a}(${b}x-${c}) の定数項は？`, ans: a * c, h1: `-${a}×(-${c})`, h2: `+${a * c}` }; }),
          p("v4a6", (r) => { const a = r(2, 4), b = r(2, 4), c = r(1, 5), d = r(2, 4); return { q: `${a}(${b}x+${c})-${d}(x-${c}) の x の係数は？`, ans: a * b - d, h1: `${a * b}x-${d}x`, h2: `${a * b}-${d}=${a * b - d}` }; }),
          p("v4a7", (r) => { const a = r(2, 3), b = r(2, 3), c = r(1, 5); return { q: `${a}(${b}x+${c})÷${a} の x の係数は？`, ans: b, h1: `${a * b}x÷${a}`, h2: `係数は${b}` }; }),
          p("v4a8", (r) => { const a = r(2, 4), b = r(2, 4), c = r(1, 5), d = r(2, 4); return { q: `${a}(${b}x+${c})+${d}(${b}x+${c}) の x の係数は？`, ans: (a + d) * b, h1: `(${a}+${d})×${b}x`, h2: `${a + d}×${b}=${(a + d) * b}` }; }),
          p("v4a9", (r) => { const a = r(2, 4), b = r(2, 4), c = r(1, 5); return { q: `-${a}(${b}x+${c})×(-1) の x の係数は？`, ans: a * b, h1: "符号が2回変わる", h2: `${a}×${b}=${a * b}` }; }),
          p("v4a10", (r) => { const a = r(2, 4), b = r(2, 4), c = r(1, 5); return { q: `(${a * b}x²+${a * c}x)÷${a} の x² の係数は？`, ans: b, h1: `各項を${a}で割る`, h2: `${a * b}÷${a}=${b}` }; }),
        ],
      },
    },
    {
      id: "v5",
      name: "四則混合（複合）",
      emoji: "🔀",
      desc: "括弧と分配をまとめて",
      problems: {
        easy: [
          p("v5e1", (r) => { const a = r(2, 4), b = r(2, 4), c = r(1, 4); return { q: `${a}x+${b}(${c}x-1) の x の係数は？`, ans: a + b * c, h1: `${b}(${c}x-1)=${b * c}x-${b}`, h2: `${a}+${b * c}=${a + b * c}` }; }),
          p("v5e2", (r) => { const a = r(2, 4), b = r(1, 4); return { q: `2(a+${a})+4(a-${b}) の定数項は？`, ans: 2 * a - 4 * b, h1: `${2 * a}-${4 * b}`, h2: `${2 * a - 4 * b}` }; }),
          p("v5e3", (r) => { const a = r(2, 4), b = r(2, 4), c = r(1, 4); return { q: `${a}x+${b}(x+${c}) の x の係数は？`, ans: a + b, h1: `${b}(x+${c})=${b}x+${b * c}`, h2: `${a}+${b}=${a + b}` }; }),
          p("v5e4", (r) => { const a = r(2, 4), b = r(2, 4), c = r(1, 4); return { q: `${a}(x-${c})+${b}x の定数項は？`, ans: -a * c, h1: `${a}×(-${c})`, h2: `定数項は${-a * c}` }; }),
          p("v5e5", (r) => { const a = r(2, 4), b = r(2, 4), c = r(1, 4); return { q: `${a}(x+${c})+${b}x の x の係数は？`, ans: a + b, h1: `${a}x+${b}x`, h2: `${a}+${b}=${a + b}` }; }),
          p("v5e6", (r) => { const a = r(2, 4), b = r(2, 4), c = r(1, 4); return { q: `${a}x+${b}(x+${c}) の定数項は？`, ans: b * c, h1: `${b}×${c}`, h2: `定数項は${b * c}` }; }),
          p("v5e7", (r) => { const a = r(2, 4), b = r(2, 4), c = r(1, 4); return { q: `${a}(x-${c})-${b}x の x の係数は？`, ans: a - b, h1: `${a}x-${b}x`, h2: `${a}-${b}=${a - b}` }; }),
          p("v5e8", (r) => { const a = r(2, 4), b = r(2, 4); return { q: `${a}(x+1)+${b}(x+1) の x の係数は？`, ans: a + b, h1: `${a}x+${b}x`, h2: `${a}+${b}=${a + b}` }; }),
          p("v5e9", (r) => { const a = r(2, 4), b = r(2, 4), c = r(1, 4); return { q: `${a}(x+${c})+${b}(x+${c}) の定数項は？`, ans: (a + b) * c, h1: `${a * c}+${b * c}`, h2: `${(a + b) * c}` }; }),
          p("v5e10", (r) => { const a = r(2, 4), b = r(2, 4); return { q: `${a}x+${b}(x-1)+1 の定数項は？`, ans: -b + 1, h1: `-${b}+1`, h2: `${-b + 1}` }; }),
        ],
        standard: [
          p("v5s1", (r) => { const a = r(2, 4), b = r(2, 4); return { q: `${a}(x-3)-${b}(${a}x-2) の x の係数は？`, ans: a - b * a, h1: `${a}x-${b * a}x`, h2: `${a}-${b * a}=${a - b * a}` }; }),
          p("v5s2", (r) => { const a = r(2, 4), b = r(2, 4), c = r(1, 4); return { q: `${a}(2x+${c})+${b}(3x-${c}) の x の係数は？`, ans: 2 * a + 3 * b, h1: `${2 * a}x+${3 * b}x`, h2: `${2 * a}+${3 * b}=${2 * a + 3 * b}` }; }),
          p("v5s3", (r) => { const a = r(2, 4), b = r(2, 4), c = r(1, 4); return { q: `${a}(2x+${c})-${b}x の x の係数は？`, ans: 2 * a - b, h1: `${2 * a}x-${b}x`, h2: `${2 * a}-${b}=${2 * a - b}` }; }),
          p("v5s4", (r) => { const a = r(2, 4), b = r(2, 4), c = r(1, 4); return { q: `${a}(x+${c})+${b}(x-${c}) の x の係数は？`, ans: a + b, h1: `${a}x+${b}x`, h2: `${a}+${b}=${a + b}` }; }),
          p("v5s5", (r) => { const a = r(2, 4), b = r(2, 4), c = r(1, 4); return { q: `${a}(2x+${c})-${b}(x-${c}) の x の係数は？`, ans: 2 * a - b, h1: `${2 * a}x-${b}x`, h2: `${2 * a}-${b}=${2 * a - b}` }; }),
          p("v5s6", (r) => { const a = r(2, 4), b = r(2, 4), c = r(1, 4); return { q: `${a}(x+${c})-${b}(x-${c}) の定数項は？`, ans: a * c + b * c, h1: `${a * c}+${b * c}`, h2: `${a * c + b * c}` }; }),
          p("v5s7", (r) => { const a = r(2, 4), b = r(2, 4), c = r(1, 4); return { q: `${a}(2x-${c})+${b}(2x+${c}) の x の係数は？`, ans: 2 * a + 2 * b, h1: `${2 * a}x+${2 * b}x`, h2: `${2 * a}+${2 * b}=${2 * a + 2 * b}` }; }),
          p("v5s8", (r) => { const a = r(2, 4), b = r(2, 4), c = r(1, 4); return { q: `${a}x-${b}(x-${c}) の x の係数は？`, ans: a - b, h1: `${a}x-${b}x`, h2: `${a}-${b}=${a - b}` }; }),
          p("v5s9", (r) => { const a = r(2, 4), b = r(2, 4), c = r(1, 4); return { q: `${a}(x+${c})-${b}x の定数項は？`, ans: a * c, h1: `${a}×${c}`, h2: `定数項は${a * c}` }; }),
          p("v5s10", (r) => { const a = r(2, 4), b = r(2, 4), c = r(1, 4), d = r(1, 4); return { q: `${a}(x+${c})+${b}(x+${d}) の定数項は？`, ans: a * c + b * d, h1: `${a * c}+${b * d}`, h2: `${a * c + b * d}` }; }),
        ],
        advanced: [
          p("v5a1", (r) => { const a = r(2, 4), b = r(1, 4); return { q: `½(6x-${2 * b})+¼(12x-8) の x の係数は？`, ans: 3 + 3, h1: "3x+3x", h2: "6" }; }),
          p("v5a2", (r) => { const a = r(2, 3), b = r(2, 3), c = r(1, 4); return { q: `${a}(${b}x+${c})-${a}×${b}x の定数項は？`, ans: a * c, h1: `${a * b}x+${a * c}-${a * b}x`, h2: `定数項${a * c}` }; }),
          p("v5a3", (r) => { const a = r(2, 3), b = r(2, 3), c = r(1, 4); return { q: `${a}(${b}x+${c})-${b}(${a}x-${c}) の定数項は？`, ans: a * c + b * c, h1: `定数項: ${a * c}+${b * c}`, h2: `${a * c + b * c}` }; }),
          p("v5a4", (r) => { const a = r(2, 5), b = r(1, 4), c = r(2, 5); return { q: `${a}(x+${b})-${c}(x-${b}) の x の係数は？`, ans: a - c, h1: `${a}x-${c}x`, h2: `${a}-${c}=${a - c}` }; }),
          p("v5a5", (r) => { const a = r(2, 3), b = r(2, 3), c = r(1, 4); return { q: `${a}(${b}x+${c})+${b}(${a}x-${c}) の x の係数は？`, ans: 2 * a * b, h1: `${a * b}x+${a * b}x`, h2: `${2 * a * b}` }; }),
          p("v5a6", (r) => { const a = r(2, 3), b = r(2, 3), c = r(1, 4); return { q: `${a}(${b}x+${c})-${b}(${a}x+${c}) の定数項は？`, ans: a * c - b * c, h1: `${a * c}-${b * c}`, h2: `${a * c - b * c}` }; }),
          p("v5a7", (r) => { const a = r(2, 3), b = r(2, 4); return { q: `${a}(2x+${b})-2(${a}x-${b}) の定数項は？`, ans: a * b + 2 * b, h1: `${a * b}+${2 * b}`, h2: `${a * b + 2 * b}` }; }),
          p("v5a8", (r) => { const a = r(2, 4), b = r(2, 4), c = r(1, 4); return { q: `${a}(x+${c})+${b}(2x-${c}) の x の係数は？`, ans: a + 2 * b, h1: `${a}x+${2 * b}x`, h2: `${a}+${2 * b}=${a + 2 * b}` }; }),
          p("v5a9", (r) => { const a = r(2, 3), b = r(2, 3), c = r(1, 4); return { q: `${a}(${b}x+${c})+${a}(${b}x-${c}) の x の係数は？`, ans: 2 * a * b, h1: `${a * b}x+${a * b}x`, h2: `${2 * a * b}` }; }),
          p("v5a10", (r) => { const a = r(2, 4), b = r(2, 4), c = r(1, 4), d = r(1, 4); return { q: `${a}(2x-${c})-${b}(x+${d}) の x の係数は？`, ans: 2 * a - b, h1: `${2 * a}x-${b}x`, h2: `${2 * a}-${b}=${2 * a - b}` }; }),
        ],
      },
    },
  ],
};

// 🔥鬼：負の数をまじえた式の値（代入）。全単元共通の難問。答えは数値（4択は自動生成）。
function fmtQuad(a, b, c) {
  const t = (co, s) => (co === 0 ? "" : (co > 0 ? "+" : "−") + (Math.abs(co) === 1 && s ? "" : Math.abs(co)) + s);
  return (a < 0 ? "−" : "") + (Math.abs(a) === 1 ? "" : Math.abs(a)) + "x²" + t(b, "x") + t(c, "");
}
function genOniC2(r) {
  const X = (r(0, 1) ? 1 : -1) * r(2, 5);
  const a = (r(0, 1) ? 1 : -1) * r(2, 4), b = (r(0, 1) ? 1 : -1) * r(2, 5), c = (r(0, 1) ? 1 : -1) * r(2, 6);
  const ans = a * X * X + b * X + c;
  return { q: `x=${X < 0 ? "(" + X + ")" : X} のとき、${fmtQuad(a, b, c)} の値を求めなさい。`, ans, h1: "負の数を代入するときは ( ) をつける", h2: `x=${X} を代入（累乗→積→和の順）` };
}

// 🔥鬼：応用（思考力）。全単元共通の難問プール。答えは数値（4択は自動生成）。
const oniBuilders = [
  // 1) 二次式の値（負の代入）
  genOniC2,
  // 2) 連続する整数の和の文章題：n,n+1,n+2 の和は 3n+3。具体値を問う
  (r) => { const n = r(5, 20); return { q: `連続する3つの整数のうち、まん中が ${n + 1} のとき、3つの和はいくつ？`, ans: 3 * n + 3, h1: "和は (まん中)×3", h2: `${n + 1}×3=${3 * n + 3}` }; },
  // 3) 代金の文章題：1個a円のりんごx個と100円の箱。具体値で総額
  (r) => { const a = r(60, 120), x = r(3, 8); return { q: `1個${a}円のりんごを${x}個買い、${100}円の箱に入れる。代金の合計は？（円）`, ans: a * x + 100, h1: "りんご代+箱代", h2: `${a}×${x}+100=${a * x + 100}` }; },
  // 4) 速さ：時速a kmでt時間進む道のり
  (r) => { const a = r(3, 8), t = r(2, 6); return { q: `時速${a}kmで${t}時間歩いたときの道のりは？（km）`, ans: a * t, h1: "道のり=速さ×時間", h2: `${a}×${t}=${a * t}` }; },
  // 5) 偶数の表し方：2nのn=具体値
  (r) => { const n = r(10, 40); return { q: `偶数は 2n と表せる。n=${n} のときの偶数は？`, ans: 2 * n, h1: "2×n", h2: `2×${n}=${2 * n}` }; },
  // 6) 平均：3つの数 a,b,c の平均×3＝和。和を問う
  (r) => { const m = r(10, 30); return { q: `3つの数の平均が ${m} のとき、3つの数の合計は？`, ans: 3 * m, h1: "合計=平均×個数", h2: `${m}×3=${3 * m}` }; },
  // 7) 等式変形の代入：y=ax+b に値を入れる
  (r) => { const a = r(2, 5), b = r(1, 9), x = r(2, 6); return { q: `y=${a}x+${b} で x=${x} のとき y の値は？`, ans: a * x + b, h1: "xを代入", h2: `${a}×${x}+${b}=${a * x + b}` }; },
  // 8) 残金：所持金a円からb円のものをx個。負にならない範囲
  (r) => { const b = r(50, 90), x = r(2, 5), a = b * x + r(50, 200); return { q: `${a}円持っていて、${b}円のおかしを${x}個買った。残金は？（円）`, ans: a - b * x, h1: "残金=所持金-代金", h2: `${a}-${b}×${x}=${a - b * x}` }; },
  // 9) 図形：縦a・横(a+d)の長方形の周の長さ
  (r) => { const a = r(3, 8), d = r(1, 5); return { q: `縦${a}cm、横${a + d}cmの長方形の周の長さは？（cm）`, ans: 2 * (a + (a + d)), h1: "周=(縦+横)×2", h2: `(${a}+${a + d})×2=${2 * (a + (a + d))}` }; },
  // 10) 二次式の値（別係数・思考）
  (r) => { const X = (r(0, 1) ? 1 : -1) * r(2, 4); const a = (r(0, 1) ? 1 : -1) * r(2, 3), b = (r(0, 1) ? 1 : -1) * r(2, 4); const ans = a * X * X + b * X; return { q: `x=${X < 0 ? "(" + X + ")" : X} のとき、${fmtQuad(a, b, 0)} の値を求めなさい。`, ans, h1: "累乗→積→和の順", h2: `x=${X} を代入` }; },
];
chapter.units.forEach((u) => {
  u.problems.oni = oniBuilders.map((fn, i) => p(u.id + "oni" + (i + 1), fn));
});
