// ============================================================
// TurnBattle.jsx — 行動選択型バトル（v2・中1全章）
//  1ターン: ①行動を選ぶ(攻撃/必殺技/スキル/防御) → ②問題(制限時間) →
//           ③敵ターン(毎ターン動く)。正解しないと自分の行動は失敗。
//  設計: Obsidian「設計_バトル刷新_行動選択型_2026-07-05」／
//        「設計_単元別戦闘力とHP1000化_2026-07-18」
//  既存 Battle.jsx とprops契約(onResult/onMistake/onHpChange/onExit…)を揃え、
//  App側は中1モンスターのときだけ本コンポーネントへ差し替える。
//  中1の単元(unit/sample)・ボスの梯子(unitBoss)は「単元別戦闘力」＝BP制
//  （HP1000共通・ダメージ=自分BP÷相手BP×100）で戦う。章ボス等は従来のLv制のまま。
// ============================================================
import { useState, useEffect, useRef, useMemo } from "react";
import MonsterSprite from "../components/MonsterSprite.jsx";
import Avatar from "../components/Avatar.jsx";
import HeroImg from "../components/HeroImg.jsx";
import { heroImageFor } from "../data/heroes.js";
import { BigWord, StarField } from "../components/Decorations.jsx";
import MathText from "../components/MathText.jsx";
import DrawPad from "../components/DrawPad.jsx";
import * as bgm from "../audio/bgm.js";
import * as sfx from "../audio/sfx.js";
import { isCorrect, playerLevel } from "../engine/scoring.js";
import {
  patternForMonster, turnEnemyDecide, pickBossPattern, TURN_ENEMY_PATTERNS,
  baseAttackDamage, nextTurnProblem, TURN_SP_MAX, ULT_COST,
  isTwoPhaseBoss, BOSS_PHASE2_PATTERN, JUST_GUARD_COUNTER_MULT,
  isCompanionBattle, bpDamage, adjustBP, COMPANION_HP, BP_MIN, BP_MAX,
  timejamCanAct, paralysisFails,
} from "../engine/battleTurn.js";
import { chapterSkillTier } from "../data/chapterSkills.js";
import { findItem, itemSummary } from "../data/items.js";
import { findUltimate, ultimateMult } from "../data/ultimates.js";

// 敵の通常攻撃・連続攻撃の各発は20%の確率でかわせる（ため攻撃・必殺技は対象外＝必ず当たる）
const DODGE_CHANCE = 0.2;

const shuffle = (a) => a.map((v) => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map((x) => x[1]);
const hasChoices = (q) => Array.isArray(q?.choices) && q.choices.length > 0;
const ansEq = (val, q) => (hasChoices(q)
  ? String(val).replace(/\s/g, "") === String(q.ans).replace(/\s/g, "")
  : isCorrect(val, q.ans));

// 1問の制限時間（Battle.jsxと同じ考え方：基本30秒＋発展/割り算で延長）
const BASE_TIME = 30;
function questionTime(q) {
  let t = BASE_TIME;
  if (q?.level === "advanced" || q?.level === "oni") t += 15;
  const text = String(q?.q ?? "");
  if (/[÷/]/.test(text) || /\d+\s*\/\s*\d+/.test(text)) t += 10;
  return Math.min(99, t);
}

// スキルの効果を短い一言に（ロードアウト画面と同じ考え方）
function skillSummary(s) {
  if (!s) return "";
  const parts = [];
  if (s.turns != null) parts.push(`${s.turns}T`);
  if (s.mult != null) parts.push(`与ダメ+${Math.round((s.mult - 1) * 100)}%`);
  if (s.reduce != null) parts.push(`被ダメ−${Math.round(s.reduce * 100)}%`);
  return parts.join(" ");
}

export default function TurnBattle({
  player, monster, onResult, onSpChange, onHpChange, onMistake, onExit, onDex = null,
  problemSource = null, onAttempt = null, maxHearts = 5, onBPChange = null, chapterCap = BP_MAX,
  onUseItem = null,
}) {
  const lv = playerLevel(player);
  // ── 単元別「戦闘力」＝BP制（中1全章：ザコ/れんしゅう/ボスの梯子） ──
  const isCompanion = isCompanionBattle(monster);
  const myBP = player.chapterBP?.[monster.chapterId] || BP_MIN;
  const enemyBP = monster.bp || BP_MIN;
  const maxHp = isCompanion ? COMPANION_HP : maxHearts;
  const monMaxHp = isCompanion ? COMPANION_HP : monster.hp;
  const patternRef = useRef(patternForMonster(monster)); // ボスは変身/技プールで書き換わる
  const [patKey, setPatKey] = useState(0);               // パターン表示の再描画用
  const patInfo = TURN_ENEMY_PATTERNS[patternRef.current] || TURN_ENEMY_PATTERNS.attack;
  const baseDmg = useRef(isCompanion ? bpDamage(myBP, enemyBP) : baseAttackDamage(monster)).current;
  const bossPhaseRef = useRef(1);                          // 章ボスの段階(1→2)
  const dexMovesRef = useRef({});                          // この戦闘で見た敵の技（図鑑記録用）

  // ── 装備中スキル（ロードアウト最大2つ。まひふうじだけは常時パッシブ扱い） ──
  const equippedDefs = (player.equippedSkills || [])
    .map((cid) => chapterSkillTier(cid, player.ownedChapterSkills?.[cid] || "D"))
    .filter(Boolean);
  const castableSkills = equippedDefs.filter((s) => s.kind !== "paralysisResist");
  const paralysisReduce = equippedDefs.find((s) => s.kind === "paralysisResist")?.reduce || 0;

  // ── 装備中アイテム（2026-07-19復活。バトル持ち込み最大2種類・ストックは player.items が正） ──
  const itemStock = player.items || {};
  const equippedItemDefs = (player.equippedItems || []).map((id) => findItem(id)).filter(Boolean);
  // ── 装備中の必殺技（2026-07-19設計：ガチャで集める。1発の倍率は最大5倍にクランプ） ──
  const ultimateDef = findUltimate(player.equippedUltimate);
  const ultMult = ultimateMult(ultimateDef);

  // ── 表示state ──
  const [phase, setPhase] = useState("intro"); // intro | command | question | sleep | win | lose
  const [playerHp, setPlayerHp] = useState(maxHp);
  const [monsterHp, setMonsterHp] = useState(monMaxHp);
  const [sp, setSp] = useState(() => Math.min(TURN_SP_MAX, player.sp ?? 0));
  const [q, setQ] = useState(null);
  const [timer, setTimer] = useState(BASE_TIME);
  const [input, setInput] = useState("");
  const [showPad, setShowPad] = useState(false);
  const [showSkills, setShowSkills] = useState(false);
  const [showItems, setShowItems] = useState(false);
  const [pending, setPending] = useState(null);   // 選択中の行動（表示用）
  const [log, setLog] = useState(`${monster.name}（${patInfo.icon}${patInfo.name}）があらわれた！`);
  const [monState, setMonState] = useState("idle");
  const [animKey, setAnimKey] = useState(0);
  const [monDmg, setMonDmg] = useState(null);
  const [dmgKey, setDmgKey] = useState(0);
  const [showRing, setShowRing] = useState(false);
  const [shakeAns, setShakeAns] = useState(false);
  const [hurt, setHurt] = useState(false);
  const [heroAtk, setHeroAtk] = useState(false);
  const [charging, setCharging] = useState(false);
  const [enemyIntent, setEnemyIntent] = useState(null); // { text, color }
  const [enemyFx, setEnemyFx] = useState(null);         // { icon, label, color }
  const [skillFx, setSkillFx] = useState(null);         // { name, icon, color, big }
  const [statusTags, setStatusTags] = useState([]);     // プレイヤーの状態異常/バフ表示
  const [monsterStatusTags, setMonsterStatusTags] = useState([]); // 敵の状態異常表示（必殺技で付与）
  const [deadParticles, setDeadParticles] = useState([]);
  const [maxSp] = useState(TURN_SP_MAX);

  const choices = useMemo(() => (q && hasChoices(q) ? shuffle([...q.choices]) : null), [q]);

  // ── 権威ref（setTimeout/非同期でも正しい値を参照）──
  const hpRef = useRef(maxHp);
  const monHpRef = useRef(monMaxHp);
  const spRef = useRef(sp);
  const phaseRef = useRef("intro");
  const lockedRef = useRef(false);
  const endedRef = useRef(false);
  const aiStateRef = useRef({});
  const pendingRef = useRef(null);
  const timerRef = useRef(BASE_TIME);
  const tallyRef = useRef({ correct: 0, wrong: 0 });
  const bpDeltaRef = useRef(0);          // このバトル中の正解-不正解の差分（companion戦のBP増減用）
  const inputRef = useRef(null);
  // プレイヤーの状態異常・バフ
  const sleepRef = useRef(0);            // 睡眠 残ターン
  const poisonRef = useRef(0);           // 毒 残ターン
  const immSleepRef = useRef(0);         // 眠り無効 残ターン
  const immPoisonRef = useRef(0);        // 毒無効 残ターン
  const timejamRef = useRef(0);          // 時間妨害 残ターン
  const timejamTurnRef = useRef(0);      // 時間妨害中の経過ターン数（2ターンに1回だけ動ける判定用）
  const immTimejamRef = useRef(0);       // 時間妨害無効 残ターン
  const paralysisRef = useRef(0);        // 麻痺 残ターン
  const dmgBuffRef = useRef(null);       // { turns, mult } 与ダメバフ（ちからをこめる／闘志の実）
  const burstGuardRef = useRef(null);    // { turns, reduce } ため技・必殺技の被ダメ軽減（みやぶり）
  const multiGuardRef = useRef(null);    // { turns, reduce } 連続攻撃の被ダメ軽減（みきりのかまえ）
  const itemGuardRef = useRef(null);     // { turns, reduce } アイテム「守りのお守り」＝あらゆる被ダメを軽減
  const regenRef = useRef(null);         // { turns, pct } アイテムの継続回復（毎ターン最大HPの%ぶん回復）
  const guardActiveRef = useRef(false);  // このターン「防御」を選び成功した
  const enemyGuardRef = useRef(0);       // 敵が身を守っている（こちらの攻撃を無効）残回数
  // 敵の状態異常（一部の必殺技で付与。強くなりすぎないよう毒は少量固定・しびれは低確率&1ターンのみ）
  const monsterPoisonRef = useRef(null); // { turns, dmg } 敵にかけた毒
  const monsterStunRef = useRef(0);      // 敵がしびれて動けない 残ターン

  useEffect(() => { hpRef.current = playerHp; }, [playerHp]);
  useEffect(() => { monHpRef.current = monsterHp; }, [monsterHp]);
  useEffect(() => { spRef.current = sp; }, [sp]);
  useEffect(() => { if (phase === "question" && !lockedRef.current) inputRef.current?.focus(); }, [phase, q]);

  const saveHp = (hp) => onHpChange?.(hp >= maxHp ? null : Math.max(0, Math.round(hp)));
  // 敵図鑑：この戦闘の記録を1回だけ書き出す（勝敗・逃走どれでも＝負けても埋まる）
  const dexFlushedRef = useRef(false);
  function flushDex(defeated) {
    if (dexFlushedRef.current) return;
    dexFlushedRef.current = true;
    onDex?.(monster.id, { moves: { ...dexMovesRef.current }, defeated: !!defeated });
  }
  const setTimerBoth = (v) => { timerRef.current = v; setTimer(v); };
  function changeSp(nv) {
    const v = Math.max(0, Math.min(TURN_SP_MAX, nv));
    spRef.current = v; setSp(v); onSpChange?.(v);
    return v;
  }

  // 毎秒カウントダウン（問題フェーズのみ）
  useEffect(() => {
    const id = setInterval(() => {
      if (phaseRef.current !== "question" || lockedRef.current) return;
      const next = timerRef.current - 1;
      if (next <= 0) { setTimerBoth(0); onTimeUp(); }
      else setTimerBoth(next);
    }, 1000);
    return () => clearInterval(id);
  }, []); // eslint-disable-line

  // ── 状態異常タグの再計算 ──
  function refreshTags() {
    const t = [];
    if (sleepRef.current > 0) t.push({ icon: "😴", color: "#818cf8", label: `ねむり${sleepRef.current}` });
    if (poisonRef.current > 0) t.push({ icon: "☠️", color: "#a3e635", label: `どく${poisonRef.current}` });
    if (timejamRef.current > 0) t.push({ icon: "⏳", color: "#a78bfa", label: `時間妨害${timejamRef.current}` });
    if (paralysisRef.current > 0) t.push({ icon: "⚡", color: "#facc15", label: `まひ${paralysisRef.current}` });
    if (dmgBuffRef.current) t.push({ icon: "💪", color: "#fca5a5", label: `攻撃力UP${dmgBuffRef.current.turns}` });
    if (burstGuardRef.current) t.push({ icon: "👁️", color: "#60a5fa", label: `みやぶり${burstGuardRef.current.turns}` });
    if (multiGuardRef.current) t.push({ icon: "🥋", color: "#34d399", label: `みきり${multiGuardRef.current.turns}` });
    if (itemGuardRef.current) t.push({ icon: "🛡️", color: "#93c5fd", label: `お守り${itemGuardRef.current.turns}` });
    if (regenRef.current) t.push({ icon: "🍃", color: "#86efac", label: `回復中${regenRef.current.turns}` });
    if (immSleepRef.current > 0) t.push({ icon: "⏰", color: "#38bdf8", label: `眠無${immSleepRef.current}` });
    if (immPoisonRef.current > 0) t.push({ icon: "🧪", color: "#a3e635", label: `毒無${immPoisonRef.current}` });
    if (immTimejamRef.current > 0) t.push({ icon: "🛡️", color: "#c4b5fd", label: `時間妨害無${immTimejamRef.current}` });
    setStatusTags(t);
  }

  // ── 敵の状態異常タグの再計算（一部の必殺技で付与） ──
  function refreshMonsterTags() {
    const t = [];
    if (monsterPoisonRef.current) t.push({ icon: "☠️", color: "#a3e635", label: `どく${monsterPoisonRef.current.turns}` });
    if (monsterStunRef.current > 0) t.push({ icon: "💫", color: "#facc15", label: `しびれ${monsterStunRef.current}` });
    setMonsterStatusTags(t);
  }

  function showEnemyFx(fx) { setEnemyFx(fx); setTimeout(() => setEnemyFx(null), 1100); }

  // ============ ターンの流れ ============

  // ターン開始：睡眠/時間妨害/麻痺で動けないときは自動で1ターン経過、そうでなければ行動選択へ
  function startTurn() {
    if (endedRef.current) return;
    setPending(null); pendingRef.current = null;
    setShowSkills(false);
    guardActiveRef.current = false;
    if (sleepRef.current > 0) { doSleepTurn(); return; }
    if (timejamRef.current > 0) {
      timejamTurnRef.current += 1;
      const canAct = timejamCanAct(timejamTurnRef.current);
      timejamRef.current = Math.max(0, timejamRef.current - 1);
      refreshTags();
      if (!canAct) { doForcedSkipTurn("⏳ 時間がゆがんでいて うごけない…！"); return; }
    } else if (paralysisRef.current > 0) {
      paralysisRef.current = Math.max(0, paralysisRef.current - 1);
      refreshTags();
      if (paralysisFails(paralysisReduce)) { doForcedSkipTurn("⚡ まひで うごけない…！"); return; }
    }
    phaseRef.current = "command"; setPhase("command");
  }

  // 睡眠ターン：行動できず、敵だけ動く
  function doSleepTurn() {
    phaseRef.current = "sleep"; setPhase("sleep");
    setLog("💤 ねむっていて動けない…！");
    sleepRef.current = Math.max(0, sleepRef.current - 1);
    refreshTags();
    setTimeout(() => { if (!endedRef.current) enemyPhase(); }, 900);
  }

  // 時間妨害・麻痺で不発のターン：睡眠と同じ「動けない」表示を使い回す
  function doForcedSkipTurn(msg) {
    phaseRef.current = "sleep"; setPhase("sleep");
    setLog(msg);
    setTimeout(() => { if (!endedRef.current) enemyPhase(); }, 900);
  }

  // 行動を選ぶ → 問題へ
  function chooseAction(type, extra = null) {
    if (phaseRef.current !== "command" || endedRef.current) return;
    if (type === "ultimate" && spRef.current < ULT_COST) { setLog(`必殺技には SP${ULT_COST} 必要！（今 ${spRef.current}）`); return; }
    if (type === "skill") {
      if (!extra) { setShowSkills((v) => !v); setShowItems(false); return; }
      if (spRef.current < extra.cost) { setLog(`${extra.name}には SP${extra.cost} 必要！（今 ${spRef.current}）`); return; }
    }
    if (type === "item") {
      if (!extra) { setShowItems((v) => !v); setShowSkills(false); return; }
      if ((itemStock[extra.id] || 0) <= 0) { setLog(`${extra.name}のストックが無い！`); return; }
    }
    const label =
      type === "attack" ? "⚔️ こうげき" :
      type === "ultimate" ? `${ultimateDef.icon} ${ultimateDef.name}` :
      type === "guard" ? "🛡️ ぼうぎょ" :
      `${extra.icon} ${extra.name}`;
    pendingRef.current = { type, skill: type === "skill" ? extra : null, item: type === "item" ? extra : null };
    setPending({ type, label });
    setShowSkills(false);
    setShowItems(false);
    beginQuestion();
  }

  function beginQuestion() {
    const nextQ = nextTurnProblem(monster, q?.id, problemSource);
    setQ(nextQ);
    setInput("");
    setTimerBoth(questionTime(nextQ));
    lockedRef.current = false;
    phaseRef.current = "question"; setPhase("question");
  }

  function onTimeUp() {
    if (lockedRef.current || phaseRef.current !== "question") return;
    lockedRef.current = true;
    sfx.wrong();
    tallyRef.current.wrong++;
    if (isCompanion) bpDeltaRef.current -= 1;
    if (q) { onMistake?.({ q: q.q, ans: q.ans, unitId: q.unitId, level: q.level }); onAttempt?.({ skill: q.skill, unitId: q.unitId, level: q.level, ok: false, q: q.q, ans: q.ans, templateId: q.id, seed: q.seed ?? null, userAnswer: "" }); }
    setShakeAns(true); setTimeout(() => setShakeAns(false), 460);
    setLog(`⏰ 時間切れ！ ${pending?.label || "行動"}は失敗… (正解 ${q?.ans})`);
    setTimeout(() => { if (!endedRef.current) enemyPhase(); }, 850);
  }

  function submitAnswer(val) {
    if (lockedRef.current || phaseRef.current !== "question" || !q || val === "" || val == null) return;
    lockedRef.current = true;
    const ok = ansEq(val, q);
    onAttempt?.({ skill: q.skill, unitId: q.unitId, level: q.level, ok, q: q.q, ans: q.ans, templateId: q.id, seed: q.seed ?? null, userAnswer: String(val) });
    if (ok) {
      sfx.correct();
      tallyRef.current.correct++;
      if (isCompanion) bpDeltaRef.current += 1;
      changeSp(spRef.current + 1); // 正解でSP+1
      setShowRing(true); setTimeout(() => setShowRing(false), 700);
      setHeroAtk(true); setTimeout(() => setHeroAtk(false), 340);
      resolvePlayerAction();
    } else {
      sfx.wrong();
      tallyRef.current.wrong++;
      if (isCompanion) bpDeltaRef.current -= 1;
      onMistake?.({ q: q.q, ans: q.ans, unitId: q.unitId, level: q.level });
      setShakeAns(true); setTimeout(() => setShakeAns(false), 460);
      setLog(`不正解… ${pending?.label || "行動"}は失敗した（正解 ${q.ans}）`);
      setTimeout(() => { if (!endedRef.current) enemyPhase(); }, 950);
    }
  }

  // 正解時：選んだ行動を成功させる
  function resolvePlayerAction() {
    const p = pendingRef.current || { type: "attack" };
    if (p.type === "guard") {
      guardActiveRef.current = true;
      setLog("🛡️ ぼうぎょ！ このターンの被ダメージを半分にする");
      setTimeout(() => { if (!endedRef.current) enemyPhase(); }, 700);
      return;
    }
    if (p.type === "skill") {
      applySkill(p.skill);
      setTimeout(() => { if (!endedRef.current) enemyPhase(); }, 800);
      return;
    }
    if (p.type === "item") {
      applyItem(p.item);
      setTimeout(() => { if (!endedRef.current) enemyPhase(); }, 800);
      return;
    }
    // 攻撃 / 必殺技
    const isUlt = p.type === "ultimate";
    if (isUlt) changeSp(spRef.current - ULT_COST);
    let dmg = Math.round(isUlt ? baseDmg * ultMult : baseDmg); // 必殺技の倍率は3.5倍などの小数もあるため四捨五入
    if (dmgBuffRef.current) dmg = Math.round(dmg * dmgBuffRef.current.mult);
    // 敵が「まもり」中なら攻撃を無効化（1回消費）
    if (enemyGuardRef.current > 0) {
      enemyGuardRef.current -= 1;
      setMonState("idle"); setAnimKey((k) => k + 1);
      showEnemyFx({ icon: "🛡️", label: "こうげきを防がれた！", color: "#60a5fa" });
      setLog(`${monster.name} は身をまもっている！ こうげきが通らない…`);
      setTimeout(() => { if (!endedRef.current) enemyPhase(); }, 800);
      return;
    }
    if (isUlt) { sfx.skill({ ult: true }); setSkillFx({ name: ultimateDef.name, icon: ultimateDef.icon, color: ultimateDef.color || "#f472b6", big: true }); setTimeout(() => setSkillFx(null), 1400); }
    setMonState("damage"); setAnimKey((k) => k + 1);
    setMonDmg(`-${dmg}`); setDmgKey((k) => k + 1);
    setLog(isUlt ? `${ultimateDef.icon} ${ultimateDef.name}さくれつ！ ${dmg}ダメージ！` : `⚔️ こうげき！ ${dmg}ダメージ！`);
    const nv = Math.max(0, monHpRef.current - dmg);
    monHpRef.current = nv; setMonsterHp(nv);
    // ドレイン系必殺技：与えたダメージの一部を吸収して自分のHPを回復
    if (isUlt && ultimateDef.lifesteal) {
      const healAmt = Math.round(dmg * ultimateDef.lifesteal);
      if (healAmt > 0) {
        const nvHp = Math.min(maxHp, hpRef.current + healAmt);
        hpRef.current = nvHp; setPlayerHp(nvHp);
        setLog((l) => l + ` 🩸吸収+${healAmt}`);
      }
    }
    // 状態異常つき必殺技：敵を倒しきれなかった時だけ毒／しびれを付与（強くなりすぎないよう控えめ）
    if (isUlt && nv > 0 && ultimateDef.inflict) {
      const inf = ultimateDef.inflict;
      if (inf.kind === "poison") {
        monsterPoisonRef.current = { turns: inf.turns, dmg: inf.dmg };
        setLog((l) => l + ` ☠️${monster.name}に毒を付けた！`);
      } else if (inf.kind === "stun" && Math.random() < (inf.chance ?? 1)) {
        monsterStunRef.current = inf.turns;
        setLog((l) => l + ` 💫${monster.name}はしびれた！`);
      }
      refreshMonsterTags();
    }
    if (nv <= 0) { setTimeout(triggerWin, 700); return; }
    checkBossPhase(nv);
    setTimeout(() => { setMonState("idle"); if (!endedRef.current) enemyPhase(); }, 800);
  }

  function applySkill(skill) {
    const s = skill || {};
    changeSp(spRef.current - (s.cost || 0));
    sfx.skill();
    setSkillFx({ name: s.name, icon: s.icon, color: s.color || "#fff" });
    setTimeout(() => setSkillFx(null), 1400);
    if (s.kind === "dmgup") {
      dmgBuffRef.current = { turns: s.turns || 2, mult: s.mult || 1.15 };
      setLog(`💪 ${s.turns}ターン 与ダメが${Math.round(((s.mult || 1.15) - 1) * 100)}%アップ！`);
    } else if (s.kind === "burstGuard") {
      burstGuardRef.current = { turns: s.turns || 1, reduce: s.reduce || 0.5 };
      setLog(`👁️ ${s.turns}ターン ため技・必殺技の被ダメを${Math.round((s.reduce || 0.5) * 100)}%へらす！`);
    } else if (s.kind === "multiGuard") {
      multiGuardRef.current = { turns: s.turns || 1, reduce: s.reduce || 0.5 };
      setLog(`🥋 ${s.turns}ターン 連続攻撃の被ダメを${Math.round((s.reduce || 0.5) * 100)}%へらす！`);
    } else if (s.kind === "immSleep") {
      immSleepRef.current = s.turns || 3;
      setLog(`⏰ ${s.turns}ターン ねむらなくなった！`);
    } else if (s.kind === "immPoison") {
      poisonRef.current = 0;
      immPoisonRef.current = s.turns || 3;
      setLog(`🧪 どくを消した！ ${s.turns}ターン 毒にならない！`);
    } else if (s.kind === "immTimejam") {
      immTimejamRef.current = s.turns || 2;
      setLog(`🛡️ ${s.turns}ターン 時間妨害にかからない！`);
    }
    refreshTags();
  }

  // アイテムを使う（2026-07-19復活）：ストックは親(App.jsx)側で1個消費、効果はこのバトル内ですぐ適用
  function applyItem(item) {
    const it = item || {};
    onUseItem?.(it.id);
    sfx.skill();
    setSkillFx({ name: it.name, icon: it.icon, color: it.color || "#fff" });
    setTimeout(() => setSkillFx(null), 1400);
    if (it.kind === "healPct") {
      const healAmt = Math.round(maxHp * it.pct);
      const nv = Math.min(maxHp, hpRef.current + healAmt);
      hpRef.current = nv; setPlayerHp(nv);
      setLog(`${it.icon} ${it.name}！ HPが${healAmt}（最大の${Math.round(it.pct * 100)}%）回復した！`);
    } else if (it.kind === "sp") {
      changeSp(spRef.current + it.power);
      setLog(`${it.icon} ${it.name}！ SPが${it.power}回復した！`);
    } else if (it.kind === "regenPct") {
      regenRef.current = { turns: it.turns || 3, pct: it.regenPct || 0.2 };
      setLog(`${it.icon} ${it.name}！ ${it.turns}ターン 毎ターンHPが最大の${Math.round((it.regenPct || 0.2) * 100)}%回復する！`);
    } else if (it.kind === "curePoison") {
      poisonRef.current = 0;
      setLog(`${it.icon} ${it.name}！ どくが治った！`);
    } else if (it.kind === "cureStatus") {
      sleepRef.current = 0; poisonRef.current = 0; timejamRef.current = 0; paralysisRef.current = 0;
      setLog(`${it.icon} ${it.name}！ すべての状態異常が治った！`);
    } else if (it.kind === "atkUp") {
      dmgBuffRef.current = { turns: it.turns || 3, mult: it.mult || 1.5 };
      setLog(`${it.icon} ${it.name}！ ${it.turns}ターン 与ダメが${Math.round(((it.mult || 1.5) - 1) * 100)}%アップ！`);
    } else if (it.kind === "dmgReduce") {
      itemGuardRef.current = { turns: it.turns || 3, reduce: it.reduce || 0.4 };
      setLog(`${it.icon} ${it.name}！ ${it.turns}ターン 受けるダメージが${Math.round((it.reduce || 0.4) * 100)}%減る！`);
    }
    refreshTags();
  }

  // ============ 敵ターン ============
  function enemyPhase() {
    if (endedRef.current) return;
    // 敵の毒（必殺技で付与）：敵ターンの頭にダメージを与える
    if (monsterPoisonRef.current) {
      const pd = monsterPoisonRef.current.dmg;
      const nvPoison = Math.max(0, monHpRef.current - pd);
      monHpRef.current = nvPoison; setMonsterHp(nvPoison);
      setLog(`☠️ どくで ${monster.name} に ${pd}ダメージ！`);
      monsterPoisonRef.current.turns -= 1;
      if (monsterPoisonRef.current.turns <= 0) monsterPoisonRef.current = null;
      refreshMonsterTags();
      if (nvPoison <= 0) { setTimeout(triggerWin, 500); return; }
      checkBossPhase(nvPoison);
    }
    // 敵のしびれ（必殺技で付与）：行動できず1ターン休み
    if (monsterStunRef.current > 0) {
      monsterStunRef.current -= 1;
      refreshMonsterTags();
      setMonState("idle"); setAnimKey((k) => k + 1);
      showEnemyFx({ icon: "💫", label: "しびれて動けない！", color: "#facc15" });
      setLog(`${monster.name} はしびれて動けない…！`);
      afterEnemy();
      return;
    }
    // ボスの梯子(patternPool持ち)はターンごとに使う技をランダムに選ぶ
    if (monster.patternPool) {
      const picked = pickBossPattern(monster, aiStateRef.current);
      patternRef.current = picked.pattern;
      aiStateRef.current = picked.state;
    }
    const { st, act } = turnEnemyDecide(patternRef.current, aiStateRef.current);
    aiStateRef.current = st;
    // 敵図鑑：実際に出した技を記録（負けても残る＝観察メモ）
    if (act.kind && act.kind !== "charging") { dexMovesRef.current[act.kind] = true; setPatKey((k) => k + 1); }

    if (act.kind === "charging") {
      setCharging(true);
      setEnemyIntent({ text: `⚡ あと${act.left}ターンで大こうげき！`, color: "#fbbf24" });
      setMonState("idle"); setAnimKey((k) => k + 1);
      showEnemyFx({ icon: "⚡", label: "ためている…！", color: "#fbbf24" });
      setLog(`${monster.name} は力をためている…！（ぼうぎょで備えよう）`);
      afterEnemy();
      return;
    }
    setCharging(false); setEnemyIntent(null);

    if (act.kind === "sleep") {
      if (immSleepRef.current > 0) {
        showEnemyFx({ icon: "⏰", label: "ねむらない！", color: "#38bdf8" });
        setLog(`${monster.name} は ねむらせようとした！ でも「めざまし」で眠らなかった！`);
      } else {
        sleepRef.current = act.turns; refreshTags();
        showEnemyFx({ icon: "😴", label: "ねむらされた！", color: "#818cf8" });
        setLog(`${monster.name} の こもりうた！ ${act.turns}ターン ねむってしまった…`);
      }
      afterEnemy();
      return;
    }
    if (act.kind === "guard") {
      enemyGuardRef.current = act.turns;
      setMonState("idle"); setAnimKey((k) => k + 1);
      showEnemyFx({ icon: "🛡️", label: "みをまもる！", color: "#60a5fa" });
      setLog(`${monster.name} は 身をまもった！ 次のこうげきは通らない`);
      afterEnemy();
      return;
    }
    if (act.kind === "poison") {
      if (immPoisonRef.current > 0) {
        showEnemyFx({ icon: "🧪", label: "どく無効！", color: "#a3e635" });
        setLog(`${monster.name} は 毒をあびせた！ でも毒無効でふせいだ！`);
      } else {
        poisonRef.current = act.turns; refreshTags();
        showEnemyFx({ icon: "☠️", label: "どく！", color: "#a3e635" });
        setLog(`${monster.name} の どくきり！ ${act.turns}ターン 毒になった…`);
      }
      afterEnemy();
      return;
    }
    if (act.kind === "timejam") {
      if (immTimejamRef.current > 0) {
        showEnemyFx({ icon: "🛡️", label: "時間妨害 無効！", color: "#60a5fa" });
        setLog(`${monster.name} は時間を歪めようとした！ でも「じかんのよろい」で防いだ！`);
      } else {
        timejamRef.current = act.turns; timejamTurnRef.current = 0; refreshTags();
        showEnemyFx({ icon: "⏳", label: "時間が歪んだ！", color: "#a78bfa" });
        setLog(`${monster.name} の時間妨害！ ${act.turns}ターン 思うように動けなくなった…`);
      }
      afterEnemy();
      return;
    }
    if (act.kind === "paralysis") {
      paralysisRef.current = act.turns; refreshTags();
      showEnemyFx({ icon: "⚡", label: "まひした！", color: "#facc15" });
      setLog(`${monster.name} のまひ攻撃！ ${act.turns}ターン 体がしびれる…`);
      afterEnemy();
      return;
    }
    if (act.kind === "multi") {
      const justGuard = guardActiveRef.current; // ためた大技を防御で受けた＝ジャスト防御
      const hits = act.hits || 3;
      showEnemyFx({ icon: "✊", label: `${hits}連続こうげき！`, color: "#fb7185" });
      let i = 0;
      const doHit = () => {
        if (endedRef.current) return;
        enemyDamage(act.per || 1, `${monster.name} の連続こうげき（${i + 1}/${hits}）`, { kind: "multi" });
        i++;
        if (i < hits && !endedRef.current) setTimeout(doHit, 340);
        else { if (justGuard) justGuardCounter(); afterEnemy(); }
      };
      doHit();
      return;
    }
    // attack / burst（単発ダメージ）
    const dmg = act.dmg || 1;
    const isBurst = act.kind === "burst";
    const justGuard = isBurst && guardActiveRef.current; // ためた一撃を防御で受けた＝ジャスト防御
    const label = isBurst ? `${monster.name} の ためた一撃！` : `${monster.name} のこうげき！`;
    if (isBurst) showEnemyFx({ icon: "💥", label: "ためた一撃！", color: "#f87171" });
    enemyDamage(dmg, label, { guaranteed: isBurst, kind: isBurst ? "burst" : "attack" }); // ため攻撃は必ず命中
    if (justGuard) justGuardCounter();
    afterEnemy();
  }

  // ジャスト防御の反撃：ためた大技を防御で受け切ったら、敵に反撃ダメージ
  function justGuardCounter() {
    if (endedRef.current) return;
    const cdmg = Math.max(1, Math.round(baseDmg * JUST_GUARD_COUNTER_MULT));
    setTimeout(() => {
      if (endedRef.current) return;
      sfx.skill();
      setMonState("damage"); setAnimKey((k) => k + 1);
      setMonDmg(`-${cdmg}`); setDmgKey((k) => k + 1);
      showEnemyFx({ icon: "🛡️⚡", label: "ジャスト防御！反撃！", color: "#fde047" });
      setLog(`🛡️⚡ ジャスト防御成功！ 反撃 ${cdmg}ダメージ！`);
      const nv = Math.max(0, monHpRef.current - cdmg);
      monHpRef.current = nv; setMonsterHp(nv);
      if (nv <= 0) setTimeout(triggerWin, 500);
      else { checkBossPhase(nv); setTimeout(() => setMonState("idle"), 500); }
    }, 500);
  }

  // 章ボスの2段階変身：HP半分を切ったら一度だけパターンを激化（予告つき）
  function checkBossPhase(hp) {
    if (!isTwoPhaseBoss(monster) || bossPhaseRef.current >= 2) return;
    if (hp > monster.hp * 0.5) return;
    bossPhaseRef.current = 2;
    patternRef.current = BOSS_PHASE2_PATTERN;
    aiStateRef.current = {}; // ため状態をリセットして新パターンへ
    setPatKey((k) => k + 1);
    sfx.skill({ ult: true });
    setSkillFx({ name: `${monster.name} 変身！`, icon: "🌀", color: "#e879f9", big: true });
    setTimeout(() => setSkillFx(null), 1600);
    setEnemyIntent({ text: "🌀 変身した！ 攻撃が激しくなる！", color: "#e879f9" });
    setLog(`⚠️ ${monster.name} は変身した！ 手数で押してくる…！`);
  }

  // 敵の1撃をプレイヤーへ（みやぶり/みきり軽減→防御半減の順で処理）
  //  opts.guaranteed=true（ため攻撃/burst）は必ず命中。それ以外（通常こうげき・連続こうげきの各発）は
  //  DODGE_CHANCEの確率でかわせる＝毎回100%食らうわけではない、という緊張と息抜きを作る。
  //  opts.kind: "attack" | "burst" | "multi"（みやぶり・みきりのかまえの対象判定に使う）
  function enemyDamage(raw, label, opts = {}) {
    if (endedRef.current) return;
    if (!opts.guaranteed && Math.random() < DODGE_CHANCE) {
      setMonState("attack"); setAnimKey((k) => k + 1);
      showEnemyFx({ icon: "💨", label: "ひらりとかわした！", color: "#86efac" });
      setLog(`${label} → 💨 かわした！ ノーダメージ！`);
      sfx.tap();
      return;
    }
    // BP制（中1・単元別戦闘力）：ダメージ = 相手BP÷自分BP×100 を基準ダメージとし、
    //  ため技/連続攻撃は旧スケールの倍率(raw)をそのままかけて大技らしさを出す。
    let dmg = isCompanion ? bpDamage(enemyBP, myBP) * (raw || 1) : raw;
    let note = "";
    if (opts.kind === "burst" && burstGuardRef.current) { dmg = Math.round(dmg * (1 - burstGuardRef.current.reduce)); note += "（👁️みやぶり軽減）"; }
    if (opts.kind === "multi" && multiGuardRef.current) { dmg = Math.round(dmg * (1 - multiGuardRef.current.reduce)); note += "（🥋みきり軽減）"; }
    if (itemGuardRef.current) { dmg = Math.round(dmg * (1 - itemGuardRef.current.reduce)); note += "（🛡️お守り軽減）"; }
    if (guardActiveRef.current) { dmg = Math.floor(dmg / 2); note += "（🛡️半減）"; }
    setMonState("attack"); setAnimKey((k) => k + 1);
    setShakeAns(true); setTimeout(() => setShakeAns(false), 400);
    if (dmg > 0) { setHurt(true); setTimeout(() => setHurt(false), 500); }
    setLog(`${label} -${dmg}${note}`);
    const nv = Math.max(0, hpRef.current - dmg);
    hpRef.current = nv; setPlayerHp(nv);
    if (nv <= 0) { setTimeout(triggerLose, 500); }
  }

  // 敵ターンの後始末：毒ダメージ→バフ減衰→次ターン
  function afterEnemy() {
    setTimeout(() => {
      if (endedRef.current) return;
      // 毒：ターン末に1ポイントぶんダメージ＋残ターン減
      if (poisonRef.current > 0) {
        const poisonDmg = isCompanion ? bpDamage(enemyBP, myBP) : 1;
        const nv = Math.max(0, hpRef.current - poisonDmg);
        hpRef.current = nv; setPlayerHp(nv);
        poisonRef.current -= 1;
        setLog((l) => l + ` ☠️毒 -${poisonDmg}`);
        if (nv <= 0) { setTimeout(triggerLose, 400); return; }
      }
      // 継続回復（アイテム「癒しの葉」等）：ターン末に最大HPの%ぶん回復＋残ターン減
      if (regenRef.current) {
        const healAmt = Math.round(maxHp * regenRef.current.pct);
        const nv = Math.min(maxHp, hpRef.current + healAmt);
        hpRef.current = nv; setPlayerHp(nv);
        setLog((l) => l + ` 🍃回復+${healAmt}`);
        regenRef.current.turns -= 1;
        if (regenRef.current.turns <= 0) regenRef.current = null;
      }
      // バフ・軽減の残ターン減衰
      if (dmgBuffRef.current) { dmgBuffRef.current.turns -= 1; if (dmgBuffRef.current.turns <= 0) dmgBuffRef.current = null; }
      if (burstGuardRef.current) { burstGuardRef.current.turns -= 1; if (burstGuardRef.current.turns <= 0) burstGuardRef.current = null; }
      if (multiGuardRef.current) { multiGuardRef.current.turns -= 1; if (multiGuardRef.current.turns <= 0) multiGuardRef.current = null; }
      if (itemGuardRef.current) { itemGuardRef.current.turns -= 1; if (itemGuardRef.current.turns <= 0) itemGuardRef.current = null; }
      if (immSleepRef.current > 0) immSleepRef.current -= 1;
      if (immPoisonRef.current > 0) immPoisonRef.current -= 1;
      if (immTimejamRef.current > 0) immTimejamRef.current -= 1;
      refreshTags();
      if (!endedRef.current) setTimeout(startTurn, 350);
    }, 500);
  }

  // 単元別戦闘力(BP)を保存（勝敗どちらも、正解-不正解の差分ぶんだけ増減＝負けても積み上がる）
  function persistBP() {
    if (!isCompanion || !onBPChange) return;
    const nv = adjustBP(myBP, bpDeltaRef.current, chapterCap);
    onBPChange(monster.chapterId, nv);
  }

  // ============ 勝敗 ============
  function triggerWin() {
    if (endedRef.current) return;
    endedRef.current = true;
    flushDex(true);
    saveHp(hpRef.current);
    persistBP();
    phaseRef.current = "win"; setPhase("win");
    bgm.play("victory", { loop: false });
    setMonState("dead"); setAnimKey((k) => k + 1);
    setDeadParticles(Array.from({ length: 16 }, (_, i) => {
      const ang = (i * (360 / 16)) * Math.PI / 180;
      const r = 50 + Math.random() * 60;
      return { i, size: 6 + Math.random() * 9, color: monster.deathColors[i % monster.deathColors.length], tx: Math.cos(ang) * r, ty: Math.sin(ang) * r, rot: Math.random() * 360, round: Math.random() > 0.5 };
    }));
    setLog(`${monster.name} をたおした！✨ 💰+${monster.reward}`);
    setTimeout(() => onResult(true, { ...tallyRef.current }), 1500);
  }

  function triggerLose() {
    if (endedRef.current) return;
    endedRef.current = true;
    flushDex(false);
    saveHp(1);
    persistBP();
    phaseRef.current = "lose"; setPhase("lose");
    bgm.play("defeat", { loop: false });
    setLog("あなたはたおれてしまった…💀");
    setTimeout(() => onResult(false, { ...tallyRef.current }), 1200);
  }

  // ============ 表示 ============
  const monHpPct = Math.max(0, (monsterHp / monMaxHp) * 100);
  const timePct = (timer / (questionTime(q) || BASE_TIME)) * 100;
  const hpColor = (p) => (p > 50 ? "linear-gradient(90deg,#00cc44,#00ff88)" : p > 25 ? "linear-gradient(90deg,#cc9900,#ffcc00)" : "linear-gradient(90deg,#cc2200,#ff4400)");

  if (phase === "win" || phase === "lose") {
    const win = phase === "win";
    return (
      <div className="battle-app">
        <StarField /><div className="bt-moon" /><div className="battle-ground" />
        <div className="battle-content" style={{ justifyContent: "center", alignItems: "center", textAlign: "center" }}>
          <div style={{ fontSize: 64 }}>{win ? "🎉" : "💀"}</div>
          <div style={{ fontSize: 26, fontWeight: 900, color: win ? "#7fff7f" : "#ff6b6b", textShadow: win ? "0 0 18px #00ff88" : "none" }}>{win ? "勝利！" : "敗北…"}</div>
          <div style={{ fontSize: 13, color: "#cceebb", margin: "6px 0 14px" }}>{win ? `${monster.name} をたおした！ 💰+${monster.reward} を獲得！` : `${monster.name} に やられてしまった…`}</div>
          {win ? (
            <div style={{ display: "flex", gap: 10 }}>
              <button className="bt-choice" style={{ padding: "12px 18px" }} onClick={onExit}>👾 相手を選ぶ</button>
              <button className="bt-choice" style={{ padding: "12px 18px", borderColor: "#7fff7f" }} onClick={() => onResult("retry")}>🔁 もう一度</button>
            </div>
          ) : (<div style={{ fontSize: 13, color: "#cceebb", fontWeight: 700 }}>メニューにもどります…</div>)}
        </div>
      </div>
    );
  }

  return (
    <div className={"battle-app" + (hurt ? " bt-screen-shake" : "")}>
      <div className="encounter-flash" />
      {phase === "intro" && <BigWord text="START!" color="#7fff7f" onDone={() => { phaseRef.current = "command"; startTurn(); }} />}
      <StarField /><div className="bt-moon" />
      {hurt && <div className="bt-damage-overlay show" />}
      {skillFx && (
        <div className={"bt-skill-fx" + (skillFx.big ? " is-ult" : "")} style={{ "--sc": skillFx.color }}>
          <div className="sc-flash" /><div className="sc-rays" /><div className="sc-band" /><div className="sc-burst" />
          <div className="sc-core"><span className="sc-ic">{skillFx.icon}</span><span className="sc-nm">{skillFx.name}！</span></div>
        </div>
      )}
      <div className="battle-ground" />
      <div className="battle-content">
        {/* 敵ステータス */}
        <div className="bt-panel">
          <span className="bt-enemy-name" style={{ color: monster.color }}>{monster.name}</span>
          <span className="bt-enemy-theme">【{monster.unit}】{patInfo.icon}{patInfo.name}</span>
          {isCompanion && <span className="bt-enemy-theme">🔷 BP{enemyBP}</span>}
          {enemyIntent && <span className="bt-intent" style={{ "--ic": enemyIntent.color }}>{enemyIntent.text}</span>}
          <div className="bt-hp-row">
            <span className="bt-hp-label">HP</span>
            <div className="bt-hp-track"><div className="bt-hp-fill" style={{ width: monHpPct + "%", background: hpColor(monHpPct) }} /></div>
            <span className="bt-hp-num">{Math.max(0, monsterHp)} / {monMaxHp}</span>
          </div>
          {enemyGuardRef.current > 0 && <div style={{ fontSize: 11, fontWeight: 900, color: "#93c5fd", marginTop: 2 }}>🛡️ まもり中（こうげきが通らない）</div>}
          {monsterStatusTags.length > 0 && (
            <div style={{ display: "flex", gap: 6, marginTop: 3, flexWrap: "wrap" }}>
              {monsterStatusTags.map((t, i) => (
                <span key={i} style={{ fontSize: 11, fontWeight: 800, color: t.color, filter: `drop-shadow(0 0 3px ${t.color})` }}>{t.icon}{t.label}</span>
              ))}
            </div>
          )}
          {(() => {
            const MOVE_LABEL = { attack: "👊こうげき", burst: "💥ためた一撃", multi: "✊連続", sleep: "😴ねむらせ", guard: "🛡️まもり", poison: "☠️どく", timejam: "⏳時間妨害", paralysis: "⚡まひ" };
            const seen = Object.keys(dexMovesRef.current).map((k) => MOVE_LABEL[k]).filter(Boolean);
            return seen.length > 0 ? (
              <div style={{ fontSize: 10.5, fontWeight: 700, color: "#a7f3d0", marginTop: 3 }}>🔍 観察メモ：{seen.join(" ・ ")}</div>
            ) : null;
          })()}
        </div>

        {/* 舞台 */}
        <div className="bt-stage">
          {heroImageFor(player.avatar) && (
            <HeroImg src={heroImageFor(player.avatar)} alt="あなた" className={"bt-hero" + (heroAtk ? " attack" : "") + (hurt ? " hit" : "")}
              style={{ position: "absolute", left: 0, bottom: -8, height: 150, width: "auto", maxWidth: "44%", objectFit: "contain", zIndex: 3, pointerEvents: "none" }} />
          )}
          <div className="bt-mon">
            {charging && <div className="bt-charge-aura" />}
            {monDmg && <div key={dmgKey} className="mon-dmg-num show">{monDmg}</div>}
            {enemyFx && <div className="bt-enemy-fx" style={{ "--ec": enemyFx.color }}><span className="ic">{enemyFx.icon}</span><span className="nm">{enemyFx.label}</span></div>}
            {showRing && <><div className="correct-ring show" /><div className="correct-flash show" /></>}
            <MonsterSprite monster={monster} state={monState} animKey={animKey} />
            {deadParticles.length > 0 && (
              <div className="bt-particles">
                {deadParticles.map((p) => (
                  <div key={p.i} className="bt-dp burst" style={{ width: p.size, height: p.size, background: p.color, borderRadius: p.round ? "50%" : "2px", "--tx": p.tx + "px", "--ty": p.ty + "px", "--r": p.rot + "deg", animationDelay: p.i * 0.03 + "s" }} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* プレイヤーHP */}
        <div className={"bt-panel bt-player" + (isCompanion ? " bt-player-companion" : "")}>
          {isCompanion ? (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Avatar avatar={player.avatar} size={30} />
                <span className="bt-player-name">{player.name || "あなた"}</span>
              </div>
              <div className="bt-hp-row">
                <span className="bt-hp-label">HP</span>
                <div className="bt-hp-track"><div className="bt-hp-fill" style={{ width: Math.max(0, (playerHp / maxHp) * 100) + "%", background: hpColor((playerHp / maxHp) * 100) }} /></div>
                <span className="bt-hp-num">{Math.max(0, playerHp)} / {maxHp}</span>
              </div>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: "#a7f3d0" }}>
                🔷 BP{myBP} ・ 1発 {baseDmg}ダメージ
              </div>
            </>
          ) : (
            <>
              <Avatar avatar={player.avatar} size={30} />
              <span className="bt-player-name">{player.name || "あなた"}（Lv.{lv}）</span>
              <div style={{ display: "flex", alignItems: "center", gap: 3, flexWrap: "wrap", fontSize: 14, lineHeight: 1.15 }} title={`ハート ${Math.max(0, playerHp)}/${maxHp}`}>
                {Array.from({ length: maxHp }).map((_, i) => (
                  <span key={i} style={{ filter: i < Math.max(0, playerHp) ? "none" : "grayscale(1)", opacity: i < Math.max(0, playerHp) ? 1 : 0.35 }}>❤️</span>
                ))}
              </div>
            </>
          )}
          {statusTags.length > 0 && (
            <div style={{ display: "flex", gap: 6, marginTop: 3, flexWrap: "wrap" }}>
              {statusTags.map((t, i) => (
                <span key={i} style={{ fontSize: 11, fontWeight: 800, color: t.color, filter: `drop-shadow(0 0 3px ${t.color})` }}>{t.icon}{t.label}</span>
              ))}
            </div>
          )}
        </div>

        {/* SP */}
        <div className="bt-sp" style={{ margin: "2px 0" }}>
          <span className="bt-sp-label">SP</span>
          <div className="bt-sp-cells">
            {Array.from({ length: maxSp }).map((_, i) => (
              <span key={i} className={"bt-sp-cell" + (i < sp ? " on" : "") + (i === 4 || i === 9 ? " notch" : "")} />
            ))}
          </div>
          <span className="bt-sp-num">{sp}/{maxSp}</span>
        </div>

        {/* ===== 行動選択フェーズ ===== */}
        {phase === "command" && (
          <div className="bt-q-panel">
            <div style={{ fontSize: 13, fontWeight: 900, color: "#cceebb", marginBottom: 8 }}>▶ 行動をえらぼう（正解すると成功！ 敵も動くよ）</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <button className="bt-choice" style={{ padding: "13px 8px", fontWeight: 800 }} onClick={() => chooseAction("attack")}>⚔️ こうげき</button>
              <button className="bt-choice" style={{ padding: "13px 8px", fontWeight: 800, borderColor: sp >= ULT_COST ? "#f472b6" : undefined, opacity: sp >= ULT_COST ? 1 : 0.5 }} onClick={() => chooseAction("ultimate")}>{ultimateDef.icon} {ultimateDef.name} <span style={{ fontSize: 10 }}>({ULT_COST}SP・{ultMult}倍)</span></button>
              <button className="bt-choice" style={{ padding: "13px 8px", fontWeight: 800 }} onClick={() => chooseAction("guard")}>🛡️ ぼうぎょ <span style={{ fontSize: 10 }}>(被ダメ半分)</span></button>
              <button className="bt-choice" style={{ padding: "13px 8px", fontWeight: 800, borderColor: showSkills ? "#38bdf8" : undefined }} onClick={() => chooseAction("skill")}>✨ スキル ▾</button>
              <button className="bt-choice" style={{ padding: "13px 8px", fontWeight: 800, borderColor: showItems ? "#4ade80" : undefined, gridColumn: "1 / -1" }} onClick={() => chooseAction("item")}>🎒 アイテム ▾</button>
            </div>
            {showSkills && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 8 }}>
                {castableSkills.length === 0 && (
                  <div style={{ gridColumn: "1 / -1", fontSize: 11, fontWeight: 700, color: "#88aa88", textAlign: "center", padding: "6px 0" }}>
                    スキル未装備（🎒ロードアウトで装備できるよ）
                  </div>
                )}
                {castableSkills.map((s) => {
                  const ready = sp >= s.cost;
                  return (
                    <button key={s.chapterId} className="bt-choice" data-sfx="none" disabled={!ready}
                      onClick={() => chooseAction("skill", s)} title={s.theme}
                      style={{ padding: "9px 6px", fontSize: 12, fontWeight: 800, opacity: ready ? 1 : 0.45 }}>
                      {s.icon} {s.name} <span style={{ fontSize: 10 }}>({s.cost}SP・{s.rank})</span>
                      <div style={{ fontSize: 9.5, fontWeight: 600, opacity: 0.85, marginTop: 2 }}>{skillSummary(s)}</div>
                    </button>
                  );
                })}
              </div>
            )}
            {showItems && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 8 }}>
                {equippedItemDefs.length === 0 && (
                  <div style={{ gridColumn: "1 / -1", fontSize: 11, fontWeight: 700, color: "#88aa88", textAlign: "center", padding: "6px 0" }}>
                    アイテム未装備（🧪アイテムで持ち込みを選べるよ）
                  </div>
                )}
                {equippedItemDefs.map((it) => {
                  const count = itemStock[it.id] || 0;
                  const ready = count > 0;
                  return (
                    <button key={it.id} className="bt-choice" data-sfx="none" disabled={!ready}
                      onClick={() => chooseAction("item", it)} title={it.desc}
                      style={{ padding: "9px 6px", fontSize: 12, fontWeight: 800, opacity: ready ? 1 : 0.45 }}>
                      {it.icon} {it.name} <span style={{ fontSize: 10 }}>×{count}</span>
                      <div style={{ fontSize: 9.5, fontWeight: 600, opacity: 0.85, marginTop: 2 }}>{itemSummary(it)}</div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ===== 睡眠・時間妨害・麻痺による強制休みターン ===== */}
        {phase === "sleep" && (
          <div className="bt-q-panel" style={{ textAlign: "center" }}>
            <div style={{ fontSize: 40 }}>{sleepRef.current > 0 ? "😴💤" : timejamRef.current > 0 ? "⏳" : "⚡"}</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: "#a5b4fc" }}>{log}</div>
          </div>
        )}

        {/* ===== 問題フェーズ ===== */}
        {phase === "question" && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 11, color: "#88aa88" }}>のこり</span>
              <div className="bt-timer-track" style={{ flex: 1 }}>
                <div className="bt-timer-fill" style={{ width: timePct + "%", background: timePct > 40 ? "#4ade80" : timePct > 20 ? "#fbbf24" : "#f87171" }} />
              </div>
              <span style={{ fontSize: 13, fontWeight: 900, color: "#cceebb", minWidth: 28, textAlign: "right" }}>{timer}</span>
              {pending && <span style={{ fontSize: 12, fontWeight: 900, color: "#fde047" }}>{pending.label}</span>}
            </div>
            <div className="bt-q-panel">
              {q ? (
                <>
                  <span className="bt-q-theme">{q.unitName} ・ {q.level === "advanced" ? "発展" : "標準"}</span>
                  <div className="bt-q-text"><MathText>{q.q}</MathText></div>
                  {choices ? (
                    <div className={"bt-choices" + (shakeAns ? " answer-shake" : "")} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
                      {choices.map((c, i) => (
                        <button key={i} className="bt-choice" data-sfx="none" disabled={lockedRef.current} onClick={() => submitAnswer(c)}
                          style={{ padding: "12px 10px", borderRadius: 12, border: "2px solid rgba(255,255,255,.18)", background: "rgba(255,255,255,.08)", color: "#f1f5f9", fontWeight: 800, fontSize: 16, fontFamily: "inherit" }}><MathText>{c}</MathText></button>
                      ))}
                    </div>
                  ) : (
                    <>
                      <div className={"ans-row" + (shakeAns ? " answer-shake" : "")}>
                        <input ref={inputRef} className="ans-in" type="text" inputMode="text" value={input} disabled={lockedRef.current}
                          onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") submitAnswer(input); }} placeholder="例: -5 や 1/2" />
                        <button className="ok-btn" data-sfx="none" disabled={lockedRef.current || input === ""} onClick={() => submitAnswer(input)}>⚔️</button>
                      </div>
                      <div className="ans-keys">
                        {[["−", "-"], ["／", "/"], ["⌫", "back"]].map(([label, k]) => (
                          <button key={k} type="button" className="ans-key" data-sfx="none" disabled={lockedRef.current} onMouseDown={(e) => e.preventDefault()}
                            onClick={() => { if (lockedRef.current) return; setInput((v) => k === "back" ? v.slice(0, -1) : k === "-" ? (v.startsWith("-") ? v.slice(1) : "-" + v) : (v.includes("/") || v === "" ? v : v + "/")); inputRef.current?.focus(); }}>{label}</button>
                        ))}
                      </div>
                    </>
                  )}
                </>
              ) : <div style={{ color: "#cceebb" }}>問題を準備中…</div>}
            </div>
            <button onClick={() => setShowPad((v) => !v)} data-sfx="none" style={{ width: "100%", margin: "8px 0 0", padding: "9px", borderRadius: 11, border: "1px solid rgba(255,255,255,.18)", cursor: "pointer", fontSize: 13, fontWeight: 800, color: "#fff", background: showPad ? "rgba(255,255,255,.14)" : "rgba(255,255,255,.06)" }}>
              ✏️ 計算スペース{showPad ? "を閉じる" : "を開く"}
            </button>
            {showPad && <DrawPad key={q ? q.q : "pad"} height={300} />}
          </>
        )}

        {/* バトルログ */}
        <div className="bt-panel bt-log"><span className="new">{log}</span></div>
        <button className="back-btn" style={{ alignSelf: "center" }} onClick={() => { if (!endedRef.current) saveHp(hpRef.current); flushDex(false); onExit(); }}>← にげる</button>
      </div>
    </div>
  );
}
