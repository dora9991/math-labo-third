# 対話型数学授業（math-labo10）

黒板を見ながら **AI先生と発問でやり取りしながら学ぶ** 数学授業アプリ。
[math-dialogue](https://github.com/dora9991/math-dialogue) から派生した版（これ以降の編集はこちらで行う）。

## このプロジェクトの主役：AIと対話する授業

- **黒板（書いて残る）と先生（声で問いかける・消える）を分離**したレイアウト
- 先生の発問に **音声入力／文字入力** で答えると、板書が少しずつ育っていく
- 発問モデル：**核心は言わない → 詰まったら補助発問（スモールステップ）→ 最後は説明**
- データ：`src/data/dialogue/questionBank.json`（発問バンク・中1全7章122授業）＋ `figures/`
- 対話エンジン：`src/data/dialogue/teacher.js`（いまは台本ベース。将来 Claude API に差し替え可能な疎結合）
- 画面：`src/screens/DialogueLesson.jsx`

> 看板レッスン：**文字と式「マッチ棒」(c2-1)** がフル台本化済み。
> 他の授業は「発問のみ」表示（台本を追加すると「対話✨」になる）。

---

以下は土台となっている数学ラボ本体の説明。

中学数学のゲーム学習アプリ。生徒が問題を解いて XP・星・レベルを集める。
将来はサーバー（Supabase）で学習データを保存し、教員ダッシュボードで分析・指示できるようにする。

## 設計思想（ここが大事）

「ゲームエンジンを作り直しても、データ（問題と記録の形）は生き残る」ように分離している。

```
src/
├── App.jsx          … 画面のつなぎ役（薄い）
├── engine/          … ★ゲームの核（ルール・計算）
│   ├── rng.js         乱数
│   ├── generator.js   問題生成・4択生成
│   ├── scoring.js     XP・星・レベルのルール
│   └── progress.js    アンロック・星の判定
├── data/            … ★問題データベース（章ごとに1ファイル）
│   ├── grade1/c1_seisu.js   正の数と負の数（サンプル）
│   ├── monsters.js          バトル用モンスター
│   └── index.js             全章を束ねる窓口
├── store/           … ★保存層（ローカル↔サーバーの差し替え口）
│   ├── recordSchema.js  記録するデータの「形」の定義（最重要）
│   ├── localStore.js    今の保存先（ブラウザ内）
│   └── supabase.js      将来の保存先（サーバー・準備中）
├── screens/         … 画面（モードごと）
│   ├── Home / ChapterSelect / TimeAttack / Notebook / ComingSoon
├── components/      … 共通部品（Header / Stars / TimerRing / CharBubble）
└── styles/theme.css … 見た目
```

- **問題を増やす** → `data/` に章ファイルを足し、`data/index.js` に1行追加するだけ。
- **保存をサーバーにする** → `store/supabase.js` を実装し、`App.jsx` の import を1行差し替えるだけ。ゲーム本体は触らない。

## 動かし方

事前に Node.js（LTS版）が必要。

```bash
cd math-game
npm install      # 初回だけ。必要な部品をダウンロード
npm run dev      # 開発サーバー起動。表示されたURLをブラウザで開く
```

`npm run build` で公開用ファイルを書き出し、`npm run preview` で確認できる。

## いま動くもの / これから

- ✅ タイムアタック（40秒・4択）… 完成・遊べる
- ✅ 間違いノート … 完成（タイムアタックの間違いが自動で貯まる）
- 🚧 じっくり / バトル / 単元テスト … 「準備中」画面。次のステップで実装
- 🚧 サーバー保存・ログイン … `store/supabase.js` を実装する段階（P3）
- 🚧 教員ダッシュボード … サーバー化のあと（P4）

## ロードマップ

| 段階 | 内容 |
|---|---|
| P0 | 環境構築（Node / VS Code / Git / GitHub） |
| P1 | この雛形を完成形まで肉付け（全モード・全章） |
| P2 | GitHub公開 + Vercelデプロイ（URLで配布） |
| P3 | Supabase導入（ログイン＋データをサーバー保存） |
| P4 | 教員ダッシュボード（集計・弱点分析・課題指示） |
