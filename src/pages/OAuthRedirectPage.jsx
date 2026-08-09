import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getApiErrorMessage } from '../lib/api'
import { AuthLayout } from '../components/ui/AuthLayout'
import { Alert } from '../components/ui/Alert'

export default function OAuthRedirectPage() {
  const [searchParams] = useSearchParams()
  const { exchangeOAuthCode } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const exchanged = useRef(false)

  useEffect(() => {
    const code = searchParams.get('code')
    const oauthError = searchParams.get('error')

    if (oauthError) {
      setError(oauthError)
      return
    }

    if (!code) {
      setError('No authorization code was returned. Please try signing in again.')
      return
    }

    if (exchanged.current) return
    exchanged.current = true

    exchangeOAuthCode(code)
      .then(() => navigate('/JobJuggler/dashboard', { replace: true }))
      .catch((err) => setError(getApiErrorMessage(err, 'Login failed. Please try again.')))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (error) {
    return (
      <AuthLayout title="Login failed">
        <Alert variant="error">{error}</Alert>
        <Link to="/login" className="mt-5 block text-center text-sm text-accent hover:text-accent-hover">
          Back to login
        </Link>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title="Logging you in…">
      <div className="flex items-center justify-center py-4">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />
      </div>
    </AuthLayout>
  )
}
