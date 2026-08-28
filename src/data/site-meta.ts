/**
 * Site metadata + the brand resolver — the ONE home of the federation's
 * identity. Components never carry brand literals: they call
 * resolveBrand(), so a minisite override threads through header, mobile
 * overlay, and footer together, and the defaults cannot drift between
 * them (the 2026-08-24 missing-logo incident was exactly that drift).
 */

export const SITE = {
  url: 'https://www.oimlsmart.org',
  title: 'OIML SMART',
  description: 'Standards that are Machine-Actionable, Readable and Transferrable.',
  lang: 'en-US',
  feedTitle: 'OIML SMART pilot updates',
  feedDescription:
    'Working notes and milestone snapshots from the OIML SMART pilot programme.',
} as const

export interface BrandProps {
  /** The wordmark rendered beside the logos. */
  brandName?: string
  /** The light-scheme logo URL. */
  logoLight?: string
  /** The dark-scheme logo URL. */
  logoDark?: string
  /** Where the brand mark links — the federation front door. */
  homeHref?: string
  /** The sign-in link's target — the consuming service's auth start. */
  signInHref?: string
}

export interface ResolvedBrand {
  readonly brandName: string
  readonly logoLight: string
  readonly logoDark: string
  readonly homeHref: string
  readonly signInHref: string
}

const BRAND_DEFAULTS: ResolvedBrand = {
  brandName: SITE.title,
  logoLight: `${SITE.url}/smart-logo-light.svg`,
  logoDark: `${SITE.url}/smart-logo-dark.svg`,
  homeHref: `${SITE.url}/`,
  signInHref: '/login/',
}

/** Fill a partial brand with the federation defaults. */
export function resolveBrand(props: BrandProps = {}): ResolvedBrand {
  const brand = { ...BRAND_DEFAULTS }
  for (const key of Object.keys(BRAND_DEFAULTS) as (keyof ResolvedBrand)[]) {
    const value = props[key]
    if (value !== undefined) brand[key] = value
  }
  return brand
}

/** The canonical component-logo asset base (override only for staging). */
export const COMPONENT_ASSET_BASE = `${SITE.url}/img/components`

export default SITE
