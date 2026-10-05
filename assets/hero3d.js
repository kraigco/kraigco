// @ts-check
/**
 * Home hero scene: glassy, iridescent nodes linked by thin lines, with small
 * pulses travelling along the links like automations firing.
 * Rendering only; hero.js decides when it runs and tears it down.
 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

/**
 * @typedef {object} HeroScene
 * @property {(x: number, y: number) => void} setPointer  Pointer position, each axis -1..1.
 * @property {(p: number) => void} setProgress            Scroll progress through the hero, 0..1.
 * @property {() => void} start                           Start the render loop.
 * @property {() => void} stop                            Stop the render loop.
 * @property {() => void} renderOnce                      Draw a single frame (reduced motion).
 * @property {() => void} destroy                         Release every GPU resource and the context.
 */

/** @typedef {{ nodes?: number, pulses?: number, maxDpr?: number }} HeroOptions */

const ACCENT = 0x39ff88;
const CYAN = 0x22d3ee;
const BASE_SCALE = 1.3; // world size of the network before scroll scaling

/** Seeded generator, so the network has the same layout on every load. @param {number} seed */
const rng = seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647;

/** Soft round sprite for the pulses, drawn once (no image file). */
function makeSprite() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = /** @type {CanvasRenderingContext2D} */ (c.getContext('2d'));
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.3, 'rgba(185,255,214,0.9)');
  grad.addColorStop(1, 'rgba(57,255,136,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * @param {HTMLCanvasElement} canvas
 * @param {HeroOptions} [opts]
 * @returns {HeroScene}
 */
export function createHeroScene(canvas, opts = {}) {
  const { nodes = 40, pulses = 28, maxDpr = 2 } = opts;
  const deviceDpr = window.devicePixelRatio || 1;

  // Throws when no WebGL context can be created; hero.js falls back then.
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: deviceDpr < 1.5, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(deviceDpr, maxDpr));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const envTarget = pmrem.fromScene(room, 0.04);
  scene.environment = envTarget.texture;
  room.dispose();
  pmrem.dispose();

  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 50);
  camera.position.set(0, 0, 6);

  const group = new THREE.Group();
  scene.add(group);

  // Nodes inside an ellipsoid (radii 1.2 / 0.8 / 1).
  const rand = rng(20261006);
  /** @type {THREE.Vector3[]} */
  const points = [];
  while (points.length < nodes) {
    const x = rand() * 2 - 1, y = rand() * 2 - 1, z = rand() * 2 - 1;
    if (x * x + y * y + z * z <= 1) points.push(new THREE.Vector3(x * 1.2, y * 0.8, z));
  }
  const nodeGeo = new THREE.IcosahedronGeometry(1, 3);
  const nodeMat = new THREE.MeshPhysicalMaterial({
    color: 0x0f2a1c, metalness: 0.1, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.1,
    iridescence: 1, iridescenceIOR: 1.3, iridescenceThicknessRange: [100, 800],
    emissive: ACCENT, emissiveIntensity: 0.15,
  });
  const nodeMesh = new THREE.InstancedMesh(nodeGeo, nodeMat, nodes);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sv = new THREE.Vector3();
  points.forEach((p, i) => {
    const s = (0.6 + rand() * 0.8) * 0.045;
    nodeMesh.setMatrixAt(i, m4.compose(p, q, sv.set(s, s, s)));
  });
  nodeMesh.instanceMatrix.needsUpdate = true;
  group.add(nodeMesh);

  // Links: each node to its 3 nearest neighbours, deduplicated.
  /** @type {Array<[number, number]>} */
  const links = [];
  const seen = new Set();
  points.forEach((a, i) => {
    points.map((b, j) => ({ j, d: a.distanceToSquared(b) }))
      .sort((m, n) => m.d - n.d).slice(1, 4)
      .forEach(({ j }) => {
        const key = i < j ? `${i}-${j}` : `${j}-${i}`;
        if (!seen.has(key)) { seen.add(key); links.push([i, j]); }
      });
  });
  const linePos = new Float32Array(links.length * 6);
  links.forEach(([i, j], n) => { points[i].toArray(linePos, n * 6); points[j].toArray(linePos, n * 6 + 3); });
  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute('position', new THREE.BufferAttribute(linePos, 3));
  const lineMat = new THREE.LineBasicMaterial({ color: ACCENT, transparent: true, opacity: 0.22, depthWrite: false });
  group.add(new THREE.LineSegments(lineGeo, lineMat));

  // Pulses travelling along random links.
  const sprite = makeSprite();
  const pulsePos = new Float32Array(pulses * 3);
  const pulseState = Array.from({ length: pulses }, () => ({ link: Math.floor(rand() * links.length), t: rand(), speed: 0.25 + rand() * 0.35 }));
  const pulseGeo = new THREE.BufferGeometry();
  const pulseAttr = new THREE.BufferAttribute(pulsePos, 3);
  pulseGeo.setAttribute('position', pulseAttr);
  const pulseMat = new THREE.PointsMaterial({
    color: 0xb9ffd6, size: 0.09, map: sprite, transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending, sizeAttenuation: true,
  });
  group.add(new THREE.Points(pulseGeo, pulseMat));

  // Two coloured lights orbiting at different speeds make the iridescence shift.
  scene.add(new THREE.AmbientLight(0xffffff, 0.25));
  const green = new THREE.PointLight(ACCENT, 30, 0, 2);
  const cyan = new THREE.PointLight(CYAN, 30, 0, 2);
  scene.add(green, cyan);

  let progress = 0, pointerX = 0, pointerY = 0, tiltX = 0, tiltY = 0, spin = 0, time = 0;
  let running = false, raf = 0, last = 0;
  const tmp = new THREE.Vector3();

  /** Advance the animation by dt seconds. @param {number} dt */
  function step(dt) {
    time += dt;
    const ease = 1 - Math.exp(-dt * 4);
    tiltX += (pointerY * 0.25 - tiltX) * ease;
    tiltY += (pointerX * 0.35 - tiltY) * ease;
    spin += dt * 0.12 * (1 + 2 * progress);
    group.rotation.set(tiltX, spin + tiltY, 0);
    group.scale.setScalar(BASE_SCALE * (1 + 0.6 * progress));
    group.position.z = 1.8 * progress;

    pulseState.forEach((pu, n) => {
      pu.t += dt * pu.speed;
      if (pu.t >= 1) { pu.t -= 1; pu.link = Math.floor(rand() * links.length); }
      const [i, j] = links[pu.link];
      tmp.lerpVectors(points[i], points[j], pu.t).toArray(pulsePos, n * 3);
    });
    pulseAttr.needsUpdate = true;

    green.position.set(Math.cos(time * 0.5) * 3, 1.2, Math.sin(time * 0.5) * 3);
    cyan.position.set(Math.cos(-time * 0.35) * 3.5, -1, Math.sin(-time * 0.35) * 3.5);
  }

  /** @param {number} now */
  function loop(now) {
    if (!running) return;
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    step(dt);
    renderer.render(scene, camera);
    raf = requestAnimationFrame(loop);
  }

  // Keep the canvas the size of the hero; centre the network at 72% of the width on
  // wide canvases (the copy sits on the left) and at 50% on narrow ones.
  const host = canvas.parentElement || canvas;
  function resize() {
    const w = host.clientWidth, h = host.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.setViewOffset(w, h, w >= 810 ? -0.22 * w : 0, 0, w, h);
    camera.updateProjectionMatrix();
    if (!running) renderer.render(scene, camera);
  }
  const ro = new ResizeObserver(resize);
  ro.observe(host);
  resize();

  return {
    setPointer(x, y) { pointerX = Math.max(-1, Math.min(1, x)); pointerY = Math.max(-1, Math.min(1, y)); },
    setProgress(p) { progress = Math.max(0, Math.min(1, p)); },
    start() {
      if (running) return;
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(loop);
    },
    stop() { running = false; cancelAnimationFrame(raf); },
    renderOnce() { step(0); renderer.render(scene, camera); },
    destroy() {
      running = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      nodeMesh.dispose();
      nodeGeo.dispose(); nodeMat.dispose();
      lineGeo.dispose(); lineMat.dispose();
      pulseGeo.dispose(); pulseMat.dispose(); sprite.dispose();
      envTarget.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}
