import { useAuth } from '../context/AuthContext'
import { Button } from '../components/ui/Button'
import { Logo } from '../components/ui/Logo'

export default function DashboardPage() {
  const { user, logout } = useAuth()

  return (
    <div className="min-h-svh bg-bg">
      <header className="sticky top-0 z-20 animate-fade-in-down border-b border-border/70 bg-bg/80 px-6 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between">
          <Logo />
          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-text-muted sm:block">
              {user?.userFirstName} {user?.userLastName}
            </span>
            <Button variant="ghost" onClick={logout} className="w-auto px-4 py-1.5 text-sm">
              Log out
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl animate-fade-in-up px-6 py-12">
        <h1 className="text-2xl font-semibold tracking-tight text-text">
          Welcome back{user?.userFirstName ? `, ${user.userFirstName}` : ''}
        </h1>
        <p className="mt-2 text-text-muted">Your job application tracker will live here.</p>

        <div className="mt-8 rounded-lg border border-border bg-surface p-6">
          <p className="text-sm text-text-muted">Signed in via {user?.provider ?? 'unknown'}</p>
          <p className="text-sm text-text-muted">{user?.email}</p>
        </div>
      </main>
    </div>
  )
}
