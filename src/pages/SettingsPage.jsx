import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { MOCK_USER } from '../data/mockUser'
import { Button } from '../components/ui/Button'
import { TextField } from '../components/ui/TextField'
import { Alert } from '../components/ui/Alert'

export default function SettingsPage() {
  const { user, logout, logoutAll } = useAuth()
  const displayUser = user || MOCK_USER

  const isLocal = displayUser.provider === 'LOCAL'

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)

  async function handleChangePassword(e) {
    e.preventDefault()
    setPasswordError('')
    setPasswordSuccess('')

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.')
      return
    }

    setChangingPassword(true)
    try {
      // TODO: Wire up to real API endpoint once backend is ready
      // await api.post('/api/auth/change-password', { currentPassword, newPassword })
      // Simulate success for now
      await new Promise((resolve) => setTimeout(resolve, 800))
      setPasswordSuccess('Password changed successfully.')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch {
      setPasswordError('Failed to change password. Please try again.')
    } finally {
      setChangingPassword(false)
    }
  }

  const initials = `${(displayUser.userFirstName || 'U')[0]}${(displayUser.userLastName || '')[0] || ''}`.toUpperCase()

  return (
    <div className="mx-auto max-w-3xl animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-text">Settings</h1>
        <p className="mt-1 text-sm text-text-muted">
          Manage your account and preferences.
        </p>
      </div>

      {/* Profile Section */}
      <section className="glass-card p-6">
        <h2 className="text-sm font-semibold text-text">Profile</h2>
        <div className="mt-5 flex items-center gap-5">
          <span className="bg-brand flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-xl font-bold text-on-primary">
            {initials}
          </span>
          <div>
            <p className="text-lg font-semibold text-text">
              {displayUser.userFirstName} {displayUser.userLastName}
            </p>
            <p className="text-sm text-text-muted">{displayUser.email}</p>
            <span className="mt-1.5 inline-block rounded-full border border-border/60 bg-surface-alt px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-text-muted">
              {displayUser.provider === 'LOCAL' ? 'Email account' : `${displayUser.provider} account`}
            </span>
          </div>
        </div>
      </section>

      {/* Change Password — only for LOCAL provider */}
      {isLocal && (
        <section className="mt-6 glass-card p-6">
          <h2 className="text-sm font-semibold text-text">Change Password</h2>
          <p className="mt-1 text-[11px] text-text-muted">
            Update the password for your email account.
          </p>
          <form onSubmit={handleChangePassword} className="mt-5 flex flex-col gap-4">
            <Alert variant="error">{passwordError}</Alert>
            <Alert variant="success">{passwordSuccess}</Alert>
            <TextField
              id="currentPassword"
              label="Current password"
              type="password"
              autoComplete="current-password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
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
              id="confirmNewPassword"
              label="Confirm new password"
              type="password"
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            <Button type="submit" loading={changingPassword} className="mt-1 w-auto self-start px-6">
              {changingPassword ? 'Changing…' : 'Change password'}
            </Button>
          </form>
        </section>
      )}

      {/* OAuth notice */}
      {!isLocal && (
        <section className="mt-6 glass-card p-6">
          <h2 className="text-sm font-semibold text-text">Password</h2>
          <p className="mt-2 text-sm text-text-muted">
            Your account is linked to <span className="font-medium text-text">{displayUser.provider}</span>.
            Password management is handled by your OAuth provider.
          </p>
        </section>
      )}

      {/* Notification Preferences (placeholder) */}
      <section className="mt-6 glass-card p-6">
        <h2 className="text-sm font-semibold text-text">Notifications</h2>
        <p className="mt-1 text-[11px] text-text-muted">Configure what notifications you receive.</p>
        <div className="mt-5 flex flex-col gap-4">
          <ToggleRow label="Interview reminders" description="Get reminded 1 hour before scheduled interviews" defaultOn />
          <ToggleRow label="Application follow-ups" description="Nudge when an application has been silent for 5+ days" defaultOn />
          <ToggleRow label="Weekly summary" description="Receive a weekly digest of your job search progress" defaultOn={false} />
        </div>
      </section>

      {/* Session Management */}
      <section className="mt-6 glass-card p-6">
        <h2 className="text-sm font-semibold text-text">Sessions</h2>
        <p className="mt-1 text-[11px] text-text-muted">Manage your active sessions.</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button variant="ghost" onClick={logout} className="w-auto px-5 py-2 text-sm">
            Log out this device
          </Button>
          <button
            type="button"
            onClick={logoutAll}
            className="rounded-md border border-danger/40 bg-danger/10 px-5 py-2 text-sm font-medium text-danger transition-all duration-200 hover:bg-danger/20"
          >
            Log out all devices
          </button>
        </div>
      </section>
    </div>
  )
}

function ToggleRow({ label, description, defaultOn = true }) {
  const [on, setOn] = useState(defaultOn)
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-text">{label}</p>
        <p className="text-[11px] text-text-muted">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        onClick={() => setOn((v) => !v)}
        className={`relative mt-0.5 h-6 w-10 shrink-0 rounded-full transition-colors duration-200 ${
          on ? 'bg-primary' : 'bg-border'
        }`}
      >
        <span
          className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${
            on ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  )
}
