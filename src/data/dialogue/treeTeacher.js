// ============================================================
// treeTeacher.js — 発問の木(questionTrees.json)で対話を進めるエンジン
//
//  全122授業ぶんの「中心発問・補助発問・飛ばし条件・想定誤答×誤概念」を
//  人が設計したデータ(questionTrees.json)から駆動する。
//
//  オフライン（中継サーバーなし）：中心発問を一つずつ提示 → 板書が育つ →
//    「ヒント」で補助発問の階段を1段ずつ降ろす。判定はしない（自己確認型）。
//  オンライン（AI先生）：この木を“指導案(plan)”としてClaudeに渡す。
//    AIが expected と照らして判定し、つまずきは aids で降ろす（=賢く・安く）。
//
//  state は teacher.js と同じ形（messages/board/phase/done）に揃えてあるので、
//  画面(DialogueLesson)の描画はそのまま使える。
// ============================================================
import trees from "./questionTrees.json";

export const findTree = (id) => trees.find((t) => t.id === id) || null;
// 対話できる授業か（演習回や中心発問なしは false）
export const hasTree = (id) => {
  const t = findTree(id);
  return !!(t && t.type !== "practice" && (t.central || []).length);
};

const ACKS = ["なるほど、書いてくれたね。", "いいね、その調子。", "うんうん、よく考えた。", "おお、なるほど。", "よく見てるね。"];
const SELF_THINK = "まずは自分で考えてみよう。下のノートに手書きで書いて「✏️ 見せる」、声や文字で答えてもOK。";

const probBoard = (lesson) => [{ text: "【問題】" + (lesson.hatsumon || "").trim(), kind: "problem" }];

export function startTreeLesson(lesson) {
  const central = (findTree(lesson.id)?.central) || [];
  const first = central[0];
  return {
    mode: "tree",
    lessonId: lesson.id,
    ci: 0,          // いま提示している中心発問の番号（答えを待っている）
    aidIndex: 0,    // 今の中心発問で次に出す補助発問
    phase: "think", // think（自分で考える）→ guided → done
    board: probBoard(lesson),
    messages: [{ who: "teacher", text: (first ? first.prompt : (lesson.hatsumon || "")) + "\n\n" + SELF_THINK }],
  };
}

// 今の答えを受け止め、現在の中心発問の板書を残し、次の中心発問へ（無ければ締め）
function advance(state, lesson, board, messages, ack) {
  const central = (findTree(lesson.id)?.central) || [];
  const cur = central[state.ci];
  if (cur && cur.board) board.push({ text: cur.board, kind: state.ci === central.length - 1 ? "result" : "work" });
  const ni = state.ci + 1;
  if (ni < central.length) {
    messages.push({ who: "teacher", text: ack + " " + central[ni].prompt });
    return { ...state, ci: ni, aidIndex: 0, phase: "guided", board, messages };
  }
  const goal = (lesson.nerai || "").split("／")[0];
  board.push({ text: "まとめ：" + goal, kind: "goal" });
  messages.push({ who: "teacher", text: ack + " 今日のねらいは『" + goal + "』。よくがんばった！" });
  return { ...state, board, messages, done: true };
}

export function respondTree(state, lesson, input) {
  const board = [...state.board];
  const messages = [...state.messages, { who: "student", text: input }];
  return advance(state, lesson, board, messages, ACKS[state.ci % ACKS.length]);
}

export function showWorkTree(state, lesson, dataUrl) {
  const board = [...state.board];
  if (dataUrl) board.push({ image: dataUrl, kind: "student", label: "あなたの考え" });
  const messages = [...state.messages, { who: "student", text: "（手書きを見せた）", image: dataUrl }];
  return advance(state, lesson, board, messages, ACKS[state.ci % ACKS.length]);
}

// 「ヒント」：今の中心発問の補助発問を1段ずつ降ろす（誤概念ベースの選択肢つき）
export function hintTree(state, lesson) {
  const central = (findTree(lesson.id)?.central) || [];
  const aids = (central[state.ci]?.aids) || [];
  if (state.aidIndex >= aids.length) {
    return { ...state, messages: [...state.messages, { who: "teacher", text: "💡 ここまでがヒント。思いついたことを書いてみよう。" }] };
  }
  const a = aids[state.aidIndex];
  const ch = a.choices && a.choices.length ? "（" + a.choices.join(" / ") + "）" : "";
  return { ...state, aidIndex: state.aidIndex + 1, messages: [...state.messages, { who: "teacher", text: "💡 " + a.prompt + ch }] };
}
