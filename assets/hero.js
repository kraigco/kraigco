// @ts-check
/**
 * Home hero entry point. Order matters: the copy's load sequence plays first,
 * then the 3D scene is built (its shader compile and environment map are the
 * heaviest work on the page and must not stutter the intro), then the scene
 * fades in and is tied to scroll. Also owns on-screen pausing, tab visibility,
 * pointer, and page hide / back-forward restore.
 * The hero copy never depends on any of this; it is visible without JS.
 * State for styling and tests: hero[data-scene] = "ready" | "fallback".
 */

const PHONE_QUERY = '(max-width: 809px)';
const reveal = () => document.documentElement.classList.remove('intro-pending');

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

/**
 * @param {HTMLCanvasElement} canvas
 * @returns {Promise<import('./hero3d.js').HeroScene | null>}
 */
async function createScene(canvas) {
  if (!webglAvailable()) return null;
  try {
    const { createHeroScene } = await import('./hero3d.js');
    const small = matchMedia(PHONE_QUERY).matches || (navigator.hardwareConcurrency || 8) <= 4;
    return createHeroScene(canvas, small ? { nodes: 24, pulses: 16, maxDpr: 1.5 } : {});
  } catch {
    return null; // CDN down, module error or context creation failed
  }
}

/** Bumped on pagehide so a boot still in progress stops instead of building a scene. */
let generation = 0;
/** @type {Array<() => void>} */
let cleanups = [];

function teardown() {
  generation++;
  cleanups.forEach(fn => fn());
  cleanups = [];
  const hero = /** @type {HTMLElement | null} */ (document.querySelector('.kk-hero'));
  if (hero) delete hero.dataset.scene;
}

/** @param {{ restored?: boolean }} [opts] */
async function boot(opts = {}) {
  const gen = generation;
  const hero = /** @type {HTMLElement | null} */ (document.querySelector('.kk-hero'));
  const canvas = /** @type {HTMLCanvasElement | null} */ (hero && hero.querySelector('.hero-canvas'));
  if (!hero || !canvas) return reveal();
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // 1. Copy first.
  const motion = reduce ? null : await import('./hero-motion.js').catch(() => null);
  if (gen !== generation) return;
  if (motion && !opts.restored) {
    const intro = motion.playIntro();
    cleanups.push(intro.kill);
    await intro.done;
    if (gen !== generation) return;
  }
  reveal(); // no-op when GSAP took over; reveals the copy when motion is off or failed

  // 2. Then the scene.
  const scene = await createScene(canvas);
  if (gen !== generation) { scene?.destroy(); return; }
  hero.classList.toggle('no-webgl', !scene);
  if (!scene) { hero.dataset.scene = 'fallback'; return; }
  cleanups.push(() => scene.destroy());

  if (reduce) {
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
    // 3. Fade in and tie to scroll.
    if (motion) cleanups.push(motion.linkScene(hero, scene));
  }
  hero.dataset.scene = 'ready';
}

window.addEventListener('pagehide', teardown);
// Restored from the back/forward cache: the old context was released on pagehide,
// so start again on a fresh canvas (without replaying the load sequence).
window.addEventListener('pageshow', e => {
  if (!e.persisted) return;
  const old = document.querySelector('.kk-hero .hero-canvas');
  if (old) old.replaceWith(old.cloneNode(false));
  boot({ restored: true });
});

boot();
