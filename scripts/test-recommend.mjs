// おすすめエンジン（recommend.js・learnerProfile.js）の自動テスト。架空の生徒の解答記録を作って、
//  「理解度の推定」「難易度の選び方」「土台への遡り」「ふくしゅう」「つぎへ／ちょうせん」がねらいどおりに動くかを確かめる。
//  実行: npm run test:recommend
import { build } from "esbuild";
await build({
  stdin: { contents: `export * from "./src/third/recommend.js"; export * from "./src/third/learnerProfile.js"; export { UNIT_PREREQS } from "./src/third/unitPrereqs.js"; export { GRADES } from "./src/data/index.js"; export { haichiKeyForUnit } from "./src/third/core.js";`, resolveDir: process.cwd(), loader: "js" },
  bundle: true, format: "esm", platform: "node", outfile: "dist-fn/_rec.mjs", loader: { ".json": "json" }, logLevel: "error",
});
const T = await import("../dist-fn/_rec.mjs");
let pass = 0, fail = 0;
const t = (name, cond, extra = "") => { (cond ? pass++ : fail++); console.log(`${cond ? "✅" : "❌"} ${name}${cond ? "" : "  " + extra}`); };

const NOW = Date.parse("2026-09-30T12:00:00+09:00");
const DAY = 86400000;
let seed = 12345;
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
// 単元 unitId を、難易度ごとの本当の正答率 p で n問ずつ、daysAgo 日前に解いた記録
function rows(unitId, spec, daysAgo = 1) {
  const out = [];
  let k = 0;
  for (const [level, n, p] of spec) for (let i = 0; i < n; i++) out.push({ unit_id: unitId, difficulty: level, ok: rnd() < p, created_at: new Date(NOW - daysAgo * DAY + (k++) * 60000).toISOString() });
  return out;
}
// はいちメダルは「動画レッスンのキー」で持つ（単元IDではない）
const medalsOf = (m = {}) => ({ medals: { practiceN: m.practiceN || {}, haichi: Object.fromEntries(Object.keys(m.haichi || {}).map((u) => [T.haichiKeyForUnit(u), true])), pracLv: {}, battle: m.battle || {} } });
function run({ attempts = [], tags = [], mistakes = [], quiz = [], medals = {}, grade = 1 }) {
  const A = T.analyzeLearner({ units: T.summarizeAttempts(attempts), tags: T.summarizeTags(tags), mistakes, medalState: medalsOf(medals), quizWeakUnits: quiz.map((u) => ({ unitId: u })), grade, now: NOW });
  return { A, cards: T.recommendToday(A) };
}
const show = (cards) => cards.map((c) => `${c.slot}:${c.unitId}/${c.action}${c.level ? "/" + c.level : ""}`).join(" ");

// ---- 集計（learnerProfile）
{
  const s = T.summarizeAttempts([
    { unit_id: "u1", difficulty: "easy", ok: true, created_at: "2026-09-29T01:00:00Z" },
    { unit_id: "u1", difficulty: "normal", ok: false, created_at: "2026-09-29T02:00:00Z" },
    { unit_id: "u1", difficulty: "hard", ok: true, created_at: "2026-09-28T02:00:00Z" },
  ]);
  t("集計：難易度ごとの回数と正解（normal→普通・hard→難しい）", JSON.stringify(s.u1.lv) === JSON.stringify({ advanced: [1, 1], easy: [1, 1], standard: [1, 0] }), JSON.stringify(s.u1.lv));
  t("集計：直近の並び（古い→新しい・大文字＝正解）と最後の日", s.u1.seq === "AEs" && s.u1.last === "2026-09-29" && s.u1.n === 3, `${s.u1.seq} ${s.u1.last}`);
  const long = T.summarizeAttempts(rows("u2", [["easy", 50, 1]]));
  t("集計：並びは直近30問まで・回数は全部", long.u2.seq.length === 30 && long.u2.lv.easy[0] === 50);
  const fr = T.profileFromRecords([{ unitId: "u3", level: "standard", correct: 3, wrong: 2, createdAt: "2026-09-20T00:00:00Z" }]);
  t("端末の記録から：正解3・まちがい2 を同じ形に", fr.u3.lv.standard[0] === 5 && fr.u3.lv.standard[1] === 3 && fr.u3.seq.length === 5);
  const tg = T.mergeTags(T.summarizeTags([{ unit_id: "e1", mistake_tag: "x" }, { unit_id: "e1", mistake_tag: "x" }]), T.tagsFromStats({ x: { count: 1, unitId: "e1" }, y: { count: 3, unitId: "e2" } }));
  t("誤答タグ：サーバーと端末を合わせる（同じタグは大きい方）", tg.e1.x === 2 && tg.e2.y === 3);
}

// ---- 理解度の推定
{
  const { A } = run({ attempts: [...rows("u2", [["easy", 10, 0.95], ["standard", 10, 0.9]]), ...rows("u3", [["easy", 10, 0.4], ["standard", 6, 0.2]])] });
  const a = A.insights.u2, b = A.insights.u3;
  t("理解度：よくできている単元は高く、つまずいている単元は低い", a.understanding > 0.7 && b.understanding < 0.45, `u2=${a.understanding.toFixed(2)} u3=${b.understanding.toFixed(2)}`);
  t("理解度の帯：できた以上／のびしろ", ["ok", "great"].includes(a.band.key) && b.band.key === "grow", `${a.band.key} ${b.band.key}`);
  const { A: A2, cards: c2 } = run({ attempts: rows("u2", [["standard", 2, 0]]) });
  t("データが少ない単元（2問まちがい）は「仮」で、のびしろのおすすめには出さない", A2.insights.u2.provisional === true && !c2.some((c) => c.slot === "grow"), `${A2.insights.u2.understanding.toFixed(2)} ${show(c2)}`);
  const { A: A3 } = run({ attempts: [...rows("u2", [["standard", 12, 0.2]], 20), ...rows("u2", [["standard", 12, 0.95]], 1)] });
  t("最近できるようになった単元は、理解度が上がる（新しい記録ほど重い）", A3.insights.u2.understanding > 0.6, A3.insights.u2.understanding.toFixed(2));
}

// ---- 難易度の選び方（期待正答率 0.75 に一番近いもの）
t("難易度：力が低い→簡単", T.pickLevel(0.2, 0.75) === "easy");
t("難易度：ふつう→普通", T.pickLevel(0.78, 0.75) === "standard");
t("難易度：力が高い→難しい以上", ["advanced", "oni"].includes(T.pickLevel(1.05, 0.75)));

// ---- 苦手な子：土台に遡る
{
  // 方程式①(e1)が苦手。土台の 文字式の加法・減法(v3) もにがて、正負(u5)は できている
  const attempts = [
    ...rows("e1", [["easy", 10, 0.35], ["standard", 8, 0.15]], 2),
    ...rows("v3", [["easy", 10, 0.35], ["standard", 6, 0.2]], 10),
    ...rows("u5", [["easy", 10, 0.95], ["standard", 10, 0.85]], 20),
  ];
  const { cards } = run({ attempts, medals: { haichi: { e1: true, v3: true } } });
  const g = cards.find((c) => c.slot === "grow");
  t("苦手：のびしろは土台の「文字式の加法・減法」から", g && g.unitId === "v3" && g.root?.unitId === "e1", show(cards));
  t("苦手：土台は「簡単」から", g && g.action === "practice" && g.level === "easy", show(cards));
  t("苦手：理由に土台の説明が入る", g && /土台/.test(g.reason), g?.reason);
}
{
  // 土台はできている → その単元そのもの
  const attempts = [...rows("e1", [["easy", 10, 0.5], ["standard", 8, 0.3]], 2), ...rows("v3", [["easy", 10, 0.95], ["standard", 8, 0.9]], 5)];
  const { cards } = run({ attempts, medals: { haichi: { e1: true } } });
  t("土台ができていれば、その単元をそのまま", cards[0]?.slot === "grow" && cards[0].unitId === "e1" && !cards[0].root, show(cards));
}
{
  // 動画をまだ見ていない・理解度がとても低い → 学ぶ（はいち）
  const { cards } = run({ attempts: rows("u3", [["easy", 8, 0.2], ["standard", 6, 0.1]], 1) });
  t("まだ学んでいない＆とても低い → 学ぶ（動画）", cards[0]?.unitId === "u3" && cards[0].action === "haichi", show(cards));
}
{
  // まちがいノートが多い・理解度はそこそこ → なおす
  const mistakes = Array.from({ length: 4 }, () => ({ unitId: "u4" }));
  const { cards } = run({ attempts: rows("u4", [["easy", 10, 0.9], ["standard", 10, 0.6]], 1), mistakes, medals: { haichi: { u4: true } } });
  t("まちがいノートに4問 → その単元の学び直し", cards[0]?.unitId === "u4" && cards[0].action === "relearn", show(cards));
}
{
  // 誤答タグが理由に出る
  const tags = Array.from({ length: 3 }, () => ({ unit_id: "e2", mistake_tag: "sign-flip" }));
  const { cards } = run({ attempts: rows("e2", [["easy", 10, 0.6], ["standard", 10, 0.3]], 1), tags, medals: { haichi: { e2: true } } });
  t("誤答タグの回数が理由に出る", cards[0]?.unitId === "e2" && /3回/.test(cards[0].reason), cards[0]?.reason);
}
{
  // 先生の小テストでつまずいた単元は最優先（データが少なくても）
  const attempts = [...rows("u3", [["standard", 10, 0.4]], 1), ...rows("h1", [["standard", 1, 0]], 1)];
  const { cards } = run({ attempts, quiz: ["h1"] });
  t("小テストの苦手は最優先", cards[0]?.unitId === "h1" && /小テスト/.test(cards[0].reason), show(cards));
}

// ---- ふくしゅう（忘れかけ）
{
  const attempts = [...rows("u2", [["easy", 8, 0.9], ["standard", 8, 0.8]], 25), ...rows("u3", [["standard", 8, 0.9]], 1)];
  const { cards } = run({ attempts, medals: { haichi: { u2: true, u3: true }, practiceN: { u2: 5, u3: 5 } } });
  const r = cards.find((c) => c.slot === "review");
  t("25日前にできていた単元 → ふくしゅう", r && r.unitId === "u2" && /25日/.test(r.reason), show(cards));
  const { cards: c2 } = run({ attempts: rows("u2", [["easy", 8, 0.9], ["standard", 8, 0.8]], 2), medals: { practiceN: { u2: 5 } } });
  t("2日前なら、まだふくしゅうに出さない", !c2.some((c) => c.slot === "review" && c.unitId === "u2"), show(c2));
}

// ---- つぎへ／ちょうせん
{
  const { cards } = run({});
  t("はじめての子：つぎへ＝最初の単元を動画で", cards[0]?.slot === "next" && cards[0].unitId === "u1" && cards[0].action === "haichi", show(cards));
}
{
  // 得意な子：難しい・鬼に挑戦
  const attempts = [
    ...rows("u1", [["easy", 10, 1], ["standard", 10, 0.95], ["advanced", 10, 0.9]], 1),
    ...rows("u2", [["easy", 10, 1], ["standard", 10, 0.95], ["advanced", 8, 0.85]], 2),
    ...rows("u3", [["standard", 10, 0.95], ["advanced", 8, 0.8]], 3),
  ];
  const { cards } = run({ attempts, medals: { haichi: { u1: true, u2: true, u3: true }, practiceN: { u1: 5, u2: 5, u3: 5 } } });
  const ch = cards.find((c) => c.slot === "challenge");
  t("得意な子：ちょうせん（難しい or 鬼）が出る", ch && ["advanced", "oni"].includes(ch.level), show(cards));
  t("得意な子：つぎへ（まだ練習していない単元）も出る", cards.some((c) => c.slot === "next" && c.unitId === "u4"), show(cards));
}
{
  // 中2の子：中1の土台（1次方程式）がにがて → 中2の連立方程式から遡る
  const attempts = [...rows("g2c2u1", [["easy", 10, 0.3], ["standard", 8, 0.1]], 1), ...rows("e2", [["easy", 10, 0.3], ["standard", 6, 0.2]], 40)];
  const { cards } = run({ attempts, grade: 2, medals: { haichi: { g2c2u1: true, e2: true } } });
  t("学年をまたいで土台へ（中2 連立 → 中1 方程式②）", cards[0]?.unitId === "e2" && cards[0].grade === 1, show(cards));
}

{
  // 「普通」しか解いていない得意な単元 → いきなり鬼でなく、1つ上の「難しい」
  const attempts = [...rows("u1", [["standard", 12, 1]], 2), ...rows("u2", [["standard", 12, 0.95], ["advanced", 8, 0.9]], 1), ...rows("u3", [["standard", 12, 0.95]], 1)];
  const { A } = run({ attempts, medals: { haichi: { u1: true, u2: true, u3: true }, practiceN: { u1: 5, u2: 5, u3: 5 } } });
  const all = T.recommendToday(A, { max: 5 });
  const byU = Object.fromEntries(all.filter((c) => c.slot === "challenge").map((c) => [c.unitId, c.level]));
  const one = Object.entries(byU)[0];
  t("ちょうせんは、できている段の1つ上（普通だけ→難しい／難しいもできた→鬼）", one && (one[0] === "u2" ? one[1] === "oni" : one[1] === "advanced"), JSON.stringify(byU));
}
{
  // ふつうの子（全体の理解度 0.7前後）は「ちょうせん」より「つぎへ」を先に
  const attempts = [...rows("u1", [["standard", 12, 0.8]], 3), ...rows("u2", [["standard", 12, 0.75]], 2), ...rows("u3", [["standard", 12, 0.7]], 1)];
  const { cards } = run({ attempts, medals: { haichi: { u1: true, u2: true, u3: true }, practiceN: { u1: 5, u2: 5, u3: 5 } } });
  t("ふつうの子：つぎへ（次の単元）が出る", cards.some((c) => c.slot === "next"), show(cards));
}

// ---- 3枚まで・同じ単元は1回だけ
{
  const attempts = [];
  for (const u of ["u1", "u2", "u3", "u4", "u5"]) attempts.push(...rows(u, [["easy", 8, 0.5], ["standard", 8, 0.3]], 3));
  const { cards } = run({ attempts });
  t("カードは3枚まで・単元の重なりなし", cards.length <= 3 && new Set(cards.map((c) => c.unitId)).size === cards.length, show(cards));
}

// ---- 速さ（先生の画面で70人ぶん）
{
  const t0 = Date.now();
  for (let s = 0; s < 70; s++) {
    const attempts = [];
    for (const u of ["u1", "u2", "u3", "u4", "u5", "v1", "v2", "v3", "e1", "e2"]) attempts.push(...rows(u, [["easy", 6, 0.7], ["standard", 8, 0.5], ["advanced", 4, 0.3]], 1 + (s % 9)));
    run({ attempts });
  }
  const ms = Date.now() - t0;
  t(`速さ：70人ぶんの分析が1.5秒以内（${ms}ms）`, ms < 1500, `${ms}ms`);
}

// ---- 土台の対応表が実在する単元だけを指しているか
{
  const ids = new Set(); for (const g of [1, 2, 3]) for (const c of T.GRADES[g]) for (const u of c.units) ids.add(u.id);
  const bad = Object.entries(T.UNIT_PREREQS).flatMap(([k, v]) => [k, ...v].filter((x) => !ids.has(x)));
  t("土台の対応表：実在する単元IDだけ", bad.length === 0, bad.join(","));
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
