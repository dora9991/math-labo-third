// ============================================================
// learnerProfile.js — 解答の記録を「単元 × 難易度」に集計する（サーバーと端末で同じ関数を使う）。
//  ・サーバー（third-api）：third_attempts の行（全モード＝練習・はいち確認・バトル）→ my_profile / admin_stats
//  ・端末：サーバーが使えないとき（ゲスト・通信エラー）は、端末の records（1回ごとの結果）から同じ形を作る
//  形：{ [unitId]: { lv: { easy:[回数,正解], standard:[..], advanced:[..], oni:[..] }, seq, last, n } }
//   seq＝その単元の直近30問（古い→新しい）。e/s/a/o＝難易度、大文字＝正解・小文字＝まちがい。
//   last＝最後に解いた日（日本時間 YYYY-MM-DD）。n＝全部の問題数。
//  誤答タグ：{ [unitId]: { [tag]: 回数 } }（third_answer_log の mistake_tag／端末の mistakeTagStats）
//  設計: Obsidian 10_Projects/math-labo/設計メモ_math-labo-third_おすすめ個別化_2026-09-30
// ============================================================
export const LEVELS = ["easy", "standard", "advanced", "oni"];
export const SEQ_MAX = 30;
const CODE = { easy: "e", standard: "s", advanced: "a", oni: "o" };
export const LEVEL_OF_CODE = { e: "easy", s: "standard", a: "advanced", o: "oni" };
const JST = (t) => new Date(new Date(t).getTime() + 9 * 3600 * 1000).toISOString().slice(0, 10);

/** 難易度の名前をそろえる（古い記録の normal/hard も読む） */
export function normLevel(lv) {
  if (lv === "easy" || lv === "oni" || lv === "advanced" || lv === "standard") return lv;
  if (lv === "hard") return "advanced";
  return "standard";
}

/**
 * 解答の行を単元×難易度に集計する。行は順不同でよい（日時で並べ直す）。
 * @param rows [{ unit_id|unitId, difficulty|level, ok, created_at|createdAt }]
 */
export function summarizeAttempts(rows = []) {
  const at = (r) => String(r.created_at ?? r.createdAt ?? "");
  const sorted = rows.filter((r) => r && (r.unit_id || r.unitId)).sort((a, b) => at(a).localeCompare(at(b)));
  const out = {};
  for (const r of sorted) {
    const id = r.unit_id ?? r.unitId;
    const lv = normLevel(r.difficulty ?? r.level);
    const u = (out[id] ||= { lv: {}, seq: "", last: null, n: 0 });
    const cell = (u.lv[lv] ||= [0, 0]);
    cell[0] += 1;
    if (r.ok) cell[1] += 1;
    u.n += 1;
    u.seq = (u.seq + (r.ok ? CODE[lv].toUpperCase() : CODE[lv])).slice(-SEQ_MAX);
    const t = r.created_at ?? r.createdAt;
    if (t) { try { u.last = JST(t); } catch { /* 日付が読めない行は無視 */ } }
  }
  return out;
}

/** 誤答タグの行（まちがえた問題）を単元ごとに数える。rows: [{ unit_id|unitId, mistake_tag|mistakeTag }] */
export function summarizeTags(rows = []) {
  const out = {};
  for (const r of rows) {
    const id = r?.unit_id ?? r?.unitId;
    const tag = r?.mistake_tag ?? r?.mistakeTag;
    if (!id || !tag) continue;
    const u = (out[id] ||= {});
    u[tag] = (u[tag] || 0) + 1;
  }
  return out;
}

/**
 * 端末の records（1回ごとの結果：unitId・level・correct・wrong・createdAt）から、同じ形の集計を作る。
 *  1回の中の正解・まちがいの順番は記録に無いので、割合どおりに交互に並べる（直近の重みづけがかたよらないように）。
 */
export function profileFromRecords(records = []) {
  const rows = [];
  for (const r of records) {
    if (!r?.unitId) continue;
    const c = Math.max(0, Number(r.correct) || 0), w = Math.max(0, Number(r.wrong) || 0), n = c + w;
    for (let i = 0; i < n; i++) {
      const ok = Math.floor(((i + 1) * c) / n) > Math.floor((i * c) / n);
      rows.push({ unitId: r.unitId, level: r.level, ok, createdAt: r.createdAt });
    }
  }
  return summarizeAttempts(rows);
}

/** 端末の mistakeTagStats（{ tag: { count, unitId } }）を、単元ごとのタグ回数にする */
export function tagsFromStats(stats = {}) {
  const out = {};
  for (const [tag, s] of Object.entries(stats || {})) {
    if (!s?.unitId || !(s.count > 0)) continue;
    (out[s.unitId] ||= {})[tag] = s.count;
  }
  return out;
}

/** 2つのタグ集計を合わせる（同じ単元・同じタグは大きい方＝二重に数えない） */
export function mergeTags(a = {}, b = {}) {
  const out = {};
  for (const src of [a, b]) for (const [id, tags] of Object.entries(src || {})) {
    const u = (out[id] ||= {});
    for (const [tag, n] of Object.entries(tags)) u[tag] = Math.max(u[tag] || 0, n);
  }
  return out;
}
