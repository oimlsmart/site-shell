import { SITE } from './site.mjs'

/**
 * The www brand config — the identity values the www repo injects (they
 * were resolveBrand's baked defaults in src/data/site-meta.ts until
 * 0.2.0 moved them out; the package now carries no brand literals and
 * no default sign-in href). The shape is the package's BrandConfig.
 * @type {import('../../src/config/brand').BrandConfig}
 */
export const BRAND = {
  brandName: SITE.title,
  logoLight: `${SITE.url}/smart-logo-light.svg`,
  logoDark: `${SITE.url}/smart-logo-dark.svg`,
  homeHref: `${SITE.url}/`,
  signInHref: '/login/',
  themeColor: '#004996',
}
