import { useEffect, useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Field, Input, Select, Textarea } from '@/components/ui/Form'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { JOB_STATUSES, JOB_TYPES, JOB_PRIORITIES } from '@/constants/jobs'
import { createJob, updateJob } from '@/api/jobs'
import { setDefaultResume } from '@/api/user'
import { getApiErrorMessage, getApiFieldErrors } from '@/api/client'
import { toDateInputValue, mergeDateIntoDateTime } from '@/utils/dates'
import { FileDropZone } from '@/components/files/FileDropZone'
import {
  uploadFile,
  FILE_PURPOSES,
  DOCUMENT_ACCEPT,
  MAX_DOCUMENT_MB,
} from '@/api/files'

/** Ties the pinned footer's submit button back to the form in the modal body. */
const FORM_ID = 'job-form'

/**
 * Create/edit form for a job application.
 *
 * On edit this keeps the *entire* job object in state, not just the visible fields, because
 * saving is a full-replace `PUT` — anything not sent back is written as null.
 *
 * @param {object} props
 * @param {object|null} props.job — existing job to edit, or null to create.
 * @param {string|null} props.defaultResumeUrl — from `/api/auth/me`, prefills new jobs.
 * @param {(job: object) => void} props.onSaved
 */
export function JobFormModal({ open, job, defaultResumeUrl, onClose, onSaved, onUserChanged }) {
  const isEdit = Boolean(job)
  const [form, setForm] = useState(() => blankForm(defaultResumeUrl))
  const [fieldErrors, setFieldErrors] = useState({})
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  // Deferred uploads: a picked file waits here and is only sent when the user saves.
  const [resumeMode, setResumeMode] = useState('default') // 'default' | 'file' | 'none'
  const [resumeFile, setResumeFile] = useState(null)
  const [coverFile, setCoverFile] = useState(null)
  const [alsoSetDefault, setAlsoSetDefault] = useState(false)
  const [progress, setProgress] = useState({ resume: null, cover: null })

  useEffect(() => {
    if (!open) return
    setForm(job ? { ...job } : blankForm(defaultResumeUrl))
    setFieldErrors({})
    setError('')
    setResumeFile(null)
    setCoverFile(null)
    setAlsoSetDefault(false)
    setProgress({ resume: null, cover: null })

    // On edit, a resume matching the stored default is shown as "use my default" so saving
    // an unrelated field doesn't quietly detach it from the default.
    const existing = job ? job.resumeUrl : defaultResumeUrl
    if (existing && defaultResumeUrl && existing === defaultResumeUrl) setResumeMode('default')
    else if (existing) setResumeMode('file')
    else setResumeMode(defaultResumeUrl && !isEdit ? 'default' : 'none')
  }, [open, job, defaultResumeUrl, isEdit])

  function set(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function chooseResumeMode(mode) {
    setResumeMode(mode)
    if (mode === 'default') {
      setResumeFile(null)
      setAlsoSetDefault(false)
      set('resumeUrl', defaultResumeUrl ?? '')
    } else if (mode === 'none') {
      setResumeFile(null)
      setAlsoSetDefault(false)
      set('resumeUrl', '')
    } else if (form.resumeUrl === defaultResumeUrl) {
      // Switching off "default" shouldn't leave the default's URL behind as a stale value.
      set('resumeUrl', '')
    }
  }

  function validate() {
    const errors = {}
    if (!form.companyName?.trim()) errors.companyName = 'Company name is required.'
    else if (form.companyName.length > 100) errors.companyName = 'Must be at most 100 characters.'
    if (!form.jobRole?.trim()) errors.jobRole = 'Job role is required.'
    else if (form.jobRole.length > 100) errors.jobRole = 'Must be at most 100 characters.'
    // The backend only applies @Email when the field is present, so blank is fine.
    if (form.recruiterEmail?.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.recruiterEmail)) {
      errors.recruiterEmail = 'Enter a valid email address.'
    }
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!validate()) return

    setSaving(true)
    try {
      // ---- 1. Upload any staged files -----------------------------------------------------
      // Uploads are deferred to save time, so they run here rather than on drop. Each result
      // is written back into form state: if the job write then fails validation, hitting Save
      // again reuses the uploaded URL instead of uploading the same file twice.
      let resumeUrl = resumeMode === 'none' ? '' : form.resumeUrl
      let coverLetterUrl = form.coverLetterUrl

      if (resumeMode === 'file' && resumeFile) {
        resumeUrl = await uploadFile(resumeFile, FILE_PURPOSES.RESUME, (p) =>
          setProgress((prev) => ({ ...prev, resume: p })),
        )
        setProgress((prev) => ({ ...prev, resume: null }))
        set('resumeUrl', resumeUrl)
        setResumeFile(null)

        if (alsoSetDefault) {
          // Best-effort: failing to update the default must not lose the job the user is saving.
          try {
            onUserChanged?.(await setDefaultResume(resumeUrl))
          } catch {
            /* the job save below is what matters */
          }
        }
      }

      if (coverFile) {
        coverLetterUrl = await uploadFile(coverFile, FILE_PURPOSES.COVER_LETTER, (p) =>
          setProgress((prev) => ({ ...prev, cover: p })),
        )
        setProgress((prev) => ({ ...prev, cover: null }))
        set('coverLetterUrl', coverLetterUrl)
        setCoverFile(null)
      }

      // ---- 2. Write the job ---------------------------------------------------------------
      // Date inputs only carry a day; keep the original clock time when the day is unchanged.
      const payload = {
        ...form,
        resumeUrl,
        coverLetterUrl,
        appliedDate: mergeDateIntoDateTime(form.appliedDate?.slice(0, 10), job?.appliedDate),
        followUpDate: mergeDateIntoDateTime(form.followUpDate?.slice(0, 10), job?.followUpDate),
      }

      const saved = isEdit ? await updateJob(job.jobId, payload) : await createJob(payload)
      onSaved(saved)
      onClose()
    } catch (err) {
      setProgress({ resume: null, cover: null })
      // A 400 from bean validation carries a field map; an invalid enum or malformed body
      // does not, so fall back to the top-level message.
      const apiFieldErrors = getApiFieldErrors(err)
      if (apiFieldErrors) setFieldErrors(apiFieldErrors)
      setError(getApiErrorMessage(err, 'Could not save this application.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={isEdit ? 'Edit application' : 'Add application'}
      subtitle={isEdit ? form.companyName : 'Track a new role you’re interested in.'}
      footer={
        <div className="flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onClose} className="w-auto px-5">
            Cancel
          </Button>
          {/* Lives outside the <form> (pinned footer), so it needs an explicit form owner. */}
          <Button type="submit" form={FORM_ID} loading={saving} className="w-auto px-6">
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add application'}
          </Button>
        </div>
      }
    >
      <form id={FORM_ID} onSubmit={handleSubmit} className="flex flex-col gap-5">
        <Alert variant="error">{error}</Alert>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Company" htmlFor="companyName" required error={fieldErrors.companyName}>
            <Input
              id="companyName"
              value={form.companyName ?? ''}
              onChange={(e) => set('companyName', e.target.value)}
              error={fieldErrors.companyName}
              placeholder="Acme Corp"
              maxLength={100}
            />
          </Field>

          <Field label="Role" htmlFor="jobRole" required error={fieldErrors.jobRole}>
            <Input
              id="jobRole"
              value={form.jobRole ?? ''}
              onChange={(e) => set('jobRole', e.target.value)}
              error={fieldErrors.jobRole}
              placeholder="Frontend Engineer"
              maxLength={100}
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Status" htmlFor="status" required error={fieldErrors.status}>
            <Select id="status" value={form.status} onChange={(e) => set('status', e.target.value)}>
              {Object.values(JOB_STATUSES).map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Priority" htmlFor="priority">
            <Select
              id="priority"
              value={form.priority ?? ''}
              onChange={(e) => set('priority', e.target.value || null)}
            >
              <option value="">—</option>
              {Object.entries(JOB_PRIORITIES).map(([key, p]) => (
                <option key={key} value={key}>
                  {p.label}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Work type" htmlFor="jobType">
            <Select
              id="jobType"
              value={form.jobType ?? ''}
              onChange={(e) => set('jobType', e.target.value || null)}
            >
              <option value="">—</option>
              {Object.entries(JOB_TYPES).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Location" htmlFor="location">
            <Input
              id="location"
              value={form.location ?? ''}
              onChange={(e) => set('location', e.target.value)}
              placeholder="Remote · Bengaluru, India"
            />
          </Field>

          <Field label="Salary range" htmlFor="salaryRange">
            <Input
              id="salaryRange"
              value={form.salaryRange ?? ''}
              onChange={(e) => set('salaryRange', e.target.value)}
              placeholder="20-25 LPA"
            />
          </Field>
        </div>

        <Field label="Job posting URL" htmlFor="jobUrl">
          <Input
            id="jobUrl"
            type="url"
            value={form.jobUrl ?? ''}
            onChange={(e) => set('jobUrl', e.target.value)}
            placeholder="https://…"
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Applied on" htmlFor="appliedDate">
            <Input
              id="appliedDate"
              type="date"
              value={toDateInputValue(form.appliedDate)}
              onChange={(e) => set('appliedDate', e.target.value)}
            />
          </Field>

          <Field label="Follow up on" htmlFor="followUpDate">
            <Input
              id="followUpDate"
              type="date"
              value={toDateInputValue(form.followUpDate)}
              onChange={(e) => set('followUpDate', e.target.value)}
            />
          </Field>
        </div>

        <label className="flex cursor-pointer items-center gap-2.5">
          <input
            type="checkbox"
            checked={Boolean(form.reminderEnabled)}
            onChange={(e) => set('reminderEnabled', e.target.checked)}
            className="h-4 w-4 cursor-pointer accent-[#7c6bf5]"
          />
          <span className="text-sm text-text">Remind me about the follow-up</span>
        </label>

        <fieldset className="rounded-lg border border-border/50 p-4">
          <legend className="px-1.5 text-xs font-medium text-text-muted">Recruiter</legend>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Name" htmlFor="recruiterName">
              <Input
                id="recruiterName"
                value={form.recruiterName ?? ''}
                onChange={(e) => set('recruiterName', e.target.value)}
                placeholder="Priya Sharma"
              />
            </Field>
            <Field label="Email" htmlFor="recruiterEmail" error={fieldErrors.recruiterEmail}>
              <Input
                id="recruiterEmail"
                type="email"
                value={form.recruiterEmail ?? ''}
                onChange={(e) => set('recruiterEmail', e.target.value)}
                error={fieldErrors.recruiterEmail}
                placeholder="priya@acme.com"
              />
            </Field>
            <Field label="Phone" htmlFor="recruiterPhone">
              <Input
                id="recruiterPhone"
                type="tel"
                value={form.recruiterPhone ?? ''}
                onChange={(e) => set('recruiterPhone', e.target.value)}
                placeholder="+91 98765 43210"
              />
            </Field>
          </div>
        </fieldset>

        <fieldset className="rounded-lg border border-border/50 p-4">
          <legend className="px-1.5 text-xs font-medium text-text-muted">Documents</legend>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <span className="text-xs font-medium text-text-muted">Resume</span>

              {/* Three-way choice. Nothing here blocks saving — resumeUrl is optional. */}
              <div className="flex flex-wrap gap-1.5">
                <ModeChip
                  active={resumeMode === 'default'}
                  disabled={!defaultResumeUrl}
                  onClick={() => chooseResumeMode('default')}
                  title={defaultResumeUrl ? undefined : 'You haven’t set a default resume yet'}
                >
                  Use my default
                </ModeChip>
                <ModeChip active={resumeMode === 'file'} onClick={() => chooseResumeMode('file')}>
                  Upload
                </ModeChip>
                <ModeChip active={resumeMode === 'none'} onClick={() => chooseResumeMode('none')}>
                  Skip
                </ModeChip>
              </div>

              {resumeMode === 'default' && (
                <p className="rounded-lg border border-border/50 bg-surface-alt/40 px-3 py-2 text-[11px] text-text-muted">
                  {defaultResumeUrl ? (
                    <>
                      Using{' '}
                      <a
                        href={defaultResumeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:text-primary-hover"
                      >
                        your default resume ↗
                      </a>
                    </>
                  ) : (
                    'No default resume set — upload one below, or set it in Settings.'
                  )}
                </p>
              )}

              {resumeMode === 'file' && (
                <>
                  <FileDropZone
                    file={resumeFile}
                    value={form.resumeUrl ?? ''}
                    onFile={setResumeFile}
                    onValue={(url) => set('resumeUrl', url)}
                    accept={DOCUMENT_ACCEPT}
                    maxMb={MAX_DOCUMENT_MB}
                    disabled={saving}
                    progress={progress.resume}
                  />
                  {resumeFile && (
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        checked={alsoSetDefault}
                        onChange={(e) => setAlsoSetDefault(e.target.checked)}
                        className="h-3.5 w-3.5 cursor-pointer accent-[#7c6bf5]"
                      />
                      <span className="text-[11px] text-text-muted">
                        Also set as my default resume
                      </span>
                    </label>
                  )}
                </>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-xs font-medium text-text-muted">Cover letter</span>
              <FileDropZone
                file={coverFile}
                value={form.coverLetterUrl ?? ''}
                onFile={setCoverFile}
                onValue={(url) => set('coverLetterUrl', url)}
                accept={DOCUMENT_ACCEPT}
                maxMb={MAX_DOCUMENT_MB}
                disabled={saving}
                progress={progress.cover}
              />
            </div>
          </div>
        </fieldset>

        <Field label="Notes" htmlFor="notes">
          <Textarea
            id="notes"
            rows={3}
            value={form.notes ?? ''}
            onChange={(e) => set('notes', e.target.value)}
            placeholder="Referred by a friend…"
          />
        </Field>

      </form>
    </Modal>
  )
}

function ModeChip({ active, disabled, onClick, title, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-pressed={active}
      className={`rounded-md border px-2.5 py-1 text-[11px] font-medium transition-all duration-200 ${
        active
          ? 'border-primary/50 bg-primary/15 text-primary'
          : 'border-border/60 bg-surface-alt/40 text-text-muted hover:text-text'
      } ${disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'}`}
    >
      {children}
    </button>
  )
}

function blankForm(defaultResumeUrl) {
  return {
    companyName: '',
    jobRole: '',
    status: 'WISHLIST',
    priority: null,
    jobType: null,
    jobUrl: '',
    location: '',
    salaryRange: '',
    recruiterName: '',
    recruiterEmail: '',
    recruiterPhone: '',
    // The stored default resume is just a string to reuse — see PUT /api/users/me/default-resume.
    resumeUrl: defaultResumeUrl ?? '',
    coverLetterUrl: '',
    notes: '',
    appliedDate: null,
    followUpDate: null,
    reminderEnabled: false,
  }
}
