// ============================================================
// TodayPlan.jsx — メニューの「今日のおすすめ」（最大3枚）と、「わたしの理解度」マップ。
//  中身（どの単元を・どの難しさで・なぜ）は recommend.js が決める。ここは見せ方だけ。
//  カードを押す → onStart(card)：練習（その難易度から）／学び直し（その単元）／学ぶ（はいち）を App が開く。
// ============================================================
import { LEVEL_NAME, BANDS, gradeMap, unitSuggestion } from "../recommend.js";
import "./recommend.css";

const LEVEL_TONE = { easy: "#4ade80", standard: "#60a5fa", advanced: "#c084fc", oni: "#f87171" };
export function actionLabel(c) {
  if (c.action === "haichi") return c.hasVideo === false ? "確認問題で学ぶ" : "動画で学ぶ";
  if (c.action === "relearn") return "まちがいをなおす";
  return `${LEVEL_NAME[c.level] || "普通"}を5問`;
}
const pctOf = (u) => Math.round((u || 0) * 100);
const daysText = (d) => (d == null ? "" : d === 0 ? "今日" : d === 1 ? "きのう" : `${d}日前`);

function LevelTag({ c }) {
  if (c.action !== "practice") return <span className="rec-lv" style={{ "--lv": "#fbbf24" }}>{c.action === "haichi" ? "📺 学ぶ" : "🩹 なおす"}</span>;
  return <span className="rec-lv" style={{ "--lv": LEVEL_TONE[c.level] }}>{LEVEL_NAME[c.level]}</span>;
}

function RecCard({ c, big = false, grade, onStart }) {
  return (
    <button data-sfx="none" className={`rec-card rec-card--${c.slot}${big ? " is-big" : ""}`} onClick={() => onStart(c)}>
      <span className="rec-card__slot"><span aria-hidden>{c.icon}</span>{c.title}<small>{c.sub}</small></span>
      <strong className="rec-card__unit">{c.unit.emoji ? `${c.unit.emoji} ` : ""}{c.unit.name}{c.grade !== grade ? <em>中{c.grade}</em> : null}</strong>
      <span className="rec-card__why">{c.reason}</span>
      <span className="rec-card__foot">
        <LevelTag c={c} />
        {c.band && <span className="rec-card__u">理解度 {pctOf(c.understanding)}%{c.provisional ? "（仮）" : ""}</span>}
        <span className="rec-card__go">{actionLabel(c)} ▶</span>
      </span>
    </button>
  );
}

export default function TodayPlan({ cards = [], grade, goalText, onStart, onMap }) {
  if (!cards.length) return null;
  const [main, ...rest] = cards;
  return (
    <section className="rec-plan" aria-label="今日のおすすめ">
      <header className="rec-plan__head">
        <b>🌟 今日のおすすめ</b>
        <small>あなたの答えから選んだよ　{goalText}</small>
      </header>
      <RecCard c={main} big grade={grade} onStart={onStart} />
      {rest.length > 0 && <div className="rec-plan__rest">{rest.map((c) => <RecCard key={`${c.slot}-${c.unitId}`} c={c} grade={grade} onStart={onStart} />)}</div>}
      {onMap && <button data-sfx="none" className="rec-plan__map" onClick={onMap}>📈 わたしの理解度を見る（単元ごと）</button>}
    </section>
  );
}

// ---- わたしの理解度（学年の単元ごと）
export function UnderstandingMap({ A, grade, onUnit, onStart }) {
  const chapters = gradeMap(A, grade);
  const seen = chapters.flatMap((c) => c.units).filter((x) => x.n > 0);
  const avg = seen.length ? seen.reduce((a, x) => a + x.understanding, 0) / seen.length : null;
  return (
    <div className="rec-map">
      <div className="rec-map__note">
        <b>理解度</b>＝その単元の「普通」の問題を今といたら、何%くらい正解できそうか。最近の答えほど大きく数えるので、<b>練習すると上がるよ</b>。
        <div className="rec-map__legend">
          {BANDS.map((b) => <span key={b.key}><i style={{ background: b.color }} />{b.label}</span>)}
          <span><i style={{ background: "rgba(255,255,255,.25)" }} />まだ</span>
        </div>
      </div>
      {avg != null && <div className="rec-map__sum">解いた単元 <b>{seen.length}</b>　平均の理解度 <b>{pctOf(avg)}%</b></div>}
      {chapters.map(({ chapter, units }, i) => (
        <section key={chapter.id} className="rec-map__ch">
          <h3>{chapter.emoji ? `${chapter.emoji} ` : ""}{i + 1}章　{chapter.name}</h3>
          {units.map((x) => {
            const s = unitSuggestion(A, x.unitId);
            const color = x.band ? x.band.color : "rgba(255,255,255,.25)";
            return (
              <div key={x.unitId} className="rec-row">
                <button data-sfx="none" className="rec-row__main" onClick={() => onUnit(x)}>
                  <span className="rec-row__name">{x.unit.emoji ? `${x.unit.emoji} ` : ""}{x.unit.name}</span>
                  <span className="rec-row__band" style={{ "--band": color }}>{x.band ? x.band.label : "まだ"}{x.band && x.provisional ? "（仮）" : ""}</span>
                  <span className="rec-row__bar"><i style={{ width: x.n ? `${Math.max(4, pctOf(x.understanding))}%` : 0, background: color }} /></span>
                  <span className="rec-row__pct">{x.n ? `${pctOf(x.understanding)}%` : "—"}</span>
                  <span className="rec-row__sub">
                    {x.n ? `${daysText(x.days)}・${x.n}問` : "まだ解いていない"}
                    {x.n >= 5 && x.understanding >= 0.5 && x.forget >= 0.3 && x.days >= 7 ? "・🔁わすれかけ" : ""}
                    {x.tags[0]?.n >= 2 ? `・🏷️${x.tags[0].label}×${x.tags[0].n}` : ""}
                    {x.openMistakes ? `・📓ノート${x.openMistakes}問` : ""}
                  </span>
                </button>
                {s && x.n > 0 && <button data-sfx="none" className="rec-row__go" onClick={() => onStart(s)}>{actionLabel(s)} ▶</button>}
              </div>
            );
          })}
        </section>
      ))}
    </div>
  );
}
