import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import en from './locales/en.json'
import ru from './locales/ru.json'
import ar from './locales/ar.json'

export const RTL_LANGUAGES = ['ar']

/** Base language code (e.g. "ar-SA" → "ar"). */
export function getLanguageBase(lang: string): string {
  return lang.split('-')[0].toLowerCase()
}

export function matchesLanguageCode(activeLang: string, code: string): boolean {
  return getLanguageBase(activeLang) === code
}

export function isRTLLanguage(lang: string): boolean {
  return RTL_LANGUAGES.includes(getLanguageBase(lang))
}

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ru: { translation: ru },
    ar: { translation: ar },
  },
  lng: localStorage.getItem('language') ?? 'en',
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
})

export default i18n
