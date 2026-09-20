// ============================================================
// TeacherMode.jsx — 「教師モード」：仮想生徒10人の実際の誤答から作った
//  ノードグラフ対話(説明→確認クイズ→誤答なら再説明→…)を再生する画面。
//
//  データ：src/data/dialogue/teacherMode/{seifu,moji,eq,pr,pl,sp,dt}.json
//  エンジン：src/data/dialogue/teacherModeEngine.js
//  レイアウト・TTSは DialogueLesson.jsx / engine/reading.js と同じ設計を踏襲
//  （黒板＝書いて残る／先生＝声で問いかけて消える、を空間的に分離）。
// ============================================================
import { useState, useEffect, useRef } from "react";
import Header from "../components/Header.jsx";
import { speakText, stopSpeak, speechAvailable } from "../engine/reading.js";
import { startTeacherMode, advanceExplain, answerCheck, currentNode } from "../data/dialogue/teacherModeEngine.js";
import { findChapterById } from "../data/index.js";

const UNIT_FILES = [
  { key: "seifu", label: "正の数・負の数", emoji: "➕", color: "#818cf8", chapterId: "c1" },
  { key: "moji", label: "文字の式", emoji: "🔤", color: "#f472b6", chapterId: "c2" },
  { key: "eq", label: "方程式", emoji: "⚖️", color: "#fbbf24", chapterId: "c3" },
  { key: "pr", label: "比例と反比例", emoji: "📈", color: "#34d399", chapterId: "c4" },
  { key: "pl", label: "平面図形", emoji: "🔺", color: "#60a5fa", chapterId: "c5" },
  { key: "sp", label: "空間図形", emoji: "🧊", color: "#a78bfa", chapterId: "c6" },
  { key: "dt", label: "データの活用", emoji: "📊", color: "#fb7185", chapterId: "c7" },
  { key: "g2pe", label: "式の計算", emoji: "🔣", color: "#34d399", chapterId: "g2c1" },
  { key: "g2se", label: "連立方程式", emoji: "🔗", color: "#60a5fa", chapterId: "g2c2" },
  { key: "g2lf", label: "一次関数", emoji: "📈", color: "#f59e0b", chapterId: "g2c3" },
  { key: "g2cg", label: "図形の性質と証明", emoji: "📐", color: "#a78bfa", chapterId: "g2c4" },
  { key: "g2pb", label: "確率", emoji: "🎲", color: "#fb923c", chapterId: "g2c6" },
  { key: "g3ex", label: "式の展開と因数分解", emoji: "🧮", color: "#22d3ee", chapterId: "g3c1" },
  { key: "g3qe", label: "2次方程式", emoji: "2️⃣", color: "#facc15", chapterId: "g3c3" },
  { key: "g3qf", label: "関数 y=ax²", emoji: "🎢", color: "#e879f9", chapterId: "g3c4" },
  { key: "g3sm", label: "相似な図形", emoji: "🔍", color: "#c084fc", chapterId: "g3c5" },
  { key: "g3cr", label: "円の性質", emoji: "⭕", color: "#f87171", chapterId: "g3c6" },
  { key: "g3py", label: "三平方の定理", emoji: "📏", color: "#38bdf8", chapterId: "g3c7" },
  { key: "g3sa", label: "標本調査", emoji: "🧪", color: "#4ade80", chapterId: "g3c8" },
];

// P0の小単元名(subunit)とアプリの単元(unitId)の対応表は7単元ぶん個別に持たず、
//  名前の部分一致で解決する（完全一致→2文字フラグメント一致の順）。厳密な1:1では
//  ないため、確信が持てない場合は null を返し、無理に間違ったunitIdへ登録しない。
function resolveUnitId(chapterId, subunit) {
  const chapter = findChapterById(chapterId);
  if (!chapter || !subunit) return null;
  const units = chapter.units || [];
  const clean = (s) => s.replace(/[（(].*?[）)]/g, "").trim();
  for (const u of units) {
    const name = clean(u.name);
    if (name && (subunit.includes(name) || name.includes(subunit))) return u.id;
  }
  for (const u of units) {
    const name = clean(u.name);
    for (let i = 0; i + 2 <= name.length; i++) {
      if (subunit.includes(name.slice(i, i + 2))) return u.id;
    }
  }
  return null;
}

// 単元データは選んだときだけ読み込む（1139問ぶんを最初から全部読まない）
const UNIT_LOADERS = {
  seifu: () => import("../data/dialogue/teacherMode/seifu.json"),
  moji: () => import("../data/dialogue/teacherMode/moji.json"),
  eq: () => import("../data/dialogue/teacherMode/eq.json"),
  pr: () => import("../data/dialogue/teacherMode/pr.json"),
  pl: () => import("../data/dialogue/teacherMode/pl.json"),
  sp: () => import("../data/dialogue/teacherMode/sp.json"),
  dt: () => import("../data/dialogue/teacherMode/dt.json"),
  g2pe: () => import("../data/dialogue/teacherMode/g2pe.json"),
  g2se: () => import("../data/dialogue/teacherMode/g2se.json"),
  g2lf: () => import("../data/dialogue/teacherMode/g2lf.json"),
  g2cg: () => import("../data/dialogue/teacherMode/g2cg.json"),
  g2pb: () => import("../data/dialogue/teacherMode/g2pb.json"),
  g3ex: () => import("../data/dialogue/teacherMode/g3ex.json"),
  g3qe: () => import("../data/dialogue/teacherMode/g3qe.json"),
  g3qf: () => import("../data/dialogue/teacherMode/g3qf.json"),
  g3sm: () => import("../data/dialogue/teacherMode/g3sm.json"),
  g3cr: () => import("../data/dialogue/teacherMode/g3cr.json"),
  g3py: () => import("../data/dialogue/teacherMode/g3py.json"),
  g3sa: () => import("../data/dialogue/teacherMode/g3sa.json"),
};

// 板書1行の色分け（黒板のチョーク色。DialogueLessonのLINE_STYLEと揃える）
const LINE_STYLE = {
  problem: { color: "#fef9c3", fontWeight: 800 },
  work: { color: "#bae6fd", fontWeight: 600 },
  student: { color: "#fff", fontWeight: 700 },
  result: { color: "#86efac", fontWeight: 900, fontSize: 19 },
};

export default function TeacherMode({ player, onBack, onMistake, focusChapterId = null, focusUnit = null, onConfirmQuiz = null }) {
  // 講義から「教師モード」を選んで開いたときは、その単元のファイルを直接ひらく（単元えらびを飛ばす）。
  const initialKey = focusChapterId ? (UNIT_FILES.find((u) => u.chapterId === focusChapterId)?.key || null) : null;
  const [unitKey, setUnitKey] = useState(initialKey);
  const [problem, setProblem] = useState(null);
  // 確認問題へ進むボタン（講義クリア用）。focusUnit があるとき（＝講義から来たとき）だけ出す。
  const confirmBtn = focusUnit && onConfirmQuiz ? { unit: focusUnit, go: () => onConfirmQuiz(focusUnit) } : null;

  if (!unitKey) return <UnitPicker player={player} onPick={setUnitKey} onBack={onBack} />;
  if (!problem) return <ProblemPicker player={player} unitKey={unitKey} onPick={setProblem} onBack={initialKey ? onBack : () => setUnitKey(null)} confirmBtn={confirmBtn} />;
  const chapterId = UNIT_FILES.find((u) => u.key === unitKey)?.chapterId || null;
  return <Board player={player} problem={problem} chapterId={chapterId} onMistake={onMistake} onExit={() => setProblem(null)} confirmBtn={confirmBtn} />;
}

// ── ① 単元えらび ──────────────────────────────────────
function UnitPicker({ player, onPick, onBack }) {
  return (
    <div className="app">
      <Header player={player} back="ホーム" onBack={onBack} />
      <div className="content">
        <div className="glass" style={{ padding: 16, marginTop: 10 }}>
          <div style={{ fontSize: 20, fontWeight: 900, marginBottom: 4 }}>🧑‍🏫 先生の説明を聞く</div>
          <div style={{ fontSize: 12.5, color: "rgba(255,255,255,.6)", lineHeight: 1.6 }}>
            先生が黒板を使って、1問ずつ順番に説明してくれます。とちゅうで確認クイズが出るよ。まちがえても大丈夫、
            もう一度やさしく説明してくれます。
          </div>
        </div>

        <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {UNIT_FILES.map((u) => (
            <button key={u.key} className="mode-card" onClick={() => onPick(u.key)}
              style={{ background: `${u.color}1a`, borderColor: `${u.color}55`, alignItems: "flex-start", textAlign: "left", padding: 14 }}>
              <span style={{ fontSize: 22 }}>{u.emoji}</span>
              <span style={{ fontSize: 14, fontWeight: 900, marginTop: 4 }}>{u.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// 小単元の問題一覧から「主要な問題（教科書の例題ぶん）」だけを既定表示にする。
//  ★3応用は種類があっていいのでそのまま全部main行き、★1基礎/★2標準は各2問までmain、残りはrest（ほかの問題も見る）へ。
function pickMainProblems(items) {
  const seenCount = {};
  const main = [];
  const rest = [];
  for (const p of items) {
    if ((p.difficulty || "").includes("応用")) { main.push(p); continue; }
    const n = (seenCount[p.difficulty] = (seenCount[p.difficulty] || 0) + 1);
    if (n <= 2) main.push(p); else rest.push(p);
  }
  return { main, rest };
}

// ── ② 問題えらび（小単元でグループ化した一覧） ─────────────
function ProblemPicker({ player, unitKey, onPick, onBack, confirmBtn = null }) {
  const [data, setData] = useState(null);
  const [expanded, setExpanded] = useState({});
  useEffect(() => {
    let alive = true;
    UNIT_LOADERS[unitKey]().then((m) => { if (alive) setData(m.default || m); });
    return () => { alive = false; };
  }, [unitKey]);

  if (!data) {
    return (
      <div className="app">
        <Header player={player} back="単元えらび" onBack={onBack} />
        <div className="content">
          <div style={{ marginTop: 20, textAlign: "center", opacity: .6 }}>よみこみ中…</div>
        </div>
      </div>
    );
  }

  const groups = {};
  for (const p of data.problems) {
    (groups[p.subunit] ||= []).push(p);
  }

  return (
    <div className="app">
      <Header player={player} back="単元えらび" onBack={onBack} />
      <div className="content">
        <div style={{ fontSize: 15, fontWeight: 900, margin: "10px 0 4px" }}>{data.unit}</div>
        <div style={{ fontSize: 11.5, opacity: .6, marginBottom: 10 }}>{data.count}問。小単元をえらんで、そこから1問えらぼう。</div>
        {/* 講義から来たとき：先生の説明を見たら「確認問題」で講義クリアへ */}
        {confirmBtn && (
          <button data-sfx="none" onClick={confirmBtn.go} style={{ width: "100%", margin: "0 0 12px", padding: "12px", borderRadius: 12, cursor: "pointer",
            border: "none", background: "linear-gradient(135deg,#22c55e,#10b981)", color: "#fff", fontWeight: 900, fontSize: 14 }}>
            ✅ 確認問題にすすむ（講義クリア）
          </button>
        )}
        {Object.entries(groups).map(([subunit, items]) => {
          const { main, rest } = pickMainProblems(items);
          const isExpanded = !!expanded[subunit];
          const visible = isExpanded ? [...main, ...rest] : main;
          return (
            <details key={subunit} style={{ marginBottom: 8 }}>
              <summary style={{ cursor: "pointer", fontSize: 13, fontWeight: 800, padding: "8px 4px", color: "#c7d2fe" }}>
                {subunit}（{items.length}問）
              </summary>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 4 }}>
                {visible.map((p) => (
                  <button key={p.id} onClick={() => onPick(p)} className="nb-btn"
                    style={{ textAlign: "left", display: "flex", gap: 10, alignItems: "center" }}>
                    <span style={{ fontSize: 10, fontWeight: 900, color: "rgba(255,255,255,.45)", whiteSpace: "nowrap" }}>{p.difficulty}</span>
                    <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, fontWeight: 700, display: "-webkit-box",
                      WebkitLineClamp: 1, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{p.problem_text}</span>
                  </button>
                ))}
                {!isExpanded && rest.length > 0 && (
                  <button onClick={(e) => { e.preventDefault(); setExpanded((s) => ({ ...s, [subunit]: true })); }}
                    style={{ textAlign: "center", padding: "8px", borderRadius: 10, cursor: "pointer", fontFamily: "inherit",
                      border: "1.5px dashed rgba(255,255,255,.25)", background: "transparent", color: "rgba(255,255,255,.55)", fontSize: 11.5, fontWeight: 800 }}>
                    ＋ ほかの問題も見る（あと{rest.length}問）
                  </button>
                )}
              </div>
            </details>
          );
        })}
      </div>
    </div>
  );
}

// 長い説明を「。！？」で短い一言（ビート）に刻む。先生は一度に一言だけ話す＝読みやすい・聞きやすい。
function splitBeats(text) {
  const s = String(text || "").trim();
  if (!s) return [];
  const parts = s.split(/(?<=[。！？])/).map((t) => t.trim()).filter(Boolean);
  return parts.length ? parts : [s];
}

// ── ③ 黒板＋先生（ノードグラフ再生） ───────────────────────
function Board({ player, problem, chapterId, onMistake, onExit, confirmBtn = null }) {
  const tm = problem.teacher_mode;
  const [state, setState] = useState(() => startTeacherMode(tm));
  const [voiceOn, setVoiceOn] = useState(false); // 既定OFF（短文化で読めるので音声は"欲しい人だけ"）
  const [beat, setBeat] = useState(0);            // explainノード内の「一言」の位置
  const [picked, setPicked] = useState(null); // check中に選んだ選択肢のindex（結果表示用）
  const boardRef = useRef(null);
  const canSpeak = speechAvailable();
  // スマホ幅では黒板(上)＋チャット(下)の縦積みにする（横並びだと黒板がつぶれて読めなくなるため）。
  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" && window.innerWidth < 700);
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 700);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const node = currentNode(tm, state);
  // explainノードは短い一言に分割。checkは問い1つ。
  const beats = node && node.type !== "check" ? splitBeats(node.text) : [];
  const lastBeat = beats.length ? beat >= beats.length - 1 : true;
  const curText = state.done ? "よくがんばったね！これでこの問題の説明はおしまい。"
    : node?.type === "check" ? node.question : (beats[beat] ?? node?.text ?? "");

  // LINE風のチャットログ（先生の一言・自分の答えが吹き出しで残っていく）
  const [chat, setChat] = useState([]);
  const chatRef = useRef(null);
  const chatKey = useRef(0);
  const initRef = useRef(false);
  // 直前と同じ吹き出しは足さない（連打などで同じ一言が重複するのを防ぐ）
  const pushChat = (who, text) => {
    if (!text) return;
    setChat((c) => {
      const last = c[c.length - 1];
      if (last && last.who === who && last.text === text) return c;
      return [...c, { who, text, k: (chatKey.current += 1) }];
    });
  };
  // その状態で「今見えるべき先生の一言」を吹き出しに足す（explain=先頭ビート／check=問い／done=しめ）
  const showNode = (s) => {
    const n = currentNode(tm, s);
    if (s.done) { pushChat("t", "よくがんばったね！これでこの問題の説明はおしまい。"); return; }
    if (!n) return;
    pushChat("t", n.type === "check" ? n.question : (splitBeats(n.text)[0] || n.text));
  };

  // 初回：最初の一言を出す
  useEffect(() => { if (initRef.current) return; initRef.current = true; showNode(state); /* eslint-disable-next-line */ }, []);

  useEffect(() => {
    if (boardRef.current) boardRef.current.scrollTop = boardRef.current.scrollHeight;
  }, [state.board.length]);
  // 新しい吹き出しが増えたら一番下へスクロール
  useEffect(() => { if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight; }, [chat.length]);

  // ノードが変わったら一言の位置をリセット
  useEffect(() => { setBeat(0); }, [state.nodeId]);

  // 「今の一言」だけを読み上げる（短いので聞きやすい）。少しゆっくり。
  useEffect(() => {
    if (!voiceOn || !curText) return;
    speakText(curText, { rate: 0.9 });
    return () => stopSpeak();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.nodeId, beat, voiceOn, state.done]);

  // 「つづき」：同じノードの次の一言へ。最後なら次のノードへ。どちらも吹き出しを足す。
  const nextBeat = () => {
    if (!lastBeat) { const nb = beat + 1; setBeat(nb); pushChat("t", beats[nb]); }
    else { const ns = advanceExplain(tm, state); setState(ns); setBeat(0); showNode(ns); }
  };

  const choose = (i) => {
    if (picked != null) return;
    setPicked(i);
    pushChat("me", String(node.choices[i])); // 自分の答えを右側の吹き出しに
    // これが2回目の誤答なら、学び直しノートへ登録（授業で間違えた→なおすに出る）。
    if (node?.type === "check" && i !== node.correct && (state.wrongCounts?.[node.id] || 0) >= 1) {
      const unitId = resolveUnitId(chapterId, problem.subunit);
      onMistake?.({ q: node.question, ans: String(node.choices[node.correct]), unitId, chapterId });
    }
    const correct = i === node.correct;
    setTimeout(() => {
      pushChat("t", correct ? "せいかい！ 👏" : "おしい！ もう一度いっしょに見よう");
      const ns = answerCheck(tm, state, i);
      setState(ns); setBeat(0); setPicked(null);
      showNode(ns);
    }, 600);
  };

  return (
    <div className="app">
      <Header player={player} />
      <div className="content" style={{ maxWidth: isMobile ? 640 : 880, display: "flex", flexDirection: "column", height: "calc(100dvh - 64px)" }}>
        {/* 上段：声＋「戻る」を右上に置く（問題文は下の黒板に固定表示するのでここには置かない） */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10, marginBottom: 8 }}>
          {canSpeak && (
            <button className="back-btn" onClick={() => setVoiceOn((v) => !v)} title="先生の声">
              {voiceOn ? "🔊 声ON" : "🔇 声OFF"}
            </button>
          )}
          <button className="back-btn" onClick={onExit}>問題えらび →</button>
        </div>

        <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: isMobile ? "column" : "row", gap: isMobile ? 8 : 12 }}>
          {/* 黒板（モバイルは上・PCは左） */}
          <div style={{
            flex: isMobile ? "1.4 1 0%" : 1, minWidth: 0, minHeight: 0, display: "flex", flexDirection: "column",
            background: "linear-gradient(160deg,#15352b,#0f2a22)",
            border: "10px solid #6b4423", borderRadius: 12,
            boxShadow: "inset 0 0 60px rgba(0,0,0,.5)",
            fontFamily: "'Yu Kyokasho','Hiragino Maru Gothic ProN',sans-serif",
          }}>
            {/* 問題文は常に見えるように黒板の一番上へ固定（文章題は説明だけだと分からなくなるため） */}
            <div style={{ flexShrink: 0, padding: isMobile ? "12px 14px 9px" : "16px 20px 11px",
              borderBottom: "1px dashed rgba(255,255,255,.22)",
              fontSize: isMobile ? 14.5 : 16, lineHeight: 1.55, letterSpacing: ".02em", ...LINE_STYLE.problem }}>
              📌 {problem.problem_text}
            </div>
            <div ref={boardRef} style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: isMobile ? "12px 14px" : "14px 20px" }}>
              {state.board.map((ln, i) => (
                <div key={i} style={{ marginBottom: 11, fontSize: isMobile ? 15.5 : 17, lineHeight: 1.5, letterSpacing: ".02em", ...LINE_STYLE[ln.kind], animation: "fadeUp .35s both" }}>
                  {ln.text}
                </div>
              ))}
            </div>
          </div>

          {/* LINE風のチャット（モバイルは下・PCは右）。先生の一言・自分の答えが吹き出しで残っていく */}
          <div style={{ width: isMobile ? "100%" : 250, flexShrink: 0, flex: isMobile ? "1 1 0%" : "0 0 auto",
            maxHeight: isMobile ? "34vh" : undefined, display: "flex", flexDirection: "column", minHeight: 0 }}>
            <div ref={chatRef} className="glass" style={{ flex: 1, minHeight: 0, padding: "12px 10px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 9 }}>
              {chat.map((m) => (m.who === "me" ? (
                <div key={m.k} style={{ alignSelf: "flex-end", maxWidth: "82%", background: "#86efac", color: "#052e16", borderRadius: "14px 14px 3px 14px", padding: "8px 11px", fontSize: 14.5, fontWeight: 800, animation: "fadeUp .28s both" }}>{m.text}</div>
              ) : (
                <div key={m.k} style={{ alignSelf: "flex-start", display: "flex", gap: 6, maxWidth: "94%", animation: "fadeUp .28s both" }}>
                  <span style={{ fontSize: 22, flexShrink: 0, lineHeight: 1.2 }}>🧑‍🏫</span>
                  <div style={{ background: "rgba(255,255,255,.13)", color: "#fff", borderRadius: "14px 14px 14px 3px", padding: "9px 12px", fontSize: 14.5, fontWeight: 600, lineHeight: 1.65 }}>{m.text}</div>
                </div>
              )))}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 10 }}>
          {state.done ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {confirmBtn && (
                <button className="nb-btn" onClick={confirmBtn.go} style={{ background: "linear-gradient(135deg,#0ea5e9,#6366f1)", color: "#fff", fontWeight: 900, fontSize: 15, padding: 14 }}>
                  ✅ 確認問題にすすむ（講義クリア）
                </button>
              )}
              <button className="nb-btn" onClick={onExit} style={{ background: "linear-gradient(135deg,#22c55e,#10b981)", color: "#fff", fontWeight: 900, fontSize: 15, padding: 14 }}>
                🎉 おわり！ ほかの問題をえらぶ
              </button>
            </div>
          ) : node?.type === "check" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {node.choices.map((c, i) => (
                <button key={i} onClick={() => choose(i)} disabled={picked != null} className="nb-btn"
                  style={{
                    textAlign: "left", fontSize: 14, fontWeight: 700, padding: "12px 14px",
                    borderColor: picked === i ? (i === node.correct ? "rgba(134,239,172,.7)" : "rgba(248,113,113,.7)") : undefined,
                    background: picked === i ? (i === node.correct ? "rgba(134,239,172,.18)" : "rgba(248,113,113,.18)") : undefined,
                  }}>
                  {String.fromCharCode(65 + i)}. {c}
                </button>
              ))}
            </div>
          ) : (
            <button className="nb-btn" onClick={nextBeat}
              style={{ width: "100%", background: "linear-gradient(135deg,#6366f1,#818cf8)", color: "#fff", fontWeight: 900, fontSize: 15, padding: 14 }}>
              {lastBeat ? "次へ →" : "▽ つづき"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
