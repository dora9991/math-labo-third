// ============================================================
// handler.js — third-api の中身（DBやHTTPに依存しない純ロジック。Nodeでテスト可能）。
//  store: { load(userId)→{state,version}|null, save(userId,state,prevVersion)→boolean,
//           logAttempts(userId,rows), logGacha(userId,rows) }
//  ★状態の変更はすべてここ（サーバー）だけ。クライアントは結果を受け取って表示するだけ★
// ============================================================
import { initialThirdState, normalizeThirdState, pullGacha, setParty, applyClaim, applyPractice, applyConfirm, PROBLEM_VERSION } from "../../../src/third/core.js";

export async function handle({ action, body = {}, userId, store, now = Date.now(), rand = Math.random }) {
  if (!userId) return { status: 401, body: { error: "unauthorized" } };
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
      return { status: 200, body: { state: r.state, verified: r.verified, newMedals: r.newMedals } };
    }
    case "confirm": { // はいち：確認問題の1ラウンドでメダル
      const r = applyConfirm(state, body, now);
      if (!r.ok) return { status: 400, body: { error: r.error, state } };
      if (!(await commit(r.state))) return conflict;
      await store.logAttempts?.(userId, r.rows.map((x) => ({ ...x, mode: "confirm" })));
      return { status: 200, body: { state: r.state, verified: r.verified, newMedals: r.newMedals } };
    }
    case "claim": {
      const r = applyClaim(state, body.claim, now);
      if (!r.ok) return { status: 400, body: { error: r.error, pv: PROBLEM_VERSION, state } };
      if (!(await commit(r.state))) return conflict;
      await store.logAttempts?.(userId, r.rows);
      return { status: 200, body: { state: r.state, rewards: r.rewards, verified: r.verified } };
    }
    default:
      return { status: 400, body: { error: "unknown-action" } };
  }
}
