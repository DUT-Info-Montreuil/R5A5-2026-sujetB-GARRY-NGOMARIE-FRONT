import { useState, type FormEvent } from 'react'

import { ApiError, discordLoginUrl } from '@/api/client'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { useAuth } from '@/hooks/useAuth'

type Mode = 'login' | 'register'

export function LoginCard() {
  const { login, register } = useAuth()
  const [mode, setMode] = useState<Mode>('login')
  const [identifier, setIdentifier] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const switchMode = (next: Mode) => {
    setMode(next)
    setError(null)
  }

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setPending(true)
    try {
      if (mode === 'login') await login(identifier, password)
      else await register({ username, email, password })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erreur réseau, réessayez')
    } finally {
      setPending(false)
    }
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>{mode === 'login' ? 'Connexion' : 'Créer un compte'}</CardTitle>
        <CardDescription>
          Les visiteurs peuvent consulter les tournois. Connectez-vous pour créer ou
          rejoindre une équipe.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form className="space-y-3" onSubmit={(e) => void onSubmit(e)}>
          {mode === 'login' ? (
            <div className="space-y-1">
              <Label htmlFor="identifier">Identifiant ou email</Label>
              <Input
                id="identifier"
                autoComplete="username"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
              />
            </div>
          ) : (
            <>
              <div className="space-y-1">
                <Label htmlFor="username">Identifiant</Label>
                <Input
                  id="username"
                  autoComplete="username"
                  required
                  minLength={3}
                  maxLength={32}
                  pattern="[A-Za-z0-9_.\-]+"
                  title="3 à 32 caractères : lettres, chiffres, _ . -"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </>
          )}
          <div className="space-y-1">
            <Label htmlFor="password">Mot de passe</Label>
            <Input
              id="password"
              type="password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              required
              minLength={mode === 'register' ? 8 : undefined}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={pending}>
            {mode === 'login' ? 'Se connecter' : 'Créer le compte'}
          </Button>
        </form>

        <button
          type="button"
          className="w-full text-sm text-muted-foreground underline-offset-4 hover:underline"
          onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}
        >
          {mode === 'login' ? 'Pas de compte ? En créer un' : 'Déjà un compte ? Se connecter'}
        </button>

        <div className="flex items-center gap-2">
          <Separator className="flex-1" />
          <span className="text-xs text-muted-foreground">ou</span>
          <Separator className="flex-1" />
        </div>

        <a href={discordLoginUrl} className={buttonVariants({ variant: 'outline', className: 'w-full' })}>
          Se connecter avec Discord
        </a>
      </CardContent>
    </Card>
  )
}
