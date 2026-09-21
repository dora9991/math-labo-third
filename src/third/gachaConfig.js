// ============================================================
// gachaConfig.js — ガチャとご褒美の数値（すべて仮置き・#todo 実プレイで調整）。サーバーとクライアントで共有。
// ============================================================
export const STARTER_PARTY = ["sp_calc_a_n", "sp_eq_a_n", "sp_func_a_n", "sp_geo_a_n", "sp_data_a_n"]; // 初期の5体（確定配布）
export const PARTY_SIZE = 5;

export const GACHA = {
  costPerPull: 1, // チケット1枚で1回
  packSize: 10, // 「10連」＝10回（チケット10枚）
  rates: { N: 0.55, R: 0.3, SR: 0.12, UR: 0.03 }, // 通常の排出率
  srGuaranteeEvery: 10, // 10回に1回はSR以上を保証（10連の最後）
  urPity: 100, // 100回引いてもURが出なければ、100回目はUR確定（天井）
  maxBreaks: 4, // 被り＝限界突破(凸)の上限
  breakBonus: 0.05, // 凸1回ごとの hp/atk 上乗せ（最大 +20%）
  overflowCoins: 50, // 凸が上限を超えた被り1体あたりのコイン
};

// バトルのご褒美（初回クリア/2回目以降）
export const REWARD = {
  firstTickets: 1, // 小単元バトルの初回クリア
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
