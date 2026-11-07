import i18n from 'i18next'
import { initReactI18next, useTranslation } from 'react-i18next'
import en from './en.json'
import te from './te.json'
import hi from './hi.json'
import { readPref, writePref } from '../lib/prefs'

// v4 languages. Operator screens are translated first (design review); Telugu and Hindi strings still need a
// native speaker's review before release.
export const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'te', label: 'తెలుగు' },
  { code: 'hi', label: 'हिन्दी' },
]

const v4i18n = i18n.createInstance()
v4i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, te: { translation: te }, hi: { translation: hi } },
  lng: readPref('lang', 'en'),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  returnNull: false,
})

export function setLanguage(code) {
  writePref('lang', code)
  v4i18n.changeLanguage(code)
}

export const useT = () => useTranslation(undefined, { i18n: v4i18n })
export default v4i18n
