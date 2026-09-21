/**
 * The type twin for ./site.mjs — the source-form package compiles in
 * the CONSUMER's toolchain, and a strict consumer's tsc walks preset
 * imports into this leaf. Keep the shapes in lockstep with site.mjs;
 * the values live there, only the types live here.
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
export declare const COMPONENT_ASSET_BASE: string
