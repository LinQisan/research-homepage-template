// =============================================================
//  静的サイトのビルドスクリプト（依存パッケージなし）
//  content/ と public/ を読み込み、dist/ に完成した HTML を出力します。
//  使い方： npm run build
// =============================================================

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { relTo, esc } from './lib/html.js';
import { layout } from './templates/layout.js';
import { homePage, projectsPage, projectPage, talksPage, talkPage, aboutPage } from './templates/pages.js';
import { presentationPage, parseScript } from './templates/presentation.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT = path.join(ROOT, 'content');
const PUBLIC = path.join(ROOT, 'public');
const ASSETS = path.join(ROOT, 'src/assets');
const DIST = path.join(ROOT, 'dist');

const warnings = [];
const errors = [];
const warn = (m) => warnings.push(m);
const fail = (m) => errors.push(m);

// import のキャッシュを避けて毎回最新の内容を読む（開発サーバー用）
async function load(file) {
  const url = pathToFileURL(file).href + `?t=${Date.now()}`;
  return (await import(url)).default;
}

function rimraf(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (entry.name === '.DS_Store' || entry.name === '.gitkeep') continue;
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

function write(rel, content) {
  const file = path.join(DIST, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

// ---------------------------------------------------------------
//  内容の読み込みと検証
// ---------------------------------------------------------------
async function loadContent() {
  const site = await load(path.join(CONTENT, 'site.js'));
  site.links ||= [];
  site.interests ||= [];
  if (!site.name || site.name === 'あなたの名前') warn('content/site.js: name（氏名）がまだ初期値のままです');

  const projDir = path.join(CONTENT, 'projects');
  const files = fs.readdirSync(projDir).filter((f) => f.endsWith('.js') && !f.startsWith('_'));
  const projects = [];
  const slugs = new Set();
  for (const f of files) {
    const p = await load(path.join(projDir, f));
    const where = `content/projects/${f}`;
    if (!p || typeof p !== 'object') { fail(`${where}: export default { ... } がありません`); continue; }
    if (p.draft) continue;
    for (const key of ['slug', 'title', 'summary']) if (!p[key]) fail(`${where}: ${key} は必須です`);
    if (p.slug && !/^[a-z0-9][a-z0-9-]*$/.test(p.slug)) fail(`${where}: slug は半角小文字・数字・ハイフンのみ使えます（${p.slug}）`);
    if (slugs.has(p.slug)) fail(`${where}: slug "${p.slug}" が重複しています`);
    slugs.add(p.slug);
    p.status ||= 'active';
    p.order ??= 100;
    for (const m of [p.cover, ...(p.media || [])].filter(Boolean)) {
      if (m.src) checkPublic(m.src, where);
      if (m.poster) checkPublic(m.poster, where);
      if (m.type !== 'youtube' && m.type !== 'video' && !m.alt) warn(`${where}: 画像 ${m.src} に alt（代替テキスト）がありません`);
    }
    for (const mat of p.materials || []) checkPublic(mat.file, where);
    projects.push(p);
  }
  projects.sort((a, b) => a.order - b.order || a.title.localeCompare(b.title, 'ja'));

  const talks = (await load(path.join(CONTENT, 'talks.js'))) || [];
  for (const t of talks) {
    if (t.date && !/^\d{4}-\d{2}(-\d{2})?$/.test(t.date)) fail(`content/talks.js: 「${t.title}」の date は YYYY-MM-DD 形式で書いてください`);
    for (const f of t.files || []) checkPublic(f.file, 'content/talks.js');
    if (t.project && !slugs.has(t.project)) warn(`content/talks.js: project "${t.project}" に一致するプロジェクトがありません`);
    // slug があれば content/talks/<slug>.md を本文として読み込み、詳細ページを作る
    if (t.slug) {
      if (!/^[a-z0-9][a-z0-9-]*$/.test(t.slug)) fail(`content/talks.js: slug は半角小文字・数字・ハイフンのみ使えます（${t.slug}）`);
      const mdFile = path.join(CONTENT, 'talks', `${t.slug}.md`);
      if (fs.existsSync(mdFile)) t.body = fs.readFileSync(mdFile, 'utf8');
      else fail(`content/talks.js: 「${t.title}」の本文 content/talks/${t.slug}.md が見つかりません`);
    }
  }
  // 日付なし（記事など）を先に、日付ありは新しい順に
  talks.sort((a, b) => (!!a.date - !!b.date) || String(b.date).localeCompare(String(a.date)));

  // ---- 発表（スライド＋原稿） ----
  const presFile = path.join(CONTENT, 'presentations.js');
  const presentations = fs.existsSync(presFile) ? (await load(presFile)) || [] : [];
  for (const pr of presentations) {
    const where = `content/presentations.js「${pr.title}」`;
    if (!/^[a-z0-9][a-z0-9-]*$/.test(pr.slug || '')) fail(`${where}: slug は半角小文字・数字・ハイフンのみ使えます`);
    const dir = path.join(ROOT, pr.slides || '');
    pr.images = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => /\.(jpe?g|png|webp)$/i.test(f)).sort() : [];
    if (!pr.images.length) fail(`${where}: スライド画像が ${pr.slides} にありません（npm run slides で作れます）`);
    const scriptFile = path.join(ROOT, pr.script || '');
    if (fs.existsSync(scriptFile)) pr.parsed = parseScript(fs.readFileSync(scriptFile, 'utf8'));
    else { warn(`${where}: 原稿 ${pr.script} が見つかりません`); pr.parsed = { intro: '', slides: {} }; }
    const n = Object.keys(pr.parsed.slides).length;
    if (n && n !== pr.images.length) warn(`${where}: スライド画像は ${pr.images.length} 枚、原稿は ${n} 枚分あります`);
    if (pr.pptx && !fs.existsSync(path.join(ROOT, pr.pptx))) fail(`${where}: ${pr.pptx} が見つかりません`);
    if (pr.listed) {
      talks.unshift({ title: pr.title, subtitle: pr.subtitle, type: 'スライドと原稿', summary: pr.summary || pr.subtitle, href: `presentations/${pr.slug}.html` });
    }
  }

  return { site, projects, talks, presentations };
}

function checkPublic(rel, where) {
  if (!rel || /^https?:\/\//.test(rel)) return;
  if (!fs.existsSync(path.join(PUBLIC, rel))) fail(`${where}: public/${rel} が見つかりません`);
  else if (/[^\x21-\x7e]/.test(rel)) warn(`${where}: ファイル名 "${rel}" に日本語や空白が含まれています。サーバーによっては開けないため、半角英数字をおすすめします`);
}

// ---------------------------------------------------------------
//  ビルド本体
// ---------------------------------------------------------------
export async function build({ dev = false, quiet = false } = {}) {
  warnings.length = 0;
  errors.length = 0;
  const t0 = Date.now();

  const { site, projects, talks, presentations } = await loadContent();
  if (errors.length) {
    errors.forEach((e) => console.error('  ✗ ' + e));
    throw new Error(`内容にエラーが ${errors.length} 件あります。修正してから再度ビルドしてください。`);
  }

  rimraf(DIST);
  copyDir(PUBLIC, DIST);

  // CSS / JS にはファイル内容のハッシュを付け、更新時にブラウザのキャッシュが残らないようにする
  const assets = {};
  for (const name of ['style.css', 'main.js']) {
    const buf = fs.readFileSync(path.join(ASSETS, name));
    const hash = crypto.createHash('md5').update(buf).digest('hex').slice(0, 8);
    write(`assets/${name}`, buf);
    assets[name.endsWith('.css') ? 'css' : 'js'] = `assets/${name}?v=${hash}`;
  }

  const now = new Date();
  const buildDate = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`;

  const svgCache = new Map();
  let svgCount = 0;
  const base = {
    site, projects, talks, assets, buildDate, dev,
    inlineSvg(src, alt) {
      if (!svgCache.has(src)) {
        svgCache.set(src, fs.readFileSync(path.join(PUBLIC, src), 'utf8').replace(/<\?xml[^>]*>\s*/, '').replace(/<!--[\s\S]*?-->\s*/g, ''));
      }
      // 同じ SVG を 1 ページに複数回入れても id が衝突しないようにする
      const n = ++svgCount;
      return svgCache.get(src)
        .replace(/\bid="([^"]+)"/g, `id="$1-${n}"`)
        .replace(/url\(#([^)]+)\)/g, `url(#$1-${n})`)
        .replace(/<svg\b/, `<svg role="img" aria-label="${esc(alt || '')}"`);
    },
    fileInfo(rel) {
      const name = path.basename(rel || '');
      const extension = path.extname(name).slice(1).toLowerCase();
      try {
        return { name, ext: extension, size: fs.statSync(path.join(PUBLIC, rel)).size };
      } catch {
        return { name, ext: extension, size: null };
      }
    },
  };

  const pages = [];
  const unlisted = new Set();
  const render = (page, navKey, meta, bodyFn) => {
    const ctx = { ...base, r: relTo(page), navKey };
    const body = bodyFn(ctx);
    write(page, layout(ctx, { ...meta, body, page }));
    pages.push(page);
    if (meta.noindex) unlisted.add(page);
  };

  render('index.html', 'home', {}, homePage);
  render('projects.html', 'projects', { title: 'プロジェクト' }, projectsPage);
  projects.forEach((p, i) => {
    render(`projects/${p.slug}.html`, 'projects', { title: p.title, description: p.summary }, (ctx) =>
      projectPage(ctx, p, { prev: projects[i - 1], next: projects[i + 1] }));
  });
  render('talks.html', 'talks', { title: '資料' }, talksPage);
  talks.filter((t) => t.body).forEach((t) => {
    render(`talks/${t.slug}.html`, 'talks', { title: t.title, description: t.summary }, (ctx) => talkPage(ctx, t));
  });
  render('about.html', 'about', { title: '自己紹介' }, aboutPage);

  for (const pr of presentations) {
    // スライド画像と PPTX をサイトにコピーする
    const imgDir = `presentations/${pr.slug}`;
    fs.mkdirSync(path.join(DIST, imgDir), { recursive: true });
    for (const f of pr.images) fs.copyFileSync(path.join(ROOT, pr.slides, f), path.join(DIST, imgDir, f));
    if (pr.pptx) {
      pr.download = `files/${pr.slug}.pptx`;
      fs.mkdirSync(path.join(DIST, 'files'), { recursive: true });
      fs.copyFileSync(path.join(ROOT, pr.pptx), path.join(DIST, pr.download));
      pr.downloadSize = fs.statSync(path.join(DIST, pr.download)).size;
    }
    render(`presentations/${pr.slug}.html`, 'talks', { title: pr.title, description: pr.subtitle, noindex: !pr.listed }, (ctx) => presentationPage(ctx, pr, imgDir));
  }

  if (site.siteUrl) {
    const baseUrl = site.siteUrl.replace(/\/?$/, '/');
    const urls = pages.filter((p) => !unlisted.has(p)).map((p) => `  <url><loc>${baseUrl}${p === 'index.html' ? '' : p}</loc></url>`).join('\n');
    write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`);
    write('robots.txt', `User-agent: *\nAllow: /\nSitemap: ${baseUrl}sitemap.xml\n`);
  }

  if (!quiet) {
    console.log(`✓ ${pages.length} ページを dist/ に出力しました（${Date.now() - t0} ms）`);
    pages.forEach((p) => console.log('    ' + p));
  }
  if (warnings.length) {
    console.warn(`\n⚠ 確認事項 ${warnings.length} 件:`);
    warnings.forEach((w) => console.warn('  - ' + w));
  }
  return { pages, warnings: [...warnings] };
}

// `node src/build.js` で直接実行された場合
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  build({ dev: process.argv.includes('--dev') }).catch((e) => {
    console.error('\n✗ ビルド失敗: ' + e.message);
    process.exit(1);
  });
}
