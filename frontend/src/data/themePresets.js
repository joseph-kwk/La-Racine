/**
 * src/data/themePresets.js
 *
 * 24 globally-inclusive theme presets mirrored from the backend.
 * Grouped by world region so every family can find their heritage.
 *
 * The backend /api/trees/presets/ endpoint also serves this data —
 * we keep a local copy so the ThemePicker renders instantly without an API call.
 */

export const THEME_PRESETS = [
  // ── Africa (Sub-Saharan) ─────────────────────────────────────────────────
  { slug: 'emerald_root',   name: 'Emerald Root',       region: 'Africa',                        vibe: 'Deep Central African rainforest — La Racine default', primary: '#15803d', mid: '#22c55e', light: '#f0fdf4', dark: '#064e3b' },
  { slug: 'savanna_gold',   name: 'Savanna Gold',       region: 'Africa',                        vibe: 'Warm African savanna at golden hour',                  primary: '#d97706', mid: '#fbbf24', light: '#fffbeb', dark: '#78350f' },
  { slug: 'sahel_indigo',   name: 'Sahel Indigo',       region: 'Africa',                        vibe: 'West African indigo-dyed textiles',                    primary: '#1d4ed8', mid: '#60a5fa', light: '#eff6ff', dark: '#1e3a8a' },
  { slug: 'kalahari_dusk',  name: 'Kalahari Dusk',      region: 'Africa',                        vibe: 'Earthy terracotta of the Kalahari at dusk',            primary: '#c2410c', mid: '#fb923c', light: '#fff7ed', dark: '#7c2d12' },

  // ── Middle East & North Africa ───────────────────────────────────────────
  { slug: 'desert_rose',       name: 'Desert Rose',       region: 'Middle East & North Africa',  vibe: 'Moroccan rose-tiled courtyard',               primary: '#be185d', mid: '#f472b6', light: '#fdf2f8', dark: '#831843' },
  { slug: 'oasis_teal',        name: 'Oasis Teal',        region: 'Middle East & North Africa',  vibe: 'Persian mosaic tile blue-green',              primary: '#0f766e', mid: '#2dd4bf', light: '#f0fdfa', dark: '#134e4a' },
  { slug: 'cedar_of_lebanon',  name: 'Cedar of Lebanon',  region: 'Middle East & North Africa',  vibe: 'Ancient cedar forests of the Levant',         primary: '#166534', mid: '#4ade80', light: '#f0fdf4', dark: '#14532d' },
  { slug: 'amber_souk',        name: 'Amber Souk',        region: 'Middle East & North Africa',  vibe: 'Warm amber of a bustling souk at noon',       primary: '#b45309', mid: '#fcd34d', light: '#fffbeb', dark: '#78350f' },

  // ── East & Southeast Asia ────────────────────────────────────────────────
  { slug: 'jade_dynasty',  name: 'Jade Dynasty',  region: 'Asia (East & Southeast)',  vibe: 'Chinese jade stone — prosperity and harmony',            primary: '#0d9488', mid: '#2dd4bf', light: '#f0fdfa', dark: '#134e4a' },
  { slug: 'rising_sun',    name: 'Rising Sun',    region: 'Asia (East & Southeast)',  vibe: 'Japanese vermillion — vitality and courage',             primary: '#dc2626', mid: '#f87171', light: '#fef2f2', dark: '#7f1d1d' },
  { slug: 'lotus_gold',    name: 'Lotus Gold',    region: 'Asia (East & Southeast)',  vibe: 'Southeast Asian temple gold and lotus bloom',            primary: '#ca8a04', mid: '#fde047', light: '#fefce8', dark: '#713f12' },
  { slug: 'bamboo_grove',  name: 'Bamboo Grove',  region: 'Asia (East & Southeast)',  vibe: 'Quiet bamboo forest — resilience and flexibility',       primary: '#4d7c0f', mid: '#a3e635', light: '#f7fee7', dark: '#365314' },

  // ── South & Central Asia ─────────────────────────────────────────────────
  { slug: 'maharaja_violet',  name: 'Maharaja Violet',  region: 'Asia (South & Central)',  vibe: 'Indian royal courts — richness and spirituality',  primary: '#7e22ce', mid: '#c084fc', light: '#faf5ff', dark: '#3b0764' },
  { slug: 'steppes_blue',     name: 'Steppes Blue',     region: 'Asia (South & Central)',  vibe: 'Vast Central Asian sky over the steppes',          primary: '#1e40af', mid: '#93c5fd', light: '#eff6ff', dark: '#1e3a8a' },
  { slug: 'himalayan_stone',  name: 'Himalayan Stone',  region: 'Asia (South & Central)',  vibe: 'Mountain granite and mist above the clouds',       primary: '#475569', mid: '#94a3b8', light: '#f8fafc', dark: '#1e293b' },
  { slug: 'monsoon_teal',     name: 'Monsoon Teal',     region: 'Asia (South & Central)',  vibe: 'Bengali river delta during monsoon season',        primary: '#0e7490', mid: '#22d3ee', light: '#ecfeff', dark: '#164e63' },

  // ── The Americas ─────────────────────────────────────────────────────────
  { slug: 'maple_heritage',  name: 'Maple Heritage',  region: 'The Americas',  vibe: 'Canadian autumn — fiery maple red',                         primary: '#dc2626', mid: '#fca5a5', light: '#fef2f2', dark: '#7f1d1d' },
  { slug: 'andean_purple',   name: 'Andean Purple',   region: 'The Americas',  vibe: 'Incan textiles and high-altitude Andean sky',               primary: '#6d28d9', mid: '#a78bfa', light: '#f5f3ff', dark: '#4c1d95' },
  { slug: 'caribbean_coral', name: 'Caribbean Coral', region: 'The Americas',  vibe: 'Vibrant Caribbean culture and coral reefs',                 primary: '#e11d48', mid: '#fb7185', light: '#fff1f2', dark: '#881337' },
  { slug: 'prairie_sky',     name: 'Prairie Sky',     region: 'The Americas',  vibe: 'Wide open North American prairie under a vast sky',         primary: '#0369a1', mid: '#38bdf8', light: '#f0f9ff', dark: '#0c4a6e' },

  // ── Europe ───────────────────────────────────────────────────────────────
  { slug: 'bordeaux_rouge',      name: 'Bordeaux Rouge',     region: 'Europe',               vibe: 'French wine country — depth and elegance',         primary: '#9f1239', mid: '#fb7185', light: '#fff1f2', dark: '#4c0519' },
  { slug: 'nordic_slate',        name: 'Nordic Slate',       region: 'Europe',               vibe: 'Scandinavian design — quiet, clean, timeless',     primary: '#334155', mid: '#94a3b8', light: '#f8fafc', dark: '#0f172a' },
  { slug: 'mediterranean_blue',  name: 'Mediterranean Blue', region: 'Europe',               vibe: 'Greek and Italian coastline — sea and sky',        primary: '#1d4ed8', mid: '#60a5fa', light: '#eff6ff', dark: '#1e3a8a' },

  // ── Pacific & Oceania ────────────────────────────────────────────────────
  { slug: 'pacific_tide', name: 'Pacific Tide', region: 'Pacific & Oceania', vibe: 'Deep Pacific Ocean — vast, ancient, powerful', primary: '#0c4a6e', mid: '#38bdf8', light: '#f0f9ff', dark: '#082f49' },
];

/** Region display order */
export const REGION_ORDER = [
  'Africa',
  'Middle East & North Africa',
  'Asia (East & Southeast)',
  'Asia (South & Central)',
  'The Americas',
  'Europe',
  'Pacific & Oceania',
];

/** Group presets by region in display order */
export const PRESETS_BY_REGION = REGION_ORDER.map(region => ({
  region,
  palettes: THEME_PRESETS.filter(p => p.region === region),
}));

/** O(1) lookup by slug */
export const PRESET_MAP = Object.fromEntries(THEME_PRESETS.map(p => [p.slug, p]));

/** Default preset (La Racine emerald) */
export const DEFAULT_PRESET = PRESET_MAP['emerald_root'];

/**
 * Given a tree object from the API, return the resolved theme colors.
 * Matches the backend get_resolved_theme() logic.
 */
export function resolveTheme(tree) {
  if (!tree) return DEFAULT_PRESET;
  const t = tree.resolved_theme;
  if (t) return t;
  // Fallback: build from raw fields
  const preset = PRESET_MAP[tree.theme_preset] || DEFAULT_PRESET;
  return {
    primary: tree.theme_primary || preset.primary,
    mid:     tree.theme_mid     || preset.mid,
    light:   tree.theme_light   || preset.light,
    dark:    tree.theme_dark    || preset.dark,
    preset:  tree.theme_preset  || 'emerald_root',
  };
}
