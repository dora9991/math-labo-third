// ============================================================
// StepUpSimple.jsx — ステップアップ（中2・中3用／非適応）／はいちモードの確認問題
//
// 中1のステップアップはスキル適応型だが、中2・中3の問題は固定（DB）で
// スキルタグを持たないため、こちらは「学年の単元からランダムに1問ずつ出す」
// シンプル版。式の問題は4択（式を選ぶ）に対応。10問で1セット。
// はいちモードの確認問題（roundSize=5・passRate=80）もこの画面を使う。
//
// 【2026-09-23】見た目をSlowMode.jsxと同じAstraデザインの部品（qcard/q-pill/
//  q-text/legacy-progress/legacy-hint-panel/legacy-command/res-card/stats-grid/
//  res-acts/rbtn）に揃えた（以前は generic な .glass ＋ 素の色(#6366f1)のままで、
//  ここだけ旧デザインが残っていた）。
//  PC幅(900px以上)では問題カードの横に「計算スペース」を常設し、⇄で左右を
//  入れ替えられるようにした（HaichiStudio.jsxと同じ isDesktop の仕組み）。
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
import HintMenu from "../components/HintMenu.jsx";
import WhyBox from "../components/WhyBox.jsx";
import ProofFigure from "../components/ProofFigure.jsx";
import ProblemRateBadge from "../components/ProblemRateBadge.jsx";
import { isCorrect, answerMatches } from "../engine/scoring.js";
import ResultReview from "../components/ResultReview.jsx";

const LEVELS = ["easy", "standard", "advanced"];
const LEVEL_LABEL = { easy: "簡単", standard: "普通", advanced: "発展" };
const AUTO_NEXT_MS = 750;
const ROUND_SIZE = 10;
const POINT_PER_CORRECT = 10;

// 選択肢・判定（TimeAttackと同じ方針：choicesを持つ問題は式の4択＝文字列一致）
const shuffle = (a) => a.map((v) => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map((x) => x[1]);
const hasChoices = (q) => Array.isArray(q.choices) && q.choices.length > 0;
const choicesFor = (q) => (q?.toketa && Array.isArray(q.distractors) ? shuffle(q.distractors.map((d) => String(d.val)))
  : hasChoices(q) ? shuffle([...q.choices]) : makeChoices(q.ans));
const ansEq = (val, q) => hasChoices(q) ? String(val).replace(/\s/g, "") === String(q.ans).replace(/\s/g, "") : answerMatches(val, q.ans);
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
  const [showPad, setShowPad] = useState(false); // モバイル：計算スペースの開閉トグル
  const [padKey, setPadKey] = useState(0);
  const [showRing, setShowRing] = useState(false);
  const [shakeAns, setShakeAns] = useState(false);

  const [phase, setPhase] = useState("play"); // play | result
  const [done, setDone] = useState(0);
  const [result, setResult] = useState(null);
  const roundRef = useRef({ n: 0, correct: 0, wrongs: [] });
  const shownAtRef = useRef(Date.now()); // 問題を出した時刻

  // PC画面（幅900px以上）：計算スペースを問題カードの横に常設し、⇄で左右を入れ替える
  //  （HaichiStudio.jsxと同じ仕組み。狭い画面は従来どおり「計算スペースを開く」トグル）。
  const [isDesktop, setIsDesktop] = useState(() => typeof window !== "undefined" && window.matchMedia("(min-width: 900px)").matches);
  const [padOnRight, setPadOnRight] = useState(true);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(min-width: 900px)");
    const onChange = () => setIsDesktop(mq.matches);
    onChange();
    mq.addEventListener ? mq.addEventListener("change", onChange) : mq.addListener(onChange);
    return () => (mq.removeEventListener ? mq.removeEventListener("change", onChange) : mq.removeListener(onChange));
  }, []);

  function next() {
    clearTimeout(advanceTimer.current);
    if (roundRef.current.n > 0) setMsg(voice("next")); // 前の問題の吹き出しを次に持ち越さない
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
    setFb({ ok, ans: problem.ans, tag: ok ? null : tagForChoice(problem, choice) });

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
          <div className="res-card">
            <div style={{ textAlign: "center", marginBottom: 8 }}>
              <div style={{ fontSize: 12, color: "#64748b", fontWeight: 700 }}>正答率</div>
              <div style={{ fontSize: 44, fontWeight: 900, color: rateColor, lineHeight: 1.1 }}>{rate}%</div>
              <div style={{ fontSize: 13, color: "#64748b", fontWeight: 700, marginTop: 2 }}>{result.correct} / {result.seen} 問せいかい</div>
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
                    <div style={{ fontSize: 13, fontWeight: 800, marginTop: 4 }}>正答率{rate}%でクリア！　つぎは「れんしゅう」か「バトル」だよ 🔥</div>
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
                  <div style={{ padding: "12px 14px", borderRadius: 12, background: "rgba(251,146,60,.18)", border: "1px solid rgba(251,146,60,.5)", color: "#c2410c" }}>
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
                  <span style={{ fontSize: 12, fontWeight: 800, color: "#475569" }}>📊 「{soloUnit.name}」の理解度</span>
                  <span style={{ fontSize: 11, fontWeight: 800, color: um.ok ? "#16a34a" : "#64748b" }}>{um.ok ? "OK！習得" : `${um.pt}%`}</span>
                </div>
                <div style={{ position: "relative", height: 14, borderRadius: 999, background: "#e5e7eb", overflow: "hidden" }}>
                  <div style={{ width: `${um.ok ? 100 : Math.min(um.pt, 88)}%`, height: "100%", borderRadius: 999, transition: "width .5s ease",
                    background: um.ok ? "linear-gradient(90deg,#22c55e,#4ade80)" : um.pt >= 60 ? "#fbbf24" : "#60a5fa" }} />
                  {/* OK！ライン（満タン手前にマーカー） */}
                  <div style={{ position: "absolute", top: -2, bottom: -2, left: "92%", width: 2, background: "rgba(0,0,0,.25)" }} />
                </div>
                <div style={{ fontSize: 11, marginTop: 6, color: um.ok ? "#15803d" : "#64748b", fontWeight: um.ok ? 800 : 600, lineHeight: 1.5 }}>
                  {um.ok ? "🎉 OK！ラインをこえた！この単元はもうバッチリ！" : "あと少し！4問つづけて正解するとOK！（習得）になるよ"}
                </div>
              </div>
            )}

            <div className="res-acts">
              <button className="rbtn s" onClick={onHome} data-sfx="back">やめる</button>
              <button className="rbtn p" onClick={startRound} data-sfx="none">{passRate != null ? "もう一度" : "続ける →"}</button>
            </div>
          </div>

          {/* 足場（B-1）：不合格のとき、土台の前提へ戻る提案を出す */}
          {failAction && passRate != null && rate < passRate && (
            <button onClick={failAction.onClick} data-sfx="none" className="legacy-command" style={{ width: "100%", marginTop: 12, padding: "13px", fontSize: 14, lineHeight: 1.45, textAlign: "center" }}>
              {failAction.label}<br /><span style={{ fontSize: 11, fontWeight: 700, opacity: 0.85 }}>ここを直すと一気に伸びるよ！</span>
            </button>
          )}

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

  const { unit, level, problem } = cur;

  // 問題カード（PCでは計算スペースの隣に置く／モバイルでは単独で縦に並ぶ）
  const questionCard = (
    <>
      {/* 進捗メーター（1セット＝ROUND問） */}
      <div className="glass legacy-progress" style={{ padding: "11px 13px", marginBottom: 11 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 7 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,.5)" }}>あと {Math.max(0, ROUND - done)} 問</span>
          <span style={{ fontFamily: "'M PLUS Rounded 1c',sans-serif", fontSize: 18, fontWeight: 900, color: "#fbbf24" }}>{done}/{ROUND}</span>
        </div>
        <div style={{ display: "flex", gap: 5 }}>
          {Array.from({ length: ROUND }, (_, i) => (
            <div key={i} style={{ flex: 1, height: 8, borderRadius: 4, background: i < done ? "#fbbf24" : "rgba(255,255,255,.12)" }} />
          ))}
        </div>
      </div>

      <CharBubble text={msg} avatar={player.avatar} />

      <div className="qcard" style={{ position: "relative" }}>
        <ProblemRateBadge q={problem} unitId={unit.id} />
        <span className="q-pill">{unit.name} ・ {LEVEL_LABEL[level] || level}</span>
        {problem.fig && <ProofFigure fig={problem.fig} />}
        <div className="q-text"><QuestionText text={problem.q} furigana={!!player.furigana} readAloud={!!player.readAloud} /></div>

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

        {/* 選択肢の下：黄色い「ヒント」ボタン（こまりごと一覧→ヒント） */}
        {!fb && (
          <div className="hint-area">
            {problem.toketa ? <ToketaHint problem={problem} /> : <HintMenu problem={problem} />}
          </div>
        )}

        {fb && (
          <>
            {!fb.ok && <div style={{ fontSize: 16, fontWeight: 900, margin: "14px 0 6px", color: "#c2410c" }}>おしい！ あと少し ✨</div>}
            {!fb.ok && <div style={{ fontSize: 14, marginBottom: 6, color: "#152642" }}>正解：<strong style={{ color: "#15803d" }}><MathText>{fb.ans}</MathText></strong></div>}
            {!fb.ok && <WhyBox problem={problem} mistakeTag={fb.tag} />}
            {fb.ok ? (
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>つぎの問題へ…</div>
            ) : (
              <button onClick={proceed} data-sfx="none" className="ok-btn" style={{ width: "100%", marginTop: 8, padding: "13px", borderRadius: 12, border: "none", cursor: "pointer", fontSize: 16, fontWeight: 900, color: "#fff", background: "linear-gradient(135deg,#4f46e5,#7c3aed)" }}>
                {done >= ROUND ? "結果を見る →" : "次へ →"}
              </button>
            )}
          </>
        )}
      </div>

      {/* モバイル：計算スペースはトグルで開閉（PCは横に常設） */}
      {!isDesktop && (
        <>
          <button onClick={() => setShowPad((v) => !v)} data-sfx="none" className="legacy-command" style={{ width: "100%", marginTop: 12, fontSize: 14 }}>
            計算スペース{showPad ? "を閉じる" : "を開く"}
          </button>
          {showPad && <DrawPad key={padKey} height={360} />}
        </>
      )}

      <div style={{ marginTop: 14, fontSize: 12, color: "rgba(255,255,255,.5)", textAlign: "center" }}>このセッション：{seen}問（◯{got}）</div>
    </>
  );

  // PC：計算スペースを常設（⇄で左右入れ替え）
  const padPane = isDesktop && (
    <div className="calc-split-pad">
      <div className="calc-split-pad-head">
        <span>✏️ 計算スペース</span>
        <button data-sfx="none" onClick={() => setPadOnRight((v) => !v)}>⇄ 入れ替え</button>
      </div>
      <DrawPad key={`desktop-${padKey}`} height="min(64vh, 620px)" />
    </div>
  );

  return (
    <div className="app">
      {showRing && <div className="correct-flash show" style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 55 }} />}
      <Header player={player} back="ホーム" onBack={onHome} />
      <div className="content legacy-practice">
        <div className="pg-ttl">🌱 {title}</div>
        <div className="pg-sub">学年の単元から1問ずつ。じっくり練習しよう</div>

        {isDesktop ? (
          <div className="calc-split">
            <div className="calc-split-main" style={{ order: padOnRight ? 1 : 2 }}>{questionCard}</div>
            <div style={{ order: padOnRight ? 2 : 1 }}>{padPane}</div>
          </div>
        ) : questionCard}
      </div>
    </div>
  );
}
