// ============================================================
// recordSchema.js — 「記録するデータの形」の定義（最重要・将来も生き残る資産）
//
// ★なぜ大事か★
//   今はブラウザ内(localStorage)に保存するが、将来 Supabase の
//   データベースに移すとき、ここで決めた形をそのままテーブルに流し込める。
//   どの記録にも studentId（誰が）と createdAt（いつ）を最初から持たせる。
//   → サーバー化のとき「保存先を差し替えるだけ」で済む。
//
// Supabase に作る予定のテーブルと1対1で対応：
//   records      … 1回の挑戦の結果（下の makeRecord）
//   mistakes     … 間違えた問題（下の makeMistake）
//   player_state … XP・レベル・単元ごとの星・スキル習熟度（PlayerState）
// ============================================================
import { getActiveUid, isGuest, guestMem } from "../auth/session.js";

/** 生徒ID。ログイン中は本物のユーザーid（認証）、未ログイン/認証OFFは端末ローカルの仮ID。 */
export function getOrCreateLocalStudentId() {
  const uid = getActiveUid();
  if (uid) return uid; // ログイン中＝記録は本人のuidに紐づく
  if (isGuest()) { // ゲスト：メモリにだけ仮IDを持つ（保存しない）
    let g = guestMem().get("studentId");
    if (!g) { g = "guest-" + Math.random().toString(36).slice(2, 10); guestMem().set("studentId", g); }
    return g;
  }
  const KEY = "mathApp3_studentId";
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = "local-" + Math.random().toString(36).slice(2, 10);
    localStorage.setItem(KEY, id);
  }
  return id;
}

/** ISO形式の現在時刻（サーバーの timestamp 列にそのまま入る） */
function now() {
  return new Date().toISOString();
}

/**
 * 1回の挑戦の記録を作る。
 * mode: "timeAttack" | "slow" | "battle" | "unitTest" | "stepUp"
 */
export function makeRecord({
  studentId, mode, chapterId, unitId, level,
  correct = 0, wrong = 0, stars = 0, xp = 0, maxStreak = 0, extra = {},
}) {
  return {
    studentId,
    mode,
    chapterId: chapterId ?? null,
    unitId: unitId ?? null,
    level: level ?? null,
    correct,
    wrong,
    stars,
    xp,
    maxStreak,
    extra,            // モード固有の追加情報（自由欄）
    createdAt: now(),
  };
}

/**
 * 間違えた問題の記録を作る（間違いノート＆教員分析の元データ）。
 * skill / templateId を持たせ、スキル単位の弱点分析・診断に使えるようにする。
 * mistakeTag：生徒が実際に選んだ誤答選択肢の診断タグ（とけた!のdistractors[].tag。
 *   例 "sign-flip"＝符号の取り違え）。skillが「どの単元/スキルか」なのに対し、
 *   mistakeTagは「どう間違えたか（誤概念の種類）」を表す別の軸。無ければnull。
 */
export function makeMistake({ studentId, chapterId, unitId, level, q, ans, skill = null, templateId = null, mistakeTag = null }) {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    studentId,
    chapterId: chapterId ?? null,
    unitId: unitId ?? null,
    level: level ?? null,
    q,
    ans,
    skill,            // どのスキルの問題か（data/skills.js の id）
    templateId,       // どのテンプレか（再出題・分析用）
    mistakeTag,       // どう間違えたか（診断タグ。data/toketa/*.js の distractors[].tag）
    createdAt: now(),
  };
}

/** プレイヤー状態の初期値（XP・連続日数・星など） */
export function initialPlayerState(studentId) {
  return {
    studentId,
    xp: 0,             // （旧）単一レベルのXP。完全ワールド分離後は worldXp を使用（後方互換で残す）
    world: 1,          // 現在いるワールド（学年）= 1:中1 / 2:中2 / 3:中3。レベルはこのワールドのXPで決まる
    worldXp: { 1: 0, 2: 0, 3: 0 }, // ★ワールド別の累計XP。学年ごとにレベル(atk/HP)が独立
    streaks: 0,        // 連続学習日数
    lastDate: null,    // 最後に学習した日
    loginStreak: 0,    // 連続ログイン日数（ログインボーナス用。途切れたらリセット）
    lastLoginDate: null, // 最後にログインボーナスを受け取った日
    golden: { date: null, startMs: null }, // その日のゴールデンタイム（最初の15分・XP1.2倍）
    stars: {},         // { "u1-easy": 3, ... }
    playLog: {},       // { "u1-easy": { cleared: true, lastDate: "2026/5/30" }, ... } くり返しXP用
    skillStats: {},    // { "S-NEG-012": { m: 0.62, n: 8, last: "2026/6/2" }, ... } アダプティブ習熟度
    sp: 0,             // バトルのスキルポイント（正解で貯まり、スキル発動で消費。バトルをまたいで維持）
    currentHp: null,   // バトル間で持ち越す現在HP（null=満タン。0以下にはせず、ショップの治療で全回復）
    coins: 0,          // 所持コイン（タイムアタックで稼ぎ、ショップでアイテム購入に使う）
    crystals: 0,       // 所持クリスタル（サイクルを1単元クリアするごとに+1。スキルガチャに使う）
    worldCleared: { 1: 0, 2: 0, 3: 0 }, // ★レベルの素：学年ごとに「サイクルをクリアした単元数」。レベル=1+これ
    relearnSolved: 0,  // 学び直しで解いた問題の累計
    item: null,        // 所持アイテム（id 文字列。1つだけ持てる。バトルで使うと消費）
    items: {},         // 新アイテムシステム（2026-07-19復活・ガチャ方式）：{ itemId: 個数 }。合計10個までストック
    equippedItems: [], // バトルに持ち込むアイテム（最大2種類、itemIdの配列）
    itemGachaPullsToday: 0,      // アイテムガチャ：今日すでに引いた回数（価格が1回ごとに+50G）
    itemGachaLastPullDate: null, // 最後にアイテムガチャを引いた日（変わったらpullsTodayを0に戻す）
    ownedUltimates: { fire: true }, // 所持している必殺技（ガチャで獲得。最初から「ファイアバースト」を1つ持っている）
    equippedUltimate: "fire", // 装備中の必殺技id（data/ultimates.js DEFAULT_ULTIMATE_IDと一致）
    // ガチャ装備：owned={id:個数}, 装備中の武器/防具id。初期から「剣＋盾」を装備して持っている。
    gacha: { owned: { w2: 1, a2: 1 }, weapon: "w2", armor: "a2" },
    gear: { swordStones: 0, armorStones: 0 }, // 剣石・鎧石（応用クリアで増え、装備が少し育つ・上限あり）
    skillOwned: {},    // スキルガチャの所持数 { skillId: 個数 }（被りカウント。装備可否は ownedSkills を見る）
    challengeCleared: {}, // { "ch1a": true, ... } 旧チャレンジ（難問）クリア記録（後方互換で保持）
    calcKing: {}, // 計算王への道：単元ごとの自己ベスト { unitId: { bestStreak, bestTime5 } }
    ownedSkills: ["time2x", "ultimate"], // 所持バトルスキルid（初期は基本2種。スキルガチャで追加）
    equip: { 1: "time2x", 2: "ultimate" }, // スロット1/2に装備中のスキルid
    seenMonsters: {},  // { "m_c1_u1": true, ... } 解放を既に見たモンスター（「新しい敵」通知の制御）
    avatar: { type: "hero", id: "hero10" }, // 初期キャラ＝シンプルな男の子（heroes.js STARTER_HERO_ID）
    ownedHeroes: ["hero10"], // 購入で解放したヒーローid。初期は STARTER のみ（他は💰500で購入）
    name: "",          // プレイヤー名（任意）
    readAloud: false,  // ★5 問題文を自動で読み上げる（読むのが苦手な人向け・既定OFF）
    furigana: false,   // ★5 数学用語にふりがなを付ける（既定OFF）
    unitMastery: {},   // { unitId: { pt:0〜100, streak:連続正解数, ok:bool } } 小単元の習得確認（4連続正解でOK）
    navLevel: {},      // { unitId: "advanced" } れんしゅうの到達難易度。5問区切りをまたいで引き継ぐ
    tagWrong: {},      // { skillTag: 累計まちがい数 } 同じタグで2問まちがえたら学び直しへ（出したら0に戻す）
    mistakeTagStats: {}, // { 診断タグ: {count, unitId, lastDate} } 誤答の「価値づけ」＝どの誤概念で何回間違えたかの累計（減らない・学び直しノートの増減とは独立）
    enemyDex: {},      // { monsterId: { enc:遭遇回数, moves:{技kind:true}, defeated:bool } } 敵図鑑（負けても埋まる）
    noVideoLecturePassed: {}, // { unitId: 日付 } 葉一動画が無い単元の講義クリア（教師モード＋確認問題5問80%で合格）
    partners: {},      // なかま（エサで仲間にしたモンスター）{ monsterId: { lv } }。コイン/クリスタルで育成
    party: [],         // ストック（編成）monsterId配列・最大4体。先頭(activePartner)だけバトル参戦
    activePartner: null, // バトルに参戦する仲間1体のmonsterId（party内の1体）
    lastMode: null,    // 最後に選んだメニュー系統 "game"=ゲーム / "learn"=学習（次回起動時にそこから始める）
    prestige: {},      // 周回数 { grade: 回数 }。魔王撃破後に「もう一周」で+1。星・撃破報酬が再開放（強さ/お金/装備/スキル/仲間は維持）
    updatedAt: now(),
  };
}

/**
 * 旧セーブデータに新フィールドが無くても落ちないよう、既定値で補完する。
 * load() のたびに通すので、ここを増やせば後方互換が保てる。
 */
export function normalizePlayerState(p) {
  if (!p || typeof p !== "object") return p;
  const base = initialPlayerState(p.studentId);
  const out = { ...base, ...p };
  // ネストするオブジェクト系は欠けていれば既定値で補う
  // ── 完全ワールド分離: world / worldXp を補完。旧データは xp を中1へ移行 ──
  out.world = [1, 2, 3].includes(p.world) ? p.world : 1;
  if (p.worldXp && typeof p.worldXp === "object") {
    out.worldXp = { 1: p.worldXp[1] || 0, 2: p.worldXp[2] || 0, 3: p.worldXp[3] || 0 };
  } else {
    // 旧セーブ（単一XP）→ これまでの進捗を中1ワールドの値として引き継ぐ
    out.worldXp = { 1: p.xp || 0, 2: 0, 3: 0 };
  }
  out.loginStreak = Number.isFinite(p.loginStreak) ? p.loginStreak : 0;
  out.lastLoginDate = p.lastLoginDate || null;
  out.golden = (p.golden && typeof p.golden === "object") ? { date: p.golden.date || null, startMs: p.golden.startMs ?? null } : { date: null, startMs: null };
  out.stars = p.stars || {};
  out.playLog = p.playLog || {};
  out.skillStats = p.skillStats || {};
  out.challengeCleared = p.challengeCleared || {};
  // calcKing は単元ごとの自己ベストマップ。旧フラット形式({bestStreak,...})は破棄して空に。
  out.calcKing = (p.calcKing && typeof p.calcKing === "object" && !("bestStreak" in p.calcKing)) ? p.calcKing : {};
  out.gacha = p.gacha && typeof p.gacha === "object"
    ? { owned: p.gacha.owned || {}, weapon: p.gacha.weapon || null, armor: p.gacha.armor || null }
    : { owned: {}, weapon: null, armor: null };
  out.seenMonsters = p.seenMonsters || {};
  out.unitMastery = p.unitMastery || {};
  out.navLevel = (p.navLevel && typeof p.navLevel === "object") ? p.navLevel : {};
  out.tagWrong = (p.tagWrong && typeof p.tagWrong === "object") ? p.tagWrong : {};
  out.mistakeTagStats = (p.mistakeTagStats && typeof p.mistakeTagStats === "object") ? p.mistakeTagStats : {};
  out.enemyDex = (p.enemyDex && typeof p.enemyDex === "object") ? p.enemyDex : {};
  out.noVideoLecturePassed = (p.noVideoLecturePassed && typeof p.noVideoLecturePassed === "object") ? p.noVideoLecturePassed : {};
  out.readAloud = !!p.readAloud; // ★5 設定（既定OFF）
  out.furigana = !!p.furigana;   // ★5 設定（既定OFF）
  out.crystals = Number.isFinite(p.crystals) ? p.crystals : 0;
  // ── レベルの素：学年ごとのクリア単元数。無ければ cycle.cleared から数え直す ──
  out.worldCleared = (p.worldCleared && typeof p.worldCleared === "object")
    ? { 1: p.worldCleared[1] || 0, 2: p.worldCleared[2] || 0, 3: p.worldCleared[3] || 0 }
    : { 1: 0, 2: 0, 3: 0 };
  // 剣石・鎧石
  out.gear = (p.gear && typeof p.gear === "object")
    ? { swordStones: p.gear.swordStones || 0, armorStones: p.gear.armorStones || 0 }
    : { swordStones: 0, armorStones: 0 };
  out.relearnSolved = Number.isFinite(p.relearnSolved) ? p.relearnSolved : 0;
  out.partners = (p.partners && typeof p.partners === "object") ? p.partners : {};
  // party（ストック最大4）。旧 companion があれば引き継ぐ。所持していない仲間は除外。
  let party = Array.isArray(p.party) ? p.party.slice() : [];
  if (!party.length && p.companion) party = [p.companion];
  party = party.filter((id) => out.partners[id]).slice(0, 4);
  out.party = party;
  out.activePartner = (p.activePartner && party.includes(p.activePartner)) ? p.activePartner
    : (party.includes(p.companion) ? p.companion : (party[0] || null));
  out.skillOwned = (p.skillOwned && typeof p.skillOwned === "object") ? p.skillOwned : {};
  out.ownedSkills = Array.isArray(p.ownedSkills) && p.ownedSkills.length ? p.ownedSkills : [...base.ownedSkills];
  // ── ヒーロー所持／初期キャラの補完 ──
  //  重複整理で削除した立ち絵(hero14〜20)を選んでいた場合は、等価キャラへ付け替える。
  const HERO_REMAP = {
    hero14: "hero06", hero15: "hero07", hero16: "hero04", hero17: "hero02",
    hero18: "hero06", hero19: "hero03", hero20: "hero12",
  };
  let av = p.avatar || { type: "hero", id: "hero10" };
  if (av && av.type === "hero" && HERO_REMAP[av.id]) av = { type: "hero", id: HERO_REMAP[av.id] };
  out.avatar = av;
  //  旧セーブに ownedHeroes が無ければ、STARTER ＋ 今選んでいるヒーローを所持扱いにする
  //  （課金前から使っていた子の立ち絵が消えないように）。
  const ownH = (Array.isArray(p.ownedHeroes) ? p.ownedHeroes : []).map((id) => HERO_REMAP[id] || id);
  if (!ownH.includes("hero10")) ownH.push("hero10");
  if (av.type === "hero" && !ownH.includes(av.id)) ownH.push(av.id);
  out.ownedHeroes = [...new Set(ownH)];
  out.lastMode = ["game", "learn"].includes(p.lastMode) ? p.lastMode : null;
  out.prestige = (p.prestige && typeof p.prestige === "object") ? p.prestige : {};
  out.equip = { ...base.equip, ...(p.equip || {}) };
  // 装備中スキルが未所持なら基本スキルへフォールバック
  if (!out.ownedSkills.includes(out.equip[1])) out.equip[1] = base.equip[1];
  if (!out.ownedSkills.includes(out.equip[2])) out.equip[2] = base.equip[2];
  // 新アイテムシステム（2026-07-19復活）：ストック・持ち込み枠の型を補完
  out.items = (p.items && typeof p.items === "object") ? p.items : {};
  out.equippedItems = Array.isArray(p.equippedItems) ? p.equippedItems.filter((id) => (out.items[id] || 0) > 0).slice(0, 2) : [];
  // 必殺技ガチャ（2026-07-19設計）：未所持なら最初から持っている「ファイアバースト」を補完
  out.ownedUltimates = (p.ownedUltimates && typeof p.ownedUltimates === "object" && Object.keys(p.ownedUltimates).length)
    ? p.ownedUltimates : { fire: true };
  out.equippedUltimate = (p.equippedUltimate && out.ownedUltimates[p.equippedUltimate]) ? p.equippedUltimate : "fire";
  out.itemGachaPullsToday = Number.isFinite(p.itemGachaPullsToday) ? p.itemGachaPullsToday : 0;
  out.itemGachaLastPullDate = p.itemGachaLastPullDate || null;
  return out;
}
