// 「いま見ている学年」。キャラの強さ（経験値）は学年ごとなので、編成・図鑑・合成の画面はこの学年の強さを表示する。
// メニューで選んでいる学年を、数学ラボ3の画面を開くときに App が入れる。バトルは開始時にその学年を入れる。
let viewGrade = 1;
export const getViewGrade = () => viewGrade;
export const setViewGrade = (g) => { const n = Number(g); if ([1, 2, 3].includes(n)) viewGrade = n; };
