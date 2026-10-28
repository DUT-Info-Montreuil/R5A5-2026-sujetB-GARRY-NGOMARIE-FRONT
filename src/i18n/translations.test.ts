import { describe, it, expect } from 'vitest'
import { translations, LOCALES } from '@/i18n/translations'

describe('Translations consistency', () => {
  it('has identical keys in FR and EN dictionaries', () => {
    function getKeys(obj: any, prefix = ''): string[] {
      return Object.keys(obj).flatMap((key) => {
        const val = obj[key]
        const next = prefix ? `${prefix}.${key}` : key
        if (typeof val === 'object' && val !== null && !('one' in val && 'other' in val)) {
          return getKeys(val, next)
        }
        return next
      })
    }

    const frKeys = getKeys(translations.fr).sort()
    const enKeys = getKeys(translations.en).sort()

    expect(enKeys).toEqual(frKeys)
  })

  it('supports all declared locales', () => {
    for (const locale of LOCALES) {
      expect(translations[locale]).toBeDefined()
    }
  })
})
