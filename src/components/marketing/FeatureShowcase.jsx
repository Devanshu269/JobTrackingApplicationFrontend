import { useEffect, useState } from 'react'
import {
  KanbanIllustration,
  RemindersIllustration,
  AnalyticsIllustration,
  DocumentsIllustration,
} from '@/components/marketing/Illustrations'

const SLIDE_MS = 7000

// Placeholder copy — replace once the real feature set is nailed down.
const SLIDES = [
  {
    id: 'pipeline',
    eyebrow: 'Pipeline',
    title: 'Every application, one board',
    description:
      'Drag roles from Applied to Interviewing to Offer. No more hunting through your inbox to remember where you left off.',
    Illustration: KanbanIllustration,
  },
  {
    id: 'reminders',
    eyebrow: 'Reminders',
    title: 'Never miss a follow-up',
    description:
      'Job Juggler nudges you when a thread goes quiet, so the polite check-in that lands the interview actually gets sent.',
    Illustration: RemindersIllustration,
  },
  {
    id: 'insights',
    eyebrow: 'Insights',
    title: 'See what is actually working',
    description:
      'Response rates by role, company and source. Find out which applications convert before you send another fifty.',
    Illustration: AnalyticsIllustration,
  },
  {
    id: 'documents',
    eyebrow: 'Documents',
    title: 'The right resume, every time',
    description:
      'Attach the exact resume and cover letter you sent to each role, so you always know which version got the callback.',
    Illustration: DocumentsIllustration,
  },
]

const COUNT = SLIDES.length
const STEP = 360 / COUNT

/**
 * Cards mounted on the faces of a carousel that rotates in 3D. The stage spins
 * by one step every SLIDE_MS; hovering holds it so the copy can be read.
 */
export function FeatureShowcase() {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (paused) return
    const timer = setTimeout(() => setIndex((i) => i + 1), SLIDE_MS)
    return () => clearTimeout(timer)
  }, [index, paused])

  // index grows without wrapping so the ring always turns the same direction.
  const active = ((index % COUNT) + COUNT) % COUNT

  return (
    <section
      className="group relative hidden shrink-0 select-none overflow-hidden lg:flex lg:flex-col lg:items-center lg:justify-center"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-roledescription="carousel"
      aria-label="Product features"
    >
      {/* The page canvas supplies the ambient glow — no panel background here,
          so the two columns read as one surface rather than two cards. */}
      <div
        className="relative h-[27rem] w-[21rem] short:h-[23rem] short:w-[19rem] wide:h-[38rem] wide:w-[31rem] ultra:h-[44rem] ultra:w-[36rem]"
        style={{ perspective: '1600px' }}
      >
        <div
          className="relative h-full w-full transition-transform duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{
            transformStyle: 'preserve-3d',
            transform: `translateZ(-24rem) rotateY(${-index * STEP}deg)`,
          }}
        >
          {SLIDES.map((slide, i) => {
            const { Illustration } = slide
            const isActive = i === active
            return (
              <article
                key={slide.id}
                aria-hidden={!isActive}
                className="absolute inset-0 rounded-2xl border border-border bg-surface/80 p-6 shadow-2xl shadow-black/60 backdrop-blur-sm transition-all duration-[900ms] wide:p-8"
                style={{
                  transform: `rotateY(${i * STEP}deg) translateZ(24rem)`,
                  backfaceVisibility: 'hidden',
                  opacity: isActive ? 1 : 0.25,
                  filter: isActive ? 'none' : 'blur(2px)',
                  borderColor: isActive ? 'var(--color-primary)' : undefined,
                  boxShadow: isActive
                    ? '0 30px 60px -20px rgba(0,0,0,0.8), 0 0 0 1px rgba(232,200,121,0.16)'
                    : undefined,
                }}
              >
                <div className="flex h-full flex-col items-center justify-center gap-6 text-center">
                  <Illustration />
                  <div>
                    <span className="inline-block rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-primary wide:text-xs">
                      {slide.eyebrow}
                    </span>
                    <h2 className="mt-3 text-xl font-semibold tracking-tight text-text wide:text-3xl ultra:text-4xl">
                      {slide.title}
                    </h2>
                    <p className="mt-2 text-[13px] leading-relaxed text-text-muted wide:text-base ultra:text-lg">
                      {slide.description}
                    </p>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      </div>

      <div className="relative mt-8 w-[21rem] wide:mt-10 wide:w-[31rem] ultra:w-[36rem]">
        {/* progress bars double as slide selectors */}
        <div className="flex items-center gap-2.5">
          {SLIDES.map((s, i) => (
            <button
              key={s.id}
              type="button"
              // step forward to the nearest rotation of the chosen face
              onClick={() => setIndex((cur) => cur + ((i - active + COUNT) % COUNT))}
              aria-label={`Show ${s.title}`}
              aria-current={i === active}
              className="h-1.5 flex-1 overflow-hidden rounded-full bg-border transition-colors duration-300 hover:bg-border/70"
            >
              {i === active ? (
                <span
                  key={`${s.id}-${index}`}
                  className="slide-progress block h-full w-full rounded-full bg-primary"
                  style={{ '--slide-duration': `${SLIDE_MS}ms` }}
                />
              ) : (
                <span className="block h-full w-0 rounded-full bg-text-muted/40" />
              )}
            </button>
          ))}
        </div>

        <p className="mt-3 h-4 text-center text-xs text-text-muted/70 transition-opacity duration-300">
          <span className={paused ? 'opacity-100' : 'opacity-0'}>
            Paused — move your cursor away to continue
          </span>
        </p>
      </div>
    </section>
  )
}
