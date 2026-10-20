// ============================================================
// lap.js — 「もう一周」（2周目以降。2026-10-20 生徒の要望：学年を全部終えたら、いまの仲間のまま、もう一周したい）。サーバーと画面で共通。
//  ・全学年（中1〜中3）をクリアしたら、「もう一周」できる。仲間・レベル・クリスタル・図鑑・メダル・裏ボスと協力の記録はそのまま。
//  ・戻るのは「物語の進み」だけ：バトルの順番（また1章から）・「はじめてクリア」のごほうび・章／学年クリア。
//  ・2周目以降：はじめてクリアのごほうびの【経験値は同じ・クリスタルは半分】（切り上げ）。敵は1周ごとに少し強い（HP・攻撃 +25%／周）。
//  ・状態：state.lap = { n:周回数(1〜), startedAt, history:[{n,endedAt}] } ／ state.lapBattle＝2周目以降の「この周でクリアしたバトル」{ unitId: ms }
//    （1周目は従来どおり medals.battle をそのまま使う。メダルは「集めたもの」なので、周回では消さない）
// ============================================================
export const LAP = {
  grades: [1, 2, 3], // これを全部クリアすると、もう一周できる
  crystalMul: 0.5, // 2周目以降の「はじめてクリア」のクリスタル（切り上げ。最低1）
  enemyStep: 0.25, // 1周ごとに、敵のHP・攻撃が +25%（2周目 ×1.25／3周目 ×1.5）
  historyKeep: 20,
};

/** いま何周目か（1〜） */
export const lapOf = (state) => Math.max(1, Math.floor(Number(state?.lap?.n) || 1));
/** この周の全学年をクリアして、もう一周できるか */
export const lapFinished = (state) => LAP.grades.every((g) => !!state?.gradeDone?.[g]);
/** その学年を、これまでに（どの周でも）クリアしたことがあるか。2周目に入れたのは全学年クリア後だけなので、2周目以降は全部 true。裏ボスの開放などに使う */
export const gradeEverDone = (state, grade) => !!state?.gradeDone?.[grade] || lapOf(state) > 1;
/** 「はじめてクリア」のクリスタルの量（2周目以降は半分） */
export const lapCrystals = (amount, lap) => (amount <= 0 ? 0 : lap <= 1 ? amount : Math.max(1, Math.ceil(amount * LAP.crystalMul)));
/** 敵のHP・攻撃の倍率 */
export const lapEnemyMul = (lap) => 1 + LAP.enemyStep * (Math.max(1, Math.floor(Number(lap) || 1)) - 1);
/** 波（敵の配列の配列）の敵のHP・攻撃を、周回の倍率で強くする。1周目はそのまま。裏ボスは変えない（もともと推奨レベルで決まっている） */
export function scaleEncountersForLap(waves, lap) {
  const mul = lapEnemyMul(lap);
  if (mul <= 1) return waves;
  return waves.map((w) => w.map((en) => (en.kind === "secretBoss" ? en : { ...en, hp: Math.round(en.hp * mul), maxHp: Math.round(en.maxHp * mul), dmg: Math.round(en.dmg * mul) })));
}
