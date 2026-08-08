export function LogoMark({ className = 'h-9 w-9', animated = true }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <rect width="64" height="64" rx="14" className="fill-surface-alt" />
      <rect width="64" height="64" rx="14" className="fill-primary/10" />
      {/* three juggled balls, each drifting on its own offset */}
      <circle
        cx="32"
        cy="17"
        r="6"
        className={`fill-primary ${animated ? 'animate-float' : ''}`}
      />
      <circle
        cx="18"
        cy="38"
        r="6"
        className={`fill-accent ${animated ? 'animate-float' : ''}`}
        style={animated ? { animationDelay: '900ms' } : undefined}
      />
      <circle
        cx="46"
        cy="38"
        r="6"
        className={`fill-primary/60 ${animated ? 'animate-float' : ''}`}
        style={animated ? { animationDelay: '1800ms' } : undefined}
      />
      <path
        d="M14 46c4 6 32 6 36 0"
        fill="none"
        strokeWidth="4"
        strokeLinecap="round"
        className="stroke-primary"
      />
    </svg>
  )
}

export function Logo({ className = '', markClassName = 'h-9 w-9' }) {
  return (
    <span className={`flex items-center gap-2.5 ${className}`}>
      <LogoMark className={markClassName} />
      <span className="text-lg font-semibold tracking-tight text-text">
        Job<span className="text-primary">Juggler</span>
      </span>
    </span>
  )
}
