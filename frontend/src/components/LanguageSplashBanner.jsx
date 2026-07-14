/**
 * components/LanguageSplashBanner.jsx
 *
 * Subtle, non-intrusive language suggestion banner.
 * Appears when IP geolocation detects a likely non-English user on their
 * very first visit. Never shown again after a choice is made.
 *
 * Design:
 * - Slides in from the top below the header
 * - Has a 15-second auto-dismiss timer (shown as a shrinking progress bar)
 * - "Yes, switch" → changes language + hides
 * - "Stay in English" → hides + marks as seen forever
 * - Click outside → treated as dismiss
 */

import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useTranslation } from 'react-i18next';
import { LANGUAGE_INFO } from '../i18n/i18n';

const AUTO_DISMISS_MS = 15000;

export default function LanguageSplashBanner() {
  const { detection, confirmDetection, dismissDetection, getSuggestedLanguageName } = useLanguage();
  const { t } = useTranslation();
  const [progress, setProgress] = useState(100); // 100 → 0 over AUTO_DISMISS_MS
  const intervalRef = useRef(null);
  const startTimeRef = useRef(null);

  const { visible, countryName, suggestedLang } = detection;
  const suggestedName = getSuggestedLanguageName();
  const suggestedFlag = LANGUAGE_INFO[suggestedLang]?.flag || '🌐';

  // Auto-dismiss countdown
  useEffect(() => {
    if (!visible) {
      clearInterval(intervalRef.current);
      return;
    }

    startTimeRef.current = Date.now();
    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const remaining = Math.max(0, 100 - (elapsed / AUTO_DISMISS_MS) * 100);
      setProgress(remaining);
      if (remaining <= 0) {
        dismissDetection();
      }
    }, 50);

    return () => clearInterval(intervalRef.current);
  }, [visible, dismissDetection]);

  if (!visible || !suggestedLang) return null;

  return (
    <div
      className="lang-splash-banner"
      role="dialog"
      aria-label="Language suggestion"
      aria-live="polite"
    >
      <div className="lang-splash-inner">
        {/* Globe icon + message */}
        <div className="lang-splash-content">
          <span className="lang-splash-globe">🌍</span>
          <div className="lang-splash-text">
            <strong className="lang-splash-title">
              {t('language.detectedTitle')}
            </strong>
            <p className="lang-splash-message">
              {t('language.detectedMessage', {
                country: countryName,
                language: suggestedName,
              })}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="lang-splash-actions">
          <button
            className="lang-splash-btn lang-splash-btn--confirm"
            onClick={confirmDetection}
            id="lang-splash-confirm-btn"
          >
            {suggestedFlag} {t('language.switchTo', { language: suggestedName })}
          </button>
          <button
            className="lang-splash-btn lang-splash-btn--dismiss"
            onClick={dismissDetection}
            id="lang-splash-dismiss-btn"
          >
            {t('language.keepEnglish')}
          </button>
        </div>

        {/* Close X */}
        <button
          className="lang-splash-close"
          onClick={dismissDetection}
          aria-label={t('common.close')}
          title={t('common.close')}
        >
          ✕
        </button>
      </div>

      {/* Auto-dismiss progress bar */}
      <div
        className="lang-splash-progress"
        style={{ width: `${progress}%` }}
        role="progressbar"
        aria-valuenow={Math.round(progress)}
        aria-valuemin={0}
        aria-valuemax={100}
      />
    </div>
  );
}
