// ============================================================
// App.jsx — アプリ全体のまとめ役（薄く保つ）
//  - 保存データ(player/records/mistakes)を読み込んで持つ
//  - 画面の切り替え（ルーティング）
//  - XP加算・星保存・結果保存などの「データ更新」を一手に引き受ける
// ゲームのルールは engine/ に、問題は data/ に、保存は store/ にあるので、
// このファイルは「つなぐだけ」。
// ============================================================
import { useState, useEffect, useRef, lazy, Suspense } from "react";
import { worldBattleFor } from "./third/link.js";
import ThirdMenu from "./third/menu/ThirdMenu.jsx";
import AlarmOverlay from "./third/menu/AlarmOverlay.jsx";
import MedalToast from "./third/menu/MedalToast.jsx";
import { chapterBattlesCleared } from "./third/core.js";
import { thirdApi, THIRD_SERVER } from "./third/thirdApi.js";
import { isGuest } from "./auth/session.js";
import { setViewGrade } from "./third/gradeView.js";
// マルチプレイ（みんなで戦う）は一旦非公開。開発者の確認用に URL に ?multi=1 を付けた時だけ出す。公開するときは true にする
const MULTIPLAY_OPEN = (() => { try { return new URLSearchParams(location.search).has("multi"); } catch { return false; } })();
import { startSessionPing } from "./third/sessionPing.js";
import { flushBattleLogs } from "./third/battleLog.js";
import * as store from "./store/localStore.js"; // ★将来ここを supabase.js に差し替える
import { submitAttempt, serverActive, loadServerState } from "./sync/serverSync.js"; // サーバー権威(Lv2)。AUTH無効時はno-op
import { AUTH_ENABLED } from "./auth/supabase.js";
import { updateNickname, submitFeedback, getMyClassCode } from "./auth/kidAuth.js";
import { getQuizWeakUnits } from "./data/quizLink.js";
import { logAnswer } from "./store/answerLog.js";
import { getRememberedId } from "./auth/loginPrefs.js";
import { makeRecord, makeMistake } from "./store/recordSchema.js";
import { levelFromXp, xpForLevel, playerLevel, playerXp, timeAttackCrystal, RELEARN_XP_PER_CORRECT, questionCoin, CYCLE_PRACTICE_TARGET, CYCLE_RELEARN_TARGET, MASTER_CYCLE_COIN, MASTER_CYCLE_CRYSTAL, isUnitCycleCleared, REST_CYCLES_SOFT, restMultiplier, RELEARN_STREAK_TARGET, RELEARN_CONFIRM_COIN } from "./engine/scoring.js";
import { genProblem, genProblemSeeded, makeChoices } from "./engine/generator.js";
import { updateMastery, levelDifficulty, INITIAL_MASTERY } from "./engine/mastery.js";
import * as bgm from "./audio/bgm.js";
import * as sfx from "./audio/sfx.js";

import StartScreen from "./screens/StartScreen.jsx";
import Opening from "./screens/Opening.jsx";
import Transfer from "./screens/Transfer.jsx";
import { computeLogin, canClaimLogin, goldenMultiplier, eventXpMult, eventCoinMult, eventCrystalMult, eventRelearnMult, eventCalcMult, eventTaCoinMult, eventGachaBonus } from "./engine/daily.js";
import TitleScreen from "./screens/TitleScreen.jsx";
import AudioToggle from "./components/AudioToggle.jsx";
import LevelUpOverlay from "./components/LevelUpOverlay.jsx";
import Home from "./screens/Home.jsx";
import ChapterSelect from "./screens/ChapterSelect.jsx";
import HaichiMode from "./screens/HaichiMode.jsx"; // はいちモード（葉一さんのレッスン一覧）
import HaichiStudio from "./screens/HaichiStudio.jsx"; // 動画＋ワークシートのスタジオ（他モードからも開く）
import { findHaichiLessonForUnit } from "./data/haichiCourse.js";
const Lesson = lazy(() => import("./screens/Lesson.jsx")); // pdf.jsが重いので開いた時だけ読み込む
import { lessonMediaFor } from "./data/lessonMedia.js";
import TimeAttack from "./screens/TimeAttack.jsx";
import SlowMode from "./screens/SlowMode.jsx";
import Notebook from "./screens/Notebook.jsx";
import Relearn from "./screens/Relearn.jsx";
import BattleSelect from "./screens/BattleSelect.jsx";
import Battle from "./screens/Battle.jsx";
import TurnBattle from "./screens/TurnBattle.jsx";
import UnitTestSelect from "./screens/UnitTestSelect.jsx";
import UnitTest from "./screens/UnitTest.jsx";
import StepUp from "./screens/StepUp.jsx";
import StepUpSimple from "./screens/StepUpSimple.jsx";
import Shop from "./screens/Shop.jsx";
import Challenge from "./screens/Challenge.jsx";
import CalcPracticePick from "./screens/CalcPracticePick.jsx";
import Skill from "./screens/Skill.jsx";
import StatusDetail from "./screens/StatusDetail.jsx";
import Admin from "./screens/Admin.jsx";
import Character from "./screens/Character.jsx";
import Feedback from "./screens/Feedback.jsx";
import { HERO_PRICE } from "./data/heroes.js";
import HowTo from "./screens/HowTo.jsx";
import Clinic from "./screens/Clinic.jsx";
const ThirdApp = lazy(() => import("./third/ThirdApp.jsx")); // math-worldのバトル/パーティ編成（pixi.jsが重いので開いた時だけ）
const DialogueLesson = lazy(() => import("./screens/DialogueLesson.jsx")); // 対話授業（試作）。questionBank等を開いた時だけ読む
const TeacherMode = lazy(() => import("./screens/TeacherMode.jsx")); // 教師モード（誤答駆動ノードグラフ＋黒板＋TTS）。1139問ぶんのteacher_modeを再生
import Collection from "./screens/Collection.jsx";
import { findItem, treatCost } from "./engine/items.js";
import { getPlayerBattleStats, BATTLE_SKILLS, battleBonuses, isCalcKingCleared, CALC_KING_CLEAR_STREAK, CALC_KING_CLEAR_CRYSTAL, findSkill, rollSkillGachaNew, SKILL_RARITY, SKILL_GACHA_COST_1, genBattleProblem } from "./engine/battle.js";
import { MONSTERS, findMonster } from "./data/monsters.js";
import Partners from "./screens/Partners.jsx";
import { feedCost, partnerMaxLevel, recruitChance, PARTY_MAX, partnerHpLv, partnerAtkLv } from "./engine/partners.js";
import { unitFullyStarred, nextCycleCounts, naosuSatisfied, levelAfterClear, reviewMilestonesToGrant, ratchetSkillStats, initDifficulty, nextDifficulty } from "./engine/progress.js";
import { foldSequence } from "./engine/unitMastery.js";
import { isUnitMonsterUnlocked, isChapterMastered } from "./engine/unlock.js";
import { rollChapterSkillGacha, chapterSkillTier, CHAPTER_SKILLS, SKILL_RANK_ORDER_WITH_D, chapterSkillLevelUpCost } from "./data/chapterSkills.js";
import { chapterBPCap, adjustBP, BP_MIN } from "./engine/battleTurn.js";
import { findItem as findItemDef, rollItemGacha, ITEM_STOCK_MAX, ITEM_BRING_MAX, itemGachaCost } from "./data/items.js";
import { ULTIMATES, findUltimate, rollUltimateGacha, ultimateGachaCost } from "./data/ultimates.js";
import Loadout from "./screens/Loadout.jsx";
import Items from "./screens/Items.jsx";
import Ultimates from "./screens/Ultimates.jsx";
import StatusMeter from "./screens/StatusMeter.jsx";
import StudyLog from "./screens/StudyLog.jsx";
import { challengeXp } from "./data/challenge.js";
import { CHAPTERS, LEVEL_KEYS, chaptersForGrade, allChapters, findChapterByUnitId, findUnitById, findChapterById } from "./data/index.js";
import { getWeakUnits, buildWeakUnit } from "./engine/weakness.js";
import { findScaffold } from "./engine/scaffold.js";
import Diagnose from "./screens/Diagnose.jsx";
import { rollGacha, findGear, defaultGacha, GACHA_COST, GEAR_STONE_CAP } from "./engine/gear.js";

const todayStr = () => new Date().toLocaleDateString("ja-JP");

// はいちモードの報酬（動画ごとに1回だけ）：視聴ボーナス／練習合格ボーナス
const HAICHI_WATCH_XP = 20, HAICHI_WATCH_COIN = 10;
const HAICHI_PASS_XP = 30, HAICHI_PASS_COIN = 30;

export default function App() {
  const [data, setData] = useState(() => store.load());
  const [screen, setScreen] = useState("start");
  const [menuPos, setMenuPos] = useState({ view: "main" }); // メニューの現在位置（はいち/練習/バトルから戻った時に同じ画面へ戻す）
  const [menuConfirm, setMenuConfirm] = useState(false); // 左上のロゴを押した→「トップメニューに戻りますか？」
  useEffect(() => {
    const onReq = () => {
      if (screen === "home" && (menuPos?.view || "main") === "main") return; // もうトップメニュー
      setMenuConfirm(true);
    };
    window.addEventListener("ml3:requestMenu", onReq);
    return () => window.removeEventListener("ml3:requestMenu", onReq);
  }, [screen, menuPos]);
  // ---- メダル（サーバーが付与）：れんしゅう・確認問題の解答をサーバーへ送り、認められたメダルだけを表示する ----
  const [thirdState, setThirdState] = useState(null); // サーバーの状態（メダル・仲間・チケット…）。未取得の間は null
  const [medalToast, setMedalToast] = useState(null);
  const practiceBufRef = useRef([]);
  const confirmBufRef = useRef([]);
  const flushTimerRef = useRef(null);
  const [alarmRinging, setAlarmRinging] = useState(false); // 設定のアラームが鳴っている
  const [thirdStart, setThirdStart] = useState(null); // 数学ラボ3：ワールド式バトル/パーティ編成の開始画面
  // 初回起動か？（v4からの引き継ぎ画面を出すか）。既に進捗がある人には出さない。
  //  ログイン制（Supabase認証）の生徒は「前のアプリ」を触ったことが無く、戦闘システムも
  //  刷新済みで旧データの引き継ぎに意味が無いため、引き継ぎ画面自体を出さない。
  const [needsOnboard, setNeedsOnboard] = useState(() => {
    if (AUTH_ENABLED) return false;
    try { if (localStorage.getItem("ml3_onboarded")) return false; } catch {}
    const p = store.load().player || {};
    const wx = p.worldXp || {};
    const hasProgress =
      ((wx[1] || 0) + (wx[2] || 0) + (wx[3] || 0)) > 0 || (p.xp || 0) > 0 ||
      (p.coins || 0) > 0 || (p.stars && Object.keys(p.stars).length > 0) || (p.name || "").length > 0;
    if (hasProgress) { try { localStorage.setItem("ml3_onboarded", "1"); } catch {} return false; }
    return true;
  });
  const markOnboarded = () => { try { localStorage.setItem("ml3_onboarded", "1"); } catch {} setNeedsOnboard(false); };
  const [mode, setMode] = useState("timeAttack"); // どのモードで章選択に来たか
  // 選択中の学年＝現在いる「ワールド」。完全ワールド分離でレベル(atk/HP)もこの学年のもの。
  const [grade, setGrade] = useState(() => data.player.world || 1);
  // ホームのタブ："adventure"=ぼうけん(本線サイクル) / "reward"=ごほうび / "record"=きろく / "settings"=せってい。
  // 毎回「本線(ぼうけん)」から始める＝飲まれの入口（ゲーム/学習の二択フォーク）を廃止（§10 Step2）。
  const [homeMode, setHomeMode] = useState("adventure");
  const [prestigeAsk, setPrestigeAsk] = useState(false);    // 「もう一周」確認ダイアログ
  const [prestigeDone, setPrestigeDone] = useState(null);   // 周回開始の演出（何周目か）
  const [sel, setSel] = useState({ chapter: null, unit: null, level: null });
  const [battleMonster, setBattleMonster] = useState(null); // 選択中のモンスター
  const [battlePractice, setBattlePractice] = useState(null); // 演習バトル中の単元（null=通常のモンスターバトル）
  const [scaffold, setScaffold] = useState(null); // 足場（前提もどり）{ skillId, skillName, unit, returnTo }
  const [diagnoseChapter, setDiagnoseChapter] = useState(null); // B-3「どこから始める？」診断中の章
  const skillStatsRef = useRef(data.player.skillStats || {}); // 演習バトルの適応出題が最新の習熟度を読むため
  const battleDiffRef = useRef(initDifficulty("standard")); // ④ 演習バトルの難易度ナビ（普通開始／2ミス↓／5連正解↑）
  // #2 通常バトル（相手えらび→戦闘）にも同じ難易度ナビを接続。モンスターごとの固定[standard,standard,advanced]列を廃止。
  const battleGeneralDiffRef = useRef(initDifficulty("standard"));
  // 直前に出した問題が「誤答束の変種」だった場合の出所を覚えておく（{unitId,q} or null）。
  //  正解した瞬間にどの単元の学び直しを進めるか／「なおしずみ」演出を出すかの判定に使う。
  const battleMistakeSourceRef = useRef(null);
  useEffect(() => { skillStatsRef.current = data.player.skillStats || {}; }, [data.player.skillStats]);
  const [battleKey, setBattleKey] = useState(0); // 「もう一度」で戦闘をやり直す用
  const [utChapter, setUtChapter] = useState(null); // 単元テストの対象章
  const [lessonUnit, setLessonUnit] = useState(null); // 「動画＋ワークシート」レッスンの対象単元
  const [haichiStudio, setHaichiStudio] = useState(null); // 他モードから開く動画スタジオ { grade, section, lesson, ret }
  const [levelUpTo, setLevelUpTo] = useState(null); // レベルアップ演出（上がった先のレベル）
  const loginCheckedRef = useRef(false);              // 今セッションでログイン判定済みか
  const [skillGet, setSkillGet] = useState(null); // スキル入手演出（章ボス撃破）
  const [crystalGet, setCrystalGet] = useState(null); // クリスタル入手演出 { amount }
  const [gearStoneGet, setGearStoneGet] = useState(null); // 剣石・鎧石の入手演出（応用クリア）
  const [relearnMastered, setRelearnMastered] = useState(null); // 学び直し完全クリア演出（翌日確認）{ unitName, count, reward }
  const [relearnPended, setRelearnPended] = useState(null); // 〈仮なおし〉演出（その場2連続正解）{ unitName, count }
  const [naoshizumi, setNaoshizumi] = useState(null); // #2 バトル中に誤答束の変種を正解した時の軽い演出 { unitName }
  const [recruitResult, setRecruitResult] = useState(null); // 仲間チャレンジの結果演出 { ok, name }
  const baitUsedRef = useRef(null); // 今のバトルで「魔物のエサ」を使った敵のid
  const [calcKingClear, setCalcKingClear] = useState(null); // 計算王クリア演出（バトル攻撃力アップ）
  const [newMonster, setNewMonster] = useState(null); // 新モンスター出現演出（タイムアタックで解放）
  const [relearnFocus, setRelearnFocus] = useState(null); // 学び直しを1単元にしぼる（サイクルのなおす由来）。null=弱点克服モード（全部）
  const [teacherFocus, setTeacherFocus] = useState(null); // 講義→教師モードで開いた単元 { chapterId, unit }。null=通常の教師モード
  const [weakKey, setWeakKey] = useState(0); // 苦手タイムアタックの再挑戦（もう一回）でリセットする用
  const [practiceUnit, setPracticeUnit] = useState(null); // 間違いノートの単元別じっくり練習で選んだ単元
  const [calcChapter, setCalcChapter] = useState(null); // 計算王への道で選んだ単元（章）
  const challengeBackRef = useRef("calcKingPick"); // 応用(challenge)の「戻る」先。小単元から直接来た時は"home"
  const pendingMonsterRef = useRef(null); // レベルアップ演出の後に出すための保留枠
  // #4 サイクル初クリア直後（有能感のピーク）に「応用の扉」を出すための保留枠。
  //  レベルアップ演出のonDoneで消費する（levelUpTo/newMonsterと同じ「演出の順番待ち」流儀）。
  const pendingApplyGateRef = useRef(null);
  const [applyGate, setApplyGate] = useState(null); // { chapterId, chapterName, unitName }

  // player を更新して保存する共通関数
  function updatePlayer(updater) {
    setData((d) => {
      const player = store.savePlayerState(updater(d.player));
      return { ...d, player };
    });
  }

  // 誤答タグの累計（価値づけ）：診断タグ付きdistractorで間違えるたびに積み上がる、自分専用の「誤答パターン地図」。
  //  学び直しノート(mistakes)の増減とは独立で、消えずに積み上がり続ける（skillStatsと同じ思想）。
  function bumpMistakeTag(tag, unitId) {
    if (!tag) return;
    updatePlayer((p) => {
      const stats = { ...(p.mistakeTagStats || {}) };
      const prev = stats[tag] || { count: 0, unitId: null, lastDate: null };
      stats[tag] = { count: prev.count + 1, unitId: unitId || prev.unitId, lastDate: todayStr() };
      return { ...p, mistakeTagStats: stats };
    });
  }

  // ログイン制でニックネーム未設定（新規登録直後など）なら、ログインIDを初期値として入れる。
  //  ＝「最初はIDが名前として認識」。あとは設定（キャラクター画面）でいつでも変更可能。
  useEffect(() => {
    if (!AUTH_ENABLED) return;
    if (data.player.name) return; // 既に名前がある（設定済み or 前のアプリから引き継ぎ済み）なら何もしない
    const id = getRememberedId();
    if (id) setName(id);
  }, []); // eslint-disable-line

  // ── Step5：サーバー権威への切替（安全な範囲）───────────────────────
  //  サーバー(applyAttempt)が完全・正しく把握しているのは cycle（進捗）＋haichiPassed（講義合格）だけ。
  //  表示される「レベル」は playerLevel = 1 + クリア単元数 = cycle 由来なので、ここを渡すだけで
  //  6/28で報告された「レベル改ざん」を実質的に閉じられる。
  //  コイン・クリスタル・ガチャ・装備・XP等はサーバーが把握していない（Lv2の対象外）ため、
  //  絶対に上書きしない＝生徒がためたものは消えない。
  //  ログインのたびに一度だけ実行。サーバーにまだ記録が無い（cycleが空）ユーザーは何もしない
  //  （ローカルの初回進捗を消さないため。裏送信が進めば次回ログインから反映される）。
  useEffect(() => {
    if (!serverActive()) return;
    let alive = true;
    loadServerState().then((s) => {
      if (!alive || !s || !s.cycle || Object.keys(s.cycle).length === 0) return;
      updatePlayer((p) => ({
        ...p,
        cycle: s.cycle,
        worldCleared: s.worldCleared || p.worldCleared,
        haichiPassed: { ...(p.haichiPassed || {}), ...(s.haichiPassed || {}) },
      }));
    });
    return () => { alive = false; };
  }, []); // eslint-disable-line

  // 小テストアプリ(quiz/)との連携：ログインIDが小テストの学籍ID(E-101236形式)と同じなら、
  //  小テストで正答率の低かった回を数学ラボ2の単元にマップして「苦手みつかった」に出す。
  //  取れなくても（quiz未登録・通信エラー等）何もしない＝本体の動作に影響しない。
  const [quizWeakUnits, setQuizWeakUnits] = useState([]);
  useEffect(() => {
    if (!AUTH_ENABLED) return;
    let alive = true;
    getMyClassCode().then((code) => getQuizWeakUnits(code)).then((units) => {
      if (alive) setQuizWeakUnits(units);
    });
    return () => { alive = false; };
  }, []); // eslint-disable-line

  // ワールド（学年）を切り替える。レベル/atk/HP はこのワールドのXPで決まるので、
  // 表示用 grade と保存用 player.world を必ず同期させる。
  function setWorld(g) {
    const w = [1, 2, 3].includes(g) ? g : 1;
    setGrade(w);
    updatePlayer((p) => (p.world === w ? p : { ...p, world: w }));
  }

  // ホームのタブ切り替え（§10 Step2）。本線(ぼうけん)が既定なので保存は不要。
  function chooseHomeMode(m) {
    setHomeMode(m);
  }

  // 他モード（学び直し／タイムアタック／あんしん）から、その単元に対応する
  //  葉一さんの「動画＋ワークシート（書き込み）」スタジオを開く。ret=閉じたときの戻り先screen。
  function openHaichiStudio(unit, ret) {
    const found = unit && findHaichiLessonForUnit(unit.id);
    if (!found) return; // 対応する動画が無ければ何もしない（ボタンは対応がある時だけ出す）
    // 王道サイクルの①講義：その単元の動画を開いたら lecture 済みにする（§10 Step3）
    if (unit?.id) updatePlayer((p) => {
      const cyc = { ...(p.cycle || {}) };
      cyc[unit.id] = { practiceN: 0, relearnN: 0, appliedN: 0, done: false, ...(cyc[unit.id] || {}), lecture: true };
      return { ...p, cycle: cyc, cycleLast: unit.id };
    });
    setHaichiStudio({ ...found, ret });
    setScreen("haichiStudio");
  }

  // 教師モードの中から「確認問題」へ直行（講義クリア用）。終わったら教師モードに戻す。
  //  対応する葉一動画が無い単元（例：四則混合の複合・確率など）は、教師モードの説明を
  //  講義がわりとし、その単元から直接5問の確認問題を出す（合格＝markNoVideoLecturePassed）。
  function goConfirmQuiz(unit, ret = "teacherMode") {
    if (!unit?.id) return;
    const found = findHaichiLessonForUnit(unit.id);
    updatePlayer((p) => {
      const cyc = { ...(p.cycle || {}) };
      cyc[unit.id] = { practiceN: 0, relearnN: 0, appliedN: 0, done: false, ...(cyc[unit.id] || {}), lecture: true };
      return { ...p, cycle: cyc, cycleLast: unit.id };
    });
    if (found) { setHaichiStudio({ ...found, ret }); }
    else { setHaichiStudio({ grade: null, section: null, lesson: null, unit, noVideo: true, ret }); }
    setScreen("haichiStudioPractice");
  }

  // 動画が無い単元の講義クリア（教師モード＋確認問題5問・正答率80%以上）。1回だけ報酬。
  function markNoVideoLecturePassed(unitId) {
    if (unitId) sendConfirm("nv:" + unitId); // 動画が無い単元の確認問題：メダルはサーバーが認めた時だけ付く
    if (!unitId || data.player.noVideoLecturePassed?.[unitId]) return;
    updatePlayer((p) => ({
      ...p,
      noVideoLecturePassed: { ...(p.noVideoLecturePassed || {}), [unitId]: todayStr() },
      coins: (p.coins ?? 0) + HAICHI_PASS_COIN,
    }));
    addXp(HAICHI_PASS_XP);
  }

  // 周回（プレステージ）：その学年の魔王を「今の周回で」倒したか
  const curPrestige = (g) => (data.player.prestige && data.player.prestige[g]) || 0;
  function maouCleared(g) {
    const cp = curPrestige(g);
    return (data.records || []).some((r) => r.mode === "battle" && r.extra?.result === "win" && r.extra.monsterId === `boss_maou_${g}` && (r.extra.prestige || 0) === cp);
  }
  // 「もう一周」：その学年の星と撃破報酬だけリセット（お金/クリスタルがまた入る）。
  //  強さ(worldXp)・お金・クリスタル・装備・アイテム・スキル・仲間・図鑑(記録)は維持。
  function doPrestige() {
    const g = grade;
    let lap = 2;
    updatePlayer((p) => {
      const stars = { ...(p.stars || {}) };
      for (const ch of chaptersForGrade(g)) for (const u of ch.units) for (const l of LEVEL_KEYS) delete stars[`${u.id}-${l}`];
      const prestige = { ...(p.prestige || {}) };
      prestige[g] = (prestige[g] || 0) + 1;
      lap = prestige[g] + 1; // 「いま何周目」（1周クリア→2周目）
      return { ...p, stars, prestige, currentHp: null }; // HP全回復してスタート
    });
    setPrestigeAsk(false);
    setHomeMode("reward"); // 周回は「ごほうび」タブの機能
    setScreen("home");
    setTimeout(() => setPrestigeDone(lap), 300);
  }

  // 小単元の習得確認ポイントを更新（bools = その単元の正誤を時系列で並べた配列）
  function bumpUnitMastery(unitId, bools) {
    if (!unitId || !bools || bools.length === 0) return;
    updatePlayer((p) => {
      const um = { ...(p.unitMastery || {}) };
      um[unitId] = foldSequence(um[unitId], bools);
      return { ...p, unitMastery: um };
    });
  }

  // XPを加算（同時に連続学習日数も更新）。
  //  ※レベルはXPでは上がらない（レベル＝サイクルをクリアした単元数）。
  //    XPは記録・後方互換のために貯め続けるだけ。レベルアップ演出はサイクルクリア側で出す。
  function addXp(gain) {
    updatePlayer((p) => {
      const isNewDay = p.lastDate !== todayStr();
      const cyclesToday = (p.daily && p.daily.date === todayStr()) ? (p.daily.cycles || 0) : 0; // 休憩：本日の完了サイクル数
      const g = Math.round(gain * goldenMultiplier(p, Date.now(), todayStr()) * eventXpMult() * restMultiplier(cyclesToday)); // ×ゴールデン1.2・月曜1.5・休憩逓減
      const w = p.world || 1;
      const wx = p.worldXp || { 1: 0, 2: 0, 3: 0 };
      const cur = wx[w] || 0;
      return {
        ...p,
        worldXp: { ...wx, [w]: cur + g }, // 現在ワールドのXPだけ増やす（記録用）
        streaks: isNewDay ? p.streaks + 1 : p.streaks,
        lastDate: todayStr(),
      };
    });
  }

  // タイムアタック1回の結果を保存
  function saveTimeAttackResult({ chapter, unit, level, correct, wrong, stars, maxStreak, xp, coins = 0, results, dailyBonus = 0 }) {
    const sid = data.player.studentId;
    // 1) 記録を追加
    store.addRecord(makeRecord({
      studentId: sid, mode: "timeAttack",
      chapterId: chapter.id, unitId: unit.id, level,
      correct, wrong, stars, xp, maxStreak,
    }));
    // 達成ベースのコイン（反復でなく「初クリア」「単元制覇」で出す）
    const akey = `${unit.id}-${level}`;
    const prevStar = (data.player.stars && data.player.stars[akey]) || 0;
    const firstClear = prevStar === 0 && stars >= 1;
    let masteredNow = false;
    if (firstClear) {
      const sNow = { ...(data.player.stars || {}), [akey]: stars };
      masteredNow = LEVEL_KEYS.every((l) => (sNow[`${unit.id}-${l}`] || 0) >= 1);
    }
    const FIRST_CLEAR_COIN = 50, MASTER_BONUS_COIN = 200;
    const bonusCoin = (firstClear ? FIRST_CLEAR_COIN : 0) + (masteredNow ? MASTER_BONUS_COIN : 0); // 達成ベースのコイン
    // 曜日イベント：水曜=お金2倍 / 土曜=タイムアタックのコイン2倍（両方かかれば乗算）
    const coinMult = eventCoinMult() * eventTaCoinMult();
    const earnedCoins = Math.round((coins + bonusCoin) * coinMult);
    // クリスタル：星1つ以上＆正答率が一定以上なら毎回+1（連打・あてずっぽうは除外）
    const crystalEarned = timeAttackCrystal({ correct, wrong, stars });
    // 2) 星・くり返しXP履歴(playLog)・コイン・クリスタルを更新
    updatePlayer((p) => {
      const key = `${unit.id}-${level}`;
      const prevLog = (p.playLog && p.playLog[key]) || {};
      return {
        ...p,
        coins: (p.coins ?? 0) + earnedCoins,
        crystals: (p.crystals ?? 0) + crystalEarned,
        stars: { ...p.stars, [key]: Math.max(p.stars[key] || 0, stars) },
        playLog: { ...(p.playLog || {}), [key]: { cleared: prevLog.cleared || stars >= 1, lastDate: todayStr() } },
        // 1日1回ボーナスを得た日を記録（xp に既に加算済み。日付だけスタンプ）
        ...(dailyBonus > 0 ? { lastDailyBonusDate: todayStr() } : {}),
      };
    });
    // 3) 間違いを間違いノートへ
    const mistakes = results.filter((r) => !r.ok).slice(0, 3).map((r) =>
      makeMistake({ studentId: sid, chapterId: chapter.id, unitId: unit.id, level, q: r.q, ans: r.ans })
    );
    const newMistakes = store.addMistakes(mistakes);
    setData((d) => ({ ...d, records: store.load().records, mistakes: newMistakes }));
    // 4) 小単元の習得確認（解いた順の正誤を反映：4連続正解でOK／ミスで-10）
    bumpUnitMastery(unit.id, results.map((r) => !!r.ok));

    // 5) この単元のモンスターが今回のクリアで新たに解放されたか判定
    // 難易度を1つでも★1にすると、その単元のモンスターが解放される（今回のクリアが初の★なら通知）
    const monster = MONSTERS.find((m) => m.kind === "unit" && m.unitId === unit.id);
    let unlockedMon = null;
    if (monster && stars >= 1 && !isUnitMonsterUnlocked(data.player, monster)) {
      unlockedMon = monster;
      markMonstersSeen([monster.id]); // ここで通知するので「既読」にしておく（バトル選択で二重に出さない）
    }

    // 6) XP加算（レベルアップがあれば演出が出る）
    const curWx = playerXp(data.player);
    const willLevelUp = levelFromXp(curWx + xp) > levelFromXp(curWx);
    addXp(xp);

    // 7) 新モンスター出現の通知。レベルアップがあれば演出の後、無ければ少し後に出す
    // 正負(c1)は「出現！」ポップアップを出さない（ためすから直接その敵と戦えるため冗長）。
    if (unlockedMon && (unlockedMon.grade ?? 1) !== 1) {
      if (willLevelUp) {
        pendingMonsterRef.current = unlockedMon; // レベルアップ演出の onDone で出す
      } else {
        setTimeout(() => setNewMonster(unlockedMon), 900);
      }
    }
  }

  // 苦手タイムアタックを開始（もう一回でも呼ぶ＝key更新で画面リセット）
  function startWeakTA() {
    setWeakKey((k) => k + 1);
    setScreen("weakTA");
  }

  // 苦手タイムアタック1回の結果を保存（単元の星は付けず、XP・コイン・間違いだけ反映）
  function saveWeakResult({ correct, wrong, xp, coins = 0, results }) {
    const sid = data.player.studentId;
    store.addRecord(makeRecord({ studentId: sid, mode: "timeAttack", correct, wrong, xp, extra: { weak: true } }));
    const earnedCoins = Math.round(coins * eventCoinMult() * eventTaCoinMult());
    updatePlayer((p) => ({ ...p, coins: (p.coins ?? 0) + earnedCoins }));
    const mistakes = results.filter((r) => !r.ok).slice(0, 3).map((r) =>
      makeMistake({ studentId: sid, q: r.q, ans: r.ans })
    );
    const newMistakes = store.addMistakes(mistakes);
    setData((d) => ({ ...d, records: store.load().records, mistakes: newMistakes }));
    addXp(xp);
  }

  // じっくりモードのクリア結果を保存
  function saveSlowResult({ chapter, unit, level, streak, total, correct, xp, anshin = false, results = [] }) {
    const sid = data.player.studentId;
    store.addRecord(makeRecord({
      studentId: sid, mode: "slow",
      chapterId: chapter.id, unitId: unit.id, level,
      correct, wrong: total - correct, xp, maxStreak: streak,
    }));
    // ★あんしんモードの進行貢献（救済）：クリアした単元に easy★1 を自動付与する。
    //   ・既存の星は下げない（Math.max）。付与するのは easy★1 のみなので、章ボス／魔王に
    //     必要な「ふつう・発展」の星はタイムアタック等で正規に取る必要があり、バランスは保たれる。
    //   ・これで苦手な子も「あんしんで遊ぶ→その単元のモンスターが解放される」進行実感が得られる。
    const rescueKey = `${unit.id}-easy`;
    const levelKey = `${unit.id}-${level}`; // 実際に選んだ難易度（鬼など）
    // くり返しXP用の履歴を更新（じっくり／あんしんは到達＝クリア）＋あんしんなら救済★
    updatePlayer((p) => {
      const key = `${unit.id}-${level}`;
      const next = { ...p, playLog: { ...(p.playLog || {}), [key]: { cleared: true, lastDate: todayStr() } } };
      // あんしんでクリアしたら「選んだ難易度」に★1を付ける（鬼をクリア→鬼が★1＝クリア表示）。
      //  併せて easy にも★1（モンスター解放の救済＝従来動作を維持）。
      if (anshin) {
        next.stars = {
          ...p.stars,
          [levelKey]: Math.max(p.stars?.[levelKey] || 0, 1),
          [rescueKey]: Math.max(p.stars?.[rescueKey] || 0, 1),
        };
      }
      return next;
    });
    // 間違いを学び直しノートへ：同じ「タグ(スキル)」で累計2問まちがえたら、その代表1件を出す。
    //  タグ別カウンタ(player.tagWrong)を持ち越し、2に達したら学び直しへ送ってカウンタを0に戻す。
    //  スキルタグが無い誤答は、この回のなかで同じ小単元2件でフォールバック。
    const wrongs = (results || []).filter((r) => !r.ok);
    const tw = { ...(data.player.tagWrong || {}) };
    // 誤答タグの累計（価値づけ）：学び直しノートに出るかどうかに関わらず、間違えた瞬間に全件積み上げる。
    const mts = { ...(data.player.mistakeTagStats || {}) };
    const unitCount = {};
    const toAdd = [];
    for (const r of wrongs) {
      if (r.mistakeTag) {
        const prev = mts[r.mistakeTag] || { count: 0, unitId: null, lastDate: null };
        mts[r.mistakeTag] = { count: prev.count + 1, unitId: r.unitId || unit.id, lastDate: todayStr() };
      }
      const tag = r.skill;
      if (tag) {
        tw[tag] = (tw[tag] || 0) + 1;
        if (tw[tag] >= 2) {
          toAdd.push({ chapterId: chapter.id, unitId: r.unitId || unit.id, level: r.level || level, q: r.q, ans: r.ans, mistakeTag: r.mistakeTag });
          tw[tag] = 0; // 学び直しに出したのでカウンタをリセット
        }
      } else {
        const uid = r.unitId || unit.id;
        unitCount[uid] = (unitCount[uid] || 0) + 1;
        if (unitCount[uid] === 2) toAdd.push({ chapterId: chapter.id, unitId: uid, level: r.level || level, q: r.q, ans: r.ans, mistakeTag: r.mistakeTag });
      }
    }
    updatePlayer((p) => ({ ...p, tagWrong: tw, mistakeTagStats: mts }));
    const mistakes = toAdd.map((m) => makeMistake({ studentId: sid, ...m }));
    const newMistakes = store.addMistakes(mistakes);
    setData((d) => ({ ...d, records: store.load().records, mistakes: newMistakes }));
    addXp(xp);
    // 王道サイクルの「ためす（応用なら応用）」として進捗に反映。正解ぶん数える。
    //  この回で間違いが出たら mistakeNow=true ＝「なおす」を要求（早すぎるクリアを防ぐ）。
    if (unit?.id && correct > 0) {
      const mistakeNow = mistakes.some((m) => m.unitId === unit.id);
      bumpCycle(unit.id, { practice: correct, mistakeNow });
    }
    // れんしゅう（じっくりモード）の正解でもBPを加算する（中1のみ・バトルと同じ単元別戦闘力）。
    //  バトルと違い不正解での減算はしない＝練習は安心して打ち込める場にする。
    if ((chapter?.grade ?? 1) === 1 && correct > 0) {
      const clearedN = chapter.units.filter((u) => isCalcKingCleared(data.player, u.id)).length;
      const cap = chapterBPCap(clearedN);
      updatePlayer((p) => {
        const nv = adjustBP(p.chapterBP?.[chapter.id] || BP_MIN, correct, cap);
        return { ...p, chapterBP: { ...(p.chapterBP || {}), [chapter.id]: nv } };
      });
    }
    // あんしんで★1が新たに付き、その単元のモンスターが解放されたら「新しい敵」を通知する
    if (anshin) {
      const monster = MONSTERS.find((m) => m.kind === "unit" && m.unitId === unit.id);
      if (monster && !isUnitMonsterUnlocked(data.player, monster)) {
        markMonstersSeen([monster.id]);
        // 数学ラボ3では旧「新しい敵出現」の演出は出さない
      }
    }
  }

  // 困り感クリニックの結果を保存（誤答ノート＋記録＋XP、卒業フラグ）
  function saveClinicResult({ skillKey, skillName, correct, wrong, graduated, xp, results }) {
    const sid = data.player.studentId;
    store.addRecord(makeRecord({
      studentId: sid, mode: "clinic", chapterId: "c1",
      correct, wrong, xp, extra: { skillKey, skillName, graduated },
    }));
    const mistakes = (results || []).filter((r) => !r.ok).slice(0, 3).map((r) =>
      makeMistake({ studentId: sid, chapterId: "c1", q: r.q, ans: r.ans })
    );
    const newMistakes = store.addMistakes(mistakes);
    if (graduated) {
      updatePlayer((p) => ({ ...p, clinicCleared: { ...(p.clinicCleared || {}), [skillKey]: todayStr() } }));
    }
    setData((d) => ({ ...d, records: store.load().records, mistakes: newMistakes }));
    addXp(xp);
  }

  // 単元テストの結果を保存
  function saveUnitTestResult({ chapter, answers, correct, total, xp }) {
    const sid = data.player.studentId;
    store.addRecord(makeRecord({
      studentId: sid, mode: "unitTest", chapterId: chapter.id,
      correct, wrong: total - correct, xp,
    }));
    const mistakes = answers.filter((a) => !a.ok).slice(0, 6).map((a) =>
      makeMistake({ studentId: sid, chapterId: chapter.id, unitId: a.unitId, level: a.level, q: a.q, ans: a.ans })
    );
    const newMistakes = store.addMistakes(mistakes);
    setData((d) => ({ ...d, records: store.load().records, mistakes: newMistakes }));
    addXp(xp);
  }

  // ★4 間違い＝宝：直して「できた！」にしたら、ごほうび（たからもの＝コイン）。
  //   まちがいは罰ではなく、直すのが一番えらい——という体験にする。
  const MISTAKE_FIX_REWARD = 5; // コイン
  function removeNote(id) {
    const mistakes = store.removeMistake(id);
    updatePlayer((p) => ({ ...p, coins: (p.coins ?? 0) + MISTAKE_FIX_REWARD }));
    setData((d) => ({ ...d, mistakes }));
    return MISTAKE_FIX_REWARD;
  }

  // ── 学び直しの合格基準（2段階：その場＝2連続 → 翌日以降＝1問で確定）──
  //  旧「単元5問ぜんぶ正解で即消し」を廃止。基準は engine/scoring.js に集約。
  //   段階：fresh（まだ）→ pendingToday（今日〈仮なおし〉・確認は明日）→ confirm（翌日以降・あと1問で消える）
  const relearnStreakRef = useRef({}); // { [unitId]: 連続正解数 }（不正解で0にリセット・単元ごと独立）

  /** その単元の学び直しの段階を、間違いの pendingAt から判定する。 */
  function relearnPhase(unitId) {
    const ms = (data.mistakes || []).filter((m) => m.unitId === unitId);
    if (!ms.length) return "none";
    const pend = ms.find((m) => m.pendingAt);
    if (!pend) return "fresh";
    return pend.pendingAt === todayStr() ? "pendingToday" : "confirm";
  }

  // その場（同じ日）：変種で2連続正解 → その単元を〈仮なおし〉に。ノートはまだ消さず「⏳あした確認」へ。
  function pendUnitRelearn(unit) {
    if (!unit?.id) return;
    const count = (data.mistakes || []).filter((m) => m.unitId === unit.id).length;
    if (!count) return;
    const mistakes = store.markUnitRelearnPending(unit.id, todayStr());
    setData((d) => ({ ...d, mistakes }));
    sfx.levelUp();
    setTimeout(() => setRelearnPended({ unitName: unit.name, count }), 350);
  }

  // 翌日以降：変種で1問正解 → 〈完全になおった〉＝その単元の間違いをまとめて消す＋ごほうび。
  function confirmRelearnUnit(unit) {
    if (!unit?.id) return;
    const removed = (data.mistakes || []).filter((m) => m.unitId === unit.id);
    if (!removed.length) return;
    const mistakes = store.removeMistakesByUnit(unit.id);
    updatePlayer((p) => ({ ...p, coins: (p.coins ?? 0) + RELEARN_CONFIRM_COIN }));
    setData((d) => ({ ...d, mistakes }));
    sfx.levelUp();
    setTimeout(() => setRelearnMastered({ unitName: unit.name, count: removed.length, reward: RELEARN_CONFIRM_COIN }), 350);
  }

  // 2段階の合格基準（仮なおし／翌日確認）を進める共通ロジック。
  //  学び直し画面からもバトルの誤答変種混入(#2)からも、同じ状態機械で呼べるように分離。
  //  ★ここではXP/コインは付与しない（学び直し画面は recordStepAttempt が別途付与、
  //    バトル経由は戦闘自体の報酬と二重取りにならないよう意図的に何も足さない）。
  function advanceRelearnPhase(unitId, ok) {
    if (!unitId) return;
    const unit = practiceUnit && practiceUnit.id === unitId ? practiceUnit : findUnitById(unitId);
    if (!unit) return;
    if (relearnPhase(unitId) === "none") return; // この単元にまちがいが無ければ何もしない
    // 【2026-09-26】単元ごとに連続正解を数え、RELEARN_STREAK_TARGET(5)問れんぞくで正解したら、その単元のまちがいをノートから消す。不正解で0に戻る。
    const next = ok ? (relearnStreakRef.current[unitId] || 0) + 1 : 0;
    relearnStreakRef.current[unitId] = next;
    if (ok && next >= RELEARN_STREAK_TARGET) {
      relearnStreakRef.current[unitId] = 0;
      confirmRelearnUnit(unit);
    }
  }

  // 学び直し練習の1問ごと：採点/XP/コイン/サイクルなおす加算は従来どおり recordStepAttempt に通し、
  //  そのうえで2段階の合格基準（仮なおし／翌日確認）を進める。
  function handleRelearnAttempt(a) {
    recordStepAttempt({ ...a, relearn: true });
    advanceRelearnPhase(a.unitId, a.ok);
  }

  // バトルで間違えた問題を「学び直しモード」に記録（同じ問題文は重複させない・最大40件）
  // バトル／チャレンジ（計算王）など、解いている途中の誤答を学び直しノートへ送る共通処理。
  //  chapterId を渡せばそれを使い、無ければ unitId から章を逆引きする。
  function recordWrongAnswer({ q, ans, unitId, level, chapterId = null }) {
    if (!q) return;
    const ch = chapterId || findChapterByUnitId(unitId)?.id || null;
    const newMistakes = store.addMistakes([
      makeMistake({ studentId: data.player.studentId, chapterId: ch, unitId: unitId || null, level: level || null, q, ans }),
    ]);
    setData((d) => ({ ...d, mistakes: newMistakes }));
  }

  // 王道サイクルの進捗を増やし、初クリア（講義+ためす+なおす）／初応用クリアを判定して
  //  レベル+1・クリスタル+1／剣石+鎧石 を付与する。recordStepAttempt と saveSlowResult から呼ぶ。
  //   ・practice … ためす（れんしゅう/バトル）の正解数 / relearn … なおすの正解数 / applied … 応用の正解数
  //   ・mistakeNow … その操作で今まさに間違いが生まれた場合 true（なおすを未達扱いにする）
  function bumpCycle(unitId, { practice = 0, relearn = 0, mistakeNow = false } = {}) {
    if (!unitId || (!practice && !relearn)) return;
    const prev = (data.player.cycle && data.player.cycle[unitId]) || {};
    const next = nextCycleCounts(prev, { practice, relearn }); // 進捗ルールは engine/progress.js に一元化
    // 講義（確認問題）クリア：その単元の葉一レッスンの合格を見る。
    //  レッスンが無い単元（動画なし）は、教師モード＋確認問題での合格(noVideoLecturePassed)を見る。
    const lessonFound = findHaichiLessonForUnit(unitId);
    const lessonKey = lessonFound ? `g${lessonFound.grade}m${lessonFound.lesson.n}` : null;
    const lectureOK = lessonFound
      ? !!(data.player.haichiPassed && data.player.haichiPassed[lessonKey])
      : !!(data.player.noVideoLecturePassed && data.player.noVideoLecturePassed[unitId]);
    // なおすクリア：学び直しで正解、または直すべき間違いがそもそも無い（詰まり防止）
    const unitHasMistakes = mistakeNow || (data.mistakes || []).some((m) => m.unitId === unitId);
    const naosuOK = naosuSatisfied(next.relearnN, unitHasMistakes);
    const wasCleared = !!next.cleared; // この呼び出し前から既にクリア済み（＝解き直し＝間隔反復の復習対象）
    const newlyCleared = !next.cleared && isUnitCycleCleared({ lectureOK, practiceN: next.practiceN, naosuOK });
    if (newlyCleared) { next.cleared = true; next.clearedAt = Date.now(); } // 初クリア日時を記録（復習ボーナス判定に使う）

    const today = todayStr();
    const world = data.player.world || 1;
    const unitsW = chaptersForGrade(world).flatMap((c) => c.units || []);
    // クリア後のレベル（演出用）＝1＋（この学年で cleared な単元数）。今クリアした分も数える。
    const newLevel = newlyCleared ? levelAfterClear(data.player.cycle || {}, unitsW, unitId) : null;

    updatePlayer((p) => {
      const cyc = { ...(p.cycle || {}), [unitId]: next };
      const daily = (p.daily && p.daily.date === today) ? { ...p.daily } : { date: today, cycles: 0 };
      const out = { ...p, cycle: cyc, cycleLast: unitId };
      if (newlyCleared) {
        daily.cycles = (daily.cycles || 0) + 1;
        out.coins = (p.coins ?? 0) + MASTER_CYCLE_COIN;
        out.crystals = (p.crystals ?? 0) + MASTER_CYCLE_CRYSTAL;
        const wc = { 1: 0, 2: 0, 3: 0, ...(p.worldCleared || {}) };
        wc[world] = unitsW.filter((u) => cyc[u.id]?.cleared).length; // flagから数え直し（ドリフトしない）
        out.worldCleared = wc;
      }
      out.daily = daily;
      return out;
    });
    if (newlyCleared) {
      // スキル動線をオフにしたため、クリスタル入手演出は出さない（クリスタルは内部で貯まるだけ）。
      // 数学ラボ3では旧「LEVEL UP!」演出は出さない
      // #4 有能感のピーク（サイクル初クリア）に「応用の扉」を出す。レベルアップ演出の後に表示。
      //  ※中1は祝いモーダルを出さず、サイクル内の「🧮 応用」ボタンで誘導する（ためすクリアで強調）。
      // （旧「応用の扉」も出さない：ラボ3のメニューからは旧Challenge画面に行けないため）
    } else if (wasCleared) {
      // 既にクリア済みの単元を解き直した＝間隔反復の復習。1日後/1週間後の窓が開いていれば石を出す。
      maybeReviewBonus(unitId);
    }
  }

  // 間隔反復の復習ボーナス：クリア済みの単元を「1日後」「1週間後」に解き直したら 剣石+鎧石。各マイルストーン1回だけ。
  function maybeReviewBonus(unitId) {
    const cyc = (data.player.cycle && data.player.cycle[unitId]) || {};
    const give = reviewMilestonesToGrant(cyc, Date.now()); // 1日後/1週間後の窓判定は progress.js に一元化
    if (!give.length) return;
    const add = give.length; // 1日と1週間が同時に開いていれば +2
    updatePlayer((p) => {
      const cy = { ...(p.cycle || {}) };
      const u = { ...(cy[unitId] || {}) };
      if (give.includes("d1")) u.r1 = true;
      if (give.includes("d7")) u.r7 = true;
      cy[unitId] = u;
      const gear = { swordStones: 0, armorStones: 0, ...(p.gear || {}) };
      gear.swordStones = Math.min(GEAR_STONE_CAP, (gear.swordStones || 0) + add);
      gear.armorStones = Math.min(GEAR_STONE_CAP, (gear.armorStones || 0) + add);
      return { ...p, cycle: cy, gear };
    });
    sfx.levelUp();
    const reason = give.includes("d7") ? "1週間ぶりの復習" : "1日ぶりの復習";
    setTimeout(() => setGearStoneGet({ sword: add, armor: add, reason }), 500);
  }

  // B-3 診断「どこから始める？」の結果を skillStats にラチェット反映（正解スキルだけ上げる・下げない）。
  function applyDiagnosis(results = []) {
    updatePlayer((p) => ({ ...p, skillStats: ratchetSkillStats(p.skillStats || {}, results, todayStr()) }));
  }

  // ステップアップ（弱点克服）モード：1問ごとの結果を保存
  //  - スキル習熟度(skillStats)を更新（mNew は画面側のEloで算出済み）
  //  - 間違いは全件ノートへ（#2：苦手分析の入力を増やすため2連続ミスのゲートを廃止。
  //    表示は Relearn.jsx 側で単元ごとに束ねるので溢れない）
  //  - XPはささやか＆ペナルティなし（自己肯定を下げない）
  // ── サーバー権威(Lv2)の影運用：解答をEdge Functionへ裏送信（AUTH無効/seed無しなら何もしない）。
  //  サーバーがseedから問題を作り直して採点し、保護状態(level/クリスタル等)をサーバー側で更新する。
  //  ローカルは今まで通り正のまま＝壊れない。全モードがこれを呼べば一致確認→Step5切替に進める。
  function shadowSubmit({ unitId, level, templateId, seed, userAnswer, mode }) {
    if (serverActive() && seed != null && templateId && unitId) {
      submitAttempt({ unitId, level, templateId, seed, userAnswer, mode });
    }
  }

  function recordStepAttempt({ skill, unitId, level, templateId, seed, userAnswer, ok, q, ans, mNew, relearn = false, cycleSkip = false, mistakeTag = null, pseed, ms }) {
    const sid = data.player.studentId;
    if (cycleSkip && !relearn) queueConfirm({ unitId, level, pseed, userAnswer, ms }); // 確認問題(はいち)の解答＝合格判定のためサーバーへ
    const stepMode = relearn ? "relearn" : cycleSkip ? "confirm" : "practice";
    shadowSubmit({ unitId, level, templateId, seed, userAnswer, mode: stepMode });
    // 正答・誤答どちらも中身をサーバへ記録（教師が後から見返せるように。失敗しても進行には影響しない）。
    logAnswer({ unitId, level, mode: stepMode, q, ans, userAnswer, ok, mistakeTag });
    // スキルタグがある中1のみ習熟度(Elo)を更新（中2・中3の固定問題は skill=null）
    // mNew は画面側Elo算出（StepUp/StepUpSimple）。バトル等で未指定なら、ここでElo更新する。
    const mFinal = skill == null ? null
      : (mNew != null ? mNew
        : updateMastery((data.player.skillStats?.[skill]?.m) ?? INITIAL_MASTERY, levelDifficulty(level), ok ? 1 : 0));
    if (skill) {
      updatePlayer((p) => {
        const prev = (p.skillStats && p.skillStats[skill]) || { m: 0.5, n: 0 };
        return {
          ...p,
          skillStats: { ...(p.skillStats || {}), [skill]: { m: mFinal, n: prev.n + 1, last: todayStr() } },
        };
      });
    }
    // 小単元の習得確認も更新（1問ずつ）
    bumpUnitMastery(unitId, [!!ok]);
    // 学び直しへの追加：不正解は全件記録（学び直し中(relearn)は新たな間違いを足さない＝直している最中なので）。
    if (!relearn && !ok) {
      const m = makeMistake({ studentId: sid, chapterId: skill ? "c1" : null, unitId, level, q, ans, skill, templateId, mistakeTag });
      const newMistakes = store.addMistakes([m]);
      setData((d) => ({ ...d, mistakes: newMistakes }));
      bumpMistakeTag(mistakeTag, unitId);
    }
    // 学び直しは「学習のコア」：XP1.5倍（1問15）＋コイン（questionCoin()で他モードと統一）。
    //  ※クリスタルは「サイクルクリア（1単元）＝1個」だけに一本化（ドリップ廃止）。
    if (relearn) {
      updatePlayer((p) => ({
        ...p,
        relearnSolved: (p.relearnSolved || 0) + 1,
        coins: (p.coins ?? 0) + (ok ? questionCoin(level) : 0), // 学び直しもコイン源に（王道サイクルの要）
      }));
      addXp(ok ? Math.round(RELEARN_XP_PER_CORRECT * eventRelearnMult()) : 0); // 火曜=学び直しデーは2倍
    } else {
      // ステップアップ(背骨)／じっくり：正解で1問10XP＋コイン（questionCoin()で他モードと統一）
      if (ok) updatePlayer((p) => ({ ...p, coins: (p.coins ?? 0) + questionCoin(level) }));
      addXp(ok ? 10 : 0);
    }

    // 王道サイクルの進捗：unitごとに 講義・ためす・なおす・応用 を数える。
    //  ・サイクルクリア（講義+ためす+なおす）＝レベル+1・クリスタル+1（スキル1個ぶん）。
    //  ・応用クリア（初回）＝剣石+1・鎧石+1（武器/防具が少し育つ・上限あり）。
    //  ※確認問題（cycleSkip=true）は講義の確認なのでサイクル進捗を動かさない（合格→講義クリアは別途）。
    //  ※応用（剣石/鎧石）は計算王の章クリアで付与するため、ここでは難易度から応用を推測しない。
    if (unitId && ok && !cycleSkip) {
      if (relearn) bumpCycle(unitId, { relearn: 1 });
      else bumpCycle(unitId, { practice: 1 });
    }
  }

  // はいちモード：葉一さんの動画を一定割合見たら、その動画につき1回だけポイント付与
  function markHaichiWatched(key) {
    if (!key || data.player.haichiWatched?.[key]) return; // 動画ごとに1回だけ
    updatePlayer((p) => ({
      ...p,
      haichiWatched: { ...(p.haichiWatched || {}), [key]: todayStr() },
      coins: (p.coins ?? 0) + HAICHI_WATCH_COIN,
    }));
    addXp(HAICHI_WATCH_XP);
  }
  // はいちモード：その動画専用の練習で合格（正答率80%以上）したら、1回だけポイント付与
  function markHaichiPassed(key) {
    if (key) sendConfirm(key); // メダルはサーバーが認めた時だけ付く（下の行は従来の学習記録用）
    if (!key || data.player.haichiPassed?.[key]) return; // 動画ごとに1回だけ
    updatePlayer((p) => ({
      ...p,
      haichiPassed: { ...(p.haichiPassed || {}), [key]: todayStr() },
      coins: (p.coins ?? 0) + HAICHI_PASS_COIN,
    }));
    addXp(HAICHI_PASS_XP);
    // 講義（確認問題）合格で「講義」ステップが埋まる。ためす・なおすが既に済んでいれば
    //  この合格でサイクルクリア＝レベル+1・クリスタル+1 になる単元があれば反映する。
    clearCyclesAfterLecture(key);
  }

  // 確認問題の合格(key)で新たに「サイクルクリア」になる単元を反映（レベル+1・クリスタル+1）。
  //  講義を最後にやった場合（ためす・なおすが先に済んでいる）に効く。
  function clearCyclesAfterLecture(key) {
    const world = data.player.world || 1;
    const unitsW = chaptersForGrade(world).flatMap((c) => c.units || []);
    const toClear = [];
    for (const u of unitsW) {
      const cyc = data.player.cycle?.[u.id] || {};
      if (cyc.cleared) continue;
      const lf = findHaichiLessonForUnit(u.id);
      const lessonKey = lf ? `g${lf.grade}m${lf.lesson.n}` : null;
      if (lessonKey !== key) continue; // この合格に関係ない単元はスキップ
      const unitHasMistakes = (data.mistakes || []).some((m) => m.unitId === u.id);
      const naosuOK = (cyc.relearnN || 0) >= CYCLE_RELEARN_TARGET || !unitHasMistakes;
      if (isUnitCycleCleared({ lectureOK: true, practiceN: cyc.practiceN || 0, naosuOK })) toClear.push(u.id);
    }
    if (!toClear.length) return;
    const today = todayStr();
    const before = unitsW.filter((u) => data.player.cycle?.[u.id]?.cleared).length;
    const newLevel = 1 + before + toClear.length;
    updatePlayer((p) => {
      const cyc = { ...(p.cycle || {}) };
      let coins = p.coins ?? 0, crystals = p.crystals ?? 0;
      const daily = (p.daily && p.daily.date === today) ? { ...p.daily } : { date: today, cycles: 0 };
      for (const id of toClear) {
        if (cyc[id]?.cleared) continue;
        cyc[id] = { ...(cyc[id] || {}), cleared: true, clearedAt: Date.now() };
        coins += MASTER_CYCLE_COIN; crystals += MASTER_CYCLE_CRYSTAL; daily.cycles = (daily.cycles || 0) + 1;
      }
      const wc = { 1: 0, 2: 0, 3: 0, ...(p.worldCleared || {}) };
      wc[world] = unitsW.filter((u) => cyc[u.id]?.cleared).length;
      return { ...p, cycle: cyc, daily, coins, crystals, worldCleared: wc, cycleLast: toClear[toClear.length - 1] };
    });
    sfx.levelUp();
    setTimeout(() => setCrystalGet({ amount: MASTER_CYCLE_CRYSTAL * toClear.length }), 600);
    setTimeout(() => setLevelUpTo(newLevel), 1100);
  }

  // チャレンジ：難問を初クリアしたとき（段位の元を保存＋難易度比例XP）
  //  くり返しクリアではXPは入らない＝作業稼ぎでバトル人気を食わないように。
  function recordChallengeClear(problemId, tier) {
    const already = !!(data.player.challengeCleared && data.player.challengeCleared[problemId]);
    updatePlayer((p) => ({
      ...p,
      challengeCleared: { ...(p.challengeCleared || {}), [problemId]: true },
    }));
    if (!already) {
      const gain = challengeXp(tier);
      store.addRecord(makeRecord({
        studentId: data.player.studentId, mode: "challenge",
        correct: 1, xp: gain, extra: { problemId, tier },
      }));
      setData((d) => ({ ...d, records: store.load().records }));
      addXp(gain);
    }
  }

  // チャレンジ「計算王への道」：その単元の自己ベストを更新し、XPを付与（単元ごとに記録）
  function recordCalcKing({ unitId, streak, time5 }) {
    if (!unitId) return;
    const prev = (data.player.calcKing && data.player.calcKing[unitId]) || { bestStreak: 0, bestTime5: null };
    const newBestStreak = streak > (prev.bestStreak || 0);
    // 計算王クリア（5問連続）を初めて達成したら、バトル攻撃力アップを祝う
    const justCleared = (prev.bestStreak || 0) < CALC_KING_CLEAR_STREAK && streak >= CALC_KING_CLEAR_STREAK;
    updatePlayer((p) => {
      const all = (p.calcKing && typeof p.calcKing === "object" && !("bestStreak" in p.calcKing)) ? p.calcKing : {};
      const ck = all[unitId] || { bestStreak: 0, bestTime5: null };
      return {
        ...p,
        calcKing: {
          ...all,
          [unitId]: {
            bestStreak: Math.max(ck.bestStreak || 0, streak),
            bestTime5: (time5 != null && (ck.bestTime5 == null || time5 < ck.bestTime5)) ? time5 : ck.bestTime5,
          },
        },
        // ※クリスタルは「サイクルクリア（1単元）＝1個」だけに一本化。計算王クリアの専用報酬は
        //   攻撃力アップ（calcKingAtkBonus）として残し、クリスタルは付与しない。
      };
    });
    const baseXp = Math.min(streak * 4, 120) + (newBestStreak ? 40 : 0); // 控えめ＋新記録ボーナス
    const xp = Math.round(baseXp * eventCalcMult()); // 木曜=計算王デーは1.5倍
    store.addRecord(makeRecord({
      studentId: data.player.studentId, mode: "challenge",
      correct: streak, xp, extra: { calcKing: true, unitId, streak, time5 },
    }));
    setData((d) => ({ ...d, records: store.load().records }));
    addXp(xp);
    if (justCleared) {
      setTimeout(() => setCalcKingClear({ unitId }), 600); // 攻撃力アップのクリア演出
      // 応用クリア（応用ボタン＝計算王の章を初クリア）＝剣石+1・鎧石+1（武器/防具が少し育つ・上限あり）
      updatePlayer((p) => {
        const gear = { swordStones: 0, armorStones: 0, ...(p.gear || {}) };
        gear.swordStones = Math.min(GEAR_STONE_CAP, (gear.swordStones || 0) + 1);
        gear.armorStones = Math.min(GEAR_STONE_CAP, (gear.armorStones || 0) + 1);
        return { ...p, gear };
      });
      setTimeout(() => setGearStoneGet({ sword: 1, armor: 1 }), 1100);
    }
  }

  // ショップ：アイテム購入（コイン消費・1つだけ所持＝持ち替え）
  function buyItem(itemId) {
    const it = findItem(itemId);
    if (!it) return;
    updatePlayer((p) => {
      if (playerLevel(p) < (it.unlockLv ?? 1)) return p; // レベル未達なら買えない（現在ワールドのLv）
      if ((p.coins ?? 0) < it.price) return p; // コイン不足なら何もしない
      return { ...p, coins: (p.coins ?? 0) - it.price, item: it.id };
    });
  }

  // ショップ：今のアイテムを捨てる
  function discardItem() {
    updatePlayer((p) => ({ ...p, item: null }));
  }

  // ショップ：ガチャを1回引く（コイン消費・武器/防具をコレクションに追加）。引いた装備を返す（演出用）
  function pullGacha(type = null) {
    if ((data.player.coins ?? 0) < GACHA_COST) return null;
    const id = rollGacha(Math.random, type); // 当たり（種類指定可）を先に決め、結果を即返す（演出のため）
    updatePlayer((p) => {
      if ((p.coins ?? 0) < GACHA_COST) return p; // 二重引き防止
      const g = defaultGacha(p.gacha);
      const owned = { ...g.owned, [id]: (g.owned[id] || 0) + 1 };
      return { ...p, coins: (p.coins ?? 0) - GACHA_COST, gacha: { ...g, owned } };
    });
    return findGear(id);
  }

  // スキルガチャを引く（クリスタル消費）。count=1 or 10。
  //  当たったスキルを所持に追加。既に所持していれば「被り」→ レア度に応じてコイン還元。
  //  返り値：演出用の配列 [{ id, skill, isNew, refund }]（クリスタル不足なら null）。
  function pullSkillGacha() {
    const cost = SKILL_GACHA_COST_1; // 単発＝クリスタル1個
    if ((data.player.crystals ?? 0) < cost) return null;
    // 未所持のスキルから1つだけ抽選（被りは出ない）。全部そろっていたら null（コンプリート）。
    const id = rollSkillGachaNew(data.player.ownedSkills || []);
    if (!id) return null;
    const skill = findSkill(id);
    const results = [{ id, skill, isNew: true, refund: 0 }];

    updatePlayer((p) => {
      if ((p.crystals ?? 0) < cost) return p; // 二重引き防止
      const owned = [...(p.ownedSkills || [])];
      const skillOwned = { ...(p.skillOwned || {}) };
      skillOwned[id] = (skillOwned[id] || 0) + 1;
      if (!owned.includes(id)) owned.push(id);
      return {
        ...p,
        crystals: (p.crystals ?? 0) - cost,
        ownedSkills: owned,
        skillOwned,
      };
    });
    return results;
  }

  // 単元別スキルガチャ（2026-07-18設計）：その章が計算マスターになっていれば1回だけ引ける（無償）。
  //  結果ランク("C"〜"SS")を player.ownedChapterSkills[chapterId] に記録する。
  function claimChapterSkillGacha(chapterId) {
    if (!isChapterMastered(data.player, chapterId)) return null;
    if (data.player.ownedChapterSkills?.[chapterId]) return null; // 二重取得防止
    const rank = rollChapterSkillGacha();
    updatePlayer((p) => {
      if (p.ownedChapterSkills?.[chapterId]) return p; // 二重引き防止
      return { ...p, ownedChapterSkills: { ...(p.ownedChapterSkills || {}), [chapterId]: rank } };
    });
    return rank;
  }

  // 単元別スキルの確定強化（2026-07-19設計、2026-07-19コスト改定）：クリスタルを消費してランクを
  //  1段階アップ（D→C→B→A→S→SS）。ガチャではなく確実な強化＝クリスタルの沈み先
  //  （小単元ボスの初回撃破で入手）。段階ごとの必要数は chapterSkillLevelUpCost 参照
  //  （通常スキル合計12・じかんのよろいだけ合計15＝7スキル全SSでちょうど87＝全学年一周クリア分）。
  function levelUpChapterSkill(chapterId) {
    const cur = data.player.ownedChapterSkills?.[chapterId] || "D";
    const cost = chapterSkillLevelUpCost(chapterId, cur);
    if (cost == null) return; // 既にSS
    if ((data.player.crystals ?? 0) < cost) return;
    const idx = SKILL_RANK_ORDER_WITH_D.indexOf(cur);
    const next = SKILL_RANK_ORDER_WITH_D[idx + 1];
    updatePlayer((p) => {
      const pCur = p.ownedChapterSkills?.[chapterId] || "D";
      const pCost = chapterSkillLevelUpCost(chapterId, pCur);
      if (pCost == null || (p.crystals ?? 0) < pCost || pCur !== cur) return p; // 二重クリック防止
      return {
        ...p,
        crystals: (p.crystals ?? 0) - pCost,
        ownedChapterSkills: { ...(p.ownedChapterSkills || {}), [chapterId]: next },
      };
    });
  }

  // ロードアウト：装備する単元別スキルを最大2つまでトグルで選ぶ
  function toggleEquippedChapterSkill(chapterId) {
    updatePlayer((p) => {
      const cur = p.equippedSkills || [];
      if (cur.includes(chapterId)) return { ...p, equippedSkills: cur.filter((id) => id !== chapterId) };
      if (cur.length >= 2) return p; // 2枠まで
      return { ...p, equippedSkills: [...cur, chapterId] };
    });
  }

  // アイテムガチャ（2026-07-19復活・同日値上げ）：その日1回目150G、1回ごとに+50G、翌日リセット。ストックは合計ITEM_STOCK_MAXまで。
  // その日すでに何回ガチャを引いたか（日付が変わっていれば0）
  function itemGachaPullsToday(p) {
    return p.itemGachaLastPullDate === todayStr() ? (p.itemGachaPullsToday || 0) : 0;
  }

  function pullItemGacha() {
    const cost = itemGachaCost(itemGachaPullsToday(data.player));
    if ((data.player.coins ?? 0) < cost) return null;
    const stockTotal = Object.values(data.player.items || {}).reduce((a, b) => a + (b || 0), 0);
    if (stockTotal >= ITEM_STOCK_MAX) return null;
    const id = rollItemGacha();
    updatePlayer((p) => {
      const pToday = itemGachaPullsToday(p);
      const pCost = itemGachaCost(pToday);
      const total = Object.values(p.items || {}).reduce((a, b) => a + (b || 0), 0);
      if ((p.coins ?? 0) < pCost || total >= ITEM_STOCK_MAX) return p; // 二重引き防止
      const items = { ...(p.items || {}) };
      items[id] = (items[id] || 0) + 1;
      return { ...p, coins: (p.coins ?? 0) - pCost, items, itemGachaPullsToday: pToday + 1, itemGachaLastPullDate: todayStr() };
    });
    return findItemDef(id);
  }

  // アイテムのバトル持ち込み：最大ITEM_BRING_MAXまでトグルで選ぶ
  function toggleEquippedItem(itemId) {
    updatePlayer((p) => {
      const cur = p.equippedItems || [];
      if (cur.includes(itemId)) return { ...p, equippedItems: cur.filter((id) => id !== itemId) };
      if (cur.length >= ITEM_BRING_MAX) return p;
      return { ...p, equippedItems: [...cur, itemId] };
    });
  }

  // バトル中にアイテムを使用：ストックを1個消費（効果自体はTurnBattle側で即時適用）
  //  ストックが0になったら持ち込み枠(equippedItems)からも外す（幽霊装備防止：外さないと
  //  リロードするまで持ち込み枠が使用不能のまま固まってしまうため）。
  function useBattleItem(itemId) {
    updatePlayer((p) => {
      const items = { ...(p.items || {}) };
      if (!items[itemId]) return p;
      items[itemId] -= 1;
      let equippedItems = p.equippedItems || [];
      if (items[itemId] <= 0) {
        delete items[itemId];
        equippedItems = equippedItems.filter((id) => id !== itemId);
      }
      return { ...p, items, equippedItems };
    });
  }

  // 必殺技ガチャ（2026-07-19設計・同日20種に拡張＆値上げ）：1回目700G、1回ごとに+200G（リセット無し）。所持済みは対象外（ダブりなし）。
  // すでに何回引いたか＝ダブり無しガチャなので所持数-1（最初から持っている1つぶんを引く）で求まる
  function ultimateGachaPullsSoFar(p) {
    return Math.max(0, Object.keys(p.ownedUltimates || { fire: true }).length - 1);
  }

  function pullUltimateGacha() {
    const cost = ultimateGachaCost(ultimateGachaPullsSoFar(data.player));
    if ((data.player.coins ?? 0) < cost) return null;
    const owned = data.player.ownedUltimates || {};
    const pool = ULTIMATES.filter((u) => !owned[u.id]);
    if (pool.length === 0) return null; // 全部所持済み
    const id = rollUltimateGacha(pool);
    updatePlayer((p) => {
      const pOwned = p.ownedUltimates || {};
      const pCost = ultimateGachaCost(ultimateGachaPullsSoFar(p));
      if ((p.coins ?? 0) < pCost || pOwned[id]) return p; // 二重引き防止
      return { ...p, coins: (p.coins ?? 0) - pCost, ownedUltimates: { ...pOwned, [id]: true } };
    });
    return findUltimate(id);
  }

  // 必殺技を装備（1つだけ）：所持済みのものだけ選べる
  function equipUltimate(id) {
    updatePlayer((p) => {
      if (!(p.ownedUltimates || {})[id]) return p;
      return { ...p, equippedUltimate: id };
    });
  }

  // ショップ：武器/防具を装備（未所持は不可。同じものをもう一度押すと外す）
  function equipGear(type, gearId) {
    updatePlayer((p) => {
      const g = defaultGacha(p.gacha);
      if (gearId && !(g.owned[gearId] > 0)) return p; // 未所持
      const slot = type === "weapon" ? "weapon" : "armor";
      return { ...p, gacha: { ...g, [slot]: gearId } };
    });
  }

  // ショップ：治療（HPを全回復）。コインを消費し currentHp を満タン(null)に戻す。
  function healPlayer() {
    updatePlayer((p) => {
      const lv = playerLevel(p);
      const max = getPlayerBattleStats(lv, battleBonuses(p)).maxHp;
      const cur = p.currentHp == null ? max : p.currentHp;
      if (cur >= max) return p;            // すでに満タン
      const cost = treatCost(lv);
      if ((p.coins ?? 0) < cost) return p; // コイン不足
      return { ...p, coins: (p.coins ?? 0) - cost, currentHp: null };
    });
  }


  // ── データのバックアップ（ファイル保存／復元） ──
  function downloadBackup() {
    try {
      const json = store.exportData();
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const d = new Date();
      const p2 = (n) => String(n).padStart(2, "0");
      const stamp = `${d.getFullYear()}${p2(d.getMonth() + 1)}${p2(d.getDate())}_${p2(d.getHours())}${p2(d.getMinutes())}`;
      a.href = url;
      a.download = `mathlabo_backup_${stamp}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
    } catch (e) {
      console.warn("バックアップ保存に失敗:", e);
    }
  }
  function restoreBackup(file, cb) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = store.importData(String(reader.result));
        setData({ player: data.player, records: data.records, mistakes: data.mistakes });
        cb?.(true);
      } catch (e) {
        cb?.(false, e.message || "読み込みエラー");
      }
    };
    reader.onerror = () => cb?.(false, "ファイルを読めませんでした");
    reader.readAsText(file);
  }

  // バトル相手選択：新しく解放された敵を「見た」ことにする（NEW通知の制御）
  function markMonstersSeen(ids) {
    if (!ids || ids.length === 0) return;
    updatePlayer((p) => {
      const seen = { ...(p.seenMonsters || {}) };
      for (const id of ids) seen[id] = true;
      return { ...p, seenMonsters: seen };
    });
  }

  // ── 管理用モード（先生向け）：値を自由に設定する ──
  const admin = {
    setLevel: (lv) => {
      const L = Math.max(1, Math.min(999, Math.round(lv) || 1));
      updatePlayer((p) => {
        const w = p.world || 1;
        return { ...p, worldXp: { ...(p.worldXp || { 1: 0, 2: 0, 3: 0 }), [w]: xpForLevel(L) } };
      });
    },
    setCoins: (n) => updatePlayer((p) => ({ ...p, coins: Math.max(0, Math.round(n) || 0) })),
    setCrystals: (n) => updatePlayer((p) => ({ ...p, crystals: Math.max(0, Math.round(n) || 0) })),
    setSp: (n) => updatePlayer((p) => ({ ...p, sp: Math.max(0, Math.min(10, Math.round(n) || 0)) })),
    fullHeal: () => updatePlayer((p) => ({ ...p, currentHp: null })),
    maxAllStars: () => updatePlayer((p) => {
      const stars = { ...(p.stars || {}) };
      for (const ch of allChapters()) for (const u of ch.units) for (const l of ["easy", "standard", "advanced"]) stars[`${u.id}-${l}`] = 3;
      return { ...p, stars };
    }),
    unlockAllSkills: () => updatePlayer((p) => ({ ...p, ownedSkills: BATTLE_SKILLS.map((s) => s.id) })),
    clearAllMonsters: () => {
      const cleared = new Set(
        (data.records || []).filter((r) => r.mode === "battle" && r.extra && r.extra.result === "win").map((r) => r.extra.monsterId)
      );
      for (const m of MONSTERS) {
        if (!cleared.has(m.id)) {
          store.addRecord(makeRecord({ studentId: data.player.studentId, mode: "battle", xp: 0, extra: { monsterId: m.id, result: "win" } }));
        }
      }
      setData((d) => ({ ...d, records: store.load().records }));
    },
    resetProgress: () => {
      const fresh = store.resetAll();
      setData({ player: fresh.player, records: fresh.records, mistakes: fresh.mistakes });
    },
  };

  // ゴールデンタイムを「自分のタイミングで」開始（その日まだ始めていなければ）。
  //  開始から15分間 XP1.2倍。焦らないよう、ホームのボタンで任意に始められる。
  function startGolden() {
    const today = todayStr();
    if (data.player.golden?.date === today) return; // 今日はもう開始済み
    updatePlayer((p) => ({ ...p, golden: { date: today, startMs: Date.now() } }));
  }

  // キャラクター画面：自分のキャラ／名前を設定
  function setAvatar(avatar) { updatePlayer((p) => ({ ...p, avatar })); }
  function setName(name) {
    const trimmed = (name || "").slice(0, 10);
    updatePlayer((p) => ({ ...p, name: trimmed }));
    if (serverActive()) updateNickname(trimmed); // ニックネームはいつでも変更可（ログインIDとは無関係）
  }

  // ご意見箱：ローカルには必ず残す（サーバー未設定/通信失敗でも消えない）＋サーバーにも送る（先生が閲覧）
  async function sendFeedback({ message, category }) {
    const entry = { message, category, at: Date.now() };
    updatePlayer((p) => ({ ...p, feedbackLog: [...(p.feedbackLog || []), entry].slice(-20) }));
    if (serverActive()) {
      await submitFeedback({ message, category, name: data.player.name, loginId: getRememberedId() });
    }
  }
  // ヒーローを💰HERO_PRICEで購入して解放（そのまま装備する）。成功で true。
  function buyHero(id) {
    let ok = false;
    updatePlayer((p) => {
      const owned = p.ownedHeroes || [];
      if (owned.includes(id)) { ok = true; return { ...p, avatar: { type: "hero", id } }; } // 所持済みは装備のみ
      if ((p.coins ?? 0) < HERO_PRICE) return p; // コイン不足
      ok = true;
      return { ...p, coins: (p.coins ?? 0) - HERO_PRICE, ownedHeroes: [...owned, id], avatar: { type: "hero", id } };
    });
    return ok;
  }

  // スキル画面：スロット(1|2)に装備するスキルを変える
  function setEquip(slot, skillId) {
    updatePlayer((p) => {
      const owned = p.ownedSkills || [];
      if (!owned.includes(skillId)) return p;
      return { ...p, equip: { ...(p.equip || {}), [slot]: skillId } };
    });
  }

  // バトルの結果。true=勝利, false=敗北, "retry"=やり直し。stats={correct,wrong}（学習記録用）
  function handleBattleResult(outcome, stats = {}) {
    if (outcome === "retry") { setBattleKey((k) => k + 1); return; }
    if (!battleMonster) return;
    const win = outcome === true;
    const correct = stats.correct || 0;
    const wrong = stats.wrong || 0;
    // 周回（プレステージ）：同じ周回の中で既に倒したか？で報酬を判定。
    //  「もう一周」で grade の周回数が上がると、過去の撃破は前の周回扱い→報酬がまた満額＆初撃破クリスタルも再開放。
    const monGrade = battleMonster.grade ?? 1;
    const curPrestige = (data.player.prestige && data.player.prestige[monGrade]) || 0;
    const alreadyCleared = (data.records || []).some(
      (r) => r.mode === "battle" && r.extra && r.extra.result === "win" && r.extra.monsterId === battleMonster.id && (r.extra.prestige || 0) === curPrestige
    );
    // 撃破済み（同じ周回内）なら報酬は半分（切り上げ）
    const gained = win ? (alreadyCleared ? Math.ceil(battleMonster.reward / 2) : battleMonster.reward) : 0;
    store.addRecord(makeRecord({
      studentId: data.player.studentId, mode: "battle",
      chapterId: battleMonster.chapterId ?? null, unitId: battleMonster.unitId ?? null,
      correct, wrong, // ★学習記録（日々の解答数・正解数）にバトルも反映
      xp: 0, // 経験値の概念は廃止（レベル＝サイクルクリア数）。報酬はお金で渡す。
      extra: { monsterId: battleMonster.id, result: win ? "win" : "lose", prestige: curPrestige },
    }));
    setData((d) => ({ ...d, records: store.load().records }));
    // 経験値ではなくお金（コイン）を付与。addXp(0)は連続学習日数の更新だけ行う（XPは増えない）。
    if (win) { updatePlayer((p) => ({ ...p, coins: (p.coins ?? 0) + gained })); addXp(0); }
    // 敗北：HP1（Battle側で保存済み）でメニュー画面へ戻る
    if (!win) { setBattleMonster(null); setScreen("home"); return; }
    // 勝利：エサを使った敵なら「仲間チャレンジ」。条件(★全部)＆未所持なら確率で仲間に。
    if (baitUsedRef.current === battleMonster.id) {
      baitUsedRef.current = null;
      tryRecruit(battleMonster);
    }
    // ※クリスタルは基本「サイクルクリア（1単元）＝1個」だけに一本化しているが、
    //   小単元ボス(unitSmallBoss・2026-07-19設計)だけは例外——初回撃破でクリスタル+1
    //   （そのクリスタルを単元別スキルの確定強化に使う）。
    if (battleMonster.kind === "unitSmallBoss" && !alreadyCleared) {
      updatePlayer((p) => ({ ...p, crystals: (p.crystals ?? 0) + 1 }));
    }
  }

  // バトル勝利時のボーナス（ついてる等のスキル効果＝コインのみ）。
  //  ※クリスタルはサイクルクリア専用に一本化したため、スキル由来のクリスタルは付与しない。
  function applyWinBonus({ coins = 0 } = {}) {
    if (!coins) return;
    const c = Math.round(coins * eventCoinMult()); // 水曜=お金2倍
    updatePlayer((p) => ({ ...p, coins: (p.coins ?? 0) + c }));
  }

  // なかま（おとも）を育てる：コイン/クリスタルで餐やりしてレベル+。
  // なかま育成：kind "hp"=お金でHPレベル↑ / "atk"=クリスタルで攻撃レベル↑
  function feedPartner(monsterId, kind = "hp") {
    const mon = findMonster(monsterId);
    if (!mon) return;
    const cur = data.player.partners?.[monsterId];
    if (!cur) return; // 未捕獲は育てられない
    const maxLv = partnerMaxLevel(mon);
    const isAtk = kind === "atk";
    const curLv = isAtk ? partnerAtkLv(cur) : partnerHpLv(cur);
    if (curLv >= maxLv) return; // そのステータスはカンスト
    const cost = feedCost(curLv, kind);
    if ((data.player.coins ?? 0) < cost.coins) return;       // コイン不足
    if ((data.player.crystals ?? 0) < cost.crystals) return; // クリスタル不足
    updatePlayer((p) => {
      const partners = { ...(p.partners || {}) };
      const e = partners[monsterId] || {};
      // 旧データ(lv のみ)から hpLv/atkLv へ移行しつつ、対象のレベルだけ +levels
      const hpLv = partnerHpLv(e);
      const atkLv = partnerAtkLv(e);
      const curL = isAtk ? atkLv : hpLv;
      if (curL >= maxLv) return p;
      const nextL = Math.min(maxLv, curL + cost.levels);
      partners[monsterId] = { ...e, hpLv, atkLv, [isAtk ? "atkLv" : "hpLv"]: nextL };
      return {
        ...p,
        partners,
        coins: (p.coins ?? 0) - cost.coins,
        crystals: (p.crystals ?? 0) - cost.crystals,
      };
    });
  }

  // ストック（編成）の出し入れ：最大4体。0体→最初の1体を自動でアクティブに。
  function toggleParty(monsterId) {
    if (!data.player.partners?.[monsterId]) return;
    updatePlayer((p) => {
      const party = Array.isArray(p.party) ? [...p.party] : [];
      const idx = party.indexOf(monsterId);
      let active = p.activePartner;
      if (idx >= 0) {
        party.splice(idx, 1);
        if (active === monsterId) active = party[0] || null; // アクティブを外したら先頭へ
      } else {
        if (party.length >= PARTY_MAX) return p; // 満員
        party.push(monsterId);
        if (!active) active = monsterId; // 初めての1体はアクティブに
      }
      return { ...p, party, activePartner: active };
    });
  }

  // バトルに出すアクティブ仲間を選ぶ（ストック内の1体）
  function setActivePartner(monsterId) {
    updatePlayer((p) => {
      const party = Array.isArray(p.party) ? p.party : [];
      if (!party.includes(monsterId)) return p;
      return { ...p, activePartner: p.activePartner === monsterId ? null : monsterId };
    });
  }

  // その敵を仲間にできる条件か（担当する全単元を簡単/普通/難しい★1以上・未所持）
  function canRecruit(monster) {
    if (!monster) return false;
    if (data.player.partners?.[monster.id]) return false; // すでに仲間
    const units = monster.kind === "unit"
      ? [monster.unitId]
      : (monster.pools || []).map((x) => x.u);
    if (!units.length) return false;
    return units.every((uid) => unitFullyStarred(data.player, uid));
  }

  // エサ使用済みの敵をたおしたとき：条件を満たせば確率で仲間に。
  function tryRecruit(monster) {
    if (!canRecruit(monster)) {
      // 条件未達 or 所持済み：仲間にはならない（エサは消費済み）
      setTimeout(() => setRecruitResult({ ok: false, name: monster.name, reason: "cond" }), 1700);
      return;
    }
    const success = Math.random() < recruitChance(monster);
    if (success) {
      updatePlayer((p) => {
        const partners = { ...(p.partners || {}), [monster.id]: { lv: 1 } };
        // ストックに空きがあれば自動で編成、アクティブ未設定なら出陣させる
        let party = Array.isArray(p.party) ? [...p.party] : [];
        let active = p.activePartner;
        if (party.length < PARTY_MAX) { party.push(monster.id); if (!active) active = monster.id; }
        return { ...p, partners, party, activePartner: active };
      });
    }
    setTimeout(() => setRecruitResult({ ok: success, name: monster.name }), 1700);
  }

  // バトルから「魔物のエサ」を使った敵を記録（撃破時の仲間判定に使う）
  function markBaitUsed(monsterId) {
    baitUsedRef.current = monsterId;
  }

  // 効果音：ボタンのクリック（決定/戻る）を全体で拾う（ホバーの移動音は無し）
  //  ・回答ボタン等は data-sfx="none" を付け、各画面で正解/不正解音を鳴らす
  //  ・戻る系（.back-btn / data-sfx="back"）は戻る音
  useEffect(() => {
    const click = (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      // 戻る系は戻る音、それ以外は全ボタンで「ピコッ」（data-sfx="none" でも鳴らす）
      if (b.classList.contains("back-btn") || b.dataset.sfx === "back") sfx.back();
      else sfx.tap();
    };
    document.addEventListener("click", click);
    return () => document.removeEventListener("click", click);
  }, []);

  // 画面に合わせてBGMを切り替える（勝利/敗北/タイムアタック終了は各画面で再生）
  useEffect(() => {
    // 【2026-09-22】はいちモード（一覧・動画スタジオ・確認問題）にいる間は、BGMを控えめにする。
    //  動画の再生中だけさらに0（実質オフ）にする調整は HaichiStudio.jsx がYouTubeの再生状態を見て行う。
    //  はいちモードを出れば（screenが変わればこの effect が再度走るので）ここで1に戻る。
    bgm.setDuckLevel(["haichi", "haichiStudio", "haichiStudioPractice"].includes(screen) ? 0.35 : 1);
    if (screen === "third") return; // 仲間・ガチャ・バトル画面のBGMは ThirdApp / ThirdBattle が切り替える
    if (screen === "start") { bgm.stop(); return; }
    if (screen === "opening") { bgm.stop(); return; } // オープニング映像は映像側の音を使う（OP曲は止める）
    if (screen === "title") { bgm.play("op"); return; }
    if (screen === "timeAttack") { bgm.play("timeattack"); return; }
    if (screen === "slow" || screen === "anshin") { bgm.play("slow"); return; }
    if (screen === "stepUp") { bgm.play("slow"); return; }
    if (screen === "relearnPractice") { bgm.play("slow"); return; } // 学び直しの練習はステップアップのBGM
    if (screen === "challenge" || screen === "calcKingPick") { bgm.play("unittest"); return; } // 計算王への道は単元テストの音源
    if (screen === "unitTest") { bgm.play(utChapter ? "unittest" : "menu"); return; }
    if (screen === "battle") {
      if (battleMonster) bgm.play((battleMonster.kind === "chapterBoss" || battleMonster.kind === "finalBoss" || battleMonster.kind === "secretBoss") ? "boss" : "battle");
      else bgm.play("menu");
      return;
    }
    bgm.play("menu"); // home / chapter / notebook など
  }, [screen, battleMonster, utChapter, battleKey]);

  // 【2026-09-21】ログインボーナス(コイン・演出)は廃止。「学習の記録」で使う連続日数と前回ログイン日だけ、1日1回記録する。
  useEffect(() => {
    if (screen !== "home" || loginCheckedRef.current) return;
    loginCheckedRef.current = true;
    const today = todayStr();
    if (!canClaimLogin(data.player, today)) return;
    const { streak } = computeLogin(data.player, today);
    updatePlayer((p) => ({
      ...p,
      loginStreak: streak,
      prevLoginDate: p.lastLoginDate || null, // 「学習の記録」に出す「前回のログイン日」
      lastLoginDate: today,
    }));
  }, [screen]); // eslint-disable-line

  async function loadThird() {
    const r = await thirdApi.getState();
    if (r.status === 200) setThirdState(r.body.state);
  }
  function applyMedalResponse(r) {
    if (r.status === 200) {
      setThirdState(r.body.state);
      const items = [...(r.body.newMedals || []), ...(r.body.crystalEvents || []).map((e) => ({ kind: "crystal", ...e }))];
      if (items.length) setMedalToast(items);
    }
  }
  async function sendWithRetry(fn) {
    let r = await fn();
    if (r.status === 409) { await new Promise((res) => setTimeout(res, 500)); r = await fn(); }
    applyMedalResponse(r);
  }
  // れんしゅうの解答：少しためてまとめて送る（サーバーが seed から問題を作り直して採点）。
  function queuePractice(a) {
    if (a?.pseed == null) return;
    if (practiceBufRef.current.some((x) => x.seed === a.pseed && x.unitId === a.unitId)) return;
    practiceBufRef.current.push({ unitId: a.unitId, level: a.level, seed: a.pseed, answer: String(a.userAnswer), ms: a.ms || 0 });
    clearTimeout(flushTimerRef.current);
    flushTimerRef.current = setTimeout(flushPractice, 3500);
  }
  function flushPractice() {
    clearTimeout(flushTimerRef.current);
    const at = practiceBufRef.current.splice(0);
    if (at.length) sendWithRetry(() => thirdApi.practice(at));
  }
  // 確認問題(はいち)の解答：直近5問(＝1ラウンド)だけ持っておく。
  function queueConfirm(a) {
    if (a?.pseed == null) return;
    if (confirmBufRef.current.some((x) => x.seed === a.pseed && x.unitId === a.unitId)) return;
    confirmBufRef.current = [...confirmBufRef.current, { unitId: a.unitId, level: a.level, seed: a.pseed, answer: String(a.userAnswer), ms: a.ms || 0 }].slice(-5);
  }
  function sendConfirm(key) {
    const at = confirmBufRef.current.slice(-5);
    confirmBufRef.current = [];
    if (at.length) sendWithRetry(() => thirdApi.confirm(key, at));
  }
  useEffect(() => { loadThird(); }, []); // eslint-disable-line
  // 学習ログ：ログイン(滞在)時間の計測を始め、前回送れなかったバトルの解答記録があれば送り直す
  useEffect(() => { flushBattleLogs(); return startSessionPing(); }, []);
  useEffect(() => { flushPractice(); if (screen === "home") loadThird(); }, [screen]); // eslint-disable-line
  useEffect(() => {
    const f = () => flushPractice();
    window.addEventListener("pagehide", f);
    return () => window.removeEventListener("pagehide", f);
  }, []); // eslint-disable-line

  // 設定のアラーム：セットした時刻(player.alarm.endAt)を過ぎたら、どの画面でも鳴らす。
  useEffect(() => {
    const id = setInterval(() => {
      const end = data.player.alarm?.endAt;
      if (end && Date.now() >= end) setAlarmRinging(true);
    }, 1000);
    return () => clearInterval(id);
  }, [data.player.alarm?.endAt]); // eslint-disable-line

  // 画面の振り分け
  const goChapter = (m) => { setMode(m); setScreen("chapter"); };

  // あんしん／じっくりのクリア後に「バトルで実践」へ進む導線。
  //  その単元のモンスターが解放済み（あんしんで easy★1 が付くと解放される）なら直接対戦、
  //  まだなら相手選択画面（バトルモード）へ。流れ：あんしん→学び直し→バトル。
  // 演習バトルの出題＝この単元の問題を、難易度ナビ（④）で選んだレベルで1問ずつ出す
  function battleProblemSource(unit) {
    return (lastId) => {
      // #2 誤答束の変種を約2割だけ混入：この単元自身の未解決まちがいから1件くじで選び、変種を出す。
      //  （見えない学び直し。正解できたら advanceRelearnPhase を進め「なおしずみ」演出）
      const unitMistakes = (data.mistakes || []).filter((m) => m.unitId === unit.id);
      if (unitMistakes.length && Math.random() < 0.2) {
        const pick = unitMistakes[Math.floor(Math.random() * unitMistakes.length)];
        const lvl = pick.level || battleDiffRef.current.level;
        const p = genProblemSeeded(unit, lvl, lastId) || genProblemSeeded(unit, battleDiffRef.current.level, lastId);
        if (p) {
          battleMistakeSourceRef.current = { unitId: unit.id, q: p.q };
          return { ...p, choices: makeChoices(p.ans) };
        }
      }
      battleMistakeSourceRef.current = null;
      // ④ 難易度ナビ：ふつう開始→2ミスで↓／5連正解で↑（battleDiffRef を1問ごとに更新）
      const lvl = battleDiffRef.current.level;
      const p = genProblemSeeded(unit, lvl, lastId) || genProblemSeeded(unit, "standard", lastId) || genProblemSeeded(unit, "easy", lastId);
      return p ? { ...p, choices: makeChoices(p.ans) } : null; // choices→4択(数値) / 記述は自由入力
    };
  }
  // 演習バトルの解答1問ごと：難易度ナビを更新し、出題が誤答束由来なら学び直しの段階も進める。
  function recordBattlePracticeAttempt(a) {
    battleDiffRef.current = nextDifficulty(battleDiffRef.current, !!a.ok);
    recordStepAttempt(a);
    const src = battleMistakeSourceRef.current;
    if (src && src.q === a.q) {
      advanceRelearnPhase(src.unitId, a.ok);
      if (a.ok) {
        const unit = findUnitById(src.unitId);
        if (unit) setTimeout(() => setNaoshizumi({ unitName: unit.name }), 300);
      }
    }
  }

  // #2 通常バトル（相手モンスターとの戦闘）の出題。2つの役目を持つ：
  //  ①難易度ナビ接続：モンスターの固定[standard,standard,advanced]列でなく、battleGeneralDiffRefで
  //    ふつう開始→2ミスで↓／5連正解で↑にする（ボスはbossAdvancedOnlyで従来どおり発展固定）。
  //  ②誤答束の変種を約2割だけ混入：気づかれない学び直し。まちがいノートから1件くじで選び、
  //    その単元の変種を出す（正解できたら advanceRelearnPhase を進め「なおしずみ」演出）。
  function generalBattleProblemSource(monster) {
    return (lastId) => {
      const mistakes = data.mistakes || [];
      const withUnit = mistakes.filter((m) => m.unitId);
      if (withUnit.length && Math.random() < 0.2) {
        const pick = withUnit[Math.floor(Math.random() * withUnit.length)];
        const unit = findUnitById(pick.unitId);
        const lvl = pick.level || battleGeneralDiffRef.current.level;
        const p = unit && (genProblemSeeded(unit, lvl, lastId) || genProblemSeeded(unit, battleGeneralDiffRef.current.level, lastId));
        if (p) {
          battleMistakeSourceRef.current = { unitId: pick.unitId, q: p.q };
          return { ...p, unitName: unit.name, level: lvl };
        }
      }
      battleMistakeSourceRef.current = null;
      const lvl = monster.bossAdvancedOnly ? null : battleGeneralDiffRef.current.level;
      return genBattleProblem(monster, lastId, lvl);
    };
  }
  // 通常バトルの解答1問ごと：難易度ナビを更新し、出題が誤答束由来なら学び直しの段階も進める。
  function recordBattleGeneralAttempt(a) {
    battleGeneralDiffRef.current = nextDifficulty(battleGeneralDiffRef.current, !!a.ok);
    shadowSubmit({ unitId: a.unitId, level: a.level, templateId: a.templateId, seed: a.seed, userAnswer: a.userAnswer, mode: "battle" });
    const src = battleMistakeSourceRef.current;
    if (src && src.q === a.q) {
      advanceRelearnPhase(src.unitId, a.ok);
      if (a.ok) {
        const unit = findUnitById(src.unitId);
        if (unit) setTimeout(() => setNaoshizumi({ unitName: unit.name }), 300);
      }
    }
  }
  // 「⚔️ バトル」ボタンの行き先（数学ラボ3）。旧バトル（主人公がターン制で戦う）は外し、
  //  仲間5体が戦う新バトルだけにした。バトルはメダルの条件なしで新バトルへ（戦えない小単元だけホームへ戻す）。旧バトルの実装(TurnBattle/Battle)はコードとして残している。
  function goBattleForUnit(unit) {
    const chapter = unit && findChapterByUnitId(unit.id);
    const params = chapter && worldBattleFor(grade, chapter, unit);
    if (params) {
      setThirdStart({ screen: "battle", params });
      setScreen("third");
      return;
    }
    setScreen("home");
  }

  // 「章のまとめにチャレンジ！」：その章のボスの梯子で、まだ倒していない最初の段に挑む
  //  （全部倒していれば最後の段＝第6段をもう一度挑戦できる）。
  function challengeChapterBoss(chapterId) {
    const clearedIds = new Set(
      (data.records || []).filter((r) => r.mode === "battle" && r.extra?.result === "win").map((r) => r.extra.monsterId)
    );
    const ladder = MONSTERS.filter((m) => m.kind === "unitBoss" && m.chapterId === chapterId).sort((a, b) => a.tier - b.tier);
    if (!ladder.length) return;
    const next = ladder.find((m) => !clearedIds.has(m.id)) || ladder[ladder.length - 1];
    battleGeneralDiffRef.current = initDifficulty("standard");
    battleMistakeSourceRef.current = null;
    setBattleMonster(next);
    setBattlePractice(null);
    setBattleKey((k) => k + 1);
    setScreen("battle");
  }

  // 「小単元ボスに挑戦」：その小単元専用の強敵と戦う（初回撃破でクリスタル獲得）
  function challengeUnitBoss(unit) {
    const monster = unit && MONSTERS.find((m) => m.kind === "unitSmallBoss" && m.unitId === unit.id);
    if (!monster) return;
    battleGeneralDiffRef.current = initDifficulty("standard");
    battleMistakeSourceRef.current = null;
    setBattleMonster(monster);
    setBattlePractice(null);
    setBattleKey((k) => k + 1);
    setScreen("battle");
  }

  const renderScreen = () => {
  if (screen === "start") {
    return <StartScreen onStart={() => setScreen(needsOnboard ? "transfer" : "title")} />; // オープニング映像は廃止（数学ラボ3）
  }

  // オープニング映像（タップでスキップ可）→ ブラックアウト→1秒後にタイトル（初回は引き継ぎ画面）へ
  if (screen === "opening") {
    return <Opening onDone={() => setScreen(needsOnboard ? "transfer" : "title")} />;
  }

  // 初回起動：v4からの引き継ぎ（別ホストなのでバックアップファイルで移行）
  if (screen === "transfer") {
    return (
      <Transfer
        player={data.player}
        onImportFile={(file, cb) => restoreBackup(file, (ok, err) => { if (ok) markOnboarded(); cb?.(ok, err); })}
        onSkip={() => { markOnboarded(); setScreen("title"); }}
      />
    );
  }

  if (screen === "title") {
    return (
      <TitleScreen
        onEnter={() => setScreen("home")}
        onAdmin={() => setScreen("admin")}
        onHowTo={() => setScreen("howto")}
        onCharacter={() => setScreen("character")}
      />
    );
  }

  // 管理用モード（タイトルの📐を5回タップで開く隠しコマンド）
  if (screen === "admin") {
    return <Admin player={data.player} records={data.records} admin={admin} onExport={downloadBackup} onImport={restoreBackup} onBack={() => setScreen("home")} />;
  }

  // 遊び方（ヘルプ）
  if (screen === "howto") {
    return <HowTo player={data.player} onExport={downloadBackup} onImport={restoreBackup} onSetting={(k, v) => updatePlayer((p) => ({ ...p, [k]: v }))} onBack={() => setScreen("home")} />;
  }

  // キャラクター設定
  if (screen === "character") {
    return <Character player={data.player} onSetAvatar={setAvatar} onSetName={setName} onBuyHero={buyHero} onBack={() => setScreen("home")} />;
  }

  // 困り感クリニック（試作：1スキル）
  if (screen === "clinic") {
    return <Clinic player={data.player} onComplete={saveClinicResult} onHome={() => setScreen("home")} />;
  }

  // 数学ラボ3：math-worldのバトル／パーティ編成
  if (screen === "third") {
    return (
      <Suspense fallback={<div className="app"><div className="content"><div className="glass" style={{ padding: 20, textAlign: "center" }}>読み込み中…</div></div></div>}>
        <ThirdApp player={(setViewGrade(grade), data.player)} start={thirdStart} onExit={() => setScreen("home")} />
      </Suspense>
    );
  }

  // 対話型数学授業（試作）：黒板＋AI先生と発問でやり取り
  if (screen === "dialogue") {
    return (
      <Suspense fallback={<div className="app"><div className="content"><div className="glass" style={{ padding: 20, textAlign: "center" }}>読み込み中…</div></div></div>}>
        <DialogueLesson player={data.player} onBack={() => setScreen("home")} />
      </Suspense>
    );
  }

  // 教師モード：仮想生徒の誤答から作った説明→確認クイズのノードグラフを黒板+TTSで再生
  if (screen === "teacherMode") {
    return (
      <Suspense fallback={<div className="app"><div className="content"><div className="glass" style={{ padding: 20, textAlign: "center" }}>読み込み中…</div></div></div>}>
        <TeacherMode player={data.player} onBack={() => setScreen("home")} onMistake={recordWrongAnswer}
          focusChapterId={teacherFocus?.chapterId || null}
          focusUnit={teacherFocus?.unit || null}
          onConfirmQuiz={(unit) => goConfirmQuiz(unit, "teacherMode")}
        />
      </Suspense>
    );
  }

  // ご意見箱：アプリへの感想・要望・バグ報告を先生に届ける
  if (screen === "feedback") {
    return <Feedback player={data.player} onBack={() => setScreen("home")} onSubmit={sendFeedback} />;
  }

  if (screen === "chapter") {
    return (
      <ChapterSelect
        player={data.player}
        mode={mode}
        chapters={(mode === "timeAttack" || mode === "anshin") ? chaptersForGrade(grade) : CHAPTERS}
        onStart={(chapter, unit, level) => {
          setSel({ chapter, unit, level });
          setScreen(mode); // "timeAttack" など
        }}
        onLesson={(unit) => {
          // 単元選択の「動画＋プリント」→ ページ形式の新スタジオ（前/次・表示切替など）へ。
          //  対応する葉一さんのレッスンが無い単元だけ、従来の簡易ページにフォールバック。
          if (findHaichiLessonForUnit(unit.id)) openHaichiStudio(unit, "chapter");
          else { setLessonUnit(unit); setScreen("lesson"); }
        }}
        onBack={() => setScreen("home")}
      />
    );
  }

  // はいちモード：葉一さんのレッスン（大単元→動画一覧→スタジオ→リンク練習）
  //  画面遷移（一覧・スタジオ・練習）は HaichiMode 内部で完結。学習記録だけ App に渡す。
  if (screen === "haichi") {
    return (
      <HaichiMode
        player={data.player}
        grade={grade}
        onSetGrade={setWorld}
        onAttempt={(a) => recordStepAttempt({ ...a, cycleSkip: true })}
        onWatched={markHaichiWatched}
        onPass={markHaichiPassed}
        onBack={() => setScreen("home")}
      />
    );
  }

  // 他モードから開いた動画スタジオ（動画＋ワークシート＋手書き）。閉じたら呼び出し元へ戻る。
  //  はいちモードと同じく onPractice/onPass を配線し、下に「確認問題」ボタン→練習→合格判定を出す。
  if (screen === "haichiStudio" && haichiStudio) {
    return (
      <HaichiStudio
        player={data.player}
        grade={haichiStudio.grade}
        section={haichiStudio.section}
        lesson={haichiStudio.lesson}
        watchedMap={data.player.haichiWatched || {}}
        passedMap={data.player.haichiPassed || {}}
        onChangeLesson={(L) => setHaichiStudio((s) => ({ ...s, lesson: L }))}
        onWatched={(key) => markHaichiWatched(key)}
        onPractice={(L) => { setHaichiStudio((s) => ({ ...s, lesson: L })); setScreen("haichiStudioPractice"); }}
        onPass={markHaichiPassed}
        onBack={() => setScreen(haichiStudio.ret || "home")}
      />
    );
  }

  // 講義（確認問題）：動画が無い単元は、教師モードの説明を頼りにその単元から直接5問出題し、
  //  80%で合格＝markNoVideoLecturePassed（講義クリア扱い）。終わったら教師モードへ戻す。
  if (screen === "haichiStudioPractice" && haichiStudio?.noVideo) {
    const unit = haichiStudio.unit;
    const sc = findScaffold(unit, data.player.skillStats || {});
    const passChapter = findChapterByUnitId(unit.id);
    return (
      <StepUpSimple
        key={"noVideoConfirm-" + unit.id}
        player={data.player}
        units={[unit]}
        title={`確認問題：${unit.name}`}
        roundSize={5}
        passRate={80}
        onAttempt={(a) => recordStepAttempt({ ...a, cycleSkip: true })}
        onRoundEnd={({ correct, seen }) => { if (seen > 0 && correct / seen >= 0.8) markNoVideoLecturePassed(unit.id); }}
        onHome={() => setScreen(haichiStudio.ret || "home")}
        failAction={sc ? {
          label: `🔍 ここが土台かも：「${sc.skillName}」を3問`,
          onClick: () => { setScaffold({ ...sc, returnTo: "haichiStudioPractice" }); setScreen("scaffold"); },
        } : null}
        passActions={[
          { label: "✏️ れんしゅう", onClick: () => { setSel({ chapter: passChapter, unit, level: "standard", nav: true }); setScreen("anshin"); } },
          { label: "⚔️ バトル", onClick: () => goBattleForUnit(unit) },
        ]}
      />
    );
  }

  // 講義（確認問題）：その動画にリンクした単元から5問出題し、80%で合格＝markHaichiPassed。
  //  合格すると一覧の講義ボタンに「✓クリア」が点き、ためす・なおすが済んでいればサイクルクリアになる。
  if (screen === "haichiStudioPractice" && haichiStudio?.lesson) {
    const g = haichiStudio.grade, L = haichiStudio.lesson;
    const key = `g${g}m${L.n}`;
    const units = (L.u || []).map(findUnitById).filter(Boolean);
    if (units.length > 0) {
      // 足場（B-1）：確認に落ちた時、その単元の最弱前提を1つ提案する（無ければnull）
      const sc = findScaffold(units[0], data.player.skillStats || {});
      // 合格後は「ためす」へ直行できる（れんしゅう or バトルを選ぶ）
      const passUnit = units[0];
      const passChapter = findChapterByUnitId(passUnit.id);
      return (
        <StepUpSimple
          key={"haichi-" + key}
          player={data.player}
          units={units}
          title={`確認問題：${L.t}`}
          roundSize={5}
          passRate={80}
          onAttempt={(a) => recordStepAttempt({ ...a, cycleSkip: true })}
          onRoundEnd={({ correct, seen }) => { if (seen > 0 && correct / seen >= 0.8) markHaichiPassed(key); }}
          onHome={() => setScreen("haichiStudio")}
          failAction={sc ? {
            label: `🔍 ここが土台かも：「${sc.skillName}」を3問`,
            onClick: () => { setScaffold({ ...sc, returnTo: "haichiStudioPractice" }); setScreen("scaffold"); },
          } : null}
          passActions={[
            { label: "✏️ れんしゅう", onClick: () => { setSel({ chapter: passChapter, unit: passUnit, level: "standard", nav: true }); setScreen("anshin"); } },
            { label: "⚔️ バトル", onClick: () => goBattleForUnit(passUnit) },
          ]}
        />
      );
    }
  }

  // B-3 診断「どこから始める？」：章ごとの軽いチェック→理解度マップ→おすすめスタート。
  if (screen === "diagnose" && diagnoseChapter) {
    return (
      <Diagnose
        key={"diag-" + diagnoseChapter.id}
        player={data.player}
        chapter={diagnoseChapter}
        onApply={applyDiagnosis}
        onStartUnit={(unit) => { setDiagnoseChapter(null); openHaichiStudio(unit, "home"); }}
        onBack={() => { setDiagnoseChapter(null); setScreen("home"); }}
      />
    );
  }

  // 足場（B-1）：躓きの前提スキルを練習する。時間無制限・3問・サイクルは動かさない(cycleSkip)。
  //  終わったら元の確認問題へ戻して、再挑戦できるようにする。
  if (screen === "scaffold" && scaffold?.unit) {
    return (
      <StepUpSimple
        key={"scaffold-" + scaffold.skillId}
        player={data.player}
        units={[scaffold.unit]}
        title={`土台：${scaffold.skillName}`}
        roundSize={3}
        onAttempt={(a) => recordStepAttempt({ ...a, cycleSkip: true })}
        onHome={() => setScreen(scaffold.returnTo || "haichiStudio")}
      />
    );
  }

  if (screen === "lesson" && lessonUnit) {
    return (
      <Suspense fallback={<div className="app"><div className="content"><div className="glass" style={{ padding: 20, textAlign: "center" }}>読み込み中…</div></div></div>}>
        <Lesson
          player={data.player}
          unit={lessonUnit}
          media={lessonMediaFor(lessonUnit.id)}
          onBack={() => setScreen("chapter")}
        />
      </Suspense>
    );
  }

  if (screen === "timeAttack" && sel.unit) {
    return (
      <TimeAttack
        player={data.player}
        chapter={sel.chapter}
        unit={sel.unit}
        level={sel.level}
        onComplete={saveTimeAttackResult}
        onAttempt={(a) => { shadowSubmit({ ...a, mode: "practice" }); queuePractice(a); }}
        onBackToMap={() => setScreen("chapter")}
        onHome={() => setScreen("home")}
        onHaichi={() => openHaichiStudio(sel.unit, "timeAttack")}
        weakUnits={getWeakUnits(data.player, data.mistakes, data.records)}
        onWeakStart={startWeakTA}
        onRelearn={(unit) => { relearnStreakRef.current[unit.id] = 0; setPracticeUnit(unit); setScreen("relearnPractice"); }}
        onOpenRelearnList={() => setScreen("relearn")}
      />
    );
  }

  // 苦手タイムアタック：苦手な小単元の問題を混ぜて出題
  if (screen === "weakTA") {
    const weak = getWeakUnits(data.player, data.mistakes, data.records);
    if (weak.length === 0) {
      return (
        <div className="app">
          <Header player={data.player} back="ホーム" onBack={() => setScreen("home")} />
          <div className="content">
            <div className="glass" style={{ padding: 18, textAlign: "center" }}>
              いまは苦手な単元が見つかりませんでした。<br />
              タイムアタックやステップアップで練習すると、苦手が見えてきます。
            </div>
          </div>
        </div>
      );
    }
    return (
      <TimeAttack
        key={"weak-" + weakKey}
        player={data.player}
        unit={buildWeakUnit(weak)}
        level="standard"
        weak
        weakUnits={weak}
        onComplete={saveWeakResult}
        onHome={() => setScreen("home")}
        onBackToMap={() => setScreen("home")}
        onWeakStart={startWeakTA}
      />
    );
  }

  if (screen === "slow" && sel.unit) {
    return (
      <SlowMode
        player={data.player}
        chapter={sel.chapter}
        unit={sel.unit}
        level={sel.level}
        onComplete={saveSlowResult}
        onAttempt={(a) => { shadowSubmit({ ...a, mode: "practice" }); queuePractice(a); }}
        onBackToMap={() => setScreen("home")}
        onHome={() => setScreen("home")}
        onRelearn={() => setScreen("relearn")}
        onBattle={() => goBattleForUnit(sel.unit)}
        onHaichi={() => openHaichiStudio(sel.unit, "slow")}
      />
    );
  }

  // あんしんモード（★1/★2/★6）：タイマーなし・失敗なし・最初はかんたん・3段階ヒント
  if (screen === "anshin" && sel.unit) {
    return (
      <SlowMode
        player={data.player}
        chapter={sel.chapter}
        unit={sel.unit}
        level={sel.level}
        anshin
        navDifficulty={!!sel.nav}
        fixedLevel={!!sel.fixed}
        initialNavLevel={(data.player.navLevel && data.player.navLevel[sel.unit.id]) || "standard"}
        onNavLevelChange={(lv) => updatePlayer((p) => ({ ...p, navLevel: { ...(p.navLevel || {}), [sel.unit.id]: lv } }))}
        cyclePracticeN={thirdState?.medals?.practiceN?.[sel.unit.id] || 0} // れんしゅうメダルの進捗（サーバーが認めた正解数）
        onComplete={saveSlowResult}
        onAttempt={(a) => { shadowSubmit({ ...a, mode: "practice" }); queuePractice(a); }}
        onBackToMap={() => setScreen("home")}
        onHome={() => setScreen("home")}
        onRelearn={() => setScreen("relearn")}
        onBattle={() => goBattleForUnit(sel.unit)}
        onHaichi={() => openHaichiStudio(sel.unit, "anshin")}
      />
    );
  }

  // 学び直しモード（間違いノート＋学び直しの一本化）：間違い一覧→学び直し/解説
  if (screen === "relearn") {
    return (
      <Relearn
        player={data.player}
        mistakes={data.mistakes}
        focusUnitId={relearnFocus}
        onSeeAll={() => setRelearnFocus(null)}
        onRelearn={(unit) => { relearnStreakRef.current[unit.id] = 0; setPracticeUnit(unit); setScreen("relearnPractice"); }}
        onHaichi={(unit) => openHaichiStudio(unit, "relearn")}
        onRemove={removeNote}
        onBack={() => setScreen("home")}
      />
    );
  }

  // 学び直しの練習（時間制限なし・1問15XP＝1.5倍・クリスタルは出ない・StepUpSimpleを流用）
  if (screen === "relearnPractice" && practiceUnit) {
    const rlPhase = relearnPhase(practiceUnit.id);
    // 5問れんぞく正解で消えるので、1セット＝5問。
    const rlRound = RELEARN_STREAK_TARGET;
    return (
      <StepUpSimple
        key={"relearn-" + practiceUnit.id}
        player={data.player}
        units={[practiceUnit]}
        title={`学び直し：${practiceUnit.name}`}
        roundSize={rlRound}
        onAttempt={handleRelearnAttempt}
        onHome={() => setScreen("relearn")}
      />
    );
  }

  if (screen === "shop") {
    return <Shop player={data.player} onBuy={buyItem} onDiscard={discardItem} onHeal={healPlayer} onPullGacha={pullGacha} onEquipGear={equipGear} onBack={() => setScreen("home")} />;
  }

  // モンスター図鑑（倒したモンスターのコレクション）
  if (screen === "collection") {
    return <Collection player={data.player} records={data.records} onPartners={() => setScreen("partners")} onBack={() => setScreen("home")} />;
  }

  // なかま（おとも）育成画面
  if (screen === "partners") {
    return <Partners player={data.player} onFeed={feedPartner} onToggleParty={toggleParty} onSetActive={setActivePartner} onBack={() => setScreen("home")} />;
  }

  // スキルセット画面（スロット1/2に装備するスキルを選ぶ）
  if (screen === "skill") {
    return <Skill player={data.player} onEquip={setEquip} onPullSkill={pullSkillGacha} onBack={() => setScreen("home")} />;
  }

  // 単元別スキル ロードアウト（2026-07-18設計）：所持スキルから最大2つ装備する
  if (screen === "loadout") {
    return <Loadout player={data.player} onToggle={toggleEquippedChapterSkill} onLevelUp={levelUpChapterSkill} onBack={() => setScreen("home")} />;
  }

  // アイテム（2026-07-19復活・ガチャ方式）：ストック最大10・バトル持ち込み最大2
  if (screen === "items") {
    return <Items player={data.player} onPull={pullItemGacha} onToggle={toggleEquippedItem} onBack={() => setScreen("home")} />;
  }

  // 必殺技一覧（2026-07-19設計）：💰ガチャで集めて1つを装備する
  if (screen === "ultimates") {
    return <Ultimates player={data.player} onPull={pullUltimateGacha} onEquip={equipUltimate} onBack={() => setScreen("home")} />;
  }

  // 自分のステータス（HP・各単元のBPメーター）
  if (screen === "statusMeter") {
    return <StatusMeter player={data.player} onBack={() => setScreen("home")} />;
  }

  // 学習記録（2026-07-29新設）：昨日の学習時間目安・単元別の問題数／直近7日間の合計とメーター
  if (screen === "studyLog") {
    return <StudyLog player={data.player} records={data.records} onBack={() => setScreen("home")} />;
  }

  // ステータス詳細（単元・小単元ごとの理解度・正答率・AIの一言）
  if (screen === "status") {
    return <StatusDetail player={data.player} records={data.records} onBack={() => setScreen("home")} />;
  }

  // 計算王への道：まず単元（章）をえらぶ
  if (screen === "calcKingPick") {
    return (
      <CalcPracticePick
        player={data.player}
        chapterMode
        title="🧮 計算王への道"
        subtitle="単元（章）を選んで、その全範囲のハイレベル問題に連続で挑戦しよう（自己ベストに挑戦）"
        onPick={(c) => { setCalcChapter(c); challengeBackRef.current = "calcKingPick"; setScreen("challenge"); }}
        onBack={() => setScreen("home")}
      />
    );
  }

  // チャレンジ「計算王への道」：選んだ単元（章、または小単元1つだけの疑似章）から、
  //  式を書く問題を連続正解＋タイムで自己ベストに挑戦。
  if (screen === "challenge" && calcChapter) {
    return (
      <Challenge
        player={data.player}
        chapter={calcChapter}
        onResult={recordCalcKing}
        onAttempt={(a) => shadowSubmit({ ...a, mode: "applied" })}
        onMistake={(m) => recordWrongAnswer({ ...m, chapterId: calcChapter?.id || null })}
        onBack={() => setScreen(challengeBackRef.current)}
        onHome={() => setScreen("home")}
        backLabel={challengeBackRef.current === "home" ? "ホーム" : "単元をえらぶ"}
      />
    );
  }

  // 間違いノートからの単元別じっくり練習（単元えらび）
  if (screen === "calcPick") {
    return (
      <CalcPracticePick
        player={data.player}
        title="📚 単元別じっくり練習"
        subtitle="単元を選んで、時間制限なしで練習しよう（間違えても止まりません）"
        onPick={(c, u) => { setPracticeUnit(u); setScreen("calcPractice"); }}
        onBack={() => setScreen("notebook")}
      />
    );
  }

  // 単元別じっくり練習（時間制限なし・StepUpSimpleを流用）
  if (screen === "calcPractice" && practiceUnit) {
    return (
      <StepUpSimple
        key={"prac-" + practiceUnit.id}
        player={data.player}
        units={[practiceUnit]}
        title={`じっくり：${practiceUnit.name}`}
        onAttempt={recordStepAttempt}
        onHome={() => setScreen("calcPick")}
        weakUnits={getWeakUnits(data.player, data.mistakes, data.records)}
        onRelearn={(unit) => { relearnStreakRef.current[unit.id] = 0; setPracticeUnit(unit); setScreen("relearnPractice"); }}
        onHaichi={(unit) => openHaichiStudio(unit, "calcPractice")}
        onOpenRelearnList={() => setScreen("relearn")}
      />
    );
  }

  // ステップアップ（弱点克服）モード
  //  中1：c1（正負の数）をアダプティブに出題。中2・中3：学年の単元から固定問題を出題。
  if (screen === "stepUp") {
    if (grade === 1) {
      return (
        <StepUp
          player={data.player}
          chapter={CHAPTERS[0]}
          onAttempt={recordStepAttempt}
          onHome={() => setScreen("home")}
          onHaichi={(unit) => openHaichiStudio(unit, "stepUp")}
          onChallenge={() => setScreen("calcKingPick")}
          onRelearn={() => setScreen("relearn")}
        />
      );
    }
    const units = chaptersForGrade(grade).flatMap((c) => c.units);
    return (
      <StepUpSimple
        player={data.player}
        units={units}
        title={`ステップアップ（中${grade}）`}
        onAttempt={recordStepAttempt}
        onHome={() => setScreen("home")}
        weakUnits={getWeakUnits(data.player, data.mistakes, data.records)}
        onRelearn={(unit) => { relearnStreakRef.current[unit.id] = 0; setPracticeUnit(unit); setScreen("relearnPractice"); }}
        onHaichi={(unit) => openHaichiStudio(unit, "stepUp")}
        onOpenRelearnList={() => setScreen("relearn")}
      />
    );
  }

  // バトルモード：相手選択 → 戦闘
  if (screen === "battle") {
    if (!battleMonster) {
      // これまでに撃破したモンスターのIDを集める
      const clearedIds = new Set(
        (data.records || [])
          .filter((r) => r.mode === "battle" && r.extra && r.extra.result === "win")
          .map((r) => r.extra.monsterId)
      );
      return (
        <BattleSelect
          player={data.player}
          clearedIds={clearedIds}
          onSelect={(m) => { battleGeneralDiffRef.current = initDifficulty("standard"); battleMistakeSourceRef.current = null; setBattleMonster(m); setBattlePractice(null); setBattleKey((k) => k + 1); }}
          onSeen={markMonstersSeen}
          onClaimSkill={claimChapterSkillGacha}
          onOpenLoadout={() => setScreen("loadout")}
          onBack={() => setScreen("home")}
        />
      );
    }
    // 正の数・負の数(c1)のモンスターは「行動選択型バトル(v2)」で試作。他は従来バトル。
    const maxHearts = Math.min(13, 5 + new Set((data.records || []).filter((r) => r.mode === "battle" && r.extra?.result === "win" && /^boss_/.test(r.extra?.monsterId || "")).map((r) => r.extra.monsterId)).size);
    const useTurnBattle = battleMonster && (battleMonster.grade ?? 1) === 1; // 中1は全章 行動選択型バトルへ
    // その章の最大BP上限（現在はBASE_BP_CAP=BP_MAXのため常に350。段階解放を再有効化する時のために残置）
    const battleChapterCap = (() => {
      if (!useTurnBattle || !battleMonster?.chapterId) return undefined;
      const ch = findChapterById(battleMonster.chapterId);
      const clearedN = ch ? ch.units.filter((u) => isCalcKingCleared(data.player, u.id)).length : 0;
      return chapterBPCap(clearedN);
    })();
    if (useTurnBattle) {
      return (
        <TurnBattle
          key={battleKey}
          player={data.player}
          monster={battleMonster}
          maxHearts={maxHearts}
          chapterCap={battleChapterCap}
          onUseItem={useBattleItem}
          onBPChange={(chapterId, bp) => updatePlayer((p) => ({ ...p, chapterBP: { ...(p.chapterBP || {}), [chapterId]: bp } }))}
          problemSource={battlePractice ? battleProblemSource(battlePractice) : generalBattleProblemSource(battleMonster)}
          onAttempt={battlePractice ? recordBattlePracticeAttempt : recordBattleGeneralAttempt}
          onResult={handleBattleResult}
          onSpChange={(sp) => updatePlayer((p) => ({ ...p, sp }))}
          onHpChange={(hp) => updatePlayer((p) => ({ ...p, currentHp: hp }))}
          onMistake={recordWrongAnswer}
          onDex={(monsterId, info) => updatePlayer((p) => {
            const prev = (p.enemyDex && p.enemyDex[monsterId]) || { enc: 0, moves: {}, defeated: false };
            return { ...p, enemyDex: { ...(p.enemyDex || {}), [monsterId]: {
              enc: (prev.enc || 0) + 1,
              moves: { ...(prev.moves || {}), ...(info.moves || {}) },
              defeated: prev.defeated || !!info.defeated,
            } } };
          })}
          onExit={() => {
            if (battlePractice) { setBattlePractice(null); setBattleMonster(null); setScreen("home"); }
            else setBattleMonster(null);
          }}
        />
      );
    }
    return (
      <Battle
        key={battleKey}
        player={data.player}
        monster={battleMonster}
        maxHearts={maxHearts}
        problemSource={battlePractice ? battleProblemSource(battlePractice) : generalBattleProblemSource(battleMonster)}
        onAttempt={battlePractice ? recordBattlePracticeAttempt : recordBattleGeneralAttempt}
        ally={(() => {
          const id = data.player.activePartner;
          const e = id ? data.player.partners?.[id] : null;
          const m = e ? findMonster(id) : null;
          return m ? { monster: m, hpLv: partnerHpLv(e), atkLv: partnerAtkLv(e) } : null;
        })()}
        onResult={handleBattleResult}
        onSpChange={(sp) => updatePlayer((p) => ({ ...p, sp }))}
        onItemUse={() => updatePlayer((p) => ({ ...p, item: null }))}
        onUseBait={markBaitUsed}
        onHpChange={(hp) => updatePlayer((p) => ({ ...p, currentHp: hp }))}
        onWinBonus={applyWinBonus}
        onMistake={recordWrongAnswer}
        onExit={() => {
          // 学習サイクルの「ためす→バトル」(battlePractice)から来た時は敵一覧に戻さずメニューへ。
          if (battlePractice) { setBattlePractice(null); setBattleMonster(null); setScreen("home"); }
          else setBattleMonster(null);
        }}
      />
    );
  }

  // 単元テスト：章選択 → テスト
  if (screen === "unitTest") {
    if (!utChapter) {
      return <UnitTestSelect player={data.player} grade={grade} onStart={(c) => setUtChapter(c)} onBack={() => setScreen("home")} />;
    }
    return (
      <UnitTest
        key={utChapter.id}
        player={data.player}
        chapter={utChapter}
        onComplete={saveUnitTestResult}
        onBack={() => setUtChapter(null)}
        weakUnits={getWeakUnits(data.player, data.mistakes, data.records)}
        onRelearn={(unit) => { relearnStreakRef.current[unit.id] = 0; setPracticeUnit(unit); setScreen("relearnPractice"); }}
        onHaichi={(unit) => openHaichiStudio(unit, "unitTest")}
        onOpenRelearnList={() => setScreen("relearn")}
      />
    );
  }

  // ホーム：本線サイクルの「今の単元」と進捗・休憩状態を計算して渡す（§10 Step2/3）
  const cycleUnit = data.player.cycleLast ? findUnitById(data.player.cycleLast) : (chaptersForGrade(grade)[0]?.units?.[0] || null);
  const _cst = (cycleUnit && data.player.cycle && data.player.cycle[cycleUnit.id]) || {};
  const homeCycle = {
    unitName: cycleUnit?.name || cycleUnit?.title || "今の単元",
    practiceN: _cst.practiceN || 0, relearnN: _cst.relearnN || 0, appliedN: _cst.appliedN || 0,
    lecture: !!_cst.lecture, done: !!_cst.done, target: CYCLE_PRACTICE_TARGET,
  };
  const _cyclesToday = (data.player.daily && data.player.daily.date === todayStr()) ? (data.player.daily.cycles || 0) : 0;
  const restActive = _cyclesToday >= REST_CYCLES_SOFT;
  return (
    <ThirdMenu
      player={data.player}
      records={data.records}
      grade={grade}
      onSetGrade={setWorld}
      updatePlayer={updatePlayer}
      medalState={thirdState}
      pos={menuPos}
      setPos={setMenuPos}
      quizWeakUnits={quizWeakUnits}
      mistakes={data.mistakes}
      onTodayPick={(chapter, unit) => { setSel({ chapter, unit, level: "standard", nav: true }); setScreen("anshin"); }}
      onQuizWeakUnitClick={(unitId) => {
        const unit = findUnitById(unitId);
        const chapter = findChapterByUnitId(unitId);
        if (unit && chapter) { setSel({ chapter, unit, level: "standard", nav: true }); setScreen("anshin"); }
      }}
      onHaichi={(unit) => openHaichiStudio(unit, "home")}
      onPractice={(chapter, unit, level) => { setSel({ chapter, unit, level: level || "standard", nav: false, fixed: true }); setScreen("anshin"); }} // 練習：えらんだ難度で出題（簡単/普通/難しい/鬼）
      onBattle={(chapter, unit) => { const params = worldBattleFor(grade, chapter, unit); if (params) { setThirdStart({ screen: "battle", params }); setScreen("third"); } }} // メダル2枚で本番（サーバーが認めた初クリアだけクリスタル）
      onChapterBoss={(chapter) => { setThirdStart({ screen: "battle", params: { grade, chapterId: chapter.id, kind: "chapterBoss", demo: !chapterBattlesCleared(thirdState, grade, chapter) } }); setScreen("third"); }}
      onParty={() => { setThirdStart({ screen: "party", params: {} }); setScreen("third"); }}
      onGacha={() => { setThirdStart({ screen: "gacha", params: {} }); setScreen("third"); }}
      onRoom={MULTIPLAY_OPEN && THIRD_SERVER && !isGuest() ? () => { setThirdStart({ screen: "room", params: {} }); setScreen("third"); } : undefined} // マルチプレイ（サーバーモードのみ・ゲストは不可）
      onWeakness={() => { setRelearnFocus(null); setScreen("relearn"); }}
      onFeedback={() => setScreen("feedback")}
    />
  );
  };

  return (
    <>
      <div key={screen} className={"screen-anim" + (screen === "battle" ? " is-battle" : "")}>
        {renderScreen()}
      </div>
      {screen !== "start" && <AudioToggle />}
      {menuConfirm && (
        <div role="dialog" aria-modal="true" style={{ position: "fixed", inset: 0, zIndex: 500, display: "grid", placeItems: "center", background: "rgba(0,0,0,.6)" }}>
          <div className="glass" style={{ padding: "22px 24px", borderRadius: 14, maxWidth: 340, textAlign: "center", color: "#fff" }}>
            <div style={{ fontSize: 16, fontWeight: 900, marginBottom: 6 }}>トップメニューに戻りますか？</div>
            <div style={{ fontSize: 12, opacity: .75, marginBottom: 16 }}>いまの問題はとちゅうで終わります</div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button className="hint-yellow-btn" data-sfx="none" style={{ minWidth: 100 }}
                onClick={() => { setMenuConfirm(false); setMenuPos({ view: "main" }); setScreen("home"); }}>はい</button>
              <button className="legacy-help-btn legacy-help-btn--quiet" data-sfx="none" style={{ minWidth: 100 }} onClick={() => setMenuConfirm(false)}>いいえ</button>
            </div>
          </div>
        </div>
      )}
      {levelUpTo && (
        <LevelUpOverlay
          level={levelUpTo}
          onDone={() => {
            setLevelUpTo(null);
            // レベルアップ演出のあとに、保留していた新モンスター通知を出す
            const hadMonster = !!pendingMonsterRef.current;
            if (hadMonster) {
              const m = pendingMonsterRef.current;
              pendingMonsterRef.current = null;
              setTimeout(() => setNewMonster(m), 250);
            }
            // #4 保留していた「応用の扉」カードを出す（新モンスター通知の後・無ければすぐ）
            if (pendingApplyGateRef.current) {
              const g = pendingApplyGateRef.current;
              pendingApplyGateRef.current = null;
              setTimeout(() => setApplyGate(g), hadMonster ? 1400 : 600);
            }
          }}
        />
      )}
      {applyGate && (
        <ApplyGateOverlay
          info={applyGate}
          onChallenge={() => {
            const ch = findChapterById(applyGate.chapterId);
            setApplyGate(null);
            if (ch) { setCalcChapter(ch); setScreen("challenge"); }
          }}
          onSkip={() => setApplyGate(null)}
        />
      )}
      {medalToast && <MedalToast medals={medalToast} onDone={() => setMedalToast(null)} />}
      {alarmRinging && (
        <AlarmOverlay
          minutes={data.player.alarm?.min || 0}
          onStop={() => { setAlarmRinging(false); updatePlayer((p) => ({ ...p, alarm: { min: p.alarm?.min || 15, endAt: null } })); }}
        />
      )}
      {skillGet && <SkillGetOverlay skill={skillGet} onDone={() => setSkillGet(null)} />}
      {crystalGet && <CrystalGetOverlay amount={crystalGet.amount} onDone={() => setCrystalGet(null)} />}
      {gearStoneGet && <GearStoneGetOverlay sword={gearStoneGet.sword} armor={gearStoneGet.armor} reason={gearStoneGet.reason} onDone={() => setGearStoneGet(null)} />}
      {relearnMastered && <RelearnMasteredOverlay info={relearnMastered} onDone={() => setRelearnMastered(null)} />}
      {relearnPended && <RelearnPendedOverlay info={relearnPended} onDone={() => setRelearnPended(null)} />}
      {naoshizumi && <NaoshizumiToast info={naoshizumi} onDone={() => setNaoshizumi(null)} />}
      {recruitResult && <RecruitResultOverlay result={recruitResult} onDone={() => setRecruitResult(null)} />}
      {calcKingClear && (
        <CalcKingClearOverlay
          chapter={findChapterById(calcKingClear.unitId)}
          bonusPct={Math.round(battleBonuses(data.player).calcAtkPct * 100)}
          onDone={() => setCalcKingClear(null)}
        />
      )}
      {newMonster && <NewMonsterOverlay monster={newMonster} onDone={() => setNewMonster(null)} />}
      {prestigeAsk && (
        <div onClick={() => setPrestigeAsk(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.72)", zIndex: 215, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div onClick={(e) => e.stopPropagation()} className="glass" style={{ maxWidth: 350, padding: "22px 22px", textAlign: "center", border: "2px solid #fbbf24" }}>
            <div style={{ fontSize: 13, fontWeight: 900, color: "#fde047", letterSpacing: 1 }}>👑 もう一周（周回）</div>
            <div style={{ fontSize: 16, fontWeight: 900, color: "#fff", margin: "8px 0 12px" }}>中{grade}を もう一周する？</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.8)", lineHeight: 1.8, textAlign: "left", background: "rgba(255,255,255,.05)", borderRadius: 10, padding: "10px 12px" }}>
              ✅ <b>そのまま残る</b>：レベル/強さ・お金・クリスタル・装備・アイテム・スキル・仲間・図鑑<br />
              🔄 <b>リセット</b>：星（タイムアタックのクリア）とモンスター撃破報酬<br />
              <span style={{ color: "#fde047", fontWeight: 800 }}>→ お金とクリスタルがまた稼げる！</span>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button onClick={() => setPrestigeAsk(false)} data-sfx="back" style={{ flex: 1, padding: "12px", borderRadius: 12, border: "1px solid rgba(255,255,255,.2)", background: "rgba(255,255,255,.06)", color: "#fff", fontWeight: 800, cursor: "pointer" }}>やめる</button>
              <button onClick={doPrestige} data-sfx="none" style={{ flex: 1, padding: "12px", borderRadius: 12, border: "none", background: "linear-gradient(135deg,#f59e0b,#fbbf24)", color: "#3a2a00", fontWeight: 900, cursor: "pointer" }}>もう一周する！</button>
            </div>
          </div>
        </div>
      )}
      {prestigeDone && (
        <div onClick={() => setPrestigeDone(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.72)", zIndex: 215, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div className="glass" style={{ maxWidth: 330, padding: "26px 24px", textAlign: "center", border: "2px solid #fbbf24", animation: "rankUpPop .5s cubic-bezier(.2,1.4,.4,1) both" }}>
            <div style={{ fontSize: 12, fontWeight: 900, color: "#fde047", letterSpacing: 2 }}>👑 つよくて もう一周！</div>
            <div style={{ fontSize: 46, margin: "8px 0" }}>🔄✨</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: "#fff" }}>中{grade} {prestigeDone}周目スタート！</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.7)", marginTop: 10, lineHeight: 1.6 }}>強さ・装備・仲間はそのまま！<br />お金とクリスタルをまた稼ごう！（タップで閉じる）</div>
          </div>
        </div>
      )}
    </>
  );
}

// タイムアタックで新しいモンスターが解放されたときの出現演出（タップで閉じる）
function NewMonsterOverlay({ monster, onDone }) {
  return (
    <div onClick={onDone} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.72)", zIndex: 210, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div className="glass" style={{ maxWidth: 330, padding: "24px", textAlign: "center", border: `2px solid ${monster.color}`, background: "#171536", animation: "rankUpPop .5s cubic-bezier(.2,1.4,.4,1) both" }}>
        <div style={{ fontSize: 12, fontWeight: 900, color: "#fde047", letterSpacing: 2 }}>✨ NEW MONSTER ✨</div>
        <div style={{ fontSize: 17, fontWeight: 900, color: "#fff", margin: "8px 0 10px" }}>新しいモンスターが出現！</div>
        <div style={{ width: 120, height: 120, margin: "0 auto", border: `2px solid ${monster.color}`, borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,.3)" }}>
          <svg viewBox="0 0 140 140" style={{ width: 96, height: 96, overflow: "visible" }} dangerouslySetInnerHTML={{ __html: monster.svgDefs + monster.svg }} />
        </div>
        <div style={{ fontSize: 18, fontWeight: 900, color: monster.color, marginTop: 10 }}>{monster.name}</div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,.6)", marginTop: 4 }}>テーマ：{monster.unit}</div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,.5)", marginTop: 12 }}>バトルモードで挑戦できるよ！（タップで閉じる）</div>
      </div>
    </div>
  );
}

// 計算王クリア（章を5問連続）でバトル攻撃力が永続アップしたときの演出（タップで閉じる）
function CalcKingClearOverlay({ chapter, bonusPct, onDone }) {
  return (
    <div onClick={onDone} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.72)", zIndex: 205, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div className="glass" style={{ maxWidth: 330, padding: "26px 24px", textAlign: "center", border: "2px solid #a855f7", animation: "rankUpPop .5s cubic-bezier(.2,1.4,.4,1) both" }}>
        <div style={{ fontSize: 12, fontWeight: 900, color: "#fde047", letterSpacing: 2 }}>🧮 計算王クリア！</div>
        <div style={{ fontSize: 48, margin: "8px 0" }}>⚔️✨</div>
        <div style={{ fontSize: 17, fontWeight: 900, color: "#fff" }}>
          {chapter ? `「${chapter.name}」を制覇！` : "計算王に一歩前進！"}
        </div>
        <div style={{ fontSize: 13, color: "#d8b4fe", fontWeight: 800, marginTop: 10, lineHeight: 1.6 }}>
          計算が速くなった分、このワールドの<br /><b style={{ color: "#fbbf24" }}>バトル攻撃力 +{bonusPct}%</b>（永続）！
        </div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,.5)", marginTop: 14 }}>計算王を進めるほど、バトルで強くなる！（タップで閉じる）</div>
      </div>
    </div>
  );
}

// 章ボス撃破でスキルを入手したときの演出（タップで閉じる）
function SkillGetOverlay({ skill, onDone }) {
  return (
    <div onClick={onDone} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div className="glass" style={{ maxWidth: 320, padding: "26px 24px", textAlign: "center", border: `2px solid ${skill.color}`, animation: "rankUpPop .5s cubic-bezier(.2,1.4,.4,1) both" }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: "#fde047", letterSpacing: 2 }}>✨ SKILL GET! ✨</div>
        <div style={{ fontSize: 56, margin: "10px 0" }}>{skill.icon}</div>
        <div style={{ fontSize: 20, fontWeight: 900, color: skill.color }}>{skill.name}</div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,.65)", margin: "8px 0 14px", lineHeight: 1.5 }}>{skill.desc}</div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,.5)" }}>「スキル」画面でスロット{skill.slot}に装備できるよ！</div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,.4)", marginTop: 12 }}>タップで閉じる</div>
      </div>
    </div>
  );
}

// ボス撃破でクリスタルを入手したときの演出
function RecruitResultOverlay({ result, onDone }) {
  const ok = !!result.ok;
  const condFail = result.reason === "cond";
  const color = ok ? "#fbbf24" : "#94a3b8";
  return (
    <div onClick={onDone} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div className="glass" style={{ maxWidth: 320, padding: "26px 24px", textAlign: "center", border: `2px solid ${color}`, animation: "rankUpPop .5s cubic-bezier(.2,1.4,.4,1) both" }}>
        <div style={{ fontSize: 12, fontWeight: 800, color, letterSpacing: 2 }}>{ok ? "🎉 なかまになった！ 🎉" : "🍖 仲間チャレンジ"}</div>
        <div style={{ fontSize: 56, margin: "10px 0" }}>{ok ? "🐾" : condFail ? "🔒" : "💨"}</div>
        <div style={{ fontSize: 20, fontWeight: 900, color }}>
          {ok ? `${result.name} が仲間になった！` : condFail ? "まだ仲間にできない…" : `${result.name} は逃げてしまった…`}
        </div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,.65)", margin: "8px 0 4px", lineHeight: 1.5 }}>
          {ok ? "「なかま」画面でストックに入れて、バトルに連れていこう！"
            : condFail ? "その敵の単元を「簡単・普通・難しい」全て★1以上にすると仲間にできるよ。"
            : "もう一度エサを使って挑戦してみよう（ザコ50%/ボス25%）。"}
        </div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,.4)", marginTop: 12 }}>タップで閉じる</div>
      </div>
    </div>
  );
}

function RelearnMasteredOverlay({ info, onDone }) {
  return (
    <div onClick={onDone} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div className="glass" style={{ maxWidth: 320, padding: "26px 24px", textAlign: "center", border: "2px solid #4ade80", background: "#171536", animation: "rankUpPop .5s cubic-bezier(.2,1.4,.4,1) both" }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: "#4ade80", letterSpacing: 2 }}>🎓 カンペキになおった！</div>
        <div style={{ fontSize: 50, margin: "10px 0" }}>📖✨</div>
        <div style={{ fontSize: 18, fontWeight: 900, color: "#86efac" }}>{info.unitName}</div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,.72)", margin: "8px 0 4px", lineHeight: 1.5 }}>
          5問れんぞくで正解できた！ほんとうに身についたね。まちがい{info.count}問をノートから消したよ。
        </div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,.4)", marginTop: 12 }}>タップで閉じる</div>
      </div>
    </div>
  );
}

// 〈仮なおし〉演出：その場で2連続正解して「なおすOK」が立った瞬間。まだノートには残し、確認は翌日。
function RelearnPendedOverlay({ info, onDone }) {
  return (
    <div onClick={onDone} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div className="glass" style={{ maxWidth: 320, padding: "26px 24px", textAlign: "center", border: "2px solid #38bdf8", background: "#171536", animation: "rankUpPop .5s cubic-bezier(.2,1.4,.4,1) both" }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: "#38bdf8", letterSpacing: 2 }}>✅ なおせた！（あと1歩）</div>
        <div style={{ fontSize: 50, margin: "10px 0" }}>🔧✨</div>
        <div style={{ fontSize: 18, fontWeight: 900, color: "#7dd3fc" }}>{info.unitName}</div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,.72)", margin: "8px 0 4px", lineHeight: 1.5 }}>
          2回れんぞく正解！この単元の「なおす」はクリア。<br /><b style={{ color: "#fde047" }}>⏳ あした、もう1問といたらカンペキ</b>だよ。
        </div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,.4)", marginTop: 12 }}>タップで閉じる</div>
      </div>
    </div>
  );
}

// #2 バトル中に「誤答束の変種」を正解した瞬間の軽いトースト。全画面ブロックにはせず、
//  戦闘を止めない小さな通知として自動で消える（見えない学び直し＋見える達成）。
function NaoshizumiToast({ info, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 1800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div style={{
      position: "fixed", top: 14, left: "50%", transform: "translateX(-50%)", zIndex: 210,
      pointerEvents: "none", padding: "8px 16px", borderRadius: 999,
      background: "rgba(23,21,54,.92)", border: "1px solid rgba(56,189,248,.5)",
      display: "flex", alignItems: "center", gap: 8, animation: "fadeUp .3s both",
    }}>
      <span style={{ fontSize: 18 }}>🔧✨</span>
      <span style={{ fontSize: 12.5, fontWeight: 900, color: "#7dd3fc" }}>なおしずみ！</span>
      <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.65)" }}>「{info.unitName}」の苦手を倒した</span>
    </div>
  );
}

// #4 サイクル初クリア直後（有能感のピーク）に出す「応用の扉」カード。
//  基礎ができた瞬間に、応用（計算王）への一歩を軽く誘う。強制ではなくスキップ可。
function ApplyGateOverlay({ info, onChallenge, onSkip }) {
  return (
    <div onClick={onSkip} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div className="glass" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 320, padding: "26px 24px", textAlign: "center", border: "2px solid #a855f7", background: "#171536", animation: "rankUpPop .5s cubic-bezier(.2,1.4,.4,1) both" }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: "#c4b5fd", letterSpacing: 2 }}>⚔️ 応用の扉がひらいた！</div>
        <div style={{ fontSize: 50, margin: "10px 0" }}>🚪✨</div>
        <div style={{ fontSize: 15, fontWeight: 900, color: "#e9d5ff" }}>「{info.unitName}」の基礎クリア！</div>
        <div style={{ fontSize: 12.5, color: "rgba(255,255,255,.72)", margin: "8px 0 16px", lineHeight: 1.5 }}>
          {info.chapterName}の計算王に挑戦してみよう。失敗してもペナルティはないよ。
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onSkip} data-sfx="back" style={{ flex: 1, padding: "12px", borderRadius: 11, border: "1px solid rgba(255,255,255,.2)", background: "rgba(255,255,255,.06)", color: "#fff", fontWeight: 800, cursor: "pointer", fontSize: 13.5 }}>また今度</button>
          <button onClick={onChallenge} data-sfx="none" style={{ flex: 1.4, padding: "12px", borderRadius: 11, border: "none", background: "linear-gradient(135deg,#a855f7,#8b5cf6)", color: "#fff", fontWeight: 900, cursor: "pointer", fontSize: 13.5 }}>⚔️ 挑戦する</button>
        </div>
      </div>
    </div>
  );
}

function GearStoneGetOverlay({ sword = 1, armor = 1, reason = null, onDone }) {
  const review = !!reason; // 復習ボーナス（間隔反復）か、応用クリアか
  return (
    <div onClick={onDone} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div className="glass" style={{ maxWidth: 320, padding: "26px 24px", textAlign: "center", border: "2px solid #fbbf24", background: "#171536", animation: "rankUpPop .5s cubic-bezier(.2,1.4,.4,1) both" }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: "#fbbf24", letterSpacing: 2 }}>{review ? `📅 ${reason}！` : "⚒️ おうようクリア！ ⚒️"}</div>
        <div style={{ fontSize: 50, margin: "10px 0" }}>🗡️🛡️</div>
        <div style={{ fontSize: 20, fontWeight: 900, color: "#fbbf24" }}>剣石 +{sword} ・ 鎧石 +{armor}</div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,.65)", margin: "8px 0 4px", lineHeight: 1.5 }}>{review ? "時間をあけて解き直すと、よく覚えられる＆装備も育つ！" : "武器と防具が少しだけ強くなった！（応用をクリアするほど育つ）"}</div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,.4)", marginTop: 12 }}>タップで閉じる</div>
      </div>
    </div>
  );
}

function CrystalGetOverlay({ amount, onDone }) {
  return (
    <div onClick={onDone} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div className="glass" style={{ maxWidth: 320, padding: "26px 24px", textAlign: "center", border: "2px solid #67e8f9", background: "#171536", animation: "rankUpPop .5s cubic-bezier(.2,1.4,.4,1) both" }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: "#67e8f9", letterSpacing: 2 }}>💎 CRYSTAL GET! 💎</div>
        <div style={{ fontSize: 56, margin: "10px 0" }}>💎</div>
        <div style={{ fontSize: 26, fontWeight: 900, color: "#67e8f9" }}>クリスタル +{amount}</div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,.65)", margin: "8px 0 4px", lineHeight: 1.5 }}>「スキル」画面のスキルガチャで新しいスキルを手に入れよう！</div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,.4)", marginTop: 12 }}>タップで閉じる</div>
      </div>
    </div>
  );
}
