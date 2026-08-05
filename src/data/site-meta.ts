/**
 * Site metadata — single source of truth.
 * Mirrors the VitePress version for the Astro migration.
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

export default SITE