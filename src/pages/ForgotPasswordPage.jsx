import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api, getApiErrorMessage } from '@/api/client'
import { AuthLayout } from '@/layouts/AuthLayout'
import { TextField } from '@/components/ui/TextField'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await api.post('/api/auth/forgot-password', { email })
      // Always 200 regardless of whether the email exists — never reveal account existence.
      setSubmitted(true)
    } catch (err) {
      setError(getApiErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <AuthLayout title="Check your email">
        <Alert variant="success">
          If an account exists for {email}, we've sent a link to reset your password.
        </Alert>
        <Link to="/login" className="mt-5 block text-center text-sm text-accent hover:text-accent-hover">
          Back to login
        </Link>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title="Forgot password"
      subtitle="Enter your email and we'll send you a reset link"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Alert variant="error">{error}</Alert>
        <TextField
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Button type="submit" loading={submitting}>
          {submitting ? 'Sending…' : 'Send reset link'}
        </Button>
      </form>
      <Link to="/login" className="mt-5 block text-center text-sm text-accent hover:text-accent-hover">
        Back to login
      </Link>
    </AuthLayout>
  )
}
