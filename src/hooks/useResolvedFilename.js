import { useState, useEffect } from 'react'
import { api } from '@/api/client'
import { filenameFromUrl } from '@/api/files'

/**
 * Fetches and caches the server-side filename for a stored file URL.
 * Falls back to the URL's trailing segment when the lookup fails or the URL
 * isn't an `/api/files/{id}` reference.
 */
export function useResolvedFilename(url, fallbackName = 'File') {
  const [filename, setFilename] = useState(() => filenameFromUrl(url) || fallbackName)

  useEffect(() => {
    let cancelled = false
    if (!url?.startsWith('/api/files/')) {
      setFilename(filenameFromUrl(url) || fallbackName)
      return
    }

    api
      .get(url)
      .then(({ data }) => {
        if (!cancelled && data.filename) {
          setFilename(data.filename)
        }
      })
      .catch(() => {
        // Leave the fallback intact if the fetch fails
      })

    return () => {
      cancelled = true
    }
  }, [url, fallbackName])

  return filename
}
