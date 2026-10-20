# バトルFX強化 変更記録

実装日: 2026-09-22

## 実装内容

- 必殺技: 5系統
  - 全体攻撃: 全対象への大きな交差斬撃・爆発・全画面フラッシュ
  - 単体攻撃: 発射元からの大弾道と多重斬撃
  - 攻撃/防御バフ: 味方全体を包む紋章・拡散リング
  - 回復/状態回復: 暖色の花びら、浄化リング、光粒
  - カットインの終了（タップスキップを含む）後に初めてFXとHP/状態更新を行うよう変更
- 通常攻撃: 5種（ひっかき、魔法弾＋魔法陣、打撃リング、剣の交差斬撃、爆発）
- 敵攻撃: 9種（ひっかき、噛みつき、火球、氷刃、暗黒の棘、音波、毒霧、タックル、雷撃）
- 敵攻撃中は `enemyAttack` phase にして選択肢・難易度ボタンを無効化し、問題表示を暗転する。全敵の演出完了後、同じ問題の `question` phase に戻す。

## 対応表と選定基準

| 対象 | 演出の決定基準 |
| --- | --- |
| 味方通常攻撃 | `art` / `role` / `roleTag` を優先する。beast・animal・bug・dice・speed はひっかき、geo・angle・prime は剣、volume・balance・guard/tank は打撃、calc・wave は魔法、爆発系アートは爆発。該当しないキャラはIDハッシュで固定し、毎回同じ演出になる。 |
| 敵攻撃 | `art`（なければID）を優先する。prime=噛みつき、calc=火球、geo/angle=氷刃、maou/boss=暗黒の棘、wave=音波、dice=毒霧、speed/volume=タックル、fraction/balance=雷撃。それ以外はIDハッシュで9種のいずれかに固定する。 |
| 必殺技 | `skill.category` を直接使用する。`aoeDamage`、`singleDamage`、`buffAtk`/`buffGuard`、`heal`/`cure` で専用FXに分岐する。色はキャラ色を優先し、なければ教科色を使う。 |

## 変更ファイルと関数

- `src/third/fx/BattleFX.jsx`
  - `playHit` に `kind` を追加。
  - `playEnemyCounter` に `kind` を追加。
  - `playUltimate`、通常攻撃5種・敵攻撃9種・必殺技用の描画ヘルパーを追加。
- `src/third/screens/ThirdBattle.jsx`
  - `playerAttackKind` / `enemyAttackKind` を追加し、既存のダメージ計算結果へ演出種別だけを付与。
  - `activateSkill` と `resolveSkillAfterCutIn` を分離し、カットイン後に必殺技を解決。
  - `doEnemyCycle` に `enemyAttack` phase、速度連動タイマー、アンマウント時のタイマー後始末を追加。
- `src/third/third.css`
  - 敵攻撃中（および必殺技決め見せ中）の選択肢暗転・操作不可表示を追加。

## 判断事項

- ダメージ計算、ゲージ値・tier対応、状態異常、報酬、サーバー申請、`balance.js` は変更していない。
- `speed=off` と reduced motion では各必殺技は短いフラッシュへ縮約し、敵攻撃ロックの解除も短縮後の演出時間に合わせる。
- `npm run build` を実行し、成功を確認した（Viteの既存チャンクサイズ警告のみ）。
