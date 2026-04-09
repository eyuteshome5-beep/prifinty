"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'en' | 'am';

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: string, params?: Record<string, any>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

import { translations } from './translations';

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Language>('en');

  useEffect(() => {
    const savedLang = localStorage.getItem('pref-lang') as Language;
    if (savedLang && (savedLang === 'en' || savedLang === 'am')) {
      setLangState(savedLang);
    }
  }, []);

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    localStorage.setItem('pref-lang', newLang);
  };

  const t = (key: string, params?: Record<string, any>): string => {
    const keys = key.split('.');
    let result: any = translations[lang];
    
    for (const k of keys) {
      if (result && k in result) {
        result = result[k];
      } else {
        return key; // return key if not found
      }
    }
    
    if (typeof result !== 'string') return key;

    let translated = result;
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        translated = translated.replace(`{${k}}`, String(v));
      });
    }
    
    return translated;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
