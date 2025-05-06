import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from '../translations';

type LanguageContextType = {
  locale: string;
  setLocale: (locale: string) => Promise<void>;
};

const LanguageContext = createContext<LanguageContextType>({
  locale: 'es',
  setLocale: async () => {},
});

export const useLanguage = () => useContext(LanguageContext);

export const LanguageProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [locale, setLocaleState] = useState(i18n.locale);

  useEffect(() => {
    // Load saved language preference
    const loadLanguage = async () => {
      try {
        const savedLanguage = await AsyncStorage.getItem('userLanguage');
        if (savedLanguage) {
          i18n.locale = savedLanguage;
          setLocaleState(savedLanguage);
        }
      } catch (error) {
        console.error('Failed to load language preference', error);
      }
    };

    loadLanguage();
  }, []);

  const setLocale = async (newLocale: string) => {
    try {
      await AsyncStorage.setItem('userLanguage', newLocale);
      i18n.locale = newLocale;
      setLocaleState(newLocale);
    } catch (error) {
      console.error('Failed to save language preference', error);
    }
  };

  return (
    <LanguageContext.Provider value={{ locale, setLocale }}>
      {children}
    </LanguageContext.Provider>
  );
};