# Paper Website Visuals & Animations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add three interactive/animated visualizations and UX polish to the paper project page so that the geometric thesis (linear paths waste supervision on radial motion; slerp on a sphere does not) is felt, not just read.

**Architecture:** Pure static site, no build step. Three independent self-contained JavaScript modules attached to specific DOM containers in `index.html`. Three.js (via CDN, ESM) for the 3D hero. Vanilla Canvas2D for the two 2D demos. All animations use `requestAnimationFrame` with a single shared time scrubber per visualization. Each viz is gated by `IntersectionObserver` so it only animates when on-screen. Math (slerp, Gaussian sampling, projection) is duplicated where small and trivial; no shared utils module to avoid a build step.

**Tech Stack:** Vanilla HTML/CSS/JS, Three.js (r160 via esm.sh CDN), CSS custom properties for theming, MathJax (already present), Prism (already present). No bundler, no test framework — the site is plain files served as static HTML on GitHub Pages.

**Verification approach:** This is a visual static site with no existing test framework. Adding one is YAGNI. Verification is browser-based: serve the directory with `python3 -m http.server`, open `http://localhost:8000`, visually inspect each viz, check the JS console for errors, and resize to test responsiveness. Each task lists explicit visual acceptance criteria.

---

## File Structure

**Created:**
- `assets/js/hero-sphere.js` — Three.js scene: sphere shell + linear chord + slerp arc + animated point on each. Drives the side-panel plots via a shared `t ∈ [0,1]` time scrubber.
- `assets/js/hero-plots.js` — Canvas2D plots for the hero side panel: (a) ‖z_t‖ vs t with shell radius reference line, both paths overlaid; (b) instantaneous radial-energy share vs t, both paths overlaid. Exposes a single `update(t)` function called by the sphere module.
- `assets/js/concentration-demo.js` — Canvas2D demo with a slider for dimension d ∈ {2,4,8,16,32,64,128,256}. Generates 800 Gaussian samples, plots a 2D projection (left) and a histogram of ‖z‖ with a √d reference marker (right).
- `assets/js/velocity-decomp.js` — Canvas2D 2D visualization (two concentric shell points on a circle). Animates a token along the linear chord; renders the velocity vector decomposed into radial (red) and tangential (blue) at each frame; shows a running bar for the radial energy share.

**Modified:**
- `index.html` — Add new sections for each viz, sticky nav, dark-mode toggle button, working anchor IDs. Embed scripts as `<script type="module" src="...">` at the bottom of body.
- `styles.css` — Add styles for the new sections (canvas containers, nav, dark mode via `prefers-color-scheme` + manual toggle class), responsive grid for the hero split layout.

**Not changed:**
- Existing static figures and content remain in place. The animated hero is *added above* the existing Figure 1, not a replacement — readers who scroll past the animation still see the static figures.

---

## Task 1: Scaffold the hero section markup and styles

**Files:**
- Modify: `index.html` (the `#tldr` section header area and a new `#hero-anim` block inserted just before the existing `.figure-triple`)
- Modify: `styles.css` (append new rules for `.hero-anim-grid`, `.hero-anim-canvas`, `.hero-anim-plots`)

- [ ] **Step 1.1: Add the hero animation container to `index.html`**

Insert a new block just after line 75 (before `<div class="figure-triple" ...>`), inside the `#tldr` section:

```html
<div class="hero-anim-grid" id="hero-anim" aria-label="Animated comparison of linear and spherical-slerp paths">
  <div class="hero-anim-canvas" id="hero-anim-sphere">
    <div class="hero-anim-loading">Loading 3D scene…</div>
  </div>
  <div class="hero-anim-plots">
    <figure class="hero-anim-plot">
      <canvas id="hero-plot-norm" width="520" height="180"></canvas>
      <figcaption>‖z<sub>t</sub>‖ along the path. Linear (red) dips below the shell radius √d; slerp (blue) stays on it.</figcaption>
    </figure>
    <figure class="hero-anim-plot">
      <canvas id="hero-plot-radial" width="520" height="180"></canvas>
      <figcaption>Instantaneous radial share of the velocity target. Linear spends ~50%+ of its budget on radial motion; slerp is identically zero.</figcaption>
    </figure>
    <div class="hero-anim-controls">
      <button id="hero-anim-toggle" class="hero-anim-btn" aria-pressed="true">⏸ Pause</button>
      <label class="hero-anim-scrubber">
        <span>t</span>
        <input id="hero-anim-t" type="range" min="0" max="1000" step="1" value="0" />
        <span id="hero-anim-t-val">0.00</span>
      </label>
    </div>
  </div>
</div>
```

- [ ] **Step 1.2: Append hero animation styles to `styles.css`**

Append to the end of the file:

```css
/* Hero animation block */
.hero-anim-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr);
  gap: 1.1rem;
  margin: 1rem auto 1.4rem;
  max-width: var(--maxw);
  align-items: stretch;
}
.hero-anim-canvas {
  position: relative;
  min-height: 360px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: radial-gradient(circle at 30% 30%, #ffffff 0%, #f4f7fb 70%);
  overflow: hidden;
}
.hero-anim-canvas canvas { display: block; width: 100%; height: 100%; }
.hero-anim-loading {
  position: absolute; inset: 0;
  display: grid; place-items: center;
  color: var(--muted); font-size: 0.92rem;
}
.hero-anim-plots {
  display: flex; flex-direction: column; gap: 0.75rem;
}
.hero-anim-plot { margin: 0; }
.hero-anim-plot canvas {
  width: 100%;
  height: auto;
  background: #ffffff;
  border: 1px solid var(--line);
  border-radius: 8px;
}
.hero-anim-plot figcaption {
  font-size: 0.84rem; line-height: 1.45;
  margin-top: 0.35rem; text-align: left;
}
.hero-anim-controls {
  display: flex; flex-wrap: wrap; gap: 0.8rem; align-items: center;
  padding: 0.45rem 0.5rem; border: 1px solid var(--line); border-radius: 8px;
  background: #f8faff;
}
.hero-anim-btn {
  border: 1px solid #1d2939; background: #1d2939; color: #fff;
  font: inherit; font-weight: 600; font-size: 0.86rem;
  padding: 0.3rem 0.7rem; border-radius: 999px; cursor: pointer;
}
.hero-anim-scrubber {
  display: flex; align-items: center; gap: 0.5rem; flex: 1;
  font-size: 0.82rem; color: var(--muted);
}
.hero-anim-scrubber input[type="range"] { flex: 1; }
#hero-anim-t-val { font-variant-numeric: tabular-nums; min-width: 3ch; }
@media (max-width: 800px) {
  .hero-anim-grid { grid-template-columns: 1fr; }
  .hero-anim-canvas { min-height: 320px; }
}
```

- [ ] **Step 1.3: Verify markup renders**

Run:
```bash
cd /Users/tmeral/Repos/aligning-latent-geometry.github.io && python3 -m http.server 8765
```
Open `http://localhost:8765/` in a browser. Expected: the placeholder "Loading 3D scene…" text appears in a box above the existing three-figure row, two empty canvases stack on its right with captions, and a pause button + range slider sit below.

- [ ] **Step 1.4: Commit**

```bash
git add index.html styles.css
git commit -m "scaffold hero animation block"
```

---

## Task 2: Build the 2D hero plots (norm + radial share)

**Files:**
- Create: `assets/js/hero-plots.js`

This module is built first so the sphere module can call into it.

- [ ] **Step 2.1: Create `assets/js/hero-plots.js` with the full implementation**

```javascript
// hero-plots.js — Canvas2D plots for the hero side panel.
// Exports an init() that wires up two canvases and returns an update(t) function.

const D = 32;             // example latent token dimension (matches FLUX.2/VA-VAE)
const SHELL = Math.sqrt(D);
// In high d, two i.i.d. shell points are nearly orthogonal (expected angle ≈ π/2).
// Using ω = π/2 makes this 2D toy's endpoint radial share = sin²(ω/2) = 0.5, matching
// the empirical ~50% in the paper's Figure 4 for FLUX.2/VA-VAE.
const OMEGA = Math.PI / 2;

// Two fake endpoints on the shell — only their relative geometry matters for the plot.
// Use a 2D toy: z0 = R*(cos 0, sin 0), z1 = R*(cos omega, sin omega).
function linearPoint(t) {
  const x = (1 - t) * SHELL + t * SHELL * Math.cos(OMEGA);
  const y = t * SHELL * Math.sin(OMEGA);
  return [x, y];
}
function slerpPoint(t) {
  const s0 = Math.sin((1 - t) * OMEGA) / Math.sin(OMEGA);
  const s1 = Math.sin(t * OMEGA) / Math.sin(OMEGA);
  const x = SHELL * (s0 + s1 * Math.cos(OMEGA));
  const y = SHELL * (s1 * Math.sin(OMEGA));
  return [x, y];
}
function norm([x, y]) { return Math.hypot(x, y); }

// d/dt of linear path is constant (z1 - z0); its radial share at time t is
// |<u, z_t/|z_t|>|^2 / |u|^2.
function radialShareLinear(t) {
  const [x, y] = linearPoint(t);
  const r = Math.hypot(x, y);
  // u = z1 - z0 in 2D toy coords
  const ux = SHELL * Math.cos(OMEGA) - SHELL;
  const uy = SHELL * Math.sin(OMEGA);
  const uNorm2 = ux * ux + uy * uy;
  const rad = (ux * x + uy * y) / r;
  return (rad * rad) / uNorm2;
}
function radialShareSlerp(_t) { return 0; }

function precompute(n = 200) {
  const ts = Array.from({ length: n + 1 }, (_, i) => i / n);
  return {
    ts,
    normLin: ts.map(t => norm(linearPoint(t))),
    normSlerp: ts.map(_ => SHELL),
    radLin: ts.map(radialShareLinear),
    radSlerp: ts.map(_ => 0),
  };
}

function clear(ctx) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
}
function axes(ctx, opts) {
  const { padL, padR, padT, padB, w, h, yMin, yMax, yTicks, yLabel, xLabel } = opts;
  ctx.save();
  ctx.strokeStyle = '#cbd5e1';
  ctx.fillStyle = '#475467';
  ctx.font = '11px Inter, sans-serif';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padL, padT); ctx.lineTo(padL, h - padB); ctx.lineTo(w - padR, h - padB);
  ctx.stroke();
  // y ticks
  yTicks.forEach(v => {
    const y = padT + (1 - (v - yMin) / (yMax - yMin)) * (h - padT - padB);
    ctx.beginPath(); ctx.moveTo(padL - 4, y); ctx.lineTo(padL, y); ctx.stroke();
    ctx.fillText(v.toFixed(2), 4, y + 4);
  });
  // x ticks
  [0, 0.25, 0.5, 0.75, 1].forEach(v => {
    const x = padL + v * (w - padL - padR);
    ctx.beginPath(); ctx.moveTo(x, h - padB); ctx.lineTo(x, h - padB + 4); ctx.stroke();
    ctx.fillText(v.toFixed(2), x - 8, h - padB + 14);
  });
  // labels
  ctx.fillText(xLabel, w - padR - 20, h - 4);
  ctx.save();
  ctx.translate(12, padT + 8);
  ctx.fillText(yLabel, 0, 0);
  ctx.restore();
  ctx.restore();
}
function plotLine(ctx, xs, ys, opts) {
  const { padL, padR, padT, padB, w, h, yMin, yMax, color, dashed } = opts;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  if (dashed) ctx.setLineDash([5, 4]);
  ctx.beginPath();
  for (let i = 0; i < xs.length; i++) {
    const x = padL + xs[i] * (w - padL - padR);
    const y = padT + (1 - (ys[i] - yMin) / (yMax - yMin)) * (h - padT - padB);
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.restore();
}
function dot(ctx, x, y, color, opts) {
  const { padL, padR, padT, padB, w, h, yMin, yMax } = opts;
  const px = padL + x * (w - padL - padR);
  const py = padT + (1 - (y - yMin) / (yMax - yMin)) * (h - padT - padB);
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(px, py, 4, 0, Math.PI * 2); ctx.fill();
}
function legend(ctx, items, x, y) {
  ctx.save();
  ctx.font = '11px Inter, sans-serif';
  let cy = y;
  items.forEach(([label, color, dashed]) => {
    ctx.strokeStyle = color; ctx.lineWidth = 2;
    if (dashed) ctx.setLineDash([5, 4]); else ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(x, cy); ctx.lineTo(x + 22, cy); ctx.stroke();
    ctx.fillStyle = '#101828';
    ctx.fillText(label, x + 28, cy + 4);
    cy += 14;
  });
  ctx.restore();
}

function setupCanvas(canvas) {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.max(1, Math.floor(rect.width * dpr));
  canvas.height = Math.max(1, Math.floor(rect.height * dpr));
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w: rect.width, h: rect.height };
}

export function initHeroPlots(normSel, radialSel) {
  const cNorm = document.querySelector(normSel);
  const cRad = document.querySelector(radialSel);
  const data = precompute(200);
  let lastT = 0;

  function drawAll(t) {
    lastT = t;
    {
      const { ctx, w, h } = setupCanvas(cNorm);
      // With ω = π/2 and √d ≈ 5.66, the linear midpoint norm is √d/√2 ≈ 4.0; the
      // path then climbs back to √d at t=1. yMin=3.5 leaves a sliver of headroom.
      const opts = { padL: 44, padR: 14, padT: 14, padB: 28, w, h, yMin: 3.5, yMax: 6.5,
        yTicks: [4, 5, 6], yLabel: '‖z_t‖', xLabel: 't' };
      clear(ctx);
      axes(ctx, opts);
      // shell reference
      ctx.save();
      ctx.strokeStyle = '#94a3b8'; ctx.setLineDash([2, 3]); ctx.lineWidth = 1;
      const yRef = opts.padT + (1 - (SHELL - opts.yMin) / (opts.yMax - opts.yMin)) * (h - opts.padT - opts.padB);
      ctx.beginPath(); ctx.moveTo(opts.padL, yRef); ctx.lineTo(w - opts.padR, yRef); ctx.stroke();
      ctx.fillStyle = '#64748b';
      ctx.fillText('√d', w - opts.padR - 18, yRef - 4);
      ctx.restore();
      plotLine(ctx, data.ts, data.normLin, { ...opts, color: '#dc2626' });
      plotLine(ctx, data.ts, data.normSlerp, { ...opts, color: '#2563eb' });
      dot(ctx, t, data.normLin[Math.round(t * 200)], '#dc2626', opts);
      dot(ctx, t, SHELL, '#2563eb', opts);
      legend(ctx, [['linear', '#dc2626', false], ['slerp', '#2563eb', false]], w - opts.padR - 70, opts.padT + 8);
    }
    {
      const { ctx, w, h } = setupCanvas(cRad);
      const opts = { padL: 44, padR: 14, padT: 14, padB: 28, w, h, yMin: 0, yMax: 1,
        yTicks: [0, 0.25, 0.5, 0.75, 1.0], yLabel: 'radial share', xLabel: 't' };
      clear(ctx);
      axes(ctx, opts);
      plotLine(ctx, data.ts, data.radLin, { ...opts, color: '#dc2626' });
      plotLine(ctx, data.ts, data.radSlerp, { ...opts, color: '#2563eb' });
      dot(ctx, t, data.radLin[Math.round(t * 200)], '#dc2626', opts);
      dot(ctx, t, 0, '#2563eb', opts);
      legend(ctx, [['linear', '#dc2626', false], ['slerp = 0', '#2563eb', false]], w - opts.padR - 70, opts.padT + 8);
    }
  }

  drawAll(0);
  window.addEventListener('resize', () => drawAll(lastT));
  return { update: drawAll, data };
}
```

- [ ] **Step 2.2: Wire the plot script into `index.html`**

Add this before `</body>`, right after the existing Prism scripts:

```html
<script type="module">
  import { initHeroPlots } from './assets/js/hero-plots.js';
  window.__heroPlots = initHeroPlots('#hero-plot-norm', '#hero-plot-radial');
</script>
```

- [ ] **Step 2.3: Visual verification**

Reload `http://localhost:8765/`. Expected:
- Both canvases render filled axes.
- The norm plot shows a red curve dipping below a dashed reference line (√d ≈ 5.66) and a flat blue line on it.
- The radial-share plot shows a red curve that rises near both endpoints (≈ 50% peak) and a flat blue line at 0.
- A small red dot sits at t=0 on both curves; a blue dot sits at the corresponding y-values.

- [ ] **Step 2.4: Commit**

```bash
git add assets/js/hero-plots.js index.html
git commit -m "add hero side-panel plots (norm, radial share)"
```

---

## Task 3: Build the Three.js hero sphere scene

**Files:**
- Create: `assets/js/hero-sphere.js`
- Modify: `index.html` (add the module script tag)

- [ ] **Step 3.1: Create `assets/js/hero-sphere.js`**

```javascript
// hero-sphere.js — Three.js scene: sphere shell with two endpoints, a linear chord
// that visibly cuts through the interior, and a slerp arc that hugs the surface.
// Drives the side-panel plots via a shared t ∈ [0,1] scrubber.

import * as THREE from 'https://esm.sh/three@0.160.0';
import { OrbitControls } from 'https://esm.sh/three@0.160.0/examples/jsm/controls/OrbitControls.js';

const R = 2.0;                    // visible sphere radius (display only)
// 90° matches the expected angle between two i.i.d. shell points in high d, and
// makes the linear chord visibly dip to R/√2 ≈ 0.707·R inside the sphere.
const OMEGA_DEG = 90;
const OMEGA = (OMEGA_DEG * Math.PI) / 180;
const SHELL_NOISE = 0.05;         // visual scatter band thickness

function setupRenderer(container) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  const rect = container.getBoundingClientRect();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(rect.width, rect.height, false);
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';
  container.appendChild(renderer.domElement);
  return renderer;
}

function makeShellPoints(n = 500) {
  // Sample n points roughly on a thin shell around radius R.
  const positions = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    // Uniform on sphere via Marsaglia
    let x, y, z, s;
    do {
      x = Math.random() * 2 - 1; y = Math.random() * 2 - 1; s = x * x + y * y;
    } while (s >= 1);
    const f = 2 * Math.sqrt(1 - s);
    const px = x * f, py = y * f, pz = 1 - 2 * s;
    const r = R + (Math.random() - 0.5) * SHELL_NOISE * 2;
    positions[i * 3] = px * r;
    positions[i * 3 + 1] = py * r;
    positions[i * 3 + 2] = pz * r;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({ size: 0.035, color: 0x9aa6b8, transparent: true, opacity: 0.85 });
  return new THREE.Points(geo, mat);
}

function makeWireSphere() {
  const geo = new THREE.SphereGeometry(R, 32, 16);
  const mat = new THREE.MeshBasicMaterial({ color: 0xb6c2d1, wireframe: true, transparent: true, opacity: 0.25 });
  return new THREE.Mesh(geo, mat);
}

// Place both endpoints exactly on a great circle of radius R in a plane tilted off
// the equator. Building them in an orthonormal (e1, e2) frame guarantees that the
// angle between them is exactly OMEGA, so slerp uses the correct ω with no drift.
function endpoints() {
  const e1 = new THREE.Vector3(1, 0, 0);
  const e2 = new THREE.Vector3(0, 0.55, 0.835).normalize();   // tilted off the equator
  const a = OMEGA / 2;
  const z0 = e1.clone().multiplyScalar(R * Math.cos(-a)).addScaledVector(e2, R * Math.sin(-a));
  const z1 = e1.clone().multiplyScalar(R * Math.cos( a)).addScaledVector(e2, R * Math.sin( a));
  return [z0, z1];
}

function lineGeom(points, color, opacity = 1.0, dashed = false) {
  const geo = new THREE.BufferGeometry().setFromPoints(points);
  const mat = dashed
    ? new THREE.LineDashedMaterial({ color, dashSize: 0.08, gapSize: 0.05, transparent: true, opacity })
    : new THREE.LineBasicMaterial({ color, transparent: true, opacity, linewidth: 2 });
  const line = new THREE.Line(geo, mat);
  if (dashed) line.computeLineDistances();
  return line;
}

function slerpVec(a, b, t, omega) {
  const s0 = Math.sin((1 - t) * omega) / Math.sin(omega);
  const s1 = Math.sin(t * omega) / Math.sin(omega);
  return new THREE.Vector3(
    s0 * a.x + s1 * b.x,
    s0 * a.y + s1 * b.y,
    s0 * a.z + s1 * b.z
  );
}
function lerpVec(a, b, t) {
  return new THREE.Vector3(
    (1 - t) * a.x + t * b.x,
    (1 - t) * a.y + t * b.y,
    (1 - t) * a.z + t * b.z
  );
}

function makeMovingDot(color) {
  const geo = new THREE.SphereGeometry(0.07, 16, 12);
  const mat = new THREE.MeshBasicMaterial({ color });
  return new THREE.Mesh(geo, mat);
}

function makeEndpointDot(color) {
  const geo = new THREE.SphereGeometry(0.085, 18, 14);
  const mat = new THREE.MeshBasicMaterial({ color });
  return new THREE.Mesh(geo, mat);
}

export function initHeroSphere(containerSel, opts) {
  const container = document.querySelector(containerSel);
  const loading = container.querySelector('.hero-anim-loading');
  if (loading) loading.remove();

  const rect = container.getBoundingClientRect();
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, rect.width / rect.height, 0.1, 100);
  camera.position.set(4.2, 1.6, 4.6);

  const renderer = setupRenderer(container);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.minDistance = 4; controls.maxDistance = 9;
  controls.autoRotate = true; controls.autoRotateSpeed = 0.7;

  scene.add(makeWireSphere());
  scene.add(makeShellPoints(700));

  const [z0, z1] = endpoints();
  const epA = makeEndpointDot(0x111827); epA.position.copy(z0);
  const epB = makeEndpointDot(0x111827); epB.position.copy(z1);
  scene.add(epA, epB);

  // Linear chord (red, dashed) — straight line in 3D
  const linearLine = lineGeom([z0, z1], 0xdc2626, 0.85, true);
  scene.add(linearLine);

  // Slerp arc (blue, solid) — sampled along the geodesic
  const arcPts = [];
  for (let i = 0; i <= 64; i++) {
    arcPts.push(slerpVec(z0, z1, i / 64, OMEGA));
  }
  const slerpLine = lineGeom(arcPts, 0x2563eb, 0.95, false);
  scene.add(slerpLine);

  // Moving dots
  const movingLin = makeMovingDot(0xdc2626);
  const movingSlp = makeMovingDot(0x2563eb);
  movingLin.position.copy(z0); movingSlp.position.copy(z0);
  scene.add(movingLin, movingSlp);

  // Animation state
  let t = 0;
  let playing = true;
  let lastFrame = performance.now();
  const PERIOD_MS = 5500;          // one round trip

  const tInput = document.querySelector('#hero-anim-t');
  const tVal = document.querySelector('#hero-anim-t-val');
  const toggle = document.querySelector('#hero-anim-toggle');

  function setT(newT) {
    t = Math.max(0, Math.min(1, newT));
    movingLin.position.copy(lerpVec(z0, z1, t));
    movingSlp.position.copy(slerpVec(z0, z1, t, OMEGA));
    if (tInput) tInput.value = String(Math.round(t * 1000));
    if (tVal) tVal.textContent = t.toFixed(2);
    if (opts && typeof opts.onT === 'function') opts.onT(t);
  }
  setT(0);

  tInput?.addEventListener('input', () => {
    playing = false;
    if (toggle) { toggle.textContent = '▶ Play'; toggle.setAttribute('aria-pressed', 'false'); }
    setT(parseInt(tInput.value, 10) / 1000);
  });

  toggle?.addEventListener('click', () => {
    playing = !playing;
    if (toggle) {
      toggle.textContent = playing ? '⏸ Pause' : '▶ Play';
      toggle.setAttribute('aria-pressed', String(playing));
    }
    lastFrame = performance.now();
  });

  // Resize handling
  const onResize = () => {
    const r = container.getBoundingClientRect();
    renderer.setSize(r.width, r.height, false);
    camera.aspect = r.width / r.height;
    camera.updateProjectionMatrix();
  };
  window.addEventListener('resize', onResize);

  // IntersectionObserver — only animate when on-screen
  let onScreen = true;
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { onScreen = e.isIntersecting; });
  }, { threshold: 0.05 });
  io.observe(container);

  function loop(now) {
    requestAnimationFrame(loop);
    if (!onScreen) return;
    if (playing) {
      const dt = now - lastFrame;
      // Triangle wave so it ping-pongs back and forth.
      const phase = ((now / PERIOD_MS) % 2);
      const newT = phase < 1 ? phase : 2 - phase;
      setT(newT);
    }
    lastFrame = now;
    controls.update();
    renderer.render(scene, camera);
  }
  requestAnimationFrame(loop);

  return { setT };
}
```

- [ ] **Step 3.2: Replace the plain plots-init script in `index.html` with a coordinated init**

Replace the script block added in Step 2.2 with:

```html
<script type="module">
  import { initHeroPlots } from './assets/js/hero-plots.js';
  import { initHeroSphere } from './assets/js/hero-sphere.js';
  const plots = initHeroPlots('#hero-plot-norm', '#hero-plot-radial');
  initHeroSphere('#hero-anim-sphere', { onT: (t) => plots.update(t) });
</script>
```

- [ ] **Step 3.3: Visual verification**

Reload. Expected:
- A 3D sphere appears in the left canvas with a faint wireframe, ~700 scattered point cloud forming a thin shell, two solid black endpoint markers, a red dashed straight line cutting from one endpoint to the other (visibly inside the sphere), and a solid blue arc hugging the surface.
- A red dot and blue dot animate from one endpoint to the other and back, in sync.
- The camera slowly auto-rotates.
- The two side plots' red and blue dots move along with the sphere's t.
- Pause button stops motion; slider moves t manually.
- No console errors.

- [ ] **Step 3.4: Commit**

```bash
git add assets/js/hero-sphere.js index.html
git commit -m "add Three.js hero sphere with synced t scrubber"
```

---

## Task 4: Concentration-of-measure interactive demo

**Files:**
- Modify: `index.html` (insert new section between `#tldr` and `#motivation`)
- Modify: `styles.css` (append styles)
- Create: `assets/js/concentration-demo.js`

- [ ] **Step 4.1: Add the section markup to `index.html`**

Insert after the closing `</section>` of `#tldr` (around line 100) and before `<section class="section" id="motivation">`:

```html
<section class="section" id="concentration">
  <h2>📐 Why both endpoints live on shells</h2>
  <p>
    In high dimensions, samples from \(\mathcal{N}(0, I_d)\) concentrate near a thin shell of radius \(\sqrt d\).
    Drag the slider to see how the distribution of \(\|z\|\) collapses from a wide spread (low <em>d</em>) into a
    sharp spike at \(\sqrt d\) (high <em>d</em>). The strip below the histogram reports the Gaussian coefficient of
    variation at the current <em>d</em> alongside the paper's measured CVs for the three VAE tokenizers (Table 1):
    by <em>d</em> ≈ 32 the Gaussian is already as concentrated as the processed VAE latents.
  </p>
  <div class="conc-demo" aria-label="Concentration of measure interactive demo">
    <div class="conc-controls">
      <label>dimension d: <strong id="conc-d-val">32</strong></label>
      <input id="conc-d" type="range" min="0" max="7" step="1" value="5"
        aria-label="Dimension exponent — values map to d in {2,4,8,16,32,64,128,256}" />
      <span class="conc-shell">√d = <strong id="conc-shell">5.66</strong></span>
    </div>
    <div class="conc-canvas-row">
      <figure class="conc-fig">
        <canvas id="conc-scatter" width="480" height="320"></canvas>
        <figcaption>2D projection (first two coords) of 800 i.i.d. Gaussian samples.</figcaption>
      </figure>
      <figure class="conc-fig">
        <canvas id="conc-hist" width="480" height="320"></canvas>
        <figcaption>Histogram of \(\|z\|\). Dashed line marks \(\sqrt d\); the band narrows as <em>d</em> grows.</figcaption>
      </figure>
    </div>
  </div>
</section>
```

- [ ] **Step 4.2: Append styles to `styles.css`**

```css
/* Concentration demo */
.conc-demo {
  margin-top: 0.8rem;
  display: flex; flex-direction: column; gap: 0.7rem;
}
.conc-controls {
  display: flex; align-items: center; gap: 0.8rem; flex-wrap: wrap;
  padding: 0.55rem 0.75rem; border: 1px solid var(--line); border-radius: 8px;
  background: #f8faff; font-size: 0.92rem;
}
.conc-controls input[type="range"] { flex: 1; min-width: 200px; }
.conc-shell { color: var(--muted); font-variant-numeric: tabular-nums; }
.conc-canvas-row {
  display: grid; grid-template-columns: 1fr 1fr; gap: 0.9rem;
}
.conc-fig { margin: 0; }
.conc-fig canvas {
  width: 100%; height: auto; background: #fff;
  border: 1px solid var(--line); border-radius: 8px;
}
.conc-fig figcaption { font-size: 0.85rem; text-align: left; margin-top: 0.4rem; }
@media (max-width: 800px) {
  .conc-canvas-row { grid-template-columns: 1fr; }
}
```

- [ ] **Step 4.3: Create `assets/js/concentration-demo.js`**

```javascript
// concentration-demo.js — d-slider, scatter + histogram of ||z||.
// Box-Muller for Gaussian samples; pre-generates 256-dim samples once and slices.

const N = 800;
const DIMS = [2, 4, 8, 16, 32, 64, 128, 256];
const MAX_D = 256;

function gauss() {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function makeSamples() {
  const arr = new Float32Array(N * MAX_D);
  for (let i = 0; i < arr.length; i++) arr[i] = gauss();
  return arr;
}

function normUpToD(samples, d) {
  const out = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    let s = 0;
    const off = i * MAX_D;
    for (let k = 0; k < d; k++) {
      const v = samples[off + k];
      s += v * v;
    }
    out[i] = Math.sqrt(s);
  }
  return out;
}

function setupCanvas(canvas) {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.max(1, Math.floor(rect.width * dpr));
  canvas.height = Math.max(1, Math.floor(rect.height * dpr));
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w: rect.width, h: rect.height };
}

function drawScatter(canvas, samples, d, shell) {
  const { ctx, w, h } = setupCanvas(canvas);
  ctx.clearRect(0, 0, w, h);
  // Background gridlines
  ctx.save();
  ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1;
  for (let g = -4; g <= 4; g++) {
    const x = w / 2 + (g / 4) * (w * 0.42);
    const y = h / 2 + (g / 4) * (h * 0.42);
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
  }
  ctx.restore();
  // Reference circle at radius sqrt(d) projected — note projection of a sample's first 2 coords
  // is NOT at radius sqrt(d) (only the full d-dim norm is). Skip drawing a misleading circle.
  // Plot first-2-coord scatter
  const scale = Math.min(w, h) * 0.40 / 4.0; // fit ~|x|<4 stddev
  ctx.fillStyle = 'rgba(37, 99, 235, 0.55)';
  for (let i = 0; i < N; i++) {
    const x = samples[i * MAX_D];
    const y = samples[i * MAX_D + 1];
    ctx.beginPath();
    ctx.arc(w / 2 + x * scale, h / 2 - y * scale, 1.8, 0, Math.PI * 2);
    ctx.fill();
  }
  // Annotate
  ctx.fillStyle = '#475467'; ctx.font = '11px Inter, sans-serif';
  ctx.fillText(`first 2 of d=${d} coords`, 8, 14);
  ctx.fillText(`√d = ${shell.toFixed(2)}`, w - 70, 14);
}

// Processed-latent CVs from the paper, Table 1 (after each pipeline's preprocessing).
// CV = std(‖z‖) / mean(‖z‖). For an isotropic d-dim Gaussian, CV ≈ 1/√(2d).
const VAE_CVS = [
  { name: 'FLUX.2',   cv: 0.20 },
  { name: 'VA-VAE',   cv: 0.16 },
  { name: 'REPA-E',   cv: 0.23 },
];

function gaussianCV(d) {
  // First-order: var(‖z‖²) = 2d, mean(‖z‖²) = d → var(‖z‖) ≈ 1/2, mean(‖z‖) ≈ √d.
  return 1 / Math.sqrt(2 * d);
}

function sampleCV(norms) {
  let s = 0, ss = 0;
  for (let i = 0; i < norms.length; i++) { s += norms[i]; ss += norms[i] * norms[i]; }
  const mean = s / norms.length;
  const variance = Math.max(0, ss / norms.length - mean * mean);
  return Math.sqrt(variance) / mean;
}

function drawHist(canvas, norms, d) {
  const { ctx, w, h } = setupCanvas(canvas);
  ctx.clearRect(0, 0, w, h);
  const padL = 36, padR = 12, padT = 14, padB = 38;
  const innerW = w - padL - padR, innerH = h - padT - padB;
  // Histogram bins
  const xMax = Math.max(20, Math.ceil(Math.sqrt(MAX_D)) + 4);
  const bins = 60;
  const counts = new Array(bins).fill(0);
  for (let i = 0; i < norms.length; i++) {
    const b = Math.min(bins - 1, Math.max(0, Math.floor((norms[i] / xMax) * bins)));
    counts[b]++;
  }
  const maxCount = Math.max(...counts);
  const norm = maxCount > 0 ? 1 / maxCount : 0;
  // Axes
  ctx.strokeStyle = '#cbd5e1'; ctx.fillStyle = '#475467'; ctx.font = '11px Inter, sans-serif';
  ctx.beginPath(); ctx.moveTo(padL, padT); ctx.lineTo(padL, h - padB);
  ctx.lineTo(w - padR, h - padB); ctx.stroke();
  for (let v = 0; v <= xMax; v += 4) {
    const x = padL + (v / xMax) * innerW;
    ctx.beginPath(); ctx.moveTo(x, h - padB); ctx.lineTo(x, h - padB + 3); ctx.stroke();
    ctx.fillText(String(v), x - 6, h - padB + 14);
  }
  // Bars
  ctx.fillStyle = 'rgba(37, 99, 235, 0.7)';
  const bw = innerW / bins;
  for (let i = 0; i < bins; i++) {
    const x = padL + i * bw;
    const bh = counts[i] * norm * innerH;
    ctx.fillRect(x + 1, h - padB - bh, Math.max(1, bw - 1.5), bh);
  }
  // sqrt(d) marker
  const shell = Math.sqrt(d);
  const xShell = padL + (shell / xMax) * innerW;
  ctx.save();
  ctx.strokeStyle = '#dc2626'; ctx.setLineDash([4, 3]); ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(xShell, padT); ctx.lineTo(xShell, h - padB); ctx.stroke();
  ctx.restore();
  ctx.fillStyle = '#dc2626';
  ctx.fillText(`√d ≈ ${shell.toFixed(2)}`, xShell + 4, padT + 10);
  // Label
  ctx.fillStyle = '#475467';
  ctx.fillText('‖z‖', w - padR - 24, h - padB - 4);

  // VAE comparison band underneath the plot. Show the Gaussian CV at the current d
  // alongside the paper's reported VAE CVs from Table 1, so the reader sees that
  // VAE latents concentrate about as tightly as a Gaussian in moderate dimension.
  const gCV = gaussianCV(d);
  const ssCV = sampleCV(norms);
  ctx.font = '11px Inter, sans-serif';
  ctx.fillStyle = '#475467';
  const yLine = h - 14;
  ctx.fillText(
    `Gaussian d=${d}: CV ≈ ${gCV.toFixed(3)} (sampled ${ssCV.toFixed(3)})  |  `
    + VAE_CVS.map(v => `${v.name}: ${v.cv.toFixed(2)}`).join('   '),
    padL, yLine
  );
}

export function initConcentrationDemo() {
  const slider = document.querySelector('#conc-d');
  const dVal = document.querySelector('#conc-d-val');
  const shellOut = document.querySelector('#conc-shell');
  const scatter = document.querySelector('#conc-scatter');
  const hist = document.querySelector('#conc-hist');
  const samples = makeSamples();

  function render() {
    const idx = parseInt(slider.value, 10);
    const d = DIMS[idx];
    const shell = Math.sqrt(d);
    dVal.textContent = String(d);
    shellOut.textContent = shell.toFixed(2);
    const norms = normUpToD(samples, d);
    drawScatter(scatter, samples, d, shell);
    drawHist(hist, norms, d);
  }
  slider.addEventListener('input', render);
  window.addEventListener('resize', render);
  render();
}
```

- [ ] **Step 4.4: Wire the script into `index.html`**

Update the script block (the one introduced in Task 3 Step 3.2):

```html
<script type="module">
  import { initHeroPlots } from './assets/js/hero-plots.js';
  import { initHeroSphere } from './assets/js/hero-sphere.js';
  import { initConcentrationDemo } from './assets/js/concentration-demo.js';
  const plots = initHeroPlots('#hero-plot-norm', '#hero-plot-radial');
  initHeroSphere('#hero-anim-sphere', { onT: (t) => plots.update(t) });
  initConcentrationDemo();
</script>
```

- [ ] **Step 4.5: Visual verification**

Reload. Expected:
- New "Why both endpoints live on shells" section sits between TL;DR and Motivation.
- Slider starts at d=32, shell label reads 5.66.
- Scatter plot shows a roughly circular blob of 800 dots.
- Histogram shows a broad-to-narrow distribution with a red dashed √d marker.
- Moving slider all the way to d=2 shows a wide spread peaked near 1.5; at d=256 it collapses into a sharp spike at √d≈16.
- No console errors.

- [ ] **Step 4.6: Commit**

```bash
git add assets/js/concentration-demo.js index.html styles.css
git commit -m "add concentration-of-measure interactive demo"
```

---

## Task 5: Radial vs tangential velocity decomposition

**Files:**
- Modify: `index.html` (insert after Figure 4 inside `#motivation`)
- Modify: `styles.css` (append styles)
- Create: `assets/js/velocity-decomp.js`

This sits next to Figure 4 (the radial-share-over-time plot) so the reader sees the static curve from the paper, then plays the live decomposition.

- [ ] **Step 5.1: Add the markup to `index.html`**

Insert just before the closing `</section>` of `#motivation` (right after the existing Figure 4 figcaption block):

```html
<div class="vel-demo" aria-label="Live velocity decomposition along a linear chord">
  <div class="vel-canvas-wrap">
    <canvas id="vel-canvas" width="640" height="360"></canvas>
  </div>
  <div class="vel-side">
    <h4>Velocity decomposition, live</h4>
    <p>The token moves along a straight line between two shell points. Its velocity vector decomposes into a
       <span class="vel-tag vel-rad">radial</span> part that changes its distance from the origin (wasted —
       the decoder barely reads it) and a <span class="vel-tag vel-tan">tangential</span> part that changes
       its direction (the part the decoder actually uses).</p>
    <div class="vel-bar-wrap">
      <span>radial share</span>
      <div class="vel-bar"><div id="vel-bar-fill"></div></div>
      <strong id="vel-bar-val">0%</strong>
    </div>
    <p class="vel-note">Slerp on the sphere is the dashed blue arc. By construction its velocity is purely
       tangential — radial share is identically zero.</p>
  </div>
</div>
```

- [ ] **Step 5.2: Append styles**

```css
/* Velocity decomposition demo */
.vel-demo {
  display: grid; grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
  gap: 1rem; margin-top: 1.2rem;
  border: 1px solid var(--line); border-radius: 10px; padding: 0.9rem; background: #fcfdff;
}
.vel-canvas-wrap { aspect-ratio: 16 / 9; }
.vel-canvas-wrap canvas {
  width: 100%; height: 100%; background: #fff;
  border: 1px solid var(--line); border-radius: 8px;
}
.vel-side h4 { margin: 0 0 0.4rem; font-size: 1.02rem; }
.vel-side p { margin: 0.35rem 0; font-size: 0.92rem; }
.vel-note { font-size: 0.84rem; color: var(--muted); }
.vel-tag {
  display: inline-block; padding: 0 0.4rem; border-radius: 999px;
  font-weight: 600; font-size: 0.85rem;
}
.vel-tag.vel-rad { color: #dc2626; background: #fee2e2; }
.vel-tag.vel-tan { color: #2563eb; background: #dbeafe; }
.vel-bar-wrap {
  display: flex; align-items: center; gap: 0.55rem; margin: 0.55rem 0; font-size: 0.86rem;
}
.vel-bar { flex: 1; height: 10px; border-radius: 999px; background: #e5e7eb; overflow: hidden; }
#vel-bar-fill { height: 100%; width: 0%; background: linear-gradient(90deg, #fca5a5, #dc2626); transition: width 0.05s linear; }
#vel-bar-val { font-variant-numeric: tabular-nums; min-width: 3.5ch; text-align: right; }
@media (max-width: 800px) {
  .vel-demo { grid-template-columns: 1fr; }
}
```

- [ ] **Step 5.3: Create `assets/js/velocity-decomp.js`**

```javascript
// velocity-decomp.js — 2D demo: a token on a linear chord between two shell points;
// at each frame, draw its position, velocity, radial component, tangential component.
// Updates a bar with the instantaneous radial energy share.

const R = 150;             // pixel radius of shell circle
// ω = π/2 matches the expected angle between two i.i.d. shell points in high d, and
// gives endpoint radial share = sin²(ω/2) = 0.5 — the ~50% in the paper's Figure 4.
const OMEGA = Math.PI / 2;

function setupCanvas(canvas) {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.max(1, Math.floor(rect.width * dpr));
  canvas.height = Math.max(1, Math.floor(rect.height * dpr));
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w: rect.width, h: rect.height };
}

function arrow(ctx, ox, oy, dx, dy, color, lw = 2.5) {
  const len = Math.hypot(dx, dy);
  if (len < 0.5) return;
  ctx.save();
  ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.moveTo(ox, oy); ctx.lineTo(ox + dx, oy + dy);
  ctx.stroke();
  // head
  const ang = Math.atan2(dy, dx);
  const headLen = 8;
  ctx.beginPath();
  ctx.moveTo(ox + dx, oy + dy);
  ctx.lineTo(ox + dx - headLen * Math.cos(ang - 0.4), oy + dy - headLen * Math.sin(ang - 0.4));
  ctx.lineTo(ox + dx - headLen * Math.cos(ang + 0.4), oy + dy - headLen * Math.sin(ang + 0.4));
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export function initVelocityDecomp() {
  const canvas = document.querySelector('#vel-canvas');
  const barFill = document.querySelector('#vel-bar-fill');
  const barVal = document.querySelector('#vel-bar-val');
  if (!canvas) return;

  // 2D toy endpoints — same OMEGA for both
  const z0 = { x: R * Math.cos(-OMEGA / 2), y: R * Math.sin(-OMEGA / 2) };
  const z1 = { x: R * Math.cos(OMEGA / 2),  y: R * Math.sin(OMEGA / 2)  };
  // Linear velocity is constant
  const u = { x: z1.x - z0.x, y: z1.y - z0.y };
  const uNorm2 = u.x * u.x + u.y * u.y;

  const PERIOD = 5000;

  function draw(t) {
    const { ctx, w, h } = setupCanvas(canvas);
    const cx = w / 2, cy = h / 2;
    ctx.clearRect(0, 0, w, h);

    // Background guides
    ctx.save();
    ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 1;
    // Axes
    ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(w, cy);
    ctx.moveTo(cx, 0); ctx.lineTo(cx, h); ctx.stroke();
    // Shell circle
    ctx.beginPath();
    ctx.strokeStyle = '#94a3b8'; ctx.setLineDash([4, 3]);
    ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // Slerp arc (dashed blue, for reference)
    ctx.save();
    ctx.strokeStyle = '#93c5fd'; ctx.lineWidth = 2; ctx.setLineDash([5, 4]);
    ctx.beginPath();
    for (let i = 0; i <= 60; i++) {
      const tt = i / 60;
      const s0 = Math.sin((1 - tt) * OMEGA) / Math.sin(OMEGA);
      const s1 = Math.sin(tt * OMEGA) / Math.sin(OMEGA);
      const x = cx + s0 * z0.x + s1 * z1.x;
      const y = cy - (s0 * z0.y + s1 * z1.y);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();

    // Linear chord (red, dashed faint)
    ctx.save();
    ctx.strokeStyle = '#fca5a5'; ctx.lineWidth = 1.5; ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(cx + z0.x, cy - z0.y); ctx.lineTo(cx + z1.x, cy - z1.y);
    ctx.stroke();
    ctx.restore();

    // Endpoints
    ctx.fillStyle = '#111827';
    [z0, z1].forEach(p => {
      ctx.beginPath(); ctx.arc(cx + p.x, cy - p.y, 6, 0, Math.PI * 2); ctx.fill();
    });

    // Current position on linear path
    const zt = { x: (1 - t) * z0.x + t * z1.x, y: (1 - t) * z0.y + t * z1.y };
    const ztNorm = Math.hypot(zt.x, zt.y);
    // Origin->z_t (radial direction)
    ctx.save();
    ctx.strokeStyle = '#94a3b8'; ctx.setLineDash([2, 3]); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + zt.x, cy - zt.y); ctx.stroke();
    ctx.restore();

    // Decompose u into radial (along z_t/|z_t|) and tangential
    const radHat = { x: zt.x / ztNorm, y: zt.y / ztNorm };
    const radCoef = u.x * radHat.x + u.y * radHat.y;
    const uRad = { x: radCoef * radHat.x, y: radCoef * radHat.y };
    const uTan = { x: u.x - uRad.x, y: u.y - uRad.y };

    // Velocity arrows — scale down for visibility
    const VEL_SCALE = 0.45;
    const ox = cx + zt.x, oy = cy - zt.y;
    arrow(ctx, ox, oy, u.x * VEL_SCALE, -u.y * VEL_SCALE, '#94a3b8', 2);   // full u (gray)
    arrow(ctx, ox, oy, uRad.x * VEL_SCALE, -uRad.y * VEL_SCALE, '#dc2626', 3);
    arrow(ctx, ox, oy, uTan.x * VEL_SCALE, -uTan.y * VEL_SCALE, '#2563eb', 3);

    // Token marker
    ctx.fillStyle = '#1d2939';
    ctx.beginPath(); ctx.arc(ox, oy, 6, 0, Math.PI * 2); ctx.fill();

    // Radial share bar
    const radShare = (radCoef * radCoef) / uNorm2;
    if (barFill) barFill.style.width = `${(radShare * 100).toFixed(1)}%`;
    if (barVal) barVal.textContent = `${(radShare * 100).toFixed(0)}%`;

    // Labels
    ctx.fillStyle = '#475467'; ctx.font = '12px Inter, sans-serif';
    ctx.fillText('z_0', cx + z0.x - 22, cy - z0.y + 4);
    ctx.fillText('z_1', cx + z1.x + 8,  cy - z1.y + 4);
    ctx.fillText('origin', cx + 6, cy - 6);
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('shell', cx + R - 36, cy - 6);
    // Velocity legend
    const lx = 12, ly = 18;
    ctx.fillStyle = '#94a3b8'; ctx.fillText('— u (total velocity)', lx, ly);
    ctx.fillStyle = '#dc2626'; ctx.fillText('— u_radial (wasted)', lx, ly + 14);
    ctx.fillStyle = '#2563eb'; ctx.fillText('— u_tangential (used)', lx, ly + 28);
  }

  // IntersectionObserver — only animate when on-screen
  let onScreen = false;
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { onScreen = e.isIntersecting; });
  }, { threshold: 0.05 });
  io.observe(canvas);

  function tick(now) {
    requestAnimationFrame(tick);
    if (!onScreen) return;
    let tt = ((now / PERIOD) % 2);
    if (tt > 1) tt = 2 - tt;
    draw(tt);
  }
  draw(0);
  requestAnimationFrame(tick);

  window.addEventListener('resize', () => draw(0));
}
```

- [ ] **Step 5.4: Wire the script into `index.html`**

Update the script block:

```html
<script type="module">
  import { initHeroPlots } from './assets/js/hero-plots.js';
  import { initHeroSphere } from './assets/js/hero-sphere.js';
  import { initConcentrationDemo } from './assets/js/concentration-demo.js';
  import { initVelocityDecomp } from './assets/js/velocity-decomp.js';
  const plots = initHeroPlots('#hero-plot-norm', '#hero-plot-radial');
  initHeroSphere('#hero-anim-sphere', { onT: (t) => plots.update(t) });
  initConcentrationDemo();
  initVelocityDecomp();
</script>
```

- [ ] **Step 5.5: Visual verification**

Reload and scroll to the motivation section. Expected:
- Below the static Figure 4, a new demo box renders a 2D circle (dashed gray) representing the shell, two black endpoint dots, a faint red dashed chord between them, and a faint blue dashed slerp arc.
- A dark token marker animates from one endpoint to the other along the red chord.
- Three arrows emanate from the token: a gray full velocity, a red radial component, a blue tangential component.
- A radial-share bar fills up to ~50% near the endpoints and shrinks to near 0 at the midpoint.
- Animation only runs when the section is on-screen.

- [ ] **Step 5.6: Commit**

```bash
git add assets/js/velocity-decomp.js index.html styles.css
git commit -m "add live velocity decomposition demo"
```

---

## Task 6: UX polish — sticky nav, dark mode, anchor hygiene

**Files:**
- Modify: `index.html` (add nav, add IDs to existing sections, fix placeholder link text)
- Modify: `styles.css` (nav styles + dark-mode override block)

- [ ] **Step 6.1: Add a sticky section nav to `index.html`**

Insert just after `<main class="page">` and before `<header class="hero" id="top">`:

```html
<nav class="page-nav" aria-label="Section navigation">
  <a href="#top">Top</a>
  <a href="#tldr">TL;DR</a>
  <a href="#concentration">Geometry</a>
  <a href="#motivation">Motivation</a>
  <a href="#method">Method</a>
  <a href="#results">Results</a>
  <a href="#citation">Cite</a>
  <button id="theme-toggle" class="page-nav-btn" aria-label="Toggle dark mode" title="Toggle dark mode">🌙</button>
</nav>
```

- [ ] **Step 6.2: Append nav and dark-mode styles to `styles.css`**

```css
/* Sticky section nav */
html { scroll-padding-top: 64px; }
.section, .hero { scroll-margin-top: 64px; }
.page-nav {
  position: sticky; top: 0; z-index: 50;
  display: flex; flex-wrap: wrap; align-items: center;
  gap: 0.4rem 1rem;
  padding: 0.55rem 1rem;
  background: rgba(244, 247, 251, 0.92);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid var(--line);
  margin: -2.4rem -1rem 1rem;
  font-size: 0.88rem;
}
.page-nav a {
  color: var(--muted); text-decoration: none; font-weight: 500;
  padding: 0.18rem 0.45rem; border-radius: 6px;
}
.page-nav a:hover { color: var(--ink); background: #e9eef7; }
.page-nav-btn {
  margin-left: auto;
  border: 1px solid var(--line); background: transparent;
  cursor: pointer; font: inherit; font-size: 1rem;
  padding: 0.15rem 0.5rem; border-radius: 999px;
}
.page-nav-btn:hover { background: #e9eef7; }

/* Dark mode */
:root.dark {
  --bg: #0b1220;
  --paper: #111a2b;
  --ink: #e2e8f0;
  --muted: #94a3b8;
  --line: #1f2a44;
  --accent: #60a5fa;
}
:root.dark body { background: var(--bg); color: var(--ink); }
:root.dark .hero, :root.dark .section { box-shadow: 0 6px 18px rgba(0, 0, 0, 0.35); }
:root.dark .contrib-box,
:root.dark .equation-display,
:root.dark .hero-anim-controls,
:root.dark .conc-controls,
:root.dark .vel-demo { background: #0f172a; }
:root.dark .conc-fig canvas,
:root.dark .hero-anim-plot canvas,
:root.dark .vel-canvas-wrap canvas,
:root.dark .hero-anim-canvas { background: #0b1220; }
:root.dark .page-nav { background: rgba(11, 18, 32, 0.92); }
:root.dark .links a { background: #1e293b; border-color: #1e293b; }
:root.dark .links a:hover { background: #334155; border-color: #334155; }
:root.dark .venue { background: rgba(96, 165, 250, 0.18); color: var(--accent); }
:root.dark code, :root.dark pre { background: #0f172a; color: #e2e8f0; }
:root.dark th, :root.dark td { border-color: var(--line); }
:root.dark .ours { background: rgba(96, 165, 250, 0.10); }
:root.dark .improve { color: #4ade80; }
```

- [ ] **Step 6.3: Add the dark-mode toggle script to `index.html`**

Add inside the existing inline module script (before the imports work):

Actually, add a separate small inline script just before the existing module script:

```html
<script>
  (function () {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    }
    document.addEventListener('DOMContentLoaded', () => {
      const btn = document.getElementById('theme-toggle');
      if (!btn) return;
      const sync = () => {
        const dark = document.documentElement.classList.contains('dark');
        btn.textContent = dark ? '☀️' : '🌙';
      };
      sync();
      btn.addEventListener('click', () => {
        document.documentElement.classList.toggle('dark');
        const dark = document.documentElement.classList.contains('dark');
        localStorage.setItem('theme', dark ? 'dark' : 'light');
        sync();
      });
    });
  })();
</script>
```

- [ ] **Step 6.4: Verify scrollability and anchors**

Reload. Expected:
- A blurred sticky nav sits at the top of the page on scroll.
- Clicking each link jumps smoothly to that section.
- A 🌙 button in the nav toggles dark mode; the page background turns navy, text turns light, plot canvases turn dark. Page refresh preserves the choice via localStorage.
- No layout regressions in light mode.

- [ ] **Step 6.5: Commit**

```bash
git add index.html styles.css
git commit -m "add sticky section nav and dark mode"
```

---

## Task 7: Final pass — disabled-link styling, screenshot, README

**Files:**
- Modify: `index.html` (give the placeholder `#` links a disabled appearance until URLs are filled in)
- Modify: `styles.css` (add `.links a.todo` styling)

- [ ] **Step 7.1: Mark placeholder links in `index.html`**

Change the three hero links to:

```html
<a href="#" class="todo" aria-disabled="true" title="Coming soon">Paper</a>
<a href="#" class="todo" aria-disabled="true" title="Coming soon">arXiv</a>
<a href="#" class="todo" aria-disabled="true" title="Coming soon">Code</a>
```

- [ ] **Step 7.2: Append `.todo` style to `styles.css`**

```css
.links a.todo {
  background: transparent; color: var(--muted); border-color: var(--line);
  cursor: not-allowed; opacity: 0.7;
}
.links a.todo::after { content: ' (soon)'; font-weight: 400; font-size: 0.78rem; opacity: 0.75; }
```

- [ ] **Step 7.3: Verify**

Reload. Expected: the three buttons show muted styling and a "(soon)" suffix; hovering shows the not-allowed cursor.

- [ ] **Step 7.4: Commit**

```bash
git add index.html styles.css
git commit -m "mark placeholder links as todo until URLs ready"
```

---

## Final Verification Checklist

Before declaring complete:
- [ ] Browser console shows zero errors and zero warnings (other than MathJax's normal info).
- [ ] On a 1440px-wide desktop browser, the hero animation grid is two columns; on 800px or below it collapses to one column.
- [ ] The 3D scene auto-rotates and the moving dots ping-pong between endpoints with the side plots' markers tracking them.
- [ ] The Pause button stops motion; the t slider scrubs the whole hero (sphere + plots) in lockstep.
- [ ] The concentration slider re-renders both panels in real time across the full d range.
- [ ] The velocity decomposition pauses when scrolled off-screen and resumes when it returns.
- [ ] Dark mode is readable and consistent (no white plot backgrounds left over).
- [ ] All section anchors in the sticky nav scroll smoothly to the right place.

---

## Notes for the engineer

- **No build step.** Three.js is loaded as an ES module from esm.sh — `<script type="module">` is required.
- **No tests.** This is a visual static site; correctness is verified in the browser per the steps above.
- **Math intentionally simplified, but ω = π/2.** The 2D toys all use ω = π/2 between the two endpoints. This matches the expected angle between two i.i.d. unit-sphere points in high d, and makes the linear-path endpoint radial share exactly sin²(ω/2) = 0.5 — the ~50% the paper reports for FLUX.2 and VA-VAE in Figure 4. Don't change ω without recomputing the y-axis caption claims.
- **Performance.** All animations use `requestAnimationFrame` + `IntersectionObserver` so off-screen vizzes don't burn CPU.
- **GitHub Pages compatibility.** Pure static HTML/CSS/JS, all paths relative, no server-side requirements.

### Implementation conventions for all three Canvas2D modules

These apply equally to `hero-plots.js`, `concentration-demo.js`, and `velocity-decomp.js`. The plan's code blocks show the intended drawing logic; apply these conventions on top of them:

1. **Don't reinitialize the canvas every frame.** `setupCanvas` (DPR scaling + `canvas.width` assignment) must run on `init` and on `resize` only — not inside the `requestAnimationFrame` loop. Cache `{ ctx, w, h }` on the module's local state and read it inside `draw()`. Triggering `canvas.width = N` reallocates the backing buffer; doing that at 60 fps causes visible jank on low-power devices.

2. **Read theme colors from CSS variables, not hard-coded hex.** At the top of each module add:

   ```javascript
   function themeColors() {
     const css = getComputedStyle(document.documentElement);
     const v = (name, fallback) => (css.getPropertyValue(name).trim() || fallback);
     return {
       ink:    v('--ink',    '#101828'),
       muted:  v('--muted',  '#475467'),
       line:   v('--line',   '#e4e7ec'),
       accent: v('--accent', '#2563eb'),
       danger: '#dc2626',
     };
   }
   ```

   Recompute on init, on resize, and on a `theme:changed` custom event that the dark-mode toggle dispatches. Pass the cached `colors` object into draw functions instead of inline `#101828`/`#475467` literals. In dark mode `--ink` and `--muted` flip to light values, so plots stay readable.

3. **Dispatch `theme:changed` from the toggle.** In the dark-mode toggle script (Step 6.3), after `document.documentElement.classList.toggle('dark')`, add:

   ```javascript
   window.dispatchEvent(new CustomEvent('theme:changed'));
   ```

   Each viz module listens for it and re-renders.

4. **Honor `prefers-reduced-motion`.** At the top of each animated module:

   ```javascript
   const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
   ```

   If true, render a single static frame (t = 0.5 for the hero, t = 0.25 for the velocity demo) and skip the animation loop. The slider and pause button still work.

5. **3D hero — angle is built-in.** With the `endpoints()` rewrite that places `z0` and `z1` in an orthonormal `(e1, e2)` plane, the angle between them is exactly `OMEGA` by construction. `slerpVec` keeps using the module-level `OMEGA`; do not renormalize after construction.
