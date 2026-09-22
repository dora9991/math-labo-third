import { useEffect, useMemo, useRef, useState } from "react";
import { getChapter, getGrade, CHAPTER_SUBJECT, SUBJECT_LABEL } from "../data/storyMap.js";
import { useGame } from "../ThirdContext.jsx";
import {
  computePartyMaxHp,
  resolvePlayerAttack,
  resolveEnemyAction,
  spawnEnemyGroup,
  spawnBoss,
  rollEnemyInflictedStatus,
  applyStatusEffect,
  canActThisRound,
  canUseSkillThisRound,
  isConfusedThisRound,
  isPartyAllPetrified,
  tickStatusEffects,
  cureStatusEffects,
  STATUS_DEFS,
} from "../battleEngine.js";
import { generateBattleProblem } from "../problemSource.js";
import { PROBLEM_VERSION } from "../problemVersion.js";
import * as bgm from "../../audio/bgm.js";
import {
  SKILL_CAP_FRAC,
  DIFFICULTY_KEYS,
  DIFFICULTY_LABEL,
  DIFFICULTY_DAMAGE_MULTIPLIER,
  capDamageFor,
  tierOf,
} from "../balance.js";
import { levelFromExp, getSubUnitClearExpReward } from "../expCurve.js";
import BattleFX, { PROJECTILE_MS } from "../fx/BattleFX.jsx";
import { playCorrectSound, playIncorrectSound, playEnemyAttackStartSound } from "../fx/sound.js";
import UltimateCutIn from "../../components/UltimateCutIn.jsx";
import FxSpeedToggle from "../../components/FxSpeedToggle.jsx";
import { fxScale, getFxSpeed, setFxSpeed } from "../../engine/fxSpeed.js";
import MonsterPortrait from "../components/MonsterPortrait.jsx";
import QuestionText from "../../components/QuestionText.jsx";
import MathText from "../../components/MathText.jsx";
import { monsterImageUrl, monsterImgFilter } from "../data/monsterImages.js";
import { chaptersForGrade } from "../../data/index.js";
import { gaugeSecondsFor } from "../gaugeTime.js";

// スキルゲージの満タン値（2026-09-22：スキルの強さ(tier 1〜4)に応じて必要正解数を変える。
//   弱いスキルほど早く貯まり、強いスキルほど問題数を稼げる＝学習量が増える）。
const SKILL_GAUGE_MAX = 4; // 互換用の既定値（tierが無いスキル用）
const SKILL_GAUGE_BY_TIER = { 1: 6, 2: 9, 3: 12, 4: 15 };
function skillGaugeMaxFor(character) {
  const tier = character?.skill?.tier;
  return SKILL_GAUGE_BY_TIER[tier] ?? SKILL_GAUGE_MAX;
}

// 状態異常アイコン（2026-09-18追加）。パーティ側の各ポートレートの下に表示する。
const STATUS_ICON = {
  poison: "🧪",
  paralysis: "⚡",
  seal: "🔒",
  slow: "🐌",
  confusion: "❓",
  petrification: "🗿",
};

const REWARD_EXP_GROUP = 12;
const REWARD_EXP_BOSS = 40;
const REWARD_COIN_GROUP = 8;
const REWARD_COIN_BOSS = 30;

// 正解/不正解の音を聞かせてから、少し間を置いてエフェクト(たま)を出す。
const ANSWER_SOUND_LEAD_MS = 200;
// 3体同時攻撃のときの、たま発射タイミングのずらし幅（「若干ランダムでずらす」）。
const STAGGER_MS = 30;
const STAGGER_JITTER_MS = 10;
// 3体分のダメージ表記/バーストが重なりすぎないようにする表示位置のずらし幅。
const OFFSET_SPREAD = 30;
// 自分たちの攻撃が落ち着いてから、敵の反撃(下がる→引っ掻く→揺れる)が始まるまでの間。
const COUNTER_LEAD_MS = 280;
// 「敵の攻撃開始音」(発動効果音)が鳴ってから、実際に引っ掻き(＝ダメージ発生)が
// 来るまでの予備動作の間。ここで被ダメージ数値・HPも即反映する。
const ENEMY_STRIKE_WINDUP_MS = 100;
// 反撃が複数回続くときの、1発ごとの間隔（「0.3秒ごとにどんどんくる」）。
const ENEMY_ATTACK_STEP_MS = 150;
// 引っ掻いた敵が「構え」を解除する(下がりポーズが戻る)までの見た目上の間。
const ENEMY_LUNGE_CLEAR_MS = 180;
// 攻撃するキャラが枠から2倍の大きさで飛び出してから、実際にたまを撃つまでの間。
const POPUP_GROW_MS = 220;
const POPUP_HOLD_MS = 140;
const POPUP_LEAD_MS = POPUP_GROW_MS + POPUP_HOLD_MS;
// ドラッグと判定するための、指を動かした距離のしきい値(px)。これ未満はタップ扱い。
const DRAG_THRESHOLD_PX = 10;
// 攻撃結果を表示してから、ボタンを押させずに自動で次のこうげきへ進むまでの間。
const WAVE_CLEAR_MS = 800; // 最後の敵を倒してから次の波(またはクリア画面)へ進むまでの間
// 難易度を選んだら、選んだボタンが光ってから自動で問題に移るまでの間。
const DIFF_PICK_DELAY_MS = 600;

// 「敵は1〜3体同時に出てくることもある」構成。1つの配列=1つの波(wave)。
// 小単元：雑魚の波(1〜3体・同時)を2回→ボスの波(1体)＝計3戦（2026-09-18：
// 1回→2回に変更。演習量を増やす狙い）。章ボス/大ボスは単体の波1つだけ。
function buildEncounters(params, chapter, gradeData) {
  const { kind, subUnitId } = params;
  // 敵の強さはカリキュラム上の位置(0〜1)でなだらかに上がる（balance.js）。
  const t = kind === "finalBoss" ? 1 : tierOf(params.grade, params.chapterId, kind === "subUnit" ? subUnitId : null);
  if (kind === "subUnit") {
    const subUnit = chapter.subUnits.find((s) => s.id === subUnitId);
    const waves = [1, 2].map(() => {
      const count = 1 + Math.floor(Math.random() * 3); // 1〜3体が同時に出てくる
      return Array.from({ length: count }, (_, i) => spawnEnemyGroup(subUnit.enemy, i, count, t));
    });
    // 中2・中3はgachaRoster側に小単元ごとのボス(unitSmallBoss)が無かったchapterが
    // あったため付けていた安全策（2026-09-18：全小単元に追加済み。今後も念のため残す）。
    return subUnit.boss ? [...waves, [spawnBoss(subUnit.boss, t)]] : waves;
  }
  if (kind === "chapterBoss") {
    return [[spawnBoss(chapter.chapterBoss, t)]];
  }
  if (kind === "finalBoss") {
    return [[spawnBoss(gradeData.finalBoss, t)]];
  }
  return [];
}

// el を stageEl 基準の座標系（PixiJSのapp.screenと同じCSSピクセル単位）に変換する。
function pointOf(el, stageEl) {
  if (!el || !stageEl) return null;
  const r = el.getBoundingClientRect();
  const s = stageEl.getBoundingClientRect();
  return { x: r.left + r.width / 2 - s.left, y: r.top + r.height / 2 - s.top };
}
function rectOf(el, stageEl) {
  if (!el || !stageEl) return null;
  const r = el.getBoundingClientRect();
  const s = stageEl.getBoundingClientRect();
  return { x: r.left - s.left, y: r.top - s.top, width: r.width, height: r.height };
}

function stableKind(key, kinds) {
  return [...String(key || "")].reduce((n, ch) => (n * 31 + ch.charCodeAt(0)) >>> 0, 7) % kinds.length;
}
function playerAttackKind(character) {
  const art = String(character?.art || "").toLowerCase();
  if (/beast|animal|bug|dice|speed/.test(art) || /獣|動物|虫/.test(String(character?.roleTag || ""))) return "claw";
  if (/bomb|explosion|fire/.test(art)) return "explosion";
  if (/geo|angle|prime/.test(art)) return "sword";
  if (/volume|balance/.test(art) || /guard|tank/.test(String(character?.role || ""))) return "strike";
  if (/calc|wave/.test(art)) return "magic";
  return ["claw", "magic", "strike", "sword", "explosion"][stableKind(character?.id, [0, 1, 2, 3, 4])];
}
function enemyAttackKind(enemy) {
  const art = String(enemy?.art || enemy?.id || "").toLowerCase();
  if (/prime/.test(art)) return "bite";
  if (/calc/.test(art)) return "fireball";
  if (/geo|angle/.test(art)) return "ice";
  if (/maou|boss/.test(art)) return "darkSpike";
  if (/wave/.test(art)) return "sonic";
  if (/dice/.test(art)) return "poison";
  if (/speed|volume/.test(art)) return "tackle";
  if (/fraction|balance/.test(art)) return "lightning";
  return ["claw", "bite", "fireball", "ice", "darkSpike", "sonic", "poison", "tackle", "lightning"][stableKind(enemy?.instanceId || enemy?.id, Array(9))];
}

export default function Battle({ nav, params }) {
  const { grade, chapterId, kind } = params;
  const { save, actions, charactersById } = useGame();
  const gradeData = getGrade(grade);
  const chapter = chapterId ? getChapter(grade, chapterId) : null;
  // params はワールド側の subUnitId を持つ。対応する教材側 unitId をここで読むだけにし、link.js は変更しない。
  const unitId = useMemo(() => {
    const subIndex = chapter?.subUnits.findIndex((s) => s.id === params.subUnitId) ?? -1;
    return subIndex >= 0 ? chaptersForGrade(grade).find((c) => c.id === chapterId)?.units[subIndex]?.id : null;
  }, [chapter, chapterId, grade, params.subUnitId]);
  // 敵の強さ・ゲージの序盤補正に使う「カリキュラム上の位置」(0〜1)
  const tierNow = kind === "finalBoss" ? 1 : tierOf(grade, chapterId, kind === "subUnit" ? params.subUnitId : null);
  const gaugeMaxFor = (isBoss) => gaugeSecondsFor(unitId, isBoss, tierNow); // 雑魚の波／ボスの波でゲージの長さが変わる

  const encounters = useMemo(() => buildEncounters(params, chapter, gradeData), []); // eslint-disable-line react-hooks/exhaustive-deps

  // 小単元クリア報酬の配分（2026-09-18）：小単元丸ごとクリアの目標値
  // （expCurve.jsのカリキュラム位置カーブ）を、雑魚6割・ボス4割で山分けする。
  // 雑魚は頭数で均等割り（端数はボスへ寄せる）＝「全部倒したら目標どおり」を保証する。
  // chapterBoss/finalBossなど小単元以外は従来の固定値（REWARD_EXP_GROUP/BOSS）のまま。
  const expPlan = useMemo(() => {
    if (kind !== "subUnit" || !chapter) return null;
    const subUnit = chapter.subUnits.find((s) => s.id === params.subUnitId);
    if (!subUnit) return null;
    const target = getSubUnitClearExpReward(grade, chapterId, subUnit.id);
    const trashWaves = subUnit.boss ? encounters.slice(0, -1) : encounters;
    const trashCount = trashWaves.reduce((n, w) => n + w.length, 0);
    const perTrashKill = trashCount > 0 ? Math.floor((target * 0.6) / trashCount) : 0;
    const bossKill = target - perTrashKill * trashCount; // 端数込みでボスが受け取る
    return { perTrashKill, bossKill: subUnit.boss ? bossKill : 0 };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [waveIndex, setWaveIndex] = useState(0);
  const [enemies, setEnemies] = useState(() => (encounters[0] || []).map((e) => ({ ...e })));
  // パーティ最大HPは「今の編成の合計HP」（2026-09-16、1000固定から変更）。
  // 編成は戦闘中に変わらないので、レベルもsave.ownedのexpから毎回同じ値になる
  // ＝partyHpの初期値としてそのまま使ってよい。
  const partyMembers = save.party.filter(Boolean).map((id) => charactersById[id]);
  const partyMaxHp = computePartyMaxHp(partyMembers, (c) => levelFromExp(save.owned[c.id]?.exp || 0, c.rarity));
  const [partyHp, setPartyHp] = useState(partyMaxHp);
  const [phase, setPhase] = useState("intro"); // intro | question | resolving | result | defeat（30秒ゲージ方式：選択フェーズは無く、問題が連続で出る）
  // スキルはSKILL_GAUGE_MAX問正解でゲージが満タンになったら発動できる。
  // 【2026-09-18】次の通常攻撃に「予約」する方式をやめ、タップした瞬間に
  // 確認ダイアログを出してその場で即時発動する方式にした（activateSkill参照）。
  const [gauge, setGauge] = useState({});
  // 満タンのキャラをタップしたときに出す「スキルを発動しますか？」の確認ダイアログ。
  const [skillConfirm, setSkillConfirm] = useState(null); // characterId | null
  // 各キャラが「どの敵を狙うか」。ドラッグで上書きするまでは自動割り振り。
  const [targets, setTargets] = useState({});
  const [problem, setProblem] = useState(null);
  // 問題難易度（簡単/普通/難しい/鬼）。ターンごとに選ぶと、選んだボタンが光ってから自動で問題へ進む。
  const [difficulty, setDifficulty] = useState("standard");
  const difficultyRef = useRef("standard"); // 「次の問題」に使う難度（いつでも切替可）
  // サーバーへ送る「解答の記録」。正誤の自己申告は入れない（サーバーが seed から問題を作り直して採点する）。
  const attemptsRef = useRef([]);
  const battleStartRef = useRef(actions.serverNow());
  const shownAtRef = useRef(Date.now());
  // 敵の行動ゲージ（秒）。問題に答えている間(question)だけ減り、演出中は止まる。0で敵が行動→小単元の満タン値に戻る。
  const [gaugeMax, setGaugeMax] = useState(() => gaugeMaxFor(false)); // いまの波のゲージ満タン秒数
  const gaugeMaxRef = useRef(gaugeMax);
  const [gaugeSec, setGaugeSec] = useState(gaugeMax);
  const gaugeRef = useRef(gaugeMax);
  const [penaltyFlash, setPenaltyFlash] = useState(0);
  const latestRef = useRef({}); // タイマーから「最新の描画時点の関数」を呼ぶための入れ物
  const enemyFxTimersRef = useRef(new Set());
  const [totals, setTotals] = useState({ exp: 0, coins: 0 });
  // 【リアルタイム化】演出を待たず即座に次の問題へ進むため、ロジックは同期的に読み書きできるrefを正とする。
  const enemiesRef = useRef(enemies);
  const partyHpRef = useRef(partyHp);
  const totalsRef = useRef({ exp: 0, coins: 0 });
  const hotRef = useRef(null); // 継続回復 {left, amount}
  function commitEnemies(next) {
    enemiesRef.current = next;
    setEnemies(next);
  }
  function commitPartyHp(v) {
    partyHpRef.current = v;
    setPartyHp(v);
  }
  function addTotals(exp, coins) {
    totalsRef.current = { exp: totalsRef.current.exp + exp, coins: totalsRef.current.coins + coins };
    setTotals(totalsRef.current);
  }
  // 状態異常（毒/麻痺/封印/スロー/混乱/石化）：{ characterId: { statusKey: {turnsLeft,...} } }。
  // 敵の攻撃がパーティメンバーにかける（2026-09-18・kazu確認済み）。
  const [partyStatus, setPartyStatus] = useState({});
  // 支援スキルの一時バフ：{ atk: {multiplier,turnsLeft} | null, guard: 同様 | null }。
  const [partyBuffs, setPartyBuffs] = useState({ atk: null, guard: null });
  // 敵の反撃はsetTimeoutごしに発火するため、Reactのstateをそのまま読むと
  // 古い値を掴む（Battle.jsxの他のドラッグ処理と同じ理由）。反撃時のガード
  // バフ参照はrefの方を見る。
  const partyBuffsRef = useRef(partyBuffs);
  useEffect(() => {
    partyBuffsRef.current = partyBuffs;
  }, [partyBuffs]);
  const partyStatusRef = useRef(partyStatus);
  useEffect(() => {
    partyStatusRef.current = partyStatus;
  }, [partyStatus]);
  const fxRef = useRef(null);
  const [shakingIds, setShakingIds] = useState(() => new Set());
  const [partyShake, setPartyShake] = useState(false);
  // 反撃で「予備動作中(下がって構えている)」の敵。複数体が順番に反撃しうるのでSetで管理。
  const [lungingIds, setLungingIds] = useState(() => new Set());
  // 攻撃中に「枠から飛び出している」キャラをcharacterId->boolで管理。
  const [poppedOut, setPoppedOut] = useState({});
  // 演出だけの状態。ダメージ計算・ターン進行とは分離しているため、スキップ／オフでも結果は変わらない。
  const [fxSpeed, setBattleFxSpeed] = useState(() => getFxSpeed());
  const [cutIn, setCutIn] = useState(null);
  // ドラッグ中の見た目（指に付いてくる丸アイコン）とホバー中の敵。
  const [dragGhost, setDragGhost] = useState(null); // {charId, x, y} | null
  const [hoverTargetId, setHoverTargetId] = useState(null);
  const dragRef = useRef(null); // {charId, startX, startY, moved}
  const hoverRef = useRef(null);
  // キャラをタップしたときに一時的に出す説明（スキル発動まであと何問／発動確認）。
  const [tapInfo, setTapInfo] = useState(null); // {charId, text} | null
  const tapInfoTimeoutRef = useRef(null);
  function showTapInfo(charId, text) {
    if (tapInfoTimeoutRef.current) clearTimeout(tapInfoTimeoutRef.current);
    if (!text) {
      setTapInfo(null);
      return;
    }
    setTapInfo({ charId, text });
    tapInfoTimeoutRef.current = setTimeout(() => setTapInfo(null), 2600);
  }

  // 舞台（敵表示＋パーティ表示をまとめた1枚）と、各要素の位置を測るためのref。
  const stageRef = useRef(null);
  const enemyRefs = useRef({}); // instanceId -> DOM el
  const partyAreaRef = useRef(null);
  const portraitRefs = useRef({});

  // 速さは見た目の待ち時間だけに適用する。ゲーム進行用のタイマーや計算値には使わない。
  const fxDelay = (ms) => Math.max(1, Math.round(ms * fxScale(fxSpeed)));
  const changeFxSpeed = (speed) => setBattleFxSpeed(setFxSpeed(speed));
  function scheduleEnemyFx(callback, ms) {
    const timer = window.setTimeout(() => {
      enemyFxTimersRef.current.delete(timer);
      callback();
    }, ms);
    enemyFxTimersRef.current.add(timer);
    return timer;
  }
  useEffect(() => () => {
    enemyFxTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    enemyFxTimersRef.current.clear();
  }, []);

  function triggerEnemyShakeFor(ids, ms) {
    if (!ids.length) return;
    setShakingIds((prev) => new Set([...prev, ...ids]));
    setTimeout(() => {
      setShakingIds((prev) => {
        const next = new Set(prev);
        for (const id of ids) next.delete(id);
        return next;
      });
    }, ms);
  }
  function triggerPartyShake(ms) {
    setPartyShake(true);
    setTimeout(() => setPartyShake(false), ms);
  }

  const isBossWave = waveIndex === encounters.length - 1;
  // BGM：通常戦闘 → 最後の波は小単元ボス（章ボス/最終ボスは専用曲）→ 敗北は1回だけ
  useEffect(() => {
    if (phase === "defeat") bgm.play("defeat", { loop: false });
    else if (phase === "claiming") return; // 勝利曲は結果画面で
    else if (isBossWave && (kind === "chapterBoss" || kind === "finalBoss")) bgm.play("chapterboss");
    else if (isBossWave) bgm.play("boss");
    else bgm.play("battle");
  }, [isBossWave, phase, kind]);
  const aliveEnemies = enemies.filter((e) => e.hp > 0);

  // 章のステージなら章の系統に固定。大ボス戦(章なし)は、キャラ自身の得意系統で殴る。
  function subjectFor(character) {
    return chapterId ? CHAPTER_SUBJECT[chapterId] : character?.primarySubject;
  }
  const topSubjectLabel = chapterId ? SUBJECT_LABEL[CHAPTER_SUBJECT[chapterId]] : "総力戦";

  // characterId が今どの敵を狙うか（ドラッグ指定があればそれ、無ければ敵に均等に割り振る）。
  function resolveTarget(characterId, fallbackIndex) {
    if (aliveEnemies.length === 0) return null;
    const chosen = targets[characterId];
    if (chosen && aliveEnemies.some((e) => e.instanceId === chosen)) return chosen;
    return aliveEnemies[fallbackIndex % aliveEnemies.length].instanceId;
  }

  function startQuestion(diff) {
    const p = generateBattleProblem({ subUnitId: params.subUnitId, grade, chapterId }, diff)
      || generateBattleProblem({ subUnitId: params.subUnitId, grade, chapterId }, "standard");
    shownAtRef.current = Date.now();
    setProblem(p);
    setPhase("question");
  }

  // 難易度チップ：「次の問題」から適用（表示中の問題は差し替えない＝引き直しで選り好みできない）。
  function pickDifficulty(d) {
    difficultyRef.current = d;
    setDifficulty(d);
  }

  // ドラッグ開始（パーティのポートレートから）。指定キャラを押した瞬間からアイコンが
  // 付いてくる。動かさずに離せばタップ＝スキルの発動予約トグル、一定以上動かして
  // 敵の上で離せば＝その敵を攻撃対象に指定。
  function handlePortraitPointerDown(e, characterId) {
    if (phase !== "question") return;
    e.preventDefault(); // ブラウザ標準の画像ドラッグ等に奪われないようにする
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* 対応していない環境では無視 */
    }
    const startX = e.clientX;
    const startY = e.clientY;
    dragRef.current = { charId: characterId, startX, startY, moved: false };
    hoverRef.current = null;
    setDragGhost({ charId: characterId, x: startX, y: startY }); // 押した瞬間からアイコンを出す

    function onMove(ev) {
      const d = dragRef.current;
      if (!d) return;
      const dx = ev.clientX - d.startX;
      const dy = ev.clientY - d.startY;
      if (Math.hypot(dx, dy) > DRAG_THRESHOLD_PX) d.moved = true;
      setDragGhost({ charId: d.charId, x: ev.clientX, y: ev.clientY });
      if (!d.moved) return;

      let hovered = null;
      for (const en of enemies) {
        if (en.hp <= 0) continue;
        const el = enemyRefs.current[en.instanceId];
        if (!el) continue;
        const r = el.getBoundingClientRect();
        if (ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top && ev.clientY <= r.bottom) {
          hovered = en.instanceId;
          break;
        }
      }
      hoverRef.current = hovered;
      setHoverTargetId(hovered);
    }

    function onUp() {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      const d = dragRef.current;
      dragRef.current = null;
      // ホバー中の敵IDは先にローカル変数へ確定させてからsetTargetsに渡す。
      // setTargetsの更新関数の中でhoverRef.currentを直接読むと、直後の
      // 「hoverRef.current = null」とレースしてnullを拾ってしまうことがあった
      // （ドラッグしても攻撃対象が切り替わらないバグの原因）。
      const droppedTargetId = hoverRef.current;
      hoverRef.current = null;
      setDragGhost(null);
      setHoverTargetId(null);

      if (!d) return;
      if (d.moved) {
        if (droppedTargetId) {
          setTargets((t) => ({ ...t, [d.charId]: droppedTargetId }));
        }
      } else {
        // 動かさずタップ＝スキル情報の表示。満タンなら「発動しますか？」の
        // 確認ダイアログを開く（2026-09-18：その場で即時発動する方式に変更）。
        const c = charactersById[d.charId];
        if (c?.skill) {
          const currentGauge = gauge[d.charId] || 0;
          const gaugeMax = skillGaugeMaxFor(c);
          if (currentGauge >= gaugeMax) {
            setSkillConfirm(d.charId);
          } else {
            showTapInfo(d.charId, `スキル発動まであと${gaugeMax - currentGauge}問`);
          }
        }
      }
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  function tickBuff(buff) {
    if (!buff) return null;
    const turnsLeft = buff.turnsLeft - 1;
    return turnsLeft > 0 ? { ...buff, turnsLeft } : null;
  }

  // 不正解：その小単元の満タン時間の半分だけ敵の行動ゲージが進む。0以下ならすぐ敵が行動する。
  // 戻り値: 敵の反撃(doEnemyCycle)が発生したか。呼び出し側(pickChoice)は、発生した場合
  // 次の問題を即座には出さず、doEnemyCycleの演出が終わった後に出す（でないと、敵の行動中
  // ロック(phase="enemyAttack")が同じ描画の中で"question"に上書きされてしまい、ロックが
  // 一瞬たりとも見えなくなる不具合になる。2026-09-22 実機確認で発見）。
  function applyWrongPenalty() {
    gaugeRef.current -= gaugeMaxRef.current / 2; // 不正解＝その波のゲージの半分が進む
    setPenaltyFlash((n) => n + 1);
    if (gaugeRef.current <= 0) {
      doEnemyCycle({ nextQuestionDiff: difficultyRef.current });
      return true;
    }
    setGaugeSec(gaugeRef.current);
    return false;
  }

  // ゲージが0：敵行動中は問題の選択肢をロックし、全演出後に問題へ戻す。
  //   nextQuestionDiff を渡した場合（＝不正解でゲージが尽きた場合）は演出後に新しい問題を出す。
  //   渡さない場合（＝時間切れで自然にゲージが尽きた場合）は今の問題のまま続けられるようにする。
  function doEnemyCycle({ nextQuestionDiff } = {}) {
    const pool = enemiesRef.current.filter((en) => en.hp > 0);
    if (!pool.length) return;
    setPhase("enemyAttack");
    const guardMult = partyBuffsRef.current.guard?.multiplier ?? 1;
    const variantOrder = [0, 1, 2, 3].sort(() => Math.random() - 0.5);
    const memberIds = partyMembers.map((c) => c.id);
    let hp = partyHpRef.current;
    let downed = false;
    const events = [];
    for (let i = 0; i < pool.length; i++) {
      const attacker = pool[i];
      const dmg = Math.round(resolveEnemyAction(attacker) * guardMult);
      hp = Math.max(0, hp - dmg);
      events.push({ attacker, dmg, variantIndex: variantOrder[i % variantOrder.length], kind: enemyAttackKind(attacker) });
      // 命中した相手にランダムで状態異常も仕掛けてくる（石化していない生存メンバーから1体）。
      const eligibleIds = memberIds.filter((id) => !partyStatusRef.current[id]?.petrification);
      if (eligibleIds.length) {
        const targetId = eligibleIds[Math.floor(Math.random() * eligibleIds.length)];
        const statusKey = rollEnemyInflictedStatus(charactersById[targetId]);
        if (statusKey) {
          const nextStatus = applyStatusEffect(partyStatusRef.current, targetId, statusKey);
          partyStatusRef.current = nextStatus;
          setPartyStatus(nextStatus);
          if (isPartyAllPetrified(nextStatus, memberIds)) downed = true;
        }
      }
      if (hp <= 0 || downed) break;
    }

    // 演出（見た目だけ）
    const partyRect = rectOf(partyAreaRef.current, stageRef.current);
    events.forEach((ev, i) => {
      scheduleEnemyFx(() => {
        setLungingIds((prev) => new Set([...prev, ev.attacker.instanceId]));
        playEnemyAttackStartSound();
        scheduleEnemyFx(() => {
          fxRef.current?.playEnemyCounter({ rect: partyRect, variantIndex: ev.variantIndex, kind: ev.kind, damage: ev.dmg });
          triggerPartyShake(fxDelay(260));
          scheduleEnemyFx(() => {
            setLungingIds((prev) => {
              const next = new Set(prev);
              next.delete(ev.attacker.instanceId);
              return next;
            });
          }, fxDelay(ENEMY_LUNGE_CLEAR_MS));
        }, fxDelay(ENEMY_STRIKE_WINDUP_MS));
      }, fxDelay(i * ENEMY_ATTACK_STEP_MS));
    });

    // ゲージ1周ぶんの経過：バフ・状態異常を1つ進める（毒ダメージもここ）。
    setPartyBuffs((prev) => ({ atk: tickBuff(prev.atk), guard: tickBuff(prev.guard) }));
    const { statusByCharId: nextStatus, poisonDamage } = tickStatusEffects(partyStatusRef.current, partyMaxHp);
    setPartyStatus(nextStatus);
    partyStatusRef.current = nextStatus;
    hp = Math.max(0, hp - poisonDamage);
    if (hotRef.current && hotRef.current.left > 0) {
      hp = Math.min(partyMaxHp, hp + hotRef.current.amount);
      hotRef.current = { ...hotRef.current, left: hotRef.current.left - 1 };
    }
    commitPartyHp(hp);
    if (hp <= 0 || downed || isPartyAllPetrified(nextStatus, memberIds)) {
      setPhase("defeat");
      return;
    }
    gaugeRef.current = gaugeMaxRef.current;
    setGaugeSec(gaugeMaxRef.current);
    const finishDelay = fxDelay(Math.max(ENEMY_STRIKE_WINDUP_MS + ENEMY_LUNGE_CLEAR_MS, (events.length - 1) * ENEMY_ATTACK_STEP_MS + ENEMY_STRIKE_WINDUP_MS + ENEMY_LUNGE_CLEAR_MS));
    scheduleEnemyFx(() => {
      if (nextQuestionDiff) startQuestion(nextQuestionDiff);
      else setPhase("question");
    }, finishDelay);
  }

  // 波を全滅させた：撃破演出を少し見せてから、次の波（最後ならクリア画面）へ。
  function onWaveCleared() {
    setPhase("wave");
    setTimeout(() => {
      if (waveIndex === encounters.length - 1) {
        finishBattle();
        return;
      }
      const nextIndex = waveIndex + 1;
      setWaveIndex(nextIndex);
      commitEnemies((encounters[nextIndex] || []).map((e) => ({ ...e })));
      setTargets({});
      { const m = gaugeMaxFor(nextIndex === encounters.length - 1); gaugeMaxRef.current = m; setGaugeMax(m); gaugeRef.current = m; } // 次の波（最後はボス＝短め）のゲージは満タンから
      setGaugeSec(gaugeMaxRef.current);
      startQuestion(difficultyRef.current);
    }, WAVE_CLEAR_MS);
  }

  // キャラをタップして確認ダイアログで「使う」を選んだ瞬間、その場でスキルを
  // 即時発動する（2026-09-18：次の通常攻撃への予約方式から変更。「戦闘に寂しさ
  // がある」への対応で、押した瞬間にエフェクトが出るようにした）。
  // 正解/不正解の判定とは無関係なボーナス行動という位置づけなので、敵の反撃
  // カウントダウンは進めない（通常攻撃のラウンドとは別枠）。
  function activateSkill(characterId) {
    setSkillConfirm(null);
    if (phase !== "question") return;
    const c = charactersById[characterId];
    const skill = c?.skill;
    if (!skill) return;
    const effects = partyStatus[characterId];
    if (!canActThisRound(effects) || !canUseSkillThisRound(effects)) return;
    if ((gauge[characterId] || 0) < skillGaugeMaxFor(c)) return;

    setGauge((g) => ({ ...g, [characterId]: 0 }));
    setPoppedOut((p) => ({ ...p, [characterId]: true }));
    setTimeout(() => setPoppedOut((p) => ({ ...p, [characterId]: false })), fxDelay(POPUP_LEAD_MS + 260));
    // カットインの決めフラッシュだけを先に見せる。HP反映とFXは onComplete 後。
    setPhase("skill");
    setCutIn({ id: `${characterId}-${Date.now()}`, character: c, skill });
  }

  function resolveSkillAfterCutIn({ character: c, skill }) {
    const level = levelFromExp(save.owned[c.id]?.exp || 0, c.rarity);
    const charSubject = subjectFor(c);
    const atkBuffMultiplier = partyBuffsRef.current.atk?.multiplier ?? 1;
    const stageEl = stageRef.current;
    const partyRect = rectOf(partyAreaRef.current, stageEl);

    if (skill.category === "aoeDamage" || skill.category === "singleDamage") {
      const live = enemiesRef.current.filter((en) => en.hp > 0);
      const targetIds =
        skill.category === "aoeDamage" ? live.map((en) => en.instanceId) : [resolveTarget(c.id, 0)].filter(Boolean);
      if (!targetIds.length) return;

      const damageByTarget = {};
      let anyCrit = false;
      targetIds.forEach((tid, idx) => {
        const rawAttack = resolvePlayerAttack(c, level, charSubject, true, {
          skillMultiplier: skill.multiplier,
          atkBuffMultiplier,
        });
        // スキルも1回で1体から削れる量に上限（敵最大HPの割合）＝1パン防止
        const enT = live.find((e) => e.instanceId === tid);
        rawAttack.damage = Math.min(rawAttack.damage, Math.max(1, Math.round((enT?.maxHp ?? Infinity) * SKILL_CAP_FRAC)));
        damageByTarget[tid] = (damageByTarget[tid] || 0) + rawAttack.damage;
        if (rawAttack.isCrit) anyCrit = true;
      });

      const targetPoints = targetIds.map((tid) => pointOf(enemyRefs.current[tid], stageEl)).filter(Boolean);
      fxRef.current?.playUltimate({
        category: skill.category, subject: charSubject, color: c.color, targets: targetPoints,
        rect: partyRect, damage: damageByTarget[targetIds[0]], isCrit: anyCrit,
      });

      // 即座に反映（演出は並行）
      const { next: updatedEnemies, hitIds, gainedExp, gainedCoins, defeatedPoints } = applyDamageToEnemies(damageByTarget);
      commitEnemies(updatedEnemies);
      setTimeout(() => {
        triggerEnemyShakeFor(hitIds, anyCrit ? 450 : 220);
        defeatedPoints.forEach((to) => fxRef.current?.playDefeat({ to }));
      }, fxDelay(PROJECTILE_MS.normal));
      if (gainedExp || gainedCoins) addTotals(gainedExp, gainedCoins);
      if (updatedEnemies.every((en) => en.hp <= 0)) onWaveCleared();
      else setPhase("question");
      return;
    }

    if (skill.category === "buffAtk") {
      setPartyBuffs((prev) => ({ ...prev, atk: { multiplier: skill.multiplier, turnsLeft: skill.duration } }));
      fxRef.current?.playUltimate({ category: skill.category, subject: charSubject, color: c.color, rect: partyRect, text: `攻撃力 ×${skill.multiplier}` });
      setPhase("question");
      return;
    }
    if (skill.category === "buffGuard") {
      setPartyBuffs((prev) => ({ ...prev, guard: { multiplier: skill.multiplier, turnsLeft: skill.duration } }));
      fxRef.current?.playUltimate({ category: skill.category, subject: charSubject, color: c.color, rect: partyRect, text: `被ダメ ×${skill.multiplier}` });
      setPhase("question");
      return;
    }
    if (skill.category === "heal") {
      const healAmount = Math.round(partyMaxHp * skill.percent);
      // ★ref(partyHpRef)を正として更新する（stateだけ更新すると、次の敵の行動で古いHPに上書きされて回復が消える）
      commitPartyHp(Math.min(partyMaxHp, partyHpRef.current + healAmount));
      // 「癒しの泉」(mode:"hot")は、いま回復＋以後の敵の行動ごとにもう一度ずつ回復する
      if (skill.mode === "hot") hotRef.current = { left: Math.max(0, (skill.duration || 3) - 1), amount: healAmount };
      fxRef.current?.playUltimate({ category: skill.category, subject: charSubject, color: c.color || 0x7cff8a, rect: partyRect, text: `+${healAmount}` });
      setPhase("question");
      return;
    }
    if (skill.category === "cure") {
      const nextStatus = cureStatusEffects(partyStatusRef.current, skill.cures);
      partyStatusRef.current = nextStatus;
      setPartyStatus(nextStatus);
      fxRef.current?.playUltimate({ category: skill.category, subject: charSubject, color: c.color || 0xbfe3ff, rect: partyRect, text: "状態異常回復" });
      setPhase("question");
    }
  }

  // ダメージを敵に反映した結果（新しい敵配列・撃破ボーナス・撃破位置）を返す。ログ用の副作用は持たない。
  function applyDamageToEnemies(damageByTarget) {
    let gainedExp = 0;
    let gainedCoins = 0;
    const hitIds = [];
    const defeatedPoints = [];
    const next = enemiesRef.current.map((en) => {
      const dmg = damageByTarget[en.instanceId] || 0;
      if (dmg <= 0) return en;
      hitIds.push(en.instanceId);
      const hp = Math.max(0, en.hp - dmg);
      if (en.hp > 0 && hp <= 0) {
        gainedExp += expPlan ? (isBossWave ? expPlan.bossKill : expPlan.perTrashKill) : isBossWave ? REWARD_EXP_BOSS : REWARD_EXP_GROUP;
        gainedCoins += isBossWave ? REWARD_COIN_BOSS : REWARD_COIN_GROUP;
        const pt = pointOf(enemyRefs.current[en.instanceId], stageRef.current);
        if (pt) defeatedPoints.push(pt);
      }
      return { ...en, hp };
    });
    return { next, hitIds, gainedExp, gainedCoins, defeatedPoints };
  }

  // 【リアルタイム化】答えた瞬間に効果を反映し、演出は並行して再生、次の問題をすぐ出す。
  //  ・正解 … 仲間全員が即座に攻撃（弾は即発射）。ダメージは敵HPに即反映。
  //  ・不正解 … ゲージが10秒進む。
  //  どちらも演出中にゲージは止まらない。
  function pickChoice(index) {
    if (phase !== "question" || !problem) return;
    const correct = index === problem.correctIndex;
    const diff = problem.level || difficulty; // この問題を出した時の難度（切替は次の問題から）
    attemptsRef.current.push({
      unitId: problem.unitId, level: problem.level, seed: problem.seed,
      answer: String(problem.choices[index]), ms: Math.max(0, Date.now() - shownAtRef.current),
    });
    const statusSnapshot = partyStatusRef.current;
    const stageEl = stageRef.current;
    const live = enemiesRef.current.filter((en) => en.hp > 0);

    if (!correct) {
      playIncorrectSound();
      const fromPoint = pointOf(portraitRefs.current[partyMembers[0]?.id], stageEl);
      const toPoint = live[0] ? pointOf(enemyRefs.current[live[0].instanceId], stageEl) : null;
      fxRef.current?.playMiss({ subject: subjectFor(partyMembers[0]), from: fromPoint, to: toPoint });
      const enemyCycleTriggered = applyWrongPenalty();
      // 敵の反撃が起きた場合は、その演出が終わってから doEnemyCycle 側が次の問題を出す
      // （ここで即座に出すと phase="enemyAttack" のロックが同じ描画内で上書きされてしまう）。
      if (!enemyCycleTriggered && partyHpRef.current > 0) startQuestion(difficultyRef.current);
      return;
    }

    playCorrectSound();
    fxRef.current?.playCorrectBurst();

    // 正解＝行動できるメンバー全員が同時にこうげき（麻痺/石化/スロー(今回不可)は行動そのものを
    // スキップ、混乱は敵ではなく味方＝パーティ自身に向く）。
    const hitEntries = [];
    const actedCharacterIds = [];
    const atkBuffMultiplier = partyBuffsRef.current.atk?.multiplier ?? 1;
    const partySelfPoint = (() => {
      const r = rectOf(partyAreaRef.current, stageEl);
      return r ? { x: r.x + r.width / 2, y: r.y + r.height / 2 } : null;
    })();

    partyMembers.forEach((c, i) => {
      const effects = statusSnapshot[c.id];
      if (!canActThisRound(effects)) return; // 麻痺・石化・スロー(今ターン不可)
      actedCharacterIds.push(c.id);

      const level = levelFromExp(save.owned[c.id]?.exp || 0, c.rarity);
      const charSubject = subjectFor(c);
      const from = pointOf(portraitRefs.current[c.id], stageEl);

      if (isConfusedThisRound(effects)) {
        const rawAttack = resolvePlayerAttack(c, level, charSubject, true, { atkBuffMultiplier });
        const damage = Math.max(1, Math.round(rawAttack.damage * STATUS_DEFS.confusion.damageFraction * DIFFICULTY_DAMAGE_MULTIPLIER[diff]));
        hitEntries.push({ character: c, attack: { ...rawAttack, damage }, subject: charSubject, targetId: "PARTY_SELF", isSelfHit: true, charIndex: i, from, to: partySelfPoint });
        return;
      }

      const rawAttack = resolvePlayerAttack(c, level, charSubject, true, { atkBuffMultiplier });
      const damage = Math.max(1, Math.round(rawAttack.damage * DIFFICULTY_DAMAGE_MULTIPLIER[diff]));
      const targetId = resolveTarget(c.id, i);
      hitEntries.push({ character: c, attack: { ...rawAttack, damage }, subject: charSubject, targetId, charIndex: i, from, to: targetId ? pointOf(enemyRefs.current[targetId], stageEl) : null });
    });

    // ダメージ上限（インフレ対策）：1回の正解で1体の敵から削れるのは「敵最大HP × 難度別の割合」まで。
    //  どれだけ強い編成でも、最低 ceil(1/割合) 問の正解が要る（学習量のフロア）。
    {
      const sumBy = {};
      hitEntries.forEach((h) => {
        if (h.targetId !== "PARTY_SELF") sumBy[h.targetId] = (sumBy[h.targetId] || 0) + h.attack.damage;
      });
      hitEntries.forEach((h) => {
        if (h.targetId === "PARTY_SELF") return;
        const en = live.find((e) => e.instanceId === h.targetId);
        if (!en) return;
        const cap = capDamageFor(en.maxHp, diff);
        const sum = sumBy[h.targetId];
        if (sum > cap) h.attack = { ...h.attack, damage: Math.max(1, Math.round((h.attack.damage * cap) / sum)) };
      });
    }

    // 弾は即発射（ごく小さな時間差だけ）。ダメージ数字は着弾時に出る。
    hitEntries.forEach((h) => {
      const stagger = h.charIndex * STAGGER_MS + Math.random() * STAGGER_JITTER_MS;
      const offset = { dx: Math.random() * 12 - 6, dy: Math.random() * 14 - 7 };
      setTimeout(() => {
        fxRef.current?.playHit({ damage: h.attack.damage, isCrit: h.attack.isCrit, subject: h.subject, kind: playerAttackKind(h.character), from: h.from, to: h.to, offset });
      }, fxDelay(stagger));
    });

    // ゲージ更新：行動できたキャラは+1（満タンで足止め、スキル使用時はactivateSkill側で0に戻す）。
    setGauge((g) => {
      const next = { ...g };
      for (const id of actedCharacterIds) next[id] = Math.min(skillGaugeMaxFor(charactersById[id]), (g[id] || 0) + 1);
      return next;
    });

    // 効果は即座に反映
    const damageByTarget = {};
    let selfDamage = 0;
    for (const h of hitEntries) {
      if (h.targetId === "PARTY_SELF") selfDamage += h.attack.damage;
      else damageByTarget[h.targetId] = (damageByTarget[h.targetId] || 0) + h.attack.damage;
    }
    const { next: updatedEnemies, hitIds, gainedExp, gainedCoins, defeatedPoints } = applyDamageToEnemies(damageByTarget);
    commitEnemies(updatedEnemies);
    setTimeout(() => {
      triggerEnemyShakeFor(hitIds, hitEntries.some((h) => h.attack.isCrit) ? 450 : 220);
      defeatedPoints.forEach((to) => fxRef.current?.playDefeat({ to }));
    }, fxDelay(PROJECTILE_MS.normal + 40));
    if (gainedExp || gainedCoins) addTotals(gainedExp, gainedCoins);

    if (selfDamage > 0) {
      const hp = Math.max(0, partyHpRef.current - selfDamage);
      commitPartyHp(hp);
      if (hp <= 0) {
        setPhase("defeat");
        return;
      }
    }
    if (isPartyAllPetrified(statusSnapshot, partyMembers.map((c) => c.id))) {
      setPhase("defeat");
      return;
    }

    if (updatedEnemies.every((en) => en.hp <= 0)) onWaveCleared();
    else startQuestion(difficultyRef.current); // すぐ次の問題
  }

  // 戦闘開始時に一度だけ「START!」を出す。BattleFXの初期化(子のuseEffect)は
  // このuseEffectより先に走るので、マウント直後でもfxRef.currentは使える。
  useEffect(() => {
    fxRef.current?.playStartBanner();
    const t = setTimeout(() => startQuestion(difficultyRef.current), 1100); // START!のあと最初の問題
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 敵の行動ゲージ：問題に向き合っている間(question)だけ0.1秒刻みで減る。0で敵が行動。
  latestRef.current = { onGaugeZero: doEnemyCycle };
  useEffect(() => {
    if (phase !== "question") return undefined;
    const id = setInterval(() => {
      gaugeRef.current -= 0.1;
      if (gaugeRef.current <= 0) {
        gaugeRef.current = 0;
        setGaugeSec(0);
        latestRef.current.onGaugeZero?.(); // 敵が行動→ゲージは30秒に戻り、タイマーは動き続ける
        return;
      }
      setGaugeSec(gaugeRef.current);
    }, 100);
    return () => clearInterval(id);
  }, [phase]);

  // バトルに勝った：解答の記録をサーバーへ送り、**サーバーが認めた報酬**を受け取る（自己申告は使わない）。
  async function finishBattle() {
    if (kind !== "subUnit" || params.demo) { // 章ボス・デモ戦はサーバー申請なし（報酬なし）
      nav.go("reward", { ...params, res: null }, { replace: true });
      return;
    }
    setPhase("claiming");
    const claim = {
      nonce: (globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`),
      pv: PROBLEM_VERSION,
      grade, chapterId, kind, subUnitId: params.subUnitId,
      startedAt: battleStartRef.current,
      endedAt: actions.serverNow(),
      attempts: attemptsRef.current,
    };
    const res = await actions.claimBattle(claim);
    nav.go("reward", { ...params, res }, { replace: true });
  }

  if (!enemies.length) return null;

  return (
    <div className="mw-screen">
      <div className="mw-topbar mw-battle-topbar">
        <span>
          {waveIndex + 1} / {encounters.length}戦目
        </span>
        <span>{topSubjectLabel}のバトル</span>
        <FxSpeedToggle speed={fxSpeed} onChange={changeFxSpeed} />
      </div>

      {/* 敵の行動ゲージ：0秒で敵が動く。不正解で小単元ごとの満タン時間の半分だけ進む。 */}
      <div className={`mw-gauge ${gaugeSec / gaugeMax <= .25 ? "mw-gauge-danger" : ""}`}>
        <div className="mw-gauge-label">敵の行動まで</div>
        <div className="mw-gauge-track">
          <div className="mw-gauge-fill" style={{ width: `${Math.max(0, (gaugeSec / gaugeMax) * 100)}%` }} />
        </div>
        <div className="mw-gauge-sec">{Math.ceil(gaugeSec)}秒</div>
        {penaltyFlash > 0 && (
          <div key={penaltyFlash} className="mw-gauge-penalty">−{Math.round(gaugeMax / 2)}秒！</div>
        )}
      </div>

      {/* 敵とパーティを1つの舞台にまとめる：たまが「選んだキャラの位置」から
          飛べるように、敵の攻撃がパーティの上に出せるように、両方が同じ
          座標系の上にいる必要があるため。FXのCanvasはこの舞台全体に1枚だけ重ねる。 */}
      <div className="mw-panel mw-battle-stage" ref={stageRef}>
        <BattleFX ref={fxRef} speed={fxSpeed} />

        <div className="mw-enemy-area">
          <div className="mw-enemy-row">
            {enemies.map((en, enIndex) => {
              const defeated = en.hp <= 0;
              return (
                <div
                  key={en.instanceId}
                  className={`mw-enemy-slot ${shakingIds.has(en.instanceId) ? "mw-shake" : ""} ${
                    lungingIds.has(en.instanceId) ? "mw-lunge" : ""
                  } ${defeated ? "mw-enemy-defeated" : ""} ${
                    hoverTargetId === en.instanceId ? "mw-enemy-drop-hover" : ""
                  }`}
                  style={{ "--bob-delay": `${enIndex * 0.35}s` }}
                  ref={(el) => {
                    enemyRefs.current[en.instanceId] = el;
                  }}
                >
                  <MonsterPortrait character={en} size="full" frameless />
                  <div className="mw-enemy-name">{en.name}</div>
                  {/* 相手の正確なHPはあえて隠す（2026-09-18指示）。バーだけ残す。 */}
                  <div className="mw-hpbar" style={{ width: "90%" }}>
                    <div style={{ width: `${Math.max(0, (en.hp / en.maxHp) * 100)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className={`mw-party-area ${partyShake ? "mw-shake" : ""}`} ref={partyAreaRef}>
          {/* タップ直後だけ出す説明（あと何問／スキル発動確認）。2026-09-18追加。 */}
          {tapInfo && <div className="mw-tap-info-banner">{tapInfo.text}</div>}
          <div className="mw-party-row" style={{ marginBottom: 10 }}>
            {partyMembers.map((c) => {
              const hasSkill = !!c.skill;
              const g = gauge[c.id] || 0;
              const ready = hasSkill && g >= skillGaugeMaxFor(c);
              const popped = !!poppedOut[c.id];
              const statusEffects = partyStatus[c.id];
              return (
                <button
                  key={c.id}
                  className="mw-portrait-btn"
                  ref={(el) => {
                    portraitRefs.current[c.id] = el;
                  }}
                  disabled={phase !== "question"}
                  onPointerDown={(e) => handlePortraitPointerDown(e, c.id)}
                >
                  {/* 名前は表示せず絵柄を大きく（2026-09-18指示）。満タンだと枠が光り、
                      少しホワンホワンと拡縮する（MonsterPortraitのready→mw-portrait-ready）。 */}
                  <MonsterPortrait character={c} size="small" ready={ready} />
                  {statusEffects && (
                    <div className="mw-status-row mw-status-row-overlay">
                      {Object.entries(statusEffects).map(([key, state]) => (
                        <span key={key} className="mw-status-chip" title={key}>
                          {STATUS_ICON[key]}
                          {state.turnsLeft ?? ""}
                        </span>
                      ))}
                    </div>
                  )}
                  {/* 攻撃の瞬間、枠から全体のイラストが縦横2倍の大きさで飛び出す */}
                  {monsterImageUrl(c, "full") && (
                    <div className={`mw-portrait-popup ${popped ? "mw-popup-show" : ""}`}>
                      <img
                        src={monsterImageUrl(c, "full")}
                        alt=""
                        style={{ filter: monsterImgFilter(c) }}
                      />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
          <div className="mw-hpbar">
            <div style={{ width: `${Math.max(0, (partyHp / partyMaxHp) * 100)}%` }} />
          </div>
          <div className="mw-sub">
            {partyHp} / {partyMaxHp}
          </div>
          {(partyBuffs.atk || partyBuffs.guard) && (
            <div className="mw-buff-row">
              {partyBuffs.atk && (
                <span className="mw-buff-chip mw-buff-atk">
                  ⚔️×{partyBuffs.atk.multiplier}（あと{partyBuffs.atk.turnsLeft}）
                </span>
              )}
              {partyBuffs.guard && (
                <span className="mw-buff-chip mw-buff-guard">
                  🛡️×{partyBuffs.guard.multiplier}（あと{partyBuffs.guard.turnsLeft}）
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {dragGhost && (
        <div
          className="mw-drag-ghost"
          style={{ left: dragGhost.x, top: dragGhost.y }}
        >
          <MonsterPortrait character={charactersById[dragGhost.charId]} size="small" frameless />
        </div>
      )}

      {cutIn && (
        <UltimateCutIn
          key={cutIn.id}
          ultimate={{ icon: cutIn.skill.icon || "✦", name: cutIn.skill.name, color: cutIn.character.color || "#9be7ef" }}
          heroSrc={monsterImageUrl(cutIn.character, "full")}
          speed={fxSpeed}
          onComplete={() => {
            const pending = cutIn;
            setCutIn(null);
            resolveSkillAfterCutIn(pending);
          }}
        />
      )}

      {/* 満タンのキャラをタップしたときの「使う/使わない」確認（2026-09-18追加）。 */}
      {skillConfirm && charactersById[skillConfirm]?.skill && (
        <div className="mw-modal-backdrop" onClick={() => setSkillConfirm(null)}>
          <div className="mw-modal-card" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <div style={{ width: 56 }}>
                <MonsterPortrait character={charactersById[skillConfirm]} size="small" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800 }}>
                  {charactersById[skillConfirm].skill.icon} {charactersById[skillConfirm].skill.name}
                </div>
                {charactersById[skillConfirm].skill.desc && (
                  <div style={{ opacity: 0.8, fontSize: "0.8rem" }}>
                    {charactersById[skillConfirm].skill.desc}
                  </div>
                )}
              </div>
            </div>
            <div style={{ fontWeight: 700, textAlign: "center" }}>スキルを発動しますか？</div>
            <div style={{ display: "flex", gap: 10 }}>
              <button className="mw-btn primary" style={{ flex: 1 }} onClick={() => activateSkill(skillConfirm)}>
                使う
              </button>
              <button className="mw-fantasy-back" style={{ flex: 1 }} onClick={() => setSkillConfirm(null)}>
                使わない
              </button>
            </div>
          </div>
        </div>
      )}

      {(phase === "question" || phase === "enemyAttack" || phase === "skill") && problem && (
        <div className={`mw-panel mw-question-panel ${phase === "enemyAttack" || phase === "skill" ? "mw-choices-locked" : ""} ${phase === "skill" ? "mw-skill-locked" : ""}`}>
          <div className="mw-question"><QuestionText text={problem.question} /></div>
          <div className="mw-choices">
            {problem.choices.map((choice, i) => (
              <button key={i} className="mw-choice" disabled={phase !== "question"} onClick={() => pickChoice(i)}>
                <MathText>{choice}</MathText>
              </button>
            ))}
          </div>
          {/* つぎの問題の難しさ：いつでも切替OK（いまの問題はそのまま）。むずかしいほどダメージ大。 */}
          <div className="mw-diff-row" style={{ marginTop: 10 }}>
            {DIFFICULTY_KEYS.map((d) => (
              <button
                key={d}
                className={`mw-diff-btn ${difficulty === d ? "selected" : ""}`}
                disabled={phase !== "question"}
                onClick={() => pickDifficulty(d)}
              >
                {DIFFICULTY_LABEL[d]}
                <span className="mw-diff-mult">×{DIFFICULTY_DAMAGE_MULTIPLIER[d]}</span>
              </button>
            ))}
          </div>
          <div className="mw-sub" style={{ textAlign: "center", marginTop: 4 }}>
            ↑ つぎの問題のむずかしさ（今の問題は「{DIFFICULTY_LABEL[problem.level] || ""}」）
          </div>
        </div>
      )}

      {phase === "claiming" && (
        <div className="mw-panel mw-center" style={{ minHeight: 70 }}>
          <div className="mw-sub">けっかを確認しているよ…</div>
        </div>
      )}

      {phase === "defeat" && (
        <div className="mw-panel mw-center">
          <div>ぜんめつしてしまった…</div>
          <button className="mw-btn primary" onClick={() => nav.exit()}>
            メニューにもどる
          </button>
        </div>
      )}
    </div>
  );
}
