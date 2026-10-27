// 依存パッケージなしの小さな Markdown 変換器。
// 対応：見出し(### 〜)、段落、箇条書き、番号付きリスト、表、引用、コードブロック（```）、
//       **太字**、*斜体*、`コード`、[リンク](url)、![画像](src)
// HTML の直接記述はエスケープされます（安全のため）。

import { esc } from './html.js';

const CJK = /[　-ヿ㐀-鿿＀-￯]/;

// 日本語の行同士は空白なしで連結し、英語の行同士は空白で連結する
function joinLines(lines) {
  return lines.reduce((acc, line) => {
    if (!acc) return line;
    const a = acc.at(-1);
    const b = line[0];
    return acc + (CJK.test(a) || CJK.test(b) ? '' : ' ') + line;
  }, '');
}

function inline(text, opt) {
  const resolve = opt.resolve || ((u) => u);
  const codes = [];
  let s = text.replace(/`([^`]+)`/g, (_, c) => {
    codes.push(`<code>${esc(c)}</code>`);
    return `\u0000${codes.length - 1}\u0000`;
  });
  s = esc(s);
  s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_, alt, src) =>
    `<img src="${esc(resolve(unesc(src)))}" alt="${alt}" loading="lazy">`);
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, href) => {
    const url = unesc(href);
    const ext = /^https?:\/\//.test(url);
    return `<a href="${esc(ext ? url : resolve(url))}"${ext ? ' target="_blank" rel="noopener"' : ''}>${label}</a>`;
  });
  s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(^|[^*])\*([^*\s][^*]*?)\*/g, '$1<em>$2</em>');
  s = s.replace(/\u0000(\d+)\u0000/g, (_, i) => codes[i]);
  return s;
}

function unesc(s) {
  return s.replace(/&amp;/g, '&');
}

function splitRow(line) {
  return line.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
}

export function markdown(src, opt = {}) {
  if (!src) return '';
  const lines = src.replace(/\r\n?/g, '\n').trim().split('\n').map((l) => l.replace(/\s+$/, ''));
  const out = [];
  const hBase = opt.headingBase ?? 0; // ### を h3 のまま使う場合は 0
  let i = 0;

  const isBlockStart = (l) =>
    /^```/.test(l) || /^#{1,6}\s/.test(l) || /^\s*[-*]\s+/.test(l) || /^\s*\d+[.)]\s+/.test(l) || /^>\s?/.test(l) || /^\|/.test(l);

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }

    let m;
    if ((m = line.match(/^```\s*([\w-]*)\s*(.*)$/))) {
      // ```名前 引数 … ``` のブロック。opt.blocks に同名の部品があればそれで描画（グラフ・図など）
      const [, name, arg] = m;
      const buf = [];
      i++;
      while (i < lines.length && !/^```\s*$/.test(lines[i])) buf.push(lines[i++]);
      i++;
      const renderer = opt.blocks?.[name];
      out.push(renderer
        ? renderer(buf.join('\n'), arg, (s) => inline(s, opt), { resolve: opt.resolve || ((u) => u) })
        : `<pre><code${name ? ` class="lang-${esc(name)}"` : ''}>${esc(buf.join('\n'))}</code></pre>`);
    } else if ((m = line.match(/^(#{1,6})\s+(.*)$/))) {
      const level = Math.min(6, m[1].length + hBase);
      // opt.ids があれば ## 見出しに id を振る（目次用）
      const id = opt.ids && level === 2 ? ` id="${opt.ids.prefix}${++opt.ids.n}"` : '';
      out.push(`<h${level}${id}>${inline(m[2], opt)}</h${level}>`);
      i++;
    } else if (/^\|/.test(line) && lines[i + 1] && /^\|?\s*:?-{3,}/.test(lines[i + 1])) {
      const head = splitRow(line);
      const aligns = splitRow(lines[i + 1]).map((c) =>
        c.startsWith(':') && c.endsWith(':') ? 'center' : c.endsWith(':') ? 'right' : '');
      i += 2;
      const rows = [];
      while (i < lines.length && /^\|/.test(lines[i])) rows.push(splitRow(lines[i++]));
      const cell = (tag, c, k) => `<${tag}${aligns[k] ? ` style="text-align:${aligns[k]}"` : ''}>${inline(c, opt)}</${tag}>`;
      out.push(
        `<div class="table-wrap"><table><thead><tr>${head.map((c, k) => cell('th', c, k)).join('')}</tr></thead>` +
          `<tbody>${rows.map((r) => `<tr>${r.map((c, k) => cell('td', c, k)).join('')}</tr>`).join('')}</tbody></table></div>`
      );
    } else if (/^\s*([-*]|\d+[.)])\s+/.test(line)) {
      const ordered = /^\s*\d/.test(line);
      const items = [];
      while (i < lines.length && lines[i].trim()) {
        const lm = lines[i].match(/^\s*(?:[-*]|\d+[.)])\s+(.*)$/);
        if (lm) items.push([lm[1]]);
        else items.at(-1).push(lines[i].trim()); // 継続行
        i++;
      }
      const tag = ordered ? 'ol' : 'ul';
      out.push(`<${tag}>${items.map((it) => `<li>${inline(joinLines(it), opt)}</li>`).join('')}</${tag}>`);
    } else if (/^>\s?/.test(line)) {
      const buf = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) buf.push(lines[i++].replace(/^>\s?/, ''));
      out.push(`<blockquote>${markdown(buf.join('\n'), opt)}</blockquote>`);
    } else {
      const buf = [];
      while (i < lines.length && lines[i].trim() && !(buf.length && isBlockStart(lines[i]))) buf.push(lines[i++].trim());
      out.push(`<p>${inline(joinLines(buf), opt)}</p>`);
    }
  }
  return out.join('\n');
}

// 要約などで使う：Markdown 記号を取り除いたプレーンテキスト
export function plain(src) {
  return (src || '').replace(/[*`#>]/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/\s+/g, ' ').trim();
}
