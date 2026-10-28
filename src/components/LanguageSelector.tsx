import { useI18n } from '@/i18n/I18nContext'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { GlobeIcon } from 'lucide-react'

export function LanguageSelector() {
  const { locale, setLocale, t } = useI18n()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 px-2 text-xs font-medium"
            aria-label={t('language.change')}
          >
            <GlobeIcon className="size-3.5" />
            <span className="uppercase">{locale}</span>
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-36">
        <DropdownMenuRadioGroup
          value={locale}
          onValueChange={(val: any) => {
            if (val === 'fr' || val === 'en') {
              setLocale(val)
            }
          }}
        >
          <DropdownMenuRadioItem value="fr">
            {t('language.fr')}
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="en">
            {t('language.en')}
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
