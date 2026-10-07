/* ============================================================
   figures.js — animated human figure, drill library,
   interactive muscle map and activation atlas.
   Loaded before widgets.js; registers extra widgets on SOT_WIDGETS.
   ============================================================ */
(function () {
  'use strict';

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var rad = function (d) { return d * Math.PI / 180; };
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var D = function (n) { return 'var(--d' + n + ')'; };

  /* ============================================================
     A. PARAMETRIC FIGURE (sagittal view, facing right)
     Angles in degrees. Leg/arm angles measured from straight down,
     positive = forward. Knee/elbow = flexion.
     ============================================================ */
  var SEG = { head: 26, neck: 16, trunk: 112, upper: 60, fore: 56, thigh: 88, shank: 84, foot: 30 };

  function fk(p) {
    // pelvis
    var hx = p.x, hy = p.y;
    var tr = p.trunk || 0;
    var sx = hx + SEG.trunk * Math.sin(rad(tr)), sy = hy - SEG.trunk * Math.cos(rad(tr));
    var nk = (p.head != null ? p.head : tr);
    var hdx = sx + (SEG.neck + SEG.head * .72) * Math.sin(rad(nk)),
        hdy = sy - (SEG.neck + SEG.head * .72) * Math.cos(rad(nk));
    function limb(ox, oy, a1, flex, L1, L2) {
      var jx = ox + L1 * Math.sin(rad(a1)), jy = oy + L1 * Math.cos(rad(a1));
      var a2 = a1 - flex;
      var ex = jx + L2 * Math.sin(rad(a2)), ey = jy + L2 * Math.cos(rad(a2));
      return { j: [jx, jy], e: [ex, ey], a2: a2 };
    }
    function arm(a1, flex) {
      var jx = sx + SEG.upper * Math.sin(rad(a1)), jy = sy + SEG.upper * Math.cos(rad(a1));
      var a2 = a1 + flex;
      return { j: [jx, jy], e: [jx + SEG.fore * Math.sin(rad(a2)), jy + SEG.fore * Math.cos(rad(a2))] };
    }
    var legN = limb(hx, hy, p.hipN || 0, p.kneeN || 0, SEG.thigh, SEG.shank);
    var legF = limb(hx, hy, p.hipF || 0, p.kneeF || 0, SEG.thigh, SEG.shank);
    function foot(ankle, shankAng, ank) {
      var a = shankAng - 90 - (ank || 0);
      return [ankle[0] + SEG.foot * Math.sin(rad(a + 180)) * -1, ankle[1] + SEG.foot * Math.cos(rad(a + 180)) * -1];
    }
    return {
      hip: [hx, hy], sh: [sx, sy], head: [hdx, hdy],
      legN: legN, legF: legF,
      footN: foot(legN.e, legN.a2, p.ankN), footF: foot(legF.e, legF.a2, p.ankF),
      armN: arm(p.shN || 0, p.elN || 0), armF: arm(p.shF || 0, p.elF || 0)
    };
  }

  function capsule(a, b, r1, r2, fill, op) {
    var dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || .001;
    var nx = -dy / L, ny = dx / L;
    var p1 = [a[0] + nx * r1, a[1] + ny * r1], p2 = [b[0] + nx * r2, b[1] + ny * r2],
        p3 = [b[0] - nx * r2, b[1] - ny * r2], p4 = [a[0] - nx * r1, a[1] - ny * r1];
    return '<path d="M' + p1 + ' L' + p2 + ' A' + r2 + ' ' + r2 + ' 0 0 1 ' + p3 +
      ' L' + p4 + ' A' + r1 + ' ' + r1 + ' 0 0 1 ' + p1 + ' Z" style="fill:' + fill +
      (op != null ? ';opacity:' + op : '') + '"/>';
  }

  function drawFigure(p, o) {
    o = o || {};
    var k = fk(p);
    var near = o.near || 'var(--ink-2)', far = o.far || 'var(--rule-2)';
    var hi = o.hi || D(2);
    var s = '';
    // far limbs first
    s += capsule(k.hip, k.legF.j, 15, 11, far) + capsule(k.legF.j, k.legF.e, 10, 7, far);
    s += capsule(k.legF.e, k.footF, 6, 4, far);
    s += capsule(k.sh, k.armF.j, 10, 8, far) + capsule(k.armF.j, k.armF.e, 7, 5, far);
    // trunk
    s += capsule(k.hip, k.sh, 20, 23, near);
    // head
    s += '<circle cx="' + k.head[0].toFixed(1) + '" cy="' + k.head[1].toFixed(1) + '" r="' + SEG.head * .52 + '" style="fill:' + near + '"/>';
    // near limbs
    s += capsule(k.sh, k.armN.j, 11, 8.5, near) + capsule(k.armN.j, k.armN.e, 7.5, 5, near);
    s += capsule(k.hip, k.legN.j, 16, 12, near) + capsule(k.legN.j, k.legN.e, 11, 7.5, near);
    s += capsule(k.legN.e, k.footN, 6.5, 4.5, near);
    // highlight target tissue
    (o.highlight || []).forEach(function (hname) {
      var seg = {
        quad: [k.hip, k.legN.j, 16, 12], ham: [k.hip, k.legN.j, 16, 12],
        calf: [k.legN.j, k.legN.e, 11, 7.5], glute: [k.hip, k.legN.j, 17, 12],
        trunk: [k.hip, k.sh, 20, 23], shoulder: [k.sh, k.armN.j, 11, 8.5],
        hipflex: [k.hip, k.legF.j, 15, 11], achilles: [k.legN.e, k.footN, 6.5, 4.5]
      }[hname];
      if (seg) s += capsule(seg[0], seg[1], seg[2], seg[3], hi, .55);
    });
    return s;
  }

  /* ---------- drill library: keyframed poses ---------- */
  var STAND = { x: 150, y: 300, trunk: 0, hipN: 0, kneeN: 4, hipF: 0, kneeF: 4, shN: 4, elN: 8, shF: 4, elF: 8, ankN: 0, ankF: 0 };
  function pose(over) { var o = {}, k; for (k in STAND) o[k] = STAND[k]; for (k in over) o[k] = over[k]; return o; }

  var DRILL = {
    /* ---- general warm-up / RAMP ---- */
    march: { n: 'Marching with arm swing', cat: 'raise', target: '30 s', view: 'side',
      why: 'Raises heart rate, muscle temperature and joint fluid viscosity with almost no mechanical cost. Every degree of muscle temperature speeds cross-bridge cycling and nerve conduction.',
      cues: ['Drive the knee to hip height', 'Opposite arm, opposite leg', 'Tall through the spine', 'Land mid-foot, quietly'],
      hl: ['hipflex'],
      kf: [{ t: 0, p: pose({ hipN: 55, kneeN: 85, hipF: -18, kneeF: 10, shN: -30, elN: 55, shF: 32, elF: 50 }) },
           { t: .5, p: pose({ hipN: -18, kneeN: 10, hipF: 55, kneeF: 85, shN: 32, elN: 50, shF: -30, elF: 55 }) },
           { t: 1, p: pose({ hipN: 55, kneeN: 85, hipF: -18, kneeF: 10, shN: -30, elN: 55, shF: 32, elF: 50 }) }] },

    legSwingF: { n: 'Leg swing — front to back', cat: 'mobilise', target: '10 each leg', view: 'side',
      why: 'Takes the hip through its full sagittal range under control. Repeated end-range movement raises stretch tolerance within a session without the force loss that long static holds cause.',
      cues: ['Hold a wall for balance', 'Keep the pelvis still — swing the leg, not the back', 'Start small, grow the arc', 'Relax the swinging leg'],
      hl: ['hipflex', 'ham'],
      kf: [{ t: 0, p: pose({ hipN: 62, kneeN: 12, trunk: -4, shN: 70, elN: 15 }) },
           { t: .5, p: pose({ hipN: -34, kneeN: 22, trunk: 4, shN: 70, elN: 15 }) },
           { t: 1, p: pose({ hipN: 62, kneeN: 12, trunk: -4, shN: 70, elN: 15 }) }] },

    hipCircle: { n: 'Standing hip circle', cat: 'mobilise', target: '8 each direction', view: 'side',
      why: 'Circumduction loads the hip capsule in rotation and abduction, not just flexion — directions that running never visits but that stabilise the pelvis when you fatigue.',
      cues: ['Knee up, then out, then back', 'Slow — this is a search, not a swing', 'Stay tall on the standing leg'],
      hl: ['glute'],
      kf: [{ t: 0, p: pose({ hipN: 48, kneeN: 90, shN: 55, elN: 30 }) },
           { t: .33, p: pose({ hipN: 20, kneeN: 95, shN: 55, elN: 30, trunk: -6 }) },
           { t: .66, p: pose({ hipN: -22, kneeN: 55, shN: 55, elN: 30, trunk: 6 }) },
           { t: 1, p: pose({ hipN: 48, kneeN: 90, shN: 55, elN: 30 }) }] },

    wgs: { n: "World's greatest stretch", cat: 'mobilise', target: '5 each side', view: 'side',
      why: 'One movement covers hip flexor length on the trailing leg, hamstring and adductor on the lead leg, ankle dorsiflexion, and thoracic rotation. The highest return per second in any warm-up.',
      cues: ['Deep lunge, back knee just off the floor', 'Lead elbow toward the instep', 'Then rotate and reach to the ceiling', 'Follow the hand with your eyes'],
      hl: ['hipflex', 'trunk'],
      kf: [{ t: 0, p: pose({ hipN: 72, kneeN: 95, hipF: -42, kneeF: 70, trunk: 36, shN: 80, elN: 90, shF: 30, elF: 60 }) },
           { t: .5, p: pose({ hipN: 72, kneeN: 95, hipF: -42, kneeF: 70, trunk: 16, shN: -120, elN: 10, shF: 40, elF: 40 }) },
           { t: 1, p: pose({ hipN: 72, kneeN: 95, hipF: -42, kneeF: 70, trunk: 36, shN: 80, elN: 90, shF: 30, elF: 60 }) }] },

    ankleRock: { n: 'Ankle dorsiflexion rock', cat: 'mobilise', target: '10 each ankle', view: 'side',
      why: 'Ankle dorsiflexion range is the single most common restriction in squatting and in running mechanics. Restricted ankles push the knee and hip to compensate.',
      cues: ['Front foot flat — heel must not lift', 'Drive the knee forward over the toes', 'Hold 2 s at end range'],
      hl: ['calf', 'achilles'],
      kf: [{ t: 0, p: pose({ hipN: 40, kneeN: 55, hipF: -20, kneeF: 30, trunk: 22, ankN: 8, shN: 50, elN: 70 }) },
           { t: .5, p: pose({ hipN: 62, kneeN: 95, hipF: -25, kneeF: 40, trunk: 32, ankN: 28, shN: 50, elN: 70 }) },
           { t: 1, p: pose({ hipN: 40, kneeN: 55, hipF: -20, kneeF: 30, trunk: 22, ankN: 8, shN: 50, elN: 70 }) }] },

    catCow: { n: 'Cat–cow', cat: 'mobilise', target: '8 cycles', view: 'side',
      why: 'Segmental spinal flexion and extension, unloaded. Useful before lifting to find the range you will then lock out of, and after sitting all day.',
      cues: ['Move one vertebra at a time', 'Breathe out into the round, in to the arch', 'No forcing at the ends'],
      hl: ['trunk'],
      kf: [{ t: 0, p: pose({ x: 150, y: 330, trunk: 78, hipN: 92, kneeN: 92, hipF: 92, kneeF: 92, shN: 8, elN: 4, shF: 8, elF: 4, head: 58 }) },
           { t: .5, p: pose({ x: 150, y: 330, trunk: 96, hipN: 92, kneeN: 92, hipF: 92, kneeF: 92, shN: -8, elN: 4, shF: -8, elF: 4, head: 118 }) },
           { t: 1, p: pose({ x: 150, y: 330, trunk: 78, hipN: 92, kneeN: 92, hipF: 92, kneeF: 92, shN: 8, elN: 4, shF: 8, elF: 4, head: 58 }) }] },

    gluteBridge: { n: 'Glute bridge', cat: 'activate', target: '12 reps', view: 'side',
      why: 'Wakes the gluteus maximus in a position where the hamstrings cannot dominate, and teaches posterior pelvic tilt — the pattern that protects the lumbar spine under load.',
      cues: ['Heels close to the hips', 'Tuck the pelvis before you lift', 'Squeeze at the top for 2 s', 'Ribs down — do not arch the back'],
      hl: ['glute'],
      kf: [{ t: 0, p: pose({ x: 130, y: 430, trunk: 92, hipN: 128, kneeN: 95, hipF: 128, kneeF: 95, shN: 96, elN: 0, shF: 96, elF: 0, head: 86 }) },
           { t: .45, p: pose({ x: 150, y: 398, trunk: 104, hipN: 150, kneeN: 95, hipF: 150, kneeF: 95, shN: 100, elN: 0, shF: 100, elF: 0, head: 96 }) },
           { t: 1, p: pose({ x: 130, y: 430, trunk: 92, hipN: 128, kneeN: 95, hipF: 128, kneeF: 95, shN: 96, elN: 0, shF: 96, elF: 0, head: 86 }) }] },

    deadBug: { n: 'Dead bug', cat: 'activate', target: '8 each side', view: 'side',
      why: 'Trains the trunk to resist extension while the limbs move — which is exactly what the core does during running and lifting. Anti-movement, not crunching.',
      cues: ['Flatten the low back into the floor and keep it there', 'Exhale as the limbs extend', 'Stop at the range where the back lifts'],
      hl: ['trunk'],
      kf: [{ t: 0, p: pose({ x: 150, y: 440, trunk: 90, hipN: 180, kneeN: 90, hipF: 180, kneeF: 90, shN: 182, elN: 0, shF: 182, elF: 0, head: 86 }) },
           { t: .5, p: pose({ x: 150, y: 440, trunk: 90, hipN: 225, kneeN: 20, hipF: 175, kneeF: 92, shN: 140, elN: 0, shF: 200, elF: 0, head: 86 }) },
           { t: 1, p: pose({ x: 150, y: 440, trunk: 90, hipN: 180, kneeN: 90, hipF: 180, kneeF: 90, shN: 182, elN: 0, shF: 182, elF: 0, head: 86 }) }] },

    birdDog: { n: 'Bird dog', cat: 'activate', target: '8 each side', view: 'side',
      why: 'Loads the erector spinae and gluteus maximus diagonally while demanding the trunk stay still — the same anti-rotation demand as single-leg stance in running.',
      cues: ['Reach long, do not lift high', 'Hips stay level — imagine a glass of water on your low back', 'Pause 2 s at full reach'],
      hl: ['glute', 'trunk'],
      kf: [{ t: 0, p: pose({ x: 150, y: 340, trunk: 86, hipN: 92, kneeN: 92, hipF: 92, kneeF: 92, shN: 4, elN: 2, shF: 4, elF: 2, head: 80 }) },
           { t: .5, p: pose({ x: 150, y: 340, trunk: 86, hipN: 178, kneeN: 8, hipF: 92, kneeF: 92, shN: -84, elN: 2, shF: 4, elF: 2, head: 80 }) },
           { t: 1, p: pose({ x: 150, y: 340, trunk: 86, hipN: 92, kneeN: 92, hipF: 92, kneeF: 92, shN: 4, elN: 2, shF: 4, elF: 2, head: 80 }) }] },

    aSkip: { n: 'A-skip', cat: 'potentiate', target: '2 × 20 m', view: 'side',
      why: 'Rehearses the running cycle at high rate with an exaggerated knee drive, and primes the stretch-shortening cycle. Elastic drills raise tendon stiffness acutely — free economy for the session ahead.',
      cues: ['Tall posture, no sitting back', 'Snap the foot down beneath the hip', 'Ground contact short and loud-free', 'Think "up and down", not "forward"'],
      hl: ['calf', 'hipflex'],
      kf: [{ t: 0, p: pose({ hipN: 70, kneeN: 100, hipF: -28, kneeF: 32, shN: -42, elN: 80, shF: 44, elF: 70, ankN: 12 }) },
           { t: .25, p: pose({ hipN: 28, kneeN: 24, hipF: -6, kneeF: 12, shN: -10, elN: 80, shF: 14, elF: 70, ankN: -6 }) },
           { t: .5, p: pose({ hipN: -28, kneeN: 32, hipF: 70, kneeF: 100, shN: 44, elN: 70, shF: -42, elF: 80, ankN: 4 }) },
           { t: .75, p: pose({ hipN: -6, kneeN: 12, hipF: 28, kneeF: 24, shN: 14, elN: 70, shF: -10, elF: 80, ankN: -6 }) },
           { t: 1, p: pose({ hipN: 70, kneeN: 100, hipF: -28, kneeF: 32, shN: -42, elN: 80, shF: 44, elF: 70, ankN: 12 }) }] },

    pogo: { n: 'Pogo hops', cat: 'potentiate', target: '2 × 15', view: 'side',
      why: 'Short, stiff ground contacts train the ankle as a spring. This is the single best preparation for fast running and the best cheap test of whether your calves are ready.',
      cues: ['Knees nearly straight — bounce from the ankle', 'Minimum time on the ground', 'Quiet landings', 'Stop when contacts get slow or loud'],
      hl: ['calf', 'achilles'],
      kf: [{ t: 0, p: pose({ hipN: 4, kneeN: 16, hipF: 4, kneeF: 16, ankN: -14, ankF: -14, shN: -18, elN: 70, shF: -18, elF: 70 }) },
           { t: .4, p: pose({ x: 150, y: 272, hipN: 2, kneeN: 6, hipF: 2, kneeF: 6, ankN: 24, ankF: 24, shN: -24, elN: 60, shF: -24, elF: 60 }) },
           { t: 1, p: pose({ hipN: 4, kneeN: 16, hipF: 4, kneeF: 16, ankN: -14, ankF: -14, shN: -18, elN: 70, shF: -18, elF: 70 }) }] },

    /* ---- strength for runners ---- */
    calfRaise: { n: 'Single-leg calf raise', cat: 'strength', target: '3 × 8–12, slow', view: 'side',
      why: 'The calf–Achilles complex absorbs and returns the largest forces in running — six to eight times body weight at the ankle. It is also the tissue most often under-prepared. Heavy, slow, full-range work builds both muscle and tendon stiffness.',
      cues: ['Full range: heel below the step, then all the way up', '3 s up, 2 s pause, 3 s down', 'Knee straight for gastrocnemius, bent for soleus', 'Add load once you pass 20 reps'],
      hl: ['calf', 'achilles'],
      kf: [{ t: 0, p: pose({ hipN: 0, kneeN: 4, hipF: -32, kneeF: 80, ankN: 22, shN: 40, elN: 50, shF: 40, elF: 50 }) },
           { t: .45, p: pose({ x: 150, y: 278, hipN: 0, kneeN: 2, hipF: -32, kneeF: 80, ankN: -26, shN: 40, elN: 50, shF: 40, elF: 50 }) },
           { t: 1, p: pose({ hipN: 0, kneeN: 4, hipF: -32, kneeF: 80, ankN: 22, shN: 40, elN: 50, shF: 40, elF: 50 }) }] },

    nordic: { n: 'Nordic hamstring curl', cat: 'strength', target: '2–3 × 4–6', view: 'side',
      why: 'The best-evidenced single exercise for preventing hamstring injury — trials show large reductions in incidence. It loads the hamstring eccentrically at long length, which is precisely where sprint injuries happen.',
      cues: ['Ankles held firmly', 'Hips straight — do not break at the waist', 'Lower as slowly as you can control, then push off hands', 'Expect severe soreness the first two weeks — start with 2 sets of 3'],
      hl: ['ham'],
      kf: [{ t: 0, p: pose({ x: 150, y: 360, trunk: 2, hipN: 92, kneeN: 92, hipF: 92, kneeF: 92, shN: 10, elN: 20, shF: 10, elF: 20 }) },
           { t: .7, p: pose({ x: 150, y: 374, trunk: 56, hipN: 92, kneeN: 92, hipF: 92, kneeF: 92, shN: 30, elN: 50, shF: 30, elF: 50 }) },
           { t: 1, p: pose({ x: 150, y: 360, trunk: 2, hipN: 92, kneeN: 92, hipF: 92, kneeF: 92, shN: 10, elN: 20, shF: 10, elF: 20 }) }] },

    splitSquat: { n: 'Rear-foot-elevated split squat', cat: 'strength', target: '3 × 6–8 each leg', view: 'side',
      why: 'Single-leg loading matches how running actually works — you are never on two legs. It builds quadriceps and gluteus maximus strength at long muscle lengths with far less spinal load than a barbell squat.',
      cues: ['Back foot on a bench, front shin near vertical', 'Drop straight down, knee tracks over the foot', 'Light torso lean loads the glute more; upright loads the quad',
             'Hold dumbbells once bodyweight gives you 12 clean reps'],
      hl: ['quad', 'glute'],
      kf: [{ t: 0, p: pose({ hipN: 14, kneeN: 20, hipF: -40, kneeF: 54, trunk: 10, shN: 6, elN: 6, shF: 6, elF: 6 }) },
           { t: .5, p: pose({ x: 150, y: 352, hipN: 50, kneeN: 94, hipF: -34, kneeF: 110, trunk: 20, shN: 10, elN: 6, shF: 10, elF: 6 }) },
           { t: 1, p: pose({ hipN: 14, kneeN: 20, hipF: -40, kneeF: 54, trunk: 10, shN: 6, elN: 6, shF: 6, elF: 6 }) }] },

    rdl: { n: 'Single-leg Romanian deadlift', cat: 'strength', target: '3 × 8 each leg', view: 'side',
      why: 'Loads the hamstrings and gluteus maximus through hip extension at long length, and simultaneously trains the pelvic control that collapses when runners fatigue.',
      cues: ['Hinge at the hip, spine neutral', 'Push the free leg back as a counterweight', 'Feel it in the hamstring, not the low back', 'Stop where your back would round'],
      hl: ['ham', 'glute'],
      kf: [{ t: 0, p: pose({ hipN: 0, kneeN: 10, hipF: -14, kneeF: 20, trunk: 4, shN: 4, elN: 4, shF: 4, elF: 4 }) },
           { t: .5, p: pose({ hipN: 4, kneeN: 16, hipF: -82, kneeF: 10, trunk: 78, shN: 4, elN: 2, shF: 4, elF: 2, head: 66 }) },
           { t: 1, p: pose({ hipN: 0, kneeN: 10, hipF: -14, kneeF: 20, trunk: 4, shN: 4, elN: 4, shF: 4, elF: 4 }) }] },

    squat: { n: 'Barbell back squat', cat: 'strength', target: '3–5 × 3–6', view: 'side',
      why: 'The highest-yield loaded pattern for the whole lower body: quadriceps, gluteus maximus, adductors and the entire trunk under one bar. Heavy squatting improves running economy by 2–8% without adding mass.',
      cues: ['Brace before you unrack, breathe into the belt line', 'Sit between the hips, knees travel forward', 'Depth to where the pelvis stays neutral', 'Drive the floor away — bar path straight over mid-foot'],
      hl: ['quad', 'glute', 'trunk'],
      kf: [{ t: 0, p: pose({ hipN: 2, kneeN: 6, hipF: 2, kneeF: 6, trunk: 2, shN: -40, elN: 120, shF: -40, elF: 120 }) },
           { t: .5, p: pose({ x: 150, y: 372, hipN: 44, kneeN: 104, hipF: 44, kneeF: 104, trunk: 32, shN: -56, elN: 120, shF: -56, elF: 120 }) },
           { t: 1, p: pose({ hipN: 2, kneeN: 6, hipF: 2, kneeF: 6, trunk: 2, shN: -40, elN: 120, shF: -40, elF: 120 }) }] },

    hipThrust: { n: 'Barbell hip thrust', cat: 'strength', target: '3 × 8–12', view: 'side',
      why: 'Produces the highest gluteus maximus activation of the common lifts (around 82% MVIC) and loads the glute hardest at full hip extension — the position where sprinting demands it.',
      cues: ['Shoulders on a bench, chin tucked', 'Push through the heels, finish with the pelvis tucked', 'Ribs down — extend the hip, not the lumbar spine', '2 s hold at the top'],
      hl: ['glute'],
      kf: [{ t: 0, p: pose({ x: 140, y: 420, trunk: 110, hipN: 120, kneeN: 92, hipF: 120, kneeF: 92, shN: 118, elN: 0, shF: 118, elF: 0, head: 104 }) },
           { t: .5, p: pose({ x: 152, y: 392, trunk: 118, hipN: 162, kneeN: 94, hipF: 162, kneeF: 94, shN: 120, elN: 0, shF: 120, elF: 0, head: 112 }) },
           { t: 1, p: pose({ x: 140, y: 420, trunk: 110, hipN: 120, kneeN: 92, hipF: 120, kneeF: 92, shN: 118, elN: 0, shF: 118, elF: 0, head: 104 }) }] },

    stepUp: { n: 'High step-up', cat: 'strength', target: '3 × 6–8 each leg', view: 'side',
      why: 'Among the highest gluteus maximus demands of any exercise, and the most transferable to hill running. The step height sets the hip flexion — higher means more glute.',
      cues: ['Step height at or just above knee', 'All the drive from the top leg — do not push off the floor', 'Control the descent for 3 s', 'Knee tracks over the second toe'],
      hl: ['glute', 'quad'],
      kf: [{ t: 0, p: pose({ hipN: 86, kneeN: 96, hipF: -8, kneeF: 12, trunk: 22, shN: 10, elN: 10, shF: 10, elF: 10 }) },
           { t: .55, p: pose({ x: 150, y: 250, hipN: 10, kneeN: 10, hipF: -42, kneeF: 26, trunk: 6, shN: 14, elN: 10, shF: 14, elF: 10 }) },
           { t: 1, p: pose({ hipN: 86, kneeN: 96, hipF: -8, kneeF: 12, trunk: 22, shN: 10, elN: 10, shF: 10, elF: 10 }) }] },

    /* ---- static stretches (after, not before) ---- */
    calfStretch: { n: 'Standing calf / Achilles stretch', cat: 'stretch', target: '2 × 30 s each', view: 'side',
      why: 'Static holds raise stretch tolerance over weeks. Do them after training or in a separate session — long holds immediately before hard work transiently reduce force and rate of force development.',
      cues: ['Back leg straight, heel down for gastrocnemius', 'Then bend that knee for soleus', 'Hips square to the wall', '30 s, breathe, do not bounce'],
      hl: ['calf', 'achilles'],
      kf: [{ t: 0, p: pose({ hipN: 42, kneeN: 60, hipF: -24, kneeF: 6, trunk: 26, ankN: 10, ankF: 22, shN: 62, elN: 30, shF: 62, elF: 30 }) },
           { t: 1, p: pose({ hipN: 44, kneeN: 62, hipF: -26, kneeF: 8, trunk: 28, ankN: 10, ankF: 26, shN: 62, elN: 30, shF: 62, elF: 30 }) }] },

    hipFlexStretch: { n: 'Couch / hip flexor stretch', cat: 'stretch', target: '2 × 45 s each', view: 'side',
      why: 'Sitting shortens the hip flexors; short hip flexors limit hip extension, and runners compensate by extending the lumbar spine instead. This restores the range that lets the glute finish the stride.',
      cues: ['Back knee down, shin vertical against a wall or couch', 'Tuck the pelvis under — this is the whole exercise', 'Squeeze the glute on the stretching side', 'Stay tall; do not arch backwards'],
      hl: ['hipflex'],
      kf: [{ t: 0, p: pose({ hipN: 62, kneeN: 92, hipF: -22, kneeF: 118, trunk: 2, shN: 8, elN: 12, shF: 8, elF: 12 }) },
           { t: 1, p: pose({ hipN: 62, kneeN: 92, hipF: -30, kneeF: 120, trunk: -4, shN: 8, elN: 12, shF: 8, elF: 12 }) }] },

    hamStretch: { n: 'Supine hamstring stretch', cat: 'stretch', target: '2 × 30 s each', view: 'side',
      why: 'Lying down removes the low back from the equation, so you stretch hamstring rather than lumbar ligament. Useful after long runs and in hamstring rehabilitation once pain allows.',
      cues: ['Other leg flat on the floor', 'Straighten the knee as far as comfort allows', 'Pull from behind the thigh, not the shin', 'No sharp or nerve-like sensation'],
      hl: ['ham'],
      kf: [{ t: 0, p: pose({ x: 150, y: 440, trunk: 90, hipN: 158, kneeN: 24, hipF: 182, kneeF: 4, shN: 150, elN: 40, shF: 178, elF: 0, head: 86 }) },
           { t: 1, p: pose({ x: 150, y: 440, trunk: 90, hipN: 168, kneeN: 12, hipF: 182, kneeF: 4, shN: 158, elN: 36, shF: 178, elF: 0, head: 86 }) }] },

    pigeon: { n: '90/90 hip rotation', cat: 'stretch', target: '45 s each side', view: 'side',
      why: 'Hip internal and external rotation is the range running never trains and that stiffens first with age. Loss here shows up as compensation at the knee and low back.',
      cues: ['Both knees at 90°, front shin across the body', 'Sit tall, then hinge forward from the hip', 'Switch sides without using your hands if you can'],
      hl: ['glute'],
      kf: [{ t: 0, p: pose({ x: 150, y: 400, trunk: 8, hipN: 96, kneeN: 94, hipF: 60, kneeF: 96, shN: 40, elN: 20, shF: 40, elF: 20 }) },
           { t: 1, p: pose({ x: 150, y: 400, trunk: 32, hipN: 100, kneeN: 94, hipF: 62, kneeF: 96, shN: 50, elN: 24, shF: 50, elF: 24, head: 20 }) }] },

    thoracic: { n: 'Open-book thoracic rotation', cat: 'stretch', target: '8 each side', view: 'side',
      why: 'Arm swing in running and overhead positions in lifting both need thoracic rotation and extension. The lumbar spine will fake it if the thorax cannot, which is where a lot of back pain begins.',
      cues: ['Knees stacked and still', 'Rotate from the ribs, follow the hand with the eyes', 'Exhale at end range, hold 3 s'],
      hl: ['trunk'],
      kf: [{ t: 0, p: pose({ x: 150, y: 430, trunk: 92, hipN: 136, kneeN: 92, hipF: 136, kneeF: 92, shN: 182, elN: 2, shF: 182, elF: 2, head: 88 }) },
           { t: .5, p: pose({ x: 150, y: 430, trunk: 92, hipN: 136, kneeN: 92, hipF: 136, kneeF: 92, shN: 96, elN: 2, shF: 184, elF: 2, head: 100 }) },
           { t: 1, p: pose({ x: 150, y: 430, trunk: 92, hipN: 136, kneeN: 92, hipF: 136, kneeF: 92, shN: 182, elN: 2, shF: 182, elF: 2, head: 88 }) }] },

    /* ---- rehab loading ---- */
    isoCalf: { n: 'Isometric calf hold (tendon pain)', cat: 'rehab', target: '5 × 45 s', view: 'side',
      why: 'Heavy isometric holds load a painful tendon without the stretch-shortening cycle that provokes it, and in several studies reduce pain immediately for hours afterwards. The entry point when a tendon is too irritable for full-range work.',
      cues: ['Mid-range, heel level with the step', 'Hold hard — about 70% of maximum effort', '45 s, 2 min rest, five times', 'Pain during should stay at or below 3/10'],
      hl: ['calf', 'achilles'],
      kf: [{ t: 0, p: pose({ hipN: 0, kneeN: 4, hipF: -30, kneeF: 80, ankN: -4, shN: 40, elN: 50, shF: 40, elF: 50 }) },
           { t: 1, p: pose({ hipN: 0, kneeN: 5, hipF: -30, kneeF: 80, ankN: -2, shN: 40, elN: 50, shF: 40, elF: 50 }) }] },

    hsr: { n: 'Heavy slow resistance (tendon)', cat: 'rehab', target: '3–4 × 6–8, 3 s up / 3 s down', view: 'side',
      why: 'The best-supported tendon rehabilitation stimulus: slow, heavy, full-range loading three times a week. It raises collagen synthesis and tendon stiffness, and outperforms rest at every time point.',
      cues: ['3 s lowering, 3 s lifting — no bounce', 'Load heavy enough that 8 reps is hard', 'Mild discomfort is acceptable; sharp pain is not', 'Judge it on how the tendon feels the NEXT morning'],
      hl: ['calf', 'achilles'],
      kf: [{ t: 0, p: pose({ hipN: 0, kneeN: 4, hipF: -30, kneeF: 80, ankN: 24, shN: 40, elN: 50, shF: 40, elF: 50 }) },
           { t: .5, p: pose({ x: 150, y: 280, hipN: 0, kneeN: 2, hipF: -30, kneeF: 80, ankN: -24, shN: 40, elN: 50, shF: 40, elF: 50 }) },
           { t: 1, p: pose({ hipN: 0, kneeN: 4, hipF: -30, kneeF: 80, ankN: 24, shN: 40, elN: 50, shF: 40, elF: 50 }) }] },

    sideLie: { n: 'Side-lying hip abduction', cat: 'rehab', target: '3 × 15 each side', view: 'side',
      why: 'Gluteus medius controls pelvic drop in single-leg stance. Weakness here is associated with patellofemoral pain and iliotibial band syndrome, and it responds quickly to simple loading.',
      cues: ['Body in one straight line, back against a wall', 'Lead with the heel, toe slightly down', 'Lift only to where the pelvis stays still', 'Burn should be in the side of the hip, not the front'],
      hl: ['glute'],
      kf: [{ t: 0, p: pose({ x: 150, y: 420, trunk: 88, hipN: 92, kneeN: 6, hipF: 92, kneeF: 6, shN: 150, elN: 20, shF: 60, elF: 60, head: 86 }) },
           { t: .5, p: pose({ x: 150, y: 420, trunk: 88, hipN: 118, kneeN: 4, hipF: 92, kneeF: 6, shN: 150, elN: 20, shF: 60, elF: 60, head: 86 }) },
           { t: 1, p: pose({ x: 150, y: 420, trunk: 88, hipN: 92, kneeN: 6, hipF: 92, kneeF: 6, shN: 150, elN: 20, shF: 60, elF: 60, head: 86 }) }] }
  };

  var ROUTINES = {
    prerun: { l: 'Before a run', mins: '8–10 min',
      note: 'Follows the RAMP structure: Raise, Activate, Mobilise, Potentiate. Nothing here is a long static hold — those come afterwards.',
      list: ['march', 'legSwingF', 'hipCircle', 'ankleRock', 'wgs', 'gluteBridge', 'aSkip', 'pogo'] },
    prelift: { l: 'Before lifting', mins: '8–12 min',
      note: 'General raise, then mobilise what the session demands, then ramp the first exercise with progressively heavier sets rather than more drills.',
      list: ['march', 'catCow', 'ankleRock', 'wgs', 'gluteBridge', 'deadBug', 'birdDog'] },
    postrun: { l: 'After training — stretch', mins: '8–10 min',
      note: 'This is where static stretching belongs: no force-production cost, and over weeks it genuinely increases range by raising stretch tolerance.',
      list: ['calfStretch', 'hipFlexStretch', 'hamStretch', 'pigeon', 'thoracic'] },
    runstrength: { l: 'Strength for runners', mins: '35–45 min, 2×/week',
      note: 'Heavy and low-volume. Load progresses; reps stay moderate. Place it on hard-run days or at least 6 h from quality running.',
      list: ['squat', 'rdl', 'splitSquat', 'calfRaise', 'nordic', 'stepUp'] },
    glutes: { l: 'Hip & glute emphasis', mins: '30 min',
      note: 'For runners with hip drop, patellofemoral pain, or a long history of quad-dominant training.',
      list: ['hipThrust', 'stepUp', 'rdl', 'sideLie', 'gluteBridge', 'birdDog'] },
    tendon: { l: 'Tendon rehab — Achilles', mins: '15 min, daily to alternate days',
      note: 'Stage by irritability: isometrics when angry, heavy slow resistance when settled, then add elastic work before returning to running. Progress on next-morning pain, never on how it feels during.',
      list: ['isoCalf', 'hsr', 'calfRaise', 'pogo', 'calfStretch'] }
  };

  /* ---------- widget: animated drill player ---------- */
  function drillPlayer(el) {
    var U = window.SOT_util;
    var b = U ? U.body(el) : (function () { var d = $('.widget__body', el) || el; return d; })();
    var keys = Object.keys(ROUTINES);
    b.innerHTML =
      '<div class="ctls"><div class="ctl"><label>Routine</label><div class="segs" id="dp-r">' +
      keys.map(function (k, i) { return '<button type="button" data-v="' + k + '" aria-pressed="' + (i === 0) + '">' + ROUTINES[k].l + '</button>'; }).join('') +
      '</div></div></div>' +
      '<div id="dp-note" style="font-size:.86rem;color:var(--muted);margin:-.3rem 0 .9rem"></div>' +
      '<div id="dp-strip" style="display:flex;flex-wrap:wrap;gap:.25rem;margin-bottom:.9rem"></div>' +
      '<div style="display:grid;gap:1rem;grid-template-columns:minmax(0,1fr)" id="dp-main">' +
      '<div style="background:var(--surface-2);border:1px solid var(--rule);border-radius:6px;padding:.5rem"><div id="dp-svg"></div>' +
      '<div style="display:flex;gap:.4rem;justify-content:center;align-items:center;padding:.4rem 0 .1rem">' +
      '<button class="btn btn--ghost" type="button" id="dp-prev">← Prev</button>' +
      '<button class="btn" type="button" id="dp-play">Pause</button>' +
      '<button class="btn btn--ghost" type="button" id="dp-next">Next →</button></div></div>' +
      '<div id="dp-info"></div></div>';

    var mq = window.matchMedia('(min-width:760px)');
    function layout() { $('#dp-main', el).style.gridTemplateColumns = mq.matches ? '.82fr 1fr' : 'minmax(0,1fr)'; }
    layout(); if (mq.addEventListener) mq.addEventListener('change', layout);

    var routine = keys[0], idx = 0, t = 0, playing = true, raf = null;

    function cur() { return DRILL[ROUTINES[routine].list[idx]]; }

    function interpPose(d, tt) {
      var kf = d.kf, i;
      for (i = 1; i < kf.length; i++) if (tt <= kf[i].t) break;
      i = Math.min(i, kf.length - 1);
      var a = kf[i - 1], c = kf[i];
      var f = (tt - a.t) / Math.max(.0001, c.t - a.t);
      var o = {}, k;
      for (k in a.p) o[k] = lerp(a.p[k], c.p[k] != null ? c.p[k] : a.p[k], f);
      return o;
    }
    function render() {
      var d = cur();
      var p = interpPose(d, t);
      var inner = '<rect x="0" y="0" width="300" height="560" fill="none"/>' +
        '<line x1="14" y1="500" x2="286" y2="500" style="stroke:var(--rule-2);stroke-width:1.5"/>';
      // floor shading
      inner += '<rect x="14" y="500" width="272" height="10" style="fill:var(--rule);opacity:.5"/>';
      inner += drawFigure(p, { highlight: d.hl });
      $('#dp-svg', el).innerHTML = '<svg viewBox="0 20 300 500" style="width:100%;height:auto;max-height:46vh" role="img" aria-label="' + d.n + '">' + inner + '</svg>';
    }
    function info() {
      var d = cur(), R = ROUTINES[routine];
      var catCol = { raise: 2, mobilise: 1, activate: 4, potentiate: 3, strength: 5, stretch: 6, rehab: 7 }[d.cat] || 8;
      $('#dp-info', el).innerHTML =
        '<div style="display:flex;align-items:center;gap:.5rem;flex-wrap:wrap;margin-bottom:.45rem">' +
        '<span class="tag" style="background:color-mix(in srgb,' + D(catCol) + ' 16%,transparent);border-color:' + D(catCol) + ';color:' + D(catCol) + '">' + d.cat + '</span>' +
        '<span class="tag">' + (idx + 1) + ' of ' + R.list.length + '</span></div>' +
        '<h3 style="margin:0 0 .15rem">' + d.n + '</h3>' +
        '<div style="font-family:var(--mono);font-size:.84rem;color:var(--accent);margin-bottom:.6rem">' + d.target + '</div>' +
        '<p style="font-size:.92rem;margin:0 0 .7rem">' + d.why + '</p>' +
        '<h4 style="margin:0 0 .3rem;color:var(--ink-2)">How to do it</h4>' +
        '<ul class="ticks" style="margin:0">' + d.cues.map(function (c) { return '<li>' + c + '</li>'; }).join('') + '</ul>';
      $('#dp-note', el).textContent = ROUTINES[routine].mins + ' · ' + ROUTINES[routine].note;
      $('#dp-strip', el).innerHTML = ROUTINES[routine].list.map(function (k, i) {
        return '<button type="button" data-i="' + i + '" class="segs" style="all:unset;cursor:pointer;font-family:var(--display);font-size:.72rem;text-transform:uppercase;letter-spacing:.05em;padding:.24rem .5rem;border-radius:3px;border:1px solid ' +
          (i === idx ? 'var(--accent)' : 'var(--rule)') + ';background:' + (i === idx ? 'var(--accent)' : 'var(--surface-2)') +
          ';color:' + (i === idx ? 'var(--paper)' : 'var(--muted)') + '">' + (i + 1) + '. ' + DRILL[k].n.split(' ').slice(0, 2).join(' ') + '</button>';
      }).join('');
    }
    function go(i) {
      var L = ROUTINES[routine].list.length;
      idx = (i + L) % L; t = 0; info(); render();
    }
    function loop() { t = (t + 0.009) % 1; render(); raf = requestAnimationFrame(loop); }
    function setPlay(on) {
      playing = on;
      $('#dp-play', el).textContent = on ? 'Pause' : 'Play';
      if (on && !raf) loop(); else if (!on && raf) { cancelAnimationFrame(raf); raf = null; }
    }

    $('#dp-r', el).addEventListener('click', function (e) {
      var btn = e.target.closest('button'); if (!btn) return;
      $$('#dp-r button', el).forEach(function (x) { x.setAttribute('aria-pressed', String(x === btn)); });
      routine = btn.dataset.v; go(0);
    });
    $('#dp-strip', el).addEventListener('click', function (e) {
      var btn = e.target.closest('button'); if (!btn) return; go(+btn.dataset.i);
    });
    $('#dp-prev', el).addEventListener('click', function () { go(idx - 1); });
    $('#dp-next', el).addEventListener('click', function () { go(idx + 1); });
    $('#dp-play', el).addEventListener('click', function () { setPlay(!playing); });

    go(0); setPlay(true);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (e) {
        if (e[0].isIntersecting) { if (playing && !raf) loop(); }
        else if (raf) { cancelAnimationFrame(raf); raf = null; }
      }, { threshold: .1 }).observe(el);
    }
  }

  /* ============================================================
     B. MUSCLE MAP — stylised front/back plates with zones
     ============================================================ */
  var MU = {
    // front
    traps:   { n: 'Upper trapezius', side: 'f', act: 'Elevates and upwardly rotates the scapula; extends the neck', fib: 'Mixed, slow-dominant',
      ex: ['Shrug', 'Farmer carry', 'Overhead press', 'Snatch high pull'], note: 'Tense in desk workers but rarely weak. Train it loaded and long, not stretched and prodded.' },
    delt_a:  { n: 'Anterior deltoid', side: 'f', act: 'Shoulder flexion; assists horizontal adduction', fib: 'Mixed',
      ex: ['Overhead press', 'Bench press', 'Front raise'], note: 'Gets ample work from any pressing. Rarely needs isolation.' },
    pec:     { n: 'Pectoralis major', side: 'f', act: 'Horizontal adduction, shoulder flexion (clavicular), internal rotation', fib: '≈55% type II',
      ex: ['Bench press', 'Incline press', 'Dip', 'Cable fly'], note: 'The clavicular (upper) head needs incline pressing; the sternal head favours flat and decline. Long-length work (deep fly, stretched cable) adds growth the mid-range cannot.' },
    biceps:  { n: 'Biceps brachii', side: 'f', act: 'Elbow flexion; forearm supination; weak shoulder flexion', fib: '≈50% type II',
      ex: ['Chin-up', 'Incline curl', 'Preacher curl', 'Hammer curl'], note: 'Crosses the shoulder, so arm position matters: incline curls load it at long length, preacher curls at short. Train both.' },
    forearm_f: { n: 'Forearm flexors / grip', side: 'f', act: 'Wrist and finger flexion', fib: 'Slow-dominant, very fatigue-resistant',
      ex: ['Dead hang', 'Heavy carry', 'Deadlift hold', 'Wrist curl'], note: 'Grip is the commonest limiter in pulling. Grip strength is also one of the better simple predictors of all-cause mortality.' },
    abs:     { n: 'Rectus abdominis', side: 'f', act: 'Flexes the trunk; resists extension; raises intra-abdominal pressure', fib: 'Mixed',
      ex: ['Hanging leg raise', 'Cable crunch', 'Dead bug', 'Ab wheel'], note: 'Responds to load and range like any muscle — weighted, controlled flexion beats endless unloaded crunches.' },
    obliques:{ n: 'Obliques', side: 'f', act: 'Trunk rotation and lateral flexion; resists both', fib: 'Mixed',
      ex: ['Side plank', 'Suitcase carry', 'Pallof press', 'Landmine rotation'], note: 'Most of their job in sport is anti-rotation. Carries and Pallof presses transfer better than twisting under load.' },
    hipflex: { n: 'Iliopsoas & hip flexors', side: 'f', act: 'Hip flexion; stabilises the lumbar spine', fib: 'Mixed',
      ex: ['Hanging knee raise', 'Standing band march', 'Reverse Nordic', 'A-skip'], href: 'ch41',
      note: 'Critical in sprinting — swing-leg recovery is hip-flexor driven. Short and strong beats loose and weak.' },
    quad:    { n: 'Quadriceps', side: 'f', act: 'Knee extension; rectus femoris also flexes the hip', fib: '≈50/50; vastus lateralis more type II',
      ex: ['Squat', 'Split squat', 'Leg extension', 'Sissy squat'], href: 'ch22',
      note: 'The rectus femoris crosses both joints, so it only reaches long length when the hip is extended — which is why leg extensions and reverse Nordics grow it where squats do not. Deep knee flexion grows the vastii most.' },
    adductor:{ n: 'Adductors', side: 'f', act: 'Hip adduction; adductor magnus is a powerful hip extensor', fib: 'Mixed',
      ex: ['Deep squat', 'Copenhagen plank', 'Lateral lunge', 'Sumo deadlift'], href: 'ch22',
      note: 'Adductor magnus contributes as much hip extension torque as the glute in a deep squat, and is a top-three groin-injury site in field sport. Copenhagen planks are the best-evidenced prevention.' },
    tibant:  { n: 'Tibialis anterior', side: 'f', act: 'Dorsiflexes the ankle; controls foot lowering', fib: 'Slow-dominant',
      ex: ['Tibialis raise', 'Heel walk', 'Banded dorsiflexion'], href: 'ch42',
      note: 'Decelerates the foot at every footstrike. Weakness is implicated in shin pain, and it is almost never trained directly.' },
    // back
    traps_m: { n: 'Mid & lower trapezius', side: 'b', act: 'Retracts, depresses and upwardly rotates the scapula', fib: 'Slow-dominant',
      ex: ['Prone Y raise', 'Chest-supported row', 'Face pull'], note: 'The lower trapezius is the usual weak link in overhead positions. It needs low load and long holds, not heavy rowing.' },
    delt_p:  { n: 'Posterior deltoid', side: 'b', act: 'Shoulder extension and horizontal abduction; external rotation', fib: 'Mixed',
      ex: ['Face pull', 'Reverse fly', 'Wide row'], note: 'Chronically under-trained relative to the front delt in pressing-heavy programmes.' },
    lat:     { n: 'Latissimus dorsi', side: 'b', act: 'Shoulder extension and adduction; internal rotation; assists trunk stability', fib: 'Mixed',
      ex: ['Pull-up', 'Lat pulldown', 'Single-arm row', 'Straight-arm pulldown'], href: 'ch24',
      note: 'Largest muscle of the upper body by area. Reaches long length overhead, so full-stretch pulldowns and pull-ups from a dead hang matter.' },
    erector: { n: 'Erector spinae', side: 'b', act: 'Extends the spine; resists flexion under load', fib: 'Strongly slow-dominant, very fatigue-resistant',
      ex: ['Deadlift', 'Back extension', 'Good morning', 'Bird dog'], href: 'ch25',
      note: 'Extremely fatigue-resistant by design — it holds posture all day. Responds to loaded isometric and slow eccentric work; it is also the main reason heavy deadlifts take so long to recover from.' },
    triceps: { n: 'Triceps brachii', side: 'b', act: 'Elbow extension; long head also extends the shoulder', fib: '≈60–65% type II',
      ex: ['Overhead extension', 'Dip', 'Close-grip press', 'Skullcrusher'], href: 'ch23',
      note: 'The long head only reaches long length with the arm overhead — overhead extensions produce notably more growth than pressdowns. Two-thirds of upper-arm mass is triceps.' },
    forearm_e: { n: 'Forearm extensors', side: 'b', act: 'Wrist and finger extension', fib: 'Slow-dominant',
      ex: ['Reverse curl', 'Wrist extension', 'Band finger extension'], note: 'Trained to balance heavy gripping; relevant in lateral elbow pain.' },
    glute:   { n: 'Gluteus maximus', side: 'b', act: 'Hip extension; external rotation; posterior pelvic tilt', fib: '≈50/50',
      ex: ['Hip thrust', 'Step-up', 'Squat', 'Romanian deadlift', 'Sprinting'], href: 'ch22',
      note: 'Largest muscle in the body. Hex-bar deadlift and barbell hip thrust top the EMG rankings (≈88% and 82% MVIC); hip thrust and squat produce similar measured growth. Peak demand in running is at footstrike and in acceleration.' },
    glute_m: { n: 'Gluteus medius & minimus', side: 'b', act: 'Hip abduction; controls pelvic drop in single-leg stance', fib: 'Slow-dominant',
      ex: ['Side-lying abduction', 'Banded walk', 'Single-leg squat', 'Copenhagen plank'], href: 'ch42',
      note: 'Weakness here shows up as hip drop and knee collapse, and is associated with patellofemoral pain and iliotibial band syndrome.' },
    ham:     { n: 'Hamstrings', side: 'b', act: 'Hip extension and knee flexion; decelerate the swinging shin', fib: '≈50–55% type II; biceps femoris more type II',
      ex: ['Nordic curl', 'Romanian deadlift', 'Leg curl', 'Good morning'], href: 'ch22',
      note: 'Injured most often in late swing phase at long length under eccentric load. Nordic curls reduce hamstring injury incidence substantially — one of the strongest prevention findings in sports medicine. Train both functions: hip extension (RDL) and knee flexion (curl).' },
    gastro:  { n: 'Gastrocnemius', side: 'b', act: 'Plantarflexes the ankle; flexes the knee; stores elastic energy', fib: 'Mixed, more type II than soleus',
      ex: ['Straight-knee calf raise', 'Pogo hop', 'Jump rope', 'Sprinting'], href: 'ch41',
      note: 'Crosses the knee, so it must be trained with the knee straight. Works with the Achilles as the main spring in running — the tendon returns a large share of each stride’s energy for free.' },
    soleus:  { n: 'Soleus', side: 'b', act: 'Plantarflexes the ankle; the main postural and running work-horse', fib: 'Up to 80–90% type I',
      ex: ['Bent-knee calf raise', 'Seated calf raise', 'Uphill walking'], href: 'ch41',
      note: 'Takes six to eight times body weight per stride in running — more than the gastrocnemius. Needs the knee bent to be loaded, and needs high volume because it is so fatigue-resistant. Under-trained soleus is a common thread in calf and Achilles trouble.' }
  };

  var ZONE = {
    f: {
      traps: '152,100 188,105 198,114 160,114',
      delt_a: '197,113 217,121 225,147 214,167 198,151 192,127',
      pec: '152,113 192,119 205,141 196,165 168,171 152,169',
      biceps: '215,169 227,173 231,211 222,233 212,229 208,191',
      forearm_f: '222,237 233,241 237,297 228,331 218,327 216,277',
      abs: '152,175 177,177 181,231 177,277 152,281',
      obliques: '181,179 197,187 201,233 191,273 179,277 183,231',
      hipflex: '152,285 185,283 197,301 193,323 160,319',
      quad: '155,323 193,325 199,381 195,451 187,499 163,501 157,431',
      adductor: '150,323 167,327 171,401 163,471 150,475',
      tibant: '165,525 185,523 189,571 183,629 171,631 167,577'
    },
    b: {
      traps_m: '152,99 189,107 201,121 191,161 171,201 152,207',
      delt_p: '201,119 219,125 227,151 217,169 201,153',
      lat: '152,209 189,187 207,207 201,249 177,277 152,281',
      erector: '150,151 163,153 167,231 163,289 150,291',
      triceps: '217,171 229,177 233,215 225,235 215,231 213,195',
      forearm_e: '225,239 235,245 239,299 231,331 221,327 219,279',
      glute: '150,287 185,291 201,313 199,351 177,365 152,361',
      glute_m: '187,287 201,297 207,323 197,331 189,311',
      ham: '155,365 195,367 199,421 193,485 165,489 157,421',
      gastro: '159,521 191,519 195,561 187,601 167,603 161,563',
      soleus: '163,605 189,603 191,635 183,651 169,651 165,631'
    }
  };

  function mirror(pts) {
    return pts.split(' ').map(function (p) {
      var xy = p.split(',');
      return (300 - +xy[0]) + ',' + xy[1];
    }).join(' ');
  }

  function silhouette() {
    return '' +
      '<circle class="body-base" cx="150" cy="50" r="30"/>' +
      '<path class="body-base" d="M138 76 h24 v22 h-24 z"/>' +
      '<path class="body-base" d="M150 96 C 196 98 212 108 224 122 L 236 300 L 226 340 L 214 338 L 220 250 L 206 168 L 200 262 C 200 292 204 300 204 316 L 198 470 L 190 520 L 196 630 L 190 694 L 168 694 L 164 632 L 158 560 L 150 520 Z"/>' +
      '<path class="body-base" d="M150 96 C 104 98 88 108 76 122 L 64 300 L 74 340 L 86 338 L 80 250 L 94 168 L 100 262 C 100 292 96 300 96 316 L 102 470 L 110 520 L 104 630 L 110 694 L 132 694 L 136 632 L 142 560 L 150 520 Z"/>' +
      '<path class="body-base" d="M158 690 h30 q6 0 6 6 v8 h-40 v-8 q0 -6 4 -6z"/>' +
      '<path class="body-base" d="M142 690 h-30 q-6 0 -6 6 v8 h40 v-8 q0 -6 -4 -6z"/>';
  }

  function plate(view, state) {
    var zs = ZONE[view], s = silhouette(), k;
    for (k in zs) {
      var m = MU[k];
      var st = state[k] || 0;   // 0 off, 1 prime, 2 synergist, 3 stabiliser
      var fill = st === 1 ? D(2) : st === 2 ? D(3) : st === 3 ? D(1) : 'var(--rule)';
      var op = st ? .92 : .5;
      ['', 'm'].forEach(function (sfx) {
        var pts = sfx ? mirror(zs[k]) : zs[k];
        s += '<polygon class="mz' + (st ? '' : ' off') + '" data-mu="' + k + '" points="' + pts +
          '" style="fill:' + fill + ';opacity:' + op + '"><title>' + m.n + '</title></polygon>';
      });
    }
    return '<svg viewBox="0 10 300 724" style="width:100%;height:auto;max-height:70vh" role="img" aria-label="' +
      (view === 'f' ? 'Front' : 'Back') + ' muscle map">' + s +
      '<text x="150" y="716" text-anchor="middle" class="svg-tick">' + (view === 'f' ? 'ANTERIOR' : 'POSTERIOR') + '</text></svg>';
  }

  /* ---------- widget: body map (click a muscle) ---------- */
  function bodyMap(el) {
    var U = window.SOT_util;
    var b = U ? U.body(el) : el;
    b.innerHTML =
      '<div class="ctls"><div class="ctl"><label>View</label><div class="segs" id="bm-v">' +
      '<button type="button" data-v="f" aria-pressed="true">Front</button>' +
      '<button type="button" data-v="b" aria-pressed="false">Back</button></div></div></div>' +
      '<div style="display:grid;gap:1.1rem" id="bm-grid">' +
      '<div id="bm-plate"></div><div id="bm-info"></div></div>';
    var mq = window.matchMedia('(min-width:720px)');
    function layout() { $('#bm-grid', el).style.gridTemplateColumns = mq.matches ? '.75fr 1fr' : 'minmax(0,1fr)'; }
    layout(); if (mq.addEventListener) mq.addEventListener('change', layout);

    var view = 'f', sel = 'quad';
    function paint() {
      var st = {}; st[sel] = 1;
      $('#bm-plate', el).innerHTML = plate(view, st);
      $$('#bm-plate polygon', el).forEach(function (pg) {
        pg.addEventListener('click', function () { sel = pg.dataset.mu; view = MU[sel].side; syncView(); paint(); });
      });
      var m = MU[sel];
      $('#bm-info', el).innerHTML =
        '<h3 style="margin:0 0 .4rem">' + m.n + '</h3>' +
        '<dl class="defs" style="margin:0 0 .8rem">' +
        '<dt style="font-size:.78rem;text-transform:uppercase;letter-spacing:.1em;color:var(--muted)">What it does</dt><dd>' + m.act + '</dd>' +
        '<dt style="font-size:.78rem;text-transform:uppercase;letter-spacing:.1em;color:var(--muted)">Fibre make-up</dt><dd>' + m.fib + '</dd></dl>' +
        '<h4 style="margin:0 0 .35rem;color:var(--accent)">Best exercises</h4>' +
        '<div style="display:flex;flex-wrap:wrap;gap:.3rem;margin-bottom:.8rem">' +
        m.ex.map(function (e) { return '<span class="tag tag--accent">' + e + '</span>'; }).join('') + '</div>' +
        '<p style="font-size:.92rem;margin:0">' + m.note + '</p>';
    }
    function syncView() { $$('#bm-v button', el).forEach(function (x) { x.setAttribute('aria-pressed', String(x.dataset.v === view)); }); }
    $('#bm-v', el).addEventListener('click', function (e) {
      var btn = e.target.closest('button'); if (!btn) return;
      view = btn.dataset.v; syncView();
      var ks = Object.keys(ZONE[view]); if (ks.indexOf(sel) < 0) sel = ks[0];
      paint();
    });
    paint();
  }

  /* ---------- widget: activation atlas ---------- */
  var ACT = {
    run_easy: { l: 'Easy running', d: 'Steady aerobic running on the flat. Note how little of the body is a prime mover — and how much is working to hold you up.',
      m: { soleus: 1, gastro: 1, glute: 2, quad: 2, ham: 2, hipflex: 2, tibant: 3, erector: 3, abs: 3, obliques: 3, glute_m: 3, delt_p: 3, traps_m: 3, adductor: 3 } },
    run_sprint: { l: 'Sprinting', d: 'Maximal velocity running. The hamstrings and glutes dominate; demand on the hip flexors in swing recovery is enormous.',
      m: { ham: 1, glute: 1, soleus: 1, gastro: 1, hipflex: 1, quad: 2, adductor: 2, erector: 2, abs: 2, obliques: 2, glute_m: 2, delt_a: 3, delt_p: 3, traps: 3, tibant: 3 } },
    run_hill: { l: 'Uphill running', d: 'Gradient shifts the work to hip and knee extension and reduces impact loading — which is why hills build strength with less injury risk than speed on the flat.',
      m: { glute: 1, quad: 1, soleus: 1, gastro: 2, ham: 2, hipflex: 2, erector: 2, abs: 3, obliques: 3, glute_m: 3, tibant: 3 } },
    cycle: { l: 'Cycling', d: 'Fixed path, concentric-dominant, no impact. The quadriceps lead; the calves transfer force; the hamstrings and glutes contribute mostly on the upstroke and when seated low.',
      m: { quad: 1, glute: 2, soleus: 2, gastro: 2, ham: 2, erector: 3, abs: 3, traps_m: 3, forearm_f: 3, adductor: 3 } },
    swim: { l: 'Swimming (front crawl)', d: 'An upper-body-led sport. The lats and pecs pull; the legs mostly stabilise and streamline.',
      m: { lat: 1, pec: 1, triceps: 1, delt_p: 2, delt_a: 2, traps_m: 2, abs: 2, obliques: 2, erector: 2, glute: 3, quad: 3, gastro: 3, forearm_f: 3 } },
    row: { l: 'Rowing', d: 'The most complete single-machine pattern there is: a leg drive, a hip hinge and a horizontal pull in one stroke.',
      m: { quad: 1, glute: 1, lat: 1, erector: 1, ham: 2, traps_m: 2, biceps: 2, delt_p: 2, abs: 2, soleus: 2, forearm_f: 2, obliques: 3, triceps: 3 } },
    squat: { l: 'Back squat', d: 'Knee and hip extension under axial load, with the trunk resisting flexion throughout.',
      m: { quad: 1, glute: 1, adductor: 2, erector: 1, ham: 2, abs: 2, obliques: 3, soleus: 3, traps: 3, traps_m: 3, gastro: 3 } },
    deadlift: { l: 'Deadlift', d: 'A hip-dominant pull. The posterior chain produces the force; the whole trunk and grip are the limiters.',
      m: { glute: 1, ham: 1, erector: 1, quad: 2, adductor: 2, traps: 2, lat: 2, forearm_f: 2, abs: 2, obliques: 3, soleus: 3 } },
    bench: { l: 'Bench press', d: 'Horizontal pressing: pec, front delt and triceps in series, with the back and legs as a platform.',
      m: { pec: 1, triceps: 1, delt_a: 1, biceps: 3, traps_m: 3, abs: 3, erector: 3, lat: 3 } },
    pullup: { l: 'Pull-up', d: 'Vertical pulling. Lats and biceps drive it; the trunk prevents the swing.',
      m: { lat: 1, biceps: 1, traps_m: 2, delt_p: 2, forearm_f: 2, abs: 2, triceps: 3, obliques: 3, pec: 3 } },
    hiit: { l: 'HIIT circuit (burpee / jump)', d: 'Whole-body, repeated triple extension with a large cardiorespiratory and glycolytic demand.',
      m: { quad: 1, glute: 1, gastro: 1, soleus: 1, pec: 2, triceps: 2, abs: 2, delt_a: 2, erector: 2, ham: 2, obliques: 3, lat: 3, hipflex: 2 } },
    walk: { l: 'Walking', d: 'The baseline human movement — low force, very high repetition, almost no recovery cost.',
      m: { soleus: 1, gastro: 2, quad: 2, glute: 2, ham: 3, tibant: 2, erector: 3, glute_m: 3, abs: 3, hipflex: 3 } }
  };
  function activationAtlas(el) {
    var U = window.SOT_util;
    var b = U ? U.body(el) : el;
    var keys = Object.keys(ACT);
    b.innerHTML =
      '<div class="ctls"><div class="ctl"><label>Activity</label><div class="segs" id="aa-a">' +
      keys.map(function (k, i) { return '<button type="button" data-v="' + k + '" aria-pressed="' + (i === 0) + '">' + ACT[k].l + '</button>'; }).join('') +
      '</div></div></div>' +
      '<div id="aa-d" style="font-size:.93rem;margin:-.2rem 0 .9rem;color:var(--ink-2)"></div>' +
      '<div style="display:grid;gap:1rem;grid-template-columns:1fr 1fr" id="aa-plates"><div id="aa-f"></div><div id="aa-b"></div></div>' +
      '<div class="legend" style="margin-top:.8rem"><span><i style="background:' + D(2) + '"></i>Prime mover</span>' +
      '<span><i style="background:' + D(3) + '"></i>Synergist</span><span><i style="background:' + D(1) + '"></i>Stabiliser</span>' +
      '<span><i style="background:var(--rule)"></i>Little involvement</span></div>' +
      '<div id="aa-tbl" style="margin-top:1rem"></div>';
    function draw(k) {
      var a = ACT[k || 'run_easy'];
      $('#aa-d', el).textContent = a.d;
      $('#aa-f', el).innerHTML = plate('f', a.m);
      $('#aa-b', el).innerHTML = plate('b', a.m);
      var roles = [[1, 'Prime movers'], [2, 'Synergists'], [3, 'Stabilisers']];
      $('#aa-tbl', el).innerHTML = '<div class="tablewrap"><table class="dt dt--compact"><tbody>' +
        roles.map(function (r) {
          var list = Object.keys(a.m).filter(function (m) { return a.m[m] === r[0] && MU[m]; });
          if (!list.length) return '';
          return '<tr><td style="white-space:nowrap"><strong>' + r[1] + '</strong></td><td>' +
            list.map(function (m) { return MU[m].n; }).join(' · ') + '</td></tr>';
        }).join('') + '</tbody></table></div>';
    }
    $('#aa-a', el).addEventListener('click', function (e) {
      var btn = e.target.closest('button'); if (!btn) return;
      $$('#aa-a button', el).forEach(function (x) { x.setAttribute('aria-pressed', String(x === btn)); });
      draw(btn.dataset.v);
    });
    draw('run_easy');
  }

  /* ---------- register ---------- */
  function register() {
    var W = window.SOT_WIDGETS;
    if (!W) { setTimeout(register, 30); return; }
    W['drill-player'] = drillPlayer;
    W['body-map'] = bodyMap;
    W['activation-atlas'] = activationAtlas;
    if (window.SOT_mountWidgets) window.SOT_mountWidgets();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', register);
  else register();

  window.SOT_FIG = { DRILL: DRILL, ROUTINES: ROUTINES, MU: MU, ZONE: ZONE, plate: plate, drawFigure: drawFigure, pose: pose };
})();
