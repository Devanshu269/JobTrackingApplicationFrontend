import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Logo } from '@/components/ui/Logo'

const NAV_LINKS = [
  { label: 'Features', to: '/explore#features' },
  { label: 'How it works', to: '/explore#how-it-works' },
  { label: 'Integrations', to: '/explore#integrations' },
]

export function MarketingNav({ onGetStarted }) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const onLoginPage = pathname === '/login'

  // On the login page this flips the form to sign-up; elsewhere it routes there.
  function handleGetStarted() {
    if (onGetStarted) onGetStarted()
    else navigate('/login', { state: { mode: 'signup' } })
  }

  return (
    <header className="sticky top-0 z-20 animate-fade-in-down border-b border-border/70 bg-bg/80 backdrop-blur-md">
      <nav className="mx-auto flex h-16 max-w-[1400px] items-center justify-between px-5 sm:px-8 wide:h-20 wide:max-w-[1700px] ultra:h-24 ultra:max-w-[2050px]">
        <Link to="/" className="transition-transform duration-300 hover:scale-[1.03]">
          <Logo markClassName="h-9 w-9 wide:h-11 wide:w-11" className="wide:text-xl" />
        </Link>

        <ul className="hidden items-center gap-1 lg:flex">
          {NAV_LINKS.map((link, i) => (
            <li
              key={link.label}
              className="animate-fade-in-down"
              style={{ animationDelay: `${120 + i * 70}ms` }}
            >
              <Link
                to={link.to}
                className="group relative block px-3.5 py-2 text-sm text-text-muted transition-colors duration-300 hover:text-text wide:px-4 wide:text-base"
              >
                {link.label}
                <span className="absolute inset-x-3.5 -bottom-0.5 h-px origin-left scale-x-0 bg-primary transition-transform duration-300 group-hover:scale-x-100" />
              </Link>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-4">
          {!onLoginPage && (
            <Link
              to="/login"
              className="text-sm text-text-muted transition-colors duration-300 hover:text-text wide:text-base"
            >
              Login
            </Link>
          )}
          <button
            type="button"
            onClick={handleGetStarted}
            className="rounded-md border border-primary/40 bg-primary/10 px-4 py-2 text-sm font-medium text-primary transition-all duration-300 hover:-translate-y-0.5 hover:bg-primary hover:text-on-primary hover:shadow-lg hover:shadow-primary/25 wide:px-5 wide:py-2.5 wide:text-base"
          >
            Get started
          </button>
        </div>
      </nav>
    </header>
  )
}
