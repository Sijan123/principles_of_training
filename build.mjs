/* ============================================================
   build.mjs — assembles the book.
   Reads content/<id>.html fragments, wraps each in the page shell,
   auto-numbers sections, builds the mini-contents, prev/next links,
   the contents page (index.html) and the client search index.

   Run:  node build.mjs
   ============================================================ */

import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { book, parts, chapters, partOf, slugOf } from './book.config.mjs';

const ROOT = dirname(fileURLToPath(import.meta.url));
const OUT_CH = join(ROOT, 'chapters');
const CONTENT = join(ROOT, 'content');

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const stripTags = (s) => String(s).replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

const ICON = {
  key:   '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/></svg>',
  bolt:  '<svg viewBox="0 0 24 24"><path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z"/></svg>',
  myth:  '<svg viewBox="0 0 24 24"><path d="M12 3 2 20h20L12 3z"/><path d="M12 9v5M12 17h.01"/></svg>',
  caut:  '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v6M12 16h.01"/></svg>',
  deep:  '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M16 16l5 5"/></svg>',
  plain: '<svg viewBox="0 0 24 24"><path d="M12 20s-7-4.2-7-9.4A4.1 4.1 0 0 1 12 7a4.1 4.1 0 0 1 7 3.6c0 5.2-7 9.4-7 9.4z"/></svg>',
  work:  '<svg viewBox="0 0 24 24"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h4"/></svg>',
  paper: '<svg viewBox="0 0 24 24"><path d="M5 3h10l4 4v14H5z"/><path d="M15 3v4h4M9 12h6M9 16h6"/></svg>',
  search:'<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M16 16l5 5"/></svg>',
  menu:  '<svg viewBox="0 0 24 24"><path d="M3 6h18M3 12h18M3 18h18"/></svg>',
  sun:   '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4.2"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M19.1 4.9l-1.8 1.8M6.7 17.3l-1.8 1.8"/></svg>',
};

/* ---------- navigation sidebar (shared by every page) ---------- */
function buildNav(currentId, depth) {
  const up = depth === 0 ? '' : '../';
  let html = `<nav class="sidenav" id="sidenav" aria-label="Book contents">
  <div class="sidenav__head">
    <a class="sidenav__title" href="${up}index.html">${esc(book.title)}</a>
    <div class="sidenav__sub">${esc(book.subtitle)}</div>
    <div class="sidenav__tools">
      <button class="searchbtn" type="button" data-search-open>
        ${ICON.search}<span>Search the book</span><kbd>/</kbd>
      </button>
      <button class="iconbtn" type="button" data-theme-toggle aria-label="Toggle light or dark theme">${ICON.sun}</button>
    </div>
  </div>`;

  for (const p of parts) {
    const list = chapters.filter((c) => c.part === p.id);
    if (!list.length) continue;
    html += `
  <div class="nav-part" data-hue="${p.hue}">
    <div class="nav-part__label"><span class="rn">${p.n ? 'Part ' + p.n : ''}</span>${esc(p.title)}</div>
    <ul class="nav-list">`;
    for (const c of list) {
      const cur = c.id === currentId ? ' aria-current="page"' : '';
      html += `
      <li><a href="${up}chapters/${slugOf(c)}.html"${cur}><span class="n">${c.ch ?? '—'}</span><span class="t">${esc(c.title)}</span></a></li>`;
    }
    html += `
    </ul>
  </div>`;
  }
  html += `
</nav>
<div class="scrim" id="scrim"></div>`;
  return html;
}

function searchDialog() {
  return `<div class="searchdlg" id="searchdlg" role="dialog" aria-modal="true" aria-label="Search the book">
  <div class="searchdlg__box">
    <input type="search" id="searchinput" placeholder="Search chapters, mechanisms, nutrients, exercises…" autocomplete="off" spellcheck="false">
    <ul class="searchdlg__results" id="searchresults"></ul>
    <div class="searchdlg__empty" id="searchempty">Type to search 39 chapters.</div>
  </div>
</div>`;
}

/* ---------- page shell ---------- */
function page({ titleTag, hue, depth, currentId, body, bodyClass = '' }) {
  const up = depth === 0 ? '' : '../';
  return `<!DOCTYPE html>
<html lang="en" data-hue="${hue}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(titleTag)}</title>
<meta name="description" content="${esc(book.title)} — ${esc(book.subtitle)}">
<meta name="color-scheme" content="light dark">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Oswald:wght@200;300;400;500;600&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600;700&display=swap">
<link rel="stylesheet" href="${up}assets/styles.css">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='5' fill='%23B4332E'/%3E%3Cpath d='M9 22V10h3.4l3.6 7 3.6-7H23v12h-3v-6.6l-2.6 5h-2.8l-2.6-5V22z' fill='%23FBF8F3'/%3E%3C/svg%3E">
<script>(function(){try{var t=localStorage.getItem('sot-theme');if(t)document.documentElement.setAttribute('data-theme',t);}catch(e){}})();</script>
</head>
<body class="${bodyClass}">
<a class="skip" href="#main">Skip to content</a>
<div class="progress" id="progress"></div>
<header class="topbar">
  <button class="iconbtn" type="button" data-nav-open aria-label="Open contents">${ICON.menu}</button>
  <a class="topbar__brand" href="${up}index.html"><span class="dot"></span>${esc(book.title)}</a>
  <button class="iconbtn" type="button" data-search-open aria-label="Search">${ICON.search}</button>
  <button class="iconbtn" type="button" data-theme-toggle aria-label="Toggle theme">${ICON.sun}</button>
</header>
<div class="layout">
${buildNav(currentId, depth)}
<main id="main">
${body}
<footer class="footer"><div class="wrap">
  <div><strong>${esc(book.title)}</strong> · ${esc(book.edition)} · Prepared by ${esc(book.author)}</div>
  <div>Educational reference, not medical advice. Claims are graded <span class="grade grade--a">A</span> strong / <span class="grade grade--b">B</span> moderate / <span class="grade grade--c">C</span> emerging — see <a href="${up}chapters/${slugOf(chapters.find(c=>c.id==='bm01'))}.html">How to Read the Evidence</a>.</div>
</div></footer>
</main>
</div>
${searchDialog()}
<script src="${up}assets/book.js"></script>
<script src="${up}assets/figures.js"></script>
<script src="${up}assets/cycling.js"></script>
<script src="${up}assets/widgets.js"></script>
</body>
</html>
`;
}

/* ---------- section auto-numbering + mini contents ---------- */
function processSections(frag, chNum) {
  const toc = [];
  let i = 0;
  const out = frag.replace(
    /<section class="sec"([^>]*)>\s*<h2>([\s\S]*?)<\/h2>/g,
    (m, attrs, inner) => {
      i += 1;
      const idMatch = /id="([^"]+)"/.exec(attrs);
      const id = idMatch ? idMatch[1] : `sec-${i}`;
      const label = chNum ? `${chNum}.${i}` : String(i);
      toc.push({ id, label, title: stripTags(inner) });
      const sn = `<span class="sn">${label}</span>`;
      const withId = idMatch ? attrs : `${attrs} id="${id}"`;
      return `<section class="sec"${withId}><h2>${sn}${inner}</h2>`;
    }
  );
  return { html: out, toc };
}

function miniToc(toc) {
  if (toc.length < 3) return '';
  return `<div class="minitoc">
  <h4>In this chapter</h4>
  <ol>${toc.map((t) => `<li value="${t.label.split('.').pop()}"><a href="#${t.id}">${esc(t.title)}</a></li>`).join('')}</ol>
</div>`;
}

/* ---------- panel shorthand expansion ---------- */
// Authors write <div class="panel panel--key" data-title="Key idea"> ... </div>
// and the build injects the icon + title row.
function expandPanels(html) {
  const map = {
    'panel--key': ICON.key,
    'panel--activate': ICON.bolt,
    'panel--myth': ICON.myth,
    'panel--caution': ICON.caut,
    'panel--deep': ICON.deep,
    'panel--plain': ICON.plain,
    'panel--work': ICON.work,
    'panel--paper': ICON.paper,
  };
  return html.replace(/<div class="panel ([a-z-]+)" data-title="([^"]*)">/g, (m, cls, title) => {
    const icon = map[cls] || ICON.key;
    return `<div class="panel ${cls}"><div class="panel__title">${icon}<span>${esc(title)}</span></div>`;
  });
}

/* ---------- chapter page ---------- */
function chapterPage(c, idx, frag) {
  const p = partOf[c.part];
  const prev = chapters[idx - 1];
  const next = chapters[idx + 1];

  // lift the first .lede paragraph into the opener
  let lede = '';
  frag = frag.replace(/<p class="lede[^"]*">[\s\S]*?<\/p>/, (m) => { lede = m; return ''; });

  const { html, toc } = processSections(frag, c.ch);
  const bodyHtml = expandPanels(html);

  const openerNum = c.ch ? `<div class="opener__num">${c.ch}</div>` : '';
  const partLabel = p.n ? `Part ${p.n} · ${esc(p.title)}` : esc(p.title);

  const body = `<article>
<header class="opener">
  <div class="opener__inner">
    <div class="opener__part">${partLabel}</div>
    <div class="opener__grid">
      ${openerNum}
      <div>
        <h1>${esc(c.title)}</h1>
        <div class="opener__sub">${esc(c.sub)}</div>
      </div>
    </div>
    <div class="opener__lede">${lede}</div>
  </div>
</header>
<div class="wrap">
${miniToc(toc)}
${bodyHtml}
<nav class="chapnav" aria-label="Chapter navigation">
${prev ? `<a class="prev" href="${slugOf(prev)}.html"><div class="dir">← Previous</div><div class="t">${esc(prev.title)}</div></a>` : '<div></div>'}
${next ? `<a class="next" href="${slugOf(next)}.html"><div class="dir">Next →</div><div class="t">${esc(next.title)}</div></a>` : '<div></div>'}
</nav>
</div>
</article>`;

  return {
    page: page({
      titleTag: `${c.ch ? c.ch + '. ' : ''}${c.title} — ${book.title}`,
      hue: p.hue, depth: 1, currentId: c.id, body,
    }),
    toc,
  };
}

/* ---------- contents page ---------- */
function indexPage(tocByChapter) {
  const cards = parts.map((p) => {
    const list = chapters.filter((c) => c.part === p.id);
    if (!list.length) return '';
    return `<section class="partcard" data-hue="${p.hue}">
  <div class="partcard__head">
    <div class="partcard__rn">${p.n || '§'}</div>
    <div><h3>${esc(p.title)}</h3><p>${esc(p.blurb)}</p></div>
  </div>
  <ol>
${list.map((c) => `    <li><a href="chapters/${slugOf(c)}.html"><span class="n">${c.ch ?? '·'}</span><span class="t">${esc(c.title)}</span><span class="s">${esc(c.sub)}</span></a></li>`).join('\n')}
  </ol>
</section>`;
  }).join('\n');

  const nSections = Object.values(tocByChapter).reduce((a, t) => a + t.length, 0);

  const body = `<div class="cover" data-hue="crimson">
  <svg class="cover__bg" viewBox="0 0 1200 700" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <defs>
      <linearGradient id="cg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="var(--crimson)" stop-opacity=".16"/>
        <stop offset="55%" stop-color="var(--amber)" stop-opacity=".10"/>
        <stop offset="100%" stop-color="var(--teal)" stop-opacity=".16"/>
      </linearGradient>
    </defs>
    <rect width="1200" height="700" fill="url(#cg)"/>
    <g fill="none" stroke="var(--crimson)" stroke-opacity=".22" stroke-width="1.2">
      <path d="M0 520 C 120 500 180 420 300 400 S 480 440 600 380 S 780 260 900 300 S 1080 400 1200 360"/>
      <path d="M0 580 C 140 560 200 500 320 480 S 500 520 620 460 S 800 350 920 390 S 1090 470 1200 440"/>
    </g>
    <g stroke="var(--teal)" stroke-opacity=".3" stroke-width="1.4" fill="none">
      <path d="M0 200 h170 l18 -54 l20 108 l22 -140 l20 150 l18 -64 h170 l18 -40 l20 80 l22 -104 l20 112 l18 -48 H1200"/>
    </g>
  </svg>
  <div class="cover__inner">
    <div class="eyebrow">A visual guide to training physiology</div>
    <h1><span class="thin">The</span>Science <span class="thin">of</span><span class="hl">Training</span></h1>
    <p class="cover__sub">How endurance, HIIT and strength work — the anatomy they load, the physiology they change, the muscles they recruit, and the food that supplies them.</p>
    <p class="cover__by">Prepared by <strong>${esc(book.author)}</strong></p>
    <div class="cover__meta">
      <span class="tag tag--accent">${chapters.filter(c=>c.ch).length} chapters</span>
      <span class="tag">${nSections} sections</span>
      <span class="tag">6 parts</span>
      <span class="tag">Interactive figures</span>
      <span class="tag">Evidence-graded</span>
    </div>
    <p style="margin-top:1.6rem"><a class="btn" href="chapters/${slugOf(chapters[0])}.html">Start reading →</a>
    <button class="btn btn--ghost" type="button" data-search-open style="margin-left:.5rem">Search the book</button></p>
  </div>
</div>

<div class="wrap">
<section class="sec" id="how-to-use" style="margin-top:2.4rem">
  <h2><span class="sn">§</span>How this book is built</h2>
  <div class="g3">
    <div class="panel"><div class="panel__title" style="color:var(--crimson)">${ICON.key}<span>Mechanism first</span></div>
      <p style="font-size:.93rem;margin:0">Every chapter starts with the structure or process itself — what the tissue is, what the pathway does — before any training advice. You cannot program what you cannot picture.</p></div>
    <div class="panel"><div class="panel__title" style="color:var(--amber)">${ICON.bolt}<span>Then "Activate It"</span></div>
      <p style="font-size:.93rem;margin:0">Each mechanism closes with a dark <strong>Activate It</strong> panel: the exact exercise, intensity, duration and frequency that best drives <em>that</em> adaptation. Mechanism → prescription, every time.</p></div>
    <div class="panel"><div class="panel__title" style="color:var(--teal)">${ICON.deep}<span>Graded, not asserted</span></div>
      <p style="font-size:.93rem;margin:0">Claims carry an evidence grade — <span class="grade grade--a">A</span> replicated, <span class="grade grade--b">B</span> moderate, <span class="grade grade--c">C</span> emerging or mechanistic. Where the literature disagrees, the book says so.</p></div>
  </div>
  <div class="panel panel--key" data-title="Read it in any order">
    <p style="margin:0">Parts I–II build the vocabulary; Part III is the training methods; Part IV is a lookup atlas of muscles and what recruits them; Part V is fuel; Part VI is application. If you came for one answer, use search (<kbd>/</kbd>) — every chapter stands alone, and cross-links carry you to the mechanism behind any recommendation.</p>
  </div>
</section>

<section class="sec" id="contents">
  <h2><span class="sn">§</span>Contents</h2>
${cards}
</section>
</div>`;

  return page({ titleTag: `${book.title} — ${book.subtitle}`, hue: 'crimson', depth: 0, currentId: null, body, bodyClass: 'is-cover' });
}

/* ---------- search index ---------- */
function searchIndex(tocByChapter) {
  return chapters.map((c) => ({
    t: c.title,
    s: c.sub,
    u: `chapters/${slugOf(c)}.html`,
    n: c.ch,
    p: partOf[c.part].title,
    k: c.kw,
    h: (tocByChapter[c.id] || []).map((x) => ({ t: x.title, id: x.id })),
  }));
}

/* ---------- main ---------- */
const stub = (c) => `<section class="sec" id="pending"><h2>In preparation</h2>
<p class="lede">This chapter is not written yet. Add <code>content/${c.id}.html</code> and re-run <code>node build.mjs</code>.</p></section>`;

async function main() {
  await mkdir(OUT_CH, { recursive: true });
  await mkdir(CONTENT, { recursive: true });

  const tocByChapter = {};
  let written = 0, stubs = 0;

  for (let i = 0; i < chapters.length; i++) {
    const c = chapters[i];
    const src = join(CONTENT, `${c.id}.html`);
    let frag;
    if (existsSync(src)) { frag = await readFile(src, 'utf8'); }
    else { frag = stub(c); stubs++; }
    const { page: html, toc } = chapterPage(c, i, frag);
    tocByChapter[c.id] = toc;
    await writeFile(join(OUT_CH, `${slugOf(c)}.html`), html, 'utf8');
    written++;
  }

  await writeFile(join(ROOT, 'index.html'), indexPage(tocByChapter), 'utf8');
  await writeFile(join(ROOT, 'assets', 'search-index.json'), JSON.stringify(searchIndex(tocByChapter)), 'utf8');

  const done = chapters.length - stubs;
  console.log(`built ${written} chapter pages + index.html`);
  console.log(`  written: ${done}/${chapters.length}   awaiting content: ${stubs}`);
  if (stubs) {
    console.log('  missing: ' + chapters.filter(c => !existsSync(join(CONTENT, `${c.id}.html`))).map(c => c.id).join(' '));
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
