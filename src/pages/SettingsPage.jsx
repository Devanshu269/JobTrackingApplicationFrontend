import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { updateProfile, setDefaultResume, clearDefaultResume, changePassword } from '../lib/userApi'
import { getApiErrorMessage, getApiFieldErrors } from '../lib/api'
import { checkPassword, PASSWORD_RULES } from '../lib/validation'
import { Button } from '../components/ui/Button'
import { Field, Input } from '../components/ui/Modal'
import { Alert } from '../components/ui/Alert'

export default function SettingsPage() {
  const { user, logout, logoutAll, applyUser } = useAuth()
  const navigate = useNavigate()

  if (!user) return null

  const isLocal = user.provider === 'LOCAL'
  const initials = `${(user.userFirstName || 'U')[0]}${(user.userLastName || '')[0] || ''}`.toUpperCase()

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  async function handleLogoutAll() {
    await logoutAll()
    navigate('/login')
  }

  return (
    <div className="mx-auto max-w-3xl animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-text">Settings</h1>
        <p className="mt-1 text-sm text-text-muted">Manage your account and preferences.</p>
      </div>

      <ProfileSection user={user} initials={initials} applyUser={applyUser} />

      <DefaultResumeSection user={user} applyUser={applyUser} />

      {isLocal ? (
        <ChangePasswordSection />
      ) : (
        <section className="mt-6 glass-card p-6">
          <h2 className="text-sm font-semibold text-text">Password</h2>
          <p className="mt-2 text-sm text-text-muted">
            Your account is linked to <span className="font-medium text-text">{user.provider}</span>.
            Password management is handled by your provider — there is no local password to change.
          </p>
        </section>
      )}

      {/* Sessions */}
      <section className="mt-6 glass-card p-6">
        <h2 className="text-sm font-semibold text-text">Sessions</h2>
        <p className="mt-1 text-[11px] text-text-muted">
          Logging out everywhere revokes every refresh token, signing you out on all devices.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button variant="ghost" onClick={handleLogout} className="w-auto px-5 py-2 text-sm">
            Log out this device
          </Button>
          <button
            type="button"
            onClick={handleLogoutAll}
            className="rounded-md border border-danger/40 bg-danger/10 px-5 py-2 text-sm font-medium text-danger transition-all duration-200 hover:bg-danger/20"
          >
            Log out all devices
          </button>
        </div>
      </section>
    </div>
  )
}

function ProfileSection({ user, initials, applyUser }) {
  const [firstName, setFirstName] = useState(user.userFirstName ?? '')
  const [lastName, setLastName] = useState(user.userLastName ?? '')
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl ?? '')
  const [fieldErrors, setFieldErrors] = useState({})
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setFirstName(user.userFirstName ?? '')
    setLastName(user.userLastName ?? '')
    setAvatarUrl(user.avatarUrl ?? '')
  }, [user])

  const dirty =
    firstName !== (user.userFirstName ?? '') ||
    lastName !== (user.userLastName ?? '') ||
    avatarUrl !== (user.avatarUrl ?? '')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSuccess('')

    // Mirrors the backend's @Size(min = 3, max = 20). Checked here because the API silently
    // ignores a null field — an empty box would look like "no change" rather than an error.
    const errors = {}
    if (firstName.trim().length < 3 || firstName.trim().length > 20) {
      errors.firstName = 'First name must be between 3 and 20 characters.'
    }
    if (lastName.trim().length < 3 || lastName.trim().length > 20) {
      errors.lastName = 'Last name must be between 3 and 20 characters.'
    }
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    setSaving(true)
    try {
      const updated = await updateProfile({ firstName, lastName, avatarUrl })
      applyUser(updated)
      setSuccess('Profile updated.')
    } catch (err) {
      const apiFieldErrors = getApiFieldErrors(err)
      if (apiFieldErrors) setFieldErrors(apiFieldErrors)
      setError(getApiErrorMessage(err, 'Could not update your profile.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="glass-card p-6">
      <h2 className="text-sm font-semibold text-text">Profile</h2>

      <div className="mt-5 flex items-center gap-5">
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt=""
            className="h-16 w-16 shrink-0 rounded-full object-cover"
          />
        ) : (
          <span className="bg-brand flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-xl font-bold text-on-primary">
            {initials}
          </span>
        )}
        <div>
          <p className="text-lg font-semibold text-text">
            {user.userFirstName} {user.userLastName}
          </p>
          <p className="text-sm text-text-muted">{user.email}</p>
          <span className="mt-1.5 inline-block rounded-full border border-border/60 bg-surface-alt px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-text-muted">
            {user.provider === 'LOCAL' ? 'Email account' : `${user.provider} account`}
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <Alert variant="error">{error}</Alert>
        <Alert variant="success">{success}</Alert>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="First name" htmlFor="firstName" error={fieldErrors.firstName}>
            <Input
              id="firstName"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              error={fieldErrors.firstName}
              maxLength={20}
            />
          </Field>
          <Field label="Last name" htmlFor="lastName" error={fieldErrors.lastName}>
            <Input
              id="lastName"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              error={fieldErrors.lastName}
              maxLength={20}
            />
          </Field>
        </div>

        <Field
          label="Avatar URL"
          htmlFor="avatarUrl"
          hint="A link to an image — there is no file upload yet."
          error={fieldErrors.avatarUrl}
        >
          <Input
            id="avatarUrl"
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            placeholder="https://…"
          />
        </Field>

        <Button
          type="submit"
          loading={saving}
          disabled={!dirty}
          className="mt-1 w-auto self-start px-6 py-2 text-sm"
        >
          {saving ? 'Saving…' : 'Save profile'}
        </Button>
      </form>
    </section>
  )
}

function DefaultResumeSection({ user, applyUser }) {
  const [resumeUrl, setResumeUrl] = useState(user.defaultResumeUrl ?? '')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setResumeUrl(user.defaultResumeUrl ?? '')
  }, [user])

  async function handleSave(e) {
    e.preventDefault()
    setError('')
    setSuccess('')
    if (!resumeUrl.trim()) {
      setError('Enter a URL, or use Remove to clear it.')
      return
    }
    setBusy(true)
    try {
      applyUser(await setDefaultResume(resumeUrl.trim()))
      setSuccess('Default resume saved.')
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not save your default resume.'))
    } finally {
      setBusy(false)
    }
  }

  async function handleClear() {
    setError('')
    setSuccess('')
    setBusy(true)
    try {
      applyUser(await clearDefaultResume())
      setSuccess('Default resume removed.')
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not remove your default resume.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="mt-6 glass-card p-6">
      <h2 className="text-sm font-semibold text-text">Default resume</h2>
      <p className="mt-1 text-[11px] text-text-muted">
        Used to prefill the resume link when you add a new application.
      </p>

      <form onSubmit={handleSave} className="mt-5 flex flex-col gap-4">
        <Alert variant="error">{error}</Alert>
        <Alert variant="success">{success}</Alert>

        <Field label="Resume URL" htmlFor="defaultResumeUrl">
          <Input
            id="defaultResumeUrl"
            value={resumeUrl}
            onChange={(e) => setResumeUrl(e.target.value)}
            placeholder="https://…"
          />
        </Field>

        <div className="flex flex-wrap gap-3">
          <Button type="submit" loading={busy} className="w-auto px-6 py-2 text-sm">
            Save
          </Button>
          {user.defaultResumeUrl && (
            <Button
              type="button"
              variant="ghost"
              onClick={handleClear}
              disabled={busy}
              className="w-auto px-5 py-2 text-sm"
            >
              Remove
            </Button>
          )}
        </div>
      </form>
    </section>
  )
}

function ChangePasswordSection() {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [saving, setSaving] = useState(false)

  const strength = checkPassword(newPassword)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    if (strength.status !== 'valid') {
      setError('Choose a stronger password — see the requirements below.')
      return
    }

    setSaving(true)
    try {
      await changePassword({ currentPassword, newPassword })
      setSuccess('Password changed. Other devices stay signed in until their sessions expire.')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      // 401 covers both a wrong current password and a non-LOCAL account; the backend's
      // message distinguishes them, so surface it rather than inventing one.
      setError(getApiErrorMessage(err, 'Could not change your password.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="mt-6 glass-card p-6">
      <h2 className="text-sm font-semibold text-text">Change password</h2>
      <p className="mt-1 text-[11px] text-text-muted">Update the password for your email account.</p>

      <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">
        <Alert variant="error">{error}</Alert>
        <Alert variant="success">{success}</Alert>

        <Field label="Current password" htmlFor="currentPassword">
          <Input
            id="currentPassword"
            type="password"
            autoComplete="current-password"
            required
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
        </Field>

        <Field label="New password" htmlFor="newPassword">
          <Input
            id="newPassword"
            type="password"
            autoComplete="new-password"
            required
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </Field>

        {newPassword && (
          <ul className="flex flex-wrap gap-x-4 gap-y-1.5">
            {PASSWORD_RULES.map((rule) => {
              const met = strength.met.includes(rule.id)
              return (
                <li
                  key={rule.id}
                  className={`flex items-center gap-1.5 text-[11px] ${met ? 'text-accent' : 'text-text-muted'}`}
                >
                  <span aria-hidden="true">{met ? '✓' : '○'}</span>
                  {rule.label}
                </li>
              )
            })}
          </ul>
        )}

        <Field label="Confirm new password" htmlFor="confirmNewPassword">
          <Input
            id="confirmNewPassword"
            type="password"
            autoComplete="new-password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </Field>

        <Button type="submit" loading={saving} className="mt-1 w-auto self-start px-6 py-2 text-sm">
          {saving ? 'Changing…' : 'Change password'}
        </Button>
      </form>
    </section>
  )
}
