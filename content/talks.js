// =============================================================
//  資料（記事、講演スライド、ポスター、配布資料など）
//  date は任意。日付のない記事は一覧の先頭に表示されます。
//  1. ファイルを public/files/ に置く（ファイル名は半角英数字推奨）
//  2. 下の配列に 1 件追加して `npm run build`
//  記事や講演の本文を載せる場合は slug を付け、content/talks/<slug>.md に
//  Markdown で本文を書くと、talks/<slug>.html の詳細ページが作られます。
//  本文中のサイト内リンクは、サイトの一番上からのパスで書きます（例：projects/xxx.html）。
//  日付のあるものは新しい順に自動で並べ替えられます。
// =============================================================

export default [
  {
    slug: 'markdown-guide', // 本文：content/talks/markdown-guide.md
    title: '記事の書き方（Markdown の見本）',
    subtitle: 'このサイトで使える書式と部品',
    type: '記事',
    project: 'example-project', // 関連プロジェクトの slug（任意）
    summary: '記事やプロジェクトの本文で使える Markdown の書式と、グラフ・図などの部品の見本です。自分の記事を書いたら削除してください。',
  },
  // {
  //   date: '2026-11-20',                 // YYYY-MM-DD
  //   title: '〇〇の研究について',
  //   event: '〇〇研究会',                // 発表の場（任意）
  //   type: '口頭発表',                    // 口頭発表 / ポスター / 講義 / 勉強会 など（任意）
  //   project: 'example-project',         // 関連プロジェクトの slug（任意）
  //   note: '',                           // 補足（任意）
  //   files: [
  //     { label: 'スライド', file: 'files/2026-11-20-slides.pdf' },
  //     { label: 'PowerPoint', file: 'files/2026-11-20-slides.pptx' },
  //   ],
  //   links: [{ label: '発表動画', url: 'https://...' }],
  // },
];
