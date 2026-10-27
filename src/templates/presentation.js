// 発表用ページ：スライド画像と原稿を並べて表示し、「発表モード」で 1 枚ずつ進められる。
import { html, esc, formatBytes } from '../lib/html.js';
import { markdown } from '../lib/markdown.js';
import { icon } from './layout.js';

// 原稿（Markdown）を「## スライド N：タイトル」ごとに分ける
export function parseScript(src) {
  const lines = src.replace(/\r\n?/g, '\n').split('\n');
  const slides = {};
  const intro = [];
  let cur = null;
  for (const line of lines) {
    const m = line.match(/^##\s*スライド\s*(\d+)\s*[：:]\s*(.*)$/);
    if (m) {
      cur = { n: Number(m[1]), title: m[2].trim(), part: '', lines: [] };
      slides[cur.n] = cur;
      continue;
    }
    if (/^#\s/.test(line)) continue; // 原稿全体のタイトル
    if (!cur) { intro.push(line); continue; }
    const p = line.trim().match(/^（(.+)）$/);
    if (p && !cur.part && !cur.lines.some((l) => l.trim())) { cur.part = p[1]; continue; }
    cur.lines.push(line);
  }
  for (const s of Object.values(slides)) s.body = s.lines.join('\n').trim();
  return { intro: intro.join('\n').trim(), slides };
}

export function presentationPage(ctx, pr, imgDir) {
  const total = pr.images.length;
  const items = pr.images.map((img, i) => {
    const s = pr.parsed.slides[i + 1] || { title: '', part: '', body: '' };
    return { n: i + 1, img: ctx.r(`${imgDir}/${img}`), title: s.title, part: s.part, html: markdown(s.body, { resolve: ctx.r }) };
  });
  const data = JSON.stringify(items).replace(/</g, '\\u003c');

  return html`
<div class="deck" data-slug="${esc(pr.slug)}">
  <div class="wrap page-head">
    <nav class="crumbs" aria-label="パンくずリスト"><a href="${ctx.r('talks.html')}">${icon.left}資料</a></nav>
    <p class="project-meta"><span>スライド ${total} 枚</span><span>原稿つき</span></p>
    <h1>${esc(pr.title)}</h1>
    ${pr.subtitle ? html`<p class="title-en">${esc(pr.subtitle)}</p>` : ''}
    <div class="actions">
      <button type="button" class="btn btn-primary" data-deck-start>${icon.play}発表モードで始める</button>
      <button type="button" class="btn" data-deck-audience>スライドだけを別ウインドウで開く</button>
      ${pr.download ? html`<a class="btn" href="${ctx.r(pr.download)}" download>${icon.download}PPTX をダウンロード（${formatBytes(pr.downloadSize)}）</a>` : ''}
    </div>
    <p class="deck-help">発表モード：<kbd>→</kbd> <kbd>Space</kbd> で次へ、<kbd>←</kbd> で前へ、<kbd>F</kbd> で全画面、<kbd>Esc</kbd> で終了。
      プロジェクターには「スライドだけを別ウインドウで開く」で開いた画面を映すと、手元の操作に合わせてスライドが切りかわります。</p>
  </div>

  <ol class="wrap deck-list">
    ${items.map((it) => html`<li class="deck-row" id="slide-${it.n}">
      <button type="button" class="deck-thumb" data-deck-goto="${it.n}" aria-label="スライド ${it.n} から発表モードで始める">
        <img src="${it.img}" alt="スライド ${it.n}${it.title ? `：${esc(it.title)}` : ''}" loading="lazy" decoding="async">
      </button>
      <div class="deck-script">
        <p class="deck-label"><span class="deck-num">${it.n} / ${total}</span>${it.part ? html`<span>${esc(it.part)}</span>` : ''}</p>
        ${it.title ? html`<h2>${esc(it.title)}</h2>` : ''}
        <div class="prose deck-text">${it.html}</div>
      </div>
    </li>`)}
  </ol>
</div>

<div class="presenter" hidden role="dialog" aria-label="発表モード">
  <div class="pr-bar">
    <span class="pr-count"><b data-pr-n>1</b> / ${total}</span>
    <span class="pr-part" data-pr-part></span>
    <span class="pr-timer" data-pr-timer title="クリックでリセット">0:00</span>
    <span class="pr-spacer"></span>
    <button type="button" data-pr-font="-1" aria-label="原稿の文字を小さく">A−</button>
    <button type="button" data-pr-font="1" aria-label="原稿の文字を大きく">A＋</button>
    <button type="button" data-pr-fullscreen>全画面</button>
    <button type="button" data-pr-close>閉じる（Esc）</button>
  </div>
  <div class="pr-main">
    <div class="pr-slide"><img data-pr-img alt=""></div>
    <div class="pr-side">
      <h2 data-pr-title></h2>
      <div class="pr-script" data-pr-script></div>
      <div class="pr-next"><span>次のスライド</span><img data-pr-next alt=""></div>
    </div>
  </div>
  <div class="pr-nav">
    <button type="button" data-pr-prev>← 前へ</button>
    <button type="button" data-pr-nextbtn>次へ →</button>
  </div>
</div>

<div class="audience" hidden><img data-au-img alt=""></div>
<script type="application/json" id="deck-data">${data}</script>
`;
}
