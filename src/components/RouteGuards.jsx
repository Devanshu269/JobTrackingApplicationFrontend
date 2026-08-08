import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { FullPageSpinner } from './ui/Spinner'

/** Signed-in users only. Everyone else goes to the login page. */
export function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()

  if (loading) return <FullPageSpinner label="Restoring your session" />
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return children
}

/** Signed-out users only — keeps an already-authenticated user off the login page. */
export function PublicOnlyRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()

  if (loading) return <FullPageSpinner label="Checking your session" />
  if (isAuthenticated) return <Navigate to="/dashboard" replace />
  return children
}

/** Entry point: send people to the app or the login page depending on their session. */
export function RootRedirect() {
  const { isAuthenticated, loading } = useAuth()

  if (loading) return <FullPageSpinner label="Restoring your session" />
  return <Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />
}
