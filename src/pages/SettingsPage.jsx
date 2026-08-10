import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { updateProfile, changePassword, updatePreferences } from '../lib/userApi'
import { getApiErrorMessage, getApiFieldErrors } from '../lib/api'
import { checkPassword, PASSWORD_RULES } from '../lib/validation'
import { Button } from '../components/ui/Button'
import { Field, Input } from '../components/ui/Modal'
import { Alert } from '../components/ui/Alert'
import { FileDropZone } from '../components/ui/FileDropZone'
import { DefaultResumeEditor } from '../components/DefaultResumeEditor'
import { uploadFile, FILE_PURPOSES, IMAGE_ACCEPT, MAX_IMAGE_MB } from '../lib/filesApi'

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

      <NotificationPreferencesSection user={user} applyUser={applyUser} />

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
  const [avatarFile, setAvatarFile] = useState(null)
  const [progress, setProgress] = useState(null)
  const [fieldErrors, setFieldErrors] = useState({})
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setFirstName(user.userFirstName ?? '')
    setLastName(user.userLastName ?? '')
    setAvatarUrl(user.avatarUrl ?? '')
    setAvatarFile(null)
  }, [user])

  const dirty =
    firstName !== (user.userFirstName ?? '') ||
    lastName !== (user.userLastName ?? '') ||
    avatarUrl !== (user.avatarUrl ?? '') ||
    Boolean(avatarFile)

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
      // Deferred upload: the picked image is only sent now, on save.
      let nextAvatarUrl = avatarUrl
      if (avatarFile) {
        nextAvatarUrl = await uploadFile(avatarFile, FILE_PURPOSES.AVATAR, setProgress)
        setProgress(null)
        setAvatarUrl(nextAvatarUrl)
        setAvatarFile(null)
      }

      const updated = await updateProfile({ firstName, lastName, avatarUrl: nextAvatarUrl })
      applyUser(updated)
      setSuccess('Profile updated.')
    } catch (err) {
      setProgress(null)
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

        <Field label="Avatar" error={fieldErrors.avatarUrl}>
          <FileDropZone
            file={avatarFile}
            value={avatarUrl}
            onFile={setAvatarFile}
            onValue={setAvatarUrl}
            accept={IMAGE_ACCEPT}
            maxMb={MAX_IMAGE_MB}
            disabled={saving}
            progress={progress}
            emptyHint="PNG, JPG or WebP"
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
  // Same editor the app shell opens in a modal — one implementation, two entry points.
  return (
    <section className="mt-6 glass-card p-6">
      <h2 className="text-sm font-semibold text-text">Default resume</h2>
      <p className="mt-1 text-[11px] text-text-muted">
        Used to prefill the resume when you add a new application. Also reachable from the
        avatar menu in the top bar.
      </p>
      <div className="mt-5">
        <DefaultResumeEditor user={user} applyUser={applyUser} />
      </div>
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

function NotificationPreferencesSection({ user, applyUser }) {
  const [emailEnabled, setEmailEnabled] = useState(user.emailNotifications ?? true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleToggle() {
    const next = !emailEnabled
    setEmailEnabled(next)
    setSaving(true)
    setError('')
    try {
      const updated = await updatePreferences({ emailNotifications: next })
      applyUser(updated)
    } catch (err) {
      setEmailEnabled(!next) // rollback
      setError(getApiErrorMessage(err, 'Could not update preferences.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="mt-6 glass-card p-6">
      <h2 className="text-sm font-semibold text-text">Notifications</h2>
      <p className="mt-1 text-[11px] text-text-muted">Manage how Job Juggler contacts you.</p>

      {error && <div className="mt-4"><Alert variant="error">{error}</Alert></div>}

      <div className="mt-5 flex items-center justify-between rounded-lg border border-border/40 bg-surface-alt/20 p-4">
        <div>
          <p className="text-sm font-medium text-text">Email reminders</p>
          <p className="mt-0.5 text-[11px] text-text-muted">
            Receive automated follow-up nudges when a thread goes quiet.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={emailEnabled}
          disabled={saving}
          onClick={handleToggle}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 focus:ring-offset-bg disabled:cursor-not-allowed disabled:opacity-50 ${
            emailEnabled ? 'bg-primary' : 'bg-surface-alt'
          }`}
        >
          <span
            aria-hidden="true"
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
              emailEnabled ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>
    </section>
  )
}
