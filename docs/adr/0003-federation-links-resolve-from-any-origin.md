# ADR 0003: federation links resolve from any origin

Date: 2026-08-29
Status: accepted

## Context

The chrome renders on every OIML SMART site, including minisites on
their own origins (GitHub Pages project sites, component domains).
But the federation's links — the header dropdowns (`/recs`,
`/publications/`, …), the News item, the footer's programme column, and
the internal banner's `/pilot` — were root-relative, resolving only on
www.oimlsmart.org. From a minisite origin they 404'd. Commit 7508918
fixed exactly this class for brand assets ("the root-relative src broke
every minisite's local link check"); the links never got the same
treatment.

ADR-0002 keeps the footer's programme *list* literal and curated; this
ADR is orthogonal — it fixes where the links point, not which links
appear.

## Decision

Federation links render front-door absolute: one helper,
`frontDoor(path)` in `src/data/site-meta.ts` (derived from `SITE.url`),
applied where links render (NavDropdown's internal links, the News
item, the footer's columns, the internal banner). Links flagged
`external: true` keep their own origin. The registries (`nav-config`,
`components`) keep clean relative slugs — consumers that want local
paths still get them; the origin decision happens at render, in one
place.

## Consequences

- Minisite chrome stops shipping dead links with no per-site work.
- New federation routes are slugs in the registry; rendering them
  anywhere makes them origin-safe automatically.
- The gate asserts front-door hrefs in the built pages, so a
  root-relative regression fails CI.
