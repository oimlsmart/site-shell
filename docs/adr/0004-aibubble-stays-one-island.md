# ADR 0004: AiBubble stays one island

Date: 2026-08-31
Status: accepted

## Context

`src/components/AiBubble.vue` is a ~1,100-line single-file component
(script + template + namespaced CSS). Every architecture review will
notice it and be tempted to split it (context chips, sessions view,
composer as child components).

## Decision

It stays one island. The reasoning:

- The logic already lives in deep modules: `src/ai/client.ts` (the
  service client), `src/ai/context.ts` (the page-context seam),
  `src/ai/markdown.ts` (the renderer). The SFC's script section is one
  state machine wiring those modules to the template — that wiring is
  the component.
- The deletion test fails for extraction: moving the chips or the
  sessions view into children moves complexity into props/emits
  ceremony without concentrating anything. There is no second consumer
  of any sub-concern.
- The CSS is deliberately unscoped and namespaced (the theme
  contract's :global ban); splitting the template would split the
  stylesheet with no gain.

## Consequences

- Reviews should stop proposing the split; this ADR is the reason.
- Revisit if a second consumer appears for a sub-concern (e.g. the
  chips outside this panel) or the state machine outgrows single-file
  review.
