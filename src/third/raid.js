// ============================================================
// raid.js — 協力プレイ「裏ボス連戦」の定義（純関数・データ。DB/HTTPに依存しない）。2026-09-25 kazu指定：
//  ・協力プレイの相手は、各章の「裏ボス」。章の順（中1の1章→…→中3の8章＝全21体）に連戦で、勝つたびに次の裏ボスが出てくる。負けたら連戦の最初から。
//  ・強さ：全員で協力してぎりぎり勝てる＝HPは、その章の章ボスの5倍（攻撃は少し強め）。
//  ・ごほうび：クリスタル＋専用の称号（初回は多め・周回は少なめ）。全員に付く。
//  この部屋の戦闘の進行（順番回答・サーバー検証）は次の段階。ここは「相手の一覧・強さ・ごほうび・称号」だけを持つ。
// ============================================================
import { bossStats, tierOf } from "./balance.js";

/** 強さと報酬の数値（仮置き・実プレイで調整） */
export const RAID = {
  hpMul: 5, // HP＝章ボスの5倍
  dmgMul: 1.4, // 1回の攻撃ダメージ＝章ボスの1.4倍
  firstCrystals: 10, // その裏ボスをはじめて倒した時（全員に）
  repeatCrystals: 1, // 2回目以降
  repeatDailyMax: 3, // 2回目以降でクリスタルが付くのは、1日3体まで
  gradeBonus: 20, // その学年の裏ボスを全部倒した時（学年ごとに1回）
  allBonus: 50, // 21体すべてを倒した時（1回）
};

// 章ごとの裏ボス（順番＝連戦の順）。art は敵画像のID（src/third/assets/monsters/by-id）。
const B = (grade, chapterId, name, title, desc) => ({ grade, chapterId, id: `raid_${chapterId}`, art: `raid_${chapterId}`, name, title, desc });
export const RAID_LADDER = [
  B(1, "c1", "ゼロ・ヴォイド", "虚無をしずめた者", "正負の二極をのみこむ、白黒の虚無の竜"),
  B(1, "c2", "エックス・ミミック", "仮面をあばいた者", "どんな文字にも化ける、擬態の王"),
  B(1, "c3", "バランス・レヴィアタン", "天秤をとりもどした者", "天秤を海へ沈める、琥珀の大海獣"),
  B(1, "c4", "オリジン・ハイドラ", "原点をまもった者", "原点から無限にのびる、星図の多頭蛇"),
  B(1, "c5", "ユークリッド・ガーディアン", "公理の門をひらいた者", "青銅の庭をまもる、公理の巨像"),
  B(1, "c6", "ポリヘドラ・ドラゴン", "多面体をくだいた者", "紫水晶の翼をもつ、多面体の竜"),
  B(1, "c7", "ミーン・オーバーロード", "記録の海をわたった者", "平均をゆがめる、雲海の君主"),
  B(2, "g2c1", "ポリノミアル・ワーム", "糸をほどいた者", "式のからまる糸を操る、巨大な蟲"),
  B(2, "g2c2", "ツインエンド・キメラ", "ふたつの約束を守った者", "ふたつの頭で吠える、橋の谷の合成獣"),
  B(2, "g2c3", "スロープ・ワイバーン", "線路をはしりぬけた者", "どこまでも駆ける、黄金の飛竜"),
  B(2, "g2c4", "ミラー・ツイン", "鏡をわった者", "鏡の館にひそむ、双子の影"),
  B(2, "g2c5", "プルーフ・ゴーレム", "証をつみあげた者", "証拠の石でできた、塔の巨人"),
  B(2, "g2c6", "ダイス・オブ・フェイト", "運命のさいころをふった者", "さいころの市を支配する、運命の魔物"),
  B(3, "g3c1", "ファクター・シーカー", "折り紙をひらいた者", "式を切り裂く、赤黒い刃の獣"),
  B(3, "g3c2", "ルート・リッチ", "根っこをみつけた者", "井戸の底に眠る、根の亡霊"),
  B(3, "g3c3", "パラボラ・フェニックス", "ふたつの道をえらんだ者", "炎の弧をえがく、不死鳥"),
  B(3, "g3c4", "グラビティ・ブレイカー", "投げあげた球をつかんだ者", "落下を支配する、氷の巨躯"),
  B(3, "g3c5", "スケール・ジャイアント", "小さな町をまもった者", "大きさを自在に変える、巨人"),
  B(3, "g3c6", "サークル・セラフ", "円卓をかこんだ者", "真珠色の輪をまとう、天使"),
  B(3, "g3c7", "ピタゴラス・タイタン", "斜めの階段をのぼった者", "直角の大階段をゆく、藍紫の巨神"),
  B(3, "g3c8", "サンプル・オラクル", "小窓をひらいた者", "一部だけを見て未来を告げる、神託の眼"),
].map((b, i) => ({ ...b, index: i }));

export const raidIndexOf = (grade, chapterId) => RAID_LADDER.findIndex((b) => b.grade === Number(grade) && b.chapterId === chapterId);
export const raidBoss = (index) => RAID_LADDER[index] || null;
const clearedKey = (b) => `${b.grade}:${b.chapterId}`;

/** 裏ボスの強さ：HPは章ボスの5倍、1回の攻撃は1.4倍。 */
export function raidStats(index) {
  const b = raidBoss(index);
  if (!b) return null;
  const base = bossStats("chapterBoss", tierOf(b.grade, b.chapterId, null));
  return { hp: Math.round(base.hp * RAID.hpMul), dmg: Math.round(base.dmg * RAID.dmgMul) };
}

/** 称号の一覧（獲得済みかどうか付き）。各裏ボス＋学年ごとの制覇＋全制覇。 */
export function titlesOf(state) {
  const cleared = state?.raid?.cleared || {};
  const out = RAID_LADDER.map((b) => ({ id: b.id, label: b.title, boss: b.name, grade: b.grade, got: !!cleared[clearedKey(b)] }));
  for (const g of [1, 2, 3]) out.push({ id: `grade${g}`, label: `中${g} 裏ボス制覇者`, grade: g, got: RAID_LADDER.filter((b) => b.grade === g).every((b) => cleared[clearedKey(b)]) });
  out.push({ id: "all", label: "数学の覇者", got: RAID_LADDER.every((b) => cleared[clearedKey(b)]) });
  return out;
}
export const nextRaidIndex = (index) => (index + 1 < RAID_LADDER.length ? index + 1 : null);
