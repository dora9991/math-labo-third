import { SUBJECT_LABEL } from "../data/storyMap.js";

// 5パラメータ(計算・方程式・関数・図形・データ)を五角形レーダーチャートで表示する。
// 2026-09-17追加：パーティ編成のキャラ詳細ポップアップ用（横棒グラフから変更）。
const SUBJECT_ORDER = ["calc", "eq", "func", "geo", "data"];
// gachaRoster.js/specialistRoster.jsの実データ上の最大値(182・UR尖り型)に
// 少し余白を持たせた目盛りの上限。
const MAX_SCALE = 190;
// 左右のラベル("方程式 39"等)がviewBoxからはみ出て文字が切れないよう、
// 正五角形本体(高さ基準)より横幅を広く取ったviewBoxにしている。
const WIDTH = 240;
const HEIGHT = 210;
const CENTER_X = WIDTH / 2;
const CENTER_Y = HEIGHT / 2 - 5;
const RADIUS = 68;
const LABEL_RATIO = 1.25;

function pointAt(index, ratio) {
  const angle = (-90 + index * 72) * (Math.PI / 180);
  const r = RADIUS * ratio;
  return [CENTER_X + r * Math.cos(angle), CENTER_Y + r * Math.sin(angle)];
}

function polygonPoints(ratios) {
  return SUBJECT_ORDER.map((_, i) => pointAt(i, ratios[i]).join(",")).join(" ");
}

export default function SubjectPentagon({ subjects }) {
  const ratios = SUBJECT_ORDER.map((key) => Math.min(1, (subjects[key] || 0) / MAX_SCALE));

  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="mw-pentagon">
      {/* 目盛りの背景(25/50/75/100%)の五角形 */}
      {[0.25, 0.5, 0.75, 1].map((ring) => (
        <polygon
          key={ring}
          points={polygonPoints(SUBJECT_ORDER.map(() => ring))}
          className="mw-pentagon-ring"
        />
      ))}
      {/* 中心から各軸への線 */}
      {SUBJECT_ORDER.map((key, i) => {
        const [x, y] = pointAt(i, 1);
        return <line key={key} x1={CENTER_X} y1={CENTER_Y} x2={x} y2={y} className="mw-pentagon-axis" />;
      })}
      {/* 実データの五角形 */}
      <polygon points={polygonPoints(ratios)} className="mw-pentagon-data" />
      {SUBJECT_ORDER.map((key, i) => {
        const [x, y] = pointAt(i, ratios[i]);
        return <circle key={key} cx={x} cy={y} r={3} className="mw-pentagon-dot" />;
      })}
      {/* ラベルと数値 */}
      {SUBJECT_ORDER.map((key, i) => {
        const [x, y] = pointAt(i, LABEL_RATIO);
        return (
          <text key={key} x={x} y={y} className="mw-pentagon-label" textAnchor="middle">
            {SUBJECT_LABEL[key]} {subjects[key] ?? 0}
          </text>
        );
      })}
    </svg>
  );
}
