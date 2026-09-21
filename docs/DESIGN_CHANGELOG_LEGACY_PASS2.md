# 旧デザイン統一 第2弾 変更記録

実施日: 2026-09-21

## 実装内容

- 問題面を象牙〜羊皮紙色、淡金の細線と角飾りに統一した。問題文・数式は `Noto Sans JP` を優先し、明るい面で高いコントラストを保つ。
- れんしゅうの進捗、従来のヒント／わからない、計算スペースを44px以上の切り欠きコマンドに置換した。ヒント・読み上げ・解法導線の絵文字見出しを取り除き、機能・ハンドラは維持している。
- `ToketaHint` を共通の羊皮紙ヒント枠と切り欠きボタンにし、`QuestionText` の読み上げを文字ラベル付きの線画風コマンドにした。
- `ResultReview`、`CharBubble`、`Avatar` を淡金・淡シアン・黒曜石の共通部品として再設計した。吹き出しは落ち着いた明朝系の切り欠き形にした。
- はいちスタジオの操作バーを、切り欠きセグメント群・選択時の淡金枠・最低44pxの操作サイズへ整理した。動画／プリント、分割、ペン、消しゴム、別タブ、確認問題の既存動作は変更していない。
- 学び直し、診断、ステップアップ簡易版、ログイン、引き継ぎ、遊び方、キャラクター設定の残存する白箱・丸い操作を共通の黒曜石パネル／切り欠きコマンドへ寄せた。

## 確認した画面

|区分|画面|対応|
|---|---|---|
|練習|SlowMode、StepUpSimple、StepUp、Lesson|SlowMode と StepUpSimple は問題・ヒント・進捗を直接統一。StepUp／Lesson は既存の共通 `qcard`、`choice-btn`、`QuestionText`、`ToketaHint` を通じて統一。|
|はいち|HaichiMode、HaichiStudio、確認問題|一覧・スタジオの操作群と確認問題の共通結果面を統一。教材本体の YouTube/PDF 白面は読みやすさと外部教材の表示を優先して維持。|
|評価・復習|Challenge、Relearn、UnitTest、UnitTestSelect、Diagnose、結果／ふりかえり|Relearn／Diagnose を直接統一し、Challenge・UnitTest は共通カード、問題選択肢、ResultReview が適用される。採点・進行は未変更。|
|案内・設定|Login、Transfer、HowTo、Character|各画面のカード、入力、切替・操作ボタンを統一。キャラクター作画の色丸は指定どおり維持。|
|共通|QuestionText、ToketaHint、ResultReview、CharBubble、Avatar|直接更新済み。キーボード、入力欄、モーダル、トーストは既存共通CSSの上書き対象として確認。|
|未編集|Opening、Home、Admin、ComingSoon、Battle／TurnBattle、`src/third/**`|Opening は未使用かつ前回指示で対象外。Home は先行統一済み。Admin／ComingSoon は一般導線外。バトルは解答中の選択肢にメニュー演出を加えない仕様、`src/third/**` は編集禁止のため未編集。|

## 変更ファイル

- `src/styles/theme.css`
- `src/screens/SlowMode.jsx`
- `src/screens/StepUpSimple.jsx`
- `src/screens/HaichiMode.jsx`
- `src/screens/HaichiStudio.jsx`
- `src/screens/Relearn.jsx`
- `src/screens/Diagnose.jsx`
- `src/screens/Login.jsx`
- `src/screens/Transfer.jsx`
- `src/screens/HowTo.jsx`
- `src/screens/Character.jsx`
- `src/components/QuestionText.jsx`
- `src/components/ToketaHint.jsx`
- `src/components/ResultReview.jsx`
- `src/components/CharBubble.jsx`
- `src/components/Avatar.jsx`

## 編集禁止範囲

`src/App.jsx`、`src/data/**`、`src/third/**` の指定ファイル、`supabase/`、`scripts/`、`package.json`、`package-lock.json` には本作業で変更を加えていない。作業開始時から存在した未コミット変更はそのまま保持した。

## 判断が必要な点

- 問題解答中の選択肢には、誤操作を避けるためメニュー用のホバー拡大を適用していない。
- 動画・PDFの表示領域は、外部教材とワークシートの可読性を守るため白面を維持し、周囲の操作・枠だけを統一した。

## 検証

- `npm run build` を実行し、Vite production build の成功を確認した。
- 既存の500 kB超チャンク警告のみで、ビルドエラーはない。
