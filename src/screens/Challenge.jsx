// ============================================================
// Challenge.jsx — チャレンジ「計算王への道」
//  ・選んだ単元（章）全体から、途中計算や文章読み取りで“式を書く”作業が
//    要るハイレベル問題を1問ずつ出題（数字を入力して回答）。小単元はまたぐ。
//  ・1問でも間違えたら終了。「連続正解数」を競う。
//  ・5問解き終わるとタイムが出る。連続記録・5問タイムの自己ベストに挑戦。
// ============================================================
import { useState, useRef, useEffect } from "react";
import Header from "../components/Header.jsx";
import DrawPad from "../components/DrawPad.jsx";
import { BigWord } from "../components/Decorations.jsx";
import MathText from "../components/MathText.jsx";
import * as sfx from "../audio/sfx.js";
import * as bgm from "../audio/bgm.js";
import { answerMatches } from "../engine/scoring.js";
import { nextChapterCalcProblem, formatTime } from "../engine/calcKing.js";

const GOAL = 5; // この問数を解き終わるとタイムが記録される
// 答え合わせは engine/scoring.js の answerMatches に一元化（サーバ採点 grade.js と同じ判定）。

export default function Challenge({ player, chapter, onResult, onMistake, onBack, onHome, backLabel = "単元をえらぶ", onAttempt }) {
  // 自己ベスト（その単元の開始時点の値を保持。結果画面で「新記録」判定に使う）
  const [best] = useState(() => {
    const ck = (player.calcKing && chapter && player.calcKing[chapter.id]) || {};
    return { streak: ck.bestStreak || 0, time5: ck.bestTime5 ?? null };
  });

  const [view, setView] = useState("intro"); // intro | play | result
  const [cur, setCur] = useState(null);
  const [input, setInput] = useState("");
  const [streak, setStreak] = useState(0);
  const [time5, setTime5] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [flash, setFlash] = useState(false); // 正解の一瞬の光
  const [showPad, setShowPad] = useState(false);
  const [padKey, setPadKey] = useState(0);
  const [showStart, setShowStart] = useState(false); // スタート時の START! 演出
  const [practice, setPractice] = useState(false);   // ★3 練習王：まちがえても終わらない
  const [wrongFb, setWrongFb] = useState(null);       // 練習モードで誤答時に正解を見せる { ans }
  const [altShown, setAltShown] = useState(null);     // 正解後の「別解」表示中 { alt }（cur.altがある問題のみ・任意）

  const recentRef = useRef([]);
  const startRef = useRef(0);
  const intervalRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => () => clearInterval(intervalRef.current), []);

  function start() {
    clearInterval(intervalRef.current);
    sfx.confirm();          // ピッという決定音
    bgm.play("calcplay");   // スタートでメニュー選択画面BGMに切替
    setShowStart(true);     // 同じタイミングで START! を出す
    recentRef.current = [];
    setStreak(0); setTime5(null); setInput(""); setElapsed(0); setAltShown(null);
    const q = nextChapterCalcProblem(chapter, recentRef.current);
    recentRef.current = q ? [q.id] : [];
    setCur(q);
    setView("play");
    setPadKey((k) => k + 1);
    startRef.current = performance.now();
    intervalRef.current = setInterval(() => setElapsed(performance.now() - startRef.current), 100);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  function nextProblem() {
    const q = nextChapterCalcProblem(chapter, recentRef.current);
    if (q) recentRef.current = [...recentRef.current, q.id].slice(-6);
    setCur(q);
    setInput("");
    setTimeout(() => inputRef.current?.focus(), 30);
  }

  // 別解パネルを閉じて次の問題へ（タイマーも再開）
  function continueFromAlt() {
    setAltShown(null);
    intervalRef.current = setInterval(() => setElapsed(performance.now() - startRef.current), 100);
    nextProblem();
  }

  function end(finalStreak, finalTime5) {
    clearInterval(intervalRef.current);
    setView("result");
    onResult?.({ unitId: chapter?.id, streak: finalStreak, time5: finalTime5 });
  }

  function submit() {
    if (!cur || input.trim() === "") return;
    const ok = answerMatches(input, cur.ans);
    // サーバー権威(Lv2)の影運用：seedがある問題（procedural由来）だけ裏で送信。mode:"applied"＝応用（剣石/鎧石の対象）
    onAttempt?.({ unitId: cur.unitId, level: cur.level, templateId: cur.id, seed: cur.seed ?? null, userAnswer: input, ok, skill: cur.skill });
    if (ok) {
      sfx.correct();
      const ns = streak + 1;
      setStreak(ns);
      setFlash(true); setTimeout(() => setFlash(false), 260);
      if (ns === GOAL) setTime5(performance.now() - startRef.current); // タイムは別解を見る前に確定させる
      // 別解がある問題（今は正の数・負の数のパイロット）は、次に進む前に一呼吸おいて見せる。
      if (cur.alt) { clearInterval(intervalRef.current); setAltShown({ alt: cur.alt }); return; }
      nextProblem();
    } else if (practice) {
      // ★3 練習王：終わらない。正解を見せて、連続をリセットして次へ。
      sfx.wrong();
      onMistake?.({ q: cur.q, ans: cur.ans, unitId: cur.unitId, level: cur.level }); // 誤答を学び直しへ
      setWrongFb({ ans: cur.ans });
      setStreak(0);
      setTimeout(() => { setWrongFb(null); nextProblem(); }, 1300);
    } else {
      // 本番：1問でも間違えたら終了
      sfx.wrong();
      onMistake?.({ q: cur.q, ans: cur.ans, unitId: cur.unitId, level: cur.level }); // 誤答を学び直しへ
      end(streak, time5);
    }
  }

  // ============ 結果ビュー ============
  if (view === "result") {
    const reached5 = time5 != null;
    const newBestStreak = streak > best.streak;
    const newBestTime = reached5 && (best.time5 == null || time5 < best.time5);
    return (
      <div className="app">
        <Header player={player} />
        <div className="content">
          <div className="res-card">
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: "#a855f7", letterSpacing: 2 }}>🧮 計算王への道</div>
              <div className="big-n" style={{ color: "#7c3aed", marginTop: 4 }}>{streak}</div>
              <div style={{ fontSize: 13, color: "#94a3b8" }}>連続正解</div>
              {newBestStreak && <div style={{ fontSize: 14, fontWeight: 900, color: "#f59e0b", marginTop: 6 }}>🎉 連続正解の新記録！</div>}

              {reached5 ? (
                <div style={{ marginTop: 14 }}>
                  <div style={{ fontSize: 12, color: "#64748b" }}>{GOAL}問クリアタイム</div>
                  <div style={{ fontSize: 30, fontWeight: 900, color: "#0ea5e9", fontVariantNumeric: "tabular-nums" }}>{formatTime(time5)}</div>
                  {newBestTime && <div style={{ fontSize: 14, fontWeight: 900, color: "#f59e0b", marginTop: 2 }}>⚡ タイムの新記録！</div>}
                </div>
              ) : (
                <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 12 }}>
                  あと{Math.max(0, GOAL - streak)}問でタイムが記録されます（{GOAL}問連続）。
                </div>
              )}

              {/* 計算王クリア（GOAL問連続）でバトル攻撃力が永続アップ */}
              {Math.max(best.streak, streak) >= GOAL && (
                <div style={{ margin: "14px 0 2px", padding: "9px 12px", borderRadius: 10, background: "rgba(168,85,247,.15)", border: "1px solid rgba(168,85,247,.45)", fontSize: 12.5, fontWeight: 800, color: "#d8b4fe", lineHeight: 1.6 }}>
                  ⚔️ この章をクリア！このワールドの<b style={{ color: "#fbbf24" }}>バトル攻撃力アップ</b>（永続）
                </div>
              )}

              {/* 自己ベスト */}
              <div className="glass" style={{ padding: "10px 14px", margin: "16px 0 6px", display: "flex", justifyContent: "space-around", textAlign: "center" }}>
                <div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,.5)" }}>自己ベスト連続</div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: "#fff" }}>{Math.max(best.streak, streak)}</div>
                </div>
                <div style={{ width: 1, background: "rgba(255,255,255,.12)" }} />
                <div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,.5)" }}>自己ベストタイム</div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: "#fff" }}>
                    {formatTime(newBestTime ? time5 : best.time5)}
                  </div>
                </div>
              </div>
            </div>
            <div className="res-acts">
              <button className="rbtn p" onClick={start}>🔁 もう一度</button>
              <button className="rbtn s" onClick={onHome}>🏠 ホーム</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============ プレイ中ビュー ============
  if (view === "play" && cur) {
    return (
      <div className="app">
        {showStart && <BigWord text="START!" color="#a855f7" onDone={() => setShowStart(false)} />}
        {flash && <div className="correct-flash show" style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 55 }} />}
        <Header player={player} back="やめる" onBack={() => (practice ? onHome?.() : end(streak, time5))} />
        <div className="content">
          {/* ステータス：連続正解とタイム */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 34, fontWeight: 900, color: "#a855f7", lineHeight: 1 }}>{streak}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,.5)" }}>連続正解</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 30, fontWeight: 900, color: "#38bdf8", fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>{formatTime(elapsed)}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,.5)" }}>{streak >= GOAL ? `${GOAL}問クリア済` : `あと${GOAL - streak}問で計測`}</div>
            </div>
          </div>

          {/* 問題＋入力（正解後、別解がある問題は入力の代わりに別解パネルを見せる） */}
          <div className="glass" style={{ padding: 18 }}>
            <span className="ch-tier-pill" style={{ background: "rgba(168,85,247,.18)", color: "#d8b4fe" }}>🔥 {cur.unitName}{cur.subName ? ` ・ ${cur.subName}` : ""}</span>
            <div style={{ fontSize: 20, fontWeight: 800, lineHeight: 1.6, color: "#fff", marginTop: 10 }}><MathText>{cur.q}</MathText></div>

            {altShown ? (
              <div style={{ marginTop: 14 }}>
                <div style={{ padding: "12px 14px", borderRadius: 12, background: "rgba(56,189,248,.12)", border: "1px solid rgba(56,189,248,.4)" }}>
                  <div style={{ fontSize: 12.5, fontWeight: 900, color: "#7dd3fc", marginBottom: 6 }}>🔀 別の解き方もあるよ</div>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: "#fff", lineHeight: 1.7 }}><MathText>{altShown.alt}</MathText></div>
                </div>
                <button onClick={continueFromAlt} data-sfx="none" style={{
                  width: "100%", marginTop: 12, padding: "13px", borderRadius: 12, border: "none",
                  cursor: "pointer", fontSize: 16, fontWeight: 900, color: "#fff",
                  background: "linear-gradient(135deg,#a855f7,#7c3aed)",
                }}>
                  つぎへ →
                </button>
              </div>
            ) : (
              <>
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
                  inputMode="text"
                  placeholder="答えを入力（例：25 / -3 / 1/2 / x=2, y=-1）"
                  data-sfx="none"
                  style={{
                    width: "100%", boxSizing: "border-box", textAlign: "center",
                    fontSize: 22, fontWeight: 800, padding: "12px 10px", marginTop: 14,
                    borderRadius: 12, border: "2px solid rgba(168,85,247,.4)",
                    background: "rgba(255,255,255,.06)", color: "#fff", outline: "none",
                  }}
                />
                <button
                  onClick={submit}
                  disabled={input.trim() === ""}
                  data-sfx="none"
                  style={{
                    width: "100%", marginTop: 12, padding: "13px", borderRadius: 12, border: "none",
                    cursor: input.trim() === "" ? "not-allowed" : "pointer", fontSize: 16, fontWeight: 900,
                    color: "#fff", background: input.trim() === "" ? "rgba(168,85,247,.4)" : "linear-gradient(135deg,#a855f7,#7c3aed)",
                  }}
                >
                  答える →
                </button>
              </>
            )}
            {wrongFb && (
              <div style={{ marginTop: 12, textAlign: "center", fontSize: 14, fontWeight: 800, color: "#fb923c" }}>
                おしい！ 正解は <strong style={{ color: "#4ade80" }}><MathText>{wrongFb.ans}</MathText></strong>。次もいこう✨
              </div>
            )}
            <div style={{ fontSize: 11, color: "rgba(255,255,255,.4)", textAlign: "center", marginTop: 8 }}>
              {practice ? "※ 練習モード：まちがえても終わらないよ。どんどん解こう！" : "※ 1問でも間違えると終了。あせらず正確に！"}
            </div>
          </div>

          {/* 手書き計算スペース（任意） */}
          <button onClick={() => setShowPad((v) => !v)} data-sfx="none"
            style={{
              width: "100%", marginTop: 12, padding: "10px", borderRadius: 12,
              border: "1px solid rgba(255,255,255,.18)", cursor: "pointer",
              fontSize: 13, fontWeight: 800, color: "#fff",
              background: showPad ? "rgba(255,255,255,.14)" : "rgba(255,255,255,.06)",
            }}>
            ✏️ 計算スペース{showPad ? "を閉じる" : "を開く"}
          </button>
          {showPad && <DrawPad key={padKey} height={420} />}
        </div>
      </div>
    );
  }

  // ============ イントロ（スタート前） ============
  return (
    <div className="app">
      <Header player={player} back={backLabel} onBack={onBack || onHome} />
      <div className="content">
        <div className="pg-ttl">🧮 計算王への道</div>
        <div className="pg-sub">
          <b style={{ color: "#d8b4fe" }}>{chapter?.name || ""}</b> の全範囲から、途中計算や文章の読み取りで“式を書く”作業が要る問題に、間違えずに何問連続で解けるか。{GOAL}問解き終わったタイムも記録される、自己ベストへの挑戦。
        </div>

        {/* 自己ベスト */}
        <div className="glass" style={{ padding: "16px", display: "flex", justifyContent: "space-around", textAlign: "center" }}>
          <div>
            <div style={{ fontSize: 26, fontWeight: 900, color: "#a855f7" }}>{best.streak}</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,.55)" }}>自己ベスト連続正解</div>
          </div>
          <div style={{ width: 1, background: "rgba(255,255,255,.12)" }} />
          <div>
            <div style={{ fontSize: 26, fontWeight: 900, color: "#38bdf8", fontVariantNumeric: "tabular-nums" }}>{formatTime(best.time5)}</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,.55)" }}>自己ベスト{GOAL}問タイム</div>
          </div>
        </div>

        <div className="glass" style={{ padding: "14px 16px", fontSize: 12.5, color: "rgba(255,255,255,.72)", lineHeight: 1.8 }}>
          <b style={{ color: "#fff" }}>ルール</b><br />
          ・選んだ単元の全範囲から、<b style={{ color: "#d8b4fe" }}>式を書いて解く問題</b>が次々に出ます<br />
          ・答えを数字で入力。<b style={{ color: "#fca5a5" }}>1問でも間違えると終了</b><br />
          ・{GOAL}問連続で正解すると<b style={{ color: "#7dd3fc" }}>クリアタイム</b>を記録<br />
          ・連続正解数とタイムの<b style={{ color: "#fde047" }}>自己ベスト</b>に挑戦しよう！<br />
          ・<b style={{ color: "#d8b4fe" }}>章をクリアすると、このワールドのバトル攻撃力が永続アップ⚔️</b>
        </div>

        {/* ★3 練習王：まちがえても終わらないモードの切り替え */}
        <button onClick={() => setPractice((v) => !v)} data-sfx="none"
          style={{
            width: "100%", marginTop: 12, marginBottom: 4, padding: "11px 14px", borderRadius: 12, cursor: "pointer",
            display: "flex", alignItems: "center", gap: 10, textAlign: "left",
            border: practice ? "2px solid #22c55e" : "1px solid rgba(255,255,255,.18)",
            background: practice ? "rgba(34,197,94,.16)" : "rgba(255,255,255,.05)", color: "#fff",
          }}>
          <span style={{ fontSize: 26 }}>{practice ? "🛡️" : "🔥"}</span>
          <span style={{ flex: 1 }}>
            <span style={{ fontSize: 14, fontWeight: 900, display: "block" }}>{practice ? "練習王（まちがえてもOK）" : "本番モード（1ミスで終了）"}</span>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,.65)" }}>タップで切りかえ。{practice ? "終わらずに何度でも練習できる" : "自己ベストに挑戦（記録される）"}</span>
          </span>
        </button>

        <button onClick={start} data-sfx="none"
          style={{
            width: "100%", marginTop: 6, padding: "15px", borderRadius: 14, border: "none", cursor: "pointer",
            fontSize: 18, fontWeight: 900, color: "#fff",
            background: practice ? "linear-gradient(135deg,#22c55e,#10b981)" : "linear-gradient(135deg,#a855f7,#7c3aed)",
          }}>
          ▶ {practice ? "練習スタート" : "スタート"}
        </button>
      </div>
    </div>
  );
}
