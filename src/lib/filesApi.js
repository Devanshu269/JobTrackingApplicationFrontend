import { api } from './api'

/**
 * File uploads.
 *
 * The browser never talks to object storage directly — it posts to our own backend, which
 * validates and forwards to R2. That keeps size/content-type limits as real controls rather
 * than client-side suggestions, and avoids needing CORS on the bucket.
 *
 * Uploads are deferred: a picked file sits in component state and is only sent when the user
 * saves. Every call site therefore uploads first, then writes the URL onto the job/profile.
 */

/** Matches the `purpose` the backend uses to choose a storage prefix. */
export const FILE_PURPOSES = {
  RESUME: 'resume',
  COVER_LETTER: 'cover-letter',
  AVATAR: 'avatar',
}

export const DOCUMENT_ACCEPT = '.pdf,.doc,.docx'
export const IMAGE_ACCEPT = 'image/png,image/jpeg,image/webp'
export const MAX_DOCUMENT_MB = 5
export const MAX_IMAGE_MB = 2

/**
 * Client-side guard only — fast feedback, not a security control. The backend must re-check
 * both of these, since anything here can be bypassed.
 */
export function validateFile(file, { maxMb, accept }) {
  if (!file) return null
  if (file.size > maxMb * 1024 * 1024) {
    return `That file is ${(file.size / 1024 / 1024).toFixed(1)} MB — the limit is ${maxMb} MB.`
  }
  if (accept) {
    const patterns = accept.split(',').map((p) => p.trim().toLowerCase())
    const name = file.name.toLowerCase()
    const type = (file.type || '').toLowerCase()
    const ok = patterns.some((p) => (p.startsWith('.') ? name.endsWith(p) : type === p))
    if (!ok) return 'That file type isn’t supported.'
  }
  return null
}

/**
 * `POST /api/files` (multipart) → `{ url }`.
 *
 * @param {File} file
 * @param {string} purpose — one of FILE_PURPOSES; decides the storage prefix
 * @param {(percent: number) => void} [onProgress]
 * @returns {Promise<string>} the stored file's URL
 */
export async function uploadFile(file, purpose, onProgress) {
  const form = new FormData()
  form.append('file', file)
  form.append('purpose', purpose)

  const { data } = await api.post('/api/files', form, {
    // Let the browser set Content-Type so it can add the multipart boundary.
    onUploadProgress: (event) => {
      if (!onProgress || !event.total) return
      onProgress(Math.round((event.loaded / event.total) * 100))
    },
  })
  return data.url
}

/**
 * True when the failure is "this endpoint doesn't exist yet" rather than a real upload error.
 * The upload endpoint is not built yet, so this keeps the UI honest instead of showing a
 * generic failure — users can still paste a link in the meantime.
 */
export function isUploadUnavailable(error) {
  const status = error?.response?.status
  return status === 404 || status === 501
}

/** Best-effort display name for a stored URL, for showing an existing attachment. */
export function filenameFromUrl(url) {
  if (!url) return ''
  try {
    const path = new URL(url, window.location.origin).pathname
    return decodeURIComponent(path.split('/').filter(Boolean).pop() || url)
  } catch {
    return url
  }
}
