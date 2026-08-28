/**
 * The site constants leaf — node-importable (the gate runs under plain
 * node and cannot load .ts), the same pattern as theme.mjs. site-meta.ts
 * re-exports SITE for bundler consumers; the footer and the gate both
 * consume from here, so the page and its proof cannot diverge on the
 * spelling of a site URL.
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
