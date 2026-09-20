// バトル演出の共通設定。SSRやlocalStorage不可の環境でも安全に使えるようにする。
export const FX_SPEED_KEY = "mathApp3_fxSpeed";
export const FX_SPEEDS = ["normal", "fast", "off"];

export function prefersReducedMotion() {
  return typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

export function getFxSpeed() {
  if (prefersReducedMotion()) return "off";
  try {
    const saved = window.localStorage.getItem(FX_SPEED_KEY);
    return FX_SPEEDS.includes(saved) ? saved : "normal";
  } catch {
    return "normal";
  }
}

export function setFxSpeed(speed) {
  const next = FX_SPEEDS.includes(speed) ? speed : "normal";
  try { window.localStorage.setItem(FX_SPEED_KEY, next); } catch { /* 保存できなくても今回の表示は続ける */ }
  return next;
}

export function fxScale(speed = getFxSpeed()) {
  return speed === "fast" ? 0.5 : speed === "off" ? 0.08 : 1;
}

export function cutInDuration(speed = getFxSpeed()) {
  return speed === "fast" ? 500 : speed === "off" ? 0 : 1300;
}
