# KregKreates static site — design

Date: 2026-10-05
Status: approved in chat, awaiting written-spec review

## Goal

Move kregkreates.framer.website off Framer to a self-hosted static site at
https://kraigco.github.io/kraigco/ (GitHub Pages, repo `kraigco/kraigco`,
which is also the GitHub profile-README repo).
The new site must look and behave like the live Framer site at desktop,
tablet and phone widths, with the known bugs fixed and the Framer badge gone.

Success means:

1. All 4 pages (Home, About Me, Projects, Contact) match the live site in
   content, layout, colors, typography and spacing at 1440, 810 and 390 px,
   confirmed by side-by-side screenshots. The only differences are the
   intended ones listed below.
2. Every link works and points where its label says.
3. The newsletter form delivers signups to kraigco@gmail.com.
4. The site is editable by hand: plain HTML, one stylesheet, one small script,
   no build step.

## Source of truth

- Copy: the live site's text, taken verbatim (Home, /project, /contact, and
  the client-rendered /about-me).
- Look: reference screenshots of the live site at 1440, 810 and 390 px,
  captured 2026-10-05 with headless Chrome after scrolling each page.
- Tokens: colors, fonts, sizes, spacing, borders and shadows read from the
  live site's served CSS and computed styles.
- Images: the logo, photos and testimonial photos downloaded from
  framerusercontent.com into the repo.

## Structure

```
README.md             GitHub profile README (owner's; untouched by this project)
index.html            Home
about-me/index.html   /about-me/
project/index.html    /project/
contact/index.html    /contact/
404.html              not-found page in the site's style
resume.pdf            Kraig_Matrix_Co_Curriculum_Vitae-1.pdf (from Downloads)
assets/styles.css     all styles; design tokens as CSS custom properties on :root
assets/site.js        mobile menu, newsletter submit, scroll reveal
assets/img/           logo, photos, favicon, og-image
sitemap.xml
.nojekyll             serve files as-is; no Jekyll processing
docs/                 this spec and the implementation plan
```

Folder-per-page keeps the live URL shape (`/about-me/`, `/project/`,
`/contact/`) and works the same on GitHub Pages and any local static server.
The site is served under the `/kraigco/` path, so every page uses relative
paths (`assets/...` from the root page, `../assets/...` from the page
folders). The same files then also work unchanged on a custom domain later.
The one exception is `404.html`: GitHub Pages serves it at whatever missing
URL was requested, so it uses absolute `/kraigco/...` paths.

The profile README (`README.md`) is not part of the site and is not
modified. `.nojekyll` makes Pages serve `index.html` as the home page
instead of rendering the README.

The header and footer are repeated in each page. Four pages do not justify a
build step or client-side includes; this keeps every page complete for search
engines and for visitors without JavaScript.

Fonts: Archivo, IBM Plex Sans and IBM Plex Mono from Google Fonts, the same
families the live site uses.

## Visual system

- Design tokens (colors, font stacks, radii, shadows, spacing) live on `:root`
  in `styles.css` so a color or font change is one edit.
- Three layouts matching Framer's breakpoints: desktop ≥ 1200 px, tablet
  810–1199 px, phone < 810 px. At phone width the nav collapses into a
  hamburger menu, as on the live site.
- Recurring pieces (section label with orange square, two-tone headline,
  orange primary button, outlined secondary button, tag chip, numbered step,
  card, grid-paper background) are written once as CSS classes and reused.

## Behavior

| Feature | Implementation |
|---|---|
| FAQ accordion | Native `<details>/<summary>`; first item open by default, as live. `+` / `×` icon via CSS. No JS. |
| Mobile menu | Button toggles the nav open/closed; `aria-expanded` kept in sync; closes on link click and Escape. |
| Newsletter | `fetch` POST to `https://formsubmit.co/ajax/kraigco@gmail.com`; inline success or error message; button disabled while sending. Without JS the form still posts normally to `https://formsubmit.co/kraigco@gmail.com`. |
| Appear animations, floating "Book a free audit" button | Reproduce what the live site does (timing, trigger, position). Motion is disabled under `prefers-reduced-motion: reduce`. |
| "See what I build" | Same-page anchor to the example workflows section (`#workflows`), as live. |

## Intended differences from the live site

Bugs fixed:

1. Contact page email link goes to `mailto:kraigco@gmail.com` (live goes to
   `mailto:hi@gadzin.ski`, a template leftover).
2. Every "Book a free audit" / "Book a free 15-min audit" button goes to
   `https://calendly.com/kraigco/15min` (one live variant links to
   `https://kraigco@gmail.com`, which opens gmail.com).
3. Phone number is a `tel:+639500657761` link.

Changes from leaving Framer:

4. The header and footer document icons open `/resume.pdf` (the new CV) in
   a new tab, replacing the Google Drive link.
5. About Me content is in the HTML, not rendered by JavaScript, and the page
   gets its own title and description.
6. Every image has alt text; every icon-only link has an accessible label.
7. Canonical URLs, Open Graph/Twitter URLs and the sitemap point to
   https://kraigco.github.io/kraigco/. (`robots.txt` only takes effect at a
   domain root, so it is omitted; it can be added with a custom domain.)
8. No "Made in Framer" badge and no Framer link in the footer.

Kept exactly as live (content decisions for the owner, not this project):
the two testimonial job titles, the empty avatar box on the "RK, Founder,
Rekreate Digital" review, the "5.0" rating and the stats (3+ / 40+ / 5).

## Verification

Tooling lives in the session scratchpad, not in the repo.

1. Visual: serve the site locally, screenshot all 4 pages at 1440, 810 and
   390 px, and compare each against the live reference screenshot side by
   side and with a pixel-difference score. Fix until the only remaining
   differences are the intended ones above, plus sub-pixel font rendering.
2. Links: crawl every page; every internal link returns 200 and every external
   link returns 2xx/3xx.
3. HTML: every page passes `html-validate` with no errors.
4. Behavior: scripted checks that the mobile menu opens and closes, FAQ items
   expand, and the newsletter form shows its success state (FormSubmit
   endpoint stubbed in the test).
5. Newsletter, live: one real test signup only with the owner's go-ahead. The
   first submission triggers FormSubmit's one-time activation email to
   kraigco@gmail.com, which the owner must click.

## Owner actions outside this project

- Fix the CV before publishing: it lists `kraig@gmail.com` (site uses
  `kraigco@gmail.com`), phone `+63 956 065 7761` (site says
  `+63 950 065 7761`), and the old portfolio URL. Replacing `resume.pdf` later
  is a one-file swap.
- After the work is merged to `main` and pushed, enable Pages on
  `kraigco/kraigco` (Settings → Pages → Deploy from a branch → `main`, `/`).
- If the layout came from a paid Framer template, confirm its license allows
  use outside Framer.
