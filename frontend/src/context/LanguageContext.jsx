/**
 * context/LanguageContext.jsx
 *
 * Central language manager for La Racine.
 *
 * Responsibilities:
 * - Expose current language + list of available languages
 * - changeLanguage(): switches i18next + localStorage + document attrs + font
 * - IP geolocation detection on first visit (no stored preference)
 * - Surface detection results for <LanguageSplashBanner>
 * - Sync with user profile preference after login
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  LANGUAGE_INFO,
  SUPPORTED_LANGUAGES,
  applyLanguageToDocument,
  detectLanguageFromIP,
  getCountryName,
} from '../i18n/i18n';

const LanguageContext = createContext(null);

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within a LanguageProvider');
  return context;
};

// Languages shown in the UI picker — ordered by priority
export const LANGUAGES = [
  { code: 'en', nativeName: 'English',   flag: '🌐' },
  { code: 'fr', nativeName: 'Français',  flag: '🇫🇷' },
  { code: 'es', nativeName: 'Español',   flag: '🇪🇸' },
  { code: 'hi', nativeName: 'हिन्दी',    flag: '🇮🇳' },
  { code: 'zh', nativeName: '中文',      flag: '🇨🇳' },
];

const STORAGE_KEY = 'la_racine_lang';
const DETECTION_DISMISSED_KEY = 'la_racine_lang_banner_dismissed';

export const LanguageProvider = ({ children }) => {
  const { i18n } = useTranslation();

  // Normalise to base code (fr-FR → fr, zh-CN → zh)
  const normalise = (lng) => {
    if (!lng) return 'en';
    const base = lng.split('-')[0].toLowerCase();
    return SUPPORTED_LANGUAGES.includes(base) ? base : 'en';
  };

  const [currentLanguage, setCurrentLanguage] = useState(() =>
    normalise(localStorage.getItem(STORAGE_KEY) || i18n.language)
  );

  // Geolocation detection state — drives the splash banner
  const [detection, setDetection] = useState({
    visible: false,       // Should the banner show?
    suggestedLang: null,  // e.g. 'fr'
    countryCode: null,    // e.g. 'FR'
    countryName: null,    // e.g. 'France'
  });

  // ── Apply initial language to document ──────────────────────────────────────
  useEffect(() => {
    applyLanguageToDocument(currentLanguage);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Run IP geolocation on first visit ───────────────────────────────────────
  useEffect(() => {
    const hasStoredPreference = Boolean(localStorage.getItem(STORAGE_KEY));
    const wasDismissed = localStorage.getItem(DETECTION_DISMISSED_KEY) === '1';

    if (hasStoredPreference || wasDismissed) return; // Already chosen — don't suggest

    detectLanguageFromIP().then((result) => {
      if (!result || !result.lang || result.lang === 'en') return;
      if (result.lang === currentLanguage) return; // Already in that language

      setDetection({
        visible: true,
        suggestedLang: result.lang,
        countryCode: result.country,
        countryName: getCountryName(result.country),
      });
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Core language change function ───────────────────────────────────────────
  const changeLanguage = useCallback((langCode) => {
    const safe = SUPPORTED_LANGUAGES.includes(langCode) ? langCode : 'en';
    i18n.changeLanguage(safe);
    setCurrentLanguage(safe);
    localStorage.setItem(STORAGE_KEY, safe);
    applyLanguageToDocument(safe);
  }, [i18n]);

  // ── Banner actions ──────────────────────────────────────────────────────────
  const confirmDetection = useCallback(() => {
    if (!detection.suggestedLang) return;
    changeLanguage(detection.suggestedLang);
    localStorage.setItem(DETECTION_DISMISSED_KEY, '1');
    setDetection((d) => ({ ...d, visible: false }));
  }, [detection.suggestedLang, changeLanguage]);

  const dismissDetection = useCallback(() => {
    localStorage.setItem(DETECTION_DISMISSED_KEY, '1');
    setDetection((d) => ({ ...d, visible: false }));
  }, []);

  // ── Sync from external source (e.g. user profile loaded after login) ────────
  const syncFromProfile = useCallback((profileLangCode) => {
    if (!profileLangCode) return;
    const safe = normalise(profileLangCode);
    if (safe !== currentLanguage) {
      changeLanguage(safe);
    }
  }, [currentLanguage, changeLanguage]);

  // ── Keep state in sync when i18n changes externally ────────────────────────
  useEffect(() => {
    const handleLangChange = (lng) => {
      const safe = normalise(lng);
      setCurrentLanguage(safe);
    };
    i18n.on('languageChanged', handleLangChange);
    return () => i18n.off('languageChanged', handleLangChange);
  }, [i18n]);

  const value = {
    currentLanguage,
    changeLanguage,
    syncFromProfile,
    languages: LANGUAGES,
    detection,
    confirmDetection,
    dismissDetection,
    // Helpers
    getCurrentLanguageName: () => LANGUAGE_INFO[currentLanguage]?.nativeName || 'English',
    getCurrentLanguageFlag: () => LANGUAGES.find(l => l.code === currentLanguage)?.flag || '🌐',
    getSuggestedLanguageName: () => LANGUAGE_INFO[detection.suggestedLang]?.nativeName || '',
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};
