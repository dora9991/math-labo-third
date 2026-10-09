// ============================================================
// raidBattle.js — 協力プレイ「みんなの冒険」（マルチ専用ストーリー）の戦闘（純関数。DB・HTTPに依存しない）。2026-10-09 kazu指定：
//  ・ステージは全21（中1→中3の各章の順）。1ステージ＝雑魚2波 → その章の裏ボス。はじまる前と終わったあとに場面（coopStory.js）。
//  ・全員が**同時に**答える。ラウンドごとに、全員が自分の問題（その章の単元から1人ずつ別の問題）に答える。
//  ・ラウンドは「全員が答え終わる」か「制限時間」で終わる。正解した人の仲間（部屋の共通パーティのうち、その人の担当ぶん）が敵を攻撃。
//    不正解・時間切れの人の仲間は攻撃できない。そのあと敵が必ず1回行動して、共通のパーティHPが減る。
//  ・敵のHPが0→次の波／最後の波なら勝ち。パーティHPが0→負け。勝つと、クリア記録・称号・メダル・少しの経験値・クリスタル（core.js applyCoopWin）。
//  ・敵は「ある程度強い」、答える時間は短め（kazu指定）。数値は RB（ここ）と COOP（raid.js）で調整する（scripts/sim-raid-battle.mjs）。
//  ・戦闘の状態（room.battle）は**サーバーだけ**が変える。採点も、seedから問題を作り直してサーバーが行う。
//  ・時間の進み方：サーバーに常駐のタイマーは無い。誰かが操作（答える／様子を見る）したときに「期限を過ぎていたら結果を出す」。
// 部屋の状態 room.battle = {
//   index, stage(=index), grade, chapterId, units[], waves:[{kind:"mob"|"boss", id,name,art,hp,maxHp,dmg}], wave,
//   partyHp, partyMaxHp, status:"fighting"|"won"|"lost"|"aborted", phase:"intro"|"fight", ready:[uid], introDeadline,
//   n, round:{ n, startAt, deadline, problems:{uid:{unitId,level,seed}}, answers:{uid:{answer,correct,at}} } | null,
//   last:null|{ n, per:{uid:{answered,correct,damage,crit,level}}, dealt, foeName, foeHp, partyHp, foeDmg, move, notice, waveCleared },
//   stats:{uid:{correct,total}}, idle:{uid:n}, nextLevel:{uid:level}, moveState:{step}, rewarded:[uid], tier, startedAt, endedAt }
// ============================================================
import { SPECIALIST_ROSTER } from "./specialistRoster.js";
import { resolvePlayerAttack, computePartyMaxHp } from "./battleEngine.js";
import { generateThirdProblem, labUnitIdsOfChapter } from "./problemSource.js";
import { RAID_LADDER, raidBoss, COOP } from "./raid.js";
import { DIFFICULTIES, DIFFICULTY_KEYS, capDamageFor, bossStats, tierOf } from "./balance.js";
import { levelFromExp } from "./expCurve.js";
import { CHAPTER_SUBJECT, getChapter } from "./data/storyMap.js";
import { nextBossMove } from "./enemyMoves.js";
import { VERIFY } from "./gachaConfig.js";

/** 数値の調整はここ（2026-10-09 シミュレーションで調整。scripts/sim-raid-battle.mjs） */
export const RB = {
  levelSec: { easy: 13, standard: 17, advanced: 23, oni: 29 }, // 答える制限時間（秒）。ラウンドの期限は、いま選んでいる中で一番長い難しさのもの
  startDelayMs: 3500, // ラウンドの結果を見せてから次の問題が出るまで（最初のラウンドは「みんなの準備ができてから」）
  introWaitMs: 150000, // 開始前の場面を、全員が読み終えるのを待つ最長の時間
  graceMs: 1200, // 通信の遅れの猶予（期限をこれだけ過ぎた解答までは受け付ける）
  idleAfter: 2, // 2ラウンド続けて答えなかった人は「離席」＝他の人は待たない（答えれば戻る）
  abortAfterIdleRounds: 3, // 全員が離席のまま3ラウンドたったら戦闘をやめる
  minMsPerAnswer: VERIFY.minMsPerAnswer, // これより速い解答は受け付けない（読み直してもらう）
  minCorrect: 5, // ごほうびを受けるのに必要な、その人の正解数（ただ乗り防止）
  maxRounds: 200, // これを超えたら負け扱い
  // 敵の強さ。ボスは「その章の章ボス（ひとりで戦うときの強さ。balance.js の bossStats）」を土台に、HPを bossHp 倍・1回の攻撃を bossDmg 倍。
  //  雑魚のHPは「ボスに対する割合」。
  bossHp: 0.41,
  hpGrowth: 1.2, // ステージが進むほど敵のHPを足す（最後のステージで 1+この値 倍）。パーティが育つぶん、HPも増やす
  mobHp: [0.16, 0.26],
  // 敵の攻撃は「共通のパーティHP（最大）に対する割合」で決める＝どんな編成でも「何ラウンドで全滅するか」が同じになる（強い編成ほど先に倒せる）。
  //  ボスは技のパターン（ため→大技など）の平均がこの割合。雑魚は毎ラウンドこの割合。
  bossDmgFrac: 0.085, mobDmgFrac: [0.03, 0.045],
  //  調整の結果（scripts/sim-raid-battle.mjs・3人・各40回）：いろいろな子が混ざった教室で勝率 約6〜10割、普通の子ばかりだと 約1〜9割（パーティの育ち具合しだい）、得意な子ばかりだと約9〜10割。1ステージ 約6〜8分。
  waveHeal: 0.12, // 波を倒したときのパーティHPの回復（最大HPの割合）
  spread: 0.1, // 敵の攻撃のばらつき（±）
  enrage: 1.15, // ボスのHPが半分以下になったときの攻撃倍率
  tierGold: 0.65, tierSilver: 0.35, // メダル：クリア時のパーティHPの残り割合（金／銀。それ未満は銅）
};

const BY_ID = Object.fromEntries(SPECIALIST_ROSTER.map((c) => [c.id, c]));
const stepOf = (level) => (DIFFICULTY_KEYS.includes(level) ? level : "standard");

/** その人が、いま挑戦できる最後のステージの番号（それより前を全部クリアしていれば、その番号まで挑戦できる）。 */
export function nextUnclearedIndex(state) {
  const cleared = state?.raid?.cleared || {};
  const i = RAID_LADDER.findIndex((b) => !cleared[`${b.grade}:${b.chapterId}`]);
  return i < 0 ? RAID_LADDER.length : i;
}
/** 部屋の全員が「その番号より前を全部クリアしている」番号の上限（全員が同じ所から始められるように）。 */
export function maxStartIndex(states) {
  const ids = Object.keys(states || {});
  if (!ids.length) return 0;
  return Math.min(RAID_LADDER.length - 1, Math.min(...ids.map((id) => nextUnclearedIndex(states[id]))));
}

const levelOfMember = (p, grade) => levelFromExp(p.exps?.[Number(grade) - 1] ?? p.exp ?? 0, BY_ID[p.id]?.rarity || "N");
const charOf = (p) => (BY_ID[p.id] ? { ...BY_ID[p.id], breaks: p.breaks || 0 } : null);
const newSeed = (rand) => Math.floor(rand() * 4294967296) >>> 0;
const pick = (arr, rand) => arr[Math.floor(rand() * arr.length) % arr.length];
const touch = (room, now) => ({ ...room, rev: (room.rev || 0) + 1, updatedAt: now });

/** いまの敵 */
export const currentFoe = (b) => b?.waves?.[b.wave] || null;

/** そのステージの敵の並び（雑魚2波→ボス）。雑魚は、その章の小単元の雑魚から（最初と真ん中あたり）。 */
export function stageWaves(index, partyMaxHp = 3000) {
  const boss = raidBoss(index);
  const st = bossStats("chapterBoss", tierOf(boss.grade, boss.chapterId, null));
  const ch = getChapter(boss.grade, boss.chapterId);
  const subs = ch?.subUnits || [];
  const mobBases = [subs[0]?.enemy, subs[Math.floor(subs.length / 2)]?.enemy].map((e, i) => e || { id: `mob_${boss.chapterId}_${i}`, name: "カゲのかけら", art: "calc", kind: "unit" });
  const pos = index / Math.max(1, RAID_LADDER.length - 1);
  const bossHp = Math.max(1, Math.round(st.hp * RB.bossHp * (1 + RB.hpGrowth * pos))), bossDmg = Math.max(1, Math.round(partyMaxHp * RB.bossDmgFrac));
  const waves = mobBases.map((m, i) => {
    const hp = Math.max(1, Math.round(bossHp * RB.mobHp[i]));
    return { kind: "mob", id: m.id, name: m.name, art: m.art, mobKind: m.kind, hp, maxHp: hp, dmg: Math.max(1, Math.round(partyMaxHp * RB.mobDmgFrac[i])) };
  });
  waves.push({ kind: "boss", id: boss.id, name: boss.name, art: boss.art, title: boss.title, desc: boss.desc, hp: bossHp, maxHp: bossHp, dmg: bossDmg });
  return waves;
}

/** 次のラウンドを作る（全員ぶんの問題を、サーバーがseedを決めて割り当てる）。 */
function newRound(b, memberIds, now, rand, delay = RB.startDelayMs) {
  const problems = {}, levels = [];
  for (const id of memberIds) {
    const level = stepOf(b.nextLevel?.[id]);
    levels.push(level);
    problems[id] = { unitId: pick(b.units, rand), level, seed: newSeed(rand) };
  }
  const sec = Math.max(...levels.map((l) => RB.levelSec[l]));
  const startAt = now + delay;
  return { n: (b.n || 0) + 1, startAt, deadline: startAt + sec * 1000, problems, answers: {} };
}

/** ステージをはじめる（ホストだけ）。まず「場面を読む」段階（phase:"intro"）。全員が読み終えたら（room_battle_ready）最初のラウンドが始まる。 */
export function startBattle(room, { userId, index, states, now, rand = Math.random }) {
  if (!room || room.status !== "started" || !room.party) return { ok: false, error: "not-started" };
  if (room.hostId !== userId) return { ok: false, error: "host-only" };
  if (room.battle && room.battle.status === "fighting") return { ok: false, error: "already-fighting" };
  const boss = Number.isInteger(index) ? raidBoss(index) : null;
  if (!boss) return { ok: false, error: "bad-index" };
  if (index > maxStartIndex(states)) return { ok: false, error: "locked" };
  const units = labUnitIdsOfChapter(boss.grade, boss.chapterId);
  if (!units.length) return { ok: false, error: "no-units" };
  if (room.party.map(charOf).filter(Boolean).length < 5) return { ok: false, error: "bad-party" };
  const partyMaxHp = computePartyMaxHp(room.party.map(charOf), (c) => levelOfMember(room.party.find((p) => p.id === c.id), boss.grade));
  const ids = room.members.map((m) => m.id);
  const b = {
    index, stage: index, grade: boss.grade, chapterId: boss.chapterId, units,
    waves: stageWaves(index, partyMaxHp), wave: 0,
    partyHp: partyMaxHp, partyMaxHp,
    status: "fighting", phase: "intro", ready: [], introDeadline: now + RB.introWaitMs,
    n: 0, round: null, last: null,
    stats: Object.fromEntries(ids.map((id) => [id, { correct: 0, total: 0 }])),
    idle: Object.fromEntries(ids.map((id) => [id, 0])),
    nextLevel: Object.fromEntries(ids.map((id) => [id, "standard"])),
    moveState: {}, rewarded: [], tier: 0, startedAt: now, endedAt: null, idleRounds: 0,
  };
  return { ok: true, room: touch({ ...room, battle: b }, now) };
}

function beginFight(room, now, rand) {
  const b = structuredClone(room.battle);
  b.phase = "fight";
  b.round = newRound(b, room.members.map((m) => m.id), now, rand);
  b.n = b.round.n;
  return touch({ ...room, battle: b }, now);
}

/** 「場面を読み終わった」。全員（部屋にいる人）が読み終えたら戦闘開始。 */
export function readyBattle(room, { userId, now, rand = Math.random }) {
  const rm = tickBattle(room, now, rand);
  const b = rm?.battle;
  if (!b || b.status !== "fighting") return { ok: false, error: "not-fighting", room: rm };
  if (!rm.members.some((m) => m.id === userId)) return { ok: false, error: "not-in-room" };
  if (b.phase !== "intro" || b.ready.includes(userId)) return { ok: true, room: rm };
  const nb = structuredClone(b);
  nb.ready.push(userId);
  let out = touch({ ...rm, battle: nb }, now);
  if (rm.members.every((m) => nb.ready.includes(m.id))) out = beginFight(out, now, rand);
  return { ok: true, room: out };
}

/** この人は、いま「待たれる」人か（離席していない） */
const isActive = (b, id) => (b.idle?.[id] || 0) < RB.idleAfter;

const medalTier = (b) => (b.partyHp / b.partyMaxHp >= RB.tierGold ? 3 : b.partyHp / b.partyMaxHp >= RB.tierSilver ? 2 : 1);

/** ラウンドの結果を出して、次の波／勝ち／負け／次のラウンドへ進める。 */
function resolveRound(room, now, rand) {
  const b = structuredClone(room.battle);
  const r = b.round;
  const foe = currentFoe(b);
  const ids = room.members.map((m) => m.id);
  const per = {};
  let dealt = 0;
  for (const id of ids) {
    const ans = r.answers[id];
    const level = r.problems[id]?.level || "standard";
    const correct = !!ans?.correct;
    b.stats[id] ||= { correct: 0, total: 0 };
    if (ans) b.stats[id].total += 1;
    if (correct) b.stats[id].correct += 1;
    b.idle[id] = ans ? 0 : (b.idle[id] || 0) + 1;
    let damage = 0, crit = false;
    if (correct) {
      const mine = room.party.filter((p) => p.ownerId === id);
      const subject = CHAPTER_SUBJECT[b.chapterId];
      for (const p of mine) {
        const c = charOf(p); if (!c) continue;
        const a = resolvePlayerAttack(c, levelOfMember(p, b.grade), subject, true, {});
        damage += a.damage * DIFFICULTIES[level].dmgMult; if (a.isCrit) crit = true;
      }
      // 1回で削れる量の上限（敵最大HP×難しさごとの割合）。人数ぶんに分けて、全員が正解しても上限を超えない。
      const cap = Math.max(1, Math.round((capDamageFor(foe.maxHp, level) * mine.length) / room.party.length));
      damage = Math.max(1, Math.min(Math.round(damage), cap));
      dealt += damage;
    }
    per[id] = { answered: !!ans, correct, damage, crit, level };
  }
  foe.hp = Math.max(0, foe.hp - dealt);
  const last = { n: r.n, per, dealt, foeName: foe.name, foeKind: foe.kind, foeHp: foe.hp, partyHp: b.partyHp, foeDmg: 0, move: null, notice: null, waveCleared: false, wave: b.wave };
  let advance = false;
  if (foe.hp <= 0) {
    last.waveCleared = true;
    if (b.wave >= b.waves.length - 1) {
      b.status = "won"; b.endedAt = now; b.tier = medalTier(b); last.notice = `${foe.name}をたおした！`;
    } else {
      b.partyHp = Math.min(b.partyMaxHp, b.partyHp + Math.round(b.partyMaxHp * RB.waveHeal)); last.partyHp = b.partyHp;
      last.notice = `${foe.name}をたおした！`;
      b.wave += 1; b.moveState = {}; advance = true;
    }
  } else {
    let dmg, move = null;
    if (foe.kind === "boss") {
      const mv = nextBossMove({ id: foe.id, kind: "chapterBoss", hp: foe.hp, maxHp: foe.maxHp }, b.moveState);
      const enraged = foe.hp / foe.maxHp <= 0.5;
      dmg = mv.move === "charge" ? 0 : Math.round(foe.dmg * mv.dmgMul * (enraged ? RB.enrage : 1));
      move = mv.move;
      last.notice = mv.move === "charge" ? (mv.def.telegraph || null) : mv.move === "big" ? "ためた力を、はなった！" : mv.move === "heavy" ? "強い一撃！" : null;
    } else dmg = foe.dmg;
    if (dmg > 0) dmg = Math.max(1, Math.round(dmg * (1 + (rand() * 2 - 1) * RB.spread)));
    b.partyHp = Math.max(0, b.partyHp - dmg);
    last.foeDmg = dmg; last.move = move; last.partyHp = b.partyHp;
    if (b.partyHp <= 0) { b.status = "lost"; b.endedAt = now; last.notice = "パーティがぜんめつしてしまった…"; }
  }
  b.last = last;
  if (b.status === "fighting") {
    const anyone = ids.some((id) => per[id].answered);
    b.idleRounds = anyone ? 0 : (b.idleRounds || 0) + 1;
    if (b.idleRounds >= RB.abortAfterIdleRounds) { b.status = "aborted"; b.endedAt = now; last.notice = "みんなが答えなかったので、バトルをやめたよ"; }
    else if (r.n >= RB.maxRounds) { b.status = "lost"; b.endedAt = now; last.notice = "時間ぎれ…"; }
  }
  if (b.status === "fighting") { b.round = newRound({ ...b, n: r.n }, ids, now, rand, advance ? RB.startDelayMs + 1500 : RB.startDelayMs); b.n = b.round.n; }
  else b.round = { ...r, closed: true };
  return touch({ ...room, battle: b }, now);
}

/** 期限を過ぎていたら結果を出す（場面を読む段階なら、待ちすぎたら始める）。変わらなければ同じ room をそのまま返す。 */
export function tickBattle(room, now, rand = Math.random) {
  const b = room?.battle;
  if (!b || b.status !== "fighting") return room;
  if (b.phase === "intro") return now >= b.introDeadline ? beginFight(room, now, rand) : room;
  if (!b.round) return room;
  if (now < b.round.deadline + RB.graceMs) return room;
  return resolveRound(room, now, rand);
}

/** 1人の解答を受け付ける。全員（離席していない人）が答えたら、すぐ結果を出す。 */
export function submitAnswer(room, { userId, answer, nextLevel, now, rand = Math.random }) {
  let rm = tickBattle(room, now, rand);
  const b = rm?.battle;
  if (!b || b.status !== "fighting" || b.phase !== "fight" || !b.round) return { ok: false, error: "not-fighting", room: rm };
  if (!rm.members.some((m) => m.id === userId)) return { ok: false, error: "not-in-room" };
  const r = b.round;
  const mine = r.problems[userId];
  if (!mine) return { ok: false, error: "not-in-room", room: rm };
  if (now < r.startAt) return { ok: false, error: "not-started", room: rm };
  if (r.answers[userId]) return { ok: false, error: "already-answered", room: rm };
  if (now - r.startAt < RB.minMsPerAnswer) return { ok: false, error: "too-fast", room: rm };
  const p = generateThirdProblem(mine.unitId, mine.level, mine.seed);
  if (!p) return { ok: false, error: "bad-problem", room: rm };
  const correct = p.choices[p.correctIndex] === String(answer);
  const nb = structuredClone(b);
  nb.round.answers[userId] = { answer: String(answer).slice(0, 80), correct, at: now };
  if (DIFFICULTY_KEYS.includes(nextLevel)) nb.nextLevel[userId] = nextLevel;
  rm = touch({ ...rm, battle: nb }, now);
  const waiting = rm.members.filter((m) => isActive(nb, m.id) && !nb.round.answers[m.id]);
  if (waiting.length === 0) rm = resolveRound(rm, now, rand);
  return { ok: true, room: rm };
}

/** ごほうびの資格：勝っていて、まだ受け取っていなくて、その人の正解数が足りている */
export function rewardEligibility(room, userId) {
  const b = room?.battle;
  if (!b || b.status !== "won") return { ok: false, error: "not-won" };
  if (!b.stats?.[userId]) return { ok: false, error: "not-in-room" };
  if (b.rewarded?.includes(userId)) return { ok: false, error: "already-claimed" };
  if ((b.stats[userId].correct || 0) < RB.minCorrect) return { ok: false, error: "too-few-correct", needed: RB.minCorrect, correct: b.stats[userId].correct || 0 };
  return { ok: true, index: b.index, tier: b.tier || 1 };
}
export function markRewarded(room, userId, now) {
  const b = structuredClone(room.battle);
  b.rewarded = [...(b.rewarded || []), userId];
  return touch({ ...room, battle: b }, now);
}
export function unmarkRewarded(room, userId, now) {
  const b = structuredClone(room.battle);
  b.rewarded = (b.rewarded || []).filter((x) => x !== userId);
  return touch({ ...room, battle: b }, now);
}
