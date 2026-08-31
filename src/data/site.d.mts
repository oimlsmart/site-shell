/**
 * The type twin for ./site.mjs (the node-safe constants leaf). The
 * source-form package compiles in the CONSUMER's toolchain — a strict
 * consumer's vue-tsc/tsc walks site-meta.ts's re-exports into this leaf
 * and needs the declaration (TS7016 otherwise; the wave-03 consumer pass
 * in oimlsmart/smart caught it). TypeScript resolves the `.mjs` specifier
 * to this `.d.mts` twin. Keep the shapes in lockstep with site.mjs — the
 * values live there; only the types live here.
 */
export declare const SITE: {
  url: string
  title: string
  description: string
  lang: string
  feedTitle: string
  feedDescription: string
}
export declare const LEGAL: {
  privacy: string
  terms: string
}
export declare const PARTNERS: {
  oiml: string
  ribose: string
  github: string
}
export declare const SERVICES: {
  status: string
  ai: string
}
