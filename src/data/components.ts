/**
 * The component registry (TODO.components) — the ONE definition of the
 * OIML SMART components. Every surface that lists the components (the
 * index's grid, the header's Components dropdown) reads from here —
 * never a second copy.
 */

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
}

export const COMPONENTS: readonly SmartComponent[] = [
  {
    name: 'SMART Recommendations',
    href: '/recs',
    desc: 'The published, expert-authored executable Recommendations',
    detail: 'The published, expert-authored executable Recommendations. R 60, R 91, R 129, and R 144 are modelled today, each with clause-level provenance to the source document.',
    logo: 'smart-rec',
    alt: 'The SMART Recommendations logo.',
  },
  {
    name: 'SMART Studio',
    href: '/studio',
    desc: 'View and author SMART Recommendations',
    detail: 'The canvas for viewing and authoring SMART Recommendations. An expert models a Recommendation graphically and the model is the published artifact.',
    logo: 'smart-studio',
    alt: 'The SMART Studio logo.',
  },
  {
    name: 'OIML-CS SMART Platform',
    href: '/smart',
    desc: 'Applications → testing → evaluation → certificates → registration',
    detail: 'The web system through which the OIML-CS serves issuing authorities and test laboratories. Applications, testing, evaluation, certificates, and BIML registration run as one digital workflow.',
    logo: 'cs-smart',
    alt: 'The OIML-CS SMART platform logo.',
  },
  {
    name: 'SMART Measuring Instruments',
    href: '/smi',
    desc: 'The physical instrument is the API',
    detail: 'Physical instruments that provide a SMART digital twin. The instrument itself is the API that certification and continuous compliance talk to.',
    logo: 'smi',
    alt: 'The SMART Measuring Instruments logo.',
  },
  {
    name: 'SST for Measuring Instruments',
    href: '/sst',
    desc: 'The simulated SMART twin — no hardware needed',
    detail: 'The Simulated SMART Twin. The ACME LC-500 family and its siblings simulate metrologically real physics, so test programs run without hardware.',
    logo: 'sst',
    alt: 'The SST for Measuring Instruments logo.',
  },
  {
    name: 'OIML CNML',
    href: '/cnml',
    desc: 'The machine-readable certificate, verifiable in eight checks',
    detail: 'The Certificat Numérique de Métrologie Légale. The machine-readable certificate an issuing authority signs for a certified type, verifiable by anyone in a browser.',
    logo: 'cnml-box',
    alt: 'The OIML CNML logo.',
  },
  {
    name: 'SMART Vocabulary',
    href: '/vocab',
    desc: 'The governed terminology across publications',
    detail: 'The shared terminology. Every concept in a SMART Recommendation resolves to one governed term across publications.',
  },
  {
    name: 'SMART Resources',
    href: '/publications',
    desc: 'The publications and resolutions databases',
    detail: 'The publications and resolutions databases. The full OIML corpus, searchable and cross-referenced.',
  },
] as const
