// ============================================================
// Avatar.jsx — 自分のキャラを丸く表示する共通パーツ
//  avatar が画像(type:"image")ならその絵を、テンプレ(type:"template")なら絵文字を、
//  未設定(null)なら既定のぺんぎんを表示する。
// ============================================================
import { findAvatarTemplate } from "../data/avatars.js";
import { findHero, heroImageFor } from "../data/heroes.js";
import HeroImg from "./HeroImg.jsx";

export default function Avatar({ avatar, size = 42, onClick, ring = null }) {
  const style = {
    width: size, height: size, borderRadius: "50%", flexShrink: 0,
    display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden",
    cursor: onClick ? "pointer" : "default",
    border: ring ? `2px solid ${ring}` : "none",
  };

  // ヒーロー（立ち絵）：丸アイコンでは顔が見えるよう上寄せで切り抜く。
  //  一覧から外したidでも画像があれば表示できるよう heroImageFor(urlOf) で解決。
  if (avatar && avatar.type === "hero") {
    const src = heroImageFor(avatar);
    if (src) {
      return (
        <div style={{ ...style, background: "linear-gradient(135deg,#1e3a8a,#0ea5e9)" }} onClick={onClick}>
          <HeroImg src={src} alt={findHero(avatar.id)?.name || "キャラ"}
            style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 12%" }} />
        </div>
      );
    }
  }

  if (avatar && avatar.type === "image" && avatar.src) {
    return (
      <div style={{ ...style, background: "#1a1a2e" }} onClick={onClick}>
        <img src={avatar.src} alt="キャラ" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </div>
    );
  }

  const t = (avatar && avatar.type === "template" && findAvatarTemplate(avatar.id)) || findAvatarTemplate("penguin");
  return (
    <div style={{ ...style, background: t.bg }} onClick={onClick}>
      <span style={{ fontSize: Math.round(size * 0.56), lineHeight: 1 }}>{t.emoji}</span>
    </div>
  );
}
