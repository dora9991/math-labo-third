// ============================================================
// gachaRoster.js — ゲーム特化版（Unity構想）向けの下ごしらえデータ
//  2026-09-09更新（同日・3回目の設計を反映）：
//
//  各キャラに5パラメータ「計算・方程式・関数・図形・データ」をゼロサムで追加した。
//  ゼロサム＝合計をレア度ごとに固定（N=260/R=280/SR=300/UR=330）することで、
//  「高い図形は必ず他が低い」が保証され、1キャラ最強・雪だるま式強化を防ぐ
//  （9/9・3回目の指摘：同じパラメータPが基礎ダメージ・クリ率・クリ倍率を
//    全部押し上げるので、ゼロサムが無いと成立しない）。
//
//  【主特性の決め方】既存のchapterId→5系統マッピング（8/11設計）をそのまま使用。
//    章に属さないキャラ（裏ボス・魔王）はIDから決定論的に主特性を割り当てた。
//  【尖り具合】既存のrole（tank/cannon/nuker等）を流用——nuker/cannonは主特性に
//    予算の42〜50%を集中させる"尖り型"、tank/healer/normalは24〜28%程度の"平均型"。
//  【クリティカル式（9/9・3回目の叩き台をそのまま採用）】
//    対応系統のパラメータをPとして、
//      基礎ダメージ倍率 = 0.5 + P/100
//      クリティカル率   = 5% + P×0.30%
//      クリティカル倍率 = 1.8 + P×0.004
//    失敗＝ダメージ0の一線は維持。クリティカルは「正解した上での運ボーナス」。
//
//  【まだ入れていない下ごしらえ】色属性・難度べットは「挑戦の洞穴」（別コンテンツ）へ
//    格納する方針（9/9・3回目）。このファイルの基本ステータスには含めない。
//
//  【2026-09-11追記】各キャラのhp/atkは「レベルMAX（上限）到達時の数値」として扱う。
//    レベル上限はレア度で固定（N=30/R=40/SR=50/UR=70）。レベル1〜上限の実際の値は
//    growthCurve.js の getStatsAtLevel()/statAtLevel() で算出する（一次関数で線形成長し、
//    レベル上限で必ずこのファイルの数値と一致する）。5パラメータ(subjects)はレベルで
//    成長させない（ゼロサムの意味を保つため。詳細はgrowthCurve.jsのコメント参照）。
// ============================================================
export const GACHA_ROSTER = [
  {
    "id": "sample_intro",
    "name": "れんしゅうスライム",
    "theme": "正負の数（入門）",
    "chapterId": "c1",
    "grade": 1,
    "kind": "sample",
    "rarity": "N",
    "role": "normal",
    "roleTag": "れんしゅう（とても弱い）",
    "hp": 800,
    "atk": 195,
    "skill": null,
    "color": "#4488ff",
    "art": "calc",
    "subjects": {
      "calc": 68,
      "eq": 41,
      "func": 46,
      "geo": 38,
      "data": 67
    },
    "primarySubject": "calc"
  },
  {
    "id": "m_c1_u1",
    "name": "スウチビット",
    "theme": "正負の意味・大小",
    "chapterId": "c1",
    "grade": 1,
    "kind": "unit",
    "rarity": "N",
    "role": "normal",
    "roleTag": "バランス",
    "hp": 760,
    "atk": 145,
    "skill": {
      "id": "timesteal",
      "name": "時間どろぼう",
      "icon": "⏳"
    },
    "color": "#4488ff",
    "art": "calc",
    "subjects": {
      "calc": 68,
      "eq": 48,
      "func": 48,
      "geo": 48,
      "data": 48
    },
    "primarySubject": "calc"
  },
  {
    "id": "m_c1_u2",
    "name": "ソスウニョロ",
    "theme": "加法（足し算）",
    "chapterId": "c1",
    "grade": 1,
    "kind": "unit",
    "rarity": "N",
    "role": "tank",
    "roleTag": "硬い・攻撃ひかえめ",
    "hp": 851,
    "atk": 106,
    "skill": {
      "id": "barrier",
      "name": "身を守るバリア",
      "icon": "🔰"
    },
    "color": "#44ff88",
    "art": "prime",
    "subjects": {
      "calc": 62,
      "eq": 49,
      "func": 49,
      "geo": 50,
      "data": 50
    },
    "primarySubject": "calc"
  },
  {
    "id": "m_c1_u3",
    "name": "スピードダッシュ",
    "theme": "減法（引き算）",
    "chapterId": "c1",
    "grade": 1,
    "kind": "unit",
    "rarity": "N",
    "role": "normal",
    "roleTag": "バランス",
    "hp": 761,
    "atk": 146,
    "skill": {
      "id": "panic",
      "name": "あせりの波動",
      "icon": "😵"
    },
    "color": "#ff4444",
    "art": "speed",
    "subjects": {
      "calc": 68,
      "eq": 48,
      "func": 48,
      "geo": 48,
      "data": 48
    },
    "primarySubject": "calc"
  },
  {
    "id": "m_c1_u4",
    "name": "スウチバイト",
    "theme": "乗法・除法",
    "chapterId": "c1",
    "grade": 1,
    "kind": "unit",
    "rarity": "N",
    "role": "tank",
    "roleTag": "硬い・攻撃ひかえめ",
    "hp": 852,
    "atk": 107,
    "skill": {
      "id": "eregen",
      "name": "自己再生",
      "icon": "♻️"
    },
    "color": "#4488ff",
    "art": "calc",
    "subjects": {
      "calc": 62,
      "eq": 49,
      "func": 49,
      "geo": 50,
      "data": 50
    },
    "primarySubject": "calc"
  },
  {
    "id": "m_c1_u5",
    "name": "ソスウプライ",
    "theme": "四則混合計算",
    "chapterId": "c1",
    "grade": 1,
    "kind": "unit",
    "rarity": "N",
    "role": "cannon",
    "roleTag": "もろいが痛い",
    "hp": 716,
    "atk": 198,
    "skill": {
      "id": "curse",
      "name": "呪いの一撃",
      "icon": "💀"
    },
    "color": "#44ff88",
    "art": "prime",
    "subjects": {
      "calc": 109,
      "eq": 37,
      "func": 38,
      "geo": 38,
      "data": 38
    },
    "primarySubject": "calc"
  },
  {
    "id": "m_c1_u6",
    "name": "スピードハヤテ",
    "theme": "素因数分解",
    "chapterId": "c1",
    "grade": 1,
    "kind": "unit",
    "rarity": "N",
    "role": "bruiser",
    "roleTag": "ちから自慢",
    "hp": 741,
    "atk": 172,
    "skill": {
      "id": "crit",
      "name": "会心の一撃",
      "icon": "⭐"
    },
    "color": "#ff4444",
    "art": "speed",
    "subjects": {
      "calc": 83,
      "eq": 45,
      "func": 44,
      "geo": 44,
      "data": 44
    },
    "primarySubject": "calc"
  },
  {
    "id": "m_c2_v1",
    "name": "ブンスウブンブン",
    "theme": "文字式の表し方",
    "chapterId": "c2",
    "grade": 1,
    "kind": "unit",
    "rarity": "N",
    "role": "cannon",
    "roleTag": "もろいが痛い",
    "hp": 718,
    "atk": 201,
    "skill": {
      "id": "pierce",
      "name": "防御貫通",
      "icon": "🗡️"
    },
    "color": "#ff88cc",
    "art": "fraction",
    "subjects": {
      "calc": 109,
      "eq": 44,
      "func": 44,
      "geo": 44,
      "data": 19
    },
    "primarySubject": "calc"
  },
  {
    "id": "m_c2_v2",
    "name": "テンビンリン",
    "theme": "式の値（代入）",
    "chapterId": "c2",
    "grade": 1,
    "kind": "unit",
    "rarity": "N",
    "role": "tank",
    "roleTag": "硬い・攻撃ひかえめ",
    "hp": 854,
    "atk": 109,
    "skill": {
      "id": "dispel",
      "name": "バフ消し",
      "icon": "✖️"
    },
    "color": "#cc88ff",
    "art": "balance",
    "subjects": {
      "calc": 62,
      "eq": 57,
      "func": 58,
      "geo": 58,
      "data": 25
    },
    "primarySubject": "calc"
  },
  {
    "id": "m_c2_v3",
    "name": "スウチチップ",
    "theme": "加法・減法",
    "chapterId": "c2",
    "grade": 1,
    "kind": "unit",
    "rarity": "N",
    "role": "normal",
    "roleTag": "バランス",
    "hp": 765,
    "atk": 152,
    "skill": {
      "id": "fog",
      "name": "沈黙の霧",
      "icon": "🌫️"
    },
    "color": "#4488ff",
    "art": "calc",
    "subjects": {
      "calc": 68,
      "eq": 56,
      "func": 56,
      "geo": 56,
      "data": 24
    },
    "primarySubject": "calc"
  },
  {
    "id": "m_c2_v4",
    "name": "ブンスウハンブン",
    "theme": "乗法・除法（分配）",
    "chapterId": "c2",
    "grade": 1,
    "kind": "unit",
    "rarity": "N",
    "role": "bruiser",
    "roleTag": "ちから自慢",
    "hp": 746,
    "atk": 179,
    "skill": {
      "id": "multi",
      "name": "連続攻撃",
      "icon": "👊"
    },
    "color": "#ff88cc",
    "art": "fraction",
    "subjects": {
      "calc": 83,
      "eq": 51,
      "func": 52,
      "geo": 52,
      "data": 22
    },
    "primarySubject": "calc"
  },
  {
    "id": "m_c2_v5",
    "name": "テンビンヤジロ",
    "theme": "四則混合（複合）",
    "chapterId": "c2",
    "grade": 1,
    "kind": "unit",
    "rarity": "N",
    "role": "nuker",
    "roleTag": "必殺技が強い",
    "hp": 705,
    "atk": 231,
    "skill": {
      "id": "silence",
      "name": "封印の呪縛",
      "icon": "🔇"
    },
    "color": "#cc88ff",
    "art": "balance",
    "subjects": {
      "calc": 130,
      "eq": 38,
      "func": 38,
      "geo": 38,
      "data": 16
    },
    "primarySubject": "calc"
  },
  {
    "id": "m_c3_e1",
    "name": "テンビンハカリ",
    "theme": "方程式の解き方①",
    "chapterId": "c3",
    "grade": 1,
    "kind": "unit",
    "rarity": "N",
    "role": "tank",
    "roleTag": "硬い・攻撃ひかえめ",
    "hp": 860,
    "atk": 115,
    "skill": {
      "id": "comboseal",
      "name": "コンボ封じ",
      "icon": "💔"
    },
    "color": "#cc88ff",
    "art": "balance",
    "subjects": {
      "calc": 49,
      "eq": 62,
      "func": 49,
      "geo": 50,
      "data": 50
    },
    "primarySubject": "eq"
  },
  {
    "id": "m_c3_e2",
    "name": "ブンスウスラリ",
    "theme": "方程式の解き方②",
    "chapterId": "c3",
    "grade": 1,
    "kind": "unit",
    "rarity": "N",
    "role": "cannon",
    "roleTag": "もろいが痛い",
    "hp": 728,
    "atk": 216,
    "skill": {
      "id": "timecrush",
      "name": "時間圧縮",
      "icon": "⌛"
    },
    "color": "#ff88cc",
    "art": "fraction",
    "subjects": {
      "calc": 37,
      "eq": 109,
      "func": 38,
      "geo": 38,
      "data": 38
    },
    "primarySubject": "eq"
  },
  {
    "id": "m_c3_e3",
    "name": "ソスウスネーク",
    "theme": "両辺に文字がある式",
    "chapterId": "c3",
    "grade": 1,
    "kind": "unit",
    "rarity": "N",
    "role": "bruiser",
    "roleTag": "ちから自慢",
    "hp": 755,
    "atk": 192,
    "skill": {
      "id": "spdrain",
      "name": "SP吸収",
      "icon": "🌀"
    },
    "color": "#44ff88",
    "art": "prime",
    "subjects": {
      "calc": 45,
      "eq": 83,
      "func": 44,
      "geo": 44,
      "data": 44
    },
    "primarySubject": "eq"
  },
  {
    "id": "m_c3_e4",
    "name": "テンビンユラリ",
    "theme": "比例式",
    "chapterId": "c3",
    "grade": 1,
    "kind": "unit",
    "rarity": "N",
    "role": "cannon",
    "roleTag": "もろいが痛い",
    "hp": 734,
    "atk": 226,
    "skill": {
      "id": "hardnext",
      "name": "難問化の呪い",
      "icon": "📈"
    },
    "color": "#cc88ff",
    "art": "balance",
    "subjects": {
      "calc": 37,
      "eq": 109,
      "func": 38,
      "geo": 38,
      "data": 38
    },
    "primarySubject": "eq"
  },
  {
    "id": "m_c3_e5",
    "name": "ブンスウプニ",
    "theme": "方程式の文章題",
    "chapterId": "c3",
    "grade": 1,
    "kind": "unit",
    "rarity": "N",
    "role": "bruiser",
    "roleTag": "ちから自慢",
    "hp": 762,
    "atk": 202,
    "skill": {
      "id": "crit",
      "name": "会心の一撃",
      "icon": "⭐"
    },
    "color": "#ff88cc",
    "art": "fraction",
    "subjects": {
      "calc": 45,
      "eq": 83,
      "func": 44,
      "geo": 44,
      "data": 44
    },
    "primarySubject": "eq"
  },
  {
    "id": "m_c4_h1",
    "name": "ナミウェイブ",
    "theme": "比例",
    "chapterId": "c4",
    "grade": 1,
    "kind": "unit",
    "rarity": "N",
    "role": "nuker",
    "roleTag": "必殺技が強い",
    "hp": 715,
    "atk": 247,
    "skill": {
      "id": "curse",
      "name": "呪いの一撃",
      "icon": "💀"
    },
    "color": "#00ddff",
    "art": "wave",
    "subjects": {
      "calc": 32,
      "eq": 32,
      "func": 130,
      "geo": 33,
      "data": 33
    },
    "primarySubject": "func"
  },
  {
    "id": "m_c4_h2",
    "name": "スピードビュン",
    "theme": "反比例",
    "chapterId": "c4",
    "grade": 1,
    "kind": "unit",
    "rarity": "N",
    "role": "cannon",
    "roleTag": "もろいが痛い",
    "hp": 742,
    "atk": 238,
    "skill": {
      "id": "panic",
      "name": "あせりの波動",
      "icon": "😵"
    },
    "color": "#ff4444",
    "art": "speed",
    "subjects": {
      "calc": 37,
      "eq": 38,
      "func": 109,
      "geo": 38,
      "data": 38
    },
    "primarySubject": "func"
  },
  {
    "id": "m_c4_h3",
    "name": "ズケイリス",
    "theme": "座標とグラフ",
    "chapterId": "c4",
    "grade": 1,
    "kind": "unit",
    "rarity": "N",
    "role": "cannon",
    "roleTag": "もろいが痛い",
    "hp": 749,
    "atk": 248,
    "skill": {
      "id": "fog",
      "name": "沈黙の霧",
      "icon": "🌫️"
    },
    "color": "#ff8844",
    "art": "geo",
    "subjects": {
      "calc": 37,
      "eq": 38,
      "func": 109,
      "geo": 38,
      "data": 38
    },
    "primarySubject": "func"
  },
  {
    "id": "m_c4_h4",
    "name": "ナミザブン",
    "theme": "変域",
    "chapterId": "c4",
    "grade": 1,
    "kind": "unit",
    "rarity": "N",
    "role": "tank",
    "roleTag": "硬い・攻撃ひかえめ",
    "hp": 880,
    "atk": 133,
    "skill": {
      "id": "barrier",
      "name": "身を守るバリア",
      "icon": "🔰"
    },
    "color": "#00ddff",
    "art": "wave",
    "subjects": {
      "calc": 49,
      "eq": 49,
      "func": 62,
      "geo": 50,
      "data": 50
    },
    "primarySubject": "func"
  },
  {
    "id": "m_c4_h5",
    "name": "スピードシッツウ",
    "theme": "比例・反比例の利用",
    "chapterId": "c4",
    "grade": 1,
    "kind": "unit",
    "rarity": "N",
    "role": "nuker",
    "roleTag": "必殺技が強い",
    "hp": 725,
    "atk": 264,
    "skill": {
      "id": "decoy",
      "name": "みがわり",
      "icon": "🎎"
    },
    "color": "#ff4444",
    "art": "speed",
    "subjects": {
      "calc": 32,
      "eq": 32,
      "func": 130,
      "geo": 33,
      "data": 33
    },
    "primarySubject": "func"
  },
  {
    "id": "m_c5_z1",
    "name": "カクドテンシ",
    "theme": "図形の基本と角",
    "chapterId": "c5",
    "grade": 1,
    "kind": "unit",
    "rarity": "N",
    "role": "normal",
    "roleTag": "バランス",
    "hp": 801,
    "atk": 197,
    "skill": {
      "id": "timesteal",
      "name": "時間どろぼう",
      "icon": "⏳"
    },
    "color": "#ffaa00",
    "art": "angle",
    "subjects": {
      "calc": 48,
      "eq": 48,
      "func": 48,
      "geo": 68,
      "data": 48
    },
    "primarySubject": "geo"
  },
  {
    "id": "m_c5_z2",
    "name": "ズケイカクン",
    "theme": "図形の移動",
    "chapterId": "c5",
    "grade": 1,
    "kind": "unit",
    "rarity": "N",
    "role": "tank",
    "roleTag": "硬い・攻撃ひかえめ",
    "hp": 892,
    "atk": 145,
    "skill": {
      "id": "barrier",
      "name": "身を守るバリア",
      "icon": "🔰"
    },
    "color": "#ff8844",
    "art": "geo",
    "subjects": {
      "calc": 49,
      "eq": 49,
      "func": 50,
      "geo": 62,
      "data": 50
    },
    "primarySubject": "geo"
  },
  {
    "id": "m_c5_z3",
    "name": "ブンスウクワリ",
    "theme": "おうぎ形①（弧・面積）",
    "chapterId": "c5",
    "grade": 1,
    "kind": "unit",
    "rarity": "N",
    "role": "normal",
    "roleTag": "バランス",
    "hp": 809,
    "atk": 207,
    "skill": {
      "id": "panic",
      "name": "あせりの波動",
      "icon": "😵"
    },
    "color": "#ff88cc",
    "art": "fraction",
    "subjects": {
      "calc": 48,
      "eq": 48,
      "func": 48,
      "geo": 68,
      "data": 48
    },
    "primarySubject": "geo"
  },
  {
    "id": "m_c5_z4",
    "name": "カクドハネル",
    "theme": "おうぎ形②（中心角）",
    "chapterId": "c5",
    "grade": 1,
    "kind": "unit",
    "rarity": "N",
    "role": "tank",
    "roleTag": "硬い・攻撃ひかえめ",
    "hp": 904,
    "atk": 156,
    "skill": {
      "id": "eregen",
      "name": "自己再生",
      "icon": "♻️"
    },
    "color": "#ffaa00",
    "art": "angle",
    "subjects": {
      "calc": 49,
      "eq": 49,
      "func": 50,
      "geo": 62,
      "data": 50
    },
    "primarySubject": "geo"
  },
  {
    "id": "m_c6_k1",
    "name": "リッタイハコ",
    "theme": "立体の種類・特徴",
    "chapterId": "c6",
    "grade": 1,
    "kind": "unit",
    "rarity": "R",
    "role": "cannon",
    "roleTag": "もろいが痛い",
    "hp": 893,
    "atk": 291,
    "skill": {
      "id": "curse",
      "name": "呪いの一撃",
      "icon": "💀"
    },
    "color": "#88ffaa",
    "art": "volume",
    "subjects": {
      "calc": 40,
      "eq": 40,
      "func": 41,
      "geo": 118,
      "data": 41
    },
    "primarySubject": "geo"
  },
  {
    "id": "m_c6_k2",
    "name": "ズケイハキサ",
    "theme": "体積",
    "chapterId": "c6",
    "grade": 1,
    "kind": "unit",
    "rarity": "R",
    "role": "bruiser",
    "roleTag": "ちから自慢",
    "hp": 940,
    "atk": 282,
    "skill": {
      "id": "crit",
      "name": "会心の一撃",
      "icon": "⭐"
    },
    "color": "#ff8844",
    "art": "geo",
    "subjects": {
      "calc": 47,
      "eq": 47,
      "func": 48,
      "geo": 90,
      "data": 48
    },
    "primarySubject": "geo"
  },
  {
    "id": "m_c6_k3",
    "name": "サイコロコ",
    "theme": "表面積",
    "chapterId": "c6",
    "grade": 1,
    "kind": "unit",
    "rarity": "R",
    "role": "cannon",
    "roleTag": "もろいが痛い",
    "hp": 918,
    "atk": 348,
    "skill": {
      "id": "pierce",
      "name": "防御貫通",
      "icon": "🗡️"
    },
    "color": "#ffdd44",
    "art": "dice",
    "subjects": {
      "calc": 40,
      "eq": 40,
      "func": 41,
      "geo": 118,
      "data": 41
    },
    "primarySubject": "geo"
  },
  {
    "id": "m_c6_k4",
    "name": "リッタイリッポー",
    "theme": "球",
    "chapterId": "c6",
    "grade": 1,
    "kind": "unit",
    "rarity": "N",
    "role": "tank",
    "roleTag": "硬い・攻撃ひかえめ",
    "hp": 928,
    "atk": 179,
    "skill": {
      "id": "dispel",
      "name": "バフ消し",
      "icon": "✖️"
    },
    "color": "#88ffaa",
    "art": "volume",
    "subjects": {
      "calc": 49,
      "eq": 49,
      "func": 50,
      "geo": 62,
      "data": 50
    },
    "primarySubject": "geo"
  },
  {
    "id": "m_c7_d1",
    "name": "サイコロール",
    "theme": "代表値",
    "chapterId": "c7",
    "grade": 1,
    "kind": "unit",
    "rarity": "R",
    "role": "normal",
    "roleTag": "バランス",
    "hp": 964,
    "atk": 232,
    "skill": {
      "id": "fog",
      "name": "沈黙の霧",
      "icon": "🌫️"
    },
    "color": "#ffdd44",
    "art": "dice",
    "subjects": {
      "calc": 51,
      "eq": 52,
      "func": 52,
      "geo": 52,
      "data": 73
    },
    "primarySubject": "data"
  },
  {
    "id": "m_c7_d2",
    "name": "ソスウロボ",
    "theme": "度数分布・相対度数",
    "chapterId": "c7",
    "grade": 1,
    "kind": "unit",
    "rarity": "R",
    "role": "bruiser",
    "roleTag": "ちから自慢",
    "hp": 1005,
    "atk": 419,
    "skill": {
      "id": "multi",
      "name": "連続攻撃",
      "icon": "👊"
    },
    "color": "#44ff88",
    "art": "prime",
    "subjects": {
      "calc": 47,
      "eq": 47,
      "func": 48,
      "geo": 48,
      "data": 90
    },
    "primarySubject": "data"
  },
  {
    "id": "m_c7_d3",
    "name": "ナミプカ",
    "theme": "確率（相対度数）",
    "chapterId": "c7",
    "grade": 1,
    "kind": "unit",
    "rarity": "R",
    "role": "nuker",
    "roleTag": "必殺技が強い",
    "hp": 885,
    "atk": 366,
    "skill": {
      "id": "silence",
      "name": "封印の呪縛",
      "icon": "🔇"
    },
    "color": "#00ddff",
    "art": "wave",
    "subjects": {
      "calc": 35,
      "eq": 35,
      "func": 35,
      "geo": 35,
      "data": 140
    },
    "primarySubject": "data"
  },
  {
    "id": "m_g2c1_g2c1u1",
    "name": "スウチカ",
    "theme": "多項式の加法・減法",
    "chapterId": "g2c1",
    "grade": 2,
    "kind": "unit",
    "rarity": "N",
    "role": "normal",
    "roleTag": "バランス",
    "hp": 760,
    "atk": 145,
    "skill": {
      "id": "timesteal",
      "name": "時間どろぼう",
      "icon": "⏳"
    },
    "color": "#4488ff",
    "art": "calc",
    "subjects": {
      "calc": 68,
      "eq": 34,
      "func": 59,
      "geo": 41,
      "data": 58
    },
    "primarySubject": "calc"
  },
  {
    "id": "m_g2c1_g2c1u2",
    "name": "テンビンツリア",
    "theme": "単項式の乗法",
    "chapterId": "g2c1",
    "grade": 2,
    "kind": "unit",
    "rarity": "N",
    "role": "tank",
    "roleTag": "硬い・攻撃ひかえめ",
    "hp": 852,
    "atk": 107,
    "skill": {
      "id": "barrier",
      "name": "身を守るバリア",
      "icon": "🔰"
    },
    "color": "#cc88ff",
    "art": "balance",
    "subjects": {
      "calc": 62,
      "eq": 34,
      "func": 61,
      "geo": 43,
      "data": 60
    },
    "primarySubject": "calc"
  },
  {
    "id": "m_g2c1_g2c1u3",
    "name": "ソスウトグロ",
    "theme": "累乗を含む単項式の計算",
    "chapterId": "g2c1",
    "grade": 2,
    "kind": "unit",
    "rarity": "N",
    "role": "normal",
    "roleTag": "バランス",
    "hp": 761,
    "atk": 146,
    "skill": {
      "id": "panic",
      "name": "あせりの波動",
      "icon": "😵"
    },
    "color": "#44ff88",
    "art": "prime",
    "subjects": {
      "calc": 68,
      "eq": 34,
      "func": 59,
      "geo": 41,
      "data": 58
    },
    "primarySubject": "calc"
  },
  {
    "id": "m_g2c1_g2c1u4",
    "name": "スウチロジック",
    "theme": "単項式の除法",
    "chapterId": "g2c1",
    "grade": 2,
    "kind": "unit",
    "rarity": "N",
    "role": "tank",
    "roleTag": "硬い・攻撃ひかえめ",
    "hp": 853,
    "atk": 108,
    "skill": {
      "id": "eregen",
      "name": "自己再生",
      "icon": "♻️"
    },
    "color": "#4488ff",
    "art": "calc",
    "subjects": {
      "calc": 62,
      "eq": 34,
      "func": 61,
      "geo": 43,
      "data": 60
    },
    "primarySubject": "calc"
  },
  {
    "id": "m_g2c1_g2c1u5",
    "name": "テンビンウェイト",
    "theme": "乗除の混じった計算",
    "chapterId": "g2c1",
    "grade": 2,
    "kind": "unit",
    "rarity": "N",
    "role": "cannon",
    "roleTag": "もろいが痛い",
    "hp": 719,
    "atk": 202,
    "skill": {
      "id": "curse",
      "name": "呪いの一撃",
      "icon": "💀"
    },
    "color": "#cc88ff",
    "art": "balance",
    "subjects": {
      "calc": 109,
      "eq": 25,
      "func": 47,
      "geo": 33,
      "data": 46
    },
    "primarySubject": "calc"
  },
  {
    "id": "m_g2c1_g2c1u6",
    "name": "ソスウニシキ",
    "theme": "等式の変形",
    "chapterId": "g2c1",
    "grade": 2,
    "kind": "unit",
    "rarity": "N",
    "role": "bruiser",
    "roleTag": "ちから自慢",
    "hp": 744,
    "atk": 178,
    "skill": {
      "id": "crit",
      "name": "会心の一撃",
      "icon": "⭐"
    },
    "color": "#44ff88",
    "art": "prime",
    "subjects": {
      "calc": 83,
      "eq": 31,
      "func": 55,
      "geo": 38,
      "data": 53
    },
    "primarySubject": "calc"
  },
  {
    "id": "m_g2c2_g2c2u1",
    "name": "テンビンポイズ",
    "theme": "連立方程式の解き方（加減法・代入法）",
    "chapterId": "g2c2",
    "grade": 2,
    "kind": "unit",
    "rarity": "N",
    "role": "cannon",
    "roleTag": "もろいが痛い",
    "hp": 723,
    "atk": 209,
    "skill": {
      "id": "pierce",
      "name": "防御貫通",
      "icon": "🗡️"
    },
    "color": "#cc88ff",
    "art": "balance",
    "subjects": {
      "calc": 41,
      "eq": 109,
      "func": 31,
      "geo": 49,
      "data": 30
    },
    "primarySubject": "eq"
  },
  {
    "id": "m_g2c2_g2c2u2",
    "name": "スウチデジ",
    "theme": "連立方程式（加減法の練習）",
    "chapterId": "g2c2",
    "grade": 2,
    "kind": "unit",
    "rarity": "N",
    "role": "tank",
    "roleTag": "硬い・攻撃ひかえめ",
    "hp": 860,
    "atk": 115,
    "skill": {
      "id": "dispel",
      "name": "バフ消し",
      "icon": "✖️"
    },
    "color": "#4488ff",
    "art": "calc",
    "subjects": {
      "calc": 55,
      "eq": 62,
      "func": 42,
      "geo": 61,
      "data": 40
    },
    "primarySubject": "eq"
  },
  {
    "id": "m_g2c2_g2c2u3",
    "name": "ブンスウプブン",
    "theme": "連立方程式（代入法・かっこ・分数・小数）",
    "chapterId": "g2c2",
    "grade": 2,
    "kind": "unit",
    "rarity": "N",
    "role": "normal",
    "roleTag": "バランス",
    "hp": 773,
    "atk": 161,
    "skill": {
      "id": "fog",
      "name": "沈黙の霧",
      "icon": "🌫️"
    },
    "color": "#ff88cc",
    "art": "fraction",
    "subjects": {
      "calc": 51,
      "eq": 68,
      "func": 40,
      "geo": 63,
      "data": 38
    },
    "primarySubject": "eq"
  },
  {
    "id": "m_g2c3_g2c3u1",
    "name": "ナミウズ",
    "theme": "変化の割合・増加量",
    "chapterId": "g2c3",
    "grade": 2,
    "kind": "unit",
    "rarity": "N",
    "role": "bruiser",
    "roleTag": "ちから自慢",
    "hp": 760,
    "atk": 199,
    "skill": {
      "id": "multi",
      "name": "連続攻撃",
      "icon": "👊"
    },
    "color": "#00ddff",
    "art": "wave",
    "subjects": {
      "calc": 40,
      "eq": 57,
      "func": 83,
      "geo": 49,
      "data": 31
    },
    "primarySubject": "func"
  },
  {
    "id": "m_g2c3_g2c3u2",
    "name": "スピードカケル",
    "theme": "傾き・切片・式の決定",
    "chapterId": "g2c3",
    "grade": 2,
    "kind": "unit",
    "rarity": "N",
    "role": "nuker",
    "roleTag": "必殺技が強い",
    "hp": 716,
    "atk": 250,
    "skill": {
      "id": "silence",
      "name": "封印の呪縛",
      "icon": "🔇"
    },
    "color": "#ff4444",
    "art": "speed",
    "subjects": {
      "calc": 29,
      "eq": 42,
      "func": 130,
      "geo": 36,
      "data": 23
    },
    "primarySubject": "func"
  },
  {
    "id": "m_g2c3_g2c3u3",
    "name": "スウチピコ",
    "theme": "一次関数のグラフと変域・交点",
    "chapterId": "g2c3",
    "grade": 2,
    "kind": "unit",
    "rarity": "N",
    "role": "tank",
    "roleTag": "硬い・攻撃ひかえめ",
    "hp": 877,
    "atk": 131,
    "skill": {
      "id": "comboseal",
      "name": "コンボ封じ",
      "icon": "💔"
    },
    "color": "#4488ff",
    "art": "calc",
    "subjects": {
      "calc": 47,
      "eq": 61,
      "func": 62,
      "geo": 55,
      "data": 35
    },
    "primarySubject": "func"
  },
  {
    "id": "m_g2c4_g2c4u1",
    "name": "ズケイゲロ",
    "theme": "多角形の内角の和",
    "chapterId": "g2c4",
    "grade": 2,
    "kind": "unit",
    "rarity": "N",
    "role": "cannon",
    "roleTag": "もろいが痛い",
    "hp": 756,
    "atk": 259,
    "skill": {
      "id": "timecrush",
      "name": "時間圧縮",
      "icon": "⌛"
    },
    "color": "#ff8844",
    "art": "geo",
    "subjects": {
      "calc": 42,
      "eq": 26,
      "func": 50,
      "geo": 109,
      "data": 33
    },
    "primarySubject": "geo"
  },
  {
    "id": "m_g2c4_g2c4u2",
    "name": "カクドエンジェ",
    "theme": "正多角形の内角・外角",
    "chapterId": "g2c4",
    "grade": 2,
    "kind": "unit",
    "rarity": "N",
    "role": "bruiser",
    "roleTag": "ちから自慢",
    "hp": 794,
    "atk": 246,
    "skill": {
      "id": "spdrain",
      "name": "SP吸収",
      "icon": "🌀"
    },
    "color": "#ffaa00",
    "art": "angle",
    "subjects": {
      "calc": 49,
      "eq": 30,
      "func": 59,
      "geo": 83,
      "data": 39
    },
    "primarySubject": "geo"
  },
  {
    "id": "m_g2c5_g2c5u1",
    "name": "ズケイジュエル",
    "theme": "二等辺三角形・正三角形",
    "chapterId": "g2c5",
    "grade": 2,
    "kind": "unit",
    "rarity": "N",
    "role": "cannon",
    "roleTag": "もろいが痛い",
    "hp": 774,
    "atk": 286,
    "skill": {
      "id": "hardnext",
      "name": "難問化の呪い",
      "icon": "📈"
    },
    "color": "#ff8844",
    "art": "geo",
    "subjects": {
      "calc": 42,
      "eq": 27,
      "func": 49,
      "geo": 109,
      "data": 33
    },
    "primarySubject": "geo"
  },
  {
    "id": "m_g2c5_g2c5u2",
    "name": "カクドビシャ",
    "theme": "平行四辺形の性質",
    "chapterId": "g2c5",
    "grade": 2,
    "kind": "unit",
    "rarity": "R",
    "role": "bruiser",
    "roleTag": "ちから自慢",
    "hp": 923,
    "atk": 246,
    "skill": {
      "id": "crit",
      "name": "会心の一撃",
      "icon": "⭐"
    },
    "color": "#ffaa00",
    "art": "angle",
    "subjects": {
      "calc": 53,
      "eq": 33,
      "func": 62,
      "geo": 90,
      "data": 42
    },
    "primarySubject": "geo"
  },
  {
    "id": "m_g2c5_g2c5u3",
    "name": "ブンスウモチ",
    "theme": "特別な平行四辺形・面積",
    "chapterId": "g2c5",
    "grade": 2,
    "kind": "unit",
    "rarity": "N",
    "role": "nuker",
    "roleTag": "必殺技が強い",
    "hp": 753,
    "atk": 300,
    "skill": {
      "id": "curse",
      "name": "呪いの一撃",
      "icon": "💀"
    },
    "color": "#ff88cc",
    "art": "fraction",
    "subjects": {
      "calc": 36,
      "eq": 23,
      "func": 42,
      "geo": 130,
      "data": 29
    },
    "primarySubject": "geo"
  },
  {
    "id": "m_g2c6_g2c6u1",
    "name": "サイコビップ",
    "theme": "場合の数（順列・組み合わせ）",
    "chapterId": "g2c6",
    "grade": 2,
    "kind": "unit",
    "rarity": "R",
    "role": "cannon",
    "roleTag": "もろいが痛い",
    "hp": 926,
    "atk": 369,
    "skill": {
      "id": "panic",
      "name": "あせりの波動",
      "icon": "😵"
    },
    "color": "#ffdd44",
    "art": "dice",
    "subjects": {
      "calc": 47,
      "eq": 31,
      "func": 46,
      "geo": 38,
      "data": 118
    },
    "primarySubject": "data"
  },
  {
    "id": "m_g2c6_g2c6u2",
    "name": "ソスウヘビー",
    "theme": "確率の基本（さいころ・硬貨）",
    "chapterId": "g2c6",
    "grade": 2,
    "kind": "unit",
    "rarity": "R",
    "role": "cannon",
    "roleTag": "もろいが痛い",
    "hp": 947,
    "atk": 416,
    "skill": {
      "id": "fog",
      "name": "沈黙の霧",
      "icon": "🌫️"
    },
    "color": "#44ff88",
    "art": "prime",
    "subjects": {
      "calc": 47,
      "eq": 31,
      "func": 46,
      "geo": 38,
      "data": 118
    },
    "primarySubject": "data"
  },
  {
    "id": "m_g2c6_g2c6u3",
    "name": "ナミシブキ",
    "theme": "確率の応用（玉・2つのさいころ）",
    "chapterId": "g2c6",
    "grade": 2,
    "kind": "unit",
    "rarity": "R",
    "role": "tank",
    "roleTag": "硬い・攻撃ひかえめ",
    "hp": 1079,
    "atk": 165,
    "skill": {
      "id": "barrier",
      "name": "身を守るバリア",
      "icon": "🔰"
    },
    "color": "#00ddff",
    "art": "wave",
    "subjects": {
      "calc": 62,
      "eq": 41,
      "func": 60,
      "geo": 50,
      "data": 67
    },
    "primarySubject": "data"
  },
  {
    "id": "m_g3c1_g3c1u1",
    "name": "スウチコード",
    "theme": "単項式×多項式（展開）",
    "chapterId": "g3c1",
    "grade": 3,
    "kind": "unit",
    "rarity": "N",
    "role": "normal",
    "roleTag": "バランス",
    "hp": 760,
    "atk": 145,
    "skill": {
      "id": "timesteal",
      "name": "時間どろぼう",
      "icon": "⏳"
    },
    "color": "#4488ff",
    "art": "calc",
    "subjects": {
      "calc": 68,
      "eq": 59,
      "func": 51,
      "geo": 33,
      "data": 49
    },
    "primarySubject": "calc"
  },
  {
    "id": "m_g3c1_g3c1u2",
    "name": "テンビンミコ",
    "theme": "多項式÷単項式（除法）",
    "chapterId": "g3c1",
    "grade": 3,
    "kind": "unit",
    "rarity": "N",
    "role": "tank",
    "roleTag": "硬い・攻撃ひかえめ",
    "hp": 851,
    "atk": 106,
    "skill": {
      "id": "barrier",
      "name": "身を守るバリア",
      "icon": "🔰"
    },
    "color": "#cc88ff",
    "art": "balance",
    "subjects": {
      "calc": 62,
      "eq": 61,
      "func": 52,
      "geo": 34,
      "data": 51
    },
    "primarySubject": "calc"
  },
  {
    "id": "m_g3c1_g3c1u3",
    "name": "ソスウガミ",
    "theme": "乗法公式 (x+a)(x+b)",
    "chapterId": "g3c1",
    "grade": 3,
    "kind": "unit",
    "rarity": "N",
    "role": "normal",
    "roleTag": "バランス",
    "hp": 760,
    "atk": 145,
    "skill": {
      "id": "panic",
      "name": "あせりの波動",
      "icon": "😵"
    },
    "color": "#44ff88",
    "art": "prime",
    "subjects": {
      "calc": 68,
      "eq": 59,
      "func": 51,
      "geo": 33,
      "data": 49
    },
    "primarySubject": "calc"
  },
  {
    "id": "m_g3c1_g3c1u4",
    "name": "スウチイーター",
    "theme": "平方・和と差の公式",
    "chapterId": "g3c1",
    "grade": 3,
    "kind": "unit",
    "rarity": "N",
    "role": "tank",
    "roleTag": "硬い・攻撃ひかえめ",
    "hp": 852,
    "atk": 107,
    "skill": {
      "id": "eregen",
      "name": "自己再生",
      "icon": "♻️"
    },
    "color": "#4488ff",
    "art": "calc",
    "subjects": {
      "calc": 62,
      "eq": 61,
      "func": 52,
      "geo": 34,
      "data": 51
    },
    "primarySubject": "calc"
  },
  {
    "id": "m_g3c1_g3c1u5",
    "name": "テンビンドラゴ",
    "theme": "共通因数でくくる",
    "chapterId": "g3c1",
    "grade": 3,
    "kind": "unit",
    "rarity": "N",
    "role": "cannon",
    "roleTag": "もろいが痛い",
    "hp": 716,
    "atk": 198,
    "skill": {
      "id": "curse",
      "name": "呪いの一撃",
      "icon": "💀"
    },
    "color": "#cc88ff",
    "art": "balance",
    "subjects": {
      "calc": 109,
      "eq": 46,
      "func": 40,
      "geo": 26,
      "data": 39
    },
    "primarySubject": "calc"
  },
  {
    "id": "m_g3c1_g3c1u6",
    "name": "ソスウレオン",
    "theme": "因数分解 x²+(a+b)x+ab",
    "chapterId": "g3c1",
    "grade": 3,
    "kind": "unit",
    "rarity": "N",
    "role": "bruiser",
    "roleTag": "ちから自慢",
    "hp": 740,
    "atk": 171,
    "skill": {
      "id": "crit",
      "name": "会心の一撃",
      "icon": "⭐"
    },
    "color": "#44ff88",
    "art": "prime",
    "subjects": {
      "calc": 83,
      "eq": 55,
      "func": 47,
      "geo": 30,
      "data": 45
    },
    "primarySubject": "calc"
  },
  {
    "id": "m_g3c1_g3c1u7",
    "name": "スウチマル",
    "theme": "平方・差の因数分解",
    "chapterId": "g3c1",
    "grade": 3,
    "kind": "unit",
    "rarity": "N",
    "role": "cannon",
    "roleTag": "もろいが痛い",
    "hp": 717,
    "atk": 200,
    "skill": {
      "id": "pierce",
      "name": "防御貫通",
      "icon": "🗡️"
    },
    "color": "#4488ff",
    "art": "calc",
    "subjects": {
      "calc": 109,
      "eq": 46,
      "func": 40,
      "geo": 26,
      "data": 39
    },
    "primarySubject": "calc"
  },
  {
    "id": "m_g3c1_g3c1u8",
    "name": "テンビンローム",
    "theme": "式の計算の利用",
    "chapterId": "g3c1",
    "grade": 3,
    "kind": "unit",
    "rarity": "N",
    "role": "tank",
    "roleTag": "硬い・攻撃ひかえめ",
    "hp": 854,
    "atk": 109,
    "skill": {
      "id": "dispel",
      "name": "バフ消し",
      "icon": "✖️"
    },
    "color": "#cc88ff",
    "art": "balance",
    "subjects": {
      "calc": 62,
      "eq": 61,
      "func": 52,
      "geo": 34,
      "data": 51
    },
    "primarySubject": "calc"
  },
  {
    "id": "m_g3c2_g3c2u1",
    "name": "ソスウジグザ",
    "theme": "平方根を求める・根号をはずす",
    "chapterId": "g3c2",
    "grade": 3,
    "kind": "unit",
    "rarity": "N",
    "role": "normal",
    "roleTag": "バランス",
    "hp": 764,
    "atk": 151,
    "skill": {
      "id": "fog",
      "name": "沈黙の霧",
      "icon": "🌫️"
    },
    "color": "#44ff88",
    "art": "prime",
    "subjects": {
      "calc": 68,
      "eq": 31,
      "func": 61,
      "geo": 41,
      "data": 59
    },
    "primarySubject": "calc"
  },
  {
    "id": "m_g3c2_g3c2u2",
    "name": "ブンスウピンキー",
    "theme": "根号の変形（a√b ⇄ √a）・大小比較",
    "chapterId": "g3c2",
    "grade": 3,
    "kind": "unit",
    "rarity": "N",
    "role": "bruiser",
    "roleTag": "ちから自慢",
    "hp": 744,
    "atk": 178,
    "skill": {
      "id": "multi",
      "name": "連続攻撃",
      "icon": "👊"
    },
    "color": "#ff88cc",
    "art": "fraction",
    "subjects": {
      "calc": 83,
      "eq": 29,
      "func": 56,
      "geo": 37,
      "data": 55
    },
    "primarySubject": "calc"
  },
  {
    "id": "m_g3c2_g3c2u3",
    "name": "スウチボード",
    "theme": "根号の乗法・除法",
    "chapterId": "g3c2",
    "grade": 3,
    "kind": "unit",
    "rarity": "N",
    "role": "nuker",
    "roleTag": "必殺技が強い",
    "hp": 704,
    "atk": 230,
    "skill": {
      "id": "silence",
      "name": "封印の呪縛",
      "icon": "🔇"
    },
    "color": "#4488ff",
    "art": "calc",
    "subjects": {
      "calc": 130,
      "eq": 22,
      "func": 41,
      "geo": 27,
      "data": 40
    },
    "primarySubject": "calc"
  },
  {
    "id": "m_g3c2_g3c2u4",
    "name": "ソスウイング",
    "theme": "根号の加法・減法",
    "chapterId": "g3c2",
    "grade": 3,
    "kind": "unit",
    "rarity": "N",
    "role": "tank",
    "roleTag": "硬い・攻撃ひかえめ",
    "hp": 858,
    "atk": 113,
    "skill": {
      "id": "comboseal",
      "name": "コンボ封じ",
      "icon": "💔"
    },
    "color": "#44ff88",
    "art": "prime",
    "subjects": {
      "calc": 62,
      "eq": 33,
      "func": 61,
      "geo": 43,
      "data": 61
    },
    "primarySubject": "calc"
  },
  {
    "id": "m_g3c2_g3c2u5",
    "name": "ブンスウトロケ",
    "theme": "分配法則・展開と値の計算",
    "chapterId": "g3c2",
    "grade": 3,
    "kind": "unit",
    "rarity": "N",
    "role": "cannon",
    "roleTag": "もろいが痛い",
    "hp": 725,
    "atk": 211,
    "skill": {
      "id": "timecrush",
      "name": "時間圧縮",
      "icon": "⌛"
    },
    "color": "#ff88cc",
    "art": "fraction",
    "subjects": {
      "calc": 109,
      "eq": 24,
      "func": 48,
      "geo": 32,
      "data": 47
    },
    "primarySubject": "calc"
  },
  {
    "id": "m_g3c3_g3c3u1",
    "name": "テンビンセイレイ",
    "theme": "平方根の考えで解く2次方程式",
    "chapterId": "g3c3",
    "grade": 3,
    "kind": "unit",
    "rarity": "N",
    "role": "bruiser",
    "roleTag": "ちから自慢",
    "hp": 753,
    "atk": 189,
    "skill": {
      "id": "spdrain",
      "name": "SP吸収",
      "icon": "🌀"
    },
    "color": "#cc88ff",
    "art": "balance",
    "subjects": {
      "calc": 31,
      "eq": 83,
      "func": 49,
      "geo": 40,
      "data": 57
    },
    "primarySubject": "eq"
  },
  {
    "id": "m_g3c3_g3c3u2",
    "name": "ブンスウハーフ",
    "theme": "(x+a)²=b の形で解く2次方程式",
    "chapterId": "g3c3",
    "grade": 3,
    "kind": "unit",
    "rarity": "N",
    "role": "cannon",
    "roleTag": "もろいが痛い",
    "hp": 730,
    "atk": 219,
    "skill": {
      "id": "hardnext",
      "name": "難問化の呪い",
      "icon": "📈"
    },
    "color": "#ff88cc",
    "art": "fraction",
    "subjects": {
      "calc": 28,
      "eq": 109,
      "func": 41,
      "geo": 34,
      "data": 48
    },
    "primarySubject": "eq"
  },
  {
    "id": "m_g3c3_g3c3u3",
    "name": "スウチカイ",
    "theme": "解の公式で解く2次方程式",
    "chapterId": "g3c3",
    "grade": 3,
    "kind": "unit",
    "rarity": "N",
    "role": "bruiser",
    "roleTag": "ちから自慢",
    "hp": 757,
    "atk": 196,
    "skill": {
      "id": "crit",
      "name": "会心の一撃",
      "icon": "⭐"
    },
    "color": "#4488ff",
    "art": "calc",
    "subjects": {
      "calc": 31,
      "eq": 83,
      "func": 49,
      "geo": 40,
      "data": 57
    },
    "primarySubject": "eq"
  },
  {
    "id": "m_g3c3_g3c3u4",
    "name": "テンビンカクム",
    "theme": "因数分解で解く2次方程式",
    "chapterId": "g3c3",
    "grade": 3,
    "kind": "unit",
    "rarity": "N",
    "role": "nuker",
    "roleTag": "必殺技が強い",
    "hp": 711,
    "atk": 242,
    "skill": {
      "id": "curse",
      "name": "呪いの一撃",
      "icon": "💀"
    },
    "color": "#cc88ff",
    "art": "balance",
    "subjects": {
      "calc": 23,
      "eq": 130,
      "func": 36,
      "geo": 29,
      "data": 42
    },
    "primarySubject": "eq"
  },
  {
    "id": "m_g3c3_g3c3u5",
    "name": "ブンスウヌメロ",
    "theme": "いろいろな2次方程式",
    "chapterId": "g3c3",
    "grade": 3,
    "kind": "unit",
    "rarity": "N",
    "role": "cannon",
    "roleTag": "もろいが痛い",
    "hp": 740,
    "atk": 234,
    "skill": {
      "id": "panic",
      "name": "あせりの波動",
      "icon": "😵"
    },
    "color": "#ff88cc",
    "art": "fraction",
    "subjects": {
      "calc": 28,
      "eq": 109,
      "func": 41,
      "geo": 34,
      "data": 48
    },
    "primarySubject": "eq"
  },
  {
    "id": "m_g3c4_g3c4u1",
    "name": "ナミリップル",
    "theme": "y=ax²の式を求める",
    "chapterId": "g3c4",
    "grade": 3,
    "kind": "unit",
    "rarity": "N",
    "role": "cannon",
    "roleTag": "もろいが痛い",
    "hp": 742,
    "atk": 238,
    "skill": {
      "id": "fog",
      "name": "沈黙の霧",
      "icon": "🌫️"
    },
    "color": "#00ddff",
    "art": "wave",
    "subjects": {
      "calc": 29,
      "eq": 41,
      "func": 109,
      "geo": 34,
      "data": 47
    },
    "primarySubject": "func"
  },
  {
    "id": "m_g3c4_g3c4u2",
    "name": "スピードバーン",
    "theme": "y=ax²の変域",
    "chapterId": "g3c4",
    "grade": 3,
    "kind": "unit",
    "rarity": "N",
    "role": "tank",
    "roleTag": "硬い・攻撃ひかえめ",
    "hp": 874,
    "atk": 128,
    "skill": {
      "id": "barrier",
      "name": "身を守るバリア",
      "icon": "🔰"
    },
    "color": "#ff4444",
    "art": "speed",
    "subjects": {
      "calc": 38,
      "eq": 54,
      "func": 62,
      "geo": 45,
      "data": 61
    },
    "primarySubject": "func"
  },
  {
    "id": "m_g3c4_g3c4u3",
    "name": "ズケイポリゴ",
    "theme": "変化の割合",
    "chapterId": "g3c4",
    "grade": 3,
    "kind": "unit",
    "rarity": "N",
    "role": "nuker",
    "roleTag": "必殺技が強い",
    "hp": 720,
    "atk": 256,
    "skill": {
      "id": "decoy",
      "name": "みがわり",
      "icon": "🎎"
    },
    "color": "#ff8844",
    "art": "geo",
    "subjects": {
      "calc": 24,
      "eq": 35,
      "func": 130,
      "geo": 30,
      "data": 41
    },
    "primarySubject": "func"
  },
  {
    "id": "m_g3c4_g3c4u4",
    "name": "ナミミナト",
    "theme": "y=ax²の利用（文章題）",
    "chapterId": "g3c4",
    "grade": 3,
    "kind": "unit",
    "rarity": "N",
    "role": "normal",
    "roleTag": "バランス",
    "hp": 791,
    "atk": 184,
    "skill": {
      "id": "timesteal",
      "name": "時間どろぼう",
      "icon": "⏳"
    },
    "color": "#00ddff",
    "art": "wave",
    "subjects": {
      "calc": 36,
      "eq": 52,
      "func": 68,
      "geo": 44,
      "data": 60
    },
    "primarySubject": "func"
  },
  {
    "id": "m_g3c5_g3c5u1",
    "name": "ズケイシャープ",
    "theme": "比例式とxの値",
    "chapterId": "g3c5",
    "grade": 3,
    "kind": "unit",
    "rarity": "N",
    "role": "tank",
    "roleTag": "硬い・攻撃ひかえめ",
    "hp": 886,
    "atk": 139,
    "skill": {
      "id": "barrier",
      "name": "身を守るバリア",
      "icon": "🔰"
    },
    "color": "#ff8844",
    "art": "geo",
    "subjects": {
      "calc": 47,
      "eq": 61,
      "func": 55,
      "geo": 62,
      "data": 35
    },
    "primarySubject": "geo"
  },
  {
    "id": "m_g3c5_g3c5u2",
    "name": "カクドオウギ",
    "theme": "相似な図形の面積比・体積比",
    "chapterId": "g3c5",
    "grade": 3,
    "kind": "unit",
    "rarity": "N",
    "role": "normal",
    "roleTag": "バランス",
    "hp": 801,
    "atk": 197,
    "skill": {
      "id": "panic",
      "name": "あせりの波動",
      "icon": "😵"
    },
    "color": "#ffaa00",
    "art": "angle",
    "subjects": {
      "calc": 44,
      "eq": 62,
      "func": 53,
      "geo": 68,
      "data": 33
    },
    "primarySubject": "geo"
  },
  {
    "id": "m_g3c5_g3c5u3",
    "name": "リッタイブロック",
    "theme": "相似の利用（影と測定）",
    "chapterId": "g3c5",
    "grade": 3,
    "kind": "unit",
    "rarity": "N",
    "role": "tank",
    "roleTag": "硬い・攻撃ひかえめ",
    "hp": 892,
    "atk": 145,
    "skill": {
      "id": "eregen",
      "name": "自己再生",
      "icon": "♻️"
    },
    "color": "#88ffaa",
    "art": "volume",
    "subjects": {
      "calc": 47,
      "eq": 61,
      "func": 55,
      "geo": 62,
      "data": 35
    },
    "primarySubject": "geo"
  },
  {
    "id": "m_g3c6_g3c6u1",
    "name": "カクドスイチョク",
    "theme": "円周角と中心角",
    "chapterId": "g3c6",
    "grade": 3,
    "kind": "unit",
    "rarity": "N",
    "role": "cannon",
    "roleTag": "もろいが痛い",
    "hp": 774,
    "atk": 286,
    "skill": {
      "id": "curse",
      "name": "呪いの一撃",
      "icon": "💀"
    },
    "color": "#ffaa00",
    "art": "angle",
    "subjects": {
      "calc": 37,
      "eq": 51,
      "func": 35,
      "geo": 109,
      "data": 28
    },
    "primarySubject": "geo"
  },
  {
    "id": "m_g3c6_g3c6u2",
    "name": "ズケイキラリ",
    "theme": "円に内接する四角形",
    "chapterId": "g3c6",
    "grade": 3,
    "kind": "unit",
    "rarity": "N",
    "role": "bruiser",
    "roleTag": "ちから自慢",
    "hp": 810,
    "atk": 269,
    "skill": {
      "id": "crit",
      "name": "会心の一撃",
      "icon": "⭐"
    },
    "color": "#ff8844",
    "art": "geo",
    "subjects": {
      "calc": 43,
      "eq": 59,
      "func": 42,
      "geo": 83,
      "data": 33
    },
    "primarySubject": "geo"
  },
  {
    "id": "m_g3c6_g3c6u3",
    "name": "ナミトロロ",
    "theme": "接線と円周角",
    "chapterId": "g3c6",
    "grade": 3,
    "kind": "unit",
    "rarity": "N",
    "role": "cannon",
    "roleTag": "もろいが痛い",
    "hp": 790,
    "atk": 300,
    "skill": {
      "id": "pierce",
      "name": "防御貫通",
      "icon": "🗡️"
    },
    "color": "#00ddff",
    "art": "wave",
    "subjects": {
      "calc": 37,
      "eq": 51,
      "func": 35,
      "geo": 109,
      "data": 28
    },
    "primarySubject": "geo"
  },
  {
    "id": "m_g3c7_g3c7u1",
    "name": "ズケイトガリ",
    "theme": "三平方の定理（辺の長さを求める）",
    "chapterId": "g3c7",
    "grade": 3,
    "kind": "unit",
    "rarity": "N",
    "role": "tank",
    "roleTag": "硬い・攻撃ひかえめ",
    "hp": 912,
    "atk": 164,
    "skill": {
      "id": "dispel",
      "name": "バフ消し",
      "icon": "✖️"
    },
    "color": "#ff8844",
    "art": "geo",
    "subjects": {
      "calc": 59,
      "eq": 36,
      "func": 57,
      "geo": 62,
      "data": 46
    },
    "primarySubject": "geo"
  },
  {
    "id": "m_g3c7_g3c7u2",
    "name": "リッタイボックス",
    "theme": "三平方の定理（特別な直角三角形）",
    "chapterId": "g3c7",
    "grade": 3,
    "kind": "unit",
    "rarity": "N",
    "role": "normal",
    "roleTag": "バランス",
    "hp": 833,
    "atk": 237,
    "skill": {
      "id": "fog",
      "name": "沈黙の霧",
      "icon": "🌫️"
    },
    "color": "#88ffaa",
    "art": "volume",
    "subjects": {
      "calc": 57,
      "eq": 35,
      "func": 55,
      "geo": 68,
      "data": 45
    },
    "primarySubject": "geo"
  },
  {
    "id": "m_g3c7_g3c7u3",
    "name": "カクドカクカク",
    "theme": "三平方の定理（平面図形への利用）",
    "chapterId": "g3c7",
    "grade": 3,
    "kind": "unit",
    "rarity": "R",
    "role": "bruiser",
    "roleTag": "ちから自慢",
    "hp": 960,
    "atk": 323,
    "skill": {
      "id": "multi",
      "name": "連続攻撃",
      "icon": "👊"
    },
    "color": "#ffaa00",
    "art": "angle",
    "subjects": {
      "calc": 56,
      "eq": 35,
      "func": 55,
      "geo": 90,
      "data": 44
    },
    "primarySubject": "geo"
  },
  {
    "id": "m_g3c7_g3c7u4",
    "name": "ズケイクォーツ",
    "theme": "三平方の定理（座標・空間図形）",
    "chapterId": "g3c7",
    "grade": 3,
    "kind": "unit",
    "rarity": "N",
    "role": "nuker",
    "roleTag": "必殺技が強い",
    "hp": 762,
    "atk": 300,
    "skill": {
      "id": "silence",
      "name": "封印の呪縛",
      "icon": "🔇"
    },
    "color": "#ff8844",
    "art": "geo",
    "subjects": {
      "calc": 39,
      "eq": 24,
      "func": 37,
      "geo": 130,
      "data": 30
    },
    "primarySubject": "geo"
  },
  {
    "id": "m_g3c8_g3c8u1",
    "name": "サイコガチャ",
    "theme": "標本調査の用語",
    "chapterId": "g3c8",
    "grade": 3,
    "kind": "unit",
    "rarity": "N",
    "role": "tank",
    "roleTag": "硬い・攻撃ひかえめ",
    "hp": 940,
    "atk": 190,
    "skill": {
      "id": "comboseal",
      "name": "コンボ封じ",
      "icon": "💔"
    },
    "color": "#ffdd44",
    "art": "dice",
    "subjects": {
      "calc": 59,
      "eq": 37,
      "func": 56,
      "geo": 46,
      "data": 62
    },
    "primarySubject": "data"
  },
  {
    "id": "m_g3c8_g3c8u2",
    "name": "ソスウシャルル",
    "theme": "全数調査と標本調査の判断",
    "chapterId": "g3c8",
    "grade": 3,
    "kind": "unit",
    "rarity": "R",
    "role": "cannon",
    "roleTag": "もろいが痛い",
    "hp": 958,
    "atk": 441,
    "skill": {
      "id": "timecrush",
      "name": "時間圧縮",
      "icon": "⌛"
    },
    "color": "#44ff88",
    "art": "prime",
    "subjects": {
      "calc": 47,
      "eq": 31,
      "func": 46,
      "geo": 38,
      "data": 118
    },
    "primarySubject": "data"
  },
  {
    "id": "m_g3c8_g3c8u3",
    "name": "ナミビチャ",
    "theme": "標本調査による推定",
    "chapterId": "g3c8",
    "grade": 3,
    "kind": "unit",
    "rarity": "R",
    "role": "bruiser",
    "roleTag": "ちから自慢",
    "hp": 1019,
    "atk": 448,
    "skill": {
      "id": "spdrain",
      "name": "SP吸収",
      "icon": "🌀"
    },
    "color": "#00ddff",
    "art": "wave",
    "subjects": {
      "calc": 55,
      "eq": 36,
      "func": 54,
      "geo": 45,
      "data": 90
    },
    "primarySubject": "data"
  },
  {
    "id": "su_u1",
    "name": "正負の意味・大小の強敵",
    "theme": "正負の意味・大小・小単元ボス",
    "chapterId": "c1",
    "grade": 1,
    "kind": "unitSmallBoss",
    "rarity": "R",
    "role": "boss",
    "roleTag": "小単元ボス・BP150",
    "hp": 1060,
    "atk": 400,
    "skill": {
      "id": "attack",
      "name": "渾身の一撃",
      "icon": "⚔️"
    },
    "color": "#818cf8",
    "art": "boss",
    "subjects": {
      "calc": 95,
      "eq": 33,
      "func": 56,
      "geo": 37,
      "data": 59
    },
    "primarySubject": "calc"
  },
  {
    "id": "su_u2",
    "name": "加法（足し算）の強敵",
    "theme": "加法（足し算）・小単元ボス",
    "chapterId": "c1",
    "grade": 1,
    "kind": "unitSmallBoss",
    "rarity": "R",
    "role": "boss",
    "roleTag": "小単元ボス・BP150",
    "hp": 1060,
    "atk": 400,
    "skill": {
      "id": "attack",
      "name": "渾身の一撃",
      "icon": "⚔️"
    },
    "color": "#818cf8",
    "art": "boss",
    "subjects": {
      "calc": 95,
      "eq": 33,
      "func": 56,
      "geo": 37,
      "data": 59
    },
    "primarySubject": "calc"
  },
  {
    "id": "su_u3",
    "name": "減法（引き算）の強敵",
    "theme": "減法（引き算）・小単元ボス",
    "chapterId": "c1",
    "grade": 1,
    "kind": "unitSmallBoss",
    "rarity": "R",
    "role": "boss",
    "roleTag": "小単元ボス・BP150",
    "hp": 1060,
    "atk": 400,
    "skill": {
      "id": "attack",
      "name": "渾身の一撃",
      "icon": "⚔️"
    },
    "color": "#818cf8",
    "art": "boss",
    "subjects": {
      "calc": 95,
      "eq": 33,
      "func": 56,
      "geo": 37,
      "data": 59
    },
    "primarySubject": "calc"
  },
  {
    "id": "su_u4",
    "name": "乗法・除法の強敵",
    "theme": "乗法・除法・小単元ボス",
    "chapterId": "c1",
    "grade": 1,
    "kind": "unitSmallBoss",
    "rarity": "R",
    "role": "boss",
    "roleTag": "小単元ボス・BP150",
    "hp": 1060,
    "atk": 400,
    "skill": {
      "id": "attack",
      "name": "渾身の一撃",
      "icon": "⚔️"
    },
    "color": "#818cf8",
    "art": "boss",
    "subjects": {
      "calc": 95,
      "eq": 33,
      "func": 56,
      "geo": 37,
      "data": 59
    },
    "primarySubject": "calc"
  },
  {
    "id": "su_u5",
    "name": "四則混合計算の強敵",
    "theme": "四則混合計算・小単元ボス",
    "chapterId": "c1",
    "grade": 1,
    "kind": "unitSmallBoss",
    "rarity": "R",
    "role": "boss",
    "roleTag": "小単元ボス・BP150",
    "hp": 1060,
    "atk": 400,
    "skill": {
      "id": "attack",
      "name": "渾身の一撃",
      "icon": "⚔️"
    },
    "color": "#818cf8",
    "art": "boss",
    "subjects": {
      "calc": 95,
      "eq": 33,
      "func": 56,
      "geo": 37,
      "data": 59
    },
    "primarySubject": "calc"
  },
  {
    "id": "su_u6",
    "name": "素因数分解の強敵",
    "theme": "素因数分解・小単元ボス",
    "chapterId": "c1",
    "grade": 1,
    "kind": "unitSmallBoss",
    "rarity": "R",
    "role": "boss",
    "roleTag": "小単元ボス・BP150",
    "hp": 1060,
    "atk": 400,
    "skill": {
      "id": "attack",
      "name": "渾身の一撃",
      "icon": "⚔️"
    },
    "color": "#818cf8",
    "art": "boss",
    "subjects": {
      "calc": 95,
      "eq": 33,
      "func": 56,
      "geo": 37,
      "data": 59
    },
    "primarySubject": "calc"
  },
  {
    "id": "su_v1",
    "name": "文字式の表し方の強敵",
    "theme": "文字式の表し方・小単元ボス",
    "chapterId": "c2",
    "grade": 1,
    "kind": "unitSmallBoss",
    "rarity": "R",
    "role": "boss",
    "roleTag": "小単元ボス・BP150",
    "hp": 1060,
    "atk": 400,
    "skill": {
      "id": "charge",
      "name": "ためて大技",
      "icon": "🔥"
    },
    "color": "#34d399",
    "art": "boss",
    "subjects": {
      "calc": 95,
      "eq": 33,
      "func": 56,
      "geo": 37,
      "data": 59
    },
    "primarySubject": "calc"
  },
  {
    "id": "su_v2",
    "name": "式の値（代入）の強敵",
    "theme": "式の値（代入）・小単元ボス",
    "chapterId": "c2",
    "grade": 1,
    "kind": "unitSmallBoss",
    "rarity": "R",
    "role": "boss",
    "roleTag": "小単元ボス・BP150",
    "hp": 1060,
    "atk": 400,
    "skill": {
      "id": "charge",
      "name": "ためて大技",
      "icon": "🔥"
    },
    "color": "#34d399",
    "art": "boss",
    "subjects": {
      "calc": 95,
      "eq": 33,
      "func": 56,
      "geo": 37,
      "data": 59
    },
    "primarySubject": "calc"
  },
  {
    "id": "su_v3",
    "name": "加法・減法の強敵",
    "theme": "加法・減法・小単元ボス",
    "chapterId": "c2",
    "grade": 1,
    "kind": "unitSmallBoss",
    "rarity": "R",
    "role": "boss",
    "roleTag": "小単元ボス・BP150",
    "hp": 1060,
    "atk": 400,
    "skill": {
      "id": "charge",
      "name": "ためて大技",
      "icon": "🔥"
    },
    "color": "#34d399",
    "art": "boss",
    "subjects": {
      "calc": 95,
      "eq": 33,
      "func": 56,
      "geo": 37,
      "data": 59
    },
    "primarySubject": "calc"
  },
  {
    "id": "su_v4",
    "name": "乗法・除法（分配）の強敵",
    "theme": "乗法・除法（分配）・小単元ボス",
    "chapterId": "c2",
    "grade": 1,
    "kind": "unitSmallBoss",
    "rarity": "R",
    "role": "boss",
    "roleTag": "小単元ボス・BP150",
    "hp": 1060,
    "atk": 400,
    "skill": {
      "id": "charge",
      "name": "ためて大技",
      "icon": "🔥"
    },
    "color": "#34d399",
    "art": "boss",
    "subjects": {
      "calc": 95,
      "eq": 33,
      "func": 56,
      "geo": 37,
      "data": 59
    },
    "primarySubject": "calc"
  },
  {
    "id": "su_v5",
    "name": "四則混合（複合）の強敵",
    "theme": "四則混合（複合）・小単元ボス",
    "chapterId": "c2",
    "grade": 1,
    "kind": "unitSmallBoss",
    "rarity": "R",
    "role": "boss",
    "roleTag": "小単元ボス・BP150",
    "hp": 1060,
    "atk": 400,
    "skill": {
      "id": "charge",
      "name": "ためて大技",
      "icon": "🔥"
    },
    "color": "#34d399",
    "art": "boss",
    "subjects": {
      "calc": 95,
      "eq": 33,
      "func": 56,
      "geo": 37,
      "data": 59
    },
    "primarySubject": "calc"
  },
  {
    "id": "su_e1",
    "name": "方程式の解き方①の強敵",
    "theme": "方程式の解き方①・小単元ボス",
    "chapterId": "c3",
    "grade": 1,
    "kind": "unitSmallBoss",
    "rarity": "R",
    "role": "boss",
    "roleTag": "小単元ボス・BP150",
    "hp": 1060,
    "atk": 400,
    "skill": {
      "id": "sleep",
      "name": "ねむりの呪文",
      "icon": "💤"
    },
    "color": "#fb923c",
    "art": "boss",
    "subjects": {
      "calc": 33,
      "eq": 95,
      "func": 56,
      "geo": 36,
      "data": 60
    },
    "primarySubject": "eq"
  },
  {
    "id": "su_e2",
    "name": "方程式の解き方②の強敵",
    "theme": "方程式の解き方②・小単元ボス",
    "chapterId": "c3",
    "grade": 1,
    "kind": "unitSmallBoss",
    "rarity": "R",
    "role": "boss",
    "roleTag": "小単元ボス・BP150",
    "hp": 1060,
    "atk": 400,
    "skill": {
      "id": "sleep",
      "name": "ねむりの呪文",
      "icon": "💤"
    },
    "color": "#fb923c",
    "art": "boss",
    "subjects": {
      "calc": 33,
      "eq": 95,
      "func": 56,
      "geo": 36,
      "data": 60
    },
    "primarySubject": "eq"
  },
  {
    "id": "su_e3",
    "name": "両辺に文字がある式の強敵",
    "theme": "両辺に文字がある式・小単元ボス",
    "chapterId": "c3",
    "grade": 1,
    "kind": "unitSmallBoss",
    "rarity": "R",
    "role": "boss",
    "roleTag": "小単元ボス・BP150",
    "hp": 1060,
    "atk": 400,
    "skill": {
      "id": "sleep",
      "name": "ねむりの呪文",
      "icon": "💤"
    },
    "color": "#fb923c",
    "art": "boss",
    "subjects": {
      "calc": 33,
      "eq": 95,
      "func": 56,
      "geo": 36,
      "data": 60
    },
    "primarySubject": "eq"
  },
  {
    "id": "su_e4",
    "name": "比例式の強敵",
    "theme": "比例式・小単元ボス",
    "chapterId": "c3",
    "grade": 1,
    "kind": "unitSmallBoss",
    "rarity": "R",
    "role": "boss",
    "roleTag": "小単元ボス・BP150",
    "hp": 1060,
    "atk": 400,
    "skill": {
      "id": "sleep",
      "name": "ねむりの呪文",
      "icon": "💤"
    },
    "color": "#fb923c",
    "art": "boss",
    "subjects": {
      "calc": 33,
      "eq": 95,
      "func": 56,
      "geo": 36,
      "data": 60
    },
    "primarySubject": "eq"
  },
  {
    "id": "su_e5",
    "name": "方程式の文章題の強敵",
    "theme": "方程式の文章題・小単元ボス",
    "chapterId": "c3",
    "grade": 1,
    "kind": "unitSmallBoss",
    "rarity": "R",
    "role": "boss",
    "roleTag": "小単元ボス・BP150",
    "hp": 1060,
    "atk": 400,
    "skill": {
      "id": "sleep",
      "name": "ねむりの呪文",
      "icon": "💤"
    },
    "color": "#fb923c",
    "art": "boss",
    "subjects": {
      "calc": 33,
      "eq": 95,
      "func": 56,
      "geo": 36,
      "data": 60
    },
    "primarySubject": "eq"
  },
  {
    "id": "su_h1",
    "name": "比例の強敵",
    "theme": "比例・小単元ボス",
    "chapterId": "c4",
    "grade": 1,
    "kind": "unitSmallBoss",
    "rarity": "R",
    "role": "boss",
    "roleTag": "小単元ボス・BP150",
    "hp": 1060,
    "atk": 400,
    "skill": {
      "id": "poison",
      "name": "どくの牙",
      "icon": "☠️"
    },
    "color": "#38bdf8",
    "art": "boss",
    "subjects": {
      "calc": 33,
      "eq": 56,
      "func": 95,
      "geo": 36,
      "data": 60
    },
    "primarySubject": "func"
  },
  {
    "id": "su_h2",
    "name": "反比例の強敵",
    "theme": "反比例・小単元ボス",
    "chapterId": "c4",
    "grade": 1,
    "kind": "unitSmallBoss",
    "rarity": "R",
    "role": "boss",
    "roleTag": "小単元ボス・BP150",
    "hp": 1060,
    "atk": 400,
    "skill": {
      "id": "poison",
      "name": "どくの牙",
      "icon": "☠️"
    },
    "color": "#38bdf8",
    "art": "boss",
    "subjects": {
      "calc": 33,
      "eq": 56,
      "func": 95,
      "geo": 36,
      "data": 60
    },
    "primarySubject": "func"
  },
  {
    "id": "su_h3",
    "name": "座標とグラフの強敵",
    "theme": "座標とグラフ・小単元ボス",
    "chapterId": "c4",
    "grade": 1,
    "kind": "unitSmallBoss",
    "rarity": "R",
    "role": "boss",
    "roleTag": "小単元ボス・BP150",
    "hp": 1060,
    "atk": 400,
    "skill": {
      "id": "poison",
      "name": "どくの牙",
      "icon": "☠️"
    },
    "color": "#38bdf8",
    "art": "boss",
    "subjects": {
      "calc": 33,
      "eq": 56,
      "func": 95,
      "geo": 36,
      "data": 60
    },
    "primarySubject": "func"
  },
  {
    "id": "su_h4",
    "name": "変域の強敵",
    "theme": "変域・小単元ボス",
    "chapterId": "c4",
    "grade": 1,
    "kind": "unitSmallBoss",
    "rarity": "R",
    "role": "boss",
    "roleTag": "小単元ボス・BP150",
    "hp": 1060,
    "atk": 400,
    "skill": {
      "id": "poison",
      "name": "どくの牙",
      "icon": "☠️"
    },
    "color": "#38bdf8",
    "art": "boss",
    "subjects": {
      "calc": 33,
      "eq": 56,
      "func": 95,
      "geo": 36,
      "data": 60
    },
    "primarySubject": "func"
  },
  {
    "id": "su_h5",
    "name": "比例・反比例の利用の強敵",
    "theme": "比例・反比例の利用・小単元ボス",
    "chapterId": "c4",
    "grade": 1,
    "kind": "unitSmallBoss",
    "rarity": "R",
    "role": "boss",
    "roleTag": "小単元ボス・BP150",
    "hp": 1060,
    "atk": 400,
    "skill": {
      "id": "poison",
      "name": "どくの牙",
      "icon": "☠️"
    },
    "color": "#38bdf8",
    "art": "boss",
    "subjects": {
      "calc": 33,
      "eq": 56,
      "func": 95,
      "geo": 36,
      "data": 60
    },
    "primarySubject": "func"
  },
  {
    "id": "su_z1",
    "name": "図形の基本と角の強敵",
    "theme": "図形の基本と角・小単元ボス",
    "chapterId": "c5",
    "grade": 1,
    "kind": "unitSmallBoss",
    "rarity": "R",
    "role": "boss",
    "roleTag": "小単元ボス・BP150",
    "hp": 1060,
    "atk": 400,
    "skill": {
      "id": "multi",
      "name": "連続攻撃",
      "icon": "👊"
    },
    "color": "#f472b6",
    "art": "boss",
    "subjects": {
      "calc": 33,
      "eq": 56,
      "func": 37,
      "geo": 95,
      "data": 59
    },
    "primarySubject": "geo"
  },
  {
    "id": "su_z2",
    "name": "図形の移動の強敵",
    "theme": "図形の移動・小単元ボス",
    "chapterId": "c5",
    "grade": 1,
    "kind": "unitSmallBoss",
    "rarity": "R",
    "role": "boss",
    "roleTag": "小単元ボス・BP150",
    "hp": 1060,
    "atk": 400,
    "skill": {
      "id": "multi",
      "name": "連続攻撃",
      "icon": "👊"
    },
    "color": "#f472b6",
    "art": "boss",
    "subjects": {
      "calc": 33,
      "eq": 56,
      "func": 37,
      "geo": 95,
      "data": 59
    },
    "primarySubject": "geo"
  },
  {
    "id": "su_z3",
    "name": "おうぎ形①（弧・面積）の強敵",
    "theme": "おうぎ形①（弧・面積）・小単元ボス",
    "chapterId": "c5",
    "grade": 1,
    "kind": "unitSmallBoss",
    "rarity": "R",
    "role": "boss",
    "roleTag": "小単元ボス・BP150",
    "hp": 1060,
    "atk": 400,
    "skill": {
      "id": "multi",
      "name": "連続攻撃",
      "icon": "👊"
    },
    "color": "#f472b6",
    "art": "boss",
    "subjects": {
      "calc": 33,
      "eq": 56,
      "func": 37,
      "geo": 95,
      "data": 59
    },
    "primarySubject": "geo"
  },
  {
    "id": "su_z4",
    "name": "おうぎ形②（中心角）の強敵",
    "theme": "おうぎ形②（中心角）・小単元ボス",
    "chapterId": "c5",
    "grade": 1,
    "kind": "unitSmallBoss",
    "rarity": "R",
    "role": "boss",
    "roleTag": "小単元ボス・BP150",
    "hp": 1060,
    "atk": 400,
    "skill": {
      "id": "multi",
      "name": "連続攻撃",
      "icon": "👊"
    },
    "color": "#f472b6",
    "art": "boss",
    "subjects": {
      "calc": 33,
      "eq": 56,
      "func": 37,
      "geo": 95,
      "data": 59
    },
    "primarySubject": "geo"
  },
  {
    "id": "su_k1",
    "name": "立体の種類・特徴の強敵",
    "theme": "立体の種類・特徴・小単元ボス",
    "chapterId": "c6",
    "grade": 1,
    "kind": "unitSmallBoss",
    "rarity": "R",
    "role": "boss",
    "roleTag": "小単元ボス・BP150",
    "hp": 1060,
    "atk": 400,
    "skill": {
      "id": "timejam",
      "name": "時間妨害",
      "icon": "⏱️"
    },
    "color": "#a78bfa",
    "art": "boss",
    "subjects": {
      "calc": 34,
      "eq": 56,
      "func": 36,
      "geo": 95,
      "data": 59
    },
    "primarySubject": "geo"
  },
  {
    "id": "su_k2",
    "name": "体積の強敵",
    "theme": "体積・小単元ボス",
    "chapterId": "c6",
    "grade": 1,
    "kind": "unitSmallBoss",
    "rarity": "R",
    "role": "boss",
    "roleTag": "小単元ボス・BP150",
    "hp": 1060,
    "atk": 400,
    "skill": {
      "id": "timejam",
      "name": "時間妨害",
      "icon": "⏱️"
    },
    "color": "#a78bfa",
    "art": "boss",
    "subjects": {
      "calc": 34,
      "eq": 56,
      "func": 36,
      "geo": 95,
      "data": 59
    },
    "primarySubject": "geo"
  },
  {
    "id": "su_k3",
    "name": "表面積の強敵",
    "theme": "表面積・小単元ボス",
    "chapterId": "c6",
    "grade": 1,
    "kind": "unitSmallBoss",
    "rarity": "R",
    "role": "boss",
    "roleTag": "小単元ボス・BP150",
    "hp": 1060,
    "atk": 400,
    "skill": {
      "id": "timejam",
      "name": "時間妨害",
      "icon": "⏱️"
    },
    "color": "#a78bfa",
    "art": "boss",
    "subjects": {
      "calc": 34,
      "eq": 56,
      "func": 36,
      "geo": 95,
      "data": 59
    },
    "primarySubject": "geo"
  },
  {
    "id": "su_k4",
    "name": "球の強敵",
    "theme": "球・小単元ボス",
    "chapterId": "c6",
    "grade": 1,
    "kind": "unitSmallBoss",
    "rarity": "R",
    "role": "boss",
    "roleTag": "小単元ボス・BP150",
    "hp": 1060,
    "atk": 400,
    "skill": {
      "id": "timejam",
      "name": "時間妨害",
      "icon": "⏱️"
    },
    "color": "#a78bfa",
    "art": "boss",
    "subjects": {
      "calc": 34,
      "eq": 56,
      "func": 36,
      "geo": 95,
      "data": 59
    },
    "primarySubject": "geo"
  },
  {
    "id": "su_d1",
    "name": "代表値の強敵",
    "theme": "代表値・小単元ボス",
    "chapterId": "c7",
    "grade": 1,
    "kind": "unitSmallBoss",
    "rarity": "R",
    "role": "boss",
    "roleTag": "小単元ボス・BP150",
    "hp": 1060,
    "atk": 400,
    "skill": {
      "id": "paralysis",
      "name": "しびれの一撃",
      "icon": "⚡"
    },
    "color": "#34d399",
    "art": "boss",
    "subjects": {
      "calc": 62,
      "eq": 46,
      "func": 29,
      "geo": 48,
      "data": 95
    },
    "primarySubject": "data"
  },
  {
    "id": "su_d2",
    "name": "度数分布・相対度数の強敵",
    "theme": "度数分布・相対度数・小単元ボス",
    "chapterId": "c7",
    "grade": 1,
    "kind": "unitSmallBoss",
    "rarity": "R",
    "role": "boss",
    "roleTag": "小単元ボス・BP150",
    "hp": 1060,
    "atk": 400,
    "skill": {
      "id": "paralysis",
      "name": "しびれの一撃",
      "icon": "⚡"
    },
    "color": "#34d399",
    "art": "boss",
    "subjects": {
      "calc": 62,
      "eq": 46,
      "func": 29,
      "geo": 48,
      "data": 95
    },
    "primarySubject": "data"
  },
  {
    "id": "su_d3",
    "name": "確率（相対度数）の強敵",
    "theme": "確率（相対度数）・小単元ボス",
    "chapterId": "c7",
    "grade": 1,
    "kind": "unitSmallBoss",
    "rarity": "R",
    "role": "boss",
    "roleTag": "小単元ボス・BP150",
    "hp": 1060,
    "atk": 400,
    "skill": {
      "id": "paralysis",
      "name": "しびれの一撃",
      "icon": "⚡"
    },
    "color": "#34d399",
    "art": "boss",
    "subjects": {
      "calc": 62,
      "eq": 46,
      "func": 29,
      "geo": 48,
      "data": 95
    },
    "primarySubject": "data"
  },
  {
    "id": "boss_c1",
    "name": "正の数と負の数の主",
    "theme": "正の数と負の数・全体",
    "chapterId": "c1",
    "grade": 1,
    "kind": "chapterBoss",
    "rarity": "SR",
    "role": "boss",
    "roleTag": "章ボス・超必殺",
    "hp": 1208,
    "atk": 399,
    "skill": {
      "id": "crit",
      "name": "会心の一撃",
      "icon": "⭐"
    },
    "color": "#818cf8",
    "art": "boss",
    "subjects": {
      "calc": 102,
      "eq": 49,
      "func": 49,
      "geo": 50,
      "data": 50
    },
    "primarySubject": "calc"
  },
  {
    "id": "boss_c2",
    "name": "文字の式の主",
    "theme": "文字の式・全体",
    "chapterId": "c2",
    "grade": 1,
    "kind": "chapterBoss",
    "rarity": "SR",
    "role": "boss",
    "roleTag": "章ボス・超必殺",
    "hp": 1216,
    "atk": 416,
    "skill": {
      "id": "crit",
      "name": "会心の一撃",
      "icon": "⭐"
    },
    "color": "#34d399",
    "art": "boss",
    "subjects": {
      "calc": 102,
      "eq": 49,
      "func": 49,
      "geo": 50,
      "data": 50
    },
    "primarySubject": "calc"
  },
  {
    "id": "boss_c3",
    "name": "方程式の主",
    "theme": "方程式・全体",
    "chapterId": "c3",
    "grade": 1,
    "kind": "chapterBoss",
    "rarity": "SR",
    "role": "boss",
    "roleTag": "章ボス・超必殺",
    "hp": 1230,
    "atk": 451,
    "skill": {
      "id": "crit",
      "name": "会心の一撃",
      "icon": "⭐"
    },
    "color": "#fb923c",
    "art": "boss",
    "subjects": {
      "calc": 49,
      "eq": 102,
      "func": 49,
      "geo": 50,
      "data": 50
    },
    "primarySubject": "eq"
  },
  {
    "id": "boss_c4",
    "name": "比例と反比例の主",
    "theme": "比例と反比例・全体",
    "chapterId": "c4",
    "grade": 1,
    "kind": "chapterBoss",
    "rarity": "SR",
    "role": "boss",
    "roleTag": "章ボス・超必殺",
    "hp": 1249,
    "atk": 498,
    "skill": {
      "id": "crit",
      "name": "会心の一撃",
      "icon": "⭐"
    },
    "color": "#38bdf8",
    "art": "boss",
    "subjects": {
      "calc": 49,
      "eq": 49,
      "func": 102,
      "geo": 50,
      "data": 50
    },
    "primarySubject": "func"
  },
  {
    "id": "boss_c5",
    "name": "平面図形の主",
    "theme": "平面図形・全体",
    "chapterId": "c5",
    "grade": 1,
    "kind": "chapterBoss",
    "rarity": "SR",
    "role": "boss",
    "roleTag": "章ボス・超必殺",
    "hp": 1276,
    "atk": 563,
    "skill": {
      "id": "crit",
      "name": "会心の一撃",
      "icon": "⭐"
    },
    "color": "#f472b6",
    "art": "boss",
    "subjects": {
      "calc": 49,
      "eq": 49,
      "func": 50,
      "geo": 102,
      "data": 50
    },
    "primarySubject": "geo"
  },
  {
    "id": "boss_c6",
    "name": "空間図形の主",
    "theme": "空間図形・全体",
    "chapterId": "c6",
    "grade": 1,
    "kind": "chapterBoss",
    "rarity": "SR",
    "role": "boss",
    "roleTag": "章ボス・超必殺",
    "hp": 1306,
    "atk": 635,
    "skill": {
      "id": "crit",
      "name": "会心の一撃",
      "icon": "⭐"
    },
    "color": "#a78bfa",
    "art": "boss",
    "subjects": {
      "calc": 49,
      "eq": 49,
      "func": 50,
      "geo": 102,
      "data": 50
    },
    "primarySubject": "geo"
  },
  {
    "id": "boss_c7",
    "name": "データの活用の主",
    "theme": "データの活用・全体",
    "chapterId": "c7",
    "grade": 1,
    "kind": "chapterBoss",
    "rarity": "SR",
    "role": "boss",
    "roleTag": "章ボス・超必殺",
    "hp": 1336,
    "atk": 700,
    "skill": {
      "id": "crit",
      "name": "会心の一撃",
      "icon": "⭐"
    },
    "color": "#34d399",
    "art": "boss",
    "subjects": {
      "calc": 49,
      "eq": 49,
      "func": 50,
      "geo": 50,
      "data": 102
    },
    "primarySubject": "data"
  },
  {
    "id": "boss_g2c1",
    "name": "式の計算の主",
    "theme": "式の計算・全体",
    "chapterId": "g2c1",
    "grade": 2,
    "kind": "chapterBoss",
    "rarity": "SR",
    "role": "boss",
    "roleTag": "章ボス・超必殺",
    "hp": 1213,
    "atk": 409,
    "skill": {
      "id": "crit",
      "name": "会心の一撃",
      "icon": "⭐"
    },
    "color": "#34d399",
    "art": "boss",
    "subjects": {
      "calc": 102,
      "eq": 41,
      "func": 47,
      "geo": 52,
      "data": 58
    },
    "primarySubject": "calc"
  },
  {
    "id": "boss_g2c2",
    "name": "連立方程式の主",
    "theme": "連立方程式・全体",
    "chapterId": "g2c2",
    "grade": 2,
    "kind": "chapterBoss",
    "rarity": "SR",
    "role": "boss",
    "roleTag": "章ボス・超必殺",
    "hp": 1223,
    "atk": 434,
    "skill": {
      "id": "crit",
      "name": "会心の一撃",
      "icon": "⭐"
    },
    "color": "#60a5fa",
    "art": "boss",
    "subjects": {
      "calc": 41,
      "eq": 102,
      "func": 47,
      "geo": 52,
      "data": 58
    },
    "primarySubject": "eq"
  },
  {
    "id": "boss_g2c3",
    "name": "一次関数の主",
    "theme": "一次関数・全体",
    "chapterId": "g2c3",
    "grade": 2,
    "kind": "chapterBoss",
    "rarity": "SR",
    "role": "boss",
    "roleTag": "章ボス・超必殺",
    "hp": 1242,
    "atk": 480,
    "skill": {
      "id": "crit",
      "name": "会心の一撃",
      "icon": "⭐"
    },
    "color": "#f59e0b",
    "art": "boss",
    "subjects": {
      "calc": 41,
      "eq": 47,
      "func": 102,
      "geo": 52,
      "data": 58
    },
    "primarySubject": "func"
  },
  {
    "id": "boss_g2c4",
    "name": "平行と合同の主",
    "theme": "平行と合同・全体",
    "chapterId": "g2c4",
    "grade": 2,
    "kind": "chapterBoss",
    "rarity": "SR",
    "role": "boss",
    "roleTag": "章ボス・超必殺",
    "hp": 1257,
    "atk": 517,
    "skill": {
      "id": "crit",
      "name": "会心の一撃",
      "icon": "⭐"
    },
    "color": "#a78bfa",
    "art": "boss",
    "subjects": {
      "calc": 41,
      "eq": 47,
      "func": 52,
      "geo": 102,
      "data": 58
    },
    "primarySubject": "geo"
  },
  {
    "id": "boss_g2c5",
    "name": "三角形と四角形の主",
    "theme": "三角形と四角形・全体",
    "chapterId": "g2c5",
    "grade": 2,
    "kind": "chapterBoss",
    "rarity": "SR",
    "role": "boss",
    "roleTag": "章ボス・超必殺",
    "hp": 1293,
    "atk": 604,
    "skill": {
      "id": "crit",
      "name": "会心の一撃",
      "icon": "⭐"
    },
    "color": "#fb7185",
    "art": "boss",
    "subjects": {
      "calc": 41,
      "eq": 47,
      "func": 52,
      "geo": 102,
      "data": 58
    },
    "primarySubject": "geo"
  },
  {
    "id": "boss_g2c6",
    "name": "確率と統計の主",
    "theme": "確率と統計・全体",
    "chapterId": "g2c6",
    "grade": 2,
    "kind": "chapterBoss",
    "rarity": "SR",
    "role": "boss",
    "roleTag": "章ボス・超必殺",
    "hp": 1336,
    "atk": 700,
    "skill": {
      "id": "crit",
      "name": "会心の一撃",
      "icon": "⭐"
    },
    "color": "#22d3ee",
    "art": "boss",
    "subjects": {
      "calc": 41,
      "eq": 47,
      "func": 52,
      "geo": 58,
      "data": 102
    },
    "primarySubject": "data"
  },
  {
    "id": "boss_g3c1",
    "name": "式の展開と因数分解の主",
    "theme": "式の展開と因数分解・全体",
    "chapterId": "g3c1",
    "grade": 3,
    "kind": "chapterBoss",
    "rarity": "SR",
    "role": "boss",
    "roleTag": "章ボス・超必殺",
    "hp": 1209,
    "atk": 401,
    "skill": {
      "id": "crit",
      "name": "会心の一撃",
      "icon": "⭐"
    },
    "color": "#34d399",
    "art": "boss",
    "subjects": {
      "calc": 102,
      "eq": 42,
      "func": 47,
      "geo": 52,
      "data": 57
    },
    "primarySubject": "calc"
  },
  {
    "id": "boss_g3c2",
    "name": "平方根の主",
    "theme": "平方根・全体",
    "chapterId": "g3c2",
    "grade": 3,
    "kind": "chapterBoss",
    "rarity": "SR",
    "role": "boss",
    "roleTag": "章ボス・超必殺",
    "hp": 1217,
    "atk": 420,
    "skill": {
      "id": "crit",
      "name": "会心の一撃",
      "icon": "⭐"
    },
    "color": "#38bdf8",
    "art": "boss",
    "subjects": {
      "calc": 102,
      "eq": 42,
      "func": 47,
      "geo": 52,
      "data": 57
    },
    "primarySubject": "calc"
  },
  {
    "id": "boss_g3c3",
    "name": "2次方程式の主",
    "theme": "2次方程式・全体",
    "chapterId": "g3c3",
    "grade": 3,
    "kind": "chapterBoss",
    "rarity": "SR",
    "role": "boss",
    "roleTag": "章ボス・超必殺",
    "hp": 1233,
    "atk": 458,
    "skill": {
      "id": "crit",
      "name": "会心の一撃",
      "icon": "⭐"
    },
    "color": "#f472b6",
    "art": "boss",
    "subjects": {
      "calc": 42,
      "eq": 102,
      "func": 47,
      "geo": 52,
      "data": 57
    },
    "primarySubject": "eq"
  },
  {
    "id": "boss_g3c4",
    "name": "関数 y=ax²の主",
    "theme": "関数 y=ax²・全体",
    "chapterId": "g3c4",
    "grade": 3,
    "kind": "chapterBoss",
    "rarity": "SR",
    "role": "boss",
    "roleTag": "章ボス・超必殺",
    "hp": 1245,
    "atk": 489,
    "skill": {
      "id": "crit",
      "name": "会心の一撃",
      "icon": "⭐"
    },
    "color": "#fbbf24",
    "art": "boss",
    "subjects": {
      "calc": 42,
      "eq": 47,
      "func": 102,
      "geo": 52,
      "data": 57
    },
    "primarySubject": "func"
  },
  {
    "id": "boss_g3c5",
    "name": "相似な図形の主",
    "theme": "相似な図形・全体",
    "chapterId": "g3c5",
    "grade": 3,
    "kind": "chapterBoss",
    "rarity": "SR",
    "role": "boss",
    "roleTag": "章ボス・超必殺",
    "hp": 1262,
    "atk": 528,
    "skill": {
      "id": "crit",
      "name": "会心の一撃",
      "icon": "⭐"
    },
    "color": "#a78bfa",
    "art": "boss",
    "subjects": {
      "calc": 42,
      "eq": 47,
      "func": 52,
      "geo": 102,
      "data": 57
    },
    "primarySubject": "geo"
  },
  {
    "id": "boss_g3c6",
    "name": "円の主",
    "theme": "円・全体",
    "chapterId": "g3c6",
    "grade": 3,
    "kind": "chapterBoss",
    "rarity": "SR",
    "role": "boss",
    "roleTag": "章ボス・超必殺",
    "hp": 1282,
    "atk": 577,
    "skill": {
      "id": "crit",
      "name": "会心の一撃",
      "icon": "⭐"
    },
    "color": "#22d3ee",
    "art": "boss",
    "subjects": {
      "calc": 42,
      "eq": 47,
      "func": 52,
      "geo": 102,
      "data": 57
    },
    "primarySubject": "geo"
  },
  {
    "id": "boss_g3c7",
    "name": "三平方の定理の主",
    "theme": "三平方の定理・全体",
    "chapterId": "g3c7",
    "grade": 3,
    "kind": "chapterBoss",
    "rarity": "SR",
    "role": "boss",
    "roleTag": "章ボス・超必殺",
    "hp": 1306,
    "atk": 635,
    "skill": {
      "id": "crit",
      "name": "会心の一撃",
      "icon": "⭐"
    },
    "color": "#fb7185",
    "art": "boss",
    "subjects": {
      "calc": 42,
      "eq": 47,
      "func": 52,
      "geo": 102,
      "data": 57
    },
    "primarySubject": "geo"
  },
  {
    "id": "boss_g3c8",
    "name": "標本調査の主",
    "theme": "標本調査・全体",
    "chapterId": "g3c8",
    "grade": 3,
    "kind": "chapterBoss",
    "rarity": "SR",
    "role": "boss",
    "roleTag": "章ボス・超必殺",
    "hp": 1336,
    "atk": 700,
    "skill": {
      "id": "crit",
      "name": "会心の一撃",
      "icon": "⭐"
    },
    "color": "#94a3b8",
    "art": "boss",
    "subjects": {
      "calc": 42,
      "eq": 47,
      "func": 52,
      "geo": 57,
      "data": 102
    },
    "primarySubject": "data"
  },
  {
    "id": "bl_c1_6",
    "name": "正の数と負の数の試練・第6段",
    "theme": "正の数と負の数・ボスの梯子",
    "chapterId": "c1",
    "grade": 1,
    "kind": "unitBoss",
    "rarity": "UR",
    "role": "boss",
    "roleTag": "ボス6段・BP340",
    "hp": 1590,
    "atk": 784,
    "skill": {
      "id": "attack",
      "name": "渾身の一撃",
      "icon": "⚔️"
    },
    "color": "#818cf8",
    "art": "boss",
    "subjects": {
      "calc": 112,
      "eq": 54,
      "func": 54,
      "geo": 55,
      "data": 55
    },
    "primarySubject": "calc"
  },
  {
    "id": "bl_c2_6",
    "name": "文字の式の試練・第6段",
    "theme": "文字の式・ボスの梯子",
    "chapterId": "c2",
    "grade": 1,
    "kind": "unitBoss",
    "rarity": "UR",
    "role": "boss",
    "roleTag": "ボス6段・BP340",
    "hp": 1590,
    "atk": 784,
    "skill": {
      "id": "charge",
      "name": "ためて大技",
      "icon": "🔥"
    },
    "color": "#34d399",
    "art": "boss",
    "subjects": {
      "calc": 112,
      "eq": 54,
      "func": 54,
      "geo": 55,
      "data": 55
    },
    "primarySubject": "calc"
  },
  {
    "id": "bl_c3_6",
    "name": "方程式の試練・第6段",
    "theme": "方程式・ボスの梯子",
    "chapterId": "c3",
    "grade": 1,
    "kind": "unitBoss",
    "rarity": "UR",
    "role": "boss",
    "roleTag": "ボス6段・BP340",
    "hp": 1590,
    "atk": 784,
    "skill": {
      "id": "sleep",
      "name": "ねむりの呪文",
      "icon": "💤"
    },
    "color": "#fb923c",
    "art": "boss",
    "subjects": {
      "calc": 54,
      "eq": 112,
      "func": 54,
      "geo": 55,
      "data": 55
    },
    "primarySubject": "eq"
  },
  {
    "id": "bl_c4_6",
    "name": "比例と反比例の試練・第6段",
    "theme": "比例と反比例・ボスの梯子",
    "chapterId": "c4",
    "grade": 1,
    "kind": "unitBoss",
    "rarity": "UR",
    "role": "boss",
    "roleTag": "ボス6段・BP340",
    "hp": 1590,
    "atk": 784,
    "skill": {
      "id": "poison",
      "name": "どくの牙",
      "icon": "☠️"
    },
    "color": "#38bdf8",
    "art": "boss",
    "subjects": {
      "calc": 54,
      "eq": 54,
      "func": 112,
      "geo": 55,
      "data": 55
    },
    "primarySubject": "func"
  },
  {
    "id": "bl_c5_6",
    "name": "平面図形の試練・第6段",
    "theme": "平面図形・ボスの梯子",
    "chapterId": "c5",
    "grade": 1,
    "kind": "unitBoss",
    "rarity": "UR",
    "role": "boss",
    "roleTag": "ボス6段・BP340",
    "hp": 1590,
    "atk": 784,
    "skill": {
      "id": "multi",
      "name": "連続攻撃",
      "icon": "👊"
    },
    "color": "#f472b6",
    "art": "boss",
    "subjects": {
      "calc": 54,
      "eq": 54,
      "func": 55,
      "geo": 112,
      "data": 55
    },
    "primarySubject": "geo"
  },
  {
    "id": "bl_c6_6",
    "name": "空間図形の試練・第6段",
    "theme": "空間図形・ボスの梯子",
    "chapterId": "c6",
    "grade": 1,
    "kind": "unitBoss",
    "rarity": "UR",
    "role": "boss",
    "roleTag": "ボス6段・BP340",
    "hp": 1590,
    "atk": 784,
    "skill": {
      "id": "timejam",
      "name": "時間妨害",
      "icon": "⏱️"
    },
    "color": "#a78bfa",
    "art": "boss",
    "subjects": {
      "calc": 54,
      "eq": 54,
      "func": 55,
      "geo": 112,
      "data": 55
    },
    "primarySubject": "geo"
  },
  {
    "id": "bl_c7_6",
    "name": "データの活用の試練・第6段",
    "theme": "データの活用・ボスの梯子",
    "chapterId": "c7",
    "grade": 1,
    "kind": "unitBoss",
    "rarity": "UR",
    "role": "boss",
    "roleTag": "ボス6段・BP340",
    "hp": 1590,
    "atk": 784,
    "skill": {
      "id": "paralysis",
      "name": "しびれの一撃",
      "icon": "⚡"
    },
    "color": "#34d399",
    "art": "boss",
    "subjects": {
      "calc": 54,
      "eq": 54,
      "func": 55,
      "geo": 55,
      "data": 112
    },
    "primarySubject": "data"
  },
  {
    "id": "secret_1_0",
    "name": "裏ボス・深淵の番人（中1）",
    "theme": "中1・全単元の発展（極）",
    "chapterId": null,
    "grade": 1,
    "kind": "secretBoss",
    "rarity": "SR",
    "role": "boss",
    "roleTag": "裏ボス・推奨Lv80",
    "hp": 1208,
    "atk": 399,
    "skill": {
      "id": "gigacalc",
      "name": "超難問の一撃",
      "icon": "🧮"
    },
    "color": "#22d3ee",
    "art": "boss",
    "subjects": {
      "calc": 51,
      "eq": 34,
      "func": 65,
      "geo": 48,
      "data": 102
    },
    "primarySubject": "data"
  },
  {
    "id": "secret_1_1",
    "name": "裏ボス・混沌の使者（中1）",
    "theme": "中1・全単元の発展（極）",
    "chapterId": null,
    "grade": 1,
    "kind": "secretBoss",
    "rarity": "SR",
    "role": "boss",
    "roleTag": "裏ボス・推奨Lv100",
    "hp": 1209,
    "atk": 401,
    "skill": {
      "id": "gigacalc",
      "name": "超難問の一撃",
      "icon": "🧮"
    },
    "color": "#a78bfa",
    "art": "boss",
    "subjects": {
      "calc": 51,
      "eq": 34,
      "func": 65,
      "geo": 48,
      "data": 102
    },
    "primarySubject": "data"
  },
  {
    "id": "secret_1_2",
    "name": "裏ボス・虚無の王（中1）",
    "theme": "中1・全単元の発展（極）",
    "chapterId": null,
    "grade": 1,
    "kind": "secretBoss",
    "rarity": "SR",
    "role": "boss",
    "roleTag": "裏ボス・推奨Lv150",
    "hp": 1215,
    "atk": 414,
    "skill": {
      "id": "gigacalc",
      "name": "超難問の一撃",
      "icon": "🧮"
    },
    "color": "#f472b6",
    "art": "boss",
    "subjects": {
      "calc": 51,
      "eq": 34,
      "func": 65,
      "geo": 48,
      "data": 102
    },
    "primarySubject": "data"
  },
  {
    "id": "secret_1_3",
    "name": "裏ボス・破壊神オメガ（中1）",
    "theme": "中1・全単元の発展（極）",
    "chapterId": null,
    "grade": 1,
    "kind": "secretBoss",
    "rarity": "SR",
    "role": "boss",
    "roleTag": "裏ボス・推奨Lv200",
    "hp": 1230,
    "atk": 450,
    "skill": {
      "id": "gigacalc",
      "name": "超難問の一撃",
      "icon": "🧮"
    },
    "color": "#fb923c",
    "art": "boss",
    "subjects": {
      "calc": 51,
      "eq": 34,
      "func": 65,
      "geo": 48,
      "data": 102
    },
    "primarySubject": "data"
  },
  {
    "id": "secret_1_4",
    "name": "裏ボス・時空の支配者（中1）",
    "theme": "中1・全単元の発展（極）",
    "chapterId": null,
    "grade": 1,
    "kind": "secretBoss",
    "rarity": "SR",
    "role": "boss",
    "roleTag": "裏ボス・推奨Lv250",
    "hp": 1265,
    "atk": 535,
    "skill": {
      "id": "gigacalc",
      "name": "超難問の一撃",
      "icon": "🧮"
    },
    "color": "#f43f5e",
    "art": "boss",
    "subjects": {
      "calc": 51,
      "eq": 34,
      "func": 65,
      "geo": 48,
      "data": 102
    },
    "primarySubject": "data"
  },
  {
    "id": "secret_1_5",
    "name": "裏ボス・数学の真神（中1）",
    "theme": "中1・全単元の発展（極）",
    "chapterId": null,
    "grade": 1,
    "kind": "secretBoss",
    "rarity": "SR",
    "role": "boss",
    "roleTag": "裏ボス・推奨Lv300",
    "hp": 1336,
    "atk": 700,
    "skill": {
      "id": "gigacalc",
      "name": "超難問の一撃",
      "icon": "🧮"
    },
    "color": "#fde047",
    "art": "boss",
    "subjects": {
      "calc": 51,
      "eq": 34,
      "func": 65,
      "geo": 48,
      "data": 102
    },
    "primarySubject": "data"
  },
  {
    "id": "secret_1_6",
    "name": "裏ボス・終焉の竜帝（中1）",
    "theme": "中1・全単元の発展（極）",
    "chapterId": null,
    "grade": 1,
    "kind": "secretBoss",
    "rarity": "UR",
    "role": "boss",
    "roleTag": "裏ボス・推奨Lv400",
    "hp": 1511,
    "atk": 560,
    "skill": {
      "id": "gigacalc",
      "name": "超難問の一撃",
      "icon": "🧮"
    },
    "color": "#ef4444",
    "art": "boss",
    "subjects": {
      "calc": 57,
      "eq": 38,
      "func": 71,
      "geo": 52,
      "data": 112
    },
    "primarySubject": "data"
  },
  {
    "id": "secret_1_7",
    "name": "裏ボス・星喰らいの魔王（中1）",
    "theme": "中1・全単元の発展（極）",
    "chapterId": null,
    "grade": 1,
    "kind": "secretBoss",
    "rarity": "UR",
    "role": "boss",
    "roleTag": "裏ボス・推奨Lv500",
    "hp": 1513,
    "atk": 568,
    "skill": {
      "id": "gigacalc",
      "name": "超難問の一撃",
      "icon": "🧮"
    },
    "color": "#8b5cf6",
    "art": "boss",
    "subjects": {
      "calc": 57,
      "eq": 38,
      "func": 71,
      "geo": 52,
      "data": 112
    },
    "primarySubject": "data"
  },
  {
    "id": "secret_1_8",
    "name": "裏ボス・次元の裂け目（中1）",
    "theme": "中1・全単元の発展（極）",
    "chapterId": null,
    "grade": 1,
    "kind": "secretBoss",
    "rarity": "UR",
    "role": "boss",
    "roleTag": "裏ボス・推奨Lv600",
    "hp": 1519,
    "atk": 583,
    "skill": {
      "id": "gigacalc",
      "name": "超難問の一撃",
      "icon": "🧮"
    },
    "color": "#06b6d4",
    "art": "boss",
    "subjects": {
      "calc": 57,
      "eq": 38,
      "func": 71,
      "geo": 52,
      "data": 112
    },
    "primarySubject": "data"
  },
  {
    "id": "secret_1_9",
    "name": "裏ボス・永劫の支配者（中1）",
    "theme": "中1・全単元の発展（極）",
    "chapterId": null,
    "grade": 1,
    "kind": "secretBoss",
    "rarity": "UR",
    "role": "boss",
    "roleTag": "裏ボス・推奨Lv700",
    "hp": 1529,
    "atk": 611,
    "skill": {
      "id": "gigacalc",
      "name": "超難問の一撃",
      "icon": "🧮"
    },
    "color": "#f59e0b",
    "art": "boss",
    "subjects": {
      "calc": 57,
      "eq": 38,
      "func": 71,
      "geo": 52,
      "data": 112
    },
    "primarySubject": "data"
  },
  {
    "id": "secret_1_10",
    "name": "裏ボス・無限の審判者（中1）",
    "theme": "中1・全単元の発展（極）",
    "chapterId": null,
    "grade": 1,
    "kind": "secretBoss",
    "rarity": "UR",
    "role": "boss",
    "roleTag": "裏ボス・推奨Lv800",
    "hp": 1545,
    "atk": 658,
    "skill": {
      "id": "gigacalc",
      "name": "超難問の一撃",
      "icon": "🧮"
    },
    "color": "#ec4899",
    "art": "boss",
    "subjects": {
      "calc": 42,
      "eq": 63,
      "func": 46,
      "geo": 112,
      "data": 67
    },
    "primarySubject": "geo"
  },
  {
    "id": "secret_1_11",
    "name": "裏ボス・創世の破壊者（中1）",
    "theme": "中1・全単元の発展（極）",
    "chapterId": null,
    "grade": 1,
    "kind": "secretBoss",
    "rarity": "UR",
    "role": "boss",
    "roleTag": "裏ボス・推奨Lv900",
    "hp": 1573,
    "atk": 735,
    "skill": {
      "id": "gigacalc",
      "name": "超難問の一撃",
      "icon": "🧮"
    },
    "color": "#10b981",
    "art": "boss",
    "subjects": {
      "calc": 42,
      "eq": 63,
      "func": 46,
      "geo": 112,
      "data": 67
    },
    "primarySubject": "geo"
  },
  {
    "id": "secret_1_12",
    "name": "裏ボス・概念崩壊オメガ（中1）",
    "theme": "中1・全単元の発展（極）",
    "chapterId": null,
    "grade": 1,
    "kind": "secretBoss",
    "rarity": "UR",
    "role": "boss",
    "roleTag": "裏ボス・推奨Lv1000",
    "hp": 1614,
    "atk": 852,
    "skill": {
      "id": "gigacalc",
      "name": "超難問の一撃",
      "icon": "🧮"
    },
    "color": "#fbbf24",
    "art": "boss",
    "subjects": {
      "calc": 42,
      "eq": 63,
      "func": 46,
      "geo": 112,
      "data": 67
    },
    "primarySubject": "geo"
  },
  {
    "id": "secret_1_13",
    "name": "裏ボス・虚数界の覇王（中1）",
    "theme": "中1・全単元の発展（極）",
    "chapterId": null,
    "grade": 1,
    "kind": "secretBoss",
    "rarity": "UR",
    "role": "boss",
    "roleTag": "裏ボス・推奨Lv1100",
    "hp": 1624,
    "atk": 881,
    "skill": {
      "id": "gigacalc",
      "name": "超難問の一撃",
      "icon": "🧮"
    },
    "color": "#a855f7",
    "art": "boss",
    "subjects": {
      "calc": 42,
      "eq": 63,
      "func": 46,
      "geo": 112,
      "data": 67
    },
    "primarySubject": "geo"
  },
  {
    "id": "secret_1_14",
    "name": "裏ボス・絶対零度の神（中1）",
    "theme": "中1・全単元の発展（極）",
    "chapterId": null,
    "grade": 1,
    "kind": "secretBoss",
    "rarity": "UR",
    "role": "boss",
    "roleTag": "裏ボス・推奨Lv1200",
    "hp": 1635,
    "atk": 911,
    "skill": {
      "id": "gigacalc",
      "name": "超難問の一撃",
      "icon": "🧮"
    },
    "color": "#38bdf8",
    "art": "boss",
    "subjects": {
      "calc": 42,
      "eq": 63,
      "func": 46,
      "geo": 112,
      "data": 67
    },
    "primarySubject": "geo"
  },
  {
    "id": "secret_1_15",
    "name": "裏ボス・全方程式の頂点（中1）",
    "theme": "中1・全単元の発展（極）",
    "chapterId": null,
    "grade": 1,
    "kind": "secretBoss",
    "rarity": "UR",
    "role": "boss",
    "roleTag": "裏ボス・推奨Lv1300",
    "hp": 1646,
    "atk": 942,
    "skill": {
      "id": "gigacalc",
      "name": "超難問の一撃",
      "icon": "🧮"
    },
    "color": "#f43f5e",
    "art": "boss",
    "subjects": {
      "calc": 42,
      "eq": 63,
      "func": 46,
      "geo": 112,
      "data": 67
    },
    "primarySubject": "geo"
  },
  {
    "id": "secret_1_16",
    "name": "裏ボス・数理の終局（中1）",
    "theme": "中1・全単元の発展（極）",
    "chapterId": null,
    "grade": 1,
    "kind": "secretBoss",
    "rarity": "UR",
    "role": "boss",
    "roleTag": "裏ボス・推奨Lv1400",
    "hp": 1658,
    "atk": 974,
    "skill": {
      "id": "gigacalc",
      "name": "超難問の一撃",
      "icon": "🧮"
    },
    "color": "#e879f9",
    "art": "boss",
    "subjects": {
      "calc": 42,
      "eq": 63,
      "func": 46,
      "geo": 112,
      "data": 67
    },
    "primarySubject": "geo"
  },
  {
    "id": "secret_1_17",
    "name": "裏ボス・究極存在アレフ（中1）",
    "theme": "中1・全単元の発展（極）",
    "chapterId": null,
    "grade": 1,
    "kind": "secretBoss",
    "rarity": "UR",
    "role": "boss",
    "roleTag": "裏ボス・推奨Lv1500",
    "hp": 1670,
    "atk": 1000,
    "skill": {
      "id": "gigacalc",
      "name": "超難問の一撃",
      "icon": "🧮"
    },
    "color": "#ffffff",
    "art": "boss",
    "subjects": {
      "calc": 42,
      "eq": 63,
      "func": 46,
      "geo": 112,
      "data": 67
    },
    "primarySubject": "geo"
  },
  {
    "id": "secret_2_0",
    "name": "裏ボス・深淵の番人（中2）",
    "theme": "中2・全単元の発展（極）",
    "chapterId": null,
    "grade": 2,
    "kind": "secretBoss",
    "rarity": "SR",
    "role": "boss",
    "roleTag": "裏ボス・推奨Lv80",
    "hp": 1208,
    "atk": 399,
    "skill": {
      "id": "gigacalc",
      "name": "超難問の一撃",
      "icon": "🧮"
    },
    "color": "#22d3ee",
    "art": "boss",
    "subjects": {
      "calc": 62,
      "eq": 43,
      "func": 35,
      "geo": 58,
      "data": 102
    },
    "primarySubject": "data"
  },
  {
    "id": "secret_2_1",
    "name": "裏ボス・混沌の使者（中2）",
    "theme": "中2・全単元の発展（極）",
    "chapterId": null,
    "grade": 2,
    "kind": "secretBoss",
    "rarity": "SR",
    "role": "boss",
    "roleTag": "裏ボス・推奨Lv100",
    "hp": 1209,
    "atk": 401,
    "skill": {
      "id": "gigacalc",
      "name": "超難問の一撃",
      "icon": "🧮"
    },
    "color": "#a78bfa",
    "art": "boss",
    "subjects": {
      "calc": 62,
      "eq": 43,
      "func": 35,
      "geo": 58,
      "data": 102
    },
    "primarySubject": "data"
  },
  {
    "id": "secret_2_2",
    "name": "裏ボス・虚無の王（中2）",
    "theme": "中2・全単元の発展（極）",
    "chapterId": null,
    "grade": 2,
    "kind": "secretBoss",
    "rarity": "SR",
    "role": "boss",
    "roleTag": "裏ボス・推奨Lv150",
    "hp": 1215,
    "atk": 414,
    "skill": {
      "id": "gigacalc",
      "name": "超難問の一撃",
      "icon": "🧮"
    },
    "color": "#f472b6",
    "art": "boss",
    "subjects": {
      "calc": 62,
      "eq": 43,
      "func": 35,
      "geo": 58,
      "data": 102
    },
    "primarySubject": "data"
  },
  {
    "id": "secret_2_3",
    "name": "裏ボス・破壊神オメガ（中2）",
    "theme": "中2・全単元の発展（極）",
    "chapterId": null,
    "grade": 2,
    "kind": "secretBoss",
    "rarity": "SR",
    "role": "boss",
    "roleTag": "裏ボス・推奨Lv200",
    "hp": 1230,
    "atk": 450,
    "skill": {
      "id": "gigacalc",
      "name": "超難問の一撃",
      "icon": "🧮"
    },
    "color": "#fb923c",
    "art": "boss",
    "subjects": {
      "calc": 62,
      "eq": 43,
      "func": 35,
      "geo": 58,
      "data": 102
    },
    "primarySubject": "data"
  },
  {
    "id": "secret_2_4",
    "name": "裏ボス・時空の支配者（中2）",
    "theme": "中2・全単元の発展（極）",
    "chapterId": null,
    "grade": 2,
    "kind": "secretBoss",
    "rarity": "SR",
    "role": "boss",
    "roleTag": "裏ボス・推奨Lv250",
    "hp": 1265,
    "atk": 535,
    "skill": {
      "id": "gigacalc",
      "name": "超難問の一撃",
      "icon": "🧮"
    },
    "color": "#f43f5e",
    "art": "boss",
    "subjects": {
      "calc": 62,
      "eq": 43,
      "func": 35,
      "geo": 58,
      "data": 102
    },
    "primarySubject": "data"
  },
  {
    "id": "secret_2_5",
    "name": "裏ボス・数学の真神（中2）",
    "theme": "中2・全単元の発展（極）",
    "chapterId": null,
    "grade": 2,
    "kind": "secretBoss",
    "rarity": "SR",
    "role": "boss",
    "roleTag": "裏ボス・推奨Lv300",
    "hp": 1336,
    "atk": 700,
    "skill": {
      "id": "gigacalc",
      "name": "超難問の一撃",
      "icon": "🧮"
    },
    "color": "#fde047",
    "art": "boss",
    "subjects": {
      "calc": 62,
      "eq": 43,
      "func": 35,
      "geo": 58,
      "data": 102
    },
    "primarySubject": "data"
  },
  {
    "id": "secret_2_6",
    "name": "裏ボス・終焉の竜帝（中2）",
    "theme": "中2・全単元の発展（極）",
    "chapterId": null,
    "grade": 2,
    "kind": "secretBoss",
    "rarity": "UR",
    "role": "boss",
    "roleTag": "裏ボス・推奨Lv400",
    "hp": 1511,
    "atk": 560,
    "skill": {
      "id": "gigacalc",
      "name": "超難問の一撃",
      "icon": "🧮"
    },
    "color": "#ef4444",
    "art": "boss",
    "subjects": {
      "calc": 68,
      "eq": 47,
      "func": 39,
      "geo": 64,
      "data": 112
    },
    "primarySubject": "data"
  },
  {
    "id": "secret_2_7",
    "name": "裏ボス・星喰らいの魔王（中2）",
    "theme": "中2・全単元の発展（極）",
    "chapterId": null,
    "grade": 2,
    "kind": "secretBoss",
    "rarity": "UR",
    "role": "boss",
    "roleTag": "裏ボス・推奨Lv500",
    "hp": 1513,
    "atk": 568,
    "skill": {
      "id": "gigacalc",
      "name": "超難問の一撃",
      "icon": "🧮"
    },
    "color": "#8b5cf6",
    "art": "boss",
    "subjects": {
      "calc": 68,
      "eq": 47,
      "func": 39,
      "geo": 64,
      "data": 112
    },
    "primarySubject": "data"
  },
  {
    "id": "secret_2_8",
    "name": "裏ボス・次元の裂け目（中2）",
    "theme": "中2・全単元の発展（極）",
    "chapterId": null,
    "grade": 2,
    "kind": "secretBoss",
    "rarity": "UR",
    "role": "boss",
    "roleTag": "裏ボス・推奨Lv600",
    "hp": 1519,
    "atk": 583,
    "skill": {
      "id": "gigacalc",
      "name": "超難問の一撃",
      "icon": "🧮"
    },
    "color": "#06b6d4",
    "art": "boss",
    "subjects": {
      "calc": 68,
      "eq": 47,
      "func": 39,
      "geo": 64,
      "data": 112
    },
    "primarySubject": "data"
  },
  {
    "id": "secret_2_9",
    "name": "裏ボス・永劫の支配者（中2）",
    "theme": "中2・全単元の発展（極）",
    "chapterId": null,
    "grade": 2,
    "kind": "secretBoss",
    "rarity": "UR",
    "role": "boss",
    "roleTag": "裏ボス・推奨Lv700",
    "hp": 1529,
    "atk": 611,
    "skill": {
      "id": "gigacalc",
      "name": "超難問の一撃",
      "icon": "🧮"
    },
    "color": "#f59e0b",
    "art": "boss",
    "subjects": {
      "calc": 68,
      "eq": 47,
      "func": 39,
      "geo": 64,
      "data": 112
    },
    "primarySubject": "data"
  },
  {
    "id": "secret_2_10",
    "name": "裏ボス・無限の審判者（中2）",
    "theme": "中2・全単元の発展（極）",
    "chapterId": null,
    "grade": 2,
    "kind": "secretBoss",
    "rarity": "UR",
    "role": "boss",
    "roleTag": "裏ボス・推奨Lv800",
    "hp": 1545,
    "atk": 658,
    "skill": {
      "id": "gigacalc",
      "name": "超難問の一撃",
      "icon": "🧮"
    },
    "color": "#ec4899",
    "art": "boss",
    "subjects": {
      "calc": 73,
      "eq": 112,
      "func": 53,
      "geo": 34,
      "data": 58
    },
    "primarySubject": "eq"
  },
  {
    "id": "secret_2_11",
    "name": "裏ボス・創世の破壊者（中2）",
    "theme": "中2・全単元の発展（極）",
    "chapterId": null,
    "grade": 2,
    "kind": "secretBoss",
    "rarity": "UR",
    "role": "boss",
    "roleTag": "裏ボス・推奨Lv900",
    "hp": 1573,
    "atk": 735,
    "skill": {
      "id": "gigacalc",
      "name": "超難問の一撃",
      "icon": "🧮"
    },
    "color": "#10b981",
    "art": "boss",
    "subjects": {
      "calc": 73,
      "eq": 112,
      "func": 53,
      "geo": 34,
      "data": 58
    },
    "primarySubject": "eq"
  },
  {
    "id": "secret_2_12",
    "name": "裏ボス・概念崩壊オメガ（中2）",
    "theme": "中2・全単元の発展（極）",
    "chapterId": null,
    "grade": 2,
    "kind": "secretBoss",
    "rarity": "UR",
    "role": "boss",
    "roleTag": "裏ボス・推奨Lv1000",
    "hp": 1614,
    "atk": 852,
    "skill": {
      "id": "gigacalc",
      "name": "超難問の一撃",
      "icon": "🧮"
    },
    "color": "#fbbf24",
    "art": "boss",
    "subjects": {
      "calc": 73,
      "eq": 112,
      "func": 53,
      "geo": 34,
      "data": 58
    },
    "primarySubject": "eq"
  },
  {
    "id": "secret_2_13",
    "name": "裏ボス・虚数界の覇王（中2）",
    "theme": "中2・全単元の発展（極）",
    "chapterId": null,
    "grade": 2,
    "kind": "secretBoss",
    "rarity": "UR",
    "role": "boss",
    "roleTag": "裏ボス・推奨Lv1100",
    "hp": 1624,
    "atk": 881,
    "skill": {
      "id": "gigacalc",
      "name": "超難問の一撃",
      "icon": "🧮"
    },
    "color": "#a855f7",
    "art": "boss",
    "subjects": {
      "calc": 73,
      "eq": 112,
      "func": 53,
      "geo": 34,
      "data": 58
    },
    "primarySubject": "eq"
  },
  {
    "id": "secret_2_14",
    "name": "裏ボス・絶対零度の神（中2）",
    "theme": "中2・全単元の発展（極）",
    "chapterId": null,
    "grade": 2,
    "kind": "secretBoss",
    "rarity": "UR",
    "role": "boss",
    "roleTag": "裏ボス・推奨Lv1200",
    "hp": 1635,
    "atk": 911,
    "skill": {
      "id": "gigacalc",
      "name": "超難問の一撃",
      "icon": "🧮"
    },
    "color": "#38bdf8",
    "art": "boss",
    "subjects": {
      "calc": 73,
      "eq": 112,
      "func": 53,
      "geo": 34,
      "data": 58
    },
    "primarySubject": "eq"
  },
  {
    "id": "secret_2_15",
    "name": "裏ボス・全方程式の頂点（中2）",
    "theme": "中2・全単元の発展（極）",
    "chapterId": null,
    "grade": 2,
    "kind": "secretBoss",
    "rarity": "UR",
    "role": "boss",
    "roleTag": "裏ボス・推奨Lv1300",
    "hp": 1646,
    "atk": 942,
    "skill": {
      "id": "gigacalc",
      "name": "超難問の一撃",
      "icon": "🧮"
    },
    "color": "#f43f5e",
    "art": "boss",
    "subjects": {
      "calc": 73,
      "eq": 112,
      "func": 53,
      "geo": 34,
      "data": 58
    },
    "primarySubject": "eq"
  },
  {
    "id": "secret_2_16",
    "name": "裏ボス・数理の終局（中2）",
    "theme": "中2・全単元の発展（極）",
    "chapterId": null,
    "grade": 2,
    "kind": "secretBoss",
    "rarity": "UR",
    "role": "boss",
    "roleTag": "裏ボス・推奨Lv1400",
    "hp": 1658,
    "atk": 974,
    "skill": {
      "id": "gigacalc",
      "name": "超難問の一撃",
      "icon": "🧮"
    },
    "color": "#e879f9",
    "art": "boss",
    "subjects": {
      "calc": 73,
      "eq": 112,
      "func": 53,
      "geo": 34,
      "data": 58
    },
    "primarySubject": "eq"
  },
  {
    "id": "secret_2_17",
    "name": "裏ボス・究極存在アレフ（中2）",
    "theme": "中2・全単元の発展（極）",
    "chapterId": null,
    "grade": 2,
    "kind": "secretBoss",
    "rarity": "UR",
    "role": "boss",
    "roleTag": "裏ボス・推奨Lv1500",
    "hp": 1670,
    "atk": 1000,
    "skill": {
      "id": "gigacalc",
      "name": "超難問の一撃",
      "icon": "🧮"
    },
    "color": "#ffffff",
    "art": "boss",
    "subjects": {
      "calc": 73,
      "eq": 112,
      "func": 53,
      "geo": 34,
      "data": 58
    },
    "primarySubject": "eq"
  },
  {
    "id": "secret_3_0",
    "name": "裏ボス・深淵の番人（中3）",
    "theme": "中3・全単元の発展（極）",
    "chapterId": null,
    "grade": 3,
    "kind": "secretBoss",
    "rarity": "SR",
    "role": "boss",
    "roleTag": "裏ボス・推奨Lv80",
    "hp": 1208,
    "atk": 399,
    "skill": {
      "id": "gigacalc",
      "name": "超難問の一撃",
      "icon": "🧮"
    },
    "color": "#22d3ee",
    "art": "boss",
    "subjects": {
      "calc": 102,
      "eq": 62,
      "func": 43,
      "geo": 36,
      "data": 57
    },
    "primarySubject": "calc"
  },
  {
    "id": "secret_3_1",
    "name": "裏ボス・混沌の使者（中3）",
    "theme": "中3・全単元の発展（極）",
    "chapterId": null,
    "grade": 3,
    "kind": "secretBoss",
    "rarity": "SR",
    "role": "boss",
    "roleTag": "裏ボス・推奨Lv100",
    "hp": 1209,
    "atk": 401,
    "skill": {
      "id": "gigacalc",
      "name": "超難問の一撃",
      "icon": "🧮"
    },
    "color": "#a78bfa",
    "art": "boss",
    "subjects": {
      "calc": 102,
      "eq": 62,
      "func": 43,
      "geo": 36,
      "data": 57
    },
    "primarySubject": "calc"
  },
  {
    "id": "secret_3_2",
    "name": "裏ボス・虚無の王（中3）",
    "theme": "中3・全単元の発展（極）",
    "chapterId": null,
    "grade": 3,
    "kind": "secretBoss",
    "rarity": "SR",
    "role": "boss",
    "roleTag": "裏ボス・推奨Lv150",
    "hp": 1215,
    "atk": 414,
    "skill": {
      "id": "gigacalc",
      "name": "超難問の一撃",
      "icon": "🧮"
    },
    "color": "#f472b6",
    "art": "boss",
    "subjects": {
      "calc": 102,
      "eq": 62,
      "func": 43,
      "geo": 36,
      "data": 57
    },
    "primarySubject": "calc"
  },
  {
    "id": "secret_3_3",
    "name": "裏ボス・破壊神オメガ（中3）",
    "theme": "中3・全単元の発展（極）",
    "chapterId": null,
    "grade": 3,
    "kind": "secretBoss",
    "rarity": "SR",
    "role": "boss",
    "roleTag": "裏ボス・推奨Lv200",
    "hp": 1230,
    "atk": 450,
    "skill": {
      "id": "gigacalc",
      "name": "超難問の一撃",
      "icon": "🧮"
    },
    "color": "#fb923c",
    "art": "boss",
    "subjects": {
      "calc": 102,
      "eq": 62,
      "func": 43,
      "geo": 36,
      "data": 57
    },
    "primarySubject": "calc"
  },
  {
    "id": "secret_3_4",
    "name": "裏ボス・時空の支配者（中3）",
    "theme": "中3・全単元の発展（極）",
    "chapterId": null,
    "grade": 3,
    "kind": "secretBoss",
    "rarity": "SR",
    "role": "boss",
    "roleTag": "裏ボス・推奨Lv250",
    "hp": 1265,
    "atk": 535,
    "skill": {
      "id": "gigacalc",
      "name": "超難問の一撃",
      "icon": "🧮"
    },
    "color": "#f43f5e",
    "art": "boss",
    "subjects": {
      "calc": 102,
      "eq": 62,
      "func": 43,
      "geo": 36,
      "data": 57
    },
    "primarySubject": "calc"
  },
  {
    "id": "secret_3_5",
    "name": "裏ボス・数学の真神（中3）",
    "theme": "中3・全単元の発展（極）",
    "chapterId": null,
    "grade": 3,
    "kind": "secretBoss",
    "rarity": "SR",
    "role": "boss",
    "roleTag": "裏ボス・推奨Lv300",
    "hp": 1336,
    "atk": 700,
    "skill": {
      "id": "gigacalc",
      "name": "超難問の一撃",
      "icon": "🧮"
    },
    "color": "#fde047",
    "art": "boss",
    "subjects": {
      "calc": 102,
      "eq": 62,
      "func": 43,
      "geo": 36,
      "data": 57
    },
    "primarySubject": "calc"
  },
  {
    "id": "secret_3_6",
    "name": "裏ボス・終焉の竜帝（中3）",
    "theme": "中3・全単元の発展（極）",
    "chapterId": null,
    "grade": 3,
    "kind": "secretBoss",
    "rarity": "UR",
    "role": "boss",
    "roleTag": "裏ボス・推奨Lv400",
    "hp": 1511,
    "atk": 560,
    "skill": {
      "id": "gigacalc",
      "name": "超難問の一撃",
      "icon": "🧮"
    },
    "color": "#ef4444",
    "art": "boss",
    "subjects": {
      "calc": 112,
      "eq": 67,
      "func": 48,
      "geo": 40,
      "data": 63
    },
    "primarySubject": "calc"
  },
  {
    "id": "secret_3_7",
    "name": "裏ボス・星喰らいの魔王（中3）",
    "theme": "中3・全単元の発展（極）",
    "chapterId": null,
    "grade": 3,
    "kind": "secretBoss",
    "rarity": "UR",
    "role": "boss",
    "roleTag": "裏ボス・推奨Lv500",
    "hp": 1513,
    "atk": 568,
    "skill": {
      "id": "gigacalc",
      "name": "超難問の一撃",
      "icon": "🧮"
    },
    "color": "#8b5cf6",
    "art": "boss",
    "subjects": {
      "calc": 112,
      "eq": 67,
      "func": 48,
      "geo": 40,
      "data": 63
    },
    "primarySubject": "calc"
  },
  {
    "id": "secret_3_8",
    "name": "裏ボス・次元の裂け目（中3）",
    "theme": "中3・全単元の発展（極）",
    "chapterId": null,
    "grade": 3,
    "kind": "secretBoss",
    "rarity": "UR",
    "role": "boss",
    "roleTag": "裏ボス・推奨Lv600",
    "hp": 1519,
    "atk": 583,
    "skill": {
      "id": "gigacalc",
      "name": "超難問の一撃",
      "icon": "🧮"
    },
    "color": "#06b6d4",
    "art": "boss",
    "subjects": {
      "calc": 112,
      "eq": 67,
      "func": 48,
      "geo": 40,
      "data": 63
    },
    "primarySubject": "calc"
  },
  {
    "id": "secret_3_9",
    "name": "裏ボス・永劫の支配者（中3）",
    "theme": "中3・全単元の発展（極）",
    "chapterId": null,
    "grade": 3,
    "kind": "secretBoss",
    "rarity": "UR",
    "role": "boss",
    "roleTag": "裏ボス・推奨Lv700",
    "hp": 1529,
    "atk": 611,
    "skill": {
      "id": "gigacalc",
      "name": "超難問の一撃",
      "icon": "🧮"
    },
    "color": "#f59e0b",
    "art": "boss",
    "subjects": {
      "calc": 112,
      "eq": 67,
      "func": 48,
      "geo": 40,
      "data": 63
    },
    "primarySubject": "calc"
  },
  {
    "id": "secret_3_10",
    "name": "裏ボス・無限の審判者（中3）",
    "theme": "中3・全単元の発展（極）",
    "chapterId": null,
    "grade": 3,
    "kind": "secretBoss",
    "rarity": "UR",
    "role": "boss",
    "roleTag": "裏ボス・推奨Lv800",
    "hp": 1545,
    "atk": 658,
    "skill": {
      "id": "gigacalc",
      "name": "超難問の一撃",
      "icon": "🧮"
    },
    "color": "#ec4899",
    "art": "boss",
    "subjects": {
      "calc": 63,
      "eq": 41,
      "func": 68,
      "geo": 46,
      "data": 112
    },
    "primarySubject": "data"
  },
  {
    "id": "secret_3_11",
    "name": "裏ボス・創世の破壊者（中3）",
    "theme": "中3・全単元の発展（極）",
    "chapterId": null,
    "grade": 3,
    "kind": "secretBoss",
    "rarity": "UR",
    "role": "boss",
    "roleTag": "裏ボス・推奨Lv900",
    "hp": 1573,
    "atk": 735,
    "skill": {
      "id": "gigacalc",
      "name": "超難問の一撃",
      "icon": "🧮"
    },
    "color": "#10b981",
    "art": "boss",
    "subjects": {
      "calc": 63,
      "eq": 41,
      "func": 68,
      "geo": 46,
      "data": 112
    },
    "primarySubject": "data"
  },
  {
    "id": "secret_3_12",
    "name": "裏ボス・概念崩壊オメガ（中3）",
    "theme": "中3・全単元の発展（極）",
    "chapterId": null,
    "grade": 3,
    "kind": "secretBoss",
    "rarity": "UR",
    "role": "boss",
    "roleTag": "裏ボス・推奨Lv1000",
    "hp": 1614,
    "atk": 852,
    "skill": {
      "id": "gigacalc",
      "name": "超難問の一撃",
      "icon": "🧮"
    },
    "color": "#fbbf24",
    "art": "boss",
    "subjects": {
      "calc": 63,
      "eq": 41,
      "func": 68,
      "geo": 46,
      "data": 112
    },
    "primarySubject": "data"
  },
  {
    "id": "secret_3_13",
    "name": "裏ボス・虚数界の覇王（中3）",
    "theme": "中3・全単元の発展（極）",
    "chapterId": null,
    "grade": 3,
    "kind": "secretBoss",
    "rarity": "UR",
    "role": "boss",
    "roleTag": "裏ボス・推奨Lv1100",
    "hp": 1624,
    "atk": 881,
    "skill": {
      "id": "gigacalc",
      "name": "超難問の一撃",
      "icon": "🧮"
    },
    "color": "#a855f7",
    "art": "boss",
    "subjects": {
      "calc": 63,
      "eq": 41,
      "func": 68,
      "geo": 46,
      "data": 112
    },
    "primarySubject": "data"
  },
  {
    "id": "secret_3_14",
    "name": "裏ボス・絶対零度の神（中3）",
    "theme": "中3・全単元の発展（極）",
    "chapterId": null,
    "grade": 3,
    "kind": "secretBoss",
    "rarity": "UR",
    "role": "boss",
    "roleTag": "裏ボス・推奨Lv1200",
    "hp": 1635,
    "atk": 911,
    "skill": {
      "id": "gigacalc",
      "name": "超難問の一撃",
      "icon": "🧮"
    },
    "color": "#38bdf8",
    "art": "boss",
    "subjects": {
      "calc": 63,
      "eq": 41,
      "func": 68,
      "geo": 46,
      "data": 112
    },
    "primarySubject": "data"
  },
  {
    "id": "secret_3_15",
    "name": "裏ボス・全方程式の頂点（中3）",
    "theme": "中3・全単元の発展（極）",
    "chapterId": null,
    "grade": 3,
    "kind": "secretBoss",
    "rarity": "UR",
    "role": "boss",
    "roleTag": "裏ボス・推奨Lv1300",
    "hp": 1646,
    "atk": 942,
    "skill": {
      "id": "gigacalc",
      "name": "超難問の一撃",
      "icon": "🧮"
    },
    "color": "#f43f5e",
    "art": "boss",
    "subjects": {
      "calc": 63,
      "eq": 41,
      "func": 68,
      "geo": 46,
      "data": 112
    },
    "primarySubject": "data"
  },
  {
    "id": "secret_3_16",
    "name": "裏ボス・数理の終局（中3）",
    "theme": "中3・全単元の発展（極）",
    "chapterId": null,
    "grade": 3,
    "kind": "secretBoss",
    "rarity": "UR",
    "role": "boss",
    "roleTag": "裏ボス・推奨Lv1400",
    "hp": 1658,
    "atk": 974,
    "skill": {
      "id": "gigacalc",
      "name": "超難問の一撃",
      "icon": "🧮"
    },
    "color": "#e879f9",
    "art": "boss",
    "subjects": {
      "calc": 63,
      "eq": 41,
      "func": 68,
      "geo": 46,
      "data": 112
    },
    "primarySubject": "data"
  },
  {
    "id": "secret_3_17",
    "name": "裏ボス・究極存在アレフ（中3）",
    "theme": "中3・全単元の発展（極）",
    "chapterId": null,
    "grade": 3,
    "kind": "secretBoss",
    "rarity": "UR",
    "role": "boss",
    "roleTag": "裏ボス・推奨Lv1500",
    "hp": 1670,
    "atk": 1000,
    "skill": {
      "id": "gigacalc",
      "name": "超難問の一撃",
      "icon": "🧮"
    },
    "color": "#ffffff",
    "art": "boss",
    "subjects": {
      "calc": 63,
      "eq": 41,
      "func": 68,
      "geo": 46,
      "data": 112
    },
    "primarySubject": "data"
  },
  {
    "id": "boss_maou_1",
    "name": "数学の魔王（中1）",
    "theme": "中1・全単元の発展",
    "chapterId": null,
    "grade": 1,
    "kind": "finalBoss",
    "rarity": "UR",
    "role": "boss",
    "roleTag": "最終ボス・超必殺",
    "hp": 1590,
    "atk": 784,
    "skill": {
      "id": "crit",
      "name": "会心の一撃",
      "icon": "⭐"
    },
    "color": "#e879f9",
    "art": "boss",
    "subjects": {
      "calc": 53,
      "eq": 44,
      "func": 72,
      "geo": 112,
      "data": 49
    },
    "primarySubject": "geo"
  },
  {
    "id": "boss_maou_2",
    "name": "数学の魔王（中2）",
    "theme": "中2・全単元の発展",
    "chapterId": null,
    "grade": 2,
    "kind": "finalBoss",
    "rarity": "UR",
    "role": "boss",
    "roleTag": "最終ボス・超必殺",
    "hp": 1590,
    "atk": 784,
    "skill": {
      "id": "crit",
      "name": "会心の一撃",
      "icon": "⭐"
    },
    "color": "#e879f9",
    "art": "boss",
    "subjects": {
      "calc": 53,
      "eq": 44,
      "func": 72,
      "geo": 112,
      "data": 49
    },
    "primarySubject": "geo"
  },
  {
    "id": "boss_maou_3",
    "name": "数学の魔王（中3）",
    "theme": "中3・全単元の発展",
    "chapterId": null,
    "grade": 3,
    "kind": "finalBoss",
    "rarity": "UR",
    "role": "boss",
    "roleTag": "最終ボス・超必殺",
    "hp": 1590,
    "atk": 784,
    "skill": {
      "id": "crit",
      "name": "会心の一撃",
      "icon": "⭐"
    },
    "color": "#e879f9",
    "art": "boss",
    "subjects": {
      "calc": 53,
      "eq": 44,
      "func": 72,
      "geo": 112,
      "data": 49
    },
    "primarySubject": "geo"
  },
  {
    "id": "su_g2c1_1",
    "name": "多項式の加法・減法の強敵",
    "theme": "多項式の加法・減法・小単元ボス",
    "chapterId": "g2c1",
    "grade": 2,
    "kind": "unitSmallBoss",
    "rarity": "R",
    "role": "boss",
    "roleTag": "小単元ボス・BP150",
    "hp": 1060,
    "atk": 400,
    "skill": {
      "id": "attack",
      "name": "渾身の一撃",
      "icon": "⚔️"
    },
    "color": "#818cf8",
    "art": "boss",
    "subjects": {
      "calc": 95,
      "eq": 33,
      "func": 56,
      "geo": 37,
      "data": 59
    },
    "primarySubject": "calc"
  },
  {
    "id": "su_g2c1_2",
    "name": "単項式の乗法の強敵",
    "theme": "単項式の乗法・小単元ボス",
    "chapterId": "g2c1",
    "grade": 2,
    "kind": "unitSmallBoss",
    "rarity": "R",
    "role": "boss",
    "roleTag": "小単元ボス・BP150",
    "hp": 1060,
    "atk": 400,
    "skill": {
      "id": "attack",
      "name": "渾身の一撃",
      "icon": "⚔️"
    },
    "color": "#818cf8",
    "art": "boss",
    "subjects": {
      "calc": 95,
      "eq": 33,
      "func": 56,
      "geo": 37,
      "data": 59
    },
    "primarySubject": "calc"
  },
  {
    "id": "su_g2c1_3",
    "name": "累乗を含む単項式の計算の強敵",
    "theme": "累乗を含む単項式の計算・小単元ボス",
    "chapterId": "g2c1",
    "grade": 2,
    "kind": "unitSmallBoss",
    "rarity": "R",
    "role": "boss",
    "roleTag": "小単元ボス・BP150",
    "hp": 1060,
    "atk": 400,
    "skill": {
      "id": "attack",
      "name": "渾身の一撃",
      "icon": "⚔️"
    },
    "color": "#818cf8",
    "art": "boss",
    "subjects": {
      "calc": 95,
      "eq": 33,
      "func": 56,
      "geo": 37,
      "data": 59
    },
    "primarySubject": "calc"
  },
  {
    "id": "su_g2c1_4",
    "name": "単項式の除法の強敵",
    "theme": "単項式の除法・小単元ボス",
    "chapterId": "g2c1",
    "grade": 2,
    "kind": "unitSmallBoss",
    "rarity": "R",
    "role": "boss",
    "roleTag": "小単元ボス・BP150",
    "hp": 1060,
    "atk": 400,
    "skill": {
      "id": "attack",
      "name": "渾身の一撃",
      "icon": "⚔️"
    },
    "color": "#818cf8",
    "art": "boss",
    "subjects": {
      "calc": 95,
      "eq": 33,
      "func": 56,
      "geo": 37,
      "data": 59
    },
    "primarySubject": "calc"
  },
  {
    "id": "su_g2c1_5",
    "name": "乗除の混じった計算の強敵",
    "theme": "乗除の混じった計算・小単元ボス",
    "chapterId": "g2c1",
    "grade": 2,
    "kind": "unitSmallBoss",
    "rarity": "R",
    "role": "boss",
    "roleTag": "小単元ボス・BP150",
    "hp": 1060,
    "atk": 400,
    "skill": {
      "id": "attack",
      "name": "渾身の一撃",
      "icon": "⚔️"
    },
    "color": "#818cf8",
    "art": "boss",
    "subjects": {
      "calc": 95,
      "eq": 33,
      "func": 56,
      "geo": 37,
      "data": 59
    },
    "primarySubject": "calc"
  },
  {
    "id": "su_g2c1_6",
    "name": "等式の変形の強敵",
    "theme": "等式の変形・小単元ボス",
    "chapterId": "g2c1",
    "grade": 2,
    "kind": "unitSmallBoss",
    "rarity": "R",
    "role": "boss",
    "roleTag": "小単元ボス・BP150",
    "hp": 1060,
    "atk": 400,
    "skill": {
      "id": "attack",
      "name": "渾身の一撃",
      "icon": "⚔️"
    },
    "color": "#818cf8",
    "art": "boss",
    "subjects": {
      "calc": 95,
      "eq": 33,
      "func": 56,
      "geo": 37,
      "data": 59
    },
    "primarySubject": "calc"
  },
  {
    "id": "su_g2c2_1",
    "name": "連立方程式の解き方（加減法・代入法）の強敵",
    "theme": "連立方程式の解き方（加減法・代入法）・小単元ボス",
    "chapterId": "g2c2",
    "grade": 2,
    "kind": "unitSmallBoss",
    "rarity": "R",
    "role": "boss",
    "roleTag": "小単元ボス・BP150",
    "hp": 1060,
    "atk": 400,
    "skill": {
      "id": "attack",
      "name": "渾身の一撃",
      "icon": "⚔️"
    },
    "color": "#818cf8",
    "art": "boss",
    "subjects": {
      "calc": 33,
      "eq": 95,
      "func": 56,
      "geo": 36,
      "data": 60
    },
    "primarySubject": "eq"
  },
  {
    "id": "su_g2c2_2",
    "name": "連立方程式（加減法の練習）の強敵",
    "theme": "連立方程式（加減法の練習）・小単元ボス",
    "chapterId": "g2c2",
    "grade": 2,
    "kind": "unitSmallBoss",
    "rarity": "R",
    "role": "boss",
    "roleTag": "小単元ボス・BP150",
    "hp": 1060,
    "atk": 400,
    "skill": {
      "id": "attack",
      "name": "渾身の一撃",
      "icon": "⚔️"
    },
    "color": "#818cf8",
    "art": "boss",
    "subjects": {
      "calc": 33,
      "eq": 95,
      "func": 56,
      "geo": 36,
      "data": 60
    },
    "primarySubject": "eq"
  },
  {
    "id": "su_g2c2_3",
    "name": "連立方程式（代入法・かっこ・分数・小数）の強敵",
    "theme": "連立方程式（代入法・かっこ・分数・小数）・小単元ボス",
    "chapterId": "g2c2",
    "grade": 2,
    "kind": "unitSmallBoss",
    "rarity": "R",
    "role": "boss",
    "roleTag": "小単元ボス・BP150",
    "hp": 1060,
    "atk": 400,
    "skill": {
      "id": "attack",
      "name": "渾身の一撃",
      "icon": "⚔️"
    },
    "color": "#818cf8",
    "art": "boss",
    "subjects": {
      "calc": 33,
      "eq": 95,
      "func": 56,
      "geo": 36,
      "data": 60
    },
    "primarySubject": "eq"
  },
  {
    "id": "su_g2c3_1",
    "name": "変化の割合・増加量の強敵",
    "theme": "変化の割合・増加量・小単元ボス",
    "chapterId": "g2c3",
    "grade": 2,
    "kind": "unitSmallBoss",
    "rarity": "R",
    "role": "boss",
    "roleTag": "小単元ボス・BP150",
    "hp": 1060,
    "atk": 400,
    "skill": {
      "id": "attack",
      "name": "渾身の一撃",
      "icon": "⚔️"
    },
    "color": "#818cf8",
    "art": "boss",
    "subjects": {
      "calc": 33,
      "eq": 56,
      "func": 95,
      "geo": 36,
      "data": 60
    },
    "primarySubject": "func"
  },
  {
    "id": "su_g2c3_2",
    "name": "傾き・切片・式の決定の強敵",
    "theme": "傾き・切片・式の決定・小単元ボス",
    "chapterId": "g2c3",
    "grade": 2,
    "kind": "unitSmallBoss",
    "rarity": "R",
    "role": "boss",
    "roleTag": "小単元ボス・BP150",
    "hp": 1060,
    "atk": 400,
    "skill": {
      "id": "attack",
      "name": "渾身の一撃",
      "icon": "⚔️"
    },
    "color": "#818cf8",
    "art": "boss",
    "subjects": {
      "calc": 33,
      "eq": 56,
      "func": 95,
      "geo": 36,
      "data": 60
    },
    "primarySubject": "func"
  },
  {
    "id": "su_g2c3_3",
    "name": "一次関数のグラフと変域・交点の強敵",
    "theme": "一次関数のグラフと変域・交点・小単元ボス",
    "chapterId": "g2c3",
    "grade": 2,
    "kind": "unitSmallBoss",
    "rarity": "R",
    "role": "boss",
    "roleTag": "小単元ボス・BP150",
    "hp": 1060,
    "atk": 400,
    "skill": {
      "id": "attack",
      "name": "渾身の一撃",
      "icon": "⚔️"
    },
    "color": "#818cf8",
    "art": "boss",
    "subjects": {
      "calc": 33,
      "eq": 56,
      "func": 95,
      "geo": 36,
      "data": 60
    },
    "primarySubject": "func"
  },
  {
    "id": "su_g2c4_1",
    "name": "多角形の内角の和の強敵",
    "theme": "多角形の内角の和・小単元ボス",
    "chapterId": "g2c4",
    "grade": 2,
    "kind": "unitSmallBoss",
    "rarity": "R",
    "role": "boss",
    "roleTag": "小単元ボス・BP150",
    "hp": 1060,
    "atk": 400,
    "skill": {
      "id": "attack",
      "name": "渾身の一撃",
      "icon": "⚔️"
    },
    "color": "#818cf8",
    "art": "boss",
    "subjects": {
      "calc": 33,
      "eq": 56,
      "func": 37,
      "geo": 95,
      "data": 59
    },
    "primarySubject": "geo"
  },
  {
    "id": "su_g2c4_2",
    "name": "正多角形の内角・外角の強敵",
    "theme": "正多角形の内角・外角・小単元ボス",
    "chapterId": "g2c4",
    "grade": 2,
    "kind": "unitSmallBoss",
    "rarity": "R",
    "role": "boss",
    "roleTag": "小単元ボス・BP150",
    "hp": 1060,
    "atk": 400,
    "skill": {
      "id": "attack",
      "name": "渾身の一撃",
      "icon": "⚔️"
    },
    "color": "#818cf8",
    "art": "boss",
    "subjects": {
      "calc": 33,
      "eq": 56,
      "func": 37,
      "geo": 95,
      "data": 59
    },
    "primarySubject": "geo"
  },
  {
    "id": "su_g2c5_1",
    "name": "二等辺三角形・正三角形の強敵",
    "theme": "二等辺三角形・正三角形・小単元ボス",
    "chapterId": "g2c5",
    "grade": 2,
    "kind": "unitSmallBoss",
    "rarity": "R",
    "role": "boss",
    "roleTag": "小単元ボス・BP150",
    "hp": 1060,
    "atk": 400,
    "skill": {
      "id": "attack",
      "name": "渾身の一撃",
      "icon": "⚔️"
    },
    "color": "#818cf8",
    "art": "boss",
    "subjects": {
      "calc": 33,
      "eq": 56,
      "func": 37,
      "geo": 95,
      "data": 59
    },
    "primarySubject": "geo"
  },
  {
    "id": "su_g2c5_2",
    "name": "平行四辺形の性質の強敵",
    "theme": "平行四辺形の性質・小単元ボス",
    "chapterId": "g2c5",
    "grade": 2,
    "kind": "unitSmallBoss",
    "rarity": "R",
    "role": "boss",
    "roleTag": "小単元ボス・BP150",
    "hp": 1060,
    "atk": 400,
    "skill": {
      "id": "attack",
      "name": "渾身の一撃",
      "icon": "⚔️"
    },
    "color": "#818cf8",
    "art": "boss",
    "subjects": {
      "calc": 33,
      "eq": 56,
      "func": 37,
      "geo": 95,
      "data": 59
    },
    "primarySubject": "geo"
  },
  {
    "id": "su_g2c5_3",
    "name": "特別な平行四辺形・面積の強敵",
    "theme": "特別な平行四辺形・面積・小単元ボス",
    "chapterId": "g2c5",
    "grade": 2,
    "kind": "unitSmallBoss",
    "rarity": "R",
    "role": "boss",
    "roleTag": "小単元ボス・BP150",
    "hp": 1060,
    "atk": 400,
    "skill": {
      "id": "attack",
      "name": "渾身の一撃",
      "icon": "⚔️"
    },
    "color": "#818cf8",
    "art": "boss",
    "subjects": {
      "calc": 33,
      "eq": 56,
      "func": 37,
      "geo": 95,
      "data": 59
    },
    "primarySubject": "geo"
  },
  {
    "id": "su_g2c6_1",
    "name": "場合の数（順列・組み合わせ）の強敵",
    "theme": "場合の数（順列・組み合わせ）・小単元ボス",
    "chapterId": "g2c6",
    "grade": 2,
    "kind": "unitSmallBoss",
    "rarity": "R",
    "role": "boss",
    "roleTag": "小単元ボス・BP150",
    "hp": 1060,
    "atk": 400,
    "skill": {
      "id": "attack",
      "name": "渾身の一撃",
      "icon": "⚔️"
    },
    "color": "#818cf8",
    "art": "boss",
    "subjects": {
      "calc": 62,
      "eq": 46,
      "func": 29,
      "geo": 48,
      "data": 95
    },
    "primarySubject": "data"
  },
  {
    "id": "su_g2c6_2",
    "name": "確率の基本（さいころ・硬貨）の強敵",
    "theme": "確率の基本（さいころ・硬貨）・小単元ボス",
    "chapterId": "g2c6",
    "grade": 2,
    "kind": "unitSmallBoss",
    "rarity": "R",
    "role": "boss",
    "roleTag": "小単元ボス・BP150",
    "hp": 1060,
    "atk": 400,
    "skill": {
      "id": "attack",
      "name": "渾身の一撃",
      "icon": "⚔️"
    },
    "color": "#818cf8",
    "art": "boss",
    "subjects": {
      "calc": 62,
      "eq": 46,
      "func": 29,
      "geo": 48,
      "data": 95
    },
    "primarySubject": "data"
  },
  {
    "id": "su_g2c6_3",
    "name": "確率の応用（玉・2つのさいころ）の強敵",
    "theme": "確率の応用（玉・2つのさいころ）・小単元ボス",
    "chapterId": "g2c6",
    "grade": 2,
    "kind": "unitSmallBoss",
    "rarity": "R",
    "role": "boss",
    "roleTag": "小単元ボス・BP150",
    "hp": 1060,
    "atk": 400,
    "skill": {
      "id": "attack",
      "name": "渾身の一撃",
      "icon": "⚔️"
    },
    "color": "#818cf8",
    "art": "boss",
    "subjects": {
      "calc": 62,
      "eq": 46,
      "func": 29,
      "geo": 48,
      "data": 95
    },
    "primarySubject": "data"
  },
  {
    "id": "su_g3c1_1",
    "name": "単項式×多項式（展開）の強敵",
    "theme": "単項式×多項式（展開）・小単元ボス",
    "chapterId": "g3c1",
    "grade": 3,
    "kind": "unitSmallBoss",
    "rarity": "R",
    "role": "boss",
    "roleTag": "小単元ボス・BP150",
    "hp": 1060,
    "atk": 400,
    "skill": {
      "id": "attack",
      "name": "渾身の一撃",
      "icon": "⚔️"
    },
    "color": "#818cf8",
    "art": "boss",
    "subjects": {
      "calc": 95,
      "eq": 33,
      "func": 56,
      "geo": 37,
      "data": 59
    },
    "primarySubject": "calc"
  },
  {
    "id": "su_g3c1_2",
    "name": "多項式÷単項式（除法）の強敵",
    "theme": "多項式÷単項式（除法）・小単元ボス",
    "chapterId": "g3c1",
    "grade": 3,
    "kind": "unitSmallBoss",
    "rarity": "R",
    "role": "boss",
    "roleTag": "小単元ボス・BP150",
    "hp": 1060,
    "atk": 400,
    "skill": {
      "id": "attack",
      "name": "渾身の一撃",
      "icon": "⚔️"
    },
    "color": "#818cf8",
    "art": "boss",
    "subjects": {
      "calc": 95,
      "eq": 33,
      "func": 56,
      "geo": 37,
      "data": 59
    },
    "primarySubject": "calc"
  },
  {
    "id": "su_g3c1_3",
    "name": "乗法公式 (x+a)(x+b)の強敵",
    "theme": "乗法公式 (x+a)(x+b)・小単元ボス",
    "chapterId": "g3c1",
    "grade": 3,
    "kind": "unitSmallBoss",
    "rarity": "R",
    "role": "boss",
    "roleTag": "小単元ボス・BP150",
    "hp": 1060,
    "atk": 400,
    "skill": {
      "id": "attack",
      "name": "渾身の一撃",
      "icon": "⚔️"
    },
    "color": "#818cf8",
    "art": "boss",
    "subjects": {
      "calc": 95,
      "eq": 33,
      "func": 56,
      "geo": 37,
      "data": 59
    },
    "primarySubject": "calc"
  },
  {
    "id": "su_g3c1_4",
    "name": "平方・和と差の公式の強敵",
    "theme": "平方・和と差の公式・小単元ボス",
    "chapterId": "g3c1",
    "grade": 3,
    "kind": "unitSmallBoss",
    "rarity": "R",
    "role": "boss",
    "roleTag": "小単元ボス・BP150",
    "hp": 1060,
    "atk": 400,
    "skill": {
      "id": "attack",
      "name": "渾身の一撃",
      "icon": "⚔️"
    },
    "color": "#818cf8",
    "art": "boss",
    "subjects": {
      "calc": 95,
      "eq": 33,
      "func": 56,
      "geo": 37,
      "data": 59
    },
    "primarySubject": "calc"
  },
  {
    "id": "su_g3c1_5",
    "name": "共通因数でくくるの強敵",
    "theme": "共通因数でくくる・小単元ボス",
    "chapterId": "g3c1",
    "grade": 3,
    "kind": "unitSmallBoss",
    "rarity": "R",
    "role": "boss",
    "roleTag": "小単元ボス・BP150",
    "hp": 1060,
    "atk": 400,
    "skill": {
      "id": "attack",
      "name": "渾身の一撃",
      "icon": "⚔️"
    },
    "color": "#818cf8",
    "art": "boss",
    "subjects": {
      "calc": 95,
      "eq": 33,
      "func": 56,
      "geo": 37,
      "data": 59
    },
    "primarySubject": "calc"
  },
  {
    "id": "su_g3c1_6",
    "name": "因数分解 x²+(a+b)x+abの強敵",
    "theme": "因数分解 x²+(a+b)x+ab・小単元ボス",
    "chapterId": "g3c1",
    "grade": 3,
    "kind": "unitSmallBoss",
    "rarity": "R",
    "role": "boss",
    "roleTag": "小単元ボス・BP150",
    "hp": 1060,
    "atk": 400,
    "skill": {
      "id": "attack",
      "name": "渾身の一撃",
      "icon": "⚔️"
    },
    "color": "#818cf8",
    "art": "boss",
    "subjects": {
      "calc": 95,
      "eq": 33,
      "func": 56,
      "geo": 37,
      "data": 59
    },
    "primarySubject": "calc"
  },
  {
    "id": "su_g3c1_7",
    "name": "平方・差の因数分解の強敵",
    "theme": "平方・差の因数分解・小単元ボス",
    "chapterId": "g3c1",
    "grade": 3,
    "kind": "unitSmallBoss",
    "rarity": "R",
    "role": "boss",
    "roleTag": "小単元ボス・BP150",
    "hp": 1060,
    "atk": 400,
    "skill": {
      "id": "attack",
      "name": "渾身の一撃",
      "icon": "⚔️"
    },
    "color": "#818cf8",
    "art": "boss",
    "subjects": {
      "calc": 95,
      "eq": 33,
      "func": 56,
      "geo": 37,
      "data": 59
    },
    "primarySubject": "calc"
  },
  {
    "id": "su_g3c1_8",
    "name": "式の計算の利用の強敵",
    "theme": "式の計算の利用・小単元ボス",
    "chapterId": "g3c1",
    "grade": 3,
    "kind": "unitSmallBoss",
    "rarity": "R",
    "role": "boss",
    "roleTag": "小単元ボス・BP150",
    "hp": 1060,
    "atk": 400,
    "skill": {
      "id": "attack",
      "name": "渾身の一撃",
      "icon": "⚔️"
    },
    "color": "#818cf8",
    "art": "boss",
    "subjects": {
      "calc": 95,
      "eq": 33,
      "func": 56,
      "geo": 37,
      "data": 59
    },
    "primarySubject": "calc"
  },
  {
    "id": "su_g3c2_1",
    "name": "平方根を求める・根号をはずすの強敵",
    "theme": "平方根を求める・根号をはずす・小単元ボス",
    "chapterId": "g3c2",
    "grade": 3,
    "kind": "unitSmallBoss",
    "rarity": "R",
    "role": "boss",
    "roleTag": "小単元ボス・BP150",
    "hp": 1060,
    "atk": 400,
    "skill": {
      "id": "attack",
      "name": "渾身の一撃",
      "icon": "⚔️"
    },
    "color": "#818cf8",
    "art": "boss",
    "subjects": {
      "calc": 95,
      "eq": 33,
      "func": 56,
      "geo": 37,
      "data": 59
    },
    "primarySubject": "calc"
  },
  {
    "id": "su_g3c2_2",
    "name": "根号の変形（a√b ⇄ √a）・大小比較の強敵",
    "theme": "根号の変形（a√b ⇄ √a）・大小比較・小単元ボス",
    "chapterId": "g3c2",
    "grade": 3,
    "kind": "unitSmallBoss",
    "rarity": "R",
    "role": "boss",
    "roleTag": "小単元ボス・BP150",
    "hp": 1060,
    "atk": 400,
    "skill": {
      "id": "attack",
      "name": "渾身の一撃",
      "icon": "⚔️"
    },
    "color": "#818cf8",
    "art": "boss",
    "subjects": {
      "calc": 95,
      "eq": 33,
      "func": 56,
      "geo": 37,
      "data": 59
    },
    "primarySubject": "calc"
  },
  {
    "id": "su_g3c2_3",
    "name": "根号の乗法・除法の強敵",
    "theme": "根号の乗法・除法・小単元ボス",
    "chapterId": "g3c2",
    "grade": 3,
    "kind": "unitSmallBoss",
    "rarity": "R",
    "role": "boss",
    "roleTag": "小単元ボス・BP150",
    "hp": 1060,
    "atk": 400,
    "skill": {
      "id": "attack",
      "name": "渾身の一撃",
      "icon": "⚔️"
    },
    "color": "#818cf8",
    "art": "boss",
    "subjects": {
      "calc": 95,
      "eq": 33,
      "func": 56,
      "geo": 37,
      "data": 59
    },
    "primarySubject": "calc"
  },
  {
    "id": "su_g3c2_4",
    "name": "根号の加法・減法の強敵",
    "theme": "根号の加法・減法・小単元ボス",
    "chapterId": "g3c2",
    "grade": 3,
    "kind": "unitSmallBoss",
    "rarity": "R",
    "role": "boss",
    "roleTag": "小単元ボス・BP150",
    "hp": 1060,
    "atk": 400,
    "skill": {
      "id": "attack",
      "name": "渾身の一撃",
      "icon": "⚔️"
    },
    "color": "#818cf8",
    "art": "boss",
    "subjects": {
      "calc": 95,
      "eq": 33,
      "func": 56,
      "geo": 37,
      "data": 59
    },
    "primarySubject": "calc"
  },
  {
    "id": "su_g3c2_5",
    "name": "分配法則・展開と値の計算の強敵",
    "theme": "分配法則・展開と値の計算・小単元ボス",
    "chapterId": "g3c2",
    "grade": 3,
    "kind": "unitSmallBoss",
    "rarity": "R",
    "role": "boss",
    "roleTag": "小単元ボス・BP150",
    "hp": 1060,
    "atk": 400,
    "skill": {
      "id": "attack",
      "name": "渾身の一撃",
      "icon": "⚔️"
    },
    "color": "#818cf8",
    "art": "boss",
    "subjects": {
      "calc": 95,
      "eq": 33,
      "func": 56,
      "geo": 37,
      "data": 59
    },
    "primarySubject": "calc"
  },
  {
    "id": "su_g3c3_1",
    "name": "平方根の考えで解く2次方程式の強敵",
    "theme": "平方根の考えで解く2次方程式・小単元ボス",
    "chapterId": "g3c3",
    "grade": 3,
    "kind": "unitSmallBoss",
    "rarity": "R",
    "role": "boss",
    "roleTag": "小単元ボス・BP150",
    "hp": 1060,
    "atk": 400,
    "skill": {
      "id": "attack",
      "name": "渾身の一撃",
      "icon": "⚔️"
    },
    "color": "#818cf8",
    "art": "boss",
    "subjects": {
      "calc": 33,
      "eq": 95,
      "func": 56,
      "geo": 36,
      "data": 60
    },
    "primarySubject": "eq"
  },
  {
    "id": "su_g3c3_2",
    "name": "(x+a)²=b の形で解く2次方程式の強敵",
    "theme": "(x+a)²=b の形で解く2次方程式・小単元ボス",
    "chapterId": "g3c3",
    "grade": 3,
    "kind": "unitSmallBoss",
    "rarity": "R",
    "role": "boss",
    "roleTag": "小単元ボス・BP150",
    "hp": 1060,
    "atk": 400,
    "skill": {
      "id": "attack",
      "name": "渾身の一撃",
      "icon": "⚔️"
    },
    "color": "#818cf8",
    "art": "boss",
    "subjects": {
      "calc": 33,
      "eq": 95,
      "func": 56,
      "geo": 36,
      "data": 60
    },
    "primarySubject": "eq"
  },
  {
    "id": "su_g3c3_3",
    "name": "解の公式で解く2次方程式の強敵",
    "theme": "解の公式で解く2次方程式・小単元ボス",
    "chapterId": "g3c3",
    "grade": 3,
    "kind": "unitSmallBoss",
    "rarity": "R",
    "role": "boss",
    "roleTag": "小単元ボス・BP150",
    "hp": 1060,
    "atk": 400,
    "skill": {
      "id": "attack",
      "name": "渾身の一撃",
      "icon": "⚔️"
    },
    "color": "#818cf8",
    "art": "boss",
    "subjects": {
      "calc": 33,
      "eq": 95,
      "func": 56,
      "geo": 36,
      "data": 60
    },
    "primarySubject": "eq"
  },
  {
    "id": "su_g3c3_4",
    "name": "因数分解で解く2次方程式の強敵",
    "theme": "因数分解で解く2次方程式・小単元ボス",
    "chapterId": "g3c3",
    "grade": 3,
    "kind": "unitSmallBoss",
    "rarity": "R",
    "role": "boss",
    "roleTag": "小単元ボス・BP150",
    "hp": 1060,
    "atk": 400,
    "skill": {
      "id": "attack",
      "name": "渾身の一撃",
      "icon": "⚔️"
    },
    "color": "#818cf8",
    "art": "boss",
    "subjects": {
      "calc": 33,
      "eq": 95,
      "func": 56,
      "geo": 36,
      "data": 60
    },
    "primarySubject": "eq"
  },
  {
    "id": "su_g3c3_5",
    "name": "いろいろな2次方程式の強敵",
    "theme": "いろいろな2次方程式・小単元ボス",
    "chapterId": "g3c3",
    "grade": 3,
    "kind": "unitSmallBoss",
    "rarity": "R",
    "role": "boss",
    "roleTag": "小単元ボス・BP150",
    "hp": 1060,
    "atk": 400,
    "skill": {
      "id": "attack",
      "name": "渾身の一撃",
      "icon": "⚔️"
    },
    "color": "#818cf8",
    "art": "boss",
    "subjects": {
      "calc": 33,
      "eq": 95,
      "func": 56,
      "geo": 36,
      "data": 60
    },
    "primarySubject": "eq"
  },
  {
    "id": "su_g3c4_1",
    "name": "y=ax²の式を求めるの強敵",
    "theme": "y=ax²の式を求める・小単元ボス",
    "chapterId": "g3c4",
    "grade": 3,
    "kind": "unitSmallBoss",
    "rarity": "R",
    "role": "boss",
    "roleTag": "小単元ボス・BP150",
    "hp": 1060,
    "atk": 400,
    "skill": {
      "id": "attack",
      "name": "渾身の一撃",
      "icon": "⚔️"
    },
    "color": "#818cf8",
    "art": "boss",
    "subjects": {
      "calc": 33,
      "eq": 56,
      "func": 95,
      "geo": 36,
      "data": 60
    },
    "primarySubject": "func"
  },
  {
    "id": "su_g3c4_2",
    "name": "y=ax²の変域の強敵",
    "theme": "y=ax²の変域・小単元ボス",
    "chapterId": "g3c4",
    "grade": 3,
    "kind": "unitSmallBoss",
    "rarity": "R",
    "role": "boss",
    "roleTag": "小単元ボス・BP150",
    "hp": 1060,
    "atk": 400,
    "skill": {
      "id": "attack",
      "name": "渾身の一撃",
      "icon": "⚔️"
    },
    "color": "#818cf8",
    "art": "boss",
    "subjects": {
      "calc": 33,
      "eq": 56,
      "func": 95,
      "geo": 36,
      "data": 60
    },
    "primarySubject": "func"
  },
  {
    "id": "su_g3c4_3",
    "name": "変化の割合の強敵",
    "theme": "変化の割合・小単元ボス",
    "chapterId": "g3c4",
    "grade": 3,
    "kind": "unitSmallBoss",
    "rarity": "R",
    "role": "boss",
    "roleTag": "小単元ボス・BP150",
    "hp": 1060,
    "atk": 400,
    "skill": {
      "id": "attack",
      "name": "渾身の一撃",
      "icon": "⚔️"
    },
    "color": "#818cf8",
    "art": "boss",
    "subjects": {
      "calc": 33,
      "eq": 56,
      "func": 95,
      "geo": 36,
      "data": 60
    },
    "primarySubject": "func"
  },
  {
    "id": "su_g3c4_4",
    "name": "y=ax²の利用（文章題）の強敵",
    "theme": "y=ax²の利用（文章題）・小単元ボス",
    "chapterId": "g3c4",
    "grade": 3,
    "kind": "unitSmallBoss",
    "rarity": "R",
    "role": "boss",
    "roleTag": "小単元ボス・BP150",
    "hp": 1060,
    "atk": 400,
    "skill": {
      "id": "attack",
      "name": "渾身の一撃",
      "icon": "⚔️"
    },
    "color": "#818cf8",
    "art": "boss",
    "subjects": {
      "calc": 33,
      "eq": 56,
      "func": 95,
      "geo": 36,
      "data": 60
    },
    "primarySubject": "func"
  },
  {
    "id": "su_g3c5_1",
    "name": "比例式とxの値の強敵",
    "theme": "比例式とxの値・小単元ボス",
    "chapterId": "g3c5",
    "grade": 3,
    "kind": "unitSmallBoss",
    "rarity": "R",
    "role": "boss",
    "roleTag": "小単元ボス・BP150",
    "hp": 1060,
    "atk": 400,
    "skill": {
      "id": "attack",
      "name": "渾身の一撃",
      "icon": "⚔️"
    },
    "color": "#818cf8",
    "art": "boss",
    "subjects": {
      "calc": 33,
      "eq": 56,
      "func": 37,
      "geo": 95,
      "data": 59
    },
    "primarySubject": "geo"
  },
  {
    "id": "su_g3c5_2",
    "name": "相似な図形の面積比・体積比の強敵",
    "theme": "相似な図形の面積比・体積比・小単元ボス",
    "chapterId": "g3c5",
    "grade": 3,
    "kind": "unitSmallBoss",
    "rarity": "R",
    "role": "boss",
    "roleTag": "小単元ボス・BP150",
    "hp": 1060,
    "atk": 400,
    "skill": {
      "id": "attack",
      "name": "渾身の一撃",
      "icon": "⚔️"
    },
    "color": "#818cf8",
    "art": "boss",
    "subjects": {
      "calc": 33,
      "eq": 56,
      "func": 37,
      "geo": 95,
      "data": 59
    },
    "primarySubject": "geo"
  },
  {
    "id": "su_g3c5_3",
    "name": "相似の利用（影と測定）の強敵",
    "theme": "相似の利用（影と測定）・小単元ボス",
    "chapterId": "g3c5",
    "grade": 3,
    "kind": "unitSmallBoss",
    "rarity": "R",
    "role": "boss",
    "roleTag": "小単元ボス・BP150",
    "hp": 1060,
    "atk": 400,
    "skill": {
      "id": "attack",
      "name": "渾身の一撃",
      "icon": "⚔️"
    },
    "color": "#818cf8",
    "art": "boss",
    "subjects": {
      "calc": 33,
      "eq": 56,
      "func": 37,
      "geo": 95,
      "data": 59
    },
    "primarySubject": "geo"
  },
  {
    "id": "su_g3c6_1",
    "name": "円周角と中心角の強敵",
    "theme": "円周角と中心角・小単元ボス",
    "chapterId": "g3c6",
    "grade": 3,
    "kind": "unitSmallBoss",
    "rarity": "R",
    "role": "boss",
    "roleTag": "小単元ボス・BP150",
    "hp": 1060,
    "atk": 400,
    "skill": {
      "id": "attack",
      "name": "渾身の一撃",
      "icon": "⚔️"
    },
    "color": "#818cf8",
    "art": "boss",
    "subjects": {
      "calc": 33,
      "eq": 56,
      "func": 37,
      "geo": 95,
      "data": 59
    },
    "primarySubject": "geo"
  },
  {
    "id": "su_g3c6_2",
    "name": "円に内接する四角形の強敵",
    "theme": "円に内接する四角形・小単元ボス",
    "chapterId": "g3c6",
    "grade": 3,
    "kind": "unitSmallBoss",
    "rarity": "R",
    "role": "boss",
    "roleTag": "小単元ボス・BP150",
    "hp": 1060,
    "atk": 400,
    "skill": {
      "id": "attack",
      "name": "渾身の一撃",
      "icon": "⚔️"
    },
    "color": "#818cf8",
    "art": "boss",
    "subjects": {
      "calc": 33,
      "eq": 56,
      "func": 37,
      "geo": 95,
      "data": 59
    },
    "primarySubject": "geo"
  },
  {
    "id": "su_g3c6_3",
    "name": "接線と円周角の強敵",
    "theme": "接線と円周角・小単元ボス",
    "chapterId": "g3c6",
    "grade": 3,
    "kind": "unitSmallBoss",
    "rarity": "R",
    "role": "boss",
    "roleTag": "小単元ボス・BP150",
    "hp": 1060,
    "atk": 400,
    "skill": {
      "id": "attack",
      "name": "渾身の一撃",
      "icon": "⚔️"
    },
    "color": "#818cf8",
    "art": "boss",
    "subjects": {
      "calc": 33,
      "eq": 56,
      "func": 37,
      "geo": 95,
      "data": 59
    },
    "primarySubject": "geo"
  },
  {
    "id": "su_g3c7_1",
    "name": "三平方の定理（辺の長さを求める）の強敵",
    "theme": "三平方の定理（辺の長さを求める）・小単元ボス",
    "chapterId": "g3c7",
    "grade": 3,
    "kind": "unitSmallBoss",
    "rarity": "R",
    "role": "boss",
    "roleTag": "小単元ボス・BP150",
    "hp": 1060,
    "atk": 400,
    "skill": {
      "id": "attack",
      "name": "渾身の一撃",
      "icon": "⚔️"
    },
    "color": "#818cf8",
    "art": "boss",
    "subjects": {
      "calc": 33,
      "eq": 56,
      "func": 37,
      "geo": 95,
      "data": 59
    },
    "primarySubject": "geo"
  },
  {
    "id": "su_g3c7_2",
    "name": "三平方の定理（特別な直角三角形）の強敵",
    "theme": "三平方の定理（特別な直角三角形）・小単元ボス",
    "chapterId": "g3c7",
    "grade": 3,
    "kind": "unitSmallBoss",
    "rarity": "R",
    "role": "boss",
    "roleTag": "小単元ボス・BP150",
    "hp": 1060,
    "atk": 400,
    "skill": {
      "id": "attack",
      "name": "渾身の一撃",
      "icon": "⚔️"
    },
    "color": "#818cf8",
    "art": "boss",
    "subjects": {
      "calc": 33,
      "eq": 56,
      "func": 37,
      "geo": 95,
      "data": 59
    },
    "primarySubject": "geo"
  },
  {
    "id": "su_g3c7_3",
    "name": "三平方の定理（平面図形への利用）の強敵",
    "theme": "三平方の定理（平面図形への利用）・小単元ボス",
    "chapterId": "g3c7",
    "grade": 3,
    "kind": "unitSmallBoss",
    "rarity": "R",
    "role": "boss",
    "roleTag": "小単元ボス・BP150",
    "hp": 1060,
    "atk": 400,
    "skill": {
      "id": "attack",
      "name": "渾身の一撃",
      "icon": "⚔️"
    },
    "color": "#818cf8",
    "art": "boss",
    "subjects": {
      "calc": 33,
      "eq": 56,
      "func": 37,
      "geo": 95,
      "data": 59
    },
    "primarySubject": "geo"
  },
  {
    "id": "su_g3c7_4",
    "name": "三平方の定理（座標・空間図形）の強敵",
    "theme": "三平方の定理（座標・空間図形）・小単元ボス",
    "chapterId": "g3c7",
    "grade": 3,
    "kind": "unitSmallBoss",
    "rarity": "R",
    "role": "boss",
    "roleTag": "小単元ボス・BP150",
    "hp": 1060,
    "atk": 400,
    "skill": {
      "id": "attack",
      "name": "渾身の一撃",
      "icon": "⚔️"
    },
    "color": "#818cf8",
    "art": "boss",
    "subjects": {
      "calc": 33,
      "eq": 56,
      "func": 37,
      "geo": 95,
      "data": 59
    },
    "primarySubject": "geo"
  },
  {
    "id": "su_g3c8_1",
    "name": "標本調査の用語の強敵",
    "theme": "標本調査の用語・小単元ボス",
    "chapterId": "g3c8",
    "grade": 3,
    "kind": "unitSmallBoss",
    "rarity": "R",
    "role": "boss",
    "roleTag": "小単元ボス・BP150",
    "hp": 1060,
    "atk": 400,
    "skill": {
      "id": "attack",
      "name": "渾身の一撃",
      "icon": "⚔️"
    },
    "color": "#818cf8",
    "art": "boss",
    "subjects": {
      "calc": 62,
      "eq": 46,
      "func": 29,
      "geo": 48,
      "data": 95
    },
    "primarySubject": "data"
  },
  {
    "id": "su_g3c8_2",
    "name": "全数調査と標本調査の判断の強敵",
    "theme": "全数調査と標本調査の判断・小単元ボス",
    "chapterId": "g3c8",
    "grade": 3,
    "kind": "unitSmallBoss",
    "rarity": "R",
    "role": "boss",
    "roleTag": "小単元ボス・BP150",
    "hp": 1060,
    "atk": 400,
    "skill": {
      "id": "attack",
      "name": "渾身の一撃",
      "icon": "⚔️"
    },
    "color": "#818cf8",
    "art": "boss",
    "subjects": {
      "calc": 62,
      "eq": 46,
      "func": 29,
      "geo": 48,
      "data": 95
    },
    "primarySubject": "data"
  },
  {
    "id": "su_g3c8_3",
    "name": "標本調査による推定の強敵",
    "theme": "標本調査による推定・小単元ボス",
    "chapterId": "g3c8",
    "grade": 3,
    "kind": "unitSmallBoss",
    "rarity": "R",
    "role": "boss",
    "roleTag": "小単元ボス・BP150",
    "hp": 1060,
    "atk": 400,
    "skill": {
      "id": "attack",
      "name": "渾身の一撃",
      "icon": "⚔️"
    },
    "color": "#818cf8",
    "art": "boss",
    "subjects": {
      "calc": 62,
      "eq": 46,
      "func": 29,
      "geo": 48,
      "data": 95
    },
    "primarySubject": "data"
  }
];
