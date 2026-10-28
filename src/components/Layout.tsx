import { Outlet } from 'react-router'
import { AppHeader, MobileNavBar } from '@/components/AppHeader'
import { Toaster } from '@/components/ui/sonner'

export function Layout() {
  return (
    <div className="min-h-dvh flex flex-col bg-background text-foreground selection:bg-primary/20 selection:text-primary">
      <AppHeader />
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 pt-4 sm:pt-6">
        <Outlet />
      </main>
      <MobileNavBar />
      <Toaster position="top-center" />
    </div>
  )
}
