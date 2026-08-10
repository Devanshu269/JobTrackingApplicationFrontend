import { useId, useRef, useState } from 'react'
import { openFile, validateFile, useResolvedFilename } from '../../lib/filesApi'

/**
 * Drag-and-drop file picker with a "paste a link instead" fallback.
 *
 * **Deliberately does not upload.** It surfaces a `File` and lets the parent decide when to
 * send it — uploads are deferred until the user saves, so a cancelled form never leaves a
 * stray object in storage. Keeping the upload out of here also means the timing decision
 * lives in one place per form rather than being baked into the widget.
 *
 * Three mutually exclusive states, in priority order:
 *   1. `file`  — a picked file, not yet uploaded
 *   2. `value` — a URL already stored on the record (uploaded earlier, or hand-typed)
 *   3. empty   — the drop target
 *
 * @param {object} props
 * @param {File|null} props.file
 * @param {string} props.value — the currently stored URL
 * @param {(file: File|null) => void} props.onFile
 * @param {(url: string) => void} props.onValue
 * @param {number|null} props.progress — 0..100 while the parent is uploading
 */
export function FileDropZone({
  file,
  value = '',
  onFile,
  onValue,
  accept,
  maxMb,
  disabled = false,
  progress = null,
  error = '',
  emptyHint = 'PDF, DOC or DOCX',
}) {
  const inputId = useId()
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)
  const [localError, setLocalError] = useState('')
  const [linkMode, setLinkMode] = useState(false)

  const resolvedValueName = useResolvedFilename(value, 'File')

  const shownError = error || localError

  function accept_(picked) {
    setLocalError('')
    if (!picked) return
    const problem = validateFile(picked, { maxMb, accept })
    if (problem) {
      setLocalError(problem)
      return
    }
    onFile(picked)
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragging(false)
    if (disabled) return
    accept_(e.dataTransfer.files?.[0] ?? null)
  }

  function clear() {
    setLocalError('')
    onFile(null)
    onValue('')
    if (inputRef.current) inputRef.current.value = ''
  }

  // ---- A file is staged, or something is already stored ----------------------------------
  if (file || value) {
    const isPending = Boolean(file)
    const name = isPending ? file.name : resolvedValueName
    const sizeLabel = isPending ? `${(file.size / 1024 / 1024).toFixed(1)} MB` : null

    return (
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-surface-alt/40 px-3 py-2.5">
          <span className="text-base" aria-hidden="true">
            {isPending ? '📄' : '🔗'}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-text">{name}</p>
            <p className="text-[11px] text-text-muted">
              {progress !== null
                ? `Uploading… ${progress}%`
                : isPending
                  ? `${sizeLabel} · uploads when you save`
                  : 'Saved'}
            </p>
            {progress !== null && (
              <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-border/60">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-200"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}
          </div>
          {!isPending && value && (
            <button
              type="button"
              onClick={async () => {
                await openFile(value)
              }}
              className="shrink-0 text-[11px] text-primary hover:text-primary-hover"
            >
              Open ↗
            </button>
          )}
          <button
            type="button"
            onClick={clear}
            disabled={disabled || progress !== null}
            className="shrink-0 rounded-md p-1 text-text-muted transition-colors hover:bg-surface-alt hover:text-danger disabled:opacity-40"
            aria-label="Remove file"
          >
            <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              <path d="M4 4l8 8M12 4l-8 8" />
            </svg>
          </button>
        </div>
        {shownError && <p className="text-[11px] text-danger">{shownError}</p>}
      </div>
    )
  }

  // ---- Paste-a-link mode ------------------------------------------------------------------
  if (linkMode) {
    return (
      <div className="flex flex-col gap-1.5">
        <input
          type="url"
          autoFocus
          placeholder="https://…"
          disabled={disabled}
          onChange={(e) => onValue(e.target.value)}
          onBlur={(e) => {
            if (!e.target.value.trim()) setLinkMode(false)
          }}
          className="w-full rounded-lg border border-border/60 bg-surface-alt/50 px-3 py-2 text-sm text-text placeholder:text-text-muted/50 transition-all duration-200 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/25"
        />
        <button
          type="button"
          onClick={() => setLinkMode(false)}
          className="self-start text-[11px] text-text-muted underline-offset-2 hover:text-text hover:underline"
        >
          ← Upload a file instead
        </button>
        {shownError && <p className="text-[11px] text-danger">{shownError}</p>}
      </div>
    )
  }

  // ---- Empty drop target ------------------------------------------------------------------
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={inputId}
        onDragOver={(e) => {
          e.preventDefault()
          if (!disabled) setDragging(true)
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget)) setDragging(false)
        }}
        onDrop={handleDrop}
        className={`flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed px-4 py-5 text-center transition-all duration-200 ${
          dragging
            ? 'border-primary/70 bg-primary/5'
            : 'border-border/60 bg-surface-alt/30 hover:border-border hover:bg-surface-alt/50'
        } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
      >
        <svg viewBox="0 0 20 20" className="h-5 w-5 text-text-muted" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 13V3M6.5 6.5L10 3l3.5 3.5" />
          <path d="M3 13v3a1 1 0 001 1h12a1 1 0 001-1v-3" />
        </svg>
        <span className="text-xs font-medium text-text">
          Drop a file or <span className="text-primary">browse</span>
        </span>
        <span className="text-[10px] text-text-muted">
          {emptyHint} · up to {maxMb} MB
        </span>
        <input
          id={inputId}
          ref={inputRef}
          type="file"
          accept={accept}
          disabled={disabled}
          className="sr-only"
          onChange={(e) => accept_(e.target.files?.[0] ?? null)}
        />
      </label>

      <button
        type="button"
        onClick={() => setLinkMode(true)}
        className="self-start text-[11px] text-text-muted underline-offset-2 hover:text-text hover:underline"
      >
        Or paste a link
      </button>

      {shownError && <p className="text-[11px] text-danger">{shownError}</p>}
    </div>
  )
}
