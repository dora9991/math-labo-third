// ============================================================
// rank.js — 「やりこみ段位」（10級 → 1級 → 初段 → … → 十段 → 名人）
//  生徒のご意見「やりこみ度がわかるようにランクや段位を追加してほしい」（2026-10-06）への対応。
//
//  ★レベルとの違い★
//    レベル … クリアした単元の数＝「どこまで進んだか」（進度）。
//    段位   … 正解した問題の数＋学んだ日数＝「どれだけやりこんだか」（努力量）。
//  どれだけ進んだかでなく、コツコツ解いた量と続けた日数が段位になる。
//
//  やりこみポイント(P) = 累計の正解数 ＋ 学んだ日数 × POINTS_PER_DAY
//   ・正解数 … records（タイムアタック・バトル・じっくり・単元テスト等の記録）の correct の合計
//              ＋ player.stepCorrect（ステップアップ・学び直し・確認問題など記録を残さない場面の正解数）。
//   ・まちがい・時間切れは数えない（連打で稼げないように）。
//   ・学んだ日数 … player.streaks（XPが動いた日をかぞえる累計日数）。
//  純関数のみ（React・保存に依存しない）なので Node でそのままテストできる。
// ============================================================

export const POINTS_PER_DAY = 10; // 学んだ日1日あたりのやりこみポイント

// 段位の表。min=その段位になるのに必要なP。昇順で並べる（rankFor が最後に条件を満たしたものを返す）。
//  kind: kyu=級 / dan=段 / meijin=名人（バッジの絵文字と見た目の分岐用）
export const RANKS = [
  { min: 0,     name: "10級", kind: "kyu", color: "#94a3b8" },
  { min: 30,    name: "9級",  kind: "kyu", color: "#94a3b8" },
  { min: 80,    name: "8級",  kind: "kyu", color: "#86efac" },
  { min: 150,   name: "7級",  kind: "kyu", color: "#4ade80" },
  { min: 250,   name: "6級",  kind: "kyu", color: "#34d399" },
  { min: 400,   name: "5級",  kind: "kyu", color: "#2dd4bf" },
  { min: 600,   name: "4級",  kind: "kyu", color: "#38bdf8" },
  { min: 900,   name: "3級",  kind: "kyu", color: "#60a5fa" },
  { min: 1300,  name: "2級",  kind: "kyu", color: "#818cf8" },
  { min: 1800,  name: "1級",  kind: "kyu", color: "#a78bfa" },
  { min: 2500,  name: "初段", kind: "dan", color: "#fbbf24" },
  { min: 3500,  name: "二段", kind: "dan", color: "#fbbf24" },
  { min: 5000,  name: "三段", kind: "dan", color: "#f59e0b" },
  { min: 7000,  name: "四段", kind: "dan", color: "#fb923c" },
  { min: 10000, name: "五段", kind: "dan", color: "#f97316" },
  { min: 14000, name: "六段", kind: "dan", color: "#f43f5e" },
  { min: 19000, name: "七段", kind: "dan", color: "#e11d48" },
  { min: 25000, name: "八段", kind: "dan", color: "#e879f9" },
  { min: 32000, name: "九段", kind: "dan", color: "#c084fc" },
  { min: 40000, name: "十段", kind: "dan", color: "#f0abfc" },
  { min: 60000, name: "名人", kind: "meijin", color: "#fde68a" },
];

/** やりこみポイントの内訳（正解数・学んだ日数・合計P） */
export function yarikomiStats(player, records) {
  const fromRecords = (records || []).reduce((s, r) => s + Math.max(0, Number(r?.correct) || 0), 0);
  const correct = fromRecords + Math.max(0, Number(player?.stepCorrect) || 0);
  const days = Math.max(0, Number(player?.streaks) || 0);
  return { correct, days, points: correct + days * POINTS_PER_DAY };
}

/**
 * ポイントから段位を求める。
 * @returns {{ idx:number, name:string, kind:string, color:string, points:number,
 *             next:{name:string,min:number}|null, toNext:number, pct:number }}
 *   next=次の段位（最上位なら null）／toNext=次の段位まであと何P／pct=いまの段位の中での進み具合(0〜100)
 */
export function rankFor(points) {
  const p = Math.max(0, Number(points) || 0);
  let idx = 0;
  for (let i = 0; i < RANKS.length; i++) if (p >= RANKS[i].min) idx = i;
  const cur = RANKS[idx];
  const nxt = RANKS[idx + 1] || null;
  const pct = nxt ? Math.min(100, Math.round(((p - cur.min) / (nxt.min - cur.min)) * 100)) : 100;
  return { idx, name: cur.name, kind: cur.kind, color: cur.color, points: p, next: nxt ? { name: nxt.name, min: nxt.min } : null, toNext: nxt ? nxt.min - p : 0, pct };
}
