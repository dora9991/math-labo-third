// ============================================================
// enemyMoves.js — 敵の「技」（純関数・状態は呼び出し側が持つ）。2026-09-26 kazu指定：
//  ・雑魚：状態異常を仕掛けてくる敵を増やす（半分以上の雑魚が「得意な状態異常」を持ち、その状態異常がかかりやすい）。
//  ・ボス：1ターンためて大技／状態異常＋ふつうのダメージ／ためずにそのまま強い攻撃、などのパターンを持つ。
//  ボスは決まったパターンをくり返す（覚えると対策できる）。ためている間は予告が出る。
//  ダメージの平均は、パターン全体でだいたい1倍＝これまでの強さの調整（balance.js・calibrate-secret.mjs）を崩さない。
// ============================================================
import { STATUS_KEYS } from "./battleEngine.js";
import { STATUS_TUNING } from "./balance.js";

const hash = (s) => [...String(s || "")].reduce((n, ch) => (n * 31 + ch.charCodeAt(0)) >>> 0, 7);

// ---- 雑魚 ----
export const MOB_STATUS_SHARE = STATUS_TUNING.mobShare; // 得意な状態異常を持つ雑魚の割合（数値は balance.js の STATUS_TUNING）
export const MOB_STATUS_BONUS = STATUS_TUNING.mobBonus; // その状態異常のかかりやすさ（確率に足す）
/** その雑魚が得意な状態異常（無ければ null）。敵のIDで決まる＝同じ敵はいつも同じ */
export function mobSpecialty(enemy) {
  const h = hash(enemy?.id);
  return h % 10 < STATUS_TUNING.mobShare * 10 ? STATUS_KEYS[Math.floor(h / 10) % STATUS_KEYS.length] : null;
}

// 雑魚の攻撃：一定の確率で「状態異常＋ふつうのダメージ」の攻撃をしてくる（それ以外はふつうの攻撃だけ）。
export const MOB_STATUS_ATTACK_CHANCE = STATUS_TUNING.mobAttackChance;
/** 雑魚の今回の攻撃。statusAttack なら、状態異常をしかける（得意な状態異常があればそれ、なければランダム）。 */
export function mobAttack(enemy, rand = Math.random) {
  const specialty = mobSpecialty(enemy);
  const statusAttack = rand() < STATUS_TUNING.mobAttackChance;
  return { statusAttack, statusKey: statusAttack ? specialty : null, bonus: statusAttack ? STATUS_TUNING.mobBonus : 0, dmgMul: 1 };
}

// ---- ボス ----
// 技の倍率（kazu指定 2026-09-26）。ふつうの攻撃＝1倍を基準に：
//  ・小単元ボス：状態異常＋1.5倍／ため攻撃4倍／ためずに2倍
//  ・章ボス（と大ボス・最終ボス・裏ボス）：状態異常＋2倍／ため攻撃6倍／ためずに4倍
// ※ 実際のダメージは、パターン1周の平均が「これまでの強さ」と同じになるようにそろえてある（強さの調整を崩さない）。倍率の「比」が技の差になる。
const SMALL = { slash: 1.0, venom: 1.5, sweep: 1.2, heavy: 2.0, big: 4.0 };
const CHAPTER = { slash: 1.0, venom: 2.0, sweep: 1.6, heavy: 4.0, big: 6.0 };
const setOf = (kind) => (kind === "unitSmallBoss" ? SMALL : CHAPTER);
export function movesFor(kind) {
  const m = setOf(kind);
  return {
    slash: { label: "ふつうの攻撃", dmg: m.slash },
    heavy: { label: "強い一撃", dmg: m.heavy, note: "ためずに、強い攻撃！" },
    charge: { label: "ため", dmg: 0, telegraph: "力をためている…！ 次は大技がくるぞ！" },
    big: { label: "大技", dmg: m.big, note: "ためた力を、はなった！" },
    venom: { label: "状態異常の攻撃", dmg: m.venom, status: 1, note: "状態異常をしかけてきた！" },
    sweep: { label: "全体の状態異常", dmg: m.sweep, status: 2, note: "みんなに状態異常をしかけてきた！" },
  };
}
export const MOVES = movesFor("chapterBoss");
// パターン（順にくり返す）。
export const BOSS_PATTERNS = {
  ためて大技: ["slash", "charge", "big", "venom"],
  毒牙: ["venom", "slash", "heavy"],
  強打: ["heavy", "slash", "slash", "charge", "big"],
  総攻撃: ["sweep", "slash", "charge", "big"],
  連打: ["heavy", "venom", "slash"],
};
/** そのパターン・そのボスの種類での、1回の攻撃の平均倍率（これで割って、平均を1倍にそろえる） */
export function patternAverage(patternName, kind) {
  const mv = movesFor(kind), pat = BOSS_PATTERNS[patternName];
  return pat.reduce((a, k) => a + mv[k].dmg, 0) / pat.length;
}
const NAMES = Object.keys(BOSS_PATTERNS);
export const isBossKind = (kind) => ["unitSmallBoss", "chapterBoss", "unitBoss", "finalBoss", "secretBoss"].includes(kind);

/** そのボスのパターン名（IDで決まる。裏ボスは番号で決まり、7体で全部そろう） */
export function bossPatternName(boss) {
  if (boss?.kind === "secretBoss") return NAMES[(boss.secretIndex ?? hash(boss.id)) % NAMES.length];
  return NAMES[hash(boss?.id) % NAMES.length];
}

/**
 * ボスの「次の技」を決める。state は { step } を持つ入れ物（呼び出し側が敵ごとに保存）。
 *  「ため」の次は必ず「大技」。HPが半分以下になるとパターンが速くなる（激しくなる：ダメージ×1.15）。
 * @returns {{ move:string, def:object, dmgMul:number, enraged:boolean }}
 */
/** 次の技の名前だけ知りたい時（進めない） */
export function peekBossMove(boss, state = {}) {
  const pat = BOSS_PATTERNS[bossPatternName(boss)];
  return pat[(state.step ?? (hash(boss?.id) % pat.length)) % pat.length];
}
export function nextBossMove(boss, state = {}) {
  const pat = BOSS_PATTERNS[bossPatternName(boss)];
  const step = state.step ?? (hash(boss?.id) % pat.length); // 開始位置はIDで決まる（毎回同じ）
  let move = pat[step % pat.length];
  state.step = step + 1;
  if (move === "big" && state.cancelBig) { move = "slash"; state.cancelBig = false; } // スキル「バフ消し」：ためた大技を、ふつうの攻撃にされた
  const enraged = (boss?.hp ?? 1) / (boss?.maxHp ?? 1) <= 0.5 && boss?.kind === "secretBoss";
  const def = movesFor(boss?.kind)[move];
  const norm = patternAverage(bossPatternName(boss), boss?.kind); // パターン1周の平均を1倍にそろえる
  return { move, def, dmgMul: (def.dmg / norm) * (enraged ? 1.15 : 1), enraged };
}

/** 状態異常の確率に足す量（ボスの状態異常の技は強め） */
export const BOSS_STATUS_BONUS = STATUS_TUNING.bossBonus;
