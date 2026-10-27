// リンクチェッカー（依存パッケージなし）
//
//   npm run check
//     → dist/ 内の全 HTML を調べ、サイト内リンク・画像・CSS・PDF などが
//       実在するか確認します（アップロード前の確認）。
//
//   npm run check:remote -- https://www.example.ac.jp/~name/
//     → アップロード後の公開サイトに実際にアクセスし、
//       全ページ・全ファイルが 200 で返るか確認します。
//       --external を付けると GitHub などの外部リンクも確認します。

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const args = process.argv.slice(2);
const remote = args.includes('--remote');
const checkExternal = args.includes('--external');

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]);
}

function extractRefs(htmlText) {
  const refs = [];
  const re = /\s(?:href|src|poster|data-src)="([^"]+)"/g;
  let m;
  while ((m = re.exec(htmlText))) refs.push(m[1].replace(/&amp;/g, '&'));
  return refs;
}

function extractIds(htmlText) {
  return new Set([...htmlText.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
}

const isSkippable = (u) => /^(mailto:|tel:|javascript:|data:)/.test(u) || u === '/__reload';

if (!fs.existsSync(path.join(DIST, 'index.html'))) {
  console.error('dist/ がありません。先に npm run build を実行してください。');
  process.exit(1);
}

const htmlFiles = walk(DIST).filter((f) => f.endsWith('.html'));
const problems = [];
const externals = new Set();
const internalTargets = new Set(); // dist からの相対パス

for (const file of htmlFiles) {
  const rel = path.relative(DIST, file).split(path.sep).join('/');
  const text = fs.readFileSync(file, 'utf8');
  const ids = extractIds(text);
  for (const ref of extractRefs(text)) {
    if (isSkippable(ref)) continue;
    if (/^https?:\/\//.test(ref) || ref.startsWith('//')) { externals.add(ref); continue; }
    if (ref.startsWith('/')) {
      problems.push(`${rel}: 絶対パス "${ref}" はサブディレクトリ配置で壊れます（相対パスにしてください）`);
      continue;
    }
    const [p, hash] = ref.split('#');
    if (!p) {
      if (hash && !ids.has(hash)) problems.push(`${rel}: ページ内リンク #${hash} の飛び先がありません`);
      continue;
    }
    const target = path.posix.normalize(path.posix.join(path.posix.dirname(rel), p.split('?')[0]));
    if (target.startsWith('..')) { problems.push(`${rel}: "${ref}" がサイトの外を指しています`); continue; }
    let decoded;
    try { decoded = decodeURIComponent(target); } catch { problems.push(`${rel}: "${ref}" の URL エンコードが正しくありません`); continue; }
    let abs = path.join(DIST, decoded);
    if (fs.existsSync(abs) && fs.statSync(abs).isDirectory()) abs = path.join(abs, 'index.html');
    if (!fs.existsSync(abs)) problems.push(`${rel}: "${ref}" が見つかりません`);
    else {
      internalTargets.add(path.relative(DIST, abs).split(path.sep).join('/'));
      if (hash && abs.endsWith('.html') && !extractIds(fs.readFileSync(abs, 'utf8')).has(hash)) {
        problems.push(`${rel}: "${ref}" のアンカー #${hash} がありません`);
      }
    }
  }
}

console.log(`ローカル確認: HTML ${htmlFiles.length} ページ、サイト内リンク先 ${internalTargets.size} 件、外部リンク ${externals.size} 件`);

async function head(url) {
  try {
    let res = await fetch(url, { method: 'HEAD', redirect: 'follow' });
    if (res.status === 405 || res.status === 403) res = await fetch(url, { redirect: 'follow' });
    return res.status;
  } catch (e) {
    return 'ERR ' + (e.cause?.code || e.message);
  }
}

async function main() {
  if (remote) {
    const baseArg = args.find((a) => /^https?:\/\//.test(a));
    if (!baseArg) {
      console.error('公開 URL を指定してください。例： npm run check:remote -- https://www.example.ac.jp/~name/');
      process.exit(1);
    }
    const base = baseArg.endsWith('/') ? baseArg : baseArg + '/';
    const all = new Set([...htmlFiles.map((f) => path.relative(DIST, f).split(path.sep).join('/')), ...internalTargets]);
    console.log(`\n公開サイトを確認中: ${base}（${all.size} 件）`);
    const list = [...all].sort();
    for (let i = 0; i < list.length; i += 8) {
      await Promise.all(list.slice(i, i + 8).map(async (p) => {
        const url = new URL(p.split('/').map(encodeURIComponent).join('/'), base).href;
        const status = await head(url);
        const ok = status === 200;
        console.log(`  ${ok ? '✓' : '✗'} ${status}  ${p}`);
        if (!ok) problems.push(`公開サイト: ${url} → ${status}`);
      }));
    }
  }

  if (checkExternal) {
    console.log(`\n外部リンクを確認中（${externals.size} 件）`);
    for (const url of externals) {
      const status = await head(url);
      const ok = typeof status === 'number' && status < 400;
      console.log(`  ${ok ? '✓' : '✗'} ${status}  ${url}`);
      if (!ok) problems.push(`外部リンク: ${url} → ${status}`);
    }
  }

  if (problems.length) {
    console.log(`\n✗ 問題が ${problems.length} 件見つかりました:`);
    problems.forEach((p) => console.log('  - ' + p));
    process.exit(1);
  }
  console.log('\n✓ リンク切れはありません');
}

main();
