import * as React from 'react'
import { Link, useNavigate, useLocation } from 'react-router'
import { useAuth } from '@/context/AuthContext'
import { useI18n } from '@/i18n/I18nContext'
import { authApi } from '@/lib/api/endpoints'
import { apiUrl, config } from '@/config/env'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { TrophyIcon } from 'lucide-react'
import { toast } from 'sonner'

function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg
      role="img"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className || 'size-4'}
    >
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  )
}

export function LoginPage() {
  const { t } = useI18n()
  const { login, register, isAuthenticated } = useAuth()
  const navigate = useNavigate()

  const [mode, setMode] = React.useState<'login' | 'register'>('login')

  // Login form
  const [identifier, setIdentifier] = React.useState('')
  const [password, setPassword] = React.useState('')

  // Register form
  const [regUsername, setRegUsername] = React.useState('')
  const [regEmail, setRegEmail] = React.useState('')
  const [regPassword, setRegPassword] = React.useState('')

  const [isLoading, setIsLoading] = React.useState(false)

  // Redirect if already logged in
  React.useEffect(() => {
    if (isAuthenticated) {
      navigate('/')
    }
  }, [isAuthenticated, navigate])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      await login(identifier, password)
      toast.success(t('auth.welcome', { name: identifier }))
      navigate('/')
    } catch (err: any) {
      toast.error(err?.detail || err?.message || t('errors.invalidCredentials'))
    } finally {
      setIsLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      await register(regUsername, regEmail, regPassword)
      toast.success(t('auth.welcome', { name: regUsername }))
      navigate('/')
    } catch (err: any) {
      toast.error(err?.detail || err?.message || t('errors.accountTaken'))
    } finally {
      setIsLoading(false)
    }
  }

  const handleDiscordLogin = () => {
    // Redirection directe vers l'endpoint FastAPI de connexion Discord OAuth2
    window.location.href = apiUrl(authApi.discordLoginPath)
  }

  return (
    <div className="flex min-h-[calc(100dvh-12rem)] flex-col items-center justify-center p-4 pb-nav md:pb-12">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
            <TrophyIcon className="size-6" />
          </div>
          <h1 className="text-2xl font-black tracking-tight">
            {mode === 'login' ? t('auth.loginTitle') : t('auth.registerTitle')}
          </h1>
          <p className="text-xs text-muted-foreground">
            {mode === 'login' ? t('auth.loginSubtitle') : t('auth.registerSubtitle')}
          </p>
        </div>

        <Card>
          <CardContent className="p-5 space-y-4">
            {/* Bouton Discord */}
            {config.discordLogin && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full gap-2 border-indigo-500/20 bg-indigo-500/5 hover:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-medium"
                  onClick={handleDiscordLogin}
                >
                  <DiscordIcon className="size-4 fill-current" />
                  <span>{t('auth.discord')}</span>
                </Button>

                <div className="relative flex items-center justify-center">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <span className="relative bg-card px-2 text-[0.7rem] uppercase text-muted-foreground">
                    {t('auth.or')}
                  </span>
                </div>
              </>
            )}

            <Tabs
              value={mode}
              onValueChange={(val: any) => setMode(val)}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="login">{t('auth.login')}</TabsTrigger>
                <TabsTrigger value="register">{t('auth.register')}</TabsTrigger>
              </TabsList>

              {/* Login tab */}
              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-1.5">
                    <label htmlFor="login-id" className="text-xs font-semibold">
                      {t('auth.identifier')}
                    </label>
                    <Input
                      id="login-id"
                      required
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      autoComplete="username"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="login-pwd" className="text-xs font-semibold">
                      {t('auth.password')}
                    </label>
                    <Input
                      id="login-pwd"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="current-password"
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? t('common.loading') : t('auth.login')}
                  </Button>
                </form>
              </TabsContent>

              {/* Register tab */}
              <TabsContent value="register">
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-1.5">
                    <label htmlFor="reg-user" className="text-xs font-semibold">
                      {t('auth.username')}
                    </label>
                    <Input
                      id="reg-user"
                      required
                      minLength={3}
                      maxLength={32}
                      value={regUsername}
                      onChange={(e) => setRegUsername(e.target.value)}
                      autoComplete="username"
                    />
                    <p className="text-[0.7rem] text-muted-foreground">
                      {t('auth.usernameHint')}
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="reg-email" className="text-xs font-semibold">
                      {t('auth.email')}
                    </label>
                    <Input
                      id="reg-email"
                      type="email"
                      required
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      autoComplete="email"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="reg-pwd" className="text-xs font-semibold">
                      {t('auth.password')}
                    </label>
                    <Input
                      id="reg-pwd"
                      type="password"
                      required
                      minLength={8}
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      autoComplete="new-password"
                    />
                    <p className="text-[0.7rem] text-muted-foreground">
                      {t('auth.passwordHint')}
                    </p>
                  </div>

                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? t('common.loading') : t('auth.register')}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
