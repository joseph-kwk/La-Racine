import React, { createContext, useContext, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const LanguageContext = createContext();

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export const LanguageProvider = ({ children }) => {
  const { i18n } = useTranslation();
  const [currentLanguage, setCurrentLanguage] = useState(i18n.language || 'en');

  const languages = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'es', name: 'Español', flag: '🇪🇸' }
  ];

  useEffect(() => {
    // Sync with i18next
    setCurrentLanguage(i18n.language);
  }, [i18n.language]);

  const changeLanguage = (languageCode) => {
    i18n.changeLanguage(languageCode);
    setCurrentLanguage(languageCode);
    localStorage.setItem('i18nextLng', languageCode);
  };

  const value = {
    currentLanguage,
    changeLanguage,
    languages,
    getCurrentLanguageName: () => {
      const lang = languages.find(l => l.code === currentLanguage);
      return lang ? lang.name : 'English';
    },
    getCurrentLanguageFlag: () => {
      const lang = languages.find(l => l.code === currentLanguage);
      return lang ? lang.flag : '🇺🇸';
    }
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};
