// @ts-check
/**
 * Home hero entry point: picks the 3D scene or the static fallback and owns the
 * lifecycle (on-screen pausing, tab visibility, pointer, page hide / restore).
 * The hero copy never depends on any of this; it is visible without JS.
 */

const PHONE_QUERY = '(max-width: 809px)';

/** True when a WebGL context can be created; releases the probe context. */
function webglAvailable() {
  try {
    const probe = document.createElement('canvas');
    const gl = /** @type {WebGLRenderingContext | null} */ (probe.getContext('webgl2') || probe.getContext('webgl'));
    if (!gl) return false;
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return true;
  } catch {
    return false;
  }
}

/** @type {(() => void) | null} */
let teardown = null;

async function boot() {
  const hero = /** @type {HTMLElement | null} */ (document.querySelector('.kk-hero'));
  const canvas = /** @type {HTMLCanvasElement | null} */ (hero && hero.querySelector('.hero-canvas'));
  if (!hero || !canvas) return;
  const useFallback = () => hero.classList.add('no-webgl');
  if (!webglAvailable()) return useFallback();

  /** @type {import('./hero3d.js').HeroScene} */
  let scene;
  try {
    const { createHeroScene } = await import('./hero3d.js');
    const small = matchMedia(PHONE_QUERY).matches || (navigator.hardwareConcurrency || 8) <= 4;
    scene = createHeroScene(canvas, small ? { nodes: 24, pulses: 16, maxDpr: 1.5 } : {});
  } catch {
    return useFallback(); // CDN down, module error or context creation failed
  }
  hero.classList.remove('no-webgl');

  /** @type {Array<() => void>} */
  const cleanups = [() => scene.destroy()];

  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    scene.renderOnce();
  } else {
    let onScreen = false;
    const sync = () => (onScreen && !document.hidden ? scene.start() : scene.stop());
    const io = new IntersectionObserver(entries => { onScreen = entries[0].isIntersecting; sync(); });
    io.observe(hero);
    document.addEventListener('visibilitychange', sync);
    cleanups.push(() => { io.disconnect(); document.removeEventListener('visibilitychange', sync); });

    if (matchMedia('(pointer: fine)').matches) {
      /** @param {PointerEvent} e */
      const onMove = e => scene.setPointer((e.clientX / innerWidth) * 2 - 1, (e.clientY / innerHeight) * 2 - 1);
      window.addEventListener('pointermove', onMove, { passive: true });
      cleanups.push(() => window.removeEventListener('pointermove', onMove));
    }
  }

  teardown = () => {
    cleanups.forEach(fn => fn());
    teardown = null;
  };
}

window.addEventListener('pagehide', () => teardown?.());
// Restored from the back/forward cache: the old context was released on pagehide,
// so start again on a fresh canvas.
window.addEventListener('pageshow', e => {
  if (!e.persisted) return;
  const old = document.querySelector('.kk-hero .hero-canvas');
  if (old) old.replaceWith(old.cloneNode(false));
  boot();
});

boot();
