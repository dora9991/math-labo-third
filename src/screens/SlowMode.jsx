// ============================================================
// SlowMode.jsx — じっくりモード／あんしんモード（時間制限なし）
//  - 4択。正解で光る◯、不正解で横揺れ（タイムアタックと同じ演出）
//  - ヒント（h1→h2）＋「2択にする」(50:50) で3段階の手助け（★6）
//  - 一問ごとにキャラが言葉をかける（CharBubble）
//
//  ★ anshin（あんしんモード）= true のとき：
//    ・失敗なし：まちがえても「できた！の階段」は減らない（★1）
//    ・最初の1問は必ず「かんたん」から（★2）
//    ・正解の累計で階段が進む（連続でなくてOK）→ 必ず達成できる
//    ・やさしい言葉かけ（「おしい！」）
// ============================================================
import { useState, useRef } from "react";
import Header from "../components/Header.jsx";
import CharBubble, { voice } from "../components/CharBubble.jsx";
import { BigWord } from "../components/Decorations.jsx";
import MathText from "../components/MathText.jsx";
import QuestionText from "../components/QuestionText.jsx";
import DrawPad from "../components/DrawPad.jsx";
import * as sfx from "../audio/sfx.js";
import { logAnswer } from "../store/answerLog.js";
import { genProblem, genProblemSeeded, makeChoices } from "../engine/generator.js";
import { generatePracticeAvoiding } from "../third/problemSource.js";
import { genToketa, hasToketa } from "../data/toketa/index.js";
import ToketaHint from "../components/ToketaHint.jsx";
import { isCorrect, SLOW_TARGET, xpRepeatMultiplier, CYCLE_PRACTICE_TARGET, slowPointsForLevel } from "../engine/scoring.js";
import { initDifficulty, nextDifficulty, PRACTICE_LEVELS } from "../engine/progress.js";

const todayStr = () => new Date().toLocaleDateString("ja-JP");
// れんしゅう（あんしん）は「5問ずつの区切り」。1回で15問やり切らなくてよい＝負担を減らす。
//  サイクルの「ためす」15問は、何回に区切っても貯まるメーター(cyclePracticeN)で達成する。
const ANSHIN_TARGET = 5;
const LEVEL_LABEL = { easy: "かんたん", standard: "ふつう", advanced: "発展" };

// 4択ヘルパー（タイムアタックと同じ。式の4択＝文字列厳密一致／数値＝makeChoices＋数値照合）
const shuffle = (a) => a.map((v) => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map((x) => x[1]);
const hasChoices = (q) => Array.isArray(q.choices) && q.choices.length > 0;
// toketa 問題は診断タグ付き distractors を4択に使う（誤答の意味を持たせる）
const choicesFor = (q) => (q?.toketa && Array.isArray(q.distractors) ? shuffle(q.distractors.map((d) => String(d.val)))
  : hasChoices(q) ? shuffle([...q.choices]) : makeChoices(q.ans));
// 選んだ選択肢の値から、その誤答の診断タグを引く（toketa問題のみ。無ければnull＝正解 or 非toketa）
const tagForChoice = (q, val) => (q?.toketa && Array.isArray(q.distractors))
  ? (q.distractors.find((d) => String(d.val) === String(val))?.tag || null)
  : null;
const ansEq = (val, q) => (hasChoices(q) ? String(val).replace(/\s/g, "") === String(q.ans).replace(/\s/g, "") : isCorrect(val, q.ans));

// 正負(u1〜u5)は toketa のヒント付き問題に差し替え。無ければ seed 付き生成（サーバー採点の下地）。
// 【数学ラボ3】seed から完全に再現できる問題を作る（サーバーが同じ問題を作り直して採点し、メダルを付与する）。
function genPractice(unit, level, lastId) {
  return generatePracticeAvoiding(unit, level, lastId);
}

export default function SlowMode({ player, chapter, unit, level, anshin = false, navDifficulty = false, initialNavLevel = "standard", onNavLevelChange, cyclePracticeN = 0, onComplete, onBackToMap, onHome, onRelearn, onBattle, onHaichi, onAttempt }) {
  const target = anshin ? ANSHIN_TARGET : SLOW_TARGET[level];
  // ④ 難易度ナビ：navDifficulty のときは前回の到達レベル(initialNavLevel)から始め、2ミスで↓／5連正解で↑。
  //  ＝5問ずつに区切っても「発展まで上がった」のが次の区切りへ引き継がれる。
  const diffRef = useRef(initDifficulty(navDifficulty ? initialNavLevel : "standard"));
  const [navLevel, setNavLevel] = useState(navDifficulty ? initialNavLevel : "standard"); // 表示用の現在レベル
  const [diffToast, setDiffToast] = useState(null);      // 難易度が下がった時などの軽いお知らせ
  const [levelUpFx, setLevelUpFx] = useState(null);      // 5連正解で難化した時の大きな「レベルアップ！」演出 { label }
  const earnedXpRef = useRef(0);                          // この区切りで貯めたポイント（難易度が高いほど多い）
  const [dontKnow, setDontKnow] = useState(false);        // 「わからない」で答えを見せている最中か
  // 出題する難易度：nav時は前回到達レベル開始／あんしんは「かんたん」開始／じっくりは選んだ level
  const firstLevel = navDifficulty ? initialNavLevel : anshin ? "easy" : level;
  const [q, setQ] = useState(() => genPractice(unit, firstLevel));
  const shownAtRef = useRef(Date.now()); // 問題を出した時刻（解答にかかった時間をサーバーへ送る）
  const [choices, setChoices] = useState(() => (q ? choicesFor(q) : []));
  const [streak, setStreak] = useState(0);
  const [total, setTotal] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [selected, setSelected] = useState(null);
  const [locked, setLocked] = useState(false);
  const [hintLevel, setHintLevel] = useState(0); // 0:なし 1:h1 2:h2
  const [msg, setMsg] = useState(() => voice("open"));
  const [showRing, setShowRing] = useState(false);
  const [shakeAns, setShakeAns] = useState(false);
  const [phase, setPhase] = useState("intro"); // intro | playing | clear
  const [clearInfo, setClearInfo] = useState(null); // {xp, baseXp, mult}
  const [showPad, setShowPad] = useState(false); // ✏️ 手書き計算スペースの開閉
  const wrongsRef = useRef([]); // この回の誤答 {q,ans,unitId,level,ok:false}（学び直しへ送る）

  // あんしんモードでは「できた！の階段」＝正解の累計。それ以外は連続正解。
  const progress = anshin ? correct : streak;

  function nextQuestion() {
    const lv = navDifficulty ? diffRef.current.level : level; // nav時は自動調整された難易度
    const nq = genPractice(unit, lv, q?.id); // 2問目以降は選んだ難易度（正負は toketa 差し替え）
    if (nq) { setQ(nq); setChoices(choicesFor(nq)); }
    shownAtRef.current = Date.now();
    setSelected(null); setLocked(false); setHintLevel(0); setDontKnow(false);
  }

  // ④ 1問の正誤から難易度を更新（nav時のみ）。5連正解で上がったら大きな「レベルアップ！」演出、
  //  下がったら控えめなお知らせ。到達レベルは onNavLevelChange で親に保存＝区切りをまたいで引き継ぐ。
  function updateNavDifficulty(ok) {
    if (!navDifficulty) return;
    const prev = diffRef.current;
    const nd = nextDifficulty(prev, ok);
    if (nd.changed) {
      const up = PRACTICE_LEVELS.indexOf(nd.level) > PRACTICE_LEVELS.indexOf(prev.level);
      if (up) {
        sfx.levelUp?.();
        setLevelUpFx({ label: LEVEL_LABEL[nd.level] });
        setTimeout(() => setLevelUpFx(null), 1800);
      } else {
        setDiffToast({ up: false, label: LEVEL_LABEL[nd.level] });
        setTimeout(() => setDiffToast(null), 2200);
      }
      onNavLevelChange?.(nd.level); // 到達レベルを親に保存（次の区切りへ引き継ぎ）
    }
    diffRef.current = nd;
    setNavLevel(nd.level);
  }

  // 「わからない」：答えを見せて（罰なし）、その問題を学び直しへ送り、次へ進む。
  //  苦手な子が手詰まりで固まらないための逃げ道（あんしん設計）。
  function markDontKnow() {
    if (!q || locked || phase !== "playing") return;
    setLocked(true);
    setDontKnow(true);
    setTotal((t) => t + 1);
    if (!anshin) setStreak(0);
    updateNavDifficulty(false); // 分からなかった＝不正解扱いで難易度は下がりうる
    wrongsRef.current.push({ q: q.q, ans: q.ans, unitId: q.unitId, level: q.level, skill: q.skill, ok: false, dontKnow: true });
    setMsg("わからないは、はずかしくないよ。答えを見て、次はできるようにしよう✨");
    setTimeout(nextQuestion, 1600);
  }

  function answer(val, idx) {
    if (!q || locked || phase !== "playing") return;
    setLocked(true); setSelected(idx);
    const ok = ansEq(val, q);
    const mistakeTag = ok ? null : tagForChoice(q, val);
    setTotal((t) => t + 1);
    updateNavDifficulty(ok); // ④ 次の問題の難易度を調整（nav時のみ）
    // サーバー権威(Lv2)の影運用：seedがある問題（toketa/DB以外）だけ裏で送信
    onAttempt?.({ unitId: q.unitId, level: q.plevel || q.level, templateId: q.id, seed: q.seed ?? null, userAnswer: String(val), ok, skill: q.skill, pseed: q.pseed, ms: Math.max(0, Date.now() - shownAtRef.current) });
    // 正答・誤答どちらも中身をサーバへ記録（教師が後から見返せるように。失敗しても進行には影響しない）。
    logAnswer({ unitId: q.unitId, level: q.level, mode: anshin ? "slow-anshin" : "slow", q: q.q, ans: q.ans, userAnswer: String(val), ok, mistakeTag });

    if (ok) {
      const ns = streak + 1;
      const nc = correct + 1;
      setStreak(ns); setCorrect(nc);
      // 難易度が高いほど貯まりやすいポイント（発展>標準>簡単）を、この区切りで加算していく
      earnedXpRef.current += slowPointsForLevel(q.level || (navDifficulty ? navLevel : level));
      sfx.correct();
      setShowRing(true); setTimeout(() => setShowRing(false), 700);
      setMsg(ns >= 3 ? voice("streak") : voice("correct"));
      const reached = (anshin ? nc : ns) >= target;
      if (reached) {
        // 5問区切りクリア（貯めたポイントを経験値に。2回目以降は控えめ倍率）
        const baseXp = Math.max(1, earnedXpRef.current);
        const mult = xpRepeatMultiplier(player.playLog, `${unit.id}-${level}`, todayStr());
        const xp = Math.round(baseXp * mult);
        setClearInfo({ xp, baseXp, mult });
        setMsg(voice("clear"));
        setTimeout(() => {
          setPhase("clear");
          // anshin と誤答リストを渡す（学び直しへの登録／あんしんの進行貢献＝easy★1付与に使う）
          onComplete({ chapter, unit, level, streak: ns, total: total + 1, correct: nc, xp, anshin, results: wrongsRef.current });
        }, 700);
      } else {
        setTimeout(nextQuestion, 800);
      }
    } else {
      // 間違えた問題を学び直しへ送るため記録（あんしん／じっくり両方）。skillタグも付ける。
      // mistakeTag＝選んだ誤答選択肢の診断タグ（toketa問題のみ・誤答の「価値づけ」に使う）
      wrongsRef.current.push({ q: q.q, ans: q.ans, unitId: q.unitId, level: q.level, skill: q.skill, ok: false, mistakeTag });
      // ★1 あんしんモードは失敗で階段が減らない（やさしい言葉かけ）
      if (!anshin) setStreak(0);
      sfx.wrong();
      setShakeAns(true); setTimeout(() => setShakeAns(false), 460);
      setMsg(anshin ? "おしい！ 正しい答えは光っているところだよ。次もいってみよう✨" : voice("wrong"));
      setTimeout(nextQuestion, anshin ? 1150 : 950);
    }
  }

  // ---- クリア画面 ----
  if (phase === "clear") {
    return (
      <div className="app">
        <Header player={player} />
        <div className="content">
          <CharBubble text={msg} />
          <div className="res-card">
            <div style={{ textAlign: "center", marginBottom: 8 }}>
              <div style={{ fontSize: 60 }}>{anshin ? "🎉" : "🌟"}</div>
              <div style={{ fontSize: 18, fontWeight: 900, color: "#1e1b4b" }}>
                {anshin ? `${correct}問クリア！ ポイントゲット！` : `クリア！${streak}問連続正解！`}
              </div>
              <div style={{ marginTop: 9 }}>
                <span className="xp-pill">✨ +{clearInfo ? clearInfo.xp : 0} XP</span>
                {clearInfo && clearInfo.mult < 1 && (
                  <div style={{ fontSize: 11, color: "#92400e", fontWeight: 700, marginTop: 5 }}>
                    {clearInfo.mult === 0.5 ? "今日2回目以降のためXP½" : "クリア済みの再挑戦のためXP⅕"}（通常なら{clearInfo.baseXp}XP）
                  </div>
                )}
              </div>
              {/* ためすメーター：15問で満タン＝ためすクリア。5問ずつ区切っても貯まる（発展まで上がったのも引き継ぐ）。 */}
              {anshin && (() => {
                const done = Math.min(CYCLE_PRACTICE_TARGET, cyclePracticeN + correct);
                const full = done >= CYCLE_PRACTICE_TARGET;
                return (
                  <div style={{ marginTop: 15, textAlign: "left" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 800, color: "#475569", marginBottom: 5 }}>
                      <span>🎯 ためすメーター</span>
                      <span style={{ color: full ? "#16a34a" : "#d97706" }}>{done}/{CYCLE_PRACTICE_TARGET}{full ? " クリア！🎊" : ""}</span>
                    </div>
                    <div style={{ height: 12, borderRadius: 999, background: "#e5e7eb", overflow: "hidden" }}>
                      <div style={{ width: `${(done / CYCLE_PRACTICE_TARGET) * 100}%`, height: "100%", transition: "width .6s ease",
                        background: full ? "linear-gradient(90deg,#22c55e,#4ade80)" : "linear-gradient(90deg,#fbbf24,#f59e0b)" }} />
                    </div>
                    {!full && <div style={{ fontSize: 11.5, fontWeight: 700, color: "#64748b", marginTop: 6 }}>あと{CYCLE_PRACTICE_TARGET - done}問で「ためす」クリア！ もう5問いこう💪</div>}
                  </div>
                );
              })()}
            </div>
            <div className="stats-grid">
              <div className="stat-box"><div className="stat-n" style={{ color: "#16a34a" }}>{correct}</div><div className="stat-l">できた数</div></div>
              <div className="stat-box"><div className="stat-n" style={{ color: "#d97706" }}>{streak}</div><div className="stat-l">最高連続</div></div>
              <div className="stat-box"><div className="stat-n" style={{ color: "#94a3b8" }}>{total}</div><div className="stat-l">挑戦</div></div>
            </div>
            {/* つぎのステップ（あんしん→学び直し→バトルの流れを案内） */}
            {(onRelearn || onBattle) && (
              <div style={{ marginTop: 2, marginBottom: 9, textAlign: "center", fontSize: 12.5, fontWeight: 800, color: "#475569", lineHeight: 1.6 }}>
                つぎは…　{onRelearn ? "📖 学び直しで確認" : ""}{onRelearn && onBattle ? " → " : ""}{onBattle ? "⚔️ バトルで実践！" : ""}
              </div>
            )}
            <div className="res-acts">
              {onRelearn && <button className="rbtn s" onClick={onRelearn}>📖 学び直し</button>}
              {onBattle && <button className="rbtn p" onClick={onBattle}>⚔️ バトルで実践！</button>}
              <button className="rbtn s" onClick={onHome}>🏠 メニューへ</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!q) {
    return (
      <div className="app">
        <Header player={player} back="戻る" onBack={onBackToMap} />
        <div className="content"><div className="glass">この単元の問題が見つかりませんでした。</div></div>
      </div>
    );
  }

  // ---- プレイ中 ----
  return (
    <div className="app">
      {phase === "intro" && <BigWord text={anshin ? "スタート！" : "START!"} color="#4ade80" onDone={() => { shownAtRef.current = Date.now(); setPhase("playing"); }} />}
      {showRing && <div className="correct-flash show" style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 55 }} />}
      {/* 5連正解で難化したときの大きな「レベルアップ！」演出 */}
      {levelUpFx && (
        <div style={{ position: "fixed", inset: 0, zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
          <div style={{ textAlign: "center", animation: "rankUpPop .5s cubic-bezier(.2,1.4,.4,1) both",
            background: "linear-gradient(135deg,#f59e0b,#ef4444)", color: "#fff", padding: "24px 32px", borderRadius: 22,
            boxShadow: "0 0 0 6px rgba(245,158,11,.35), 0 16px 46px rgba(239,68,68,.6)", border: "3px solid #fff" }}>
            <div style={{ fontSize: 56, lineHeight: 1 }}>🔥⬆️</div>
            <div style={{ fontSize: 32, fontWeight: 900, letterSpacing: 3, marginTop: 4, textShadow: "0 2px 8px rgba(0,0,0,.25)" }}>レベルアップ！</div>
            <div style={{ fontSize: 15, fontWeight: 800, marginTop: 5 }}>「{levelUpFx.label}」にちょうせん！</div>
          </div>
        </div>
      )}
      <Header player={player} back="やめる" onBack={onBackToMap} />
      <div className="content">
        {/* 進み具合メーター（あんしん＝できた！の階段／じっくり＝連続正解） */}
        <div className="glass" style={{ padding: "11px 13px", marginBottom: 11 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 7 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,.5)" }}>
              {anshin ? "🪜 できた！の かいだん" : "🌱 連続正解チャレンジ"}
            </span>
            <span style={{ fontFamily: "'M PLUS Rounded 1c',sans-serif", fontSize: 18, fontWeight: 900, color: anshin ? "#4ade80" : "#fbbf24" }}>
              {anshin ? "✨" : "🔥"} {progress}/{target}
            </span>
          </div>
          <div style={{ display: "flex", gap: 5 }}>
            {Array.from({ length: target }, (_, i) => (
              <div key={i} style={{
                flex: 1, height: 8, borderRadius: 4,
                background: i < progress ? (anshin ? "#4ade80" : "#fbbf24") : "rgba(255,255,255,.12)",
              }} />
            ))}
          </div>
        </div>

        {/* 一問ごとのひとこと */}
        <CharBubble text={msg} />

        {/* ④ 難易度が変わったときのお知らせ（普通⇄かんたん／発展） */}
        {diffToast && (
          <div style={{
            margin: "0 0 10px", padding: "9px 13px", borderRadius: 11, textAlign: "center",
            fontSize: 13, fontWeight: 900, lineHeight: 1.4,
            color: diffToast.up ? "#065f46" : "#7c2d12",
            background: diffToast.up ? "rgba(74,222,128,.9)" : "rgba(251,191,36,.9)",
            border: diffToast.up ? "1.5px solid #16a34a" : "1.5px solid #d97706",
          }}>
            {diffToast.up ? `🔥 いい調子！「${diffToast.label}」に レベルアップ！` : `🌱 むずかしさを「${diffToast.label}」にしたよ`}
          </div>
        )}

        <div className="qcard">
          <span className="q-pill">{unit.name} ・ {navDifficulty ? LEVEL_LABEL[navLevel] : anshin ? "あんしん" : "じっくり"}</span>
          <div className="q-text"><QuestionText text={q.q} furigana={!!player.furigana} readAloud={!!player.readAloud} /></div>

          {/* とけた式ヒント（正負）：つまづき選択メニュー→対比「くらべてみよう」→お手本ステップ */}
          {q.toketa && !locked && <ToketaHint problem={q} />}

          {/* ヒント（問題に h1 がある＝従来の生成問題） */}
          {q.h1 && !q.toketa && hintLevel > 0 && (
            <div style={{ background: "#fef9c3", border: "1px solid #fde047", borderRadius: 11, padding: "9px 12px", marginBottom: 11 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#854d0e", lineHeight: 1.6 }}>
                💡 {q.h1}
                {hintLevel >= 2 && q.h2 ? <><br />💡 {q.h2}</> : null}
              </div>
            </div>
          )}

          {/* 手助け：ヒント（h1→h2）と「わからない」（答えを見て次へ・罰なし）。2択(50:50)は廃止。 */}
          {!locked && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 11 }}>
              {q.h1 && !q.toketa && hintLevel < 2 && (
                <button
                  className="rbtn s" style={{ fontSize: 12, padding: "7px 13px" }}
                  onClick={() => setHintLevel((h) => h + 1)}
                >💡 {hintLevel === 0 ? "ヒントを見る" : "もっとくわしく"}</button>
              )}
              <button
                className="rbtn s" style={{ fontSize: 12, padding: "7px 13px", color: "#cbd5e1", borderColor: "rgba(148,163,184,.5)" }}
                onClick={markDontKnow}
              >🤔 わからない</button>
            </div>
          )}

          {/* 選択肢の中央に◯が出るよう relative で包む */}
          <div style={{ position: "relative" }}>
            {showRing && <div className="correct-ring show" />}
            <div className={"choices-grid" + (shakeAns ? " answer-shake" : "")}>
              {choices.map((c, i) => {
                const isAns = ansEq(c, q);
                let cls = "choice-btn";
                if (locked) {
                  if (i === selected && !isAns) cls += " wrong";
                  else if (isAns) cls += i === selected ? " correct" : " reveal";
                }
                return (
                  <button
                    key={i} className={cls} data-sfx="none"
                    disabled={locked}
                    onClick={() => answer(c, i)}
                  ><MathText>{c}</MathText></button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ✏️ 手書き計算スペース（れんしゅう中もメモ書きできる） */}
        <button onClick={() => setShowPad((v) => !v)} data-sfx="none" style={{ width: "100%", marginTop: 12, padding: "11px", borderRadius: 12, border: "1px solid rgba(255,255,255,.18)", cursor: "pointer", fontSize: 14, fontWeight: 800, color: "#fff", background: showPad ? "rgba(255,255,255,.14)" : "rgba(255,255,255,.06)" }}>
          ✏️ 計算スペース{showPad ? "を閉じる" : "を開く"}
        </button>
        {showPad && <DrawPad key={total} height={360} />}
      </div>
    </div>
  );
}
