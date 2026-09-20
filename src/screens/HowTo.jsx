// ============================================================
// HowTo.jsx — 遊び方（ゲームの思い・各モード・経験値/お金/アイテム/スキル・注意）
//  タイトルやホームから開く。読み物として読みやすく。
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
    <div className="app">
      <Header player={player} back="ホーム" onBack={onBack} />
      <div className="content">
        <div className="pg-ttl">📖 遊び方</div>
        <div className="pg-sub">学習の流れ・モードのこと・育て方のこと</div>

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
          まちがえても大丈夫。少しずつ解いて、戦って、自分のキャラと一緒にレベルアップしていく——
          そんな「毎日ちょっとやりたくなる」場所をめざして作りました。あせらず、自分のペースでどうぞ。
        </Section>

        <Section icon="🔁" title="学習の流れ（これがおすすめ！）" color="#34d399">
          <div style={{ lineHeight: 1.9 }}>
            <b style={{ color: "#7dd3fc" }}>①&nbsp;⏱️ タイムアタックで実力アップ</b><br />
            時間内に何問解けるか挑戦。今の力をためします。<br />
            <span style={{ color: "#86efac" }}>↓</span><br />
            <b style={{ color: "#a5b4fc" }}>②&nbsp;📖 わからない所は「学び直し」で復習</b><br />
            間違えた問題は「学び直し」に集まります。<b style={{ color: "#fff" }}>もう一度練習</b>したり、
            <b style={{ color: "#fca5a5" }}>📺 葉一さんの解説動画</b>を見て学べます。<br />
            <span style={{ color: "#86efac" }}>↓</span><br />
            <b style={{ color: "#fca5a5" }}>③&nbsp;⚔️ バトルで確認</b><br />
            身についたかをモンスターとの対戦でチェック。<br />
            <span style={{ color: "#86efac" }}>↓</span><br />
            <b style={{ color: "#fde047" }}>④&nbsp;次の単元・学年へ進む</b><br />
            できるようになったら、次へ。この①〜④をくり返すと、ぐんぐん伸びます。
          </div>
        </Section>

        <Section icon="📺" title="葉一さんの解説動画が見られる" color="#f87171">
          単元えらびや「学び直し」の画面にある <b style={{ color: "#fca5a5" }}>📺 解説</b> ボタンを押すと、
          YouTubeで大人気の <b style={{ color: "#fff" }}>葉一さん（19ch・とある男が授業をしてみた）</b> の、
          その単元にぴったりの解説動画ページが開きます。わからない時は、動画で学んでからもう一度挑戦しよう。
        </Section>

        <Section icon="⚠️" title="だいじな注意（バックアップを取ろう）" color="#f87171">
          このゲームのデータ（レベル・コイン・進み具合・描いたキャラなど）は、
          <b style={{ color: "#fff" }}>あなたのブラウザの中だけ</b>に保存されています。<br />
          <b style={{ color: "#fca5a5" }}>ブラウザの履歴・キャッシュ（サイトデータ）を消すと、進み具合も消えてしまいます。</b><br />
          ・シークレット／プライベートモードでは保存されません<br />
          ・別の端末やブラウザでは引き継げません<br />
          <b style={{ color: "#fde047" }}>大切な進み具合は、下の「バックアップ」でファイルに保存しておくと安心です。</b>
          機種変更のときや、消えてしまったときも、そのファイルから元に戻せます。
        </Section>

        <Section icon="🎮" title="モードの遊び方" color="#60a5fa">
          <Mode emoji="⏱️" name="タイムアタック">限られた時間で何問解けるか挑戦（単元によって制限時間がかわります）。正解数で⭐がつきます。3つの難易度（かんたん／ふつう／発展）すべてで⭐をとると、その小単元のバトルモンスターが出現！</Mode>
          <Mode emoji="📖" name="学び直し">タイムアタックやバトルで<b style={{ color: "#fff" }}>間違えた問題が自動で集まります</b>。単元ごとに、時間制限なしでもう一度練習（1問 +10XP）したり、📺 葉一さんの動画で学べます。「できた！」を押すと一覧から消えます。</Mode>
          <Mode emoji="⚔️" name="バトルモード">クイズでモンスターと対戦。小単元の敵→章ボス→最後は数学の魔王。章ボスを倒すとスキルがもらえます。学年（ワールド）ごとに Lv1 から冒険！</Mode>
          <Mode emoji="🧮" name="計算王への道">章ごとの<b style={{ color: "#fff" }}>ハイレベル問題</b>に挑戦。<b style={{ color: "#fca5a5" }}>1問でも間違えたら終了</b>、何問連続で解けるかと、5問クリアの<b style={{ color: "#7dd3fc" }}>タイム</b>で自己ベストに挑戦！ さらに<b style={{ color: "#d8b4fe" }}>章をクリアすると、そのワールドのバトル攻撃力が永続アップ⚔️</b>。</Mode>
        </Section>

        <Section icon="🌍" title="学年（ワールド）について" color="#818cf8">
          中1・中2・中3は、それぞれ独立した<b style={{ color: "#fff" }}>ワールド</b>です。ホームの学年ボタンで切りかえます。<br />
          レベル・HP・攻撃力・バトルは<b style={{ color: "#fff" }}>学年ごとに別々</b>（それぞれ Lv1 から）。コイン・スキル・キャラ・実績はみんな共通で引き継がれます。
        </Section>

        <Section icon="⭐" title="経験値（XP）とレベル" color="#fbbf24">
          問題を解くとXPがたまり、レベルが上がります。レベルが上がると、バトルのHP・攻撃力・考える時間がアップ！<br />
          ※ レベルは今いる学年（ワールド）ごとに分かれています。<br />
          ※ 同じところを何度もくり返すと、もらえるXPは少なくなります（ずるい稼ぎ防止）。いろいろな単元に挑戦するのがコツ。
        </Section>

        <Section icon="💰" title="お金（コイン）の稼ぎ方" color="#f59e0b">
          おもにタイムアタックでコインが手に入ります（正解数や⭐でアップ）。コインは「アイテム」画面で道具・そうび・治療に使います。
          くり返し遊んでもコインは減らないので、コツコツためられます。
        </Section>

        <Section icon="🧪" title="アイテムのもらい方" color="#4ade80">
          「アイテム」画面でコインを使って買います。バトル中に1つだけ持てて、使うとなくなります。<br />
          回復・SP回復・攻撃アップ・防御の4種類があり、レベルが上がると上位（もっと強い）が解放されます。
          バトルのHPは戦闘が終わっても回復しません。「アイテム」の「治療」で全回復できます。
        </Section>

        <Section icon="✨" title="スキルのもらい方" color="#a855f7">
          スキルはバトル中、SP（正解でたまる）を使って発動します。スロット1・2に1つずつセット。<br />
          スキルは全部で<b style={{ color: "#fff" }}>10種</b>。最初に各スロット1つずつ持っていて、
          <b style={{ color: "#fde047" }}>章ボス（7体）とラスボスを倒すたびに1つずつ</b>もらえます。<br />
          手に入れたら「スキル」画面で、どれを装備するか選べます。
        </Section>

        <Section icon="🎨" title="自分のキャラ" color="#ec4899">
          「キャラクター」画面で、テンプレから選んだり、自分で絵を描いたり、画像を読み込んだりできます。
          お気に入りのキャラと一緒に育てよう。
        </Section>

        {/* データのバックアップ（保存・復元） */}
        {onExport && onImport && <BackupBox onExport={onExport} onImport={onImport} />}
      </div>
    </div>
  );
}
