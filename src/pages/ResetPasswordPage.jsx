import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '@/api/client'
import { AuthLayout } from '@/layouts/AuthLayout'
import { TextField } from '@/components/ui/TextField'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const navigate = useNavigate()

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [expired, setExpired] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  if (!token) {
    return (
      <AuthLayout title="Invalid reset link">
        <Alert variant="error">
          This link is missing a reset token. Please request a new password reset email.
        </Alert>
        <Link
          to="/forgot-password"
          className="mt-5 block text-center text-sm text-accent hover:text-accent-hover"
        >
          Go to forgot password
        </Link>
      </AuthLayout>
    )
  }

  if (expired) {
    return (
      <AuthLayout title="Link expired">
        <Alert variant="error">
          This reset link is invalid, expired, or has already been used. Please request a new one.
        </Alert>
        <Link
          to="/forgot-password"
          className="mt-5 block text-center text-sm text-accent hover:text-accent-hover"
        >
          Request a new link
        </Link>
      </AuthLayout>
    )
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setSubmitting(true)
    try {
      await api.post('/api/auth/reset-password', { token, newPassword })
      navigate('/login')
    } catch (err) {
      if (err?.response?.status === 401) {
        setExpired(true)
      } else {
        setError(err?.response?.data?.message || 'Something went wrong. Please try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout title="Reset password" subtitle="Choose a new password for your account">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Alert variant="error">{error}</Alert>
        <TextField
          id="newPassword"
          label="New password"
          type="password"
          autoComplete="new-password"
          required
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
        <TextField
          id="confirmPassword"
          label="Confirm new password"
          type="password"
          autoComplete="new-password"
          required
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Resetting…' : 'Reset password'}
        </Button>
      </form>
    </AuthLayout>
  )
}
