// hero-sphere.js — paired Three.js scenes for the opening four-part comparison.
// Panel 1 shows a thin shell: points have radii in a narrow band, and linear
// interpolation cuts through that band. Panel 2 shows the fixed-radius sphere
// after projection, with slerp staying on the surface.

import * as THREE from 'https://esm.sh/three@0.160.0';
import { OrbitControls } from 'https://esm.sh/three@0.160.0/examples/jsm/controls/OrbitControls.js';

const R = 2.0;
const OMEGA = Math.PI / 2;
const SHELL_HALF_WIDTH = 0.22;
const COLORS = {
  shell: 0x93a8bd,
  sphere: 0x9db2c8,
  noise: 0x0f172a,
  data: 0x0f766e,
  linear: 0xc2413a,
  slerp: 0x256fb3,
};

function setupRenderer(container) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  const width = Math.max(1, container.clientWidth);
  const height = Math.max(1, container.clientHeight);
  renderer.setPixelRatio(window.devicePixelRatio || 1);
  renderer.setSize(width, height, false);
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';
  container.appendChild(renderer.domElement);
  return renderer;
}

function sampleDirection() {
  let x, y, s;
  do {
    x = Math.random() * 2 - 1;
    y = Math.random() * 2 - 1;
    s = x * x + y * y;
  } while (s >= 1);
  const f = 2 * Math.sqrt(1 - s);
  return new THREE.Vector3(x * f, y * f, 1 - 2 * s);
}

function makeSharedSamples(n = 900) {
  const dirs = [];
  const radii = [];
  for (let i = 0; i < n; i++) {
    dirs.push(sampleDirection());
    radii.push(R - SHELL_HALF_WIDTH + Math.random() * SHELL_HALF_WIDTH * 2);
  }
  return { dirs, radii };
}

function makeCloudPoints(samples, mode) {
  const n = samples.dirs.length;
  const positions = new Float32Array(n * 3);
  const colors = new Float32Array(n * 3);
  const innerColor = new THREE.Color(0x5b7188);
  const outerColor = new THREE.Color(0x0f766e);
  for (let i = 0; i < n; i++) {
    const dir = samples.dirs[i];
    const r = mode === 'shell' ? samples.radii[i] : R;
    const bandT = (samples.radii[i] - (R - SHELL_HALF_WIDTH)) / (SHELL_HALF_WIDTH * 2);
    positions[i * 3] = dir.x * r;
    positions[i * 3 + 1] = dir.y * r;
    positions[i * 3 + 2] = dir.z * r;
    const c = innerColor.clone().lerp(outerColor, bandT);
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const mat = new THREE.PointsMaterial({
    size: mode === 'shell' ? 0.058 : 0.056,
    vertexColors: true,
    transparent: true,
    opacity: mode === 'shell' ? 0.86 : 0.94,
    depthTest: false,
    depthWrite: false,
  });
  const points = new THREE.Points(geo, mat);
  points.renderOrder = 10;
  return points;
}

function makeWireSphere(radius, color, opacity = 0.24) {
  const geo = new THREE.SphereGeometry(radius, 36, 18);
  const mat = new THREE.MeshBasicMaterial({ color, wireframe: true, transparent: true, opacity });
  return new THREE.Mesh(geo, mat);
}

function makeShellBand() {
  const geo = new THREE.SphereGeometry(R, 44, 22);
  const mat = new THREE.MeshBasicMaterial({ color: COLORS.shell, transparent: true, opacity: 0.035, depthWrite: false });
  return new THREE.Mesh(geo, mat);
}

function makeSurfaceSphere() {
  const geo = new THREE.SphereGeometry(R, 42, 22);
  const mat = new THREE.MeshBasicMaterial({ color: COLORS.sphere, transparent: true, opacity: 0.025, depthWrite: false });
  return new THREE.Mesh(geo, mat);
}

function makeEquator(radius, color, opacity = 0.32) {
  const pts = [];
  for (let i = 0; i <= 96; i++) {
    const a = (i / 96) * Math.PI * 2;
    pts.push(new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius));
  }
  return lineGeom(pts, color, opacity, true, 0.04, 0.04);
}

function endpointDirections() {
  const e1 = new THREE.Vector3(1, 0, 0);
  const e2 = new THREE.Vector3(0, 0.55, 0.835).normalize();
  const a = OMEGA / 2;
  return {
    noiseDir: e1.clone().multiplyScalar(Math.cos(-a)).addScaledVector(e2, Math.sin(-a)).normalize(),
    dataDir: e1.clone().multiplyScalar(Math.cos(a)).addScaledVector(e2, Math.sin(a)).normalize(),
  };
}

function endpoints() {
  const { noiseDir, dataDir } = endpointDirections();
  return {
    noiseShell: noiseDir.clone().multiplyScalar(R + SHELL_HALF_WIDTH * 0.72),
    dataShell: dataDir.clone().multiplyScalar(R - SHELL_HALF_WIDTH * 0.48),
    noiseSphere: noiseDir.clone().multiplyScalar(R),
    dataSphere: dataDir.clone().multiplyScalar(R),
  };
}

function slerpVec(a, b, t) {
  const ah = a.clone().normalize();
  const bh = b.clone().normalize();
  const omega = Math.acos(Math.max(-1, Math.min(1, ah.dot(bh))));
  const sinOmega = Math.sin(omega);
  const s0 = Math.sin((1 - t) * omega) / sinOmega;
  const s1 = Math.sin(t * omega) / sinOmega;
  return ah.multiplyScalar(s0 * R).addScaledVector(bh, s1 * R);
}

function lerpVec(a, b, t) {
  return new THREE.Vector3(
    (1 - t) * a.x + t * b.x,
    (1 - t) * a.y + t * b.y,
    (1 - t) * a.z + t * b.z
  );
}

function lineGeom(points, color, opacity = 1, dashed = false, dashSize = 0.075, gapSize = 0.045) {
  const geo = new THREE.BufferGeometry().setFromPoints(points);
  const mat = dashed
    ? new THREE.LineDashedMaterial({ color, dashSize, gapSize, transparent: true, opacity })
    : new THREE.LineBasicMaterial({ color, transparent: true, opacity });
  const line = new THREE.Line(geo, mat);
  if (dashed) line.computeLineDistances();
  return line;
}

function makeMarkerSprite(color, size = 0.36) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 128, 128);
  ctx.beginPath();
  ctx.arc(64, 64, 48, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.lineWidth = 8;
  ctx.strokeStyle = '#ffffff';
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(64, 64, 34, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.lineWidth = 5;
  ctx.strokeStyle = '#0f172a';
  ctx.stroke();
  const texture = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false, depthWrite: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(size, size, size);
  sprite.renderOrder = 30;
  return sprite;
}

function makeMovingDot(color, radius = 0.105) {
  const geo = new THREE.SphereGeometry(radius, 22, 16);
  const mat = new THREE.MeshBasicMaterial({ color, depthTest: false, depthWrite: false });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.renderOrder = 20;
  return mesh;
}

function addEndpoint(scene, position, color) {
  const marker = makeMarkerSprite(color);
  marker.position.copy(position);
  scene.add(marker);
  return marker;
}

function setTopCamera(camera, width) {
  const y = width < 520 ? 7.15 : 6.35;
  const z = width < 520 ? 1.2 : 0.95;
  camera.position.set(0.08, y, z);
  camera.lookAt(0, 0, 0);
}

function makeScene(container, mode, pts, samples, opts = {}) {
  const loading = container.querySelector('.hero-anim-loading');
  if (loading) loading.remove();

  const width = Math.max(1, container.clientWidth);
  const height = Math.max(1, container.clientHeight);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 100);
  setTopCamera(camera, width);

  const renderer = setupRenderer(container);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.minDistance = 4;
  controls.maxDistance = 8;
  controls.autoRotate = !opts.reducedMotion;
  controls.autoRotateSpeed = 0.35;

  if (mode === 'linear') {
    scene.add(makeShellBand());
    scene.add(makeWireSphere(R, COLORS.shell, 0.08));
    scene.add(makeEquator(R, COLORS.shell, 0.24));
    scene.add(makeCloudPoints(samples, 'shell'));
    addEndpoint(scene, pts.noiseShell, COLORS.noise);
    addEndpoint(scene, pts.dataShell, COLORS.data);
    scene.add(lineGeom([pts.noiseShell, pts.dataShell], COLORS.linear, 0.95, true));
  } else {
    scene.add(makeSurfaceSphere());
    scene.add(makeWireSphere(R, COLORS.sphere, 0.16));
    scene.add(makeEquator(R, COLORS.sphere, 0.28));
    scene.add(makeCloudPoints(samples, 'sphere'));
    addEndpoint(scene, pts.noiseSphere, COLORS.noise);
    addEndpoint(scene, pts.dataSphere, COLORS.data);
    const arcPts = [];
    for (let i = 0; i <= 80; i++) arcPts.push(slerpVec(pts.noiseSphere, pts.dataSphere, i / 80));
    scene.add(lineGeom(arcPts, COLORS.slerp, 1, false));
  }

  const moving = makeMovingDot(mode === 'linear' ? COLORS.linear : COLORS.slerp, 0.105);
  moving.position.copy(mode === 'linear' ? pts.noiseShell : pts.noiseSphere);
  scene.add(moving);

  function update(t) {
    moving.position.copy(
      mode === 'linear'
        ? lerpVec(pts.noiseShell, pts.dataShell, t)
        : slerpVec(pts.noiseSphere, pts.dataSphere, t)
    );
  }

  function resize() {
    const width = Math.max(1, container.clientWidth);
    const height = Math.max(1, container.clientHeight);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    setTopCamera(camera, width);
    camera.updateProjectionMatrix();
    controls.update();
  }

  function render() {
    controls.update();
    renderer.render(scene, camera);
  }

  resize();

  return { container, update, resize, render };
}

export function initHeroSphere(linearSel, slerpSel, opts) {
  const linearContainer = document.querySelector(linearSel);
  const slerpContainer = document.querySelector(slerpSel);
  if (!linearContainer || !slerpContainer) return null;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const pts = endpoints();
  const samples = makeSharedSamples(900);
  const linearScene = makeScene(linearContainer, 'linear', pts, samples, { reducedMotion: prefersReducedMotion });
  const slerpScene = makeScene(slerpContainer, 'slerp', pts, samples, { reducedMotion: prefersReducedMotion });
  const scenes = [linearScene, slerpScene];

  let t = prefersReducedMotion ? 0.5 : 0;
  let playing = !prefersReducedMotion;
  let lastFrame = performance.now();
  const PERIOD_MS = 5500;

  const tInput = document.querySelector('#hero-anim-t');
  const tVal = document.querySelector('#hero-anim-t-val');
  const toggle = document.querySelector('#hero-anim-toggle');
  if (toggle && !playing) {
    toggle.textContent = 'Play';
    toggle.setAttribute('aria-pressed', 'false');
  }

  function setT(newT) {
    t = Math.max(0, Math.min(1, newT));
    scenes.forEach(scene => scene.update(t));
    if (tInput) tInput.value = String(Math.round(t * 1000));
    if (tVal) tVal.textContent = t.toFixed(2);
    if (opts && typeof opts.onT === 'function') opts.onT(t);
  }

  tInput?.addEventListener('input', () => {
    playing = false;
    if (toggle) {
      toggle.textContent = 'Play';
      toggle.setAttribute('aria-pressed', 'false');
    }
    setT(parseInt(tInput.value, 10) / 1000);
  });

  toggle?.addEventListener('click', () => {
    playing = !playing;
    if (toggle) {
      toggle.textContent = playing ? 'Pause' : 'Play';
      toggle.setAttribute('aria-pressed', String(playing));
    }
    lastFrame = performance.now();
  });

  window.addEventListener('resize', () => scenes.forEach(scene => scene.resize()));

  let onScreen = true;
  const io = new IntersectionObserver((entries) => {
    onScreen = entries.some(entry => entry.isIntersecting);
  }, { threshold: 0.03 });
  scenes.forEach(scene => io.observe(scene.container));

  function loop(now) {
    requestAnimationFrame(loop);
    if (!onScreen) return;
    if (playing) {
      const phase = ((now / PERIOD_MS) % 2);
      setT(phase < 1 ? phase : 2 - phase);
    }
    lastFrame = now;
    scenes.forEach(scene => scene.render());
  }

  setT(0);
  requestAnimationFrame(loop);

  return { setT };
}
