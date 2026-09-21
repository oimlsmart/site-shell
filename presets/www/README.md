# presets/www — the reference preset for the www property

This directory is **not package content**. The site-shell package ships
machinery only: components, theme runtime, tokens, the AI island, and
the injected-config contract in `src/config/`. Everything here is the
www site's own data — nav model, brand, services, footer copy, the
component registry — kept in this repository so that:

- the www repo's Track-02 act can adopt the files verbatim (they are
  the exact content the package baked in before 0.2.0, reshaped to the
  injected-config contract), and
- this repository's test fixture can inject them and prove the
  injection surface renders the full chrome (the `gate` and
  `gate:render` scripts import this directory directly).

Nothing here is exported from the package's entry points, and nothing
here ships in the npm tarball (`files` is `src` + `scripts`; the pack
gate fails if any `presets/` path appears in `npm pack --dry-run`).

## The files

| file | carries | injected as |
|---|---|---|
| `site.mjs` | the site constants: URL, title, legal pages, partners, service origins, component-logo asset base | the literal source for the configs below |
| `brand.mjs` | `BRAND` — wordmark, logo pair, home href, sign-in href, theme color | `Base`/`SiteHeader`'s `brand` prop (`BrandConfig`) |
| `nav-config.mjs` | `NAV_MODEL` — dropdowns, standalone links, the front-door origin | the `nav` prop (`NavModel`) |
| `footer.mjs` | `FOOTER` — description, the Programme column, The sites column, attribution, legal, copyright | the `footer` prop (`FooterConfig`) |
| `host-registry.mjs` | the federation's public properties | folded into `FOOTER.hosts` |
| `components.mjs` | the component registry (names, routes, tiers, logos) | www's own surfaces (index grid, dropdown links) |
| `index.mjs` | the barrel the fixture imports | — |

Data leaves are plain `.mjs` (the repo's node-safe pattern: the gate
runs under plain node and imports the same values the fixture renders),
each with a `.d.mts` type twin declaring the shape from
`src/config/`. A consumer that prefers `.ts` copies the values into
its own typed modules when it adopts the preset.

## Completeness

`scripts/check-nav.mjs` is the consumer's completeness gate: point it
at a nav model (JSON or module) and a routes list or built `dist` tree,
and it fails on any entry whose href no route serves, on redirect
stubs, and on placeholder pages. www's CI runs it against its own
`NAV_MODEL` once the preset is adopted.
