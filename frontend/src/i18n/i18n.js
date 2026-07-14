/**
 * i18n/i18n.js
 *
 * La Racine i18n configuration — 5 languages with smart detection:
 *   1. Saved user profile preference (passed in from LanguageContext after auth)
 *   2. localStorage cache (returning visitor)
 *   3. IP Geolocation (ip-api.com, free, no key needed)
 *   4. Browser Accept-Language header
 *   5. Default: English
 *
 * Supported: en · fr · es · hi · zh
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Translation bundles
import enTranslations from './locales/en.json';
import frTranslations from './locales/fr.json';
import esTranslations from './locales/es.json';
import hiTranslations from './locales/hi.json';
import zhTranslations from './locales/zh.json';

// ── Supported languages ───────────────────────────────────────────────────────
export const SUPPORTED_LANGUAGES = ['en', 'fr', 'es', 'hi', 'zh'];

// ── Country → language mapping for IP geolocation ────────────────────────────
const COUNTRY_LANGUAGE_MAP = {
  // French-speaking countries
  FR: 'fr', BE: 'fr', CH: 'fr', LU: 'fr', MC: 'fr',
  CI: 'fr', SN: 'fr', ML: 'fr', BF: 'fr', NE: 'fr',
  TG: 'fr', BJ: 'fr', GN: 'fr', MG: 'fr', CD: 'fr',
  CG: 'fr', CM: 'fr', CF: 'fr', GA: 'fr', DJ: 'fr',
  MR: 'fr', RW: 'fr', BI: 'fr', KM: 'fr', MU: 'fr',
  SC: 'fr', HT: 'fr', GF: 'fr', GP: 'fr', MQ: 'fr',
  RE: 'fr', YT: 'fr',

  // Spanish-speaking countries
  ES: 'es', MX: 'es', AR: 'es', CO: 'es', PE: 'es',
  VE: 'es', CL: 'es', EC: 'es', BO: 'es', PY: 'es',
  UY: 'es', CR: 'es', PA: 'es', CU: 'es', DO: 'es',
  GT: 'es', HN: 'es', NI: 'es', SV: 'es',

  // Chinese-speaking regions
  CN: 'zh', TW: 'zh', HK: 'zh', MO: 'zh', SG: 'zh',

  // Hindi — India only (with browser-language validation done in LanguageContext)
  IN: 'hi',
};

// ── Detect language from IP geolocation (async, non-blocking) ─────────────────
export async function detectLanguageFromIP() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000); // 2s max

    const response = await fetch('https://ip-api.com/json/?fields=countryCode', {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) return null;

    const data = await response.json();
    const countryCode = data?.countryCode;
    if (!countryCode) return null;

    const suggestedLang = COUNTRY_LANGUAGE_MAP[countryCode] || null;

    // India edge case: only suggest Hindi if browser also prefers Hindi
    if (suggestedLang === 'hi') {
      const browserLang = navigator.language || navigator.userLanguage || '';
      if (!browserLang.toLowerCase().startsWith('hi')) {
        return { lang: null, country: countryCode }; // Silent fallback — don't force Hindi
      }
    }

    return { lang: suggestedLang, country: countryCode };
  } catch {
    return null; // Network error / timeout — silently degrade
  }
}

// ── Get country display name ───────────────────────────────────────────────────
export function getCountryName(countryCode) {
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' }).of(countryCode) || countryCode;
  } catch {
    return countryCode;
  }
}

// ── Language display info ─────────────────────────────────────────────────────
export const LANGUAGE_INFO = {
  en: { code: 'en', nativeName: 'English', flag: '🌐', fontFamily: null },
  fr: { code: 'fr', nativeName: 'Français', flag: '🇫🇷', fontFamily: null },
  es: { code: 'es', nativeName: 'Español', flag: '🇪🇸', fontFamily: null },
  hi: { code: 'hi', nativeName: 'हिन्दी', flag: '🇮🇳', fontFamily: "'Noto Sans Devanagari', sans-serif" },
  zh: { code: 'zh', nativeName: '中文', flag: '🇨🇳', fontFamily: "'Noto Sans SC', sans-serif" },
};

// ── Lazy font loader (injects <link> only once per font) ──────────────────────
const loadedFonts = new Set();
export function loadFontForLanguage(langCode) {
  const fontMap = {
    hi: 'Noto+Sans+Devanagari:wght@400;500;600;700',
    zh: 'Noto+Sans+SC:wght@400;500;700',
  };
  const font = fontMap[langCode];
  if (!font || loadedFonts.has(font)) return;

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${font}&display=swap`;
  document.head.appendChild(link);
  loadedFonts.add(font);
}

// ── Apply language to <html> element ─────────────────────────────────────────
export function applyLanguageToDocument(langCode) {
  document.documentElement.setAttribute('lang', langCode);
  document.documentElement.setAttribute('data-lang', langCode);
  // dir is always ltr for our 5 languages — no RTL in Phase 1
  document.documentElement.setAttribute('dir', 'ltr');

  // Apply font for special-script languages
  const info = LANGUAGE_INFO[langCode];
  if (info?.fontFamily) {
    loadFontForLanguage(langCode);
    document.documentElement.style.setProperty('--font-primary', info.fontFamily);
  } else {
    document.documentElement.style.removeProperty('--font-primary');
  }
}

// ── i18next initialization ────────────────────────────────────────────────────
const resources = {
  en: { translation: enTranslations },
  fr: { translation: frTranslations },
  es: { translation: esTranslations },
  hi: { translation: hiTranslations },
  zh: { translation: zhTranslations },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    supportedLngs: SUPPORTED_LANGUAGES,
    detection: {
      // LanguageDetector checks these in order
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'la_racine_lang',
      // Convert 'fr-FR' → 'fr', 'zh-CN' → 'zh', etc.
      convertDetectedLanguage: (lng) => {
        const base = lng.split('-')[0].toLowerCase();
        return SUPPORTED_LANGUAGES.includes(base) ? base : 'en';
      },
    },
    interpolation: {
      escapeValue: false, // React already escapes
    },
    react: {
      useSuspense: false,
    },
  });

export default i18n;
