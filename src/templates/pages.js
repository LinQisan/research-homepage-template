import { html, esc, isExternal, formatBytes, formatDate } from '../lib/html.js';
import { markdown } from '../lib/markdown.js';
import { icon, linkIcon, affiliationText } from './layout.js';
import { blocks } from './blocks.js';

export const STATUS = {
  active: '進行中',
  completed: '完了',
  planned: '計画中',
  paused: '休止中',
};

const md = (ctx, src) => markdown(src, { resolve: ctx.r, blocks });

function ext(url) {
  return isExternal(url) ? ' target="_blank" rel="noopener"' : '';
}

function statusBadge(p) {
  return html`<span class="status status-${esc(p.status)}">${STATUS[p.status] || esc(p.status)}</span>`;
}

function tags(list) {
  if (!list?.length) return '';
  return html`<ul class="tags">${list.map((t) => html`<li>${esc(t)}</li>`)}</ul>`;
}

function hostOf(url) {
  try { return new URL(url).host; } catch { return 'このサイト内'; }
}

// 外部 URL はそのまま、サイト内のパスはページ位置からの相対パスにする
function href(ctx, url) {
  return isExternal(url) ? esc(url) : ctx.r(url);
}

// ---------------------------------------------------------------
//  画像・動画
// ---------------------------------------------------------------
export function mediaFigure(ctx, m, { className = '' } = {}) {
  if (!m) return '';
  let inner = '';
  if (m.type === 'youtube') {
    inner = html`<div class="embed" style="aspect-ratio:16/9"><iframe src="https://www.youtube-nocookie.com/embed/${esc(m.id)}" title="${esc(m.caption || '動画')}" loading="lazy" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowfullscreen></iframe></div>`;
  } else if (m.type === 'video') {
    inner = html`<video controls preload="metadata" playsinline src="${ctx.r(m.src)}"${m.poster ? ` poster="${ctx.r(m.poster)}"` : ''}>
      <a href="${ctx.r(m.src)}">動画をダウンロード</a></video>`;
  } else if (m.inline && /\.svg$/i.test(m.src)) {
    inner = ctx.inlineSvg(m.src, m.alt);
  } else {
    inner = html`<img src="${ctx.r(m.src)}" alt="${esc(m.alt || '')}" loading="lazy" decoding="async">`;
  }
  return html`<figure class="media ${className}">${inner}${m.caption ? html`<figcaption>${esc(m.caption)}</figcaption>` : ''}</figure>`;
}

// ---------------------------------------------------------------
//  ダウンロード資料の 1 行
// ---------------------------------------------------------------
function fileLink(ctx, f) {
  const info = ctx.fileInfo(f.file);
  const isPdf = info.ext === 'pdf';
  // PDF はブラウザで開く。PPT などはダウンロードさせる
  const attrs = isPdf ? ' target="_blank" rel="noopener"' : ' download';
  return html`<a class="file" href="${ctx.r(f.file)}"${attrs}>
    <span class="file-ext">${esc(info.ext.toUpperCase() || 'FILE')}</span>
    <span class="file-label">${esc(f.label || f.title || info.name)}</span>
    ${info.size != null ? html`<span class="file-size">${formatBytes(info.size)}</span>` : ''}
    ${isPdf ? icon.arrow : icon.download}
  </a>`;
}

// ---------------------------------------------------------------
//  プロジェクト一覧の行
// ---------------------------------------------------------------
function projectRow(ctx, p, i, { withTags = false } = {}) {
  return html`<li class="project-row reveal" data-status="${esc(p.status)}">
    <a href="${ctx.r(`projects/${p.slug}.html`)}">
      <span class="pr-index">${String(i + 1).padStart(2, '0')}</span>
      <span class="pr-main">
        <span class="pr-title">${esc(p.title)}</span>
        ${p.titleEn ? html`<span class="pr-en">${esc(p.titleEn)}</span>` : ''}
        <span class="pr-summary">${esc(p.summary)}</span>
        ${withTags && p.tags?.length ? html`<span class="pr-tags">${p.tags.map(esc).join(' · ')}</span>` : ''}
      </span>
      <span class="pr-meta">
        ${statusBadge(p)}
        ${p.period ? html`<span class="pr-period">${esc(p.period)}</span>` : ''}
      </span>
      <span class="pr-arrow">${icon.right}</span>
    </a>
  </li>`;
}

function sectionHead(label, en) {
  return html`<header class="section-head"><h2>${label}</h2>${en ? html`<span class="en">${en}</span>` : ''}</header>`;
}

// ===============================================================
//  ホーム
// ===============================================================
export function homePage(ctx) {
  const { site, projects, talks } = ctx;
  const featured = projects.find((p) => p.featured) || projects[0];
  const demos = projects.filter((p) => p.demo?.url);
  const recentTalks = talks.slice(0, 3);
  const homeInterests = site.interests.filter((it) => it.home);

  return html`
<section class="hero wrap">
  <p class="eyebrow reveal">${affiliationText(site) || esc(site.siteTitleEn || '')}</p>
  <h1 class="hero-title reveal">${(site.tagline || site.siteTitle).split(/(?<=、)/).map((s) => html`<span>${esc(s)}</span>`)}</h1>
  <div class="hero-intro prose reveal">${md(ctx, site.intro)}</div>
  <ul class="link-row reveal">
    ${site.links.map((l) => html`<li><a class="btn btn-ghost" href="${esc(l.url)}"${ext(l.url)}>${linkIcon(l.label)}${esc(l.label)}${isExternal(l.url) ? icon.arrow : ''}</a></li>`)}
    <li><a class="btn btn-ghost" href="${ctx.r('about.html')}">自己紹介${icon.right}</a></li>
  </ul>
</section>

${homeInterests.length ? html`
<section class="section wrap" aria-labelledby="h-interests">
  <header class="section-head"><h2 id="h-interests">研究テーマ</h2><span class="en">Research Interests</span></header>
  <ol class="interests">
    ${homeInterests.map((it, i) => html`<li class="reveal">
      <span class="num">${String(i + 1).padStart(2, '0')}</span>
      <h3>${esc(it.title)}</h3>
      ${it.en ? html`<p class="en">${esc(it.en)}</p>` : ''}
      <p>${esc(it.body)}</p>
    </li>`)}
  </ol>
</section>` : ''}

${featured ? html`
<section class="section wrap" aria-labelledby="h-current">
  <header class="section-head"><h2 id="h-current">現在の研究</h2><span class="en">Current Work</span></header>
  <article class="feature reveal">
    <div class="feature-media">${mediaFigure(ctx, featured.cover)}</div>
    <div class="feature-body">
      <p class="feature-meta">${statusBadge(featured)}${featured.period ? html`<span>${esc(featured.period)}</span>` : ''}</p>
      <h3 class="feature-title"><a href="${ctx.r(`projects/${featured.slug}.html`)}">${esc(featured.title)}</a></h3>
      ${featured.titleEn ? html`<p class="feature-en">${esc(featured.titleEn)}</p>` : ''}
      <p class="feature-summary">${esc(featured.summary)}</p>
      ${tags(featured.tags)}
      <div class="actions">
        <a class="btn btn-primary" href="${ctx.r(`projects/${featured.slug}.html`)}">詳しく見る${icon.right}</a>
        ${featured.demo?.url ? html`<a class="btn" href="${ctx.r(`projects/${featured.slug}.html`)}#demo">${icon.play}デモを体験</a>` : ''}
        ${featured.repo ? html`<a class="btn" href="${esc(featured.repo)}" target="_blank" rel="noopener">${icon.github}ソースコード${icon.arrow}</a>` : ''}
      </div>
    </div>
  </article>
</section>` : ''}

${projects.length ? html`
<section class="section wrap" aria-labelledby="h-projects">
  <header class="section-head"><h2 id="h-projects">プロジェクト</h2><span class="en">Projects</span></header>
  <ol class="project-list">${projects.map((p, i) => projectRow(ctx, p, i))}</ol>
  <p class="more"><a href="${ctx.r('projects.html')}">プロジェクト一覧へ${icon.right}</a></p>
</section>` : ''}

${demos.length || site.demoNote ? html`
<section class="section wrap" aria-labelledby="h-demo">
  <header class="section-head"><h2 id="h-demo">デモ・体験</h2><span class="en">Interactive Demos</span></header>
  ${demos.length
    ? html`<ul class="demo-list">${demos.map((p) => html`<li class="reveal">
        <a href="${ctx.r(`projects/${p.slug}.html`)}#demo">
          <span class="demo-title">${icon.play}${esc(p.demo.label || p.title)}</span>
          <span class="demo-host">${esc(p.title)} — ${esc(hostOf(p.demo.url))}</span>
        </a></li>`)}</ul>`
    : html`<div class="note reveal">
        <p>${esc(site.demoNote)}</p>
        ${featured?.repo ? html`<p><a href="${esc(featured.repo)}" target="_blank" rel="noopener">${icon.github}実行方法（GitHub の README）${icon.arrow}</a></p>` : ''}
      </div>`}
</section>` : ''}

${recentTalks.length ? html`
<section class="section wrap" aria-labelledby="h-talks">
  <header class="section-head"><h2 id="h-talks">資料</h2><span class="en">Materials</span></header>
  <ul class="talk-list">${recentTalks.map((t) => talkRow(ctx, t))}</ul>
  <p class="more"><a href="${ctx.r('talks.html')}">すべての資料${icon.right}</a></p>
</section>` : ''}
`;
}

// ===============================================================
//  プロジェクト一覧
// ===============================================================
export function projectsPage(ctx) {
  const { projects } = ctx;
  const statuses = [...new Set(projects.map((p) => p.status))];
  const showFilter = projects.length > 3 && statuses.length > 1;

  return html`
<div class="wrap page-head">
  <p class="eyebrow">Projects</p>
  <h1>プロジェクト</h1>
  <p class="lead">これまでに作ってきたものの記録です。どうして作ったのか、どう作ったのか、今どこまでできているのか、これから何をするのかをまとめています。</p>
</div>
<section class="wrap section-tight">
  ${showFilter ? html`<div class="filter" role="group" aria-label="状態で絞り込み">
    <button type="button" aria-pressed="true" data-filter="all">すべて <span>${projects.length}</span></button>
    ${statuses.map((s) => html`<button type="button" aria-pressed="false" data-filter="${esc(s)}">${STATUS[s] || esc(s)} <span>${projects.filter((p) => p.status === s).length}</span></button>`)}
  </div>` : ''}
  ${projects.length
    ? html`<ol class="project-list project-list-full">${projects.map((p, i) => projectRow(ctx, p, i, { withTags: true }))}
  </ol>`
    : html`<div class="note"><p>公開中のプロジェクトはまだありません。</p></div>`}
</section>
`;
}

// ===============================================================
//  プロジェクト詳細
// ===============================================================
export function projectPage(ctx, p, { prev, next }) {
  const relatedTalks = ctx.talks.filter((t) => t.project === p.slug);
  const done = (p.milestones || []).filter((m) => m.done).length;
  const total = (p.milestones || []).length;

  const sections = [
    p.background && { id: 'background', label: '背景', en: 'Background', body: md(ctx, p.background) },
    p.goals && { id: 'goals', label: '目的', en: 'Goals', body: md(ctx, p.goals) },
    (p.demo?.url || p.demoNote) && { id: 'demo', label: 'デモ', en: 'Demo', body: demoBlock(ctx, p) },
    p.method && { id: 'method', label: p.methodLabel || '作り方', en: p.methodLabelEn || 'Method', body: md(ctx, p.method) },
    (p.progress || total) && {
      id: 'progress', label: '今の状況', en: 'Progress',
      body: html`${md(ctx, p.progress)}
        ${total ? html`<div class="milestones">
          <div class="progress-bar" role="img" aria-label="${done} / ${total} 完了"><span style="width:${Math.round((done / total) * 100)}%"></span></div>
          <p class="progress-count">${done} / ${total} 完了</p>
          <ul>${p.milestones.map((m) => html`<li class="${m.done ? 'done' : ''}"><span class="mark">${m.done ? icon.check : ''}</span>${esc(m.text)}${m.date ? html` <span class="ms-date">${esc(m.date)}</span>` : ''}</li>`)}</ul>
        </div>` : ''}`,
    },
    p.media?.length && { id: 'gallery', label: '画像・動画', en: 'Gallery', body: html`<div class="gallery">${p.media.map((m) => mediaFigure(ctx, m))}</div>` },
    p.future && { id: 'future', label: 'これから', en: 'Future Work', body: md(ctx, p.future) },
    (p.materials?.length || relatedTalks.length) && {
      id: 'materials', label: '関連資料', en: 'Materials',
      body: html`${p.materials?.length ? html`<div class="files">${p.materials.map((f) => fileLink(ctx, f))}</div>` : ''}
        ${relatedTalks.length ? html`<ul class="talk-list">${relatedTalks.map((t) => talkRow(ctx, t))}</ul>` : ''}`,
    },
  ].filter(Boolean);

  return html`
<article class="project">
  <div class="wrap page-head">
    <nav class="crumbs" aria-label="パンくずリスト"><a href="${ctx.r('projects.html')}">${icon.left}プロジェクト</a></nav>
    <p class="project-meta">${statusBadge(p)}${p.period ? html`<span>${esc(p.period)}</span>` : ''}</p>
    <h1>${esc(p.title)}</h1>
    ${p.titleEn ? html`<p class="title-en">${esc(p.titleEn)}</p>` : ''}
    <p class="lead">${esc(p.summary)}</p>
    <div class="actions">
      ${p.demo?.url ? html`<a class="btn btn-primary" href="${p.demo.embed ? '#demo' : href(ctx, p.demo.url)}"${p.demo.embed ? '' : ' target="_blank" rel="noopener"'}>${icon.play}${esc(p.demo.label || 'デモを体験')}${p.demo.embed ? '' : icon.arrow}</a>` : ''}
      ${p.repo ? html`<a class="btn ${p.demo?.url ? '' : 'btn-primary'}" href="${esc(p.repo)}" target="_blank" rel="noopener">${icon.github}GitHub リポジトリ${icon.arrow}</a>` : ''}
      ${(p.links || []).map((l) => html`<a class="btn" href="${href(ctx, l.url)}"${ext(l.url)}>${esc(l.label)}${isExternal(l.url) ? icon.arrow : ''}</a>`)}
    </div>
  </div>

  ${p.cover ? html`<div class="wrap wrap-wide project-cover">${mediaFigure(ctx, p.cover)}</div>` : ''}

  <div class="wrap project-layout">
    <aside class="project-aside">
      <dl class="facts">
        ${p.period ? html`<div><dt>期間</dt><dd>${esc(p.period)}</dd></div>` : ''}
        <div><dt>状態</dt><dd>${STATUS[p.status] || esc(p.status)}</dd></div>
        ${p.role ? html`<div><dt>担当</dt><dd>${esc(p.role)}</dd></div>` : ''}
        ${p.tags?.length ? html`<div><dt>使用技術</dt><dd>${tags(p.tags)}</dd></div>` : ''}
      </dl>
      ${sections.length > 2 ? html`<nav class="toc" aria-label="このページの目次">
        <p class="toc-title">目次</p>
        <ol>${sections.map((s) => html`<li><a href="#${s.id}">${s.label}</a></li>`)}</ol>
      </nav>` : ''}
    </aside>

    <div class="project-body">
      ${sections.map((s, i) => html`<section id="${s.id}" class="project-section">
        <header class="ps-head"><span class="ps-num">${String(i + 1).padStart(2, '0')}</span><h2>${s.label}</h2><span class="en">${s.en}</span></header>
        <div class="prose">${s.body}</div>
      </section>`)}
    </div>
  </div>

  ${prev || next ? html`<nav class="wrap pager" aria-label="前後のプロジェクト">
    ${prev ? html`<a class="pager-prev" href="${ctx.r(`projects/${prev.slug}.html`)}"><span>${icon.left}前のプロジェクト</span>${esc(prev.title)}</a>` : '<span></span>'}
    ${next ? html`<a class="pager-next" href="${ctx.r(`projects/${next.slug}.html`)}"><span>次のプロジェクト${icon.right}</span>${esc(next.title)}</a>` : ''}
  </nav>` : ''}
</article>
`;
}

function demoBlock(ctx, p) {
  const d = p.demo;
  if (!d?.url) {
    return html`<div class="note"><p>${esc(p.demoNote)}</p>
      ${p.repo ? html`<p><a href="${esc(p.repo)}" target="_blank" rel="noopener">${icon.github}実行方法を GitHub で見る${icon.arrow}</a></p>` : ''}</div>`;
  }
  const open = html`<a class="btn btn-primary" href="${href(ctx, d.url)}" target="_blank" rel="noopener">${icon.play}${esc(d.label || 'デモを新しいタブで開く')}${icon.arrow}</a>`;
  if (!d.embed) {
    return html`<div class="demo-cta">${open}<p class="demo-host">${esc(hostOf(d.url))}</p>${d.note ? html`<p>${esc(d.note)}</p>` : ''}</div>`;
  }
  // クリックするまで iframe を読み込まない（重い WebGL などでページが遅くならないように）
  return html`<div class="demo-frame" style="aspect-ratio:${esc(d.aspect || '16 / 9')}" data-src="${href(ctx, d.url)}" data-title="${esc(d.label || p.title)}">
      <div class="demo-placeholder">
        <button type="button" class="btn btn-primary demo-load">${icon.play}ここでデモを読み込む</button>
        <p>外部サイト（${esc(hostOf(d.url))}）のコンテンツを表示します</p>
      </div>
    </div>
    <div class="demo-cta-row">
      <a href="${href(ctx, d.url)}" target="_blank" rel="noopener">新しいタブで開く${icon.arrow}</a>
      ${d.note ? html`<span>${esc(d.note)}</span>` : ''}
    </div>`;
}

// ===============================================================
//  資料
// ===============================================================
function talkRow(ctx, t) {
  const proj = t.project && ctx.projects.find((p) => p.slug === t.project);
  return html`<li class="talk reveal${t.date ? '' : ' no-date'}">
    ${t.date ? html`<time datetime="${esc(t.date)}">${formatDate(t.date)}</time>` : ''}
    <div class="talk-body">
      <h3>${t.body || t.href ? html`<a class="talk-link" href="${ctx.r(t.href || `talks/${t.slug}.html`)}">${esc(t.title)}</a>` : esc(t.title)}</h3>
      ${t.summary ? html`<p class="talk-note">${esc(t.summary)}</p>` : ''}
      <p class="talk-meta">${[t.event && esc(t.event), t.type && esc(t.type), proj && html`<a href="${ctx.r(`projects/${proj.slug}.html`)}">${esc(proj.title)}</a>`].filter(Boolean).join(' · ')}</p>
      ${t.note ? html`<p class="talk-note">${esc(t.note)}</p>` : ''}
      ${t.files?.length || t.links?.length ? html`<div class="files">
        ${(t.files || []).map((f) => fileLink(ctx, f))}
        ${(t.links || []).map((l) => html`<a class="file" href="${href(ctx, l.url)}"${ext(l.url)}><span class="file-ext">LINK</span><span class="file-label">${esc(l.label)}</span>${icon.arrow}</a>`)}
      </div>` : ''}
    </div>
  </li>`;
}

export function talkPage(ctx, t) {
  const ids = { prefix: 's', n: 0 };
  const body = markdown(t.body, { resolve: ctx.r, ids, blocks });
  const toc = [...body.matchAll(/<h2 id="([^"]+)">(.*?)<\/h2>/g)].map((m) => ({ id: m[1], label: m[2].replace(/<[^>]+>/g, '').replace(/^\d+\.\s*/, '') }));
  const proj = t.project && ctx.projects.find((p) => p.slug === t.project);

  return html`
<article class="project talk-page">
  <div class="wrap page-head">
    <nav class="crumbs" aria-label="パンくずリスト"><a href="${ctx.r('talks.html')}">${icon.left}資料</a></nav>
    <p class="project-meta">${t.date ? html`<time datetime="${esc(t.date)}">${formatDate(t.date)}</time>` : ''}${t.type ? html`<span>${esc(t.type)}</span>` : ''}${t.event ? html`<span>${esc(t.event)}</span>` : ''}</p>
    <h1>${esc(t.title)}</h1>
    ${t.subtitle ? html`<p class="title-en">${esc(t.subtitle)}</p>` : ''}
    ${t.summary ? html`<p class="lead">${esc(t.summary)}</p>` : ''}
    ${t.files?.length ? html`<div class="files">${t.files.map((f) => fileLink(ctx, f))}</div>` : ''}
  </div>
  <div class="wrap project-layout">
    <aside class="project-aside">
      ${proj ? html`<dl class="facts"><div><dt>関連プロジェクト</dt><dd><a href="${ctx.r(`projects/${proj.slug}.html`)}">${esc(proj.title)}</a></dd></div></dl>` : ''}
      ${toc.length > 2 ? html`<nav class="toc" aria-label="このページの目次">
        <p class="toc-title">目次</p>
        <ol>${toc.map((s) => html`<li><a href="#${s.id}">${s.label}</a></li>`)}</ol>
      </nav>` : ''}
    </aside>
    <div class="project-body"><div class="prose">${body}</div></div>
  </div>
</article>
`;
}

export function talksPage(ctx) {
  const byYear = {};
  const undated = ctx.talks.filter((t) => !t.date);
  for (const t of ctx.talks.filter((t) => t.date)) (byYear[t.date.slice(0, 4)] ||= []).push(t);
  const years = Object.keys(byYear).sort().reverse();

  return html`
<div class="wrap page-head">
  <p class="eyebrow">Materials</p>
  <h1>資料</h1>
  <p class="lead">開発の進め方をまとめた記事や、発表スライドなどの資料を公開しています。PDF はブラウザで開き、PowerPoint などはダウンロードされます。</p>
</div>
<section class="wrap section-tight">
  ${undated.length ? html`<ul class="talk-list">${undated.map((t) => talkRow(ctx, t))}</ul>` : ''}
  ${years.length || undated.length
    ? years.map((y) => html`<section class="year-group"><h2 class="year">${y}</h2><ul class="talk-list">${byYear[y].map((t) => talkRow(ctx, t))}</ul></section>`)
    : html`<div class="note"><p>公開中の資料はまだありません。発表後、順次ここに掲載します。</p></div>`}
</section>
`;
}

// ===============================================================
//  自己紹介
// ===============================================================
export function aboutPage(ctx) {
  const { site } = ctx;
  return html`
<div class="wrap page-head">
  <p class="eyebrow">About</p>
  <h1>自己紹介</h1>
</div>
<div class="wrap about">
  <div class="about-main">
    ${site.photo ? html`<img class="about-photo" src="${ctx.r(site.photo)}" alt="${esc(site.name)}の写真" width="160" height="160">` : ''}
    <p class="about-name">${esc(site.name)}${site.nameEn ? html`<span>${esc(site.nameEn)}</span>` : ''}</p>
    ${affiliationText(site) ? html`<p class="about-aff">${affiliationText(site)}</p>` : ''}
    <div class="prose">${md(ctx, site.about)}</div>
  </div>

  ${site.interests.length ? html`<section class="about-block" aria-labelledby="h-a-interests">
    <h2 id="h-a-interests">研究の関心</h2>
    <ul class="plain-list">${site.interests.map((it) => html`<li><strong>${esc(it.title)}</strong><span>${esc(it.body)}</span></li>`)}</ul>
  </section>` : ''}

  ${site.skills?.length ? html`<section class="about-block" aria-labelledby="h-skills">
    <h2 id="h-skills">使用している技術</h2>
    <dl class="skills">${site.skills.map((g) => html`<div><dt>${esc(g.group)}</dt><dd>${tags(g.items)}</dd></div>`)}</dl>
  </section>` : ''}

  ${site.timeline?.length ? html`<section class="about-block" aria-labelledby="h-timeline">
    <h2 id="h-timeline">経歴</h2>
    <dl class="timeline">${site.timeline.map((t) => html`<div><dt>${esc(t.period)}</dt><dd>${esc(t.text)}</dd></div>`)}</dl>
  </section>` : ''}

  ${site.links.length ? html`<section class="about-block" aria-labelledby="h-contact">
    <h2 id="h-contact">リンク</h2>
    <ul class="link-row">
      ${site.links.map((l) => html`<li><a class="btn btn-ghost" href="${esc(l.url)}"${ext(l.url)}>${linkIcon(l.label)}${esc(l.label)}${isExternal(l.url) ? icon.arrow : ''}</a></li>`)}
    </ul>
  </section>` : ''}
</div>
`;
}
