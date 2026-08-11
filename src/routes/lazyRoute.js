import { lazy } from 'react'

const RELOAD_FLAG = 'jt_chunk_reloaded'

/**
 * `lazy()` that survives a deploy.
 *
 * Vite emits content-hashed chunks, so shipping a new build deletes the filenames the
 * currently-open tab is holding. The next route change then fails on a 404'd `import()` —
 * a blank screen or the crash boundary, for a user who did nothing wrong.
 *
 * On that failure the fix is simply to fetch the new index.html, so reload once. The
 * sessionStorage flag stops a genuinely broken chunk from becoming a reload loop: the
 * second consecutive failure is rethrown and handled by the error boundary instead.
 */
export function lazyRoute(importer) {
  return lazy(() =>
    importer()
      .then((module) => {
        sessionStorage.removeItem(RELOAD_FLAG)
        return module
      })
      .catch((error) => {
        if (sessionStorage.getItem(RELOAD_FLAG)) throw error
        sessionStorage.setItem(RELOAD_FLAG, '1')
        window.location.reload()
        // Keep the promise pending so nothing renders while the reload is in flight.
        return new Promise(() => {})
      }),
  )
}
