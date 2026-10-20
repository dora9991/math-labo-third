# バトル演出の大幅強化（新バトル ThirdBattle.jsx / BattleFX.jsx）

依頼者から「爽快感とテンポ感がいい」と評価済みのバトルを土台に、演出だけを強化する。
**ロジック（ダメージ計算・ゲージ・スキル発動条件・報酬・サーバー申請）は一切変えない。** 変えてよいのは演出の種類・分岐・シーケンス（何を、いつ再生するか）。

## 前提として直接編集済み（触らないでよい／前提として使う）
- `src/third/balance.js`: 難易度倍率を easy=0.7, standard=1.0, advanced=1.2, oni=1.5 に変更済み。
- `src/third/screens/ThirdBattle.jsx`: `skillGaugeMaxFor(character)` を追加済み。スキルの`skill.tier`(1〜4)に応じて
  ゲージ満タン値が {1:6, 2:9, 3:12, 4:15} になる（`SKILL_GAUGE_BY_TIER`）。これは完成済みなので変更不要。

## A. 必殺技（スキル発動）の演出シーケンス
現状: `activateSkill()`（ThirdBattle.jsx）で `setCutIn(...)` と、ダメージ演出(`fxRef.current.playHit(...)`)が**ほぼ同時**に走る。
→ 修正: **カットイン（「シャキーン」という決めのフラッシュ）が終わってから、攻撃エフェクトが始まる**ようにする。
1. `UltimateCutIn`（`src/components/UltimateCutIn.jsx`）は「シャキーン」に相当する決め見せの前半だけを担当させる
   （現状の光の帯・キャラ絵・技名は活かしてよい。タップでスキップも維持）。
2. `onComplete` が呼ばれた時点で、初めて `activateSkill()` 内のダメージ確定・`fxRef.current.playHit(...)`（または後述の必殺技専用エフェクト）
   を実行するように、現在の即時実行コードを `onComplete` 後の関数に移す（`aoeDamage`/`singleDamage`のダメージ計算そのものは
   即時に確定してよいが、**画面上の攻撃エフェクトの再生とHP反映のタイミングはカットイン終了後**にする）。
   タップでスキップされた場合も即座にその流れで良い（スキップ＝カットインの再生時間が0になるだけ）。
3. **必殺技専用のかっこいいエフェクトを新規に何種類か作る**（既存の`playHit`をそのまま使い回さない）。
   `src/third/fx/BattleFX.jsx`に新しい再生メソッド `playUltimate({ category, subject, color, targets, damage, isCrit, ... })` を追加し、
   `skill.category` ごとに演出を変える:
   - `aoeDamage`: 画面全体を巻き込む大きな衝撃（例: 巨大な扇状の光の斬撃／複数の隕石状の光弾が全方向へ／画面を覆う爆発の輪）。敵全体に当たる。
   - `singleDamage`: 1体に集中する強烈な一撃（例: 巨大な貫通ビーム／連続の斬撃コンボ／落雷の柱）。既存のAttackOrb系より一段派手に。
   - `buffAtk` / `buffGuard`: 味方陣営を包む発光のオーラ・紋章が展開する（既存`playPartySkillFx`を発展させてよい）。
   - `heal` / `cure`: 癒しの光・花びら・浄化の波紋のような、暖色/浄化系の演出。
   - 色は `SUBJECT_COLOR[subject]`（既存）やキャラの`color`を使う。派手だが0.6〜1.2秒程度に収め、テンポを壊さない。
   - 演出速度設定（`speed`: normal/fast/off）に既存同様対応し、offでは短いフラッシュのみ。

## B. 通常攻撃（プレイヤー側）の演出バリエーション
現状: `playHit()`が全キャラ共通の1種類の見た目（弾＋着弾のバースト）。
→ 複数の「攻撃タイプ」を用意し、キャラクターの見た目や役割に合わせて出し分ける:
   1. **ひっかき系**（既存の敵カウンター`spawnClawSlash`のような鋭い斬線。味方が動物・獣系のときに合う）
   2. **魔法系**（既存に近い、光の弾/オーブが飛ぶ・着弾で魔法陣が展開）
   3. **打撃系**（拳・衝撃波のリング、ヒットストップ風の一瞬の間、殴打の閃光）
   4. **剣系**（鋭い斬撃線が交差する、金属的な閃光、抜刀のような一閃）
   5. **爆発系**（着弾点が大きく爆ぜる、破片と煙、画面の軽いシェイク）
   出し分けの基準は、キャラクターデータにある `art`（画像アート型: calc/balance/prime/geo/wave/angle/speed/volume/dice等）や
   `role`/`roleTag`、`primarySubject`から妥当にマッピングしてよい（例: 獣・虫系アートはひっかき、幾何系は剣、爆発系アートは爆発、など）。
   対応が難しい場合は `id`のハッシュで安定的にどれか1つに固定してもよい（同じキャラは毎回同じ攻撃タイプになるように）。
   `playHit()`にタイプ引数（例: `kind: "claw"|"magic"|"strike"|"sword"|"explosion"`）を追加し、呼び出し側（ThirdBattle.jsx）で
   キャラから種類を決めて渡す。既存の呼び出し2箇所（通常攻撃/単体・全体スキル）に反映する。

## C. 敵の攻撃演出のバリエーション（多数）
現状: `playEnemyCounter()`は「ひっかき」1種類を方向違い(4種)で使い回しているだけ（`spawnClawSlash`のCLAW_VARIANTS）。
→ **見た目の違う攻撃演出を数多く追加**する（最低6種以上）: 例）
   - 噛みつき（がぶり、歯型の閃光）
   - 火球（飛んでくる炎の球、着弾で爆発）
   - 氷の刃（鋭い氷柱が突き刺さる）
   - 暗黒の棘（地面/背後から黒い棘が突き上がる）
   - 音波/衝撃波（同心円状の波紋が広がる）
   - 毒の霧（紫の霧が広がり点々と着色が残る）
   - タックル/突進（敵が高速で迫って画面端まで迫る）
   - 雷撃（稲妻が落ちる）
   `playEnemyCounter({ rect, variantIndex, damage })`の`variantIndex`を、方向だけでなく**種類そのもの**を選べるように拡張する
   （例: `kind`引数を追加、`kind`は敵の`art`/`subjects`の主属性などから妥当に決める。決め方は自由でよいが、
   同じ敵は毎回だいたい同じ系統の攻撃に寄せると自然）。既存のCLAW系は種類の1つとして残してよい。

## D. 「敵の攻撃中は選べない」仕様
現状: ゲージが0になると`doEnemyCycle()`が呼ばれるが、`phase`は`"question"`のままなので、選択肢は演出中もタップできてしまう。
→ 修正:
   1. `doEnemyCycle()`の**冒頭**で `setPhase("enemyAttack")` のような新しい phase 値に切り替える
      （既存の選択肢ボタンは既に `disabled={phase !== "question"}` なので、これだけで押せなくなる。ロジックは変更不要）。
   2. 選択肢エリアに**暗くする視覚効果**を追加する（例: `opacity`を下げる、`filter: grayscale(.4) brightness(.6)`、
      軽い暗幕オーバーレイなど）。`phase === "enemyAttack"` のときに選択肢のコンテナへクラスを付ける形でよい。
   3. `doEnemyCycle()`内の演出シーケンス（複数体の敵が順番に攻撃する一連の`setTimeout`群）が**全て終わったら**、
      `setPhase("question")` に戻す（今と同じ問題のまま続けられるようにする。新しい問題を出す必要はない）。
      ただし「戦闘不能（defeat）」に至った場合はそのまま`"defeat"`へ（既存の分岐を維持）。
   4. 演出速度設定（オフ/はやい）でも、暗転〜解除のタイミングは実際の演出時間に追従させる（フライング解除しない）。

## 守ること
- 編集は数学ラボ3フォルダ内のみ。ブランチ design-v2、コミット不要。
- 編集禁止（別セッションがメダルのサーバー化・関連システムを作業中）: src/third/medals.js, thirdApi.js, link.js, problemSource.js,
  problemVersion.js, core.js, seeded.js, ThirdContext.jsx, growthCurve.js, expCurve.js, gachaConfig.js, specialistRoster.js,
  data/gachaRoster.js, src/third/data/**, src/App.jsx, supabase/, scripts/, package.json, package-lock.json,
  docs/THIRD_SERVER.md, docs/supabase_third_setup.sql。
- **balance.js は今回変更しない**（既に直接編集済み。数値はそのまま使う）。
- `battleEngine.js`のダメージ計算・状態異常・勝敗判定などの**ロジック関数の中身は変えない**。呼び出し方・演出の追加はOK。
- 全ての機能・ボタン・進行は維持。演出のせいで無限に待たされたり、二重発火したり、画面遷移後も演出が残り続けたりしないこと
  （アンマウント時の後始末を必ず行う）。
- iPhone横(844x390)/iPad/PCで崩れない。prefers-reduced-motionでは既存同様、派手な演出を短縮/簡略化する。
- 最後に `npm run build` を通し、`docs/battle-fx-work/DESIGN_CHANGELOG_BATTLE_FX.md` に、
  追加した演出の一覧（必殺技◯種・通常攻撃◯種・敵攻撃◯種）、対応表（どのキャラ/敵がどの演出になるか決めた基準）、
  変更したファイルと関数、判断が必要な点を日本語で記載すること。
