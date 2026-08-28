// @oimlsmart/site-shell — the package's named entry. Components also
// import via the ./components/* subpath, tokens via ./tokens.css, the
// registries via ./data/*.
export { default as Base } from './components/Base.astro'
export { default as SiteHeader } from './components/SiteHeader.astro'
export { default as SiteFooter } from './components/SiteFooter.astro'
export { default as MinisiteNav } from './components/MinisiteNav.astro'
export { default as PageHero } from './components/PageHero.astro'
export { default as DocsSidebar } from './components/DocsSidebar.astro'
export { default as InternalBanner } from './components/InternalBanner.astro'
export { default as TierToggle } from './components/TierToggle.astro'
export { default as ComponentLogo } from './components/ComponentLogo.astro'

// The theme runtime — the one owner of dark-mode state (theme contract, README).
export {
  THEME_STORAGE_KEY,
  THEME_CLASS,
  THEME_BOOTSTRAP,
  resolveInitialTheme,
  isDarkPreferred,
  useTheme,
} from './composables/useTheme'

// The brand resolver + site metadata — the one home of the federation identity.
export { SITE, resolveBrand, COMPONENT_ASSET_BASE } from './data/site-meta'
export type { BrandProps, ResolvedBrand } from './data/site-meta'
