import { useState, useMemo } from 'react'
import { JOB_STATUSES, JOB_TYPES, getStatusAccent } from '@/constants/jobs'
import { CompanyAvatar } from '@/components/ui/CompanyAvatar'
import { formatDate } from '@/utils/dates'

/**
 * Table view for job applications.
 *
 * Rows are whole `JobApplicationResponseDto` objects. Filtering and searching happen
 * server-side (`GET /api/jobs?status=&search=`), so this component never filters — it only
 * re-orders what it is given. With no column selected it preserves the API's newest-first order.
 *
 * @param {object} props
 * @param {Array} props.jobs
 * @param {(job: object, newStatus: string) => void} props.onStatusChange — receives the whole
 *   job, because updating status requires a full-replace PUT of every field.
 * @param {(job: object) => void} props.onSelect
 */
export function JobTable({ jobs, onStatusChange, onSelect }) {
  const [sortKey, setSortKey] = useState(null)
  const [sortDir, setSortDir] = useState('asc')

  function handleSort(key) {
    if (sortKey === key) {
      // asc → desc → back to the server's own ordering
      if (sortDir === 'asc') return setSortDir('desc')
      setSortKey(null)
      return setSortDir('asc')
    }
    setSortKey(key)
    setSortDir('asc')
  }

  const sorted = useMemo(() => {
    if (!sortKey) return jobs
    return [...jobs].sort((a, b) => {
      let valA = a[sortKey] ?? ''
      let valB = b[sortKey] ?? ''
      if (sortKey === 'appliedDate') {
        valA = valA || '9999-12-31' // nulls (never applied) sort to the end
        valB = valB || '9999-12-31'
      }
      if (typeof valA === 'string') valA = valA.toLowerCase()
      if (typeof valB === 'string') valB = valB.toLowerCase()
      if (valA < valB) return sortDir === 'asc' ? -1 : 1
      if (valA > valB) return sortDir === 'asc' ? 1 : -1
      return 0
    })
  }, [jobs, sortKey, sortDir])

  const columns = [
    { key: 'companyName', label: 'Company' },
    { key: 'jobRole', label: 'Position' },
    { key: 'location', label: 'Location' },
    { key: 'jobType', label: 'Type' },
    { key: 'status', label: 'Status' },
    { key: 'salaryRange', label: 'Salary' },
    { key: 'appliedDate', label: 'Applied' },
  ]

  return (
    <div className="overflow-x-auto rounded-xl border border-border/60 bg-surface/40 scrollbar-thin">
      <table className="w-full min-w-[800px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-border/60">
            {columns.map((col) => (
              <th
                key={col.key}
                onClick={() => handleSort(col.key)}
                className="cursor-pointer px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-muted transition-colors duration-200 hover:text-text"
              >
                <span className="inline-flex items-center gap-1">
                  {col.label}
                  {sortKey === col.key && <SortIcon dir={sortDir} />}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="px-4 py-10 text-center text-sm text-text-muted">
                No applications match your filters.
              </td>
            </tr>
          )}
          {sorted.map((job) => {
            const accent = getStatusAccent(job.status)
            return (
              <tr
                key={job.jobId}
                onClick={() => onSelect?.(job)}
                className="group cursor-pointer border-b border-border/30 transition-colors duration-200 hover:bg-surface-alt/40"
                style={accent ? { boxShadow: `inset 3px 0 0 0 ${accent}` } : undefined}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <CompanyAvatar name={job.companyName} size="sm" />
                    <span className="font-medium text-text">{job.companyName}</span>
                  </div>
                </td>

                <td className="px-4 py-3 text-text">{job.jobRole}</td>

                <td className="px-4 py-3 text-text-muted">{job.location || '—'}</td>

                <td className="px-4 py-3">
                  {job.jobType ? (
                    <span className="rounded bg-surface-alt px-2 py-0.5 text-xs font-medium text-text-muted">
                      {JOB_TYPES[job.jobType] ?? job.jobType}
                    </span>
                  ) : (
                    <span className="text-xs text-text-muted/50">—</span>
                  )}
                </td>

                {/* Status — inline dropdown. Stop propagation so changing status doesn't also open the job. */}
                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <StatusDropdown
                    currentStatus={job.status}
                    onChange={(newStatus) => onStatusChange(job, newStatus)}
                  />
                </td>

                <td className="px-4 py-3 text-text-muted">{job.salaryRange || '—'}</td>

                <td className="px-4 py-3 text-text-muted">{formatDate(job.appliedDate)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function StatusDropdown({ currentStatus, onChange }) {
  return (
    <select
      value={currentStatus}
      onChange={(e) => onChange(e.target.value)}
      className="cursor-pointer rounded-md border border-border/60 bg-surface px-2 py-1 text-xs text-text transition-colors duration-200 hover:border-primary/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
      style={{ color: JOB_STATUSES[currentStatus]?.color }}
    >
      {Object.values(JOB_STATUSES).map((s) => (
        <option key={s.key} value={s.key}>
          {s.label}
        </option>
      ))}
    </select>
  )
}

function SortIcon({ dir }) {
  return (
    <svg viewBox="0 0 10 14" className="h-3 w-3 fill-primary" aria-hidden="true">
      {dir === 'asc' ? <path d="M5 0L10 6H0z" /> : <path d="M5 14L0 8h10z" />}
    </svg>
  )
}
