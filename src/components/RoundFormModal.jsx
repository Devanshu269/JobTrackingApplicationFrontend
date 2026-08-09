import { useEffect, useState } from 'react'
import { Modal, Field, Input, Select, Textarea } from './ui/Modal'
import { Button } from './ui/Button'
import { Alert } from './ui/Alert'
import { ROUND_TYPES, ROUND_OUTCOMES } from '../data/jobConstants'
import { createRound, updateRound } from '../lib/jobsApi'
import { getApiErrorMessage, getApiFieldErrors } from '../lib/api'
import { toDateTimeInputValue, toApiDateTimeFromLocal } from '../lib/dates'

/**
 * Create/edit form for an interview round.
 *
 * `roundNumber` is not auto-assigned by the backend and not enforced unique — the UI picks it,
 * defaulting to the next number in the list. `roundType` values are **PascalCase**, unlike
 * every other enum in the API; sending `TECHNICAL` instead of `Technical` is a 400.
 *
 * As with jobs, `PUT` is a full replace, so editing sends every field back.
 */
export function RoundFormModal({ open, jobId, round, nextRoundNumber, onClose, onSaved }) {
  const isEdit = Boolean(round)
  const [form, setForm] = useState(() => blankRound(nextRoundNumber))
  const [fieldErrors, setFieldErrors] = useState({})
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setForm(round ? { ...round } : blankRound(nextRoundNumber))
    setFieldErrors({})
    setError('')
  }, [open, round, nextRoundNumber])

  function set(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    const errors = {}
    if (!form.roundNumber || Number(form.roundNumber) < 1) {
      errors.roundNumber = 'Round number must be at least 1.'
    }
    if (!form.roundType) errors.roundType = 'Round type is required.'
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    const payload = {
      roundNumber: Number(form.roundNumber),
      roundType: form.roundType,
      roundDate: toApiDateTimeFromLocal(form.roundDate),
      interviewerName: form.interviewerName || null,
      notes: form.notes || null,
      feedback: form.feedback || null,
      outcome: form.outcome || null,
    }

    setSaving(true)
    try {
      const saved = isEdit
        ? await updateRound(jobId, round.jobRoundId, payload)
        : await createRound(jobId, payload)
      onSaved(saved)
      onClose()
    } catch (err) {
      const apiFieldErrors = getApiFieldErrors(err)
      if (apiFieldErrors) setFieldErrors(apiFieldErrors)
      setError(getApiErrorMessage(err, 'Could not save this round.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? `Edit round ${round?.roundNumber}` : 'Add interview round'}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Alert variant="error">{error}</Alert>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Round number" htmlFor="roundNumber" required error={fieldErrors.roundNumber}>
            <Input
              id="roundNumber"
              type="number"
              min={1}
              value={form.roundNumber}
              onChange={(e) => set('roundNumber', e.target.value)}
              error={fieldErrors.roundNumber}
            />
          </Field>

          <Field label="Type" htmlFor="roundType" required error={fieldErrors.roundType}>
            <Select
              id="roundType"
              value={form.roundType}
              onChange={(e) => set('roundType', e.target.value)}
              error={fieldErrors.roundType}
            >
              {ROUND_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Date & time" htmlFor="roundDate">
            <Input
              id="roundDate"
              type="datetime-local"
              value={toDateTimeInputValue(form.roundDate)}
              onChange={(e) => set('roundDate', e.target.value)}
            />
          </Field>

          <Field label="Outcome" htmlFor="outcome">
            <Select
              id="outcome"
              value={form.outcome ?? ''}
              onChange={(e) => set('outcome', e.target.value || null)}
            >
              <option value="">—</option>
              {Object.entries(ROUND_OUTCOMES).map(([key, o]) => (
                <option key={key} value={key}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field label="Interviewer" htmlFor="interviewerName">
          <Input
            id="interviewerName"
            value={form.interviewerName ?? ''}
            onChange={(e) => set('interviewerName', e.target.value)}
          />
        </Field>

        <Field label="Notes" htmlFor="roundNotes">
          <Textarea
            id="roundNotes"
            rows={2}
            value={form.notes ?? ''}
            onChange={(e) => set('notes', e.target.value)}
            placeholder="DSA round, focus on graphs…"
          />
        </Field>

        <Field label="Feedback" htmlFor="feedback">
          <Textarea
            id="feedback"
            rows={2}
            value={form.feedback ?? ''}
            onChange={(e) => set('feedback', e.target.value)}
            placeholder="What went well, what to improve…"
          />
        </Field>

        <div className="flex justify-end gap-3 border-t border-border/40 pt-4">
          <Button type="button" variant="ghost" onClick={onClose} className="w-auto px-5">
            Cancel
          </Button>
          <Button type="submit" loading={saving} className="w-auto px-6">
            {saving ? 'Saving…' : isEdit ? 'Save round' : 'Add round'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

function blankRound(nextRoundNumber) {
  return {
    roundNumber: nextRoundNumber,
    roundType: 'Technical',
    roundDate: '',
    interviewerName: '',
    notes: '',
    feedback: '',
    outcome: 'PENDING',
  }
}
