/* ============================================================
   cycling.js — indoor-cycling workout library + plan builder.
   Registers the `turbo-lab` widget.
   ============================================================ */
(function () {
  'use strict';
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var D = function (n) { return 'var(--d' + n + ')'; };
  var fmt = function (v, d) { return (Math.round(v * Math.pow(10, d || 0)) / Math.pow(10, d || 0)).toFixed(d || 0); };

  /* zone by %FTP (Coggan-style, 7 zones) */
  function zone(p) {
    if (p < 56) return { z: 1, n: 'Active recovery', c: 8 };
    if (p < 76) return { z: 2, n: 'Endurance', c: 6 };
    if (p < 88) return { z: 3, n: 'Tempo', c: 4 };
    if (p < 96) return { z: 4, n: 'Sweet spot', c: 3 };
    if (p < 106) return { z: 5, n: 'Threshold', c: 3 };
    if (p < 121) return { z: 6, n: 'VO₂max', c: 2 };
    if (p < 151) return { z: 7, n: 'Anaerobic', c: 2 };
    return { z: 8, n: 'Neuromuscular', c: 7 };
  }

  /* step = [minutes, %FTP, label?]  — repeats expanded by rep() */
  function rep(n, steps) { var out = [], i, j; for (i = 0; i < n; i++) for (j = 0; j < steps.length; j++) out.push(steps[j].slice()); return out; }
  var WU = [[12, 58], [1, 85], [1, 55], [1, 95], [2, 55]];
  var CD = [[8, 52]];

  var WK = [
    { id: 'recov', n: 'Recovery spin', cat: 'recovery', rpe: '2/10', cad: '85–95 rpm, light',
      steps: [[45, 52]],
      adapt: 'Blood flow without stress',
      why: 'Not a training session — a recovery one. Gentle pedalling raises blood flow through muscle that is repairing, with a metabolic cost low enough that it adds no fatigue. Its real value is behavioural: it keeps the habit and the saddle time without borrowing from tomorrow.',
      when: 'The day after a hard session, or as a second ride on a double day. Keep it genuinely easy — if you can feel your legs working, you are doing it wrong.' },

    { id: 'z2', n: 'Classic zone 2 endurance', cat: 'aerobic', rpe: '4/10', cad: '85–95 rpm',
      steps: [[10, 55]].concat(rep(4, [[18, 66], [2, 58]])).concat([[7, 52]]),
      adapt: 'Mitochondria, capillaries, fat oxidation, plasma volume',
      why: 'The backbone of every endurance plan, and the one the trainer does better than the road — no descents, no junctions, no coasting, so every minute is the intensity you intended. Steady work at or just below LT1 produces the largest mitochondrial and capillary stimulus per unit of fatigue of anything you can do.',
      when: '2–4 times a week, 60–150 min. This is the volume that everything else is built on; if your week only has three rides, two of them should be this.' },

    { id: 'z2surge', n: 'Endurance with surges', cat: 'aerobic', rpe: '5/10', cad: '85–95, surges at 95–100',
      steps: [[12, 58]].concat(rep(6, [[2, 92], [13, 65]])).concat([[8, 52]]),
      adapt: 'Aerobic base plus repeated-effort durability',
      why: 'Long steady riding builds the engine but never rehearses the repeated accelerations that decide real events. Dropping short tempo surges into an endurance ride adds that specificity at almost no extra recovery cost, and trains fat oxidation to recover between efforts.',
      when: 'Once a week in the second half of a base block, replacing one plain endurance ride.' },

    { id: 'tempo', n: 'Tempo blocks', cat: 'tempo', rpe: '6/10', cad: '85–95 rpm',
      steps: WU.concat(rep(3, [[15, 80], [5, 55]])).concat(CD),
      adapt: 'Glycogen use, muscular endurance, mitochondrial density in type IIa',
      why: 'Harder than endurance, easier than threshold. Tempo accumulates a large aerobic dose in less time, and reaches the type IIa fibres that easy riding leaves largely alone — but it sits in the zone that costs more recovery than its benefit justifies if you overuse it.',
      when: 'Useful when time is short. Keep it to one session a week; if every ride drifts here, you have built the classic grey-zone plateau.' },

    { id: 'sst', n: 'Sweet spot (SST)', cat: 'threshold', rpe: '7/10', cad: '85–95 rpm',
      steps: WU.concat(rep(3, [[12, 90], [4, 55]])).concat(CD),
      adapt: 'FTP, lactate clearance, muscular endurance',
      why: 'The best ratio of adaptation to fatigue in indoor training. At 88–93% of FTP you are high enough to drive threshold adaptations but low enough to accumulate 36–60 minutes of work and ride again the next day. This is why time-constrained cyclists build most of their FTP here rather than at threshold itself.',
      when: '2–3 times a week in a build block. Progress by adding minutes to each interval (12 → 15 → 20), not by raising the power.' },

    { id: 'ou', n: 'Over-unders', cat: 'threshold', rpe: '8/10', cad: '85–95, hold cadence on the overs',
      steps: WU.concat(rep(3, [[2, 95], [1, 105], [2, 95], [1, 105], [2, 95], [1, 105], [5, 55]])).concat(CD),
      adapt: 'Lactate shuttling and clearance at high workloads',
      why: 'The "overs" push you above threshold and accumulate lactate and hydrogen ions; the "unders" keep you working hard enough that you must clear them <em>while still riding hard</em>. This is the specific adaptation that lets you absorb an attack or a steep pitch and recover without sitting up.',
      when: 'Once a week in a build or race-prep block. Brutally specific for road racing and hilly time trials. Not for base.' },

    { id: 'thr', n: 'Threshold 2 × 20', cat: 'threshold', rpe: '8/10', cad: '85–95 rpm',
      steps: WU.concat(rep(2, [[20, 100], [8, 55]])).concat(CD),
      adapt: 'FTP, sustainable power, mental tolerance',
      why: 'The classic. Twenty minutes at the highest power you could hold for about an hour is the most direct way to raise that power, and the most honest test of whether you are progressing. It is also the session most often done at the wrong intensity — if minute 18 is a fight, your FTP setting is too high.',
      when: '1–2 times a week in a build block. Progress 2 × 20 → 3 × 15 → 2 × 25 → 1 × 40.' },

    { id: 'cc', n: 'Criss-cross threshold', cat: 'threshold', rpe: '8/10', cad: 'alternate 80 / 100 rpm',
      steps: WU.concat(rep(2, [[2, 98], [2, 102], [2, 98], [2, 102], [2, 98], [2, 102], [6, 55]])).concat(CD),
      adapt: 'Threshold power with varied neuromuscular demand',
      why: 'Same average power as a steady threshold block, but alternating cadence recruits the motor-unit pool differently every two minutes. Many riders tolerate a larger total dose this way than they can at a fixed cadence.',
      when: 'As a substitute for 2 × 20 when steady threshold has become stale or you are struggling to complete it.' },

    { id: 'vo2_4', n: 'VO₂max 5 × 4 min', cat: 'vo2', rpe: '9/10', cad: '95–105 rpm',
      steps: WU.concat(rep(5, [[4, 113], [4, 50]])).concat(CD),
      adapt: 'Maximal cardiac output, stroke volume, VO₂max',
      why: 'Work intervals of four minutes are long enough for oxygen uptake to reach its ceiling and then sit there — which is what actually drives the central adaptation. This is the cycling form of the most-replicated VO₂max protocol in the literature, and it is reliably the fastest route to a higher ceiling.',
      when: '1–2 times a week for a 3–4 week block, then back off. Expect to need 48 h afterwards. Pace interval one off interval five, not the reverse.' },

    { id: 'vo2_8', n: 'Threshold-VO₂ 4 × 8 min', cat: 'vo2', rpe: '9/10', cad: '90–100 rpm',
      steps: WU.concat(rep(4, [[8, 106], [3, 52]])).concat(CD),
      adapt: 'VO₂max and FTP together',
      why: 'Just above threshold for eight minutes: more total work than 4 × 4, slightly less time at the very top of oxygen uptake. In trained cyclists this format produces excellent gains in both FTP and VO₂max, which makes it unusually efficient when you can only build one quality a month.',
      when: 'Mid-build, when base is solid. One of the single best sessions for a time-crunched trained cyclist.' },

    { id: '30_15', n: '30/15s (Billat format)', cat: 'vo2', rpe: '9/10', cad: '100–110 rpm on efforts',
      steps: WU.concat(rep(3, [].concat(rep(13, [[0.5, 128], [0.25, 50]]), [[4, 50]]))).concat(CD),
      adapt: 'Time near VO₂max with lower acidosis',
      why: 'Short efforts with incomplete recovery keep oxygen uptake high while blood lactate stays tolerable, because the 15-second breaks let oxygen-bound myoglobin partially reload. Many riders accumulate <em>more</em> time above 90% of VO₂max this way than in one long block — and it feels far more manageable.',
      when: 'When 5 × 4 min has become psychologically unbearable, or when you want VO₂max work without the acidosis of long efforts.' },

    { id: '40_20', n: '40/20s', cat: 'vo2', rpe: '9/10', cad: '100–110 rpm',
      steps: WU.concat(rep(3, [].concat(rep(6, [[0.67, 125], [0.33, 50]]), [[5, 50]]))).concat(CD),
      adapt: 'VO₂max plus anaerobic contribution',
      why: 'A slightly more glycolytic cousin of 30/15. The longer effort and shorter rest tip the balance toward hydrogen-ion accumulation, so it trains buffering alongside oxygen uptake.',
      when: 'Race-prep for criteriums, cyclocross, and anything with repeated hard accelerations.' },

    { id: 'anaer', n: 'Anaerobic capacity 6 × 1 min', cat: 'anaerobic', rpe: '10/10', cad: '100–110 rpm',
      steps: WU.concat(rep(6, [[1, 145], [4, 48]])).concat(CD),
      adapt: 'Glycolytic capacity, W′, buffering',
      why: 'One minute all-out empties the glycolytic system and floods the muscle with hydrogen ions. It expands W′ — the finite battery of work you can do above critical power — and raises your tolerance for the burn itself.',
      when: 'The last 3–4 weeks before racing, once a week at most. It is extremely fatiguing and the adaptation fades quickly, so do not do it in base.' },

    { id: 'tabata', n: 'Tabata-style 8 × 20 s', cat: 'anaerobic', rpe: '10/10', cad: 'max sustainable',
      steps: [[12, 58], [1, 90], [3, 55]].concat(rep(8, [[0.33, 175], [0.17, 45]])).concat([[10, 50]]),
      adapt: 'Anaerobic capacity and strong AMPK signalling',
      why: 'The original protocol used 170% of VO₂max to exhaustion and raised VO₂max by about 14% and anaerobic capacity by about 28% — in previously moderately trained subjects. Four minutes of work, and genuinely horrible. Most "Tabata" classes are nothing like it.',
      when: 'Rarely, and only when you accept it will cost you two days. Excellent minimal-time option for metabolic health; a poor staple for a cyclist.' },

    { id: 'sprint', n: 'Neuromuscular sprints', cat: 'sprint', rpe: '10/10 brief', cad: 'explosive, 110–130 rpm',
      steps: WU.concat(rep(10, [[0.25, 240], [2.75, 50]])).concat(CD),
      adapt: 'Peak power, rate of force development, type IIx recruitment',
      why: 'Fifteen seconds is too short to accumulate much lactate but long enough to demand everything from the fastest motor units. Long recoveries are the point: these are quality efforts, and once peak power falls more than about 5% the session is over.',
      when: 'Year-round, once a week, early in a session when fresh. Also the single best way to preserve fast-twitch function as you age.' },

    { id: 'torque', n: 'Low-cadence torque intervals', cat: 'strength', rpe: '7/10', cad: '50–60 rpm seated',
      steps: WU.concat(rep(4, [[8, 85], [4, 55]])).concat(CD),
      adapt: 'Pedal-force production, type II recruitment at low metabolic cost',
      why: 'At half your normal cadence, each pedal stroke needs roughly double the force for the same power. That raises muscular tension and recruits higher-threshold motor units while heart rate and breathing stay moderate — strength-like loading inside an aerobic session.',
      when: 'Base and early build, once or twice a week. Stay seated and smooth. Skip it if you have knee pain — patellofemoral load is high.' },

    { id: 'spinup', n: 'Cadence spin-ups', cat: 'skill', rpe: '5/10', cad: 'building to 120–130+ rpm',
      steps: WU.concat(rep(6, [[1, 72], [2, 55]])).concat([[20, 64]]).concat(CD),
      adapt: 'Neuromuscular coordination, efficiency across cadences',
      why: 'Pedalling smoothly at high cadence is a skill, and skills are trained by rehearsal, not by effort. Spin-ups widen the cadence range at which you are efficient, which matters whenever terrain or a competitor dictates your rhythm rather than you.',
      when: 'Inside any endurance ride, year-round. Costs nothing.' },

    { id: 'pyr', n: 'Pyramid 1-2-3-4-3-2-1', cat: 'vo2', rpe: '9/10', cad: '95–105 rpm',
      steps: WU.concat([[1, 125], [1, 50], [2, 118], [2, 50], [3, 113], [3, 50], [4, 110], [4, 50],
        [3, 113], [3, 50], [2, 118], [2, 50], [1, 125], [3, 50]]).concat(CD),
      adapt: 'VO₂max across the whole severe-intensity domain',
      why: 'Varying effort length within one session stresses oxygen uptake, anaerobic capacity and pacing judgement together, and the changing target keeps a hard session mentally tractable.',
      when: 'Mid-build, as a substitute for a standard VO₂max session every third week.' },

    { id: 'test', n: 'FTP test (20 min)', cat: 'test', rpe: '10/10', cad: 'self-selected',
      steps: [[15, 58], [3, 90], [3, 55], [5, 110], [10, 52], [20, 100], [10, 50]],
      adapt: 'Measurement, not adaptation',
      why: 'Twenty minutes maximal, multiplied by 0.95, approximates functional threshold power. Its value is not precision — it is the <em>same</em> protocol repeated, so changes are real. A 3-minute and 12-minute pair (critical power) gives you W′ as well, which a 20-minute test cannot.',
      when: 'Every 6–8 weeks, or at the start and end of a block. Rested, fed, same trainer, same fan, same time of day.' }
  ];

  var PLANS = {
    base: { l: 'Aerobic base (6 wk)', h: '6–9 h/wk',
      goal: 'Build the mitochondrial, capillary and cardiac foundation everything else depends on. Expect FTP to rise modestly and durability to rise a lot.',
      week: [['Mon', 'recov'], ['Tue', 'torque'], ['Wed', 'z2'], ['Thu', 'spinup'], ['Fri', '—'], ['Sat', 'z2surge'], ['Sun', 'z2']] },
    ftp: { l: 'Raise FTP (6 wk)', h: '5–7 h/wk',
      goal: 'Lift sustainable power. Sweet spot carries the volume; one threshold session per week provides the specificity. Typical gain 5–12% from a solid base.',
      week: [['Mon', 'recov'], ['Tue', 'sst'], ['Wed', 'z2'], ['Thu', 'thr'], ['Fri', '—'], ['Sat', 'sst'], ['Sun', 'z2']] },
    vo2: { l: 'VO₂max block (3–4 wk)', h: '5–7 h/wk',
      goal: 'Raise the ceiling. Short, sharp and not sustainable for long — run it for three or four weeks, then return to sweet spot. Typical gain 4–8%.',
      week: [['Mon', 'recov'], ['Tue', 'vo2_4'], ['Wed', 'z2'], ['Thu', 'vo2_8'], ['Fri', 'recov'], ['Sat', '30_15'], ['Sun', 'z2']] },
    minimal: { l: 'Minimum effective dose', h: '3 × 45–60 min',
      goal: 'For the genuinely time-poor, or for a runner or lifter using the bike as a low-impact engine. Three sessions, each with a clear job, nothing wasted.',
      week: [['Mon', '—'], ['Tue', 'sst'], ['Wed', '—'], ['Thu', 'vo2_4'], ['Fri', '—'], ['Sat', 'z2'], ['Sun', '—']] },
    hybrid: { l: 'For runners & lifters', h: '3–4 h/wk on the bike',
      goal: 'Add aerobic capacity without adding impact or interfering with lifting. Cycling is the kinder endurance mode — the measured interference with strength is consistently smaller than with running.',
      week: [['Mon', 'z2'], ['Tue', '— lift'], ['Wed', 'vo2_4'], ['Thu', '— lift'], ['Fri', 'recov'], ['Sat', 'z2surge'], ['Sun', '—']] },
    race: { l: 'Race prep (4 wk)', h: '6–8 h/wk',
      goal: 'Convert fitness into race-specific tolerance: repeated hard efforts, lactate clearance while still working, and a sprint.',
      week: [['Mon', 'recov'], ['Tue', 'ou'], ['Wed', 'z2surge'], ['Thu', '40_20'], ['Fri', 'recov'], ['Sat', 'sprint'], ['Sun', 'z2']] }
  };

  function expand(steps) {
    var t = 0, out = [];
    steps.forEach(function (s) { out.push({ t0: t, t1: t + s[0], p: s[1] }); t += s[0]; });
    return { segs: out, total: t };
  }
  function metrics(steps) {
    var e = expand(steps), tss = 0, work = 0, zt = {};
    e.segs.forEach(function (s) {
      var d = s.t1 - s.t0, i = s.p / 100;
      tss += d / 60 * i * i * 100;
      work += d * i;
      var z = zone(s.p); zt[z.z] = (zt[z.z] || 0) + d;
    });
    return { total: e.total, tss: tss, avg: work / e.total * 100, zt: zt, segs: e.segs };
  }

  function profileSVG(steps, ftp) {
    var m = metrics(steps), w = 660, h = 228, pad = { l: 44, r: 10, t: 22, b: 38 };
    var iw = w - pad.l - pad.r, ih = h - pad.t - pad.b, maxP = 190;
    m.segs.forEach(function (s) { if (s.p > maxP) maxP = Math.min(260, s.p + 20); });
    var fx = function (t) { return pad.l + t / m.total * iw; };
    var fy = function (p) { return pad.t + ih - p / maxP * ih; };
    var s = '<text class="svg-title" x="8" y="14">POWER PROFILE</text>';
    [50, 75, 100, 125, 150].forEach(function (p) {
      if (p > maxP) return;
      s += '<line class="svg-grid" x1="' + pad.l + '" x2="' + (w - pad.r) + '" y1="' + fy(p) + '" y2="' + fy(p) + '"/>' +
        '<text class="svg-tick" x="' + (pad.l - 5) + '" y="' + (fy(p) + 3) + '" text-anchor="end">' + p + '%</text>';
    });
    s += '<line x1="' + pad.l + '" x2="' + (w - pad.r) + '" y1="' + fy(100) + '" y2="' + fy(100) +
      '" style="stroke:var(--d2);stroke-width:1.4;stroke-dasharray:4 3"/>' +
      '<text class="svg-tick" x="' + (w - pad.r) + '" y="' + (fy(100) - 5) + '" text-anchor="end" style="fill:var(--d2)">FTP</text>';
    m.segs.forEach(function (sg) {
      var x = fx(sg.t0), wd = Math.max(0.8, fx(sg.t1) - fx(sg.t0));
      s += '<rect x="' + x.toFixed(1) + '" y="' + fy(sg.p).toFixed(1) + '" width="' + wd.toFixed(1) +
        '" height="' + (pad.t + ih - fy(sg.p)).toFixed(1) + '" style="fill:' + D(zone(sg.p).c) + ';opacity:.88"/>';
    });
    s += '<line class="svg-axis" x1="' + pad.l + '" y1="' + (pad.t + ih) + '" x2="' + (w - pad.r) + '" y2="' + (pad.t + ih) + '"/>';
    var stepT = m.total > 90 ? 20 : 10;
    for (var t = 0; t <= m.total; t += stepT) {
      s += '<text class="svg-tick" x="' + fx(t) + '" y="' + (pad.t + ih + 14) + '" text-anchor="middle">' + t + '</text>';
    }
    s += '<text class="svg-lbl" x="' + (pad.l + iw / 2) + '" y="' + (h - 6) + '" text-anchor="middle">Minutes</text>';
    if (ftp) {
      s += '<text class="svg-tick" x="' + (w - pad.r) + '" y="14" text-anchor="end">at FTP ' + ftp + ' W: peak ' +
        Math.round(maxP / 100 * ftp) + ' W</text>';
    }
    return '<svg viewBox="0 0 ' + w + ' ' + h + '" style="width:100%;height:auto" role="img" aria-label="Interval power profile">' + s + '</svg>';
  }

  function turboLab(el) {
    var U = window.SOT_util;
    var b = U ? U.body(el) : el;
    var cats = [{ v: 'all', l: 'All' }, { v: 'recovery', l: 'Recovery' }, { v: 'aerobic', l: 'Aerobic' },
      { v: 'tempo', l: 'Tempo' }, { v: 'threshold', l: 'Threshold' }, { v: 'vo2', l: 'VO₂max' },
      { v: 'anaerobic', l: 'Anaerobic' }, { v: 'sprint', l: 'Sprint' }, { v: 'strength', l: 'Torque' },
      { v: 'skill', l: 'Skill' }, { v: 'test', l: 'Test' }];
    b.innerHTML =
      '<div class="ctls ctls--2">' +
      '<div class="ctl"><label>Filter by purpose</label><div class="segs" id="tl-c">' +
      cats.map(function (c, i) { return '<button type="button" data-v="' + c.v + '" aria-pressed="' + (i === 0) + '">' + c.l + '</button>'; }).join('') +
      '</div></div>' +
      '<div class="ctl"><label for="tl-ftp">Your FTP<span class="v" id="tl-ftp-v">220 W</span></label>' +
      '<input type="range" id="tl-ftp" min="100" max="420" step="5" value="220"></div></div>' +
      '<div class="ctl" style="margin-bottom:1rem"><label>Workout</label><div class="segs" id="tl-w"></div></div>' +
      '<div id="tl-prof"></div><div id="tl-ro"></div><div id="tl-info"></div>' +
      '<hr class="rule"><h3 style="margin:0 0 .3rem">Where it fits: four-to-six week plans</h3>' +
      '<div class="ctls"><div class="ctl"><div class="segs" id="tl-p">' +
      Object.keys(PLANS).map(function (k, i) { return '<button type="button" data-v="' + k + '" aria-pressed="' + (i === 0) + '">' + PLANS[k].l + '</button>'; }).join('') +
      '</div></div></div><div id="tl-plan"></div>';

    var cat = 'all', sel = 'z2';

    function fillList() {
      var list = WK.filter(function (w) { return cat === 'all' || w.cat === cat; });
      if (!list.some(function (w) { return w.id === sel; })) sel = list[0].id;
      $('#tl-w', el).innerHTML = list.map(function (w) {
        return '<button type="button" data-v="' + w.id + '" aria-pressed="' + (w.id === sel) + '">' + w.n + '</button>';
      }).join('');
    }
    function draw() {
      var w = WK.filter(function (x) { return x.id === sel; })[0];
      var ftp = +$('#tl-ftp', el).value;
      $('#tl-ftp-v', el).textContent = ftp + ' W';
      var m = metrics(w.steps);
      $('#tl-prof', el).innerHTML = profileSVG(w.steps, ftp);
      var hard = 0; Object.keys(m.zt).forEach(function (z) { if (+z >= 4) hard += m.zt[z]; });
      $('#tl-ro', el).innerHTML = (U ? U.ro : function (i) { return ''; })([
        { v: fmt(m.total, 0), u: 'min', k: 'Total session' },
        { v: fmt(hard, 0), u: 'min', k: 'At or above sweet spot' },
        { v: fmt(m.avg, 0), u: '% FTP', k: 'Average intensity' },
        { v: fmt(m.tss, 0), k: 'Training-stress score (approx.)' },
        { v: w.rpe, k: 'Perceived effort' }
      ]);
      var zrows = Object.keys(m.zt).sort().map(function (z) {
        var any = null; for (var p = 40; p <= 260; p += 1) { if (zone(p).z === +z) { any = zone(p); break; } }
        return '<tr><td><strong style="color:' + D(any.c) + '">Z' + z + '</strong> ' + any.n + '</td>' +
          '<td class="n">' + fmt(m.zt[z], 0) + ' min</td>' +
          '<td><span class="cellbar-track"><span class="cellbar" style="width:' + (m.zt[z] / m.total * 100) + '%;background:' + D(any.c) + '"></span></span></td></tr>';
      }).join('');
      $('#tl-info', el).innerHTML =
        '<div class="g2" style="margin-top:1rem"><div>' +
        '<h4 style="margin:0 0 .3rem;color:var(--accent)">What it changes</h4>' +
        '<p style="font-size:.93rem;margin:0 0 .6rem"><strong>' + w.adapt + '</strong></p>' +
        '<p style="font-size:.93rem;margin:0 0 .6rem">' + w.why + '</p>' +
        '<h4 style="margin:.8rem 0 .3rem;color:var(--accent)">When to use it</h4>' +
        '<p style="font-size:.93rem;margin:0">' + w.when + '</p>' +
        '<p style="font-size:.86rem;color:var(--muted);margin:.7rem 0 0"><strong>Cadence:</strong> ' + w.cad + '</p>' +
        '</div><div><div class="tablewrap"><table class="dt dt--compact"><caption>Time in zone</caption><tbody>' +
        zrows + '</tbody></table></div></div></div>';
    }
    function drawPlan(k) {
      var p = PLANS[k || 'base'];
      $('#tl-plan', el).innerHTML =
        '<p style="font-size:.93rem">' + p.goal + ' <span class="tag">' + p.h + '</span></p>' +
        '<div class="tablewrap"><table class="dt dt--compact"><caption>' + p.l + ' — a representative week</caption>' +
        '<thead><tr><th>Day</th><th>Session</th><th>Purpose</th></tr></thead><tbody>' +
        p.week.map(function (d) {
          var w = WK.filter(function (x) { return x.id === d[1]; })[0];
          if (!w) return '<tr><td><strong>' + d[0] + '</strong></td><td class="muted">' + d[1] + '</td><td class="muted">Rest or cross-training</td></tr>';
          return '<tr><td><strong>' + d[0] + '</strong></td><td><a href="#" data-go="' + w.id + '">' + w.n + '</a>' +
            '<span class="sub">' + fmt(metrics(w.steps).total, 0) + ' min · RPE ' + w.rpe + '</span></td><td>' + w.adapt + '</td></tr>';
        }).join('') + '</tbody></table></div>';
      $$('#tl-plan a[data-go]', el).forEach(function (a) {
        a.addEventListener('click', function (e) {
          e.preventDefault(); cat = 'all'; sel = a.dataset.go;
          $$('#tl-c button', el).forEach(function (x) { x.setAttribute('aria-pressed', String(x.dataset.v === 'all')); });
          fillList(); draw();
          $('#tl-prof', el).scrollIntoView({ block: 'center', behavior: 'smooth' });
        });
      });
    }
    $('#tl-c', el).addEventListener('click', function (e) {
      var btn = e.target.closest('button'); if (!btn) return;
      $$('#tl-c button', el).forEach(function (x) { x.setAttribute('aria-pressed', String(x === btn)); });
      cat = btn.dataset.v; fillList(); draw();
    });
    $('#tl-w', el).addEventListener('click', function (e) {
      var btn = e.target.closest('button'); if (!btn) return;
      $$('#tl-w button', el).forEach(function (x) { x.setAttribute('aria-pressed', String(x === btn)); });
      sel = btn.dataset.v; draw();
    });
    $('#tl-p', el).addEventListener('click', function (e) {
      var btn = e.target.closest('button'); if (!btn) return;
      $$('#tl-p button', el).forEach(function (x) { x.setAttribute('aria-pressed', String(x === btn)); });
      drawPlan(btn.dataset.v);
    });
    $('#tl-ftp', el).addEventListener('input', draw);
    fillList(); draw(); drawPlan('base');
  }

  function register() {
    if (!window.SOT_WIDGETS) { setTimeout(register, 30); return; }
    window.SOT_WIDGETS['turbo-lab'] = turboLab;
    if (window.SOT_mountWidgets) window.SOT_mountWidgets();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', register);
  else register();
  window.SOT_CYCLING = { WK: WK, PLANS: PLANS, metrics: metrics, profileSVG: profileSVG, zone: zone };
})();
