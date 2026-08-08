import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * React Router does not scroll to #hash targets on navigation. Sections carry a
 * scroll-mt-* class so the sticky navbar does not cover the heading.
 */
export function ScrollToHash() {
  const { pathname, hash } = useLocation()

  useEffect(() => {
    if (!hash) {
      window.scrollTo({ top: 0 })
      return
    }
    // Wait a frame so the target section exists after a route change.
    const raf = requestAnimationFrame(() => {
      document.querySelector(hash)?.scrollIntoView({ behavior: 'smooth' })
    })
    return () => cancelAnimationFrame(raf)
  }, [pathname, hash])

  return null
}
