import { Link } from 'react-router-dom'
import { Navbar } from '../components/Navbar'
import { Reveal } from '../components/ui/Reveal'
import { Logo } from '../components/ui/Logo'
import {
  KanbanIllustration,
  RemindersIllustration,
  AnalyticsIllustration,
  DocumentsIllustration,
} from '../components/ui/illustrations'

// Placeholder marketing copy — swap for the real thing before launch.
const FEATURES = [
  {
    id: 'pipeline',
    eyebrow: 'Pipeline',
    title: 'Every application, one board',
    description:
      'Drag roles from Applied to Interviewing to Offer. No more hunting through your inbox to remember where you left off with a company.',
    points: ['Custom stages', 'Drag to update', 'Archive without deleting'],
    Illustration: KanbanIllustration,
  },
  {
    id: 'reminders',
    eyebrow: 'Reminders',
    title: 'Never miss a follow-up',
    description:
      'Job Juggler nudges you when a thread goes quiet, so the polite check-in that lands the interview actually gets sent.',
    points: ['Automatic nudges', 'Interview countdowns', 'Snooze anything'],
    Illustration: RemindersIllustration,
  },
  {
    id: 'insights',
    eyebrow: 'Insights',
    title: 'See what is actually working',
    description:
      'Response rates by role, company and source. Find out which applications convert before you send another fifty.',
    points: ['Response rates', 'Source breakdown', 'Stage conversion'],
    Illustration: AnalyticsIllustration,
  },
  {
    id: 'documents',
    eyebrow: 'Documents',
    title: 'The right resume, every time',
    description:
      'Attach the exact resume and cover letter you sent to each role, so you always know which version got the callback.',
    points: ['Version per role', 'Quick preview', 'Reuse in one click'],
    Illustration: DocumentsIllustration,
  },
]

const STEPS = [
  {
    n: '01',
    title: 'Add a role',
    body: 'Paste a job link or fill in the company and title. Job Juggler creates the card and starts the clock.',
  },
  {
    n: '02',
    title: 'Move it along',
    body: 'Update the stage as you hear back. Every status change is timestamped so nothing gets fuzzy.',
  },
  {
    n: '03',
    title: 'Act on the nudge',
    body: 'When a thread goes quiet, follow up from the reminder. When an offer lands, compare it side by side.',
  },
]

// Nothing here is built yet — the section says so rather than implying otherwise.
const INTEGRATIONS = [
  { name: 'Gemini AI', blurb: 'Tailor resumes, draft cover letters, and practice for interviews.' },
  { name: 'Gmail', blurb: 'Pull application confirmations straight from your inbox.' },
  { name: 'Google Calendar', blurb: 'Interviews land on your calendar automatically.' },
  { name: 'LinkedIn', blurb: 'Import a role from a job post in one click.' },
  { name: 'Notion', blurb: 'Mirror your pipeline into an existing workspace.' },
  { name: 'Slack', blurb: 'Get follow-up nudges where you already work.' },
  { name: 'Greenhouse', blurb: 'Track status updates from company ATS emails.' },
]

function SectionHeading({ eyebrow, title, children }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <span className="inline-block rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium uppercase tracking-wider text-primary-hover">
        {eyebrow}
      </span>
      <h2 className="mt-4 text-3xl font-semibold tracking-tight text-text sm:text-4xl">{title}</h2>
      {children && <p className="mt-4 text-text-muted">{children}</p>}
    </div>
  )
}

export default function ExplorePage() {
  return (
    <div className="min-h-svh bg-bg">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden px-5 py-24 sm:px-8 sm:py-32">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-0 h-[28rem] w-[28rem] -translate-x-1/2 animate-drift rounded-full bg-primary/20 blur-[130px]"
        />
        <div className="relative mx-auto max-w-3xl text-center">
          <h1 className="animate-fade-in-up text-4xl font-semibold tracking-tight text-text sm:text-5xl">
            Stop juggling your job hunt in{' '}
            <span className="text-primary">twelve browser tabs</span>
          </h1>
          <p
            className="animate-fade-in-up mx-auto mt-6 max-w-xl text-lg leading-relaxed text-text-muted"
            style={{ animationDelay: '120ms' }}
          >
            Job Juggler keeps every application, follow-up and offer in one place — so you always
            know what to do next.
          </p>
          <div
            className="animate-fade-in-up mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row"
            style={{ animationDelay: '240ms' }}
          >
            <Link
              to="/login"
              state={{ mode: 'signup' }}
              className="w-full rounded-md bg-primary px-6 py-3 font-medium text-on-primary transition-all duration-300 hover:-translate-y-0.5 hover:bg-primary-hover hover:shadow-lg hover:shadow-primary/25 sm:w-auto"
            >
              Create a free account
            </Link>
            <a
              href="#features"
              className="w-full rounded-md border border-border bg-surface-alt px-6 py-3 font-medium text-text transition-all duration-300 hover:-translate-y-0.5 hover:border-text-muted/50 sm:w-auto"
            >
              See how it works
            </a>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="scroll-mt-20 border-t border-border/70 px-5 py-24 sm:px-8">
        <Reveal>
          <SectionHeading eyebrow="Features" title="Built for the messy middle of a job search">
            The part nobody designs for: forty open applications, half of them stale, and no idea
            which one needs you today.
          </SectionHeading>
        </Reveal>

        <div className="mx-auto mt-20 flex max-w-5xl flex-col gap-24">
          {FEATURES.map((feature, i) => {
            const { Illustration } = feature
            const flip = i % 2 === 1
            return (
              <Reveal key={feature.id}>
                <div className="grid items-center gap-12 lg:grid-cols-2">
                  <div className={flip ? 'lg:order-2' : ''}>
                    <span className="text-xs font-medium uppercase tracking-wider text-primary-hover">
                      {feature.eyebrow}
                    </span>
                    <h3 className="mt-3 text-2xl font-semibold tracking-tight text-text">
                      {feature.title}
                    </h3>
                    <p className="mt-3 leading-relaxed text-text-muted">{feature.description}</p>
                    <ul className="mt-6 flex flex-col gap-2.5">
                      {feature.points.map((point) => (
                        <li key={point} className="flex items-center gap-3 text-sm text-text">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/15">
                            <svg viewBox="0 0 12 12" className="h-3 w-3" aria-hidden="true">
                              <path
                                d="M2.5 6.2l2.4 2.4L9.5 4"
                                fill="none"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="stroke-accent"
                              />
                            </svg>
                          </span>
                          {point}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className={`flex justify-center ${flip ? 'lg:order-1' : ''}`}>
                    <Illustration />
                  </div>
                </div>
              </Reveal>
            )
          })}
        </div>
      </section>

      {/* How it works */}
      <section
        id="how-it-works"
        className="scroll-mt-20 border-t border-border/70 bg-surface/30 px-5 py-24 sm:px-8"
      >
        <Reveal>
          <SectionHeading eyebrow="How it works" title="Three steps, then it stays out of your way">
            No setup weekend, no template to configure. Add the first role and you are running.
          </SectionHeading>
        </Reveal>

        <div className="mx-auto mt-16 grid max-w-5xl gap-6 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <Reveal key={step.n} delay={i * 120}>
              <div className="group h-full rounded-lg border border-border bg-surface p-7 transition-all duration-300 hover:-translate-y-1 hover:border-primary/40">
                <span className="text-sm font-semibold text-primary">{step.n}</span>
                <h3 className="mt-3 text-lg font-semibold text-text">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-text-muted">{step.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Integrations */}
      <section
        id="integrations"
        className="scroll-mt-20 border-t border-border/70 px-5 py-24 sm:px-8"
      >
        <Reveal>
          <SectionHeading eyebrow="Integrations" title="Planned integrations">
            None of these are live yet — this is the roadmap we are building toward. Job Juggler
            works on its own today.
          </SectionHeading>
        </Reveal>

        <div className="mx-auto mt-16 grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {INTEGRATIONS.map((integration, i) => (
            <Reveal key={integration.name} delay={(i % 3) * 100}>
              <div className="group flex h-full items-start gap-4 rounded-lg border border-border bg-surface p-5 transition-all duration-300 hover:-translate-y-1 hover:border-accent/40">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-surface-alt text-sm font-semibold text-text-muted transition-colors duration-300 group-hover:text-accent">
                  {integration.name.charAt(0)}
                </span>
                <div>
                  <h3 className="flex items-center gap-2 font-medium text-text">
                    {integration.name}
                    <span className="rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-wide text-text-muted">
                      Planned
                    </span>
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-text-muted">
                    {integration.blurb}
                  </p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Closing CTA */}
      <section className="border-t border-border/70 px-5 py-24 sm:px-8">
        <Reveal>
          <div className="relative mx-auto max-w-3xl overflow-hidden rounded-xl border border-border bg-surface p-12 text-center">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-20 left-1/2 h-64 w-64 -translate-x-1/2 animate-drift rounded-full bg-primary/20 blur-[100px]"
            />
            <div className="relative">
              <h2 className="text-3xl font-semibold tracking-tight text-text">
                Ready to get organised?
              </h2>
              <p className="mx-auto mt-3 max-w-md text-text-muted">
                Create an account and add your first role in under a minute.
              </p>
              <Link
                to="/login"
                state={{ mode: 'signup' }}
                className="mt-8 inline-block rounded-md bg-primary px-6 py-3 font-medium text-on-primary transition-all duration-300 hover:-translate-y-0.5 hover:bg-primary-hover hover:shadow-lg hover:shadow-primary/25"
              >
                Create a free account
              </Link>
            </div>
          </div>
        </Reveal>
      </section>

      <footer className="border-t border-border/70 px-5 py-10 sm:px-8">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 sm:flex-row">
          <Logo markClassName="h-8 w-8" />
          <p className="text-sm text-text-muted">
            © {new Date().getFullYear()} Job Juggler. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
