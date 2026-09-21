# ADR 0005: the package ships machinery only — site content is injected config

Date: 2026-09-21
Status: accepted

## Context

Through 0.1.x the package baked one site's content into the shell:
`src/data/nav-config.ts` (the www nav model), `src/data/components.ts`
(the component registry), `src/data/site.mjs` and `src/data/site-meta.ts`
(site, legal, partner, and service literals, plus `resolveBrand`'s baked
brand defaults including a default sign-in href), and
`src/data/host-registry.mjs` (the footer's site list). `Base.astro`
auto-rendered the header from the baked nav, and the dropdown renderer
printed each link's `desc` sentence under its label. Every non-www
consumer inherited www's information architecture, and every content
change forced a package release. Two further defects rode along: menus
carried description sentences under their labels, and a consumer could
not render the shell without adopting www's sign-in target.

## Decision

Effective 0.2.0 the package ships machinery only. The content moves out:

- The typed injection contract lives in `src/config/` — `NavModel`
  (ordered dropdowns + standalone links + the product CTA + the
  origin), `BrandConfig` (identity; `signInHref` optional, no default),
  `ServicesRegistry` (the service origins; the AI island reads `ai`),
  and `FooterConfig` (footer copy, columns, hosts, legal, attribution,
  copyright).
- `Base` accepts `nav`, `brand`, `services`, and `footer` props and
  threads them down. It renders no header when neither `brand` nor
  `nav` is injected, and no footer when `footer` is absent. The
  components omit any block whose content was not injected.
- The moved content is preserved in this repository at `presets/www/`
  as the reference preset — plain `.mjs` data leaves with `.d.mts`
  twins, NOT exported from the package, NOT shipped in the tarball
  (`files` is `src` + `scripts`; the gate's pack-contents assertion
  fails if a `presets/` path or a content module under `src/data`
  appears). The www repo adopts the preset in its own Track-02 act.
- Header menus render labels only: `NavLink.desc` stays in the type
  for consumer-owned surfaces, but `SiteHeader` strips it at the
  boundary (`terseItems`) so no dropdown — rendered or hydrated — can
  print it. The gates prove it statically and in the DOM.
- A completeness helper, `scripts/check-nav.mjs`, lets a consumer's CI
  prove every nav href resolves to a real page (routes list or dist
  tree for internal hrefs, fetching with `--offline` for external,
  failing on redirect stubs and placeholders).

## Consequences

- ADR-0002's principle carries forward with the polarity flipped: the
  footer's Programme column stays a curated list independent of the nav
  tree, but as an injected `FooterColumn` rather than a component
  literal.
- ADR-0003 is amended, not reverted: federation links still resolve
  from any origin, but the origin travels with the injected model
  (`NavModel.origin`, `FooterConfig.origin`) instead of a package
  constant; `resolveNavHref` replaces `frontDoor()`.
- `resolveBrand`, `SITE`, `LEGAL`, `PARTNERS`, `SERVICES`, and
  `COMPONENT_ASSET_BASE` are no longer package exports. Consumers
  declare their own values; the exports map gains `./config`, `./brand`,
  `./theme`, and `./chrome/astro` in their place.
- Consumers must update in lockstep: 0.2.0 is a breaking release by
  design, and the fixture proves the full injection surface with the
  preset.
- Enabling the AI assistant without any configured origin is a build
  error, never a silent default origin.
