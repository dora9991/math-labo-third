// ============================================================
// gachaConfig.js — ガチャとご褒美の数値（すべて仮置き・#todo 実プレイで調整）。サーバーとクライアントで共有。
// ============================================================
export const STARTER_PARTY = ["sp_calc_a_n", "sp_eq_a_n", "sp_func_a_n", "sp_geo_a_n", "sp_data_a_n"]; // 初期の5体（確定配布）
export const PARTY_SIZE = 5;

export const GACHA = {
  costPerPull: 5, // クリスタル5個で1回（2026-09-24 kazu指定。旧：ガチャチケット1枚）
  packSize: 10, // 「10連」＝10回（クリスタル50個）。10連には SR以上が必ず1体入る
  rates: { N: 0.55, R: 0.3, SR: 0.12, UR: 0.03 }, // 通常の排出率
  urPity: 100, // 100回引いてもURが出なければ、100回目はUR確定（天井）
  maxBreaks: 4, // 被り＝限界突破(凸)の上限
  breakBonus: 0.05, // 凸1回ごとの hp/atk 上乗せ（最大 +20%）
  overflowCoins: 50, // 凸が上限を超えた被り1体あたりのコイン
};

// バトルのご褒美（初回クリア/2回目以降）
export const REWARD = {
  firstCrystals: 2, // 小単元バトルの初回クリア：クリスタル2個
  firstCoins: 60,
  repeatCoins: 15,
  repeatExpRate: 0.3, // 2回目以降の経験値は初回の30%
  repeatDailyMax: 10, // 1日に2回目以降で報酬を受け取れる回数
};

// バトル結果の検証（サーバー）
export const VERIFY = {
  minCorrect: 6, // 「クリア」とみなす最低の検証済み正解数（難度「鬼」で各波2問ずつ＝最小の下限）
  minMsPerAnswer: 1200, // 1問あたり最短の解答時間(ms)。これより速い正解は数えない
  maxAttempts: 300,
  maxDurationMs: 2 * 60 * 60 * 1000,
  minClaimIntervalMs: 20 * 1000, // 前回の申請からの最短間隔
  seenSeedsKeep: 600, // 使用済みseedの記憶数（同じ解答の使い回し防止）
  claimIdsKeep: 60,
};

// クリスタル（ガチャの通貨。2026-09-24 kazu指定）：はじめてクリアしたときだけ付く（周回では増えない）
//  ・確認問題（はいち）に初めて合格：1個（動画レッスンごとに1回）
//  ・れんしゅう：難易度（簡単・普通・難しい・鬼）ごとに、その難易度の正解が5問に達した最初の1回：各1個
//  ・バトル：小単元の初クリア：2個（REWARD.firstCrystals）
//  ・章クリアボーナス：その章の小単元バトルを全部はじめてクリアした時：5個（＝ガチャ1回。章ごとに1回）
//  ・章ボス初撃破：メダル2枚をそろえた小単元がその章で全部ひらいている状態で、章ボスをはじめて倒した時：5個（章ごとに1回）
//  ・被りの還元：ガチャで持っている仲間が出た（凸・コインになった）時：1個（外れた感じをやわらげる）
export const CRYSTAL = { confirmFirst: 1, practiceLevelFirst: 1, practiceLevelTarget: 5, chapterClear: 5, chapterBossFirst: 5, dupRefund: 1 };
// 章ボス初撃破のコイン（周回では出さない）
export const BOSS_REWARD = { firstCoins: 100 };

// メダル（サーバーが付与）
export const MEDAL = {
  practiceTarget: 5, // れんしゅうメダル：検証済みの正解 5問（難度はどれでもOK・累計。2026-09-21 kazu指定）
  confirmRound: 5, // はいちメダル：確認問題の1ラウンド＝5問
  confirmPassRate: 0.8, // その80%（＝4問）以上の正解で合格
  minMsPerAnswer: 1000, // 練習・確認の1問あたり最短の解答時間(ms)
  maxAttemptsPerRequest: 60,
};

// 実時間の持ち分（サーバーの時計だけを信じる）：解答にかかった時間の合計は、サーバー時間で実際に経過した分を超えられない。
//  → 「1秒で数百問」のような機械的な連投ができない。
export const CREDIT = { capMs: 20 * 60 * 1000, slackMs: 3000 };
