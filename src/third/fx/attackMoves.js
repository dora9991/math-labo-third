// ============================================================
// attackMoves.js — 通常こうげきの「技名」（新バトル ThirdBattle 用・2026-10-07）
//  生徒のご意見「技名を作ってほしい」（2026-10-06）への対応。
//  ・章（単元のテーマ）ごとに数学らしい技名を用意。バトル中、その問題の章の技が出る。
//  ・連続正解が5の倍数に届いたとき、またはとどめの一撃のときは「奥義」に進化（演出だけ。ダメージは変えない）。
//  ・必殺技／スキル／アイテムは各データ(ultimates.js / chapterSkills.js / items.js)に
//    もう名前があるので、ここは通常こうげき専用。
//  新しい章を足したら MOVES に1行足すだけ（無い章は FALLBACK を使う＝壊れない）。
// ============================================================

// 章ID → { base: 通常技3つ, finisher: 奥義, icon }
const MOVES = {
  // 中1
  c1: { icon: "➕", base: ["プラスブレード", "マイナスクラッシュ", "ゼロスラッシュ"], finisher: "数直線ストライク" },
  c2: { icon: "🔤", base: ["Xスラッシュ", "代入アタック", "分配カッター"], finisher: "Xブレイカー" },
  c3: { icon: "⚖️", base: ["移項チョップ", "イコールブレード", "天びんクラッシュ"], finisher: "解の一撃" },
  c4: { icon: "📈", base: ["比例ラッシュ", "反比例ターン", "グラフショット"], finisher: "座標ストライク" },
  c5: { icon: "🔺", base: ["おうぎ斬り", "アングルブレード", "対称ミラーパンチ"], finisher: "角度マスターカット" },
  c6: { icon: "🧊", base: ["キューブクラッシュ", "体積ハンマー", "スフィアボンバー"], finisher: "展開図ブレイカー" },
  c7: { icon: "📊", base: ["平均アタック", "中央値スラッシュ", "最頻値ショット"], finisher: "ヒストグラムストーム" },
  // 中2
  g2c1: { icon: "🔣", base: ["多項式スラッシュ", "単項式パンチ", "累乗ストライク"], finisher: "等式変形ブレード" },
  g2c2: { icon: "🔗", base: ["加減ダブルカット", "代入ショット", "連立クラッシュ"], finisher: "二元一次ブレイク" },
  g2c3: { icon: "📈", base: ["傾きスラッシュ", "切片ショット", "直線ビーム"], finisher: "交点エクスプロージョン" },
  g2c4: { icon: "📐", base: ["平行ライン斬り", "合同コピーアタック", "内角の和ストライク"], finisher: "外角スラッシュ" },
  g2c5: { icon: "🔻", base: ["二等辺カット", "平行四辺形チョップ", "ひし形ブレード"], finisher: "合同証明クラッシュ" },
  g2c6: { icon: "🎲", base: ["サイコロアタック", "コイントスショット", "場合の数ラッシュ"], finisher: "確率100％ブレイク" },
  // 中3
  g3c1: { icon: "🧮", base: ["展開ブレード", "因数分解カッター", "公式アタック"], finisher: "完全平方ストライク" },
  g3c2: { icon: "√", base: ["ルートスラッシュ", "有理化パンチ", "根号ショット"], finisher: "ルートブレイカー" },
  g3c3: { icon: "🟰", base: ["解の公式ブレード", "因数分解チョップ", "平方完成ショット"], finisher: "二次方程式ブレイク" },
  g3c4: { icon: "📉", base: ["放物線スラッシュ", "変化の割合ショット", "二次関数ビーム"], finisher: "パラボラストライク" },
  g3c5: { icon: "🔺", base: ["相似拡大パンチ", "相似比スラッシュ", "影の長さショット"], finisher: "相似比ブレイク" },
  g3c6: { icon: "⭕", base: ["円周角ブレード", "接線ショット", "中心角スラッシュ"], finisher: "円周ストライク" },
  g3c7: { icon: "📐", base: ["ピタゴラススラッシュ", "直角チョップ", "斜辺ショット"], finisher: "三平方ブレイカー" },
  g3c8: { icon: "📊", base: ["サンプルショット", "全数チェックアタック", "推定ストライク"], finisher: "標本ブレイク" },
};

// 章が分からない敵（最終ボス・裏ボスなど）用
const FALLBACK = { icon: "✨", base: ["ひらめきスラッシュ", "ラボストライク", "数式パンチ"], finisher: "ラボブレイク" };

/** 奥義（連続正解・とどめ）になる連続正解数 */
// 連続正解が 5, 10, 15… に届いたときも奥義（毎回出ると特別感が薄れるので、5の倍数だけ）。
export const FINISHER_STREAK = 5;

/**
 * 通常こうげきの技を1つ選ぶ。
 * @param {object} o
 * @param {string} [o.chapterId] 問題の章ID（無ければ汎用の技）
 * @param {number} [o.streak]    いまの連続正解数（今回の正解を含む）
 * @param {boolean} [o.kill]     この一撃で敵を倒すか（とどめは奥義）
 * @param {string} [o.last]      直前に出した技名（同じ技が続かないようにする）
 * @param {() => number} [o.rand] 乱数（テスト用。既定は Math.random）
 * @returns {{ name:string, icon:string, finisher:boolean }}
 */
export function pickAttackMove({ chapterId, streak = 0, kill = false, last = null, rand = Math.random } = {}) {
  const m = MOVES[chapterId] || FALLBACK;
  if (kill || (streak > 0 && streak % FINISHER_STREAK === 0)) return { name: m.finisher, icon: m.icon, finisher: true };
  const pool = m.base.filter((n) => n !== last);
  const list = pool.length ? pool : m.base;
  return { name: list[Math.floor(rand() * list.length) % list.length], icon: m.icon, finisher: false };
}
