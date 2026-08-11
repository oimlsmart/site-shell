export type NavBadge = 'internal' | 'new'

export interface NavLink {
  readonly label: string
  readonly href: string
  readonly desc?: string
  readonly badge?: NavBadge
  readonly external?: boolean
}

export interface NavDropdownConfig {
  readonly id: string
  readonly label: string
  readonly variant: 'default' | 'internal'
  readonly sectionHeader?: string
  readonly links: readonly NavLink[]
}

export interface NavStandaloneLink {
  readonly label: string
  readonly href: string
  readonly matchPrefix: string
}

import { COMPONENTS, SMART_COMPONENTS, SMARTPLUS_COMPONENTS } from './components'

const componentLink = (c: typeof COMPONENTS[number]) => ({
  label: c.name,
  href: c.href,
  desc: c.desc,
})

export const NAV_DROPDOWNS: readonly NavDropdownConfig[] = [
  {
    id: 'smart',
    label: 'SMART',
    variant: 'default',
    // The SMART tier — published artifacts + IA/Type-approval level.
    // Components come from the ONE registry (components.ts).
    links: SMART_COMPONENTS.map(componentLink),
  },
  {
    id: 'smartplus',
    label: 'SMART+',
    variant: 'default',
    // The SMART+ tier — full Type-instance + measurement lifecycle.
    links: SMARTPLUS_COMPONENTS.map(componentLink),
  },
  {
    id: 'resources',
    label: 'Resources',
    variant: 'default',
    links: [
      // Internal routes — served by this site (the component minisites
      // live in the Components dropdown — one href, one home)
      { label: 'Document Library', href: '/library/', desc: 'Structured OIML document library' },
      { label: 'Publications', href: '/publications/', desc: 'The full OIML publications archive' },
      { label: 'Resolutions', href: '/resolutions/', desc: 'CIML resolutions and council decisions' },
      { label: 'Certificate Corpus', href: '/certificates/', desc: 'Every OIML-CS certificate, browsable and digitalized' },
      { label: 'Ontology', href: '/ontology/', desc: 'Semantic model: classes, properties, individuals' },
      { label: 'Learn', href: '/learn/', desc: 'The layered curriculum, tiers 0–5' },
      { label: 'Developer Docs', href: '/docs/', desc: 'Guides, architecture, specifications' },
      { label: 'The OIML SMART Program', href: '/programs/oiml-smart', desc: 'The program overview' },
      { label: 'Component Architecture', href: '/architecture', desc: 'The repos, the SSOT flow, the gates' },
      { label: 'The Docs Federation', href: 'https://primmel.github.io/primmel-smart-docs/', desc: 'The platform volumes — foundation to classroom', external: true },
    ],
  },
  {
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
  {
    id: 'internal',
    label: 'Internal',
    variant: 'internal',
    sectionHeader: 'OIML internal use only',
    links: [
      { label: 'Concepts Management', href: '/concepts-management/', desc: 'Term-usage registry', badge: 'internal' },
    ],
  },
] as const

export type NavItem =
  | { type: 'dropdown'; config: NavDropdownConfig }
  | { type: 'link'; label: string; href: string; matchPrefix: string }

export const NAV_ITEMS: readonly NavItem[] = [
  { type: 'dropdown', config: NAV_DROPDOWNS.find(d => d.id === 'smart')! },
  { type: 'dropdown', config: NAV_DROPDOWNS.find(d => d.id === 'smartplus')! },
  { type: 'dropdown', config: NAV_DROPDOWNS.find(d => d.id === 'resources')! },
  { type: 'link', label: 'News', href: '/news/', matchPrefix: '/news' },
  { type: 'dropdown', config: NAV_DROPDOWNS.find(d => d.id === 'about')! },
  { type: 'dropdown', config: NAV_DROPDOWNS.find(d => d.id === 'internal')! },
]

// The standalone OIML-CS top-level link folded into the /smart component
// entry (the nav contract: one href, one home).
export const NAV_STANDALONE: readonly NavStandaloneLink[] = [] as const

export function isLinkActive(href: string, currentPath: string): boolean {
  const normalized = href.replace(/\/$/, '')
  if (normalized === '') return currentPath === '/'
  return currentPath === href || currentPath.startsWith(href.endsWith('/') ? href : href + '/')
}

export function isDropdownActive(dropdown: NavDropdownConfig, currentPath: string): boolean {
  return dropdown.links.some(link => isLinkActive(link.href, currentPath))
}
