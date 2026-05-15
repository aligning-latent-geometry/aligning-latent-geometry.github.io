// swap-demo.js — interactive decoder-asymmetry demo.
// Cycles through paired latents, swapping panel images each step, and
// pulses a highlight that pairs (anchor, rad-swap) then (dir-swap, neighbor).
// Source frames: assets/swaps/ex{0..N-1}_{anchor,rad_swap,dir_swap,neighbor}.jpg

const NUM_EXAMPLES = 4;
const KEYS = ['anchor', 'rad_swap', 'dir_swap', 'neighbor'];
const STEP_MS = 3200;   // half-cycle: highlight one pair this long

export function initSwapDemo(rootSelector = '#swap-demo') {
  const root = document.querySelector(rootSelector);
  if (!root) return;

  const panels = KEYS.map((k) => root.querySelector(`[data-panel="${k}"]`));
  const imgs = panels.map((p) => p?.querySelector('img'));
  if (panels.some((p) => !p) || imgs.some((i) => !i)) return;

  const caption = root.querySelector('[data-swap-caption]');
  const toggle = root.querySelector('[data-swap-toggle]');

  // Preload all frames so swaps are instant.
  const preload = [];
  for (let e = 0; e < NUM_EXAMPLES; e++) {
    for (const k of KEYS) {
      const img = new Image();
      img.src = `assets/swaps/ex${e}_${k}.jpg`;
      preload.push(img);
    }
  }

  let exIdx = 0;
  let phase = 0; // 0 = pair (anchor, rad_swap); 1 = pair (dir_swap, neighbor)

  function setExample(e) {
    for (let i = 0; i < KEYS.length; i++) {
      imgs[i].src = `assets/swaps/ex${e}_${KEYS[i]}.jpg`;
      imgs[i].alt = `Example ${e + 1} ${KEYS[i].replace('_', ' ')}`;
    }
  }

  function applyPhase(p) {
    const pairA = p === 0 ? ['anchor', 'rad_swap'] : ['dir_swap', 'neighbor'];
    panels.forEach((panel) => {
      const k = panel.dataset.panel;
      panel.classList.toggle('is-paired', pairA.includes(k));
    });
    if (caption) {
      caption.textContent = p === 0
        ? 'Same direction as anchor → decoder reads it as the anchor.'
        : 'Same direction as neighbor → decoder reads it as the neighbor.';
    }
  }

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let playing = !prefersReducedMotion;
  let timer = null;

  function syncToggle() {
    if (!toggle) return;
    toggle.textContent = playing ? 'Pause' : 'Play';
    toggle.setAttribute('aria-pressed', String(playing));
  }

  function advance() {
    if (phase === 0) {
      phase = 1;
    } else {
      phase = 0;
      exIdx = (exIdx + 1) % NUM_EXAMPLES;
      setExample(exIdx);
    }
    applyPhase(phase);
  }

  function start() {
    stop();
    if (!playing) return;
    timer = setInterval(advance, STEP_MS);
  }
  function stop() {
    if (timer) { clearInterval(timer); timer = null; }
  }

  // Pause when off-screen
  let onScreen = false;
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      onScreen = e.isIntersecting;
      if (onScreen && playing) start(); else stop();
    });
  }, { threshold: 0.1 });
  io.observe(root);

  toggle?.addEventListener('click', () => {
    playing = !playing;
    syncToggle();
    if (playing && onScreen) start(); else stop();
  });

  // Initial state
  setExample(exIdx);
  applyPhase(phase);
  syncToggle();
}
