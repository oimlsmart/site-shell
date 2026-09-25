import { SITE } from './site.mjs'
import { SMART_COMPONENTS, SMARTPLUS_COMPONENTS } from './components.mjs'

/**
 * The www nav model — moved out of the package in 0.2.0 (it was
 * src/data/nav-config.ts, one site's nav baked into the shell). The
 * shape is the package's NavModel: ordered items (dropdowns +
 * standalone links) and the front-door origin that relative hrefs
 * resolve against at render. The active-path predicates live in the
 * package (@oimlsmart/site-shell/config) — this file is data only.
 */

const componentLink = (c) => ({ label: c.name, href: c.href, desc: c.desc })

const DROPDOWNS = {
  smart: {
    id: 'smart',
    label: 'SMART',
    variant: 'default',
    // The SMART tier — published artifacts + IA/Type-approval level.
    // Components come from the ONE registry (components.mjs).
    links: SMART_COMPONENTS.map(componentLink),
  },
  smartplus: {
    id: 'smartplus',
    label: 'SMART+',
    variant: 'default',
    // The SMART+ tier — full Type-instance + measurement lifecycle.
    links: SMARTPLUS_COMPONENTS.map(componentLink),
  },
  resources: {
    id: 'resources',
    label: 'Resources',
    variant: 'default',
    links: [
      // Internal routes — served by this site (the component minisites
      // live in the SMART dropdown — one href, one home)
      { label: 'Document Library', href: '/library/', desc: 'Structured OIML document library' },
      { label: 'Publications', href: '/publications/', desc: 'The full OIML publications archive' },
      { label: 'Resolutions', href: '/resolutions/', desc: 'CIML resolutions and council decisions' },
      { label: 'Certificate Corpus', href: '/certificates/', desc: 'Every OIML-CS certificate, browsable and digitalized' },
      { label: 'Ontology', href: '/ontology/', desc: 'Semantic model: classes, properties, individuals' },
      { label: 'Learn', href: '/learn/', desc: 'The layered curriculum, tiers 0–5' },
      { label: 'Developer Docs', href: '/docs/', desc: 'Guides, architecture, specifications' },
      { label: 'The OIML SMART Program', href: '/programs/oiml-smart', desc: 'The program overview' },
      { label: 'Component Architecture', href: '/architecture', desc: 'The repos, the SSOT flow, the gates' },
      { label: 'The Docs Federation', href: 'https://www.primmel.org/primmel-smart-docs/', desc: 'The platform volumes — foundation to classroom', external: true },
    ],
  },
  about: {
    id: 'about',
    label: 'About',
    variant: 'default',
    links: [
      { label: 'What is OIML SMART?', href: '/about/what-is-smart' },
      { label: 'Who it is for', href: '/about/audiences' },
      { label: 'Why SMART', href: '/about/why-smart' },
      { label: 'How It Works', href: '/about/how-it-works' },
      { label: 'Technology', href: '/about/technology' },
      { label: 'Contact', href: '/about/contact' },
      { label: 'Branding', href: '/about/branding' },
    ],
  },
  internal: {
    id: 'internal',
    label: 'Internal',
    variant: 'internal',
    sectionHeader: 'OIML internal use only',
    links: [
      { label: 'Concepts Management', href: '/concepts-management/', desc: 'Term-usage registry', badge: 'internal' },
    ],
  },
}

export const NAV_MODEL = {
  // Front-door absolute at render (ADR-0003): the chrome's links
  // resolve from any minisite origin.
  origin: SITE.url,
  items: [
    { type: 'dropdown', config: DROPDOWNS.smart },
    { type: 'dropdown', config: DROPDOWNS.smartplus },
    // The four first-class front-door sections (TODO.promotion/01: the
    // public story's role-first navigation). Standalone links while the
    // sections carry only their index pages; each promotes to a dropdown
    // when its member pages land (waves 02-04).
    { type: 'link', label: 'Audiences', href: '/audiences/', matchPrefix: '/audiences' },
    { type: 'link', label: 'Technologies', href: '/technologies/', matchPrefix: '/technologies' },
    { type: 'link', label: 'Use Cases', href: '/use-cases/', matchPrefix: '/use-cases' },
    { type: 'link', label: 'Services', href: '/services/', matchPrefix: '/services' },
    { type: 'dropdown', config: DROPDOWNS.resources },
    { type: 'link', label: 'News', href: '/news/', matchPrefix: '/news' },
    { type: 'dropdown', config: DROPDOWNS.about },
    { type: 'dropdown', config: DROPDOWNS.internal },
  ],
}
