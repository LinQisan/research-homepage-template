// サイト共通の小さなスクリプト（JavaScript が無効でも内容はすべて読めます）
(function () {
  var root = document.documentElement;

  // ---- ライト／ダーク切り替え ----
  var toggle = document.querySelector('.theme-toggle');
  if (toggle) {
    toggle.addEventListener('click', function () {
      var current = root.dataset.theme ||
        (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
      var next = current === 'dark' ? 'light' : 'dark';
      root.dataset.theme = next;
      try { localStorage.setItem('theme', next); } catch (e) {}
    });
  }

  // ---- スクロール時にヘッダーへ境界線 ----
  var header = document.querySelector('.site-header');
  if (header) {
    var onScroll = function () { header.classList.toggle('scrolled', window.scrollY > 8); };
    addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // ---- デモ埋め込み：クリックしてから iframe を読み込む ----
  document.querySelectorAll('.demo-frame').forEach(function (frame) {
    var btn = frame.querySelector('.demo-load');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var iframe = document.createElement('iframe');
      iframe.src = frame.dataset.src;
      iframe.title = frame.dataset.title || 'デモ';
      iframe.allow = 'fullscreen; xr-spatial-tracking; gamepad; autoplay';
      iframe.allowFullscreen = true;
      frame.replaceChildren(iframe);
      iframe.focus();
    });
  });

  // ---- 関係図：MCP の有無を切り替え ----
  document.querySelectorAll('.flow').forEach(function (fig) {
    fig.addEventListener('click', function (e) {
      var b = e.target.closest('[data-mode-set]');
      if (!b) return;
      fig.dataset.mode = b.dataset.modeSet;
      fig.querySelectorAll('[data-mode-set]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
    });
  });

  // ---- X のポスト：ページを開いたら、そのまま埋め込みを表示する ----
  var tweets = document.querySelectorAll('blockquote.twitter-tweet');
  if (tweets.length) {
    var dark = (root.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')) === 'dark';
    tweets.forEach(function (bq) { if (dark) bq.setAttribute('data-theme', 'dark'); });
    var xs = document.createElement('script');
    xs.src = 'https://platform.twitter.com/widgets.js';
    xs.async = true;
    document.head.appendChild(xs);
  }

  // ---- コードブロックに「コピー」ボタン ----
  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).catch(function () { return copyLegacy(text); });
    }
    return copyLegacy(text);
  }
  // http のページや、クリップボードの使用が許可されていないときの古い方法
  function copyLegacy(text) {
    return new Promise(function (resolve, reject) {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) {}
      ta.remove();
      ok ? resolve() : reject();
    });
  }
  document.querySelectorAll('.prose pre').forEach(function (pre) {
    var code = pre.querySelector('code') || pre;
    var wrap = document.createElement('div');
    wrap.className = 'code-wrap';
    pre.parentNode.insertBefore(wrap, pre);
    wrap.appendChild(pre);
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'code-copy';
    btn.textContent = 'コピー';
    btn.setAttribute('aria-label', 'コードをコピー');
    var timer = 0;
    btn.addEventListener('click', function () {
      copyText(code.textContent).then(function () {
        btn.textContent = 'コピーしました';
      }, function () {
        btn.textContent = 'コピーできませんでした';
      });
      clearTimeout(timer);
      timer = setTimeout(function () { btn.textContent = 'コピー'; }, 2000);
    });
    wrap.appendChild(btn);
  });

  // ---- 前と後を比べるスライダー ----
  document.querySelectorAll('.compare').forEach(function (fig) {
    var range = fig.querySelector('input[type=range]');
    if (!range) return;
    range.addEventListener('input', function () { fig.style.setProperty('--pos', range.value + '%'); });
  });

  // ---- 発表モード（スライド＋原稿）と、スライドだけの別ウインドウ ----
  var deckData = document.getElementById('deck-data');
  if (deckData) {
    var slides = JSON.parse(deckData.textContent);
    var total = slides.length;
    var deck = document.querySelector('.deck');
    var slug = deck ? deck.dataset.slug : 'deck';
    var channel = 'BroadcastChannel' in window ? new BroadcastChannel('deck-' + slug) : null;
    var params = new URLSearchParams(location.search);
    var current = 1;

    // 画像を先に読み込んでおき、切りかえを速くする
    slides.forEach(function (s) { var im = new Image(); im.src = s.img; });

    function clamp(n) { return Math.max(1, Math.min(total, n)); }

    if (params.get('view') === 'audience') {
      // ---- 聴いている人に見せる画面：スライドだけ ----
      var au = document.querySelector('.audience');
      var auImg = au.querySelector('[data-au-img]');
      document.body.appendChild(au); // ほかの要素をすべて隠すので、body の直下に移す
      document.body.classList.add('is-audience');
      au.hidden = false;
      function showAu(n) { current = clamp(n); auImg.src = slides[current - 1].img; auImg.alt = 'スライド ' + current; }
      showAu(Number(params.get('slide')) || 1);
      if (channel) channel.onmessage = function (e) { if (e.data && e.data.slide) showAu(e.data.slide); };
      addEventListener('keydown', function (e) {
        var moved = 0;
        if (['ArrowRight', 'PageDown', ' ', 'Enter'].indexOf(e.key) > -1) moved = 1;
        if (['ArrowLeft', 'PageUp', 'Backspace'].indexOf(e.key) > -1) moved = -1;
        if (moved) {
          e.preventDefault();
          showAu(current + moved);
          if (channel) channel.postMessage({ slide: current });
        }
        if (e.key === 'f' || e.key === 'F') toggleFull();
      });
      au.addEventListener('click', function () { toggleFull(); });
    } else {
      // ---- 発表者の画面：スライド＋原稿 ----
      var pr = document.querySelector('.presenter');
      var el = function (sel) { return pr.querySelector(sel); };
      var startTime = 0, timerId = 0;
      var fontKey = 'deck-font', font = 1;
      try { font = Number(localStorage.getItem(fontKey)) || 1; } catch (e) {}
      pr.style.setProperty('--pr-font', font);

      function show(n) {
        current = clamp(n);
        var s = slides[current - 1];
        el('[data-pr-n]').textContent = current;
        el('[data-pr-part]').textContent = s.part || '';
        el('[data-pr-img]').src = s.img;
        el('[data-pr-img]').alt = 'スライド ' + current;
        el('[data-pr-title]').textContent = s.title || '';
        el('[data-pr-script]').innerHTML = s.html || '<p class="pr-empty">（このスライドの原稿はありません）</p>';
        el('[data-pr-script]').scrollTop = 0;
        var next = slides[current];
        var nextBox = el('.pr-next');
        nextBox.hidden = !next;
        if (next) el('[data-pr-next]').src = next.img;
        if (channel) channel.postMessage({ slide: current });
        try { history.replaceState(null, '', '#slide-' + current); } catch (e) {}
      }
      function tick() {
        var sec = Math.floor((Date.now() - startTime) / 1000);
        el('[data-pr-timer]').textContent = Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0');
      }
      function open(n) {
        pr.hidden = false;
        document.body.classList.add('is-presenting');
        if (!startTime) { startTime = Date.now(); timerId = setInterval(tick, 1000); }
        show(n || 1);
      }
      function close() {
        pr.hidden = true;
        document.body.classList.remove('is-presenting');
        if (document.fullscreenElement) document.exitFullscreen();
        var row = document.getElementById('slide-' + current);
        if (row) row.scrollIntoView({ block: 'center' });
      }

      document.querySelectorAll('[data-deck-start]').forEach(function (b) { b.addEventListener('click', function () { open(1); }); });
      document.querySelectorAll('[data-deck-goto]').forEach(function (b) { b.addEventListener('click', function () { open(Number(b.dataset.deckGoto)); }); });
      document.querySelectorAll('[data-deck-audience]').forEach(function (b) {
        b.addEventListener('click', function () {
          var url = location.pathname + '?view=audience&slide=' + current;
          window.open(url, 'deck-audience-' + slug, 'popup,width=1280,height=720');
        });
      });
      el('[data-pr-prev]').addEventListener('click', function () { show(current - 1); });
      el('[data-pr-nextbtn]').addEventListener('click', function () { show(current + 1); });
      el('[data-pr-close]').addEventListener('click', close);
      el('[data-pr-fullscreen]').addEventListener('click', toggleFull);
      el('[data-pr-timer]').addEventListener('click', function () { startTime = Date.now(); tick(); });
      el('.pr-slide').addEventListener('click', function () { show(current + 1); });
      pr.querySelectorAll('[data-pr-font]').forEach(function (b) {
        b.addEventListener('click', function () {
          font = Math.max(0.8, Math.min(1.8, font + Number(b.dataset.prFont) * 0.1));
          pr.style.setProperty('--pr-font', font.toFixed(1));
          try { localStorage.setItem(fontKey, font.toFixed(1)); } catch (e) {}
        });
      });
      addEventListener('keydown', function (e) {
        if (pr.hidden) return;
        if (['ArrowRight', 'PageDown', ' ', 'Enter'].indexOf(e.key) > -1) { e.preventDefault(); show(current + 1); }
        else if (['ArrowLeft', 'PageUp', 'Backspace'].indexOf(e.key) > -1) { e.preventDefault(); show(current - 1); }
        else if (e.key === 'Home') show(1);
        else if (e.key === 'End') show(total);
        else if (e.key === 'f' || e.key === 'F') toggleFull();
        else if (e.key === 'Escape' && !document.fullscreenElement) close();
      });
      // 別ウインドウ（スライドだけ）で操作したときも、手元の画面を合わせる
      if (channel) channel.onmessage = function (e) { if (e.data && e.data.slide && !pr.hidden && e.data.slide !== current) show(e.data.slide); };
    }

    function toggleFull() {
      if (!document.fullscreenElement) { (document.documentElement.requestFullscreen || function () {}).call(document.documentElement); }
      else document.exitFullscreen();
    }
  }

  // ---- プロジェクト一覧の絞り込み ----
  var filter = document.querySelector('.filter');
  if (filter) {
    filter.addEventListener('click', function (e) {
      var b = e.target.closest('button');
      if (!b) return;
      filter.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
      var f = b.dataset.filter;
      document.querySelectorAll('.project-row').forEach(function (row) {
        row.hidden = f !== 'all' && row.dataset.status !== f;
      });
    });
  }

  // ---- 目次：現在読んでいる節を強調 ----
  var tocLinks = document.querySelectorAll('.toc a');
  if (tocLinks.length && 'IntersectionObserver' in window) {
    var map = {};
    tocLinks.forEach(function (a) { map[a.getAttribute('href').slice(1)] = a; });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          tocLinks.forEach(function (a) { a.classList.remove('current'); });
          var a = map[en.target.id];
          if (a) a.classList.add('current');
        }
      });
    }, { rootMargin: '-20% 0px -70% 0px' });
    Object.keys(map).forEach(function (id) {
      var el = document.getElementById(id);
      if (el) io.observe(el);
    });
  }
})();
