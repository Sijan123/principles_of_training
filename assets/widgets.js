/* ============================================================
   widgets.js — interactive figures for The Science of Training.
   Mount by markup:  <div class="widget" data-widget="NAME">…</div>
   Every widget is pure SVG + DOM, no dependencies.
   ============================================================ */
(function () {
  'use strict';

  /* ---------------- helpers ---------------- */
  var W = {};
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var fmt = function (v, d) { return (Math.round(v * Math.pow(10, d || 0)) / Math.pow(10, d || 0)).toFixed(d || 0); };
  var lerp = function (a, b, t) { return a + (b - a) * t; };

  // interpolate a series of [x,y] anchors at x
  function interp(anchors, x) {
    if (x <= anchors[0][0]) return anchors[0][1];
    var last = anchors[anchors.length - 1];
    if (x >= last[0]) return last[1];
    for (var i = 1; i < anchors.length; i++) {
      if (x <= anchors[i][0]) {
        var a = anchors[i - 1], b = anchors[i];
        return lerp(a[1], b[1], (x - a[0]) / (b[0] - a[0]));
      }
    }
    return last[1];
  }

  /* plot frame: returns scales + axis markup */
  function Plot(o) {
    var w = o.w || 640, h = o.h || 300;
    var pad = o.pad || { t: 16, r: 16, b: 34, l: 44 };
    var iw = w - pad.l - pad.r, ih = h - pad.t - pad.b;
    var xd = o.x, yd = o.y, xlog = !!o.xlog;
    function fx(v) {
      var t = xlog
        ? (Math.log(clamp(v, xd[0], xd[1])) - Math.log(xd[0])) / (Math.log(xd[1]) - Math.log(xd[0]))
        : (v - xd[0]) / (xd[1] - xd[0]);
      return pad.l + t * iw;
    }
    function fy(v) { return pad.t + ih - ((v - yd[0]) / (yd[1] - yd[0])) * ih; }
    var g = '';
    (o.yTicks || []).forEach(function (t) {
      var val = (typeof t === 'object') ? t.v : t, lab = (typeof t === 'object') ? t.l : String(t);
      g += '<line class="svg-grid" x1="' + pad.l + '" x2="' + (w - pad.r) + '" y1="' + fy(val) + '" y2="' + fy(val) + '"/>' +
           '<text class="svg-tick" x="' + (pad.l - 6) + '" y="' + (fy(val) + 3.2) + '" text-anchor="end">' + lab + '</text>';
    });
    (o.xTicks || []).forEach(function (t) {
      var val = (typeof t === 'object') ? t.v : t, lab = (typeof t === 'object') ? t.l : String(t);
      g += '<line class="svg-grid" y1="' + pad.t + '" y2="' + (h - pad.b) + '" x1="' + fx(val) + '" x2="' + fx(val) + '"/>' +
           '<text class="svg-tick" x="' + fx(val) + '" y="' + (h - pad.b + 14) + '" text-anchor="middle">' + lab + '</text>';
    });
    g += '<line class="svg-axis" x1="' + pad.l + '" y1="' + (h - pad.b) + '" x2="' + (w - pad.r) + '" y2="' + (h - pad.b) + '"/>' +
         '<line class="svg-axis" x1="' + pad.l + '" y1="' + pad.t + '" x2="' + pad.l + '" y2="' + (h - pad.b) + '"/>';
    if (o.xLabel) g += '<text class="svg-lbl" x="' + (pad.l + iw / 2) + '" y="' + (h - 2) + '" text-anchor="middle">' + o.xLabel + '</text>';
    if (o.yLabel) g += '<text class="svg-lbl" transform="translate(11,' + (pad.t + ih / 2) + ') rotate(-90)" text-anchor="middle">' + o.yLabel + '</text>';
    return {
      w: w, h: h, pad: pad, iw: iw, ih: ih, fx: fx, fy: fy, axes: g,
      line: function (pts, style) {
        var d = pts.map(function (p, i) { return (i ? 'L' : 'M') + fx(p[0]).toFixed(1) + ' ' + fy(p[1]).toFixed(1); }).join(' ');
        return '<path d="' + d + '" fill="none" style="' + style + '" stroke-linejoin="round" stroke-linecap="round"/>';
      },
      area: function (pts, y0, style) {
        var d = pts.map(function (p, i) { return (i ? 'L' : 'M') + fx(p[0]).toFixed(1) + ' ' + fy(p[1]).toFixed(1); }).join(' ');
        d += 'L' + fx(pts[pts.length - 1][0]).toFixed(1) + ' ' + fy(y0).toFixed(1) +
             'L' + fx(pts[0][0]).toFixed(1) + ' ' + fy(y0).toFixed(1) + 'Z';
        return '<path d="' + d + '" style="' + style + '"/>';
      },
      band: function (topPts, botPts, style) {
        var d = topPts.map(function (p, i) { return (i ? 'L' : 'M') + fx(p[0]).toFixed(1) + ' ' + fy(p[1]).toFixed(1); }).join(' ');
        for (var i = botPts.length - 1; i >= 0; i--) d += 'L' + fx(botPts[i][0]).toFixed(1) + ' ' + fy(botPts[i][1]).toFixed(1);
        return '<path d="' + d + 'Z" style="' + style + '"/>';
      },
      vline: function (x, style, label) {
        var s = '<line x1="' + fx(x) + '" x2="' + fx(x) + '" y1="' + pad.t + '" y2="' + (h - pad.b) + '" style="' + style + '"/>';
        if (label) s += '<text class="svg-lbl svg-lbl--b" x="' + (fx(x) + 4) + '" y="' + (pad.t + 11) + '">' + label + '</text>';
        return s;
      },
      svg: function (inner) {
        return '<svg viewBox="0 0 ' + w + ' ' + h + '" role="img" style="width:100%;height:auto">' + g + inner + '</svg>';
      }
    };
  }

  function body(el) {
    var b = $('.widget__body', el);
    if (!b) { b = document.createElement('div'); b.className = 'widget__body'; el.appendChild(b); }
    return b;
  }
  function rng(id, label, min, max, val, step, unit) {
    return '<div class="ctl"><label for="' + id + '">' + label +
      '<span class="v" id="' + id + '-v">' + val + (unit || '') + '</span></label>' +
      '<input type="range" id="' + id + '" min="' + min + '" max="' + max + '" value="' + val + '" step="' + (step || 1) + '"></div>';
  }
  function seg(id, label, opts, activeIdx) {
    return '<div class="ctl"><label>' + label + '</label><div class="segs" id="' + id + '">' +
      opts.map(function (o, i) {
        return '<button type="button" data-v="' + o.v + '" aria-pressed="' + (i === activeIdx) + '">' + o.l + '</button>';
      }).join('') + '</div></div>';
  }
  function wireSeg(el, id, cb) {
    var box = $('#' + id, el);
    if (!box) return;
    box.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      $$('button', box).forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
      cb(b.dataset.v);
    });
  }
  function wireRng(el, ids, cb) {
    ids.forEach(function (id) {
      var i = $('#' + id, el); if (!i) return;
      i.addEventListener('input', cb);
    });
  }
  function ro(items) {
    return '<div class="readout">' + items.map(function (i) {
      return '<div><div class="v">' + i.v + (i.u ? '<small> ' + i.u + '</small>' : '') + '</div><div class="k">' + i.k + '</div></div>';
    }).join('') + '</div>';
  }
  function legend(items) {
    return '<div class="legend">' + items.map(function (i) {
      return '<span><i style="background:' + i.c + '"></i>' + i.l + '</span>';
    }).join('') + '</div>';
  }
  var D = function (n) { return 'var(--d' + n + ')'; };

  /* ============================================================
     1. SARCOMERE — animated sliding filament
     ============================================================ */
  W['sarcomere'] = function (el) {
    var b = body(el);
    b.innerHTML =
      '<div class="ctls ctls--3">' +
      rng('sc-act', 'Activation (Ca²⁺ release)', 0, 100, 70, 1, '%') +
      rng('sc-len', 'Sarcomere length', 60, 140, 100, 1, '%') +
      seg('sc-play', 'Cross-bridge cycling', [{ v: '1', l: 'Running' }, { v: '0', l: 'Paused' }], 0) +
      '</div><div id="sc-svg"></div>' +
      '<div id="sc-ro"></div>' +
      legend([{ c: D(2), l: 'Myosin (thick filament)' }, { c: D(1), l: 'Actin (thin filament)' },
              { c: D(3), l: 'Bound cross-bridge' }, { c: 'var(--muted)', l: 'Titin / Z-disc' }]) +
      '<div id="sc-steps" style="margin-top:1rem"></div>';

    var running = true, t = 0, raf = null;

    function draw() {
      var act = +$('#sc-act', el).value, lenPct = +$('#sc-len', el).value;
      $('#sc-act-v', el).textContent = act + '%';
      $('#sc-len-v', el).textContent = lenPct + '%';

      var w = 680, h = 190;
      var L = lenPct / 100;
      var cx = w / 2;
      var halfS = 150 * L;                 // half sarcomere length
      var zL = cx - halfS, zR = cx + halfS;
      var thickHalf = 74;                  // myosin is fixed length
      var overlap = clamp(thickHalf - (halfS - 68), 0, 62); // actin/myosin overlap
      var y = 88;

      // force from length-tension (plateau ~95-105%) and activation
      var lt = lenPct < 60 ? 0 : lenPct < 85 ? (lenPct - 55) / 40
            : lenPct <= 105 ? 1 : clamp(1 - (lenPct - 105) / 48, 0, 1);
      var force = lt * (act / 100);
      var nBound = Math.round(force * 10);

      var s = '';
      // Z discs
      [zL, zR].forEach(function (zx) {
        s += '<rect x="' + (zx - 3) + '" y="' + (y - 52) + '" width="6" height="104" rx="1.5" style="fill:var(--ink-2)"/>';
      });
      s += '<text class="svg-tick" x="' + zL + '" y="' + (y + 68) + '" text-anchor="middle">Z-disc</text>';
      s += '<text class="svg-tick" x="' + zR + '" y="' + (y + 68) + '" text-anchor="middle">Z-disc</text>';

      // titin (springs from Z to thick filament)
      [[zL, cx - thickHalf], [zR, cx + thickHalf]].forEach(function (p) {
        var x0 = p[0], x1 = p[1], n = 8, d = 'M' + x0 + ' ' + y;
        for (var i = 1; i <= n; i++) {
          var xx = lerp(x0, x1, i / n);
          d += ' L' + xx + ' ' + (y + (i % 2 ? -7 : 7));
        }
        d += ' L' + x1 + ' ' + y;
        s += '<path d="' + d + '" fill="none" style="stroke:var(--muted);stroke-width:1.1;opacity:.75"/>';
      });

      // actin (thin) filaments from each Z disc inward
      [[zL, 1], [zR, -1]].forEach(function (p) {
        var x0 = p[0], dir = p[1];
        var len = halfS - 10;
        [-26, 26].forEach(function (off) {
          s += '<rect x="' + (dir > 0 ? x0 : x0 - len) + '" y="' + (y + off - 3.2) + '" width="' + len + '" height="6.4" rx="3.2" style="fill:' + D(1) + '"/>';
          // actin beads
          for (var i = 0; i < len; i += 11) {
            var bx = x0 + dir * (i + 5);
            s += '<circle cx="' + bx + '" cy="' + (y + off) + '" r="2.4" style="fill:var(--surface);opacity:.55"/>';
          }
        });
      });

      // thick filament
      s += '<rect x="' + (cx - thickHalf) + '" y="' + (y - 7) + '" width="' + (thickHalf * 2) + '" height="14" rx="7" style="fill:' + D(2) + '"/>';
      s += '<text class="svg-tick" x="' + cx + '" y="' + (y - 14) + '" text-anchor="middle">M-line</text>';

      // myosin heads
      var phase = running ? t : 0.25;
      for (var i = -6; i <= 6; i++) {
        if (i === 0) continue;
        var hx = cx + i * 11;
        if (Math.abs(hx - cx) > thickHalf - 6) continue;
        [-1, 1].forEach(function (side) {
          var reach = 19;
          var inOverlap = Math.abs(hx - cx) > (thickHalf - overlap) - 2;
          var idx = (i + 6) * 2 + (side > 0 ? 1 : 0);
          var bound = inOverlap && (idx % 13) < nBound * 1.3;
          var p = (phase + idx * 0.11) % 1;
          // stroke cycle: 0-.25 attach, .25-.6 power stroke, .6-.8 detach, .8-1 recock
          var ang = bound ? (p < 0.25 ? lerp(42, 20, p / 0.25)
                        : p < 0.6 ? lerp(20, -34, (p - 0.25) / 0.35)
                        : p < 0.8 ? lerp(-34, 50, (p - 0.6) / 0.2)
                        : lerp(50, 42, (p - 0.8) / 0.2)) : 46;
          var rad = ang * Math.PI / 180;
          var ex = hx + Math.sin(rad) * reach * (hx < cx ? -1 : 1);
          var ey = y + side * (7 + Math.cos(rad) * reach);
          var attached = bound && p > 0.2 && p < 0.65;
          s += '<line x1="' + hx + '" y1="' + (y + side * 6) + '" x2="' + ex.toFixed(1) + '" y2="' + ey.toFixed(1) +
               '" style="stroke:' + (attached ? D(3) : D(2)) + ';stroke-width:' + (attached ? 2.6 : 1.8) + ';opacity:' + (bound ? 1 : .5) + '" stroke-linecap="round"/>';
          s += '<circle cx="' + ex.toFixed(1) + '" cy="' + ey.toFixed(1) + '" r="' + (attached ? 4 : 3.2) +
               '" style="fill:' + (attached ? D(3) : D(2)) + ';opacity:' + (bound ? 1 : .5) + '"/>';
        });
      }

      // overlap shading
      if (overlap > 1) {
        [[cx - thickHalf, overlap], [cx + thickHalf - overlap, overlap]].forEach(function (o) {
          s += '<rect x="' + o[0] + '" y="' + (y - 34) + '" width="' + o[1] + '" height="68" style="fill:' + D(3) + ';opacity:.1"/>';
        });
      }

      // force bar
      s += '<text class="svg-lbl" x="20" y="' + (h - 12) + '">Force</text>';
      s += '<rect x="58" y="' + (h - 22) + '" width="300" height="11" rx="5.5" style="fill:var(--rule)"/>';
      s += '<rect x="58" y="' + (h - 22) + '" width="' + (300 * force).toFixed(1) + '" height="11" rx="5.5" style="fill:' + D(2) + '"/>';
      s += '<text class="svg-tick" x="368" y="' + (h - 13) + '">' + Math.round(force * 100) + '% of peak</text>';

      $('#sc-svg', el).innerHTML = '<svg viewBox="0 0 ' + w + ' ' + h + '" style="width:100%;height:auto" role="img" aria-label="Animated sarcomere"></svg>';
      $('#sc-svg svg', el).innerHTML = s;

      $('#sc-ro', el).innerHTML = ro([
        { v: fmt(overlap / 62 * 100, 0), u: '%', k: 'Filament overlap available' },
        { v: fmt(lt * 100, 0), u: '%', k: 'Length–tension factor' },
        { v: nBound * 10, u: '%', k: 'Cross-bridges bound' },
        { v: fmt(force * 100, 0), u: '%', k: 'Force produced' }
      ]);

      var note = lenPct < 80 ? 'Over-shortened: thin filaments collide and thick filaments jam into the Z-disc, so force falls.'
        : lenPct > 118 ? 'Over-stretched: too little overlap for cross-bridges to form — force falls, and passive titin tension rises.'
        : 'Near optimum: maximal overlap, every available head can find a binding site.';
      $('#sc-steps', el).innerHTML = '<p style="font-size:.9rem;margin:0;color:var(--ink-2)"><strong>' +
        (lenPct < 80 ? 'Descending (short) limb. ' : lenPct > 118 ? 'Descending (long) limb. ' : 'Plateau. ') + '</strong>' + note + '</p>';
    }

    function loop() {
      t = (t + 0.012) % 1;
      draw();
      raf = requestAnimationFrame(loop);
    }
    wireRng(el, ['sc-act', 'sc-len'], draw);
    wireSeg(el, 'sc-play', function (v) {
      running = v === '1';
      if (running && !raf) loop(); else if (!running && raf) { cancelAnimationFrame(raf); raf = null; draw(); }
    });
    draw();
    // only animate while on screen
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (e) {
        if (e[0].isIntersecting) { if (running && !raf) loop(); }
        else if (raf) { cancelAnimationFrame(raf); raf = null; }
      }, { threshold: 0.12 }).observe(el);
    } else loop();
  };

  /* ============================================================
     2. ENERGY SYSTEMS — contribution vs duration
     ============================================================ */
  var ES = {
    pcr: [[1, 73], [3, 60], [6, 50], [10, 40], [15, 30], [30, 20], [60, 12], [120, 7], [300, 3], [900, 1], [3600, 0.5]],
    gly: [[1, 25], [3, 36], [6, 41], [10, 46], [15, 48], [30, 50], [60, 40], [120, 25], [300, 12], [900, 5], [3600, 2]],
  };
  W['energy-systems'] = function (el) {
    var b = body(el);
    b.innerHTML = '<div class="ctls"><div class="ctl">' +
      '<label for="es-d">Effort duration<span class="v" id="es-d-v">30 s</span></label>' +
      '<input type="range" id="es-d" min="0" max="100" value="38" step="1"></div></div>' +
      '<div id="es-svg"></div><div id="es-ro"></div>' +
      legend([{ c: D(2), l: 'Phosphagen (ATP–PCr)' }, { c: D(3), l: 'Glycolytic' }, { c: D(1), l: 'Oxidative' }]) +
      '<p id="es-note" style="font-size:.9rem;margin:.8rem 0 0;color:var(--ink-2)"></p>';

    function sliderToSec(v) { return Math.exp(lerp(Math.log(1), Math.log(3600), v / 100)); }
    function secLabel(s) {
      if (s < 60) return fmt(s, s < 10 ? 1 : 0) + ' s';
      if (s < 3600) return fmt(s / 60, s < 600 ? 1 : 0) + ' min';
      return fmt(s / 3600, 1) + ' h';
    }
    function draw() {
      var v = +$('#es-d', el).value, sec = sliderToSec(v);
      $('#es-d-v', el).textContent = secLabel(sec);
      var p = Plot({
        w: 660, h: 300, x: [1, 3600], y: [0, 100], xlog: true,
        xTicks: [{ v: 1, l: '1s' }, { v: 5, l: '5s' }, { v: 15, l: '15s' }, { v: 60, l: '1m' }, { v: 240, l: '4m' }, { v: 900, l: '15m' }, { v: 3600, l: '1h' }],
        yTicks: [0, 25, 50, 75, 100], xLabel: 'Duration of maximal effort (log scale)', yLabel: '% of ATP supply'
      });
      var pts = [], i;
      for (i = 0; i <= 120; i++) {
        var x = Math.exp(lerp(Math.log(1), Math.log(3600), i / 120));
        var a = interp(ES.pcr, x), g = interp(ES.gly, x);
        pts.push([x, a, g]);
      }
      var l1 = pts.map(function (q) { return [q[0], q[1]]; });
      var l2 = pts.map(function (q) { return [q[0], q[1] + q[2]]; });
      var top = pts.map(function (q) { return [q[0], 100]; });
      var inner = p.area(l1, 0, 'fill:' + D(2) + ';opacity:.85') +
        p.band(l2, l1, 'fill:' + D(3) + ';opacity:.85') +
        p.band(top, l2, 'fill:' + D(1) + ';opacity:.85') +
        p.vline(sec, 'stroke:var(--ink);stroke-width:2;stroke-dasharray:4 3');
      // crossover marker: where oxidative passes 50%
      var cx = 75;
      inner += p.vline(cx, 'stroke:var(--ink-2);stroke-width:1;stroke-dasharray:2 4', '50/50 ≈ 75 s');
      $('#es-svg', el).innerHTML = p.svg(inner);

      var a = interp(ES.pcr, sec), g = interp(ES.gly, sec), ox = 100 - a - g;
      $('#es-ro', el).innerHTML = ro([
        { v: fmt(a, 0), u: '%', k: 'Phosphagen — stored ATP + PCr' },
        { v: fmt(g, 0), u: '%', k: 'Glycolytic — glucose → lactate' },
        { v: fmt(ox, 0), u: '%', k: 'Oxidative — mitochondrial' },
        { v: fmt(a + g, 0), u: '%', k: 'Non-oxidative total' }
      ]);
      var note = sec <= 10 ? 'A 10-second effort is powered almost entirely by ATP already sitting in the muscle plus phosphocreatine. No fuel is digested, no oxygen is needed, and nothing limits you but stored substrate and neural drive.'
        : sec <= 45 ? 'This is the glycolytic window — the most metabolically violent domain. Glucose is split to lactate at a furious rate; H⁺ accumulates, and that acidosis is what makes a 400 m hurt in a way a marathon never does.'
        : sec <= 180 ? 'Oxidative metabolism has caught up and passed the anaerobic pathways. Around 75 seconds the two halves are equal — which is why 800 m runners need both an engine and a buffer.'
        : sec <= 1200 ? 'Now overwhelmingly aerobic. Performance here is set by VO₂max, by the fraction of it you can hold, and by efficiency — not by anaerobic capacity.'
        : 'Almost purely oxidative. The limits move to substrate: glycogen stores, fat oxidation rate, fluid and thermoregulation — which is why fuelling decides long events.';
      $('#es-note', el).textContent = note;
    }
    wireRng(el, ['es-d'], draw); draw();
  };

  /* ============================================================
     3. SIZE PRINCIPLE — motor unit recruitment
     ============================================================ */
  W['size-principle'] = function (el) {
    var b = body(el);
    b.innerHTML = '<div class="ctls ctls--2">' +
      rng('sp-f', 'Force demand (% of maximum)', 0, 100, 35, 1, '%') +
      seg('sp-mode', 'Contraction intent', [{ v: 'slow', l: 'Controlled' }, { v: 'fast', l: 'Explosive' }], 0) +
      '</div><div id="sp-svg"></div><div id="sp-ro"></div>' +
      legend([{ c: D(1), l: 'Type I — slow, fatigue-resistant' }, { c: D(3), l: 'Type IIa — fast oxidative' },
              { c: D(2), l: 'Type IIx — fast glycolytic' }, { c: 'var(--rule)', l: 'Not recruited' }]) +
      '<p id="sp-note" style="font-size:.9rem;margin:.9rem 0 0;color:var(--ink-2)"></p>';

    // 24 motor units: threshold rises with size
    var MU = [];
    for (var i = 0; i < 24; i++) {
      var frac = i / 23;
      MU.push({
        thr: Math.pow(frac, 1.7) * 97 + 1,
        fibres: Math.round(lerp(140, 760, Math.pow(frac, 1.5))),
        type: frac < 0.46 ? 1 : frac < 0.8 ? 2 : 3
      });
    }
    function draw() {
      var f = +$('#sp-f', el).value;
      var explosive = $('#sp-mode button[aria-pressed="true"]', el).dataset.v === 'fast';
      $('#sp-f-v', el).textContent = f + '%';
      // explosive intent compresses thresholds — high-threshold units recruited at lower force
      var eff = explosive ? Math.min(100, f * 1.55 + 12) : f;

      var w = 660, h = 322, x0 = 128, barW = 440, rowH = 10.2, top = 40;
      var s = '<text class="svg-title" x="10" y="15">Motor unit pool — smallest at the bottom</text>';
      var activeF = 0, totalF = 0, byType = [0, 0, 0, 0];
      MU.forEach(function (m, i) {
        var y = top + (23 - i) * rowH;
        var on = eff >= m.thr;
        var col = on ? (m.thr <= 100 ? D(m.type === 1 ? 1 : m.type === 2 ? 3 : 2) : 'var(--rule)') : 'var(--rule)';
        var bw = 26 + (m.fibres / 760) * 120;
        totalF += m.fibres;
        if (on) { activeF += m.fibres; byType[m.type] += m.fibres; }
        // threshold position bar
        s += '<rect x="' + x0 + '" y="' + y + '" width="' + barW + '" height="' + (rowH - 2.4) + '" rx="2" style="fill:var(--rule);opacity:.35"/>';
        s += '<rect x="' + x0 + '" y="' + y + '" width="' + (barW * m.thr / 100).toFixed(1) + '" height="' + (rowH - 2.4) +
             '" rx="2" style="fill:' + col + ';opacity:' + (on ? .95 : .5) + '"/>';
        // soma size
        s += '<circle cx="' + (x0 - 12 - bw / 9) + '" cy="' + (y + (rowH - 2.4) / 2) + '" r="' + (2 + m.fibres / 260).toFixed(1) +
             '" style="fill:' + col + '"/>';
        if (i === 0) s += '<text class="svg-tick" x="' + (x0 - 34) + '" y="' + (y + 7) + '" text-anchor="end">small</text>';
        if (i === 23) s += '<text class="svg-tick" x="' + (x0 - 34) + '" y="' + (y + 7) + '" text-anchor="end">large</text>';
      });
      // demand line
      var dx = x0 + barW * eff / 100;
      s += '<line x1="' + dx + '" x2="' + dx + '" y1="' + (top - 8) + '" y2="' + (top + 24 * rowH + 4) + '" style="stroke:var(--ink);stroke-width:2;stroke-dasharray:4 3"/>';
      s += '<text class="svg-lbl svg-lbl--b" x="' + (dx + 5) + '" y="' + (top - 10) + '">effective drive ' + Math.round(eff) + '%</text>';
      for (var t = 0; t <= 100; t += 25) {
        s += '<text class="svg-tick" x="' + (x0 + barW * t / 100) + '" y="' + (top + 24 * rowH + 17) + '" text-anchor="middle">' + t + '%</text>';
      }
      s += '<text class="svg-lbl" x="' + (x0 + barW / 2) + '" y="' + (h - 7) + '" text-anchor="middle">Recruitment threshold (% of maximal voluntary force)</text>';
      $('#sp-svg', el).innerHTML = '<svg viewBox="0 0 ' + w + ' ' + h + '" style="width:100%;height:auto" role="img">' + s + '</svg>';

      var pct = activeF / totalF * 100;
      $('#sp-ro', el).innerHTML = ro([
        { v: MU.filter(function (m) { return eff >= m.thr; }).length + '/24', k: 'Motor units active' },
        { v: fmt(pct, 0), u: '%', k: 'Muscle fibres under tension' },
        { v: fmt(byType[1] / Math.max(activeF, 1) * 100, 0), u: '%', k: 'of active fibres are Type I' },
        { v: fmt((byType[2] + byType[3]) / Math.max(activeF, 1) * 100, 0), u: '%', k: 'of active fibres are Type II' }
      ]);
      var note;
      if (explosive && f < 45) note = 'Explosive intent is the loophole. Because recruitment tracks the <em>rate</em> of force development as well as its magnitude, a light load moved with maximal intent recruits high-threshold units that the same load lifted slowly would never reach. This is why speed work and ballistic lifts train fast units without heavy loads.';
      else if (f < 25) note = 'Easy effort. Only small, slow, fatigue-resistant units are firing — and they will keep firing for hours. This is the domain of zone 2: huge mitochondrial stimulus to Type I fibres, almost no mechanical stress elsewhere.';
      else if (f < 60) note = 'Moderate effort. Type IIa units are joining. Note the key consequence for training: the top third of the pool is still idle, so a muscle worked only at this intensity leaves its most trainable fibres untouched — unless the set is taken close enough to failure that fatigue forces them in.';
      else if (f < 85) note = 'Heavy. Almost the whole pool is recruited from the first repetition, which is why 5 heavy reps can build as much strength as 15 light ones — but the light set only gets there in its final, grinding reps.';
      else note = 'Maximal. Every available motor unit is recruited and firing near its peak rate. Further force now comes not from recruiting more units but from firing them faster — rate coding — and from better synchronisation and less antagonist co-contraction.';
      $('#sp-note', el).innerHTML = note;
    }
    wireRng(el, ['sp-f'], draw);
    wireSeg(el, 'sp-mode', draw);
    draw();
  };

  /* ============================================================
     4. LACTATE CURVE — thresholds and how training moves them
     ============================================================ */
  W['lactate-curve'] = function (el) {
    var b = body(el);
    b.innerHTML = '<div class="ctls ctls--2">' +
      rng('lc-w', 'Weeks of consistent training', 0, 24, 0, 1, ' wk') +
      seg('lc-focus', 'Training emphasis', [{ v: 'z2', l: 'Mostly easy' }, { v: 'thr', l: 'Threshold' }, { v: 'pol', l: 'Polarised' }], 2) +
      '</div><div id="lc-svg"></div><div id="lc-ro"></div>' +
      legend([{ c: 'var(--muted)', l: 'Untrained baseline' }, { c: D(1), l: 'After training' },
              { c: D(4), l: 'LT1 (aerobic threshold, ≈2 mmol)' }, { c: D(2), l: 'LT2 (MLSS / anaerobic threshold, ≈4 mmol)' }]) +
      '<p id="lc-note" style="font-size:.9rem;margin:.9rem 0 0;color:var(--ink-2)"></p>';

    function curve(shift, steep) {
      var pts = [];
      for (var x = 30; x <= 100; x += 1) {
        var z = (x - shift) / steep;
        pts.push([x, 0.75 + 0.035 * Math.exp(Math.max(0, z) * 0.085 * steep / 10) * Math.pow(Math.max(0, x - shift + 18) / 10, 2.1)]);
      }
      return pts;
    }
    function thresholdAt(pts, mmol) {
      for (var i = 1; i < pts.length; i++) if (pts[i][1] >= mmol) return pts[i][0];
      return 100;
    }
    function draw() {
      var wk = +$('#lc-w', el).value;
      var focus = $('#lc-focus button[aria-pressed="true"]', el).dataset.v;
      $('#lc-w-v', el).textContent = wk + ' wk';
      // easy volume shifts LT1 most; threshold work shifts LT2; polarised shifts both
      var g = wk / 24;
      var shift = { z2: 15 * g, thr: 10 * g, pol: 14 * g }[focus];
      var steepChange = { z2: 1.0 + .18 * g, thr: 1.0 + .30 * g, pol: 1.0 + .26 * g }[focus];

      var base = curve(42, 10), now = curve(42 + shift, 10 * steepChange);
      var p = Plot({
        w: 660, h: 320, x: [30, 100], y: [0, 10],
        xTicks: [40, 50, 60, 70, 80, 90, 100], yTicks: [0, 2, 4, 6, 8, 10],
        xLabel: 'Intensity (% of VO₂max)', yLabel: 'Blood lactate (mmol/L)'
      });
      var lt1 = thresholdAt(now, 2), lt2 = thresholdAt(now, 4);
      var lt1b = thresholdAt(base, 2), lt2b = thresholdAt(base, 4);
      var inner = '';
      // zones shading
      inner += '<rect x="' + p.fx(30) + '" y="' + p.pad.t + '" width="' + (p.fx(lt1) - p.fx(30)) + '" height="' + p.ih + '" style="fill:' + D(4) + ';opacity:.08"/>';
      inner += '<rect x="' + p.fx(lt1) + '" y="' + p.pad.t + '" width="' + (p.fx(lt2) - p.fx(lt1)) + '" height="' + p.ih + '" style="fill:' + D(3) + ';opacity:.10"/>';
      inner += '<rect x="' + p.fx(lt2) + '" y="' + p.pad.t + '" width="' + (p.fx(100) - p.fx(lt2)) + '" height="' + p.ih + '" style="fill:' + D(2) + ';opacity:.10"/>';
      inner += '<text class="svg-tick" x="' + ((p.fx(30) + p.fx(lt1)) / 2) + '" y="' + (p.pad.t + 12) + '" text-anchor="middle">ZONE 1</text>';
      inner += '<text class="svg-tick" x="' + ((p.fx(lt1) + p.fx(lt2)) / 2) + '" y="' + (p.pad.t + 12) + '" text-anchor="middle">ZONE 2</text>';
      inner += '<text class="svg-tick" x="' + ((p.fx(lt2) + p.fx(100)) / 2) + '" y="' + (p.pad.t + 12) + '" text-anchor="middle">ZONE 3</text>';
      inner += '<line class="svg-grid" x1="' + p.pad.l + '" x2="' + (p.w - p.pad.r) + '" y1="' + p.fy(2) + '" y2="' + p.fy(2) + '" style="stroke:' + D(4) + ';stroke-dasharray:3 3"/>';
      inner += '<line class="svg-grid" x1="' + p.pad.l + '" x2="' + (p.w - p.pad.r) + '" y1="' + p.fy(4) + '" y2="' + p.fy(4) + '" style="stroke:' + D(2) + ';stroke-dasharray:3 3"/>';
      if (wk > 0) inner += p.line(base, 'stroke:var(--muted);stroke-width:1.6;stroke-dasharray:5 3');
      inner += p.line(now, 'stroke:' + D(1) + ';stroke-width:2.8');
      [[lt1, D(4), 'LT1'], [lt2, D(2), 'LT2']].forEach(function (q) {
        inner += '<circle cx="' + p.fx(q[0]) + '" cy="' + p.fy(q[0] === lt1 ? 2 : 4) + '" r="5" style="fill:' + q[1] + '"/>';
        inner += '<text class="svg-lbl svg-lbl--b" x="' + p.fx(q[0]) + '" y="' + (p.fy(q[0] === lt1 ? 2 : 4) - 10) + '" text-anchor="middle" style="fill:' + q[1] + '">' + q[2] + '</text>';
      });
      $('#lc-svg', el).innerHTML = p.svg(inner);
      $('#lc-ro', el).innerHTML = ro([
        { v: fmt(lt1, 0), u: '% VO₂max', k: 'LT1 — top of easy training' + (wk ? ' (was ' + fmt(lt1b, 0) + '%)' : '') },
        { v: fmt(lt2, 0), u: '% VO₂max', k: 'LT2 — highest sustainable' + (wk ? ' (was ' + fmt(lt2b, 0) + '%)' : '') },
        { v: '+' + fmt(lt2 - lt2b, 0), u: 'pts', k: 'Threshold shift' },
        { v: fmt(lt2 - lt1, 0), u: 'pts', k: 'Width of zone 2' }
      ]);
      var txt = {
        z2: 'High-volume easy training works mainly on the <strong>left</strong> of the curve. It raises LT1 strongly — more mitochondria and capillaries in Type I fibres, more lactate cleared at any given speed — but moves LT2 less. This is why base training feels like it does nothing to your top end and everything to your cruising speed.',
        thr: 'Threshold work pushes <strong>LT2</strong> hardest, improving lactate clearance and the muscle’s ability to use lactate as a fuel at high workloads. The cost is high: it is fatiguing enough that volume elsewhere must fall, and many athletes stall in this grey zone — too hard to accumulate volume, too easy to stress VO₂max.',
        pol: 'A polarised distribution — roughly 80% below LT1 and 15–20% above LT2, with little in between — moves both ends. Easy volume builds the peripheral machinery that clears lactate; hard intervals stress oxygen delivery and the fast fibres. It is the distribution most consistently observed in elite endurance athletes.'
      }[focus];
      $('#lc-note', el).innerHTML = (wk === 0 ? '<strong>Untrained baseline.</strong> Lactate starts rising early and climbs steeply. Move the weeks slider to see adaptation. ' : '') + txt;
    }
    wireRng(el, ['lc-w'], draw); wireSeg(el, 'lc-focus', draw); draw();
  };

  /* ============================================================
     5. FICK — where VO2max comes from
     ============================================================ */
  W['fick'] = function (el) {
    var b = body(el);
    b.innerHTML = '<div class="ctls ctls--2">' +
      rng('fk-hr', 'Maximal heart rate', 150, 210, 190, 1, ' bpm') +
      rng('fk-sv', 'Maximal stroke volume', 60, 220, 105, 1, ' mL') +
      rng('fk-av', 'a–vO₂ difference (extraction)', 10, 20, 15, 0.1, ' mL/100mL') +
      rng('fk-kg', 'Body mass', 40, 120, 72, 1, ' kg') +
      '</div><div id="fk-svg"></div><div id="fk-ro"></div>' +
      '<p id="fk-note" style="font-size:.9rem;margin:.9rem 0 0;color:var(--ink-2)"></p>';
    function draw() {
      var hr = +$('#fk-hr', el).value, sv = +$('#fk-sv', el).value,
          av = +$('#fk-av', el).value, kg = +$('#fk-kg', el).value;
      $('#fk-hr-v', el).textContent = hr + ' bpm';
      $('#fk-sv-v', el).textContent = sv + ' mL';
      $('#fk-av-v', el).textContent = av.toFixed(1);
      $('#fk-kg-v', el).textContent = kg + ' kg';
      var q = hr * sv / 1000;            // L/min
      var vo2 = q * av / 100;            // L/min
      var rel = vo2 * 1000 / kg;

      var w = 660, h = 150, s = '';
      function chip(x, wd, col, big, small) {
        var o = '<rect x="' + x + '" y="42" width="' + wd + '" height="54" rx="6" style="fill:' + col + ';opacity:.16;stroke:' + col + ';stroke-width:1.5"/>';
        o += '<text x="' + (x + wd / 2) + '" y="66" text-anchor="middle" class="svg-lbl svg-lbl--b" style="font-size:14px;fill:' + col + '">' + big + '</text>';
        o += '<text x="' + (x + wd / 2) + '" y="84" text-anchor="middle" class="svg-tick">' + small + '</text>';
        return o;
      }
      s += chip(8, 118, D(2), hr + ' bpm', 'heart rate');
      s += '<text x="136" y="76" text-anchor="middle" class="svg-lbl svg-lbl--b" style="font-size:16px">×</text>';
      s += chip(150, 118, D(3), sv + ' mL', 'stroke volume');
      s += '<text x="278" y="76" text-anchor="middle" class="svg-lbl svg-lbl--b" style="font-size:16px">=</text>';
      s += chip(292, 128, D(1), fmt(q, 1) + ' L/min', 'cardiac output (delivery)');
      s += '<text x="430" y="76" text-anchor="middle" class="svg-lbl svg-lbl--b" style="font-size:16px">×</text>';
      s += chip(444, 100, D(5), av.toFixed(1), 'a–vO₂ diff (extraction)');
      s += '<text x="554" y="76" text-anchor="middle" class="svg-lbl svg-lbl--b" style="font-size:16px">=</text>';
      s += chip(566, 86, D(4), fmt(vo2, 2), 'VO₂ L/min');
      s += '<text class="svg-title" x="8" y="22">The Fick equation — VO₂max is delivery × extraction</text>';
      s += '<text class="svg-tick" x="8" y="122">Central adaptation ← ───────────── → Peripheral adaptation</text>';
      $('#fk-svg', el).innerHTML = '<svg viewBox="0 0 ' + w + ' ' + h + '" style="width:100%;height:auto" role="img">' + s + '</svg>';

      var band = rel < 35 ? 'below average' : rel < 45 ? 'average' : rel < 55 ? 'good' : rel < 65 ? 'very good' : rel < 75 ? 'elite amateur' : 'world class';
      $('#fk-ro', el).innerHTML = ro([
        { v: fmt(q, 1), u: 'L/min', k: 'Maximal cardiac output' },
        { v: fmt(vo2, 2), u: 'L/min', k: 'Absolute VO₂max' },
        { v: fmt(rel, 1), u: 'mL/kg/min', k: 'Relative VO₂max — ' + band },
        { v: fmt(q * 1000 / kg, 0), u: 'mL/kg/min', k: 'Delivery per kg' }
      ]);
      $('#fk-note', el).innerHTML = 'Untrained adults sit near 70–80 mL stroke volume and 14–15 mL/100 mL extraction. Elite endurance athletes reach <strong>160–210 mL</strong> stroke volume — a bigger, more compliant, better-filling left ventricle — while extraction improves far less (to roughly 16–17). That asymmetry is the central fact of endurance physiology: <strong>most of the trainable range in VO₂max lives in stroke volume, not in the muscle’s ability to extract oxygen.</strong> Try it: take stroke volume from 105 to 180 and watch the result, then try the same proportional change on extraction.';
    }
    wireRng(el, ['fk-hr', 'fk-sv', 'fk-av', 'fk-kg'], draw); draw();
  };

  /* ============================================================
     6. TRAINING ZONES calculator
     ============================================================ */
  W['zones'] = function (el) {
    var b = body(el);
    b.innerHTML = '<div class="ctls ctls--3">' +
      rng('z-max', 'Maximum heart rate', 150, 210, 190, 1, ' bpm') +
      rng('z-rest', 'Resting heart rate', 35, 80, 55, 1, ' bpm') +
      rng('z-lthr', 'Threshold HR (LT2) — if known', 120, 200, 170, 1, ' bpm') +
      '</div>' +
      seg('z-model', 'Anchor', [{ v: 'max', l: '% of HRmax' }, { v: 'res', l: '% of HR reserve' }, { v: 'lthr', l: '% of threshold HR' }], 2) +
      '<div id="z-out"></div>' +
      '<p style="font-size:.86rem;margin:.9rem 0 0;color:var(--muted)">Heart rate is a lagging, drifting proxy for intensity. For intervals under three minutes it is useless — use power, pace or RPE. Zone boundaries are individual: a lactate or ventilatory test moves them by up to 8–10 beats.</p>';

    var Z = [
      { n: 1, name: 'Recovery / easy', pm: [50, 68], pr: [40, 60], pl: [60, 82], fuel: 'Fat, mostly', la: '< 1.5', fibre: 'Type I only', purpose: 'Mitochondrial and capillary density, fat oxidation, blood volume. Accumulate here without cost.' },
      { n: 2, name: 'Aerobic / endurance', pm: [68, 79], pr: [60, 73], pl: [82, 91], fuel: 'Fat + carb', la: '1.5–2', fibre: 'Type I, some IIa', purpose: 'The classic "zone 2": highest sustainable fat oxidation, strong peripheral stimulus, modest fatigue. Sits at or just below LT1.' },
      { n: 3, name: 'Tempo', pm: [79, 87], pr: [73, 84], pl: [91, 97], fuel: 'Carb dominant', la: '2–3', fibre: 'I + IIa', purpose: 'Between the thresholds. Useful in moderation; the classic trap if it swallows your easy days and blunts your hard ones.' },
      { n: 4, name: 'Threshold (LT2/MLSS)', pm: [87, 93], pr: [84, 91], pl: [97, 103], fuel: 'Carb', la: '3–5', fibre: 'I + IIa fully', purpose: 'Raises the ceiling on sustainable intensity: lactate clearance, buffering, IIa oxidative capacity.' },
      { n: 5, name: 'VO₂max / supra', pm: [93, 100], pr: [91, 100], pl: [103, 120], fuel: 'Carb + anaerobic', la: '> 6', fibre: 'Full pool incl. IIx', purpose: 'Maximal oxygen delivery and extraction. Accumulate time near VO₂max; expect to need days of recovery.' }
    ];
    function draw() {
      var mx = +$('#z-max', el).value, rs = +$('#z-rest', el).value, lt = +$('#z-lthr', el).value;
      var model = $('#z-model button[aria-pressed="true"]', el).dataset.v;
      $('#z-max-v', el).textContent = mx + ' bpm';
      $('#z-rest-v', el).textContent = rs + ' bpm';
      $('#z-lthr-v', el).textContent = lt + ' bpm';
      function bpm(z, i) {
        if (model === 'max') return Math.round(mx * z.pm[i] / 100);
        if (model === 'res') return Math.round(rs + (mx - rs) * z.pr[i] / 100);
        return Math.round(lt * z.pl[i] / 100);
      }
      var rows = Z.map(function (z) {
        var lo = bpm(z, 0), hi = Math.min(bpm(z, 1), mx);
        var col = D([0, 4, 6, 3, 2, 2][z.n]);
        return '<tr><td><strong style="color:' + col + '">Z' + z.n + '</strong> ' + z.name + '<span class="sub">' + z.purpose + '</span></td>' +
          '<td class="n">' + lo + '–' + hi + '</td>' +
          '<td class="n">' + z.la + '</td><td>' + z.fuel + '</td><td>' + z.fibre + '</td></tr>';
      }).join('');
      $('#z-out', el).innerHTML = '<div class="tablewrap"><table class="dt"><caption>Your zones — ' +
        ({ max: '% of HRmax', res: '% of heart-rate reserve (Karvonen)', lthr: '% of threshold heart rate' }[model]) + '</caption>' +
        '<thead><tr><th>Zone</th><th class="n">bpm</th><th class="n">Lactate</th><th>Main fuel</th><th>Fibres recruited</th></tr></thead><tbody>' +
        rows + '</tbody></table></div>';
    }
    wireRng(el, ['z-max', 'z-rest', 'z-lthr'], draw); wireSeg(el, 'z-model', draw); draw();
  };

  /* ============================================================
     7. HIIT LAB — compare interval protocols
     ============================================================ */
  var PROTO = [
    { id: '4x4', name: 'Norwegian 4×4', work: 240, rest: 180, reps: 4, int: 92, t90: 'high', label: '4 × 4 min @ 90–95% HRmax, 3 min active',
      stim: 'Maximal stroke volume + central', cost: 3, note: 'The most-replicated VO₂max protocol; typical gains 7–10% in 8 weeks.' },
    { id: '4x8', name: '4 × 8 min', work: 480, rest: 120, reps: 4, int: 88, t90: 'high', label: '4 × 8 min @ ~88% HRmax, 2 min',
      stim: 'Threshold + VO₂max blend', cost: 3, note: 'Higher total work, slightly lower intensity. Strong in trained cyclists.' },
    { id: '6x5', name: '6 × 5 min', work: 300, rest: 150, reps: 6, int: 90, t90: 'high', label: '6 × 5 min hard, 2.5 min',
      stim: 'VO₂max accumulation', cost: 4, note: 'Big time-at-VO₂max dose; demands a settled athlete.' },
    { id: '30-15', name: '30/15 (Billat)', work: 30, rest: 15, reps: 26, int: 100, t90: 'high', label: '3 × 13 × (30 s @ ~100% vVO₂max / 15 s easy)',
      stim: 'VO₂max with lower acidosis', cost: 3, note: 'Short work bouts keep VO₂ high while blood lactate stays tolerable — more total time near max than one long block for many athletes.' },
    { id: '40-20', name: '40/20', work: 40, rest: 20, reps: 18, int: 105, t90: 'mid', label: '3 × 6 × (40 s hard / 20 s easy)',
      stim: 'VO₂max + anaerobic', cost: 3, note: 'Popular and tolerable; slightly more glycolytic than 30/15.' },
    { id: '10x1', name: '10 × 1 min', work: 60, rest: 60, reps: 10, int: 100, t90: 'mid', label: '10 × 1 min hard / 1 min easy',
      stim: 'VO₂max, time-efficient', cost: 2, note: 'The best-studied "minimal effective" HIIT for health markers.' },
    { id: 'tabata', name: 'Tabata (original)', work: 20, rest: 10, reps: 8, int: 170, t90: 'mid', label: '8 × (20 s @ 170% VO₂max / 10 s)',
      stim: 'VO₂max + anaerobic capacity', cost: 5, note: 'The real protocol: 170% of VO₂max to exhaustion, 4 min total. Raised VO₂max ~14% and anaerobic capacity ~28% — but it is brutal and almost never performed as published.' },
    { id: 'sit', name: 'Sprint intervals (Wingate)', work: 30, rest: 240, reps: 4, int: 250, t90: 'low', label: '4 × 30 s all-out, 4 min recovery',
      stim: 'Glycolytic + signalling via AMPK/CaMK', cost: 5, note: 'Tiny total work, large signalling response. Raises VO₂max in untrained people despite little time near VO₂max.' },
    { id: 'rehit', name: 'REHIT', work: 20, rest: 180, reps: 2, int: 250, t90: 'low', label: '2 × 20 s all-out in a 10 min ride',
      stim: 'Minimal-dose metabolic health', cost: 2, note: 'Lowest time commitment with measurable insulin-sensitivity and VO₂max effects in sedentary adults.' }
  ];
  W['hiit-lab'] = function (el) {
    var b = body(el);
    b.innerHTML = '<div class="ctls">' + seg('hl-p', 'Protocol', PROTO.map(function (p) { return { v: p.id, l: p.name }; }), 0) + '</div>' +
      '<div id="hl-svg"></div><div id="hl-ro"></div><div id="hl-txt"></div>' +
      '<div id="hl-cmp" style="margin-top:1.2rem"></div>';

    function t90min(p) {
      // crude model of time at/above 90% VO2max per session
      var base = { high: 0.52, mid: 0.33, low: 0.08 }[p.t90];
      var total = p.work * p.reps;
      return total * base / 60;
    }
    function draw(id) {
      var p = PROTO.filter(function (x) { return x.id === id; })[0];
      var total = p.work * p.reps, totalSession = (p.work + p.rest) * p.reps;
      // VO2 kinetics trace
      var w = 660, h = 230;
      var pl = Plot({ w: w, h: h, x: [0, Math.min(totalSession, 1800)], y: [0, 115],
        xTicks: [0, 300, 600, 900, 1200, 1500, 1800].filter(function (t) { return t <= Math.min(totalSession, 1800); }).map(function (t) { return { v: t, l: (t / 60) + 'm' }; }),
        yTicks: [{ v: 0, l: '0' }, { v: 50, l: '50' }, { v: 90, l: '90' }, { v: 100, l: '100' }],
        xLabel: 'Session time', yLabel: '% of VO₂max' });
      var pts = [], vo2 = 25, tcur = 0, step = 2;
      var tau = 28, tauOff = 42;
      while (tcur < Math.min(totalSession, 1800)) {
        var inRep = Math.floor(tcur / (p.work + p.rest));
        var phase = tcur - inRep * (p.work + p.rest);
        var target = phase < p.work ? Math.min(100, p.int) : 32;
        var k = phase < p.work ? tau : tauOff;
        vo2 += (target - vo2) * (step / k);
        pts.push([tcur, vo2]);
        tcur += step;
      }
      var inner = '<rect x="' + pl.fx(0) + '" y="' + pl.pad.t + '" width="' + pl.iw + '" height="' + (pl.fy(90) - pl.pad.t) + '" style="fill:' + D(2) + ';opacity:.09"/>';
      inner += '<line x1="' + pl.pad.l + '" x2="' + (w - pl.pad.r) + '" y1="' + pl.fy(90) + '" y2="' + pl.fy(90) + '" style="stroke:' + D(2) + ';stroke-width:1.4;stroke-dasharray:4 3"/>';
      inner += '<text class="svg-lbl svg-lbl--b" x="' + (pl.pad.l + 6) + '" y="' + (pl.fy(90) - 6) + '" style="fill:' + D(2) + '">90% of VO₂max — the zone that counts</text>';
      inner += pl.line(pts, 'stroke:' + D(1) + ';stroke-width:2.2');
      $('#hl-svg', el).innerHTML = pl.svg(inner);

      var t90 = t90min(p);
      $('#hl-ro', el).innerHTML = ro([
        { v: fmt(total / 60, 1), u: 'min', k: 'Hard work time' },
        { v: fmt(totalSession / 60, 0), u: 'min', k: 'Interval block duration' },
        { v: fmt(t90, 1), u: 'min', k: 'Est. time ≥90% VO₂max' },
        { v: '1:' + fmt(p.rest / p.work, 1), k: 'Work : recovery' },
        { v: '★'.repeat(p.cost), k: 'Recovery cost (of 5)' }
      ]);
      $('#hl-txt', el).innerHTML = '<p style="font-size:.93rem;margin:.9rem 0 0"><strong>' + p.name + '</strong> — ' + p.label +
        '<br><span class="muted">Primary stimulus:</span> ' + p.stim + '<br>' + p.note + '</p>';

      // comparison bars
      var bw = 660, bh = 42 + PROTO.length * 24;
      var maxT = Math.max.apply(null, PROTO.map(t90min));
      var s = '<text class="svg-title" x="6" y="14">Estimated minutes ≥90% VO₂max per session</text>';
      PROTO.forEach(function (q, i) {
        var y = 26 + i * 24, v = t90min(q);
        s += '<text class="svg-tick" x="132" y="' + (y + 11) + '" text-anchor="end">' + q.name + '</text>';
        s += '<rect x="140" y="' + y + '" width="' + (470 * v / maxT).toFixed(1) + '" height="15" rx="2.5" style="fill:' + (q.id === id ? D(2) : D(1)) + ';opacity:' + (q.id === id ? 1 : .42) + '"/>';
        s += '<text class="svg-tick" x="' + (146 + 470 * v / maxT) + '" y="' + (y + 11) + '">' + fmt(v, 1) + ' min</text>';
      });
      $('#hl-cmp', el).innerHTML = '<svg viewBox="0 0 ' + bw + ' ' + bh + '" style="width:100%;height:auto" role="img">' + s + '</svg>' +
        '<p style="font-size:.82rem;color:var(--muted);margin:.5rem 0 0">Modelled from VO₂ on/off kinetics, not measured — use it to compare shapes, not to predict your own numbers. The general finding holds: <strong>work intervals of two minutes or more accumulate the most time near VO₂max</strong>; very short all-out sprints accumulate almost none, yet still drive adaptation through a different route (AMPK/CaMK signalling and glycogen depletion).</p>';
    }
    wireSeg(el, 'hl-p', draw); draw('4x4');
  };

  /* ============================================================
     8. VOLUME CURVE — hypertrophy dose-response
     ============================================================ */
  W['volume-curve'] = function (el) {
    var b = body(el);
    b.innerHTML = '<div class="ctls ctls--3">' +
      rng('vc-sets', 'Weekly sets per muscle', 2, 36, 14, 1, ' sets') +
      rng('vc-rir', 'Reps in reserve', 0, 6, 2, 1, ' RIR') +
      rng('vc-freq', 'Sessions per muscle per week', 1, 6, 2, 1, '×') +
      '</div><div id="vc-svg"></div><div id="vc-ro"></div>' +
      '<p id="vc-note" style="font-size:.9rem;margin:.9rem 0 0;color:var(--ink-2)"></p>';

    // response(sets) = a*ln(1+k*sets) with RIR-dependent effective stimulus, minus a recoverability penalty
    function growth(sets, rir, freq) {
      var eff = rir <= 1 ? 1 : rir <= 3 ? 1 - (rir - 1) * 0.035 : 1 - 0.07 - (rir - 3) * 0.16;
      eff = clamp(eff, 0.25, 1);
      var perSession = sets / freq;
      var sessPenalty = perSession > 11 ? 1 - Math.min(0.26, (perSession - 11) * 0.022) : 1;
      var raw = 0.98 * Math.log(1 + 0.30 * sets * eff);
      return Math.max(0, raw * sessPenalty);
    }
    function draw() {
      var sets = +$('#vc-sets', el).value, rir = +$('#vc-rir', el).value, freq = +$('#vc-freq', el).value;
      $('#vc-sets-v', el).textContent = sets + ' sets';
      $('#vc-rir-v', el).textContent = rir + ' RIR';
      $('#vc-freq-v', el).textContent = freq + '×';
      var curves = [[0, 'var(--muted)', 'RIR 0 (to failure)'], [rir, D(2), 'your setting'], [5, D(8), 'RIR 5']];
      var p = Plot({ w: 660, h: 300, x: [0, 36], y: [0, 2.6],
        xTicks: [0, 6, 12, 18, 24, 30, 36], yTicks: [{ v: 0, l: '0' }, { v: 0.65, l: 'low' }, { v: 1.3, l: 'mid' }, { v: 1.95, l: 'high' }, { v: 2.6, l: 'max' }],
        xLabel: 'Weekly sets for that muscle', yLabel: 'Relative hypertrophy response' });
      var inner = '';
      curves.forEach(function (c) {
        var pts = [];
        for (var s = 0; s <= 36; s += 0.5) pts.push([s, growth(s, c[0], freq)]);
        inner += p.line(pts, 'stroke:' + c[1] + ';stroke-width:' + (c[1] === D(2) ? 3 : 1.5) + ';' + (c[1] === D(2) ? '' : 'stroke-dasharray:4 3'));
      });
      var g = growth(sets, rir, freq);
      inner += '<circle cx="' + p.fx(sets) + '" cy="' + p.fy(g) + '" r="6" style="fill:' + D(2) + '"/>';
      // marginal gain shading
      var m = growth(sets + 1, rir, freq) - g;
      inner += p.vline(sets, 'stroke:var(--ink);stroke-width:1.4;stroke-dasharray:3 3');
      // common landmarks
      [[10, 'minimum effective'], [20, 'diminishing'], [30, 'recovery limited']].forEach(function (q) {
        inner += '<text class="svg-tick" x="' + p.fx(q[0]) + '" y="' + (p.pad.t + 10) + '" text-anchor="middle">' + q[1] + '</text>';
      });
      $('#vc-svg', el).innerHTML = p.svg(inner);

      var perSession = sets / freq;
      $('#vc-ro', el).innerHTML = ro([
        { v: fmt(g / 2.6 * 100, 0), u: '%', k: 'of modelled achievable response' },
        { v: '+' + fmt(m / Math.max(g, .01) * 100, 1), u: '%', k: 'gain from one more weekly set' },
        { v: fmt(perSession, 1), k: 'Sets per session' },
        { v: rir <= 1 ? 'High' : rir <= 3 ? 'Moderate' : 'Low', k: 'Per-set stimulus' }
      ]);
      var notes = [];
      if (sets < 8) notes.push('Below about 8–10 weekly sets most trained lifters are under-dosed: the curve is still steep, so added volume is the cheapest available gain.');
      if (sets >= 10 && sets <= 22) notes.push('This is the band where the evidence is densest. Gains still rise with volume but the slope is flattening — each added set buys less than the last.');
      if (sets > 22) notes.push('High volume. Group means still favour more sets, but individual variation and recovery capacity dominate here, and the measured benefit per set is small. Judge it by whether performance within sessions is holding.');
      if (rir >= 4) notes.push('<strong>Stopping 4+ reps short is the bigger problem than your volume.</strong> Sets that end far from failure never recruit the high-threshold motor units, so much of that volume is not stimulus — it is just work.');
      if (rir <= 1) notes.push('Training to or near failure maximises per-set stimulus but raises fatigue disproportionately; reserve it for the last set of an exercise, and for single-joint work where the systemic cost is low.');
      if (perSession > 11) notes.push('More than ~11 sets for one muscle in a single session shows diminishing per-set returns — spreading the same weekly volume across an extra session usually serves you better.');
      $('#vc-note', el).innerHTML = notes.join(' ');
    }
    wireRng(el, ['vc-sets', 'vc-rir', 'vc-freq'], draw); draw();
  };

  /* ============================================================
     9. CONCURRENT TRAINING — AMPK vs mTOR
     ============================================================ */
  W['concurrent'] = function (el) {
    var b = body(el);
    b.innerHTML = '<div class="ctls ctls--3">' +
      rng('ct-gap', 'Hours between the two sessions', 0, 24, 6, 0.5, ' h') +
      seg('ct-order', 'Order', [{ v: 'eb', l: 'Endurance first' }, { v: 'se', l: 'Strength first' }], 0) +
      seg('ct-mode', 'Endurance mode', [{ v: 'cyc', l: 'Cycling' }, { v: 'run', l: 'Running' }], 0) +
      '</div><div id="ct-svg"></div><div id="ct-ro"></div>' +
      legend([{ c: D(2), l: 'mTORC1 activity (building)' }, { c: D(1), l: 'AMPK activity (energy stress)' }, { c: D(3), l: 'Overlap' }]) +
      '<p id="ct-note" style="font-size:.9rem;margin:.9rem 0 0;color:var(--ink-2)"></p>';

    function draw() {
      var gap = +$('#ct-gap', el).value;
      var order = $('#ct-order button[aria-pressed="true"]', el).dataset.v;
      var mode = $('#ct-mode button[aria-pressed="true"]', el).dataset.v;
      $('#ct-gap-v', el).textContent = gap + ' h';
      var tEnd = order === 'eb' ? 0 : gap, tStr = order === 'eb' ? gap : 0;
      var damage = mode === 'run' ? 1.35 : 1;      // eccentric load of running

      function ampk(t) { var d = t - tEnd; return d < 0 ? 0 : Math.exp(-d / 1.15) * 100; }
      function mtor(t) { var d = t - tStr; return d < 0 ? 0 : (d < 1 ? d : 1) * Math.exp(-Math.max(0, d - 1) / 7.5) * 100; }

      var p = Plot({ w: 660, h: 270, x: [0, 30], y: [0, 105],
        xTicks: [0, 6, 12, 18, 24, 30].map(function (t) { return { v: t, l: t + 'h' }; }),
        yTicks: [0, 25, 50, 75, 100], xLabel: 'Hours from the first session', yLabel: 'Relative signalling activity' });
      var A = [], M = [], O = [], overlap = 0;
      for (var t = 0; t <= 30; t += 0.2) {
        var a = ampk(t), m = mtor(t);
        A.push([t, a]); M.push([t, m]);
        var o = Math.min(a, m) / 100;
        O.push([t, Math.min(a, m)]);
        overlap += o * 0.2;
      }
      var inner = p.area(O, 0, 'fill:' + D(3) + ';opacity:.35') +
        p.line(A, 'stroke:' + D(1) + ';stroke-width:2.4') +
        p.line(M, 'stroke:' + D(2) + ';stroke-width:2.6') +
        p.vline(tEnd, 'stroke:' + D(1) + ';stroke-width:1.2;stroke-dasharray:3 3', 'endurance') +
        p.vline(tStr, 'stroke:' + D(2) + ';stroke-width:1.2;stroke-dasharray:3 3', 'strength');
      $('#ct-svg', el).innerHTML = p.svg(inner);

      var interference = clamp(overlap * damage * 7, 0, 100);
      var verdict = interference < 12 ? 'Negligible' : interference < 30 ? 'Minor' : interference < 55 ? 'Moderate' : 'Substantial';
      $('#ct-ro', el).innerHTML = ro([
        { v: fmt(overlap, 1), u: 'h', k: 'Signalling overlap (area)' },
        { v: verdict, k: 'Modelled molecular interference' },
        { v: mode === 'run' ? 'Higher' : 'Lower', k: 'Mechanical/eccentric cost of mode' },
        { v: gap >= 6 ? 'Good' : gap >= 3 ? 'Acceptable' : 'Poor', k: 'Separation' }
      ]);
      var n = [];
      n.push('AMPK rises sharply with endurance work and returns to baseline within roughly <strong>3 hours</strong>. mTORC1 activity after resistance training stays elevated for up to <strong>18–24 hours</strong>. The asymmetry is the whole story: put endurance first and its signal is gone before the lifting signal begins; put lifting first and endurance work lands squarely inside the anabolic window.');
      if (gap < 3) n.push('<strong>At this spacing the two signals genuinely collide.</strong> If sessions must be back-to-back, accept it on easy endurance days and avoid it before your most important strength work.');
      if (order === 'se' && gap < 6) n.push('Strength-first with a short gap places the endurance bout inside the elevated mTORC1 window. For a hypertrophy priority this is the less favourable order.');
      if (order === 'eb' && gap >= 3) n.push('Endurance-first with 3+ hours is the cleanest arrangement if the <em>strength</em> session is the priority — just note you will lift in a pre-fatigued state, which costs load and quality even when the molecular picture looks fine.');
      if (mode === 'run') n.push('Running adds eccentric muscle damage that cycling largely avoids. Meta-analytic evidence shows interference is consistently larger when running is the endurance mode — if you lift for size and also need an engine, cycling and rowing are the kinder tools.');
      n.push('<strong>Keep the scale in view:</strong> pooled evidence shows a small-to-moderate blunting of lower-body <em>strength and power</em>, and little effect on <em>hypertrophy</em>, in programmes with adequate recovery and energy intake. The commonest real cause of lost gains in hybrid training is not AMPK — it is under-eating and under-sleeping.');
      $('#ct-note', el).innerHTML = n.join(' ');
    }
    wireRng(el, ['ct-gap'], draw); wireSeg(el, 'ct-order', draw); wireSeg(el, 'ct-mode', draw); draw();
  };

  /* ============================================================
     10. FORCE–VELOCITY / POWER
     ============================================================ */
  W['force-velocity'] = function (el) {
    var b = body(el);
    b.innerHTML = '<div class="ctls ctls--2">' + rng('fv-load', 'Load (% of maximal isometric force)', 5, 100, 30, 1, '%') +
      seg('fv-prof', 'Athlete profile', [{ v: 'bal', l: 'Balanced' }, { v: 'force', l: 'Force-dominant' }, { v: 'vel', l: 'Velocity-dominant' }], 0) +
      '</div><div id="fv-svg"></div><div id="fv-ro"></div>' +
      legend([{ c: D(2), l: 'Force–velocity' }, { c: D(3), l: 'Power' }, { c: D(1), l: 'Your load' }]) +
      '<p id="fv-note" style="font-size:.9rem;margin:.9rem 0 0;color:var(--ink-2)"></p>';
    function draw() {
      var load = +$('#fv-load', el).value;
      var prof = $('#fv-prof button[aria-pressed="true"]', el).dataset.v;
      $('#fv-load-v', el).textContent = load + '%';
      var a = { bal: 0.25, force: 0.18, vel: 0.40 }[prof];     // Hill curvature
      var v0 = { bal: 100, force: 78, vel: 125 }[prof];
      function vel(F) { var f = F / 100; return Math.max(0, v0 * (1 - f) / (1 + f / a)); }
      var p = Plot({ w: 660, h: 300, x: [0, 100], y: [0, 130],
        xTicks: [0, 25, 50, 75, 100], yTicks: [0, 25, 50, 75, 100, 125],
        xLabel: 'Force (% of maximal isometric)', yLabel: 'Velocity (% of V₀)  /  Power (relative)' });
      var fv = [], pw = [], maxP = 0, maxPF = 0;
      for (var F = 0; F <= 100; F += 1) {
        var v = vel(F); fv.push([F, v]);
        var P = F * v / 100; pw.push([F, P]);
        if (P > maxP) { maxP = P; maxPF = F; }
      }
      var sc = 118 / maxP;
      var inner = p.line(fv, 'stroke:' + D(2) + ';stroke-width:2.8') +
        p.line(pw.map(function (q) { return [q[0], q[1] * sc]; }), 'stroke:' + D(3) + ';stroke-width:2.2;stroke-dasharray:6 3') +
        p.vline(maxPF, 'stroke:' + D(3) + ';stroke-width:1.2;stroke-dasharray:2 3', 'Pmax @ ' + maxPF + '% F₀') +
        p.vline(load, 'stroke:' + D(1) + ';stroke-width:2');
      inner += '<circle cx="' + p.fx(load) + '" cy="' + p.fy(vel(load)) + '" r="6" style="fill:' + D(1) + '"/>';
      $('#fv-svg', el).innerHTML = p.svg(inner);
      var P = load * vel(load) / 100;
      $('#fv-ro', el).innerHTML = ro([
        { v: fmt(vel(load), 0), u: '% V₀', k: 'Contraction velocity at this load' },
        { v: fmt(P / maxP * 100, 0), u: '%', k: 'of peak power' },
        { v: maxPF + '%', k: 'Load that maximises power' },
        { v: prof === 'force' ? 'Train speed' : prof === 'vel' ? 'Train strength' : 'Balanced', k: 'Likely training priority' }
      ]);
      $('#fv-note', el).innerHTML = 'Force and velocity trade off hyperbolically: a muscle cannot be fast and strong in the same instant. Power — their product — peaks near <strong>' + maxPF + '% of maximal force</strong>, which is why jumps, throws and Olympic derivatives are trained at moderate loads moved with maximal intent, while maximal strength is trained at loads too heavy to be fast. A force-dominant athlete gains most from ballistic and plyometric work; a velocity-dominant athlete gains most from heavy strength work. <strong>Profile first, then prescribe.</strong>';
    }
    wireRng(el, ['fv-load'], draw); wireSeg(el, 'fv-prof', draw); draw();
  };

  /* ============================================================
     11. SUBSTRATE CROSSOVER — fat vs carbohydrate
     ============================================================ */
  W['crossover'] = function (el) {
    var b = body(el);
    b.innerHTML = '<div class="ctls ctls--2">' +
      rng('co-i', 'Intensity', 25, 100, 65, 1, '% VO₂max') +
      seg('co-t', 'Training status / diet', [{ v: 'un', l: 'Untrained' }, { v: 'tr', l: 'Trained' }, { v: 'lchf', l: 'Fat-adapted' }], 1) +
      '</div><div id="co-svg"></div><div id="co-ro"></div>' +
      legend([{ c: D(3), l: 'Fat oxidation' }, { c: D(1), l: 'Carbohydrate oxidation' }]) +
      '<p id="co-note" style="font-size:.9rem;margin:.9rem 0 0;color:var(--ink-2)"></p>';
    var P = { un: { peak: 0.42, at: 48, span: 22 }, tr: { peak: 0.62, at: 62, span: 26 }, lchf: { peak: 1.35, at: 70, span: 32 } };
    function draw() {
      var i = +$('#co-i', el).value, st = $('#co-t button[aria-pressed="true"]', el).dataset.v;
      $('#co-i-v', el).textContent = i + '% VO₂max';
      var c = P[st];
      function fat(x) { return c.peak * Math.exp(-Math.pow((x - c.at) / c.span, 2)); }      // g/min
      function cho(x) { var tot = x / 100 * 3.9; return Math.max(0, tot - fat(x) * 2.1) * 1.0; }  // g/min approx
      var p = Plot({ w: 660, h: 290, x: [25, 100], y: [0, st === 'lchf' ? 1.6 : 1.0],
        xTicks: [30, 45, 60, 75, 90, 100], yTicks: st === 'lchf' ? [0, .4, .8, 1.2, 1.6] : [0, .25, .5, .75, 1],
        xLabel: 'Intensity (% VO₂max)', yLabel: 'Substrate oxidation (g/min)' });
      var fpts = [], cpts = [];
      for (var x = 25; x <= 100; x += 1) { fpts.push([x, fat(x)]); cpts.push([x, Math.min(cho(x), p.fy ? 99 : 99)]); }
      // crossover = where cho exceeds fat energy (fat 9.4 kcal/g, cho 4.1)
      var cross = 100;
      for (var x2 = 25; x2 <= 100; x2++) { if (cho(x2) * 4.1 > fat(x2) * 9.4) { cross = x2; break; } }
      var inner = p.area(fpts, 0, 'fill:' + D(3) + ';opacity:.3') +
        p.line(fpts, 'stroke:' + D(3) + ';stroke-width:2.8') +
        p.line(cpts, 'stroke:' + D(1) + ';stroke-width:2.8') +
        p.vline(c.at, 'stroke:' + D(3) + ';stroke-width:1.3;stroke-dasharray:3 3', 'FATmax') +
        p.vline(cross, 'stroke:var(--ink);stroke-width:1.3;stroke-dasharray:4 3', 'crossover') +
        p.vline(i, 'stroke:var(--ink-2);stroke-width:2');
      $('#co-svg', el).innerHTML = p.svg(inner);
      $('#co-ro', el).innerHTML = ro([
        { v: fmt(fat(i), 2), u: 'g/min', k: 'Fat oxidised at this intensity' },
        { v: fmt(cho(i), 2), u: 'g/min', k: 'Carbohydrate oxidised' },
        { v: c.at + '%', k: 'FATmax — peak fat oxidation' },
        { v: fmt(fat(i) * 9.4 / (fat(i) * 9.4 + cho(i) * 4.1) * 100, 0), u: '%', k: 'of energy from fat' }
      ]);
      var t = { un: 'An untrained person peaks near 0.3–0.5 g/min of fat oxidation at a low intensity, and crosses over to carbohydrate early. Carbohydrate stores are small, so this is a metabolically expensive way to go long.',
        tr: 'Training shifts the whole fat curve up and to the right: more mitochondria, more fat transporters, more intramuscular triglyceride used. The practical payoff is <strong>glycogen sparing</strong> — at any given speed you burn less of your limited carbohydrate, which is exactly what decides the last hour of a long event.',
        lchf: 'Chronic high-fat adaptation can push peak fat oxidation past <strong>1.5 g/min</strong> — remarkable, and genuinely useful at low intensities. But it comes with downregulated pyruvate dehydrogenase: the athlete becomes <em>worse</em> at using carbohydrate at the high intensities that decide races, and economy at race pace tends to worsen. Impressive metabolism, usually poorer performance above threshold.' }[st];
      $('#co-note', el).innerHTML = t + ' <strong>Note what FATmax is not:</strong> it is not a magic fat-loss intensity. Total energy expenditure, not the fuel mix during the session, drives fat loss over weeks.';
    }
    wireRng(el, ['co-i'], draw); wireSeg(el, 'co-t', draw); draw();
  };

  /* ============================================================
     12. PROTEIN DOSE — MPS response
     ============================================================ */
  W['protein-dose'] = function (el) {
    var b = body(el);
    b.innerHTML = '<div class="ctls ctls--3">' +
      rng('pd-kg', 'Body mass', 45, 130, 75, 1, ' kg') +
      rng('pd-dose', 'Protein in this meal', 5, 70, 30, 1, ' g') +
      rng('pd-meals', 'Meals per day', 2, 6, 4, 1, '') +
      '</div><div id="pd-svg"></div><div id="pd-ro"></div>' +
      '<p id="pd-note" style="font-size:.9rem;margin:.9rem 0 0;color:var(--ink-2)"></p>';
    function draw() {
      var kg = +$('#pd-kg', el).value, dose = +$('#pd-dose', el).value, meals = +$('#pd-meals', el).value;
      $('#pd-kg-v', el).textContent = kg + ' kg';
      $('#pd-dose-v', el).textContent = dose + ' g';
      $('#pd-meals-v', el).textContent = meals;
      var sat = 0.30 * kg;                 // ~0.3 g/kg saturates MPS
      function mps(d) { return 100 * (1 - Math.exp(-2.4 * d / sat)); }
      var p = Plot({ w: 660, h: 270, x: [0, 70], y: [0, 110],
        xTicks: [0, 10, 20, 30, 40, 50, 60, 70], yTicks: [0, 25, 50, 75, 100],
        xLabel: 'Protein in a single meal (g)', yLabel: 'Muscle protein synthesis response (%)' });
      var pts = []; for (var d = 0; d <= 70; d += 1) pts.push([d, mps(d)]);
      var inner = p.area(pts, 0, 'fill:' + D(4) + ';opacity:.18') + p.line(pts, 'stroke:' + D(4) + ';stroke-width:2.8') +
        p.vline(sat, 'stroke:var(--ink-2);stroke-width:1.3;stroke-dasharray:3 3', '0.3 g/kg ≈ ' + fmt(sat, 0) + ' g') +
        p.vline(dose, 'stroke:' + D(2) + ';stroke-width:2');
      inner += '<circle cx="' + p.fx(dose) + '" cy="' + p.fy(mps(dose)) + '" r="6" style="fill:' + D(2) + '"/>';
      $('#pd-svg', el).innerHTML = p.svg(inner);
      var daily = dose * meals, perKg = daily / kg, leu = dose * 0.095;
      $('#pd-ro', el).innerHTML = ro([
        { v: fmt(mps(dose), 0), u: '%', k: 'of maximal MPS response from this meal' },
        { v: fmt(leu, 1), u: 'g', k: 'Leucine (needs ≈2.5–3 g)' },
        { v: fmt(daily, 0), u: 'g', k: 'Daily total at ' + meals + ' meals' },
        { v: fmt(perKg, 2), u: 'g/kg', k: 'Daily intake relative to mass' }
      ]);
      var n = [];
      if (leu < 2.3) n.push('<strong>This meal is under the leucine threshold.</strong> Roughly 2.5–3 g of leucine is needed to switch MPS on fully; below it the meal feeds you but barely signals. Raise the dose or pick a more leucine-dense source (whey, dairy, eggs, lean meat).');
      else n.push('This meal clears the leucine threshold, so it will produce a full MPS response.');
      if (perKg < 1.4) n.push('Daily intake is below the 1.6 g/kg where the meta-analytic benefit for hypertrophy plateaus — the highest-yield change available to you is simply eating more protein.');
      else if (perKg > 2.2) n.push('You are well past the point where more protein adds measurable muscle (the curve flattens by about 2.0 g/kg). Extra is not harmful in healthy kidneys, but it is displacing carbohydrate that may matter more for your training.');
      else n.push('Daily intake is in the effective 1.6–2.2 g/kg range.');
      if (meals <= 2) n.push('With only ' + meals + ' feedings you leave long stretches below the threshold. Three to five doses of 0.3–0.4 g/kg, spaced 3–5 hours, produces more total MPS than the same protein in one or two large meals.');
      $('#pd-note', el).innerHTML = n.join(' ');
    }
    wireRng(el, ['pd-kg', 'pd-dose', 'pd-meals'], draw); draw();
  };

  /* ============================================================
     13. FUEL CALCULATOR — carbohydrate during exercise
     ============================================================ */
  W['fuel-calc'] = function (el) {
    var b = body(el);
    b.innerHTML = '<div class="ctls ctls--3">' +
      rng('fc-h', 'Session duration', 0.5, 8, 3, 0.25, ' h') +
      rng('fc-kg', 'Body mass', 45, 110, 72, 1, ' kg') +
      seg('fc-i', 'Intensity', [{ v: 'low', l: 'Easy' }, { v: 'mod', l: 'Steady' }, { v: 'hard', l: 'Race pace' }], 1) +
      '</div>' + seg('fc-gut', 'Gut trained for high intake?', [{ v: 'no', l: 'Not yet' }, { v: 'yes', l: 'Yes' }], 0) +
      '<div id="fc-out"></div>';
    function draw() {
      var h = +$('#fc-h', el).value, kg = +$('#fc-kg', el).value;
      var i = $('#fc-i button[aria-pressed="true"]', el).dataset.v;
      var gut = $('#fc-gut button[aria-pressed="true"]', el).dataset.v === 'yes';
      $('#fc-h-v', el).textContent = h + ' h';
      $('#fc-kg-v', el).textContent = kg + ' kg';

      var gph;
      if (h <= 0.75) gph = 0;
      else if (h <= 1.25) gph = i === 'hard' ? 25 : 0;
      else if (h <= 2) gph = i === 'low' ? 30 : i === 'mod' ? 45 : 60;
      else if (h <= 3) gph = i === 'low' ? 45 : i === 'mod' ? 60 : 80;
      else gph = i === 'low' ? 60 : i === 'mod' ? 80 : 90;
      var cap = gut ? 120 : 75;
      var rec = Math.min(gph, cap);
      var ratio = rec <= 60 ? 'glucose alone is enough' : rec <= 90 ? '2 : 1 glucose : fructose' : '1 : 0.8 glucose : fructose';
      var total = rec * h;
      var fluid = (i === 'hard' ? 700 : i === 'mod' ? 550 : 450);
      var na = i === 'hard' ? 700 : 500;
      var pre = h >= 2 ? fmt(kg * (h >= 4 ? 2.5 : 1.5), 0) : fmt(kg * 1, 0);

      var rows = [
        ['During: carbohydrate', fmt(rec, 0) + ' g/h', 'Total ≈ ' + fmt(total, 0) + ' g. ' + (gph > cap ? '<strong>Your target exceeds an untrained gut’s ceiling — train absorption first.</strong>' : '')],
        ['Carbohydrate type', ratio, rec > 60 ? 'Above ~60 g/h a single glucose transporter (SGLT1) saturates. Adding fructose recruits GLUT5, a separate route, which is what allows 90–120 g/h to be oxidised rather than sitting in the gut.' : 'Below 60 g/h a single source is fine.'],
        ['Pre-session', pre + ' g carbohydrate', h >= 2 ? '1–4 g/kg in the 1–4 h before, lower fibre the closer you get to the start.' : 'A normal meal 2–3 h before is sufficient.'],
        ['Fluid', fmt(fluid, 0) + '–' + fmt(fluid + 250, 0) + ' mL/h', 'Starting point only — confirm it against your own measured sweat rate.'],
        ['Sodium', fmt(na, 0) + '–' + fmt(na + 400, 0) + ' mg/L', 'Higher if you are a salty sweater or the session is long and hot.'],
        ['After', fmt(kg * 1.0, 0) + ' g carb + ' + fmt(kg * 0.3, 0) + ' g protein', h >= 2 ? 'Repeat hourly for 4 h if you train again within 8 h; otherwise normal meals restore glycogen within 24 h.' : 'Your next normal meal covers this.']
      ];
      $('#fc-out', el).innerHTML = '<div class="tablewrap"><table class="dt"><caption>Fuelling prescription</caption>' +
        '<thead><tr><th>What</th><th>Target</th><th>Why / how</th></tr></thead><tbody>' +
        rows.map(function (r) { return '<tr><td><strong>' + r[0] + '</strong></td><td class="n">' + r[1] + '</td><td>' + r[2] + '</td></tr>'; }).join('') +
        '</tbody></table></div>' +
        (gph === 0 ? '<p style="font-size:.9rem;color:var(--ink-2)"><strong>Nothing needed during this session.</strong> Below about 60–75 minutes, muscle glycogen covers the work; carbohydrate intake adds no performance benefit (though a mouth rinse can still help at high intensity, via a central reward pathway rather than fuel).</p>' : '') +
        (!gut && gph > 75 ? '<p style="font-size:.9rem;color:var(--warn)"><strong>Gut training:</strong> absorption is itself trainable. Add 10–15 g/h every week or two in long sessions, practising with the exact products you will race on, until 90–120 g/h is comfortable. Attempting race intake untrained is the single commonest cause of mid-race gastrointestinal failure.</p>' : '');
    }
    wireRng(el, ['fc-h', 'fc-kg'], draw); wireSeg(el, 'fc-i', draw); wireSeg(el, 'fc-gut', draw); draw();
  };

  /* ============================================================
     14. SWEAT RATE calculator
     ============================================================ */
  W['sweat-calc'] = function (el) {
    var b = body(el);
    b.innerHTML = '<div class="ctls ctls--4" style="grid-template-columns:repeat(auto-fit,minmax(130px,1fr))">' +
      '<div class="ctl"><label for="sw-a">Weight before (kg)</label><input type="number" id="sw-a" value="72.0" step="0.1"></div>' +
      '<div class="ctl"><label for="sw-b">Weight after (kg)</label><input type="number" id="sw-b" value="70.8" step="0.1"></div>' +
      '<div class="ctl"><label for="sw-f">Fluid drunk (mL)</label><input type="number" id="sw-f" value="750" step="50"></div>' +
      '<div class="ctl"><label for="sw-t">Duration (min)</label><input type="number" id="sw-t" value="90" step="5"></div>' +
      '</div><div id="sw-out"></div>';
    function draw() {
      var a = +$('#sw-a', el).value, b2 = +$('#sw-b', el).value, f = +$('#sw-f', el).value, t = +$('#sw-t', el).value;
      var lossKg = a - b2;
      var sweat = (lossKg * 1000 + f);           // mL total
      var rate = t > 0 ? sweat / (t / 60) : 0;
      var pct = a > 0 ? lossKg / a * 100 : 0;
      var band = pct < 1 ? ['Well managed', 'var(--ok)'] : pct < 2 ? ['Acceptable', 'var(--warn)'] : pct < 4 ? ['Performance-limiting', 'var(--bad)'] : ['Excessive', 'var(--bad)'];
      $('#sw-out', el).innerHTML = ro([
        { v: fmt(rate, 0), u: 'mL/h', k: 'Sweat rate in these conditions' },
        { v: fmt(pct, 1), u: '%', k: 'Body mass lost' },
        { v: fmt(sweat, 0), u: 'mL', k: 'Total sweat produced' },
        { v: fmt(lossKg * 1000 * 1.25, 0), u: 'mL', k: 'To drink afterwards (125% of deficit)' }
      ]) + '<p style="font-size:.9rem;margin:.9rem 0 0;color:var(--ink-2)"><strong style="color:' + band[1] + '">' + band[0] + '.</strong> ' +
        'Losses under about 2% of body mass have little measurable effect on performance in most conditions; above 2–3% endurance performance and thermoregulation decline, and the effect is amplified in heat. ' +
        'Repeat this measurement in different weather — sweat rate varies two- to three-fold between a cool morning and a humid afternoon, which is why a single fluid plan cannot serve the whole year. ' +
        '<strong>Do not over-correct:</strong> drinking beyond thirst for hours, especially with low-sodium fluid, causes exercise-associated hyponatraemia, which is rarer than dehydration but far more dangerous.</p>';
    }
    ['sw-a', 'sw-b', 'sw-f', 'sw-t'].forEach(function (id) { $('#' + id, el).addEventListener('input', draw); });
    draw();
  };

  /* ============================================================
     15. SUPPLEMENT MATRIX
     ============================================================ */
  var SUPP = [
    { n: 'Creatine monohydrate', g: 'A', for: ['strength', 'power', 'muscle', 'brain'], dose: '3–5 g/day, any time; or 20 g/day × 5–7 days to load', eff: 'Large, replicated: +5–15% in repeated high-intensity work, ~1–2 kg lean mass, more reps at a given load', note: 'The most robustly supported sports supplement there is. Monohydrate only — no other form outperforms it. Safe up to 30 g/day for 5 years in healthy people. Water retention is intracellular, not bloating.' },
    { n: 'Caffeine', g: 'A', for: ['endurance', 'power', 'focus'], dose: '3–6 mg/kg, 45–60 min before; 200 mg also works', eff: '2–4% in endurance; smaller but real in strength and sprint', note: 'Works through adenosine receptor antagonism — it lowers perceived effort. Habituation blunts but does not abolish it. Genotype (CYP1A2) and anxiety tolerance change the optimal dose a lot.' },
    { n: 'Beta-alanine', g: 'A', for: ['1-10min efforts'], dose: '3.2–6.4 g/day in split doses, 4–12 weeks', eff: '~2–3% in efforts of 1–10 min', note: 'Raises muscle carnosine, an intracellular H⁺ buffer. Useless for a 3 s effort or a marathon; valuable for 400–1500 m, a 2 km row, repeated sprints. Paraesthesia (tingling) is harmless — use split or sustained-release doses.' },
    { n: 'Dietary nitrate / beetroot', g: 'B', for: ['endurance', 'efficiency'], dose: '6–8 mmol nitrate, 2–3 h before; or daily for 3–15 days', eff: '1–3% in time trials; clearest in sub-elite', note: 'Nitrate → nitrite → NO improves efficiency and type II fibre function. Benefit shrinks in highly trained athletes. Do not use antibacterial mouthwash — oral bacteria perform the first conversion.' },
    { n: 'Sodium bicarbonate', g: 'B', for: ['1-10min efforts'], dose: '0.2–0.3 g/kg, 60–180 min before (or 0.4–0.5 g/kg/day split)', eff: '~2% in severe-intensity efforts', note: 'Extracellular buffer, complementary to beta-alanine. Gastrointestinal distress is the limiting factor — split doses with a carbohydrate-rich meal, and rehearse it before competition.' },
    { n: 'Protein powder (whey/casein)', g: 'A', for: ['muscle', 'recovery'], dose: '20–40 g as needed to reach 1.6–2.2 g/kg/day', eff: 'Clear benefit only where it closes a daily protein gap', note: 'Food, not a drug. Whey is fast and leucine-rich; casein is slow and useful before sleep. If your diet already reaches target, powder adds nothing but convenience.' },
    { n: 'Carbohydrate (gels, drinks)', g: 'A', for: ['endurance'], dose: '30–120 g/h depending on duration and gut training', eff: 'Large in sessions over ~90 min', note: 'The most effective "supplement" in endurance sport, and the most under-used. See the fuelling chapter.' },
    { n: 'Vitamin D (if deficient)', g: 'B', for: ['bone', 'muscle', 'immune'], dose: '1000–4000 IU/day guided by blood level', eff: 'Meaningful only when correcting a deficiency', note: 'Deficiency is common in indoor and northern athletes and genuinely impairs bone and muscle function. Supplementing an already-sufficient athlete does nothing.' },
    { n: 'Iron (if deficient)', g: 'A', for: ['endurance'], dose: 'Clinically guided; alternate-day dosing improves absorption', eff: 'Large when correcting deficiency — none otherwise', note: 'Test, do not guess: ferritin, transferrin saturation and haemoglobin. Iron overload is harmful. Endurance athletes, especially female and plant-based, are at elevated risk.' },
    { n: 'Collagen + vitamin C', g: 'C', for: ['tendon'], dose: '15 g collagen + 50 mg vitamin C, 60 min before loading', eff: 'Raises collagen synthesis markers; functional benefit unproven', note: 'Mechanistically plausible and harmless. The loading, not the collagen, is doing most of the work.' },
    { n: 'Citrulline malate', g: 'C', for: ['muscle', 'reps'], dose: '6–8 g, 60 min before', eff: 'Small, inconsistent increase in training volume', note: 'Some well-designed trials find extra reps, others find nothing. Low risk, modest expectation.' },
    { n: 'HMB', g: 'C', for: ['muscle'], dose: '3 g/day', eff: 'Negligible in trained people', note: 'Early dramatic findings have not replicated in trained athletes. May help in catabolic or detrained states.' },
    { n: 'BCAAs', g: 'D', for: ['muscle'], dose: '—', eff: 'No benefit beyond adequate whole protein', note: 'An incomplete amino acid profile cannot build muscle. Superseded by simply eating enough complete protein.' },
    { n: 'Testosterone boosters', g: 'D', for: ['muscle'], dose: '—', eff: 'None', note: 'Tribulus, D-aspartic acid and similar do not raise testosterone meaningfully in healthy men, and would not change body composition at the magnitudes claimed even if they did.' },
    { n: 'Ketone esters', g: 'C', for: ['endurance', 'recovery'], dose: 'Varies widely', eff: 'Inconsistent; some evidence of impaired high-intensity performance', note: 'Expensive, unpleasant, and currently unsupported as a performance aid. Possible role in recovery signalling remains open.' },
    { n: 'Antioxidant megadoses (C/E)', g: 'D', for: [], dose: '—', eff: 'Can blunt adaptation', note: 'High-dose vitamin C and E around training interferes with the redox signalling that drives mitochondrial biogenesis. Get antioxidants from food; avoid large isolated doses in a training block.' }
  ];
  W['supp-matrix'] = function (el) {
    var b = body(el);
    var goals = [{ v: 'all', l: 'Everything' }, { v: 'endurance', l: 'Endurance' }, { v: 'muscle', l: 'Muscle' },
      { v: 'strength', l: 'Strength' }, { v: 'power', l: 'Power' }, { v: '1-10min efforts', l: '1–10 min efforts' }];
    b.innerHTML = '<div class="ctls">' + seg('sm-g', 'Filter by goal', goals, 0) + '</div><div id="sm-out"></div>' +
      '<p style="font-size:.84rem;color:var(--muted);margin:.9rem 0 0"><span class="grade grade--a">A</span> consistent effect across good trials and meta-analyses · <span class="grade grade--b">B</span> real but smaller, context-dependent, or shrinking in trained athletes · <span class="grade grade--c">C</span> mechanistically plausible, evidence thin or mixed · <span class="grade grade--d">D</span> no credible performance benefit. Supplements are the last 1–2% — they cannot substitute for training, sleep or total energy intake, and in tested sport, contamination risk makes third-party certification non-negotiable.</p>';
    function draw(g) {
      g = g || 'all';
      var list = SUPP.filter(function (s) { return g === 'all' || s.for.indexOf(g) > -1; });
      $('#sm-out', el).innerHTML = '<div class="tablewrap"><table class="dt"><caption>' +
        list.length + ' entries — sorted by strength of evidence</caption><thead><tr>' +
        '<th>Supplement</th><th>Grade</th><th>Dose</th><th>Measured effect</th><th>What to know</th></tr></thead><tbody>' +
        list.sort(function (a, c) { return a.g.localeCompare(c.g); }).map(function (s) {
          return '<tr><td><strong>' + s.n + '</strong></td><td><span class="grade grade--' + s.g.toLowerCase() + '">' + s.g + '</span></td>' +
            '<td>' + s.dose + '</td><td>' + s.eff + '</td><td>' + s.note + '</td></tr>';
        }).join('') + '</tbody></table></div>';
    }
    wireSeg(el, 'sm-g', draw); draw('all');
  };

  /* ============================================================
     16. PERIODIZATION TIMELINE
     ============================================================ */
  W['periodize'] = function (el) {
    var b = body(el);
    var plans = {
      marathon: { l: 'Marathon', weeks: 20, blocks: [
        { n: 'General base', w: 6, c: 1, d: 'Volume up, almost all below LT1. One short hill/strides session to keep elasticity.' },
        { n: 'Specific base', w: 5, c: 4, d: 'Add threshold work and long runs with marathon-pace segments.' },
        { n: 'VO₂max block', w: 3, c: 2, d: '4×4 or 6×5 min intervals twice weekly; volume held, not raised.' },
        { n: 'Race specific', w: 4, c: 3, d: 'Long runs with large blocks at goal pace; full fuelling rehearsal.' },
        { n: 'Taper', w: 2, c: 6, d: 'Volume down 40–60%, intensity retained, carbohydrate up.' }] },
      hypertrophy: { l: 'Hypertrophy', weeks: 16, blocks: [
        { n: 'Accumulation 1', w: 5, c: 3, d: '10–14 sets/muscle/week, RIR 2–3, full range, add load or reps weekly.' },
        { n: 'Deload', w: 1, c: 6, d: 'Half the volume, same loads. Dissipate fatigue, keep the skill.' },
        { n: 'Accumulation 2', w: 5, c: 3, d: 'Volume up to 16–22 sets/muscle/week; last set of each exercise to 0–1 RIR.' },
        { n: 'Intensification', w: 4, c: 2, d: 'Volume down, load up (5–8 reps). Convert the new tissue into force.' },
        { n: 'Deload / retest', w: 1, c: 6, d: 'Deload then retest key lifts and measurements.' }] },
      hybrid: { l: 'Hybrid (strength + 10 km)', weeks: 14, blocks: [
        { n: 'Base + strength', w: 5, c: 1, d: 'Lift 3×/wk heavy and low-volume; run easy volume. Separate sessions by 6+ h where possible.' },
        { n: 'Build', w: 4, c: 4, d: 'Lift 2×/wk maintenance; add threshold running. Protect the hard run days.' },
        { n: 'Sharpen', w: 3, c: 2, d: 'VO₂max intervals; lifting reduced to one heavy, low-volume session for maintenance.' },
        { n: 'Taper', w: 2, c: 6, d: 'Running volume down, lifting to minimal dose, no new stimulus.' }] },
      beginner: { l: 'First 12 weeks (untrained)', weeks: 12, blocks: [
        { n: 'Movement + habit', w: 4, c: 5, d: 'Full-body strength 2–3×/wk, 2–3 sets, RIR 3–4. Walk or easy cardio 150 min/wk. Learn the patterns.' },
        { n: 'Progressive load', w: 5, c: 3, d: 'Same movements, add load weekly. Introduce one interval session (10×1 min).' },
        { n: 'Consolidate', w: 3, c: 1, d: 'Hold the routine, raise easy aerobic volume, retest. Nothing exotic — consistency is the variable that matters.' }] }
    };
    b.innerHTML = '<div class="ctls">' + seg('pz-p', 'Goal', Object.keys(plans).map(function (k) { return { v: k, l: plans[k].l }; }), 0) + '</div>' +
      '<div id="pz-svg"></div><div id="pz-out"></div>';
    function draw(k) {
      var pl = plans[k || 'marathon'];
      var w = 660, rowH = 30, h = 46 + pl.blocks.length * rowH;
      var x0 = 8, tw = w - 16, wk = 0;
      var s = '<text class="svg-title" x="8" y="14">' + pl.l + ' — ' + pl.weeks + ' weeks</text>';
      // week ruler
      for (var i = 0; i <= pl.weeks; i += 2) {
        var x = x0 + tw * i / pl.weeks;
        s += '<line class="svg-grid" x1="' + x + '" x2="' + x + '" y1="24" y2="' + (h - 18) + '"/>' +
          '<text class="svg-tick" x="' + x + '" y="' + (h - 6) + '" text-anchor="middle">' + i + '</text>';
      }
      pl.blocks.forEach(function (bl, i) {
        var bx = x0 + tw * wk / pl.weeks, bw = tw * bl.w / pl.weeks;
        var y = 30 + i * rowH;
        s += '<rect x="' + bx + '" y="' + y + '" width="' + (bw - 2) + '" height="' + (rowH - 8) + '" rx="3" style="fill:' + D(bl.c) + ';opacity:.82"/>';
        s += '<text x="' + (bx + 7) + '" y="' + (y + 15) + '" class="svg-lbl svg-lbl--b" style="fill:var(--paper)">' + bl.n + ' · ' + bl.w + 'wk</text>';
        wk += bl.w;
      });
      $('#pz-svg', el).innerHTML = '<svg viewBox="0 0 ' + w + ' ' + h + '" style="width:100%;height:auto" role="img">' + s + '</svg>';
      $('#pz-out', el).innerHTML = '<div class="tablewrap"><table class="dt dt--compact"><thead><tr><th>Block</th><th class="n">Weeks</th><th>What changes</th></tr></thead><tbody>' +
        pl.blocks.map(function (bl) { return '<tr><td><strong>' + bl.n + '</strong></td><td class="n">' + bl.w + '</td><td>' + bl.d + '</td></tr>'; }).join('') +
        '</tbody></table></div>';
    }
    wireSeg(el, 'pz-p', draw); draw('marathon');
  };

  /* ---------------- mount all ---------------- */
  function mount() {
    $$('[data-widget]').forEach(function (el) {
      if (el.dataset.mounted) return;
      var fn = W[el.dataset.widget];
      if (!fn) { return; }
      el.dataset.mounted = '1';
      try { fn(el); } catch (e) {
        body(el).innerHTML = '<p class="muted">This figure could not load in your browser.</p>';
        if (window.console) console.error('widget ' + el.dataset.widget, e);
      }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
  window.SOT_WIDGETS = W;
  window.SOT_mountWidgets = mount;
  window.SOT_util = { Plot: Plot, body: body, ro: ro, legend: legend, rng: rng, seg: seg, wireSeg: wireSeg, wireRng: wireRng, D: D, fmt: fmt, clamp: clamp, lerp: lerp, interp: interp, $: $, $$: $$ };
})();
