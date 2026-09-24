import { LoginCard } from '@/components/LoginCard'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AuthProvider, useAuth } from '@/hooks/useAuth'
import DevDashboard from '@/pages/DevDashboard'

function Session() {
  const { user, loading, logout } = useAuth()

  if (loading) return <p className="text-muted-foreground">Chargement...</p>

  if (!user) return <LoginCard />

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>{user.username}</CardTitle>
      </CardHeader>
      <CardContent className="flex items-center justify-between">
        <Badge variant={user.global_role === 'admin' ? 'default' : 'secondary'}>
          {user.global_role === 'admin' ? 'Administrateur' : 'Joueur'}
        </Badge>
        <Button variant="outline" onClick={() => void logout()}>
          Se déconnecter
        </Button>
      </CardContent>
    </Card>
  )
}

function Shell() {
  const { user } = useAuth()
  // The API tester is a dev tool: only shown to an admin session. The server
  // still enforces every rule; hiding it here is not a guard.
  const showDashboard = user?.global_role === 'admin'

  return (
    <main className={showDashboard ? 'flex flex-col items-center gap-4 p-4' : 'flex min-h-screen items-center justify-center p-4'}>
      <Session />
      {showDashboard && <DevDashboard user={user} />}
    </main>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <Shell />
    </AuthProvider>
  )
}
