import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getApiErrorMessage } from '../lib/api'
import { checkEmail, checkPassword, PASSWORD_RULES } from '../lib/validation'
import { Navbar } from '../components/Navbar'
import { FeatureShowcase } from '../components/FeatureShowcase'
import { ApertureLens } from '../components/ApertureLens'
import { TextField } from '../components/ui/TextField'
import { Button, ButtonLink } from '../components/ui/Button'
import { Alert } from '../components/ui/Alert'
import { GoogleIcon, GitHubIcon } from '../components/ui/OAuthIcons'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

const MODES = [
  { id: 'login', label: 'Login' },
  { id: 'signup', label: 'Sign up' },
]

/** Characters of typing that fill the aperture's tick ring. */
const WIND_SPAN = 22

function EyeIcon({ open }) {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
      <path
        d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="2.6" stroke="currentColor" strokeWidth="1.7" />
      {!open && (
        <path d="M4 20L20 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      )}
    </svg>
  )
}

export default function LoginPage() {
  const { login, signup } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const lensRef = useRef(null)

  // "Get started" elsewhere in the app routes here already switched to sign-up.
  const [mode, setMode] = useState(location.state?.mode === 'signup' ? 'signup' : 'login')
  const [fields, setFields] = useState({
    userFirstName: '',
    userLastName: '',
    email: '',
    password: '',
  })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [focusField, setFocusField] = useState(null)
  const [showPassword, setShowPassword] = useState(false)
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  const [progress, setProgress] = useState(0)
  // Only nag about format once they have left the field.
  const [touched, setTouched] = useState({})

  const isSignup = mode === 'signup'
  const onPassword = focusField === 'password'

  const emailState = checkEmail(fields.email)
  const password = checkPassword(fields.password)

  const emailStatus =
    emailState === 'valid'
      ? 'valid'
      : touched.email && emailState === 'invalid'
        ? 'invalid'
        : undefined

  // Strength rules are advisory on login — only graded while signing up.
  const passwordStatus =
    isSignup && fields.password
      ? password.status === 'valid'
        ? 'valid'
        : touched.password
          ? 'invalid'
          : undefined
      : undefined

  const lensState = onPassword
    ? showPassword
      ? 'ajar'
      : 'closed'
    : focusField === 'email'
      ? emailState === 'valid'
        ? 'valid'
        : touched.email && emailState === 'invalid'
          ? 'invalid'
          : 'active'
      : focusField
        ? 'active'
        : 'idle'

  // Idle: the movement leans toward the pointer. While a field has focus the
  // caret drives it instead, so the two never fight over the same state.
  useEffect(() => {
    if (focusField) return

    let raf = 0
    function onMove(event) {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const el = lensRef.current
        if (!el) return
        const box = el.getBoundingClientRect()
        setTilt({
          x: (event.clientX - (box.left + box.width / 2)) / (window.innerWidth / 2),
          y: (event.clientY - (box.top + box.height / 2)) / (window.innerHeight / 2),
        })
      })
    }

    window.addEventListener('mousemove', onMove)
    return () => {
      window.removeEventListener('mousemove', onMove)
      cancelAnimationFrame(raf)
    }
  }, [focusField])

  const trackCaret = useCallback((value) => {
    const ratio = Math.min(value.length / WIND_SPAN, 1)
    setProgress(ratio)
    setTilt({ x: -0.7 + ratio * 1.4, y: 0.4 })
  }, [])

  function update(key) {
    return (e) => {
      const { value } = e.target
      setFields((f) => ({ ...f, [key]: value }))
      trackCaret(value)
    }
  }

  function fieldProps(key) {
    return {
      onFocus: () => {
        setFocusField(key)
        trackCaret(fields[key])
      },
      onBlur: () => {
        setTouched((t) => ({ ...t, [key]: true }))
        setFocusField((current) => (current === key ? null : current))
      },
      value: fields[key],
      onChange: update(key),
    }
  }

  function switchMode(next) {
    setMode(next)
    setError('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      if (isSignup) {
        await signup(fields.userFirstName, fields.userLastName, fields.email, fields.password)
      } else {
        await login(fields.email, fields.password)
      }
      navigate('/JobJuggler/dashboard')
    } catch (err) {
      setError(
        getApiErrorMessage(
          err,
          isSignup ? 'Could not create your account.' : 'Invalid email or password.',
        ),
      )
    } finally {
      setSubmitting(false)
    }
  }

  const passwordToggle = (
    <button
      type="button"
      // Keep focus in the input so the iris does not flicker back open.
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => setShowPassword((v) => !v)}
      aria-label={showPassword ? 'Hide password' : 'Show password'}
      aria-pressed={showPassword}
      className="rounded-md p-2 text-text-muted transition-colors duration-200 hover:text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
    >
      <EyeIcon open={showPassword} />
    </button>
  )

  return (
    <div className="grain relative min-h-svh overflow-hidden bg-bg">
      {/* one continuous canvas behind both columns */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 top-[-10%] h-[38rem] w-[38rem] animate-aurora rounded-full bg-primary/12 blur-[130px]" />
        <div
          className="absolute -right-32 top-[30%] h-[32rem] w-[32rem] animate-aurora rounded-full bg-accent/8 blur-[130px]"
          style={{ animationDelay: '7s' }}
        />
        <div
          className="absolute bottom-[-20%] left-[35%] h-[30rem] w-[30rem] animate-aurora rounded-full bg-primary/10 blur-[140px]"
          style={{ animationDelay: '13s' }}
        />
        <div className="grid-fade absolute inset-0" />
      </div>

      <div className="relative z-10 flex min-h-svh flex-col">
        <Navbar onGetStarted={() => switchMode('signup')} />

        {/* Flex with an explicit gap rather than a 2-col grid: grid columns
            stretch on wide monitors and centre their contents, which is what
            manufactured the huge dead space between the two halves. */}
        <div className="mx-auto flex w-full flex-1 flex-col justify-center lg:flex-row lg:items-center lg:gap-12 wide:gap-16 ultra:gap-20">
          <FeatureShowcase />

          <main className="flex w-full items-center justify-center px-5 py-5 sm:px-8 short:py-2 lg:w-auto">
            <div className="w-full max-w-[24rem] animate-fade-in-up lg:w-[24rem] lg:max-w-none wide:w-[31rem] ultra:w-[35rem]">
              {/* The navbar already carries the brand on every breakpoint. */}
              <div className="relative mt-12 short:mt-9 wide:mt-[4.5rem] ultra:mt-24">
                {/* the lens breaks out over the top edge of the panel */}
                <div
                  ref={lensRef}
                  className="absolute -top-12 left-1/2 z-10 h-24 w-24 -translate-x-1/2 short:-top-9 short:h-[4.5rem] short:w-[4.5rem] wide:-top-[4.5rem] wide:h-36 wide:w-36 ultra:-top-24 ultra:h-48 ultra:w-48"
                >
                  <ApertureLens
                    lookX={tilt.x}
                    lookY={tilt.y}
                    state={lensState}
                    progress={progress}
                    className="h-full w-full drop-shadow-[0_10px_28px_rgba(0,0,0,0.7)]"
                  />
                </div>

                <div className="rounded-2xl border border-white/8 bg-surface/60 px-6 pb-5 pt-14 shadow-2xl shadow-black/50 backdrop-blur-2xl sm:px-7 short:pb-4 short:pt-10 wide:px-9 wide:pb-7 wide:pt-24 ultra:px-11 ultra:pt-32">
                  <div className="text-center">
                    <h1 className="text-xl font-semibold leading-tight tracking-tight text-text wide:text-3xl ultra:text-4xl">
                      {isSignup ? 'Create your account' : 'Welcome back'}
                    </h1>
                    <p className="mt-1 text-xs text-text-muted short:hidden wide:text-sm ultra:text-base">
                      {isSignup
                        ? 'Start juggling your job hunt in one place.'
                        : 'Pick up your job hunt where you left off.'}
                    </p>
                  </div>

                  <div
                    role="group"
                    aria-label="Login or sign up"
                    className="relative mt-4 grid grid-cols-2 rounded-xl border border-border/80 bg-bg/60 p-1 short:mt-3 wide:mt-6"
                  >
                    <span
                      aria-hidden="true"
                      className="bg-brand absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-lg shadow-lg shadow-primary/25 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
                      style={{ transform: isSignup ? 'translateX(100%)' : 'translateX(0)' }}
                    />
                    {MODES.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        aria-pressed={mode === m.id}
                        onClick={() => switchMode(m.id)}
                        className={`relative z-10 rounded-lg py-1.5 text-sm font-medium transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 wide:py-2 wide:text-base ${
                          mode === m.id ? 'text-on-primary' : 'text-text-muted hover:text-text'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>

                  <form
                    onSubmit={handleSubmit}
                    className="mt-4 flex flex-col gap-3 short:mt-3 short:gap-2.5 wide:mt-6 wide:gap-4"
                  >
                    {error && (
                      <div role="alert" className="animate-fade-in-up">
                        <Alert variant="error">{error}</Alert>
                      </div>
                    )}

                    {isSignup && (
                      <div className="grid grid-cols-2 gap-2.5">
                        <div className="animate-fade-in-up">
                          <TextField
                            id="userFirstName"
                            label="First name"
                            autoComplete="given-name"
                            placeholder="Ada"
                            required
                            {...fieldProps('userFirstName')}
                          />
                        </div>
                        <div className="animate-fade-in-up" style={{ animationDelay: '70ms' }}>
                          <TextField
                            id="userLastName"
                            label="Last name"
                            autoComplete="family-name"
                            placeholder="Lovelace"
                            required
                            {...fieldProps('userLastName')}
                          />
                        </div>
                      </div>
                    )}

                    <TextField
                      id="email"
                      label="Email"
                      type="email"
                      autoComplete="email"
                      placeholder="you@example.com"
                      required
                      status={emailStatus}
                      hint={
                        emailStatus === 'invalid'
                          ? 'Enter a complete address, like you@company.com'
                          : undefined
                      }
                      {...fieldProps('email')}
                    />

                    <TextField
                      id="password"
                      label="Password"
                      labelAccessory={
                        !isSignup && (
                          <Link
                            to="/forgot-password"
                            className="text-xs text-accent transition-colors duration-300 hover:text-accent-hover"
                          >
                            Forgot?
                          </Link>
                        )
                      }
                      type={showPassword ? 'text' : 'password'}
                      autoComplete={isSignup ? 'new-password' : 'current-password'}
                      placeholder="••••••••"
                      required
                      status={passwordStatus}
                      trailing={passwordToggle}
                      {...fieldProps('password')}
                    />

                    {/* Strength meter only while signing up — grading an existing
                        password at login would be noise. */}
                    {isSignup && fields.password && (
                      <div className="-mt-1 animate-fade-in-up">
                        <div className="flex items-center gap-2">
                          <div className="flex h-1 flex-1 gap-1">
                            {PASSWORD_RULES.map((rule, i) => (
                              <span
                                key={rule.id}
                                className={`h-full flex-1 rounded-full transition-colors duration-300 ${
                                  i < password.met.length
                                    ? password.status === 'valid'
                                      ? 'bg-accent'
                                      : 'bg-warning'
                                    : 'bg-border'
                                }`}
                              />
                            ))}
                          </div>
                          <span
                            className={`text-[11px] font-medium ${
                              password.status === 'valid' ? 'text-accent' : 'text-text-muted'
                            }`}
                          >
                            {password.label}
                          </span>
                        </div>
                        <ul className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5">
                          {PASSWORD_RULES.map((rule) => {
                            const ok = password.met.includes(rule.id)
                            return (
                              <li
                                key={rule.id}
                                className={`text-[11px] transition-colors duration-300 ${
                                  ok ? 'text-accent' : 'text-text-muted/70'
                                }`}
                              >
                                {ok ? '✓' : '○'} {rule.label}
                              </li>
                            )
                          })}
                        </ul>
                      </div>
                    )}

                    <Button
                      type="submit"
                      loading={submitting}
                      className="mt-1 wide:py-3 wide:text-base"
                    >
                      {submitting
                        ? isSignup
                          ? 'Creating account…'
                          : 'Logging in…'
                        : isSignup
                          ? 'Create account'
                          : 'Login'}
                    </Button>
                  </form>

                  <div className="my-4 flex items-center gap-3 text-xs text-text-muted short:my-3 wide:my-6 wide:text-sm">
                    <div className="h-px flex-1 bg-border" />
                    or continue with
                    <div className="h-px flex-1 bg-border" />
                  </div>

                  {/* Full-page navigations — the backend owns the OAuth2 handshake. */}
                  <div className="grid grid-cols-2 gap-3">
                    <ButtonLink
                      href={`${API_BASE_URL}/oauth2/authorization/google`}
                      className="wide:py-3 wide:text-base"
                    >
                      <GoogleIcon />
                      Google
                    </ButtonLink>
                    <ButtonLink
                      href={`${API_BASE_URL}/oauth2/authorization/github`}
                      className="wide:py-3 wide:text-base"
                    >
                      <GitHubIcon />
                      GitHub
                    </ButtonLink>
                  </div>
                </div>
              </div>

              <p className="mt-3 text-center text-[11px] leading-relaxed text-text-muted/70 short:mt-2 wide:mt-5 wide:text-xs">
                By continuing you agree to the{' '}
                <a href="#terms" className="text-text-muted underline-offset-2 hover:underline">
                  Terms
                </a>{' '}
                and{' '}
                <a href="#privacy" className="text-text-muted underline-offset-2 hover:underline">
                  Privacy Policy
                </a>
                .
              </p>
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}
