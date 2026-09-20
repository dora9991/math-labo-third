// ============================================================
// Battle.jsx — モンスターと4択クイズで戦う画面
//  正解 → モンスターにダメージ＋中央に光る◯＋コンボ
//  不正解・時間切れ → 解答欄が左右に高速で揺れる＋被ダメ（赤フラッシュ・画面揺れ）
//  問題は単元テスト級（標準・発展）。HP0で勝敗が決まる。
// ============================================================
import { useState, useEffect, useRef, useMemo } from "react";
import MonsterSprite from "../components/MonsterSprite.jsx";
import Avatar from "../components/Avatar.jsx";
import HeroImg from "../components/HeroImg.jsx";
import { heroImageFor } from "../data/heroes.js";
import { pickHitCheer, pickHurtCheer } from "../data/cheers.js";
import { BigWord, StarField } from "../components/Decorations.jsx";
import MathText from "../components/MathText.jsx";
import DrawPad from "../components/DrawPad.jsx";
import * as bgm from "../audio/bgm.js";
import * as sfx from "../audio/sfx.js";
import { getPlayerBattleStats, calcDamage, genBattleProblem, getEquippedSkills, SP_MAX, ultimateDamage, enemyDecide, battleBonuses } from "../engine/battle.js";
import { gearSpecials } from "../engine/gear.js";
import { allyStats, partnerHpLv, partnerAtkLv } from "../engine/partners.js";
import { findItem } from "../engine/items.js";
import { isCorrect, playerLevel } from "../engine/scoring.js";

const ENEMY_CHARGE_NEED = 2; // super型が超必殺を撃つまでのチャージ回数（engine ENEMY_AI.super と一致）
const DODGE_CHANCE = 0.2; // 敵の通常こうげきは20%の確率でかわせる（ため攻撃・超必殺技は対象外＝必ず当たる）

// 中2・中3は答えが「式」の4択（文字列一致）、中1は数値（isCorrect）。SlowMode/TimeAttackと同じ判定方式に揃える。
const shuffle = (a) => a.map((v) => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map((x) => x[1]);
const hasChoices = (q) => Array.isArray(q?.choices) && q.choices.length > 0;
const ansEq = (val, q) => (hasChoices(q)
  ? String(val).replace(/\s/g, "") === String(q.ans).replace(/\s/g, "")
  : isCorrect(val, q.ans));

// 超難問：まず「鬼」級を出し、その単元に鬼が無ければ発展でフォールバックする
function genHardProblem(monster, lastId) {
  return genBattleProblem(monster, lastId, "oni") || genBattleProblem(monster, lastId, "advanced");
}

// 1問ごとの制限時間（秒）。基本30秒（短すぎる体感を解消）＋レベルに応じてバッファを取り、
//  さらにプレイヤーが強いと伸びる base（stats.timer）が30を超えるならそれを尊重する。
//  分数・除法・多段の計算は手が要るので延長＝「問題によってはもっと長く」。上限99秒。
const BATTLE_BASE_TIME = 30;
function questionTime(q, baseTimer = 0) {
  let t = Math.max(BATTLE_BASE_TIME, baseTimer || 0);
  const lv = q?.level;
  if (lv === "advanced" || lv === "oni") t += 15;   // 発展・鬼は考える時間を厚く
  const text = String(q?.q ?? "");
  if (/[÷/]/.test(text) || /\d+\s*\/\s*\d+/.test(text)) t += 10; // 除法・分数は手計算が要る
  return Math.min(99, Math.round(t));
}

export default function Battle({ player, monster, ally = null, onResult, onSpChange, onItemUse, onUseBait, onHpChange, onWinBonus, onExit, onMistake, problemSource = null, onAttempt = null, maxHearts = 5 }) {
  // problemSource: あれば出題をこの関数(lastId)→problemに差し替える＝「演習バトル」（仕様はStepUpと同一）
  // onAttempt: あれば1問ごとに {skill,unitId,level,ok,...} を通知＝習熟(Elo)＋サイクル進捗を更新
  const lv = playerLevel(player); // 現在ワールド（学年）のレベルでバトル能力が決まる
  const specials = useRef(gearSpecials(player)).current; // 装備の特殊効果（lifesteal/regenPct/startSp/critPct）
  // 制限時間 = 基本の制限時間 × (自分のレベル+10) ÷ (敵の適正レベル+10)（切り上げ）
  //  +10で格差をマイルドに。自分が強いほど長く、格上の敵だと短くなる。最低1秒。
  const stats = useRef((() => {
    const base = getPlayerBattleStats(lv, battleBonuses(player));
    const ratio = (lv + 10) / ((monster.minLv || 1) + 10);
    const timer = Math.max(1, Math.ceil(base.timer * ratio));
    return { ...base, maxHp: maxHearts, timer }; // HP＝共通ハート（§15②：maxHp個のハート）
  })()).current;

  // バトル開始HP：前回の続き(currentHp)があればそこから。null=満タン。最低1。
  const startHp = stats.maxHp; // ハートは毎バトル満タン（共通HP・§15②）
  const [playerHp, setPlayerHp] = useState(startHp);
  const [monsterHp, setMonsterHp] = useState(monster.hp);
  const [q, setQ] = useState(() => (problemSource ? problemSource(null) : genBattleProblem(monster)));
  const [timer, setTimer] = useState(() => questionTime(q, stats.timer)); // 最初の問題の制限時間（基本30秒〜）
  const [combo, setCombo] = useState(0);
  const [sp, setSp] = useState(() => Math.min(SP_MAX, (player.sp ?? 0) + (gearSpecials(player).startSp || 0))); // スキルポイント（永続）＋防具の開始SPボーナス
  const [skillFx, setSkillFx] = useState(null);  // 発動中スキル/アイテムの画面演出 { name, icon, color }
  const [item, setItem] = useState(player.item || null); // 所持アイテム（1つ）
  const [atkBuff, setAtkBuff] = useState(null); // 攻撃バフ { turns, mult }（アイテム/スキル）
  const [guardBuff, setGuardBuff] = useState(null); // 防御バフ { turns, reduce }（アイテム）
  const [regen, setRegen] = useState(null); // 継続回復 { turns, pct }（リジェネ）
  const equipped = getEquippedSkills(player); // 装備中スキル（スロット1/2）
  const [phase, setPhase] = useState("intro"); // intro | fight | win | lose
  const [input, setInput] = useState("");      // 文字入力の答え（数値問題＝中1用）
  const [showPad, setShowPad] = useState(false); // ✏️ 手書き計算スペースの開閉
  // 式の4択（中2・中3）はシャッフルした選択肢を問題ごとに1回だけ作る
  const choices = useMemo(() => (q && hasChoices(q) ? shuffle([...q.choices]) : null), [q]);
  const [locked, setLocked] = useState(false);
  const [monState, setMonState] = useState("idle");
  const [animKey, setAnimKey] = useState(0);
  const [log, setLog] = useState(`${monster.name} があらわれた！`);

  // 視覚効果
  const [showRing, setShowRing] = useState(false);   // 正解の◯
  const [shakeAns, setShakeAns] = useState(false);   // 不正解の解答欄ゆれ
  const [hurt, setHurt] = useState(false);           // 被ダメ（赤＋画面ゆれ）
  const [heroAtk, setHeroAtk] = useState(false);     // 自キャラの前のめり（正解時）
  const [cheer, setCheer] = useState(null);          // 自キャラの応援吹き出し { text, hurt, key }
  const cheerKey = useRef(0);                         // 吹き出し再生用キー
  const [monDmg, setMonDmg] = useState(null);        // モンスターのダメージ数字
  const [dmgKey, setDmgKey] = useState(0);
  const [deadParticles, setDeadParticles] = useState([]);
  const [enemyFx, setEnemyFx] = useState(null);      // 敵の行動演出 { icon, label, color }
  const [enemyIntent, setEnemyIntent] = useState(null); // 敵の「ため」状態の予告 { text, color }
  const [charging, setCharging] = useState(false);   // ためている間のオーラ
  const aiStateRef = useRef({ charged: false, superCount: 0 }); // 敵のためチャージ状態

  // 安定参照（タイマーから最新処理を呼ぶ）
  const lockedRef = useRef(false);
  const phaseRef = useRef("intro");
  const endedRef = useRef(false); // 勝敗確定の二重発火を防ぐ
  const tallyRef = useRef({ correct: 0, wrong: 0 }); // 学習記録用：このバトルの正解/不正解（時間切れ含む）数
  const atkBuffRef = useRef(null); // 攻撃バフ { turns, mult }（setTimeout経由でも正しく参照）
  const guardBuffRef = useRef(null); // 防御バフ { turns, reduce }
  const regenRef = useRef(null); // 継続回復 { turns, pct }
  const timerRef = useRef(stats.timer);
  const actionsRef = useRef({});
  const inputRef = useRef(null);
  const playerHpRef = useRef(startHp); // 最新の自分のHP（戦闘終了時に持ち越し保存する用）
  useEffect(() => { playerHpRef.current = playerHp; }, [playerHp]);
  // maxHp と同じなら満タン扱い(null)。それ以外は実数で持ち越す。
  const saveHp = (hp) => onHpChange?.(hp >= stats.maxHp ? null : Math.max(0, Math.round(hp)));
  // 新しい問題になったら（ロック解除中は）入力欄にフォーカス
  useEffect(() => { if (!locked && phaseRef.current === "fight") inputRef.current?.focus(); }, [q, locked]);

  // ── 追加スキルのための状態（refで即時参照、UIに出すものは state も） ──
  const timeBuffRef = useRef(null);   // { turns, mult, inf } 次の数問の制限時間を伸ばす
  const poisonRef = useRef(null);     // { turns, dmg } 敵への継続ダメージ
  const comboKeepRef = useRef(null);  // { turns } ミスしてもコンボ維持
  const doubleNextRef = useRef(false);// 次の正解ダメージ2回ぶん
  const critRef = useRef(null);       // { turns } コンボ会心ボーナス2倍
  const counterRef = useRef(null);    // { turns, dmg } 被弾時に反撃
  const reviveRef = useRef(false);    // HP0で一度だけ復活
  const winBonusRef = useRef({ coins: 0, crystals: 0 }); // 勝利時ボーナスの累積
  const [buffTags, setBuffTags] = useState([]); // 画面上のバフ表示用（簡易）

  // ── 敵スキルで受ける「プレイヤーへのデバフ」（refで即時参照／UIにも出す）──
  const timeDebuffRef = useRef(null); // { turns, mult<1 } 次の数問の制限時間を短縮（時間どろぼう／時間圧縮）
  const panicRef = useRef(null);      // { turns } タイマーが見えなくなる（あせり）
  const comboSealRef = useRef(null);  // { turns } コンボが伸びなくなる（コンボ封じ）
  const silenceRef = useRef(null);    // { turns } スキルが使えない（封印）
  const curseRef = useRef(null);      // { turns, mult<1 } 与ダメージ低下（呪い）
  const forceHardRef = useRef(null);  // { turns } 出題が必ず発展になる（難問化）
  const forceMaxRef = useRef(null);   // { turns } 出題が「鬼」級の超難問になる（gigacalc）
  const fogRef = useRef(null);        // { turns } 問題が一瞬かくれる（沈黙の霧）
  const enemyRegenRef = useRef(null); // { turns, pct } 敵が毎ターン自己回復（再生）
  const enemyRevivedRef = useRef(false); // 不死：一度だけ復活したか
  const monsterShieldRef = useRef(0); // 敵のバリア／みがわりの残量（ダメージを肩代わり）
  const monsterHpRef = useRef(monster.hp); // enrage（暴走）判定用に最新の敵HPを持つ
  useEffect(() => { monsterHpRef.current = monsterHp; }, [monsterHp]);
  const [debuffTags, setDebuffTags] = useState([]); // 画面上のデバフ表示用
  const [monsterShield, setMonsterShield] = useState(0); // バリア残量（表示用）
  const [panicOn, setPanicOn] = useState(false); // タイマー隠し（表示用）
  const [fogOn, setFogOn] = useState(false);     // 問題かくし（表示用）
  // デバフ表示の再計算
  function refreshDebuffTags() {
    const tags = [];
    if (timeDebuffRef.current) tags.push({ icon: "⏳", color: "#38bdf8" });
    if (panicRef.current) tags.push({ icon: "😵", color: "#c084fc" });
    if (comboSealRef.current) tags.push({ icon: "💔", color: "#f472b6" });
    if (silenceRef.current) tags.push({ icon: "🔇", color: "#94a3b8" });
    if (curseRef.current) tags.push({ icon: "💀", color: "#a78bfa" });
    if (forceHardRef.current) tags.push({ icon: "📈", color: "#fb923c" });
    if (forceMaxRef.current) tags.push({ icon: "🧮", color: "#f43f5e" });
    setDebuffTags(tags);
  }
  const setMonsterShieldBoth = (v) => { const n = Math.max(0, Math.round(v)); monsterShieldRef.current = n; setMonsterShield(n); };

  // ── アクティブ仲間モンスター（主人公とともに参戦・1体）──
  const allyDef = ally && ally.monster ? ally : null;            // { monster, hpLv, atkLv }
  const allyBase = allyDef ? allyStats(allyDef.monster, partnerHpLv(allyDef), partnerAtkLv(allyDef)) : null; // { maxHp, atk }
  const [allyHp, setAllyHp] = useState(allyBase ? allyBase.maxHp : 0);
  const allyHpRef = useRef(allyBase ? allyBase.maxHp : 0);
  const [allyOut, setAllyOut] = useState(false); // HP0で退場したか
  const allyOutRef = useRef(false);
  const [allyAct, setAllyAct] = useState(false); // 追撃モーション
  const baitedRef = useRef(false); // この戦闘で魔物のエサを使ったか（表示用）
  // 画面のバフ表示を再計算
  function refreshBuffTags() {
    const tags = [];
    if (timeBuffRef.current) tags.push({ icon: "⏱️", color: "#67e8f9" });
    if (poisonRef.current) tags.push({ icon: "☠️", color: "#a3e635" });
    if (comboKeepRef.current) tags.push({ icon: "🔗", color: "#fbbf24" });
    if (doubleNextRef.current) tags.push({ icon: "✌️", color: "#facc15" });
    if (critRef.current) tags.push({ icon: "🎯", color: "#fb7185" });
    if (counterRef.current) tags.push({ icon: "🪃", color: "#38bdf8" });
    if (reviveRef.current) tags.push({ icon: "🕊️", color: "#fb923c" });
    setBuffTags(tags);
  }

  const setTimerBoth = (v) => { timerRef.current = v; setTimer(v); };
  // バフは ref（即時参照）と state（表示）を両方更新する
  const setAtkBuffBoth = (v) => { atkBuffRef.current = v; setAtkBuff(v); };
  const setGuardBuffBoth = (v) => { guardBuffRef.current = v; setGuardBuff(v); };
  const setRegenBoth = (v) => { regenRef.current = v; setRegen(v); };

  // 毎秒のカウントダウン（ロック中・戦闘終了中は止める）
  useEffect(() => {
    const id = setInterval(() => {
      if (phaseRef.current !== "fight" || lockedRef.current) return;
      const next = timerRef.current - 1;
      if (next <= 0) { setTimerBoth(stats.timer); actionsRef.current.miss?.(); }
      else setTimerBoth(next);
    }, 1000);
    return () => clearInterval(id);
  }, []); // eslint-disable-line

  function nextQuestion() {
    // 防具の特殊効果「再生」：毎問、最大HPの一定割合を自動回復（常時）
    if (specials.regenPct > 0) {
      const amt = Math.max(1, Math.round(stats.maxHp * specials.regenPct));
      setPlayerHp((hp) => Math.min(stats.maxHp, hp + amt));
    }
    // 継続回復（リジェネ）：1ターンごとに少しずつ回復し、残りターンを減らす
    const rg = regenRef.current;
    if (rg && rg.turns > 0) {
      const amt = Math.max(1, Math.round(stats.maxHp * rg.pct));
      setPlayerHp((hp) => Math.min(stats.maxHp, hp + amt));
      const left = rg.turns - 1;
      setRegenBoth(left > 0 ? { ...rg, turns: left } : null);
    }
    // 毒（ポイズン）：1問ごとに敵へ継続ダメージ
    const ps = poisonRef.current;
    if (ps && ps.turns > 0) {
      const dmg = ps.dmg;
      setMonDmg(`-${dmg}`); setDmgKey((k) => k + 1);
      setMonsterHp((hp) => {
        const nv = Math.max(0, hp - dmg);
        if (nv <= 0 && !endedRef.current) setTimeout(triggerWin, 300);
        return nv;
      });
      poisonRef.current = ps.turns - 1 > 0 ? { ...ps, turns: ps.turns - 1 } : null;
    }
    // 敵の再生（強リジェネ）：1ターンごとに敵HPを少し回復
    const er = enemyRegenRef.current;
    if (er && er.turns > 0) {
      const amt = Math.max(1, Math.round(monster.hp * er.pct));
      setMonsterHp((hp) => Math.min(monster.hp, hp + amt));
      enemyRegenRef.current = er.turns - 1 > 0 ? { ...er, turns: er.turns - 1 } : null;
    }
    // 超難問(gigacalc)＞難問化(hardnext)の優先で次の問題の難易度を決める
    const fm = forceMaxRef.current;
    const fh = forceHardRef.current;
    let mode = null; // "max"（鬼級）/ "advanced"（発展）/ null
    if (fm && fm.turns > 0) { mode = "max"; forceMaxRef.current = fm.turns - 1 > 0 ? { ...fm, turns: fm.turns - 1 } : null; }
    else if (fh && fh.turns > 0) { mode = "advanced"; forceHardRef.current = fh.turns - 1 > 0 ? { ...fh, turns: fh.turns - 1 } : null; }
    // 敵の「難問化/超難問」効果(mode)は、problemSource(適応出題/誤答束混入)より優先する
    //  （#2でproblemSourceを通常バトルにも接続したため、mode強制中はそれを一時的に上書きする必要がある）。
    // 次の問題を先に確定させ、その問題に応じた制限時間（基本30秒〜）を決める。
    //  q?.id は直前の問題（重複回避のヒント。多少ずれても実害なし）。
    const nextQ =
      mode === "max" ? genHardProblem(monster, q?.id)
      : mode === "advanced" ? genBattleProblem(monster, q?.id, mode)
      : problemSource ? problemSource(q?.id)
      : genBattleProblem(monster, q?.id, mode);
    setQ(nextQ);
    setInput("");
    setLocked(false); lockedRef.current = false;
    // 制限時間：問題ごとの基本時間に、時間バフ（しゅうちゅう等）／敵デバフ（時間どろぼう等）を適用
    const baseT = questionTime(nextQ, stats.timer);
    const tb = timeBuffRef.current;
    let t = baseT;
    if (tb && tb.turns > 0) {
      t = tb.inf ? 99 : Math.min(99, Math.ceil(baseT * (tb.mult ?? 1.5)));
      timeBuffRef.current = tb.turns - 1 > 0 ? { ...tb, turns: tb.turns - 1 } : null;
    }
    const td = timeDebuffRef.current;
    if (td && td.turns > 0) {
      t = Math.max(2, Math.floor(t * (td.mult ?? 0.6)));
      timeDebuffRef.current = td.turns - 1 > 0 ? { ...td, turns: td.turns - 1 } : null;
    }
    setTimerBoth(t);
    // あせり（タイマー隠し）の残ターン消化
    const pn = panicRef.current;
    if (pn && pn.turns > 0) { setPanicOn(true); panicRef.current = pn.turns - 1 > 0 ? { ...pn, turns: pn.turns - 1 } : null; }
    else { setPanicOn(false); }
    // 沈黙の霧：この問題だけ一瞬かくす（1.1秒で晴れる）。1問で消費。
    const fg = fogRef.current;
    if (fg && fg.turns > 0) {
      setFogOn(true);
      setTimeout(() => setFogOn(false), 1100);
      fogRef.current = fg.turns - 1 > 0 ? { ...fg, turns: fg.turns - 1 } : null;
    } else { setFogOn(false); }
    // 各種残ターンの消化（コンボ封じ／封印／呪い）
    const cs = comboSealRef.current; if (cs && cs.turns > 0) comboSealRef.current = cs.turns - 1 > 0 ? { ...cs, turns: cs.turns - 1 } : null;
    const sl = silenceRef.current;   if (sl && sl.turns > 0) silenceRef.current = sl.turns - 1 > 0 ? { ...sl, turns: sl.turns - 1 } : null;
    const cu = curseRef.current;     if (cu && cu.turns > 0) curseRef.current = cu.turns - 1 > 0 ? { ...cu, turns: cu.turns - 1 } : null;
    refreshBuffTags();
    refreshDebuffTags();
  }

  // SPを変更して即保存（バトルをまたいで維持されるよう App 側へ通知）
  function changeSp(nv) {
    const v = Math.max(0, Math.min(SP_MAX, nv));
    setSp(v);
    onSpChange?.(v);
    return v;
  }

  // スキル発動（SPを消費）。time2x=回答時間2倍 / ultimate=必殺技（基本ダメージのmult倍）
  function useSkill(skill) {
    if (phaseRef.current !== "fight" || endedRef.current || lockedRef.current) return;
    if (silenceRef.current) { setLog("🔇 スキルが封印されている！（あと数問でとける）"); return; }
    if (sp < skill.cost) return;
    changeSp(sp - skill.cost);
    const isUlt = skill.kind === "ultimate" || skill.kind === "drain" || (skill.kind === "burst" && (skill.mult ?? 0) > 0);
    sfx.skill({ ult: isUlt });
    setSkillFx({ name: skill.name, icon: skill.icon, color: skill.color, big: isUlt });
    setTimeout(() => setSkillFx(null), 2000);

    if (skill.kind === "time2x") {
      const mult = skill.timeMult ?? 2;
      setTimerBoth(Math.min(99, Math.ceil(timerRef.current * mult)));
      setLog(`${skill.icon} ${skill.name}！ 考える時間が${mult}倍になった！`);
    } else if (skill.kind === "heal") {
      const amt = Math.round(stats.maxHp * (skill.value ?? 0.3));
      setPlayerHp((hp) => Math.min(stats.maxHp, hp + amt));
      setLog(`${skill.icon} ${skill.name}！ HPが ${amt} 回復した！`);
    } else if (skill.kind === "regen") {
      setRegenBoth({ turns: skill.turns ?? 3, pct: skill.pct ?? 0.15 });
      setLog(`${skill.icon} ${skill.name}！ ${skill.turns}ターン 毎ターン回復し続ける！`);
    } else if (skill.kind === "guard") {
      setGuardBuffBoth({ turns: skill.turns ?? 2, reduce: skill.reduce ?? 0.5 });
      setLog(`${skill.icon} ${skill.name}！ ${skill.turns}ターン 受けるダメージを軽減！`);
    } else if (skill.kind === "dmgup") {
      setAtkBuffBoth({ turns: skill.turns ?? 2, mult: skill.mult ?? 1.5 });
      setLog(`${skill.icon} ${skill.name}！ ${skill.turns}ターン 与ダメージ${skill.mult}倍！`);
    } else if (skill.kind === "timebuff") {
      timeBuffRef.current = { turns: skill.turns ?? 2, mult: skill.mult ?? 1.5, inf: !!skill.inf };
      // 今出ている問題にも即反映
      setTimerBoth(skill.inf ? 99 : Math.min(99, Math.ceil(timerRef.current * (skill.mult ?? 1.5))));
      refreshBuffTags();
      setLog(`${skill.icon} ${skill.name}！ ${skill.inf ? "制限時間がなくなった！" : `${skill.turns}問のあいだ 時間に余裕ができた！`}`);
    } else if (skill.kind === "poison") {
      poisonRef.current = { turns: skill.turns ?? 3, dmg: Math.max(1, Math.round(stats.atk * (skill.mult ?? 1.2))) };
      refreshBuffTags();
      setLog(`${skill.icon} ${skill.name}！ 敵を毒におかした！（${skill.turns}ターン継続ダメージ）`);
    } else if (skill.kind === "combokeep") {
      comboKeepRef.current = { turns: skill.turns ?? 3 };
      refreshBuffTags();
      setLog(`${skill.icon} ${skill.name}！ ${skill.turns}ターン コンボが切れなくなった！`);
    } else if (skill.kind === "doublenext") {
      doubleNextRef.current = true;
      refreshBuffTags();
      setLog(`${skill.icon} ${skill.name}！ 次の正解のダメージが2倍だ！`);
    } else if (skill.kind === "critup") {
      critRef.current = { turns: skill.turns ?? 3 };
      refreshBuffTags();
      setLog(`${skill.icon} ${skill.name}！ ${skill.turns}ターン コンボの会心ボーナスが2倍！`);
    } else if (skill.kind === "counter") {
      counterRef.current = { turns: skill.turns ?? 3, dmg: Math.max(1, Math.round(stats.atk * (skill.mult ?? 2))) };
      refreshBuffTags();
      setLog(`${skill.icon} ${skill.name}！ ${skill.turns}ターン 被弾するたび反撃する！`);
    } else if (skill.kind === "revive") {
      reviveRef.current = true;
      refreshBuffTags();
      setLog(`${skill.icon} ${skill.name}！ 倒れても一度だけ復活できる！`);
    } else if (skill.kind === "winbonus") {
      winBonusRef.current = {
        coins: (winBonusRef.current.coins || 0) + (skill.coins || 0),
        crystals: (winBonusRef.current.crystals || 0) + (skill.crystals || 0),
      };
      setLog(`${skill.icon} ${skill.name}！ 勝つとごほうびが増える！`);
    } else if (skill.kind === "ultimate" || skill.kind === "drain" || skill.kind === "burst") {
      // burst：与ダメ倍・時間無制限・継続回復などのバフを同時付与
      if (skill.kind === "burst") {
        if (skill.buffMult) setAtkBuffBoth({ turns: skill.buffTurns ?? 3, mult: skill.buffMult });
        if (skill.timeInf) { timeBuffRef.current = { turns: skill.timeInf, inf: true }; setTimerBoth(99); }
        if (skill.regenPct) setRegenBoth({ turns: skill.regenTurns ?? 5, pct: skill.regenPct });
        refreshBuffTags();
      }
      const dmg = (skill.mult ?? 0) > 0 ? ultimateDamage(stats.atk, skill.mult) : 0;
      if (dmg <= 0) {
        // ダメージなし（ゼロカウント／オーバーロード等）はバフのみ
        setLog(`${skill.icon} ${skill.name}発動！ 力がみなぎる！`);
        return;
      }
      // カットイン演出を見せてから着弾させる（倒した瞬間の余韻を出す）
      setTimeout(() => {
        if (endedRef.current) return;
        setMonState("damage"); setAnimKey((k) => k + 1);
        setMonDmg(`-${dmg}`); setDmgKey((k) => k + 1);
        setShowRing(true); setTimeout(() => setShowRing(false), 700);
        if (skill.kind === "drain") {
          const heal = Math.round(dmg * (skill.drain ?? 0.4));
          setPlayerHp((hp) => Math.min(stats.maxHp, hp + heal));
          setLog(`${skill.icon} ${skill.name}！ ${dmg}ダメージ＋HP ${heal} 回復！`);
        } else {
          setLog(`${skill.icon} ${skill.name}さくれつ！ ${dmg}ダメージ！`);
        }
        setMonsterHp((hp) => {
          const nv = Math.max(0, hp - dmg);
          if (nv <= 0) setTimeout(triggerWin, 800);
          else setTimeout(() => setMonState("idle"), 700);
          return nv;
        });
      }, 1500);
    }
  }

  // アイテムを使う（1つだけ所持・使うと消費して永続データからも消す）
  function useItem() {
    if (!item || phaseRef.current !== "fight" || endedRef.current) return;
    const it = findItem(item);
    if (!it) return;
    setItem(null); onItemUse?.(); // 在庫から消す（バトルをまたいで消費が残る）
    setSkillFx({ name: it.name, icon: it.icon, color: it.color });
    setTimeout(() => setSkillFx(null), 2000);
    sfx.skill();

    if (it.kind === "heal") {
      const amt = Math.round(stats.maxHp * (it.value ?? 0.5));
      setPlayerHp((hp) => Math.min(stats.maxHp, hp + amt));
      setLog(`${it.icon} ${it.name}！ HPが ${amt} 回復した！`);
    } else if (it.kind === "atk2x") {
      const turns = it.turns ?? 1;
      setAtkBuffBoth({ turns, mult: 2 });
      setLog(`${it.icon} ${it.name}！ ${turns === 1 ? "次の攻撃" : `${turns}ターン`}ダメージが2倍だ！`);
    } else if (it.kind === "guard") {
      const turns = it.turns ?? 2;
      const reduce = it.reduce ?? 0.5;
      setGuardBuffBoth({ turns, reduce });
      setLog(`${it.icon} ${it.name}！ ${turns}ターン 受けるダメージが${reduce <= 0.25 ? "1/4" : reduce <= 0.34 ? "約1/3" : "1/2"}になる！`);
    } else if (it.kind === "sp" || it.kind === "sp5") {
      const amt = it.value ?? 5;
      changeSp(sp + amt);
      setLog(`${it.icon} ${it.name}！ スキルポイントが ${amt} 増えた！`);
    } else if (it.kind === "bait") {
      baitedRef.current = true;
      onUseBait?.(monster.id); // App に通知：この敵をたおすと仲間チャレンジ
      setLog(`🍖 ${it.name}を投げた！ この敵をたおすと仲間になるかも？`);
    }
  }

  function triggerWin() {
    if (endedRef.current) return;
    // 不死（erevive）：HP0でも一度だけ半分のHPで復活（勝利を取り消して継戦）
    if (monster.revive && !enemyRevivedRef.current) {
      enemyRevivedRef.current = true;
      const half = Math.ceil(monster.hp / 2);
      setMonsterHp(half); monsterHpRef.current = half;
      setMonState("idle"); setAnimKey((k) => k + 1);
      showEnemyFx({ icon: "🪦", label: "不死の力で復活！", color: "#e879f9" });
      setEnemyIntent({ text: "🪦 不死の力で復活した！", color: "#e879f9" });
      setLog(`${monster.name} は不死の力で復活した…！`);
      sfx.skill({ ult: true });
      // ★復活後はバトルを続行する（ロック解除＋次の問題）。
      //  これが無いと、トドメ→復活のあと入力がロックされたまま固まる（魔王フリーズの原因）。
      setTimeout(() => { if (!endedRef.current && phaseRef.current === "fight") nextQuestion(); }, 1000);
      return;
    }
    endedRef.current = true;
    // 勝利ボーナス（ついてる／クリスタルラック等のスキル効果）を反映
    const wb = winBonusRef.current;
    if (wb && (wb.coins || wb.crystals)) onWinBonus?.({ coins: wb.coins || 0, crystals: wb.crystals || 0 });
    saveHp(playerHpRef.current); // 勝っても全快しない：残りHPを持ち越す
    setPhase("win"); phaseRef.current = "win";
    bgm.play("victory", { loop: false });
    setMonState("dead"); setAnimKey((k) => k + 1);
    const parts = Array.from({ length: 16 }, (_, i) => {
      const ang = (i * (360 / 16)) * Math.PI / 180;
      const r = 50 + Math.random() * 60;
      return {
        i, size: 6 + Math.random() * 9,
        color: monster.deathColors[i % monster.deathColors.length],
        tx: Math.cos(ang) * r, ty: Math.sin(ang) * r, rot: Math.random() * 360,
        round: Math.random() > 0.5,
      };
    });
    setDeadParticles(parts);
    setLog(`${monster.name} をたおした！✨ 💰+${monster.reward}`);
    setTimeout(() => onResult(true, { ...tallyRef.current }), 1500);
  }

  function triggerLose() {
    if (endedRef.current) return;
    // フェニックス：HP0でも一度だけ全回復で復活
    if (reviveRef.current) {
      reviveRef.current = false;
      refreshBuffTags();
      setPlayerHp(stats.maxHp);
      setHurt(false);
      setLog("🕊️ フェニックス！ 倒れたが全回復で復活した！");
      sfx.skill({ ult: true });
      return;
    }
    endedRef.current = true;
    saveHp(1); // 敗北：HP1で生き残る（ショップで治療して再挑戦）
    setPhase("lose"); phaseRef.current = "lose";
    bgm.play("defeat", { loop: false });
    setLog("あなたはたおれてしまった…💀");
    setTimeout(() => onResult(false, { ...tallyRef.current }), 1200);
  }

  // 敵の演出を中央に一瞬出す
  function showEnemyFx(fx) {
    setEnemyFx(fx);
    setTimeout(() => setEnemyFx(null), 1100);
  }

  // 敵の攻撃を実際に当てる（ガード・画面ゆれ・被ダメ・敗北判定）
  //  opts.pierce=true … ガードを無視（防御貫通）
  //  opts.guaranteed=true（ため攻撃burst/超必殺技super）は必ず命中。それ以外はDODGE_CHANCEでかわせる。
  function enemyHit(rawDmg, label, fx, opts = {}) {
    if (!opts.guaranteed && Math.random() < DODGE_CHANCE) {
      setShakeAns(true); setTimeout(() => setShakeAns(false), 300);
      setMonState("attack"); setAnimKey((k) => k + 1);
      showEnemyFx({ icon: "💨", label: "ひらりとかわした！", color: "#86efac" });
      setLog(`${label} → 💨 かわした！ ノーダメージ！`);
      sfx.tap();
      return;
    }
    // 暴走（enrage）：敵HPが半分以下になると攻撃力アップ
    let scaled = rawDmg;
    if (monster.enrage && monsterHpRef.current <= monster.hp * 0.5) scaled = rawDmg * monster.enrage;
    // 1パン防止：1回の被ダメは最大HPの70%まで（満タンからの即死を避ける）
    let dmg = 1; // 敵の1撃＝ハート1個（§15②：最初は5ミスで負け、ボス撃破でHP増）

    // 仲間が庇う：主人公HPが30%以下なら、生きている仲間がダメージを肩代わりする。
    //  庇う仲間は「主人公と同じダメージ＝敵の実ダメージ」をそのまま受ける。
    //  （主人公にかかる70%上限＝低レベルだと約40の頭打ちは、即死回避のための主人公専用。
    //    仲間が身代わりになるときはその上限を外し、ちゃんとダメージが通るようにする。）
    if (allyBase && !allyOutRef.current && playerHpRef.current <= stats.maxHp * 0.3) {
      const aname = allyDef.monster.name;
      const coverDmg = Math.max(1, Math.round(scaled)); // 敵の実ダメージ（上限なし）
      setShakeAns(true); setTimeout(() => setShakeAns(false), 460);
      setMonState("attack"); setAnimKey((k) => k + 1);
      if (fx) showEnemyFx(fx);
      // ref を同期的に更新してから KO 判定（setState は非同期なので ref を真として扱う）
      const newAllyHp = Math.max(0, allyHpRef.current - coverDmg);
      allyHpRef.current = newAllyHp; setAllyHp(newAllyHp);
      if (newAllyHp <= 0) {
        allyOutRef.current = true; setAllyOut(true);
        setLog(`🛡️ ${aname}が主人公をかばった！ ${aname}は たおれて退場した…`);
      } else {
        setLog(`🛡️ ${aname}が主人公をかばった！ -${coverDmg}`);
      }
      return; // 主人公はノーダメージ
    }

    let guarded = false, invinc = false;
    const gb = opts.pierce ? null : guardBuffRef.current; // 貫通はガードを無視
    if (gb && gb.turns > 0) {
      if ((gb.reduce ?? 0.5) <= 0) { dmg = 0; invinc = true; } // 完全無敵
      else { dmg = Math.max(1, Math.round(dmg * gb.reduce)); guarded = true; }
      const left = gb.turns - 1;
      setGuardBuffBoth(left > 0 ? { ...gb, turns: left } : null);
    }
    setShakeAns(true); setTimeout(() => setShakeAns(false), 460);
    if (dmg > 0) {
      setHurt(true); setTimeout(() => setHurt(false), 520);
      setCheer({ text: pickHurtCheer(), hurt: true, key: ++cheerKey.current }); // 自キャラが「いてっ！」
    }
    setMonState("attack"); setAnimKey((k) => k + 1);
    if (fx) showEnemyFx(fx);
    setLog(`${label} -${dmg}` + (invinc ? "（🌟無敵！）" : guarded ? "（🛡️ガード！）" : ""));
    setPlayerHp((hp) => {
      const nv = Math.max(0, hp - dmg);
      if (nv <= 0) setTimeout(triggerLose, 500);
      return nv;
    });
    // カウンター：被弾するたび反撃（1ターン消費）
    const ct = counterRef.current;
    if (ct && ct.turns > 0 && dmg > 0) {
      counterRef.current = ct.turns - 1 > 0 ? { ...ct, turns: ct.turns - 1 } : null;
      refreshBuffTags();
      setTimeout(() => {
        if (endedRef.current) return;
        setMonDmg(`-${ct.dmg}`); setDmgKey((k) => k + 1);
        setMonState("damage"); setAnimKey((k) => k + 1);
        setLog(`🪃 カウンター！ ${ct.dmg}ダメージ！`);
        setMonsterHp((hp) => {
          const nv = Math.max(0, hp - ct.dmg);
          if (nv <= 0 && !endedRef.current) setTimeout(triggerWin, 400);
          else setTimeout(() => setMonState("idle"), 500);
          return nv;
        });
      }, 600);
    }
  }

  // 敵のターン（プレイヤーの不正解・時間切れで回ってくる）。AIに従って行動を分岐。
  function enemyTurn(reason) {
    // コンボキープ中はミスしてもコンボ維持（1チャージ消費）。それ以外は0に戻す。
    const ck = comboKeepRef.current;
    if (ck && ck.turns > 0) {
      comboKeepRef.current = ck.turns - 1 > 0 ? { ...ck, turns: ck.turns - 1 } : null;
      refreshBuffTags();
    } else {
      setCombo(0);
    }
    const { st, act } = enemyDecide(monster.ai || "plain", aiStateRef.current, monster);
    aiStateRef.current = st;
    const pre = reason ? reason + " " : "";

    // 敵の「ため」状態を予告バッジに反映
    if (monster.ai === "charger") setEnemyIntent(st.charged ? { text: "⚡ ためた！次の一撃は2倍", color: "#fbbf24" } : null);
    else if (monster.ai === "super") setEnemyIntent(st.superCount > 0 ? { text: `💥 超必殺まであと ${(monster.chargeNeed ?? ENEMY_CHARGE_NEED) - st.superCount + 1}`, color: "#f472b6" } : null);

    if (act.kind === "charge") {
      setCharging(true);
      setMonState("idle"); setAnimKey((k) => k + 1);
      showEnemyFx({ icon: "⚡", label: monster.ai === "super" ? "チャージ中…" : "ためている…", color: "#fbbf24" });
      setLog(`${pre}${monster.name} は ${act.label}`);
      return;
    }
    setCharging(false);

    if (act.kind === "heal") {
      const amt = Math.max(1, Math.round(monster.hp * act.healPct));
      setMonsterHp((hp) => Math.min(monster.hp, hp + amt));
      setMonState("idle"); setAnimKey((k) => k + 1);
      showEnemyFx({ icon: "💚", label: "かいふく！", color: "#4ade80" });
      setLog(`${pre}${monster.name} は ${act.label} ＋${amt}`);
      return;
    }

    // 追加の敵スキル（連撃・会心・貫通・各種デバフ・自己強化）はここで処理。
    // 該当すれば true を返して終了。通常攻撃系（attack/magic/fire/burst/super）は下へ。
    if (applyEnemyMove(act, pre)) return;

    // 攻撃系（attack / magic / fire / burst / super）
    const FX = {
      magic: { icon: "🔮", label: "まほう！", color: "#a78bfa" },
      fire:  { icon: "🔥", label: "炎のブレス！", color: "#fb923c" },
      burst: { icon: "💢", label: "ためた一撃！", color: "#f87171" },
      super: { icon: "💥", label: "超必殺技！", color: "#f472b6" },
    };
    const isChargedHit = act.kind === "super" || act.kind === "burst";
    if (isChargedHit) setEnemyIntent(null); // 撃ったので予告クリア
    enemyHit(monster.atk * (act.mult || 1), `${pre}${monster.name} ${act.label}`, FX[act.kind] || null, { guaranteed: isChargedHit });
  }

  // 追加の敵スキルを適用する。処理したら true（＝通常攻撃に進まない）。
  function applyEnemyMove(act, pre) {
    const mfx = { icon: act.icon, label: act.label, color: act.color };
    const chip = act.chip ? monster.atk * act.chip : 0; // デバフ系が伴う小ダメージ
    const tag = `${pre}${monster.name} ${act.label}`;
    switch (act.kind) {
      // ── 攻撃バリエーション ──
      case "multi": {
        const hits = act.hits ?? 3;
        showEnemyFx(mfx);
        for (let i = 0; i < hits; i++) {
          setTimeout(() => { if (!endedRef.current) enemyHit(monster.atk * (act.mult ?? 0.5), `${tag}（${i + 1}発目）`, i === 0 ? mfx : null); }, i * 320);
        }
        return true;
      }
      case "crit":
        enemyHit(monster.atk * (act.mult ?? 2), tag, mfx);
        return true;
      case "pierce":
        enemyHit(monster.atk * (act.mult ?? 1.1), tag, mfx, { pierce: true });
        return true;
      // ── 時間を狙う ──
      case "timesteal":
      case "timecrush":
        timeDebuffRef.current = { turns: act.turns ?? 2, mult: act.mult ?? 0.6 };
        refreshDebuffTags(); setLog(tag);
        chip ? enemyHit(chip, tag, mfx) : showEnemyFx(mfx);
        return true;
      case "panic":
        panicRef.current = { turns: act.turns ?? 2 };
        refreshDebuffTags(); setLog(tag);
        chip ? enemyHit(chip, tag, mfx) : showEnemyFx(mfx);
        return true;
      // ── リソース妨害 ──
      case "comboseal":
        comboSealRef.current = { turns: act.turns ?? 2 }; setCombo(0);
        refreshDebuffTags(); setLog(tag);
        chip ? enemyHit(chip, tag, mfx) : showEnemyFx(mfx);
        return true;
      case "silence":
        silenceRef.current = { turns: act.turns ?? 2 };
        refreshDebuffTags(); setLog(tag);
        chip ? enemyHit(chip, tag, mfx) : showEnemyFx(mfx);
        return true;
      case "spdrain":
        changeSp(sp - (act.amount ?? 3)); setLog(tag);
        chip ? enemyHit(chip, tag, mfx) : showEnemyFx(mfx);
        return true;
      case "dispel":
        dispelOnePlayerBuff(); setLog(tag);
        chip ? enemyHit(chip, tag, mfx) : showEnemyFx(mfx);
        return true;
      case "curse":
        curseRef.current = { turns: act.turns ?? 3, mult: act.mult ?? 0.6 };
        refreshDebuffTags(); setLog(tag);
        chip ? enemyHit(chip, tag, mfx) : showEnemyFx(mfx);
        return true;
      // ── 問題に干渉 ──
      case "hardnext":
        forceHardRef.current = { turns: act.turns ?? 2 };
        refreshDebuffTags(); setLog(tag);
        chip ? enemyHit(chip, tag, mfx) : showEnemyFx(mfx);
        return true;
      case "fog":
        fogRef.current = { turns: act.turns ?? 1 };
        setLog(tag);
        chip ? enemyHit(chip, tag, mfx) : showEnemyFx(mfx);
        return true;
      case "gigacalc":
        // 次の数問を「鬼」級の超難問にする（裏ボスの目玉ギミック）
        forceMaxRef.current = { turns: act.turns ?? 2 };
        forceHardRef.current = null; // 難問化より強いので上書き
        refreshDebuffTags();
        setEnemyIntent({ text: "🧮 次は超難問がくる…！", color: "#f43f5e" });
        setLog(tag);
        chip ? enemyHit(chip, tag, mfx) : showEnemyFx(mfx);
        return true;
      // ── 敵の自己強化（プレイヤーへの直接ダメージなし）──
      case "barrier":
      case "decoy":
        setMonsterShieldBoth(monsterShieldRef.current + Math.max(1, Math.round(monster.hp * (act.pct ?? 0.25))));
        setMonState("idle"); setAnimKey((k) => k + 1);
        showEnemyFx(mfx); setLog(tag);
        return true;
      case "eregen":
        enemyRegenRef.current = { turns: act.turns ?? 4, pct: act.pct ?? 0.06 };
        setMonState("idle"); setAnimKey((k) => k + 1);
        showEnemyFx(mfx); setLog(tag);
        return true;
      default:
        return false;
    }
  }

  // バフ消し（ディスペル）：プレイヤーの有利な効果を1つだけ打ち消す
  function dispelOnePlayerBuff() {
    if (atkBuffRef.current) { setAtkBuffBoth(null); }
    else if (guardBuffRef.current) { setGuardBuffBoth(null); }
    else if (regenRef.current) { setRegenBoth(null); }
    else if (critRef.current) { critRef.current = null; }
    else if (counterRef.current) { counterRef.current = null; }
    else if (comboKeepRef.current) { comboKeepRef.current = null; }
    else if (doubleNextRef.current) { doubleNextRef.current = false; }
    else if (timeBuffRef.current) { timeBuffRef.current = null; }
    refreshBuffTags();
  }

  // 主人公の攻撃のあと、生きている仲間が「追撃」する。終わったら次の問題へ。
  function allyFollowUp() {
    if (endedRef.current) return;
    if (!allyBase || allyOutRef.current) { nextQuestion(); return; }
    const dmg = allyBase.atk;
    setAllyAct(true); setTimeout(() => setAllyAct(false), 360);
    showEnemyFx({ icon: "🐾", label: `${allyDef.monster.name}の追撃！`, color: "#fbbf24" });
    setMonState("damage"); setAnimKey((k) => k + 1);
    setMonDmg(`-${dmg}`); setDmgKey((k) => k + 1);
    setLog(`🐾 ${allyDef.monster.name}の追撃！ ${dmg}ダメージ！`);
    setMonsterHp((hp) => {
      const nv = Math.max(0, hp - dmg);
      monsterHpRef.current = nv;
      if (nv <= 0) setTimeout(triggerWin, 350);
      else setTimeout(() => { setMonState("idle"); nextQuestion(); }, 650);
      return nv;
    });
  }

  function answer(val) {
    if (locked || phaseRef.current !== "fight" || !q || val === "" || val == null) return;
    setLocked(true); lockedRef.current = true;
    const ok = ansEq(val, q);
    // 演習バトル：1問ごとに習熟(Elo)＋サイクル進捗を更新（仕様はStepUpと同一・表現がバトル）
    if (onAttempt) onAttempt({ skill: q.skill, unitId: q.unitId, level: q.level, ok, q: q.q, ans: q.ans, templateId: q.id, seed: q.seed ?? null, userAnswer: String(val) });

    if (ok) {
      sfx.correct();
      tallyRef.current.correct++; // 学習記録：正解数
      const sealed = !!comboSealRef.current;        // コンボ封じ中はコンボが伸びない
      const newCombo = sealed ? 0 : combo + 1;
      setCombo(newCombo);
      changeSp(sp + 1); // 正解でSP+1（5でスキル1、10でスキル2）
      // 攻撃力＝その問題の単元の理解度（§15）：理解度0→10発・100→5発で撃破。レベル/ATK非依存＝強さ=理解度。
      //   その単元を習熟するほど攻撃が上がる（属性的に単元ごと独立）。コンボ3以上で少し上乗せ。
      const _um = (player.unitMastery && player.unitMastery[q.unitId]) || {};
      const _hits = Math.max(5, Math.round(10 - 5 * ((_um.pt ?? 0) / 100))); // 10(理解度0) → 5(理解度100)
      const baseDmg = Math.max(1, Math.ceil(monster.hp / _hits));
      let dmg = newCombo >= 3 ? Math.round(baseDmg * 1.3) : baseDmg;
      // 武器の特殊効果「会心」：3コンボ以上でさらに会心ボーナスを上乗せ
      if (specials.critPct > 0 && newCombo >= 3) dmg += Math.floor(stats.atk * specials.critPct);
      let boosted = false, crit = false, doubled = false, cursed = false, exposed = false;
      // クリティカル：コンボ会心ボーナス（atk×0.5）をもう一段ぶん上乗せ
      const cr = critRef.current;
      if (cr && cr.turns > 0) {
        if (newCombo >= 3) { dmg += Math.floor(stats.atk * 0.5); crit = true; }
        critRef.current = cr.turns - 1 > 0 ? { ...cr, turns: cr.turns - 1 } : null;
      }
      const ab = atkBuffRef.current;
      if (ab && ab.turns > 0) {
        dmg = Math.round(dmg * ab.mult);
        boosted = true;
        const left = ab.turns - 1;
        setAtkBuffBoth(left > 0 ? { ...ab, turns: left } : null);
      }
      // ダブルアップ：次の正解ダメージを2倍（1回だけ）
      if (doubleNextRef.current) { dmg *= 2; doubled = true; doubleNextRef.current = false; }
      // 弱点露出：敵がチャージ中は与ダメージ2倍
      if (charging && monster.exposeOnCharge) { dmg *= 2; exposed = true; }
      // 呪い：与ダメージ低下
      const cu = curseRef.current;
      if (cu) { dmg = Math.max(1, Math.round(dmg * (cu.mult ?? 0.6))); cursed = true; }
      refreshBuffTags();
      setShowRing(true); setTimeout(() => setShowRing(false), 700);
      setHeroAtk(true); setTimeout(() => setHeroAtk(false), 340); // 自キャラ前のめり
      setCheer({ text: pickHitCheer({ streak: newCombo }), hurt: false, key: ++cheerKey.current });
      setMonState("damage"); setAnimKey((k) => k + 1);
      // バリア／みがわり：あればダメージを肩代わりする
      let toHp = dmg, absorbed = 0;
      if (monsterShieldRef.current > 0) {
        absorbed = Math.min(monsterShieldRef.current, toHp);
        setMonsterShieldBoth(monsterShieldRef.current - absorbed);
        toHp -= absorbed;
      }
      setMonDmg(absorbed > 0 && toHp === 0 ? "🔰" : `-${toHp || dmg}`); setDmgKey((k) => k + 1);
      // 武器の特殊効果「ドレイン（lifesteal）」：与えたダメージの割合ぶんHP回復
      if (specials.lifesteal > 0 && toHp > 0) {
        const heal = Math.max(1, Math.round(toHp * specials.lifesteal));
        setPlayerHp((hp) => Math.min(stats.maxHp, hp + heal));
      }
      setLog(
        (doubled ? "✌️ダブルアップ！ " : "") + (crit ? "🎯会心！ " : "") + (exposed ? "💥弱点ヒット！ " : "") + (boosted ? "💪パワーアップ！ " : "") + (cursed ? "💀呪いで弱体… " : "") + (absorbed > 0 ? "🔰バリアが防いだ！ " : "") +
        (newCombo >= 3 ? `正解！🔥${newCombo}コンボ ${dmg}ダメージ！` : `正解！${dmg}ダメージ！`)
      );
      // とげ（thorns）：攻撃するたび少し反射ダメージを受ける
      if (monster.thorns) {
        const rfl = Math.max(1, Math.round(dmg * monster.thorns));
        setTimeout(() => {
          if (endedRef.current) return;
          setPlayerHp((hp) => { const nv = Math.max(0, hp - rfl); if (nv <= 0) setTimeout(triggerLose, 400); return nv; });
        }, 250);
      }
      setMonsterHp((hp) => {
        const nv = Math.max(0, hp - toHp);
        monsterHpRef.current = nv;
        if (nv <= 0) setTimeout(triggerWin, 350);
        else setTimeout(() => { setMonState("idle"); allyFollowUp(); }, 700); // 主人公→仲間の追撃→次の問題
        return nv;
      });
    } else {
      sfx.wrong();
      tallyRef.current.wrong++; // 学習記録：不正解数
      // 間違えた問題を「学び直しモード」へ記録（バトルの誤答も復習対象に）
      onMistake?.({ q: q.q, ans: q.ans, unitId: q.unitId, level: q.level });
      enemyTurn(`不正解…(正解 ${q.ans})`);
      setTimeout(() => { if (phaseRef.current === "fight") { setMonState("idle"); nextQuestion(); } }, 950);
    }
  }

  // 時間切れ＝ミス（タイマーから呼ばれる。最新版を毎レンダー登録）
  actionsRef.current.miss = () => {
    if (lockedRef.current || phaseRef.current !== "fight") return;
    setLocked(true); lockedRef.current = true;
    sfx.wrong();
    tallyRef.current.wrong++; // 学習記録：時間切れも不正解として数える
    if (q) onMistake?.({ q: q.q, ans: q.ans, unitId: q.unitId, level: q.level }); // 時間切れも学び直しへ
    if (onAttempt && q) onAttempt({ skill: q.skill, unitId: q.unitId, level: q.level, ok: false, q: q.q, ans: q.ans, templateId: q.id, seed: q.seed ?? null, userAnswer: "" }); // 演習バトル：時間切れも1試行
    enemyTurn("⏰時間切れ！");
    setTimeout(() => { if (phaseRef.current === "fight") { setMonState("idle"); nextQuestion(); } }, 850);
  };

  // 解答欄のキー補助（OSキーボードで −・/ を探しにくい子向け）。タップで挿入。
  function pressKey(k) {
    if (locked) return;
    setInput((v) => {
      if (k === "back") return v.slice(0, -1);
      if (k === "-") return v.startsWith("-") ? v.slice(1) : "-" + v; // 先頭の符号をトグル
      if (k === "/") return v.includes("/") || v === "" ? v : v + "/"; // 分数バー（1個だけ・先頭は不可）
      return v + k;
    });
    inputRef.current?.focus();
  }

  const monHpPct = Math.max(0, (monsterHp / monster.hp) * 100);
  const plHpPct = Math.max(0, (playerHp / stats.maxHp) * 100);
  const timePct = (timer / stats.timer) * 100;
  const hpColor = (p) => (p > 50 ? "linear-gradient(90deg,#00cc44,#00ff88)" : p > 25 ? "linear-gradient(90deg,#cc9900,#ffcc00)" : "linear-gradient(90deg,#cc2200,#ff4400)");

  // ---- 勝敗画面 ----
  if (phase === "win" || phase === "lose") {
    const win = phase === "win";
    return (
      <div className="battle-app">
        <StarField />
        <div className="bt-moon" />
        <div className="battle-ground" />
        <div className="battle-content" style={{ justifyContent: "center", alignItems: "center", textAlign: "center" }}>
          <div style={{ fontSize: 64 }}>{win ? "🎉" : "💀"}</div>
          <div style={{ fontSize: 26, fontWeight: 900, color: win ? "#7fff7f" : "#ff6b6b", textShadow: win ? "0 0 18px #00ff88" : "none" }}>
            {win ? "勝利！" : "敗北…"}
          </div>
          <div style={{ fontSize: 13, color: "#cceebb", margin: "6px 0 14px" }}>
            {win ? `${monster.name} をたおした！ 💰+${monster.reward} を獲得！` : `${monster.name} に やられてしまった…`}
          </div>
          {!win && <div style={{ fontSize: 12, color: "#88aa88", marginBottom: 14, maxWidth: 300 }}>💡 HP1でメニューに戻ります。「アイテム」で回復してから もう一度挑戦しよう。強くなるには「学習サイクル」をクリアしてレベルを上げよう！</div>}
          {win ? (
            <div style={{ display: "flex", gap: 10 }}>
              <button className="bt-choice" style={{ padding: "12px 18px" }} onClick={onExit}>👾 相手を選ぶ</button>
              <button className="bt-choice" style={{ padding: "12px 18px", borderColor: "#7fff7f" }} onClick={() => onResult("retry")}>🔁 もう一度</button>
            </div>
          ) : (
            <div style={{ fontSize: 13, color: "#cceebb", fontWeight: 700 }}>メニューにもどります…</div>
          )}
        </div>
      </div>
    );
  }

  // ---- 戦闘中 ----
  return (
    <div className={"battle-app" + (hurt ? " bt-screen-shake" : "")}>
      <div className="encounter-flash" />
      {phase === "intro" && <BigWord text="START!" color="#7fff7f" onDone={() => { phaseRef.current = "fight"; setPhase("fight"); }} />}
      <StarField />
      <div className="bt-moon" />
      {hurt && <div className="bt-damage-overlay show" />}
      {skillFx && (
        <div className={"bt-skill-fx" + (skillFx.big ? " is-ult" : "")} style={{ "--sc": skillFx.color }}>
          <div className="sc-flash" />
          <div className="sc-rays" />
          <div className="sc-band" />
          <div className="sc-burst" />
          <div className="sc-core">
            <span className="sc-ic">{skillFx.icon}</span>
            <span className="sc-nm">{skillFx.name}！</span>
          </div>
        </div>
      )}
      <div className="battle-ground" />
      <div className="battle-content">
        {/* 敵ステータス */}
        <div className="bt-panel">
          <span className="bt-enemy-name" style={{ color: monster.color }}>{monster.name}</span>
          <span className="bt-enemy-theme">【{monster.unit}】</span>
          {enemyIntent && (
            <span className="bt-intent" style={{ "--ic": enemyIntent.color }}>{enemyIntent.text}</span>
          )}
          <div className="bt-hp-row">
            <span className="bt-hp-label">HP</span>
            <div className="bt-hp-track"><div className="bt-hp-fill" style={{ width: monHpPct + "%", background: hpColor(monHpPct) }} /></div>
            <span className="bt-hp-num">{Math.max(0, monsterHp)} / {monster.hp}</span>
          </div>
          {monsterShield > 0 && (
            <div style={{ fontSize: 11, fontWeight: 900, color: "#93c5fd", marginTop: 2, textShadow: "0 0 6px #3b82f6" }}>
              🔰 バリア {monsterShield}
            </div>
          )}
        </div>

        {/* モンスター舞台（自キャラ左・敵モンスター右で向かい合う） */}
        <div className="bt-stage">
          {/* 応援の吹き出し（自キャラの頭上） */}
          {cheer && (
            <div key={cheer.key} className={"bt-cheer" + (cheer.hurt ? " hurt" : "")}>{cheer.text}</div>
          )}
          {/* 自分のキャラ（立ち絵）：左下。正解で前のめり／被ダメでのけぞり＋赤フラッシュ */}
          {heroImageFor(player.avatar) && (
            <HeroImg
              src={heroImageFor(player.avatar)} alt="あなた"
              className={"bt-hero" + (heroAtk ? " attack" : "") + (hurt ? " hit" : "")}
              style={{
                position: "absolute", left: 0, bottom: -8, height: 150, width: "auto",
                maxWidth: "44%", objectFit: "contain", zIndex: 3, pointerEvents: "none",
              }}
            />
          )}
          {/* 敵モンスター＋戦闘演出（右側にまとめて配置） */}
          <div className="bt-mon">
            {charging && <div className="bt-charge-aura" />}
            {monDmg && <div key={dmgKey} className="mon-dmg-num show">{monDmg}</div>}
            {enemyFx && (
              <div className="bt-enemy-fx" style={{ "--ec": enemyFx.color }}>
                <span className="ic">{enemyFx.icon}</span>
                <span className="nm">{enemyFx.label}</span>
              </div>
            )}
            {showRing && <><div className="correct-ring show" /><div className="correct-flash show" /></>}
            <MonsterSprite monster={monster} state={monState} animKey={animKey} />
            {deadParticles.length > 0 && (
              <div className="bt-particles">
                {deadParticles.map((p) => (
                  <div key={p.i} className="bt-dp burst" style={{
                    width: p.size, height: p.size, background: p.color,
                    borderRadius: p.round ? "50%" : "2px",
                    "--tx": p.tx + "px", "--ty": p.ty + "px", "--r": p.rot + "deg",
                    animationDelay: p.i * 0.03 + "s",
                  }} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* プレイヤー（自分のHP）：ステージ直下に配置 */}
        <div className="bt-panel bt-player">
          <Avatar avatar={player.avatar} size={30} />
          <span className="bt-player-name">{player.name ? player.name : "あなた"}（Lv.{lv}）</span>
          <div style={{ display: "flex", alignItems: "center", gap: 3, flexWrap: "wrap", fontSize: 14, lineHeight: 1.15 }} title={`ハート ${Math.max(0, playerHp)}/${stats.maxHp}`}>
            {Array.from({ length: stats.maxHp }).map((_, i) => (
              <span key={i} style={{ filter: i < Math.max(0, playerHp) ? "none" : "grayscale(1)", opacity: i < Math.max(0, playerHp) ? 1 : 0.35 }}>❤️</span>
            ))}
          </div>
        </div>

        {/* アクティブ仲間（おとも）のHP */}
        {allyBase && (
          <div className="bt-panel bt-player" style={{ opacity: allyOut ? 0.45 : 1 }}>
            <div style={{ width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", transform: allyAct ? "translateX(6px) scale(1.1)" : "none", transition: "transform .15s" }}>
              <MonsterSprite monster={allyDef.monster} mini state={allyOut ? "dead" : "idle"} />
            </div>
            <span className="bt-player-name" style={{ color: "#fbbf24" }}>{allyDef.monster.name}（仲間）</span>
            {allyOut ? (
              <span style={{ fontSize: 12, fontWeight: 800, color: "#f87171" }}>退場…</span>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#fbbf24", fontSize: 12 }}>
                HP {Math.max(0, allyHp)}/{allyBase.maxHp}
                <div className="bt-hp-track" style={{ width: 90 }}><div className="bt-hp-fill" style={{ width: Math.max(0, (allyHp / allyBase.maxHp) * 100) + "%", background: hpColor((allyHp / allyBase.maxHp) * 100) }} /></div>
              </div>
            )}
          </div>
        )}

        {/* タイマー＋コンボ */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11, color: "#88aa88" }}>のこり</span>
          <div className="bt-timer-track" style={{ flex: 1, opacity: panicOn ? 0.4 : 1 }}>
            <div className="bt-timer-fill" style={{ width: (panicOn ? 100 : timePct) + "%", background: panicOn ? "#c084fc" : timer > stats.timer * 0.4 ? "#4ade80" : timer > stats.timer * 0.2 ? "#fbbf24" : "#f87171" }} />
          </div>
          <span style={{ fontSize: 13, fontWeight: 900, color: panicOn ? "#c084fc" : "#cceebb", minWidth: 28, textAlign: "right" }}>{panicOn ? "？" : timer}</span>
          {combo >= 2 && <span className="bt-combo">🔥{combo}</span>}
          {buffTags.map((b, i) => (
            <span key={"b" + i} style={{ fontSize: 14, filter: `drop-shadow(0 0 3px ${b.color})` }}>{b.icon}</span>
          ))}
          {debuffTags.map((b, i) => (
            <span key={"d" + i} style={{ fontSize: 14, filter: `drop-shadow(0 0 3px ${b.color})`, opacity: 0.95 }}>{b.icon}</span>
          ))}
        </div>

        {/* 問題＋文字入力 */}
        <div className="bt-q-panel">
          {q ? (
            <>
              <span className="bt-q-theme">{q.unitName} ・ {q.level === "oni" ? "🧮 超難問" : q.level === "advanced" ? "発展" : "標準"}</span>
              {fogOn ? (
                <div className="bt-q-text" style={{ color: "#cbd5e1", letterSpacing: 4 }}>🌫️ ？？？？？</div>
              ) : (
                <div className="bt-q-text"><MathText>{q.q}</MathText></div>
              )}
              {choices ? (
                /* 中2・中3：式の4択ボタン（文字列一致で採点） */
                <div className={"bt-choices" + (shakeAns ? " answer-shake" : "")} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
                  {choices.map((c, i) => (
                    <button
                      key={i} className="bt-choice" data-sfx="none" disabled={locked}
                      onClick={() => answer(c)}
                      style={{
                        padding: "12px 10px", borderRadius: 12, border: "2px solid rgba(255,255,255,.18)",
                        background: "rgba(255,255,255,.08)", color: "#f1f5f9", fontWeight: 800, fontSize: 16,
                        cursor: locked ? "default" : "pointer", fontFamily: "inherit",
                      }}
                    ><MathText>{c}</MathText></button>
                  ))}
                </div>
              ) : (
                /* 中1：数値は文字入力（−・/ はタップでも入れられる） */
                <>
                  <div className={"ans-row" + (shakeAns ? " answer-shake" : "")}>
                    <input
                      ref={inputRef} className="ans-in" type="text" inputMode="text" value={input}
                      disabled={locked}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") answer(input); }}
                      placeholder="例: -5 や 1/2"
                    />
                    <button className="ok-btn" data-sfx="none" disabled={locked || input === ""} onClick={() => answer(input)}>⚔️</button>
                  </div>
                  <div className="ans-keys">
                    {[["−", "-"], ["／", "/"], ["⌫", "back"]].map(([label, k]) => (
                      <button
                        key={k} type="button" className="ans-key" data-sfx="none" disabled={locked}
                        onMouseDown={(e) => e.preventDefault()} onClick={() => pressKey(k)}
                      >{label}</button>
                    ))}
                  </div>
                </>
              )}
            </>
          ) : <div style={{ color: "#cceebb" }}>問題を準備中…</div>}
        </div>

        {/* ✏️ 手書き計算スペース（バトル中もメモ書きできる・既定は閉じる） */}
        <button onClick={() => setShowPad((v) => !v)} data-sfx="none" style={{ width: "100%", margin: "8px 0 0", padding: "9px", borderRadius: 11, border: "1px solid rgba(255,255,255,.18)", cursor: "pointer", fontSize: 13, fontWeight: 800, color: "#fff", background: showPad ? "rgba(255,255,255,.14)" : "rgba(255,255,255,.06)" }}>
          ✏️ 計算スペース{showPad ? "を閉じる" : "を開く"}
        </button>
        {showPad && <DrawPad key={q ? q.q : "pad"} height={300} />}

        {/* スキル（SP） */}
        <div className="bt-skill-bar">
          <div className="bt-sp">
            <span className="bt-sp-label">SP</span>
            <div className="bt-sp-cells">
              {Array.from({ length: SP_MAX }).map((_, i) => (
                <span
                  key={i}
                  className={"bt-sp-cell" + (i < sp ? " on" : "") + (i === 4 || i === 9 ? " notch" : "")}
                />
              ))}
            </div>
            <span className="bt-sp-num">{sp}/{SP_MAX}</span>
          </div>
          <div className="bt-skill-btns">
            {equipped.map((s) => {
              const ready = sp >= s.cost;
              return (
                <button
                  key={s.id}
                  className={"bt-skill-btn" + (ready ? " ready" : "")}
                  data-sfx="none"
                  disabled={!ready || locked}
                  onClick={() => useSkill(s)}
                  style={{ "--sc": s.color }}
                  title={s.desc}
                >
                  <span className="ic">{s.icon}</span>
                  <span className="nm">{s.name}</span>
                  <span className="ct">{s.cost} SP</span>
                </button>
              );
            })}
          </div>

          {/* アイテム（1つだけ持てる） */}
          <div className="bt-item-row">
            {(() => {
              const it = item ? findItem(item) : null;
              return it ? (
                <button className="bt-item-btn" data-sfx="none" onClick={useItem} disabled={endedRef.current} title={it.desc}>
                  <span className="ic">{it.icon}</span>
                  <span className="nm">{it.name}</span>
                  <span className="use">つかう</span>
                </button>
              ) : (
                <div className="bt-item-empty">🎒 アイテムなし（「アイテム」画面で買えます）</div>
              );
            })()}
          </div>
        </div>

        {/* かかっている効果（アイテム/スキルのバフ・残ターン付き） */}
        {(atkBuff || guardBuff || regen) && (
          <div className="bt-buffs">
            {atkBuff && <span className="bt-buff" style={{ "--bc": "#fbbf24" }}>💪 与ダメ{atkBuff.mult}倍（あと{atkBuff.turns}回）</span>}
            {guardBuff && <span className="bt-buff" style={{ "--bc": "#60a5fa" }}>🛡️ 被ダメ軽減（あと{guardBuff.turns}回）</span>}
            {regen && <span className="bt-buff" style={{ "--bc": "#34d399" }}>🌿 継続回復（あと{regen.turns}回）</span>}
          </div>
        )}

        {/* バトルログ */}
        <div className="bt-panel bt-log"><span className="new">{log}</span></div>

        <button className="back-btn" style={{ alignSelf: "center" }} onClick={() => { if (!endedRef.current) saveHp(playerHpRef.current); onExit(); }}>← にげる</button>
      </div>
    </div>
  );
}
