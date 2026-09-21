/** The type twin for ./components.mjs — see site.d.mts for the pattern. */
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

export declare const COMPONENTS: readonly SmartComponent[]
export declare const SMART_COMPONENTS: readonly SmartComponent[]
export declare const SMARTPLUS_COMPONENTS: readonly SmartComponent[]
