// ============================================================
// CoopBattle.jsx — 協力バトル「みんなの冒険」の戦闘画面（2026-10-09）。全員が**同時に**答える。
//  部屋の状態(room.battle)はサーバーだけが変える（src/third/raidBattle.js）。この画面は、
//    ① 開始前の場面を見る → 読み終えたらサーバーへ「準備できた」を送る（全員そろったら始まる）
//    ② ラウンドごとに、自分の問題に答える（制限時間つき。難しさは「次の問題」から選べる）
//    ③ ラウンドの結果（誰が何ダメージ・敵の反撃）を見る → 敵を倒して次の波へ／ボスを倒して勝ち
//    ④ 勝ったら終わりの場面 → 自分のごほうび（クリスタル・称号・メダル・少しの経験値）を受け取る
//  を表示・送信するだけ。ダメージ・採点・ごほうびは、すべてサーバーが決める。
// ============================================================
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { thirdApi } from "../thirdApi.js";
import { useGame } from "../ThirdContext.jsx";
import { generateThirdProblem } from "../problemSource.js";
import { RB, currentFoe } from "../raidBattle.js";
import { TIER_ICON, TIER_LABEL } from "../raid.js";
import { DIFFICULTY_KEYS, DIFFICULTY_LABEL, DIFFICULTY_DAMAGE_MULTIPLIER } from "../balance.js";
import { coopScene, COOP_STAGE_TITLES, COOP_STAGE_COUNT } from "../story/coopStory.js";
import StoryPlayer from "../story/StoryPlayer.jsx";
import { loadSeen, saveSeen, isStoryAuto } from "../story/storyRun.js";
import MonsterPortrait from "../components/MonsterPortrait.jsx";
import QuestionText from "../../components/QuestionText.jsx";
import MathText from "../../components/MathText.jsx";
import HypeFx from "../fx/HypeFx.jsx";
import { getFxSpeed } from "../../engine/fxSpeed.js";
import "./coop.css";

const CLAIM_ERR = {
  "too-few-correct": (r) => `正解が ${r.correct ?? 0} 問だったので、ごほうびはなかったよ（${r.needed ?? RB.minCorrect}問以上でもらえる）`,
  "already-claimed": () => "ごほうびは、もう受け取ったよ",
  "not-won": () => "ごほうびはなかったよ",
};
const MOVE_TEXT = { slash: "ふつうの攻撃", heavy: "強い一撃", big: "大技", charge: "力をためている…", venom: "毒牙", sweep: "なぎはらい" };

export default function CoopBattle({ room, me, code, onRoom, onDismiss, onStart, isHost }) {
  const { actions, charactersById } = useGame();
  const b = room.battle;
  const foe = currentFoe(b);
  const nameOf = useMemo(() => Object.fromEntries(room.members.map((m) => [m.id, m.name])), [room.members]);
  const [tick, setTick] = useState(0); // 時計（残り時間の表示用）
  const [picked, setPicked] = useState(null); // { n, i }：このラウンドで押した選択肢
  const [tooFast, setTooFast] = useState(0);
  const [nextLevel, setNextLevel] = useState("standard");
  const [seen, setSeen] = useState(() => loadSeen());
  const [playing, setPlaying] = useState(null); // 再生中の場面
  const [claim, setClaim] = useState(null); // { ok, rewards | error… }
  const [showResult, setShowResult] = useState(false);
  const [startMsg, setStartMsg] = useState("");
  const hypeRef = useRef(null);
  const stageRef = useRef(null);
  const handledIntro = useRef(0), handledEnd = useRef(0), shownLast = useRef(0);
  const fxSpeed = getFxSpeed();

  useEffect(() => { const id = setInterval(() => setTick((n) => n + 1), 250); return () => clearInterval(id); }, []);
  const now = actions.serverNow();

  const push = useCallback((r) => { if (r?.body?.now) actions.noteServerNow(r.body.now); if (r?.body?.room) onRoom(r.body.room); return r; }, [actions, onRoom]);
  const markSeen = (key) => setSeen((prev) => { const n = new Set(prev); n.add(key); saveSeen(n); return n; });

  // ① 開始前の場面 → 読み終えたら「準備できた」
  const sendReady = useCallback(async () => { push(await thirdApi.roomBattleReady(code)); }, [code, push]);
  useEffect(() => {
    if (b.status !== "fighting" || b.phase !== "intro" || handledIntro.current === b.startedAt) return;
    handledIntro.current = b.startedAt;
    setPicked(null); setClaim(null); setShowResult(false);
    const sc = coopScene(b.index, "pre");
    if (sc && isStoryAuto() && !seen.has(sc.key)) setPlaying({ ...sc, after: "ready" });
    else sendReady();
  }, [b.status, b.phase, b.startedAt, b.index]); // eslint-disable-line react-hooks/exhaustive-deps

  // ④ 終わったとき：勝ちなら、ごほうびを受け取る → 終わりの場面 → 結果
  useEffect(() => {
    if (b.status === "fighting" || handledEnd.current === b.startedAt) return;
    handledEnd.current = b.startedAt;
    (async () => {
      if (b.status === "won") {
        const r = await actions.claimCoop(code);
        setClaim(r);
        const sc = coopScene(b.index, "post");
        if (sc && isStoryAuto() && !seen.has(sc.key)) { setPlaying({ ...sc, after: "result" }); return; }
      }
      setShowResult(true);
    })();
  }, [b.status, b.startedAt]); // eslint-disable-line react-hooks/exhaustive-deps

  const finishScene = (skipped) => {
    const sc = playing; if (!sc) return;
    markSeen(sc.key); setPlaying(null);
    if (sc.after === "ready") sendReady(); else setShowResult(true);
  };

  // ラウンドの結果が出たら、演出（見た目だけ）
  useEffect(() => {
    const last = b.last; if (!last || shownLast.current === `${b.startedAt}:${last.n}`) return;
    shownLast.current = `${b.startedAt}:${last.n}`;
    if (last.waveCleared) hypeRef.current?.kill({ boss: last.foeKind === "boss" });
    else if (last.dealt > 0 && last.foeDmg > 0) hypeRef.current?.shake("small");
  }, [b.last, b.startedAt]);

  // ② 自分の問題
  const r = b.round;
  const mine = r?.problems?.[me];
  const problem = useMemo(() => (mine ? generateThirdProblem(mine.unitId, mine.level, mine.seed) : null), [mine?.unitId, mine?.level, mine?.seed, r?.n]); // eslint-disable-line react-hooks/exhaustive-deps
  const myAnswer = r?.answers?.[me];
  const started = r && now >= r.startAt;
  const left = r ? Math.max(0, (r.deadline - now) / 1000) : 0;
  const total = r ? Math.max(1, (r.deadline - r.startAt) / 1000) : 1;
  const answered = !!myAnswer || (picked && picked.n === r?.n);
  const fighting = b.status === "fighting" && b.phase === "fight" && r && !r.closed;
  const countdown = r && !started ? Math.max(1, Math.ceil((r.startAt - now) / 1000)) : 0;

  const pick = async (i) => {
    if (!fighting || !started || answered || !problem) return;
    setPicked({ n: r.n, i });
    let res = await thirdApi.roomBattleAnswer(code, problem.choices[i], nextLevel);
    if (res.status === 409) { await new Promise((x) => setTimeout(x, 300)); res = await thirdApi.roomBattleAnswer(code, problem.choices[i], nextLevel); }
    if (res.status === 400 && res.body?.error === "too-fast") { setPicked(null); setTooFast((n) => n + 1); return; }
    push(res);
  };

  const idleOf = (id) => (b.idle?.[id] || 0) >= RB.idleAfter;
  const activeMembers = room.members;
  const answeredCount = r ? activeMembers.filter((m) => r.answers?.[m.id]).length : 0;

  // ---- 表示 ----
  // 場面は画面いっぱい(position:fixed)で出す。部屋の画面は変形(transform)のある入れ物の中なので、そのままだと全画面にならない→bodyへ出す。
  if (playing) return createPortal(<StoryPlayer key={playing.key} scene={playing} onDone={() => finishScene(false)} onSkip={() => finishScene(true)} />, document.body);

  const intro = b.status === "fighting" && b.phase === "intro";
  const last = b.last;
  const hpPct = (h, m) => `${Math.max(0, Math.min(100, (h / m) * 100))}%`;
  const wins = b.status === "won";

  return (
    <div className="coop">
      <div className="coop-top">
        <span className="coop-stage">第{b.index + 1}話　{COOP_STAGE_TITLES[b.index]}</span>
        <span className="coop-wave">{Math.min(b.wave + 1, b.waves.length)} / {b.waves.length}戦目</span>
      </div>

      <div className="mw-panel mw-battle-stage coop-stage-box" ref={stageRef}>
        <HypeFx ref={hypeRef} speed={fxSpeed} targetRef={stageRef} />
        <div className="coop-foe">
          <div key={`${b.wave}-${last?.n}-${last?.dealt > 0}`} className={`coop-foe-img ${last?.dealt > 0 && last?.wave === b.wave ? "coop-hit" : ""}`}>
            <MonsterPortrait character={{ id: foe.id, art: foe.art, name: foe.name, kind: foe.mobKind || "chapterBoss" }} size="full" frameless />
          </div>
          <div className="mw-enemy-name">{foe.name}{foe.kind === "boss" && <small className="coop-bosstitle">　{foe.title}</small>}</div>
          <div className="mw-hpbar coop-foehp"><div style={{ width: hpPct(foe.hp, foe.maxHp) }} /></div>
        </div>

        <div className="coop-party">
          <div className="mw-party-row mw-party-row-small">
            {room.party.map((p, i) => (
              <div key={i} className={`coop-char ${last?.per?.[p.ownerId]?.correct ? "is-hit" : ""}`}>
                <MonsterPortrait character={charactersById[p.id] ? { ...charactersById[p.id], breaks: p.breaks } : null} size="small" />
                <div className="coop-owner">{nameOf[p.ownerId] || ""}</div>
              </div>
            ))}
          </div>
          <div className={`mw-hpbar coop-partyhp ${last?.foeDmg > 0 ? "coop-hurt" : ""}`} key={`php-${last?.n}`}><div style={{ width: hpPct(b.partyHp, b.partyMaxHp) }} /></div>
          <div className="mw-sub coop-hpnum">みんなのHP {Math.round(b.partyHp)} / {Math.round(b.partyMaxHp)}</div>
        </div>
      </div>

      {/* 前のラウンドの結果（次のラウンドが始まるまで見せる） */}
      {last && !intro && (
        <div className="mw-panel coop-last">
          <div className="coop-last-title">ラウンド {last.n} のけっか　<b>{last.dealt}</b> ダメージ{last.foeDmg > 0 ? `／${last.move ? MOVE_TEXT[last.move] || "こうげき" : "こうげき"}で みんなに ${last.foeDmg}` : last.move === "charge" ? "／敵は力をためている！" : ""}</div>
          <div className="coop-last-row">
            {room.members.map((m) => {
              const x = last.per?.[m.id];
              return <span key={m.id} className={`coop-chip ${x?.correct ? "ok" : x?.answered ? "ng" : "no"}`}>{m.name}　{x?.correct ? `⭕ ${x.damage}${x.crit ? "！" : ""}` : x?.answered ? "❌" : "💤"}</span>;
            })}
          </div>
          {last.notice && <div className="coop-notice">{last.notice}</div>}
        </div>
      )}

      {intro && (
        <div className="mw-panel mw-center coop-wait">
          <div className="coop-wait-title">みんなの準備を まっているよ…</div>
          <div className="mw-sub">場面を読み終えた人　{b.ready.length} / {room.members.length}　（{room.members.map((m) => `${b.ready.includes(m.id) ? "✅" : "…"}${m.name}`).join("　")}）</div>
        </div>
      )}

      {fighting && (
        <div className="mw-panel mw-question-panel coop-q">
          <div className="coop-timer">
            <div className="coop-timer-bar"><div className={left <= 5 && started ? "is-low" : ""} style={{ width: started ? `${(left / total) * 100}%` : "100%" }} /></div>
            <span>{started ? `${Math.ceil(left)}秒` : `${countdown}…`}</span>
          </div>
          <div className="coop-members">
            {room.members.map((m) => (
              <span key={m.id} className={`coop-mem ${r.answers?.[m.id] ? "done" : ""} ${idleOf(m.id) ? "idle" : ""} ${m.id === me ? "me" : ""}`}>
                {r.answers?.[m.id] ? "✅" : idleOf(m.id) ? "💤" : "✍️"} {m.name}
              </span>
            ))}
          </div>
          {!started ? (
            <div className="coop-ready-count">ラウンド {r.n}　もうすぐ はじまるよ…</div>
          ) : problem ? (
            <>
              {tooFast > 0 && <div key={tooFast} className="mw-toofast">⚡ はやすぎ！ 問題をよく読んでから答えよう</div>}
              <div className="mw-question"><QuestionText text={problem.question} /></div>
              <div className="mw-choices">
                {problem.choices.map((c, i) => (
                  <button key={i} className={`mw-choice ${picked?.n === r.n && picked.i === i ? "coop-picked" : ""}`} disabled={answered} onClick={() => pick(i)}>
                    <MathText>{c}</MathText>
                  </button>
                ))}
              </div>
              {answered ? <div className="coop-waiting">答えたよ！ みんなを まっているよ… （{answeredCount} / {activeMembers.length}）</div> : <div className="coop-waiting dim">みんなで同時に答えよう</div>}
            </>
          ) : <div className="coop-waiting">問題を よみこめなかったよ</div>}
          <div className="mw-diff-row" style={{ marginTop: 10 }}>
            {DIFFICULTY_KEYS.map((d) => (
              <button key={d} className={`mw-diff-btn ${nextLevel === d ? "selected" : ""}`} onClick={() => setNextLevel(d)}>
                {DIFFICULTY_LABEL[d]}<span className="mw-diff-mult">×{DIFFICULTY_DAMAGE_MULTIPLIER[d]}</span><span className="coop-sec">{RB.levelSec[d]}秒</span>
              </button>
            ))}
          </div>
          <div className="mw-sub mw-diff-note" style={{ textAlign: "center" }}>↑ つぎの問題のむずかしさ（今の問題は「{DIFFICULTY_LABEL[mine?.level] || ""}」。むずかしいほどダメージ大・時間も長め）</div>
        </div>
      )}

      {b.status !== "fighting" && !showResult && !playing && (
        <div className="mw-panel mw-center coop-wait"><div className="coop-wait-title">{wins ? "けっかを確認しているよ…" : "…"}</div></div>
      )}

      {showResult && (
        <div className={`mw-panel mw-center coop-result ${wins ? "win" : "lose"}`}>
          {wins ? (
            <>
              <div className="coop-result-title">🎉 ステージクリア！</div>
              <div className="coop-medal" aria-label={`${TIER_LABEL[b.tier]}メダル`}>{TIER_ICON[b.tier] || "🥉"}</div>
              <div className="mw-sub">{TIER_LABEL[b.tier]}メダル（残りHP {Math.round((b.partyHp / b.partyMaxHp) * 100)}%）</div>
              {claim?.ok ? (
                <div className="coop-rewards">
                  {claim.rewards.first && <div>👑 はじめてのクリア！　💎 +{claim.rewards.crystals}</div>}
                  {claim.rewards.title && <div>🏷️ 称号「{claim.rewards.title}」</div>}
                  {claim.rewards.medalUp && <div>{TIER_ICON[claim.rewards.tier]} メダルが {TIER_LABEL[claim.rewards.tier]} になった！{claim.rewards.medalCrystals > 0 ? `　💎 +${claim.rewards.medalCrystals}` : ""}</div>}
                  {!claim.rewards.first && claim.rewards.crystals > 0 && <div>💎 +{claim.rewards.crystals}</div>}
                  {claim.rewards.perMember > 0 ? <div>✨ 経験値 いまのパーティ 1体ずつ +{claim.rewards.perMember}</div> : claim.rewards.expLimited ? <div className="dim">今日は、経験値がもらえる回数を つかいきったよ</div> : null}
                  {claim.rewards.gradeBonus > 0 && <div>🏅 学年ボーナス　💎 +{claim.rewards.gradeBonus}</div>}
                  {claim.rewards.allBonus > 0 && <div>🏆 全制覇ボーナス　💎 +{claim.rewards.allBonus}</div>}
                </div>
              ) : claim ? <div className="coop-claim-err">{(CLAIM_ERR[claim.error] || (() => "ごほうびを受け取れなかったよ。もういちど つながったら ためしてね"))(claim)}</div> : null}
            </>
          ) : (
            <>
              <div className="coop-result-title">{b.status === "aborted" ? "バトルを やめたよ" : "ぜんめつしてしまった…"}</div>
              <div className="mw-sub">{last?.notice || ""}</div>
              <div className="mw-sub">負けても大丈夫。同じステージに、もういちど挑戦できるよ。</div>
            </>
          )}
          {startMsg && <div className="coop-claim-err">{startMsg}</div>}
          <div className="coop-result-buttons">
            {isHost ? (
              <>
                {wins && b.index + 1 < COOP_STAGE_COUNT && <button className="mw-btn primary" onClick={async () => { setStartMsg(await onStart(b.index + 1)); }}>▶ 次のステージへ</button>}
                {!wins && <button className="mw-btn primary" onClick={async () => { setStartMsg(await onStart(b.index)); }}>もういちど 挑戦</button>}
                <button className="mw-btn" onClick={() => onDismiss(b.startedAt)}>ステージを えらびなおす</button>
              </>
            ) : (
              <>
                <div className="mw-sub">ホストが つぎを えらぶのを まっているよ…</div>
                <button className="mw-btn" onClick={() => onDismiss(b.startedAt)}>ステージ一覧を見る</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
