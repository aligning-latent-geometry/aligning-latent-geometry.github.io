// hero-sphere.js — Three.js scene: sphere shell with two endpoints, a linear chord
// that visibly cuts through the interior, and a slerp arc that hugs the surface.
// Drives the side-panel plots via a shared t ∈ [0,1] scrubber.

import * as THREE from 'https://esm.sh/three@0.160.0';
import { OrbitControls } from 'https://esm.sh/three@0.160.0/examples/jsm/controls/OrbitControls.js';

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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
  controls.autoRotate = !reduceMotion; controls.autoRotateSpeed = 0.7;

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
  let playing = !reduceMotion;
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
  setT(reduceMotion ? 0.5 : 0);

  tInput?.addEventListener('input', () => {
    playing = false;
    if (toggle) { toggle.textContent = '▶ Play'; toggle.setAttribute('aria-pressed', 'false'); }
    setT(parseInt(tInput.value, 10) / 1000);
  });

  if (toggle) {
    toggle.textContent = playing ? '⏸ Pause' : '▶ Play';
    toggle.setAttribute('aria-pressed', String(playing));
  }

  toggle?.addEventListener('click', () => {
    if (reduceMotion) return;
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
    if (!onScreen || reduceMotion) return;
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
  if (!reduceMotion) requestAnimationFrame(loop);
  else {
    controls.update();
    renderer.render(scene, camera);
  }

  return { setT };
}
