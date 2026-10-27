import { html, esc } from '../lib/html.js';

export const NAV = [
  { key: 'home', label: 'ホーム', href: 'index.html' },
  { key: 'projects', label: 'プロジェクト', href: 'projects.html' },
  { key: 'talks', label: '資料', href: 'talks.html' },
  { key: 'about', label: '自己紹介', href: 'about.html' },
];

export const icon = {
  arrow: '<svg class="i" viewBox="0 0 16 16" aria-hidden="true"><path d="M5 11 11 5M6 5h5v5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  right: '<svg class="i" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h10M9 4l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  left: '<svg class="i" viewBox="0 0 16 16" aria-hidden="true"><path d="M13 8H3M7 4 3 8l4 4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  download: '<svg class="i" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 2.5v8M4.5 7 8 10.5 11.5 7M3 13.5h10" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  github: '<svg class="i" viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38v-1.33c-2.23.48-2.7-1.07-2.7-1.07-.36-.92-.89-1.17-.89-1.17-.73-.5.06-.49.06-.49.8.06 1.23.83 1.23.83.72 1.22 1.88.87 2.34.66.07-.52.28-.87.51-1.07-1.78-.2-3.65-.89-3.65-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.6 7.6 0 0 1 4 0c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48v2.2c0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z"/></svg>',
  play: '<svg class="i" viewBox="0 0 16 16" aria-hidden="true"><path d="M5 3.5v9l7-4.5z" fill="currentColor"/></svg>',
  check: '<svg class="i" viewBox="0 0 16 16" aria-hidden="true"><path d="m3.5 8.5 3 3 6-7" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  theme: '<svg class="i" viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="7" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M10 3a7 7 0 0 1 0 14z" fill="currentColor"/></svg>',
};

// 所属・分野・身分のうち、入力されているものだけをつなげる（すべて空なら ''）
export function affiliationText(site, sep = ' · ') {
  return [site.affiliation, site.field, site.role].filter(Boolean).map(esc).join(sep);
}

// 外部リンクのラベル → アイコン
export function linkIcon(label) {
  return /github/i.test(label) ? icon.github : '';
}

// テーマ（ライト/ダーク）をちらつきなく適用するため <head> 内で同期実行する
const themeInit = `(function(){try{var t=localStorage.getItem('theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}})();`;

export function layout(ctx, { title, description, body, page, noindex }) {
  const { site, r, assets } = ctx;
  const aff = affiliationText(site);
  const fullTitle = title ? `${title} | ${site.siteTitle}` : site.siteTitle;
  const canonical = site.siteUrl ? site.siteUrl.replace(/\/?$/, '/') + (page === 'index.html' ? '' : page) : '';
  const year = new Date().getFullYear();

  return html`<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(fullTitle)}</title>
<meta name="description" content="${esc(description || site.description)}">
<meta name="color-scheme" content="light dark">
${noindex ? '<meta name="robots" content="noindex">' : ''}
<meta name="theme-color" content="#f7f6f2" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#121416" media="(prefers-color-scheme: dark)">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(fullTitle)}">
<meta property="og:description" content="${esc(description || site.description)}">
<meta property="og:locale" content="ja_JP">
${canonical ? `<link rel="canonical" href="${esc(canonical)}">\n<meta property="og:url" content="${esc(canonical)}">` : ''}
<link rel="icon" href="${r('favicon.svg')}" type="image/svg+xml">
<script>${themeInit}</script>
<link rel="stylesheet" href="${r(assets.css)}">
<script src="${r(assets.js)}" defer></script>
</head>
<body data-page="${esc(ctx.navKey)}">
<a class="skip" href="#main">本文へスキップ</a>
<header class="site-header">
  <div class="wrap header-inner">
    <a class="brand" href="${r('index.html')}">
      <span class="brand-name">${esc(site.siteTitle)}</span>
      ${aff || site.siteTitleEn ? html`<span class="brand-sub">${aff || esc(site.siteTitleEn)}</span>` : ''}
    </a>
    <nav class="site-nav" aria-label="メインメニュー">
      <ul>
        ${NAV.map((n) => html`<li><a href="${r(n.href)}"${ctx.navKey === n.key ? ' aria-current="page"' : ''}>${n.long ? html`<span class="lg">${n.long}</span><span class="sm">${n.label}</span>` : n.label}</a></li>`)}
      </ul>
    </nav>
    <button class="theme-toggle" type="button" aria-label="ライト／ダーク表示を切り替え" title="表示テーマを切り替え">${icon.theme}</button>
  </div>
</header>
<main id="main">
${body}
</main>
<footer class="site-footer">
  <div class="wrap footer-inner">
    <p>© ${year} ${esc(site.siteTitleEn || site.siteTitle)}</p>
    <ul class="footer-links">
      ${site.links.map((l) => html`<li><a href="${esc(l.url)}"${/^https?:/.test(l.url) ? ' target="_blank" rel="noopener"' : ''}>${esc(l.label)}</a></li>`)}
    </ul>
    <p class="updated">最終更新 ${ctx.buildDate}</p>
  </div>
</footer>
${ctx.dev ? '<script>new EventSource("/__reload").onmessage=()=>location.reload()</script>' : ''}
</body>
</html>
`;
}
