// ============================================================
// room.js — 数学ラボ3「みんなで戦う（マルチプレイ）」の部屋（純関数。DB・HTTPに依存しない）。
//  第1段階：部屋の作成→部屋コードで参加→ホストが開始（共通パーティの編成を固定）まで。バトルは次の段階。
//  設計: Obsidian 「設計メモ_math-labo-third_マルチプレイ_2026-09-25」
//  部屋の状態（room）は**サーバーだけ**が変える。クライアントは受け取って表示するだけ。
//  room = { code, hostId, status:"waiting"|"started"|"closed", members:[{id,name,joinedAt}],
//           party:[{id,ownerId,exp,breaks}] | null, rev, createdAt, updatedAt }
// ============================================================
export const ROOM = {
  min: 2, // 最低2人
  max: 5, // 最大5人
  codeLen: 4,
  codeChars: "ABCDEFGHJKLMNPQRSTUVWXYZ23456789", // 紛らわしい文字(I/O/0/1)を除く
  staleMs: 3 * 60 * 60 * 1000, // 3時間動きが無い部屋は無いものとして扱う
  partySize: 5,
};

/** 共通パーティの編成：人数 → ホストが出す数／他の人が1人ずつ出す数（合計は必ず5体）。 */
export function partyShape(n) {
  const t = { 2: { host: 3, other: 2 }, 3: { host: 3, other: 1 }, 4: { host: 2, other: 1 }, 5: { host: 1, other: 1 } }[n];
  return t || null;
}

export function newRoomCode(rand = Math.random) {
  let s = "";
  for (let i = 0; i < ROOM.codeLen; i++) s += ROOM.codeChars[Math.floor(rand() * ROOM.codeChars.length)];
  return s;
}
export const normalizeCode = (c) => String(c || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, ROOM.codeLen);

export const isStale = (room, now) => !room || now - (room.updatedAt || 0) > ROOM.staleMs;
export const isActive = (room, now) => !!room && room.status !== "closed" && !isStale(room, now);
export const memberIds = (room) => room.members.map((m) => m.id);

const cleanName = (n) => String(n || "").trim().slice(0, 12) || "なまえなし";
const touch = (room, now) => ({ ...room, rev: (room.rev || 0) + 1, updatedAt: now });

export function createRoom({ code, userId, name, now }) {
  return { code, hostId: userId, status: "waiting", members: [{ id: userId, name: cleanName(name), joinedAt: now }], party: null, rev: 1, createdAt: now, updatedAt: now };
}

export function joinRoom(room, { userId, name, now }) {
  if (!isActive(room, now)) return { ok: false, error: "room-not-found" };
  if (room.members.some((m) => m.id === userId)) return { ok: true, room }; // すでに入っている（再接続）
  if (room.status !== "waiting") return { ok: false, error: "already-started" };
  if (room.members.length >= ROOM.max) return { ok: false, error: "room-full" };
  return { ok: true, room: touch({ ...room, members: [...room.members, { id: userId, name: cleanName(name), joinedAt: now }] }, now) };
}

/** 抜ける。ホストが抜けたら部屋を閉じる（待機中でも開始後でも）。開始前の他の人は名簿から外れる。 */
export function leaveRoom(room, { userId, now }) {
  if (!room || !room.members.some((m) => m.id === userId)) return { ok: false, error: "not-in-room" };
  if (room.hostId === userId || room.members.length <= 1) return { ok: true, room: touch({ ...room, status: "closed" }, now), closed: true };
  if (room.status === "started") return { ok: true, room: touch({ ...room, members: room.members.filter((m) => m.id !== userId) }, now), closed: false }; // 開始後の離脱は次の段階で「飛ばす」に使う
  return { ok: true, room: touch({ ...room, members: room.members.filter((m) => m.id !== userId) }, now), closed: false };
}

/**
 * ホストが開始する：全員の所持キャラから共通パーティ5体を組み、固定する。
 * states = { [userId]: 各人のサーバー状態(party/owned) }。各人の並べ替えたパーティの先頭から、その人の担当数だけ出す。
 */
export function startRoom(room, { userId, states, now }) {
  if (!isActive(room, now)) return { ok: false, error: "room-not-found" };
  if (room.hostId !== userId) return { ok: false, error: "host-only" };
  if (room.status !== "waiting") return { ok: false, error: "already-started" };
  const n = room.members.length;
  if (n < ROOM.min) return { ok: false, error: "need-more-players" };
  const shape = partyShape(n);
  if (!shape) return { ok: false, error: "bad-size" };
  const party = [];
  for (const m of room.members) {
    const need = m.id === room.hostId ? shape.host : shape.other;
    const st = states?.[m.id];
    if (!st || !st.owned) return { ok: false, error: "no-state" };
    const picked = [];
    for (const id of st.party || []) if (id && st.owned[id] && picked.length < need && !picked.includes(id)) picked.push(id);
    for (const id of Object.keys(st.owned)) if (picked.length < need && !picked.includes(id)) picked.push(id); // パーティが足りなければ所持キャラから補う
    if (picked.length < need) return { ok: false, error: "not-enough-companions", userId: m.id };
    for (const id of picked) party.push({ id, ownerId: m.id, exp: st.owned[id].exp || 0, breaks: st.owned[id].breaks || 0 });
  }
  return { ok: true, room: touch({ ...room, status: "started", party }, now) };
}

/** 参加者に見せる形（他人の内部情報は入っていないのでそのまま返してよい） */
export const roomView = (room) => room && {
  code: room.code, hostId: room.hostId, status: room.status, members: room.members, party: room.party, rev: room.rev,
  shape: partyShape(room.members.length),
};
