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
  { id: 1, label: 'Station 1', title: 'Why CARGOVA?' },
  { id: 2, label: 'Station 2', title: 'Move with us' },
  { id: 3, label: 'Station 3', title: 'Start shipping' },
  { id: 4, label: 'Station 4', title: 'Track & API' },
  { id: 5, label: 'Station 5', title: 'Join our network' },
];
