/**
 * The component registry (TODO.components) — the ONE definition of the
 * OIML SMART components. Every surface that lists the components (the
 * index's grid, the header's SMART and SMART+ dropdowns) reads from
 * here — never a second copy.
 *
 * Scope split (2026-08):
 * - SMART tier: the published, expert-authored artifacts and the
 *   platforms that run them. CNML at the IA / Type-approval level.
 * - SMART+ tier: the full instrument-instance lifecycle. CNML at the
 *   Type-instance + measurement level, plus SMI and SST.
 *
 * The two OIML-CS platforms (SMART, SMART+) are the global deployment
 * and a single runtime; the two OIML platforms are the optional
 * member/NMI/TL deployments that federate with the global one. Same
 * routes, tier toggle on the destination page distinguishes scope.
 */

export type ComponentTier = 'smart' | 'smartplus'
export type ComponentDeployment = 'global' | 'member'

export interface SmartComponent {
  /** Display name. */
  name: string
  /** The canonical route (GitHub Pages serves the component's repo here). */
  href: string
  /** One-sentence description for the nav dropdown. */
  desc: string
  /** The brief index-card explanation (style-guide register). */
  detail: string
  /** The logo slug at /img/components/<slug>-{light,dark}.svg, when the component has one. */
  logo?: string
  /** One sentence stating what the logo shows (the style guide's rule). */
  alt?: string
  /** Scope tier — SMART (published artifacts + IA-level cert) or SMART+ (full instance lifecycle). */
  tier: ComponentTier
  /** For platform components: global (OIML-CS) or member (OIML SMART) deployment. */
  deployment?: ComponentDeployment
}

export const COMPONENTS: readonly SmartComponent[] = [
  // ── SMART tier ──────────────────────────────────────────────────
  {
    name: 'SMART Recommendations',
    href: '/recs',
    desc: 'The published, expert-authored executable Recommendations',
    detail: 'The published, expert-authored executable Recommendations. R 60 is the pilot reference; other Recommendations are modelled for demonstration.',
    logo: 'smart-rec',
    alt: 'The SMART Recommendations logo.',
    tier: 'smart',
  },
  {
    name: 'SMART Vocabulary',
    href: '/vocab',
    desc: 'The governed terminology across publications',
    detail: 'The shared terminology. Every concept in a SMART Recommendation resolves to one governed term across publications.',
    logo: 'vocab',
    alt: 'The SMART Vocabulary logo.',
    tier: 'smart',
  },
  {
    name: 'SMART Resources',
    href: '/publications',
    desc: 'The publications and resolutions databases',
    detail: 'The publications and resolutions databases. The full OIML corpus, searchable and cross-referenced.',
    tier: 'smart',
  },
  {
    name: 'SMART Studio',
    href: '/studio',
    desc: 'View and author SMART Recommendations',
    detail: 'The canvas for viewing and authoring SMART Recommendations. An expert models a Recommendation graphically and the model is the published artifact.',
    logo: 'smart-studio',
    alt: 'The SMART Studio logo.',
    tier: 'smart',
  },
  {
    name: 'OIML CNML (IA level)',
    href: '/cnml',
    desc: 'The machine-readable certificate at the Type-approval level',
    detail: 'The Certificat Numérique de Métrologie Légale at the Issuing-Authority / Type-approval level. The machine-readable certificate an issuing authority signs for a certified type, verifiable by anyone in a browser.',
    logo: 'cnml-box',
    alt: 'The OIML CNML logo.',
    tier: 'smart',
  },
  {
    name: 'OIML-CS SMART Platform',
    href: '/smart',
    desc: 'Global deployment · applications → testing → evaluation → certificates → registration',
    detail: 'The OIML-CS global deployment. Applications, testing, evaluation, certificates, and BIML registration run as one digital workflow, hosted by the OIML-CS for every member state.',
    logo: 'cs-smart',
    alt: 'The OIML-CS SMART platform logo.',
    tier: 'smart',
    deployment: 'global',
  },
  {
    name: 'OIML SMART Platform',
    href: '/platform',
    desc: 'Member/NMI/TL deployment · federates with the global OIML-CS',
    detail: 'The optional member-state deployment of the SMART runtime. NMIs, test laboratories, and issuing authorities may run their own instance — workflow engine and certificate PKI — federating with the global OIML-CS SMART Platform, or use the global platform directly.',
    logo: 'smart-platform',
    alt: 'The OIML SMART Platform logo.',
    tier: 'smart',
    deployment: 'member',
  },

  // ── SMART+ tier ─────────────────────────────────────────────────
  {
    name: 'OIML CNML (full)',
    href: '/cnml',
    desc: 'Type-instance + measurement level · the live instrument certificate',
    detail: 'CNML at the Type-instance and measurement level. The certificate covers the individual instrument in service, its calibration, and the measurement stream — verifiable in eight checks at any point in the instrument’s life.',
    logo: 'cnml-box',
    alt: 'The OIML CNML logo.',
    tier: 'smartplus',
  },
  {
    name: 'SMART Measuring Instruments',
    href: '/smi',
    desc: 'The physical instrument is the API',
    detail: 'Physical instruments that provide a SMART digital twin. The instrument itself is the API that certification and continuous compliance talk to.',
    logo: 'smi',
    alt: 'The SMART Measuring Instruments logo.',
    tier: 'smartplus',
  },
  {
    name: 'SST for Measuring Instruments',
    href: '/sst',
    desc: 'The simulated SMART twin — no hardware needed',
    detail: 'The Simulated SMART Twin. The ACME LC-500 family and its siblings simulate metrologically real physics, so test programs run without hardware.',
    logo: 'sst',
    alt: 'The SST for Measuring Instruments logo.',
    tier: 'smartplus',
  },
  {
    name: 'OIML-CS SMART+ Platform',
    href: '/smart',
    desc: 'Global deployment · Type-instance + measurement lifecycle',
    detail: 'The OIML-CS global SMART+ deployment. Extends the SMART workflow to the full Type-instance and measurement lifecycle — every certified instrument in service, continuously.',
    logo: 'cs-smartplus',
    alt: 'The OIML-CS SMART+ platform logo.',
    tier: 'smartplus',
    deployment: 'global',
  },
  {
    name: 'OIML SMART+ Platform',
    href: '/platform',
    desc: 'Member/NMI/TL deployment · Type-instance + measurement lifecycle',
    detail: 'The optional member-state SMART+ deployment. Run a local instance of the full instrument-lifecycle runtime, federating Type-instance and measurement data with the global OIML-CS SMART+ Platform.',
    logo: 'smartplus',
    alt: 'The OIML SMART+ Platform logo.',
    tier: 'smartplus',
    deployment: 'member',
  },
] as const

/** Filter helpers — the two dropdowns and the two index sections read these. */
export const SMART_COMPONENTS = COMPONENTS.filter(c => c.tier === 'smart')
export const SMARTPLUS_COMPONENTS = COMPONENTS.filter(c => c.tier === 'smartplus')
