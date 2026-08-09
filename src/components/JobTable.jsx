import { useState, useMemo } from 'react'
import { JOB_STATUSES, JOB_TYPES } from '../data/mockJobs'

/**
 * Sortable, filterable table view for job applications.
 *
 * @param {object} props
 * @param {Array} props.jobs — array of job objects
 * @param {(jobId: number, newStatus: string) => void} props.onStatusChange
 * @param {string} props.searchQuery — filter string
 */
export function JobTable({ jobs, onStatusChange, searchQuery = '' }) {
  const [sortKey, setSortKey] = useState('appliedDate')
  const [sortDir, setSortDir] = useState('desc')

  function handleSort(key) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return jobs
    const q = searchQuery.toLowerCase()
    return jobs.filter(
      (j) =>
        j.company.toLowerCase().includes(q) ||
        j.position.toLowerCase().includes(q) ||
        j.location.toLowerCase().includes(q),
    )
  }, [jobs, searchQuery])

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let valA = a[sortKey] ?? ''
      let valB = b[sortKey] ?? ''
      if (sortKey === 'appliedDate') {
        valA = valA || '9999-99-99' // push nulls to end
        valB = valB || '9999-99-99'
      }
      if (typeof valA === 'string') valA = valA.toLowerCase()
      if (typeof valB === 'string') valB = valB.toLowerCase()
      if (valA < valB) return sortDir === 'asc' ? -1 : 1
      if (valA > valB) return sortDir === 'asc' ? 1 : -1
      return 0
    })
  }, [filtered, sortKey, sortDir])

  const columns = [
    { key: 'company', label: 'Company' },
    { key: 'position', label: 'Position' },
    { key: 'location', label: 'Location' },
    { key: 'type', label: 'Type' },
    { key: 'status', label: 'Status' },
    { key: 'salary', label: 'Salary' },
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
                  {sortKey === col.key && (
                    <SortIcon dir={sortDir} />
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="px-4 py-10 text-center text-sm text-text-muted">
                No jobs match your search.
              </td>
            </tr>
          )}
          {sorted.map((job) => {
            const borderColor = getRowBorderColor(job)
            return (
              <tr
                key={job.id}
                className="group border-b border-border/30 transition-colors duration-200 hover:bg-surface-alt/40"
                style={
                  borderColor
                    ? { boxShadow: `inset 3px 0 0 0 ${borderColor}` }
                    : undefined
                }
              >
                {/* Company */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-surface-alt text-sm">
                      {job.companyIcon}
                    </span>
                    <span className="font-medium text-text">{job.company}</span>
                  </div>
                </td>

                {/* Position */}
                <td className="px-4 py-3 text-text">{job.position}</td>

                {/* Location */}
                <td className="px-4 py-3 text-text-muted">{job.location}</td>

                {/* Type */}
                <td className="px-4 py-3">
                  <span className="rounded bg-surface-alt px-2 py-0.5 text-xs font-medium text-text-muted">
                    {JOB_TYPES[job.type] ?? job.type}
                  </span>
                </td>

                {/* Status — inline dropdown */}
                <td className="px-4 py-3">
                  <StatusDropdown
                    currentStatus={job.status}
                    onChange={(newStatus) => onStatusChange(job.id, newStatus)}
                  />
                </td>

                {/* Salary */}
                <td className="px-4 py-3 text-text-muted">
                  {job.salary || '—'}
                </td>

                {/* Applied date */}
                <td className="px-4 py-3 text-text-muted">
                  {job.appliedDate
                    ? new Date(job.appliedDate + 'T00:00:00').toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    : '—'}
                </td>
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
      style={{
        color: JOB_STATUSES[currentStatus]?.color,
      }}
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
      {dir === 'asc' ? (
        <path d="M5 0L10 6H0z" />
      ) : (
        <path d="M5 14L0 8h10z" />
      )}
    </svg>
  )
}

function getRowBorderColor(job) {
  if (job.status === 'offer' && job.outcome === 'accepted') return '#4ade9b'
  if (job.status === 'rejected' || job.outcome === 'rejected') return '#fb7185'
  return null
}
