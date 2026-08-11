# Job Juggler — Frontend

React frontend for the Job Tracking application. Talks to the Spring Boot backend
(`JobTrackingApplicationBackend`) documented in [BACKEND_INTEGRATION.md](BACKEND_INTEGRATION.md).

**Stack:** Vite 8 · React 19 (JavaScript, *not* TypeScript) · React Router 7 · axios · Tailwind CSS v4 · oxlint

---

## Quickstart

```bash
npm install
cp .env.example .env      # already points at the local backend
npm run dev               # must land on port 5173
```

The backend's CORS and OAuth2 redirect config is hard-wired to `http://localhost:5173`.
If that port is taken, Vite silently starts on 5174 and **both OAuth2 login and CORS
break** — always check the port Vite prints.

| Script | What it does |
|---|---|
| `npm run dev` | Dev server with HMR |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Serve the production build |
| `npm run lint` | oxlint |

### Environment

| Variable | Value |
|---|---|
| `VITE_API_BASE_URL` | `http://localhost:8080/jobTracking` |

---

## Routes

| Path | Guard | Purpose |
|---|---|---|
| `/` | — | Redirects to the dashboard or `/login` based on session |
| `/login` | public-only | Login **and** signup (one page, toggled) |
| `/explore` | public | Marketing page — Features / How it works / Integrations as anchor sections |
| `/forgot-password` | public | Requests a reset email |
| `/reset-password` | public | Landing page for the reset email link (`?token=`) |
| `/oauth2/redirect` | public | Google/GitHub handoff — exchanges `?code=` for tokens |
| `/JobJuggler` | protected | App shell (sidebar + top bar); redirects to `dashboard` |
| `/JobJuggler/dashboard` | protected | Stat tiles, mini pipeline, upcoming interviews, recent activity |
| `/JobJuggler/applications` | protected | Kanban / table of every application. Accepts `?q=` from the top-bar search |
| `/JobJuggler/applications/:jobId` | protected | One application plus its interview rounds |
| `/JobJuggler/analytics` | protected | Funnel, status donut, weekly trend |
| `/JobJuggler/activity` | protected | Paginated audit log from `GET /api/activity` |
| `/JobJuggler/settings` | protected | Profile, password, notification preferences, default resume |
| `/dashboard` | — | Legacy redirect → `/JobJuggler/dashboard` |
| `*` | — | 404 page |

The table lives in [src/routes/AppRoutes.jsx](src/routes/AppRoutes.jsx); guards are in
[src/routes/RouteGuards.jsx](src/routes/RouteGuards.jsx).
The intended flow, in the user's words: **no session → `/login`; valid refresh token → main page.**

---

## Project structure

Layered, not feature-sliced: a folder answers *what kind of thing is this*, so the
one-file-per-route `pages/` tree stays the map of the app.

```
src/
├─ main.jsx                    mounts <App />
├─ app/
│  ├─ App.jsx                  composition root — boundary → router → auth
│  ├─ ErrorBoundary.jsx        unexpected-crash fallback, wraps everything
│  └─ ConfigError.jsx          shown instead of the app on a bad build (see config/)
├─ config/env.js               validates VITE_* at startup, reports misconfiguration
├─ routes/
│  ├─ AppRoutes.jsx            the route table; every page is lazyRoute()
│  ├─ lazyRoute.js             lazy() that reloads once when a chunk 404s after a deploy
│  ├─ RouteGuards.jsx          ProtectedRoute / PublicOnlyRoute / RootRedirect
│  └─ ScrollToHash.jsx         anchor scrolling on the marketing page
├─ layouts/
│  ├─ AppShell.jsx             sidebar + topbar chrome for /JobJuggler/*
│  ├─ AuthLayout.jsx           centred card for login / reset / OAuth pages
│  └─ MarketingNav.jsx         public top nav (explore + login)
├─ pages/                      one file per route, default-exported
├─ components/
│  ├─ ui/                      Button, TextField, Modal, Form, Alert, Spinner, …
│  ├─ jobs/                    JobTable, KanbanBoard, JobFormModal, RoundFormModal
│  ├─ files/                   FileDropZone, DefaultResumeEditor
│  ├─ notifications/           NotificationBell
│  └─ marketing/               ApertureLens, FeatureShowcase, illustrations
├─ api/
│  ├─ client.js                axios instance, bearer header, refresh-on-401
│  ├─ jobs.js                  jobs + rounds + activity + stats
│  ├─ files.js                 upload / resolve / download
│  └─ user.js                  profile, password, preferences
├─ context/AuthContext.jsx     session state, login/signup/logout, /me bootstrap
├─ hooks/                      cross-cutting React hooks
├─ constants/jobs.js           status / type / priority / round enums as UI config
├─ utils/                      dates, validation, activity, tokenStorage
└─ styles/index.css            design tokens + keyframes (single source of truth)
```

Two rules keep this from drifting:

**Imports are absolute via `@/`** — `@/api/client`, never `../../lib/api`. The alias is
declared in [vite.config.js](vite.config.js) for the bundler and [jsconfig.json](jsconfig.json)
for the editor; change one and you must change the other.

**`api/` must not export React.** Anything with a hook in it belongs in `hooks/` — that's why
[useResolvedFilename.js](src/hooks/useResolvedFilename.js) lives outside `api/files.js`.

Every route is code-split in [src/routes/AppRoutes.jsx](src/routes/AppRoutes.jsx), so a visitor
landing on `/explore` never downloads the dashboard. Adding a page means adding one `lazy()`
line there, not an import at the top of `App.jsx`.

---

## Design system

Everything visual is driven by tokens in [src/styles/index.css](src/styles/index.css). Change a token
there, not a hex value in a component.

**Palette — "iridescent":** near-black with a violet cast (`--color-bg: #08080f`), brand
expressed as a **gradient** (`--brand-from` violet → `--brand-mid` indigo → `--brand-to` cyan)
rather than a flat colour. `.bg-brand` applies it. `--color-primary` is the solid fallback
for borders, rings and small marks where a gradient would be invisible.

This palette was chosen after rendering side-by-side comparisons of crimson, sapphire and
obsidian+gold. The objective test was the aperture lens **at its real 72px laptop size** —
gold, copper and bone all failed to read at that size against the dark background.

### The aperture lens

[src/components/marketing/ApertureLens.jsx](src/components/marketing/ApertureLens.jsx) is the interactive entity
above the Login/Sign up toggle. Six iris blades over a pupil that tracks the pointer.

| State | Trigger | Look |
|---|---|---|
| `idle` | nothing focused | open, pupil follows the mouse |
| `active` | a field has focus | tick ring fills as you type |
| `valid` | email passes format check | pupil + rim go **green** |
| `invalid` | email malformed | pupil + rim go **red** |
| `closed` | password focused | blades slam shut, shockwave fires |
| `ajar` | password revealed | blades reopen partway |

Four things in here are load-bearing and easy to break — each is commented at the site:

1. **Never key the blade `<g>` on state.** A changed key remounts the subtree, so blades
   render at their final position with nothing to transition from and the close animation
   silently stops playing.
2. **The pupil is not hidden when shut.** The blades physically occlude it — that *is* the
   animation. Setting `opacity: 0` makes it vanish instead.
3. **Blades are fill-only; seams are separate elements.** Stroking the blade outlines meant
   later blades painted over earlier ones and one seam always disappeared.
4. **`APOTHEM.closed` is 7, not 0.** At 0 all six leading edges pass through the centre and
   collapse into three overlapping diameters. The hub circle caps the remaining hole.

### Responsive

Targets phone → 13" MacBook Air → 27"/32" monitor, with **no scrolling on the login page**
at any of them. Two custom breakpoints, both with a comment explaining a Tailwind v4 trap:

- `short` — `max-height: 760px`, compresses the auth panel on short laptops.
- `wide` (120rem) / `ultra` (150rem) — large monitors. Two gotchas found the hard way:
  Tailwind **skips custom breakpoint names beginning with a digit** (so not `3xl`/`4xl`),
  and it emits px breakpoints *before* the rem-based defaults, so a px value would lose to
  `lg:` on source order. Declare them in rem.

---

## Status

Working (Fully Integrated with Spring Boot backend): 
- Routing, guards, session bootstrap, token rotation (refresh-on-401).
- Complete Auth flow: signup, login, forgot/reset password, OAuth2 handoff.
- Dashboard with live statistical trends and paginated Activity feed.
- Job tracking table with zero-indexed pagination.
- Kanban drag-and-drop board (using lightweight `PATCH`).
- Job Details page with Interview Round scheduling.
- Real-time Notification Bell for upcoming job follow-ups.
- File uploads directly to AWS S3 / Cloudinary with secure signed URL resolution for downloads.
- User Settings page for managing notification preferences and default resumes.

Caveats:
- The password rules in [src/utils/validation.js:17](src/utils/validation.js#L17) are a client-side mirroring of the backend. They must stay in sync with the Java `AuthService` constraints.
- `design-preview/` is a gitignored scratch folder from the original UI palette comparisons and is safe to delete.

---

## Picking this up in a new Claude session

This project was built conversationally. A fresh session (Claude Desktop, a new terminal,
whatever) has none of that history, so **this file plus BACKEND_INTEGRATION.md are the
handoff**. Point Claude at both and it has the contract, the decisions, and the traps.

A paste-ready opener:

> I'm working on the Job Juggler frontend at
> `~/Documents/GitHub/JobTrackingApplication/JobTrackingApplicationFrontend`.
> Read `README.md` and `BACKEND_INTEGRATION.md` first — they cover the stack, the backend
> contract, the design tokens, and the decisions already locked in. Then <your task>.

### Decisions already made — don't re-litigate these

| Decision | Why |
|---|---|
| JavaScript, not TypeScript | User's explicit choice |
| Tailwind v4 via `@tailwindcss/vite` | No `tailwind.config.js` — config lives in the `@theme` block in `index.css` |
| Iridescent palette (violet→cyan on near-black) | Picked from rendered comparisons; black/red, crimson, sapphire and obsidian+gold were all tried and rejected |
| The logo is the three-balls-plus-arc mark | User rejected a redesign: *"I liked the previous Icon better."* `public/favicon.svg` and `LogoMark` in `src/components/ui/Logo.jsx` are a **synced pair** — change both or neither |
| Aperture lens as the mascot | A polar bear was rejected as *"not to the test of IT or tech professional"*; a camera aperture and a watch movement were also tried |
| Login and signup share one page | Toggled, not separate routes |
| Features/How it works/Integrations → one `/explore` page | Anchor sections, not separate routes |
| Email validation is a **format** check | Not a provider allowlist — that would reject work addresses |
| OAuth2 buttons are `<a>` / `ButtonLink`, never `<button>` | They're full-page navigations; a `<button>` inside an `<a>` is invalid HTML and navigates unreliably |
| `/api/auth/me` **may** trigger a refresh | See the `NO_REFRESH_PATHS` allowlist in `api/client.js` — a blanket skip on `/api/auth/*` would break the "valid refresh token → main page" flow |

### Verifying UI changes

Screenshots lie about animation. Read **live computed transforms** out of the DOM and sample
per-`requestAnimationFrame`. An earlier test screenshotted between samples; the screenshot
took longer than the sample interval, which made a perfectly good animation look like an
instant jump.
