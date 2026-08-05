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
