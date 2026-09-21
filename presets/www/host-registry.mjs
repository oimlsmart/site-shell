/**
 * The canonical host registry — the ONE machine-readable list of the
 * public OIML SMART properties. Moved out of the package in 0.2.0 (it
 * was src/data/host-registry.mjs; the footer's "The sites" column is
 * site content, so the consumer injects it via FooterConfig.hosts).
 * Node-safe like ./site.mjs: the gate imports the same values the
 * footer renders.
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
