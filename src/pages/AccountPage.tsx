import { useNavigate } from 'react-router'
import { useAuth } from '@/context/AuthContext'
import { useI18n } from '@/i18n/I18nContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { LanguageSelector } from '@/components/LanguageSelector'
import { UserIcon, LogOutIcon, ShieldCheckIcon } from 'lucide-react'
import { toast } from 'sonner'

export function AccountPage() {
  const { t } = useI18n()
  const { user, isAuthenticated, logout, isAdmin } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    try {
      await logout()
      toast.success(t('auth.loggedOut'))
      navigate('/')
    } catch {
      toast.error(t('errors.unknown'))
    }
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="space-y-6 pb-nav md:pb-12 max-w-md mx-auto">
        <h1 className="text-2xl font-black tracking-tight">{t('account.title')}</h1>
        <Card className="p-6 text-center space-y-4">
          <p className="text-sm text-muted-foreground">{t('account.visitorTitle')}</p>
          <Button onClick={() => navigate('/login')} className="w-full">
            {t('auth.login')}
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-nav md:pb-12 max-w-md mx-auto">
      <h1 className="text-2xl font-black tracking-tight">{t('account.title')}</h1>

      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-lg">
              {user.username.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">{user.username}</h2>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                {isAdmin ? (
                  <span className="flex items-center gap-1 font-semibold text-rose-500">
                    <ShieldCheckIcon className="size-3.5" />
                    {t('roles.admin')}
                  </span>
                ) : (
                  <span>{t('roles.player')}</span>
                )}
              </div>
            </div>
          </div>

          <div className="border-t pt-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t('language.label')}</span>
              <LanguageSelector />
            </div>
          </div>

          <div className="border-t pt-4">
            <Button
              variant="destructive"
              className="w-full gap-2"
              onClick={handleLogout}
            >
              <LogOutIcon className="size-4" />
              <span>{t('auth.logout')}</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
