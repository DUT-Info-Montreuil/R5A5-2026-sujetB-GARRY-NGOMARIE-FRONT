import * as React from 'react'
import {
  DEFAULT_LOCALE,
  LOCALES,
  type Locale,
  type Translations,
  translations,
} from './translations'

interface I18nContextValue {
  locale: Locale
  setLocale: (next: Locale) => void
  t: (key: string, params?: Record<string, string | number>) => string
}

const STORAGE_KEY = 'app_locale'

function detectInitialLocale(): Locale {
  if (typeof window === 'undefined') return DEFAULT_LOCALE
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved && (LOCALES as readonly string[]).includes(saved)) {
      return saved as Locale
    }
    const navLang = navigator.language?.slice(0, 2).toLowerCase()
    if (navLang && (LOCALES as readonly string[]).includes(navLang)) {
      return navLang as Locale
    }
  } catch {
    // localStorage restricted / private mode
  }
  return DEFAULT_LOCALE
}

const I18nContext = React.createContext<I18nContextValue | null>(null)

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = React.useState<Locale>(detectInitialLocale)

  const setLocale = React.useCallback((next: Locale) => {
    setLocaleState(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
      document.documentElement.lang = next
    } catch {
      // ignore
    }
  }, [])

  React.useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = locale
    }
  }, [locale])

  const t = React.useCallback(
    (path: string, params?: Record<string, string | number>): string => {
      const dict = translations[locale] || translations[DEFAULT_LOCALE]
      const keys = path.split('.')
      let current: any = dict

      for (const key of keys) {
        if (current && typeof current === 'object' && key in current) {
          current = current[key]
        } else {
          current = undefined
          break
        }
      }

      if (current === undefined) {
        return path
      }

      // Plural handling
      if (
        current &&
        typeof current === 'object' &&
        'one' in current &&
        'other' in current &&
        params &&
        'count' in params
      ) {
        const count = Number(params.count)
        const rules = new Intl.PluralRules(locale)
        const rule = rules.select(count)
        current = rule === 'one' ? current.one : current.other
      }

      if (typeof current !== 'string') {
        return path
      }

      if (!params) return current

      return Object.entries(params).reduce<string>((acc, [paramKey, val]) => {
        return acc.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(val))
      }, current)
    },
    [locale]
  )

  const value = React.useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nContextValue {
  const ctx = React.useContext(I18nContext)
  if (!ctx) {
    throw new Error('useI18n must be used within an I18nProvider')
  }
  return ctx
}
