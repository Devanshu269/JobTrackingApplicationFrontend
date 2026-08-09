import { useEffect, useState } from 'react'
import { Modal, Field, Input, Select, Textarea } from './ui/Modal'
import { Button } from './ui/Button'
import { Alert } from './ui/Alert'
import { JOB_STATUSES, JOB_TYPES, JOB_PRIORITIES } from '../data/jobConstants'
import { createJob, updateJob } from '../lib/jobsApi'
import { getApiErrorMessage, getApiFieldErrors } from '../lib/api'
import { toDateInputValue, mergeDateIntoDateTime } from '../lib/dates'

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
export function JobFormModal({ open, job, defaultResumeUrl, onClose, onSaved }) {
  const isEdit = Boolean(job)
  const [form, setForm] = useState(() => blankForm(defaultResumeUrl))
  const [fieldErrors, setFieldErrors] = useState({})
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setForm(job ? { ...job } : blankForm(defaultResumeUrl))
    setFieldErrors({})
    setError('')
  }, [open, job, defaultResumeUrl])

  function set(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
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

    // Date inputs only carry a day; keep the original clock time when the day is unchanged.
    const payload = {
      ...form,
      appliedDate: mergeDateIntoDateTime(form.appliedDate?.slice(0, 10), job?.appliedDate),
      followUpDate: mergeDateIntoDateTime(form.followUpDate?.slice(0, 10), job?.followUpDate),
    }

    setSaving(true)
    try {
      const saved = isEdit ? await updateJob(job.jobId, payload) : await createJob(payload)
      onSaved(saved)
      onClose()
    } catch (err) {
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
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
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

          <Field label="Salary range" htmlFor="salaryRange" hint="Free text — e.g. 20-25 LPA">
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
              />
            </Field>
            <Field label="Email" htmlFor="recruiterEmail" error={fieldErrors.recruiterEmail}>
              <Input
                id="recruiterEmail"
                type="email"
                value={form.recruiterEmail ?? ''}
                onChange={(e) => set('recruiterEmail', e.target.value)}
                error={fieldErrors.recruiterEmail}
              />
            </Field>
            <Field label="Phone" htmlFor="recruiterPhone">
              <Input
                id="recruiterPhone"
                value={form.recruiterPhone ?? ''}
                onChange={(e) => set('recruiterPhone', e.target.value)}
              />
            </Field>
          </div>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Resume URL"
            htmlFor="resumeUrl"
            hint={!isEdit && defaultResumeUrl ? 'Prefilled from your default resume.' : undefined}
          >
            <Input
              id="resumeUrl"
              value={form.resumeUrl ?? ''}
              onChange={(e) => set('resumeUrl', e.target.value)}
              placeholder="https://…"
            />
          </Field>
          <Field label="Cover letter URL" htmlFor="coverLetterUrl">
            <Input
              id="coverLetterUrl"
              value={form.coverLetterUrl ?? ''}
              onChange={(e) => set('coverLetterUrl', e.target.value)}
              placeholder="https://…"
            />
          </Field>
        </div>

        <Field label="Notes" htmlFor="notes">
          <Textarea
            id="notes"
            rows={3}
            value={form.notes ?? ''}
            onChange={(e) => set('notes', e.target.value)}
            placeholder="Referred by a friend…"
          />
        </Field>

        <div className="flex justify-end gap-3 border-t border-border/40 pt-4">
          <Button type="button" variant="ghost" onClick={onClose} className="w-auto px-5">
            Cancel
          </Button>
          <Button type="submit" loading={saving} className="w-auto px-6">
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add application'}
          </Button>
        </div>
      </form>
    </Modal>
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
