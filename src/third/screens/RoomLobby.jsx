// ============================================================
// RoomLobby.jsx — 「みんなで戦う」の待合室（第1段階）。部屋を作る／部屋コードで入る → 参加者が集まる → ホストが開始。
//  開始すると、全員の持ちキャラから共通パーティ5体が固定される（バトルは次の段階）。
//  部屋の状態はサーバーが持ち、Realtime で全員の画面に同時に届く。ここは表示と操作だけ。
// ============================================================
import { useCallback, useEffect, useRef, useState } from "react";
import { thirdApi } from "../thirdApi.js";
import { watchRoom } from "../roomRealtime.js";
import { useGame } from "../ThirdContext.jsx";
import { supabase } from "../../auth/supabase.js";
import MonsterPortrait from "../components/MonsterPortrait.jsx";
import { ROOM, partyShape, normalizeCode } from "../room.js";
import { RAID_LADDER, TIER_ICON } from "../raid.js";
import { COOP_STAGE_TITLES } from "../story/coopStory.js";
import CoopBattle from "./CoopBattle.jsx";
import "./coop.css";

const ERR = {
  "room-not-found": "その部屋は見つからないよ（コードをたしかめてね）",
  "room-full": "その部屋はもう いっぱいだよ（5人まで）",
  "already-started": "その部屋は もう はじまっているよ",
  "bad-code": "コードは 4もじ だよ",
  "host-only": "はじめられるのは 部屋をつくった人だけだよ",
  "need-more-players": "2人以上 あつまってからはじめよう",
  "not-enough-companions": "仲間が足りない人がいるよ",
  "server-required": "この画面は サーバーにつながっている時だけ使えるよ",
  "conflict-retry": "もういちど ためしてね",
  locked: "まだ みんなが前のステージを クリアしていないよ（全員が前までクリアしていると進めるよ）",
  "already-fighting": "いま バトルの最中だよ",
  "not-started": "メンバーが きまってから 始めよう",
  "bad-party": "パーティが 5体そろっていないよ",
  "code-busy": "いま部屋が作れないよ。少しあとでね",
  network: "つながらなかったよ",
};
const errText = (b) => ERR[b?.error] || "うまくいかなかったよ。もういちど";

export default function RoomLobby({ nav }) {
  const { charactersById, actions, save } = useGame();
  const [me, setMe] = useState(null);
  const [room, setRoom] = useState(null);
  const [online, setOnline] = useState([]);
  const [codeIn, setCodeIn] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const roomRef = useRef(null);
  roomRef.current = room;
  const [maxStart, setMaxStart] = useState(0); // 協力バトル：全員がクリア済みで始められる最後のステージ
  const [dismissed, setDismissed] = useState(0); // 結果を閉じた戦闘（startedAt）
  const [pickIdx, setPickIdx] = useState(null);

  const applyRoom = useCallback((r) => {
    setRoom((cur) => (cur && r && r.code === cur.code && (r.rev || 0) < (cur.rev || 0) ? cur : r)); // 古い更新で巻き戻さない
    if (r?.status === "closed") { setRoom(null); setMsg("部屋が とじられたよ"); }
  }, []);

  // 自分のID（Realtimeの参加者判定用）と、すでに入っている部屋
  useEffect(() => {
    let live = true;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (live) setMe(data?.user?.id || null);
      const r = await thirdApi.roomMine();
      if (live && r.status === 200 && r.body.room) setRoom(r.body.room);
      if (live) setReady(true);
    })();
    return () => { live = false; };
  }, []);

  const code = room?.code;
  const inBattle = room?.battle?.status === "fighting"; // 戦闘中は、1.5秒おきにサーバーへ様子を見に行く（期限が過ぎていればそこで結果が出る）
  useEffect(() => {
    if (!code || !me) return undefined;
    return watchRoom({
      code, userId: me, onRoom: applyRoom, onOnline: setOnline, pollMs: inBattle ? 1500 : 4000,
      poll: async () => {
        const r = await (roomRef.current?.battle?.status === "fighting" ? thirdApi.roomBattleSync(code) : thirdApi.roomGet(code));
        if (r.body?.now) actions.noteServerNow(r.body.now);
        if (r.status === 200) applyRoom(r.body.room);
        else if (r.status === 404) { setRoom(null); setMsg("部屋が なくなったよ"); }
      },
    });
  }, [code, me, applyRoom, inBattle]); // eslint-disable-line react-hooks/exhaustive-deps

  // 協力バトルのステージ選び：どこまで始められるか（開始後・戦闘していない間）
  const started = room?.status === "started";
  const battleStatus = room?.battle?.status;
  useEffect(() => {
    if (!code || !started || battleStatus === "fighting") return;
    thirdApi.roomBattleState(code).then((r) => { if (r.status === 200) { setMaxStart(r.body.maxStart); actions.noteServerNow(r.body.now); } });
  }, [code, started, battleStatus, room?.battle?.startedAt]); // eslint-disable-line react-hooks/exhaustive-deps

  async function startStage(index) {
    const r = await thirdApi.roomBattleStart(code, index);
    if (r.body?.now) actions.noteServerNow(r.body.now);
    if (r.status === 200) { applyRoom(r.body.room); setPickIdx(null); return ""; }
    return errText(r.body);
  }

  async function run(fn) {
    if (busy) return;
    setBusy(true); setMsg("");
    try {
      const r = await fn();
      if (r.status === 200) { if ("room" in r.body) setRoom(r.body.room); }
      else setMsg(errText(r.body));
    } finally { setBusy(false); }
  }

  const isHost = room && me && room.hostId === me;
  // 協力バトル中（または結果を見ている間）は、部屋コードやメンバー一覧を畳んで、バトルの画面を広く使う
  const inCoop = !!(room?.status === "started" && room.battle && (room.battle.status === "fighting" || dismissed !== room.battle.startedAt));
  const n = room?.members.length || 0;
  const shape = partyShape(n);

  return (
    <div className="mw-fantasy-screen">
      <div className="mw-fantasy-topbar">
        <button className="mw-fantasy-back" onClick={() => nav.exit()}>← もどる</button>
        <span className="mw-fantasy-title" style={{ fontSize: "1.1rem" }}>🤝 みんなで戦う</span>
        <span style={{ width: 60 }} />
      </div>

      {!ready && <div className="mw-fantasy-panel mw-center">よみこみ中…</div>}

      {ready && !room && (
        <div className="mw-fantasy-panel" style={{ display: "flex", flexDirection: "column", gap: 14, alignItems: "stretch" }}>
          <div style={{ color: "#ffe9b3", textAlign: "center", lineHeight: 1.7 }}>2〜5人で、ひとつのパーティになって戦うよ。<br />部屋をつくって、コードを友だちに伝えよう。</div>
          <button className="mw-btn primary" disabled={busy} onClick={() => run(() => thirdApi.roomCreate())}>🏠 部屋をつくる（ホスト）</button>
          <div style={{ textAlign: "center", color: "rgba(255,255,255,.6)", fontSize: 12 }}>— または —</div>
          <div style={{ display: "flex", gap: 8 }}>
            <input value={codeIn} onChange={(e) => setCodeIn(normalizeCode(e.target.value))} placeholder="部屋コード（4もじ）" maxLength={ROOM.codeLen}
              style={{ flex: 1, padding: "12px", fontSize: "1.3rem", letterSpacing: "0.3em", textAlign: "center", borderRadius: 10, border: "2px solid rgba(255,255,255,.25)", background: "rgba(0,0,0,.35)", color: "#fff" }} />
            <button className="mw-btn primary" disabled={busy || codeIn.length !== ROOM.codeLen} onClick={() => run(() => thirdApi.roomJoin(codeIn))}>入る</button>
          </div>
        </div>
      )}

      {room && (
        <>
          {!inCoop && (<>
          <div className="mw-fantasy-panel mw-center">
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.65)" }}>部屋コード</div>
            <div style={{ fontSize: "2.6rem", fontWeight: 900, letterSpacing: "0.35em", color: "#ffe066", paddingLeft: "0.35em" }}>{room.code}</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.65)" }}>{room.status === "waiting" ? "このコードを友だちに伝えてね" : "メンバーが きまったよ"}</div>
          </div>

          <div className="mw-fantasy-panel">
            <div className="mw-bench-title">メンバー {n} / {ROOM.max}人</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {room.members.map((m) => (
                <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 10, background: "rgba(255,255,255,.06)" }}>
                  <span title={online.includes(m.id) ? "つながっている" : "つながっていない"} style={{ width: 10, height: 10, borderRadius: "50%", background: online.includes(m.id) ? "#4ade80" : "#6b7280" }} />
                  <strong style={{ flex: 1 }}>{m.name}{m.id === me ? "（あなた）" : ""}</strong>
                  {m.id === room.hostId && <span style={{ fontSize: 12, color: "#ffe066", fontWeight: 800 }}>👑 ホスト</span>}
                  {room.status === "waiting" && shape && <span style={{ fontSize: 12, color: "rgba(255,255,255,.7)" }}>{m.id === room.hostId ? shape.host : shape.other}体を出す</span>}
                </div>
              ))}
            </div>
            {room.status === "waiting" && (
              <div style={{ marginTop: 10, fontSize: 12, color: "rgba(255,255,255,.65)", lineHeight: 1.6 }}>
                {n < ROOM.min ? "あと1人 入ると はじめられるよ（2人から）。" : "みんなの持っている仲間から、パーティ5体を組むよ（各自のパーティの先頭から出るよ）。"}
              </div>
            )}
          </div>
          </>)}

          {room.status === "started" && room.party && (() => {
            const b = room.battle;
            if (inCoop) return <CoopBattle room={room} me={me} code={room.code} isHost={!!isHost} onRoom={applyRoom} onDismiss={(t) => setDismissed(t)} onStart={startStage} />;
            const medals = save?.coop?.medals || {};
            return (
              <div className="mw-fantasy-panel">
                <div className="mw-bench-title">みんなのパーティ（この5体で戦うよ）</div>
                <div className="mw-party-row mw-party-row-small">
                  {room.party.map((p, i) => {
                    const c = charactersById[p.id] ? { ...charactersById[p.id], breaks: p.breaks } : null;
                    const owner = room.members.find((m) => m.id === p.ownerId);
                    return (
                      <div key={i} style={{ textAlign: "center" }}>
                        <MonsterPortrait character={c} size="small" />
                        <div style={{ fontSize: 10, color: "#ffe9b3", marginTop: 2 }}>{owner?.name || ""}</div>
                      </div>
                    );
                  })}
                </div>
                <div className="mw-bench-title" style={{ marginTop: 14 }}>🕯️ ともしびの回廊　{isHost ? "（ホストがステージをえらぶよ）" : "（ホストが えらぶのを まっているよ）"}</div>
                <div className="mw-sub" style={{ marginBottom: 6 }}>全員が同時に答えるよ。雑魚を2回倒して、その章の「裏ボス」へ。全員が前のステージをクリアしていると、次に進めるよ。</div>
                <div className="coop-stages">
                  {RAID_LADDER.map((bo, i) => {
                    const open = i <= maxStart;
                    return (
                      <div key={bo.id}>
                        {(i === 0 || RAID_LADDER[i - 1].grade !== bo.grade) && <div className="coop-grade">中{bo.grade}</div>}
                        <button className={`coop-stage-row ${pickIdx === i ? "is-pick" : ""}`} disabled={!open || !isHost} onClick={() => setPickIdx(i)}>
                          <span className="coop-stage-no">{i + 1}</span>
                          <span className="coop-stage-body"><b>{open ? COOP_STAGE_TITLES[i] : "？？？"}</b><small>{open ? `${bo.name}　${bo.title}` : "ひとつ前のステージを みんなでクリアすると ひらくよ"}</small></span>
                          <span className="coop-stage-medal">{medals[i] ? TIER_ICON[medals[i]] : open ? "▶" : "🔒"}</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
                {isHost && <button className="mw-btn primary" style={{ marginTop: 12 }} disabled={busy || pickIdx === null} onClick={async () => { setBusy(true); const m = await startStage(pickIdx); setMsg(m); setBusy(false); }}>{pickIdx === null ? "ステージを えらんでね" : `▶ 第${pickIdx + 1}話に 挑戦する`}</button>}
              </div>
            );
          })()}

          <div className="mw-fantasy-panel" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {room.status === "waiting" && isHost && (
              <button className="mw-btn primary" disabled={busy || n < ROOM.min} onClick={() => run(() => thirdApi.roomStart(room.code))}>▶ この{n}人で はじめる</button>
            )}
            {room.status === "waiting" && !isHost && <div style={{ textAlign: "center", color: "#ffe9b3" }}>ホストが はじめるのを まっているよ…</div>}
            <button className="mw-btn" disabled={busy} onClick={() => run(() => thirdApi.roomLeave(room.code))}>{isHost ? "部屋をとじる" : "部屋から出る"}</button>
          </div>
        </>
      )}

      {msg && <div className="mw-fantasy-panel mw-center" style={{ color: "#ffb4b4" }}>{msg}</div>}
    </div>
  );
}
