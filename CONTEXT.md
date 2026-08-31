# CONTEXT — the site-shell domain

The vocabulary for reviewing this package. Architecture terms (module,
depth, seam, locality, leverage) follow the house design vocabulary;
these are the domain names.

- **Federation chrome** — the header, footer, nav, and tokens every
  OIML SMART site shares. The package's reason to exist: one source, no
  per-site copies.
- **Minisite** — a component site (SMART Recommendations, SMART Studio,
  …) that mounts the chrome as Astro components via `Base`.
- **Foreign site** — a site that cannot mount Astro components; it
  injects the exported chrome artifact instead (see Chrome export).
- **Brand** — the identity bundle: wordmark, light/dark logos, home
  link, sign-in target. One home: `resolveBrand()` in
  `src/data/site-meta.ts`; the raw constants (site URL, legal pages,
  partners) live in the node-safe leaf `src/data/site.mjs` so the gate
  asserts the same values the footer renders. Components never carry
  brand or site literals.
- **Front door** — www.oimlsmart.org, the federation hub. Federation
  links render front-door absolute via `frontDoor()` (ADR-0003) so the
  chrome's links resolve from any minisite origin; registries keep
  relative slugs, the origin is applied at render.
- **Logo pair** — `.logo-light`/`.logo-dark`: shell vocabulary. The
  swap rules live once in `tokens.css`; any component rendering the
  pair inherits the correct behavior (theme contract).
- **Account chip** — the logged-in identity affordance (profile photo +
  name) a consumer mounts into `Base`'s `signin` slot. It is identity,
  not navigation: it renders beside the nav and stays visible at every
  breakpoint; the mobile overlay hides its "Sign in" link when a chip
  is mounted (`hasSignin` threading).
- **Theme runtime** — `src/composables/useTheme.ts`. The only owner of
  `.dark` on `<html>`: the storage key, the FOUC bootstrap string, and
  the toggle composable. The theme contract (README) bans everything
  else from touching theme state.
- **Docs collection** — the consumer's `docs` content collection that
  `DocsSidebar` mounts, ordered per entry by `docs-sort`. The fixture
  carries a minimal one so the docs layout is gated like every other
  export.
- **The gate** — `npm run gate` + `npm run gate:render`: the proof that
  the chrome compiles in and lays out in both color schemes. CI and the
  release workflow run the same two commands; nothing publishes without
  the gate.
- **Chrome export** — the `dist-chrome/` artifact (header/footer/head
  fragments, markers, hashed assets) that foreign sites inject. The
  marker contract lives in `src/data/chrome.mjs`, shared by the
  chrome-export fixture page and `scripts/export-chrome.mjs`.
- **Tier** — the SMART vs SMART+ scope split. `TierToggle` swaps
  `data-tier="smart"` / `data-tier="smartplus"` blocks on a page.
- **AI bubble** — `AiBubble` (TODO.ai-platform/01), the estate assistant
  embedded from the ONE component: the header icon row at lg+, a
  floating button below lg (or always, in `standalone` mode for
  properties with their own chrome). Opt-in per property via
  `Base`/`SiteHeader`'s `aiAssistant` prop — absent means off.
  Cross-host theming rides `--ai-*` variables (shell token preferred,
  the house value as fallback), never the host's Tailwind scan. The
  AI service origin lives in the site constants leaf (`SERVICES.ai`);
  the component stays one island by design (ADR-0004).
- **Bubble bridge** — the AI service's sign-in handoff for embedded
  panels: `/auth/login?mode=bubble&origin=…` runs the OIDC round-trip,
  the callback's confirm page postMessages the service session token to
  the validated origin, and the panel sends it as `Authorization:
  Bearer` (shared cookies are the banned anti-pattern).
- **Trusted publishing** — the only npm publish path: push a `v*` tag,
  `release.yml` exchanges its GitHub Actions OIDC identity for a
  short-lived npm credential, publishes with provenance. No npm tokens
  exist anywhere.
