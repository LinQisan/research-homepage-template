// HTML 生成用の小さなヘルパー

export function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// タグ付きテンプレート：配列は連結、null/false は空文字
export function html(strings, ...values) {
  let out = strings[0];
  values.forEach((v, i) => {
    out += flat(v) + strings[i + 1];
  });
  return out;
}

function flat(v) {
  if (v == null || v === false || v === true) return '';
  if (Array.isArray(v)) return v.map(flat).join('');
  return String(v);
}

/**
 * ページの位置から見た相対パスを返す関数を作る。
 * すべてのリンクを相対パスにすることで、ドメイン直下でも
 * サブディレクトリ（例 /~name/site/）でも、そのまま動作する。
 *
 *   const r = relTo('projects/foo.html');
 *   r('assets/style.css')  // => '../assets/style.css'
 */
export function relTo(pagePath) {
  const depth = pagePath.split('/').length - 1;
  const prefix = depth ? '../'.repeat(depth) : '';
  return (target) => {
    if (!target) return target;
    if (/^([a-z]+:|#|\/\/)/i.test(target)) return target; // 外部URL・mailto・アンカー
    const clean = target.replace(/^\.?\//, '');
    return prefix + clean || './';
  };
}

export function isExternal(url) {
  return /^https?:\/\//.test(url || '');
}

export function formatBytes(n) {
  if (n == null) return '';
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 ** 2).toFixed(1)} MB`;
}

export function formatDate(iso) {
  const m = String(iso || '').match(/^(\d{4})-(\d{2})(?:-(\d{2}))?/);
  if (!m) return iso || '';
  return m[3] ? `${m[1]}年${+m[2]}月${+m[3]}日` : `${m[1]}年${+m[2]}月`;
}
