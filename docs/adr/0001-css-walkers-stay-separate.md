# ADR 0001: guard.mjs and apply-chrome.mjs keep separate CSS walkers

Date: 2026-08-28
Status: accepted

## Context

Both scripts contain brace-aware CSS parsing:

- `scripts/guard.mjs` walks arbitrary CSS (comment/string-aware,
  recursive into at-rule containers) to audit selectors for bare
  theme-class `display:none` rules.
- `scripts/apply-chrome.mjs` splits the `@layer utilities` block of the
  chrome stylesheet to compose it into consumer pages.

Every architecture review so far has noticed the two and proposed a
shared parser module.

## Decision

They stay separate. The jobs are different — audit vs. extraction — and
they share only the concept of brace depth. A shared parser couples the
gate to the chrome injector for near-zero deduplication: the guard's
walker must understand strings, comments, and nesting anywhere in a
stylesheet, while apply-chrome's splitter only ever sees one known layer
of minified output. Forcing one interface over both would be shallow —
its options would encode which caller is calling.

## Consequences

- Future reviews should not re-propose unifying them; this ADR is the
  recorded reason.
- If a third consumer of brace-depth CSS parsing appears, revisit —
  two adapters is a real seam only if the shared interface stays deep
  without caller flags.
