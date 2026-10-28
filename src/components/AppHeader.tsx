import { Link, useLocation } from 'react-router'
import { useAuth } from '@/context/AuthContext'
import { useI18n } from '@/i18n/I18nContext'
import { LanguageSelector } from './LanguageSelector'
import { Button } from '@/components/ui/button'
import { TrophyIcon, UsersIcon, UserIcon, ShieldAlertIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export function AppHeader() {
  const { user, isAuthenticated } = useAuth()
  const { t } = useI18n()
  const location = useLocation()

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
        <Link
          to="/"
          className="flex items-center gap-2 font-bold tracking-tight text-foreground transition-opacity hover:opacity-85"
        >
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <TrophyIcon className="size-4" />
          </div>
          <span className="text-base font-extrabold tracking-tight sm:text-lg">
            {t('common.appName')}
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden items-center gap-1 md:flex">
          <Link
            to="/"
            className={cn(
              'rounded-md px-3 py-1.5 text-sm font-medium transition-colors hover:text-foreground',
              location.pathname === '/' || location.pathname.startsWith('/tournaments')
                ? 'bg-muted text-foreground'
                : 'text-muted-foreground'
            )}
          >
            {t('nav.tournaments')}
          </Link>
          {isAuthenticated && (
            <Link
              to="/my-teams"
              className={cn(
                'rounded-md px-3 py-1.5 text-sm font-medium transition-colors hover:text-foreground',
                location.pathname.startsWith('/my-teams')
                  ? 'bg-muted text-foreground'
                  : 'text-muted-foreground'
              )}
            >
              {t('nav.myTeams')}
            </Link>
          )}
        </nav>

        {/* Right Controls */}
        <div className="flex items-center gap-2">
          <LanguageSelector />

          {isAuthenticated ? (
            <Link to="/account">
              <Button variant="ghost" size="sm" className="gap-2 px-2.5">
                <UserIcon className="size-4" />
                <span className="hidden max-w-[120px] truncate text-xs sm:inline">
                  {user?.username}
                </span>
                {user?.global_role === 'admin' && (
                  <span className="flex size-2 rounded-full bg-status-live" title="Admin" />
                )}
              </Button>
            </Link>
          ) : (
            <Link to="/login">
              <Button size="sm" className="h-8 text-xs font-semibold">
                {t('auth.login')}
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}

export function MobileNavBar() {
  const { isAuthenticated, user } = useAuth()
  const { t } = useI18n()
  const location = useLocation()

  return (
    <nav
      className="fixed bottom-0 left-0 z-40 flex h-16 w-full items-center justify-around border-t bg-background/95 backdrop-blur-md pb-safe md:hidden"
      aria-label={t('nav.main')}
    >
      <Link
        to="/"
        className={cn(
          'flex flex-col items-center justify-center gap-1 py-1 text-xs font-medium transition-colors',
          location.pathname === '/' || location.pathname.startsWith('/tournaments')
            ? 'text-primary font-bold'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        <TrophyIcon className="size-5" />
        <span>{t('nav.tournaments')}</span>
      </Link>

      {isAuthenticated && (
        <Link
          to="/my-teams"
          className={cn(
            'flex flex-col items-center justify-center gap-1 py-1 text-xs font-medium transition-colors',
            location.pathname.startsWith('/my-teams')
              ? 'text-primary font-bold'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <UsersIcon className="size-5" />
          <span>{t('nav.myTeams')}</span>
        </Link>
      )}

      <Link
        to={isAuthenticated ? '/account' : '/login'}
        className={cn(
          'flex flex-col items-center justify-center gap-1 py-1 text-xs font-medium transition-colors',
          location.pathname === '/account' || location.pathname === '/login'
            ? 'text-primary font-bold'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        <UserIcon className="size-5" />
        <span>{isAuthenticated ? t('nav.account') : t('auth.login')}</span>
      </Link>
    </nav>
  )
}
