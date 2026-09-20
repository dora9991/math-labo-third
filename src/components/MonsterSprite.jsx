// ============================================================
// MonsterSprite.jsx — モンスターを描画し、状態アニメを当てる部品
//   state: "idle" | "damage" | "attack" | "dead"
//   animKey: 値が変わるたびにアニメを再生（被ダメを何度も再生するため）
//   mini: true で小さく（コレクション図鑑・敵選択など）
//   silhouette: true で黒いシルエット表示（未撃破のコレクション用）
// 画像（webp）があれば画像を使い、無ければ自前SVGアートにフォールバック。
// 画像は数が少ないので id ごとの hue で「色違い」表示して個体差を出す。
// ============================================================
import { useState, useEffect } from "react";
import { monsterImageUrl, monsterImgFilter } from "../data/monsterImages.js";
import { transparentBg } from "../data/transparentBg.js";

// 画像URLを「市松背景を透明化した」URLに変える小フック（処理結果はキャッシュ）
function useTransparent(url) {
  const init = url ? transparentBg(url) : null;
  const [src, setSrc] = useState(typeof init === "string" ? init : url);
  useEffect(() => {
    if (!url) return;
    const r = transparentBg(url);
    if (typeof r === "string") { setSrc(r); return; }
    let alive = true;
    r.then((d) => { if (alive) setSrc(d); });
    return () => { alive = false; };
  }, [url]);
  return src;
}

const STATE_CLASS = {
  idle: "idle-anim",
  damage: "dmg-anim",
  attack: "atk-anim",
  dead: "dead-anim",
};

export default function MonsterSprite({ monster, state = "idle", animKey = 0, mini = false, silhouette = false, size: sizeOverride }) {
  // ※フックは早期returnより前に呼ぶ（呼び出し順を一定に保つ）
  //  画像の解像度は size 指定でも full を使う（mini=small画像は小さく荒いため）
  const useSmall = mini && !sizeOverride;
  const rawUrl = monster ? monsterImageUrl(monster, useSmall ? "small" : "full") : null;
  const url = useTransparent(rawUrl);
  if (!monster) return null;
  const bodyClass = STATE_CLASS[state] || "idle-anim";
  const flash = state === "damage" || state === "dead" ? " flash-anim" : "";
  const size = sizeOverride || (mini ? 64 : 200); // バトルは大きめに表示

  // 画像があれば画像で描画（色違い hue ＋ 状態アニメ）
  if (rawUrl) {
    const filter = silhouette
      ? "brightness(0) opacity(0.55)"
      : monsterImgFilter(monster);
    return (
      <img
        key={animKey}
        className={bodyClass + flash}
        src={url}
        alt={monster.name || ""}
        draggable={false}
        style={{
          width: size, height: size, objectFit: "contain",
          filter, transformBox: "border-box", transformOrigin: "center bottom",
          imageRendering: "auto", userSelect: "none", pointerEvents: "none",
        }}
      />
    );
  }

  // フォールバック：自前SVGアート
  const html = `${monster.svgDefs}<g class="${bodyClass}">${monster.svg}</g>`;
  return (
    <>
      {monster.idleExtra ? <style>{monster.idleExtra}</style> : null}
      <svg
        key={animKey}
        className={((mini || sizeOverride) ? "" : "mon-svg") + flash}
        viewBox="0 0 140 140"
        xmlns="http://www.w3.org/2000/svg"
        style={(mini || sizeOverride) ? { width: size, height: size, overflow: "visible" } : undefined}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </>
  );
}
