# CONTEXT — the site-shell domain

The vocabulary for reviewing this package. Architecture terms (module,
depth, seam, locality, leverage) follow the house design vocabulary;
these are the domain names.

- **Machinery-only package** — the 0.2.0 doctrine (ADR-0005): the
  package ships components, theme runtime, tokens, the AI island, and
  the config contract, and no site content whatsoever. No default nav,
  no component registry, no brand literals, no default sign-in href.
  Content lives with the consumer; the reference copies live in
  `presets/www/` in this repository, which do not ship.
- **Injected config** — the typed contract in `src/config/` a consumer
  fills: `NavModel`, `BrandConfig`, `ServicesRegistry`, `FooterConfig`.
  An absent config renders no chrome: Base renders no header without
  `brand`/`nav` and no footer without `footer`; an absent `signInHref`
  renders no sign-in link. The components render exactly what they are
  given and invent nothing.
- **Federation chrome** — the header, footer, nav frames, and tokens
  every OIML SMART site shares. The package's reason to exist: one
  machinery source, rendered from each site's own injected content.
- **Minisite** — a component site (SMART Recommendations, SMART Studio,
  …) that mounts the chrome as Astro components via `Base`, injecting
  its own config.
- **Foreign site** — a site that cannot mount Astro components; it
  injects the exported chrome artifact instead (see Chrome export).
- **Nav model** — the consumer's `NavModel`: ordered items (dropdowns
  and standalone links), the optional product CTA, and the `origin`
  that relative hrefs resolve against. One model drives the desktop
  menu, the mobile overlay, and the footer's Explore column.
- **Brand config** — the consumer's `BrandConfig`: wordmark, logo pair,
  home href, optional sign-in href, optional theme-color. There are no
  package-side brand defaults to fall back to (the pre-0.2.0
  `resolveBrand` and its baked defaults are gone).
- **Services registry** — the consumer's `ServicesRegistry`: the
  service origins the property defines. The AI assistant reads `ai`
  from it when its flag carries no explicit `apiBase`; enabling the
  assistant with no origin anywhere is a build error.
- **Footer config** — the consumer's `FooterConfig`: description, link
  columns, the hosts column, attribution segments, legal links,
  copyright. The Explore column is the one derived part (from the nav
  model); everything else is injected.
- **Menus are labels only** — the dropdown contract: the header menus
  render a link's label, badge, and external marker, never its `desc`
  sentence. `SiteHeader` strips `desc` from the links before any island
  receives the model, so a description cannot reach a menu even through
  serialized island props. The type keeps `desc` for consumer-owned
  surfaces.
- **Preset** — a site's reference content in `presets/<site>/`
  (currently `presets/www/`): plain `.mjs` data leaves with `.d.mts`
  type twins, shaped to the injected-config contract. Presets are NOT
  exported from the package and NOT shipped in the tarball (`files` is
  `src` + `scripts`; the pack gate fails on any `presets/` path). The
  www repo adopts the preset in its own migration; this repo's fixture
  injects it to prove the injection surface.
- **Front door** — www.oimlsmart.org, the federation hub. Federation
  links resolve from any origin (ADR-0003): the ORIGIN now rides the
  injected config (`NavModel.origin`, `FooterConfig.origin`) and
  `resolveNavHref` absolutizes relative hrefs at render; registries
  keep relative slugs.
- **Logo pair** — `.logo-light`/`.logo-dark`: shell vocabulary. The
  swap rules live once in `tokens.css`; any component rendering the
  pair inherits the correct behavior (theme contract).
- **Account chip** — the logged-in identity affordance (profile photo +
  name) a consumer mounts into `Base`'s `signin` slot. It is identity,
  not navigation: it renders beside the nav and stays visible at every
  breakpoint; the mobile overlay hides its "Sign in" link when a chip
  is mounted (`hasSignin` threading). A chip replaces the default
  sign-in link; with no `signInHref` in the brand, neither renders.
- **Theme runtime** — `src/composables/useTheme.ts`. The only owner of
  `.dark` on `<html>`: the storage key, the FOUC bootstrap string, and
  the toggle composable. The theme contract (README) bans everything
  else from touching theme state.
- **Docs collection** — the consumer's `docs` content collection that
  `DocsSidebar` mounts, ordered per entry by `docs-sort`. The fixture
  carries a minimal one so the docs layout is gated like every other
  export.
- **Completeness gate (check-nav)** — `scripts/check-nav.mjs`: the
  consumer's CI check that every nav href resolves to a real page.
  Internal hrefs are checked against a routes list or a built dist
  tree; external hrefs are fetched unless `--offline`. A served page
  fails as a redirect stub (under the byte threshold carrying
  meta-refresh) or a placeholder (coming-soon markers, or a main
  element under the word threshold). Dependency-free (node stdlib).
- **The gate** — `npm run gate` + `npm run gate:render`: the proof that
  the injected chrome compiles in, the config-less page stays bare, the
  menus carry labels only, the tarball carries machinery only, and
  everything lays out in both color schemes. CI and the release
  workflow run the same two commands; nothing publishes without the
  gate.
- **Pack-contents assertion** — the gate leg that runs `npm pack
  --dry-run` and fails if the tarball carries any `presets/` path or
  site-content module under `src/data`. The tarball ships machinery
  only.
- **Chrome export** — the `dist-chrome/` artifact (header/footer/head
  fragments, markers, hashed assets) that foreign sites inject. The
  exported chrome is the fixture's, and the fixture injects the www
  preset, so the artifact carries the www chrome. The marker contract
  lives in `src/data/chrome.mjs`, shared by the chrome-export fixture
  page and `scripts/export-chrome.mjs`.
- **Tier** — the SMART vs SMART+ scope split. `TierToggle` swaps
  `data-tier="smart"` / `data-tier="smartplus"` blocks on a page.
- **AI bubble** — `AiBubble` (TODO.ai-platform/01), the platform assistant
  embedded from the ONE component: the header icon row at lg+, a
  floating button below lg (or always, in `standalone` mode for
  properties with their own chrome). Opt-in per property via
  `Base`/`SiteHeader`'s `aiAssistant` prop — absent means off; `true`
  reads the services registry, the object form overrides the origin.
  Cross-host theming rides `--ai-*` variables (shell token preferred,
  the house value as fallback), never the host's Tailwind scan. The
  component stays one island by design (ADR-0004).
- **Bubble bridge** — the AI service's sign-in handoff for embedded
  panels: `/auth/login?mode=bubble&origin=…` runs the OIDC round-trip,
  the callback's confirm page postMessages the service session token to
  the validated origin, and the panel sends it as `Authorization:
  Bearer` (shared cookies are the banned anti-pattern).
- **Trusted publishing** — the only npm publish path: push a `v*` tag,
  `release.yml` exchanges its GitHub Actions OIDC identity for a
  short-lived npm credential, publishes with provenance. No npm tokens
  exist anywhere.
