'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

type LanguageContextType = {
  lang: string;
  t: (key: string) => string;
  setLang: (lang: string) => void;
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<string>('fr');
  const [translations, setTranslations] = useState<Record<string, string>>({});

  const loadLocales = async (l: string) => {
    try {
      const res = await fetch(`/locales/${l}.json`);
      if (res.ok) {
        const data = await res.json();
        setTranslations(data);
      }
    } catch (err) {
      console.error('Failed to load translations:', err);
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem('babor_lang') || 'fr';
    const timer = setTimeout(() => {
      setLangState(saved);
      void loadLocales(saved);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const setLang = (l: string) => {
    setLangState(l);
    localStorage.setItem('babor_lang', l);
    loadLocales(l);
  };

  const t = (key: string): string => {
    return translations[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ lang, t, setLang }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
};
