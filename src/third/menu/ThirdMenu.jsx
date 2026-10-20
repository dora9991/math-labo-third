// ============================================================
// ThirdMenu.jsx — 数学ラボ3のメニュー（ホーム画面）。2026-09-21 kazu指定の構成。
//
//  メニュー：学習を始める／学習の記録／パーティ編成／設定
//   学習を始める → 単元(1章〜)→ 小単元 → 学ぶ(はいち)・練習(4択)・バトルモード(デモ)／小単元の最後に「章のボスと戦う」
//  画面の位置(pos)は App が持つ（はいち・練習・バトルから戻ってきた時に、同じ小単元の画面へ戻すため）。
//  デザインは既存の部品(GameButton/Header)を使った仮置き。仕上げはCodex側で。
// ============================================================
import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import Header from "../../components/Header.jsx";
import GameButton from "../../components/GameButton.jsx";
import { MathBackdrop } from "../../components/Decorations.jsx";
import { chaptersForGrade } from "../../data/index.js";
import { unitMedals, medalSummary, MEDAL_PRACTICE_TARGET } from "../medals.js";
import { battleOpen, battleOrder, chapterBattlesCleared, battleDone } from "../core.js";
import { LAP, lapOf, lapFinished, gradeEverDone, lapCrystals, lapEnemyMul } from "../lap.js";
import { findUnitById } from "../../data/index.js";
import { getChapter } from "../data/storyMap.js";
import { worldBattleFor } from "../link.js";
import { hasHaichiLessonForUnit } from "../../data/haichiCourse.js";
import RecordScreen from "./RecordScreen.jsx";
import StoryLibrary from "../story/StoryLibrary.jsx";
import { countNew, loadSeen } from "../story/storyRun.js";
import SettingsScreen from "./SettingsScreen.jsx";
import { fxScale, getFxSpeed } from "../../engine/fxSpeed.js";
import { analyzeLearner, recommendToday } from "../recommend.js";
import { profileFromRecords, tagsFromStats, mergeTags } from "../learnerProfile.js";
import TodayPlan, { UnderstandingMap } from "./TodayPlan.jsx";
import { DAILY, CRYSTAL } from "../gachaConfig.js";
import { SPECIALIST_ROSTER } from "../specialistRoster.js";

const DEX_TOTAL = SPECIALIST_ROSTER.length;

// 毎日の目標（その日の検証済みの正解が5問で 💎+1）の表示。日付は日本時間。
function dailyGoalText(state) {
  const key = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
  const d = state?.daily;
  if (d?.date === key && d.mission) return "今日の目標 ✅ たっせい！";
  const ok = d?.date === key ? d.ok || 0 : 0;
  return `今日の目標：あと${Math.max(0, DAILY.missionTarget - ok)}問せいかいで 💎+${CRYSTAL.dailyMission}`;
}

function Shell({ player, back, onBack, children, transitionKey, reverse = false, progress = null }) {
  const speed = getFxSpeed();
  const duration = Math.round(320 * fxScale(speed));
  return (
    <div className="app home-hub">
      <MathBackdrop />
      <Header player={player} back={back} onBack={onBack} progress={progress} />
      <main className="content home-content" style={{ paddingBottom: 40 }}>
        <div key={transitionKey} className={`menu-screen-transition ${reverse ? "is-reverse" : ""} ${speed === "off" ? "is-off" : ""}`} style={{ "--menu-transition-ms": `${duration}ms` }}>{children}</div>
      </main>
    </div>
  );
}

const Title = ({ children, sub }) => (
  <div className="menu-section-title">
    <div>{children}</div>
    {sub && <small>{sub}</small>}
  </div>
);

// 「はいち」「れんしゅう」のメダル2枚の表示（獲得＝金色）
// ヘッダー用：この学年で集めたメダルの数（小単元ごとに はいち・れんしゅう・バトル の3枚）。
//  以前のヘッダーは数学ラボ2の「単元サイクル」の数（ラボ3では増えない）を出していて、ずっと 0/32 のままだった。
function gradeMedalProgress(chapters, medalState) {
  const units = chapters.flatMap((c) => c.units || []);
  const done = units.reduce((a, u) => a + unitMedals(medalState, u.id).count, 0);
  return { done, total: units.length * 3, icon: "🏅", title: "この学年で集めたメダル（はいち・れんしゅう・バトル）" };
}

export function MedalPair({ m, size = 26, battleLocked = false }) {
  const dot = (on, icon, locked = false) => (
    <span title={locked ? "前のバトルをクリアすると開くよ" : undefined} style={{
      position: "relative", display: "inline-grid", placeItems: "center", width: size, height: size, borderRadius: "50%", fontSize: size * 0.55,
      background: on ? "radial-gradient(circle at 35% 30%,#fff7c2,#fbbf24 55%,#b45309)" : "rgba(255,255,255,.07)",
      border: on ? "2px solid #fde68a" : "2px dashed rgba(255,255,255,.25)", filter: on ? "none" : "grayscale(1) opacity(.5)",
    }}>{icon}{locked && <span style={{ position: "absolute", right: -5, bottom: -5, fontSize: size * 0.5, filter: "none" }}>🔒</span>}</span>
  );
  return <span style={{ display: "inline-flex", gap: 6 }}>{dot(m.haichi, "📺")}{dot(m.practice, "✏️")}{dot(m.battle, "⚔️", battleLocked)}</span>;
}

export default function ThirdMenu(props) {
  const { player, records, grade, pos, setPos, onSetGrade, updatePlayer, medalState } = props; // medalState＝サーバーが付与したメダル(thirdApi.getState().state)
  const view = pos?.view || "main";
  const [lapAsk, setLapAsk] = useState(false); // 「もう一周」の確認
  const [lapBusy, setLapBusy] = useState(false);
  const [lapMsg, setLapMsg] = useState(""); // 失敗したときのひとこと
  const [lapStarted, setLapStarted] = useState(0); // 周回を始めた直後の演出（何周目か）
  const lap = lapOf(medalState);
  const doNewLap = async () => {
    if (lapBusy || !props.onNewLap) return;
    setLapBusy(true); setLapMsg("");
    const r = await props.onNewLap();
    setLapBusy(false);
    if (r?.ok) { setLapAsk(false); setLapStarted(r.lap); } else setLapMsg("うまくいかなかったよ。もういちど ためしてね");
  };
  const chapters = chaptersForGrade(grade);
  const chapter = chapters.find((c) => c.id === pos?.chapterId) || null;
  const unit = chapter?.units?.find((u) => u.id === pos?.unitId) || null;
  const go = (next) => setPos(next);

  // ---- 学習の分析（理解度）と今日のおすすめ（recommend.js）
  //  解答の記録は、サーバーの my_profile（全モード・どの端末で解いた分も）を使う。無いとき（ゲスト・通信エラー）は端末の records。
  const learnProfile = props.learnProfile;
  const analysis = useMemo(() => analyzeLearner({
    units: learnProfile?.source === "server" ? learnProfile.units || {} : profileFromRecords(records || []),
    tags: mergeTags(learnProfile?.tags || {}, tagsFromStats(player?.mistakeTagStats)),
    mistakes: props.mistakes || [], medalState, quizWeakUnits: props.quizWeakUnits || [], grade,
  }), [learnProfile, records, player?.mistakeTagStats, props.mistakes, medalState, props.quizWeakUnits, grade]);
  const todayCards = useMemo(() => recommendToday(analysis), [analysis]);

  // ---- メニュー
  if (view === "main") {
    const weak = props.quizWeakUnits || [];
    return (
      <Shell player={player} transitionKey={view} progress={gradeMedalProgress(chapters, medalState)}>
        <div className="menu-title-lockup">
          <div className="home-title-tab"><span>ASTRA ACADEMY ── ADVENTURER'S ARCHIVE</span><b>冒険の書</b><i>MENU</i></div>
          <div>{player.name ? `${player.name}、` : ""}きょうも数学をたのしもう！</div>
          {lap > 1 && <div style={{ marginTop: 6 }}><span style={{ display: "inline-block", fontSize: 12, fontWeight: 900, color: "#3a2a00", background: "linear-gradient(135deg,#fde68a,#f59e0b)", borderRadius: 999, padding: "3px 12px" }}>🔁 {lap}周目　敵が少し強い（×{lapEnemyMul(lap).toFixed(2).replace(/0$/, "")}）</span></div>}
        </div>
        {/* もう一周：全学年（中1〜中3）をクリアしたら。仲間はそのまま、物語の進みだけ戻す */}
        {props.onNewLap && lapFinished(medalState) && (
          <section className="home-alert" style={{ marginBottom: 14 }}>
            <b>🎉 全学年クリア！　もう一周できるよ</b>
            <GameButton tone="gold" icon="🔁" onClick={() => { setLapMsg(""); setLapAsk(true); }}><strong>もう一周する（{lap + 1}周目）</strong><small>仲間・レベル・メダルはそのまま。1章から また冒険しよう</small></GameButton>
          </section>
        )}
        {weak.length > 0 && (
          <section className="home-alert" style={{ marginBottom: 14 }}>
            <b>MISSION UPDATE　苦手が見つかったよ</b>
            {weak.map((u) => (
              <GameButton key={u.unitId} tone="gold" onClick={() => props.onQuizWeakUnitClick?.(u.unitId)}>{u.name || u.unitId}</GameButton>
            ))}
          </section>
        )}
        {/* 今日のおすすめ（2026-09-30）：理解度・難易度・誤答・忘れかけ から、のびしろ／ふくしゅう／ちょうせん・つぎへ の最大3枚 */}
        <TodayPlan cards={todayCards} grade={grade} goalText={dailyGoalText(medalState)} onStart={(c) => props.onTodayPick?.(c)} onMap={() => go({ view: "understanding" })} />
        <div className="astra-menu-tiles">
          <GameButton className="astra-menu-tiles__primary" tone="gold" icon="📚" onClick={() => go({ view: "units" })}><strong>学習を始める</strong><small>単元をえらんで学ぼう</small></GameButton>
          {/* パソコン画面では、学習を始めるの右に1列3行で並べる（学習の記録／まちがいをなおす／パーティ編成） */}
          <div className="astra-menu-tiles__col3">
            <GameButton tone="blue" icon="📊" onClick={() => go({ view: "record" })}><strong>学習の記録</strong><small>きょうの問題数・1週間のようす</small></GameButton>
            {props.onWeakness && <GameButton tone="mint" icon="✚" onClick={props.onWeakness}><strong>まちがいをなおす</strong><small>弱点克服モード</small></GameButton>}
            <GameButton tone="violet" icon="🛡️" onClick={props.onParty}><strong>パーティ編成</strong><small>5体の仲間をえらぼう</small></GameButton>
          </div>
        </div>
        {/* 学習を始める／パーティ編成などの下の段に、残りを2列2行で並べる */}
        <div className="astra-menu-tiles__grid2">
          <GameButton tone="gold" icon="📖" onClick={() => go({ view: "story" })}><strong>ものがたり{(() => { const n = countNew(grade, medalState, loadSeen()); return n > 0 ? `　NEW ${n}` : ""; })()}</strong><small>これまでのお話を見返そう</small></GameButton>
          <GameButton tone="danger" icon="🎰" onClick={props.onGacha}><strong>ガチャ</strong><small>💎 {medalState?.crystals ?? 0}個　{(medalState?.crystals ?? 0) >= 5 ? "いま引ける！" : `あと${5 - ((medalState?.crystals ?? 0) % 5 || 0)}個で1回`}</small></GameButton>
          <GameButton tone="blue" icon="📔" onClick={props.onDex}><strong>図鑑</strong><small>{Object.keys(medalState?.dex || {}).length} / {DEX_TOTAL}体　であった仲間をコレクション</small></GameButton>
          {props.onSecret && gradeEverDone(medalState, grade) && <GameButton tone="danger" icon="👹" onClick={props.onSecret}><strong>裏ボス（中{grade}）</strong><small>中{grade}を クリアした ごほうび！ 推奨Lv30〜90 の強敵が7体</small></GameButton>}
          {props.onRoom && <GameButton tone="blue" icon="🤝" onClick={props.onRoom}><strong>みんなで戦う</strong><small>2〜5人で同時に答えて、回廊のボスへ（部屋コードで集まる）</small></GameButton>}
          <GameButton tone="mint" icon="⚙️" onClick={() => go({ view: "settings" })}><strong>設定</strong><small>学年の変更・アラーム</small></GameButton>
        </div>
        {lapAsk && createPortal( // 入れ物に変形(transform)がかかっていて、fixed のままだと画面いっぱいにならない→bodyへ出す
          <div onClick={() => !lapBusy && setLapAsk(false)} data-testid="lap-ask" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.72)", zIndex: 215, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
            <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 380, maxHeight: "90vh", overflowY: "auto", background: "linear-gradient(160deg,#0a1226,#1b2a52)", border: "2px solid #fbbf24", borderRadius: 16, padding: "18px 18px 16px", color: "#fff" }}>
              <div style={{ fontSize: 13, fontWeight: 900, color: "#fde047", letterSpacing: 1 }}>🔁 もう一周</div>
              <div style={{ fontSize: 17, fontWeight: 900, margin: "6px 0 10px" }}>{lap + 1}周目に すすむ？</div>
              <div style={{ fontSize: 12.5, lineHeight: 1.7, color: "rgba(255,255,255,.92)" }}>
                <b style={{ color: "#7cff8a" }}>そのまま残るもの</b><br />仲間・レベル・クリスタル・図鑑・メダル・ニックネーム・裏ボスと協力の記録<br />
                <b style={{ color: "#ffd166", display: "inline-block", marginTop: 6 }}>はじめに戻るもの</b><br />物語の進み（バトルがまた1章1話から・章と学年のクリア）<br />
                <b style={{ color: "#9be7ef", display: "inline-block", marginTop: 6 }}>{lap + 1}周目のきまり</b><br />
                ・「はじめてクリア」の 経験値は同じ／💎クリスタルは<b>半分</b><br />
                ・敵が <b>少し強く</b> なる（HP・攻撃 ×{lapEnemyMul(lap + 1).toFixed(2).replace(/0$/, "")}）<br />
                ・{LAP.grades.map((g) => `中${g}`).join("・")}をぜんぶクリアすると、また もう一周できる
              </div>
              {lapMsg && <div style={{ marginTop: 8, fontSize: 12, fontWeight: 800, color: "#ff9a8a" }}>{lapMsg}</div>}
              <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                <button onClick={() => setLapAsk(false)} disabled={lapBusy} data-sfx="back" style={{ flex: 1, padding: 12, borderRadius: 12, border: "1px solid rgba(255,255,255,.25)", background: "rgba(255,255,255,.06)", color: "#fff", fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>やめる</button>
                <button onClick={doNewLap} disabled={lapBusy} data-sfx="none" data-testid="lap-go" style={{ flex: 1, padding: 12, borderRadius: 12, border: "none", background: "linear-gradient(135deg,#f59e0b,#fbbf24)", color: "#3a2a00", fontWeight: 900, cursor: "pointer", fontFamily: "inherit" }}>{lapBusy ? "…" : "もう一周する！"}</button>
              </div>
            </div>
          </div>,
          document.body
        )}
        {lapStarted > 0 && createPortal(
          <div onClick={() => setLapStarted(0)} data-testid="lap-started" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.72)", zIndex: 215, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
            <div style={{ textAlign: "center", background: "linear-gradient(160deg,#0a1226,#1b2a52)", border: "2px solid #fbbf24", borderRadius: 16, padding: "22px 26px", color: "#fff", maxWidth: 340 }}>
              <div style={{ fontSize: 13, fontWeight: 900, color: "#fde047", letterSpacing: 2 }}>👑 つよくなって もう一周！</div>
              <div style={{ fontSize: 22, fontWeight: 900, margin: "8px 0" }}>{lapStarted}周目スタート！</div>
              <div style={{ fontSize: 12.5, lineHeight: 1.7, color: "rgba(255,255,255,.9)" }}>仲間はそのまま。1章から また冒険しよう。<br />敵は少し強くなっているよ！</div>
              <button style={{ marginTop: 14, padding: "10px 28px", borderRadius: 12, border: "none", background: "linear-gradient(135deg,#f59e0b,#fbbf24)", color: "#3a2a00", fontWeight: 900, cursor: "pointer", fontFamily: "inherit" }}>はじめる</button>
            </div>
          </div>,
          document.body
        )}
      </Shell>
    );
  }

  if (view === "record") {
    return (
      <Shell player={player} back="メニュー" onBack={() => go({ view: "main" })} transitionKey={view} reverse>
        <RecordScreen player={player} records={records} onWeakness={props.onWeakness} state={medalState} />
      </Shell>
    );
  }

  if (view === "understanding") {
    return (
      <Shell player={player} back="メニュー" onBack={() => go({ view: "main" })} transitionKey={view} reverse>
        <Title sub={`中学${grade}年生の単元ごとの理解度。押すと、その単元の「学ぶ・練習・バトル」へ`}>📈 わたしの理解度</Title>
        <UnderstandingMap A={analysis} grade={grade} onStart={(c) => props.onTodayPick?.(c)}
          onUnit={(x) => go({ view: "actions", chapterId: x.chapter.id, unitId: x.unitId })} />
      </Shell>
    );
  }

  if (view === "story") {
    return (
      <Shell player={player} back="メニュー" onBack={() => go({ view: "main" })} transitionKey={view} reverse>
        <StoryLibrary grade={grade} state={medalState} />
      </Shell>
    );
  }

  if (view === "settings") {
    return (
      <Shell player={player} back="メニュー" onBack={() => go({ view: "main" })} transitionKey={view} reverse>
        <SettingsScreen player={player} grade={grade} onSetGrade={onSetGrade} updatePlayer={updatePlayer} onFeedback={props.onFeedback} />
      </Shell>
    );
  }

  // ---- 学習：単元（1章〜）
  if (view === "units" || !chapter) {
    return (
      <Shell player={player} back="メニュー" onBack={() => go({ view: "main" })} transitionKey={view} reverse>
        <Title sub={`中学${grade}年生の単元です。えらんでね`}>📚 単元をえらぼう</Title>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {chapters.map((c, i) => {
            const sum = medalSummary(medalState, c.units || []);
            return (
              <GameButton key={c.id} tone="blue" icon={c.emoji || "📘"} onClick={() => go({ view: "subunits", chapterId: c.id })}>
                <strong>{i + 1}章　{c.name}</strong><small>メダル {sum.count} / {sum.total}　・　バトルクリア {sum.battlesCleared} / {sum.units}</small>
              </GameButton>
            );
          })}
        </div>
      </Shell>
    );
  }

  // ---- 学習：小単元
  if ((view === "subunits" || !unit) && view !== "practicePick") {
    const bossAvail = !!getChapter(grade, chapter.id)?.chapterBoss;
    const bossOpen = chapterBattlesCleared(medalState, grade, chapter); // 章のバトルを全部クリアすると開く
    return (
      <Shell player={player} back="単元" onBack={() => go({ view: "units" })} transitionKey={`${view}:${chapter.id}`} reverse>
        <Title sub="小単元をえらんでね">{chapter.emoji} {chapters.findIndex((c) => c.id === chapter.id) + 1}章　{chapter.name}</Title>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {chapter.units.map((u) => {
            const m = unitMedals(medalState, u.id);
            return (
              <GameButton key={u.id} tone={m.count >= 3 ? "gold" : "violet"} onClick={() => go({ view: "actions", chapterId: chapter.id, unitId: u.id })}>
                <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, width: "100%" }}>
                  <span style={{ textAlign: "left" }}><strong>{u.emoji ? u.emoji + " " : ""}{u.name}</strong></span>
                  {/* 🔒 は「バトルだけ」が閉じている印（学ぶ・練習はいつでもできる）。以前は名前の前に付いていて、単元ごと入れないように見えた */}
                  <MedalPair m={m} battleLocked={!battleOpen(medalState, grade, u.id)} />
                </span>
              </GameButton>
            );
          })}
          <GameButton tone="danger" icon="👑" disabled={!bossAvail || !bossOpen} onClick={() => bossAvail && bossOpen && props.onChapterBoss?.(chapter)}>
            <strong>{bossAvail && !bossOpen ? "🔒 " : ""}章のボスと戦う</strong>
            <small>{!bossAvail ? "準備中" : !bossOpen ? "この章の小単元のバトルを ぜんぶクリアすると開くよ" : `${chapter.name} の総まとめ！ はじめて倒すと 💎+${lapCrystals(CRYSTAL.chapterBossFirst, lap)}${lap > 1 ? "（周回は半分）" : ""}`}</small>
          </GameButton>
        </div>
      </Shell>
    );
  }

  // ---- 練習：むずかしさをえらぶ（どれか1つで5問正解すると れんしゅうメダル）
  if (view === "practicePick") {
    return (
      <Shell player={player} back={unit.name} onBack={() => go({ view: "actions", chapterId: chapter.id, unitId: unit.id })}>
        <Title sub="どれか1つで5問せいかいすると「れんしゅうメダル」がもらえるよ">✏️ むずかしさをえらぼう</Title>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <GameButton tone="mint" icon="🌱" onClick={() => props.onPractice?.(chapter, unit, "easy")}><strong>簡単</strong><small>まずはここから</small></GameButton>
          <GameButton tone="blue" icon="✏️" onClick={() => props.onPractice?.(chapter, unit, "standard")}><strong>普通</strong><small>ヒントつき（とけた式）</small></GameButton>
          <GameButton tone="violet" icon="🔥" onClick={() => props.onPractice?.(chapter, unit, "advanced")}><strong>難しい</strong><small>ちょっと手ごわい</small></GameButton>
          <GameButton tone="danger" icon="👹" onClick={() => props.onPractice?.(chapter, unit, "oni")}><strong>鬼</strong><small>いちばん難しい！</small></GameButton>
        </div>
      </Shell>
    );
  }

  // ---- 学習：小単元を選んだ後の4つ
  const m = unitMedals(medalState, unit.id);
  const battleExists = !!worldBattleFor(grade, chapter, unit);
  const open = battleOpen(medalState, grade, unit.id); // ストーリーどおり：前のバトルをクリアすると次が開く
  const battleAvail = battleExists && open;
  const prevName = (() => { const o = battleOrder(grade); const i = o.indexOf(unit.id); return i > 0 ? findUnitById(o[i - 1])?.name || "" : ""; })();
  return (
    <Shell player={player} back={chapter.name} onBack={() => go({ view: "subunits", chapterId: chapter.id })} transitionKey={`${view}:${unit.id}`} reverse>
      <Title sub={chapter.name}>{unit.emoji ? unit.emoji + " " : ""}{unit.name}</Title>
      <div className="glass" style={{ padding: 12, marginBottom: 14, display: "flex", alignItems: "center", gap: 12 }}>
        <MedalPair m={m} size={34} />
        <div style={{ fontSize: 12, color: "rgba(255,255,255,.75)", lineHeight: 1.6 }}>
          📺 はいち：{m.haichi ? "ゲット！" : "確認問題に合格"}<br />
          ✏️ れんしゅう：{m.practice ? "ゲット！" : `${m.practiceN} / ${MEDAL_PRACTICE_TARGET}問`}<br />
          ⚔️ バトル：{m.battle ? "ゲット！" : "はじめてクリア"}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <GameButton tone="danger" icon="📺" onClick={() => props.onHaichi?.(unit)}><strong>学ぶ</strong><small>{hasHaichiLessonForUnit(unit.id) ? "はいちモード（動画で学ぼう）" : "この単元は動画がないので、確認問題（5問）で学ぼう"}</small></GameButton>
        <GameButton tone="mint" icon="✏️" onClick={() => go({ view: "practicePick", chapterId: chapter.id, unitId: unit.id })}><strong>練習</strong><small>4択学習モード（むずかしさをえらべるよ）</small></GameButton>
        <GameButton tone="gold" icon="⚔️" disabled={!battleAvail} onClick={() => battleAvail && props.onBattle?.(chapter, unit)}>
          <strong>バトルモード</strong>
          <small>{!battleExists ? "この小単元のバトルは準備中" : !open ? `🔒 前のバトルをクリアすると開くよ${prevName ? `（${prevName}）` : ""}` : battleDone(medalState)[unit.id] ? "クリアずみ！ もう一度たたかえるよ" : lap > 1 ? `この周ではじめてクリアで 💎クリスタル${lapCrystals(2, lap)}個（経験値は同じ）` : "はじめてクリアで ⚔️バトルメダルと 💎クリスタル2個！"}</small>
        </GameButton>
      </div>
    </Shell>
  );
}
