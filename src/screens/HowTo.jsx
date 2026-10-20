// ============================================================
// HowTo.jsx — 遊び方（数学ラボ3）。タイトル画面から開く。読み物として読みやすく。
//  2026-09-29 全面リニューアル：旧バージョン（アイテム・コイン・スキル10種・魔王）の説明から、
//  いまの数学ラボ3（クリスタル・ガチャ・メダル・図鑑）の説明に書きかえた。
// ============================================================
import Header from "../components/Header.jsx";
import BackupBox from "../components/BackupBox.jsx";

function Section({ icon, title, children, color = "#818cf8" }) {
  return (
    <div className="glass" style={{ padding: "14px 16px", borderLeft: `4px solid ${color}` }}>
      <div style={{ fontSize: 14, fontWeight: 900, color: "#fff", marginBottom: 8 }}>{icon} {title}</div>
      <div style={{ fontSize: 12.5, color: "rgba(255,255,255,.72)", lineHeight: 1.7 }}>{children}</div>
    </div>
  );
}

const Mode = ({ emoji, name, children }) => (
  <div style={{ marginBottom: 9 }}>
    <span style={{ fontWeight: 900, color: "#fff" }}>{emoji} {name}</span><br />
    <span>{children}</span>
  </div>
);

const Get = ({ children }) => (
  <li style={{ marginBottom: 6 }}>{children}</li>
);

function Toggle({ on, onChange, label, desc }) {
  return (
    <button
      onClick={() => onChange(!on)} data-sfx="none"
      style={{
        width: "100%", display: "flex", alignItems: "center", gap: 12, textAlign: "left",
        background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.12)", borderRadius: 12,
        padding: "11px 13px", cursor: "pointer", marginBottom: 8,
      }}
    >
      <span style={{ flex: 1 }}>
        <span style={{ fontSize: 14, fontWeight: 900, color: "#fff", display: "block" }}>{label}</span>
        <span style={{ fontSize: 11.5, color: "rgba(255,255,255,.6)" }}>{desc}</span>
      </span>
      <span style={{
        width: 50, height: 28, borderRadius: 999, flexShrink: 0, position: "relative",
        background: on ? "#22c55e" : "rgba(255,255,255,.18)", transition: "background .15s",
      }}>
        <span style={{
          position: "absolute", top: 3, left: on ? 25 : 3, width: 22, height: 22, borderRadius: "50%",
          background: "#fff", transition: "left .15s", boxShadow: "0 1px 3px rgba(0,0,0,.3)",
        }} />
      </span>
    </button>
  );
}

export default function HowTo({ player, onExport, onImport, onSetting, onBack }) {
  return (
    <div className="app legacy-howto">
      <Header player={player} back="ホーム" onBack={onBack} />
      <div className="content">
        <div className="pg-ttl">📖 遊び方</div>
        <div className="pg-sub">学習の流れ・クリスタルのこと・仲間の育て方</div>

        {/* ★5 よみあげ・ふりがな（読むのが苦手な人向け。ON/OFFできる） */}
        {onSetting && (
          <Section icon="🔊" title="よみあげ・ふりがな（読むのが苦手な人へ）" color="#22c55e">
            <div style={{ marginBottom: 8 }}>
              問題が読みにくい人は、ここをONにすると<b style={{ color: "#fff" }}>声で読んでくれたり、ふりがな</b>がつきます。
              いらない人はOFFのままでOK。問題の <b style={{ color: "#fff" }}>🔊</b> ボタンでもいつでも聞けます。
            </div>
            <Toggle
              on={!!player.readAloud} onChange={(v) => onSetting("readAloud", v)}
              label="🔊 よみあげ（自動）" desc="新しい問題が出たら、声で読んでくれる"
            />
            <Toggle
              on={!!player.furigana} onChange={(v) => onSetting("furigana", v)}
              label="🈂 ふりがな" desc="むずかしい漢字によみがなをつける"
            />
          </Section>
        )}

        <Section icon="💛" title="このゲームの思い" color="#f472b6">
          数学は「こわいもの」じゃなくて、解けると気持ちいいパズル。<br />
          まちがえても大丈夫。少しずつ解いて、戦って、仲間と一緒にレベルアップしていく——
          そんな「毎日ちょっとやりたくなる」場所をめざして作りました。あせらず、自分のペースでどうぞ。
        </Section>

        <Section icon="🔁" title="学習の流れ（これがおすすめ！）" color="#34d399">
          <div style={{ lineHeight: 1.9 }}>
            単元をえらぶと、3つのメダル（📺はいち・✏️れんしゅう・⚔️バトル）が待っています。<br />
            <b style={{ color: "#7dd3fc" }}>①&nbsp;📺 学ぶ（はいちメダル）</b><br />
            動画か確認問題で、まず単元の中身を知ろう。<br />
            <span style={{ color: "#86efac" }}>↓</span><br />
            <b style={{ color: "#a5b4fc" }}>②&nbsp;✏️ 練習（れんしゅうメダル）</b><br />
            4択でくり返し練習。むずかしさは<b style={{ color: "#fff" }}>いつでも自分でえらべる</b>。<br />
            <span style={{ color: "#86efac" }}>↓</span><br />
            <b style={{ color: "#fca5a5" }}>③&nbsp;⚔️ バトル（バトルメダル）</b><br />
            身についたかを、仲間と一緒に敵との対戦でチェック。<br />
            <span style={{ color: "#86efac" }}>↓</span><br />
            <b style={{ color: "#fde047" }}>④&nbsp;章のボス → 次の単元・章へ</b><br />
            その章の小単元のバトルをぜんぶクリアすると、章のボスに挑戦できます。この①〜④をくり返すと、ぐんぐん伸びます。
          </div>
        </Section>

        <Section icon="📺" title="葉一さんの解説動画が見られる" color="#f87171">
          単元の「学ぶ」ボタンを押すと、YouTubeで大人気の
          <b style={{ color: "#fff" }}> 葉一さん（19ch・とある男が授業をしてみた）</b> の、
          その単元にぴったりの解説動画ページが開きます（動画が無い単元は、かわりに確認問題で学びます）。
          わからない時は、動画で学んでからもう一度挑戦しよう。
        </Section>

        <Section icon="💎" title="クリスタルの集め方" color="#7cff8a">
          <b style={{ color: "#fff" }}>クリスタル（💎）</b>は、このゲームでいちばん大事な「ごほうび」。
          くり返し遊んでも減らないので、コツコツためられます。ためかたはたくさんあります：
          <ul style={{ margin: "8px 0 4px", paddingLeft: 18 }}>
            <Get>📺 確認問題（はいち）に<b style={{ color: "#fff" }}>はじめて</b>合格：💎1個（動画レッスンごとに）</Get>
            <Get>✏️ 練習（れんしゅう）：むずかしさ（簡単・普通・難しい・鬼）ごとに、正解5問に<b style={{ color: "#fff" }}>はじめて</b>届くと：💎1個</Get>
            <Get>⚔️ バトル：小単元を<b style={{ color: "#fff" }}>はじめて</b>クリア：💎2個</Get>
            <Get>🎊 章クリアボーナス：その章の小単元バトルを<b style={{ color: "#fff" }}>全部はじめて</b>クリア：💎5個</Get>
            <Get>👑 章のボスに<b style={{ color: "#fff" }}>はじめて</b>勝つ：💎5個</Get>
            <Get>🔁 周回ボーナス：クリアずみの小単元にもう一度勝つと、少しずつ 💎（<b style={{ color: "#fff" }}>1日10個まで</b>）</Get>
            <Get>📅 今日の目標：その日の検証ずみの正解が合計5問に届くと：💎1個（1日1回）</Get>
            <Get>🏆 学年クリアボーナス：その学年の章クリア＋章のボスが全部そろうと：💎30個（学年ごとに1回）</Get>
            <Get>🎰 ガチャで、もう持っている仲間が出た（被った）とき：💎1個もどってくる</Get>
          </ul>
          <div style={{ marginTop: 6 }}>単元をえらぶ画面と「今日のおすすめ」に、あと何問で💎がもらえるかが出ています。</div>
        </Section>

        <Section icon="🎰" title="クリスタルの使い方（ガチャ）" color="#f59e0b">
          クリスタルは<b style={{ color: "#fff" }}>ガチャ</b>で仲間を呼ぶのに使います（1回💎5個、10連は💎50個で1回おまけ＋SR以上が必ず1体）。
          呼んだ仲間はそのままバトルの戦力になります。もう持っている仲間が出たら「予備」になり、
          <b style={{ color: "#fff" }}>合成</b>（ほかの仲間の経験値にする）や<b style={{ color: "#fff" }}>限界突破</b>（同じ仲間を強くする）に使えます。
          ガチャ画面の「📊 排出率を見る」で、レア度ごとの確率も確認できます。
        </Section>

        <Section icon="⚠️" title="だいじな注意（バックアップを取ろう）" color="#f87171">
          このゲームのデータ（レベル・クリスタル・仲間・進み具合など）は、
          <b style={{ color: "#fff" }}>あなたのブラウザの中だけ</b>に保存されています。<br />
          <b style={{ color: "#fca5a5" }}>ブラウザの履歴・キャッシュ（サイトデータ）を消すと、進み具合も消えてしまいます。</b><br />
          ・シークレット／プライベートモードでは保存されません<br />
          ・別の端末やブラウザでは引き継げません<br />
          <b style={{ color: "#fde047" }}>大切な進み具合は、下の「バックアップ」でファイルに保存しておくと安心です。</b>
          機種変更のときや、消えてしまったときも、そのファイルから元に戻せます。
        </Section>

        <Section icon="🎮" title="モードの遊び方" color="#60a5fa">
          <Mode emoji="📺" name="学ぶ（はいち）">動画レッスンか確認問題で、その単元のやり方を知る。合格すると📺はいちメダル。</Mode>
          <Mode emoji="✏️" name="練習（れんしゅう）">4択でくり返し練習。むずかしさはいつでもえらべます。正解が5問に届くと✏️れんしゅうメダル＋クリスタル。</Mode>
          <Mode emoji="⚔️" name="バトルモード">クイズで敵と対戦。敵の行動ゲージが0になる前に正解して倒そう。まちがえるとゲージが進みます（「簡単」なら少しだけ）。むずかしいほどダメージが大きい代わりに、削れる量には上限があります。あわてて1秒で答えると数えられないので、問題をよく読んでから答えよう。小単元→章のボスの順に挑みます。</Mode>
          <Mode emoji="🌍" name="学年（ワールド）">中1・中2・中3は、それぞれ独立した<b style={{ color: "#fff" }}>ワールド</b>です。ホームの学年ボタンで切りかえます。仲間のレベルは学年ごとに別々（それぞれ経験値0から）。クリスタル・図鑑・仲間の所持はみんな共通で引き継がれます。</Mode>
        </Section>

        <Section icon="⭐" title="仲間の経験値とレベル" color="#fbbf24">
          バトルに勝つと、パーティの仲間ひとりずつに経験値が入り、レベルが上がります。レベルが上がると、HP・攻撃力がアップ！<br />
          ※ 経験値は今いる学年（ワールド）ごとに分かれています。<br />
          ※ 同じ小単元のバトルに2回目以降勝っても、<b style={{ color: "#fff" }}>雑魚を倒したぶんの経験値はいつも通りもらえます</b>。減るのはボスをたおしたぶんだけです。
        </Section>

        <Section icon="⚗️" title="合成・限界突破" color="#a855f7">
          ガチャで被った仲間（予備）や、パーティ外の仲間は、「合成」でほかの仲間の経験値にできます（1体＝200＋その子の経験値の半分）。<br />
          予備を使うと「限界突破」（同じ仲間を最大4回まで強化）もできます。ガチャ画面から進めます。
        </Section>

        <Section icon="📔" title="図鑑" color="#4ade80">
          出会ったことがある仲間だけ、絵と名前がわかります。まだ出会っていない子は「？？？」。
          合成で手放しても図鑑には残ります。レア度（N・R・SR・UR）ごとに絞りこめます。
        </Section>

        {/* データのバックアップ（保存・復元） */}
        {onExport && onImport && <BackupBox onExport={onExport} onImport={onImport} />}
      </div>
    </div>
  );
}
