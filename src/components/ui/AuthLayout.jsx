import { Link } from 'react-router-dom'
import { Logo } from './Logo'

export function AuthLayout({ title, subtitle, children }) {
  return (
    <div className="relative flex min-h-svh items-center justify-center overflow-hidden bg-bg px-4">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 left-1/2 h-96 w-96 -translate-x-1/2 animate-drift rounded-full bg-primary/15 blur-[120px]"
      />

      <div className="relative w-full max-w-sm animate-fade-in-up">
        <div className="mb-8 flex flex-col items-center text-center">
          <Link to="/" className="transition-transform duration-300 hover:scale-105">
            <Logo markClassName="h-10 w-10" />
          </Link>
          <h1 className="mt-6 text-xl font-semibold tracking-tight text-text">{title}</h1>
          {subtitle && <p className="mt-1.5 text-sm text-text-muted">{subtitle}</p>}
        </div>
        <div className="animate-scale-in rounded-lg border border-border bg-surface p-6 shadow-xl shadow-black/40">
          {children}
        </div>
      </div>
    </div>
  )
}
