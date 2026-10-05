# KregKreates Static Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild kregkreates.framer.website as a hand-written static site in the root of the `kraigco/kraigco` repo, served by GitHub Pages at https://kraigco.github.io/kraigco/.

**Architecture:** Four folder-per-page HTML files plus a 404 page share one stylesheet and one small script. Eight of the site's sections already exist as clean HTML/CSS from the owner's custom Framer code component (`KregKreatesSections`, classes `kk-*`); their markup is copied from the live server-rendered HTML and their CSS is ported verbatim. Everything else (header, footer, testimonials, page heroes, About Me) is rebuilt by hand against computed styles probed from the live site. A scratchpad harness (screenshots, pixel compare, link crawl, behavior checks, HTML validation) proves each task.

**Tech Stack:** HTML5, CSS (custom properties, grid, container queries), vanilla JS (no dependencies), Google Fonts. Harness only: Node 24 + puppeteer-core 23 driving installed Chrome, Python 3.12 + Pillow, `npx html-validate@9`.

**Spec:** `docs/superpowers/specs/2026-10-05-kregkreates-static-site-design.md`

## Global Constraints

- Site files live at the repo root on branch `kregkreates-site`. Never modify or stage `README.md` (the owner has an unrelated pending deletion). Stage explicit paths only; never `git add -A` or `git add .`.
- All paths are relative (`assets/...` from `index.html`, `../assets/...` from page folders). Only `404.html` uses absolute `/kraigco/...` paths.
- Canonical base URL: `https://kraigco.github.io/kraigco/`. OG/Twitter image URLs are absolute on that base.
- Exact link targets: Calendly `https://calendly.com/kraigco/15min` (`target="_blank" rel="noopener"`, as live); email `mailto:kraigco@gmail.com`; phone `tel:+639500657761`; Instagram `https://www.instagram.com/kregkreates/`; Facebook `https://www.facebook.com/profile.php?id=61558605839478`; résumé `resume.pdf` (relative, `target="_blank"`).
- Newsletter: AJAX endpoint `https://formsubmit.co/ajax/kraigco@gmail.com`; no-JS form `action="https://formsubmit.co/kraigco@gmail.com" method="POST"`.
- Copy is verbatim from the live site. The only content changes are the spec's "Intended differences".
- No Framer runtime code and no `framerusercontent.com` URLs in the shipped site. The only external runtime requests are Google Fonts.
- The custom cursor is an original drawing. Do not copy the template's "Pointer" SVG.
- Breakpoints: desktop ≥ 1200 px, tablet 810–1199 px, phone ≤ 809 px.
- Motion is off under `prefers-reduced-motion: reduce`, and no content may stay hidden when JS is off or animation is skipped.
- No build step and no npm dependencies in the repo.

## Review Focus

1. **Newsletter fails** (network down, FormSubmit 4xx/5xx, form not yet activated): the visitor sees an error, keeps their typed email, and can retry; a double click sends one request. → Task 2, checks `newsletter-fail`, `newsletter-offline`, `newsletter-double`.
2. **JavaScript off or `site.js` fails to load**: every section is visible (nothing stuck at opacity 0), phone nav links are reachable, and the newsletter still posts. → Task 2 `nojs` on 404, Task 3 `nojs` on Home.
3. **Served under `/kraigco/`, including GitHub's 404 at a deep missing URL**: styles, logo and fonts load, and no page uses a root-absolute path. → Task 1 `links.js` forbidden-path rule, Task 2 check `404-deep`.
4. **Narrow phones (320 px)**: no horizontal scroll; the large email heading on Contact wraps. → `overflow` check in Tasks 3–6.
5. **Reduced motion**: the hero, panel and revealed blocks are fully visible on first paint with no animation. → Task 3 `motion`, Task 6 `motion`.

## Paths used below

- `REPO` = `C:/Users/Gaming PC/Documents/GitHub/kraigco`
- `REF` = `C:/Users/GAMING~1/AppData/Local/Temp/claude/c--Users-Gaming-PC-Documents-GitHub-kraigco/b37f282a-e0b6-443d-a403-92355390e50f/scratchpad/ref` (harness and reference data; has `node_modules/puppeteer-core`)
  - `REF/shots/{home,project,contact,about-me}-{1440,810,390}.png`: live full-page screenshots (the visual source of truth)
  - `REF/shots/*-1440.json`: live rendered text, links, images
  - `REF/ssr/kk.html`, `kk-project.html`, `kk-contact.html`: live server-rendered HTML (source of `kk-*` section markup)
  - `REF/dom/{home,project,contact,about-me}.html`: live hydrated DOM (source for About Me and Framer-native parts)
  - `REF/kk-sections.css`: the code component's CSS, extracted verbatim
  - `REF/render.js`: screenshots `${BASE}/{'',project,contact,about-me}` at 1440/810/390 into `${OUT}`
- Local server for every check (run in the background, leave running): `python -m http.server 8080 --directory "C:/Users/Gaming PC/Documents/GitHub"` → `BASE=http://localhost:8080/kraigco`

---

### Task 1: Verification harness

**Files (all in `REF`, none in the repo):**
- Create: `REF/compare.py`, `REF/probe.js`, `REF/links.js`, `REF/behavior.js`, `REF/.htmlvalidate.json`

**Interfaces:**
- Produces:
  - `python compare.py REF_PNG OUT_PNG [--top N | --bottom N] [--save CMP_PNG]`: prints `height_delta=<pct> diff=<pct>`. `diff` is the share of pixels whose max channel delta exceeds 40, measured over the shared height (or only the top/bottom N px). `--save` writes ref and out side by side.
  - `node probe.js URL TARGET [--width N] [--hover]`: TARGET is a CSS selector or `text=<exact text>` (smallest element whose trimmed innerText equals it). Prints JSON with font-family, size, weight, line-height, letter-spacing, color, background, border, radius, padding, margin, box width/height, position, and top/right/bottom/left.
  - `node links.js BASE`: crawls `/`, `/about-me/`, `/project/`, `/contact/`. Internal URLs must return 200. External URLs are reported, and a status ≥ 400 prints `WARN` for manual review. mailto/tel must be exactly the two allowed values. Fails on any href/src containing `gadzin`, `framer`, `https://kraigco@`, or starting with `/` (root-absolute). Exit 1 on failure.
  - `node behavior.js BASE CHECK[,CHECK...] [--page PATH]`: runs the named checks and prints `PASS|FAIL <check>` (exit 1 on any FAIL). Checks are defined in the step below.
  - `npx --yes html-validate@9 -c REF/.htmlvalidate.json FILES...`

- [ ] **Step 1: Write `behavior.js` with these checks** (each loads `BASE + (--page or '/')` unless stated)
  - `menu`: at 390 px, `.menu-toggle` has `aria-expanded="false"` and `#site-nav` is hidden. Click it: expanded `"true"` and nav visible. Press Escape: hidden again. Open, then click the first nav link: the menu closes.
  - `newsletter-ok`: intercept the POST to `https://formsubmit.co/ajax/kraigco@gmail.com` and reply 200 `{"success":"true"}`. Fill `you@example.com` and submit. `.nl-status` text = `Thanks for subscribing!` and the input is empty.
  - `newsletter-fail`: reply 500. `.nl-status` text = `Something went wrong. Please try again.`, the input still holds the email, and the submit button is enabled.
  - `newsletter-offline`: abort the request. Same assertions as `newsletter-fail`.
  - `newsletter-invalid`: fill `not-an-email` and submit. No request is sent.
  - `newsletter-double`: delay the reply 1 s and click submit twice. Exactly one request is sent.
  - `nojs`: JavaScript disabled. Wait 2 s after `load` (lets the CSS-only hero animation finish). Every element under `main` has computed opacity `1`. At 390 px all four nav links are visible. `.nl-form` has the no-JS action and method from Global Constraints.
  - `motion`: emulate `prefers-reduced-motion: reduce` and read immediately after `domcontentloaded`. Every `.kk-hero-copy > *`, `.kk-panel` and `[data-kk-r]` has opacity `1` and `getAnimations().length === 0`.
  - `overflow`: at 320 and 390 px, `scrollWidth <= clientWidth` on `document.documentElement`.
  - `anchor`: at 1440 px, click the link with text `See what I build`. The `#workflows` top lands between the header's bottom edge and 120 px.
  - `faq`: click the second `.kk-faq-item summary`; it gains `open`. Click it again; it loses `open`.
  - `cursor`: computed `cursor` on `html` and on the first `a` both contain `cursor-hand.svg`.
  - `404-deep`: intercept `BASE/x/y/z` and serve `REPO/404.html`. The `h1` font-family contains `Archivo`, the logo image has `naturalWidth > 0`, and the stylesheet has loaded (no failed requests).
  - `contact-links`: on `/contact/`, an `a` with text `kraigco@gmail.com` has href `mailto:kraigco@gmail.com`, and an `a` with text `+63 950 065 7761` has href `tel:+639500657761`.

- [ ] **Step 2: Write `compare.py`, `probe.js`, `links.js`, and `.htmlvalidate.json`** (`{"extends":["html-validate:recommended"],"rules":{"no-inline-style":"off","long-title":"off"}}`). Also give `render.js` a `PAGES` env: a comma-separated list of paths, defaulting to the 4 pages. Screenshot name = the path with slashes and `.html` removed, `home` for the empty path (so `404.html` → `404-1440.png`).

- [ ] **Step 3: Sanity-run against live and local**
  Run `node probe.js https://kregkreates.framer.website "text=Book a free audit"`. Expected: JSON with background `rgb(194, 65, 12)`.
  Run `node behavior.js http://localhost:8080/kraigco menu`. Expected: `FAIL menu` (no site yet).
  Run `python compare.py shots/home-1440.png shots/home-1440.png`. Expected: `height_delta=0.00 diff=0.00`.

No commit (harness lives outside the repo).

---

### Task 2: Shared shell, assets, `site.js`, 404 page

**Files:**
- Create: `REPO/.nojekyll` (empty), `REPO/resume.pdf` (copy of `C:/Users/Gaming PC/Downloads/Kraig_Matrix_Co_Curriculum_Vitae-1.pdf`), `REPO/assets/styles.css`, `REPO/assets/site.js`, `REPO/assets/img/*`, `REPO/404.html`

**Interfaces:**
- Produces (used by Tasks 3–6):
  - Page skeleton: `<html lang="en" class="no-js">`; first thing in `<head>`: `<script>document.documentElement.className="js"</script>`; fonts `<link>` = `https://fonts.googleapis.com/css2?family=Archivo:wght@400..900&family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap` with preconnects; `assets/styles.css`; `<script src="assets/site.js" defer>`; favicon `assets/img/favicon.png`.
  - Header block: `<header class="site-header">` containing `.brand` (logo + "KregKreates"), `<nav id="site-nav" class="site-nav">` (Home, About Me, Projects, Contact), `.social` (Instagram, Facebook, résumé, in that order, each with `aria-label`), the header button `a.btn-audit` "Book a free audit" plus arrow, and `<button class="menu-toggle" aria-controls="site-nav" aria-expanded="false" aria-label="Menu">`.
  - Footer block: `<footer class="site-footer">` containing the `.nl-card` newsletter (`form.nl-form` with `input[type=email][name=email][required][placeholder="Your email"]`, hidden `_subject` = `New newsletter signup — KregKreates`, hidden honeypot `input[name=_honey]` (visually hidden, `tabindex="-1"`, `autocomplete="off"`), hidden `_next` = `https://kraigco.github.io/kraigco/`, submit "Subscribe!", and `<p class="nl-status" role="status" aria-live="polite">`); the `.review` card ("Client Review", the quote "Kraig automated our lead follow-ups and reporting with AI workflows. Tasks that used to eat up hours every week now run on their own.", the empty bordered square avatar box exactly as live, "RK", "Founder, Rekreate Digital"); footer nav (Homepage, About Me, Projects, Contact); icons (Facebook, Instagram, résumé, in that order); and `© 2026 KregKreates. All rights reserved`.
  - `a.float-audit`: fixed floating button "Book a free audit" (Home only).
  - Image files: `logo.png`, `favicon.png`, `og-image.png`, `kraig-beach.jpg`, `kraig-contact.png`, `client-ryan.jpg`, `client-john.jpg`, `cursor-hand.svg`.
  - `site.js`: `initMenu()`, `initNewsletter()`, `initReveal()`, all called once at load.

- [ ] **Step 1: Write the failing checks.** Run `node behavior.js BASE menu,newsletter-ok,newsletter-fail,newsletter-offline,newsletter-invalid,newsletter-double,nojs,cursor,overflow,404-deep --page /404.html`. Expected: all FAIL.

- [ ] **Step 2: Download the assets** into `REPO/assets/img/`:
  - `logo.png` ← `https://framerusercontent.com/assets/WU0M5ShRlPNbXuJXuPkHWr1A.png`
  - `favicon.png` ← `https://framerusercontent.com/images/0HvAOyR0rYtOW0zJERD7v8b2Khs.png`
  - `og-image.png` ← `https://framerusercontent.com/images/ZMDffVUGBFufyVqueVAZND2kTIs.png`
  - `kraig-beach.jpg` ← `https://framerusercontent.com/images/XHJrAagmwQkiXO62n6ChJt24c.jpg?scale-down-to=1024`
  - `kraig-contact.png` ← `https://framerusercontent.com/images/GFayzsWp6VGzp6TyMPKxipGBfg.png?scale-down-to=512`
  - `client-ryan.jpg` ← `https://framerusercontent.com/images/uVudMQBFftN0QT02KqU3m2Wjcps.jpg?scale-down-to=512`
  - `client-john.jpg` ← `https://framerusercontent.com/images/9EELowpUDSVluuXnYIpfixTwrw.jpeg?scale-down-to=1024`
  - `cursor-hand.svg`: an original 48×48 drawing of a pointing hand (white fill, about 3 px black outline, index finger pointing up and to the left). The hotspot at the fingertip is used in CSS.

- [ ] **Step 3: Write `styles.css`**
  1. Port `REF/kk-sections.css` verbatim, with two changes. Drop its `@import` line (fonts come from the page `<link>`). Move the `--kk-*` custom properties out of the `.kk-sec{...}` rule into `:root{...}` so non-`kk` parts share the tokens; keep the rest of `.kk-sec`.
  2. Set `.kk-hero{--kk-top:98px}`, and `72px` at ≤ 809 px (header heights).
  3. Base: `body{margin:0;background:var(--kk-paper);color:var(--kk-ink);font-family:var(--kk-font-body)}`, and `html,html *{cursor:url(img/cursor-hand.svg) <hotspot>, auto}`.
  4. Header, mobile menu, footer, newsletter, review card, floating button, and `.page-hero` (grid paper, same background rule as `.kk-hero`). Every value comes from `node probe.js` on the live element at 1440, 810 and 390 px, including hover states (`--hover`). Measured so far: header is fixed, z-index 10, height 98 px (desktop/tablet) and 72 px (phone); floating button is fixed, right 20 px, bottom 77 px (≥ 810) and 82 px (≤ 809), z-index 1. Open the live phone menu (click the hamburger at 390 px) and match its open-state layout.
  5. `.no-js` fallback at ≤ 809 px: hide `.menu-toggle` and show `#site-nav` links inline.
  6. Under `prefers-reduced-motion: reduce`: no transitions or animations site-wide.

- [ ] **Step 4: Write `site.js`**
  - `initMenu()`: the toggle flips `aria-expanded` and the nav's open class. Escape and nav-link clicks close it.
  - `initNewsletter()`: on submit, `preventDefault`, disable the button, and POST `FormData` with `Accept: application/json` to the AJAX endpoint. On `response.ok && json.success === "true"`, clear the input and show `Thanks for subscribing!`. Otherwise (including network errors), show `Something went wrong. Please try again.` and keep the input. Always re-enable the button.
  - `initReveal()`: the live behavior, re-implemented. If reduced motion is set, or `IntersectionObserver` or `Element.animate` is missing, or `innerHeight < 200`, do nothing. Otherwise every `[data-kk-r]` whose top is below the first viewport gets a paused animation `[{opacity:0,transform:'translate3d(0,14px,0)'},{opacity:1,transform:'none'}]` (560 ms, `cubic-bezier(.2,.7,.2,1)`, fill both). An observer with `rootMargin:'0px 0px -8% 0px'` plays entries sorted by top then left, with delay `min(index,5)*70` ms, cancels each animation on finish, and unobserves it.

- [ ] **Step 5: Write `404.html`** with the header and footer blocks and absolute `/kraigco/...` paths, plus `<meta name="robots" content="noindex">` and title `Page not found | KregKreates`. `main` holds `.kk-label` "404", `h1.kk-h1` "Page not found", `p.kk-p` "The page you're looking for doesn't exist or has moved.", and `a.kk-btn.kk-btn-primary` "Back to home" → `/kraigco/`.

- [ ] **Step 6: Run the checks.** Run the Step 1 command. Expected: all PASS. Run `npx --yes html-validate@9 -c REF/.htmlvalidate.json "REPO/404.html"`. Expected: no errors.

- [ ] **Step 7: Shell visual match.** Run `PAGES=404.html BASE=http://localhost:8080/kraigco OUT=out node render.js`. Compare `--top 98` (72 at 390) of each 404 shot against `shots/home-<w>.png`, and `--bottom 640` against the live footer. Expected: `diff ≤ 2.0` for each. If it's higher, inspect the `--save` composite and fix.

- [ ] **Step 8: Commit**
  ```bash
  git add .nojekyll resume.pdf assets 404.html
  git commit -m "feat: shared shell, assets, site.js and 404 page"
  ```

---

### Task 3: Home page

**Files:** Create `REPO/index.html`

**Interfaces:** Consumes the Task 2 skeleton, header, footer, `float-audit`, and image files.

- [ ] **Step 1: Failing checks.** Run `node behavior.js BASE anchor,faq,nojs,motion,overflow --page /`. Expected: FAIL.

- [ ] **Step 2: Build `index.html`**
  - Head: title `KregKreates | AI Automation Engineer & Web Developer`; description `I build AI workflows, CRM automations and fast websites that cut manual work for small businesses. Book a free 15-min automation audit.`; canonical, OG (`og:type website`, url, title, description, image) and Twitter `summary_large_image` on the canonical base. Include both JSON-LD `<script type="application/ld+json">` blocks from `REF/ssr/kk.html`, with every `https://kregkreates.framer.website` replaced by `https://kraigco.github.io/kraigco`.
  - Body order: header, then `main` with the 8 `section.kk-sec` elements from `REF/ssr/kk.html` (hero, tools, problems, services `#services`, process `#how-it-works`, workflows `#workflows`). Next come the hand-built `section.testimonials` and `section.about-teaser`, then the remaining `kk-sec` (FAQ `#faq`, final CTA `.kk-final`). After `main`: footer, then `a.float-audit`.
  - Copying `kk-sec` markup: keep it verbatim (classes including `kk-anim`, ids, `data-kk-r`, SVGs, links). Delete only the `<style>` element inside each section and the inline `--kk-top:98px` (now in CSS).
  - `section.testimonials`: heading "What past clients say" and two cards. Card 1: `client-ryan.jpg` (alt `Ryan Kyle Ocampo`), quote "Kraig's video editing and virtual assistance have been a game-changer for us. His efficiency and creativity saved us time and boosted our results!" with "game-changer" in an orange `span`, name "Ryan Kyle Ocampo", title "Digital Marketer Coach, Freelance". Card 2: `client-john.jpg` (alt `John Mark Sarol`), quote "Kraig's brilliant designs and social media tactics skyrocketed our engagement and ROI. We'd be lost without his incredible skills!" with "skyrocketed" orange, name "John Mark Sarol", title "TOP RATED Virtual Assistant, Content Creator". Check every string against `REF/shots/home-1440.json`, which wins on any mismatch.
  - `section.about-teaser` (paper-2 background): `h2` "Ever Wonder Who's Behind the Automations?"; paragraph "With over **three years** of remote experience and a love for **AI automation**, I'm all about **turning repetitive tasks into automated systems**. Want to know more about my journey and what I can bring to your project?" with `strong` where bolded; dark button "About Me" plus arrow → `about-me/`; `kraig-beach.jpg` with alt `Kraig Matrix Co smiling on a beach in the Philippines`.
  - All hand-built sizes come from `probe.js` at the three widths.

- [ ] **Step 3: Run the checks.** Step 1 command → PASS. `node links.js BASE` → no FAIL. html-validate on `index.html` → no errors.

- [ ] **Step 4: Visual match.** Render the local site, then run `compare.py` on `home-{1440,810,390}` with `--save`. Expected: `height_delta ≤ 2.0` and `diff ≤ 6.0` each, and the only differences in the composites are intended ones (no Framer badge). Otherwise fix and re-run.

- [ ] **Step 5: Commit** `git add index.html` → `git commit -m "feat: home page"`

---

### Task 4: Projects page

**Files:** Create `REPO/project/index.html`

- [ ] **Step 1: Failing check.** `node behavior.js BASE overflow --page /project/` → FAIL.

- [ ] **Step 2: Build it.**
  - Head: title `AI Automation Workflows | KregKreates`; description `Example AI workflows for lead follow-up, inbox-to-CRM and content. See how each one runs, which tools it uses and what it saves.`; canonical `…/project/`; OG/Twitter as in Task 3.
  - `main`: `section.page-hero` (centered `h1` "I'm helping companies **successfully** invest in automation" with "successfully" orange; rating chip: bordered box, star icon, "5.0"; then "40+ workflows automated and counting!"). Then the 3 `kk-sec` sections from `REF/ssr/kk-project.html` (workflows, process, final), copied as in Task 3. Then the footer.

- [ ] **Step 3: Checks.** Step 1 → PASS; `links.js`; html-validate.

- [ ] **Step 4: Visual match.** `project-{1440,810,390}`, same thresholds as Task 3.

- [ ] **Step 5: Commit** `git add project/index.html` → `git commit -m "feat: projects page"`

---

### Task 5: Contact page

**Files:** Create `REPO/contact/index.html`

- [ ] **Step 1: Failing checks.** `node behavior.js BASE contact-links,faq,overflow --page /contact/` → FAIL.

- [ ] **Step 2: Build it.**
  - Head: title `Book a Free Automation Audit | KregKreates`; description `Book a free 15-minute call. We'll review how your team works today and find the first task worth automating.`; canonical `…/contact/`.
  - `section.contact-hero` (grid paper):
    - A dark bubble, right-aligned: "Hey, how can I get in touch with you? Email?"
    - A white bubble with a hard ink shadow and `kraig-contact.png` (alt `Kraig Matrix Co, founder of KregKreates`) to its left: "Hey! You can email me at [kraigco@gmail.com](mailto:kraigco@gmail.com) or give me a call [+63 950 065 7761](tel:+639500657761)". The email link keeps the live orange underline and gets `overflow-wrap:anywhere`.
    - Below: "Or just schedule a meeting, the best way in my experience" on the left. On the right: `h3` "AI Automation Audit", "Complimentary 15-minute session where we'll review your current workflows and find what can be automated.", and the Calendly button "Book a free 15-min audit" with an arrow.
  - Then the FAQ `kk-sec` from `REF/ssr/kk-contact.html`, then the footer.

- [ ] **Step 3: Checks.** Step 1 → PASS; `links.js`; html-validate.

- [ ] **Step 4: Visual match.** `contact-{1440,810,390}`, same thresholds.

- [ ] **Step 5: Commit** `git add contact/index.html` → `git commit -m "feat: contact page"`

---

### Task 6: About Me page

**Files:** Create `REPO/about-me/index.html`

- [ ] **Step 1: Failing checks.** `node behavior.js BASE motion,overflow --page /about-me/` → FAIL.

- [ ] **Step 2: Build it.**
  - Head: title `About Kraig Matrix Co | KregKreates`; description `Meet Kraig Matrix Co, AI Automation Engineer in the Philippines and founder of KregKreates, building AI workflows, CRM automations and fast websites for small businesses.`; canonical `…/about-me/`.
  - `main`, all copy and highlight spans taken from `REF/dom/about-me.html` (the hydrated live page):
    1. `section.page-hero`: `h1` "Hi! I'm Kraig" / "Founder of KregKreates"; subline "Want to know more about me right?".
    2. Intro row: large two-tone statement "My name is Kraig Matrix Co, I'm an AI Automation Engineer working and living in the Philippines." with the orange spans as live, plus `kraig-beach.jpg` (alt `Kraig Matrix Co, AI automation engineer and founder of KregKreates`).
    3. Three two-tone paragraphs ("As an AI Automation Engineer…", "I am also the Founder of KregKreates…", "I like finding the one repetitive task…") with orange spans as live.
    4. The `kk-sec` tools, process and final sections, copied from `REF/dom/about-me.html` with the same clean-up as Task 3.
    5. Footer.

- [ ] **Step 3: Checks.** Step 1 → PASS; `links.js`; html-validate.

- [ ] **Step 4: Visual match.** `about-me-{1440,810,390}`, same thresholds.

- [ ] **Step 5: Commit** `git add about-me/index.html` → `git commit -m "feat: about me page"`

---

### Task 7: Sitemap, full sweep, handoff

**Files:** Create `REPO/sitemap.xml`

- [ ] **Step 1: Write `sitemap.xml`**: 4 `<url>` entries (`https://kraigco.github.io/kraigco/`, `…/about-me/`, `…/project/`, `…/contact/`), each `<lastmod>2026-10-05</lastmod>`.

- [ ] **Step 2: Full sweep.** All must pass:
  - `node behavior.js BASE menu,newsletter-ok,newsletter-fail,newsletter-offline,newsletter-invalid,newsletter-double,nojs,cursor,overflow --page P` for each of `/`, `/about-me/`, `/project/`, `/contact/`
  - `node behavior.js BASE 404-deep,anchor,faq,motion,contact-links` (each on its page as defined)
  - `node links.js BASE`: no FAIL; any WARN is listed in the handoff
  - html-validate on all 5 HTML files: no errors
  - `compare.py` on all 12 page/width pairs, within the Task 3 thresholds

- [ ] **Step 3: Commit** `git add sitemap.xml` → `git commit -m "feat: sitemap"`

- [ ] **Step 4: Handoff.** Use superpowers:finishing-a-development-branch. Merging to `main`, pushing, enabling Pages, and the one live FormSubmit test signup each need the owner's explicit go-ahead.
