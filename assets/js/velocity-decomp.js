// velocity-decomp.js — 2D demo: a token on a linear chord between two shell points;
// at each frame, draw its position, velocity, radial component, tangential component.
// Updates a bar with the instantaneous radial energy share.

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

const R = 150;             // pixel radius of shell circle
// ω = π/2 matches the expected angle between two i.i.d. shell points in high d, and
// gives endpoint radial share = sin²(ω/2) = 0.5 — the ~50% in the paper's Figure 4.
const OMEGA = Math.PI / 2;
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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
    const colors = themeColors();
    const { ctx, w, h } = setupCanvas(canvas);
    const cx = w / 2, cy = h / 2;
    ctx.clearRect(0, 0, w, h);

    // Background guides
    ctx.save();
    ctx.strokeStyle = colors.line; ctx.lineWidth = 1;
    // Axes
    ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(w, cy);
    ctx.moveTo(cx, 0); ctx.lineTo(cx, h); ctx.stroke();
    // Shell circle
    ctx.beginPath();
    ctx.strokeStyle = colors.muted; ctx.setLineDash([4, 3]);
    ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // Slerp arc (dashed blue, for reference)
    ctx.save();
    ctx.strokeStyle = colors.accent; ctx.globalAlpha = 0.5; ctx.lineWidth = 2; ctx.setLineDash([5, 4]);
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
    ctx.strokeStyle = colors.danger; ctx.globalAlpha = 0.4; ctx.lineWidth = 1.5; ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(cx + z0.x, cy - z0.y); ctx.lineTo(cx + z1.x, cy - z1.y);
    ctx.stroke();
    ctx.restore();

    // Endpoints
    ctx.fillStyle = colors.ink;
    [z0, z1].forEach(p => {
      ctx.beginPath(); ctx.arc(cx + p.x, cy - p.y, 6, 0, Math.PI * 2); ctx.fill();
    });

    // Current position on linear path
    const zt = { x: (1 - t) * z0.x + t * z1.x, y: (1 - t) * z0.y + t * z1.y };
    const ztNorm = Math.hypot(zt.x, zt.y);
    // Origin->z_t (radial direction)
    ctx.save();
    ctx.strokeStyle = colors.muted; ctx.setLineDash([2, 3]); ctx.lineWidth = 1;
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
    arrow(ctx, ox, oy, u.x * VEL_SCALE, -u.y * VEL_SCALE, colors.muted, 2);   // full u (gray)
    arrow(ctx, ox, oy, uRad.x * VEL_SCALE, -uRad.y * VEL_SCALE, colors.danger, 3);
    arrow(ctx, ox, oy, uTan.x * VEL_SCALE, -uTan.y * VEL_SCALE, colors.accent, 3);

    // Token marker
    ctx.fillStyle = colors.ink;
    ctx.beginPath(); ctx.arc(ox, oy, 6, 0, Math.PI * 2); ctx.fill();

    // Radial share bar
    const radShare = (radCoef * radCoef) / uNorm2;
    if (barFill) barFill.style.width = `${(radShare * 100).toFixed(1)}%`;
    if (barVal) barVal.textContent = `${(radShare * 100).toFixed(0)}%`;

    // Labels
    ctx.fillStyle = colors.muted; ctx.font = '12px Inter, sans-serif';
    ctx.fillText('z_0', cx + z0.x - 22, cy - z0.y + 4);
    ctx.fillText('z_1', cx + z1.x + 8,  cy - z1.y + 4);
    ctx.fillText('origin', cx + 6, cy - 6);
    ctx.fillStyle = colors.muted;
    ctx.fillText('shell', cx + R - 36, cy - 6);
    // Velocity legend
    const lx = 12, ly = 18;
    ctx.fillStyle = colors.muted; ctx.fillText('— u (total velocity)', lx, ly);
    ctx.fillStyle = colors.danger; ctx.fillText('— u_radial (wasted)', lx, ly + 14);
    ctx.fillStyle = colors.accent; ctx.fillText('— u_tangential (used)', lx, ly + 28);
  }

  // IntersectionObserver — only animate when on-screen
  let onScreen = false;
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { onScreen = e.isIntersecting; });
  }, { threshold: 0.05 });
  io.observe(canvas);

  function tick(now) {
    requestAnimationFrame(tick);
    if (!onScreen || reduceMotion) return;
    let tt = ((now / PERIOD) % 2);
    if (tt > 1) tt = 2 - tt;
    draw(tt);
  }
  draw(0.25);
  if (!reduceMotion) requestAnimationFrame(tick);

  window.addEventListener('resize', () => draw(0.25));
  window.addEventListener('theme:changed', () => draw(0.25));
}
