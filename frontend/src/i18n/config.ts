import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import en from './locales/en.json'
import ru from './locales/ru.json'
import ar from './locales/ar.json'

export const LANGUAGES = [
  { code: 'en', label: 'EN' },
  { code: 'ru', label: 'RU' },
  { code: 'ar', label: 'AR' },
] as const

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

// Persist the chosen language so it survives page refresh.
// Any call to i18n.changeLanguage() anywhere in the app is covered.
i18n.on('languageChanged', (lng) => {
  localStorage.setItem('language', lng)
})

export default i18n
