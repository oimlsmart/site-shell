/**
 * The fixture's injected config — the reference preset, verbatim. A
 * real consumer keeps this data in its own repo and passes it to the
 * shell's props; the fixture proves that injection surface with the
 * www preset. Node-safe .mjs, so the plain-node gate imports the same
 * values these pages render.
 */
export {
  SITE,
  LEGAL,
  PARTNERS,
  SERVICES,
  COMPONENT_ASSET_BASE,
  BRAND,
  NAV_MODEL,
  FOOTER,
  HOST_REGISTRY,
  COMPONENTS,
  SMART_COMPONENTS,
  SMARTPLUS_COMPONENTS,
} from '../../../presets/www/index.mjs'
