# Dark theme + 3D workflow-network hero — design

Date: 2026-10-06
Status: approved in chat (mockup option B), awaiting written-spec review
Builds on: `2026-10-05-kregkreates-static-site-design.md` (the live static site)

## Goal

Re-theme the whole KregKreates site dark with a phosphor-green accent, and
replace the Home hero's right-hand "New lead workflow" panel with an
interactive Three.js network of glassy nodes that tells the "automations
running" story. The site stays plain HTML/CSS/JS with no build step and
keeps working on GitHub Pages at https://kraigco.github.io/kraigco/.

This intentionally ends the pixel-match with the old Framer site. All
copy, photos, links and page structure stay; only the look and the Home
hero change.

Success means:

1. All 4 pages, the footer, the mobile menu and the 404 page use the dark
   palette below; every text element meets WCAG AA contrast.
2. The Home hero shows the 3D network with mouse tilt, scroll-linked
   motion and a staggered load sequence, within a budget of at most 4 WebGL
   draw calls per frame, a render loop that stops when the hero is off
   screen, and a reduced node count on phones.
3. The hero is fully readable and usable with WebGL off, with the CDN
   blocked, with JavaScript off, and with reduced motion on.
4. All existing behavior checks still pass (menu, newsletter, no-JS,
   site.js-blocked, overflow, links, HTML validity).

## Decisions (from the brainstorm)

- Scope: whole site dark.
- Accent: phosphor green `#39FF88`.
- 3D: workflow node network. Mockup option B: no panel; the network
  alone fills the hero's right side.
- Stack: vanilla ES modules; Three.js and GSAP (with ScrollTrigger) from a
  CDN via an import map; JSDoc types checked with `// @ts-check`; no
  Tailwind, no npm dependencies in the repo.

## Palette and surfaces

Defined once as CSS custom properties; every page uses them.

| Role | Value |
|---|---|
| Page background | `#0a0a0a` |
| Alternate section background | `#0f1110` |
| Card / sheet surface | `#141716` |
| Text | `#EDEFEC` |
| Muted text | `#A3A8A4` |
| Subtle text (labels, captions) | `#7C827E` |
| Rule / border | `rgba(255,255,255,.08)`; strong: `rgba(255,255,255,.16)` |
| Accent | `#39FF88`; pressed `#2BE076`; text on accent `#0a0a0a` |
| Grid-paper lines | `rgba(57,255,136,.06)` |
| Glass surface | `rgba(255,255,255,.04)` + `1px rgba(255,255,255,.10)` border + `backdrop-filter: blur(16px) saturate(140%)` |
| Glow (primary button, active states) | `0 0 0 1px rgba(57,255,136,.6), 0 0 32px rgba(57,255,136,.45)` |
| Lifted card (replaces the hard ink shadow) | `0 8px 32px rgba(57,255,136,.18)` |

Rules for applying it:

- Raw tokens whose role flips on dark (the old `--kk-ink` was used both as
  text color and as a dark fill) are remapped per use, not by value swap:
  dark fills (final-CTA card, filled step markers, dark buttons, chat
  bubble) become surface or glass; ink text becomes the text color.
- Every orange highlight (headline accents, nav underline, labels'
  squares, testimonial/About spans, active states) becomes the accent.
- The logo image is inverted to white with `filter: invert(1)`.
- Photo borders become `rgba(255,255,255,.16)`.
- Header: glass (`rgba(10,10,10,.6)` + blur) on every page; the open
  mobile menu is the same glass, not white.
- Cursors: the existing white-fill, dark-outline arrow and hand stay; they
  read on dark.

## Home hero (option B)

Layout:

- Left column, same copy as today: label, headline "Automate the
  busywork." / "Focus on growth." (second line in accent with a soft green
  text-shadow), body, two CTAs, stats row.
- Headline size `clamp(44px, 7.2vw, 104px)`, line-height `.96`,
  letter-spacing `-.045em`.
- Primary CTA "Book a free 15-min audit" (Calendly): accent fill, dark
  text, glow; glow intensifies on hover.
- Secondary CTA "See what I build" (`#workflows`): glass.
- The "New lead workflow" panel is removed from the hero markup.
- A `<canvas>` fills the hero behind the content (`position:absolute;
  inset:0; pointer-events:none; aria-hidden="true"`). Desktop: the network
  is centred at about 72% of the hero width. Phone (≤ 809px): centred
  behind the text at 45% opacity, with a dark scrim behind the copy so
  contrast still passes.
- A left-to-right scrim (`rgba(10,10,10,.85)` → transparent) sits between
  the canvas and the copy on desktop.

### 3D scene

- Three.js `0.170.0`, `RoomEnvironment` (from `three/addons`) for
  reflections, generated once through PMREM.
- Nodes: 40 (24 on phones or when `navigator.hardwareConcurrency <= 4`),
  placed by a seeded generator inside an ellipsoid (x-radius 1.2, y 0.8,
  z 1), so the layout is the same on every load. One `InstancedMesh` of
  `IcosahedronGeometry(1, 3)` scaled 0.6–1.4 × 0.045, with
  `MeshPhysicalMaterial`: roughness 0.12, metalness 0.1, clearcoat 1,
  iridescence 1, iridescenceIOR 1.3, thickness range 100–800 nm, emissive
  `#39FF88` at 0.15.
- Lighting: ambient 0.25 plus two point lights, green `#39FF88` and cyan
  `#22D3EE`, orbiting at different speeds so the iridescence shifts.
- Links: each node joined to its 3 nearest neighbours (deduplicated) as
  one `LineSegments`, accent at 22% opacity, `depthWrite:false`.
- Pulses: 28 (16 on phones) points travelling along random links, one
  `Points` object, additive blending, a generated round sprite (no image
  file).
- Draw calls per frame: 3 (nodes, links, pulses).
- Renderer: `alpha:true`, antialias only when device pixel ratio < 1.5,
  pixel ratio capped at 2 (1.5 on phones), sRGB output, ACES tone mapping.
  Camera: 35° perspective at z = 6.

### Motion

- Mouse (fine pointers only): the network rotates toward the cursor up to
  ±0.25 rad (x) and ±0.35 rad (y), eased with `1 - exp(-dt*4)`.
- Idle: slow spin (0.12 rad/s); pulses always move.
- Scroll (GSAP ScrollTrigger on the hero, `start:"top top"`,
  `end:"bottom top"`, `scrub:0.6`): scale 1 → 1.6, position z 0 → 1.8
  (toward the camera), spin multiplier 1 → 3; the canvas fades to 0 over
  the last 30%.
- Load (GSAP timeline): header, label, headline line 1, headline line 2,
  body, CTAs, stats, each `from {autoAlpha:0, y:24}`, 0.7s,
  `power3.out`, 0.08s stagger; the canvas fades in over 0.9s. The old CSS
  hero load animation (`kk-anim` on the hero) is removed so nothing
  animates twice. Content has no hidden CSS state: without JS it is simply
  visible.

### Performance and lifecycle

- The render loop runs only while the hero is on screen
  (IntersectionObserver) and the tab is visible (`visibilitychange`); it
  uses delta time.
- Resize through `ResizeObserver` on the hero.
- On `pagehide`: dispose geometries, materials, textures and the PMREM
  environment, `renderer.dispose()` + `renderer.forceContextLoss()`, kill
  ScrollTriggers and the timeline, remove listeners, disconnect observers.

### Fallbacks

| Condition | Result |
|---|---|
| WebGL unavailable, or the Three.js/GSAP import fails | hero gets `.no-webgl`: static CSS green radial glow + grid; copy, CTAs and stats fully visible; no console errors left uncaught |
| `prefers-reduced-motion: reduce` | one static frame of the network is rendered; no loop, no mouse/scroll motion, no load stagger |
| JavaScript off | no canvas content; static glow; everything visible (existing no-JS rules still apply) |

## Files

- `assets/hero3d.js` (new): `createHeroScene(canvas, options?) →
  { setPointer(x, y), setProgress(p), start(), stop(), renderOnce(),
  destroy() }`.
- `assets/hero-motion.js` (new): GSAP load timeline and ScrollTrigger
  wiring; `initHeroMotion(hero, scene) → cleanup()`.
- `assets/hero.js` (new): entry module; checks WebGL and reduced motion,
  dynamically imports the two modules, applies `.no-webgl` on any failure,
  registers `pagehide` cleanup.
- `index.html`: import map (pinned `three@0.170.0`, `gsap@3.13.0` incl.
  `ScrollTrigger`), `<script type="module" src="assets/hero.js">`, canvas,
  panel removed, `kk-anim` removed from the hero.
- `assets/styles.css`: dark tokens, per-use remaps, glass/glow utilities,
  hero layout and fallback styles.
- All modules start with `// @ts-check` and carry JSDoc types; type
  checking runs in the scratchpad harness (`tsc --noEmit --allowJs
  --checkJs` with `@types/three` and GSAP's bundled types), not in the
  repo.

## Verification

1. Existing harness: every behavior check, `links.js` and html-validate
   pass on all pages. The Framer pixel gate is retired.
2. New checks:
   - `contrast`: every visible text node on every page has contrast ≥ 4.5
     (≥ 3 for text ≥ 24px, or ≥ 18.66px bold) against its nearest opaque
     background.
   - `webgl-off`: Chrome launched with WebGL disabled → hero has
     `.no-webgl`, copy and CTAs visible, no uncaught errors.
   - `cdn-blocked`: requests to the CDN fail → same as `webgl-off`.
   - `hero-renders`: the canvas region of a screenshot is not blank (pixel
     variance above a threshold).
   - `hero-intro`: 2s after load, all staggered elements are at opacity 1.
   - `loop-pauses`: with the page scrolled to the footer, the number of
     `requestAnimationFrame` callbacks over 2s is near zero (counted by an
     init script in the test, no hook in production code).
   - `draw-calls`: WebGL draw calls per frame ≤ 4 (counted by wrapping the
     context's draw methods in an init script).
   - `dispose`: after dispatching `pagehide`, the hero canvas's WebGL
     context reports `isContextLost() === true`.
   - `types`: `tsc --noEmit` reports no errors.
3. New baseline screenshots at 1440 / 810 / 390 for the owner to review.

## Out of scope

Copy changes, a light/dark toggle, layout changes outside the Home hero,
new pages, analytics.
