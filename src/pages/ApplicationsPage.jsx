import { useState, useCallback } from 'react'
import { INITIAL_JOBS, JOB_STATUSES } from '../data/mockJobs'
import { KanbanBoard } from '../components/KanbanBoard'
import { JobTable } from '../components/JobTable'

export default function ApplicationsPage() {
  const [jobs, setJobs] = useState(INITIAL_JOBS)
  const [view, setView] = useState('kanban') // 'kanban' | 'table'
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const handleStatusChange = useCallback((jobId, newStatus) => {
    setJobs((prev) =>
      prev.map((j) => {
        if (j.id !== jobId) return j
        return {
          ...j,
          status: newStatus,
          // When moving to offer, set outcome to accepted; when rejected, set to rejected
          outcome: newStatus === 'offer' ? 'accepted' : newStatus === 'rejected' ? 'rejected' : null,
        }
      }),
    )
  }, [])

  // Filter jobs
  const filteredJobs =
    statusFilter === 'all'
      ? jobs
      : jobs.filter((j) => j.status === statusFilter)

  return (
    <div className="mx-auto max-w-7xl animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text">Applications</h1>
          <p className="mt-1 text-sm text-text-muted">
            {jobs.length} job{jobs.length !== 1 ? 's' : ''} tracked
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View toggle */}
          <div className="flex rounded-lg border border-border/60 bg-surface-alt/50 p-0.5">
            <button
              type="button"
              onClick={() => setView('kanban')}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
                view === 'kanban'
                  ? 'bg-primary/15 text-primary'
                  : 'text-text-muted hover:text-text'
              }`}
              aria-pressed={view === 'kanban'}
            >
              <span className="flex items-center gap-1.5">
                <svg viewBox="0 0 14 14" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <rect x="1" y="1" width="3.5" height="12" rx="1" />
                  <rect x="5.25" y="1" width="3.5" height="8" rx="1" />
                  <rect x="9.5" y="1" width="3.5" height="10" rx="1" />
                </svg>
                Board
              </span>
            </button>
            <button
              type="button"
              onClick={() => setView('table')}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
                view === 'table'
                  ? 'bg-primary/15 text-primary'
                  : 'text-text-muted hover:text-text'
              }`}
              aria-pressed={view === 'table'}
            >
              <span className="flex items-center gap-1.5">
                <svg viewBox="0 0 14 14" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M2 3h10M2 7h10M2 11h10" />
                </svg>
                Table
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Search + filter bar */}
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Search */}
        <div className="relative flex-1 sm:max-w-xs">
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
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search company, position…"
            className="w-full rounded-lg border border-border/60 bg-surface-alt/50 py-2 pl-9 pr-4 text-sm text-text placeholder:text-text-muted/50 transition-all duration-200 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/25"
          />
        </div>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="cursor-pointer rounded-lg border border-border/60 bg-surface-alt/50 px-3 py-2 text-sm text-text transition-all duration-200 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/25"
        >
          <option value="all">All statuses</option>
          {Object.values(JOB_STATUSES).map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {/* Content */}
      <div className="mt-6">
        {view === 'kanban' ? (
          <KanbanBoard
            jobs={filteredJobs}
            onStatusChange={handleStatusChange}
          />
        ) : (
          <JobTable
            jobs={filteredJobs}
            onStatusChange={handleStatusChange}
            searchQuery={searchQuery}
          />
        )}
      </div>
    </div>
  )
}
