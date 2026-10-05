// @ts-check
/**
 * Home hero motion (GSAP): the staggered load sequence for the copy, and the
 * scene's fade-in plus scroll-linked progress. The copy is never left hidden.
 *
 * Canvas opacity is the product of three CSS custom properties, each with one
 * owner: --base (CSS: 1, or .45 on phones/tablets), --in (fade-in here) and
 * --out (scroll fade here). See .hero-canvas in styles.css.
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const INTRO_TARGETS = ['.site-header', '.kk-hero .kk-label', '.kk-hero .hero-line', '.kk-hero .kk-hero-sub', '.kk-hero .kk-cta-row', '.kk-hero .kk-stats'];

/**
 * Plays the load sequence. `done` resolves when it finishes (or is killed).
 * Killing reverts every target to its natural, visible state.
 * @returns {{ done: Promise<void>, kill: () => void }}
 */
export function playIntro() {
  // Drop the pre-paint hide first so GSAP reads the real end opacity; the from()
  // tween re-hides the targets in this same task, so nothing paints in between.
  document.documentElement.classList.remove('intro-pending');
  /** @type {() => void} */
  let finish = () => {};
  const done = new Promise(resolve => { finish = () => resolve(undefined); });
  const tl = gsap.timeline({ onComplete: finish });
  tl.from(INTRO_TARGETS, { autoAlpha: 0, y: 24, duration: 0.7, ease: 'power3.out', stagger: 0.08, clearProps: 'opacity,visibility,transform' });
  return { done, kill: () => { tl.revert(); finish(); } };
}

/**
 * Fades the canvas in, then ties the scene to scroll: scale, depth and spin grow
 * through the hero and the canvas fades out over its last 30%.
 * @param {HTMLElement} hero
 * @param {import('./hero3d.js').HeroScene} scene
 * @returns {() => void} cleanup
 */
export function linkScene(hero, scene) {
  const canvas = /** @type {HTMLCanvasElement | null} */ (hero.querySelector('.hero-canvas'));
  const fadeIn = canvas ? gsap.fromTo(canvas, { '--in': 0 }, { '--in': 1, duration: 0.9, ease: 'power2.out' }) : null;
  const proxy = { p: 0 };
  const scroll = gsap.timeline({ scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: 0.6 } })
    .to(proxy, {
      p: 1, ease: 'none', duration: 1,
      onUpdate: () => {
        scene.setProgress(proxy.p);
        canvas?.style.setProperty('--out', String(Math.min(1, (1 - proxy.p) / 0.3)));
      },
    });
  return () => {
    fadeIn?.kill();
    scroll.scrollTrigger?.kill();
    scroll.kill();
    canvas?.style.removeProperty('--in');
    canvas?.style.removeProperty('--out');
  };
}
