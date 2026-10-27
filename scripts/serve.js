// dist/ を配信する簡易サーバー（確認用）。依存パッケージなし。
//   npm run preview                 → http://localhost:4321/
//   npm run preview:sub             → http://localhost:4321/~lab/site/ （サブディレクトリ配置の確認）
//   node scripts/serve.js --port 8080 --base /foo/

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.gif': 'image/gif', '.webp': 'image/webp', '.avif': 'image/avif', '.ico': 'image/x-icon', '.mp4': 'video/mp4',
  '.webm': 'video/webm', '.pdf': 'application/pdf', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation', '.ppt': 'application/vnd.ms-powerpoint',
  '.zip': 'application/zip', '.woff2': 'font/woff2',
};

export function serve({ port = 4321, base = '/', onRequest } = {}) {
  base = '/' + base.replace(/^\/|\/$/g, '') + '/';
  base = base.replace('//', '/');

  const server = http.createServer((req, res) => {
    if (onRequest && onRequest(req, res)) return;
    let url;
    try { url = decodeURIComponent(req.url.split('?')[0]); } catch { res.writeHead(400); return res.end(); }
    if (!url.startsWith(base)) {
      res.writeHead(302, { Location: base });
      return res.end();
    }
    let file = path.join(DIST, url.slice(base.length));
    if (file !== DIST && !file.startsWith(DIST + path.sep)) { res.writeHead(403); return res.end(); }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    fs.stat(file, (err, st) => {
      if (err) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        console.log(`  404 ${url}`);
        return res.end('404 Not Found: ' + url);
      }
      const type = TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': type, 'Content-Length': st.size, 'Cache-Control': 'no-cache' });
      fs.createReadStream(file).pipe(res);
    });
  });
  server.listen(port, () => {
    console.log(`\n  ▶ http://localhost:${port}${base}\n  （終了するには Ctrl + C）\n`);
  });
  return server;
}

if (path.resolve(process.argv[1] || '') === fileURLToPath(import.meta.url)) {
  const arg = (name, def) => {
    const i = process.argv.indexOf(name);
    return i > -1 ? process.argv[i + 1] : def;
  };
  if (!fs.existsSync(path.join(DIST, 'index.html'))) {
    console.error('dist/ がありません。先に npm run build を実行してください。');
    process.exit(1);
  }
  serve({ port: Number(arg('--port', 4321)), base: arg('--base', '/') });
}
