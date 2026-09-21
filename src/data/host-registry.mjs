/**
 * The canonical host registry — the ONE machine-readable list of the
 * public OIML SMART properties. Every property's footer renders "The
 * sites" from this registry, so the cross-property links cannot drift
 * between hand-typed literals (the 2026-09-21 content audit found they
 * had). Node-safe like ./site.mjs: the gate runs under plain node and
 * imports the same values the footer renders.
 */
export const HOST_REGISTRY = [
  {
    key: 'www',
    url: 'https://www.oimlsmart.org',
    label: 'Public site',
    desc: 'The public site',
  },
  {
    key: 'platform',
    url: 'https://platform.oimlsmart.org',
    label: 'Platform',
    desc: 'The production OIML-CS SMART platform',
  },
  {
    key: 'demo',
    url: 'https://demo.oimlsmart.org',
    label: 'Demo',
    desc: 'The public demo instance',
  },
  {
    key: 'id',
    url: 'https://id.oimlsmart.org',
    label: 'Identity',
    desc: 'The identity service',
  },
  {
    key: 'status',
    url: 'https://status.oimlsmart.org',
    label: 'Status',
    desc: 'The status page',
  },
  {
    key: 'primmel',
    url: 'https://www.primmel.org',
    label: 'Primmel',
    desc: 'The Primmel language site and specification',
  },
  {
    key: 'studio',
    url: 'https://www.oimlsmart.org/studio/',
    label: 'Studio',
    desc: 'The studio minisite',
  },
]
