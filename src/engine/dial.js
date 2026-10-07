// ============================================================
// dial.js — バトルの「難易度ダイヤル」（ふつう／激ムズ）
//  生徒のご意見「一撃の攻撃が少なく相手のダメージが多い激ムズモードを」（2026-10-06）への対応。
//  ダイヤル（つまみ）の形にしてあるのは、あとから段階を足せるようにするため。
//  ※「サクサク」（こうげき×1.5・被害×0.75・ごほうび×0.5）も一度作ったが、2026-10-07の判断で
//    「とりあえず無し」にした。復活させるときは、下の DIALS に easy を足して DIAL_KEYS の先頭に
//    "easy" を入れ、suggestDial の対応表に easy を足す（git履歴の 33cd3d8 に元の定義がある）。
//
//  ★動かすのは3つだけ★（問題そのものの難しさは変えない＝学習の中身は同じ）
//    dealt  … こうげき力（自分が与えるダメージの倍率）。1/dealt が「必要な正解数」の倍率になる。
//    taken  … うける被害の倍率。
//    reward … 勝ったときのごほうびコインの倍率。
//  激ムズは「たくさん正解が要り、被害も大きい」＝解く量が増えるので、ごほうびは2倍。
//
//  倍率の調整はこのファイルの DIALS だけでよい。React・保存に依存しない純関数のみ。
// ============================================================

export const DIALS = {
  normal: {
    key: "normal", label: "ふつう", icon: "⚖️", color: "#7dd3fc",
    dealt: 1, taken: 1, reward: 1,
    short: "いつもどおり",
    desc: "いつものバトル。",
  },
  hard: {
    key: "hard", label: "激ムズ", icon: "🔥", color: "#f87171",
    dealt: 0.5, taken: 1.25, reward: 2,
    short: "必要な正解 約2倍",
    desc: "こうげきが弱く、ふつうの約2倍の正解が必要。うける被害も大きい。ごほうびコインは2倍で、たおすと🔥バッジ。つよさに自信があるときに！",
  },
};

export const DIAL_KEYS = ["normal", "hard"]; // 選べる順（画面の左から）
export const DEFAULT_DIAL = "normal";

/** キー（不正な値・未設定は "normal"）から設定を引く */
export function dialFor(key) {
  return DIALS[key] || DIALS[DEFAULT_DIAL];
}

/** 自分が与えるダメージにダイヤルをかける（最低1） */
export function scaleDealt(dmg, dial) {
  return Math.max(1, Math.round((Number(dmg) || 0) * dialFor(dial?.key ?? dial).dealt));
}

/** 自分がうけるダメージにダイヤルをかける（0はそのまま0、それ以外は最低1） */
export function scaleTaken(dmg, dial) {
  const d = Number(dmg) || 0;
  return d <= 0 ? 0 : Math.max(1, Math.round(d * dialFor(dial?.key ?? dial).taken));
}

/** ごほうびコインにダイヤルをかける（勝って1以上もらえるときは最低1） */
export function scaleReward(coins, dial) {
  const c = Number(coins) || 0;
  return c <= 0 ? 0 : Math.max(1, Math.round(c * dialFor(dial?.key ?? dial).reward));
}

/**
 * ハート制（敵の1撃が常に1ハート）のバトルで「うける被害」を表すため、最大ハート数を 1/taken 倍にする。
 *  BP制（中1の単元モンスター）は HP1000 のまま scaleTaken でダメージ側を動かす。
 *  激ムズ＝ハートが減る（5→4）。ふつうは元のまま。範囲は 3〜16（段階を足したときのため、増える側も扱える）。
 */
export function heartsForDial(maxHearts, dial) {
  const base = Number(maxHearts) || 5;
  const key = dialFor(dial?.key ?? dial).key;
  if (key === "normal") return base;
  return Math.max(3, Math.min(16, Math.round(base / dialFor(key).taken)));
}

/** 記録(records)の1件が、どのダイヤルで戦った結果か（ダイヤル導入前の記録は "normal" 扱い） */
export function dialOfRecord(r) {
  const k = r?.extra?.dial;
  return DIALS[k] ? k : DEFAULT_DIAL;
}

/**
 * 「ダイヤルを変えてみる？」の提案（記録から計算。保存する状態は増やさない）。
 *  いまのダイヤルで戦った直近の結果だけを見る（ダイヤルを変えたら数え直し）。
 *   ・激ムズで2連敗 … ふつうへ戻すことを提案
 *   ・ふつうで3連勝   … 激ムズへの挑戦を提案
 *   （ふつうで2連敗しても、いまは易しい段階が無いので提案しない）
 * @param {string} current いまのダイヤルのキー
 * @param {Array} records  makeRecord の配列（古い→新しい順）
 * @returns {{ to:string, kind:"down"|"up", streak:number } | null}
 */
export function suggestDial(current, records) {
  const cur = dialFor(current).key;
  const results = []; // 新しい順
  for (let i = (records || []).length - 1; i >= 0 && results.length < 3; i--) {
    const r = records[i];
    const res = r?.extra?.result;
    if (r?.mode !== "battle" || (res !== "win" && res !== "lose")) continue;
    if (dialOfRecord(r) !== cur) break; // ダイヤルを変えた前の結果は数えない
    results.push(res);
  }
  if (results.length >= 2 && results[0] === "lose" && results[1] === "lose") {
    const to = { hard: "normal" }[cur];
    if (to) return { to, kind: "down", streak: 2 };
  }
  if (results.length >= 3 && results.every((x) => x === "win")) {
    const to = { normal: "hard" }[cur];
    if (to) return { to, kind: "up", streak: 3 };
  }
  return null;
}
