// ============================================================
// lessonMedia.js — 単元ごとの「動画＋ワークシート」素材の対応表
//  ・youtubeId  : 単独動画のID（埋め込み再生の開始動画）。
//  ・playlistId : 章まるごとの再生リストID。あると Lesson 画面の埋め込みプレイヤー内で
//      章内の動画を選んで再生できる（ワークシートを見ながら関連動画を流せる）。
//  ・pdf        : public/worksheets/ に置いたワークシートPDFのファイル名。
//      ※著作物（葉一さんのプリント等）は、許可を得たうえで配置すること。
//
//  動画は「とある男が授業をしてみた／葉一」さんのもの。YouTube埋め込みは公式が
//  許可した正規の方法。各単元のIDを足せば、その単元の動画を埋め込み再生できる。
//
//  ★全単元対応：このファイルは index.js の全単元から自動でエントリを用意する。
//    なので「動画＋プリント」入口はすべての単元で開ける（hasLessonMedia が常に true）。
//    実素材（埋め込み動画ID・再生リスト・ワークシートPDF）が届いたら、下の
//    OVERRIDES に「単元ID: { youtubeId / playlistId / pdf }」を1行足すだけでよい。
//    ・youtubeId / playlistId が無い単元は、19ch ページへのリンク（videoPage）に自動フォールバック。
//    ・pdf が無い単元は、白紙キャンバスに手書きできる（Lesson 側で対応）。
// ============================================================
import { videoUrlFor, worksheetUrlFor } from "./videoLinks.js";
import { allChapters } from "./index.js";

// 中2「式の計算」章の再生リスト（式の計算①〜：単項式と多項式／加法・減法／乗法・除法 ほか）
const G2C1_PLAYLIST = "PLKRhhk0lEyzPfFN5LF8JNRXhzt8kF7iKc";

// ── 【はいちモード】葉一さんのYouTube動画ID 記入表 ───────────────────
//  ここに「単元ID: '動画ID'」を1行足すと、はいちモード／レッスン画面で
//  その単元の動画がアプリ内に埋め込み再生されます（葉一さんから埋め込み許可済み）。
//   ・動画ID＝ YouTube URL の v= のあと、または youtu.be/ のあとの11文字。
//     例) https://www.youtube.com/watch?v=7W71Q4nwX2U → '7W71Q4nwX2U'
//   ・未記入（''）の単元は、19chの該当ページを「▶19chで見る」ボタンで開くフォールバックになります。
//  ★ 単元IDの一覧と内容は data/videoLinks.js のコメント（各19chレッスンの対応）を参照。
//  ★ 取得は19chの各ページ内のYouTube埋め込みを確認するのが確実（葉一さん本人のID一覧があれば一括で埋められます）。
const HAICHI_VIDEO_IDS = {
  // ── 中1 ──
  u1: "", u2: "", u3: "", u4: "", u5: "", u6: "",        // 正負の数
  v1: "", v2: "", v3: "", v4: "", v5: "",                // 文字式
  e1: "", e2: "", e3: "", e4: "", e5: "",                // 方程式
  h1: "", h2: "", h3: "", h4: "", h5: "",                // 比例・反比例
  z1: "", z2: "", z3: "", z4: "",                        // 平面図形
  k1: "", k2: "", k3: "", k4: "",                        // 空間図形
  d1: "", d2: "", d3: "",                                // データの活用
  // ── 中2 ──（g2c1u1 は判明分。残りは要確認）
  g2c1u1: "7W71Q4nwX2U",
  // g2c1u2: "", ...（必要に応じて追加）
  // ── 中3 ──（要確認）
};

// ── 実素材の上書き表（素材が届いたらここに足す） ───────────────
//  形式：単元ID: { youtubeId?, playlistId?, pdf? }
const OVERRIDES = {
  // 中1サンプル（差し替え用ダミーPDF）
  u1: { pdf: "u1.pdf" },

  // 中2「式の計算」(g2c1)：章全体のワークシート(g2c1.pdf)＋章の再生リストを埋め込み。
  //  プレイヤー内で関連動画を選べる。先頭の単元は開始動画も指定。
  g2c1u1: { youtubeId: "7W71Q4nwX2U", playlistId: G2C1_PLAYLIST, pdf: "g2c1.pdf" }, // 多項式の加法・減法
  g2c1u2: { playlistId: G2C1_PLAYLIST, pdf: "g2c1.pdf" }, // 単項式の乗法
  g2c1u3: { playlistId: G2C1_PLAYLIST, pdf: "g2c1.pdf" }, // 累乗を含む単項式の計算
  g2c1u4: { playlistId: G2C1_PLAYLIST, pdf: "g2c1.pdf" }, // 単項式の除法
  g2c1u5: { playlistId: G2C1_PLAYLIST, pdf: "g2c1.pdf" }, // 乗除の混じった計算
  g2c1u6: { playlistId: G2C1_PLAYLIST, pdf: "g2c1.pdf" }, // 等式の変形
};

// index.js の全単元IDを集める（中1〜中3）
function allUnitIds() {
  const ids = [];
  for (const ch of allChapters()) for (const u of ch.units) ids.push(u.id);
  return ids;
}

// 全単元のエントリを用意（既定は空＝動画はページリンク・プリントは白紙）。OVERRIDES があれば上書き。
const MEDIA = (() => {
  const base = { youtubeId: "", playlistId: "", pdf: null };
  const m = {};
  for (const id of allUnitIds()) m[id] = { ...base, ...(OVERRIDES[id] || {}) };
  // index に載っていないID（u1 サンプル等）も拾う
  for (const id of Object.keys(OVERRIDES)) if (!m[id]) m[id] = { ...base, ...OVERRIDES[id] };
  // 【はいちモード】記入表のYouTube動画ID（空でない分だけ）を youtubeId に反映
  for (const [id, vid] of Object.entries(HAICHI_VIDEO_IDS)) {
    if (!vid) continue;
    if (!m[id]) m[id] = { ...base };
    m[id] = { ...m[id], youtubeId: vid };
  }
  return m;
})();

export function hasLessonMedia(unitId) {
  return !!MEDIA[unitId];
}

export function lessonMediaFor(unitId) {
  const m = MEDIA[unitId];
  if (!m) return null;
  return {
    youtubeId: m.youtubeId || "",
    playlistId: m.playlistId || "",
    // ★ワークシートは再ホストせず、19ch のPDFをそのまま読み込んで表示する（事前DLしない）。
    //   Lesson 側で Google ドキュメントビューア経由の iframe に渡す。
    worksheetUrl: worksheetUrlFor(unitId),
    // ローカルにPDFを置いた単元だけのフォールバック（基本は使わない）。
    pdfUrl: m.pdf ? import.meta.env.BASE_URL + "worksheets/" + m.pdf : null,
    videoPage: videoUrlFor(unitId), // 埋め込みが無いときのフォールバック（別タブで19ch）
  };
}
