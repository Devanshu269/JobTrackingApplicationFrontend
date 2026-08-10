import { useState, useEffect } from 'react'
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
 * Opens a file URL, resolving `/api/files/{id}` references to a signed download URL first.
 *
 * Avatars and legacy pasted `https://` links pass through untouched.
 * Document refs (`/api/files/3`) are exchanged via `GET` for a `downloadUrl` that's valid
 * for 5 minutes. Both shapes coexist because older stored values are plain URLs people pasted
 * before upload existed.
 *
 * **Resolve on click, never on render.** The signed URL expires in 5 minutes, so resolving a
 * list upfront produces links that are dead before anyone clicks them.
 *
 * @param {string} url — the stored value from a job or user record
 * @returns {Promise<string>} a URL the browser can open directly
 */
export async function resolveFileUrl(url) {
  if (!url?.startsWith('/api/files/')) return url
  const { data } = await api.get(url)
  return data.downloadUrl
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

/** 
 * Resolves a file URL and downloads it using fetch + object URL to force the 
 * correct filename, bypassing cross-origin restrictions on the <a> download attribute.
 */
export async function openFile(url, fallbackName = 'download') {
  if (!url) return
  let finalUrl = url
  let filename = fallbackName

  if (url.startsWith('/api/files/')) {
    try {
      const { data } = await api.get(url)
      finalUrl = data.downloadUrl
      filename = data.filename || fallbackName
    } catch {
      window.open(url, '_blank', 'noopener,noreferrer')
      return
    }
  } else {
    filename = filenameFromUrl(url) || fallbackName
  }

  try {
    const res = await fetch(finalUrl)
    if (!res.ok) throw new Error('Fetch failed')
    const blob = await res.blob()
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(a.href)
  } catch {
    window.open(finalUrl, '_blank', 'noopener,noreferrer')
  }
}

/**
 * React hook to fetch and cache the actual filename from the server for a given file URL.
 * Falls back to the URL's trailing segment if not available.
 */
export function useResolvedFilename(url, fallbackName = 'File') {
  const [filename, setFilename] = useState(() => filenameFromUrl(url) || fallbackName)

  useEffect(() => {
    let cancelled = false
    if (!url?.startsWith('/api/files/')) {
      setFilename(filenameFromUrl(url) || fallbackName)
      return
    }

    api.get(url)
      .then(({ data }) => {
        if (!cancelled && data.filename) {
          setFilename(data.filename)
        }
      })
      .catch(() => {
        // Leave the fallback intact if the fetch fails
      })

    return () => { cancelled = true }
  }, [url, fallbackName])

  return filename
}
