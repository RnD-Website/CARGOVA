/**
 * CARGOVA — runtime config
 * The reference hosts its 3D footer model in Supabase Storage (PostgreSQL-backed
 * project) and serves libraries from jsDelivr behind Cloudflare. Fill these in
 * when you host your own assets; empty values fall back to the built-in procedural model.
 */
export const CONFIG = {
  // e.g. 'https://<project>.supabase.co/storage/v1/object/public/assets/cargova-unit.glb'
  FOOTER_MODEL_URL: '',

  // timings (seconds) — station transition choreography
  STATION_DURATION: 1.8,
  STATION_EASE: 'power2.inOut',
  TEXT_IN_STAGGER: 0.12,
  TEXT_OUT_DURATION: 0.4,
};

export const STATIONS = [
  { id: 1, label: 'station 1', title: 'why cargova?' },
  { id: 2, label: 'station 2', title: 'move with us' },
  { id: 3, label: 'station 3', title: 'start shipping' },
  { id: 4, label: 'station 4', title: 'track & api' },
  { id: 5, label: 'station 5', title: 'join our network' },
];
