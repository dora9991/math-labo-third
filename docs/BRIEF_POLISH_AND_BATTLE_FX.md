# 仕上げ(A) ＋ 新バトルへの演出移植(B)

前提: docs/BRIEF_MENU_UNIFY.md と docs/DESIGN_CHANGELOG_MENU_UNIFY.md、docs/DESIGN_CHANGELOG_ATTACK_ORB.md、
docs/DESIGN_CHANGELOG_CUTIN.md を読むこと。デザイン言語（黒曜石/淡金/淡シアン、セリフ体、斜めタイル）は既に確立済み。

## A. メニュー内の仕上げ
1. まだ統一が確認できていない画面を、実際にコードを読んで洗い出し、同じデザイン言語に揃える:
   学習の記録(RecordScreen)、パーティ編成(PartyFormation)、ガチャ(ThirdGacha)、報酬(Reward)、アラーム(AlarmOverlay)、
   メダルケース(MedalCase: CSSのみで)、単元えらびの中の詳細（メダル/バトル解放の表示）。
2. 設定画面のスライダー(input range)が既定の青×白で浮いている → トラックとつまみを金/シアンの発光デザインに。
   「−」「＋」ボタンも角丸円形のままなので、切り欠き形の統一ボタンにする。
3. 章一覧の絵文字アイコン(➕🔤⚖️📈🔺🧊 など)を、金または単色の線画SVGアイコンに置き換える
   （データ側は変えず、表示側でアイコンIDに応じてSVGを出す、またはCSS mask で単色化。データファイルは編集しない）。
4. 全画面で小さすぎる文字（12px未満）と、コントラスト不足を点検して直す。

## B. 新バトル(math-world式)へ「攻撃の光球」と「必殺技カットイン」と「演出スピード」を移植
旧バトル(src/screens/TurnBattle.jsx, Battle.jsx)には以下を作ったが、現在のバトルボタンは新バトルへ向いており旧バトルは使われない:
- src/components/AttackOrbFx.jsx（強い球が飛んで着弾でバンと爆発）
- src/components/UltimateCutIn.jsx / UltimateCutIn.css（必殺技カットイン、タップでスキップ可）
- src/components/FxSpeedToggle.jsx と src/engine/fxSpeed.js（演出: ふつう/はやい/オフ）
新バトル src/third/screens/ThirdBattle.jsx と src/third/fx/BattleFX.jsx（既存のエフェクトあり）にこれらを組み込む:
1. パーティ5体のうち**攻撃したキャラの立ち位置**から敵へ光球が飛び、着弾で爆発（キャラの属性/単元色で球の色を変える）。
   実DOM座標から始点・終点を計算する。ダメージ数字は着弾に合わせて出す。既存の BattleFX の演出と重複/衝突する場合は置き換えてよい。
2. 必殺技/スキル発動時にカットイン（そのキャラの絵・技名・一言）。タップでスキップ。
3. 演出スピード切替をバトル画面に設置し、既存の全演出（BattleFX含む）にも係数を反映する。reduced-motion時は自動でオフ相当。
4. 通常攻撃・強攻撃・クリティカル・弱点/耐性など、ThirdBattleに既にある区別があれば球の大きさ/色/爆発に反映。
5. バトル画面のボタン(コマンド)も、統一デザイン（金縁の切り欠き形、立体感、押下エフェクト）に更新。

## 守ること（重要）
- 編集は数学ラボ3フォルダ内のみ。ブランチ design-v2、コミット不要。
- **別セッションが「メダルのサーバー化」を作業中**。編集禁止: src/third/medals.js, thirdApi.js, link.js, problemSource.js,
  problemVersion.js, core.js, seeded.js, ThirdContext.jsx, battleEngine.js, balance.js, growthCurve.js, expCurve.js,
  gachaConfig.js, specialistRoster.js, src/third/data/**, src/App.jsx, supabase/, scripts/, package.json, package-lock.json,
  docs/THIRD_SERVER.md, docs/supabase_third_setup.sql。
- ThirdBattle.jsx の**ロジック（ダメージ計算・ターン進行・HP・問題出題・API呼び出し・状態遷移の順序）は変えない**。
  演出コンポーネントの追加、className/スタイル、演出用の状態とref、演出完了後に既存処理を呼ぶ形の最小変更に留め、
  どこをどう変えたかを変更記録に行単位で書く（別セッションと衝突した場合に直せるように）。
- 全機能・全ボタンを維持。演出のスキップ/オフで結果が変わらない。連打・遷移で演出が残らない（後始末）。
- 軽量に（iPadで滑らか）。最後に npm run build を通し、docs/DESIGN_CHANGELOG_POLISH_BATTLEFX.md に記載。
