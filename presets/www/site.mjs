/**
 * The www site constants — moved out of the package in 0.2.0 (they were
 * src/data/site.mjs, a brand-literal leaf the package baked in; the
 * package now ships machinery only). Node-importable so the gate and
 * check-nav run under plain node.
 */
export const SITE = {
  url: 'https://www.oimlsmart.org',
  title: 'OIML SMART',
  description: 'Standards that are Machine-Actionable, Readable and Transferrable.',
  lang: 'en-US',
  feedTitle: 'OIML SMART pilot updates',
  feedDescription:
    'Working notes and milestone snapshots from the OIML SMART pilot programme.',
}

/** The canonical legal pages (the footer's Privacy/Terms targets). */
export const LEGAL = {
  privacy: `${SITE.url}/privacy`,
  terms: `${SITE.url}/terms`,
}

/** Programme partners referenced by the footer's bottom bar. */
export const PARTNERS = {
  oiml: 'https://www.oiml.org',
  ribose: 'https://www.ribose.com',
  github: 'https://github.com/oimlsmart',
}

/** The service surfaces the chrome reads. The status service and the AI
 *  service live on their own origins, so the links are literal here,
 *  never front-door derived. */
export const SERVICES = {
  status: 'https://status.oimlsmart.org',
  ai: 'https://ai.oimlsmart.org',
}

/** The canonical component-logo asset base (override only for staging). */
export const COMPONENT_ASSET_BASE = `${SITE.url}/img/components`
