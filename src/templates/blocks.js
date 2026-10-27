// Markdown の ```名前 … ``` ブロックで使える部品（動きのある図・グラフ）
//
//   ```chart タイトル            横棒グラフ（* で始まる行は強調）
//   max: 100
//   note: 注記
//   * モデル名 | 69.97
//   モデル名 | 58.2
//   ```
//
//   ```steps                     順番に光るサイクル図（1 行 = 1 ステップ）
//   ```diagram workflow          AGENTS.md と Unity CLI の関係図（つなぎ方を切り替え）

import { esc } from '../lib/html.js';

function chart(src, title, inline) {
  const opts = { max: 100, unit: '%', note: '' };
  const rows = [];
  for (const raw of src.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    const kv = line.match(/^(max|unit|note):\s*(.*)$/);
    if (kv) { opts[kv[1]] = kv[2]; continue; }
    const hi = line.startsWith('*');
    const [label, value] = line.replace(/^\*\s*/, '').split('|').map((s) => s.trim());
    rows.push({ label, raw: value, value: Number(value), hi });
  }
  const max = Number(opts.max) || Math.max(...rows.map((r) => r.value));
  return `<figure class="chart">
  ${title ? `<figcaption class="chart-title">${inline(title)}</figcaption>` : ''}
  <ul>${rows.map((r) => `
    <li${r.hi ? ' class="hi"' : ''}><span class="bar-label">${inline(r.label)}</span><span class="bar-track"><span class="bar" style="--v:${(r.value / max).toFixed(4)}"></span></span><span class="bar-val">${esc(r.raw)}${esc(opts.unit)}</span></li>`).join('')}
  </ul>
  ${opts.note ? `<p class="chart-note">${inline(opts.note)}</p>` : ''}
</figure>`;
}

function steps(src, _arg, inline) {
  const items = src.split('\n').map((s) => s.trim()).filter(Boolean);
  return `<ol class="cycle" style="--n:${items.length}">${items
    .map((s, i) => `<li style="--i:${i}"><span class="cycle-num">${i + 1}</span><span>${inline(s)}</span></li>`)
    .join('')}</ol>`;
}

// ---- 関係図：あなた・指示書・AI・Unity -------------------------------------
function workflow() {
  const node = (x, y, w, h, label, sub, cls = '') => `
    <g class="node ${cls}">
      <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10"/>
      <text x="${x + w / 2}" y="${y + h / 2 - (sub ? 4 : -5)}" text-anchor="middle" class="node-label">${label}</text>
      ${sub ? `<text x="${x + w / 2}" y="${y + h / 2 + 16}" text-anchor="middle" class="node-sub">${sub}</text>` : ''}
    </g>`;
  return `<figure class="flow" data-mode="off">
  <div class="flow-switch" role="group" aria-label="Unity とのつなぎ方を切り替え">
    <button type="button" data-mode-set="off" aria-pressed="true">直接つながない</button>
    <button type="button" data-mode-set="on" aria-pressed="false">Unity CLI でつなぐ</button>
  </div>
  <div class="flow-canvas"><svg viewBox="0 -40 720 380" role="img" aria-label="あなたが AGENTS.md を書き、AI がそれを読んで Unity で作業する関係図。Unity CLI でつなぐと、AI が Unity を直接操作・確認できる。">
    <defs>
      <marker id="fa" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 10 5 0 10z" class="arrow-head"/></marker>
      <marker id="fb" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 10 5 0 10z" class="arrow-head hot"/></marker>
    </defs>

    <!-- 常にある線：あなた → 指示書 → AI -->
    <g class="edge">
      <path d="M142 150H196" marker-end="url(#fa)"/><path d="M169 116V142" stroke-dasharray="2 3"/>
      <path class="flowing" d="M332 150H386" marker-end="url(#fa)"/><path d="M359 116V142" stroke-dasharray="2 3"/>
    </g>
    <text x="169" y="110" class="edge-label" text-anchor="middle">書く・直す</text>
    <text x="359" y="110" class="edge-label" text-anchor="middle">毎回読む</text>

    <!-- MCP なし：人が中継する -->
    <g class="only-off">
      <g class="edge hot">
        <path class="flowing" d="M450 118 C450 -30 80 -30 80 116" marker-end="url(#fb)"/>
        <path class="flowing" d="M80 184 C80 330 640 330 640 184" marker-start="url(#fb)" marker-end="url(#fb)"/>
      </g>
      <text x="265" y="-16" class="edge-label hot" text-anchor="middle">コード・回答を受け取る</text>
      <text x="360" y="320" class="edge-label hot" text-anchor="middle">手で貼り付け・結果を言葉で報告</text>
      <path d="M512 150H578" class="edge-none"/>
      <text x="545" y="138" class="edge-label" text-anchor="middle">×</text>
    </g>

    <!-- MCP あり：AI が直接 Unity を操作・確認 -->
    <g class="only-on">
      <g class="edge hot">
        <path class="flowing" d="M512 141H576" marker-end="url(#fb)"/>
        <path class="flowing" d="M578 159H514" marker-end="url(#fb)"/>
      </g>
      <text x="545" y="130" class="edge-label hot" text-anchor="middle">CLI</text>
      <g class="edge">
        <path d="M640 184 C640 330 80 330 80 184" stroke-dasharray="5 6" marker-end="url(#fa)"/>
      </g>
      <text x="360" y="320" class="edge-label" text-anchor="middle">結果だけを見る</text>
    </g>

    ${node(20, 120, 120, 60, 'あなた', '上司・ディレクター')}
    ${node(200, 128, 130, 44, 'AGENTS.md', '', 'doc')}
    ${node(390, 120, 120, 60, 'AI', 'Codex・Claude Code', 'ai')}
    ${node(580, 120, 120, 60, 'Unity', 'エディタ')}
  </svg></div>
  <figcaption>
    <span class="only-off">直接つながない場合：AI と Unity の間を人が中継する。往復のたびに時間がかかり、伝達の損失も生まれる。</span>
    <span class="only-on">Unity CLI でつなぐ場合：AI が自分で「作る → 確かめる → 直す」を回す。人は指示書を整え、結果を見ることに集中できる。</span>
  </figcaption>
</figure>`;
}

// ---- かかる時間の比較（横に並ぶ帯） -------------------------------------
//   ```timeline タイトル
//   note: 注記
//   Quest で確認 | 変更 2 | ビルド 10 | 入れる 3 | 確認 5
//   Web で確認 | 変更 2 | 再読み込み 1 | 確認 2
//   ```
function timeline(src, title, inline) {
  let note = '';
  const rows = [];
  for (const raw of src.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    const kv = line.match(/^note:\s*(.*)$/);
    if (kv) { note = kv[1]; continue; }
    const [label, ...segs] = line.split('|').map((x) => x.trim());
    rows.push({
      label,
      segs: segs.map((seg) => {
        const m = seg.match(/^(.*?)\s+([\d.]+)$/);
        return { name: m ? m[1] : seg, size: m ? Number(m[2]) : 1 };
      }),
    });
  }
  const max = Math.max(...rows.map((r) => r.segs.reduce((n, x) => n + x.size, 0)));
  let k = 0;
  return `<figure class="timeline">
  ${title ? `<figcaption class="chart-title">${inline(title)}</figcaption>` : ''}
  ${rows.map((r) => `<div class="tl-row">
    <span class="tl-label">${inline(r.label)}</span>
    <span class="tl-track">${r.segs.map((x) => `<span class="tl-seg" title="${esc(x.name)}" style="--w:${((x.size / max) * 100).toFixed(2)}%;--k:${k++}">${inline(x.name)}</span>`).join('')}</span>
  </div>`).join('\n  ')}
  ${note ? `<p class="chart-note">${inline(note)}</p>` : ''}
</figure>`;
}

// ---- コミット履歴（git log 風） ----------------------------------------
//   ```commits
//   v0.1.0 | 最初のデモ版        ← 「v」で始まる行はリリース（版番号）として目立たせる
//   車が右から来るシナリオを追加
//   ```
function commits(src, _arg, inline) {
  const items = src.split('\n').map((x) => x.trim()).filter(Boolean);
  return `<ol class="commits">${items
    .map((line, i) => {
      const [a, b] = line.split('|').map((x) => x.trim());
      const tag = b !== undefined;
      return `<li class="${tag ? 'tagged' : ''}" style="--i:${i}"><span class="c-dot"></span>${
        tag ? `<span class="c-tag">${esc(a)}</span><span class="c-msg">${inline(b)}</span>` : `<span class="c-msg">${inline(a)}</span>`
      }</li>`;
    })
    .join('')}</ol>`;
}

// ---- 埋め込みデモ（クリックしてから読み込む） -------------------------------
//   ```embed demos/crossing/index.html 16/9
//   キャプション
//   ```
function embed(src, arg, inline, ctx) {
  const [url, aspect = '16/9'] = arg.trim().split(/\s+/);
  const href = /^https?:/.test(url) ? url : ctx.resolve(url);
  const caption = src.trim();
  return `<figure class="embed-block">
  <div class="demo-frame" style="aspect-ratio:${esc(aspect.replace('/', ' / '))}" data-src="${esc(href)}" data-title="${esc(caption || 'デモ')}">
    <div class="demo-placeholder">
      <button type="button" class="btn btn-primary demo-load">▶ ここで動かしてみる</button>
      <p>クリックすると、このページの中でデモが動きます</p>
    </div>
  </div>
  <div class="demo-cta-row"><a href="${esc(href)}" target="_blank" rel="noopener">新しいタブで開く ↗</a>${caption ? `<span>${inline(caption)}</span>` : ''}</div>
</figure>`;
}

// ---- 関係図：Git と GitHub -----------------------------------------------
function git() {
  const box = (x, y, w, h, label, sub, cls = '') => `
    <g class="node ${cls}">
      <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10"/>
      <text x="${x + w / 2}" y="${y + 26}" text-anchor="middle" class="node-label">${label}</text>
      ${sub ? `<text x="${x + w / 2}" y="${y + 46}" text-anchor="middle" class="node-sub">${sub}</text>` : ''}
    </g>`;
  return `<figure class="flow git-flow">
  <div class="flow-canvas"><svg viewBox="0 0 720 250" role="img" aria-label="自分のパソコンの中で、作業フォルダの変更をコミットして履歴に記録し、プッシュで GitHub に送る流れの図">
    <defs>
      <marker id="ga" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 10 5 0 10z" class="arrow-head hot"/></marker>
    </defs>
    <rect x="10" y="10" width="440" height="230" rx="14" class="area"/>
    <text x="30" y="38" class="area-label">自分のパソコン（Git）</text>
    <rect x="490" y="10" width="220" height="230" rx="14" class="area cloud"/>
    <text x="510" y="38" class="area-label">インターネット上（GitHub）</text>

    ${box(30, 90, 150, 70, '作業フォルダ', 'ファイルを編集する')}
    ${box(270, 90, 160, 70, '履歴（コミット）', '「記録」が積み重なる', 'doc')}
    ${box(510, 90, 180, 70, 'GitHub の保管庫', 'どこからでも見られる', 'ai')}

    <g class="edge hot">
      <path class="flowing" d="M182 125H266" marker-end="url(#ga)"/>
      <path class="flowing" d="M432 125H506" marker-end="url(#ga)"/>
      <path class="flowing back" d="M600 164 C600 225 105 225 105 164" marker-end="url(#ga)"/>
    </g>
    <text x="224" y="113" class="edge-label hot" text-anchor="middle">commit</text>
    <text x="224" y="146" class="edge-label" text-anchor="middle">記録する</text>
    <text x="469" y="113" class="edge-label hot" text-anchor="middle">push</text>
    <text x="469" y="146" class="edge-label" text-anchor="middle">送る</text>
    <text x="352" y="222" class="edge-label" text-anchor="middle">pull（別のパソコンで受け取る）</text>

    <g class="packets">
      <circle r="5" class="packet"><animateMotion dur="3.2s" repeatCount="indefinite" path="M182 125H266"/></circle>
      <circle r="5" class="packet"><animateMotion dur="3.2s" begin="1.6s" repeatCount="indefinite" path="M432 125H506"/></circle>
    </g>
    <g class="stack">
      <circle cx="300" cy="182" r="5"/><circle cx="320" cy="182" r="5"/><circle cx="340" cy="182" r="5"/><circle cx="360" cy="182" r="5"/><circle cx="380" cy="182" r="5"/>
      <path d="M300 182H380"/>
    </g>
  </svg></div>
  <figcaption>覚えるのは「コミット（記録する）」と「プッシュ（送る）」の 2 つだけ。別のパソコンで続きをするときは「プル（受け取る）」を使います。</figcaption>
</figure>`;
}

// ---- X（旧 Twitter）のポスト：クリックしてから読み込む -------------------------
//   ```xpost
//   url: https://x.com/ユーザー名/status/123
//   model: Claude Opus 5.5
//   author: 投稿した人
//   text: どんなポストかの説明（自分のことばで）
//   ---                      ← 「---」で区切ると、横に並べて表示
//   url: ...
//   ```
function xpost(src, _arg, inline) {
  const posts = src.split(/^\s*---\s*$/m).map((chunk) => {
    const f = {};
    for (const line of chunk.split('\n')) {
      const m = line.trim().match(/^(url|model|author|text):\s*(.*)$/);
      if (m) f[m[1]] = m[2];
    }
    return f;
  }).filter((f) => f.url);
  // X の埋め込み用の形（blockquote.twitter-tweet）で出力し、ページを開いたときに自動で表示する。
  // X のスクリプトが読み込めない場合でも、説明とリンクはそのまま読める。
  const card = (f) => {
    const href = f.url.replace('//x.com/', '//twitter.com/');
    return `<figure class="xpost">
    <blockquote class="twitter-tweet xpost-card" data-dnt="true" data-lang="ja">
      ${f.model ? `<span class="xpost-model">${inline(f.model)}</span>` : ''}
      <p class="xpost-text">${inline(f.text || '')}</p>
      <p class="xpost-author">${f.author ? `${inline(f.author)} さんのポスト（X）` : 'X のポスト'} — <a href="${esc(href)}">X で見る</a></p>
    </blockquote>
  </figure>`;
  };
  return `<div class="xposts">${posts.map(card).join('')}</div>`;
}

// ---- ものさし（左右の両端の間で、どこに位置するか） ---------------------------
//   ```spectrum 左はし | 右はし
//   項目 | 説明
//   * 強調する項目 | 説明
//   ```
function spectrum(src, arg, inline) {
  const [left, right] = arg.split('|').map((x) => x.trim());
  const items = src.split('\n').map((x) => x.trim()).filter(Boolean).map((line) => {
    const hi = line.startsWith('*');
    const [name, desc] = line.replace(/^\*\s*/, '').split('|').map((x) => x.trim());
    return { name, desc, hi };
  });
  return `<figure class="spectrum" style="--n:${items.length}">
  ${left || right ? `<div class="sp-ends"><span>← ${inline(left || '')}</span><span>${inline(right || '')} →</span></div>` : ''}
  <div class="sp-line" aria-hidden="true"></div>
  <ol>${items.map((it) => `<li${it.hi ? ' class="hi"' : ''}><span class="sp-dot"></span><strong>${inline(it.name)}</strong>${it.desc ? `<span>${inline(it.desc)}</span>` : ''}</li>`).join('')}</ol>
</figure>`;
}

// ---- 折りたたみ（長いプロンプトなど） -----------------------------------------
//   ```details 見出し
//   中身（そのまま等幅で表示）
//   ```
function details(src, title, inline) {
  return `<details class="fold">
  <summary>${inline(title.trim() || 'くわしく見る')}</summary>
  <pre><code>${esc(src)}</code></pre>
</details>`;
}

// ---- 画像（キャプション付き） ----------------------------------------------
//   ```figure images/xxx.jpg | 代替テキスト
//   キャプション
//   ```
function figure(src, arg, inline, ctx) {
  const [path, alt = ''] = arg.split('|').map((x) => x.trim());
  const cap = src.trim();
  return `<figure class="media figure-block"><img src="${esc(ctx.resolve(path))}" alt="${esc(alt)}" loading="lazy" decoding="async">${cap ? `<figcaption>${inline(cap)}</figcaption>` : ''}</figure>`;
}

// ---- 比べる（左右にドラッグして前と後を比べる） --------------------------------
//   ```compare 前のラベル | 後のラベル
//   images/before.jpg | images/after.jpg
//   キャプション
//   ```
function compare(src, arg, inline, ctx) {
  const [lb = '前', la = '後'] = arg.split('|').map((x) => x.trim());
  const lines = src.split('\n').map((x) => x.trim()).filter(Boolean);
  const [before, after] = (lines.shift() || '').split('|').map((x) => x.trim());
  const cap = lines.join(' ');
  return `<figure class="compare" style="--pos:50%">
  <div class="cmp-stage">
    <img src="${esc(ctx.resolve(before))}" alt="${esc(lb)}" loading="lazy" decoding="async">
    <img class="cmp-after" src="${esc(ctx.resolve(after))}" alt="${esc(la)}" loading="lazy" decoding="async">
    <span class="cmp-label cmp-l">${inline(lb)}</span><span class="cmp-label cmp-r">${inline(la)}</span>
    <span class="cmp-handle" aria-hidden="true"></span>
    <input type="range" min="0" max="100" value="50" aria-label="左右に動かして「${esc(lb)}」と「${esc(la)}」を比べる">
  </div>
  ${cap ? `<figcaption>${inline(cap)}</figcaption>` : ''}
</figure>`;
}

const diagrams = { workflow, git };

export const blocks = {
  chart,
  steps,
  timeline,
  commits,
  embed,
  xpost,
  spectrum,
  details,
  figure,
  compare,
  diagram: (_src, name) => (diagrams[name.trim()] ? diagrams[name.trim()]() : ''),
};
