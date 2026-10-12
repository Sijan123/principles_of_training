/* ============================================================
   audio.js — the audiobook player.
   Chapter-wise playback from window.SOT_AUDIO (assets/audio-data.js),
   remembers the position in every chapter (localStorage), resumes
   where you stopped, plays on into the next chapter, and lets each
   figure play its own spoken explanation. No dependencies.
   ============================================================ */
(function () {
  'use strict';

  var DATA = window.SOT_AUDIO;
  if (!DATA || !DATA.chapters || !DATA.chapters.length) return;

  var KEY = 'sot-audio';
  var RATES = [0.8, 1, 1.15, 1.25, 1.5, 1.75, 2];
  var base = /\/chapters\//.test(location.pathname) ? '../' : '';
  var list = DATA.chapters;
  var byId = {};
  list.forEach(function (c, i) { c.i = i; byId[c.id] = c; });
  var pageId = document.body.getAttribute('data-chapter');

  /* ---------- saved state ---------- */
  // { cur, pos: {id: sec}, done: {id: 1}, rate, auto, playing, ts }
  var st = { cur: null, pos: {}, done: {}, rate: 1, auto: true, playing: false, ts: 0 };
  try { var raw = JSON.parse(localStorage.getItem(KEY)); if (raw) for (var k in raw) st[k] = raw[k]; } catch (e) {}
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }
  var idleMs = st.ts ? Date.now() - st.ts : 0;   // how long since you last listened
  var wasPlaying = st.playing && idleMs < 20000; // were you mid-listen when this page loaded?
  st.playing = false;

  /* ---------- helpers ---------- */
  function $(s, c) { return (c || document).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }
  function fmt(t) {
    t = Math.max(0, Math.floor(t || 0));
    var h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
    return (h ? h + ':' + (m < 10 ? '0' : '') : '') + m + ':' + (s < 10 ? '0' : '') + s;
  }
  function label(c) { return (c.n ? c.n + '. ' : '') + c.t; }
  function sectionAt(c, t) {
    var s = null;
    for (var i = 0; i < c.s.length; i++) if (c.s[i][1] <= t + 0.25) s = c.s[i];
    return s;
  }
  var I = {
    play:  '<svg viewBox="0 0 24 24"><path d="M7 4.5v15l12.5-7.5z" fill="currentColor" stroke="none"/></svg>',
    pause: '<svg viewBox="0 0 24 24"><path d="M7 4.5h3.5v15H7zM13.5 4.5H17v15h-3.5z" fill="currentColor" stroke="none"/></svg>',
    back:  '<svg viewBox="0 0 24 24"><path d="M4 12a8 8 0 1 0 2.4-5.7"/><path d="M4 4v4.5h4.5"/><text x="12" y="15.2" text-anchor="middle" font-size="7.5" font-weight="700" fill="currentColor" stroke="none">15</text></svg>',
    fwd:   '<svg viewBox="0 0 24 24"><path d="M20 12a8 8 0 1 1-2.4-5.7"/><path d="M20 4v4.5h-4.5"/><text x="12" y="15.2" text-anchor="middle" font-size="7.5" font-weight="700" fill="currentColor" stroke="none">30</text></svg>',
    prev:  '<svg viewBox="0 0 24 24"><path d="M6 5v14"/><path d="M18 5.5v13L9 12z" fill="currentColor"/></svg>',
    next:  '<svg viewBox="0 0 24 24"><path d="M18 5v14"/><path d="M6 5.5v13l9-6.5z" fill="currentColor"/></svg>',
    list:  '<svg viewBox="0 0 24 24"><path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1.2" fill="currentColor"/><circle cx="4.5" cy="12" r="1.2" fill="currentColor"/><circle cx="4.5" cy="18" r="1.2" fill="currentColor"/></svg>',
    close: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    ear:   '<svg viewBox="0 0 24 24"><path d="M4 15v-3a8 8 0 0 1 16 0v3"/><rect x="3" y="14" width="4.5" height="7" rx="1.5"/><rect x="16.5" y="14" width="4.5" height="7" rx="1.5"/></svg>',
    check: '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  };

  /* ---------- the player bar ---------- */
  var bar = document.createElement('div');
  bar.className = 'aplayer';
  bar.setAttribute('role', 'region');
  bar.setAttribute('aria-label', 'Audiobook player');
  bar.innerHTML =
    '<div class="aplayer__seek"><div class="aplayer__ticks"></div>' +
      '<input type="range" min="0" max="1000" step="1" value="0" aria-label="Seek"></div>' +
    '<div class="aplayer__row">' +
      '<div class="aplayer__ctl">' +
        '<button type="button" class="aplayer__btn" data-a="prev" aria-label="Previous section">' + I.prev + '</button>' +
        '<button type="button" class="aplayer__btn" data-a="back" aria-label="Back 15 seconds">' + I.back + '</button>' +
        '<button type="button" class="aplayer__btn aplayer__play" data-a="toggle" aria-label="Play">' + I.play + '</button>' +
        '<button type="button" class="aplayer__btn" data-a="fwd" aria-label="Forward 30 seconds">' + I.fwd + '</button>' +
        '<button type="button" class="aplayer__btn" data-a="next" aria-label="Next section">' + I.next + '</button>' +
      '</div>' +
      '<div class="aplayer__info">' +
        '<a class="aplayer__title" href="#"></a>' +
        '<div class="aplayer__sub"><span class="aplayer__sec"></span><span class="aplayer__time"></span></div>' +
      '</div>' +
      '<div class="aplayer__tools">' +
        '<button type="button" class="aplayer__rate" data-a="rate" aria-label="Playback speed">1×</button>' +
        '<button type="button" class="aplayer__btn" data-a="list" aria-label="All chapters" aria-expanded="false">' + I.list + '</button>' +
        '<button type="button" class="aplayer__btn" data-a="close" aria-label="Close player">' + I.close + '</button>' +
      '</div>' +
    '</div>' +
    '<div class="aplayer__panel" hidden>' +
      '<div class="aplayer__panelhead"><strong>Chapters</strong>' +
        '<label class="aplayer__auto"><input type="checkbox"> Play on into the next chapter</label></div>' +
      '<ol class="aplayer__list"></ol>' +
    '</div>';
  document.body.appendChild(bar);

  var audio = new Audio();
  audio.preload = 'none';
  var seek = $('input[type=range]', bar), ticks = $('.aplayer__ticks', bar);
  var playBtn = $('.aplayer__play', bar), titleEl = $('.aplayer__title', bar);
  var secEl = $('.aplayer__sec', bar), timeEl = $('.aplayer__time', bar);
  var rateBtn = $('.aplayer__rate', bar), panel = $('.aplayer__panel', bar), listEl = $('.aplayer__list', bar);
  var autoBox = $('.aplayer__auto input', bar);

  var cur = null;          // chapter object loaded in the player
  var stopAt = null;       // end of a figure explanation being played on its own
  var figBtn = null;       // the figure button that started it
  var dragging = false, lastSave = 0, lastSec = null;

  function show(on) {
    bar.classList.toggle('on', on);
    document.documentElement.classList.toggle('has-aplayer', on);
  }

  function load(c, at) {
    if (cur === c && audio.src) { if (at != null) seekTo(at); return; }
    if (cur && audio.src) remember(true);
    cur = c;
    st.cur = c.id;
    var t = at != null ? at : (st.pos[c.id] || 0);
    if (t > c.d - 3) t = 0;
    audio.src = base + c.f + (t > 0 ? '#t=' + t.toFixed(1) : '');
    audio.playbackRate = st.rate;
    audio.preload = 'metadata';
    pending = t;
    titleEl.textContent = label(c);
    titleEl.href = base + c.u;
    drawTicks();
    paint(t);
    save();
    show(true);
  }
  var pending = null;
  audio.addEventListener('loadedmetadata', function () {
    if (pending != null && Math.abs(audio.currentTime - pending) > 1) {
      try { audio.currentTime = pending; } catch (e) {}
    }
    pending = null;
    audio.playbackRate = st.rate;
  });

  function play(c, at) {
    clearFigure();
    if (c) load(c, at);
    if (!cur) return;
    // after a long break, rewind a few seconds to pick up the thread (once per page load)
    if (at == null && idleMs > 5 * 60 * 1000 && pending > 5) { pending -= 3; idleMs = 0; }
    var p = audio.play();
    if (p && p.catch) p.catch(function () { setPlaying(false); });
  }
  function pause() { audio.pause(); }
  function toggle() { if (!cur) return play(byId[st.cur] || list[0]); audio.paused ? play() : pause(); }

  function setPlaying(on) {
    playBtn.innerHTML = on ? I.pause : I.play;
    playBtn.setAttribute('aria-label', on ? 'Pause' : 'Play');
    bar.classList.toggle('playing', on);
    st.playing = on;
    if (on) st.ts = Date.now();
    save();
    syncListen();
  }

  function position() { return pending != null ? pending : audio.currentTime || 0; }
  function seekTo(t) {
    if (!cur) return;
    t = Math.max(0, Math.min(cur.d - 0.5, t));
    if (pending != null) { pending = t; audio.src = base + cur.f + '#t=' + t.toFixed(1); }
    else audio.currentTime = t;
    st.pos[cur.id] = t;
    save();
    paint(t);
  }

  function remember(force) {
    if (!cur) return;
    var now = Date.now();
    if (!force && now - lastSave < 3000) return;
    lastSave = now;
    var t = position();
    if (t > 1) st.pos[cur.id] = Math.round(t * 10) / 10;
    st.ts = now;
    save();
  }

  /* ---------- drawing ---------- */
  function drawTicks() {
    ticks.innerHTML = '';
    if (!cur) return;
    cur.s.forEach(function (s) {
      var i = document.createElement('span');
      i.style.left = (s[1] / cur.d * 100) + '%';
      i.title = s[2];
      ticks.appendChild(i);
    });
  }
  function paint(t) {
    if (!cur) return;
    if (!dragging) seek.value = Math.round(t / cur.d * 1000);
    bar.style.setProperty('--p', (t / cur.d * 100) + '%');
    timeEl.textContent = fmt(t) + ' / ' + fmt(cur.d);
    var s = sectionAt(cur, t);
    var name = stopAt != null ? 'Figure explanation' : (s ? s[2] : 'Introduction');
    if (secEl.textContent !== name) secEl.textContent = name;
    // highlight the section being read when this page is the chapter playing
    var id = s && cur.id === pageId ? s[0] : null;
    if (id !== lastSec) {
      $$('.sec.is-reading').forEach(function (x) { x.classList.remove('is-reading'); });
      if (id && st.playing) { var el = document.getElementById(id); if (el) el.classList.add('is-reading'); }
      lastSec = id;
    }
  }

  function renderList() {
    listEl.innerHTML = '';
    list.forEach(function (c) {
      var li = document.createElement('li');
      var p = st.done[c.id] ? 1 : Math.min(1, (st.pos[c.id] || 0) / c.d);
      li.className = (cur === c ? 'cur ' : '') + (st.done[c.id] ? 'done' : '');
      li.innerHTML =
        '<button type="button"><span class="n">' + (c.n || '·') + '</span>' +
        '<span class="t"></span>' +
        '<span class="d">' + (st.done[c.id] ? I.check : (p > 0 ? fmt(c.d - (st.pos[c.id] || 0)) + ' left' : fmt(c.d))) + '</span>' +
        '<span class="pb"><i style="width:' + (p * 100).toFixed(1) + '%"></i></span></button>';
      $('.t', li).textContent = c.t;
      $('button', li).addEventListener('click', function () {
        play(c, st.done[c.id] ? 0 : null);
        openPanel(false);
      });
      listEl.appendChild(li);
    });
    var curLi = $('.cur', listEl);
    if (curLi) curLi.scrollIntoView({ block: 'nearest' });
  }
  function openPanel(on) {
    panel.hidden = !on;
    $('[data-a=list]', bar).setAttribute('aria-expanded', on ? 'true' : 'false');
    if (on) renderList();
  }

  /* ---------- in-page hooks: chapter Listen button, section and figure buttons ---------- */
  var listenBox = $('[data-listen]');
  function syncListen() {
    if (!listenBox) return;
    var c = byId[listenBox.getAttribute('data-listen')];
    var btn = $('[data-listen-play]', listenBox), span = $('span', btn), meta = $('.listen__meta', listenBox);
    var here = cur === c;
    if (here && st.playing) span.textContent = 'Pause';
    else if (st.pos[c.id] > 5 && !st.done[c.id]) span.textContent = 'Resume at ' + fmt(st.pos[c.id]);
    else span.textContent = st.done[c.id] ? 'Listen again' : 'Listen to this chapter';
    var left = c.d - (st.pos[c.id] || 0);
    meta.textContent = st.done[c.id] ? 'Finished · ' + fmt(c.d)
      : (st.pos[c.id] > 5 ? fmt(left) + ' left of ' + fmt(c.d) : fmt(c.d) + ' · narrated');
  }
  if (listenBox) {
    $('[data-listen-play]', listenBox).addEventListener('click', function () {
      var c = byId[listenBox.getAttribute('data-listen')];
      if (cur === c && st.playing && stopAt == null) return pause();
      play(c, st.done[c.id] ? 0 : null);
    });
  }
  var bookBtn = $('[data-listen-book]');
  if (bookBtn && byId[st.cur]) $('span', bookBtn).textContent = 'Continue listening · Ch ' + (byId[st.cur].n || byId[st.cur].t);
  if (bookBtn) bookBtn.addEventListener('click', function () {
    var c = byId[st.cur] || list.filter(function (x) { return !st.done[x.id]; })[0] || list[0];
    play(c);
  });

  var pageCh = byId[pageId];
  if (pageCh) {
    // "play from here" on every section heading
    pageCh.s.forEach(function (s) {
      var h = document.querySelector('#' + CSS.escape(s[0]) + ' > h2');
      if (!h) return;
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'secplay';
      b.innerHTML = I.play;
      b.title = 'Listen from here';
      b.setAttribute('aria-label', 'Listen from this section');
      b.addEventListener('click', function () { play(pageCh, s[1]); });
      h.insertBefore(b, h.firstChild.nextSibling);
    });
    // "hear this figure explained" on every figure and widget
    $$('[data-fig]').forEach(function (el) {
      var span = pageCh.g[+el.getAttribute('data-fig')];
      if (!span) return;
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'figlisten';
      b.innerHTML = I.ear + '<span>Hear this figure explained</span><em>' + fmt(span[1] - span[0]) + '</em>';
      b.addEventListener('click', function () {
        if (figBtn === b && !audio.paused) { pause(); return; }
        playFigure(span, b);
      });
      var host = el.matches('figure') ? (el.querySelector('figcaption') || el) : (el.querySelector('.widget__head') || el);
      if (host.tagName === 'FIGCAPTION') host.appendChild(b);
      else host.parentNode.insertBefore(b, host.nextSibling);
    });
  }
  function playFigure(span, btn) {
    // a figure clip must not move your place in the chapter: note it, restore it after
    var resumeAt = cur === pageCh && audio.src ? position() : (st.pos[pageCh.id] || 0);
    clearFigure();
    load(pageCh, span[0]);
    seekTo(span[0]);
    stopAt = span[1];
    figBtn = btn;
    figBtn.classList.add('on');
    $('span', figBtn).textContent = 'Stop';
    figBtn._resume = resumeAt;
    var p = audio.play();
    if (p && p.catch) p.catch(function () {});
  }
  function clearFigure() {
    if (!figBtn) { stopAt = null; return; }
    figBtn.classList.remove('on');
    $('span', figBtn).textContent = 'Hear this figure explained';
    figBtn = null;
    stopAt = null;
  }

  /* ---------- events ---------- */
  bar.addEventListener('click', function (e) {
    var b = e.target.closest('[data-a]');
    if (!b) return;
    var a = b.getAttribute('data-a'), t = position();
    if (a === 'toggle') toggle();
    else if (a === 'back') seekTo(t - 15);
    else if (a === 'fwd') seekTo(t + 30);
    else if (a === 'prev') prevSection();
    else if (a === 'next') nextSection();
    else if (a === 'rate') {
      st.rate = RATES[(RATES.indexOf(st.rate) + 1) % RATES.length] || 1;
      audio.playbackRate = st.rate;
      rateBtn.textContent = st.rate + '×';
      save();
    } else if (a === 'list') openPanel(panel.hidden);
    else if (a === 'close') { pause(); remember(true); openPanel(false); show(false); st.cur = null; save(); }
  });
  function prevSection() {
    if (!cur) return;
    var t = position(), s = cur.s, target = 0;
    for (var i = s.length - 1; i >= 0; i--) if (s[i][1] < t - 4) { target = s[i][1]; break; }
    seekTo(target);
  }
  function nextSection() {
    if (!cur) return;
    var t = position();
    for (var i = 0; i < cur.s.length; i++) if (cur.s[i][1] > t + 1) return seekTo(cur.s[i][1]);
    var nx = list[cur.i + 1];
    if (nx) play(nx, 0);
  }
  rateBtn.textContent = st.rate + '×';
  autoBox.checked = st.auto !== false;
  autoBox.addEventListener('change', function () { st.auto = autoBox.checked; save(); });

  seek.addEventListener('input', function () {
    dragging = true;
    if (cur) timeEl.textContent = fmt(seek.value / 1000 * cur.d) + ' / ' + fmt(cur.d);
  });
  seek.addEventListener('change', function () {
    dragging = false;
    if (cur) seekTo(seek.value / 1000 * cur.d);
  });

  audio.addEventListener('play', function () { setPlaying(true); });
  audio.addEventListener('pause', function () { if (stopAt == null) remember(true); setPlaying(false); });
  audio.addEventListener('timeupdate', function () {
    var t = audio.currentTime;
    if (stopAt != null && t >= stopAt) {
      var back = figBtn ? figBtn._resume : null;
      stopAt = -1;              // keep the pause handler from saving the clip's end as your place
      pause();
      clearFigure();
      if (back != null) { audio.currentTime = back; st.pos[cur.id] = back; save(); paint(back); }
      return;
    }
    paint(t);
    if (stopAt == null) remember(false);
    mediaPosition();
  });
  audio.addEventListener('ended', function () {
    st.done[cur.id] = 1;
    st.pos[cur.id] = 0;
    save();
    var nx = list[cur.i + 1];
    if (st.auto !== false && nx) play(nx, st.done[nx.id] ? 0 : null);
    else setPlaying(false);
  });
  audio.addEventListener('error', function () {
    if (!cur) return;
    secEl.textContent = 'Audio could not load — check your connection';
    setPlaying(false);
  });
  window.addEventListener('pagehide', function () { remember(true); });
  document.addEventListener('visibilitychange', function () { if (document.hidden) remember(true); });

  /* ---------- lock screen / headset controls ---------- */
  var ms = navigator.mediaSession;
  function mediaMeta() {
    if (!ms || !cur || typeof MediaMetadata === 'undefined') return;
    ms.metadata = new MediaMetadata({ title: label(cur), artist: DATA.author, album: DATA.book });
  }
  var lastPos = 0;
  function mediaPosition() {
    if (!ms || !ms.setPositionState || !cur || !isFinite(audio.duration)) return;
    var now = Date.now();
    if (now - lastPos < 4000) return;
    lastPos = now;
    try { ms.setPositionState({ duration: audio.duration, playbackRate: audio.playbackRate, position: Math.min(audio.currentTime, audio.duration) }); } catch (e) {}
  }
  if (ms) {
    var h = {
      play: function () { play(); }, pause: pause,
      seekbackward: function () { seekTo(position() - 15); },
      seekforward: function () { seekTo(position() + 30); },
      seekto: function (d) { seekTo(d.seekTime); },
      previoustrack: prevSection, nexttrack: nextSection,
    };
    for (var a in h) { try { ms.setActionHandler(a, h[a]); } catch (e) {} }
    audio.addEventListener('loadedmetadata', mediaMeta);
  }

  /* ---------- start-up ---------- */
  // keep the player on screen when you were listening; carry on across a page change
  var resumeC = byId[st.cur];
  if (resumeC) {
    load(resumeC);
    if (wasPlaying) {
      var p = audio.play();
      if (p && p.catch) p.catch(function () { /* browser wants a tap first */ });
    }
  }
  syncListen();

  // contents page: mark chapters already heard
  $$('[data-dur]').forEach(function (el) {
    var id = el.getAttribute('data-dur');
    if (st.done[id]) el.classList.add('heard');
    else if (st.pos[id] > 5) el.classList.add('started');
  });
})();
