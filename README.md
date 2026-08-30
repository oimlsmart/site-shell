# @oimlsmart/site-shell

The OIML SMART house shell — the one SSOT for the chrome of every OIML
SMART site: the federation header, the component-local minisite nav, the
logo hero, the docs layout, the footer, and the design tokens. Astro
sites mount the components; sites that cannot mount Astro inject the
exported chrome artifact. Domain vocabulary lives in `CONTEXT.md`.

## Consume (an Astro site)

```sh
npm i @oimlsmart/site-shell
```

The package ships raw source — peer dependencies are `astro >= 5` and
`vue >= 3.5`; your bundler compiles the components.

```css
/* src/styles/app.css — import tailwind first, then the tokens, then
   @source the package so the shell's utilities compile into your CSS. */
@import "tailwindcss";
@import "@oimlsmart/site-shell/tokens.css";
@source "../../node_modules/@oimlsmart/site-shell/src/**/*.{astro,vue}";
```

Optional: `@import "@oimlsmart/site-shell/blueprint.css"` for the
editorial page scaffolding (grid, prose, hero polish).

```astro
---
import { Base, MinisiteNav, PageHero } from '@oimlsmart/site-shell'
import '../styles/app.css'
---

<Base title="…" description="…" signInHref="/auth/login">
  <MinisiteNav sections={[{ label: 'About', href: '/' }, …]} base="/recs" />
  <PageHero title="…" lede="…" logo={{ name: 'smart-rec', alt: '…' }} />
  <slot />  <!-- your page -->
</Base>
```

### What the package exports

| subpath | contents |
|---|---|
| `.` (root) | `Base`, `SiteHeader`, `SiteFooter`, `MinisiteNav`, `PageHero`, `DocsSidebar`, `InternalBanner`, `TierToggle`, `ComponentLogo`, `AiBubble`, the theme runtime (`useTheme`, `THEME_BOOTSTRAP`, …), the brand resolver (`resolveBrand`, `SITE`) |
| `./components/*` | every component directly, for the subpaths the root entry doesn't name |
| `./ai/*` | the assistant's API client + markdown-lite renderer (AiBubble's machinery) |
| `./tokens.css` / `./blueprint.css` | the design tokens / the editorial scaffolding |
| `./data/*` | the component registry, the nav config, site metadata — importable so federation sites re-export the ONE registry instead of carrying drift-prone copies |

### The AI assistant bubble (opt-in)

The estate's AI assistant (ai.oimlsmart.org) embeds as ONE component —
never a per-app copy. Off by default; a property opts in per page shell:

```astro
<Base title="…" aiAssistant />                                 <!-- the public service -->
<Base title="…" aiAssistant={{ apiBase: 'https://…' }} />     <!-- staging override -->
```

The launcher lands in the header's icon row at lg+ and as a floating
button below lg; the panel is a card on desktop and a full sheet on
small screens. Properties with their own chrome (the smart platform)
mount the component directly in standalone mode:

```astro
---
import { AiBubble } from '@oimlsmart/site-shell'
---
<AiBubble client:load mode="standalone" />
```

The contract (the honest postures the component keeps):

- **Auth**: anonymous visitors get the public corpus tier, marked
  "Anonymous — public corpus"; their conversations stay on the device
  (localStorage), never synced. Sign-in rides the service's bubble
  bridge (`/auth/login?mode=bubble&origin=…` on the AI service — the
  OIDC round-trip, then a confirm page hands the service's session token
  to this origin by postMessage; the estate bans shared cookies, so the
  token rides as `Authorization: Bearer`, held in sessionStorage).
  Signed-in members get their synced conversation list — the same
  sessions ai.oimlsmart.org shows.
- **Answers** stream from `POST /api/ask` (SSE citations → tokens →
  done) and render markdown-lite — an escape-first renderer; model
  output can never inject markup. Citations render as cards linking the
  source publication; a superseded source is marked.
- **Theming**: every color rides an `--ai-*` custom property that
  prefers the shell token and falls back to the house value, so the
  component is dark-correct on hosts without tokens.css (the platform's
  own palette). Layout is the component's own plain CSS — the host's
  Tailwind scan is never required.
- The chrome-export artifact (foreign sites) does NOT carry the bubble —
  it is static HTML; the assistant is an island.

The gate covers it: the flagged fixture page proves the launcher
compiles, the flagless pages prove the default is off, and the render
gate drives the panel against a stubbed service (the streamed answer,
the citation card, an XSS payload staying inert, the bridge sign-in, the
member conversation list, the mobile sheet, the 44px floor, Esc).

### Brand overrides

Brand identity resolves in exactly one place. Pass any of
`brandName`, `logoLight`, `logoDark`, `homeHref`, `signInHref` to
`Base` and it threads through the header, the mobile overlay, and the
footer together — never re-specify defaults per component:

```astro
<Base title="Certificates" description="…" brandName="OIML CS" signInHref="/auth/login" />
```

### Slots

`Base` exposes `head` (extra `<head>` tags) and `signin` (replace the
header's default sign-in link — e.g. an account-chip island with the
logged-in user's profile photo). The signin slot renders **beside** the
nav, never inside it, so the chip stays visible at every breakpoint;
keep chips compact and mark them `shrink-0`. When real slot content is
mounted, the mobile overlay drops its own "Sign in" link.
`MinisiteNav` exposes a right-aligned slot for nav-local utilities.

### Tiered pages (SMART / SMART+)

```astro
<TierToggle />
<div data-tier="smart">…type-approval scope…</div>
<div data-tier="smartplus">…full instance lifecycle…</div>
```

### Theme-aware scripts

If your page needs the current scheme, use the theme runtime — never
read `localStorage` or `.dark` yourself:

```ts
import { useTheme, isDarkPreferred } from '@oimlsmart/site-shell'
```

## Consume (a foreign-built site)

Sites that cannot mount Astro components (full-document generators)
inject the exported chrome instead. Build the fixture, export, apply:

```sh
node scripts/export-chrome.mjs   # fixture dist → dist-chrome/ (header.html, footer.html, head.html, _astro/**, manifest.json)
node scripts/apply-chrome.mjs --dist <your-dist> [--base /your-base] [--skip <prefix>]
```

The scripts ship in the npm tarball (`files: src, scripts`), so an
installed consumer runs them from
`node_modules/@oimlsmart/site-shell/scripts/`. `apply-chrome.mjs`
rewrites the asset URLs to your base and injects the fragments into
your built pages; `--skip` leaves matched paths unchromed. The marker
contract between the export page and the exporter lives in
`src/data/chrome.mjs`.

## Docs layout

`DocsSidebar` mounts your `docs` content collection (entries with
optional `title`, `shortTitle`, and numeric `order`; sections are id
prefixes like `guides/…`). Declare the collection in your
`src/content.config.ts` and pass `order`/`labels`/`hrefBase` to match
your layout. `SearchBox` takes an optional `base` prop if your
pagefind index is not at the site root (GitHub Pages project sites).

## Theme contract

`.dark` is reserved. `Base.astro`'s FOUC bootstrap (THEME_BOOTSTRAP from
the theme runtime) and `useTheme` put `class="dark"` on `<html>` —
never on a child, never as a free-floating class on an arbitrary
element. Components that need a light/dark difference key off the
ancestor:

```css
/* correct — the theme class is on <html>, so the selector reaches it */
html.dark .my-thing { … }

/* wrong — a bare .dark rule applies TO the <html> element itself */
.dark { display: none; }          /* blanks the whole page */
```

In a Vue SFC, never write `:global(.dark)` (or any `:global(`) inside a
`<style scoped>` block. Vue only supports `:global` wrapping a whole
rule; used in prefix position (`:global(.dark) .x`), the compiler
silently drops the rest of the selector and emits a bare `.dark { … }`
rule — exactly the page-blanking bug that shipped in 0.1.2. Global rules
belong in a separate unscoped `<style>` block. (Astro's scoped styles
do support `:global()`; the ban is Vue-only.)

## Rules

- Logos are NOT shipped: consumers reference the canonical URLs under
  `https://www.oimlsmart.org/img/components/` (the sync-branding guard
  covers drift). `resolveBrand`/`COMPONENT_ASSET_BASE` are the only
  homes for those URLs.
- Colors and type live ONLY in `src/styles/tokens.css` (+ blueprint.css).
  A token change ships as one package release consumed by every site.
- The internal-draft banner is opt-in (`<Base internal>`) — minisites are
  public.

## The gate

`npm run gate` and `npm run gate:render` (after building the fixture in
`test/fixture/`) are the package's proof, and exactly what CI and the
release workflow run — one definition, no drift:

- **gate** — the chrome compiled into the built fixture (header, brand,
  tokens, threaded props), the showcase components mounted, the a11y
  legs (skip link, labelled landmarks), the theme guard clean (no bare
  `.dark{display:none}` rules anywhere, no `:global(` in Vue scoped
  styles), and the chrome-export pipeline proven: export → apply to a
  foreign page → asset rewrite → idempotence.
- **gate:render** — Playwright loads each fixture page in **both** color
  schemes and asserts layout geometry (not computed colors — a blank
  page still greps clean and passes color probes), the mobile dialog's
  open/Esc behavior, plus screenshots as artifacts.

Federation links (header nav, footer columns, the internal banner)
render front-door absolute via `frontDoor()` — the chrome's links
resolve from any minisite origin (ADR-0003).

## Releases — trusted publishing only

npm publishes happen **only** through GitHub Actions OIDC trusted
publishing; no npm token exists anywhere and `npm publish` is never run
locally. A release is:

1. changes land on `main` via PR (the gate runs on every PR);
2. the version bump PR merges (`package.json` version = the release);
3. someone pushes the matching tag — `git tag v0.1.3 && git push origin v0.1.3`;
4. `release.yml` verifies tag ↔ version, runs the same gate, then
   publishes with a provenance attestation bound to this repo;
5. verify: `npm view @oimlsmart/site-shell version`.

The tag push is the release trigger — treat it accordingly. Superseded
broken versions are deprecated on the registry (`npm deprecate
@oimlsmart/site-shell@0.1.2 "…"`) once the fix is live, never yanked.
