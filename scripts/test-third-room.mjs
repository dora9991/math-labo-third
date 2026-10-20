// マルチプレイの部屋（第1段階）の自動テスト。メモリ上のストアで動かす。  実行: npm run test:third-room
import { build } from "esbuild";
import { execSync } from "node:child_process";
execSync("node scripts/gen-problem-version.mjs", { stdio: "ignore" });
await build({
  stdin: { contents: `export * from "./supabase/functions/third-api/handler.js"; export * from "./src/third/room.js";`, resolveDir: process.cwd(), loader: "js" },
  bundle: true, format: "esm", platform: "node", outfile: "dist-fn/_r.mjs", loader: { ".json": "json" }, logLevel: "error",
});
const T = await import("../dist-fn/_r.mjs");
let pass = 0, fail = 0;
const t = (name, cond, extra = "") => { (cond ? pass++ : fail++); console.log(`${cond ? "✅" : "❌"} ${name}${cond ? "" : "  " + extra}`); };

function makeStore() {
  const players = new Map(), rooms = new Map(); let ver = 0;
  return {
    async load(u) { const r = players.get(u); return r ? { state: structuredClone(r.state), version: r.version } : null; },
    async save(u, state, prev) { const r = players.get(u); if (!r && prev === null) { players.set(u, { state: structuredClone(state), version: ++ver }); return true; } if (r && r.version === prev) { players.set(u, { state: structuredClone(state), version: ++ver }); return true; } return false; },
    async roomLoad(code) { const r = rooms.get(code); return r ? { room: structuredClone(r.room), version: r.version } : null; },
    async roomSave(room, prev) { const r = rooms.get(room.code); if (!r && prev === null) { rooms.set(room.code, { room: structuredClone(room), version: ++ver }); return true; } if (r && r.version === prev) { rooms.set(room.code, { room: structuredClone(room), version: ++ver }); return true; } return false; },
    async roomOfUser(u) { for (const [c, r] of rooms) if (r.room.status !== "closed" && r.room.members.some((m) => m.id === u)) return c; return null; },
    async profileName(u) { return "P-" + u; },
  };
}
const NOW = 1_800_000_000_000;
const call = (s, action, body, u, now = NOW) => T.handle({ action, body, userId: u, store: s, now, rand: Math.random });
const seedPlayer = async (s, u) => { await call(s, "get_state", {}, u); }; // 初期の5体を配布

// ---- 編成の形
t("編成: 2人=3+2 / 3人=3+1+1 / 4人=2+1+1+1 / 5人=1×5（合計は必ず5）", [2, 3, 4, 5].every((n) => { const p = T.partyShape(n); return p.host + p.other * (n - 1) === 5; }) && T.partyShape(2).host === 3 && T.partyShape(3).host === 3 && T.partyShape(4).host === 2 && T.partyShape(5).host === 1);
t("編成: 1人・6人は不正", T.partyShape(1) === null && T.partyShape(6) === null);
t("部屋コード: 4文字・紛らわしい文字なし", (() => { for (let i = 0; i < 300; i++) { const c = T.newRoomCode(); if (c.length !== 4 || /[IO01]/.test(c)) return false; } return true; })());

// ---- 作成・参加
{ const s = makeStore(); for (const u of ["h", "a", "b", "c", "d", "e"]) await seedPlayer(s, u);
  let r = await call(s, "room_create", {}, "h");
  const code = r.body.room?.code;
  t("作成: 部屋コードが返り、ホストだけが入っている", r.status === 200 && code?.length === 4 && r.body.room.hostId === "h" && r.body.room.members.length === 1 && r.body.room.status === "waiting");
  r = await call(s, "room_join", { code: code.toLowerCase() }, "a");
  t("参加: 小文字のコードでも入れる・名前はサーバーが決める", r.status === 200 && r.body.room.members.length === 2 && r.body.room.members[1].name === "P-a");
  r = await call(s, "room_join", { code }, "a");
  t("参加: 同じ人が再度入っても増えない（再接続）", r.status === 200 && r.body.room.members.length === 2);
  r = await call(s, "room_join", { code: "ZZZZ" }, "b"); t("参加: 存在しないコードは拒否", r.status === 404);
  r = await call(s, "room_join", { code: "ab" }, "b"); t("参加: 短すぎるコードは拒否", r.status === 400);
  r = await call(s, "room_start", { code }, "a"); t("開始: ホスト以外は開始できない", r.status === 400 && r.body.error === "host-only");
  // 5人まで入れる
  for (const u of ["b", "c", "d"]) await call(s, "room_join", { code }, u);
  r = await call(s, "room_join", { code }, "e"); t("参加: 6人目は拒否（最大5人）", r.status === 400 && r.body.error === "room-full");
  r = await call(s, "room_get", { code }, "e"); t("取得: 部屋に入っていない人は見られない", r.status === 404);
  r = await call(s, "room_start", { code }, "h");
  const party = r.body.room?.party || [];
  t("開始(5人): 各人1体ずつ・合計5体が固定される", r.status === 200 && r.body.room.status === "started" && party.length === 5 && new Set(party.map((p) => p.ownerId)).size === 5);
  t("開始: 各キャラは、その持ち主が実際に所持しているもの", (await Promise.all(party.map(async (p) => { const st = (await s.load(p.ownerId)).state; return !!st.owned[p.id]; }))).every(Boolean));
  r = await call(s, "room_join", { code }, "e"); t("開始後の参加は拒否", r.status === 400 && (r.body.error === "already-started" || r.body.error === "room-full"));
}

// ---- 人数ごとの編成
for (const [n, host, other] of [[2, 3, 2], [3, 3, 1], [4, 2, 1]]) {
  const s = makeStore(); const ids = ["h", "a", "b", "c"].slice(0, n); for (const u of ids) await seedPlayer(s, u);
  const code = (await call(s, "room_create", {}, "h")).body.room.code;
  for (const u of ids.slice(1)) await call(s, "room_join", { code }, u);
  const r = await call(s, "room_start", { code }, "h"); const p = r.body.room?.party || [];
  const cnt = (u) => p.filter((x) => x.ownerId === u).length;
  t(`編成(${n}人): ホスト${host}体・他の各人${other}体`, r.status === 200 && p.length === 5 && cnt("h") === host && ids.slice(1).every((u) => cnt(u) === other), JSON.stringify(p.map((x) => x.ownerId)));
}

// ---- 1人では開始できない／退出・閉鎖
{ const s = makeStore(); for (const u of ["h", "a"]) await seedPlayer(s, u);
  const code = (await call(s, "room_create", {}, "h")).body.room.code;
  let r = await call(s, "room_start", { code }, "h"); t("開始: 1人では開始できない（最低2人）", r.status === 400 && r.body.error === "need-more-players");
  await call(s, "room_join", { code }, "a");
  r = await call(s, "room_leave", { code }, "a"); t("退出: 参加者が抜けると名簿から外れる（部屋は残る）", r.status === 200 && r.body.room === null);
  r = await call(s, "room_get", { code }, "h"); t("退出後の部屋: ホストだけが残る", r.status === 200 && r.body.room.members.length === 1);
  r = await call(s, "room_get", { code }, "a"); t("退出した人は見られない", r.status === 404);
  await call(s, "room_leave", { code }, "h");
  r = await call(s, "room_get", { code }, "h"); t("ホストが抜けると部屋は閉じる", r.status === 404);
  r = await call(s, "room_join", { code }, "a"); t("閉じた部屋には入れない", r.status === 404);
  // 古い部屋は無いものとして扱う
  const c2 = (await call(s, "room_create", {}, "h", NOW)).body.room.code;
  r = await call(s, "room_join", { code: c2 }, "a", NOW + T.ROOM.staleMs + 1000); t("3時間動きが無い部屋は無効", r.status === 404);
  // 別の部屋を作ると、前の部屋からは抜ける
  const s2 = makeStore(); for (const u of ["h", "a", "b"]) await seedPlayer(s2, u);
  const c3 = (await call(s2, "room_create", {}, "h")).body.room.code; await call(s2, "room_join", { code: c3 }, "a");
  const c4 = (await call(s2, "room_create", {}, "b")).body.room.code; await call(s2, "room_join", { code: c4 }, "a");
  r = await call(s2, "room_get", { code: c3 }, "a"); t("別の部屋に入ると、前の部屋からは抜ける", r.status === 404);
  r = await call(s2, "room_mine", {}, "a"); t("room_mine: いま入っている部屋を返す", r.status === 200 && r.body.room?.code === c4);
  r = await call(s2, "room_mine", {}, "h"); t("room_mine: 入っていなければ null", r.status === 200 && r.body.room?.code === c3);
}

// ---- ローカルモード（部屋の道具なし）
{ const s = { async load() { return null; }, async save() { return true; } };
  const r = await T.handle({ action: "room_create", body: {}, userId: "x", store: s, now: NOW });
  t("ローカル(開発)モードでは部屋は使えない", r.status === 400 && r.body.error === "server-required"); }

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
