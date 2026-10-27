// =============================================================
//  研究プロジェクトの例（自分のプロジェクトに書き換えるか、削除してください）
//  新しいプロジェクトは _template.js をコピーして作成します。
// =============================================================

export default {
  // URL に使われる英数字の名前（projects/<slug>.html になります）
  slug: 'example-project',

  title: 'サンプルプロジェクト',
  titleEn: 'Example Project',

  // 一覧ページに出る 1〜2 文の要約
  summary: 'このテンプレートの使い方を示すためのサンプルです。content/projects/ のファイルを書き換えると、この内容が変わります。',

  // 'active'（進行中） / 'completed'（完了） / 'planned'（計画中） / 'paused'（休止中）
  status: 'active',
  period: '2026 –',
  featured: true, // true にするとトップページで大きく紹介
  order: 1, // 一覧での並び順（小さいほど上）

  role: '企画・開発',
  tags: ['Python', 'JavaScript'],

  // ---- リンク ------------------------------------------------------
  repo: '', // GitHub の URL（空欄なら非表示）
  links: [
    // { label: '論文', url: 'https://...' },
  ],

  // ---- オンラインデモ -------------------------------------------------
  //   embed: true  → ページ内に iframe で表示（クリックで読み込み）
  //   embed: false → 目立つ外部リンクボタンのみ表示
  // 埋め込みが拒否されるサイト（X-Frame-Options 等）は embed: false にしてください。
  demo: null, // { url: 'https://...', embed: true, aspect: '16 / 9', label: 'デモを開く' }
  demoNote: '', // デモがないときに「デモ」の節に表示する文（空欄なら節ごと非表示）

  // ---- 画像 --------------------------------------------------------
  // 画像は public/images/projects/<slug>/ に置きます。
  // inline: true の SVG はページに直接埋め込まれ、ダークモードの色にも合わせられます。
  cover: {
    type: 'image',
    src: 'images/projects/example-project/cover.svg',
    alt: 'サンプルプロジェクトの概要図',
    caption: '図はここに説明を書きます。',
    inline: true,
  },
  media: [
    // { type: 'image', src: 'images/projects/example-project/photo.jpg', alt: '…', caption: '…' },
    // { type: 'youtube', id: 'XXXXXXXXXXX', caption: '…' },
  ],

  // ---- 本文（Markdown） -----------------------------------------------
  background: `
なぜこの研究をするのかを書きます。どんな問題があり、誰が困っているのか。
`,
  goals: `
- 目標 1
- 目標 2
`,
  method: `
### 全体の構成

どうやって実現するかを書きます。表も使えます。

| 部分 | 使う技術 |
| --- | --- |
| データ処理 | Python |
| 画面 | JavaScript |
`,
  progress: `
今どこまでできているかを書きます。下の一覧は milestones から作られます。
`,
  milestones: [
    { text: 'テーマを決める', done: true },
    { text: '最初の試作を作る', done: false },
    { text: '評価する', done: false },
  ],
  future: `
- これから取り組むこと
`,
  materials: [], // [{ title: '発表スライド', file: 'files/xxx.pdf' }]
};
