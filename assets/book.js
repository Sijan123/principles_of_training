/* ============================================================
   book.js — shell behaviour: theme, nav, reading progress, search.
   No dependencies.
   ============================================================ */
(function () {
  'use strict';

  var root = document.documentElement;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ---------- theme ---------- */
  function currentTheme() {
    var set = root.getAttribute('data-theme');
    if (set) return set;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  $$('[data-theme-toggle]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var next = currentTheme() === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('sot-theme', next); } catch (e) {}
    });
  });

  /* ---------- mobile nav ---------- */
  var nav = $('#sidenav'), scrim = $('#scrim');
  function setNav(open) {
    if (!nav) return;
    nav.classList.toggle('open', open);
    if (scrim) scrim.classList.toggle('on', open);
    document.body.style.overflow = open && window.innerWidth < 1080 ? 'hidden' : '';
  }
  $$('[data-nav-open]').forEach(function (b) { b.addEventListener('click', function () { setNav(true); }); });
  if (scrim) scrim.addEventListener('click', function () { setNav(false); });
  if (nav) nav.addEventListener('click', function (e) { if (e.target.closest('a')) setNav(false); });

  // keep the active nav item in view
  var cur = nav && nav.querySelector('[aria-current="page"]');
  if (cur) {
    var r = cur.getBoundingClientRect();
    if (r.top < 0 || r.bottom > window.innerHeight) {
      cur.scrollIntoView({ block: 'center' });
    }
  }

  /* ---------- reading progress ---------- */
  var bar = $('#progress');
  if (bar) {
    var tick = function () {
      var h = document.documentElement.scrollHeight - window.innerHeight;
      var p = h > 0 ? (window.scrollY / h) * 100 : 0;
      bar.style.width = Math.max(0, Math.min(100, p)) + '%';
    };
    document.addEventListener('scroll', tick, { passive: true });
    window.addEventListener('resize', tick);
    tick();
  }

  /* ---------- search ---------- */
  var dlg = $('#searchdlg'), input = $('#searchinput'),
      results = $('#searchresults'), empty = $('#searchempty');
  var index = null, loading = false, active = -1;
  var base = /\/chapters\//.test(location.pathname) ? '../' : '';

  function loadIndex() {
    if (index || loading) return Promise.resolve(index);
    loading = true;
    return fetch(base + 'assets/search-index.json')
      .then(function (r) { return r.json(); })
      .then(function (j) { index = j; loading = false; return j; })
      .catch(function () { loading = false; return null; });
  }

  function openSearch() {
    if (!dlg) return;
    dlg.classList.add('open');
    loadIndex().then(function () { if (input.value) run(input.value); });
    setTimeout(function () { input.focus(); input.select(); }, 20);
  }
  function closeSearch() { if (dlg) dlg.classList.remove('open'); }

  $$('[data-search-open]').forEach(function (b) { b.addEventListener('click', openSearch); });
  if (dlg) dlg.addEventListener('mousedown', function (e) { if (e.target === dlg) closeSearch(); });

  document.addEventListener('keydown', function (e) {
    var typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
    if (e.key === '/' && !typing) { e.preventDefault(); openSearch(); return; }
    if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) { e.preventDefault(); openSearch(); return; }
    if (e.key === 'Escape') { closeSearch(); setNav(false); return; }
    if (!dlg || !dlg.classList.contains('open')) return;
    var items = $$('li', results);
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!items.length) return;
      active = e.key === 'ArrowDown'
        ? Math.min(items.length - 1, active + 1)
        : Math.max(0, active - 1);
      items.forEach(function (li, i) { li.classList.toggle('active', i === active); });
      items[active].scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter') {
      var li = items[active] || items[0];
      var a = li && li.querySelector('a');
      if (a) { e.preventDefault(); location.href = a.getAttribute('href'); }
    }
  });

  function score(q, c) {
    var s = 0, t = c.t.toLowerCase(), sub = (c.s || '').toLowerCase();
    if (t === q) s += 120;
    if (t.indexOf(q) === 0) s += 70;
    if (t.indexOf(q) > -1) s += 45;
    if (sub.indexOf(q) > -1) s += 18;
    (c.k || []).forEach(function (k) {
      k = k.toLowerCase();
      if (k === q) s += 40; else if (k.indexOf(q) === 0) s += 26; else if (k.indexOf(q) > -1) s += 14;
    });
    (c.h || []).forEach(function (h) {
      var ht = h.t.toLowerCase();
      if (ht.indexOf(q) === 0) s += 20; else if (ht.indexOf(q) > -1) s += 11;
    });
    return s;
  }

  function matchDetail(q, c) {
    var hit = (c.h || []).filter(function (h) { return h.t.toLowerCase().indexOf(q) > -1; })[0];
    if (hit) return { label: '§ ' + hit.t, href: base + c.u + '#' + hit.id };
    var kw = (c.k || []).filter(function (k) { return k.toLowerCase().indexOf(q) > -1; })[0];
    return { label: kw ? 'keyword: ' + kw : c.s, href: base + c.u };
  }

  function run(raw) {
    if (!index) return;
    var q = raw.trim().toLowerCase();
    results.innerHTML = '';
    active = -1;
    if (!q) { empty.style.display = 'block'; empty.textContent = 'Type to search ' + index.length + ' chapters.'; return; }
    var hits = index.map(function (c) { return { c: c, s: score(q, c) }; })
      .filter(function (x) { return x.s > 0; })
      .sort(function (a, b) { return b.s - a.s; })
      .slice(0, 14);
    if (!hits.length) {
      empty.style.display = 'block';
      empty.textContent = 'Nothing for “' + raw + '”. Try a muscle, nutrient, protocol or mechanism.';
      return;
    }
    empty.style.display = 'none';
    hits.forEach(function (h) {
      var d = matchDetail(q, h.c);
      var li = document.createElement('li');
      li.innerHTML = '<a href="' + d.href + '"><span class="t">' +
        (h.c.n ? h.c.n + '. ' : '') + h.c.t + '</span><span class="m">' +
        h.c.p + ' — ' + d.label + '</span></a>';
      results.appendChild(li);
    });
  }

  if (input) {
    input.addEventListener('input', function () { loadIndex().then(function () { run(input.value); }); });
  }

  /* ---------- scrollspy for the in-chapter contents ---------- */
  var tocLinks = $$('.minitoc a');
  if (tocLinks.length && 'IntersectionObserver' in window) {
    var byId = {};
    tocLinks.forEach(function (a) { byId[a.getAttribute('href').slice(1)] = a; });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var a = byId[en.target.id];
        if (!a) return;
        if (en.isIntersecting) {
          tocLinks.forEach(function (x) { x.style.color = ''; x.style.fontWeight = ''; });
          a.style.color = 'var(--accent)';
          a.style.fontWeight = '650';
        }
      });
    }, { rootMargin: '-80px 0px -72% 0px' });
    $$('section.sec[id]').forEach(function (s) { io.observe(s); });
  }

  /* ---------- heading anchors ---------- */
  $$('section.sec[id] > h2').forEach(function (h) {
    var id = h.parentNode.id;
    var a = document.createElement('a');
    a.href = '#' + id;
    a.textContent = '¶';
    a.setAttribute('aria-label', 'Link to this section');
    a.style.cssText = 'margin-left:auto;font-size:.7em;opacity:0;text-decoration:none;color:var(--muted);transition:opacity .15s';
    h.appendChild(a);
    h.addEventListener('mouseenter', function () { a.style.opacity = '.7'; });
    h.addEventListener('mouseleave', function () { a.style.opacity = '0'; });
  });
})();
