import { useState } from "react";
import Header from "../components/Header.jsx";
import CharBubble, { voice } from "../components/CharBubble.jsx";
import { MathBackdrop } from "../components/Decorations.jsx";
import UnitCycle from "../components/UnitCycle.jsx";
import MedalCase from "../third/MedalCase.jsx";
import UpdateNews from "../components/UpdateNews.jsx";
import GameButton from "../components/GameButton.jsx";
import { gradesWithChapters } from "../data/index.js";

const GRADE_COLOR = { 1: "#73b9ff", 2: "#ff86ad", 3: "#ffd46b" };
export default function Home(props) {
  const { player, mistakeUnitIds = [], grade = 1, onSetGrade, restActive = false, quizWeakUnits = [], onQuizWeakUnitClick } = props;
  const [cycleOpen, setCycleOpen] = useState(false);
  const greeting = player.name ? `${player.name}、${voice("open")}` : voice("open");
  // 旧バトル（主人公がターン制で戦うモード）と、そのための装備メニュー(スキル/アイテム/必殺技)は外した。
  //  数学ラボ3のバトルは「仲間5体が戦う」新バトルのみ（メダル画面／仲間・パーティ）。
  const items = [["PARTY","仲間・パーティ","5体の仲間を編成しよう","✦","violet",props.onThirdParty],["STATUS","自分のステータス","BPメーターをチェック","◈","blue",props.onStatusMeter],["RECORD","学習記録","今日までのがんばり","◌","blue",props.onStudyLog],["RETRY","弱点克服モード","まちがいを力に変えよう","✚","mint",props.onWeakness],["VOICE","ご意見箱","先生にメッセージを送る","✉","gold",props.onFeedback]].filter(([, , , , , fn]) => fn);
  return <div className="app home-hub"><MathBackdrop /><Header player={player} /><main className="content home-content">
    <div className="home-title-tab"><span>ASTRA ACADEMY</span><b>冒険の書</b><i>CHRONICLE MENU</i></div>
    <section className="home-hero"><div className="home-hero__orb" aria-hidden /><div className="home-hero__eyebrow">QUEST COMPASS · TODAY'S PATH</div><h1>きょうの冒険を<br /><em>はじめよう</em></h1><p>講義　→　ためす　→　なおす　→　応用</p><div className="home-hero__stars" aria-hidden>✦　◇　✦</div></section>
    <div className="home-plates">{[1,2,3].map((g) => { const ready = gradesWithChapters().includes(g), selected = grade === g; return <button key={g} disabled={!ready} onClick={() => ready && onSetGrade(g)} className={`grade-plate ${selected ? "is-selected" : ""}`} style={{ "--grade": GRADE_COLOR[g] }}><span>WORLD</span><b>中{g}</b><small>{ready ? `中学${g}年` : "準備中"}</small></button>; })}</div>
    <CharBubble text={greeting} avatar={player.avatar} onAvatar={props.onCharacter} />
    {restActive && <div className="home-rest"><span>☾</span><b>今日はよく伸びたね！</b><small>休むことも、次のレベルアップの準備だよ。</small></div>}
    <UpdateNews />
    {quizWeakUnits.length > 0 && <section className="home-alert"><b>MISSION UPDATE　苦手が見つかったよ</b>{quizWeakUnits.map((u) => <GameButton key={u.unitId} tone="gold" onClick={() => onQuizWeakUnitClick?.(u.unitId)}>{u.name} を復習する</GameButton>)}</section>}
    <section className={`cycle-gate ${cycleOpen ? "is-open" : ""}`}><div className="cycle-gate__ribbon">MAIN QUEST</div><GameButton tone="gold" className="cycle-gate__button" badge="START" icon="✦" onClick={() => setCycleOpen((v) => !v)}><strong>学習サイクル</strong><small>講義　→　ためす　→　なおす　→　応用</small></GameButton>{cycleOpen && <div className="cycle-gate__content"><UnitCycle player={player} grade={grade} cycleMap={player.cycle || {}} haichiPassed={player.haichiPassed || {}} noVideoLecturePassed={player.noVideoLecturePassed || {}} calcKing={player.calcKing || {}} mistakeUnitIds={mistakeUnitIds} onHaichi={props.onUnitHaichi} onTeacher={props.onUnitTeacher} onPractice={props.onUnitPractice} onRelearn={props.onRelearn} onChallenge={props.onChallenge} onDiagnose={props.onDiagnose} /></div>}</section>
    <MedalCase player={player} grade={grade} onHaichi={props.onUnitHaichi} onPractice={props.onUnitPractice} onBattle={props.onThirdBattle} />
    <section className="home-menu"><div className="home-menu__heading"><span>SUB MENU</span><b>アカデミー・メニュー</b></div><div className="home-menu__grid">{items.map(([ribbon,label,desc,icon,tone,fn]) => <button className={`hub-tile hub-tile--${tone}`} key={label} onClick={fn}><i>{icon}</i><span className="hub-tile__ribbon">{ribbon}</span><strong>{label}</strong><small>{desc}</small><em>›</em></button>)}</div></section>
  </main></div>;
}
