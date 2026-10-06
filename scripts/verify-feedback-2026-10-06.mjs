// 2026-10-06 生徒のご意見対応（学び直しクリスタル／やりこみ段位／技名／章の部類ラベル／難易度ダイヤル）の検証。
//  実行: node scripts/verify-feedback-2026-10-06.mjs
//  純ロジックだけを対象（画面は含まない）。失敗すると assert で止まり、終了コードが 0 以外になる。
import assert from "node:assert/strict";
import { GRADES } from "../src/data/index.js";
import { chapterTag } from "../src/data/index.js";
import {
  relearnCrystalState, relearnCrystalOnCorrect, RELEARN_CRYSTAL_EVERY as EVERY, RELEARN_CRYSTAL_DAILY_CAP as CAP,
} from "../src/engine/scoring.js";
import { RANKS, rankFor, yarikomiStats, POINTS_PER_DAY } from "../src/engine/rank.js";
import { pickAttackMove, FINISHER_STREAK } from "../src/data/attackMoves.js";
import {
  DIALS, DIAL_KEYS, dialFor, scaleDealt, scaleTaken, scaleReward, heartsForDial, dialOfRecord, suggestDial,
} from "../src/engine/dial.js";

// ── ① 学び直しクリスタル：15問ごとに+1・1日10個まで ──────────────────
{
  assert.deepEqual(
    (({ today, progress, capped, remaining }) => ({ today, progress, capped, remaining }))(relearnCrystalState(undefined, "D1")),
    { today: 0, progress: 0, capped: false, remaining: EVERY },
  );
  // 14問では出ず、15問目でちょうど+1
  let rc = null, total = 0;
  for (let i = 0; i < EVERY - 1; i++) { const r = relearnCrystalOnCorrect(rc, "D1"); rc = r.rc; total += r.gained; }
  assert.equal(total, 0);
  const r15 = relearnCrystalOnCorrect(rc, "D1");
  assert.equal(r15.gained, 1);
  assert.deepEqual(r15.rc, { date: "D1", today: 1, progress: 0 });
  // 1日の上限：150問で10個ちょうど、以降は何も進まない（進捗も凍結）
  rc = null; total = 0;
  for (let i = 0; i < EVERY * CAP + 100; i++) { const r = relearnCrystalOnCorrect(rc, "D1"); rc = r.rc; total += r.gained; }
  assert.equal(total, CAP);
  assert.equal(rc.progress, 0);
  assert.equal(relearnCrystalState(rc, "D1").capped, true);
  // 翌日は今日の個数だけ0に戻る。途中の進捗は持ち越す
  assert.equal(relearnCrystalState(rc, "D2").capped, false);
  assert.equal(relearnCrystalState(rc, "D2").today, 0);
  let mid = null; for (let i = 0; i < 10; i++) mid = relearnCrystalOnCorrect(mid, "D1").rc;
  assert.deepEqual(relearnCrystalOnCorrect(mid, "D2").rc, { date: "D2", today: 0, progress: 11 });
  // 壊れた保存値でも落ちない
  for (const bad of [{}, { progress: "x" }, { progress: 999, today: -5, date: "D1" }, 5, "a"]) {
    const st = relearnCrystalState(bad, "D1");
    assert.ok(st.progress >= 0 && st.progress < EVERY && st.today >= 0);
  }
}

// ── ② やりこみ段位 ───────────────────────────────────────────────
{
  for (let i = 1; i < RANKS.length; i++) assert.ok(RANKS[i].min > RANKS[i - 1].min, `昇順: ${RANKS[i].name}`);
  assert.equal(rankFor(0).name, "10級");
  assert.equal(rankFor(29).name, "10級");
  assert.equal(rankFor(30).name, "9級");
  assert.equal(rankFor(1799).name, "2級");
  assert.equal(rankFor(1800).name, "1級");
  assert.equal(rankFor(2500).name, "初段");
  assert.equal(rankFor(59999).name, "十段");
  assert.equal(rankFor(60000).name, "名人");
  const mid = rankFor(55);
  assert.deepEqual([mid.name, mid.next.name, mid.toNext, mid.pct], ["9級", "8級", 25, 50]);
  const top = rankFor(1e9);
  assert.deepEqual([top.next, top.pct, top.toNext], [null, 100, 0]);
  for (const bad of [undefined, null, NaN, -5, "abc"]) assert.equal(rankFor(bad).name, "10級");
  // 集計：records の正解＋stepCorrect＋日数×10。まちがいは数えない／負数・不正値は0
  assert.deepEqual(
    yarikomiStats({ streaks: 4, stepCorrect: 25 }, [{ correct: 10, wrong: 99 }, { correct: 5 }, { wrong: 3 }, null, { correct: "x" }]),
    { correct: 40, days: 4, points: 40 + 4 * POINTS_PER_DAY },
  );
  assert.deepEqual(yarikomiStats(undefined, undefined), { correct: 0, days: 0, points: 0 });
  assert.equal(yarikomiStats({ streaks: -3, stepCorrect: -9 }, [{ correct: -4 }]).points, 0);
}

// ── ③ 技名：全章に専用の技がある／奥義の条件／同じ技が続かない ──────────────
{
  const chapters = Object.values(GRADES).flat();
  assert.ok(chapters.length >= 21);
  const fallbackFinisher = pickAttackMove({ chapterId: "__none__", kill: true }).name;
  for (const c of chapters) {
    const fin = pickAttackMove({ chapterId: c.id, kill: true });
    assert.ok(fin.finisher && fin.name !== fallbackFinisher, `${c.id} に専用の奥義が無い`);
    // 通常技：連続正解が足りなければ通常技、同じ技は続けて出ない
    let last = null;
    for (let i = 0; i < 200; i++) {
      const m = pickAttackMove({ chapterId: c.id, streak: FINISHER_STREAK - 1, last });
      assert.equal(m.finisher, false);
      assert.notEqual(m.name, last, `${c.id}: 同じ技が連続`);
      last = m.name;
    }
    assert.equal(pickAttackMove({ chapterId: c.id, streak: FINISHER_STREAK }).finisher, true);
  }
  // 章が分からない敵は汎用の技で落ちない
  assert.ok(pickAttackMove({}).name.length > 0);
  assert.ok(pickAttackMove({ chapterId: "__none__", streak: 9 }).finisher);
}

// ── ④ 章の部類ラベル：全章に付いている ────────────────────────────────
{
  const kinds = new Set(["calc", "graph", "figure", "data"]);
  for (const c of Object.values(GRADES).flat()) {
    const t = chapterTag(c);
    assert.ok(t && t.label && kinds.has(t.kind) && /^#/.test(t.color), `${c.id} に部類ラベルが無い`);
  }
  assert.equal(chapterTag("c1").label, "計算"); // 生徒の例「正の数と負の数（計算）」
  assert.equal(chapterTag("__none__"), null);
}

// ── ⑤ 難易度ダイヤル：倍率・ハート換算・提案 ─────────────────────────
{
  // ふつうは何も変えない（既存のバトルと同じ）
  const N = DIALS.normal;
  for (const v of [1, 7, 100, 1234]) {
    assert.equal(scaleDealt(v, N), v); assert.equal(scaleTaken(v, N), v); assert.equal(scaleReward(v, N), v);
  }
  assert.equal(heartsForDial(5, N), 5); assert.equal(heartsForDial(13, "normal"), 13);
  // 不正・未設定は「ふつう」
  assert.equal(dialFor(undefined).key, "normal"); assert.equal(dialFor("zzz").key, "normal");
  assert.equal(scaleDealt(100, "zzz"), 100);
  // 方向：サクサクは与ダメ増・被害減・ごほうび半分／激ムズは逆（ごほうび2倍）
  assert.equal(scaleDealt(100, "easy"), 150); assert.equal(scaleDealt(100, "hard"), 50);
  assert.equal(scaleTaken(100, "easy"), 75);  assert.equal(scaleTaken(100, "hard"), 125);
  assert.equal(scaleReward(40, "easy"), 20);  assert.equal(scaleReward(40, "hard"), 80);
  // 最低1・0は0のまま
  assert.equal(scaleDealt(1, "hard"), 1); assert.equal(scaleTaken(1, "easy"), 1); assert.equal(scaleTaken(0, "hard"), 0);
  assert.equal(scaleReward(1, "easy"), 1); assert.equal(scaleReward(0, "hard"), 0);
  // 必要な正解数（＝敵HP÷1発）が、サクサクで約2/3・激ムズで約2倍になる
  const hits = (dial) => Math.ceil(1000 / scaleDealt(100, dial));
  assert.deepEqual([hits("easy"), hits("normal"), hits("hard")], [7, 10, 20]);
  // ハート制：サクサクは増え、激ムズは減る（範囲は3〜16）
  assert.ok(heartsForDial(5, "easy") > 5 && heartsForDial(5, "hard") < 5);
  assert.equal(heartsForDial(5, "hard"), 4);
  for (const k of ["easy", "hard"]) for (const h of [1, 5, 9, 13, 99]) {
    const v = heartsForDial(h, k); assert.ok(v >= 3 && v <= 16, `${k}/${h} → ${v}`);
  }
  assert.deepEqual(DIAL_KEYS, ["easy", "normal", "hard"]);
  // 記録→ダイヤル（導入前の記録は「ふつう」）
  assert.equal(dialOfRecord({ extra: { dial: "hard" } }), "hard"); assert.equal(dialOfRecord({ extra: {} }), "normal"); assert.equal(dialOfRecord(null), "normal");
  // 提案：記録は古い→新しい順。いまのダイヤルで戦った直近だけを見る
  const rec = (result, dial) => ({ mode: "battle", extra: { result, ...(dial ? { dial } : {}) } });
  assert.deepEqual(suggestDial("normal", [rec("lose"), rec("lose")]), { to: "easy", kind: "down", streak: 2 });
  assert.deepEqual(suggestDial("hard", [rec("lose", "hard"), rec("lose", "hard")]), { to: "normal", kind: "down", streak: 2 });
  assert.equal(suggestDial("easy", [rec("lose", "easy"), rec("lose", "easy")]), null);       // これ以上やさしくできない
  assert.deepEqual(suggestDial("normal", [rec("win"), rec("win"), rec("win")]), { to: "hard", kind: "up", streak: 3 });
  assert.deepEqual(suggestDial("easy", [rec("win", "easy"), rec("win", "easy"), rec("win", "easy")]), { to: "normal", kind: "up", streak: 3 });
  assert.equal(suggestDial("hard", [rec("win", "hard"), rec("win", "hard"), rec("win", "hard")]), null); // これ以上むずかしくできない
  assert.equal(suggestDial("normal", [rec("lose"), rec("win")]), null);                       // 直近が勝ちなら提案しない
  assert.equal(suggestDial("normal", [rec("win"), rec("win")]), null);                        // 2連勝ではまだ
  assert.equal(suggestDial("normal", [rec("lose"), rec("lose"), rec("win")]), null);          // 古い負けは数えない（直近は勝ち）
  // ダイヤルを変えたら数え直し：激ムズで2連敗→ふつうに変更した直後は提案しない
  assert.equal(suggestDial("normal", [rec("lose", "hard"), rec("lose", "hard")]), null);
  // バトル以外の記録・結果の無い記録は無視
  assert.deepEqual(
    suggestDial("normal", [{ mode: "timeAttack", extra: {} }, rec("lose"), { mode: "battle", extra: {} }, rec("lose")]),
    { to: "easy", kind: "down", streak: 2 },
  );
  assert.equal(suggestDial("normal", undefined), null);
}

console.log("OK: 学び直しクリスタル / やりこみ段位 / 技名 / 章の部類ラベル / 難易度ダイヤル");
