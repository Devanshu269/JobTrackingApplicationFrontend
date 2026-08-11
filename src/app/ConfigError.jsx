/**
 * Shown instead of the app when a required build-time variable is missing.
 *
 * Deliberately plain: it must render correctly even though the thing that's broken is the
 * configuration, so it depends on nothing but the stylesheet.
 */
export function ConfigError({ message }) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 bg-bg px-4 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-danger/10 text-2xl text-danger">
        !
      </div>
      <h1 className="text-xl font-semibold text-text">This build is misconfigured</h1>
      <p className="max-w-md text-sm text-text-muted">{message}</p>
    </div>
  )
}
