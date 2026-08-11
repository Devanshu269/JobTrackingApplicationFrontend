import { useState, useCallback } from 'react'
import { KANBAN_COLUMNS, JOB_STATUSES, JOB_TYPES, getStatusAccent } from '@/constants/jobs'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { CompanyAvatar } from '@/components/ui/CompanyAvatar'
import { formatDateShort } from '@/utils/dates'

/**
 * Drag-and-drop Kanban board using the HTML5 Drag and Drop API.
 * WISHLIST → APPLIED → INTERVIEW → OFFER/REJECTED
 *
 * @param {object} props
 * @param {Array} props.jobs
 * @param {(job: object, newStatus: string) => void} props.onStatusChange — deliberately passes
 *   the *whole job*, not just its id. The API has no PATCH: persisting a status change means a
 *   full-replace PUT, so the caller needs every other field to send back untouched.
 * @param {(job: object) => void} props.onSelect
 * @param {number|null} props.pendingJobId — job with an in-flight status update.
 */
export function KanbanBoard({ jobs, onStatusChange, onSelect, pendingJobId = null }) {
  const [draggedId, setDraggedId] = useState(null)
  const [dropTarget, setDropTarget] = useState(null)

  const handleDragStart = useCallback((e, jobId) => {
    setDraggedId(jobId)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(jobId))
    if (e.target) {
      requestAnimationFrame(() => {
        e.target.style.opacity = '0.5'
      })
    }
  }, [])

  const handleDragEnd = useCallback((e) => {
    setDraggedId(null)
    setDropTarget(null)
    if (e.target) e.target.style.opacity = '1'
  }, [])

  const handleDragOver = useCallback((e, columnKey) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDropTarget(columnKey)
  }, [])

  const handleDragLeave = useCallback((e, columnKey) => {
    // Only clear if we actually left the column (not entering a child)
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDropTarget((prev) => (prev === columnKey ? null : prev))
    }
  }, [])

  const handleDrop = useCallback(
    (e, columnKey) => {
      e.preventDefault()
      setDropTarget(null)
      const jobId = Number(e.dataTransfer.getData('text/plain'))
      if (!jobId) return

      const column = KANBAN_COLUMNS.find((c) => c.key === columnKey)
      if (!column) return

      const job = jobs.find((j) => j.jobId === jobId)
      if (!job) return

      let newStatus = column.statuses[0]
      if (columnKey === 'OFFER_REJECTED') {
        // The combined column holds two statuses — keep whichever the job already has,
        // and default to OFFER when arriving from elsewhere.
        newStatus = column.statuses.includes(job.status) ? job.status : 'OFFER'
      }

      if (job.status !== newStatus) {
        onStatusChange(job, newStatus)
      }
    },
    [jobs, onStatusChange],
  )

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin">
      {KANBAN_COLUMNS.map((column) => {
        const columnJobs = jobs.filter((j) => column.statuses.includes(j.status))
        const isOver = dropTarget === column.key
        const colColor = JOB_STATUSES[column.statuses[0]].color

        return (
          <div
            key={column.key}
            className={`flex min-w-[280px] flex-1 flex-col rounded-xl border border-border/60 bg-surface/40 transition-all duration-300 ${
              isOver ? 'kanban-drop-glow' : ''
            }`}
            onDragOver={(e) => handleDragOver(e, column.key)}
            onDragLeave={(e) => handleDragLeave(e, column.key)}
            onDrop={(e) => handleDrop(e, column.key)}
          >
            {/* Column header */}
            <div className="flex items-center gap-2.5 border-b border-border/40 px-4 py-3">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: colColor }}
                aria-hidden="true"
              />
              <h3 className="text-sm font-semibold text-text">{column.label}</h3>
              <span className="ml-auto rounded-full bg-surface-alt px-2 py-0.5 text-[11px] font-medium text-text-muted">
                {columnJobs.length}
              </span>
            </div>

            {/* Cards */}
            <div
              className="flex flex-1 flex-col gap-2.5 overflow-y-auto p-3 scrollbar-thin"
              style={{ maxHeight: '65vh' }}
            >
              {columnJobs.length === 0 && (
                <div className="flex flex-1 items-center justify-center py-10">
                  <p className="text-xs text-text-muted/60">Drop jobs here</p>
                </div>
              )}
              {columnJobs.map((job, i) => (
                <KanbanCard
                  key={job.jobId}
                  job={job}
                  index={i}
                  isDragging={draggedId === job.jobId}
                  isPending={pendingJobId === job.jobId}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  onSelect={onSelect}
                />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function KanbanCard({ job, index, isDragging, isPending, onDragStart, onDragEnd, onSelect }) {
  const accent = getStatusAccent(job.status)

  return (
    <div
      draggable="true"
      onDragStart={(e) => onDragStart(e, job.jobId)}
      onDragEnd={onDragEnd}
      onClick={() => onSelect?.(job)}
      className={`animate-fade-in-up cursor-grab rounded-lg border bg-surface p-3.5 shadow-sm transition-all duration-200 active:cursor-grabbing hover:-translate-y-0.5 hover:shadow-md ${
        isDragging ? 'scale-[0.97] opacity-50' : ''
      } ${isPending ? 'animate-pulse' : ''}`}
      style={{
        borderColor: accent ?? 'var(--color-border)',
        animationDelay: `${index * 60}ms`,
      }}
    >
      {/* Company */}
      <div className="flex items-start gap-2.5">
        <CompanyAvatar name={job.companyName} size="md" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-text">{job.jobRole}</p>
          <p className="truncate text-xs text-text-muted">{job.companyName}</p>
        </div>
      </div>

      {/* Tags row */}
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        {job.jobType && (
          <span className="rounded bg-surface-alt px-1.5 py-0.5 text-[10px] font-medium text-text-muted">
            {JOB_TYPES[job.jobType] ?? job.jobType}
          </span>
        )}
        {job.location && (
          <span className="truncate rounded bg-surface-alt px-1.5 py-0.5 text-[10px] text-text-muted">
            📍 {job.location}
          </span>
        )}
      </div>

      {/* Bottom row */}
      <div className="mt-2.5 flex items-center justify-between">
        {job.appliedDate ? (
          <span className="text-[10px] text-text-muted/70">{formatDateShort(job.appliedDate)}</span>
        ) : (
          <span className="text-[10px] italic text-text-muted/50">Not applied</span>
        )}
        <StatusBadge status={job.status} className="text-[9px]" />
      </div>
    </div>
  )
}
