import { SITE, LEGAL, PARTNERS } from './site.mjs'
import { HOST_REGISTRY } from './host-registry.mjs'

/**
 * The www footer config — the content the www repo injects into the
 * shared footer frame (the columns, legal pages, attribution, and
 * copyright were literals inside src/components/SiteFooter.astro until
 * 0.2.0 moved them out). The shape is the package's FooterConfig; the
 * Explore column is NOT here — the footer derives it from the nav
 * model, while the Programme column stays a curated shortlist
 * (ADR-0002's principle, now riding injected config).
 * @type {import('../../src/config/footer').FooterConfig}
 */
export const FOOTER = {
  origin: SITE.url,
  description:
    'Machine-actionable Recommendations for the International Organization of Legal Metrology.',
  columns: [
    {
      heading: 'Programme',
      links: [
        { label: 'About OIML SMART', href: '/about/what-is-smart' },
        { label: 'Pilot programme', href: '/pilot' },
        { label: 'Contact', href: '/about/contact' },
        { label: 'GitHub', href: PARTNERS.github, external: true, icon: 'github' },
      ],
    },
  ],
  hosts: HOST_REGISTRY.map(h => ({ label: h.label, href: h.url })),
  attribution: [
    'A programme of the ',
    { label: 'International Organization of Legal Metrology', href: PARTNERS.oiml, external: true },
    ', delivered by ',
    { label: 'Ribose', href: PARTNERS.ribose, external: true },
  ],
  legal: [
    { label: 'Privacy', href: LEGAL.privacy },
    { label: 'Terms', href: LEGAL.terms },
  ],
  copyright: 'Content © OIML · Code © Ribose',
}
