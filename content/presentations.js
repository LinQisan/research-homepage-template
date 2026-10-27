// =============================================================
//  発表用のスライドと原稿（任意）
//  1. presentation/ に .pptx と原稿（Markdown）を置く
//  2. スライド画像を作る：npm run slides -- presentation/ファイル名.pptx（LibreOffice・Python・PyMuPDF が必要）
//     PowerPoint から保存した同名の .pdf も使えます（LibreOffice は不要）。設定手順は README を参照。
//  3. 下の配列に 1 件足して npm run build
//  → presentations/<slug>.html に「スライド＋原稿」のページと、発表モードができます。
//
//  原稿は「## スライド 1：タイトル」のように、スライドごとに見出しを付けて書きます。
//  見出しのすぐ下の「（…）」の行は、パートの名前として表示されます。
// =============================================================

export default [
  // {
  //   slug: 'my-talk',
  //   title: '発表のタイトル',
  //   subtitle: 'サブタイトル',
  //   pptx: 'presentation/my-talk.pptx', // ダウンロード用（任意）
  //   script: 'presentation/my-talk.md', // 原稿
  //   slides: 'presentation/slides/my-talk', // npm run slides で作った画像のフォルダ
  //   // listed: true にすると「資料」の一覧に表示し、検索エンジンにも案内します。
  //   // false のままなら、URL を知っている人だけが開けるページになります。
  //   listed: false,
  // },
];
