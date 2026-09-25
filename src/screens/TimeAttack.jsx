// ============================================================
// TimeAttack.jsx — タイムアタックモード ＝ 連戦バトル（ガントレット）
//  ・制限時間内・4択の「速い」リズムはそのまま維持。
//  ・正解＝目の前のモンスターにダメージ。数発で爆散→すぐ次が出現。
//    「正答数」を「撃破数（⚔️）」として視覚化する。
//  ・自分のキャラが下に立ち、正解ごとに前のめり＋応援の吹き出し。
//  ・残り時間わずかで「フィーバー」：1正解=2ダメージで畳みかける爽快感。
//  ・ミスは無傷（コンボが切れるだけ）。速さを楽しむモードに重い罰は付けない。
//  採点・XP・星のルールは従来どおり（scoring.js）。戦闘は“見た目”の上乗せ。
// ============================================================
import { useState, useEffect, useRef } from "react";
import Header from "../components/Header.jsx";
import Stars from "../components/Stars.jsx";
import { BigWord } from "../components/Decorations.jsx";
import MathText from "../components/MathText.jsx";
import QuestionText from "../components/QuestionText.jsx";
import MonsterSprite from "../components/MonsterSprite.jsx";
import HeroImg from "../components/HeroImg.jsx";
import ResultReview from "../components/ResultReview.jsx";
import { heroImageFor } from "../data/heroes.js";
import { MONSTERS } from "../data/monsters.js";
import { monsterImageUrl } from "../data/monsterImages.js";
import { pickHitCheer, pickMissCheer, pickKillCheer } from "../data/cheers.js";
import * as bgm from "../audio/bgm.js";
import * as sfx from "../audio/sfx.js";
import { genProblemSeeded, makeChoices, isHardProblem } from "../engine/generator.js";
import { calcStars, timeAttackXp, timeAttackCoins, timeAttackCrystal, timeAttackStreakBonus, isCorrect, parseAnswer, STAR_TARGET, XP_PER_CORRECT, XP_PENALTY_PER_WRONG, xpRepeatMultiplier } from "../engine/scoring.js";

// 選択肢・正誤判定のヘルパー
//  問題が自前の choices を持つ＝式の4択問題 → 文字列で厳密一致（数値化しない）。
//  choices が無い＝数値問題 → makeChoices で4択を作り、isCorrect で数値照合。
const shuffle = (a) => a.map((v) => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map((x) => x[1]);
const hasChoices = (q) => Array.isArray(q.choices) && q.choices.length > 0;
const choicesFor = (q) => hasChoices(q) ? shuffle([...q.choices]) : makeChoices(q.ans);
const ansEq = (val, q) => hasChoices(q) ? String(val).replace(/\s/g, "") === String(q.ans).replace(/\s/g, "") : isCorrect(val, q.ans);
import { getStars } from "../engine/progress.js";

const QUIZ_TIME = 40;
const FEVER_SEC = 10;       // 残りこの秒数で「フィーバー」（1正解=2ダメージ）
const DAILY_BONUS_XP = 50;  // その日の初クリア（星1以上）に一度だけ付くボーナスXP
// 単元（章）ごとの制限時間。基本は40秒。途中計算（式を書く・読み取る）が
// 必要な単元ほど長く取る：軽い=40 / 途中計算=60 / 重い=80 / 最重量=100。
const TA_TIME_BY_CHAPTER = {
  // ── 中1 ── 標準中心の計算章(c1/c2/c4)は普通の子が標準★1を安定して取れるよう+10秒
  c1: 50, c2: 50, c3: 60, c4: 50, c5: 40, c6: 60, c7: 40,
  // ── 中2 ──
  g2c1: 60, g2c2: 100, g2c3: 60, g2c4: 40, g2c5: 40, g2c6: 60,
  // ── 中3 ──
  g3c1: 60, g3c2: 60, g3c3: 80, g3c4: 60, g3c5: 40, g3c6: 40, g3c7: 60, g3c8: 40,
};
const taTimeFor = (chapter, unit) =>
  (unit && typeof unit.taTime === "number" && unit.taTime) ||
  (chapter && TA_TIME_BY_CHAPTER[chapter.id]) || QUIZ_TIME;
const todayStr = () => new Date().toLocaleDateString("ja-JP");

// この回の「敵の列」を組む。挑戦中の章（無ければ苦手の単元）に合ったモンスターを並べる。
function buildGauntlet(chapter, weak, weakUnits) {
  const units = MONSTERS.filter((m) => m.kind === "unit");
  let pool = [];
  if (chapter) pool = units.filter((m) => m.chapterId === chapter.id);
  if (!pool.length && weak && weakUnits.length) {
    const ids = new Set(weakUnits.map((w) => w.unitId));
    pool = units.filter((m) => ids.has(m.unitId));
  }
  if (!pool.length && chapter) pool = units.filter((m) => m.grade === chapter.grade);
  if (!pool.length) pool = units;
  return shuffle(pool);
}
// 何発で倒れるか（撃破がポンポン出るよう軽め。進むほど少しだけ硬く）
const hitsToKill = (k) => Math.min(4, 2 + Math.floor(k / 4));

// 応援メッセージは data/cheers.js に集約（バトルと共通・バリエーション多め）。

export default function TimeAttack({ player, chapter, unit, level, onComplete, onBackToMap, onHome, weak = false, weakUnits = [], onWeakStart, onHaichi, onRelearn, onOpenRelearnList, onAttempt }) {
  const quizTime = taTimeFor(chapter, unit);
  // 通常TAは「暗算が非常に厳しい問題」を除外して出題（計算王の単元別じっくりで扱う）。
  //  seed付き生成（サーバー採点の下地）。isHardProblemの判定はq/ansだけ見るのでseed有無に影響されない。
  const genGood = (recent) => {
    for (let i = 0; i < 14; i++) {
      const p = genProblemSeeded(unit, level, recent);
      if (!p) return null;
      if (weak || !isHardProblem(p)) return p;
    }
    return genProblemSeeded(unit, level, recent); // 易しいのが見つからない時はそのまま
  };
  const [phase, setPhase] = useState("intro"); // intro | playing | finish | end
  const [timeLeft, setTimeLeft] = useState(quizTime);
  const [q, setQ] = useState(() => genGood([]));
  const [choices, setChoices] = useState(() => []);
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(null);
  const [locked, setLocked] = useState(false);
  const [showRing, setShowRing] = useState(false); // 正解の光る◯
  const [shakeAns, setShakeAns] = useState(false); // 不正解の横揺れ
  const [summary, setSummary] = useState(null);    // 結果のXP内訳
  const savedRef = useRef(false);
  const recentRef = useRef([]);                     // 直近に出した問題ID（重複・かたより対策）

  // ── 連戦バトルの状態 ────────────────────────────
  const gauntletRef = useRef(buildGauntlet(chapter, weak, weakUnits));
  const [mon, setMon] = useState(() => gauntletRef.current[0] || null);
  const [monHp, setMonHp] = useState(() => hitsToKill(0));
  const monHpRef = useRef(hitsToKill(0));
  const monMaxRef = useRef(hitsToKill(0));
  const killRef = useRef(0);
  const [kills, setKills] = useState(0);
  const [killed, setKilled] = useState([]);         // 倒したモンスター（結果で並べる）
  const [monState, setMonState] = useState("idle"); // idle | damage | dead
  const [animKey, setAnimKey] = useState(0);
  const [deadParticles, setDeadParticles] = useState([]);
  const [monDmg, setMonDmg] = useState(null);
  const [dmgKey, setDmgKey] = useState(0);
  const [heroAtk, setHeroAtk] = useState(false);    // キャラの前のめり
  const [cheer, setCheer] = useState(null);         // 応援の吹き出し { text, fever, key }
  const [killPop, setKillPop] = useState(null);     // 「○体！」ポップ
  const [feverOn, setFeverOn] = useState(false);    // フィーバー突入演出（1回だけ）

  // 最初の問題の選択肢を用意
  useEffect(() => { if (q) { setChoices(choicesFor(q)); recentRef.current = [q.id]; } }, []); // eslint-disable-line

  // カウントダウン
  useEffect(() => {
    if (phase !== "playing") return;
    const id = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) { clearInterval(id); setPhase("finish"); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [phase]);

  // フィーバー突入の合図（残りFEVER_SEC秒）
  useEffect(() => {
    if (phase === "playing" && !feverOn && timeLeft <= FEVER_SEC && timeLeft > 0) {
      setFeverOn(true);
      setKillPop({ text: "🔥 フィーバー！", key: "fever", fever: true });
      setTimeout(() => setKillPop((kp) => (kp && kp.fever ? null : kp)), 1100);
    }
  }, [timeLeft, phase, feverOn]);

  // 終了の合図でジングルを鳴らす
  useEffect(() => { if (phase === "finish") bgm.play("timeattack_end", { loop: false }); }, [phase]);

  // 終了時に1回だけ結果を保存
  useEffect(() => {
    if (phase !== "end" || savedRef.current) return;
    savedRef.current = true;
    const stars = calcStars(correct, level);
    const streakBonus = timeAttackStreakBonus(results.map((r) => r.ok));
    // 苦手モード：単元の星は付けず、XPは控えめ（正解ベース＋連続ボーナス−ミス）
    if (weak) {
      const xp = Math.max(0, correct * XP_PER_CORRECT + streakBonus - wrong * XP_PENALTY_PER_WRONG);
      const coins = timeAttackCoins({ correct, level });
      setSummary({ xp, baseXp: xp, mult: 1, penalty: wrong * XP_PENALTY_PER_WRONG, coins, dailyBonus: 0 });
      onComplete({ correct, wrong, stars, maxStreak, xp, coins, results, weak: true, kills });
      return;
    }
    const prevStars = getStars(player, unit.id, level);
    const newStars = Math.max(0, stars - prevStars);
    const baseXp = timeAttackXp({ correct, wrong, stars, newStars, streakBonus });
    const mult = xpRepeatMultiplier(player.playLog, `${unit.id}-${level}`, todayStr());
    // 1日1回ボーナス：その日まだボーナスを得ておらず、今回クリア（星1以上）なら+50XP。
    const dailyBonus = (stars >= 1 && player.lastDailyBonusDate !== todayStr()) ? DAILY_BONUS_XP : 0;
    const xp = Math.round(baseXp * mult) + dailyBonus;
    const coins = timeAttackCoins({ correct, level });
    const crystal = timeAttackCrystal({ correct, wrong, stars });
    setSummary({ xp, baseXp, mult, penalty: wrong * XP_PENALTY_PER_WRONG, coins, crystal, dailyBonus });
    onComplete({ chapter, unit, level, correct, wrong, stars, maxStreak, xp, coins, results, kills, dailyBonus });
  }, [phase]); // eslint-disable-line

  // モンスターを倒して次を出す
  function killCurrentMonster() {
    const cur = mon;
    sfx.correct();
    setMonState("dead"); setAnimKey((k) => k + 1);
    if (cur && cur.deathColors) {
      const parts = Array.from({ length: 14 }, (_, i) => {
        const ang = (i * (360 / 14)) * Math.PI / 180;
        const r = 44 + (i % 5) * 12;
        return {
          i, size: 6 + (i % 4) * 2, color: cur.deathColors[i % cur.deathColors.length],
          tx: Math.cos(ang) * r, ty: Math.sin(ang) * r, rot: (i * 53) % 360, round: i % 2 === 0,
        };
      });
      setDeadParticles(parts);
      setTimeout(() => setDeadParticles([]), 700);
    }
    const k = killRef.current + 1;
    killRef.current = k;
    setKills(k);
    if (cur) setKilled((p) => (p.length < 30 ? [...p, cur] : p));
    setKillPop({ text: `${k}体撃破！`, key: k });
    setCheer({ text: pickKillCheer(), fever: false, key: "kill" + k }); // 撃破時のセリフ
    setTimeout(() => setKillPop((kp) => (kp && kp.key === k ? null : kp)), 800);
    // 次の敵を出す
    const pool = gauntletRef.current;
    const next = pool.length ? pool[k % pool.length] : cur;
    const nextHp = hitsToKill(k);
    monHpRef.current = nextHp; monMaxRef.current = nextHp;
    setTimeout(() => {
      setMon(next); setMonHp(nextHp); setMonState("idle"); setAnimKey((a) => a + 1);
    }, 260);
  }

  function answer(val, idx) {
    if (!q || locked || phase !== "playing") return;
    const ok = ansEq(val, q);
    setSelected(idx);
    setLocked(true);
    const ns = ok ? streak + 1 : 0;
    setStreak(ns);
    setMaxStreak((m) => Math.max(m, ns));
    setResults((p) => [...p, { q: q.q, ans: q.ans, userAns: parseFloat(val), ok }]);
    // サーバー権威(Lv2)の影運用：seedがある問題だけ裏で送信
    onAttempt?.({ unitId: q.unitId, level: q.level, templateId: q.id, seed: q.seed ?? null, userAnswer: String(val), ok, skill: q.skill });
    if (ok) {
      setCorrect((c) => c + 1);
      setShowRing(true); setTimeout(() => setShowRing(false), 700); // 光る◯
      setHeroAtk(true); setTimeout(() => setHeroAtk(false), 340);   // キャラ前のめり
      const fever = timeLeft <= FEVER_SEC;
      const hits = fever ? 2 : 1;
      setCheer({ text: pickHitCheer({ streak: ns, fever, timeLeft }), fever, key: correct + 1 });
      const newHp = monHpRef.current - hits;
      if (newHp <= 0) {
        killCurrentMonster();
      } else {
        sfx.correct();
        monHpRef.current = newHp; setMonHp(newHp);
        setMonState("damage"); setAnimKey((k) => k + 1);
        setMonDmg(fever ? "FEVER!" : "HIT!"); setDmgKey((k) => k + 1);
        setTimeout(() => setMonState("idle"), 260);
      }
    } else {
      setWrong((w) => w + 1);
      sfx.wrong();
      setShakeAns(true); setTimeout(() => setShakeAns(false), 460); // 横揺れ
      setCheer({ text: pickMissCheer(), fever: false, key: -(wrong + 1) });
    }
    setTimeout(() => {
      setLocked(false); setSelected(null);
      const nq = genGood(recentRef.current);
      if (nq) {
        setQ(nq); setChoices(choicesFor(nq));
        recentRef.current = [...recentRef.current, nq.id].slice(-4);
      }
    }, ok ? 350 : 650);
  }

  // ---- 結果画面 ----
  if (phase === "end") {
    const stars = calcStars(correct, level);
    const t = STAR_TARGET[level];
    return (
      <div className="app">
        <Header player={player} />
        <div className="content">
          <div className="res-card">
            <div style={{ textAlign: "center", marginBottom: 8 }}>
              <div className="big-n" style={{ color: "#4f46e5" }}>⚔️ {kills}</div>
              <div style={{ fontSize: 13, color: "#94a3b8" }}>体 撃破！（正解 {correct} / {correct + wrong}問・{quizTime}秒）</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: "#1e1b4b", marginTop: 4 }}>
                {weak
                  ? (correct >= 8 ? "🎯 よくがんばった！" : "🎯 苦手にチャレンジ！おつかれさま")
                  : (stars === 3 ? "🎉 パーフェクト！" : stars >= 1 ? "✅ クリア！" : "😊 もう少し！")}
              </div>
              {/* 倒したモンスターを並べる（コレクションへの動機づけ） */}
              {killed.length > 0 && (
                <div className="ta-kill-row">
                  {killed.slice(0, 16).map((m, i) => {
                    const url = monsterImageUrl(m, "small");
                    return (
                      <div key={i} className="ta-kill-chip" title={m.name}>
                        {url ? <img src={url} alt={m.name} draggable={false} /> : <span style={{ fontSize: 18 }}>👾</span>}
                      </div>
                    );
                  })}
                </div>
              )}
              {!weak && <div style={{ marginTop: 7 }}><Stars count={stars} size={24} /></div>}
              {summary && (
                <div style={{ marginTop: 9 }}>
                  {summary.crystal > 0 && (
                    <span className="xp-pill" style={{ marginLeft: 6, background: "linear-gradient(135deg,#22d3ee,#67e8f9)", color: "#063b44" }}>
                      💎 +{summary.crystal} クリスタル
                    </span>
                  )}
                  {!weak && summary.crystal === 0 && (
                    <div style={{ fontSize: 11, color: "#0e7490", fontWeight: 700, marginTop: 5 }}>
                      💎 クリスタルは「星1つ以上 ＆ 正答率60%以上」でもらえます
                    </div>
                  )}
                  {summary.mult < 1 && (
                    <div style={{ fontSize: 11, color: "#92400e", fontWeight: 700, marginTop: 5 }}>
                      {summary.mult === 0.6 ? "今日2回目以降のためXP×0.6" : "クリア済みの再挑戦のためXP⅓"}（通常なら{summary.baseXp}XP）
                    </div>
                  )}
                  {summary.penalty > 0 && (
                    <div style={{ fontSize: 11, color: "#dc2626", fontWeight: 700, marginTop: 5 }}>
                      ミス{wrong}問で −{summary.penalty}XP（間違い1問につき2問分マイナス）
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="stats-grid">
              <div className="stat-box"><div className="stat-n" style={{ color: "#7c3aed" }}>{kills}</div><div className="stat-l">撃破</div></div>
              <div className="stat-box"><div className="stat-n" style={{ color: "#16a34a" }}>{correct}</div><div className="stat-l">正解</div></div>
              <div className="stat-box"><div className="stat-n" style={{ color: "#dc2626" }}>{wrong}</div><div className="stat-l">ミス</div></div>
              <div className="stat-box"><div className="stat-n" style={{ color: "#d97706" }}>{maxStreak}</div><div className="stat-l">最大連続</div></div>
            </div>
            {!weak && (
              <div style={{ textAlign: "center", marginBottom: 6, fontSize: 11, color: "#94a3b8" }}>
                目標：⭐{t.s1}問 ⭐⭐{t.s2}問 ⭐⭐⭐{t.s3}問
              </div>
            )}

            {/* 苦手モード：今回まちがえた問題を振り返る */}
            {weak && results.some((r) => !r.ok) && (
              <div className="glass" style={{ padding: "10px 12px", margin: "4px 0 10px", textAlign: "left" }}>
                <div style={{ fontSize: 12, fontWeight: 900, color: "#dc2626", marginBottom: 6 }}>📝 ここを復習しよう</div>
                {results.filter((r) => !r.ok).slice(0, 5).map((r, i) => (
                  <div key={i} style={{ fontSize: 12, color: "#475569", lineHeight: 1.6, borderTop: i ? "1px solid rgba(0,0,0,.06)" : "none", paddingTop: i ? 5 : 0 }}>
                    <MathText>{r.q}</MathText> <span style={{ color: "#16a34a", fontWeight: 800 }}>＝ <MathText>{r.ans}</MathText></span>
                  </div>
                ))}
              </div>
            )}

            {/* 通常モード：まちがい直し・復習導線（苦手チップ／学び直す／葉一解説） */}
            {!weak && (
              <ResultReview
                wrongs={results.filter((r) => !r.ok)}
                unit={unit}
                weakUnits={weakUnits}
                onRelearn={onRelearn}
                onHaichi={onHaichi}
                onOpenRelearnList={onOpenRelearnList}
              />
            )}
            {!weak && onWeakStart && weakUnits.length > 0 && (
              <button className="rbtn p" style={{ width: "100%", marginBottom: 8 }} onClick={onWeakStart}>🎯 苦手だけタイムアタック</button>
            )}

            <div className="res-acts">
              {weak ? (
                <>
                  <button className="rbtn s" onClick={onWeakStart}>🔁 もう一回</button>
                  <button className="rbtn p" onClick={onHome}>🏠 ホーム</button>
                </>
              ) : (
                <>
                  <button className="rbtn s" onClick={onBackToMap}>🗺️ 単元へ</button>
                  <button className="rbtn p" onClick={onHome}>🏠 ホーム</button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---- プレイ中 ----
  if (!q) {
    return (
      <div className="app">
        <Header player={player} back="戻る" onBack={onBackToMap} />
        <div className="content"><div className="glass">この単元の問題が見つかりませんでした。</div></div>
      </div>
    );
  }

  const fever = phase === "playing" && timeLeft <= FEVER_SEC;
  const monHpPct = Math.max(0, Math.round((monHp / Math.max(1, monMaxRef.current)) * 100));

  return (
    <div className="app">
      {phase === "intro" && <BigWord text="START!" color="#4ade80" onDone={() => setPhase("playing")} />}
      {phase === "finish" && <BigWord text="終了！" color="#fbbf24" onDone={() => setPhase("end")} />}
      {showRing && <div className="correct-flash show" style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 55 }} />}
      <Header player={player} back="やめる" onBack={onBackToMap} />
      <div className="content">
        {/* タイマー＋撃破数＋コンボ */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div style={{ fontFamily: "'M PLUS Rounded 1c',sans-serif", fontSize: 40, fontWeight: 900, color: timeLeft > 16 ? "#4ade80" : timeLeft > 8 ? "#fb923c" : "#f87171" }}>
            {timeLeft}<span style={{ fontSize: 14 }}>秒</span>
          </div>
          <div style={{ display: "flex", gap: 9, alignItems: "center" }}>
            <div className="stat-box" style={{ background: "rgba(124,58,237,.16)" }}>
              <div className="stat-n" style={{ color: "#c4b5fd" }}>⚔️{kills}</div><div className="stat-l" style={{ color: "rgba(255,255,255,.45)" }}>撃破</div>
            </div>
            <div className="stat-box" style={{ background: "rgba(255,255,255,.06)" }}>
              <div className="stat-n" style={{ color: "#f87171" }}>{wrong}</div><div className="stat-l" style={{ color: "rgba(255,255,255,.4)" }}>ミス</div>
            </div>
          </div>
        </div>

        {/* 戦闘ステージ */}
        <div className={"ta-stage" + (fever ? " fever" : "")}>
          {mon && (
            <div className="ta-enemy-bar">
              <span className="ta-enemy-name" style={{ color: mon.color }}>{mon.name}</span>
              <div className="ta-hp-track">
                <div className="ta-hp-fill" style={{ width: monHpPct + "%", background: monHpPct > 50 ? "linear-gradient(90deg,#22c55e,#4ade80)" : monHpPct > 25 ? "linear-gradient(90deg,#eab308,#fbbf24)" : "linear-gradient(90deg,#dc2626,#f87171)" }} />
              </div>
            </div>
          )}
          {/* 応援の吹き出し（キャラの頭上） */}
          {cheer && (
            <div key={cheer.key} className={"ta-cheer" + (cheer.fever ? " fever" : "")}>{cheer.text}</div>
          )}
          {/* 自分のキャラ（白背景透明・白フチ無し）。左下に立って右の敵と向かい合う */}
          <HeroImg src={heroImageFor(player.avatar)} alt="あなた" className={"ta-hero" + (heroAtk ? " attack" : "")} />
          {/* モンスター（右側に大きく配置） */}
          <div className="ta-mon">
            {showRing && <div className="correct-ring show" />}
            {monDmg && <div key={dmgKey} className="mon-dmg-num show" style={{ color: fever ? "#fde047" : "#fff" }}>{monDmg}</div>}
            <MonsterSprite monster={mon} state={monState} animKey={animKey} size={150} />
            {deadParticles.length > 0 && (
              <div className="bt-particles">
                {deadParticles.map((p) => (
                  <div key={p.i} className="bt-dp burst" style={{
                    width: p.size, height: p.size, background: p.color,
                    borderRadius: p.round ? "50%" : "2px",
                    "--tx": p.tx + "px", "--ty": p.ty + "px", "--r": p.rot + "deg",
                    animationDelay: p.i * 0.03 + "s",
                  }} />
                ))}
              </div>
            )}
          </div>
          {killPop && (
            killPop.fever
              ? <div className="ta-fever-banner">{killPop.text}</div>
              : <div className="ta-kill-pop">{killPop.text}</div>
          )}
        </div>

        {streak >= 3 && <div style={{ textAlign: "center", color: "#fbbf24", fontWeight: 700, fontSize: 13, marginBottom: 8 }}>🔥 {streak}連続！</div>}

        <div className="qcard">
          <span className="q-pill">{unit.name}</span>
          <div className="q-text"><QuestionText text={q.q} furigana={!!player.furigana} readAloud={false} /></div>
          <div className={"choices-grid" + (shakeAns ? " answer-shake" : "")}>
            {choices.map((c, i) => {
              const isAns = ansEq(c, q);
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
        </div>
      </div>
    </div>
  );
}
