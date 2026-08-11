import { Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { Logo } from '@/components/ui/Logo'
import { buttonClasses } from '@/components/ui/Button'

/**
 * Terminal 404. Previously `*` fell through to RootRedirect, which quietly bounced a typo'd
 * URL to the dashboard — the user never learned the address was wrong.
 */
export default function NotFoundPage() {
  const { isAuthenticated } = useAuth()
  const home = isAuthenticated ? '/JobJuggler/dashboard' : '/explore'

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-bg px-4 text-center">
      <Logo />

      <div className="flex flex-col gap-2">
        <p className="bg-brand bg-clip-text text-6xl font-bold text-transparent">404</p>
        <h1 className="text-xl font-semibold text-text">This page doesn’t exist</h1>
        <p className="max-w-sm text-sm text-text-muted">
          The link may be out of date, or the address might have a typo in it.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link to={home} className={buttonClasses('primary', 'w-auto px-6')}>
          {isAuthenticated ? 'Back to dashboard' : 'Back to home'}
        </Link>
        {isAuthenticated && (
          <Link
            to="/JobJuggler/applications"
            className={buttonClasses('ghost', 'w-auto px-6')}
          >
            View applications
          </Link>
        )}
      </div>
    </div>
  )
}
