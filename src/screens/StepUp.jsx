// ============================================================
// StepUp.jsx — ステップアップ（弱点克服）モード
//
// 数学ラボの世界観の中の「淡々と弱点を潰す」静かなモード。
//  - 時間制限なし・勝ち負けなし・4択で答える（あてずっぽうは習熟度に反映）
//  - 裏で selector が「いちばん弱い／伸びしろのあるスキル」を選び、
//    期待正答率≈0.75 の難易度で1問ずつ出し続ける（アダプティブ）。
//  - 1問ごとに習熟度(skillStats)を Elo 更新。進捗は穏やかに可視化。
//  - 正解したら 1.5 秒後に自動で次の問題へ（「次へ」を押さなくていい）。
//  - ボタンで手書きの「計算スペース」を開閉できる。
//
// コア（mastery/selector/generator/skills）はUIから分離。この画面は
// 「次の一問をもらって出す → 結果を返す」だけのつなぎ役。
// ============================================================
import { useState, useRef, useEffect } from "react";
import Header from "../components/Header.jsx";
import CharBubble, { voice } from "../components/CharBubble.jsx";
import DrawPad from "../components/DrawPad.jsx";
import MathText from "../components/MathText.jsx";
import * as sfx from "../audio/sfx.js";
import { buildTemplate, makeChoices } from "../engine/generator.js";
import { pickNext } from "../engine/selector.js";
import { isCorrect } from "../engine/scoring.js";
import { updateMastery, levelDifficulty, INITIAL_MASTERY, THETA } from "../engine/mastery.js";
import { skillName } from "../data/skills.js";

const todayStr = () => new Date().toLocaleDateString("ja-JP");
const LEVEL_LABEL = { easy: "かんたん", standard: "ふつう", advanced: "発展" };
const AUTO_NEXT_MS = 750; // 正解時に次の問題へ移るまでの待ち時間（タイムアタックの体感に合わせる）
const ROUND_SIZE = 10;     // 1セット＝10問。解き終えると結果画面で区切る
const POINT_PER_CORRECT = 10; // 1問正解の獲得ポイント（App側の付与XPと一致）

export default function StepUp({ player, chapter, onAttempt, onHome, targetSkill = null, onHaichi = null, onChallenge = null, onRelearn = null }) {
  // 習熟度はローカルにも持ち、出題選定はこれを見る（保存はApp側にも反映）
  const statsRef = useRef({ ...(player?.skillStats || {}) });
  const lastIdRef = useRef(null);
  const advanceTimer = useRef(null); // 正解後の自動遷移タイマー
  const runRef = useRef(0); // 連続の符号付きカウント（+:連続正解 / -:連続不正解）→ 難易度バイアス

  const [cur, setCur] = useState(null);      // { entry, problem }
  const [choices, setChoices] = useState([]); // 4択
  const [selected, setSelected] = useState(null); // 選んだ選択肢のindex
  const [locked, setLocked] = useState(false);
  const [fb, setFb] = useState(null);        // { ok, ans, h1, skill, mOld, mNew }
  const [seen, setSeen] = useState(0);
  const [got, setGot] = useState(0);
  const [improved, setImproved] = useState({}); // { skillId: delta>0 } このセッションで伸びたスキル
  const [msg, setMsg] = useState(() => voice("open"));
  const [showPad, setShowPad] = useState(false); // 計算スペースの開閉
  const [padKey, setPadKey] = useState(0);       // 問題が変わるたびに計算スペースを消す用
  const [showRing, setShowRing] = useState(false); // 正解の光る◯＋閃光（タイムアタックと同じ）
  const [shakeAns, setShakeAns] = useState(false); // 不正解の横揺れ（タイムアタックと同じ）
  const [streak, setStreak] = useState(0); // 連続正誤（+連続正解/-連続不正解）。挑戦点灯・詰まり救済の表示に使う（§10 Step4）

  // ── 10問ごとの区切り（セット）──
  const [phase, setPhase] = useState("play");    // "play" | "result"
  const [done, setDone] = useState(0);           // このセットで解いた数（メーター用）
  const [result, setResult] = useState(null);    // セット結果のスナップショット
  const roundRef = useRef({ n: 0, correct: 0, improved: new Set(), mistakes: [] }); // セット集計（setTimeoutでも参照）

  // 次の一問を用意する
  function next() {
    clearTimeout(advanceTimer.current);
    // 連続正解で難しく、連続不正解で易しく（直近の調子に合わせる）
    const rs = runRef.current;
    const cr = Math.max(0, rs), wr = Math.max(0, -rs);
    const levelBias = cr >= 4 ? 2 : cr >= 2 ? 1 : wr >= 3 ? -2 : wr >= 2 ? -1 : 0;
    const entry = pickNext(chapter, statsRef.current, {
      lastTemplateId: lastIdRef.current,
      targetSkill,
      levelBias,
    });
    if (!entry) { setCur(null); return; }
    const unit = chapter.units.find((u) => u.id === entry.unitId);
    const problem = buildTemplate(unit, entry.level, entry.templateId);
    if (!problem) { setCur(null); return; }
    lastIdRef.current = entry.templateId;
    setCur({ entry, problem });
    setChoices(makeChoices(problem.ans));
    setSelected(null);
    setLocked(false);
    setFb(null);
    setPadKey((k) => k + 1); // 計算スペースをまっさらに
  }

  // 初回出題
  useEffect(() => { next(); /* eslint-disable-next-line */ }, []);
  // アンマウント時にタイマーを片づける
  useEffect(() => () => clearTimeout(advanceTimer.current), []);

  // キーボード操作：1〜4で選択、不正解時は Enter で次へ
  useEffect(() => {
    function onKey(e) {
      if (phase !== "play") return;
      if (fb) {
        if (!fb.ok && e.key === "Enter") proceed();
        return;
      }
      if (locked || !cur) return;
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= choices.length) answer(choices[n - 1], n - 1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line
  }, [fb, locked, cur, choices, phase]);

  function answer(choice, idx) {
    if (!cur || locked) return;
    setLocked(true);
    setSelected(idx);
    const { entry, problem } = cur;
    const ok = isCorrect(choice, problem.ans);
    const skill = entry.skill;
    const d = levelDifficulty(entry.level);
    const mOld = statsRef.current[skill]?.m ?? INITIAL_MASTERY;
    const mNew = updateMastery(mOld, d, ok ? 1 : 0);
    const nPrev = statsRef.current[skill]?.n ?? 0;

    // ローカル習熟度を更新（次の出題選定にすぐ反映）
    statsRef.current = {
      ...statsRef.current,
      [skill]: { m: mNew, n: nPrev + 1, last: todayStr() },
    };

    // 難易度バイアス用の連続カウント（正解で+方向、不正解で-方向）
    runRef.current = ok
      ? (runRef.current < 0 ? 1 : runRef.current + 1)
      : (runRef.current > 0 ? -1 : runRef.current - 1);

    // 正解/不正解のエフェクト（タイムアタックと同じ：◯＋閃光／横揺れ）
    if (ok) { setShowRing(true); setTimeout(() => setShowRing(false), 700); }
    else { setShakeAns(true); setTimeout(() => setShakeAns(false), 460); }

    ok ? sfx.correct() : sfx.wrong();
    setSeen((s) => s + 1);
    if (ok) setGot((g) => g + 1);
    if (mNew > mOld + 0.001) setImproved((p) => ({ ...p, [skill]: true }));
    setStreak(runRef.current); // 連続カウントを描画へ反映（挑戦点灯/詰まり救済）
    setMsg(ok ? voice("correct") : voice("wrong"));
    setFb({ ok, ans: problem.ans, h1: problem.h1, h2: problem.h2, skill, mOld, mNew, stuck: runRef.current <= -2 });

    // このセットの集計を進める（メーター＆結果画面用）
    const r = roundRef.current;
    r.n += 1;
    if (ok) r.correct += 1;
    if (mNew > mOld + 0.001) r.improved.add(skill);
    if (!ok) r.mistakes.push({ q: problem.q, ans: problem.ans, skill }); // 間違い一覧用（§12 背骨）
    setDone(r.n);
    const roundDone = r.n >= ROUND_SIZE;

    // 結果をApp（保存層）へ
    onAttempt?.({
      skill,
      unitId: entry.unitId,
      level: entry.level,
      templateId: entry.templateId,
      ok,
      q: problem.q,
      ans: problem.ans,
      userAns: String(choice),
      mNew,
    });

    // 正解なら 1.5 秒後に自動で次へ（10問目なら結果画面へ）
    if (ok) {
      advanceTimer.current = setTimeout(() => (roundDone ? finishRound() : next()), AUTO_NEXT_MS);
    }
  }

  // セット結果をまとめて結果画面へ
  function finishRound() {
    clearTimeout(advanceTimer.current);
    const r = roundRef.current;
    setResult({
      seen: r.n,
      correct: r.correct,
      improved: [...r.improved],
      points: r.correct * POINT_PER_CORRECT,
      mistakes: r.mistakes || [],
    });
    setPhase("result");
  }

  // 不正解後の「次へ」やキーボードEnterから呼ぶ（10問目なら結果へ）
  function proceed() {
    if (roundRef.current.n >= ROUND_SIZE) finishRound();
    else next();
  }

  // 「続ける」：集計をリセットして次のセットを始める
  function startRound() {
    roundRef.current = { n: 0, correct: 0, improved: new Set(), mistakes: [] };
    runRef.current = 0; // 連続カウントもリセット（新しいセットは難易度ニュートラルから）
    setStreak(0);
    setDone(0);
    setResult(null);
    setPhase("play");
    next();
  }

  // ── 10問やり終えた：セット結果画面 ──
  if (phase === "result" && result) {
    const rate = result.seen > 0 ? Math.round((result.correct / result.seen) * 100) : 0;
    const rateColor = rate >= 80 ? "#4ade80" : rate >= 50 ? "#fbbf24" : "#f87171";
    return (
      <div className="app">
        <Header player={player} back="ホーム" onBack={onHome} />
        <div className="content">
          <div className="pg-ttl">🌱 セットクリア！</div>
          <div className="pg-sub">10問おつかれさま！今回の結果だよ</div>

          <div className="glass" style={{ padding: 20, textAlign: "center" }}>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.55)" }}>正答率</div>
            <div style={{ fontSize: 44, fontWeight: 900, color: rateColor, lineHeight: 1.1 }}>{rate}%</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,.6)", marginTop: 2 }}>
              {result.correct} / {result.seen} 問せいかい
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <div style={{ flex: 1, background: "rgba(255,255,255,.05)", borderRadius: 10, padding: "10px 4px" }}>
                <div style={{ fontSize: 20, fontWeight: 900, color: "#fbbf24" }}>+{result.points}</div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,.45)" }}>獲得ポイント</div>
              </div>
              <div style={{ flex: 1, background: "rgba(255,255,255,.05)", borderRadius: 10, padding: "10px 4px" }}>
                <div style={{ fontSize: 20, fontWeight: 900, color: "#4ade80" }}>{result.improved.length}</div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,.45)" }}>克服した点</div>
              </div>
            </div>
          </div>

          {/* 克服したスキル */}
          <div className="glass" style={{ padding: "13px 14px" }}>
            <div className="slbl">💪 今回のばした力</div>
            {result.improved.length === 0 ? (
              <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)", textAlign: "center", padding: "6px 0" }}>
                次のセットで、伸びたところがここに出るよ！
              </div>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {result.improved.map((s) => (
                  <span key={s} style={{
                    fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 10,
                    background: "rgba(74,222,128,.15)", color: "#4ade80", border: "1px solid rgba(74,222,128,.3)",
                  }}>
                    ↑ {skillName(s)}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* ▼ サイクルの背骨：間違い一覧 → 学び直しへ（§12 背骨スライス） */}
          {result.mistakes && result.mistakes.length > 0 ? (
            <div className="glass" style={{ padding: "13px 14px" }}>
              <div className="slbl">📋 まちがえた問題（{result.mistakes.length}）</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, margin: "6px 0 4px" }}>
                {result.mistakes.slice(0, 6).map((m, i) => (
                  <div key={i} style={{ fontSize: 12.5, color: "rgba(255,255,255,.82)", display: "flex", justifyContent: "space-between", gap: 8, background: "rgba(248,113,113,.08)", border: "1px solid rgba(248,113,113,.25)", borderRadius: 8, padding: "7px 10px" }}>
                    <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}><MathText>{m.q}</MathText></span>
                    <span style={{ flexShrink: 0, color: "#4ade80", fontWeight: 800 }}>= <MathText>{m.ans}</MathText></span>
                  </div>
                ))}
                {result.mistakes.length > 6 && (
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,.45)", textAlign: "center" }}>ほか {result.mistakes.length - 6} 問</div>
                )}
              </div>
              {onRelearn && (
                <button onClick={onRelearn} data-sfx="none"
                  style={{ width: "100%", marginTop: 8, padding: "13px", borderRadius: 12, border: "none", cursor: "pointer", fontSize: 15, fontWeight: 900, color: "#fff", background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>
                  📖 まちがいを直しに行く（{result.mistakes.length}問）→
                </button>
              )}
              <div style={{ fontSize: 11, color: "rgba(255,255,255,.5)", textAlign: "center", marginTop: 7 }}>ここを直せば、この単元クリア！💎</div>
            </div>
          ) : (
            <div className="glass" style={{ padding: "15px 14px", textAlign: "center" }}>
              <div style={{ fontSize: 16, fontWeight: 900, color: "#4ade80" }}>🎉 全問せいかい！かんぺき！</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,.55)", marginTop: 4 }}>この調子！応用にも挑戦してみよう</div>
            </div>
          )}

          <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
            <button onClick={onHome} data-sfx="back"
              style={{ flex: 1, padding: "14px", borderRadius: 12, border: "1px solid rgba(255,255,255,.2)", background: "rgba(255,255,255,.06)", color: "#fff", fontWeight: 800, cursor: "pointer", fontSize: 15 }}>
              やめる
            </button>
            <button onClick={startRound} data-sfx="none"
              style={{ flex: 1, padding: "14px", borderRadius: 12, border: "none", background: "#6366f1", color: "#fff", fontWeight: 900, cursor: "pointer", fontSize: 15 }}>
              続ける →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── 問題が無い（スキル未タグ等）──
  if (!cur) {
    return (
      <div className="app">
        <Header player={player} back="ホーム" onBack={onHome} />
        <div className="content">
          <div className="glass">いま出せる問題が見つかりませんでした。</div>
        </div>
      </div>
    );
  }

  const { entry, problem } = cur;
  const curM = statsRef.current[entry.skill]?.m ?? INITIAL_MASTERY;
  const masteredPct = Math.round(curM * 100);
  const improvedList = Object.keys(improved);

  return (
    <div className="app">
      {/* 正解：画面全体のやわらかい閃光（タイムアタックと同じ） */}
      {showRing && <div className="correct-flash show" style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 55 }} />}
      <Header player={player} back="ホーム" onBack={onHome} />
      <div className="content">
        <div className="pg-ttl">🌱 ステップアップ</div>
        <div className="pg-sub">あなたに合わせて、弱いところを少しずつ出します</div>

        {/* 10問メーター（このセットの進み具合） */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "2px 0 10px" }}>
          <span style={{ fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,.55)" }}>あと {Math.max(0, ROUND_SIZE - done)} 問</span>
          <div style={{ flex: 1, display: "flex", gap: 3 }}>
            {Array.from({ length: ROUND_SIZE }).map((_, i) => (
              <span key={i} style={{
                flex: 1, height: 8, borderRadius: 3,
                background: i < done ? "linear-gradient(180deg,#818cf8,#6366f1)" : "rgba(255,255,255,.08)",
                boxShadow: i < done ? "0 0 5px rgba(129,140,248,.6)" : "none",
              }} />
            ))}
          </div>
          <span style={{ fontSize: 11, fontWeight: 900, color: "#818cf8" }}>{done}/{ROUND_SIZE}</span>
        </div>

        <CharBubble text={msg} avatar={player.avatar} />

        {/* いま練習中のスキルと習熟度バー（穏やかな可視化） */}
        <div style={{ margin: "10px 0 6px", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.55)", minWidth: 0 }}>
            いま：{skillName(entry.skill)}・{LEVEL_LABEL[entry.level]}
          </span>
          {/* θ超で「✨得意」点灯（得意→もっと：§10 Step4） */}
          {curM >= THETA && (
            <span style={{ fontSize: 10.5, fontWeight: 900, color: "#4ade80", background: "rgba(74,222,128,.15)", border: "1px solid rgba(74,222,128,.35)", borderRadius: 8, padding: "2px 7px", whiteSpace: "nowrap" }}>✨得意</span>
          )}
        </div>
        <div style={{ height: 8, background: "rgba(255,255,255,.08)", borderRadius: 4, overflow: "hidden", marginBottom: 14 }}>
          <div style={{
            width: masteredPct + "%", height: "100%",
            background: curM >= THETA ? "#4ade80" : "#818cf8",
            transition: "width .5s ease",
          }} />
        </div>

        {/* 絶好調（5連続正解〜）の得意な子に「もっと」の出口を点灯（§10 Step4） */}
        {streak >= 5 && onChallenge && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "0 0 12px", padding: "11px 13px", borderRadius: 12,
            background: "rgba(74,222,128,.12)", border: "1.5px solid rgba(74,222,128,.5)" }}>
            <span style={{ fontSize: 22 }}>🔥</span>
            <div style={{ flex: 1, minWidth: 0, fontSize: 12.5, fontWeight: 800, color: "#86efac", lineHeight: 1.4 }}>
              ぜっこうちょう！もっと手ごたえがほしい？
            </div>
            <button onClick={onChallenge} data-sfx="none" style={{ flexShrink: 0, padding: "8px 12px", borderRadius: 10, border: "none", cursor: "pointer",
              fontSize: 12.5, fontWeight: 900, color: "#06281a", background: "#4ade80" }}>計算王に挑戦 →</button>
          </div>
        )}

        {/* 問題カード */}
        <div className="glass" style={{ padding: 20, textAlign: "center" }}>
          <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: 0.5, marginBottom: 16 }}>
            <MathText>{problem.q}</MathText>
          </div>

          {/* 4択（正解時は中央に光る◯／不正解は横揺れ：タイムアタックと同じ） */}
          <div style={{ position: "relative" }}>
            {showRing && <div className="correct-ring show" />}
            <div className={"choices-grid" + (shakeAns ? " answer-shake" : "")}>
              {choices.map((c, i) => {
                const isAns = isCorrect(c, problem.ans);
                let cls = "choice-btn";
                if (fb) {
                  if (i === selected && !isAns) cls += " wrong";
                  else if (isAns) cls += i === selected ? " correct" : " reveal";
                }
                return (
                  <button
                    key={i}
                    className={cls}
                    data-sfx="none"
                    disabled={!!fb}
                    onClick={() => answer(c, i)}
                  >
                    <MathText>{c}</MathText>
                  </button>
                );
              })}
            </div>
          </div>

          {/* フィードバック */}
          {fb && (
            <>
              {!fb.ok && (
                <div style={{ fontSize: 16, fontWeight: 900, margin: "14px 0 6px", color: "#f87171" }}>
                  △ おしい
                </div>
              )}
              {!fb.ok && (
                <div style={{ fontSize: 14, marginBottom: 6 }}>
                  正解：<strong style={{ color: "#4ade80" }}><MathText>{fb.ans}</MathText></strong>
                </div>
              )}
              {!fb.ok && fb.h1 && (
                <div style={{ fontSize: 12, color: "rgba(255,255,255,.55)", marginBottom: 10 }}>💡 {fb.h1}</div>
              )}
              {/* 詰まり自動救済：2連続ミスで「戻って確認」を差し込む（苦手→できそう：§10 Step4）。難易度はselectorが既に自動で緩和。 */}
              {!fb.ok && fb.stuck && (
                <div style={{ textAlign: "left", margin: "0 0 10px", padding: "11px 12px", borderRadius: 12,
                  background: "rgba(34,197,94,.10)", border: "1.5px solid rgba(34,197,94,.45)" }}>
                  <div style={{ fontSize: 13, fontWeight: 900, color: "#86efac", marginBottom: 5 }}>🛟 ちょっと戻って確認しよう</div>
                  <div style={{ fontSize: 11.5, color: "rgba(255,255,255,.65)", lineHeight: 1.5, marginBottom: (fb.h2 || onHaichi) ? 8 : 0 }}>
                    むずかしさを下げたよ。あせらず、計算スペースに書いて1つずつでOK。
                  </div>
                  {fb.h2 && <div style={{ fontSize: 12, color: "rgba(255,255,255,.72)", marginBottom: onHaichi ? 8 : 0 }}>💡 {fb.h2}</div>}
                  {onHaichi && (
                    <button onClick={() => onHaichi(chapter.units.find((u) => u.id === entry.unitId))} data-sfx="none"
                      style={{ width: "100%", padding: "10px", borderRadius: 10, border: "none", cursor: "pointer",
                        fontSize: 13, fontWeight: 900, color: "#fff", background: "linear-gradient(135deg,#ef4444,#f59e0b)" }}>
                      📺 この単元を動画で見る
                    </button>
                  )}
                </div>
              )}
              {fb.ok ? (
                <div style={{ fontSize: 12, color: "rgba(255,255,255,.5)", marginTop: 4 }}>
                  つぎの問題へ…
                </div>
              ) : (
                <button
                  onClick={proceed}
                  data-sfx="none"
                  style={{
                    width: "100%", marginTop: 8, padding: "13px", borderRadius: 12,
                    border: "none", cursor: "pointer", fontSize: 16, fontWeight: 900,
                    color: "#fff", background: "#6366f1",
                  }}
                >
                  {done >= ROUND_SIZE ? "結果を見る →" : "次へ →"}
                </button>
              )}
            </>
          )}
        </div>

        {/* 計算スペースの開閉ボタン */}
        <button
          onClick={() => setShowPad((v) => !v)}
          data-sfx="none"
          style={{
            width: "100%", marginTop: 12, padding: "11px", borderRadius: 12,
            border: "1px solid rgba(255,255,255,.18)", cursor: "pointer",
            fontSize: 14, fontWeight: 800, color: "#fff",
            background: showPad ? "rgba(255,255,255,.14)" : "rgba(255,255,255,.06)",
          }}
        >
          ✏️ 計算スペース{showPad ? "を閉じる" : "を開く"}
        </button>
        {showPad && <DrawPad key={padKey} height={420} />}

        {/* セッションの穏やかな進捗 */}
        <div style={{ marginTop: 14, fontSize: 12, color: "rgba(255,255,255,.5)", textAlign: "center" }}>
          このセッション：{seen}問（◯{got}）
        </div>
        {improvedList.length > 0 && (
          <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center" }}>
            {improvedList.map((s) => (
              <span key={s} style={{
                fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 10,
                background: "rgba(74,222,128,.15)", color: "#4ade80", border: "1px solid rgba(74,222,128,.3)",
              }}>
                ↑ {skillName(s)}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
