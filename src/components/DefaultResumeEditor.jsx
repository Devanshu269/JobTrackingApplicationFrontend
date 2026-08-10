import { useEffect, useState } from 'react'
import { setDefaultResume, clearDefaultResume } from '../lib/userApi'
import { getApiErrorMessage } from '../lib/api'
import {
  uploadFile,
  FILE_PURPOSES,
  DOCUMENT_ACCEPT,
  MAX_DOCUMENT_MB,
} from '../lib/filesApi'
import { FileDropZone } from './ui/FileDropZone'
import { Button } from './ui/Button'
import { Alert } from './ui/Alert'

/**
 * The default-resume form body, with no card or modal chrome of its own.
 *
 * Shared deliberately: it's rendered inline on the Settings page and inside a modal from the
 * app shell's user menu, so someone can set a resume without leaving whatever page they're on.
 * One implementation means the upload semantics can't drift between the two entry points.
 *
 * @param {(user: object) => void} props.applyUser — push the returned UserDto into auth context
 * @param {() => void} [props.onSaved] — lets the modal close itself after a successful save
 */
export function DefaultResumeEditor({ user, applyUser, onSaved }) {
  const [resumeUrl, setResumeUrl] = useState(user.defaultResumeUrl ?? '')
  const [resumeFile, setResumeFile] = useState(null)
  const [progress, setProgress] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setResumeUrl(user.defaultResumeUrl ?? '')
    setResumeFile(null)
  }, [user])

  async function handleSave(e) {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!resumeFile && !resumeUrl.trim()) {
      setError('Pick a file or paste a link, or use Remove to clear it.')
      return
    }

    setBusy(true)
    try {
      // Deferred upload, then repoint the default. Each upload lands on a fresh key and
      // nothing is overwritten, so jobs referencing the previous resume still resolve to the
      // exact file that was sent at the time.
      let nextUrl = resumeUrl.trim()
      if (resumeFile) {
        nextUrl = await uploadFile(resumeFile, FILE_PURPOSES.RESUME, setProgress)
        setProgress(null)
        setResumeUrl(nextUrl)
        setResumeFile(null)
      }

      applyUser(await setDefaultResume(nextUrl))
      setSuccess('Default resume saved.')
      onSaved?.()
    } catch (err) {
      setProgress(null)
      setError(getApiErrorMessage(err, 'Could not save your default resume.'))
    } finally {
      setBusy(false)
    }
  }

  async function handleClear() {
    setError('')
    setSuccess('')
    setBusy(true)
    try {
      // Clears the pointer only. The stored file is intentionally left in place, because
      // existing jobs may still reference that exact URL.
      applyUser(await clearDefaultResume())
      setSuccess('Default resume removed.')
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not remove your default resume.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-4">
      <Alert variant="error">{error}</Alert>
      <Alert variant="success">{success}</Alert>

      <FileDropZone
        file={resumeFile}
        value={resumeUrl}
        onFile={setResumeFile}
        onValue={setResumeUrl}
        accept={DOCUMENT_ACCEPT}
        maxMb={MAX_DOCUMENT_MB}
        disabled={busy}
        progress={progress}
      />

      <div className="flex flex-wrap gap-3">
        <Button type="submit" loading={busy} className="w-auto px-6 py-2 text-sm">
          Save
        </Button>
        {user.defaultResumeUrl && (
          <Button
            type="button"
            variant="ghost"
            onClick={handleClear}
            disabled={busy}
            className="w-auto px-5 py-2 text-sm"
          >
            Remove
          </Button>
        )}
      </div>
    </form>
  )
}
