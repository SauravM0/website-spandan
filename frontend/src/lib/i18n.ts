import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import resourcesToBackend from 'i18next-resources-to-backend';

export const DEFAULT_LANGUAGE = 'en';
const SUPPORTED_LANGUAGES = ['en', 'hi', 'mr'];
const STORAGE_KEY = 'i18nextLng';

function supported(value: string | null | undefined): string | undefined {
  const base = value?.split('-')[0];
  return base && SUPPORTED_LANGUAGES.includes(base) ? base : undefined;
}

// Capture the visitor's preference before init. Initialising with an explicit
// `lng` makes the detector cache that language, which would otherwise overwrite
// the saved choice with English on every page load.
function readPreferredLanguage(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  let stored: string | null = null;
  try {
    stored = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    // Storage can be blocked; fall through to the browser language.
  }
  return supported(stored) || supported(window.navigator.language);
}

const preferredLanguage = readPreferredLanguage();

i18n
  .use(LanguageDetector)
  .use(resourcesToBackend((language: string, namespace: string) =>
    import(`../../public/locales/${language}/${namespace}.json`)
  ))
  .use(initReactI18next)
  .init({
    // The server always renders English, so the client must hydrate in English
    // too. Starting from the visitor's stored language here made the first client
    // render disagree with the server HTML and threw a hydration error on every
    // public page. The stored preference is applied after mount instead - see
    // restorePreferredLanguage(). The detector stays registered so changeLanguage
    // still persists the choice to localStorage.
    lng: DEFAULT_LANGUAGE,
    fallbackLng: DEFAULT_LANGUAGE,
    supportedLngs: SUPPORTED_LANGUAGES,
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  });

// Keep the document language in step with the active locale for screen readers
// and crawlers.
function applyDocumentLanguage(language?: string) {
  if (typeof document === 'undefined') return;
  const active = language || i18n.resolvedLanguage || i18n.language;
  if (active) document.documentElement.lang = active;
}

i18n.on('languageChanged', applyDocumentLanguage);

let restored = false;

/**
 * Switch to the visitor's saved (or browser) language once the page has
 * hydrated. Call from a mount effect in any client shell that renders
 * translated chrome; repeated calls are no-ops.
 */
export function restorePreferredLanguage() {
  if (restored || typeof window === 'undefined') return;
  restored = true;

  if (preferredLanguage && preferredLanguage !== i18n.language) {
    void i18n.changeLanguage(preferredLanguage);
  } else if (preferredLanguage) {
    // Re-persist in case init cached the default over it.
    try {
      window.localStorage.setItem(STORAGE_KEY, preferredLanguage);
    } catch {
      // Ignore blocked storage.
    }
  }
}

export default i18n;
