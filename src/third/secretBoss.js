// ============================================================
// secretBoss.js — 「裏ボス」（クリア後のやり込み。2026-09-26 kazu指定・**公開前**）
//  ・各学年に7体。推奨レベル 30・40・50・60・70・80・90 と段階的に強くなる。HPがとても高く、長く戦う（＝たくさん解く）。
//  ・強さは scripts/calibrate-secret.mjs で決めた（普通の生徒が、推奨レベルの基準編成で約45%勝つ）。
//     基準の編成：Lv30〜50＝SR×5／Lv60・70＝UR×5／Lv80＝UR×5＋凸2／Lv90＝UR×5＋凸3。
//     ※ 強さはレベルよりレア度の影響が大きい（URはLv10でもSRのLv30より強い）。「推奨Lv」は「その編成なら」の目安。
//  ・その学年のクリア（全章の章クリア＋章ボス）後に、順番に開く。前の裏ボスを倒すと次が開く。
//  ・ごほうび：はじめて倒すと、クリスタルと、仲間全員への経験値（控えめ。前半は約+2レベル、後半は絞る。レベル上げの近道にはしない）。周回はその1/4の経験値のみ（1日5回まで）。
//  ・敵の絵は、協力プレイ用に作った裏ボスの絵を使い回す（協力プレイは非公開のまま）。
//  ・公開：SECRET_OPEN（App.jsx）を true にする。それまでは URL に ?secret=1 を付けた時だけ、メニューに出る。
// ============================================================
import { RAID_LADDER } from "./raid.js";

export const SECRET = {
  levels: [30, 40, 50, 60, 70, 80, 90],
  minCorrect: 15, // 「倒した」と認める最低の検証済み正解数（画面のバトルも、15問の正解がそろうまで裏ボスが倒れないようにしてある＝ThirdBattle.jsx）
  // 敵の行動ゲージの秒数（2026-10-09 kazu指定「裏ボスはかなり強くていい・ゲージを短く」）。
  //  それまでは雑魚と同じ22秒で始まっていて、推奨レベルの編成なら普通の生徒でも9割以上勝てた（設計の約45%よりずっと簡単）。
  //  12秒で、推奨レベルの基準編成・普通の生徒の勝率が約4〜6割（実際の画面に合わせたシミュレーション）。小単元のボスは18秒・雑魚は22秒。
  gaugeSeconds: 12,
  firstCrystals: [3, 3, 5, 5, 8, 10, 15], // はじめて倒した時のクリスタル（1学年ぶんで49個）
  // はじめて倒した時の経験値（仲間ひとりずつ）。前半は「(推奨Lv−10)のキャラが約2レベル上がる」ぶん、後半はレベルが上がるほど必要経験値が増えるので、もらいすぎないように絞った（kazu指定 2026-09-26）。
  //  ＝ 裏ボス1〜7で、(推奨Lv−10)のキャラが約 +2 / +2 / +1.4 / +1.0 / +0.7 / +0.5 / +0.4 レベル。
  firstExp: [1900, 4200, 6000, 9000, 12000, 16000, 20000],
  repeatExpRate: 0.25, // 2回目以降＝はじめての何割
  repeatDailyMax: 5, // 2回目以降で経験値が付くのは、1日5回まで
  // 敵の強さ（HP・1回の攻撃）。scripts/playtest2.mjs（スキル・状態異常・ボスの技を含む実戦に近いシミュレーション）で、
  //  基準の編成が「普通」の生徒で約45%勝つように決めた（2026-09-26）。前の calibrate-secret.mjs（スキル無し）の値は、実戦だと簡単すぎた。
  //  2026-09-30：状態異常の数値を見直した（毒が弱くなった）ので、複合の状態異常攻撃もシミュレーションに入れて、1回の攻撃を合わせ直した（HPはそのまま）。
  stats: [
    { hp: 73800, dmg: 429 }, { hp: 95452, dmg: 449 }, { hp: 144192, dmg: 391 }, { hp: 228270, dmg: 418 },
    { hp: 255662, dmg: 462 }, { hp: 340452, dmg: 483 }, { hp: 381306, dmg: 453 },
  ],
};
export const SECRET_COUNT = SECRET.levels.length;

// 学年ごとの7体。絵と名前は協力用の裏ボスから借りる（中2は6体なので、中3の最後の1体を借りる）
const pick = (ids) => ids.map((id) => RAID_LADDER.find((b) => b.chapterId === id));
const BY_GRADE = {
  1: pick(["c1", "c2", "c3", "c4", "c5", "c6", "c7"]),
  2: pick(["g2c1", "g2c2", "g2c3", "g2c4", "g2c5", "g2c6", "g3c8"]),
  3: pick(["g3c1", "g3c2", "g3c3", "g3c4", "g3c5", "g3c6", "g3c7"]),
};
/** その学年の裏ボスの一覧 */
export const secretLadder = (grade) =>
  (BY_GRADE[Number(grade)] || []).map((b, index) => ({ index, grade: Number(grade), id: b.id, art: b.art, name: b.name, title: b.title, desc: b.desc, recLevel: SECRET.levels[index], ...SECRET.stats[index], kind: "secretBoss" }));
export const secretBoss = (grade, index) => secretLadder(grade)[index] || null;

/** はじめて倒した時の経験値（仲間ひとりずつ）。SECRET.firstExp の表のとおり。 */
export const secretFirstExp = (index) => SECRET.firstExp[index] ?? 0;
export const secretRepeatExp = (index) => Math.round(secretFirstExp(index) * SECRET.repeatExpRate);

const key = (grade, index) => `${Number(grade)}:${index}`;
/** その裏ボスに挑戦できるか：学年クリア済み＆前の裏ボスを倒している。state 未取得(null)の間は閉じておく */
export function secretOpen(state, grade, index) {
  if (!state || !Number.isInteger(index) || index < 0 || index >= SECRET_COUNT) return false;
  if (!state.gradeDone?.[grade]) return false;
  return index === 0 || !!state.secret?.cleared?.[key(grade, index - 1)];
}
export const secretCleared = (state, grade, index) => !!state?.secret?.cleared?.[key(grade, index)];
export const secretKey = key;
