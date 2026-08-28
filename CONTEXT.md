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
  `src/data/site-meta.ts`. Components never carry brand literals.
- **Theme runtime** — `src/composables/useTheme.ts`. The only owner of
  `.dark` on `<html>`: the storage key, the FOUC bootstrap string, and
  the toggle composable. The theme contract (README) bans everything
  else from touching theme state.
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
- **Trusted publishing** — the only npm publish path: push a `v*` tag,
  `release.yml` exchanges its GitHub Actions OIDC identity for a
  short-lived npm credential, publishes with provenance. No npm tokens
  exist anywhere.
