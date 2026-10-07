// ============================================================
// verify-hard-mode.mjs — 激ムズモード（src/third/hardMode.js）と技名（src/third/fx/attackMoves.js）の確認（2026-10-07）
//  使い方: node scripts/verify-hard-mode.mjs
//  確かめること：
//   1. ふつうモードは「今までと完全に同じ」値になる（倍率1）。
//   2. 激ムズは 与ダメ×½・上限×½（＝必要な正解数が約2倍）・敵のこうげき×1.25。小さい値でも0にならない／0は0のまま。
//   3. 激ムズでも、小単元・章ボスのバトルに要る正解数は、サーバーの検証の上限（VERIFY.maxAttempts=300）に余裕で収まる。
//   4. ThirdBattle.jsx で倍率をかけている場所と、ごほうびの申請(finishBattle)に激ムズが入り込んでいないこと。
//   5. 全章に技名がある／奥義になる条件／同じ技が続かない。
// ============================================================
import { readFileSync } from "node:fs";
import { HARD_MODE, NORMAL_MODE, modeFor, scaleDealt, scaleCap, scaleTaken } from "../src/third/hardMode.js";
import { pickAttackMove, FINISHER_STREAK } from "../src/third/fx/attackMoves.js";
import { capDamageFor, DIFFICULTY_KEYS } from "../src/third/balance.js";
import { VERIFY } from "../src/third/gachaConfig.js";
import { spawnEnemyGroup, spawnBoss } from "../src/third/battleEngine.js";
import { getGrade, getChapter } from "../src/third/data/storyMap.js";
import { tierOf } from "../src/third/balance.js";

let pass = 0, fail = 0;
const ok = (cond, msg) => { if (cond) pass++; else { fail++; console.log("  ✗ " + msg); } };
const eq = (a, b, msg) => ok(a === b, `${msg}（${a} !== ${b}）`);

// ---- 1. ふつうモードは倍率1 ----
eq(modeFor(false), NORMAL_MODE, "modeFor(false) は NORMAL_MODE");
eq(modeFor(true), HARD_MODE, "modeFor(true) は HARD_MODE");
ok(NORMAL_MODE.dealt === 1 && NORMAL_MODE.taken === 1, "NORMAL_MODE は倍率1");
for (const d of [1, 2, 7, 33, 100, 999, 12345]) {
  eq(scaleDealt(d, false), d, `ふつう：scaleDealt(${d})`);
  eq(scaleCap(d, false), d, `ふつう：scaleCap(${d})`);
  eq(scaleTaken(d, false), d, `ふつう：scaleTaken(${d})`);
}
eq(scaleTaken(0, false), 0, "ふつう：被ダメ0は0");

// ---- 2. 激ムズの倍率 ----
eq(HARD_MODE.dealt, 0.5, "激ムズの与ダメ倍率は0.5");
eq(HARD_MODE.taken, 1.25, "激ムズの被ダメ倍率は1.25");
eq(scaleDealt(100, true), 50, "激ムズ：与ダメ100→50");
eq(scaleDealt(1, true), 1, "激ムズ：与ダメは最低1");
eq(scaleDealt(0, true), 1, "激ムズ：与ダメ0でも最低1（ふつうと同じ扱い）");
eq(scaleCap(100, true), 50, "激ムズ：上限100→50");
eq(scaleCap(1, true), 1, "激ムズ：上限は最低1");
eq(scaleCap(Infinity, true), Infinity, "激ムズ：上限が無限ならそのまま");
eq(scaleTaken(100, true), 125, "激ムズ：被ダメ100→125");
eq(scaleTaken(1, true), 1, "激ムズ：被ダメ1→1（小さい値は最低1）");
eq(scaleTaken(0, true), 0, "激ムズ：被ダメ0は0のまま（ため・空振り・ねむりは0のまま）");
eq(scaleTaken(-5, true), 0, "激ムズ：負の値は0");

// ---- 3. 必要な正解数（学習量のフロア）はおよそ2倍。サーバーの上限に収まる ----
const minCorrect = (hp, diff, on) => Math.ceil(hp / scaleCap(capDamageFor(hp, diff), on));
for (const hp of [500, 3000, 20000, 73800, 381306]) {
  for (const diff of DIFFICULTY_KEYS) {
    const n = minCorrect(hp, diff, false), h = minCorrect(hp, diff, true);
    // 切り上げの境目（5.0000…→6 と 9.9999…→10 など）で見かけの比がずれるので、切り上げ前の値で比べる
    const exact = hp / scaleCap(capDamageFor(hp, diff), true) / (hp / capDamageFor(hp, diff));
    ok(Math.abs(exact - 2) < 0.02 && h >= n * 2 - 2 && h <= n * 2 + 1, `HP${hp} ${diff}：必要な正解数 ${n} → ${h}（約2倍のはず／切り上げ前の比 ${exact.toFixed(3)}）`);
  }
}
{
  // 全小単元で「雑魚3体×2波＋ボス」を最も易しい難度(上限が小さい＝一番多くの正解が要る)で全部倒すのに要る最小の正解数
  let worst = 0, worstWhere = "";
  for (const g of [1, 2, 3]) {
    for (const c of getGrade(g).chapters) {
      const chap = getChapter(g, c.chapterId);
      for (const su of chap.subUnits) {
        const t = tierOf(g, c.chapterId, su.id);
        let total = 0;
        for (let w = 0; w < 2; w++) for (let i = 0; i < 3; i++) total += minCorrect(spawnEnemyGroup(su.enemy, i, 3, t).maxHp, "easy", true);
        total += minCorrect(spawnBoss(su.boss, t).maxHp, "easy", true);
        if (total > worst) { worst = total; worstWhere = `${g}年 ${c.chapterId} ${su.id}`; }
      }
      const cb = spawnBoss(chap.chapterBoss, tierOf(g, c.chapterId, null));
      const m = minCorrect(cb.maxHp, "easy", true);
      if (m > worst) { worst = m; worstWhere = `${g}年 ${c.chapterId} 章ボス`; }
    }
  }
  ok(worst * 2 < VERIFY.maxAttempts, `激ムズの最小正解数の最大 ${worst}（${worstWhere}）の2倍がmaxAttempts(${VERIFY.maxAttempts})に収まる`);
  console.log(`  ・激ムズで要る最小の正解数の最大：${worst}問（${worstWhere}）／サーバー上限 ${VERIFY.maxAttempts}問`);
}

// ---- 4. ThirdBattle.jsx の配線 ----
{
  const src = readFileSync(new URL("../src/third/screens/ThirdBattle.jsx", import.meta.url), "utf8");
  const count = (re) => (src.match(re) || []).length;
  eq(count(/scaleTaken\(/g), 1, "敵のこうげき倍率は1か所");
  ok(count(/scaleDealt\(/g) >= 3, "与ダメ倍率は通常こうげき・スキル(2種)の3か所以上");
  ok(count(/scaleCap\(/g) >= 3, "上限倍率は通常こうげき・スキル(2種)の3か所以上");
  ok(count(/lockHardMode\(\)/g) >= 3, "切り替えの固定は 解答・敵の行動・スキル の3か所以上（定義を除く）");
  ok(/hardAllowed\s*=\s*!params\.demo\s*&&\s*kind\s*!==\s*"secretBoss"/.test(src), "お試し戦と裏ボスでは激ムズを使えない");
  // ごほうびの申請に激ムズが入り込んでいない（報酬はサーバーが解答記録から決める）
  const fin = src.slice(src.indexOf("async function finishBattle"), src.indexOf("if (!enemies.length) return null;"));
  ok(fin.length > 200 && !/hard/i.test(fin), "finishBattle（ごほうびの申請）に激ムズの値は渡さない");
}

// ---- 5. 技名 ----
{
  const fallback = pickAttackMove({ chapterId: "__none__", rand: () => 0 });
  let missing = [];
  for (const g of [1, 2, 3]) for (const c of getGrade(g).chapters) {
    const m = pickAttackMove({ chapterId: c.chapterId, rand: () => 0 });
    if (m.icon === fallback.icon && m.name === fallback.name) missing.push(c.chapterId);
    ok(!!m.name && !!m.icon, `${c.chapterId} に技名とアイコンがある`);
  }
  ok(missing.length === 0, `全章に専用の技名がある（足りない章: ${missing.join(",") || "なし"}）`);
  ok(!fallback.finisher && !!fallback.name, "知らない章でも汎用の技名が出る（壊れない）");
  ok(pickAttackMove({ chapterId: "c1", kill: true }).finisher, "とどめは奥義");
  ok(!pickAttackMove({ chapterId: "c1", streak: FINISHER_STREAK - 1 }).finisher, `連続${FINISHER_STREAK - 1}は奥義にならない`);
  ok(pickAttackMove({ chapterId: "c1", streak: FINISHER_STREAK }).finisher, `連続${FINISHER_STREAK}で奥義`);
  ok(pickAttackMove({ chapterId: "c1", streak: FINISHER_STREAK * 2 }).finisher, `連続${FINISHER_STREAK * 2}でも奥義`);
  ok(!pickAttackMove({ chapterId: "c1", streak: FINISHER_STREAK + 1 }).finisher, `連続${FINISHER_STREAK + 1}は奥義にならない（毎回は出さない）`);
  let last = null, repeated = 0;
  for (let i = 0; i < 300; i++) { const m = pickAttackMove({ chapterId: "g3c4", streak: 1, last }); if (m.name === last) repeated++; last = m.name; }
  eq(repeated, 0, "同じ技が2回続かない");
}

console.log(`\n${fail ? "❌" : "✅"} ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
