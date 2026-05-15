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
