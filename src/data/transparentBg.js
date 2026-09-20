// ============================================================
// transparentBg.js — モンスター画像の市松（透過焼き込み）背景を実行時に透明化する
//  ・配布webpは透過が無く、灰色の市松模様が背景に焼き込まれている。
//  ・【トーン採取式】まず画像の「縁」から実際の背景グレー（市松の明暗2色）を
//    実測し、その色だけを辿って四隅から flood fill する。これにより、
//    ザコより市松が暗いボス系（暗灰120/160など）でも、固定しきい値で取りこぼさず
//    背景を消せる（旧版は mx>=150 固定で、暗い市松が残っていた）。
//  ・さらに、モンスターや浮遊装飾に「囲い込まれた」内側の市松ポケットを、
//    局所2トーン判定（近くに明色トーンと暗色トーンが両方ある＝市松）で消す。
//    白目など“単一トーンのベタ白”は1トーンしか無いので残る。
//  ・URLごとに1回だけ処理して dataURL をキャッシュ（図鑑で同じ画像を多数使うため）。
// ============================================================

const ready = new Map();    // url -> dataURL（処理済み）
const pending = new Map();  // url -> Promise<dataURL>

const SAT_MAX = 36;  // 低彩度(背景グレー)とみなす上限 max-min
const TOL = 26;      // 実測トーンとの一致許容差

function process(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const W = img.naturalWidth, H = img.naturalHeight;
        const c = document.createElement("canvas");
        c.width = W; c.height = H;
        const ctx = c.getContext("2d");
        ctx.drawImage(img, 0, 0);
        const im = ctx.getImageData(0, 0, W, H);
        const d = im.data;

        // ── 1) 縁から背景トーン（市松の明暗グレー）を実測 ──
        const cnt = new Map();
        const sampleTone = (x, y) => {
          const o = (y * W + x) * 4;
          if (d[o + 3] <= 200) return; // 透明な縁（既に透過済み画像）はトーンに数えない
          const r = d[o], g = d[o + 1], b = d[o + 2];
          const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
          if (mx - mn <= 40) { const k = (Math.round(mx / 8) * 8); cnt.set(k, (cnt.get(k) || 0) + 1); }
        };
        for (let x = 0; x < W; x += 2) for (const y of [0, 1, 2, 3, H - 1, H - 2, H - 3]) { if (y >= 0 && y < H) sampleTone(x, y); }
        for (let y = 0; y < H; y += 2) for (const x of [0, 1, 2, 3, W - 1, W - 2, W - 3]) { if (x >= 0 && x < W) sampleTone(x, y); }
        let totalSamp = 0; cnt.forEach((v) => { totalSamp += v; });
        const tones = [];
        cnt.forEach((v, k) => { if (v >= totalSamp * 0.04) tones.push(k); });
        tones.sort((a, b) => a - b);

        // 縁が背景グレーでない（＝既に透過 or 背景なし）なら何もしない
        if (!tones.length) { ctx.putImageData(im, 0, 0); resolve(c.toDataURL("image/png")); return; }

        // ある画素が「背景トーンの低彩度グレー」か
        const isBgTone = (o) => {
          if (d[o + 3] === 0) return false;
          const r = d[o], g = d[o + 1], b = d[o + 2];
          const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
          if (mx - mn > SAT_MAX) return false;
          for (let t = 0; t < tones.length; t++) if (Math.abs(mx - tones[t]) <= TOL) return true;
          return false;
        };

        // ── 2) 縁からの flood：実測トーンを辿って連結背景を消す（暗い市松も辿れる） ──
        const seen = new Uint8Array(W * H);
        const st = [];
        for (let i = 0; i < W; i++) { st.push(i, (H - 1) * W + i); }
        for (let j = 0; j < H; j++) { st.push(j * W, j * W + W - 1); }
        while (st.length) {
          const p = st.pop();
          if (seen[p]) continue;
          seen[p] = 1;
          const o = p * 4;
          if (!isBgTone(o)) continue;
          d[o + 3] = 0; // 透明化
          const px = p % W, py = (p / W) | 0;
          if (px > 0) st.push(p - 1);
          if (px < W - 1) st.push(p + 1);
          if (py > 0) st.push(p - W);
          if (py < H - 1) st.push(p + W);
        }

        // ── 3) 囲い込みポケット：残った背景画素を局所2トーン判定で消す ──
        //  近くに明色トーンと暗色トーンが両方あれば市松＝消す。白目等の単一トーンは残る。
        const lo = tones[0], hi = tones[tones.length - 1];
        if (hi - lo >= 20) {
          const R = 7;
          const removeList = [];
          for (let p = 0; p < W * H; p++) {
            const o = p * 4;
            if (!isBgTone(o)) continue;
            const px = p % W, py = (p / W) | 0;
            let haslo = false, hashi = false;
            for (let dy = -R; dy <= R && !(haslo && hashi); dy += 2) {
              const yy = py + dy; if (yy < 0 || yy >= H) continue;
              for (let dx = -R; dx <= R; dx += 2) {
                const xx = px + dx; if (xx < 0 || xx >= W) continue;
                const j = (yy * W + xx) * 4;
                if (d[j + 3] === 0) continue;
                const r = d[j], g = d[j + 1], b = d[j + 2];
                const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
                if (mx - mn > SAT_MAX) continue;
                if (Math.abs(mx - lo) <= TOL) haslo = true;
                if (Math.abs(mx - hi) <= TOL) hashi = true;
              }
            }
            if (haslo && hashi) removeList.push(p);
          }
          for (let k = 0; k < removeList.length; k++) d[removeList[k] * 4 + 3] = 0;
        }

        ctx.putImageData(im, 0, 0);
        resolve(c.toDataURL("image/png"));
      } catch (e) { reject(e); }
    };
    img.onerror = reject;
    img.src = url;
  });
}

/** 透過化した dataURL を返す（同期で取れれば dataURL、未処理なら Promise）。 */
export function transparentBg(url) {
  if (!url) return null;
  if (ready.has(url)) return ready.get(url);
  if (pending.has(url)) return pending.get(url);
  const p = process(url)
    .then((dataUrl) => { ready.set(url, dataUrl); pending.delete(url); return dataUrl; })
    .catch(() => { ready.set(url, url); pending.delete(url); return url; }); // 失敗時は元画像
  pending.set(url, p);
  return p;
}
