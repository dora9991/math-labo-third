// ============================================================
// handler.js — third-api の中身（DBやHTTPに依存しない純ロジック。Nodeでテスト可能）。
//  store: { load(userId)→{state,version}|null, save(userId,state,prevVersion)→boolean,
//           logAttempts(userId,rows), logGacha(userId,rows) }
//  ★状態の変更はすべてここ（サーバー）だけ。クライアントは結果を受け取って表示するだけ★
// ============================================================
import { applyAdminOp } from "../../../src/third/adminOps.js";
import { recordLogs, checkReport } from "./logging.js";
import { ROOM, newRoomCode, normalizeCode, createRoom, joinRoom, leaveRoom, startRoom, roomView, isActive, memberIds } from "../../../src/third/room.js";
import { initialThirdState, normalizeThirdState, pullGacha, setParty, synthesize, limitBreak, applyClaim, applyPractice, applyConfirm, applyCoopWin, PROBLEM_VERSION } from "../../../src/third/core.js";
import { startBattle, readyBattle, tickBattle, submitAnswer, rewardEligibility, markRewarded, unmarkRewarded, maxStartIndex } from "../../../src/third/raidBattle.js";
import { summarizeAttempts, summarizeTags } from "../../../src/third/learnerProfile.js";

// おすすめ（今日のおすすめ・理解度マップ）用に読む解答の範囲
export const PROFILE = { days: 180, maxRows: 6000, tagDays: 90 };

export async function handle({ action, body = {}, userId, store, now = Date.now(), rand = Math.random }) {
  if (!userId) return { status: 401, body: { error: "unauthorized" } };
  // 状態を読まない軽い操作：ログイン(滞在)の生存確認、バトル終了の報告（負け・途中でやめた・お試し・章ボスの解答も記録に残す）
  if (action === "ping") { // 滞在時間の計測。1分おきに来る。時刻はサーバーの時計だけを使う
    const sid = String(body.sid || "").slice(0, 64);
    if (!sid) return { status: 400, body: { error: "bad-sid" } };
    try { await store.ping?.(userId, sid, now); } catch { /* 記録の失敗でゲームを止めない */ }
    return { status: 200, body: { ok: true, now } };
  }
  if (action === "report") {
    const r = checkReport(body);
    if (!r.ok) return { status: 400, body: { error: r.error } };
    await recordLogs({ store, userId, mode: "battle", attempts: r.attempts, rows: [], ctx: r.ctx, now });
    return { status: 200, body: { ok: true } };
  }
  if (action === "my_profile") { // 自分の解答（全モード）を単元×難易度に集計して返す（状態は読まない・書かない）
    const since = new Date(now - PROFILE.days * 86400000).toISOString();
    const tagSince = new Date(now - PROFILE.tagDays * 86400000).toISOString();
    let rows = [], tagRows = [];
    try { rows = (await store.attemptHistory?.(userId, since, PROFILE.maxRows)) || []; } catch { rows = []; }
    try { tagRows = (await store.mistakeTagHistory?.(userId, tagSince)) || []; } catch { tagRows = []; }
    return { status: 200, body: { ok: true, source: store.attemptHistory ? "server" : "none", units: summarizeAttempts(rows), tags: summarizeTags(tagRows), now } };
  }
  if (String(action).startsWith("room_")) return handleRoom({ action, body, userId, store, now, rand });
  const loaded = await store.load(userId);
  const prevVersion = loaded ? loaded.version : null;
  const state = normalizeThirdState(loaded ? loaded.state : initialThirdState());
  if (!state.credit.at) state.credit.at = now; // 実時間の持ち分の起点（初回）
  const commit = async (next) => {
    const ok = await store.save(userId, next, prevVersion);
    return ok;
  };
  const conflict = { status: 409, body: { error: "conflict-retry" } };

  switch (action) {
    case "get_state": {
      if (!loaded) await commit(state); // 初回：初期の5体を配布して保存
      return { status: 200, body: { state, pv: PROBLEM_VERSION, now } };
    }
    case "gacha": {
      const r = pullGacha(state, Number(body.count), rand, typeof body.pool === "string" ? body.pool : "normal");
      if (!r.ok) return { status: 400, body: { error: r.error, state } };
      if (!(await commit(r.state))) return conflict;
      await store.logGacha?.(userId, r.results);
      return { status: 200, body: { state: r.state, results: r.results } };
    }
    case "synthesize": { // いらない仲間を経験値にする
      const r = synthesize(state, body);
      if (!r.ok) return { status: 400, body: { error: r.error, state } };
      if (!(await commit(r.state))) return conflict;
      return { status: 200, body: { state: r.state, gain: r.gain, used: r.used } };
    }
    case "limit_break": { // 予備を使って限界突破
      const r = limitBreak(state, body.id);
      if (!r.ok) return { status: 400, body: { error: r.error, state } };
      if (!(await commit(r.state))) return conflict;
      return { status: 200, body: { state: r.state, breaks: r.breaks } };
    }
    case "set_party": {
      const r = setParty(state, body.party);
      if (!r.ok) return { status: 400, body: { error: r.error, state } };
      if (!(await commit(r.state))) return conflict;
      return { status: 200, body: { state: r.state } };
    }
    case "practice": { // れんしゅう：検証済みの正解でメダルの進捗を進める
      const r = applyPractice(state, body, now);
      if (!r.ok) return { status: 400, body: { error: r.error, state } };
      if (!(await commit(r.state))) return conflict;
      await store.logAttempts?.(userId, r.rows.map((x) => ({ ...x, mode: "practice" })));
      await recordLogs({ store, userId, mode: "practice", attempts: body.attempts, rows: r.rows, newMedals: r.newMedals, now });
      return { status: 200, body: { state: r.state, verified: r.verified, newMedals: r.newMedals, crystalEvents: r.crystalEvents } };
    }
    case "confirm": { // はいち：確認問題の1ラウンドでメダル
      const r = applyConfirm(state, body, now);
      if (!r.ok) return { status: 400, body: { error: r.error, state } };
      if (!(await commit(r.state))) return conflict;
      await store.logAttempts?.(userId, r.rows.map((x) => ({ ...x, mode: "confirm" })));
      await recordLogs({ store, userId, mode: "confirm", attempts: body.attempts, rows: r.rows, newMedals: r.newMedals, now });
      return { status: 200, body: { state: r.state, verified: r.verified, newMedals: r.newMedals, crystalEvents: r.crystalEvents } };
    }
    case "claim": {
      const r = applyClaim(state, body.claim, now);
      if (!r.ok) return { status: 400, body: { error: r.error, pv: PROBLEM_VERSION, state } };
      if (!(await commit(r.state))) return conflict;
      await store.logAttempts?.(userId, r.rows);
      await recordLogs({ store, userId, mode: "battle", attempts: body.claim?.attempts, rows: r.rows, ctx: { grade: body.claim?.grade, chapterId: body.claim?.chapterId, subUnitId: body.claim?.subUnitId, result: "win" }, now });
      return { status: 200, body: { state: r.state, rewards: r.rewards, verified: r.verified } };
    }
    default:
      return { status: 400, body: { error: "unknown-action" } };
  }
}

// 管理者の操作：対象の生徒の状態を調整して保存する（呼び出し側が合言葉を確認済みであること）。
export async function handleAdmin({ op, args = {}, targetId, store }) {
  if (!targetId) return { status: 400, body: { error: "no-target" } };
  const loaded = await store.load(targetId);
  const cur = loaded ? loaded.state : initialThirdState();
  const r = applyAdminOp(cur, op, args);
  if (!r.ok) return { status: 400, body: { error: r.error } };
  const ok = await store.save(targetId, r.state, loaded ? loaded.version : null);
  if (!ok) return { status: 409, body: { error: "conflict-retry" } };
  return { status: 200, body: { message: r.message, crystals: r.state.crystals, owned: Object.keys(r.state.owned).length } };
}


// ---------------- マルチプレイの部屋（第1段階：作成・参加・退出・開始）----------------
//  store の部屋用: roomLoad(code)→{room,version}|null / roomSave(room,prevVersion)→boolean(prev=nullは新規) / roomOfUser(userId)→code|null / profileName(userId)
async function handleRoom({ action, body, userId, store, now, rand }) {
  if (!store.roomLoad) return { status: 400, body: { error: "server-required" } }; // ローカル(開発)モードでは使えない
  const conflict = { status: 409, body: { error: "conflict-retry" } };
  const view = (room) => ({ status: 200, body: { room: roomView(room), now } });
  const loadActive = async (code) => {
    const rec = await store.roomLoad(code);
    return rec && isActive(rec.room, now) ? rec : null;
  };
  const myCode = async () => { const c = await store.roomOfUser(userId); return c ? normalizeCode(c) : null; };

  if (action === "room_mine") { // いま入っている部屋（なければ null）
    const c = await myCode(); const rec = c ? await loadActive(c) : null;
    return rec && memberIds(rec.room).includes(userId) ? view(rec.room) : { status: 200, body: { room: null, now } };
  }
  if (action === "room_get") {
    const rec = await loadActive(normalizeCode(body.code));
    if (!rec || !memberIds(rec.room).includes(userId)) return { status: 404, body: { error: "room-not-found" } };
    return view(rec.room);
  }
  if (action === "room_create") {
    const old = await myCode(); // 別の部屋に入ったままなら、先に抜ける
    if (old) { const rec = await loadActive(old); if (rec) { const r = leaveRoom(rec.room, { userId, now }); if (r.ok) await store.roomSave(r.room, rec.version); } }
    const name = await store.profileName(userId);
    for (let i = 0; i < 8; i++) {
      const code = newRoomCode(rand);
      const ex = await store.roomLoad(code);
      if (ex && isActive(ex.room, now)) continue; // 使用中のコードは避ける
      const room = createRoom({ code, userId, name, now });
      const ok = ex ? await store.roomSave({ ...room, rev: (ex.room.rev || 0) + 1 }, ex.version) : await store.roomSave(room, null);
      if (ok) return view(room);
    }
    return { status: 503, body: { error: "code-busy" } };
  }
  if (action === "room_join") {
    const code = normalizeCode(body.code);
    if (code.length !== ROOM.codeLen) return { status: 400, body: { error: "bad-code" } };
    const rec = await loadActive(code);
    if (!rec) return { status: 404, body: { error: "room-not-found" } };
    const old = await myCode(); // 別の部屋に入ったままなら、先に抜ける
    if (old && old !== code) { const o = await loadActive(old); if (o) { const r = leaveRoom(o.room, { userId, now }); if (r.ok) await store.roomSave(r.room, o.version); } }
    const name = await store.profileName(userId);
    const r = joinRoom(rec.room, { userId, name, now });
    if (!r.ok) return { status: r.error === "room-not-found" ? 404 : 400, body: { error: r.error } };
    if (r.room !== rec.room && !(await store.roomSave(r.room, rec.version))) return conflict;
    return view(r.room);
  }
  if (action === "room_leave") {
    const code = normalizeCode(body.code) || (await myCode());
    const rec = code ? await loadActive(code) : null;
    if (!rec) return { status: 200, body: { room: null, now } };
    const r = leaveRoom(rec.room, { userId, now });
    if (!r.ok) return { status: 200, body: { room: null, now } };
    if (!(await store.roomSave(r.room, rec.version))) return conflict;
    return { status: 200, body: { room: null, closed: !!r.closed, now } };
  }
  if (action === "room_start") {
    const rec = await loadActive(normalizeCode(body.code));
    if (!rec || !memberIds(rec.room).includes(userId)) return { status: 404, body: { error: "room-not-found" } };
    const states = {};
    for (const id of memberIds(rec.room)) { const l = await store.load(id); states[id] = l ? normalizeThirdState(l.state) : normalizeThirdState(initialThirdState()); }
    const r = startRoom(rec.room, { userId, states, now });
    if (!r.ok) return { status: 400, body: { error: r.error } };
    if (!(await store.roomSave(r.room, rec.version))) return conflict;
    return view(r.room);
  }
  // ---------------- 協力バトル（同時に答える裏ボス連戦。2026-10-09）----------------
  //  全員がほぼ同時に操作するので、部屋の保存が競合しやすい。競合したら読み直して、その場でやり直す（最大 TRIES 回）。
  const TRIES = 6;
  const allStates = async (rec) => {
    const states = {};
    for (const id of memberIds(rec.room)) { const l = await store.load(id); states[id] = l ? normalizeThirdState(l.state) : normalizeThirdState(initialThirdState()); }
    return states;
  };
  if (action === "room_battle_state") { // 開始画面用：どの裏ボスから始められるか（全員が前を倒している番号まで）
    const rec = await loadActive(normalizeCode(body.code));
    if (!rec || !memberIds(rec.room).includes(userId)) return { status: 404, body: { error: "room-not-found" } };
    return { status: 200, body: { maxStart: maxStartIndex(await allStates(rec)), now } };
  }
  if (action === "room_battle_start") {
    const code = normalizeCode(body.code);
    for (let i = 0; i < TRIES; i++) {
      const rec = await loadActive(code);
      if (!rec || !memberIds(rec.room).includes(userId)) return { status: 404, body: { error: "room-not-found" } };
      const r = startBattle(rec.room, { userId, index: Number(body.index), states: await allStates(rec), now, rand });
      if (!r.ok) return { status: 400, body: { error: r.error } };
      if (await store.roomSave(r.room, rec.version)) return view(r.room);
    }
    return conflict;
  }
  if (action === "room_battle_ready") { // 開始前の場面を読み終わった。全員が読み終えたら最初のラウンドが始まる
    const code = normalizeCode(body.code);
    for (let i = 0; i < TRIES; i++) {
      const rec = await loadActive(code);
      if (!rec || !memberIds(rec.room).includes(userId)) return { status: 404, body: { error: "room-not-found" } };
      const r = readyBattle(rec.room, { userId, now, rand });
      const next = r.room || rec.room;
      if (next !== rec.room && !(await store.roomSave(next, rec.version))) continue;
      if (!r.ok) return { status: 200, body: { room: roomView(next), now, ignored: r.error } };
      return view(next);
    }
    return conflict;
  }
  if (action === "room_battle_sync") { // 画面が1〜2秒おきに呼ぶ。期限を過ぎていれば、ここで結果が出る
    const code = normalizeCode(body.code);
    for (let i = 0; i < TRIES; i++) {
      const rec = await loadActive(code);
      if (!rec || !memberIds(rec.room).includes(userId)) return { status: 404, body: { error: "room-not-found" } };
      const next = tickBattle(rec.room, now, rand);
      if (next === rec.room) return view(rec.room);
      if (await store.roomSave(next, rec.version)) return view(next);
    }
    return conflict;
  }
  if (action === "room_battle_answer") {
    const code = normalizeCode(body.code);
    for (let i = 0; i < TRIES; i++) {
      const rec = await loadActive(code);
      if (!rec || !memberIds(rec.room).includes(userId)) return { status: 404, body: { error: "room-not-found" } };
      const r = submitAnswer(rec.room, { userId, answer: body.answer, nextLevel: body.nextLevel, now, rand });
      const next = r.room || rec.room;
      if (next !== rec.room && !(await store.roomSave(next, rec.version))) continue; // 競合：読み直してやり直す
      if (!r.ok) {
        // 速すぎる解答は読み直してもらう。それ以外（すでに答えた／まだ始まっていない／もう終わった）は害のない無視として、いまの様子を返す。
        if (r.error === "too-fast") return { status: 400, body: { error: "too-fast" } };
        return { status: 200, body: { room: roomView(next), now, ignored: r.error } };
      }
      return view(next);
    }
    return conflict;
  }
  if (action === "room_battle_claim") { // 勝ったあと、自分のごほうびを自分で受け取る（部屋が閉じられたあとでも受け取れる）
    const code = normalizeCode(body.code);
    for (let i = 0; i < TRIES; i++) {
      const rec = await store.roomLoad(code);
      if (!rec || now - (rec.room.updatedAt || 0) > ROOM.staleMs) return { status: 404, body: { error: "room-not-found" } };
      const el = rewardEligibility(rec.room, userId);
      if (!el.ok) return { status: 400, body: { error: el.error, needed: el.needed, correct: el.correct } };
      const marked = markRewarded(rec.room, userId, now); // 先に「受け取り済み」の印を原子的に付ける（二重に受け取れない）
      if (!(await store.roomSave(marked, rec.version))) continue;
      for (let j = 0; j < TRIES; j++) {
        const l = await store.load(userId);
        const st = normalizeThirdState(l ? l.state : initialThirdState());
        const rw = applyCoopWin(st, el.index, el.tier, now);
        if (!rw.ok) break;
        if (await store.save(userId, rw.state, l ? l.version : null)) return { status: 200, body: { rewards: rw.rewards, state: rw.state, room: roomView(marked), now } };
      }
      // 保存できなかった：印を外して（できれば）、もう一度やってもらう
      const again = await store.roomLoad(code);
      if (again) await store.roomSave(unmarkRewarded(again.room, userId, now), again.version);
      return conflict;
    }
    return conflict;
  }
  return { status: 400, body: { error: "unknown-room-action" } };
}
