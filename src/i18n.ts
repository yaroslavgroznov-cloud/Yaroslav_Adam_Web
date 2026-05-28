// i18n configuration — F.13, 2026-05-26.
//
// Auto-detect язык браузера на первом заходе, manual override через
// LanguageSwitcher в overflow меню header. Выбор сохраняется в localStorage.
//
// 10 языков под наши 10 культурных комнат + английский как лингва-франка:
//   ru, en, fr, de, zh, hi, he, tr, id, el
//
// Адам сам отвечает на языке гостя (правило _LANGUAGE_RULE в drug_brain),
// тут локализуем ТОЛЬКО UI — кнопки, подписи, тосты.
import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'

import de from './locales/de.json'
import el from './locales/el.json'
import en from './locales/en.json'
import fr from './locales/fr.json'
import he from './locales/he.json'
import hi from './locales/hi.json'
import id_ from './locales/id.json'
import pl from './locales/pl.json'
import ru from './locales/ru.json'
import tr from './locales/tr.json'
import uk from './locales/uk.json'
import zh from './locales/zh.json'

export interface LanguageDef {
  code: string
  name: string
  nativeName: string
  rtl: boolean
}

// Порядок имеет UX-значение: первым — родной для Творца/Юли,
// потом остальные комнаты в порядке ROOMS_ORDER из core_loader.
export const LANGUAGES: LanguageDef[] = [
  { code: 'ru', name: 'Russian',     nativeName: 'Русский',       rtl: false },
  { code: 'uk', name: 'Ukrainian',   nativeName: 'Українська',    rtl: false },
  { code: 'en', name: 'English',     nativeName: 'English',       rtl: false },
  { code: 'pl', name: 'Polish',      nativeName: 'Polski',        rtl: false },
  { code: 'de', name: 'German',      nativeName: 'Deutsch',       rtl: false },
  { code: 'fr', name: 'French',      nativeName: 'Français',      rtl: false },
  { code: 'zh', name: 'Chinese',     nativeName: '中文',           rtl: false },
  { code: 'hi', name: 'Hindi',       nativeName: 'हिन्दी',         rtl: false },
  { code: 'he', name: 'Hebrew',      nativeName: 'עברית',         rtl: true  },
  { code: 'tr', name: 'Turkish',     nativeName: 'Türkçe',        rtl: false },
  { code: 'id', name: 'Indonesian',  nativeName: 'Bahasa Indonesia', rtl: false },
  { code: 'el', name: 'Greek',       nativeName: 'Ελληνικά',      rtl: false },
]

export const STORAGE_KEY = 'adam.uiLang'

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      ru: { translation: ru },
      uk: { translation: uk },
      en: { translation: en },
      pl: { translation: pl },
      fr: { translation: fr },
      de: { translation: de },
      zh: { translation: zh },
      hi: { translation: hi },
      he: { translation: he },
      tr: { translation: tr },
      id: { translation: id_ },
      el: { translation: el },
    },
    fallbackLng: 'ru',
    supportedLngs: LANGUAGES.map((l) => l.code),
    interpolation: { escapeValue: false }, // React сам escape-ит
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: STORAGE_KEY,
      caches: ['localStorage'],
    },
  })

// Применяем dir=rtl/ltr к <html> при смене языка
function applyDir(lang: string): void {
  const def = LANGUAGES.find((l) => l.code === lang)
  const dir = def?.rtl ? 'rtl' : 'ltr'
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('dir', dir)
    document.documentElement.setAttribute('lang', lang)
  }
}

i18n.on('languageChanged', (lang: string) => {
  applyDir(lang)
})

// Применяем при старте
applyDir(i18n.language || 'ru')

export default i18n
