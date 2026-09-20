// ============================================================
// daily.js — 毎日の習慣づけ（ログインボーナス & ゴールデンタイム）
//
//  ・ログインボーナス：1日1回。連続ログインで継続を後押し。
//      基本 100G／5日連続ごとの大ボーナスはクリスタル💎で付与（5個）。
//  ・ゴールデンタイム：その日の最初の15分は XP ×1.2。
//      集中したスタートを後押しし、「だらだら続け」を防ぐゆるい区切りにもする。
//
//  日付は todayStr() = toLocaleDateString("ja-JP")（例 "2026/6/9"）を使う。
//  純関数だけ。状態保存・UIには依存しない。
// ============================================================

export const BONUS_BASE = 100;     // 毎日のログインボーナス(G)。5日目も同じ基本コインは付く
export const BONUS_STREAK_CRYSTAL = 5; // ★5日連続ごとの大ボーナス＝クリスタル💎（旧：コイン500→クリスタル付与に変更）
export const STREAK_TARGET = 5;    // 何日連続ごとに大ボーナスか
export const GOLDEN_MS = 15 * 60 * 1000; // ゴールデンタイムの長さ（15分）
export const GOLDEN_MULT = 1.2;    // ゴールデンタイム中のXP倍率

const floorDay = (s) => { const d = new Date(s); if (isNaN(d)) return NaN; d.setHours(0, 0, 0, 0); return d.getTime(); };

/** 2つの日付文字列の差（日数）。prev が無い/不正なら Infinity（＝連続でない扱い）。 */
export function dayDiff(prev, cur) {
  if (!prev) return Infinity;
  const a = floorDay(prev), b = floorDay(cur);
  if (isNaN(a) || isNaN(b)) return Infinity;
  return Math.round((b - a) / 86400000);
}

/**
 * 今日のログインボーナスを計算する（まだ受け取っていない前提で呼ぶ）。
 * @returns {{streak:number, reward:number, crystal:number, isFifth:boolean}}
 */
export function computeLogin(player = {}, today) {
  const diff = dayDiff(player.lastLoginDate, today);
  let streak;
  if (diff === 0) streak = player.loginStreak || 1;        // 同じ日（通常は呼ばれない）
  else if (diff === 1) streak = (player.loginStreak || 0) + 1; // 連続
  else streak = 1;                                          // 途切れ→リセット
  const isFifth = streak % STREAK_TARGET === 0;
  return {
    streak,
    reward: BONUS_BASE,                          // コインは毎日 基本100G（5日目も同じ。大ボーナスはクリスタルに変更）
    crystal: isFifth ? BONUS_STREAK_CRYSTAL : 0, // ★5日連続ごとの大ボーナス＝クリスタル5個
    isFifth,
  };
}

/** 今日まだログインボーナスを受け取っていないか */
export function canClaimLogin(player = {}, today) {
  return player.lastLoginDate !== today;
}

/** ゴールデンタイム中か（その日・開始から15分以内） */
export function goldenActive(player = {}, nowMs, today) {
  const g = player.golden;
  return !!(g && g.date === today && typeof g.startMs === "number" && nowMs - g.startMs < GOLDEN_MS);
}

/** ゴールデンタイムの残りミリ秒（0以上） */
export function goldenRemainMs(player = {}, nowMs, today) {
  const g = player.golden;
  if (!g || g.date !== today || typeof g.startMs !== "number") return 0;
  return Math.max(0, GOLDEN_MS - (nowMs - g.startMs));
}

/** XP倍率（ゴールデンタイム中は ×1.2、それ以外は ×1） */
export function goldenMultiplier(player = {}, nowMs, today) {
  return goldenActive(player, nowMs, today) ? GOLDEN_MULT : 1;
}

/** 今日のゴールデンタイムが既に終わっているか（開始済みかつ15分超過） */
export function goldenEndedToday(player = {}, nowMs, today) {
  const g = player.golden;
  return !!(g && g.date === today && typeof g.startMs === "number" && nowMs - g.startMs >= GOLDEN_MS);
}

// ============================================================
// 曜日イベント（毎週その曜日に自動発生・ログイン不要）
//  getDay(): 0=日 1=月 2=火 3=水 4=木 5=金 6=土
//   月: 経験値1.5倍 / 水: お金2倍 / 金: スキルガチャ11連→12連
//   火・木・土・日にも軽いイベントを置いて「毎日の楽しみ」にする。
//  値（倍率・ボーナス）は調整しやすいよう全てここに集約。
// ============================================================
export const WEEKLY_EVENTS = {
  0: { id: "crystal", label: "クリスタルデー", icon: "💎", color: "#67e8f9", desc: "バトル撃破のクリスタルが2倍！", crystalMult: 2 },
  1: { id: "xp",      label: "経験値1.5倍デー", icon: "⭐", color: "#fbbf24", desc: "もらえる経験値が1.5倍！", xpMult: 1.5 },
  2: { id: "relearn", label: "学び直しデー",     icon: "📖", color: "#34d399", desc: "学び直しの経験値が2倍！", relearnMult: 2 },
  3: { id: "coin",    label: "お金2倍デー",       icon: "💰", color: "#f59e0b", desc: "もらえるコインが2倍！", coinMult: 2 },
  4: { id: "calc",    label: "計算王デー",        icon: "🧮", color: "#a78bfa", desc: "計算王の経験値が1.5倍！", calcMult: 1.5 },
  5: { id: "gacha",   label: "ガチャ大盤振る舞いデー", icon: "🎁", color: "#f472b6", desc: "スキルガチャ11連が12連に！", gachaBonus: 1 },
  6: { id: "ta",      label: "タイムアタックデー", icon: "⏱️", color: "#38bdf8", desc: "タイムアタックのコインが2倍！", taCoinMult: 2 },
};

/** 曜日（0=日〜6=土）。date 省略時は今日。 */
export function weekdayOf(date) {
  return (date ? new Date(date) : new Date()).getDay();
}

/** 今日（または指定日）の曜日イベント定義。無ければ null。 */
export function todayEvent(date) {
  return WEEKLY_EVENTS[weekdayOf(date)] || null;
}

// 各種倍率・ボーナスの取得（イベントが無い日は等倍/0）
export function eventXpMult(date)      { return todayEvent(date)?.xpMult || 1; }
export function eventCoinMult(date)    { return todayEvent(date)?.coinMult || 1; }
export function eventCrystalMult(date) { return todayEvent(date)?.crystalMult || 1; }
export function eventRelearnMult(date) { return todayEvent(date)?.relearnMult || 1; }
export function eventCalcMult(date)    { return todayEvent(date)?.calcMult || 1; }
export function eventTaCoinMult(date)  { return todayEvent(date)?.taCoinMult || 1; }
export function eventGachaBonus(date)  { return todayEvent(date)?.gachaBonus || 0; }
