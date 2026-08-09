import { useState, useCallback } from 'react'
import { KANBAN_COLUMNS, JOB_STATUSES, JOB_TYPES } from '../data/mockJobs'
import { StatusBadge } from './ui/StatusBadge'

/**
 * Drag-and-drop Kanban board using the HTML5 Drag and Drop API.
 * Four columns: Thinking to Apply → Applied → In Interview Process → Offer/Rejected
 *
 * @param {object} props
 * @param {Array} props.jobs — array of job objects
 * @param {(jobId: number, newStatus: string) => void} props.onStatusChange
 */
export function KanbanBoard({ jobs, onStatusChange }) {
  const [draggedId, setDraggedId] = useState(null)
  const [dropTarget, setDropTarget] = useState(null)

  const handleDragStart = useCallback((e, jobId) => {
    setDraggedId(jobId)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(jobId))
    // Make the ghost slightly transparent
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

      // Determine the new status from the column
      const column = KANBAN_COLUMNS.find((c) => c.key === columnKey)
      if (!column) return

      // For the offer-rejected column, keep the existing status if it's already one of the column statuses
      const job = jobs.find((j) => j.id === jobId)
      if (!job) return

      let newStatus = column.statuses[0]
      if (columnKey === 'offer-rejected') {
        // Default to 'offer' when dropping into the last column
        newStatus = column.statuses.includes(job.status) ? job.status : 'offer'
      }

      if (job.status !== newStatus) {
        onStatusChange(jobId, newStatus)
      }
    },
    [jobs, onStatusChange],
  )

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin">
      {KANBAN_COLUMNS.map((column) => {
        const columnJobs = jobs.filter((j) => column.statuses.includes(j.status))
        const isOver = dropTarget === column.key
        const colColor =
          column.key === 'offer-rejected'
            ? JOB_STATUSES.offer.color
            : JOB_STATUSES[column.statuses[0]].color

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
            <div className="flex flex-1 flex-col gap-2.5 overflow-y-auto p-3 scrollbar-thin" style={{ maxHeight: '65vh' }}>
              {columnJobs.length === 0 && (
                <div className="flex flex-1 items-center justify-center py-10">
                  <p className="text-xs text-text-muted/60">Drop jobs here</p>
                </div>
              )}
              {columnJobs.map((job, i) => (
                <KanbanCard
                  key={job.id}
                  job={job}
                  index={i}
                  isDragging={draggedId === job.id}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function KanbanCard({ job, index, isDragging, onDragStart, onDragEnd }) {
  const borderColor = getBorderColor(job)

  return (
    <div
      draggable="true"
      onDragStart={(e) => onDragStart(e, job.id)}
      onDragEnd={onDragEnd}
      className={`animate-fade-in-up cursor-grab rounded-lg border bg-surface p-3.5 shadow-sm transition-all duration-200 active:cursor-grabbing hover:-translate-y-0.5 hover:shadow-md ${
        isDragging ? 'scale-[0.97] opacity-50' : ''
      }`}
      style={{
        borderColor,
        animationDelay: `${index * 60}ms`,
      }}
    >
      {/* Company + icon */}
      <div className="flex items-start gap-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-surface-alt text-base">
          {job.companyIcon}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-text">{job.position}</p>
          <p className="truncate text-xs text-text-muted">{job.company}</p>
        </div>
      </div>

      {/* Tags row */}
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        <span className="rounded bg-surface-alt px-1.5 py-0.5 text-[10px] font-medium text-text-muted">
          {JOB_TYPES[job.type] ?? job.type}
        </span>
        {job.location && (
          <span className="truncate rounded bg-surface-alt px-1.5 py-0.5 text-[10px] text-text-muted">
            📍 {job.location}
          </span>
        )}
      </div>

      {/* Bottom row */}
      <div className="mt-2.5 flex items-center justify-between">
        {job.appliedDate ? (
          <span className="text-[10px] text-text-muted/70">
            {formatDate(job.appliedDate)}
          </span>
        ) : (
          <span className="text-[10px] text-text-muted/50 italic">Not applied</span>
        )}
        <StatusBadge status={job.status} className="text-[9px]" />
      </div>
    </div>
  )
}

function getBorderColor(job) {
  if (job.status === 'offer' && job.outcome === 'accepted') return '#4ade9b'
  if (job.status === 'rejected' || job.outcome === 'rejected') return '#fb7185'
  return 'var(--color-border)'
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
