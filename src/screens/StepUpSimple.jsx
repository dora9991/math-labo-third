// ============================================================
// StepUpSimple.jsx — ステップアップ（中2・中3用／非適応）
//
// 中1のステップアップはスキル適応型だが、中2・中3の問題は固定（DB）で
// スキルタグを持たないため、こちらは「学年の単元からランダムに1問ずつ出す」
// シンプル版。式の問題は4択（式を選ぶ）に対応。10問で1セット。
// ============================================================
import { useState, useRef, useEffect } from "react";
import Header from "../components/Header.jsx";
import CharBubble, { voice } from "../components/CharBubble.jsx";
import DrawPad from "../components/DrawPad.jsx";
import MathText from "../components/MathText.jsx";
import QuestionText from "../components/QuestionText.jsx";
import * as sfx from "../audio/sfx.js";
import { genProblem, genProblemSeeded, makeChoices } from "../engine/generator.js";
import { generatePracticeAvoiding } from "../third/problemSource.js";
import { genToketa, hasToketa } from "../data/toketa/index.js";
import ToketaHint from "../components/ToketaHint.jsx";
import { isCorrect } from "../engine/scoring.js";
import ResultReview from "../components/ResultReview.jsx";

const LEVELS = ["easy", "standard", "advanced"];
const AUTO_NEXT_MS = 750;
const ROUND_SIZE = 10;
const POINT_PER_CORRECT = 10;

// 選択肢・判定（TimeAttackと同じ方針：choicesを持つ問題は式の4択＝文字列一致）
const shuffle = (a) => a.map((v) => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map((x) => x[1]);
const hasChoices = (q) => Array.isArray(q.choices) && q.choices.length > 0;
const choicesFor = (q) => (q?.toketa && Array.isArray(q.distractors) ? shuffle(q.distractors.map((d) => String(d.val)))
  : hasChoices(q) ? shuffle([...q.choices]) : makeChoices(q.ans));
const ansEq = (val, q) => hasChoices(q) ? String(val).replace(/\s/g, "") === String(q.ans).replace(/\s/g, "") : isCorrect(val, q.ans);
// 選んだ選択肢の値から、その誤答の診断タグを引く（toketa問題のみ。無ければnull＝正解 or 非toketa）
const tagForChoice = (q, val) => (q?.toketa && Array.isArray(q.distractors))
  ? (q.distractors.find((d) => String(d.val) === String(val))?.tag || null)
  : null;

export default function StepUpSimple({ player, units = [], title = "ステップアップ", onAttempt, onHome, roundSize = ROUND_SIZE, passRate = null, onRoundEnd, weakUnits = [], onRelearn, onHaichi, onOpenRelearnList, failAction = null, passActions = null }) {
  const ROUND = roundSize > 0 ? roundSize : ROUND_SIZE;
  const recentRef = useRef([]);
  const advanceTimer = useRef(null);

  const [cur, setCur] = useState(null);     // { unit, level, problem }
  const [choices, setChoices] = useState([]);
  const [selected, setSelected] = useState(null);
  const [fb, setFb] = useState(null);       // { ok, ans }
  const [seen, setSeen] = useState(0);
  const [got, setGot] = useState(0);
  const [msg, setMsg] = useState(() => voice("open"));
  const [showPad, setShowPad] = useState(false);
  const [padKey, setPadKey] = useState(0);
  const [showRing, setShowRing] = useState(false);
  const [shakeAns, setShakeAns] = useState(false);

  const [phase, setPhase] = useState("play"); // play | result
  const [done, setDone] = useState(0);
  const [result, setResult] = useState(null);
  const roundRef = useRef({ n: 0, correct: 0, wrongs: [] });
  const shownAtRef = useRef(Date.now()); // 問題を出した時刻

  function next() {
    clearTimeout(advanceTimer.current);
    // ランダムに単元・難易度を選び、1問生成（直近は避ける）
    for (let i = 0; i < 14; i++) {
      const unit = units[Math.floor(Math.random() * units.length)];
      const level = LEVELS[Math.floor(Math.random() * LEVELS.length)];
      // 中1の toketa 対応単元はヒント付き問題に差し替え。無ければ seed 付き生成（サーバー採点の下地）。
      const problem = generatePracticeAvoiding(unit, level, recentRef.current); // seedから再現できる問題（サーバー採点用）
      if (problem) {
        recentRef.current = [...recentRef.current, problem.id].slice(-6);
        shownAtRef.current = Date.now();
        setCur({ unit, level, problem });
        setChoices(choicesFor(problem));
        setSelected(null); setFb(null); setPadKey((k) => k + 1);
        return;
      }
    }
    setCur(null);
  }

  useEffect(() => { next(); /* eslint-disable-next-line */ }, []);
  useEffect(() => () => clearTimeout(advanceTimer.current), []);

  function answer(choice, idx) {
    if (!cur || fb) return;
    setSelected(idx);
    const { unit, level, problem } = cur;
    const ok = ansEq(choice, problem);
    if (ok) { setShowRing(true); setTimeout(() => setShowRing(false), 700); sfx.correct(); }
    else { setShakeAns(true); setTimeout(() => setShakeAns(false), 460); sfx.wrong(); }
    setSeen((s) => s + 1);
    if (ok) setGot((g) => g + 1);
    setMsg(ok ? voice("correct") : voice("wrong"));
    setFb({ ok, ans: problem.ans });

    const r = roundRef.current;
    r.n += 1; if (ok) r.correct += 1;
    if (!ok) (r.wrongs ||= []).push({ q: problem.q, ans: problem.ans, unitId: unit.id, unitName: unit.name, level });
    setDone(r.n);
    const roundDone = r.n >= ROUND;

    onAttempt?.({ skill: null, unitId: unit.id, level, templateId: problem.id, seed: problem.seed ?? null, ok, q: problem.q, ans: problem.ans, userAns: String(choice), userAnswer: String(choice), pseed: problem.pseed, ms: Math.max(0, Date.now() - shownAtRef.current), mNew: null, mistakeTag: ok ? null : tagForChoice(problem, choice) });

    if (ok) advanceTimer.current = setTimeout(() => (roundDone ? finishRound() : next()), AUTO_NEXT_MS);
  }

  function finishRound() {
    clearTimeout(advanceTimer.current);
    const r = roundRef.current;
    setResult({ seen: r.n, correct: r.correct, points: r.correct * POINT_PER_CORRECT, wrongs: (r.wrongs || []).slice() });
    setPhase("result");
    onRoundEnd?.({ correct: r.correct, seen: r.n }); // 合格判定など（はいちモードで使用）
  }
  function proceed() { if (roundRef.current.n >= ROUND) finishRound(); else next(); }
  function startRound() {
    roundRef.current = { n: 0, correct: 0, wrongs: [] };
    setDone(0); setResult(null); setPhase("play"); next();
  }

  // ── 結果画面 ──
  if (phase === "result" && result) {
    const rate = result.seen > 0 ? Math.round((result.correct / result.seen) * 100) : 0;
    const rateColor = rate >= 80 ? "#4ade80" : rate >= 50 ? "#fbbf24" : "#f87171";
    // 単元が1つ（学び直し）なら、その小単元の理解度メーターを見せる
    const soloUnit = units.length === 1 ? units[0] : null;
    const um = soloUnit ? ((player.unitMastery || {})[soloUnit.id] || { pt: 0, ok: false }) : null;
    return (
      <div className="app">
        <Header player={player} back="ホーム" onBack={onHome} />
        <div className="content">
          <div className="pg-ttl">🌱 セットクリア！</div>
          <div className="pg-sub">{ROUND}問おつかれさま！今回の結果だよ</div>
          <div className="glass" style={{ padding: 20, textAlign: "center" }}>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.55)" }}>正答率</div>
            <div style={{ fontSize: 44, fontWeight: 900, color: rateColor, lineHeight: 1.1 }}>{rate}%</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,.6)", marginTop: 2 }}>{result.correct} / {result.seen} 問せいかい</div>
            <div style={{ background: "rgba(255,255,255,.05)", borderRadius: 10, padding: "10px 4px", marginTop: 14, display: "inline-block", minWidth: 120 }}>
              <div style={{ fontSize: 20, fontWeight: 900, color: "#fbbf24" }}>+{result.points}</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,.45)" }}>獲得ポイント</div>
            </div>

            {/* 合格判定（はいちモード：正答率が基準以上で「合格」） */}
            {passRate != null && (
              <div style={{ marginTop: 16 }}>
                {rate >= passRate ? (
                  <div style={{
                    padding: "22px 16px 18px", borderRadius: 16, background: "linear-gradient(135deg,#22c55e,#10b981)", color: "#fff",
                    border: "2px solid rgba(255,255,255,.55)", boxShadow: "0 0 0 4px rgba(74,222,128,.35), 0 12px 34px rgba(16,185,129,.55)",
                    animation: "rankUpPop .55s cubic-bezier(.2,1.4,.4,1) both", position: "relative", overflow: "hidden",
                  }}>
                    <div style={{ fontSize: 52, lineHeight: 1, marginBottom: 4, animation: "rankUpPop .7s .15s cubic-bezier(.2,1.6,.4,1) both" }}>🎉🏅🎉</div>
                    <div style={{ fontSize: 34, fontWeight: 900, letterSpacing: 2, textShadow: "0 2px 8px rgba(0,0,0,.25)" }}>合格！</div>
                    <div style={{ fontSize: 13, fontWeight: 800, marginTop: 4 }}>正答率{rate}%でクリア！　つぎは「ためす」だよ 🔥</div>
                    {passActions && passActions.length > 0 && (
                      <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                        {passActions.map((a, i) => (
                          <button key={i} data-sfx="none" onClick={a.onClick} style={{
                            flex: 1, padding: "13px 8px", borderRadius: 11, border: "2px solid rgba(255,255,255,.6)", cursor: "pointer",
                            background: "rgba(255,255,255,.2)", color: "#fff", fontWeight: 900, fontSize: 14, lineHeight: 1.3,
                          }}>{a.label}</button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ padding: "12px 14px", borderRadius: 12, background: "rgba(251,146,60,.18)", border: "1px solid rgba(251,146,60,.5)", color: "#fdba74" }}>
                    <div style={{ fontSize: 15, fontWeight: 900 }}>あと少しで合格！</div>
                    <div style={{ fontSize: 12, fontWeight: 700, marginTop: 2 }}>正答率{passRate}%で合格。もう一度ていねいに挑戦しよう</div>
                  </div>
                )}
              </div>
            )}

            {/* 小単元の理解度メーター（OK!ラインを超えると「習得」） */}
            {um && (
              <div style={{ marginTop: 18, textAlign: "left" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 5 }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: "rgba(255,255,255,.7)" }}>📊 「{soloUnit.name}」の理解度</span>
                  <span style={{ fontSize: 11, fontWeight: 800, color: um.ok ? "#4ade80" : "rgba(255,255,255,.5)" }}>{um.ok ? "OK！習得" : `${um.pt}%`}</span>
                </div>
                <div style={{ position: "relative", height: 14, borderRadius: 999, background: "rgba(255,255,255,.1)", overflow: "hidden" }}>
                  <div style={{ width: `${um.ok ? 100 : Math.min(um.pt, 88)}%`, height: "100%", borderRadius: 999, transition: "width .5s ease",
                    background: um.ok ? "linear-gradient(90deg,#22c55e,#4ade80)" : um.pt >= 60 ? "#fbbf24" : "#60a5fa" }} />
                  {/* OK！ライン（満タン手前にマーカー） */}
                  <div style={{ position: "absolute", top: -2, bottom: -2, left: "92%", width: 2, background: "rgba(255,255,255,.8)" }} />
                </div>
                <div style={{ fontSize: 11, marginTop: 6, color: um.ok ? "#86efac" : "rgba(255,255,255,.55)", fontWeight: um.ok ? 800 : 600, lineHeight: 1.5 }}>
                  {um.ok ? "🎉 OK！ラインをこえた！この単元はもうバッチリ！" : "あと少し！4問つづけて正解するとOK！（習得）になるよ"}
                </div>
              </div>
            )}
          </div>

          {/* まちがい直し・復習導線（はいちモードの合否画面では出さない） */}
          {passRate == null && (
            <ResultReview
              wrongs={result.wrongs || []}
              weakUnits={weakUnits}
              onRelearn={onRelearn}
              onHaichi={onHaichi}
              onOpenRelearnList={onOpenRelearnList}
            />
          )}

          {/* 足場（B-1）：不合格のとき、土台の前提へ戻る提案を出す */}
          {failAction && passRate != null && rate < passRate && (
            <button onClick={failAction.onClick} data-sfx="none" style={{ width: "100%", marginTop: 12, padding: "13px", borderRadius: 12, cursor: "pointer",
              border: "2px solid #fbbf24", background: "rgba(251,191,36,.15)", color: "#fde047", fontWeight: 900, fontSize: 14, lineHeight: 1.45 }}>
              {failAction.label}<br /><span style={{ fontSize: 11, fontWeight: 700, opacity: 0.85 }}>ここを直すと一気に伸びるよ！</span>
            </button>
          )}

          <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
            <button onClick={onHome} data-sfx="back" style={{ flex: 1, padding: "14px", borderRadius: 12, border: "1px solid rgba(255,255,255,.2)", background: "rgba(255,255,255,.06)", color: "#fff", fontWeight: 800, cursor: "pointer", fontSize: 15 }}>やめる</button>
            <button onClick={startRound} data-sfx="none" style={{ flex: 1, padding: "14px", borderRadius: 12, border: "none", background: "#6366f1", color: "#fff", fontWeight: 900, cursor: "pointer", fontSize: 15 }}>{passRate != null ? "もう一度" : "続ける →"}</button>
          </div>
        </div>
      </div>
    );
  }

  if (!cur) {
    return (
      <div className="app">
        <Header player={player} back="ホーム" onBack={onHome} />
        <div className="content"><div className="glass">いま出せる問題が見つかりませんでした。</div></div>
      </div>
    );
  }

  const { unit, problem } = cur;
  return (
    <div className="app">
      {showRing && <div className="correct-flash show" style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 55 }} />}
      <Header player={player} back="ホーム" onBack={onHome} />
      <div className="content">
        <div className="pg-ttl">🌱 {title}</div>
        <div className="pg-sub">学年の単元から1問ずつ。じっくり練習しよう</div>

        {/* 進捗メーター（1セット＝ROUND問） */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "2px 0 10px" }}>
          <span style={{ fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,.55)" }}>あと {Math.max(0, ROUND - done)} 問</span>
          <div style={{ flex: 1, display: "flex", gap: 3 }}>
            {Array.from({ length: ROUND }).map((_, i) => (
              <span key={i} style={{ flex: 1, height: 8, borderRadius: 3, background: i < done ? "linear-gradient(180deg,#818cf8,#6366f1)" : "rgba(255,255,255,.08)" }} />
            ))}
          </div>
          <span style={{ fontSize: 11, fontWeight: 900, color: "#818cf8" }}>{done}/{ROUND}</span>
        </div>

        <CharBubble text={msg} avatar={player.avatar} />

        <div style={{ margin: "10px 0 6px", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.55)" }}>いま：{unit.name}</div>

        <div className="glass" style={{ padding: 20, textAlign: "center" }}>
          <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: 0.5, marginBottom: 16 }}><QuestionText text={problem.q} furigana={!!player.furigana} readAloud={!!player.readAloud} /></div>
          {/* とけた式ヒント（正負・回答前のみ）：つまづき選択→対比→お手本 */}
          {problem.toketa && !fb && <div style={{ textAlign: "left" }}><ToketaHint problem={problem} /></div>}
          <div style={{ position: "relative" }}>
            {showRing && <div className="correct-ring show" />}
            <div className={"choices-grid" + (shakeAns ? " answer-shake" : "")}>
              {choices.map((c, i) => {
                const isAns = ansEq(c, problem);
                let cls = "choice-btn";
                if (fb) {
                  if (i === selected && !isAns) cls += " wrong";
                  else if (isAns) cls += i === selected ? " correct" : " reveal";
                }
                return (
                  <button key={i} className={cls} data-sfx="none" disabled={!!fb} onClick={() => answer(c, i)}><MathText>{c}</MathText></button>
                );
              })}
            </div>
          </div>

          {fb && (
            <>
              {!fb.ok && <div style={{ fontSize: 16, fontWeight: 900, margin: "14px 0 6px", color: "#fb923c" }}>おしい！ あと少し ✨</div>}
              {!fb.ok && <div style={{ fontSize: 14, marginBottom: 6 }}>正解：<strong style={{ color: "#4ade80" }}><MathText>{fb.ans}</MathText></strong></div>}
              {fb.ok ? (
                <div style={{ fontSize: 12, color: "rgba(255,255,255,.5)", marginTop: 4 }}>つぎの問題へ…</div>
              ) : (
                <button onClick={proceed} data-sfx="none" style={{ width: "100%", marginTop: 8, padding: "13px", borderRadius: 12, border: "none", cursor: "pointer", fontSize: 16, fontWeight: 900, color: "#fff", background: "#6366f1" }}>
                  {done >= ROUND ? "結果を見る →" : "次へ →"}
                </button>
              )}
            </>
          )}
        </div>

        <button onClick={() => setShowPad((v) => !v)} data-sfx="none" style={{ width: "100%", marginTop: 12, padding: "11px", borderRadius: 12, border: "1px solid rgba(255,255,255,.18)", cursor: "pointer", fontSize: 14, fontWeight: 800, color: "#fff", background: showPad ? "rgba(255,255,255,.14)" : "rgba(255,255,255,.06)" }}>
          ✏️ 計算スペース{showPad ? "を閉じる" : "を開く"}
        </button>
        {showPad && <DrawPad key={padKey} height={420} />}

        <div style={{ marginTop: 14, fontSize: 12, color: "rgba(255,255,255,.5)", textAlign: "center" }}>このセッション：{seen}問（◯{got}）</div>
      </div>
    </div>
  );
}
