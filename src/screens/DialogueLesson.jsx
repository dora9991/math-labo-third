// ============================================================
// DialogueLesson.jsx — 対話型数学授業（試作）
//  ・黒板（板書：書いて残る）と 先生（発話：声で消える）を空間的に分離
//  ・本発問→補助発問→説明 の発問モデルで、AI先生と対話しながら進む
//  ・音声入力(Web Speech API)＋文字入力の両対応、先生の声は音声合成
//  データ：src/data/dialogue/questionBank.json（発問バンク中1）
//  エンジン：src/data/dialogue/teacher.js（将来 Claude API に差し替え可）
// ============================================================
import { useState, useEffect, useRef } from "react";
import Header from "../components/Header.jsx";
import bank from "../data/dialogue/questionBank.json";
import { startLesson, respond, showWork } from "../data/dialogue/teacher.js";
import { startTreeLesson, respondTree, showWorkTree, hintTree, hasTree, findTree } from "../data/dialogue/treeTeacher.js";
import { aiHealth, aiRespond } from "../data/dialogue/aiTeacher.js";

// 図(png)をURLとして解決（Viteのglob）。questionBank の "figures/xxx.png" と突き合わせる
const FIG_URLS = import.meta.glob("../data/dialogue/figures/*.png", { eager: true, query: "?url", import: "default" });
const figUrl = (rel) => {
  const name = (rel || "").split("/").pop();
  const hit = Object.entries(FIG_URLS).find(([k]) => k.endsWith("/" + name));
  return hit ? hit[1] : null;
};

const CHAP_NAME = (title) => (title.match(/「(.+?)」/)?.[1]) || title;

// 板書1行の色分け（黒板のチョーク色）
const LINE_STYLE = {
  problem: { color: "#fef9c3", fontWeight: 800 },           // 課題＝黄チョーク
  work: { color: "#bae6fd", fontWeight: 600 },              // 途中の考え＝水色
  student: { color: "#fff", fontWeight: 700 },              // 生徒が言ったこと＝白（強調）
  result: { color: "#86efac", fontWeight: 900, fontSize: 19 },// 結論＝緑チョーク・大
  goal: { color: "#fda4af", fontWeight: 800 },              // まとめ・ねらい＝桃チョーク
};

export default function DialogueLesson({ player, onBack }) {
  const [lesson, setLesson] = useState(null);  // 選択中レッスン（null=選択画面）
  if (!lesson) return <Picker player={player} onPick={setLesson} onBack={onBack} />;
  return <Board player={player} lesson={lesson} onExit={() => setLesson(null)} />;
}

// ── レッスン選択（章 → 授業） ─────────────────────────
function Picker({ player, onPick, onBack }) {
  const [chap, setChap] = useState(null);
  const chapters = bank.chapters;
  const lessonsOf = (cid) => bank.lessons.filter((l) => l.chapterId === cid);

  return (
    <div className="app">
      <Header player={player} />
      <div className="content">
        <button className="back-btn" onClick={onBack}>← もどる</button>
        <div className="glass" style={{ padding: 16, marginTop: 10 }}>
          <div style={{ fontSize: 20, fontWeight: 900, marginBottom: 4 }}>🧑‍🏫 AIと対話する授業</div>
          <div style={{ fontSize: 12.5, color: "rgba(255,255,255,.6)", lineHeight: 1.6 }}>
            先生が黒板を使いながら問いかけます。声でも文字でも答えてOK。
            答えを当てるより「どう考えたか」を大事にする授業です。
          </div>
        </div>

        {!chap ? (
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: "rgba(255,255,255,.5)", marginBottom: 8 }}>中1・単元をえらぶ</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {chapters.map((c) => {
                const ls = lessonsOf(c.chapterId);
                const ready = ls.filter((l) => hasTree(l.id)).length;
                return (
                  <button key={c.chapterId} className="mode-card" onClick={() => setChap(c)}
                    style={{ background: "rgba(255,255,255,.05)", alignItems: "flex-start", textAlign: "left", padding: 14 }}>
                    <span style={{ fontSize: 15, fontWeight: 900 }}>{CHAP_NAME(c.title)}</span>
                    <span style={{ fontSize: 11, opacity: .7 }}>{ls.length}授業
                      {ready > 0 && <span style={{ color: "#86efac" }}> ・対話{ready}本✨</span>}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div style={{ marginTop: 14 }}>
            <button className="back-btn" onClick={() => setChap(null)} style={{ marginBottom: 8 }}>← 単元一覧</button>
            <div style={{ fontSize: 14, fontWeight: 900, marginBottom: 8 }}>{CHAP_NAME(chap.title)}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {lessonsOf(chap.chapterId).map((l) => {
                const ready = hasTree(l.id);
                return (
                  <button key={l.id} onClick={() => onPick(l)} className="nb-btn"
                    style={{ textAlign: "left", display: "flex", gap: 10, alignItems: "center",
                      borderColor: ready ? "rgba(134,239,172,.4)" : "rgba(255,255,255,.11)" }}>
                    <span style={{ fontSize: 11, fontWeight: 900, color: ready ? "#86efac" : "rgba(255,255,255,.4)", whiteSpace: "nowrap" }}>
                      {ready ? "対話✨" : "演習"}
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: 12.5, fontWeight: 700, display: "block" }}>{l.shosetsu}</span>
                      <span style={{ fontSize: 11, opacity: .6, display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{l.hatsumon}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── 黒板＋先生＋入力 ───────────────────────────────────
function Board({ player, lesson, onExit }) {
  const tree = hasTree(lesson.id);  // 発問の木がある授業か（演習回は無い）
  const [state, setState] = useState(() => (tree ? startTreeLesson(lesson) : startLesson(lesson)));
  const [input, setInput] = useState("");
  const [voiceOn, setVoiceOn] = useState(true);   // 先生の声（音声合成）
  const [listening, setListening] = useState(false);
  // 手書きパッド。最初の「自分で考える」段階では自動で開く
  const [padOpen, setPadOpen] = useState(() => state.phase === "think");
  const [aiMode, setAiMode] = useState(false);     // 本物のAI先生が使えるか（中継サーバー稼働＋キー）
  const boardRef = useRef(null);
  const recogRef = useRef(null);
  const stateRef = useRef(state);                  // 非同期処理から最新stateを読むため
  useEffect(() => { stateRef.current = state; });

  // 起動時にAI先生が使えるか確認（使えなければ台本モードのまま）
  useEffect(() => { aiHealth().then(setAiMode); }, []);

  const lastTeacher = [...state.messages].reverse().find((m) => m.who === "teacher");

  // 板書が伸びたら下までスクロール
  useEffect(() => {
    if (boardRef.current) boardRef.current.scrollTop = boardRef.current.scrollHeight;
  }, [state.board.length]);

  // 先生の最新の発話を読み上げる
  useEffect(() => {
    if (!voiceOn || !lastTeacher) return;
    try {
      const u = new SpeechSynthesisUtterance(lastTeacher.text.replace(/（補助）/g, ""));
      u.lang = "ja-JP"; u.rate = 1.02; u.pitch = 1.1;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    } catch { /* 非対応ブラウザは黙ってスキップ */ }
    return () => { try { window.speechSynthesis.cancel(); } catch {} };
  }, [state.messages.length, voiceOn]); // eslint-disable-line

  // 本物のAI先生に1ターン投げる（文字 or 手書き画像）。返答で板書・吹き出しを更新。
  const aiTurn = async (studentText, studentImage) => {
    // まず生徒の入力を画面に反映（楽観的更新）＋「考え中」に
    setState((s) => {
      const board = [...s.board];
      if (studentImage) board.push({ image: studentImage, kind: "student", label: "あなたの考え" });
      const messages = [...s.messages, { who: "student", text: studentImage ? "（手書きを見せた）" : studentText }];
      return { ...s, phase: "guided", board, messages, thinking: true };
    });
    try {
      const cur = stateRef.current;
      const r = await aiRespond({
        lesson: { shosetsu: lesson.shosetsu, hatsumon: lesson.hatsumon, nerai: lesson.nerai, title: lesson.title },
        board: cur.board.filter((b) => b.text).map((b) => b.text),
        history: cur.messages.map((m) => ({ role: m.who, text: m.text })),
        studentText: studentImage ? "" : studentText,
        studentImage: studentImage || null,
        phase: cur.phase,
        plan: findTree(lesson.id),   // 発問の木をAIの“指導案”として渡す（判定・補助発問の根拠）
      });
      setState((s) => {
        const board = [...s.board];
        if (r.board_add) board.push({ text: r.board_add, kind: r.done ? "result" : "work", mark: r.done ? "★" : undefined });
        const text = (r.reaction ? r.reaction + " " : "") + (r.message || "");
        return { ...s, board, messages: [...s.messages, { who: "teacher", text }], thinking: false, done: !!r.done };
      });
    } catch (e) {
      setState((s) => ({ ...s, thinking: false, messages: [...s.messages, { who: "teacher", text: "（通信エラー：先生サーバーが動いているか確認してね）" }] }));
    }
  };

  const send = (text) => {
    const t = (text ?? input).trim();
    if (!t || state.done || state.thinking) return;
    setInput("");
    if (aiMode) aiTurn(t, null);
    else if (state.mode === "tree") setState((s) => respondTree(s, lesson, t));
    else setState((s) => respond(s, lesson, t));
  };

  // 手書きを「見せる」：画像を黒板へ載せ、先生が受け止めて次へ進む
  const submitWork = (dataUrl) => {
    if (state.done || state.thinking) return;
    setPadOpen(false);
    if (aiMode) aiTurn(null, dataUrl);
    else if (state.mode === "tree") setState((s) => showWorkTree(s, lesson, dataUrl));
    else setState((s) => showWork(s, lesson, dataUrl));
  };

  // 「ヒント」：木モードは補助発問を1段ずつ／AIモードはAIに補助を頼む／その他は従来通り
  const hint = () => {
    if (state.done || state.thinking) return;
    if (aiMode) send("ヒントがほしい");
    else if (state.mode === "tree") setState((s) => hintTree(s, lesson));
    else send("わからない");
  };

  // 音声入力（Web Speech API）。非対応なら黙って無効。
  const toggleMic = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert("このブラウザは音声入力に未対応です。文字で入力してね。"); return; }
    if (listening) { recogRef.current?.stop(); return; }
    const r = new SR();
    r.lang = "ja-JP"; r.interimResults = false; r.maxAlternatives = 1;
    r.onresult = (e) => { const txt = e.results[0][0].transcript; setInput(txt); setTimeout(() => send(txt), 150); };
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    recogRef.current = r; setListening(true); r.start();
  };

  const teacherFace = state.thinking ? "🤔" : state.done ? "🎉" : (lastTeacher?.text.includes("（補助）") || lastTeacher?.text.includes("ヒント")) ? "🤔" : "🧑‍🏫";
  const fig = lesson.figures?.[0] ? figUrl(lesson.figures[0]) : null;

  return (
    <div className="app">
      <Header player={player} />
      <div className="content" style={{ maxWidth: 880, display: "flex", flexDirection: "column", height: "calc(100dvh - 64px)" }}>
        {/* 上部バー：めあて */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <button className="back-btn" onClick={onExit}>← 授業をえらぶ</button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12.5, fontWeight: 900, color: "#fef9c3", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              📌 めあて：{(lesson.nerai || "").split("／")[0]}
            </div>
          </div>
          <span title={aiMode ? "本物のAI先生と対話中" : "台本モード（中継サーバー未起動）"} style={{
            fontSize: 10.5, fontWeight: 900, padding: "4px 8px", borderRadius: 8, whiteSpace: "nowrap",
            color: aiMode ? "#86efac" : "rgba(255,255,255,.45)",
            border: `1px solid ${aiMode ? "rgba(134,239,172,.5)" : "rgba(255,255,255,.15)"}`,
            background: aiMode ? "rgba(134,239,172,.12)" : "transparent",
          }}>{aiMode ? "✨ AI先生" : "台本"}</span>
          <button className="back-btn" onClick={() => setVoiceOn((v) => !v)} title="先生の声">
            {voiceOn ? "🔊 声ON" : "🔇 声OFF"}
          </button>
        </div>

        {/* 黒板 ＋ 先生（左右分割） */}
        <div style={{ flex: 1, minHeight: 0, display: "flex", gap: 12 }}>
          {/* 左：黒板（書いて残る） */}
          <div ref={boardRef} style={{
            flex: 1, minWidth: 0, overflowY: "auto",
            background: "linear-gradient(160deg,#15352b,#0f2a22)",
            border: "10px solid #6b4423", borderRadius: 12,
            boxShadow: "inset 0 0 60px rgba(0,0,0,.5)", padding: "18px 20px",
            fontFamily: "'Yu Kyokasho','Hiragino Maru Gothic ProN',sans-serif",
          }}>
            {fig && <img src={fig} alt="" style={{ maxWidth: "62%", borderRadius: 8, marginBottom: 14, background: "rgba(255,255,255,.92)", padding: 6 }} />}
            {state.board.map((ln, i) => (
              ln.image ? (
                <div key={i} style={{ marginBottom: 13, animation: "fadeUp .35s both" }}>
                  {ln.label && <div style={{ fontSize: 12, fontWeight: 800, color: "#fff", marginBottom: 4 }}>✏️ {ln.label}</div>}
                  <img src={ln.image} alt="手書き" style={{ maxWidth: "78%", borderRadius: 8, border: "2px solid rgba(255,255,255,.85)", background: "#fff" }} />
                </div>
              ) : (
                <div key={i} style={{ marginBottom: 11, fontSize: 17, lineHeight: 1.5, letterSpacing: ".02em", ...LINE_STYLE[ln.kind], animation: "fadeUp .35s both" }}>
                  {ln.mark && <span style={{ marginRight: 6 }}>{ln.mark}</span>}{ln.text}
                </div>
              )
            ))}
          </div>

          {/* 右：先生（声で問いかける・消える） */}
          <div style={{ width: 200, flexShrink: 0, display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ textAlign: "center", fontSize: 64, lineHeight: 1, filter: "drop-shadow(0 4px 10px rgba(0,0,0,.4))" }}>{teacherFace}</div>
            <div className="glass" style={{ flex: 1, padding: 13, fontSize: 13.5, lineHeight: 1.65, position: "relative", overflowY: "auto" }}>
              <div style={{ fontSize: 10, fontWeight: 900, color: "#a5b4fc", marginBottom: 5 }}>先生</div>
              {state.thinking
                ? <span style={{ color: "rgba(255,255,255,.6)", fontStyle: "italic" }}>うーん、なるほど…考え中 💭</span>
                : lastTeacher?.text.replace(/（補助）/g, "💡 ")}
            </div>
          </div>
        </div>

        {/* 下：生徒の応答（手書き・音声・文字） */}
        <div style={{ marginTop: 10 }}>
          {state.done ? (
            <button className="nb-btn" onClick={onExit} style={{ background: "linear-gradient(135deg,#22c55e,#10b981)", color: "#fff", fontWeight: 900, fontSize: 15, padding: 14 }}>
              🎉 授業おわり！ ほかの授業をえらぶ
            </button>
          ) : (
            <>
              {/* 自分で考える段階では「まず手書きで」を促す */}
              {state.phase === "think" && (
                <div style={{ fontSize: 12, fontWeight: 800, color: "#fde68a", marginBottom: 7 }}>
                  ✍️ まずは自分で考えて、ノートに手書きしてみよう。できたら「✏️ 見せる」！
                </div>
              )}

              {/* 手書きノート（開いているとき） */}
              {padOpen && <HandwritingPad onShow={submitWork} onClose={() => setPadOpen(false)} />}

              {/* 入力ツールバー：手書き切替・音声・文字 */}
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button onClick={() => setPadOpen((v) => !v)} title="手書きノート" style={{
                  width: 52, height: 48, borderRadius: 12, flexShrink: 0, cursor: "pointer", fontSize: 20,
                  border: padOpen ? "2px solid #fbbf24" : "none", color: "#fff",
                  background: padOpen ? "rgba(251,191,36,.25)" : "rgba(255,255,255,.1)" }}>✏️</button>
                <button onClick={toggleMic} title="音声で答える" style={{
                  width: 52, height: 48, borderRadius: 12, flexShrink: 0, cursor: "pointer", fontSize: 22,
                  border: "none", color: "#fff", background: listening ? "linear-gradient(135deg,#ef4444,#f97316)" : "rgba(255,255,255,.1)",
                  animation: listening ? "pulse 1s infinite" : "none",
                }}>🎤</button>
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && send()}
                  placeholder={listening ? "聞いています…" : state.phase === "think" ? "言葉で説明してもOK" : "ここに答えを書く（声でもOK）"}
                  style={{ flex: 1, padding: "13px 14px", borderRadius: 12, fontSize: 15, fontFamily: "inherit",
                    border: "1px solid rgba(255,255,255,.15)", background: "rgba(255,255,255,.06)", color: "#fff", outline: "none" }}
                />
                <button onClick={() => send()} data-sfx="none" style={{
                  padding: "0 18px", height: 48, borderRadius: 12, flexShrink: 0, cursor: "pointer", fontWeight: 900, fontSize: 15,
                  border: "none", color: "#fff", background: "linear-gradient(135deg,#6366f1,#818cf8)" }}>送信</button>
              </div>

              {state.phase !== "think" && (
                <button onClick={hint} style={{
                  marginTop: 7, fontSize: 11.5, color: "rgba(255,255,255,.5)", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>
                  うーん、ヒントがほしい（補助発問をもらう）
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── 手書きノート（指・マウスで書ける。「見せる」で画像を提出） ──────────
function HandwritingPad({ onShow, onClose }) {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const drawing = useRef(false);
  const [tool, setTool] = useState("pen"); // pen | eraser
  const [hasInk, setHasInk] = useState(false);

  // 初期化：白い紙にする（DPR対応で線をくっきり）
  useEffect(() => {
    const c = canvasRef.current;
    const dpr = window.devicePixelRatio || 1;
    const rect = c.getBoundingClientRect();
    c.width = Math.round(rect.width * dpr);
    c.height = Math.round(rect.height * dpr);
    const ctx = c.getContext("2d");
    ctx.scale(dpr, dpr);
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, rect.width, rect.height);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctxRef.current = ctx;
  }, []);

  const pos = (e) => {
    const r = canvasRef.current.getBoundingClientRect();
    const p = e.touches ? e.touches[0] : e;
    return { x: p.clientX - r.left, y: p.clientY - r.top };
  };
  const start = (e) => {
    e.preventDefault();
    drawing.current = true;
    const ctx = ctxRef.current;
    const { x, y } = pos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };
  const move = (e) => {
    if (!drawing.current) return;
    e.preventDefault();
    const ctx = ctxRef.current;
    ctx.strokeStyle = tool === "eraser" ? "#fff" : "#1f2937";
    ctx.lineWidth = tool === "eraser" ? 24 : 2.8;
    const { x, y } = pos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    if (!hasInk) setHasInk(true);
  };
  const end = () => { drawing.current = false; };

  const clear = () => {
    const c = canvasRef.current, ctx = ctxRef.current;
    const dpr = window.devicePixelRatio || 1;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, c.width / dpr, c.height / dpr);
    setHasInk(false);
  };

  const Tbtn = ({ id, label }) => (
    <button onClick={() => setTool(id)} style={{
      padding: "6px 11px", borderRadius: 9, cursor: "pointer", fontSize: 12.5, fontWeight: 800,
      border: tool === id ? "2px solid #6366f1" : "1px solid rgba(255,255,255,.18)",
      background: tool === id ? "rgba(99,102,241,.25)" : "rgba(255,255,255,.06)", color: "#fff",
    }}>{label}</button>
  );

  return (
    <div style={{ marginBottom: 9, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.12)", borderRadius: 12, padding: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 7 }}>
        <span style={{ fontSize: 11.5, fontWeight: 900, color: "rgba(255,255,255,.6)" }}>📝 あなたのノート</span>
        <Tbtn id="pen" label="✏️ ペン" />
        <Tbtn id="eraser" label="⌫ 消しゴム" />
        <button onClick={clear} style={{ padding: "6px 11px", borderRadius: 9, cursor: "pointer", fontSize: 12.5, fontWeight: 800,
          border: "1px solid rgba(255,255,255,.18)", background: "rgba(255,255,255,.06)", color: "#fff" }}>🗑 全消し</button>
        <div style={{ flex: 1 }} />
        <button onClick={onClose} title="閉じる" style={{ padding: "6px 10px", borderRadius: 9, cursor: "pointer", fontSize: 12.5,
          border: "none", background: "rgba(255,255,255,.08)", color: "rgba(255,255,255,.7)" }}>閉じる</button>
      </div>
      <canvas
        ref={canvasRef}
        onMouseDown={start} onMouseMove={move} onMouseUp={end} onMouseLeave={end}
        onTouchStart={start} onTouchMove={move} onTouchEnd={end}
        style={{ width: "100%", height: 170, borderRadius: 8, background: "#fff", touchAction: "none", cursor: "crosshair", display: "block" }}
      />
      <button onClick={() => onShow(canvasRef.current.toDataURL("image/png"))} disabled={!hasInk}
        data-sfx="none" style={{
          width: "100%", marginTop: 8, padding: "11px", borderRadius: 10, fontWeight: 900, fontSize: 14.5,
          cursor: hasInk ? "pointer" : "not-allowed", border: "none", color: "#fff",
          background: hasInk ? "linear-gradient(135deg,#f59e0b,#f97316)" : "rgba(255,255,255,.12)",
          opacity: hasInk ? 1 : .6,
        }}>✏️ これを先生に見せる</button>
    </div>
  );
}
