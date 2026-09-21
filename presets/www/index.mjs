/**
 * presets/www — the reference preset for the www property. NOT package
 * content: nothing here is exported from the package's entry points and
 * nothing here ships in the npm tarball (`files` is src + scripts; the
 * pack gate fails if a presets/ path appears). The files travel with
 * this repository so the www repo's Track-02 act can adopt them
 * verbatim, and so this repo's fixture can render the full www chrome.
 *
 * Shape: plain .mjs data leaves (the repo's node-safe pattern — the
 * gate imports the same values the fixture renders) with .d.mts type
 * twins declaring the injected-config contract from src/config/.
 */

export { SITE, LEGAL, PARTNERS, SERVICES, COMPONENT_ASSET_BASE } from './site.mjs'
export { BRAND } from './brand.mjs'
export { NAV_MODEL } from './nav-config.mjs'
export { FOOTER } from './footer.mjs'
export { HOST_REGISTRY } from './host-registry.mjs'
export { COMPONENTS, SMART_COMPONENTS, SMARTPLUS_COMPONENTS } from './components.mjs'
