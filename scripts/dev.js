// 開発用：ファイルを保存すると自動で再ビルドし、ブラウザを再読み込みします。
//   npm run dev  → http://localhost:4321/

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { serve } from './serve.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const clients = new Set();

function rebuild() {
  // テンプレートの変更も確実に反映させるため、毎回別プロセスでビルドする
  const r = spawnSync(process.execPath, ['src/build.js', '--dev'], { cwd: ROOT, stdio: 'inherit' });
  if (r.status === 0) for (const res of clients) res.write('data: reload\n\n');
}

rebuild();

serve({
  port: Number(process.env.PORT || 4321),
  onRequest(req, res) {
    if (req.url !== '/__reload') return false;
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
    res.write(': connected\n\n');
    clients.add(res);
    req.on('close', () => clients.delete(res));
    return true;
  },
});

let timer;
function onChange(label) {
  return (_, file) => {
    if (file && /\.DS_Store$/.test(file)) return;
    clearTimeout(timer);
    timer = setTimeout(() => {
      console.log(`\n↻ 変更を検出: ${label}/${file || ''}`);
      rebuild();
    }, 120);
  };
}

// Linux の Node.js 18 は recursive に対応しないため、フォルダーごとに監視する
function watchTree(dir, label) {
  try {
    fs.watch(dir, { recursive: true }, onChange(label));
  } catch {
    fs.watch(dir, onChange(label));
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.isDirectory()) watchTree(path.join(dir, e.name), `${label}/${e.name}`);
    }
  }
}

for (const dir of ['content', 'src', 'public']) watchTree(path.join(ROOT, dir), dir);
console.log('  ファイルの変更を監視しています…');
