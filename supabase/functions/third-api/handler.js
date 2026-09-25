// ============================================================
// handler.js — third-api の中身（DBやHTTPに依存しない純ロジック。Nodeでテスト可能）。
//  store: { load(userId)→{state,version}|null, save(userId,state,prevVersion)→boolean,
//           logAttempts(userId,rows), logGacha(userId,rows) }
//  ★状態の変更はすべてここ（サーバー）だけ。クライアントは結果を受け取って表示するだけ★
// ============================================================
import { applyAdminOp } from "../../../src/third/adminOps.js";
import { recordLogs, checkReport } from "./logging.js";
import { ROOM, newRoomCode, normalizeCode, createRoom, joinRoom, leaveRoom, startRoom, roomView, isActive, memberIds } from "../../../src/third/room.js";
import { initialThirdState, normalizeThirdState, pullGacha, setParty, synthesize, limitBreak, applyClaim, applyPractice, applyConfirm, PROBLEM_VERSION } from "../../../src/third/core.js";

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
      const r = pullGacha(state, Number(body.count), rand);
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
  return { status: 400, body: { error: "unknown-room-action" } };
}
