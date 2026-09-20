// ============================================================
// g3c8 — 中3「標本調査」（★自動作問版）
//  用語・判断は語句の4択（毎回シャッフル）、推定は数値で自動生成。
// ============================================================
import { exprChoices, numChoices } from "../_algebra.js";

const p = (id, build, skill = null) => ({ id, build, skill });
// 同じ build を、連番 id で count 個ぶん展開（毎回 r() で違う問題になる）
const rep = (base, count, build, skill = null) => Array.from({ length: count }, (_, i) => p(base + i, build, skill));
const rpick = (r, arr) => arr[r(0, arr.length - 1)];
const shuffle = (r, arr) => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = r(0, i); [a[i], a[j]] = [a[j], a[i]]; } return a; };

// ── u1 用語（語句4択） ──
const TERMS = [
  { q: "調査の対象となる集団全体を何といいますか。", ans: "母集団", ds: ["標本", "標本の大きさ", "度数分布"] },
  { q: "母集団の一部を取り出して調べ、全体の傾向を推測する調査を何といいますか。", ans: "標本調査", ds: ["全数調査", "国勢調査", "度数調査"] },
  { q: "母集団から取り出した一部分を何といいますか。", ans: "標本", ds: ["母集団", "全数調査", "階級"] },
  { q: "取り出した標本にふくまれるデータの個数を何といいますか。", ans: "標本の大きさ", ds: ["母集団の大きさ", "相対度数", "中央値"] },
  { q: "対象全部をもれなく調べる調査を何といいますか。", ans: "全数調査", ds: ["標本調査", "母集団", "標本"] },
];
const termTemplates = (skill, base = "g3c8u1t") => TERMS.map((t, i) => p(base + i, (r) => ({ q: t.q, ans: t.ans, choices: exprChoices(t.ans, t.ds, [], r), h1: "標本調査の用語を覚えよう", h2: `答えは「${t.ans}」` }), skill));

// ── u2 全数調査と標本調査の判断 ──
const ZENSU = ["学校でのクラス全員の身長測定", "国勢調査", "中学校の入学試験", "学級の出席調査"];
const HYOHON = ["電球の寿命を調べる検査", "テレビ番組の視聴率調査", "缶詰の品質検査", "湖にいる魚の数の推定"];
function genJudge(r) {
  const wantHyohon = r(0, 1) === 1;
  const pool = wantHyohon ? HYOHON : ZENSU, other = wantHyohon ? ZENSU : HYOHON;
  const correct = rpick(r, pool);
  const ds = shuffle(r, other).slice(0, 3);
  const label = wantHyohon ? "標本調査" : "全数調査";
  return { q: `次のうち、${label}が適切なものはどれですか。`, ans: correct, choices: exprChoices(correct, ds, [], r), h1: "全部を調べるのが現実的か、こわす・手間がかかるかで判断", h2: wantHyohon ? "全部調べると大変／製品をこわす → 標本調査" : "全員を確実に調べる必要がある → 全数調査" };
}

// ── u3 標本調査による推定（数値） ──
function genEstimate(r, level) {
  if (level === "easy") {
    // 不良品の推定： N個中、標本n個でk個不良 → N·k/n
    const n = rpick(r, [50, 100, 200]), k = r(1, 6), mult = rpick(r, [10, 20, 50]);
    const N = n * mult, est = k * mult;
    return { q: `製品 ${N} 個から ${n} 個を取り出して調べたら、不良品が ${k} 個ありました。${N} 個の中の不良品はおよそ何個と推定できますか。`, ans: est, choices: numChoices(est, r, [k, k * n, N - est]), h1: "標本での割合が母集団でも同じとみなす", h2: `${N}×(${k}/${n})=${est}` };
  }
  // 標識再捕法： m匹に印 → 後日s匹中t匹が印つき → 全体 ≈ m·s/t = m·k（s=t·k）
  const m = r(2, 8) * 5, k = r(2, 5), t = r(2, 6), s = t * k, N = m * k;
  return { q: `池の魚に印をつけて放した魚は ${m} 匹。後日 ${s} 匹つかまえると、印つきは ${t} 匹でした。池の魚はおよそ何匹と推定できますか。`, ans: N, choices: numChoices(N, r, [m + s, s * t, m * s]), h1: "印の割合（印つき/つかまえた数）が全体と同じとみなす", h2: `${m}×(${s}/${t})=${N}` };
}

// ============================================================
// ▼ 追加分（各 unit を easy/standard/advanced/oni 各10問に）
//   比例推定は「母集団推定値＝母集団サイズ×(標本中の該当数/標本数)」を厳密に。
//   r() の組合せを割り切れる設計にし、ans は常にきれいな整数。
// ============================================================

// ── 追加の用語（語句4択）。区別・標本比の確認も含む ──
const TERMS2 = [
  { q: "実際に調査・測定して得られた、もとになる数や量をまとめて何といいますか。", ans: "データ", ds: ["母集団", "標本", "階級値"] },
  { q: "標本を母集団から取り出すとき、かたよりが出ないように選ぶことを何といいますか。", ans: "無作為に抽出する", ds: ["全数調査する", "順番に並べる", "大きい順に選ぶ" ] },
  { q: "標本の性質から母集団の性質を推測することを何といいますか。", ans: "母集団の推定", ds: ["全数調査", "度数分布", "標本の整理"] },
  { q: "母集団全体にふくまれるものの個数を何といいますか。", ans: "母集団の大きさ", ds: ["標本の大きさ", "相対度数", "階級の幅"] },
  { q: "くじ引きや乱数表を使って、どれも同じ確からしさで標本を選ぶ方法を何といいますか。", ans: "無作為抽出", ds: ["全数調査", "比例配分", "度数調査"] },
];
const termTemplates2 = (skill, base) => TERMS2.map((t, i) => p(base + i, (r) => ({ q: t.q, ans: t.ans, choices: exprChoices(t.ans, t.ds, [], r), h1: "標本調査の用語を覚えよう", h2: `答えは「${t.ans}」` }), skill));

// ── 追加の判断（全数調査／標本調査の区別）。標本比の確認も混ぜる ──
const ZENSU2 = ["健康診断での全校生徒の視力検査", "工場での全製品の重量検査（壊さない）", "市の人口を数える調査", "クラス全員の通学時間の調査"];
const HYOHON2 = ["新聞の世論調査", "ある県の中学生の睡眠時間の調査", "電池の連続使用時間の検査", "出荷するみかんの糖度検査"];
function genJudge2(r) {
  const wantHyohon = r(0, 1) === 1;
  const pool = wantHyohon ? HYOHON2 : ZENSU2, other = wantHyohon ? ZENSU2 : HYOHON2;
  const correct = rpick(r, pool);
  const ds = shuffle(r, other).slice(0, 3);
  const label = wantHyohon ? "標本調査" : "全数調査";
  return { q: `次のうち、${label}が適切なものはどれですか。`, ans: correct, choices: exprChoices(correct, ds, [], r), h1: "全部を調べるのが現実的か、こわす・手間がかかるかで判断", h2: wantHyohon ? "全部調べると大変／製品をこわす → 標本調査" : "全員を確実に調べる必要がある → 全数調査" };
}
// 標本比（標本中の割合）を求める：標本n個中k個 → 割合 k/n を百分率で（割り切れる設計）
function genRatio(r) {
  const n = rpick(r, [20, 25, 40, 50]), pct = rpick(r, [10, 20, 25, 40, 50]);
  const k = n * pct / 100; // n と pct は割り切れる組合せのみ
  return { q: `標本 ${n} 個を調べたら、当たりが ${k} 個ありました。標本での当たりの割合は何％ですか。`, ans: pct, choices: numChoices(pct, r, [k, n - k, k * 2]), h1: "割合＝該当数÷標本数×100", h2: `${k}÷${n}×100=${pct}（％）` };
}

// ── 追加の推定（比例推定を厳密に・必ず割り切れる整数） ──
// (A) 全体 N 個のうち該当の推定： 標本 n 個中 k 個該当 → N×(k/n)
function genEstA(r) {
  // n が N を割り切り、k/n が約分できる形。est = N·k/n を整数に。
  const n = rpick(r, [40, 50, 80, 100]), mult = rpick(r, [5, 8, 10, 20]);
  const N = n * mult, k = r(2, 8), est = k * mult; // est = N·k/n = k·mult（整数）
  return { q: `袋の中に玉が ${N} 個入っています。${n} 個を取り出すと赤玉が ${k} 個ありました。袋全体の赤玉はおよそ何個と推定できますか。`, ans: est, choices: numChoices(est, r, [k, N - est, k * n]), h1: "標本の割合が全体でも同じとみなす", h2: `${N}×(${k}/${n})=${est}` };
}
// (B) 標識再捕法： m匹に印 → s匹中t匹が印 → 全体 ≈ m·s/t（s=t·k で割り切れる）
function genEstB(r) {
  const m = r(3, 9) * 10, k = r(2, 6), t = r(2, 5), s = t * k, N = m * k;
  return { q: `湖の魚に印をつけて放した数は ${m} 匹です。後日 ${s} 匹つかまえると印つきは ${t} 匹でした。湖の魚はおよそ何匹と推定できますか。`, ans: N, choices: numChoices(N, r, [m + s, s * t, m + t]), h1: "印の割合（印つき/つかまえた数）が全体と同じとみなす", h2: `${m}×(${s}/${t})=${N}` };
}
// (C) 標本の比率から母集団中の個数（百分率）： 母集団Nで標本がp% → N×p/100
function genEstC(r) {
  const pct = rpick(r, [10, 20, 25, 40, 50]), base = rpick(r, [200, 400, 500, 800, 1000]);
  const est = base * pct / 100; // 割り切れる
  const n = rpick(r, [20, 25, 40, 50]), k = n * pct / 100;
  return { q: `ある中学校の生徒 ${base} 人の中から ${n} 人を選んで調べたら、運動部の生徒が ${k} 人いました。学校全体の運動部の生徒はおよそ何人と推定できますか。`, ans: est, choices: numChoices(est, r, [k, base - est, k * 2]), h1: "標本の割合（人数÷標本数）が全体でも同じ", h2: `${base}×(${k}/${n})=${est}` };
}

// ── advanced：複数ステップの推定 ──
// (D) 標本で該当を求め→母集団に拡大→さらに「該当でない数」を出す 2ステップ
function genEstD(r) {
  const n = rpick(r, [50, 100]), mult = rpick(r, [4, 5, 8, 10]);
  const N = n * mult, k = r(2, 8), hit = k * mult, rest = N - hit; // 該当でない数
  return { q: `製品 ${N} 個から ${n} 個を選ぶと不良品が ${k} 個ありました。${N} 個のうち良品はおよそ何個と推定できますか。`, ans: rest, choices: numChoices(rest, r, [hit, k, N]), h1: "まず不良品を推定し、全体から引く", h2: `不良品≈${N}×(${k}/${n})=${hit}、良品=${N}−${hit}=${rest}` };
}
// (E) 2回の抽出の合計から推定（標本を合算してから比例）
function genEstE(r) {
  const n1 = rpick(r, [20, 25]), n2 = rpick(r, [20, 25]), n = n1 + n2;
  const mult = rpick(r, [10, 20]), N = n * mult;
  const k1 = r(1, 4), k2 = r(1, 4), k = k1 + k2, est = k * mult;
  return { q: `池で ${n1} 匹、別の日に ${n2} 匹つかまえ、印つきはそれぞれ ${k1} 匹と ${k2} 匹でした。合わせた標本(${n}匹中${k}匹)から池全体を ${N} 匹と推定すると、印のない魚はおよそ何匹ですか。`, ans: N - est, choices: numChoices(N - est, r, [est, k, N]), h1: "標本を合算してから全体に拡大する", h2: `印つき≈${N}×(${k}/${n})=${est}、印なし=${N}−${est}=${N - est}` };
}

// ── oni：応用の難問（答えは1つの数値・比例推定を厳密に） ──
// (F) 二重抽出・標識再捕の応用： 母集団を求めてから差や残りを問う
function genOniA(r) {
  const m = r(4, 9) * 10, k = r(3, 6), t = r(2, 5), s = t * k, N = m * k;
  const remain = N - m; // 印のついていない魚
  return { q: `湖の魚 ${m} 匹に印をつけて放しました。後日 ${s} 匹つかまえると印つきは ${t} 匹でした。湖にいる印のついていない魚はおよそ何匹と推定できますか。`, ans: remain, choices: numChoices(remain, r, [N, m, s]), h1: "全体を推定してから、印つき m 匹を引く", h2: `全体≈${m}×(${s}/${t})=${N}、印なし=${N}−${m}=${remain}` };
}
// (G) 不良率→生産数の応用： 標本の不良率から、ある不良個数になる生産数を逆算
function genOniB(r) {
  const n = rpick(r, [50, 100]), k = r(1, 5); // 標本不良率 k/n
  const target = k * rpick(r, [20, 30, 50, 100]); // 全体の不良見込み（k の倍数）
  const N = target * n / k; // 生産数 = target ÷(k/n)。k|target なので整数
  return { q: `製品を ${n} 個調べると不良品が ${k} 個ありました。同じ割合のとき、不良品がおよそ ${target} 個になるのは、全部で何個つくったときと推定できますか。`, ans: N, choices: numChoices(N, r, [target, n, target * k]), h1: "不良率 k/n を保ったまま、不良数から全体を逆算", h2: `全体=${target}÷(${k}/${n})=${N}` };
}
// (H) 二段階の割合（標本中の割合×別の割合）で人数推定
function genOniC(r) {
  const base = rpick(r, [400, 500, 800, 1000]);
  const pctA = rpick(r, [20, 40, 50]);          // 標本での「読書する」割合
  const readers = base * pctA / 100;            // 全体の読書人数（整数）
  // 毎日読む割合 pctB は readers を割り切る％だけ採用（est を必ず整数に）
  const pctB = rpick(r, [20, 40, 50].filter((b) => (readers * b) % 100 === 0));
  const est = readers * pctB / 100;             // 整数
  const n = rpick(r, [20, 25, 50]), kA = n * pctA / 100;
  return { q: `生徒 ${base} 人から ${n} 人を選ぶと読書する人が ${kA} 人いて、そのうち毎日読む人は ${pctB}％でした。学校全体で毎日読む生徒はおよそ何人と推定できますか。`, ans: est, choices: numChoices(est, r, [readers, kA, base * pctB / 100]), h1: "全体の読書人数を推定し、さらにその割合をかける", h2: `読書≈${base}×(${kA}/${n})=${readers}、毎日=その${pctB}％=${est}` };
}

export const chapter = {
  id: "g3c8",
  name: "標本調査",
  emoji: "📊",
  color: "#94a3b8",
  grade: 3,
  units: [
    {
      id: "g3c8u1", name: "標本調査の用語", emoji: "📖", desc: "母集団・標本など",
      problems: {
        // 既存 termTemplates(5) ＋ 追加 termTemplates2(5) で各10
        easy: [...termTemplates("S-SAMP-TERM", "g3c8u1et"), ...termTemplates2("S-SAMP-TERM", "g3c8u1ea")],
        standard: [...termTemplates("S-SAMP-TERM", "g3c8u1st"), ...termTemplates2("S-SAMP-TERM", "g3c8u1sa")],
        advanced: [...termTemplates("S-SAMP-TERM", "g3c8u1at"), ...termTemplates2("S-SAMP-TERM", "g3c8u1aa")],
        // 鬼：用語の応用（標本比の確認5 ＋ 区別の難判断5）
        oni: [...rep("g3c8u1o", 5, genRatio, "S-SAMP-RATIO"), ...rep("g3c8u1oj", 5, genJudge2, "S-SAMP-JUDGE")],
      },
    },
    {
      id: "g3c8u2", name: "全数調査と標本調査の判断", emoji: "🔍", desc: "どちらが適切か",
      problems: {
        // 既存1 ＋ 追加9（genJudge と genJudge2 を混ぜる）で各10
        easy: [p("g3c8u2e", genJudge, "S-SAMP-JUDGE"), ...rep("g3c8u2ex", 5, genJudge, "S-SAMP-JUDGE"), ...rep("g3c8u2ej", 4, genJudge2, "S-SAMP-JUDGE")],
        standard: [p("g3c8u2s", genJudge, "S-SAMP-JUDGE"), ...rep("g3c8u2sx", 5, genJudge2, "S-SAMP-JUDGE"), ...rep("g3c8u2sr", 4, genRatio, "S-SAMP-RATIO")],
        advanced: [p("g3c8u2a", genJudge, "S-SAMP-JUDGE"), ...rep("g3c8u2ax", 5, genJudge2, "S-SAMP-JUDGE"), ...rep("g3c8u2ar", 4, genRatio, "S-SAMP-RATIO")],
        // 鬼：判断＋標本比の総合
        oni: [...rep("g3c8u2o", 5, genJudge2, "S-SAMP-JUDGE"), ...rep("g3c8u2or", 5, genRatio, "S-SAMP-RATIO")],
      },
    },
    {
      id: "g3c8u3", name: "標本調査による推定", emoji: "🧮", desc: "割合で推定",
      problems: {
        // 既存1 ＋ 追加9 で各10
        easy: [p("g3c8u3e", (r) => genEstimate(r, "easy"), "S-SAMP-EST"), ...rep("g3c8u3ea", 5, genEstA, "S-SAMP-EST"), ...rep("g3c8u3ec", 4, genEstC, "S-SAMP-EST")],
        standard: [p("g3c8u3s", (r) => genEstimate(r, "standard"), "S-SAMP-EST"), ...rep("g3c8u3sa", 4, genEstA, "S-SAMP-EST"), ...rep("g3c8u3sb", 3, genEstB, "S-SAMP-EST"), ...rep("g3c8u3sc", 2, genEstC, "S-SAMP-EST")],
        advanced: [p("g3c8u3a", (r) => genEstimate(r, "advanced"), "S-SAMP-EST"), ...rep("g3c8u3ad", 5, genEstD, "S-SAMP-EST"), ...rep("g3c8u3ae", 4, genEstE, "S-SAMP-EST")],
        // 鬼：複数ステップ・逆算・二段階の割合
        oni: [...rep("g3c8u3oa", 4, genOniA, "S-SAMP-EST"), ...rep("g3c8u3ob", 3, genOniB, "S-SAMP-EST"), ...rep("g3c8u3oc", 3, genOniC, "S-SAMP-EST")],
      },
    },
  ],
};
