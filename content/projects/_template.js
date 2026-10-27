// =============================================================
//  新規プロジェクトのテンプレート
//  1. このファイルをコピーして「英数字のファイル名.js」にする
//     （先頭が _ のファイルはビルド対象外です）
//  2. 中身を書き換えて `npm run build`
//  不要な項目は削除するか、空文字 '' / 空配列 [] / null にすれば非表示になります。
// =============================================================

export default {
  slug: 'my-new-project', // ファイル名と同じにすると管理しやすい
  title: 'プロジェクト名',
  titleEn: 'Project Name in English',
  summary: '一覧に表示される 1〜2 文の要約。',
  status: 'planned', // 'active' | 'completed' | 'planned' | 'paused'
  period: '2026 –',
  featured: false,
  order: 10,
  // draft: true, // true にすると公開サイトに出力されません

  role: '',
  tags: ['Unity', 'Python'],

  repo: '', // GitHub の URL
  links: [], // [{ label: '論文', url: 'https://...' }]

  demo: null, // { url: 'https://...', embed: true, aspect: '16 / 9', label: 'デモを開く' }
  demoNote: '',

  cover: null, // { type: 'image', src: 'images/projects/my-new-project/cover.jpg', alt: '', caption: '' }
  media: [],

  background: `
ここに研究の背景を書きます。**太字**や [リンク](https://example.com) が使えます。
`,
  goals: `
- 目標 1
- 目標 2
`,
  // methodLabel: '全体の構成', // 「作り方」の見出しを変えたいとき（任意）
  method: `
### 小見出し

実現方法を書きます。
`,
  progress: `
現在の進捗を書きます。
`,
  milestones: [
    { text: '完了した作業', done: true },
    { text: 'これからの作業', done: false },
  ],
  future: `
- 今後の改善点
`,
  materials: [], // [{ title: '発表スライド', file: 'files/xxx.pdf' }]
};
