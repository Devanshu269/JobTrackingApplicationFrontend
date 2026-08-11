/**
 * Validated build-time configuration.
 *
 * `import.meta.env` is inlined by Vite at build time, so a missing variable is a *deploy*
 * mistake that can't be corrected at runtime. Read unchecked, an absent VITE_API_BASE_URL
 * leaves axios with `baseURL: undefined`, which silently resolves every call against the
 * static host — the app looks up while every request 404s with the hosting provider's HTML
 * body instead of an API error.
 *
 * This deliberately reports rather than throws. A throw here happens during module
 * evaluation, before React mounts, so ErrorBoundary can't catch it and the user gets a
 * blank page. `main.jsx` reads `configError` and paints something readable instead.
 */
function read(name) {
  const value = import.meta.env[name]
  if (typeof value !== 'string' || value.trim() === '') return null
  // Trailing slashes would double up against the leading slash on every request path.
  return value.trim().replace(/\/+$/, '')
}

/** Base URL of the Spring backend, e.g. `http://localhost:8080/jobTracking`. */
export const API_BASE_URL = read('VITE_API_BASE_URL') ?? ''

/** A human-readable description of what's misconfigured, or null when the build is sound. */
export const configError = API_BASE_URL
  ? null
  : 'VITE_API_BASE_URL is not set. Add it to .env for local development, or to the ' +
    'hosting provider’s environment variables and redeploy (see .env.example).'
