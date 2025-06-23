import * as Localization from 'expo-localization';
import { I18n } from 'i18n-js';
import en from './en';
import es from './es';
import pt from './pt';

// Set up translations
const i18n = new I18n({
  en,
  es,
  pt,
});

// Set the locale once at the beginning of your app
const locales = Localization.getLocales && Localization.getLocales();
const locale =
  Array.isArray(locales) && locales.length > 0 && locales[0].languageCode
    ? locales[0].languageCode
    : 'es';
i18n.locale = locale;
i18n.enableFallback = true;
i18n.defaultLocale = 'es';

export default i18n;