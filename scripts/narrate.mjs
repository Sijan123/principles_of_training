/* ============================================================
   narrate.mjs — turns content/<id>.html into a narration script.

   Output: audio/script/<id>.json  (input for scripts/tts.py)
     { id, title, hash, segments: [ { k, t, sec?, fig? } ] }
       k   = kind: title | heading | sub | label | para | fig
       t   = spoken text (entities decoded, symbols/units spelled out)
       sec = section id the segment opens (headings only)
       fig = figure index (matches data-fig="N" injected by build.mjs)

   Run:  node scripts/narrate.mjs [id ...]
   ============================================================ */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chapters, partOf } from '../book.config.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'audio', 'script');

// Chapters with no audio: the reference list is citations only.
export const SKIP = new Set(['bm03']);

/* ---------- tiny HTML parser (the content is authored, well-formed HTML) ---------- */
const VOID = new Set(['br', 'hr', 'img', 'input', 'meta', 'link', 'wbr', 'col', 'source']);

export function parse(html) {
  const root = { tag: '#root', attrs: {}, kids: [] };
  const stack = [root];
  const re = /<!--[\s\S]*?-->|<(\/?)([a-zA-Z][a-zA-Z0-9-]*)((?:\s+[^\s=>/]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?)*)\s*(\/?)>/g;
  let last = 0, m;
  const text = (s) => { if (s) stack[stack.length - 1].kids.push(s); };
  while ((m = re.exec(html))) {
    text(html.slice(last, m.index));
    last = re.lastIndex;
    if (m[0].startsWith('<!--')) continue;
    const [, close, rawTag, rawAttrs, selfClose] = m;
    const tag = rawTag.toLowerCase();
    if (close) {
      for (let i = stack.length - 1; i > 0; i--) {
        if (stack[i].tag === tag) { stack.length = i; break; }
      }
      continue;
    }
    const attrs = {};
    rawAttrs.replace(/([^\s=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g, (_, k, a, b, c) => {
      attrs[k.toLowerCase()] = a ?? b ?? c ?? '';
    });
    const node = { tag, attrs, kids: [] };
    stack[stack.length - 1].kids.push(node);
    if (tag === 'svg') {
      // skip the drawing wholesale; its aria-label is kept on the node
      const end = html.indexOf('</svg>', last);
      last = re.lastIndex = end < 0 ? html.length : end + 6;
      continue;
    }
    if (!selfClose && !VOID.has(tag)) stack.push(node);
  }
  text(html.slice(last));
  return root;
}

const cls = (n) => ` ${n.attrs?.class || ''} `;
const has = (n, c) => typeof n === 'object' && cls(n).includes(` ${c} `);
const els = (n) => n.kids.filter((k) => typeof k === 'object');
const find = (n, pred) => {
  for (const k of els(n)) { if (pred(k)) return k; const f = find(k, pred); if (f) return f; }
  return null;
};

/* ---------- entities ---------- */
const ENT = {
  mdash: '—', ndash: '–', nbsp: ' ', times: '×', asymp: '≈', rarr: '→', larr: '←', uarr: '↑', darr: '↓',
  amp: '&', quot: '"', apos: "'", rdquo: '"', ldquo: '"', rsquo: "'", lsquo: "'", deg: '°', middot: '·',
  minus: '−', alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', theta: 'θ', mu: 'μ', micro: 'µ',
  sect: '§', prime: '′', Prime: '″', gt: '>', lt: '<', divide: '÷', div: '÷', pound: '£', euro: '€',
  oslash: 'ø', plusmn: '±', le: '≤', ge: '≥', aelig: 'æ', hellip: '…', aacute: 'á', eacute: 'é',
  iacute: 'í', ouml: 'ö', uuml: 'ü', auml: 'ä', thinsp: ' ', ensp: ' ', emsp: ' ', shy: '',
  sup1: '¹', sup2: '²', sup3: '³',
};
const decode = (s) => s
  .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d))
  .replace(/&([a-zA-Z]+\d?);/g, (m, n) => ENT[n] ?? m);

/* ---------- spoken-text normalisation ---------- */
const UNITS = [
  ['ml/kg/min', 'millilitres per kilogram per minute'], ['mL/kg/min', 'millilitres per kilogram per minute'],
  ['g/kg/day', 'grams per kilogram per day'], ['g/kg/h', 'grams per kilogram per hour'],
  ['mg/kg/day', 'milligrams per kilogram per day'],
  ['kcal/day', 'kilocalories per day'], ['kcal/g', 'kilocalories per gram'], ['kcal/h', 'kilocalories per hour'],
  ['mmol/L', 'millimoles per litre'], ['mmol/l', 'millimoles per litre'], ['mg/L', 'milligrams per litre'],
  ['mg/kg', 'milligrams per kilogram'], ['g/kg', 'grams per kilogram'], ['g/h', 'grams per hour'],
  ['g/min', 'grams per minute'], ['g/day', 'grams per day'], ['mg/day', 'milligrams per day'],
  ['L/min', 'litres per minute'], ['L/h', 'litres per hour'], ['mL/h', 'millilitres per hour'],
  ['ml/h', 'millilitres per hour'], ['mL/kg', 'millilitres per kilogram'], ['ml/kg', 'millilitres per kilogram'],
  ['W/kg', 'watts per kilogram'], ['km/h', 'kilometres per hour'], ['km/week', 'kilometres per week'],
  ['m/s', 'metres per second'], ['s/km', 'seconds per kilometre'], ['min/km', 'minutes per kilometre'],
  ['mL/100 mL', 'millilitres per 100 millilitres'], ['g/100 mL', 'grams per 100 millilitres'], ['g/100 ml', 'grams per 100 millilitres'], ['ml/100 ml', 'millilitres per 100 millilitres'], ['N·m', 'newton metres'], ['Nm', 'newton metres'],
  ['kcal', 'kilocalories'], ['kJ', 'kilojoules'], ['bpm', 'beats per minute'], ['rpm', 'revolutions per minute'],
  ['mmol', 'millimoles'], ['mcg', 'micrograms'], ['µg', 'micrograms'], ['μg', 'micrograms'],
  ['µm', 'micrometres'], ['μm', 'micrometres'], ['nm', 'nanometres'], ['IU', 'international units'],
  ['Hz', 'hertz'], ['kg', 'kilograms'], ['mg', 'milligrams'], ['km', 'kilometres'], ['cm', 'centimetres'],
  ['mm', 'millimetres'], ['ms', 'milliseconds'], ['mL', 'millilitres'], ['ml', 'millilitres'],
  ['min', 'minutes'], ['mins', 'minutes'], ['sec', 'seconds'], ['hr', 'hours'], ['hrs', 'hours'], ['wk', 'weeks'],
  ['kN', 'kilonewtons'],
  // single letters: only after a space, so "1990s" or "5k" are left alone
  ['s', 'seconds', 1], ['h', 'hours', 1], ['m', 'metres', 1], ['g', 'grams', 1], ['L', 'litres', 1],
  ['W', 'watts', 1], ['N', 'newtons', 1],
];
const reEsc = (s) => s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');

// Read as words, not spelled out.
const WORDS = {
  HIIT: 'hit', DOMS: 'doms', SAID: 'said', RAMP: 'ramp', HERITAGE: 'Heritage', NASA: 'nasa', NEAT: 'neat',
  DEXA: 'dexa', DXA: 'D-X-A', VDOT: 'vee-dot', ERG: 'erg', GLUT: 'gloot', NSAID: 'en-sed', NSAIDs: 'en-seds',
  METs: 'mets', MET: 'met', FIFA: 'fifa', UCI: 'U-C-I', REDs: 'red S', LEA: 'L-E-A', SPRINT: 'sprint',
  AIDS: 'aids', COVID: 'covid', RAM: 'ram', ACL: 'A-C-L', OK: 'okay', FAT: 'fat', LOW: 'low', HIGH: 'high',
};

// Letters joined by hyphens are spelled by the phonemiser ("A-T-P" -> ay-tee-pee);
// spaced capitals are not ("A T P" reads the A as the article).
const spell = (w) => w.split('').join('-');

export function speak(input, { calc = false } = {}) {
  // decode, then drop combining marks (V̇O₂ -> VO₂) and fold sub/superscript digits
  let s = decode(input).normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[₀-₉]/g, (d) => String(d.charCodeAt(0) - 0x2080))
    .replace(/\bdoi:\s*\S+/gi, '').replace(/https?:\/\/\S+/g, '');
  // negative exponents: mmol·kg⁻¹·s⁻¹ -> mmol per kilogram per second
  s = s.replace(/[·\s]*(kg|min|s|h|L|g|m)\s?⁻¹/g, (_, u) => ' per ' + ({ kg: 'kilogram', min: 'minute', s: 'second', h: 'hour', L: 'litre', g: 'gram', m: 'metre' })[u]);

  // abbreviations
  s = s
    .replace(/\be\.g\.,?/g, 'for example,').replace(/\bi\.e\.,?/g, 'that is,')
    .replace(/\bet al\.?/g, 'and colleagues').replace(/\betc\./g, 'et cetera')
    .replace(/\bvs\.?(?=\s)/g, 'versus').replace(/\bcf\./g, 'compare').replace(/\b[Aa]pprox\./g, 'approximately')
    .replace(/\bFigs?\.?\s*(?=\d)/g, 'figure ').replace(/\bch\.\s*(?=\d)/g, 'chapter ')
    .replace(/§\s*/g, 'section ').replace(/#\s?(?=\d)/g, 'number ').replace(/\s?@\s?/g, ' at ').replace(/\bNo\.\s*(?=\d)/g, 'number ');

  // physiology tokens
  s = s
    .replace(/\bV̇?O[₂2]\s?max\b/g, 'V-O-2 max').replace(/\bV̇?O[₂2]\s?peak\b/g, 'V-O-2 peak')
    .replace(/\bV̇?CO[₂2]\b/g, 'V-C-O-2').replace(/\bV̇?O[₂2]\b/g, 'V-O-2').replace(/\bCO[₂2]\b/g, 'C-O-2')
    .replace(/\ba-?vO2\s?diff\b/g, 'a-v-O-2 difference').replace(/\ba-?vO2\b/g, 'a-v-O-2')
    .replace(/\bO[₂2]\b/g, 'oxygen').replace(/\bH₂O\b/g, 'water')
    .replace(/\bH\+/g, 'hydrogen ions').replace(/\bNa\+/g, 'sodium').replace(/\bK\+/g, 'potassium')
    .replace(/\bCa(2\+|\+\+)/g, 'calcium')
    .replace(/%\s*1RM\b/g, ' percent of one-rep max').replace(/\b1RM\b/g, 'one-rep max')
    .replace(/\b(\d+)RM\b/g, '$1-rep max').replace(/\bRM\b/g, 'rep max')
    .replace(/\bHR\s?max\b/g, 'max heart rate').replace(/\bHR\s?rest\b/g, 'resting heart rate')
    .replace(/\bFAT\s?max\b|\bFatmax\b/g, 'fat max').replace(/\bPCr\b/g, 'P-C-R')
    .replace(/\bPGC-1\s?α/g, 'P-G-C 1 alpha')
    .replace(/\btype\s+I\b/gi, 'type one').replace(/\btype\s+II\b/gi, 'type two')
    .replace(/\bII([abx])\b/g, (_, l) => `two ${l.toUpperCase()}`).replace(/\bI\/II\b/g, 'one and two')
    .replace(/\bα/g, 'alpha ').replace(/\bβ/g, 'beta ').replace(/\bγ/g, 'gamma ').replace(/\bθ/g, 'theta ')
    .replace(/\bΔ/g, 'change in ').replace(/[µμ](?=[a-zA-Z])/g, 'micro');

  // citations: "Med Sci Sports Exerc 2007;39(4):665–71" -> "(2007)"
  s = s.replace(/\b((?:19|20)\d\d)\s*;\s*[\d()\s]*(?::\s*[\w\d–\-]+)?\.?/g, '$1.');

  // money and temperature
  s = s.replace(/£\s?(\d[\d,.]*)/g, '$1 pounds').replace(/€\s?(\d[\d,.]*)/g, '$1 euros')
    .replace(/(\d)\s?°\s?C\b/g, '$1 degrees Celsius').replace(/(\d)\s?°/g, '$1 degrees');

  // clock times: 3:05:00 -> 3 hours 5 minutes; 52:00 -> 52 minutes; 4:24 -> 4 24; 4:05 -> 4 oh 5
  s = s.replace(/(\d{1,2}):(\d\d):(\d\d)/g, (_, h, m, x) => `${+h} hour${+h === 1 ? '' : 's'} ${+m} minute${+m === 1 ? '' : 's'}${+x ? ` ${+x} seconds` : ''}`)
    .replace(/(\d{1,3}):(\d\d)/g, (_, m, x) => (x === '00' ? `${m} minutes` : `${m} ${x[0] === '0' ? 'oh ' + x[1] : x}`));

  // ranges and number operators (before units, so "8–10 s" -> "8 to 10 seconds")
  s = s
    .replace(/(\d)\s*[–-]\s*(?=\d)/g, '$1 to ')
    .replace(/(\d)\s*[×x]\s*(?=\d)/g, '$1 times ').replace(/×/g, ' times ')
    .replace(/(\d)\s*÷\s*/g, '$1 divided by ').replace(/÷/g, ' divided by ')
    .replace(/(\d)\s*\+\s*(?=\d)/g, '$1 plus ').replace(/\s\+\s/g, ' plus ').replace(/(\d)\+/g, '$1 plus').replace(/\s=\s/g, ' equals ').replace(/=/g, ' equals ')
    .replace(/[−]\s?(?=\d)/g, 'minus ').replace(/±\s?/g, ' plus or minus ')
    .replace(/[≈~∼]\s?/g, 'about ').replace(/≥\s?/g, 'at least ').replace(/≤\s?/g, 'at most ')
    .replace(/(^|\s)>\s?(?=\d)/g, '$1more than ').replace(/(^|\s)<\s?(?=\d)/g, '$1less than ')
    .replace(/\s*→\s*/g, calc ? ', giving ' : ' to ').replace(/\s*←\s*/g, ' from ')
    .replace(/↑\s*/g, 'higher ').replace(/↓\s*/g, 'lower ')
    .replace(/(\d)\s?%\s?\+/g, '$1 percent or more').replace(/(\d)\s?%/g, '$1 percent ').replace(/%/g, ' percent ')
    .replace(/(^|[\s(])\+\s?(?=\d)/g, '$1plus ').replace(/\s\+\s|\+/g, ' plus ')
    .replace(/\s?>\s?/g, ' more than ').replace(/\s?<\s?/g, ' less than ').replace(/−/g, ' minus ');

  // units after a number
  for (const [u, word, needSpace] of UNITS) {
    const re = new RegExp(`(\\d)${needSpace ? '[ \\u00a0]' : '[ \\u00a0]?'}${reEsc(u)}(?![\\w/])`, 'g');
    s = s.replace(re, '$1 ' + word);
  }
  s = s.replace(/\b1 (kilogram|gram|millilitre|litre|minute|second|hour|week|day|metre|kilometre|watt)s\b/g, '1 $1')
    .replace(/(\d)\s?\/\s?km\b/g, '$1 per kilometre').replace(/(\d)\s?\/\s?mile\b/g, '$1 per mile')
    .replace(/50\s?\/\s?50/g, 'fifty-fifty').replace(/(\d+)\/(\d+)/g, '$1-$2');

  // remaining slashes between words
  s = s.replace(/\s?\/\s?(week|wk|day|month|session)\b/g, (_, w) => ` a ${w === 'wk' ? 'week' : w}`)
    .replace(/\bper (km|kg|min|h)\b/g, (_, u) => 'per ' + ({ km: 'kilometre', kg: 'kilogram', min: 'minute', h: 'hour' })[u]);
  for (let k = 0; k < 3; k++) s = s.replace(/([A-Za-z]+)\/(week|wk|day|session|month|year|hour|h|min|km|kg|rep|set|meal)\b/g,
    (_, a, b) => `${a} per ${({ wk: 'week', h: 'hour', min: 'minute', km: 'kilometre', kg: 'kilogram' })[b] || b}`)
    .replace(/([A-Za-z])\/([A-Za-z])/g, '$1 or $2').replace(/\s\/\s/g, ' or ');
  s = s.replace(/([a-z])\/(\d)/g, '$1, $2').replace(/\//g, ' or ');

  // acronyms
  s = s.replace(/\b(?:[A-Z][A-Za-z]*[A-Z]|[A-Z]{2,})\d*s?\b/g, (w) => {
    if (WORDS[w]) return WORDS[w];
    const base = w.replace(/s$/, '');
    if (WORDS[base]) return WORDS[base] + 's';
    const mDigits = /^([A-Z]{2,6})(\d+)$/.exec(w);
    if (mDigits) return `${WORDS[mDigits[1]] || spell(mDigits[1])} ${mDigits[2]}`;
    if (/^[A-Z]{2,6}$/.test(w)) return spell(w);
    if (/^[A-Z]{2,6}s$/.test(w)) return spell(base) + "'s";
    return w; // mixed case like "McArdle", "iPhone"
  });

  // punctuation cleanup
  s = s
    .replace(/\s*—\s*/g, ', ').replace(/–/g, '-').replace(/·/g, ', ').replace(/[′″]/g, '')
    .replace(/&/g, ' and ').replace(/[“”]/g, '"').replace(/[‘’]/g, "'")
    .replace(/\(\s*\)/g, '').replace(/\s+([,.;:!?])/g, '$1').replace(/,\s*,/g, ',')
    .replace(/([.!?])\s*,/g, '$1').replace(/,\s*([.!?])/g, '$1').replace(/\s+/g, ' ').trim();
  return s;
}

/* ---------- inline text of a node ---------- */
function inline(n, opt = {}) {
  if (typeof n === 'string') return n;
  if (n.tag === 'svg' || n.tag === 'template' || n.tag === 'script' || n.tag === 'style') return '';
  if (has(n, 'grade')) return opt.grades ? ` Evidence grade ${inline(n.kids[0] ?? '')}. ` : ' ';
  if (has(n, 'sn') || has(n, 'tag')) return ' ';
  if (n.tag === 'br') return ' ';
  if (has(n, 'calc')) return ` — ${n.kids.map((k) => inline(k, opt)).join('')}. `;
  if (has(n, 'k') && n.tag === 'span') return ` ${n.kids.map((k) => inline(k, opt)).join('')}: `;
  if (has(n, 'j')) return ' '; // journal abbreviation — not useful aloud
  if (has(n, 'sub') && n.tag === 'span') return `, ${n.kids.map((k) => inline(k, opt)).join('')}`;
  if (has(n, 'v') && n.tag === 'div') return n.kids.map((k) => inline(k, opt)).join(' ') + ': ';
  let s = n.kids.map((k) => inline(k, opt)).join('');
  if (/^(p|li|div|dt|dd|h[1-6]|td|th|tr|caption|figcaption|small)$/.test(n.tag)) s = ` ${s} `;
  return s;
}
const textOf = (n, opt) => inline(n, opt).replace(/\s+/g, ' ').trim();
const sentence = (s) => (s && !/[.!?:]$/.test(s) ? s + '.' : s);

/* ---------- block walk ---------- */
export const FIG_RE = /<figure class="fig[" ]|<div class="widget[" ]/g;
const isFig = (n) => (n.tag === 'figure' && has(n, 'fig')) || (n.tag === 'div' && has(n, 'widget'));
const ORD = ['First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh', 'Eighth'];

function buildSegments(frag, c) {
  const tree = parse(frag);
  const segs = [];
  let figN = 0, secN = 0;
  const push = (k, t, extra = {}) => {
    t = speak(t, extra.calc ? { calc: true } : {});
    delete extra.calc;
    if (t && /[A-Za-z0-9]/.test(t)) segs.push({ k, t: sentence(t), ...extra });
  };

  function figure(n, narr) {
    const idx = figN++;
    const label = n.tag === 'figure'
      ? (() => { const b = find(n, (x) => x.tag === 'figcaption'); const bb = b && find(b, (x) => x.tag === 'b'); return bb ? textOf(bb) : 'Figure'; })()
      : 'Interactive figure';
    const title = n.tag === 'div' ? textOf(find(n, (x) => x.tag === 'h4') || { kids: [] }) : '';
    let body = narr ? textOf({ tag: '#narr', kids: narr.kids }) : '';
    if (!body) {
      // fallback: the SVG's aria-label + caption, or the widget's note
      const svg = find(n, (x) => x.tag === 'svg');
      const cap = find(n, (x) => x.tag === 'figcaption');
      const note = find(n, (x) => has(x, 'widget__note'));
      body = [svg?.attrs['aria-label'], cap && textOf(cap).replace(/^Fig\.?\s*[\d.]+\s*/, ''), note && textOf(note)]
        .filter(Boolean).map(sentence).join(' ');
    }
    push('fig', `${label.replace(/^Fig\.?/, 'Figure')}${title ? ': ' + title : ''}. ${body}`, { fig: idx });
  }

  function table(n) {
    const cap = find(n, (x) => x.tag === 'caption');
    const rows = [];
    (function collect(x) { for (const k of els(x)) { if (k.tag === 'tr') rows.push(k); else collect(k); } })(n);
    const cells = rows.map((r) => els(r).filter((x) => x.tag === 'td' || x.tag === 'th').map((x) => textOf(x)));
    const head = rows.length && els(rows[0]).every((x) => x.tag === 'th') ? cells.shift() : null;
    const capText = cap ? textOf(cap) : '';
    const cols = Math.max(0, ...cells.map((r) => r.length));
    if (!cells.length) return;
    if (cols > 4 || cells.length > 10) {
      push('para', `The table${capText ? ', ' + capText + ',' : ''} is on the page, with ${cells.length} rows.`);
      return;
    }
    push('label', capText ? `Table: ${capText}` : 'Table');
    for (const r of cells) {
      const parts = r.map((v, i) => (i === 0 || !head || !head[i] ? v : `${head[i]}, ${v}`)).filter(Boolean);
      push('para', parts[0] + (parts.length > 1 ? ': ' + parts.slice(1).join('; ') : ''));
    }
  }

  function walk(n) {
    const kids = n.kids;
    for (let i = 0; i < kids.length; i++) {
      const k = kids[i];
      if (typeof k === 'string') { if (k.trim()) push('para', k); continue; }
      const t = k.tag;
      if (t === 'template' || t === 'svg' || t === 'script' || t === 'style') continue;

      if (isFig(k)) {
        let j = i + 1;
        while (j < kids.length && typeof kids[j] === 'string' && !kids[j].trim()) j++;
        const nx = kids[j];
        const narr = nx && typeof nx === 'object' && nx.tag === 'template' && has(nx, 'narrate') ? nx : null;
        figure(k, narr);
        if (narr) i = j;
        continue;
      }
      if (t === 'section' && has(k, 'sec')) {
        secN++;
        const h2 = els(k).find((x) => x.tag === 'h2');
        const id = k.attrs.id || `sec-${secN}`;
        push('heading', h2 ? textOf(h2) : '', { sec: id });
        walk({ kids: k.kids.filter((x) => x !== h2) });
        continue;
      }
      if (t === 'div' && has(k, 'panel')) {
        if (k.attrs['data-title']) push('label', k.attrs['data-title']);
        walk(k);
        continue;
      }
      if (t === 'div' && has(k, 'tablewrap') || t === 'table') { table(k); continue; }
      if (t === 'div' && has(k, 'stats')) { for (const st of els(k)) push('para', textOf(st)); continue; }
      if (t === 'div' && has(k, 'paper-cite')) { push('para', textOf(k)); continue; }
      if (t === 'div' && has(k, 'evidence-line')) { push('para', textOf(k, { grades: true })); continue; }
      if (t === 'div' && has(k, 'takeaways')) {
        const h = els(k).find((x) => /^h[3-6]$/.test(x.tag));
        push('label', h ? textOf(h) : 'Key takeaways');
        const items = [];
        (function collect(x) { for (const y of els(x)) { if (y.tag === 'li') items.push(y); else collect(y); } })(k);
        items.forEach((li, ix) => push('para', `${ORD[ix] ? ORD[ix] + ', ' : ''}${textOf(li)}`));
        continue;
      }
      if (t === 'ol' && has(k, 'worked')) {
        for (const li of els(k)) push('para', textOf(li), { calc: true });
        continue;
      }
      if (/^h[3-4]$/.test(t)) { push('sub', textOf(k)); continue; }
      if (/^h[5-6]$/.test(t) || t === 'dt') {
        // "Who" + following paragraph read as one line
        let j = i + 1;
        while (j < kids.length && typeof kids[j] === 'string' && !kids[j].trim()) j++;
        const nx = kids[j];
        if (nx && typeof nx === 'object' && /^(p|dd)$/.test(nx.tag)) {
          push('para', `${textOf(k)}: ${textOf(nx)}`);
          i = j;
        } else push('label', textOf(k));
        continue;
      }
      if (/^(p|li|dd|blockquote|figcaption)$/.test(t) || (t === 'div' && /\b(who|answer|m|f)\b/.test(k.attrs.class || '') && !els(k).some((x) => /^(p|h5|h6|ul|ol)$/.test(x.tag)))) {
        // a list item that holds blocks of its own (steps) is walked, not flattened
        if (t === 'li' && els(k).some((x) => /^(h5|h6|p|ul|ol)$/.test(x.tag))) { walk(k); continue; }
        push('para', textOf(k));
        continue;
      }
      walk(k);
    }
  }

  // opener
  const p = partOf[c.part];
  const idx = chapters.indexOf(c);
  const firstOfPart = p.n && chapters.findIndex((x) => x.part === c.part) === idx;
  push('title', [
    firstOfPart ? `Part ${['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six'][['', 'I', 'II', 'III', 'IV', 'V', 'VI'].indexOf(p.n)]}: ${p.title}.` : '',
    c.ch ? `Chapter ${c.ch}.` : '',
    `${c.title}.`,
    `${c.sub}.`,
  ].filter(Boolean).join(' '));
  walk(tree);
  push('label', c.ch ? `End of chapter ${c.ch}` : `End of ${c.title}`);
  return { segments: segs, figures: figN };
}

export async function narrationFor(c) {
  const frag = await readFile(join(ROOT, 'content', `${c.id}.html`), 'utf8');
  const { segments, figures } = buildSegments(frag, c);
  const hash = createHash('sha1').update(JSON.stringify(segments)).digest('hex').slice(0, 12);
  return { id: c.id, title: c.title, ch: c.ch ?? null, hash, figures, segments };
}

async function main() {
  const only = new Set(process.argv.slice(2));
  await mkdir(OUT, { recursive: true });
  let words = 0, n = 0;
  for (const c of chapters) {
    if (SKIP.has(c.id) || (only.size && !only.has(c.id))) continue;
    if (!existsSync(join(ROOT, 'content', `${c.id}.html`))) continue;
    const nar = await narrationFor(c);
    words += nar.segments.reduce((a, s) => a + s.t.split(/\s+/).length, 0);
    await writeFile(join(OUT, `${c.id}.json`), JSON.stringify(nar, null, 1), 'utf8');
    n++;
  }
  console.log(`narration scripts: ${n} chapters, ~${words.toLocaleString()} words (~${(words / 155 / 60).toFixed(1)} h at 155 wpm)`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
