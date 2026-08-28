# @oimlsmart/site-shell

The OIML SMART house shell — the one SSOT for the chrome of every OIML
SMART site: the federation header, the component-local minisite nav, the
logo hero, the docs layout, the footer, and the design tokens.

## Consume

```sh
npm i @oimlsmart/site-shell
```

```css
/* src/styles/app.css — the consumer imports tailwind first, then the
   tokens, then @sources the package so the shell's utilities compile. */
@import "tailwindcss";
@import "@oimlsmart/site-shell/tokens.css";
@source "../../node_modules/@oimlsmart/site-shell/src/**/*.{astro,vue}";
```

```astro
---
import { Base, MinisiteNav, PageHero } from '@oimlsmart/site-shell'
import '../styles/app.css'
---

<Base title="…" description="…">
  <MinisiteNav sections={[{ label: 'About', href: '/' }, …]} base="/recs" />
  …
</Base>
```

## Rules

- Logos are NOT shipped: consumers reference the canonical URLs under
  `https://www.oimlsmart.org/img/components/` (the sync-branding guard
  covers drift).
- Colors and type live ONLY in `src/styles/tokens.css` (+ blueprint.css).
  A token change ships as one package release consumed by every site.
- The internal-draft banner is opt-in (`<Base internal>`) — minisites are
  public.

## Theme contract

`.dark` is reserved. `Base.astro`'s FOUC script and `useTheme` put
`class="dark"` on `<html>` — never on a child, never as a free-floating
class on an arbitrary element. Components that need a light/dark style
difference key off the ancestor:

```css
/* correct — the theme class is on <html>, so the selector reaches it */
html.dark .my-thing { … }

/* wrong — a bare .dark rule applies TO the <html> element itself */
.dark { display: none; }          /* blanks the whole page */
.dark .my-thing { … }             /* works, but prefers html.dark for clarity */
```

In a Vue SFC, never write `:global(.dark)` (or any `:global(`) inside a
`<style scoped>` block. Vue only supports `:global` wrapping a whole
rule; used in prefix position (`:global(.dark) .x`), the compiler
silently drops the rest of the selector and emits a bare `.dark { … }`
rule — exactly the page-blanking bug that shipped in 0.1.2. Global rules
belong in a separate unscoped `<style>` block. (Astro's scoped styles
do support `:global()`; the ban is Vue-only.)

The fixture gate enforces this: `scripts/guard.mjs` rejects bare
theme-class `display:none` rules and Vue `:global(` in scoped styles,
and the Playwright render check loads the fixture in both schemes and
asserts the page actually lays out (a blank page still greps clean).
