// ============================================================
// ThirdMenu.jsx — 数学ラボ3のメニュー（ホーム画面）。2026-09-21 kazu指定の構成。
//
//  メニュー：学習を始める／学習の記録／パーティ編成／設定
//   学習を始める → 単元(1章〜)→ 小単元 → 学ぶ(はいち)・練習(4択)・バトルモード(デモ)／小単元の最後に「章のボスと戦う」
//  画面の位置(pos)は App が持つ（はいち・練習・バトルから戻ってきた時に、同じ小単元の画面へ戻すため）。
//  デザインは既存の部品(GameButton/Header)を使った仮置き。仕上げはCodex側で。
// ============================================================
import Header from "../../components/Header.jsx";
import GameButton from "../../components/GameButton.jsx";
import { MathBackdrop } from "../../components/Decorations.jsx";
import { chaptersForGrade } from "../../data/index.js";
import { unitMedals, medalSummary, MEDAL_PRACTICE_TARGET } from "../medals.js";
import { getChapter } from "../data/storyMap.js";
import { worldBattleFor } from "../link.js";
import RecordScreen from "./RecordScreen.jsx";
import StoryLibrary from "../story/StoryLibrary.jsx";
import { countNew, loadSeen } from "../story/storyRun.js";
import SettingsScreen from "./SettingsScreen.jsx";
import { fxScale, getFxSpeed } from "../../engine/fxSpeed.js";
import { pickToday } from "../todayPick.js";
import { DAILY, CRYSTAL } from "../gachaConfig.js";

// 毎日の目標（その日の検証済みの正解が5問で 💎+1）の表示。日付は日本時間。
function dailyGoalText(state) {
  const key = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
  const d = state?.daily;
  if (d?.date === key && d.mission) return "今日の目標 ✅ たっせい！";
  const ok = d?.date === key ? d.ok || 0 : 0;
  return `今日の目標：あと${Math.max(0, DAILY.missionTarget - ok)}問せいかいで 💎+${CRYSTAL.dailyMission}`;
}

function Shell({ player, back, onBack, children, transitionKey, reverse = false }) {
  const speed = getFxSpeed();
  const duration = Math.round(320 * fxScale(speed));
  return (
    <div className="app home-hub">
      <MathBackdrop />
      <Header player={player} back={back} onBack={onBack} />
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
export function MedalPair({ m, size = 26 }) {
  const dot = (on, icon) => (
    <span style={{
      display: "inline-grid", placeItems: "center", width: size, height: size, borderRadius: "50%", fontSize: size * 0.55,
      background: on ? "radial-gradient(circle at 35% 30%,#fff7c2,#fbbf24 55%,#b45309)" : "rgba(255,255,255,.07)",
      border: on ? "2px solid #fde68a" : "2px dashed rgba(255,255,255,.25)", filter: on ? "none" : "grayscale(1) opacity(.5)",
    }}>{icon}</span>
  );
  return <span style={{ display: "inline-flex", gap: 6 }}>{dot(m.haichi, "📺")}{dot(m.practice, "✏️")}</span>;
}

export default function ThirdMenu(props) {
  const { player, records, grade, pos, setPos, onSetGrade, updatePlayer, medalState } = props; // medalState＝サーバーが付与したメダル(thirdApi.getState().state)
  const view = pos?.view || "main";
  const chapters = chaptersForGrade(grade);
  const chapter = chapters.find((c) => c.id === pos?.chapterId) || null;
  const unit = chapter?.units?.find((u) => u.id === pos?.unitId) || null;
  const go = (next) => setPos(next);

  // ---- メニュー
  if (view === "main") {
    const weak = props.quizWeakUnits || [];
    const today = pickToday({ chapters, medalState, mistakes: props.mistakes || [], quizWeakUnits: weak });
    return (
      <Shell player={player} transitionKey={view}>
        <div className="menu-title-lockup">
          <div className="home-title-tab"><span>ASTRA ACADEMY ── ADVENTURER'S ARCHIVE</span><b>冒険の書</b><i>MENU</i></div>
          <div>{player.name ? `${player.name}、` : ""}きょうも数学をたのしもう！</div>
        </div>
        {weak.length > 0 && (
          <section className="home-alert" style={{ marginBottom: 14 }}>
            <b>MISSION UPDATE　苦手が見つかったよ</b>
            {weak.map((u) => (
              <GameButton key={u.unitId} tone="gold" onClick={() => props.onQuizWeakUnitClick?.(u.unitId)}>{u.name || u.unitId}</GameButton>
            ))}
          </section>
        )}
        {today && (
          <div style={{ marginBottom: 14 }}>
            <GameButton tone="gold" icon="🌟" onClick={() => props.onTodayPick?.(today.chapter, today.unit)}>
              <strong>今日のおすすめ（5問）</strong><small>{today.unit.emoji ? today.unit.emoji + " " : ""}{today.unit.name}　・　{today.reason}　・　{dailyGoalText(medalState)}</small>
            </GameButton>
          </div>
        )}
        <div className="astra-menu-tiles">
          <GameButton className="astra-menu-tiles__primary" tone="gold" icon="📚" onClick={() => go({ view: "units" })}><strong>学習を始める</strong><small>単元をえらんで学ぼう</small></GameButton>
          <div className="astra-menu-tiles__support">
            <GameButton tone="blue" icon="📊" onClick={() => go({ view: "record" })}><strong>学習の記録</strong><small>きょうの問題数・1週間のようす</small></GameButton>
            <GameButton tone="gold" icon="📖" onClick={() => go({ view: "story" })}><strong>ものがたり{(() => { const n = countNew(grade, medalState, loadSeen()); return n > 0 ? `　NEW ${n}` : ""; })()}</strong><small>これまでのお話を見返そう</small></GameButton>
            <GameButton tone="violet" icon="🛡️" onClick={props.onParty}><strong>パーティ編成</strong><small>5体の仲間をえらぼう</small></GameButton>
            <GameButton tone="mint" icon="⚙️" onClick={() => go({ view: "settings" })}><strong>設定</strong><small>学年の変更・アラーム</small></GameButton>
          </div>
        </div>
      </Shell>
    );
  }

  if (view === "record") {
    return (
      <Shell player={player} back="メニュー" onBack={() => go({ view: "main" })} transitionKey={view} reverse>
        <RecordScreen player={player} records={records} onWeakness={props.onWeakness} />
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
                <strong>{i + 1}章　{c.name}</strong><small>メダル {sum.count} / {sum.total}　・　バトル解放 {sum.battlesOpen} / {sum.units}</small>
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
    return (
      <Shell player={player} back="単元" onBack={() => go({ view: "units" })} transitionKey={`${view}:${chapter.id}`} reverse>
        <Title sub="小単元をえらんでね">{chapter.emoji} {chapters.findIndex((c) => c.id === chapter.id) + 1}章　{chapter.name}</Title>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {chapter.units.map((u) => {
            const m = unitMedals(medalState, u.id);
            return (
              <GameButton key={u.id} tone={m.battleOpen ? "gold" : "violet"} onClick={() => go({ view: "actions", chapterId: chapter.id, unitId: u.id })}>
                <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, width: "100%" }}>
                  <span style={{ textAlign: "left" }}><strong>{u.emoji ? u.emoji + " " : ""}{u.name}</strong></span>
                  <MedalPair m={m} />
                </span>
              </GameButton>
            );
          })}
          <GameButton tone="danger" icon="👑" disabled={!bossAvail} onClick={() => bossAvail && props.onChapterBoss?.(chapter)}>
            <strong>章のボスと戦う</strong>
            <small>{!bossAvail ? "準備中" : chapter.units.every((u) => unitMedals(medalState, u.id).battleOpen) ? `${chapter.name} の総まとめ！ はじめて倒すと 💎+5` : `${chapter.name} の総まとめ（お試し）。小単元のメダルを全部そろえると、💎がもらえる本番になるよ`}</small>
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
  const battleAvail = !!worldBattleFor(grade, chapter, unit); // メダル2枚＝本番バトル（初クリアでクリスタル）。それまでは「お試し」でいつでも戦える
  return (
    <Shell player={player} back={chapter.name} onBack={() => go({ view: "subunits", chapterId: chapter.id })} transitionKey={`${view}:${unit.id}`} reverse>
      <Title sub={chapter.name}>{unit.emoji ? unit.emoji + " " : ""}{unit.name}</Title>
      <div className="glass" style={{ padding: 12, marginBottom: 14, display: "flex", alignItems: "center", gap: 12 }}>
        <MedalPair m={m} size={34} />
        <div style={{ fontSize: 12, color: "rgba(255,255,255,.75)", lineHeight: 1.6 }}>
          📺 はいち：{m.haichi ? "ゲット！" : "確認問題に合格"}<br />
          ✏️ れんしゅう：{m.practice ? "ゲット！" : `${m.practiceN} / ${MEDAL_PRACTICE_TARGET}問`}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <GameButton tone="danger" icon="📺" onClick={() => props.onHaichi?.(unit)}><strong>学ぶ</strong><small>はいちモード（動画で学ぼう）</small></GameButton>
        <GameButton tone="mint" icon="✏️" onClick={() => go({ view: "practicePick", chapterId: chapter.id, unitId: unit.id })}><strong>練習</strong><small>4択学習モード（むずかしさをえらべるよ）</small></GameButton>
        <GameButton tone="gold" icon="⚔️" disabled={!battleAvail} onClick={() => battleAvail && props.onBattle?.(chapter, unit)}>
          <strong>{m.battleOpen ? "バトルモード" : "バトルモード（お試し）"}</strong>
          <small>{!battleAvail ? "この小単元のバトルは準備中" : m.battleOpen ? "はじめてクリアで 💎クリスタル2個！" : "ごほうびなし。メダル2枚で本番バトルが開くよ"}</small>
        </GameButton>
      </div>
    </Shell>
  );
}
