// Reward.jsx — バトル勝利画面。表示する報酬は**サーバーが検証して認めた値**（params.res）。
import { useEffect, useMemo } from "react";
import { playCorrectSound } from "../fx/sound.js";
import { useGame } from "../ThirdContext.jsx";
import { expOf } from "../expCurve.js";
import ExpMeter from "../components/ExpMeter.jsx";
import { battleOrder, battleOpen, battleUnitIdsOfChapter, chapterBattlesCleared } from "../core.js";
import { chaptersForGrade } from "../../data/index.js";
import { labUnitIdForBattle, worldBattleFor } from "../link.js";

/** 勝った小単元の「つぎ」：同じ章の次の小単元のバトル。章の最後なら、章のバトルを全部クリアしていれば章ボス。 */
function nextBattleAfter(save, params) {
  if (params?.kind !== "subUnit") return null;
  const g = Number(params.grade) || 1;
  const cur = labUnitIdForBattle(params);
  const chapters = chaptersForGrade(g);
  const ch = chapters.find((c) => c.id === params.chapterId);
  if (!cur || !ch) return null;
  const ids = battleUnitIdsOfChapter(g, ch);
  const i = ids.indexOf(cur);
  if (i >= 0 && i < ids.length - 1) {
    const unit = ch.units.find((u) => u.id === ids[i + 1]);
    const p = unit && battleOpen(save, g, unit.id) ? worldBattleFor(g, ch, unit) : null;
    return p ? { params: p, label: `つぎのバトルへ（${unit.name}）` } : null;
  }
  if (chapterBattlesCleared(save, g, ch)) return { params: { grade: g, chapterId: ch.id, kind: "chapterBoss", demo: false }, label: "👑 章のボスに挑戦する" };
  const order = battleOrder(g), k = order.indexOf(cur); // 章をまたぐ（章ボスがまだでも次の章へ進める）
  const nextId = order[k + 1];
  const nch = nextId && chapters.find((c) => c.units.some((u) => u.id === nextId));
  const nunit = nch && nch.units.find((u) => u.id === nextId);
  const p = nunit && battleOpen(save, g, nextId) ? worldBattleFor(g, nch, nunit) : null;
  return p ? { params: p, label: `つぎのバトルへ（${nunit.name}）` } : null;
}

const REASON = {
  "not-enough-correct": "正解がたりなかったので、ごほうびはなかったよ",
  "daily-limit": "きょうのごほうびは もうもらったよ（またあした）",
  "boss-repeat": "このボスのごほうびは もうもらったよ（何度でも挑戦できるよ）",
};
const ERROR = {
  "client-outdated": "アプリが古いよ。ページを読み込み直してね",
  "too-soon": "すこし間をあけてね",
  "duplicate-claim": "もう受け取ったよ",
  "time-mismatch": "時間が合わなかったよ",
  "medals-missing": "この章の小単元のバトルを ぜんぶクリアすると、章ボスのごほうびがもらえるよ",
  locked: "前のバトルをクリアすると、このバトルのごほうびがもらえるよ",
};

export default function Reward({ nav, params }) {
  const { save, charactersById } = useGame();
  const res = params.res || null;
  const r = res?.rewards;
  // 経験値メーター：いまのセーブ(受け取り後)から、もらう前の値をさかのぼる
  const grade = Number(params.grade) || 1;
  const per = r?.granted ? r.perMember || 0 : 0;
  const meters = per > 0 ? save.party.filter(Boolean).map((id) => (charactersById[id] && save.owned[id] ? { c: { ...charactersById[id], breaks: save.owned[id].breaks }, to: expOf(save.owned[id], grade) } : null)).filter(Boolean) : [];
  useEffect(() => {
    playCorrectSound();
  }, []);
  const isFirstClear = !!r?.isFirstClear;
  const next = useMemo(() => (res?.ok ? nextBattleAfter(save, params) : null), [save, params, res]);

  return (
    <div className="mw-fantasy-screen">
      <div className="mw-fantasy-panel mw-center" style={{ minHeight: "50vh" }}>
        <div className="mw-reward-pop" style={{ fontSize: "2.8rem", animationDelay: "0s" }}>🎉</div>
        <div className="mw-fantasy-title mw-reward-pop" style={{ fontSize: "1.4rem", animationDelay: "0.08s" }}>クリア！</div>
        {!res && (
          <div className="mw-reward-pop" style={{ color: "#c9b98f", animationDelay: "0.2s", textAlign: "center", lineHeight: 1.7 }}>
            お試しの総まとめバトルだから、ごほうびはないよ。<br />
            その章の小単元のバトルを ぜんぶクリアすると、<br />はじめてのクリアで💎クリスタルがもらえる本番になるよ！
          </div>
        )}
        {res && !res.ok && (
          <div className="mw-reward-pop" style={{ color: "#ffb4b4", animationDelay: "0.2s", textAlign: "center" }}>
            ごほうびを受け取れなかったよ<br />（{ERROR[res.error] || "つながらなかったよ"}）
          </div>
        )}
        {r && (
          <>
            <div className="mw-reward-pop" style={{ color: "#ffe9b3", animationDelay: "0.2s" }}>経験値 +{r.exp}（仲間ひとりずつ +{r.perMember ?? 0}）</div>
            {meters.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%", maxWidth: 440, margin: "4px auto" }}>
                {meters.map((m, i) => <ExpMeter key={m.c.id} character={m.c} from={Math.max(0, m.to - per)} to={m.to} delay={500 + i * 120} />)}
              </div>
            )}
            {r.kind === "secretBoss" && r.isFirstClear && <div className="mw-reward-pop" style={{ color: "#ff9a5a", fontWeight: 900, animationDelay: "0.36s" }}>👹 裏ボスを はじめて たおした！</div>}
            {r.kind === "chapterBoss" && r.isFirstClear && <div className="mw-reward-pop" style={{ color: "#ffe066", fontWeight: 900, animationDelay: "0.36s" }}>👑 章ボスを はじめて たおした！</div>}
            {(r.newMedals || []).some((m) => m.kind === "battle") && <div className="mw-reward-pop" style={{ color: "#fde047", fontWeight: 900, animationDelay: "0.38s" }}>⚔️ バトルメダル ゲット！</div>}
            {r.crystals > 0 && (
              <div className="mw-reward-pop" style={{ color: "#7cff8a", fontWeight: 900, fontSize: "1.2rem", animationDelay: "0.42s" }}>💎 クリスタル +{r.crystals}！</div>
            )}
            {r.chapterBonus > 0 && <div className="mw-reward-pop" style={{ color: "#7cff8a", fontWeight: 900, fontSize: "1.1rem", animationDelay: "0.5s" }}>🎊 章クリアボーナス！ 💎 +{r.chapterBonus}</div>}
            {r.gradeBonus > 0 && <div className="mw-reward-pop" style={{ color: "#fde047", fontWeight: 900, fontSize: "1.15rem", animationDelay: "0.54s" }}>🏆 学年クリアボーナス！ 💎 +{r.gradeBonus}</div>}
            {r.dailyMission > 0 && <div className="mw-reward-pop" style={{ color: "#7cff8a", fontWeight: 900, animationDelay: "0.6s" }}>📅 今日の目標たっせい！ 💎 +{r.dailyMission}</div>}
            {isFirstClear && r.kind !== "chapterBoss" && <div className="mw-reward-pop" style={{ color: "#ffe066", fontWeight: 700, animationDelay: "0.58s" }}>はじめてのクリア！</div>}
            {!r.granted && <div className="mw-reward-pop" style={{ color: "#c9b98f", animationDelay: "0.3s" }}>{REASON[r.reason] || ""}</div>}
            {r.granted && r.reason && <div className="mw-reward-pop" style={{ color: "#c9b98f", animationDelay: "0.5s" }}>{REASON[r.reason]}</div>}
          </>
        )}
      </div>
      {/* 行動ボタンは画面の下に貼りつける（経験値のメーターが長く、低い画面では見えなかった） */}
      <div className="mw-reward-actions">
      {(r?.crystals || 0) + (r?.chapterBonus || 0) + (r?.gradeBonus || 0) + (r?.dailyMission || 0) >= 5 && (
        <button className="mw-fantasy-item" style={{ justifyContent: "center" }} onClick={() => nav.go("gacha", {}, { replace: true })}>
          <span className="mw-fantasy-icon">🎰</span>ガチャを引く
        </button>
      )}
      {next && (
        <button className="mw-fantasy-item mw-next-battle" style={{ justifyContent: "center" }} onClick={() => nav.go("battle", next.params, { replace: true })}>
          <span className="mw-fantasy-icon">⚔️</span>{next.label}
        </button>
      )}
      <button className="mw-fantasy-item" style={{ justifyContent: "center" }} onClick={() => nav.exit()}>{next ? "メニューにもどる" : "つぎへ"}</button>
      </div>
    </div>
  );
}
