# Authoring guide — The Science of Training

Each chapter is **one HTML fragment** at `content/<id>.html`. No `<html>`, `<head>`, `<body>`,
no `<h1>`, no stylesheet or script tags. The build (`node build.mjs`) wraps it, auto-numbers
sections, builds the mini-contents, and adds prev/next.

## Voice

Written for an intelligent reader with no physiology background. The rule is **Jack Daniels'
rule**: every mechanism gets an everyday analogy and a worked number before it gets jargon.

- Short sentences. Concrete nouns. Active voice.
- Define every technical term **the first time**, inline, in plain words.
- Never assert a number without saying where it comes from and how confident we are.
- Say "we don't know" when the literature disagrees. Name the disagreement.
- Use British spelling (fibre, glycogen, haemoglobin, litre, metre, specialise).
- No hype, no "unlock your potential", no exclamation marks, no second-person commands
  outside the prescription panels.

## Required skeleton

```html
<p class="lede dropcap">One paragraph, 60–110 words. The hook. Gets lifted into the chapter
opener automatically, so it must read as a standalone opening. Start with a concrete image or a
surprising fact, not a definition.</p>

<section class="sec" id="kebab-id">
<h2>Section Title In Title Case</h2>
...
</section>
```

Every chapter must contain, in roughly this order:

1. `.lede` paragraph (first element, always).
2. **4–8 `<section class="sec">`** with unique kebab-case `id`s.
3. At least one **`panel--plain`** ("In plain terms") — the everyday analogy. **Mandatory.**
4. At least one **`panel--work`** ("Worked example") — real numbers for a named person. **Mandatory.**
5. At least one **`panel--activate`** ("Activate it") — the exact prescription. **Mandatory.**
6. At least one **`panel--paper`** ("The paper") — a landmark study. **Mandatory.**
7. At least one figure: `figure.fig` with inline SVG, or a `data-widget` block.
8. At least one `table.dt` inside `.tablewrap`.
9. A closing `.takeaways` block — exactly 5 numbered items, each one sentence.

## Component vocabulary

Copy these patterns exactly. The build injects panel icons and titles from `data-title`.

### Panels

```html
<div class="panel panel--plain" data-title="In plain terms">
  <p>The analogy. Concrete, domestic, no jargon at all.</p>
</div>

<div class="panel panel--key" data-title="Key idea">
  <p>One idea, stated once, without hedging.</p>
</div>

<div class="panel panel--activate" data-title="Activate it">
  <p>One sentence naming the adaptation being targeted.</p>
  <ul class="rx">
    <li><span class="k">Do</span> Barbell back squat, below parallel.</li>
    <li><span class="k">Load</span> 75–85% of 1RM.</li>
    <li><span class="k">Dose</span> 4 sets × 5 reps, 2–3 min rest.</li>
    <li><span class="k">When</span> Twice weekly, 48 h apart.</li>
    <li><span class="k">Progress</span> Add 2.5 kg when all sets hit the top rep at RIR 2.</li>
    <li><span class="k">On the bike</span> The indoor-cycling session that drives the SAME adaptation,
      e.g. "3 x 12 min at 88-93% FTP, 4 min easy" — include this line whenever an indoor trainer
      could deliver the stimulus (all aerobic, threshold, VO2max, fat-oxidation and
      low-impact-rehab mechanisms). Omit it only where it genuinely cannot apply.</li>
  <li><span class="k">Signal</span> You're doing it right when bar speed on rep 1 is unchanged week to week.</li>
  </ul>
</div>

<div class="panel panel--work" data-title="Worked example">
  <div class="who"><strong>Maya</strong>, 34, 62 kg, runs 40 km a week, 10 km PB 52:00.</div>
  <ol class="worked">
    <li>Step in words.<span class="calc">52:00 for 10 km → 5:12 per km</span></li>
    <li>Next step.<span class="calc">5:12 × 1.15 = 5:59 per km easy pace</span></li>
  </ol>
  <div class="answer"><strong>So:</strong> the conclusion in one sentence with the number in it.</div>
</div>

<div class="panel panel--paper" data-title="The paper">
  <div class="paper-cite"><strong>Helgerud J, et al.</strong> Aerobic high-intensity intervals
    improve VO2max more than moderate training. <span class="j">Med Sci Sports Exerc</span>
    2007;39(4):665–71.</div>
  <div class="paper-grid">
    <div><h6>Who</h6><p>40 moderately trained men.</p></div>
    <div><h6>What</h6><p>Four protocols, 3×/week for 8 weeks, workload matched.</p></div>
    <div><h6>Found</h6><p>4×4 min at 90–95% HRmax raised VO2max ~7%; continuous moderate work barely moved it.</p></div>
  </div>
  <p class="paper-verdict"><strong>Why it matters:</strong> one sentence. Then one sentence of
    honest limitation — sample, population, or what it does not show.</p>
</div>

<div class="panel panel--myth" data-title="Myth vs fact">
  <div class="myth-row">
    <div class="m"><h5>The claim</h5><p>…</p></div>
    <div class="f"><h5>What the evidence says</h5><p>…</p></div>
  </div>
</div>

<div class="panel panel--caution" data-title="Where this goes wrong">…</div>
<div class="panel panel--deep" data-title="Deeper">…</div>
```

### Evidence grades

Inline after a claim: `<span class="grade grade--a">A</span>` (A replicated / B moderate /
C emerging / D no good evidence). Add a source line where useful:

```html
<div class="evidence-line"><span class="grade grade--a">A</span> Multiple meta-analyses,
consistent direction, large samples.</div>
```

### Stat tiles

```html
<div class="stats">
  <div class="stat"><div class="v">6–8<small>× body weight</small></div>
    <div class="k">Peak Achilles tendon force in running</div></div>
</div>
```

### Tables

```html
<div class="tablewrap"><table class="dt">
<caption>What the caption says the table shows</caption>
<thead><tr><th>Thing</th><th class="n">Number</th><th>Meaning</th></tr></thead>
<tbody>
<tr><td><strong>Row</strong><span class="sub">clarifier</span></td><td class="n">42</td><td>…</td></tr>
</tbody></table></div>
```
Use `class="n"` on every numeric `<th>`/`<td>`.

### Mechanism steps

```html
<ol class="steps steps--line">
  <li><h5>Short step title</h5><p>What happens, in one or two sentences.</p></li>
</ol>
```

### Lists

`<ul class="ticks">` with `<li>`, `<li class="no">` (cross), `<li class="dash">` (neutral).

### Figures — inline SVG

Draw with CSS variables so both themes work. Never hard-code hex colours.
Available: `var(--d1)`…`var(--d8)` (series), `var(--ink)`, `var(--ink-2)`, `var(--muted)`,
`var(--rule)`, `var(--rule-2)`, `var(--surface)`, `var(--accent)`.
Helper classes: `.svg-axis .svg-grid .svg-tick .svg-lbl .svg-lbl--b .svg-title .body-base`.

```html
<figure class="fig">
  <div class="fig__frame">
    <svg viewBox="0 0 640 300" role="img" aria-label="Plain-language description">
      <text class="svg-title" x="8" y="16">TITLE IN CAPS</text>
      …
    </svg>
  </div>
  <figcaption><b>Fig 7.2</b> What the reader should take from it — a claim, not a label.</figcaption>
</figure>
```
Number figures `<b>Fig CH.N</b>` with the chapter number.

### Interactive widgets — drop in by name

```html
<div class="widget" data-widget="NAME">
  <div class="widget__head"><h4>Short title</h4><span class="tag">Interactive</span></div>
  <div class="widget__note">One sentence on what to try, and what the figure is modelled on.</div>
</div>
```
Leave the body empty — JS fills it. Available names:

| widget | what it does | best chapters |
|---|---|---|
| `sarcomere` | animated sliding-filament, length & activation sliders | 4 |
| `energy-systems` | % ATP by duration, stacked | 7 |
| `size-principle` | motor-unit recruitment, explosive-intent toggle | 5, 16 |
| `lactate-curve` | LT1/LT2 and how training shifts them | 7, 14, 35 |
| `fick` | VO2max = HR × SV × a-vO2 calculator | 9 |
| `zones` | 5-zone HR calculator, 3 anchoring models | 14, 35 |
| `hiit-lab` | 9 interval protocols compared on time ≥90% VO2max | 15 |
| `volume-curve` | hypertrophy dose–response, sets × RIR × frequency | 17 |
| `concurrent` | AMPK vs mTOR timeline, order & gap | 20 |
| `force-velocity` | F–V and power curves, athlete profiles | 18 |
| `crossover` | fat vs carbohydrate oxidation by intensity | 8, 28, 30 |
| `protein-dose` | MPS vs per-meal dose, leucine threshold | 29 |
| `fuel-calc` | carbohydrate g/h, fluid, sodium prescription | 28, 32, 34 |
| `sweat-calc` | sweat-rate from body-mass change | 32 |
| `supp-matrix` | 16 supplements, evidence-graded, filterable | 33 |
| `periodize` | block timelines for 4 goals | 21 |
| `turbo-lab` | 18 indoor-cycling workouts: power profile, zones, adaptation, 5 plans | 14, 15, 44 |
| `drill-player` | **animated figure** performing 6 routines of drills | 40, 41, 42, 43 |
| `body-map` | clickable front/back muscle map with detail panel | 3, 22–25 |
| `activation-atlas` | 12 activities → prime/synergist/stabiliser highlighting | 26 |

### Cross-links

Link by relative filename, e.g.
`<a href="ch07-the-energy-systems.html">the energy systems</a>`.
Filenames are `<id>-<title-kebab>.html` (`&`→`and`). When unsure, link to the chapter you mean
by its exact title text and the integrator will fix the href.

## Length

2,000–3,200 words of body text per chapter. The case-study chapter (ch43) runs longer.
Density over padding: delete any sentence that only restates the previous one.

## Hard rules

- No invented statistics. If you are not sure of a number, give a range and grade it C.
- No `style="color:#..."` — tokens only.
- No external images, no `<img>`, no CDN scripts. SVG only.
- Every `<table>` wrapped in `.tablewrap`. Every `<svg>` has `role="img"` + `aria-label`.
- Don't repeat another chapter's core content — link to it instead.
