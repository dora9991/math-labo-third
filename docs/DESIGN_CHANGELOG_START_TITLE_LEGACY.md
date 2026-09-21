# 起動画面・タイトル演出・旧デザイン統一 変更記録

実施日: 2026-09-21

## 実装内容

- `StartScreen.jsx` を、音声再生を解禁する最初のタップという役割を変えずに刷新した。暗い星空、控えめな魔法陣、ASTRA ACADEMY の紋章、金縁の切り欠き形 `START` ボタン、英字と日本語の音声開始案内で構成している。
- `TitleScreen.jsx` に導入状態を追加した。通常速度では全面の白が約 1.08 秒かけて穏やかに引き、魔法陣、金属質の `MATH LABO`、和文副題、メニューの順に表示され、約 3 秒で待機状態になる。
- タイトル演出は `fxSpeed.js` の既存設定を読む。`はやい` は約 1.5 秒、`オフ` は完成状態を直ちに表示する。`prefers-reduced-motion` では白転・連続アニメーションを出さず、短い表示にする。
- タイトルのロゴ外側をタップすると演出を即時完了できる。タイトル自体の5連続タップ・約1.1秒長押しによる隠しコマンド、BGM開始、メニューボタンは維持した。
- `theme.css` の末尾に、既存の画面構造・ハンドラを変えずに適用できる仕上げルールを追加した。通常画面のパネル、章/難易度カード、問題・結果面、選択肢、入力欄、戻る/ノート操作を、黒曜石、深藍、象牙、淡金、淡シアン、斜め切り欠きという共通言語へ寄せた。問題面は白〜淡い象牙を残してコントラストを優先し、選択肢の最低高さは56pxを維持している。

## 洗い出し結果

|区分|確認した到達画面|対応|
|---|---|---|
|起動・案内|StartScreen、TitleScreen、HowTo、Character、Login、Transfer|Start/Title は JSX と CSS を刷新。残りは既存の共通 `.app` / `.glass` / Header の統一ルールで到達するため、ロジックを触らず共通CSSを補強。|
|学習|HaichiMode、HaichiStudio、Lesson、SlowMode、StepUp、StepUpSimple、DialogueLesson、TeacherMode、TimeAttack、CalcPracticePick、Challenge|既存の共通パネル・問題面・入力/選択肢スタイルを確認。はいちの動画/PDFペインは教材として白面を維持し、周囲の操作面のみ統一対象とした。|
|評価・振り返り|Relearn、Diagnose、UnitTest、UnitTestSelect、Feedback、Notebook、StudyLog、StatusMeter、StatusDetail、Clinic|共通カード、進捗、結果、モーダル/ノート操作に末尾の統一ルールが適用されることを確認。意味色（正解緑・警告/不正解赤）は保持。|
|収集・装備|Items、Loadout、Shop、Collection、Partners、Skill、Ultimates|共通 `.app` / `.glass` / ボタン・入力ルールで統一。保存、装備、購入、ガチャ等の処理は未変更。|
|バトル・第3メニュー|Battle、TurnBattle、BattleSelect、ThirdMenu、PartyFormation、ThirdGacha、Reward、ThirdBattle、MedalCase、SettingsScreen、RecordScreen|既存の `battle.css` / `third.css` と過去のメニュー統一実装を確認。バトル中の選択肢にはメニュー用の拡大ホバーを追加していない。禁止された第3系のロジック/API/データは未変更。|
|未使用・対象外|Opening、Home、Admin、ComingSoon|Opening は指示どおり未編集。Home は既存統一済みかつこの変更では未編集。Admin/ComingSoon は到達条件を変えず、共通背景のみで対応。|

## 変更ファイル

- `src/screens/StartScreen.jsx`
- `src/screens/TitleScreen.jsx`
- `src/styles/theme.css`
- `docs/DESIGN_CHANGELOG_START_TITLE_LEGACY.md`

## 編集していないもの

- `src/App.jsx`、問題データ（`src/data/**`）、採点・保存・API・遷移ロジック、`src/third/medals.js`、`thirdApi.js`、`link.js`、`problemSource.js`、`problemVersion.js`、`ThirdContext.jsx`、`battleEngine.js`、各指定エンジン/データ、`supabase/`、`scripts/`、`package.json`、`package-lock.json` は編集していない。

## 判断が必要な点

- タイトルの「画面タップでスキップ」は、隠しコマンドとの衝突を避けるためロゴ部分とメニューボタン以外のタップに割り当てた。ロゴへの連続タップ・長押しは従来どおり管理モード用である。
- プロジェクトには先行作業由来の未コミット変更・未追跡ファイルが存在していたため、本作業では上記4ファイル以外を変更対象にしていない。

## 検証

- `npm run build` を実行し、Vite production build の成功を確認した。
- 既存の500 kB超チャンク警告のみで、ビルドエラーはない。
