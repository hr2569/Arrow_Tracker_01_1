import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

import en from './locales/en.json';
import pt from './locales/pt.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import it from './locales/it.json';
import fi from './locales/fi.json';
import sv from './locales/sv.json';
import ru from './locales/ru.json';
import uk from './locales/uk.json';

const LANGUAGE_KEY = '@arrow_tracker_language';

export const languages = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano' },
  { code: 'fi', name: 'Finnish', nativeName: 'Suomi' },
  { code: 'sv', name: 'Swedish', nativeName: 'Svenska' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский' },
  { code: 'uk', name: 'Ukrainian', nativeName: 'Українська' },
];

const resources = {
  en: { translation: en },
  pt: { translation: pt },
  es: { translation: es },
  fr: { translation: fr },
  it: { translation: it },
  fi: { translation: fi },
  sv: { translation: sv },
  ru: { translation: ru },
  uk: { translation: uk },
};

// Initialize i18n
i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    compatibilityJSON: 'v4',
  });

// Load saved language preference
export const loadSavedLanguage = async () => {
  try {
    const savedLanguage = await AsyncStorage.getItem(LANGUAGE_KEY);
    if (savedLanguage && languages.some(l => l.code === savedLanguage)) {
      await i18n.changeLanguage(savedLanguage);
    }
  } catch (error) {
    console.error('Error loading language preference:', error);
  }
};

// Save language preference
export const saveLanguage = async (languageCode: string) => {
  try {
    await AsyncStorage.setItem(LANGUAGE_KEY, languageCode);
    await i18n.changeLanguage(languageCode);
  } catch (error) {
    console.error('Error saving language preference:', error);
  }
};

export default i18n;
