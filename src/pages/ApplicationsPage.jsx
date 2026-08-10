import { useState, useCallback, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { JOB_STATUSES, JOB_TYPES, JOB_PRIORITIES } from '../data/jobConstants'
import { KanbanBoard } from '../components/KanbanBoard'
import { JobTable } from '../components/JobTable'
import { JobFormModal } from '../components/JobFormModal'
import { listJobs, updateJob } from '../lib/jobsApi'
import { getApiErrorMessage } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { Alert } from '../components/ui/Alert'
import { Button } from '../components/ui/Button'

export default function ApplicationsPage() {
  const { user, applyUser } = useAuth()
  const navigate = useNavigate()

  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [pendingJobId, setPendingJobId] = useState(null)

  const [view, setView] = useState('kanban') // 'kanban' | 'table'
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')

  const [formOpen, setFormOpen] = useState(false)
  const [editingJob, setEditingJob] = useState(null)

  // Debounced so typing in the search box doesn't fire a request per keystroke.
  const [debouncedSearch, setDebouncedSearch] = useState('')
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 300)
    return () => clearTimeout(id)
  }, [searchQuery])

  // Guards against a slow early response overwriting a faster later one.
  const requestRef = useRef(0)

  const load = useCallback(async () => {
    const requestId = ++requestRef.current
    setLoading(true)
    try {
      const data = await listJobs({
        search: debouncedSearch,
        status: statusFilter,
        jobType: typeFilter,
        priority: priorityFilter,
      })
      if (requestId !== requestRef.current) return
      setJobs(data)
      setError('')
    } catch (err) {
      if (requestId !== requestRef.current) return
      setError(getApiErrorMessage(err, 'Could not load your applications.'))
    } finally {
      if (requestId === requestRef.current) setLoading(false)
    }
  }, [debouncedSearch, statusFilter, typeFilter, priorityFilter])

  useEffect(() => {
    load()
  }, [load])

  /**
   * Persists a status change from a drag or the table dropdown.
   *
   * Sends the whole job with `status` swapped: the API's PUT is a full replace, so a body of
   * just `{ status }` would null out the notes, salary, recruiter — everything else on the row.
   * The UI updates optimistically and rolls back if the request fails.
   */
  const handleStatusChange = useCallback(async (job, newStatus) => {
    const previous = job
    setPendingJobId(job.jobId)
    setJobs((prev) => prev.map((j) => (j.jobId === job.jobId ? { ...j, status: newStatus } : j)))

    try {
      const saved = await updateJob(job.jobId, { ...job, status: newStatus })
      setJobs((prev) => prev.map((j) => (j.jobId === saved.jobId ? saved : j)))
      setError('')
    } catch (err) {
      setJobs((prev) => prev.map((j) => (j.jobId === previous.jobId ? previous : j)))
      setError(getApiErrorMessage(err, 'Could not move that application.'))
    } finally {
      setPendingJobId(null)
    }
  }, [])

  function handleSaved(saved) {
    setJobs((prev) => {
      const exists = prev.some((j) => j.jobId === saved.jobId)
      // New jobs go to the front — the API orders newest-first.
      return exists ? prev.map((j) => (j.jobId === saved.jobId ? saved : j)) : [saved, ...prev]
    })
  }

  const hasFilters = Boolean(debouncedSearch || statusFilter || typeFilter || priorityFilter)

  return (
    <div className="mx-auto max-w-7xl animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text">Applications</h1>
          <p className="mt-1 text-sm text-text-muted">
            {loading ? 'Loading…' : `${jobs.length} job${jobs.length !== 1 ? 's' : ''}${hasFilters ? ' matching' : ' tracked'}`}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex rounded-lg border border-border/60 bg-surface-alt/50 p-0.5">
            <button
              type="button"
              onClick={() => setView('kanban')}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
                view === 'kanban' ? 'bg-primary/15 text-primary' : 'text-text-muted hover:text-text'
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
                view === 'table' ? 'bg-primary/15 text-primary' : 'text-text-muted hover:text-text'
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

          <Button
            type="button"
            onClick={() => {
              setEditingJob(null)
              setFormOpen(true)
            }}
            className="w-auto px-4 py-2 text-sm"
          >
            <span className="flex items-center gap-1.5">
              <svg viewBox="0 0 14 14" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <path d="M7 2v10M2 7h10" />
              </svg>
              Add
            </span>
          </Button>
        </div>
      </div>

      {/* Search + filter bar. Every control below drives a server-side query param. */}
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
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
            placeholder="Search company or role…"
            className="w-full rounded-lg border border-border/60 bg-surface-alt/50 py-2 pl-9 pr-4 text-sm text-text placeholder:text-text-muted/50 transition-all duration-200 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/25"
          />
        </div>

        <FilterSelect value={statusFilter} onChange={setStatusFilter} allLabel="All statuses">
          {Object.values(JOB_STATUSES).map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </FilterSelect>

        <FilterSelect value={typeFilter} onChange={setTypeFilter} allLabel="All types">
          {Object.entries(JOB_TYPES).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </FilterSelect>

        <FilterSelect value={priorityFilter} onChange={setPriorityFilter} allLabel="All priorities">
          {Object.entries(JOB_PRIORITIES).map(([key, p]) => (
            <option key={key} value={key}>
              {p.label}
            </option>
          ))}
        </FilterSelect>
      </div>

      {error && (
        <div className="mt-4">
          <Alert variant="error">{error}</Alert>
        </div>
      )}

      {/* Content */}
      <div className="mt-6">
        {loading && jobs.length === 0 ? (
          <SkeletonBoard />
        ) : jobs.length === 0 ? (
          <EmptyState
            hasFilters={hasFilters}
            onAdd={() => {
              setEditingJob(null)
              setFormOpen(true)
            }}
          />
        ) : view === 'kanban' ? (
          <KanbanBoard
            jobs={jobs}
            onStatusChange={handleStatusChange}
            onSelect={(job) => navigate(`/JobJuggler/applications/${job.jobId}`)}
            pendingJobId={pendingJobId}
          />
        ) : (
          <JobTable
            jobs={jobs}
            onStatusChange={handleStatusChange}
            onSelect={(job) => navigate(`/JobJuggler/applications/${job.jobId}`)}
          />
        )}
      </div>

      <JobFormModal
        open={formOpen}
        job={editingJob}
        defaultResumeUrl={user?.defaultResumeUrl}
        onClose={() => setFormOpen(false)}
        onSaved={handleSaved}
        onUserChanged={applyUser}
      />
    </div>
  )
}

function FilterSelect({ value, onChange, allLabel, children }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="cursor-pointer rounded-lg border border-border/60 bg-surface-alt/50 px-3 py-2 text-sm text-text transition-all duration-200 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/25"
    >
      <option value="">{allLabel}</option>
      {children}
    </select>
  )
}

function EmptyState({ hasFilters, onAdd }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-surface/30 py-16 text-center">
      <span className="text-3xl" aria-hidden="true">
        🗂️
      </span>
      <h3 className="mt-3 text-sm font-semibold text-text">
        {hasFilters ? 'No applications match those filters' : 'No applications yet'}
      </h3>
      <p className="mt-1 max-w-sm text-xs text-text-muted">
        {hasFilters
          ? 'Try clearing the search or widening the filters.'
          : 'Add the first role you’re tracking and it will show up on your board.'}
      </p>
      {!hasFilters && (
        <Button type="button" onClick={onAdd} className="mt-5 w-auto px-5 py-2 text-sm">
          Add your first application
        </Button>
      )}
    </div>
  )
}

function SkeletonBoard() {
  return (
    <div className="flex gap-4 overflow-hidden pb-4">
      {[0, 1, 2, 3].map((col) => (
        <div key={col} className="min-w-[280px] flex-1 rounded-xl border border-border/60 bg-surface/40 p-3">
          <div className="mb-3 h-4 w-32 animate-pulse rounded bg-surface-alt" />
          {[0, 1].map((card) => (
            <div key={card} className="mb-2.5 h-24 animate-pulse rounded-lg bg-surface-alt/60" />
          ))}
        </div>
      ))}
    </div>
  )
}
