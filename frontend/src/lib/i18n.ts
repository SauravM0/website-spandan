import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import resourcesToBackend from 'i18next-resources-to-backend';

i18n
  .use(LanguageDetector)
  .use(resourcesToBackend((language: string, namespace: string) =>
    import(`../../public/locales/${language}/${namespace}.json`)
  ))
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    supportedLngs: ['en', 'hi', 'mr'],
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  });

// Keep the document language in step with the active locale. This has to run on
// init as well as on change: a returning visitor's stored language is applied
// during initialisation, and without this the page would announce itself as
// English to screen readers and crawlers while rendering Marathi or Hindi.
function applyDocumentLanguage(language?: string) {
  if (typeof document === 'undefined') return;
  const active = language || i18n.resolvedLanguage || i18n.language;
  if (active) document.documentElement.lang = active;
}

i18n.on('languageChanged', applyDocumentLanguage);
i18n.on('initialized', () => applyDocumentLanguage());
if (i18n.isInitialized) applyDocumentLanguage();

export default i18n;
