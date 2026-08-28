# ADR 0002: the footer's programme links stay literal, not derived from NAV_DROPDOWNS

Date: 2026-08-28
Status: accepted

## Context

`SiteFooter.astro`'s "Programme" column lists `/about/what-is-smart`,
`/pilot`, and `/about/contact` as literals. The same hrefs (and more)
exist in `NAV_DROPDOWNS.about` in `src/data/nav-config.ts`, so every
review proposes deriving the footer column from the dropdown config to
remove the duplication.

## Decision

The footer column stays literal. The two lists are different things
that happen to overlap today: the dropdown is the header's navigation
tree; the footer column is a curated shortlist of programme links. The
brand and site URLs are owned by `src/data/site.mjs` (one home, asserted
by the gate), but route *sets* are information architecture, and the
footer's curation is allowed to diverge from the header's tree.

## Consequences

- Reviews should stop proposing the merge; the duplication is curated,
  not accidental.
- If the footer column should ever track the dropdown, that is an owner
  decision to revisit this ADR, not a cleanup.
