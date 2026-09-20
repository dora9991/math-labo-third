// ============================================================
// Clinic.jsx — 困り感クリニック（つまずき→処方ドリル→「できた！」の1周）
//
//  ねらい：「間違えた → なぜ間違えたか(つまずき)が分かる → そこだけ練習 →
//          “できるようになった” と画面が祝ってくれる」を1スキルで体験する。
//
//  既存エンジンを“配線”して作る（新エンジンは書かない）：
//   ・analyzeAttempts / recommendReview … 苦手抽出と復習問題の推薦
//   ・updateMastery / THETA / levelDifficulty … 習熟推定と「卒業」判定
//   ・問題データ problemBank … misconception(つまずき)/answerNumeric を利用
//
//  プロトタイプの対象スキル＝「正の数・負の数の加減」（自動採点できる74問の山）。
// ============================================================
import { useState, useEffect, useRef } from "react";
import Header from "../components/Header.jsx";
import MathText from "../components/MathText.jsx";
import * as sfx from "../audio/sfx.js";
import { PROBLEM_BANK } from "../data/problemBank.js";
import { makeChoices } from "../engine/generator.js";
import { isCorrect } from "../engine/scoring.js";
import { analyzeAttempts, recommendReview } from "../engine/tagAnalysis.js";
import { updateMastery, levelDifficulty, THETA, INITIAL_MASTERY } from "../engine/mastery.js";

// ---- 対象スキルの定義（プロトタイプは1スキル） ----
const SKILL = {
  key: "neg-addsub",
  name: "正の数・負の数の加減",
  emoji: "➕",
  match: (p) =>
    p.chapter === "c1" &&
    ["加法", "減法", "加減の混合"].includes(p.subunit) &&
    p.autoGradable && p.answerNumeric != null,
};
const POOL = PROBLEM_BANK.filter(SKILL.match);

const DIAG_N = 3;        // 診断の問題数
const DRILL_CAP = 12;    // 1回のドリルで出す上限（足りなければ「つづける」で追加）
const MORE_N = 8;        // 「つづける」で追加する問題数
const MIN_ANSWERS = 5;   // これ以上解いて合格ラインを満たせば卒業

const LV_LABEL = { 1: "easy", 2: "standard", 3: "advanced" };
const dOf = (p) => levelDifficulty(LV_LABEL[p.level] || "standard");
const shuffle = (a) => a.map((v) => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map((x) => x[1]);

// 診断3問：できるだけ別の小単元・難易度から選ぶ
function pickDiagnose() {
  const bySub = {};
  for (const p of shuffle(POOL)) (bySub[p.subunit] ||= []).push(p);
  const subs = shuffle(Object.keys(bySub));
  const out = [];
  let i = 0;
  while (out.length < DIAG_N && subs.length) {
    const s = subs[i % subs.length];
    if (bySub[s].length) out.push(bySub[s].shift());
    else subs.splice(i % subs.length, 1);
    i++;
    if (i > 50) break;
  }
  return out.slice(0, DIAG_N);
}

const band = (m) => (m >= THETA ? "#4ade80" : m >= 0.55 ? "#fbbf24" : "#f87171");

function MasteryBar({ m }) {
  return (
    <div style={{ margin: "10px 0 2px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "rgba(255,255,255,.6)", marginBottom: 4 }}>
        <span>今の習熟度</span><span>合格ライン {Math.round(THETA * 100)}%</span>
      </div>
      <div style={{ position: "relative", height: 12, borderRadius: 999, background: "rgba(255,255,255,.1)", overflow: "hidden" }}>
        <div style={{ width: `${Math.round(m * 100)}%`, height: "100%", background: band(m), borderRadius: 999, transition: "width .4s ease" }} />
        {/* 合格ラインの目印 */}
        <div style={{ position: "absolute", top: -2, bottom: -2, left: `${Math.round(THETA * 100)}%`, width: 2, background: "rgba(255,255,255,.85)" }} />
      </div>
    </div>
  );
}

export default function Clinic({ player, onComplete, onHome }) {
  const [phase, setPhase] = useState("intro"); // intro | diagnose | bridge | drill | stuck | done
  const [mastery, setMastery] = useState(INITIAL_MASTERY);
  const [queue, setQueue] = useState([]);       // これから出す問題
  const [cur, setCur] = useState(null);
  const [choices, setChoices] = useState([]);
  const [selected, setSelected] = useState(null);
  const [locked, setLocked] = useState(false);
  const [attempts, setAttempts] = useState([]); // [{id, correct}] 集計エンジン用
  const [results, setResults] = useState([]);   // [{q, ans, userAns, ok}] 保存用
  const [answered, setAnswered] = useState(0);
  const [misconception, setMisconception] = useState("");
  const savedRef = useRef(false);

  const serve = (p) => { setCur(p); setChoices(makeChoices(p.answerNumeric)); setSelected(null); setLocked(false); };

  // 診断スタート
  function start() {
    const diag = pickDiagnose();
    setQueue(diag);
    setPhase("diagnose");
    serve(diag[0]);
  }

  // つまずきカード（最頻のmisconception）を作り、処方ドリルを準備
  function buildPrescription(attemptsNow) {
    // 既存エンジンで苦手タグ→復習問題を推薦
    const { weakTags } = analyzeAttempts(attemptsNow);
    let drill = recommendReview(weakTags, 8).filter((p) => p.autoGradable && p.answerNumeric != null);
    // 推薦が少なければ、対象スキルの山からやさしい順に補う
    const seen = new Set(attemptsNow.map((a) => a.id).concat(drill.map((p) => p.id)));
    const filler = POOL.filter((p) => !seen.has(p.id)).sort((a, b) => a.level - b.level);
    drill = [...drill, ...filler].slice(0, DRILL_CAP);
    // 最頻のつまずき（誤答した問題から）
    const wrongIds = new Set(attemptsNow.filter((a) => !a.correct).map((a) => a.id));
    const counts = {};
    for (const p of POOL) if (wrongIds.has(p.id) && p.misconception) counts[p.misconception] = (counts[p.misconception] || 0) + 1;
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    setMisconception(top ? top[0] : "");
    return drill;
  }

  function answer(val, idx) {
    if (locked || !cur) return;
    const ok = isCorrect(val, cur.answerNumeric);
    setSelected(idx); setLocked(true);
    ok ? sfx.correct() : sfx.wrong();

    const m2 = updateMastery(mastery, dOf(cur), ok ? 1 : 0);
    setMastery(m2);
    const at = [...attempts, { id: cur.id, correct: ok }];
    setAttempts(at);
    setResults((r) => ok ? r : [...r, { q: cur.q, ans: cur.answer, userAns: val, ok }]);
    const nAns = answered + 1;
    setAnswered(nAns);

    setTimeout(() => {
      if (phase === "diagnose") {
        const rest = queue.slice(1);
        if (rest.length) { setQueue(rest); serve(rest[0]); return; }
        // 診断おわり → 処方を作って橋渡し画面へ（全問正解なら卒業へ）
        const drill = buildPrescription(at);
        setQueue(drill);
        if (m2 >= THETA && at.every((a) => a.correct)) { finish(m2, at); return; }
        setPhase("bridge");
        return;
      }
      // drill中
      if (m2 >= THETA && nAns >= MIN_ANSWERS) { finish(m2, at); return; }
      const rest = queue.slice(1);
      if (!rest.length) { setPhase("stuck"); return; }  // 上限まで来た→続けるか選ぶ（まだ保存しない）
      setQueue(rest); serve(rest[0]);
    }, ok ? 420 : 720);
  }

  // 上限まで来てまだ合格していない時に、追加ドリルで続ける
  function continueDrill() {
    const seen = new Set(attempts.map((a) => a.id));
    const more = POOL.filter((p) => !seen.has(p.id)).sort((a, b) => a.level - b.level).slice(0, MORE_N);
    if (!more.length) { finish(mastery, attempts); return; }
    setQueue(more); setPhase("drill"); serve(more[0]);
  }

  function startDrill() {
    setPhase("drill");
    if (queue.length) serve(queue[0]);
    else finish(mastery, attempts);
  }

  function finish(mFinal, at) {
    setPhase("done");
    if (savedRef.current) return;
    savedRef.current = true;
    const correct = at.filter((a) => a.correct).length;
    const wrong = at.length - correct;
    const graduated = mFinal >= THETA;
    const xp = correct * 5 + (graduated ? 15 : 0);
    onComplete?.({ skillKey: SKILL.key, skillName: SKILL.name, correct, wrong, mastery: mFinal, graduated, xp, results });
  }

  // ---------- イントロ ----------
  if (phase === "intro") {
    return (
      <div className="app">
        <Header player={player} back="ホーム" onBack={onHome} />
        <div className="content">
          <div className="glass" style={{ padding: 20, textAlign: "center" }}>
            <div style={{ fontSize: 44 }}>🩺</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: "#fff", marginTop: 4 }}>こまり感クリニック</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,.7)", marginTop: 8, lineHeight: 1.7 }}>
              まず<b style={{ color: "#fde047" }}>{DIAG_N}問の診断</b>で、あなたの「つまずき」を見つけます。<br />
              そのあと、つまずいた所<b style={{ color: "#fde047" }}>だけ</b>を練習。<br />
              習熟度が合格ラインを超えたら<b style={{ color: "#4ade80" }}>卒業</b>です。
            </div>
            <div style={{ marginTop: 14, fontSize: 12, color: "rgba(255,255,255,.55)" }}>
              今回のテーマ：<span className="q-pill">{SKILL.emoji} {SKILL.name}</span>
            </div>
            <button onClick={start} data-sfx="none" style={primaryBtn}>診断スタート →</button>
          </div>
        </div>
      </div>
    );
  }

  // ---------- つまずきカード（橋渡し） ----------
  if (phase === "bridge") {
    const correct = attempts.filter((a) => a.correct).length;
    return (
      <div className="app">
        <Header player={player} back="ホーム" onBack={onHome} />
        <div className="content">
          <div className="glass" style={{ padding: 20, textAlign: "center" }}>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,.6)" }}>診断おわり（{correct}/{attempts.length} 正解）</div>
            <div style={{ fontSize: 40, marginTop: 6 }}>🔍</div>
            <div style={{ fontSize: 16, fontWeight: 900, color: "#fff", marginTop: 2 }}>あなたのつまずき</div>
            <div style={{
              margin: "12px auto 0", maxWidth: 420, background: "rgba(248,113,113,.12)",
              border: "1px solid rgba(248,113,113,.4)", borderRadius: 12, padding: "12px 14px",
              fontSize: 15, fontWeight: 800, color: "#fecaca", lineHeight: 1.6,
            }}>
              {misconception || "符号のあつかいを、もう少し固めよう"}
            </div>
            <MasteryBar m={mastery} />
            <div style={{ fontSize: 12.5, color: "rgba(255,255,255,.7)", marginTop: 12, lineHeight: 1.7 }}>
              ここを<b style={{ color: "#fde047" }}>処方ドリル</b>でピンポイントに練習します。<br />合格ラインを超えたら卒業！
            </div>
            <button onClick={startDrill} data-sfx="none" style={primaryBtn}>処方ドリルへ →</button>
          </div>
        </div>
      </div>
    );
  }

  // ---------- もう少し（上限まで来たが合格ライン未満：行き止まりにしない） ----------
  if (phase === "stuck") {
    const correct = attempts.filter((a) => a.correct).length;
    return (
      <div className="app">
        <Header player={player} back="ホーム" onBack={onHome} />
        <div className="content">
          <div className="glass" style={{ padding: 20, textAlign: "center" }}>
            <div style={{ fontSize: 40 }}>💪</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: "#fbbf24" }}>あと少しで卒業！</div>
            <div style={{ fontSize: 12.5, color: "rgba(255,255,255,.7)", marginTop: 6 }}>
              {attempts.length}問中 {correct}問 正解。ここまでで習熟度はここまで伸びました。
            </div>
            <MasteryBar m={mastery} />
            <div style={{ fontSize: 12.5, color: "rgba(255,255,255,.7)", marginTop: 12 }}>
              もう数問つづけて、合格ラインを超えよう。
            </div>
            <button onClick={continueDrill} data-sfx="none" style={primaryBtn}>もう数問つづける →</button>
            <button onClick={() => finish(mastery, attempts)} data-sfx="none" style={{ ...primaryBtn, background: "transparent", border: "1px solid rgba(255,255,255,.25)", marginTop: 10 }}>
              ここで終える
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---------- 結果（卒業 / あと少し） ----------
  if (phase === "done") {
    const graduated = mastery >= THETA;
    const correct = attempts.filter((a) => a.correct).length;
    return (
      <div className="app">
        <Header player={player} />
        <div className="content">
          <div className="glass" style={{ padding: 22, textAlign: "center" }}>
            <div style={{ fontSize: 50 }}>{graduated ? "🎉" : "💪"}</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: graduated ? "#4ade80" : "#fbbf24" }}>
              {graduated ? "できるようになった！" : "ぐっと伸びた！あと少し"}
            </div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,.7)", marginTop: 6 }}>
              {SKILL.emoji} {SKILL.name}
            </div>
            <MasteryBar m={mastery} />
            <div style={{ fontSize: 12.5, color: "rgba(255,255,255,.7)", marginTop: 8 }}>
              {attempts.length}問中 {correct}問 正解
            </div>
            <div style={{ marginTop: 10 }}>
              <span className="xp-pill">✨ +{correct * 5 + (graduated ? 15 : 0)} XP</span>
            </div>
            {graduated && (
              <div style={{ fontSize: 12.5, color: "#86efac", fontWeight: 700, marginTop: 10 }}>
                つまずきを克服できました。別のスキルにも挑戦してみよう！
              </div>
            )}
            <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
              {!graduated && <button onClick={start} data-sfx="none" style={{ ...primaryBtn, marginTop: 0, background: "transparent", border: "1px solid rgba(255,255,255,.25)" }}>もう一度</button>}
              <button onClick={onHome} data-sfx="none" style={{ ...primaryBtn, marginTop: 0 }}>🏠 ホーム</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---------- 出題（診断 / ドリル共通） ----------
  if (!cur) {
    return (
      <div className="app">
        <Header player={player} back="ホーム" onBack={onHome} />
        <div className="content"><div className="glass">問題が見つかりませんでした。</div></div>
      </div>
    );
  }
  const isDiag = phase === "diagnose";
  return (
    <div className="app">
      <Header player={player} back="やめる" onBack={onHome} />
      <div className="content">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <span className="q-pill">{isDiag ? "🔍 診断" : "🩹 処方ドリル"}</span>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,.6)", fontWeight: 700 }}>
            {isDiag ? `${attempts.length + 1} / ${DIAG_N}` : `習熟度 ${Math.round(mastery * 100)}%`}
          </span>
        </div>
        {!isDiag && <MasteryBar m={mastery} />}
        <div className="qcard">
          <span className="q-pill">{SKILL.emoji} {SKILL.name}</span>
          <div className="q-text"><MathText>{cur.q}</MathText></div>
          <div className={"choices-grid" + (locked && selected != null && !isCorrect(choices[selected], cur.answerNumeric) ? " answer-shake" : "")}>
            {choices.map((c, i) => {
              const isAns = isCorrect(c, cur.answerNumeric);
              let cls = "choice-btn";
              if (locked) {
                if (i === selected && !isAns) cls += " wrong";
                else if (isAns) cls += i === selected ? " correct" : " reveal";
              }
              return (
                <button key={i} className={cls} data-sfx="none" disabled={locked} onClick={() => answer(c, i)}><MathText>{c}</MathText></button>
              );
            })}
          </div>
          {isDiag && (
            <div style={{ fontSize: 11.5, color: "rgba(255,255,255,.45)", marginTop: 10, textAlign: "center" }}>
              ※ 診断中は答えだけ。つまずきは後でまとめて教えます。
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const primaryBtn = {
  width: "100%", marginTop: 18, padding: "13px", borderRadius: 12, border: "none",
  cursor: "pointer", fontSize: 16, fontWeight: 900, color: "#fff", background: "#6366f1",
};
