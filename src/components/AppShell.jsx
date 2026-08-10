import { useMemo, useState, useEffect } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Logo } from './ui/Logo'
import { NotificationBell } from './NotificationBell'
import { DefaultResumeEditor } from './DefaultResumeEditor'
import { Modal } from './ui/Modal'
import { filenameFromUrl, openFile, useResolvedFilename } from '../lib/filesApi'
import { clearDefaultResume } from '../lib/userApi'
import { getApiErrorMessage } from '../lib/api'
import { getNotifications } from '../lib/jobsApi'

const NAV_ITEMS = [
  {
    to: '/JobJuggler/dashboard',
    label: 'Dashboard',
    icon: (
      <svg viewBox="0 0 20 20" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="7" height="7" rx="1.5" />
        <rect x="11" y="2" width="7" height="7" rx="1.5" />
        <rect x="2" y="11" width="7" height="7" rx="1.5" />
        <rect x="11" y="11" width="7" height="7" rx="1.5" />
      </svg>
    ),
  },
  {
    to: '/JobJuggler/applications',
    label: 'Applications',
    icon: (
      <svg viewBox="0 0 20 20" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="14" height="14" rx="2" />
        <path d="M7 7h6M7 10h6M7 13h4" />
      </svg>
    ),
  },
  {
    to: '/JobJuggler/analytics',
    label: 'Analytics',
    icon: (
      <svg viewBox="0 0 20 20" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 17V9M7 17V5M11 17V8M15 17V3" />
      </svg>
    ),
  },
  {
    to: '/JobJuggler/activity',
    label: 'Activity',
    icon: (
      <svg viewBox="0 0 20 20" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="10" cy="10" r="8" />
        <path d="M10 5v5l3.5 2" />
      </svg>
    ),
  },
  {
    to: '/JobJuggler/settings',
    label: 'Settings',
    icon: (
      <svg viewBox="0 0 20 20" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="10" cy="10" r="3" />
        <path d="M10 2v2M10 16v2M3.5 5.5l1.4 1.4M15.1 15.1l1.4 1.4M2 10h2M16 10h2M3.5 14.5l1.4-1.4M15.1 4.9l1.4-1.4" />
      </svg>
    ),
  },
]

export function AppShell() {
  const { user, logout, applyUser } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [resumeModalOpen, setResumeModalOpen] = useState(false)
  const [resumePopoverOpen, setResumePopoverOpen] = useState(false)
  const [resumeRemoving, setResumeRemoving] = useState(false)
  const [resumeRemoveError, setResumeRemoveError] = useState('')
  const [apiNotifications, setApiNotifications] = useState([])

  const resolvedResumeName = useResolvedFilename(user?.defaultResumeUrl, 'Resume.pdf')

  useEffect(() => {
    if (!user) return
    let cancelled = false
    getNotifications()
      .then((data) => {
        if (!cancelled) setApiNotifications(data || [])
      })
      .catch((err) => console.error('Failed to load notifications:', err))
    
    return () => { cancelled = true }
  }, [user])

  /**
   * Derived from state the shell already has — no extra request. Only genuinely actionable
   * items belong here; an empty list means no dot, which is the point.
   */
  const notifications = useMemo(() => {
    const items = []
    if (user && !user.defaultResumeUrl) {
      items.push({
        id: 'no-default-resume',
        tone: 'warning',
        title: 'No default resume',
        body: 'Set one and it will prefill every new application you add.',
        actionLabel: 'Add a resume',
        onAction: () => setResumeModalOpen(true),
      })
    }
    
    for (const job of apiNotifications) {
      if (!job.reminderSentAt) {
        items.push({
          id: `reminder-${job.jobId}`,
          tone: 'primary',
          title: 'Follow-up due',
          body: `Time to follow up with ${job.companyName} for the ${job.jobRole} role.`,
          actionLabel: 'View application',
          onAction: () => navigate(`/JobJuggler/applications/${job.jobId}`),
        })
      }
    }
    
    return items
  }, [user, apiNotifications, navigate])

  // No mock fallback: AppShell only renders inside ProtectedRoute, which waits for /me to
  // resolve. A missing user here means a real failure and should look like one, not silently
  // render a placeholder identity.
  const initials = `${(user?.userFirstName || 'U')[0]}${(user?.userLastName || '')[0] || ''}`.toUpperCase()

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  const hasResume = Boolean(user?.defaultResumeUrl)

  async function handleResumeRemove() {
    setResumeRemoving(true)
    setResumeRemoveError('')
    try {
      applyUser(await clearDefaultResume())
      setResumePopoverOpen(false)
    } catch (err) {
      setResumeRemoveError(getApiErrorMessage(err, 'Could not remove resume.'))
    } finally {
      setResumeRemoving(false)
    }
  }

  return (
    <div className="flex min-h-svh bg-bg">
      {/* ---- Mobile overlay ---- */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ---- Sidebar ---- */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border/60 bg-surface/80 backdrop-blur-xl transition-transform duration-300 lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="flex h-16 items-center gap-2.5 border-b border-border/40 px-5">
          <NavLink to="/JobJuggler/dashboard" onClick={() => setSidebarOpen(false)}>
            <Logo markClassName="h-8 w-8" />
          </NavLink>
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-3 py-4">
          <ul className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    `group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-primary/10 text-text'
                        : 'text-text-muted hover:bg-surface-alt/60 hover:text-text'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <span
                          className="bg-brand absolute -left-3 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full"
                          aria-hidden="true"
                        />
                      )}
                      <span className={isActive ? 'text-primary' : 'text-text-muted group-hover:text-text'}>
                        {item.icon}
                      </span>
                      {item.label}
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

      </aside>

      {/* ---- Main content area ---- */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border/60 bg-bg/80 px-5 backdrop-blur-md">
          {/* Hamburger (mobile) */}
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="rounded-md p-2 text-text-muted transition-colors hover:bg-surface-alt hover:text-text lg:hidden"
            aria-label="Open sidebar"
          >
            <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M3 5h14M3 10h14M3 15h14" />
            </svg>
          </button>

          {/* Search (placeholder) */}
          <div className="relative hidden flex-1 sm:block sm:max-w-md">
            <svg
              viewBox="0 0 16 16"
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            >
              <circle cx="7" cy="7" r="5" />
              <path d="M14 14l-3.5-3.5" />
            </svg>
            <input
              type="text"
              placeholder="Search jobs, companies…"
              className="w-full rounded-lg border border-border/60 bg-surface-alt/50 py-2 pl-9 pr-4 text-sm text-text placeholder:text-text-muted/50 transition-all duration-200 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/25"
            />
          </div>

          {/* Right side */}
          <div className="ml-auto flex items-center gap-3">
            <NotificationBell notifications={notifications} />

            {/* Default resume quick-access */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  if (hasResume) {
                    setResumePopoverOpen((v) => !v)
                  } else {
                    setResumeModalOpen(true)
                  }
                }}
                aria-label={hasResume ? `Default resume: ${resolvedResumeName}` : 'Set default resume'}
                title={hasResume ? resolvedResumeName : 'No default resume set'}
                className="relative rounded-lg p-2 text-text-muted transition-colors duration-200 hover:bg-surface-alt hover:text-text"
              >
                <svg viewBox="0 0 18 18" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.5 1.5H5a1.5 1.5 0 00-1.5 1.5v12A1.5 1.5 0 005 16.5h8a1.5 1.5 0 001.5-1.5V6z" />
                  <path d="M10.5 1.5V6H14.5" />
                  <path d="M7 10h4M7 13h2.5" />
                </svg>
                {/* Status dot */}
                <span
                  className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full ring-2 ring-bg"
                  style={{ backgroundColor: hasResume ? '#4ade9b' : '#fbbf24' }}
                  aria-hidden="true"
                />
              </button>

              {/* Resume popover (only when resume is set) */}
              {resumePopoverOpen && hasResume && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setResumePopoverOpen(false)} aria-hidden="true" />
                  <div className="absolute right-0 top-full z-50 mt-2 w-64 animate-fade-in-down rounded-xl border border-border/60 bg-surface/95 p-3 shadow-xl shadow-black/40 backdrop-blur-xl">
                    <div className="flex items-start gap-2.5">
                      <span className="mt-0.5 text-base" aria-hidden="true">📄</span>
                      <div className="min-w-0 flex-1">
                        <span className="truncate text-sm font-medium text-text">
                          {resolvedResumeName}
                        </span>
                        <p className="text-[11px] text-text-muted">Default resume</p>
                      </div>
                    </div>

                    {resumeRemoveError && (
                      <p className="mt-2 text-[11px] text-danger">{resumeRemoveError}</p>
                    )}

                    <div className="mt-3 flex items-center gap-2 border-t border-border/40 pt-3">
                      <button
                        type="button"
                        onClick={async () => {
                          await openFile(user.defaultResumeUrl, 'Resume.pdf')
                        }}
                        className="flex-1 rounded-md border border-border/50 bg-surface-alt/40 px-2.5 py-1.5 text-center text-[11px] font-medium text-text transition-colors hover:bg-surface-alt/70"
                      >
                        Open ↗
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setResumePopoverOpen(false)
                          setResumeModalOpen(true)
                        }}
                        className="flex-1 rounded-md border border-border/50 bg-surface-alt/40 px-2.5 py-1.5 text-center text-[11px] font-medium text-text transition-colors hover:bg-surface-alt/70"
                      >
                        Change
                      </button>
                      <button
                        type="button"
                        onClick={handleResumeRemove}
                        disabled={resumeRemoving}
                        className="flex-1 rounded-md border border-danger/30 bg-danger/5 px-2.5 py-1.5 text-center text-[11px] font-medium text-danger transition-colors hover:bg-danger/10 disabled:opacity-50"
                      >
                        {resumeRemoving ? '…' : 'Remove'}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* User avatar + dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setUserMenuOpen((v) => !v)}
                className="bg-brand flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold text-on-primary ring-2 ring-transparent transition-all duration-200 hover:ring-primary/40"
                aria-label="User menu"
                aria-expanded={userMenuOpen}
              >
                {initials}
              </button>

              {/* Dropdown menu */}
              {userMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setUserMenuOpen(false)}
                    aria-hidden="true"
                  />
                  <div className="absolute right-0 top-full z-50 mt-2 w-56 animate-fade-in-down rounded-xl border border-border/60 bg-surface/95 p-2 shadow-xl shadow-black/40 backdrop-blur-xl">
                    {/* User info */}
                    <div className="border-b border-border/40 px-3 pb-2.5 pt-1.5">
                      <p className="text-sm font-medium text-text">
                        {user?.userFirstName} {user?.userLastName}
                      </p>
                      <p className="truncate text-[11px] text-text-muted">{user?.email}</p>
                    </div>

                    {/* Default resume — reachable from anywhere, so adding a job never means
                        a detour through Settings first. */}
                    <button
                      type="button"
                      onClick={() => {
                        setUserMenuOpen(false)
                        setResumeModalOpen(true)
                      }}
                      className="mt-1.5 flex w-full items-start gap-2.5 rounded-lg px-3 py-2 text-left transition-all duration-200 hover:bg-surface-alt/60"
                    >
                      <svg viewBox="0 0 16 16" className="mt-0.5 h-4 w-4 shrink-0 text-text-muted" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 1.5H4a1 1 0 00-1 1v11a1 1 0 001 1h8a1 1 0 001-1V5.5z" />
                        <path d="M9 1.5v4h4" />
                      </svg>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm text-text">Default resume</span>
                        <span className="block truncate text-[11px] text-text-muted">
                          {user?.defaultResumeUrl ? (
                            filenameFromUrl(user.defaultResumeUrl)
                          ) : (
                            <span className="text-[#fbbf24]">Not set yet</span>
                          )}
                        </span>
                      </span>
                    </button>

                    {/* Logout */}
                    <button
                      type="button"
                      onClick={() => {
                        setUserMenuOpen(false)
                        handleLogout()
                      }}
                      className="mt-1.5 flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-text-muted transition-all duration-200 hover:bg-danger/10 hover:text-danger"
                    >
                      <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M6 14H3a1 1 0 01-1-1V3a1 1 0 011-1h3M11 11l3-3-3-3M5.5 8H14" />
                      </svg>
                      Log out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-5 sm:p-6 scrollbar-thin">
          <Outlet />
        </main>
      </div>

      {user && (
        <Modal
          open={resumeModalOpen}
          onClose={() => setResumeModalOpen(false)}
          title="Default resume"
          subtitle="Prefills the resume on every new application you add."
        >
          <DefaultResumeEditor
            user={user}
            applyUser={applyUser}
            onSaved={() => setResumeModalOpen(false)}
          />
        </Modal>
      )}
    </div>
  )
}
