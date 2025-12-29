'use client';
import { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

const LocaleContext = createContext();

export function LocaleProvider({ children, initialLocale = 'en' }) {
  const [locale, setLocaleState] = useState(initialLocale);
  const [translations, setTranslations] = useState({});
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Load initial locale from cookie
    const cookieLocale = document.cookie
      .split('; ')
      .find((row) => row.startsWith('NEXT_LOCALE='))
      ?.split('=')[1];

    if (cookieLocale) {
      setLocaleState(cookieLocale);
    }

    loadTranslations(cookieLocale || initialLocale);
  }, []);

  const loadTranslations = async (newLocale) => {
    try {
      const response = await fetch(`/locales/${newLocale}.json`);
      const data = await response.json();
      setTranslations(data);
    } catch (error) {
      console.error('Failed to load translations:', error);
    }
  };

  const setLocale = (newLocale) => {
    // Set cookie
    document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000`;
    setLocaleState(newLocale);
    loadTranslations(newLocale);

    // Refresh the page to apply new locale
    router.refresh();
  };

  const t = (key) => {
    const keys = key.split('.');
    let value = translations;

    for (const k of keys) {
      if (value && typeof value === 'object') {
        value = value[k];
      } else {
        return key; // Return key if translation not found
      }
    }

    return value || key;
  };

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error('useLocale must be used within LocaleProvider');
  }
  return context;
}
