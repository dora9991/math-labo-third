# 仕上げ(A)・新バトル演出移植(B) 変更記録

実施日: 2026-09-21

## A. メニュー仕上げ

- `src/components/GameButton.jsx`（`ICONS` と `CrestIcon`）
  - データ側の章絵文字（➕、🔤、⚖️、📈、🔺、🧊）を、表示時に単色線画 SVG に変換する対応を追加した。データファイルは変更していない。
- `src/third/menu/SettingsScreen.jsx`（アラーム分数操作）
  - 既存の増減ハンドラ・保存処理を維持し、減算／加算ボタンと range に表示専用 class を追加した。
  - 10.5px の補助文を 12px に上げ、コントラストを改善した。
- `src/third/menu/RecordScreen.jsx`（記録カードの補助情報・週グラフ）
  - 8.5〜11.5px の表示を 12px 以上に上げ、低コントラストの文字色を明るくした。集計ロジックは変更していない。
- `src/styles/theme.css`（末尾の仕上げルール）
  - range のトラック／つまみを淡金〜淡シアン発光、増減ボタンを切り欠き形にした。
  - `MedalCase` は JSX・ロジックに触れず、既存 inline font-size に対する CSS のみで 12px 以上と読みやすい色を適用した。

## B. 新バトル演出

- `src/third/screens/ThirdBattle.jsx`
  - import 部に `UltimateCutIn`、`FxSpeedToggle`、fx speed helpers を追加した。
  - 演出専用 state（`fxSpeed`／`cutIn`）と `fxDelay` を追加した。ダメージ計算、HP、問題出題、API、状態遷移には触れていない。
  - `activateSkill` 内では既存のスキル判定通過後にカットイン state をセットし、既存のスキル効果処理をそのまま継続する。カットインのスキップ／オフは演出 state の終了だけで、結果に影響しない。
  - 既存の攻撃ポップアウト解除、既存 Pixi 光球開始、既存の着弾後シェイク／撃破表示の「見た目用」timeout に `fxDelay` を適用した。
  - 上部バーに `FxSpeedToggle` を配置し、`BattleFX` へ現在の `speed` を渡した。
- `src/third/fx/BattleFX.jsx`
  - `speed` prop を受け、Pixi ticker に共通倍率を設定した。これで弾、爆発、ダメージ数字、反撃、正解／開始バナーを同じ速度で再生する。
  - reduced-motion または「オフ」では `playHit` の飛翔を省き、同じ対象座標に爆発とダメージ数字を直ちに表示する。座標・色（単元色）・会心フラグは既存値をそのまま利用する。
- `src/third/third.css`
  - バトルの選択肢・難度・モーダル操作を金縁の切り欠き形、立体的な押下状態へ統一した。
  - 演出速度トグルの小画面レイアウトと、敵名／ゲージラベルの 12px 最低文字サイズを追加した。

## 衝突回避・未変更範囲

- 新バトルには既存 `BattleFX` があり、すでに「各パーティポートレート DOM 座標 → 敵 DOM 座標」の光球、単元色、会心時の大きい球／爆発、着弾時ダメージ数字を実装している。そのため旧 `AttackOrbFx` を重ねて二重描画せず、この実装を新バトル用の光球として速度対応・オフ対応した。
- 指定禁止の `battleEngine.js`、データ、API、`ThirdContext.jsx`、`App.jsx`、`package.json`、`scripts/`、`supabase/` は編集していない。
- `ThirdBattle.jsx` のダメージ計算、ターン進行、HP、問題出題、API 呼び出し、状態遷移の順序は変更していない。

## 検証

- `npm run build` を実行し、Vite production build の成功を確認した。既存の 500 kB を超える chunk size 警告のみ。
