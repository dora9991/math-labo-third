// ============================================================
// battleTurn.js — 行動選択型バトル（v2）の純ロジック
//  設計: Obsidian「設計_バトル刷新_行動選択型_2026-07-05」／手書き構想D・E
//  1ターン = ①行動選択(攻撃/必殺技/スキル/防御) → ②問題(制限時間) →
//            ③敵ターン(毎ターン動く)。正解しないと自分の行動は失敗。
//  ここは React に依存しない純関数だけ。画面(TurnBattle.jsx)が状態を持ち、
//  敵の行動決定(turnEnemyDecide)とテンプレ定義をここから使う。
// ============================================================
import { genBattleProblem } from "./battle.js";

// ── 必殺技・スキルのSP ──────────────────────────────
export const TURN_SP_MAX = 10;
export const ULT_COST = 5;          // 必殺技のSP
// 必殺技のダメージ倍率は種類ごとに違う（2026-07-19：data/ultimates.js のガチャで集める。最大ULT_MULT_CAP=5倍）。
// ULT_MULTはfindUltimateが解決できない場合のフォールバック値のみに使う。
export const ULT_MULT = 3;

// ── プレイヤーのスキル：単元別スキル（chapterSkills.js）に一本化 ──────
//  2026-07-19: 旧・固定5スキル(かいふく/ダメ軽減/バリア/めざまし/どく消し)は撤去。
//  代わりに各章のスキル(ちからをこめる/みやぶり/めざまし/どくけし/みきりのかまえ/
//  じかんのよろい/まひふうじ)をロードアウト(最大2つ)から使う。効果はscreens/TurnBattle.jsxが
//  chapterSkills.js の tier 定義(kind/turns/mult/reduce等)を直接解釈する。

// ── 敵の行動パターン（8種・テンプレ化） ──────────────────
//   attack   : 毎ターン1ダメージ
//   charge   : Nターンためて発射（1→3 / 2→5 / 3→7 ダメージ）。ため中は予告。
//   multi    : Nターンためて 1×(3/5/7) の多段ヒット
//   sleep    : 2ターン完全に動けない（クールダウンあり）
//   guard    : 1ターン こちらの攻撃を無効（クールダウンあり）
//   poison   : 3ターン 毒（毎ターン末に1ダメージ）
//   timejam  : 2ターンに1回しか動けない（4ターンで治る・クールダウンあり）
//   paralysis: 1/2の確率で行動不発（4ターンで治る・クールダウンあり）
export const CHARGE_DMG = { 1: 3, 2: 5, 3: 7 };
export const MULTI_HITS = { 1: 3, 2: 5, 3: 7 };

export const TURN_ENEMY_PATTERNS = {
  attack:    { id: "attack",    name: "こうげき型",     icon: "👊", desc: "毎ターン こうげきしてくる" },
  charge:    { id: "charge",    name: "ためる型",       icon: "🔴", desc: "ためて 大ダメージ（予告あり）" },
  multi:     { id: "multi",     name: "連続こうげき型", icon: "✊", desc: "ためて 連続こうげき" },
  sleep:     { id: "sleep",     name: "ねむり型",       icon: "😴", desc: "たまに ねむらせてくる" },
  guard:     { id: "guard",     name: "まもり型",       icon: "🛡️", desc: "たまに 身をまもる" },
  poison:    { id: "poison",    name: "どく型",         icon: "☠️", desc: "たまに どくにする" },
  timejam:   { id: "timejam",   name: "じかんのゆがみ型", icon: "⏳", desc: "たまに 時間をゆがませる" },
  paralysis: { id: "paralysis", name: "まひ型",         icon: "⚡", desc: "たまに まひさせる" },
};

// 中1の各単元モンスターに6種のパターンを「単元の末尾番号」で循環割り当て。
//   例: u1/v1/e1…=こうげき、2=ためる、3=ねむり、4=まもり、5=連続、6=どく。
//   → c1(u1〜u6)は従来と同じ割当のまま、c2〜c7へも同じ規則で広がる。
//   章ボスは「ためる型（強）」。sample/番号なしは attack。
const PATTERN_CYCLE = ["attack", "charge", "sleep", "guard", "multi", "poison"];
export function patternForMonster(monster) {
  if (!monster) return "attack";
  if (monster.kind === "sample") return "attack";
  if (monster.kind === "chapterBoss" || monster.kind === "unitBoss" || monster.kind === "unitSmallBoss") return "charge";
  const m = String(monster.unitId || "").match(/(\d+)$/);
  const n = m ? parseInt(m[1], 10) : 1;
  return PATTERN_CYCLE[(n - 1) % PATTERN_CYCLE.length];
}

// ── ボス2段階変身 ──────────────────────────────────
//  章ボスは HP が半分を切ると「変身」してパターンが激しくなる（予告あり）。
//  第1段階=ためる型（大技を予告）→ 第2段階=連続こうげき型（手数で押す）。
export function isTwoPhaseBoss(monster) {
  return !!monster && monster.kind === "chapterBoss";
}
export const BOSS_PHASE2_PATTERN = "multi";

// ── ジャスト防御 ────────────────────────────────────
//  敵の「ためた大技(burst/multi)」を、防御を選んで正解したターンに受けると
//  “ジャスト防御”成立＝反撃ダメージ。予告を読む行為に報酬を与える。
export const JUST_GUARD_COUNTER_MULT = 1.8; // 反撃＝通常こうげき baseDmg の何倍か（予告読み→防御の報酬を厚めに）

// ── 状態異常の定義（2026-07-18・ボスの多属性攻撃向けに新設）────────
//  設計: Obsidian「設計_単元別戦闘力とHP1000化_2026-07-18」の確定値。
//  睡眠：3ターン完全に動けない（3ターンで治る。2026-07-19：2ターンでは怖くないとのフィードバックで3へ引き上げ）。
//  時間妨害（新規）：2ターンに1回しか動けない（4ターンで治る）。
//  麻痺（新規）：1/2の確率で行動不発（4ターンで治る）。
//  時間妨害・麻痺は単元別ボス（ボス2以降・patternPoolに複数の技を持つ）向けの新状態異常。
export const SLEEP_TURNS = 3;
export const TIMEJAM_DURATION = 4;   // 時間妨害の合計持続ターン
export const PARALYSIS_DURATION = 4; // 麻痺の合計持続ターン
export const PARALYSIS_CHANCE = 0.5; // 麻痺で行動不発になる確率（まひふうじSSで0まで軽減）

/** 時間妨害中、経過ターン数(1始まり)からこのターン動けるかを判定（2ターンに1回だけ動ける） */
export function timejamCanAct(turnsElapsed) {
  return turnsElapsed % 2 === 0;
}

/** 麻痺中、このターン行動が不発になるかを抽選する（まひふうじの軽減率を差し引ける） */
export function paralysisFails(reduce = 0, rand = Math.random) {
  const chance = Math.max(0, PARALYSIS_CHANCE * (1 - Math.max(0, Math.min(1, reduce))));
  return rand() < chance;
}

/**
 * 敵の1ターンの行動を決める（純関数）。
 * @param {string} patternId TURN_ENEMY_PATTERNS のキー
 * @param {object} state     持ち越し状態 { chargeLeft, chargeTarget, cooldown }
 * @param {function} rand    乱数（テスト用に差し替え可）
 * @returns {{ st: object, act: object }}
 *   act.kind: "attack" | "charging" | "burst" | "multi" | "sleep" | "guard" | "poison"
 */
export function turnEnemyDecide(patternId, state = {}, rand = Math.random) {
  const st = { ...state };
  const dec = (act) => ({ st, act });

  switch (patternId) {
    case "attack":
      return dec({ kind: "attack", dmg: 1 });

    case "charge":
    case "multi": {
      const isMulti = patternId === "multi";
      const release = (n) =>
        isMulti ? { kind: "multi", hits: MULTI_HITS[n] || 3, per: 1 } : { kind: "burst", dmg: CHARGE_DMG[n] || 5 };
      if ((st.chargeLeft || 0) > 0) {
        // ため中：残りを1減らし、0になったら発射
        st.chargeLeft -= 1;
        if (st.chargeLeft === 0) {
          const n = st.chargeTarget || 2;
          st.chargeTarget = null;
          return dec(release(n));
        }
        return dec({ kind: "charging", left: st.chargeLeft });
      }
      // ためを開始（1〜3ターン。子どもが3種すべて見られるよう毎回ランダム）
      const target = 1 + Math.floor(rand() * 3);
      st.chargeTarget = target;
      st.chargeLeft = target;
      return dec({ kind: "charging", left: target, started: true });
    }

    case "sleep": {
      if ((st.cooldown || 0) > 0) { st.cooldown -= 1; return dec({ kind: "attack", dmg: 1 }); }
      st.cooldown = 4;
      return dec({ kind: "sleep", turns: SLEEP_TURNS });
    }
    case "guard": {
      if ((st.cooldown || 0) > 0) { st.cooldown -= 1; return dec({ kind: "attack", dmg: 1 }); }
      st.cooldown = 3;
      return dec({ kind: "guard", turns: 1 });
    }
    case "poison": {
      if ((st.cooldown || 0) > 0) { st.cooldown -= 1; return dec({ kind: "attack", dmg: 1 }); }
      st.cooldown = 5;
      return dec({ kind: "poison", turns: 3 });
    }
    case "timejam": {
      if ((st.cooldown || 0) > 0) { st.cooldown -= 1; return dec({ kind: "attack", dmg: 1 }); }
      st.cooldown = 5;
      return dec({ kind: "timejam", turns: TIMEJAM_DURATION });
    }
    case "paralysis": {
      if ((st.cooldown || 0) > 0) { st.cooldown -= 1; return dec({ kind: "attack", dmg: 1 }); }
      st.cooldown = 5;
      return dec({ kind: "paralysis", turns: PARALYSIS_DURATION });
    }
    default:
      return dec({ kind: "attack", dmg: 1 });
  }
}

/**
 * ボスの「使う技」をプール(patternPool)からランダムに選ぶ（純関数）。
 *  ため中(chargeLeft>0)・クールダウン中(cooldown>0)は今の技を維持し、
 *  完全に手が空いたときだけ次の技（前回と別のもの優先）へ切り替える。
 * @param {object} monster    patternPool(配列)を持つボス
 * @param {object} state      turnEnemyDecideと共有する持ち越し状態＋activePattern
 * @param {function} rand     乱数（テスト用に差し替え可）
 * @returns {{ pattern: string, state: object }}
 */
export function pickBossPattern(monster, state = {}, rand = Math.random) {
  const pool = monster && Array.isArray(monster.patternPool) && monster.patternPool.length ? monster.patternPool : null;
  if (!pool) return { pattern: patternForMonster(monster), state };
  const idle = !(state.chargeLeft > 0) && !(state.cooldown > 0);
  let pattern = state.activePattern;
  if (idle || !pattern) {
    const choices = pool.length > 1 ? pool.filter((p) => p !== pattern) : pool;
    pattern = choices[Math.floor(rand() * choices.length)] || pool[0];
  }
  return { pattern, state: { ...state, activePattern: pattern } };
}

// ── 単元別「戦闘力」＝BP制（2026-07-19・中1全章に一般化） ─────────
//  設計: Obsidian「設計_単元別戦闘力とHP1000化_2026-07-18」
//  HPは敵味方とも共通1000。強さは単元(章)ごとのBP(100〜350)で表し、
//  ダメージ = 自分BP ÷ 相手BP × 100（双方向対称）。
//  BPは1問正解で+1・1問ミスで-1、100〜350にクランプ（バトル終了時にまとめて反映）。
export const COMPANION_HP = 1000;   // プレイヤー・ザコ敵・ボスの梯子で共通のHP基準
export const BP_MIN = 100;          // 全ランク共通のスタートBP
export const BP_MAX = 350;          // 絶対上限（レーダーチャートの10割・SSランクの上限BP）

// ── 章ごとの最大BP（2026-07-19追記・同日4回目に上限を最初からBP_MAXへ変更） ──
//  当初は計算王クリアごとに天井が+10される設計だったが、kazuの要望で
//  「最初から350まで育てられる」に変更。BASE_BP_CAP=BP_MAXなのでchapterBPCapは常にBP_MAXを返す
//  （関数自体は将来また段階解放したくなった時のために残してある）。
export const BASE_BP_CAP = BP_MAX;         // 最初から絶対上限まで育てられる
export const BP_CAP_PER_CALC_KING_CLEAR = 10; // （現状は未使用。将来の段階解放用に残置）

/** その章の実際の最大BP＝BASE_BP_CAP + 10×(計算王クリア済み小単元数)。BP_MAXを超えない */
export function chapterBPCap(clearedUnitCount) {
  return Math.min(BP_MAX, BASE_BP_CAP + BP_CAP_PER_CALC_KING_CLEAR * (clearedUnitCount || 0));
}

/** 単元別戦闘力(BP)の対象（中1の全章・ザコ/れんしゅう/ボスの梯子）かどうか */
export function isCompanionBattle(monster) {
  return !!monster && monster.grade === 1 && (monster.kind === "unit" || monster.kind === "sample" || monster.kind === "unitBoss" || monster.kind === "unitSmallBoss");
}

/** BP比ダメージ：自分BP÷相手BP×100（1にも満たない場合は1に切り上げ） */
export function bpDamage(myBP, enemyBP) {
  const a = myBP || BP_MIN, b = enemyBP || BP_MIN;
  return Math.max(1, Math.round((a / b) * 100));
}

/** BPを増減し、100〜cap（未指定ならBP_MAX=350）にクランプする */
export function adjustBP(bp, delta, cap = BP_MAX) {
  return Math.max(BP_MIN, Math.min(cap, (bp == null ? BP_MIN : bp) + delta));
}

// ── プレイヤーのダメージ（理解度は使わず、まずはヒット数ベースでシンプルに）──
//   ユニット敵は約KILL_HITS発、ボスは長め。必殺技はその ULT_MULT 倍。
//   ※プレイ調整で KILL_HITS を変える。
export function baseAttackDamage(monster) {
  const hits = monster.kind === "chapterBoss" || monster.kind === "finalBoss" || monster.kind === "secretBoss" || monster.kind === "unitBoss" || monster.kind === "unitSmallBoss" ? 12
    : monster.kind === "sample" ? 4 : 6;
  return Math.max(1, Math.ceil((monster.hp || 1) / hits));
}

/** 次の問題を出す（problemSource があればそれを使う）。 */
export function nextTurnProblem(monster, lastId, problemSource) {
  return problemSource ? problemSource(lastId) : genBattleProblem(monster, lastId);
}
