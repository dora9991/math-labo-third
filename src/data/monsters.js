// ============================================================
// monsters.js — バトルモードのモンスター図鑑（全学年・1本の冒険）
//
// 構成：中1→中2→中3の全章を順につなぎ、小単元1つ＝1体（＋れんしゅう用の弱い子）。
//   各章末に「章ボス」、全章ボス撃破で「数学の魔王」（最終決戦）。
//   ・minLv は全小単元を Lv1〜UNIT_MAX_LV に均等配分（学習を進めれば届く推奨レベル）
//   ・魔王は推奨 Lv MAOU_LV。全単元の発展問題を出す
//   ・見た目は10種類のSVGアートを章テーマに合わせて割り当て、
//     強さ（HP/攻撃/色枠/名前）で差別化する
//
//   hp/atk/reward/minLv … 戦闘の強さと解放条件
//   pools … 出題する単元 [{c:章ID, u:単元ID}, ...]
//   art   … 見た目（下の ART ライブラリのキー）
// ============================================================

import { allChapters } from "./index.js";
import { playerAtkForLevel, playerHpForLevel, enemyAtkForLevel } from "../engine/battle.js";
import { hueFromId } from "./monsterImages.js";
import { CHAPTER_ENEMY_PATTERN } from "./chapterSkills.js";

// ★RPG進行は全学年（中1→中2→中3）を1本の冒険としてつなぐ。
const RPG_CHAPTERS = allChapters();

// 全小単元の数（推奨レベル＆ヒット数のスケールに使う）
const TOTAL_UNITS = RPG_CHAPTERS.reduce((s, c) => s + c.units.length, 0);

// ── レベルカーブ設計（テストプレイのバランス再調整）──────────────
// 旧版は minLv = 1 + gi*2 で、単元が増えると推奨Lvが100超に暴走し、
// 「学習を終えてもレベルが足りない＝レベル上げ作業」が発生していた。
// 新版は全小単元を Lv1〜UNIT_MAX_LV に均等配分し、学習を進めれば
// 自然に到達できる推奨レベルにする（バトル報酬XPも増えるため噛み合う）。
const UNIT_MAX_LV = 42;  // 最深部の小単元モンスターの推奨レベル
const MAOU_LV = 48;      // 魔王（最終ボス）の推奨レベル＝全章クリアで届く範囲

// 単元別ボスの梯子（2026-07-18設計）のBP列＝各ランク上限(D140/C180/B220/A260/S300/SS350)-10
export const BOSS_LADDER_BP = [130, 170, 210, 250, 290, 340];

// ── 裏ボス（隠しボス）：魔王を倒したあと、段階的に解放される“もっと強い敵” ──
//   推奨レベルは 80 → 300 まで。各学年ワールドに同じ並びで用意（worldXp は学年独立なので
//   それぞれの世界でLvを上げて挑戦できる）。前の裏ボス（最初は魔王）を倒すと次が解放される。
const SECRET_TIERS = [
  { lv: 80,   name: "深淵の番人",     color: "#22d3ee" },
  { lv: 100,  name: "混沌の使者",     color: "#a78bfa" },
  { lv: 150,  name: "虚無の王",       color: "#f472b6" },
  { lv: 200,  name: "破壊神オメガ",   color: "#fb923c" },
  { lv: 250,  name: "時空の支配者",   color: "#f43f5e" },
  { lv: 300,  name: "数学の真神",     color: "#fde047" },
  // ── 超高難度の追加裏ボス（推奨Lv400〜1500）──
  //  最大レベルは999のままなので、これらは「レベルで届く」のではなく
  //  装備・スキル・計算王ボーナスを極めて挑む“真の極限”。tiが進むほど硬く・痛く・凶悪に。
  { lv: 400,  name: "終焉の竜帝",     color: "#ef4444" },
  { lv: 500,  name: "星喰らいの魔王", color: "#8b5cf6" },
  { lv: 600,  name: "次元の裂け目",   color: "#06b6d4" },
  { lv: 700,  name: "永劫の支配者",   color: "#f59e0b" },
  { lv: 800,  name: "無限の審判者",   color: "#ec4899" },
  { lv: 900,  name: "創世の破壊者",   color: "#10b981" },
  { lv: 1000, name: "概念崩壊オメガ", color: "#fbbf24" },
  { lv: 1100, name: "虚数界の覇王",   color: "#a855f7" },
  { lv: 1200, name: "絶対零度の神",   color: "#38bdf8" },
  { lv: 1300, name: "全方程式の頂点", color: "#f43f5e" },
  { lv: 1400, name: "数理の終局",     color: "#e879f9" },
  { lv: 1500, name: "究極存在アレフ", color: "#ffffff" },
];
/** 通し番号 gi（0始まり）から推奨レベルを均等配分で求める */
function unitMinLv(gi) {
  if (TOTAL_UNITS <= 1) return 1;
  return 1 + Math.round((gi * (UNIT_MAX_LV - 1)) / (TOTAL_UNITS - 1));
}

// ── SVGアート・ライブラリ（既存10種類） ─────────────
const ART = {
  calc: {
    color: "#4488ff", deathColors: ["#4488ff", "#88bbff", "#00ffff", "#ffffff", "#ffff00"],
    svgDefs: `<defs><radialGradient id="rg1" cx="40%" cy="30%" r="65%"><stop offset="0%" stop-color="#88bbff"/><stop offset="100%" stop-color="#1144aa"/></radialGradient><linearGradient id="rg1b" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#4488ff"/><stop offset="100%" stop-color="#1133aa"/></linearGradient></defs>`,
    svg: `<rect x="35" y="55" width="70" height="60" rx="8" fill="url(#rg1b)" stroke="#88bbff" stroke-width="2"/><rect x="42" y="22" width="56" height="40" rx="6" fill="url(#rg1)" stroke="#88bbff" stroke-width="2"/><line x1="70" y1="22" x2="70" y2="10" stroke="#88bbff" stroke-width="2"/><circle cx="70" cy="8" r="4" fill="#ffff00"/><rect x="50" y="32" width="14" height="10" rx="2" fill="#001133"/><rect x="76" y="32" width="14" height="10" rx="2" fill="#001133"/><rect x="52" y="34" width="10" height="6" rx="1" fill="#00ffff"/><rect x="78" y="34" width="10" height="6" rx="1" fill="#00ffff"/><rect x="52" y="50" width="36" height="8" rx="3" fill="#001133"/><text x="70" y="57" text-anchor="middle" fill="#00ff88" font-size="7" font-family="monospace">1+1=?</text><rect x="12" y="58" width="22" height="10" rx="5" fill="#2255bb" stroke="#88bbff" stroke-width="1.5"/><rect x="106" y="58" width="22" height="10" rx="5" fill="#2255bb" stroke="#88bbff" stroke-width="1.5"/><rect x="42" y="112" width="18" height="20" rx="4" fill="#2255bb" stroke="#88bbff" stroke-width="1.5"/><rect x="80" y="112" width="18" height="20" rx="4" fill="#2255bb" stroke="#88bbff" stroke-width="1.5"/><text x="70" y="90" text-anchor="middle" fill="#88bbff" font-size="14" font-family="monospace" font-weight="bold">+−×÷</text>`,
    idleExtra: "",
  },
  balance: {
    color: "#cc88ff", deathColors: ["#cc88ff", "#eeccff", "#aa44ff", "#ffffff", "#ff88ff"],
    svgDefs: `<defs><radialGradient id="rg2" cx="40%" cy="35%" r="65%"><stop offset="0%" stop-color="#eeccff"/><stop offset="100%" stop-color="#6622aa"/></radialGradient></defs>`,
    svg: `<path d="M70 30 C45 28,28 45,28 68 C28 88,32 102,40 110 C46 118,55 122,70 122 C85 122,94 118,100 110 C108 102,112 88,112 68 C112 45,95 28,70 30Z" fill="url(#rg2)" stroke="#cc88ff" stroke-width="2"/><ellipse cx="58" cy="65" rx="9" ry="11" fill="#1a0033"/><ellipse cx="82" cy="65" rx="9" ry="11" fill="#1a0033"/><ellipse cx="60" cy="63" rx="5" ry="6" fill="#cc88ff"/><ellipse cx="84" cy="63" rx="5" ry="6" fill="#cc88ff"/><line x1="70" y1="18" x2="70" y2="30" stroke="#cc88ff" stroke-width="2"/><line x1="46" y1="18" x2="94" y2="18" stroke="#cc88ff" stroke-width="2.5"/><line x1="46" y1="18" x2="46" y2="28" stroke="#cc88ff" stroke-width="1.5"/><line x1="94" y1="18" x2="94" y2="28" stroke="#cc88ff" stroke-width="1.5"/><ellipse cx="46" cy="29" rx="10" ry="3" fill="none" stroke="#cc88ff" stroke-width="1.5"/><ellipse cx="94" cy="29" rx="10" ry="3" fill="none" stroke="#cc88ff" stroke-width="1.5"/><text x="46" y="28" text-anchor="middle" fill="#ffddff" font-size="7">x</text><text x="94" y="28" text-anchor="middle" fill="#ffddff" font-size="7">3</text><path d="M58 88 Q70 96 82 88" stroke="#cc88ff" stroke-width="2" fill="none" stroke-linecap="round"/>`,
    idleExtra: "",
  },
  geo: {
    color: "#ff8844", deathColors: ["#ff8844", "#ffcc88", "#aa3300", "#ffff00", "#ff4400"],
    svgDefs: `<defs><radialGradient id="rg3" cx="35%" cy="30%" r="65%"><stop offset="0%" stop-color="#ffcc88"/><stop offset="100%" stop-color="#aa3300"/></radialGradient><linearGradient id="rg3b" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#ff8844"/><stop offset="100%" stop-color="#882200"/></linearGradient></defs>`,
    svg: `<polygon points="70,20 100,38 100,74 70,92 40,74 40,38" fill="url(#rg3b)" stroke="#ffaa66" stroke-width="2"/><polygon points="70,32 90,43 90,65 70,76 50,65 50,43" fill="none" stroke="#ff8844" stroke-width="1" opacity="0.6"/><polygon points="58,50 64,46 64,54" fill="#ffff00"/><polygon points="82,50 76,46 76,54" fill="#ffff00"/><circle cx="70" cy="62" r="3" fill="#ff8844" stroke="#ffaa66" stroke-width="1"/><path d="M40 50 C25 40,15 55,20 65 C25 72,35 68,40 62Z" fill="url(#rg3b)" stroke="#ffaa66" stroke-width="1.5"/><path d="M100 50 C115 40,125 55,120 65 C115 72,105 68,100 62Z" fill="url(#rg3b)" stroke="#ffaa66" stroke-width="1.5"/><path d="M70 92 C65 105,60 112,55 118 C52 122,60 125,65 120 C70 115,75 105,70 92Z" fill="url(#rg3b)" stroke="#ffaa66" stroke-width="1.5"/><polygon points="70,40 76,50 64,50" fill="none" stroke="#ffdd88" stroke-width="1" opacity="0.8"/><rect x="62" y="68" width="16" height="12" rx="2" fill="none" stroke="#ffdd88" stroke-width="1" opacity="0.7"/>`,
    idleExtra: "",
  },
  wave: {
    color: "#00ddff", deathColors: ["#00ddff", "#aaffff", "#00aacc", "#ffffff", "#0088aa"],
    svgDefs: `<defs><radialGradient id="rg4" cx="40%" cy="35%" r="65%"><stop offset="0%" stop-color="#aaffff"/><stop offset="45%" stop-color="#00aacc"/><stop offset="100%" stop-color="#005577"/></radialGradient></defs>`,
    svg: `<ellipse cx="70" cy="82" rx="48" ry="52" fill="url(#rg4)" stroke="#00ddff" stroke-width="2"/><path d="M28 72 Q38 60,48 72 Q58 84,68 72 Q78 60,88 72 Q98 84,108 72 Q112 68,112 72" fill="none" stroke="#aaffff" stroke-width="2" opacity="0.7"/><path d="M28 82 Q38 70,48 82 Q58 94,68 82 Q78 70,88 82 Q98 94,108 82" fill="none" stroke="#aaffff" stroke-width="1.5" opacity="0.5"/><ellipse cx="57" cy="68" rx="8" ry="9" fill="white"/><ellipse cx="83" cy="68" rx="8" ry="9" fill="white"/><ellipse cx="58" cy="67" rx="5" ry="6" fill="#003344"/><ellipse cx="84" cy="67" rx="5" ry="6" fill="#003344"/><path d="M55 84 Q62 90,70 84 Q78 78,85 84" stroke="#005577" stroke-width="2" fill="none" stroke-linecap="round"/><text x="70" y="108" text-anchor="middle" fill="#aaffff" font-size="11" font-family="monospace" opacity="0.8">y=f(x)</text>`,
    idleExtra: "",
  },
  dice: {
    color: "#ffdd44", deathColors: ["#ffdd44", "#ffee88", "#aa8800", "#ffffff", "#ff8800"],
    svgDefs: `<defs><linearGradient id="rg5" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#ffee88"/><stop offset="100%" stop-color="#aa8800"/></linearGradient><linearGradient id="rg5b" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#ffcc44"/><stop offset="100%" stop-color="#886600"/></linearGradient></defs>`,
    svg: `<rect x="35" y="50" width="70" height="70" rx="12" fill="url(#rg5b)" stroke="#ffdd44" stroke-width="2.5"/><rect x="44" y="16" width="52" height="42" rx="8" fill="url(#rg5)" stroke="#ffdd44" stroke-width="2"/><circle cx="58" cy="32" r="5" fill="#1a1400"/><circle cx="82" cy="32" r="5" fill="#1a1400"/><circle cx="58" cy="34" r="3" fill="#ffff00"/><circle cx="82" cy="34" r="3" fill="#ffff00"/><path d="M57 48 Q70 56 83 48" stroke="#aa8800" stroke-width="2" fill="none" stroke-linecap="round"/><circle cx="55" cy="72" r="4" fill="#1a1400"/><circle cx="70" cy="72" r="4" fill="#1a1400"/><circle cx="85" cy="72" r="4" fill="#1a1400"/><circle cx="55" cy="90" r="4" fill="#1a1400"/><circle cx="70" cy="90" r="4" fill="#1a1400"/><circle cx="85" cy="90" r="4" fill="#1a1400"/><rect x="8" y="55" width="25" height="25" rx="5" fill="url(#rg5b)" stroke="#ffdd44" stroke-width="1.5"/><rect x="107" y="55" width="25" height="25" rx="5" fill="url(#rg5b)" stroke="#ffdd44" stroke-width="1.5"/><rect x="44" y="118" width="20" height="16" rx="4" fill="url(#rg5b)" stroke="#ffdd44" stroke-width="1.5"/><rect x="76" y="118" width="20" height="16" rx="4" fill="url(#rg5b)" stroke="#ffdd44" stroke-width="1.5"/>`,
    idleExtra: "",
  },
  prime: {
    color: "#44ff88", deathColors: ["#44ff88", "#aaffcc", "#005522", "#ffffff", "#00ff44"],
    svgDefs: `<defs><radialGradient id="rg6" cx="35%" cy="30%" r="65%"><stop offset="0%" stop-color="#aaffcc"/><stop offset="100%" stop-color="#005522"/></radialGradient></defs>`,
    svg: `<path d="M70 15 C85 15,95 28,90 42 C85 56,60 58,58 72 C56 86,70 95,80 100 C90 105,95 115,90 125 C85 132,75 133,68 130" fill="none" stroke="url(#rg6)" stroke-width="22" stroke-linecap="round"/><ellipse cx="70" cy="14" rx="18" ry="16" fill="url(#rg6)" stroke="#44ff88" stroke-width="2"/><ellipse cx="63" cy="10" rx="5" ry="6" fill="white"/><ellipse cx="77" cy="10" rx="5" ry="6" fill="white"/><ellipse cx="64" cy="9" rx="3" ry="3.5" fill="#001a00"/><ellipse cx="78" cy="9" rx="3" ry="3.5" fill="#001a00"/><path d="M70 22 L70 30 M68 30 L70 28 L72 30" stroke="#ff4466" stroke-width="1.5" fill="none" stroke-linecap="round" style="animation:tongueDart 1.5s ease-in-out infinite;"/><text x="86" y="38" fill="#aaffcc" font-size="9" font-family="monospace" transform="rotate(-30,86,38)">2</text><text x="66" y="60" fill="#aaffcc" font-size="9" font-family="monospace">3</text><text x="74" y="82" fill="#aaffcc" font-size="9" font-family="monospace" transform="rotate(20,74,82)">5</text><text x="84" y="104" fill="#aaffcc" font-size="9" font-family="monospace" transform="rotate(10,84,104)">7</text>`,
    idleExtra: `@keyframes tongueDart{0%,60%,100%{transform:scaleY(1);opacity:1;}75%{transform:scaleY(0);opacity:0;}}`,
  },
  fraction: {
    color: "#ff88cc", deathColors: ["#ff88cc", "#ffccee", "#882255", "#ffffff", "#ff44aa"],
    svgDefs: `<defs><radialGradient id="rg7" cx="40%" cy="35%" r="65%"><stop offset="0%" stop-color="#ffccee"/><stop offset="100%" stop-color="#882255"/></radialGradient></defs>`,
    svg: `<path d="M70 28 C48 26,30 42,28 62 C26 80,30 96,40 108 C50 120,60 126,70 126 C80 126,90 120,100 108 C110 96,114 80,112 62 C110 42,92 26,70 28Z" fill="url(#rg7)" stroke="#ff88cc" stroke-width="2" opacity="0.92"/><path d="M28 108 Q35 120,42 108 Q49 120,56 108 Q63 120,70 108 Q77 120,84 108 Q91 120,98 108 Q105 120,112 108" fill="url(#rg7)" stroke="#ff88cc" stroke-width="1.5"/><ellipse cx="57" cy="62" rx="9" ry="10" fill="white"/><ellipse cx="83" cy="62" rx="9" ry="10" fill="white"/><ellipse cx="58" cy="61" rx="6" ry="7" fill="#330011"/><ellipse cx="84" cy="61" rx="6" ry="7" fill="#330011"/><line x1="54" y1="90" x2="86" y2="90" stroke="#ff88cc" stroke-width="2.5" stroke-linecap="round"/><text x="70" y="86" text-anchor="middle" fill="#ffccee" font-size="9" font-family="monospace">1</text><text x="70" y="100" text-anchor="middle" fill="#ffccee" font-size="9" font-family="monospace">2</text>`,
    idleExtra: "",
  },
  angle: {
    color: "#ffaa00", deathColors: ["#ffaa00", "#ffdd88", "#884400", "#ffffff", "#ff6600"],
    svgDefs: `<defs><radialGradient id="rg8" cx="35%" cy="30%" r="65%"><stop offset="0%" stop-color="#ffdd88"/><stop offset="100%" stop-color="#884400"/></radialGradient><linearGradient id="rg8b" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#ffaa00"/><stop offset="100%" stop-color="#663300"/></linearGradient></defs>`,
    svg: `<path d="M70 68 C55 55,30 50,10 60 C18 68,30 72,45 70 C35 78,22 80,18 90 C35 88,55 80,70 72Z" fill="url(#rg8b)" stroke="#ffaa00" stroke-width="1.5" style="animation:wingFlap 0.8s ease-in-out infinite alternate;transform-origin:70px 68px;"/><path d="M70 68 C85 55,110 50,130 60 C122 68,110 72,95 70 C105 78,118 80,122 90 C105 88,85 80,70 72Z" fill="url(#rg8b)" stroke="#ffaa00" stroke-width="1.5" style="animation:wingFlap 0.8s ease-in-out infinite alternate;transform-origin:70px 68px;transform:scaleX(-1);"/><ellipse cx="70" cy="72" rx="22" ry="28" fill="url(#rg8)" stroke="#ffaa00" stroke-width="2"/><ellipse cx="70" cy="44" rx="18" ry="18" fill="url(#rg8)" stroke="#ffaa00" stroke-width="2"/><polygon points="70,54 62,62 78,62" fill="#ffdd00" stroke="#ffaa00" stroke-width="1.5"/><circle cx="62" cy="40" r="6" fill="white"/><circle cx="78" cy="40" r="6" fill="white"/><circle cx="63" cy="40" r="4" fill="#1a0800"/><circle cx="79" cy="40" r="4" fill="#1a0800"/><path d="M58 88 L58 100 L70 100" stroke="#ffdd88" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M58 100 A12 12 0 0 1 70 88" stroke="#ffdd88" stroke-width="1.5" fill="none"/><text x="63" y="100" fill="#ffdd88" font-size="7">90°</text><path d="M58 96 C50 108,44 118,42 126 M70 100 C68 114,68 124,68 130 M82 96 C90 108,96 118,98 126" stroke="#ffaa00" stroke-width="3" fill="none" stroke-linecap="round"/>`,
    idleExtra: `@keyframes wingFlap{from{transform:scaleY(1);}to{transform:scaleY(0.7)translateY(4px);}}`,
  },
  volume: {
    color: "#88ffaa", deathColors: ["#88ffaa", "#ccffdd", "#44aa66", "#ffffff", "#00ff66"],
    svgDefs: `<defs><linearGradient id="rg9t" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#ccffdd"/><stop offset="100%" stop-color="#44aa66"/></linearGradient><linearGradient id="rg9r" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#44aa66"/><stop offset="100%" stop-color="#226644"/></linearGradient><linearGradient id="rg9f" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#88ffaa"/><stop offset="100%" stop-color="#336644"/></linearGradient></defs>`,
    svg: `<polygon points="30,60 30,110 70,130 70,80" fill="url(#rg9f)" stroke="#88ffaa" stroke-width="2"/><polygon points="70,80 70,130 110,110 110,60" fill="url(#rg9r)" stroke="#88ffaa" stroke-width="2"/><polygon points="30,60 70,40 110,60 70,80" fill="url(#rg9t)" stroke="#88ffaa" stroke-width="2"/><ellipse cx="46" cy="88" rx="7" ry="8" fill="white"/><ellipse cx="60" cy="88" rx="7" ry="8" fill="white"/><ellipse cx="47" cy="87" rx="4" ry="5" fill="#002211"/><ellipse cx="61" cy="87" rx="4" ry="5" fill="#002211"/><path d="M42 102 Q53 108 64 102" stroke="#226644" stroke-width="2" fill="none" stroke-linecap="round"/><text x="40" y="46" fill="#ccffdd" font-size="8" font-family="monospace" opacity="0.8">a</text><rect x="10" y="72" width="16" height="16" rx="2" fill="url(#rg9f)" stroke="#88ffaa" stroke-width="1.5"/><rect x="114" y="72" width="16" height="16" rx="2" fill="url(#rg9r)" stroke="#88ffaa" stroke-width="1.5"/>`,
    idleExtra: "",
  },
  speed: {
    color: "#ff4444", deathColors: ["#ff4444", "#ff8888", "#660000", "#ffffff", "#ffaa00"],
    svgDefs: `<defs><radialGradient id="rg10" cx="40%" cy="35%" r="65%"><stop offset="0%" stop-color="#ff8888"/><stop offset="45%" stop-color="#cc2222"/><stop offset="100%" stop-color="#660000"/></radialGradient></defs>`,
    svg: `<line x1="5" y1="50" x2="35" y2="50" stroke="#ff4444" stroke-width="2" opacity="0.6" stroke-linecap="round" style="animation:speedLine 0.6s ease-in-out infinite;"/><line x1="8" y1="62" x2="32" y2="62" stroke="#ff4444" stroke-width="1.5" opacity="0.5" stroke-linecap="round" style="animation:speedLine 0.6s ease-in-out infinite;animation-delay:0.1s;"/><line x1="5" y1="74" x2="28" y2="74" stroke="#ff4444" stroke-width="1" opacity="0.4" stroke-linecap="round" style="animation:speedLine 0.6s ease-in-out infinite;animation-delay:0.2s;"/><path d="M40 42 C55 30,90 28,105 48 C118 65,115 88,100 100 C85 112,55 115,40 102 C25 88,25 55,40 42Z" fill="url(#rg10)" stroke="#ff6666" stroke-width="2"/><path d="M52 56 L64 52 L64 62 L52 60Z" fill="white"/><path d="M80 52 L92 56 L92 60 L80 62Z" fill="white"/><ellipse cx="60" cy="57" rx="4" ry="5" fill="#1a0000"/><ellipse cx="84" cy="57" rx="4" ry="5" fill="#1a0000"/><path d="M58 78 L70 74 L82 78" stroke="#660000" stroke-width="2" fill="none" stroke-linecap="round"/><text x="72" y="96" text-anchor="middle" fill="#ff8888" font-size="9" font-family="monospace">v=d/t</text><path d="M40 60 C25 55,15 62,20 72 C24 80,35 78,40 72Z" fill="#ff4444" opacity="0.6" style="animation:flameTail 0.7s ease-in-out infinite alternate;transform-origin:40px 66px;"/>`,
    idleExtra: `@keyframes speedLine{0%,100%{opacity:0.6;transform:translateX(0);}50%{opacity:0.2;transform:translateX(8px);}} @keyframes flameTail{from{transform:scaleY(1)scaleX(1);}to{transform:scaleY(1.2)scaleX(0.8);}}`,
  },
  // ラスボス（王冠つきの闇のドラゴン）
  boss: {
    color: "#e879f9", deathColors: ["#e879f9", "#f0abfc", "#a21caf", "#ffffff", "#fde047"],
    svgDefs: `<defs><radialGradient id="rgB" cx="40%" cy="30%" r="70%"><stop offset="0%" stop-color="#f5d0fe"/><stop offset="55%" stop-color="#a21caf"/><stop offset="100%" stop-color="#3b0764"/></radialGradient></defs>`,
    svg: `<path d="M70 26 C44 24,26 44,26 70 C26 92,34 110,48 120 C58 127,64 130,70 130 C76 130,82 127,92 120 C106 110,114 92,114 70 C114 44,96 24,70 26Z" fill="url(#rgB)" stroke="#f0abfc" stroke-width="2.5"/><path d="M38 30 L30 8 L46 22 L58 4 L66 24 L78 4 L86 22 L102 8 L94 30Z" fill="#fde047" stroke="#fbbf24" stroke-width="1.5"/><circle cx="42" cy="14" r="3" fill="#ff4444"/><circle cx="70" cy="8" r="3.5" fill="#ff4444"/><circle cx="98" cy="14" r="3" fill="#ff4444"/><path d="M48 64 L66 60 L62 74 L46 72Z" fill="#fde047"/><path d="M92 64 L74 60 L78 74 L94 72Z" fill="#fde047"/><ellipse cx="56" cy="67" rx="4" ry="6" fill="#1a0022"/><ellipse cx="84" cy="67" rx="4" ry="6" fill="#1a0022"/><path d="M52 96 Q70 88 88 96 Q80 104 70 104 Q60 104 52 96Z" fill="#1a0022" stroke="#f0abfc" stroke-width="1"/><path d="M58 96 L60 102 M66 98 L66 104 M74 98 L74 104 M82 96 L80 102" stroke="#ffffff" stroke-width="1.5"/><path d="M26 70 C8 60,2 78,12 90 C18 96,28 92,32 84Z" fill="url(#rgB)" stroke="#f0abfc" stroke-width="1.5"/><path d="M114 70 C132 60,138 78,128 90 C122 96,112 92,108 84Z" fill="url(#rgB)" stroke="#f0abfc" stroke-width="1.5"/>`,
    idleExtra: "",
  },
};

// ── 章ごとの使用アート（テーマに合わせて循環割当）＆名前の素 ─────────
// 小単元(ユニット)1つにつき1体を自動生成するので、章ごとのアートと
// 名前パーツの組み合わせで見た目と名前に変化をつける。
const CHAPTER_ARTS = {
  c1: ["calc", "prime", "speed"],
  c2: ["fraction", "balance", "calc"],
  c3: ["balance", "fraction", "prime"],
  c4: ["wave", "speed", "geo"],
  c5: ["angle", "geo", "fraction"],
  c6: ["volume", "geo", "dice"],
  c7: ["dice", "prime", "wave"],
  // 中2
  g2c1: ["calc", "balance", "prime"],     // 式の計算
  g2c2: ["balance", "calc", "fraction"],  // 連立方程式
  g2c3: ["wave", "speed", "calc"],        // 1次関数
  g2c4: ["geo", "angle", "volume"],       // 平行と合同
  g2c5: ["geo", "angle", "fraction"],     // 三角形と四角形
  g2c6: ["dice", "prime", "wave"],        // 確率と統計
  // 中3
  g3c1: ["calc", "balance", "prime"],     // 展開と因数分解
  g3c2: ["prime", "fraction", "calc"],    // 平方根
  g3c3: ["balance", "fraction", "calc"],  // 2次方程式
  g3c4: ["wave", "speed", "geo"],         // 関数 y=ax^2
  g3c5: ["geo", "angle", "volume"],       // 相似
  g3c6: ["angle", "geo", "wave"],         // 円
  g3c7: ["geo", "volume", "angle"],       // 三平方の定理
  g3c8: ["dice", "prime", "wave"],        // 標本調査
};
// CHAPTER_ARTS に無い章でも全アートを循環して割り当てる安全網。
const ART_CYCLE = ["calc", "balance", "geo", "wave", "dice", "prime", "fraction", "angle", "volume", "speed"];
function artsForChapter(chap, ci) {
  if (CHAPTER_ARTS[chap.id]) return CHAPTER_ARTS[chap.id];
  return [0, 3, 6].map((off) => ART_CYCLE[(ci + off) % ART_CYCLE.length]);
}
// アートに合わせた名前の頭（その生き物っぽい響き）
const ART_NAME = {
  calc: "スウチ", balance: "テンビン", geo: "ズケイ", wave: "ナミ", dice: "サイコ",
  prime: "ソスウ", fraction: "ブンスウ", angle: "カクド", volume: "リッタイ", speed: "スピード",
};
// 名前のしっぽ（小単元ごとに循環して個体差を出す）※NAME_BY_IDに無いidのフォールバック用
const NAME_SUFFIX = ["ビット", "リン", "ガミ", "イーター", "ドラゴ", "レオン", "マル", "ローム", "ゴン", "ピー", "ネーガ", "クラゲ"];

// ── 小単元モンスターの固有名（モンスターidごと）──────────────
//   「モンスター画像生成プロンプト集（全106体）」と一致させた、バラバラの固有名。
//   ここに無いid（章ボス・魔王・サンプル・想定外の単元）は従来の自動命名にフォールバック。
const NAME_BY_ID = {
  // ── 中1 ──
  m_c1_u1: "スウチビット", m_c1_u2: "ソスウニョロ", m_c1_u3: "スピードダッシュ",
  m_c1_u4: "スウチバイト", m_c1_u5: "ソスウプライ", m_c1_u6: "スピードハヤテ",
  m_c2_v1: "ブンスウブンブン", m_c2_v2: "テンビンリン", m_c2_v3: "スウチチップ",
  m_c2_v4: "ブンスウハンブン", m_c2_v5: "テンビンヤジロ",
  m_c3_e1: "テンビンハカリ", m_c3_e2: "ブンスウスラリ", m_c3_e3: "ソスウスネーク",
  m_c3_e4: "テンビンユラリ", m_c3_e5: "ブンスウプニ",
  m_c4_h1: "ナミウェイブ", m_c4_h2: "スピードビュン", m_c4_h3: "ズケイリス",
  m_c4_h4: "ナミザブン", m_c4_h5: "スピードシッツウ",
  m_c5_z1: "カクドテンシ", m_c5_z2: "ズケイカクン", m_c5_z3: "ブンスウクワリ", m_c5_z4: "カクドハネル",
  m_c6_k1: "リッタイハコ", m_c6_k2: "ズケイハキサ", m_c6_k3: "サイコロコ", m_c6_k4: "リッタイリッポー",
  m_c7_d1: "サイコロール", m_c7_d2: "ソスウロボ", m_c7_d3: "ナミプカ",
  // ── 中2 ──
  m_g2c1_g2c1u1: "スウチカ", m_g2c1_g2c1u2: "テンビンツリア", m_g2c1_g2c1u3: "ソスウトグロ",
  m_g2c1_g2c1u4: "スウチロジック", m_g2c1_g2c1u5: "テンビンウェイト", m_g2c1_g2c1u6: "ソスウニシキ",
  m_g2c2_g2c2u1: "テンビンポイズ", m_g2c2_g2c2u2: "スウチデジ", m_g2c2_g2c2u3: "ブンスウプブン",
  m_g2c3_g2c3u1: "ナミウズ", m_g2c3_g2c3u2: "スピードカケル", m_g2c3_g2c3u3: "スウチピコ",
  m_g2c4_g2c4u1: "ズケイゲロ", m_g2c4_g2c4u2: "カクドエンジェ",
  m_g2c5_g2c5u1: "ズケイジュエル", m_g2c5_g2c5u2: "カクドビシャ", m_g2c5_g2c5u3: "ブンスウモチ",
  m_g2c6_g2c6u1: "サイコビップ", m_g2c6_g2c6u2: "ソスウヘビー", m_g2c6_g2c6u3: "ナミシブキ",
  // ── 中3 ──
  m_g3c1_g3c1u1: "スウチコード", m_g3c1_g3c1u2: "テンビンミコ",
  m_g3c2_g3c2u1: "ソスウジグザ", m_g3c2_g3c2u2: "ブンスウピンキー", m_g3c2_g3c2u3: "スウチボード",
  m_g3c2_g3c2u4: "ソスウイング", m_g3c2_g3c2u5: "ブンスウトロケ",
  m_g3c3_g3c3u1: "テンビンセイレイ", m_g3c3_g3c3u2: "ブンスウハーフ", m_g3c3_g3c3u3: "スウチカイ",
  m_g3c3_g3c3u4: "テンビンカクム", m_g3c3_g3c3u5: "ブンスウヌメロ",
  m_g3c4_g3c4u1: "ナミリップル", m_g3c4_g3c4u2: "スピードバーン", m_g3c4_g3c4u3: "ズケイポリゴ", m_g3c4_g3c4u4: "ナミミナト",
  m_g3c5_g3c5u1: "ズケイシャープ", m_g3c5_g3c5u2: "カクドオウギ", m_g3c5_g3c5u3: "リッタイブロック",
  m_g3c6_g3c6u1: "カクドスイチョク", m_g3c6_g3c6u2: "ズケイキラリ", m_g3c6_g3c6u3: "ナミトロロ",
  m_g3c7_g3c7u1: "ズケイトガリ", m_g3c7_g3c7u2: "リッタイボックス", m_g3c7_g3c7u3: "カクドカクカク", m_g3c7_g3c7u4: "ズケイクォーツ",
  m_g3c8_g3c8u1: "サイコガチャ", m_g3c8_g3c8u2: "ソスウシャルル", m_g3c8_g3c8u3: "ナミビチャ",
};

// 敵の「役割（タイプ）」。基準のHP・攻撃力にかける倍率で、強さの個性を出す。
//  → HP・攻撃力が一定の増え方にならず、硬い敵・もろいが痛い敵などの凸凹が生まれる。
//   tag    : 選択画面に出す説明
//   hpMul  : HPの倍率   atkMul : 通常攻撃力の倍率
// 1パンを避けるため HP の振れ幅は控えめ（0.85〜1.25）。個性は攻撃力で出す。
const ROLES = {
  normal:  { tag: "バランス",       hpMul: 1.0,  atkMul: 1.0 },
  tank:    { tag: "硬い・攻撃ひかえめ", hpMul: 1.25, atkMul: 0.65 },
  cannon:  { tag: "もろいが痛い",     hpMul: 0.85, atkMul: 1.5 },
  bruiser: { tag: "ちから自慢",       hpMul: 1.12, atkMul: 1.25 },
  nuker:   { tag: "必殺技が強い",     hpMul: 1.0,  atkMul: 0.8 }, // 通常は弱いが超必殺が脅威
};

// 各モンスターの「行動パターン(ai)＋役割(role)＋技の強さ上書き」。idx順。
// 序盤はやさしく、進むほど多彩で手強くなる。HP/攻撃は role 倍率で凸凹する。
// 各プロフィールに敵スキル（moves）とパッシブ（thorns/enrage/exposeOnCharge）を割り当て、
// 浅い単元はおとなしく、深い単元ほど多彩・厄介になるよう全23種を散りばめる。
//   moves: [{ id, chance }] … 敵のターンに確率で発動（engine/battle.js の ENEMY_MOVES）
//   thorns(0〜1) … プレイヤーの攻撃のたび反射ダメージ
//   enrage(>1) … 敵HP半分以下で攻撃力倍率
//   exposeOnCharge … チャージ中に被ダメージ2倍（弱点露出）
const PROFILES = [
  { ai: "plain",   role: "normal",  moves: [{ id: "timesteal", chance: 0.18 }] },                 // 0
  { ai: "plain",   role: "tank",    thorns: 0.15, moves: [{ id: "barrier", chance: 0.2 }] },      // 1 硬い＋トゲ
  { ai: "fire",    role: "normal",  moves: [{ id: "panic", chance: 0.18 }] },                     // 2
  { ai: "healer",  role: "tank",    moves: [{ id: "eregen", chance: 0.25 }] },                    // 3 回復＋再生＝粘る
  { ai: "mage",    role: "cannon",  moves: [{ id: "curse", chance: 0.2 }] },                      // 4
  { ai: "charger", role: "bruiser", moves: [{ id: "crit", chance: 0.22 }] },                      // 5
  { ai: "fire",    role: "cannon",  moves: [{ id: "pierce", chance: 0.2 }] },                     // 6
  { ai: "healer",  role: "tank",    moves: [{ id: "dispel", chance: 0.2 }] },                     // 7
  { ai: "mage",    role: "normal",  moves: [{ id: "fog", chance: 0.18 }] },                       // 8
  { ai: "charger", role: "bruiser", moves: [{ id: "multi", chance: 0.2 }] },                      // 9
  { ai: "super",   role: "nuker", superMult: 6, exposeOnCharge: true, moves: [{ id: "silence", chance: 0.2 }] }, // 10
  { ai: "plain",   role: "tank",    enrage: 1.4, moves: [{ id: "comboseal", chance: 0.2 }] },     // 11 暴走
  { ai: "fire",    role: "cannon",  moves: [{ id: "timecrush", chance: 0.2 }] },                  // 12
  { ai: "healer",  role: "bruiser", moves: [{ id: "spdrain", chance: 0.2 }] },                    // 13
  { ai: "mage",    role: "cannon",  moves: [{ id: "hardnext", chance: 0.2 }] },                   // 14
  { ai: "charger", role: "bruiser", moves: [{ id: "crit", chance: 0.2 }, { id: "multi", chance: 0.15 }] }, // 15
  { ai: "super",   role: "nuker", superMult: 7, exposeOnCharge: true, moves: [{ id: "curse", chance: 0.18 }, { id: "silence", chance: 0.18 }] }, // 16
  { ai: "fire",    role: "cannon",  moves: [{ id: "panic", chance: 0.2 }, { id: "pierce", chance: 0.15 }] }, // 17
  { ai: "mage",    role: "cannon",  moves: [{ id: "fog", chance: 0.2 }, { id: "hardnext", chance: 0.15 }] }, // 18
  { ai: "charger", role: "tank",    thorns: 0.2, moves: [{ id: "barrier", chance: 0.25 }] },      // 19
  { ai: "super",   role: "nuker", superMult: 8, exposeOnCharge: true, moves: [{ id: "decoy", chance: 0.25 }, { id: "timesteal", chance: 0.2 }] }, // 20
];

// ── 小単元モンスターを学年（ワールド）ごとに自動生成 ──
//   ★完全ワールド分離: 各学年は独立した冒険。Lv1〜UNIT_MAX_LV を学年内で配分し、
//     学年ごとに章ボス＋最終ボス（魔王）を持つ。monster.grade で所属ワールドを表す。
//   kind:"unit" … 小単元1つ＝1体。pools はその小単元のみ。
//   解放条件は engine/unlock.js（タイムアタックの3難易度を★1以上で全クリア）。
//   推奨レベル minLv は表示と制限時間の目安（解放はレベルでなく学習達成で行う）。
export const MONSTERS = [];
const bossArt = ART.boss;
const GRADE_WORLDS = [1, 2, 3];

for (const g of GRADE_WORLDS) {
  const chaptersOfGrade = RPG_CHAPTERS.filter((c) => c.grade === g);
  const unitsInGrade = chaptersOfGrade.reduce((s, c) => s + c.units.length, 0);
  if (unitsInGrade === 0) continue;
  // この学年だけで Lv1〜UNIT_MAX_LV に均等配分
  const minLvFor = (gi) => (unitsInGrade <= 1 ? 1 : 1 + Math.round((gi * (UNIT_MAX_LV - 1)) / (unitsInGrade - 1)));

  let gi = 0; // 学年内の通し番号（強さ・名前）
  chaptersOfGrade.forEach((chap, ci) => {
    const arts = artsForChapter(chap, ci);
    chap.units.forEach((u, ui) => {
      const artKey = arts[ui % arts.length];
      const art = ART[artKey];
      const prof = PROFILES[gi % PROFILES.length] || { ai: "plain", role: "normal" };
      const role = ROLES[prof.role] || ROLES.normal;
      const minLv = minLvFor(gi);                 // 学年内で Lv1〜UNIT_MAX_LV に配分
      const playerAtk = playerAtkForLevel(minLv); // 推奨レベルでのプレイヤー攻撃力（二次関数的）
      const hits = 14 + (unitsInGrade > 1 ? (gi / (unitsInGrade - 1)) * 2 : 0); // 序盤14発→終盤16発（平均≈15。コンボ/スキル併用で約10発）
      MONSTERS.push({
        id: `m_${chap.id}_${u.id}`,
        kind: "unit",
        grade: g,
        chapterId: chap.id,
        unitId: u.id,
        name: ART_NAME[artKey] + NAME_SUFFIX[gi % NAME_SUFFIX.length],
        unit: u.name,                            // 戦闘画面に出すテーマ名（小単元名）
        hp: Math.round(playerAtk * hits * role.hpMul),
        atk: Math.max(6, Math.round(enemyAtkForLevel(minLv) * role.atkMul)),
        reward: 8 + minLv * 3,   // 推奨レベル比例（深いほど多いが、暴騰しない）
        minLv,
        ai: prof.ai,
        role: prof.role,
        roleTag: role.tag,
        superMult: prof.superMult,
        moves: prof.moves,                  // 敵スキル（確率発動）
        thorns: prof.thorns,                // パッシブ：反射ダメージ
        enrage: prof.enrage,                // パッシブ：HP半分以下で攻撃UP
        exposeOnCharge: prof.exposeOnCharge,// パッシブ：チャージ中は被ダメ2倍
        color: art.color,
        pools: [{ c: chap.id, u: u.id }],
        art: artKey,
        svgDefs: art.svgDefs,
        svg: art.svg,
        idleExtra: art.idleExtra,
        deathColors: art.deathColors,
      });
      gi++;
    });
  });

  // ── 章ボス（その章の全小単元モンスターを倒すと解放・発展のみ出題） ──
  chaptersOfGrade.forEach((chap, ci) => {
    const unitMons = MONSTERS.filter((m) => m.kind === "unit" && m.grade === g && m.chapterId === chap.id);
    const maxLv = unitMons.length ? Math.max(...unitMons.map((m) => m.minLv)) : 1 + ci * 2;
    const minLv = maxLv + 2;
    const playerAtk = playerAtkForLevel(minLv);
    const bossHits = 15;                       // 章ボスは推奨レベルで15発（スキル併用で約10発）
    MONSTERS.push({
      id: `boss_${chap.id}`,
      kind: "chapterBoss",
      grade: g,
      chapterId: chap.id,
      name: `${chap.name}の主`,
      unit: `${chap.name}・全体`,
      hp: Math.round(playerAtk * bossHits),
      atk: Math.max(8, Math.round(enemyAtkForLevel(minLv) * 1.1)),
      reward: 60 + minLv * 4,   // 推奨レベル比例（章ボスらしい大きめ報酬）
      minLv,
      ai: "super",
      role: "boss",
      roleTag: "章ボス・超必殺",
      superMult: 6,            // チャージ1ターン→大ダメージ（ためすぎないぶん一撃を強く）
      chargeNeed: 1,           // チャージは1ターンだけ（その隙に削りきるチャンス）
      exposeOnCharge: true,    // チャージ中は被ダメ2倍
      enrage: 1.5,             // 半分以下で猛攻
      // ほとんどのターンは多彩な技＆攻撃。たまに1ターンだけためて大技。
      moves: [
        { id: "crit", chance: 0.3 },
        { id: "multi", chance: 0.28 },
        { id: "pierce", chance: 0.22 },
        { id: "curse", chance: 0.22 },
        { id: "barrier", chance: 0.2 },
        { id: "hardnext", chance: 0.2 },
      ],
      color: chap.color,
      pools: chap.units.map((u) => ({ c: chap.id, u: u.id })),
      bossAdvancedOnly: true,
      art: "boss",
      svgDefs: bossArt.svgDefs,
      svg: bossArt.svg,
      idleExtra: bossArt.idleExtra,
      deathColors: bossArt.deathColors,
    });
  });

  // ── 単元別ボスの梯子（2026-07-18設計・BP制。今は中1の7章のみ試作） ──
  //   各章の全小単元を計算マスターにすると挑戦可能になる6段のボス列。
  //   HPは全ボス共通1000、BPは各ランク上限-10（130/170/210/250/290/340）。
  //   ボス2以降は他章の「属性」（＝その章の敵パターン。chapterSkills.jsのCHAPTER_ENEMY_PATTERN）
  //   も使ってくる（ボスN＝N種類の技をpatternPoolに持ち、ターンごとにランダムに使い分ける）。
  //   BP比ダメージ式（engine/battleTurn.js の isCompanionBattle/bpDamage）で実際に戦える。
  //   （設計: Obsidian「設計_単元別戦闘力とHP1000化_2026-07-18」）。
  if (g === 1) {
    chaptersOfGrade.forEach((chap) => {
      const others = chaptersOfGrade.filter((c) => c.id !== chap.id).map((c) => c.id);
      let prevId = null;
      BOSS_LADDER_BP.forEach((bp, i) => {
        const tier = i + 1;
        const attrChapters = [chap.id, ...others.slice(0, tier - 1)];
        const patternPool = attrChapters.map((cid) => CHAPTER_ENEMY_PATTERN[cid]).filter(Boolean);
        const id = `bl_${chap.id}_${tier}`;
        MONSTERS.push({
          id,
          kind: "unitBoss",
          grade: g,
          chapterId: chap.id,
          tier,
          bp,
          prevId,
          name: `${chap.name}の試練・第${tier}段`,
          unit: `${chap.name}・ボスの梯子`,
          hp: 1000,
          atk: bp, // 表示用（一覧カードのステータス表示に流用）
          reward: 40 + tier * 30,
          minLv: 1,
          attributes: attrChapters, // 使う「属性」＝関連章idの配列（自章＋tier-1個の他章）
          patternPool,             // 実際にターンごとに使う技（engine/battleTurn.js pickBossPattern）
          ai: "super",
          role: "boss",
          roleTag: `ボス${tier}段・BP${bp}`,
          pools: chap.units.map((u) => ({ c: chap.id, u: u.id })),
          bossAdvancedOnly: true,
          art: "boss",
          svgDefs: bossArt.svgDefs,
          svg: bossArt.svg,
          idleExtra: bossArt.idleExtra,
          deathColors: bossArt.deathColors,
          color: chap.color,
        });
        prevId = id;
      });
    });
  }

  // ── 小単元ボス（2026-07-19設計・BP制） ──
  //   「応用」の隣に追加。ためすクリア(15問)で挑戦可能。初回撃破でクリスタル+1
  //   （クリスタルは単元別スキルの確定強化＝levelUpChapterSkillに使う。ガチャより先に、
  //   小単元ボス戦を新設した経緯：Obsidian「設計_単元別戦闘力とHP1000化_2026-07-18」）。
  //   ザコ(BP100)より一段強い、章ボス梯子の第1段(BP130)よりさらに一段強いBP150。
  if (g === 1) {
    chaptersOfGrade.forEach((chap) => {
      chap.units.forEach((u) => {
        MONSTERS.push({
          id: `su_${u.id}`,
          kind: "unitSmallBoss",
          grade: g,
          chapterId: chap.id,
          unitId: u.id,
          bp: 150,
          name: `${u.name}の強敵`,
          unit: `${u.name}・小単元ボス`,
          hp: 1000,
          atk: 150, // 表示用
          reward: 50,
          minLv: 1,
          ai: "super",
          role: "boss",
          roleTag: "小単元ボス・BP150",
          pools: [{ c: chap.id, u: u.id }],
          bossAdvancedOnly: true,
          art: "boss",
          svgDefs: bossArt.svgDefs,
          svg: bossArt.svg,
          idleExtra: bossArt.idleExtra,
          deathColors: bossArt.deathColors,
          color: chap.color,
        });
      });
    });
  }

  // ── 最終ボス・数学の魔王（その学年の章ボスを全て倒すと解放・学年の発展） ──
  const unitMaxLv = Math.max(...MONSTERS.filter((m) => m.kind === "unit" && m.grade === g).map((m) => m.minLv), 1);
  const maouLv = unitMaxLv + (MAOU_LV - UNIT_MAX_LV); // 学年内の最深部より少し上
  const allUnitsG = chaptersOfGrade.flatMap((c) => c.units.map((u) => ({ c: c.id, u: u.id })));
  MONSTERS.push({
    id: `boss_maou_${g}`,
    kind: "finalBoss",
    grade: g,
    name: `数学の魔王（中${g}）`,
    unit: `中${g}・全単元の発展`,
    hp: Math.round(playerAtkForLevel(maouLv) * 22), // スキル併用で約20数発（最終決戦は手強い）
    atk: Math.round(playerHpForLevel(maouLv) / 5),  // 推奨レベルでも5発で倒れる（最終決戦は手強い）
    reward: 2200,
    minLv: maouLv,
    ai: "super",
    role: "boss",
    roleTag: "最終ボス・超必殺",
    superMult: 6,            // チャージ1ターン→大ダメージ
    chargeNeed: 1,           // チャージは1ターンだけ
    exposeOnCharge: true,    // チャージ中は弱点露出
    enrage: 1.6,             // 半分以下で大暴走
    revive: true,            // 不死：一度だけ半分HPで復活
    // 最終ボス：毎ターンのように多彩な技と攻撃。たまに1ターンためて超必殺。
    moves: [
      { id: "crit", chance: 0.32 },
      { id: "multi", chance: 0.28 },
      { id: "pierce", chance: 0.24 },
      { id: "silence", chance: 0.22 },
      { id: "curse", chance: 0.22 },
      { id: "timesteal", chance: 0.22 },
      { id: "hardnext", chance: 0.2 },
      { id: "spdrain", chance: 0.2 },
      { id: "decoy", chance: 0.22 },
      { id: "eregen", chance: 0.2 },
      { id: "fog", chance: 0.18 },
    ],
    color: ART.boss.color,
    pools: allUnitsG,
    bossAdvancedOnly: true,
    art: "boss",
    svgDefs: ART.boss.svgDefs,
    svg: ART.boss.svg,
    idleExtra: ART.boss.idleExtra,
    deathColors: ART.boss.deathColors,
  });

  // ── 裏ボス（隠しボス）：魔王のあと段階的に解放。推奨Lv80〜300の高難度。──
  let prevSecretId = `boss_maou_${g}`; // tier0 は魔王を倒すと解放
  SECRET_TIERS.forEach((t, ti) => {
    const id = `secret_${g}_${ti}`;
    // 推奨Lvが上限(999)を超える裏ボスは、ステータス計算だけ999で頭打ちにする。
    //  （表示上の推奨Lvは t.lv のまま。届かないレベル基準で攻撃力が暴れて
    //    一撃死＝攻略不能になるのを防ぎつつ、強さは ti でさらに上げる）
    const statLv = Math.min(t.lv, 999);
    const playerAtk = playerAtkForLevel(statLv);
    MONSTERS.push({
      id,
      kind: "secretBoss",
      grade: g,
      secretTier: ti,
      prevId: prevSecretId,        // これを倒すと解放（unlock.js が参照）
      name: `裏ボス・${t.name}（中${g}）`,
      unit: `中${g}・全単元の発展（極）`,
      hp: Math.round(playerAtk * (28 + ti * 6)),     // 段階ごとにどんどん硬く
      atk: Math.round(playerHpForLevel(statLv) / 3.4 * (1 + ti * 0.06)), // 推奨レベルでも3〜4発。上位ほど痛い
      reward: 3000 + ti * 3000,                      // 大量XP（高レベルを目指せる）
      minLv: t.lv,
      ai: "super",
      role: "boss",
      roleTag: `裏ボス・推奨Lv${t.lv}`,
      superMult: 7 + ti * 1.5,     // 上位ほど超必殺が強烈
      chargeNeed: 1,
      exposeOnCharge: true,
      enrage: 1.8,                 // 半分以下で大暴走
      revive: ti >= 2,             // 上位は不死（一度だけ復活。フリーズは修正済み）
      // ギミック多め。目玉は「超難問(gigacalc)」＝途中で鬼級の計算をぶつけてくる（上位ほど高確率）。
      moves: [
        { id: "gigacalc", chance: 0.16 + ti * 0.04 },
        { id: "crit", chance: 0.34 },
        { id: "multi", chance: 0.30 },
        { id: "pierce", chance: 0.26 },
        { id: "silence", chance: 0.24 },
        { id: "comboseal", chance: 0.22 },
        { id: "curse", chance: 0.24 },
        { id: "timesteal", chance: 0.24 },
        { id: "timecrush", chance: 0.2 + ti * 0.02 },
        { id: "hardnext", chance: 0.22 },
        { id: "spdrain", chance: 0.22 },
        { id: "fog", chance: 0.18 },
        { id: "decoy", chance: 0.22 },
        { id: "eregen", chance: 0.22 },
      ],
      color: t.color,
      pools: allUnitsG,
      bossAdvancedOnly: true,
      art: "boss",
      svgDefs: ART.boss.svgDefs,
      svg: ART.boss.svg,
      idleExtra: ART.boss.idleExtra,
      deathColors: ART.boss.deathColors,
    });
    prevSecretId = id;
  });
}

// 入門用サンプル（最初から戦える・とても弱い＝チュートリアル兼）。中1ワールドの先頭に1体だけ。
{
  const sa = ART.calc;
  MONSTERS.unshift({
    id: "sample_intro",
    kind: "sample",
    grade: 1,
    chapterId: "c1",
    unitId: "u1",
    name: "れんしゅうスライム",
    unit: "正負の数（入門）",
    hp: 30,
    atk: 5,
    reward: 5,
    minLv: 1,
    ai: "plain",
    role: "normal",
    roleTag: "れんしゅう（とても弱い）",
    color: sa.color,
    pools: [{ c: "c1", u: "u1" }],
    art: "calc",
    svgDefs: sa.svgDefs,
    svg: sa.svg,
    idleExtra: sa.idleExtra,
    deathColors: sa.deathColors,
  });
}

// ── 仕上げ：固有名の上書き ＆ 画像（アート種別・色違いhue）の付与 ──
//   ・name: NAME_BY_ID にあれば固有名へ（無ければ自動命名のまま）。
//   ・imgArt: 表示する画像のアート種別（finalBoss→maou / sample→sample / chapterBoss→boss / それ以外は art）。
//   ・imgHue: 画像のリカラー角度。画像は数が少ないので id ごとに色を変えて個体差を出す。
//     ただし魔王・サンプルは本来の色のまま見せたいので 0（リカラーなし）。
for (const m of MONSTERS) {
  if (NAME_BY_ID[m.id]) m.name = NAME_BY_ID[m.id];
  m.imgArt =
    m.kind === "finalBoss" ? "maou" :
    m.kind === "sample" ? "sample" :
    m.kind === "chapterBoss" ? "boss" :
    m.kind === "secretBoss" ? "maou" :   // 裏ボスは魔王の画像を、tierごとに色違いで使う
    m.art;
  m.imgHue =
    (m.kind === "finalBoss" || m.kind === "sample") ? 0 :
    m.kind === "secretBoss" ? (40 + m.secretTier * 50) : // tierごとに色を変えて差別化
    hueFromId(m.id);
}

/** id からモンスター定義を引く（なかま育成・図鑑などで使用） */
export function findMonster(id) {
  return MONSTERS.find((m) => m.id === id) || null;
}
