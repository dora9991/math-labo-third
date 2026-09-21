// ============================================================
// ThirdContext.jsx — 数学ラボ3：仲間・ガチャ・バトル報酬の状態を配る React Context。
//  状態(save)は thirdApi から取得する（サーバーモードではサーバーが正／ローカルモードは開発用）。
//  画面はここから save と actions を使う。所持キャラ(owned)・限界突破(breaks)・チケット・パーティは
//  すべて「サーバーが決めた値」を表示・利用するだけで、クライアントが勝手に増やす処理は無い。
// ============================================================
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { GACHA_ROSTER } from "./data/gachaRoster.js";
import { SPECIALIST_ROSTER } from "./specialistRoster.js";
import { PARTY_SIZE } from "./gachaConfig.js";
import { thirdApi, THIRD_MODE } from "./thirdApi.js";
import { isGuest } from "../auth/session.js";

export { PARTY_SIZE };

const ThirdContext = createContext(null);

export function ThirdProvider({ children }) {
  const [save, setSave] = useState(null);
  const [error, setError] = useState(null);
  const offsetRef = useRef(0); // サーバー時刻との差（端末の時計がずれていても申請が通るように）

  const load = useCallback(async () => {
    const r = await thirdApi.getState();
    if (r.status === 200) {
      offsetRef.current = (r.body.now || Date.now()) - Date.now();
      setSave(r.body.state);
      setError(null);
    } else {
      setError(r.body?.error || "load-failed");
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  // 所持キャラ本体（限界突破 breaks を載せた表示・戦闘用のオブジェクト）。未所持は元データのまま。
  const charactersById = useMemo(() => {
    const map = {};
    for (const c of GACHA_ROSTER) map[c.id] = c;
    for (const c of SPECIALIST_ROSTER) map[c.id] = { ...c, breaks: save?.owned?.[c.id]?.breaks || 0 };
    return map;
  }, [save]);

  const actions = useMemo(() => ({
    serverNow: () => Date.now() + offsetRef.current,
    // パーティ枠の入れ替え：まず画面に反映(楽観)し、サーバーが正しいと認めた状態で置き換える。
    async setPartySlot(slot, characterId) {
      let next = null;
      setSave((s) => {
        const party = [...s.party];
        party[slot] = characterId;
        next = party;
        return { ...s, party };
      });
      const r = await thirdApi.setParty(next);
      if (r.status === 200) setSave(r.body.state);
      else await load(); // 拒否された（未所持など）→ サーバーの状態に戻す
    },
    async pullGacha(count) {
      const r = await thirdApi.gacha(count);
      if (r.status === 200) { setSave(r.body.state); return { ok: true, results: r.body.results }; }
      if (r.body?.state) setSave(r.body.state);
      return { ok: false, error: r.body?.error || "failed" };
    },
    async claimBattle(claim) {
      const r = await thirdApi.claim(claim);
      if (r.status === 200) { setSave(r.body.state); return { ok: true, rewards: r.body.rewards, verified: r.body.verified }; }
      if (r.status === 409) { // 同時操作の競合：少し待って1回だけやり直す
        await new Promise((res) => setTimeout(res, 400));
        const r2 = await thirdApi.claim(claim);
        if (r2.status === 200) { setSave(r2.body.state); return { ok: true, rewards: r2.body.rewards, verified: r2.body.verified }; }
        return { ok: false, error: r2.body?.error || "failed" };
      }
      return { ok: false, error: r.body?.error || "failed" };
    },
    reload: load,
  }), [load]);

  if (error) {
    return (
      <div className="mw-fantasy-screen mw-center" style={{ minHeight: "50vh" }}>
        <div className="mw-fantasy-title" style={{ fontSize: "1.2rem" }}>つながらなかったよ</div>
        <div style={{ color: "#ffe9b3", margin: "8px 0" }}>ネットのようすを見て、もう一度ためしてね。（{String(error)}）</div>
        <button className="mw-btn primary" onClick={load}>もういちど</button>
      </div>
    );
  }
  if (!save) return <div className="mw-fantasy-screen mw-center" style={{ minHeight: "40vh" }}><div className="mw-fantasy-title" style={{ fontSize: "1.1rem" }}>読み込み中…</div></div>;

  const value = { save, actions, charactersById, mode: isGuest() ? "guest" : THIRD_MODE };
  return <ThirdContext.Provider value={value}>{children}</ThirdContext.Provider>;
}

export function useGame() {
  const ctx = useContext(ThirdContext);
  if (!ctx) throw new Error("useGame は ThirdProvider の内側で使ってください");
  return ctx;
}
