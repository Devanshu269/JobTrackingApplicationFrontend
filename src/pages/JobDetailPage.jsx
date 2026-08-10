import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getJob, listRounds, deleteJob, deleteRound } from '../lib/jobsApi'
import { getApiErrorMessage } from '../lib/api'
import { JOB_TYPES, JOB_PRIORITIES, ROUND_OUTCOMES, getStatusAccent } from '../data/jobConstants'
import { formatDate, formatDateTime } from '../lib/dates'
import { StatusBadge } from '../components/ui/StatusBadge'
import { CompanyAvatar } from '../components/ui/CompanyAvatar'
import { JobFormModal } from '../components/JobFormModal'
import { RoundFormModal } from '../components/RoundFormModal'
import { Modal } from '../components/ui/Modal'
import { Button } from '../components/ui/Button'
import { Alert } from '../components/ui/Alert'

export default function JobDetailPage() {
  const { jobId } = useParams()
  const navigate = useNavigate()
  const { user, applyUser } = useAuth()

  const [job, setJob] = useState(null)
  const [rounds, setRounds] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [actionError, setActionError] = useState('')

  const [editOpen, setEditOpen] = useState(false)
  const [roundFormOpen, setRoundFormOpen] = useState(false)
  const [editingRound, setEditingRound] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      // Rounds are nested under the job and enforce ownership through it, so both calls
      // fail the same way for a job that isn't yours.
      const [jobData, roundData] = await Promise.all([getJob(jobId), listRounds(jobId)])
      setJob(jobData)
      setRounds(roundData)
      setLoadError('')
    } catch (err) {
      // A 404 here means "no job with this id that you can see" — it does NOT confirm the job
      // was deleted. The API deliberately returns 404 rather than 403 for another user's row,
      // so it never reveals which ids exist. Word the message accordingly.
      setLoadError(
        err?.response?.status === 404
          ? 'This application isn’t available. It may have been deleted, or it belongs to another account.'
          : getApiErrorMessage(err, 'Could not load this application.'),
      )
    } finally {
      setLoading(false)
    }
  }, [jobId])

  useEffect(() => {
    load()
  }, [load])

  async function handleDeleteJob() {
    setDeleting(true)
    try {
      await deleteJob(job.jobId)
      navigate('/JobJuggler/applications', { replace: true })
    } catch (err) {
      setActionError(getApiErrorMessage(err, 'Could not delete this application.'))
      setConfirmDelete(false)
    } finally {
      setDeleting(false)
    }
  }

  async function handleDeleteRound(round) {
    const previous = rounds
    setRounds((prev) => prev.filter((r) => r.jobRoundId !== round.jobRoundId))
    try {
      await deleteRound(job.jobId, round.jobRoundId)
    } catch (err) {
      setRounds(previous)
      setActionError(getApiErrorMessage(err, 'Could not delete that round.'))
    }
  }

  function handleRoundSaved(saved) {
    setRounds((prev) => {
      const exists = prev.some((r) => r.jobRoundId === saved.jobRoundId)
      const next = exists
        ? prev.map((r) => (r.jobRoundId === saved.jobRoundId ? saved : r))
        : [...prev, saved]
      // The list endpoint returns rounds ordered by roundNumber; keep local state consistent.
      return next.sort((a, b) => a.roundNumber - b.roundNumber)
    })
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl animate-fade-in">
        <div className="h-8 w-48 animate-pulse rounded bg-surface-alt" />
        <div className="mt-6 h-40 animate-pulse rounded-xl bg-surface-alt/60" />
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-2xl animate-fade-in text-center">
        <Alert variant="error">{loadError}</Alert>
        <Link
          to="/JobJuggler/applications"
          className="mt-5 inline-block text-sm text-primary hover:text-primary-hover"
        >
          ← Back to applications
        </Link>
      </div>
    )
  }

  const accent = getStatusAccent(job.status)
  const nextRoundNumber = rounds.length > 0 ? Math.max(...rounds.map((r) => r.roundNumber)) + 1 : 1

  return (
    <div className="mx-auto max-w-4xl animate-fade-in">
      <Link
        to="/JobJuggler/applications"
        className="text-xs text-text-muted transition-colors hover:text-text"
      >
        ← Applications
      </Link>

      {/* Header */}
      <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3.5">
          <CompanyAvatar name={job.companyName} size="lg" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-text">{job.jobRole}</h1>
            <p className="mt-0.5 text-sm text-text-muted">{job.companyName}</p>
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <StatusBadge status={job.status} />
              {job.jobType && (
                <span className="rounded bg-surface-alt px-2 py-0.5 text-[11px] font-medium text-text-muted">
                  {JOB_TYPES[job.jobType] ?? job.jobType}
                </span>
              )}
              {job.priority && (
                <span
                  className="rounded px-2 py-0.5 text-[11px] font-medium"
                  style={{
                    backgroundColor: `${JOB_PRIORITIES[job.priority].color}1f`,
                    color: JOB_PRIORITIES[job.priority].color,
                  }}
                >
                  {JOB_PRIORITIES[job.priority].label} priority
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setEditOpen(true)}
            className="w-auto px-4 py-2 text-sm"
          >
            Edit
          </Button>
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="rounded-md border border-danger/40 bg-danger/10 px-4 py-2 text-sm font-medium text-danger transition-all duration-200 hover:bg-danger/20"
          >
            Delete
          </button>
        </div>
      </div>

      {actionError && (
        <div className="mt-4">
          <Alert variant="error">{actionError}</Alert>
        </div>
      )}

      {/* Details */}
      <section
        className="mt-6 glass-card p-6"
        style={accent ? { boxShadow: `inset 3px 0 0 0 ${accent}` } : undefined}
      >
        <h2 className="text-sm font-semibold text-text">Details</h2>
        <dl className="mt-4 grid gap-x-6 gap-y-4 sm:grid-cols-2">
          <Detail label="Location" value={job.location} />
          <Detail label="Salary range" value={job.salaryRange} />
          <Detail label="Applied on" value={formatDate(job.appliedDate)} />
          <Detail label="Follow up on" value={formatDate(job.followUpDate)} />
          <Detail label="Reminder" value={job.reminderEnabled ? 'On' : 'Off'} />
          <Detail label="Last updated" value={formatDate(job.updatedAt)} />
          <DetailLink label="Job posting" href={job.jobUrl} />
          <DetailLink label="Resume" href={job.resumeUrl} />
          <DetailLink label="Cover letter" href={job.coverLetterUrl} />
        </dl>

        {(job.recruiterName || job.recruiterEmail || job.recruiterPhone) && (
          <>
            <h3 className="mt-6 text-xs font-semibold uppercase tracking-wider text-text-muted">
              Recruiter
            </h3>
            <dl className="mt-3 grid gap-x-6 gap-y-4 sm:grid-cols-3">
              <Detail label="Name" value={job.recruiterName} />
              <Detail label="Email" value={job.recruiterEmail} />
              <Detail label="Phone" value={job.recruiterPhone} />
            </dl>
          </>
        )}

        {job.notes && (
          <>
            <h3 className="mt-6 text-xs font-semibold uppercase tracking-wider text-text-muted">
              Notes
            </h3>
            <p className="mt-2 whitespace-pre-wrap text-sm text-text">{job.notes}</p>
          </>
        )}
      </section>

      {/* Interview rounds */}
      <section className="mt-6 glass-card p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-text">Interview rounds</h2>
            <p className="mt-0.5 text-[11px] text-text-muted">
              {rounds.length === 0
                ? 'No rounds recorded yet.'
                : `${rounds.length} round${rounds.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setEditingRound(null)
              setRoundFormOpen(true)
            }}
            className="w-auto px-4 py-1.5 text-xs"
          >
            Add round
          </Button>
        </div>

        {rounds.length > 0 && (
          <ol className="mt-5 flex flex-col gap-3">
            {rounds.map((round) => (
              <li
                key={round.jobRoundId}
                className="rounded-lg border border-border/50 bg-surface-alt/30 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-[11px] font-semibold text-primary">
                        {round.roundNumber}
                      </span>
                      <span className="text-sm font-medium text-text">{round.roundType}</span>
                      {round.outcome && (
                        <span
                          className="rounded px-2 py-0.5 text-[10px] font-medium"
                          style={{
                            backgroundColor: `${ROUND_OUTCOMES[round.outcome]?.color ?? '#64748b'}1f`,
                            color: ROUND_OUTCOMES[round.outcome]?.color ?? '#64748b',
                          }}
                        >
                          {ROUND_OUTCOMES[round.outcome]?.label ?? round.outcome}
                        </span>
                      )}
                    </div>
                    <p className="mt-1.5 text-xs text-text-muted">
                      {formatDateTime(round.roundDate, 'No date set')}
                      {round.interviewerName ? ` · ${round.interviewerName}` : ''}
                    </p>
                    {round.notes && (
                      <p className="mt-2 whitespace-pre-wrap text-xs text-text">{round.notes}</p>
                    )}
                    {round.feedback && (
                      <p className="mt-2 whitespace-pre-wrap text-xs text-text-muted">
                        <span className="font-medium text-text">Feedback: </span>
                        {round.feedback}
                      </p>
                    )}
                  </div>

                  <div className="flex shrink-0 gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingRound(round)
                        setRoundFormOpen(true)
                      }}
                      className="rounded-md px-2.5 py-1 text-[11px] text-text-muted transition-colors hover:bg-surface-alt hover:text-text"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteRound(round)}
                      className="rounded-md px-2.5 py-1 text-[11px] text-text-muted transition-colors hover:bg-danger/10 hover:text-danger"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      <JobFormModal
        open={editOpen}
        job={job}
        defaultResumeUrl={user?.defaultResumeUrl}
        onClose={() => setEditOpen(false)}
        onSaved={setJob}
        onUserChanged={applyUser}
      />

      <RoundFormModal
        open={roundFormOpen}
        jobId={job.jobId}
        round={editingRound}
        nextRoundNumber={nextRoundNumber}
        onClose={() => setRoundFormOpen(false)}
        onSaved={handleRoundSaved}
      />

      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete this application?"
        subtitle={`${job.jobRole} at ${job.companyName}`}
      >
        <p className="text-sm text-text-muted">
          This also removes every interview round recorded against it. This can’t be undone.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setConfirmDelete(false)}
            className="w-auto px-5"
          >
            Cancel
          </Button>
          <button
            type="button"
            onClick={handleDeleteJob}
            disabled={deleting}
            className="rounded-md border border-danger/40 bg-danger/10 px-5 py-2 text-sm font-medium text-danger transition-all duration-200 hover:bg-danger/20 disabled:opacity-50"
          >
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </Modal>
    </div>
  )
}

function Detail({ label, value }) {
  return (
    <div>
      <dt className="text-[11px] font-medium uppercase tracking-wide text-text-muted">{label}</dt>
      <dd className="mt-0.5 text-sm text-text">{value || '—'}</dd>
    </div>
  )
}

function DetailLink({ label, href }) {
  return (
    <div>
      <dt className="text-[11px] font-medium uppercase tracking-wide text-text-muted">{label}</dt>
      <dd className="mt-0.5 truncate text-sm">
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary transition-colors hover:text-primary-hover"
          >
            Open ↗
          </a>
        ) : (
          <span className="text-text">—</span>
        )}
      </dd>
    </div>
  )
}
