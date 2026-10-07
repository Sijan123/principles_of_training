# The Science of Training

A 47-chapter visual guide to training physiology — anatomy, physiology, adaptation and fuel.
Static HTML, no framework, no build dependencies, no tracking.

*Prepared by Sijan Pahari.*

## Read it

Open `index.html`, or serve the folder:

```bash
python -m http.server 8000     # then http://localhost:8000
```

## How it's built

Chapters are **generated**. Never edit anything in `chapters/` — it is overwritten.

```
content/chNN.html     ← author here (HTML fragment: no <html>, <head>, <body>, <h1>)
book.config.mjs       ← chapter list, parts, titles, search keywords
build.mjs             ← wraps fragments in the page shell
chapters/             ← OUTPUT (generated)
index.html            ← OUTPUT (generated)
assets/search-index.json ← OUTPUT (generated)
```

After editing any fragment:

```bash
node build.mjs
```

The build auto-numbers sections, builds each chapter's mini-contents, wires prev/next
links, regenerates the contents page, and rebuilds the client-side search index.
`content/AUTHORING.md` is the full style and component spec.

## Assets

| File | What it does |
|---|---|
| `assets/styles.css` | Design system — light/dark, print styles, all components |
| `assets/book.js` | Theme toggle, nav, reading progress, search, scrollspy |
| `assets/widgets.js` | 16 interactive figures — charts and calculators |
| `assets/figures.js` | Animated human figure (26 drills), muscle map, activation atlas |
| `assets/cycling.js` | Indoor-cycling workout library (18 sessions, 6 plans) |

Widgets mount on `<div class="widget" data-widget="NAME">` with an empty body.
Colours come from CSS custom properties only, so every figure works in both themes.

## Hosting on GitHub Pages

The site is fully static with relative paths throughout, so it works on a project page
(`https://<user>.github.io/<repo>/`) with no configuration.

**Option A — commit the generated files (simplest):**

```bash
git init && git add -A && git commit -m "The Science of Training"
git branch -M main
git remote add origin https://github.com/<user>/<repo>.git
git push -u origin main
```

Then: **Settings → Pages → Source: Deploy from a branch → `main` / `/ (root)`**.

**Option B — build on push.** Keep `chapters/` and `index.html` out of the repo and let
CI generate them. `.github/workflows/pages.yml` does this; set
**Settings → Pages → Source: GitHub Actions**, and add `chapters/`, `index.html` and
`assets/search-index.json` to `.gitignore`.

`.nojekyll` is included so GitHub serves the files as-is rather than running Jekyll.

## Licence and accuracy

Educational reference, not medical advice. Claims carry evidence grades —
**A** replicated · **B** moderate · **C** emerging · **D** no good evidence — explained in
*How to Read the Evidence*. Sources are listed in *References & Further Reading*;
verify any citation before relying on it.
