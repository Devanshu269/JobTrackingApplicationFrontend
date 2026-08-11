import { JOB_STATUSES } from '@/constants/jobs'

// Keyed by the backend Status enum, same as JOB_STATUSES.
const statusStyles = {
  WISHLIST: 'bg-[#a855f7]/15 text-[#c084fc] border-[#a855f7]/30',
  APPLIED: 'bg-[#6366f1]/15 text-[#818cf8] border-[#6366f1]/30',
  INTERVIEW: 'bg-accent/15 text-accent border-accent/30',
  OFFER: 'bg-success/15 text-success border-success/30',
  REJECTED: 'bg-danger/15 text-danger border-danger/30',
}

export function StatusBadge({ status, className = '' }) {
  const info = JOB_STATUSES[status]
  if (!info) return null

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium leading-tight ${statusStyles[status] ?? ''} ${className}`}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: info.color }}
        aria-hidden="true"
      />
      {info.label}
    </span>
  )
}
