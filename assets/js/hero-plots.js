// hero-plots.js — Canvas2D plots for the hero side panel.
// Exports an init() that wires up two canvases and returns an update(t) function.

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
function axes(ctx, opts, colors) {
  const { padL, padR, padT, padB, w, h, yMin, yMax, yTicks, yLabel, xLabel } = opts;
  ctx.save();
  ctx.strokeStyle = colors.line;
  ctx.fillStyle = colors.muted;
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
function legend(ctx, items, x, y, colors) {
  ctx.save();
  ctx.font = '11px Inter, sans-serif';
  let cy = y;
  items.forEach(([label, color, dashed]) => {
    ctx.strokeStyle = color; ctx.lineWidth = 2;
    if (dashed) ctx.setLineDash([5, 4]); else ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(x, cy); ctx.lineTo(x + 22, cy); ctx.stroke();
    ctx.fillStyle = colors.ink;
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
    const colors = themeColors();
    {
      const { ctx, w, h } = setupCanvas(cNorm);
      // With ω = π/2 and √d ≈ 5.66, the linear midpoint norm is √d/√2 ≈ 4.0; the
      // path then climbs back to √d at t=1. yMin=3.5 leaves a sliver of headroom.
      const opts = { padL: 44, padR: 14, padT: 14, padB: 28, w, h, yMin: 3.5, yMax: 6.5,
        yTicks: [4, 5, 6], yLabel: '‖z_t‖', xLabel: 't' };
      clear(ctx);
      axes(ctx, opts, colors);
      // shell reference
      ctx.save();
      ctx.strokeStyle = colors.muted; ctx.setLineDash([2, 3]); ctx.lineWidth = 1;
      const yRef = opts.padT + (1 - (SHELL - opts.yMin) / (opts.yMax - opts.yMin)) * (h - opts.padT - opts.padB);
      ctx.beginPath(); ctx.moveTo(opts.padL, yRef); ctx.lineTo(w - opts.padR, yRef); ctx.stroke();
      ctx.fillStyle = colors.muted;
      ctx.fillText('√d', w - opts.padR - 18, yRef - 4);
      ctx.restore();
      plotLine(ctx, data.ts, data.normLin, { ...opts, color: colors.danger });
      plotLine(ctx, data.ts, data.normSlerp, { ...opts, color: colors.accent });
      dot(ctx, t, data.normLin[Math.round(t * 200)], colors.danger, opts);
      dot(ctx, t, SHELL, colors.accent, opts);
      legend(ctx, [['linear', colors.danger, false], ['slerp', colors.accent, false]], w - opts.padR - 70, opts.padT + 8, colors);
    }
    {
      const { ctx, w, h } = setupCanvas(cRad);
      const opts = { padL: 44, padR: 14, padT: 14, padB: 28, w, h, yMin: 0, yMax: 1,
        yTicks: [0, 0.25, 0.5, 0.75, 1.0], yLabel: 'radial share', xLabel: 't' };
      clear(ctx);
      axes(ctx, opts, colors);
      plotLine(ctx, data.ts, data.radLin, { ...opts, color: colors.danger });
      plotLine(ctx, data.ts, data.radSlerp, { ...opts, color: colors.accent });
      dot(ctx, t, data.radLin[Math.round(t * 200)], colors.danger, opts);
      dot(ctx, t, 0, colors.accent, opts);
      legend(ctx, [['linear', colors.danger, false], ['slerp = 0', colors.accent, false]], w - opts.padR - 70, opts.padT + 8, colors);
    }
  }

  drawAll(0);
  window.addEventListener('resize', () => drawAll(lastT));
  window.addEventListener('theme:changed', () => drawAll(lastT));
  return { update: drawAll, data };
}
