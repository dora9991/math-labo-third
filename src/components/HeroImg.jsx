// ============================================================
// HeroImg.jsx — ヒーロー立ち絵を「白背景を透明化して」表示する <img>
//  配布画像は白背景が焼き込まれているので、transparentBg（四隅flood fill）で
//  背景だけ透明にしてから表示する（結果はURLごとにキャッシュ）。
// ============================================================
import { useState, useEffect } from "react";
import { transparentBg } from "../data/transparentBg.js";

export default function HeroImg({ src, alt = "", style, className }) {
  const init = src ? transparentBg(src) : null;
  const [s, setS] = useState(typeof init === "string" ? init : src);
  useEffect(() => {
    if (!src) return;
    const r = transparentBg(src);
    if (typeof r === "string") { setS(r); return; }
    let alive = true;
    r.then((d) => { if (alive) setS(d); });
    return () => { alive = false; };
  }, [src]);
  if (!src) return null;
  return <img src={s} alt={alt} draggable={false} className={className} style={style} />;
}
