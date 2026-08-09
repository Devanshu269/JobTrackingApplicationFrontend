# Backend Integration Notes

The contract between this frontend and `JobTrackingApplicationBackend`. The backend must be running locally on port 8080 for any of this to work.

> **Status (2026-08-09).**
> - **Backend:** every endpoint documented here is built and manually exercised against a running server and real MySQL — including cross-user isolation checks with a second account. Behaviour below is verified, not aspirational.
> - **Frontend:** the UI is well along — landing/explore, login/signup, OAuth2 redirect, forgot/reset password, dashboard, applications (table + kanban), analytics, and settings pages all exist. **Auth is wired to the real API; everything else runs on mock data** from `src/data/`.
> - **The remaining work is a data-layer swap, not new UI.** And it isn't a straight substitution — the mock shapes and the API shapes differ in naming, casing, date format, and structure, and three dashboard features have no backend behind them at all. See **[Mock → API migration](#mock--api-migration)**, which is the section to read before touching anything.

## Project setup

The frontend is already scaffolded (Vite + React + JavaScript). To run it:

```bash
npm install
npm run dev
```

Vite's default dev port is **5173**, which matters because the backend's CORS and OAuth2 redirect config is already pointed at `http://localhost:5173`. If port 5173 is already taken by something else on your machine and Vite silently starts on 5174 instead, OAuth2 login and CORS will both break — check the terminal output when you run `npm run dev` to confirm which port it actually picked.

## Base URL

```
http://localhost:8080/jobTracking
```

All API endpoints below are relative to this. It is read from `.env` (copy `.env.example`):
```
VITE_API_BASE_URL=http://localhost:8080/jobTracking
```

## API endpoints

Normal JSON API calls (`fetch`/axios) — attach `Authorization: Bearer <token>` for the ones marked **auth required**:

### Password rules (backend's actual policy — verified against the DTOs)

Every password field in the API — signup, change-password, reset-password — enforces exactly:

- **`@NotBlank`** — cannot be empty or whitespace-only
- **`@Size(min = 4, max = 12)`** — between 4 and 12 characters

**There are no complexity requirements** (no mixed case, digit, or symbol rule) and, importantly, **there is a hard 12-character maximum**. See the [password-rules mismatch](#client-side-password-rules-contradict-the-backend) note at the bottom — the current client-side validation disagrees with this and will let users submit passwords the backend rejects.

### Shared response shapes

**`AuthResponseDto`** — returned by signup, login, oauth/exchange, and refresh:
```json
{
  "token": "eyJhbGciOiJIUzUxMiJ9...",
  "refreshToken": "e06cb6e7-e42c-4167-aadf-5d0b83f28056",
  "userId": 11
}
```
On `POST /api/auth/refresh` only, `refreshToken` comes back **`null`** — the backend does not rotate refresh tokens, so keep using the one you already stored.

**`UserDto`** — returned by `GET /api/auth/me` and every `/api/users/me*` endpoint:
```json
{
  "userId": 11,
  "userFirstName": "Devanshu",
  "userLastName": "Shekhar",
  "email": "someone@example.com",
  "avatarUrl": "https://cdn-icons-png.flaticon.com/512/149/149071.png",
  "defaultResumeUrl": null,
  "provider": "LOCAL"
}
```

### Auth

| Method | URL | Auth | Request body | Success | Response body |
|---|---|---|---|---|---|
| POST | `/api/auth/signup` | no | `{ userFirstName, userLastName, email, password }` | 201 | `AuthResponseDto` |
| POST | `/api/auth/login` | no | `{ email, password }` | 200 | `AuthResponseDto` |
| POST | `/api/auth/oauth/exchange` | no | `{ code }` | 200 | `AuthResponseDto` |
| GET | `/api/auth/me` | **yes** | — | 200 | `UserDto` |
| POST | `/api/auth/change-password` | **yes** | `{ currentPassword, newPassword }` | 204 | *(empty)* |
| POST | `/api/auth/forgot-password` | no | `{ email }` | 200 | *(empty)* |
| POST | `/api/auth/reset-password` | no | `{ token, newPassword }` | 204 | *(empty)* |
| POST | `/api/auth/refresh` | no | `{ refreshToken }` | 200 | `AuthResponseDto` (`refreshToken` is null) |
| POST | `/api/auth/logout` | no | `{ refreshToken }` | 204 | *(empty)* |
| POST | `/api/auth/logout-all` | **yes** | — | 204 | *(empty)* |

#### Worked examples

**Signup** — `POST /api/auth/signup`
```jsonc
// request
{ "userFirstName": "Devanshu", "userLastName": "Shekhar",
  "email": "devanshu@example.com", "password": "Passw0rd!" }

// 201
{ "token": "eyJhbGciOiJIUzUxMiJ9...", "refreshToken": "f548fd3e-892d-4e37-9deb-64dc724139d4", "userId": 11 }

// 409 — email taken
{ "timestamp": "2026-08-09T21:12:24.963858", "status": 409, "message": "Email already exists", "errors": null }

// 400 — validation
{ "timestamp": "...", "status": 400, "message": "Validation failed",
  "errors": { "password": "Password must be between 4 and 12 characters" } }
```

**Login** — `POST /api/auth/login`
```jsonc
// request
{ "email": "devanshu@example.com", "password": "Passw0rd!" }

// 200 → same AuthResponseDto as signup

// 401 — wrong password OR unknown email (identical on purpose)
{ "timestamp": "...", "status": 401, "message": "Invalid email or password", "errors": null }

// 401 — email exists but was registered via OAuth. Show this message verbatim.
{ "timestamp": "...", "status": 401,
  "message": "Invalid authentication provider. Please use GOOGLE to login.", "errors": null }
```

**Refresh** — `POST /api/auth/refresh`
```jsonc
// request
{ "refreshToken": "f548fd3e-892d-4e37-9deb-64dc724139d4" }

// 200 — note refreshToken is null; keep reusing the one you stored
{ "token": "eyJhbGciOiJIUzUxMiJ9...", "refreshToken": null, "userId": 11 }

// 401 — expired, revoked, or unknown → clear tokens and send the user to /login
{ "timestamp": "...", "status": 401, "message": "Invalid or expired refresh token", "errors": null }
```

**Change password** — `POST /api/auth/change-password`
```jsonc
// request (Authorization: Bearer <token>)
{ "currentPassword": "Passw0rd!", "newPassword": "NewPass1!" }

// 204 — empty body

// 401 — wrong current password
{ "timestamp": "...", "status": 401, "message": "Current password is incorrect", "errors": null }

// 401 — OAuth account, no password to change
{ "timestamp": "...", "status": 401,
  "message": "Password change is not available for GOOGLE accounts.", "errors": null }
```

**Forgot / reset password**
```jsonc
// POST /api/auth/forgot-password
{ "email": "devanshu@example.com" }
// → 200 empty body, ALWAYS, registered or not

// POST /api/auth/reset-password  (token comes from the emailed link's ?token=)
{ "token": "7a766d6c-802c-4d51-992e-2c90d0fd53d7", "newPassword": "Reset789!" }
// → 204 empty body

// 401 — invalid, expired (30 min), or already used
{ "timestamp": "...", "status": 401, "message": "Invalid or expired password reset token", "errors": null }
```

Request field details:

- **signup** — `userFirstName`/`userLastName` are each 3–20 chars and required; `email` must be a valid address and unique (409 `"Email already exists"` if not); `password` per the rules above.
- **login** — 401 `"Invalid email or password"` for both a wrong password *and* an unknown email (deliberately indistinguishable). A different 401, `"Invalid authentication provider. Please use GOOGLE to login."`, means the email exists but was registered via OAuth — surface that message, it tells the user what to actually do.
- **change-password** — 401 if `currentPassword` is wrong; 401 if the account isn't `LOCAL`. Only show this UI when `provider === 'LOCAL'`.
- **forgot-password** — **always 200**, whether or not the email is registered. Never infer account existence from the response.
- **reset-password** — `token` comes from the emailed link's query string. 401 if invalid, expired (30 min), or already used. A successful reset also invalidates every existing session for that user.

### Profile

| Method | URL | Auth | Request body | Success | Response body |
|---|---|---|---|---|---|
| PUT | `/api/users/me` | **yes** | `{ firstName?, lastName?, avatarUrl? }` | 200 | `UserDto` |
| PUT | `/api/users/me/default-resume` | **yes** | `{ resumeUrl }` | 200 | `UserDto` |
| DELETE | `/api/users/me/default-resume` | **yes** | — | 200 | `UserDto` |

- **`PUT /api/users/me`** is a genuine **partial update** — send only the fields you're changing; omitted or null fields are left untouched. `firstName`/`lastName` are 3–20 chars *when present*.
- **`PUT /api/users/me/default-resume`** sets the user's reusable default resume. `resumeUrl` is required and non-blank (400 otherwise) — which is why clearing it needs the `DELETE` verb instead of sending an empty string.
- **`DELETE /api/users/me/default-resume`** sets `defaultResumeUrl` back to null and returns the updated `UserDto` (not a 204, so you can refresh your local user state from the response).
- The default resume is just a stored string — use it to prefill `resumeUrl` when creating a new job application. Nothing uploads a file (see [Not built yet](#not-built-yet)).

### Job applications

All scoped to the logged-in user automatically — you never send a userId, and you can only ever see or touch your own rows.

| Method | URL | Auth | Request body | Success | Response body |
|---|---|---|---|---|---|
| GET | `/api/jobs` | **yes** | — (query params below) | 200 | `JobApplicationResponseDto[]`, newest first |
| GET | `/api/jobs/stats` | **yes** | — | 200 | `JobStatsResponseDto` |
| GET | `/api/jobs/{jobId}` | **yes** | — | 200 | `JobApplicationResponseDto` |
| POST | `/api/jobs` | **yes** | job body | 201 | `JobApplicationResponseDto` |
| PUT | `/api/jobs/{jobId}` | **yes** | job body | 200 | `JobApplicationResponseDto` |
| DELETE | `/api/jobs/{jobId}` | **yes** | — | 204 | *(empty)* |

**Request body** (identical for POST and PUT):

| Field | Type | Required | Notes |
|---|---|---|---|
| `companyName` | string | **yes** | max 100 chars |
| `jobRole` | string | **yes** | max 100 chars |
| `status` | Status enum | **yes** | |
| `priority` | Priority enum | no | |
| `jobUrl` | string | no | |
| `location` | string | no | |
| `salaryRange` | string | no | free text, e.g. `"20-25 LPA"` |
| `recruiterName` | string | no | |
| `recruiterEmail` | string | no | must be a valid email **if present** |
| `recruiterPhone` | string | no | |
| `resumeUrl` | string | no | prefill from the user's `defaultResumeUrl` |
| `coverLetterUrl` | string | no | |
| `notes` | string | no | |
| `appliedDate` | ISO date-time | no | `"2026-08-01T10:00:00"` — no timezone/offset, no trailing `Z` |
| `followUpDate` | ISO date-time | no | same format |
| `reminderEnabled` | boolean | no | defaults to `false` if omitted or null |

#### Worked examples

**Create** — `POST /api/jobs` (a real captured exchange)
```jsonc
// request
{
  "companyName": "Acme Corp",
  "jobRole": "Frontend Engineer",
  "status": "APPLIED",
  "priority": "HIGH",
  "location": "Remote",
  "salaryRange": "20-25 LPA",
  "recruiterEmail": "hr@acme.com",
  "notes": "Referred by a friend",
  "appliedDate": "2026-08-01T10:00:00"
}

// 201 — omitted fields come back explicitly null; reminderEnabled defaulted to false
{
  "jobId": 1,
  "companyName": "Acme Corp",
  "jobRole": "Frontend Engineer",
  "status": "APPLIED",
  "priority": "HIGH",
  "jobUrl": null,
  "location": "Remote",
  "salaryRange": "20-25 LPA",
  "recruiterName": null,
  "recruiterEmail": "hr@acme.com",
  "recruiterPhone": null,
  "resumeUrl": null,
  "coverLetterUrl": null,
  "notes": "Referred by a friend",
  "appliedDate": "2026-08-01T10:00:00",
  "followUpDate": null,
  "reminderEnabled": false,
  "createdAt": "2026-08-09T20:57:45.651321",
  "updatedAt": "2026-08-09T20:57:45.651321"
}
```

**List** — `GET /api/jobs?status=INTERVIEW&search=acme`
```jsonc
// 200 — array of the object above, newest first. Empty result is [] , not 404.
[ { "jobId": 2, "companyName": "Globex", ... }, { "jobId": 1, "companyName": "Acme Corp", ... } ]
```

**Stats** — `GET /api/jobs/stats`
```json
{ "total": 2, "byStatus": { "WISHLIST": 1, "APPLIED": 0, "INTERVIEW": 1, "OFFER": 0, "REJECTED": 0 } }
```

**Errors**
```jsonc
// 400 — missing required field
{ "timestamp": "...", "status": 400, "message": "Validation failed",
  "errors": { "companyName": "Company name cannot be blank" } }

// 404 — unknown id, or a job belonging to someone else (indistinguishable, deliberately)
{ "timestamp": "...", "status": 404, "message": "Job application not found", "errors": null }
```

**`PUT` is a full replace, not a patch.** Any field you leave out is written as null. Send the whole object back — typically the untouched result of the `GET`, with your edits applied.

**`JobStatsResponseDto`:**
```json
{
  "total": 2,
  "byStatus": { "WISHLIST": 1, "APPLIED": 0, "INTERVIEW": 1, "OFFER": 0, "REJECTED": 0 }
}
```
All five status keys are always present and zero-filled — no null checks needed.

**List filters** — all optional and combinable:

| Param | Example | Behaviour |
|---|---|---|
| `status` | `?status=APPLIED` | exact match on the Status enum |
| `priority` | `?priority=HIGH` | exact match on the Priority enum |
| `search` | `?search=acme` | case-insensitive substring, matches company name **OR** job role |

e.g. `/api/jobs?status=INTERVIEW&search=acme`. Omitting all three returns everything you own.

### Interview rounds

Nested under a job. Ownership is enforced through the parent job, so a round under someone else's job 404s.

| Method | URL | Auth | Request body | Success | Response body |
|---|---|---|---|---|---|
| GET | `/api/jobs/{jobId}/rounds` | **yes** | — | 200 | `InterviewRoundResponseDto[]`, ordered by `roundNumber` asc |
| GET | `/api/jobs/{jobId}/rounds/{roundId}` | **yes** | — | 200 | `InterviewRoundResponseDto` |
| POST | `/api/jobs/{jobId}/rounds` | **yes** | round body | 201 | `InterviewRoundResponseDto` |
| PUT | `/api/jobs/{jobId}/rounds/{roundId}` | **yes** | round body | 200 | `InterviewRoundResponseDto` |
| DELETE | `/api/jobs/{jobId}/rounds/{roundId}` | **yes** | — | 204 | *(empty)* |

**Request body** (identical for POST and PUT):

| Field | Type | Required | Notes |
|---|---|---|---|
| `roundNumber` | integer | **yes** | minimum 1. Not auto-assigned and not enforced unique — you decide the numbering |
| `roundType` | RoundType enum | **yes** | PascalCase, see enum list |
| `roundDate` | ISO date-time | no | |
| `interviewerName` | string | no | |
| `notes` | string | no | stored as TEXT, long values fine |
| `feedback` | string | no | stored as TEXT |
| `outcome` | Outcome enum | no | |

#### Worked example

**Create** — `POST /api/jobs/1/rounds`
```jsonc
// request
{
  "roundNumber": 1,
  "roundType": "Technical",
  "roundDate": "2026-08-15T14:00:00",
  "interviewerName": "Jane Doe",
  "outcome": "PENDING",
  "notes": "DSA round"
}

// 201
{
  "jobRoundId": 1,
  "jobId": 1,
  "roundNumber": 1,
  "roundType": "Technical",
  "roundDate": "2026-08-15T14:00:00",
  "interviewerName": "Jane Doe",
  "notes": "DSA round",
  "feedback": null,
  "outcome": "PENDING",
  "createdAt": "2026-08-09T20:58:59.092342"
}

// GET /api/jobs/1/rounds → 200, array ordered by roundNumber asc
// 400 — { "errors": { "roundNumber": "Round number must be at least 1" } }
// 404 — round doesn't exist, or the parent job isn't yours
```

Same full-replace caveat as jobs on `PUT`.

### Enum values (exact strings — these go over JSON as-is)

- **Status:** `WISHLIST`, `APPLIED`, `INTERVIEW`, `OFFER`, `REJECTED`
- **Priority:** `HIGH`, `MEDIUM`, `LOW`
- **Outcome:** `ACCEPTED`, `REJECTED`, `PENDING`, `NO_RESPONSE`, `WITHDRAWN`, `OTHER`
- **RoundType:** `Technical`, `HR`, `Managerial`, `Group`, `Coding`, `Behavioral`, `CaseStudy`, `HLD`, `LLD`, `SystemDesign`, `CultureFit`, `Other` — note these are **PascalCase**, unlike the other three enums which are UPPERCASE. Easy to get wrong; sending a value that isn't in this list returns a 400.
- **Provider** (read-only, from `/me`): `LOCAL`, `GOOGLE`, `GITHUB`, `LINKEDIN`

Sending an invalid enum string returns a `400` from Spring's JSON parser, not the usual validation-error shape — so don't assume every 400 has a populated `errors` map.

### Not built yet

- **File upload** — Cloudinary isn't integrated. `resumeUrl`, `coverLetterUrl`, `avatarUrl` and `defaultResumeUrl` are all plain strings you set yourself; nothing accepts a file today.
- **AI features** — the `job_ai_results` table and entity exist, but there are no endpoints and Gemini isn't integrated.
- **Pagination** — `GET /api/jobs` returns every matching row. Fine now, will need `Pageable` once someone has hundreds of applications.
- **`PATCH` semantics** — job and round updates are full-replace only. If you build a kanban board where dragging a card changes just `status`, you'll need to send the entire job object back, or add a real `PATCH` endpoint.

Error responses (4xx) all share this shape:
```json
{ "timestamp": "...", "status": 401, "message": "...", "errors": null }
```
`errors` is a field-name → message map, only populated on 400 validation failures.

**404 vs 403:** asking for a job/round that belongs to another user returns `404`, not `403` — deliberately, so the API never confirms that an id exists. Don't build UI that treats 404 as "definitely deleted".

## OAuth2 login (Google / GitHub) — NOT a fetch call

These two are full-page browser navigations, not API calls — don't `fetch()` them, just navigate/link to them directly:

```
http://localhost:8080/jobTracking/oauth2/authorization/google
http://localhost:8080/jobTracking/oauth2/authorization/github
```

E.g. a plain `<a href="...">Sign in with Google</a>` or `window.location.href = ...`.

## Redirect URLs you must implement as routes

The backend sends the browser back to these two URLs after certain flows complete. Both need to exist as real frontend routes:

### `/oauth2/redirect`
Where the browser lands after Google/GitHub login finishes. Two possible query strings:
- **Success:** `?code=<uuid>` — immediately call `POST /api/auth/oauth/exchange` with `{ code }`, store the returned `token`/`refreshToken`, then redirect to wherever a logged-in user should land (dashboard, etc.). The code is single-use and expires in 60 seconds, so don't delay this call.
- **Failure:** `?error=<url-encoded message>` — show the message (e.g. "Invalid authentication provider. Please use GOOGLE to login." if they tried GitHub on an email that's already linked to a Google account) and route them back to the login page.

### `/reset-password`
Where the "reset your password" email link points. Query string: `?token=<uuid>`.
- Read `token` from the URL, show a new-password + confirm-password form (confirm-password matching is a client-side-only check — the API only takes one `newPassword` value).
- On submit, call `POST /api/auth/reset-password` with `{ token, newPassword }`.
- On 204, redirect to login. On 401, tell them the link is invalid/expired and point them back to a "forgot password" form to request a new one.
- Handle someone landing on this route with **no** `token` in the URL at all (typed the URL directly rather than clicking the email link) — show a message pointing to forgot-password instead of a broken form.

## Pages

### Built and wired to the real API (auth only)

- **Login page** — local email/password form, plus "Sign in with Google"/"Sign in with GitHub" links to the OAuth2 URLs above, plus a "Forgot password?" link to a forgot-password form (`POST /api/auth/forgot-password`). Built as `/login`; signup is the same page, toggled.
- **`/oauth2/redirect`** — as described above, effectively a loading/processing screen, not something a user looks at for long.
- **`/reset-password`** — as described above.
- **Error page / fallback UI** — this is a separate concern from the two redirect routes above. Those two have their own specific, expected error states (bad OAuth2 code, bad reset token) that should show inline, contextual messages — not dump the user onto a generic error page. What's still worth having, separately: a top-level error boundary that catches *unexpected* frontend crashes (a bug, a null reference, something truly unhandled), so the user sees a friendly "something went wrong" screen instead of a blank white page. That's an app-wide concern, not tied to any specific backend redirect — the backend never sends anyone to a URL like `/error`.

### Built on mock data — needs wiring, not building

`DashboardPage`, `ApplicationsPage` (table + kanban), `AnalyticsPage`, `SettingsPage`, plus `JobTable`, `KanbanBoard`, `StatCard`, `StatusBadge`. See [Mock → API migration](#mock--api-migration) for the exact field deltas.

Endpoints these map to:

- **Dashboard** — `GET /api/jobs/stats` for counts, `GET /api/jobs` for a recent list.
- **Applications** — `GET /api/jobs` with `status`/`priority`/`search` wired to the existing filter controls. Already sorted newest-first server-side, so drop any client-side sort.
- **Job detail / edit** — `GET`, `PUT`, `DELETE /api/jobs/{jobId}`.
- **Create job** — `POST /api/jobs`. Prefill `resumeUrl` from `defaultResumeUrl` on `/me` if set.
- **Interview rounds** — `/api/jobs/{jobId}/rounds` on a job detail view. `roundNumber` isn't auto-assigned; the UI picks it (e.g. `rounds.length + 1`).
- **Settings** — `PUT /api/users/me`, change-password, default-resume set/clear, `logout-all`.

**Kanban drag-and-drop caveat:** `PUT` is a full replace, so moving a card can't send just `{ status }` — send the whole job object with `status` changed. Keep the full object from the list response in state so you have it to hand.

## Token storage & attaching to requests

Backend issues a short-lived access token (`token`, 15 min) and a longer-lived `refreshToken` (7 days, not rotated — same refresh token stays valid until it expires or is revoked via logout). Store both client-side (e.g. `localStorage`), attach `token` as `Authorization: Bearer <token>` on every auth-required call, and call `/api/auth/refresh` with the stored `refreshToken` when a request comes back 401 to get a new access token — no need to prompt for re-login until the refresh token itself expires or logout-all is called elsewhere.

---

## Frontend implementation map

Where each part of the contract above actually lives. Useful when the backend changes, or
when a new session needs to find the call site for an endpoint.

| Endpoint / concern | Called from |
|---|---|
| `signup`, `login`, `logout`, `logout-all`, `/me` | [src/context/AuthContext.jsx](src/context/AuthContext.jsx) |
| `refresh` (on 401) | [src/lib/api.js](src/lib/api.js) — response interceptor |
| `oauth/exchange` | `exchangeOAuthCode()` in [src/context/AuthContext.jsx](src/context/AuthContext.jsx), driven by [src/pages/OAuthRedirectPage.jsx](src/pages/OAuthRedirectPage.jsx) |
| `forgot-password` | [src/pages/ForgotPasswordPage.jsx](src/pages/ForgotPasswordPage.jsx) |
| `reset-password` | [src/pages/ResetPasswordPage.jsx](src/pages/ResetPasswordPage.jsx) |
| OAuth2 authorization URLs | [src/pages/LoginPage.jsx](src/pages/LoginPage.jsx), rendered as `ButtonLink` (`<a>`) |
| Bearer header | [src/lib/api.js](src/lib/api.js) — request interceptor |
| Token persistence | [src/lib/tokenStorage.js](src/lib/tokenStorage.js) — `localStorage` |
| Error message extraction | `getApiErrorMessage()` in [src/lib/api.js](src/lib/api.js), reads `data.message` |
| Unexpected-crash fallback | [src/components/ErrorBoundary.jsx](src/components/ErrorBoundary.jsx), wraps the whole router |

### Three implementation details worth knowing before you change any of this

**1. `/api/auth/me` is deliberately allowed to trigger a refresh.**
`lib/api.js` uses a `NO_REFRESH_PATHS` *allowlist* rather than skipping all of `/api/auth/*`.
The unauthenticated endpoints and the token-management calls themselves are excluded (refreshing
on their own 401 would recurse), but `/me` is not — and that is exactly what lets a returning
user with a live refresh token land on the dashboard instead of the login page. A blanket skip
on the `/api/auth/` prefix silently breaks that flow.

**2. Concurrent 401s share one in-flight refresh.**
`refreshPromise` is memoised until it settles, so a burst of parallel requests triggers a single
`POST /api/auth/refresh` instead of stampeding it. Since the backend does not rotate refresh
tokens, only the access token is rewritten on success.

**3. A failed refresh clears tokens but does *not* hard-redirect.**
`window.location = '/login'` would blow away in-flight React state and can loop when the user is
already on a public page. The route guards handle the redirect instead.

## Mock → API migration

The UI is built against `src/data/mockJobs.js`, `mockStats.js` and `mockUser.js`. **The mock shapes are not the API shapes** — swapping the import for a `GET` will not work. Every difference is listed below.

### Job object — field mapping

| Mock (`INITIAL_JOBS`) | API (`JobApplicationResponseDto`) | Action |
|---|---|---|
| `id` | `jobId` | rename |
| `company` | `companyName` | rename |
| `position` | `jobRole` | rename |
| `salary` | `salaryRange` | rename |
| `url` | `jobUrl` | rename |
| `location` | `location` | ✅ unchanged |
| `notes` | `notes` | ✅ unchanged |
| `status: 'interview'` | `status: 'INTERVIEW'` | **case change** — see below |
| `appliedDate: '2026-07-28'` | `appliedDate: '2026-07-28T10:00:00'` | **format change** — see below |
| `companyIcon: '💳'` | — | **no backend field** |
| `type: 'remote' \| 'hybrid' \| 'onsite'` | — | **no backend field** |
| `outcome: 'accepted' \| null` | — | **not on the job** — see below |
| — | `priority` | new: `HIGH`/`MEDIUM`/`LOW`, nullable |
| — | `recruiterName`, `recruiterEmail`, `recruiterPhone` | new, all nullable |
| — | `resumeUrl`, `coverLetterUrl` | new, nullable |
| — | `followUpDate`, `reminderEnabled` | new |
| — | `createdAt`, `updatedAt` | new, server-set |

### The four real problems

**1. Status casing.** `JOB_STATUSES` in `mockJobs.js` is keyed lowercase (`wishlist`, `applied`, …) and `KANBAN_COLUMNS`/`StatusBadge`/`JobTable` all index into it. The API sends `WISHLIST`, `APPLIED`, etc. Rekey `JOB_STATUSES` to the uppercase API values and update `KANBAN_COLUMNS[].statuses` to match — cleaner than translating on every read and write. Those constants are UI config, not mock data, so they should survive the migration; only `INITIAL_JOBS` goes away.

**2. `type` (Remote / Hybrid / On-site) does not exist in the backend.** `JOB_TYPES` is rendered by both `JobTable` and `KanbanBoard`. Three options, and this is a decision to make rather than paper over:
   - Drop the field from the UI (smallest change, loses a genuinely useful filter).
   - Infer it from `location` — fragile, `"Remote (Canada)"` vs `"Remote"` vs `"Austin, TX"`.
   - **Add a `JobType` enum + column to the backend** — the honest fix, ~20 minutes: new enum, field on `JobApplication`, add to the two DTOs and `JobUtils`, restart (new column, so `ddl-auto` handles it).

**3. `outcome` on a job doesn't exist either.** In the mock it's `'accepted' | 'rejected' | null` alongside `status`, which is largely redundant with `status: 'OFFER' | 'REJECTED'`. In the backend, `Outcome` lives on **interview rounds**, not on the job. Recommend dropping it from the job UI and reading per-round outcomes on a job detail page.

**4. Dates.** API fields are `LocalDateTime` — `"2026-08-01T10:00:00"`, no timezone, no trailing `Z`. Mocks use date-only `"2026-07-28"`, and `<input type="date">` produces the same. So:
   - **sending:** `"2026-08-01"` → `"2026-08-01T00:00:00"`
   - **receiving:** `"2026-08-01T10:00:00"` → `.slice(0, 10)` for a date input.
   - Don't `new Date(...)` and re-serialize — that applies the browser's timezone offset and can shift the date by a day.

### Stats — shape change

```js
// mock: flat, lowercase
{ total: 15, wishlist: 4, applied: 4, interview: 3, offer: 2, rejected: 2 }

// API: nested, uppercase
{ total: 2, byStatus: { WISHLIST: 1, APPLIED: 0, INTERVIEW: 1, OFFER: 0, REJECTED: 0 } }
```
All five keys are always present and zero-filled, so tiles can render unconditionally.

### Three dashboard features with NO backend behind them

These are in `mockStats.js` and currently rendered by `DashboardPage`/`AnalyticsPage`. There is no endpoint for any of them:

| Mock export | Status | Realistic path |
|---|---|---|
| `WEEKLY_TREND` | no endpoint | **Derive client-side** from the jobs list — bucket `appliedDate` (or `createdAt`) by day over the last 7 days. No backend work needed. |
| `UPCOMING_INTERVIEWS` | no endpoint | Rounds are only reachable per-job (`/api/jobs/{jobId}/rounds`), so building this client-side means one request per job — an N+1. Either defer the widget, or add a backend endpoint like `GET /api/rounds/upcoming`. |
| `RECENT_ACTIVITY` | **no table, no entity** | A real activity/audit log needs a new backend entity written on every mutation. Sizeable feature — defer it, or drop the widget. |

Don't silently leave these three on mock data once everything around them is live: a dashboard where four tiles are real and three are fiction is worse than one that omits them, because nobody can tell which is which.

### `mockUser` vs `/api/auth/me`

Nearly identical — the real `UserDto` just adds `defaultResumeUrl`. `AppShell`, `DashboardPage` and `SettingsPage` import `MOCK_USER` as a fallback; once `/me` is trusted, delete the fallback rather than keeping it, so a failed load surfaces as an error instead of silently rendering "Alex Johnson".

### Suggested order of work

1. **Verify the existing auth wiring against the live backend first** — signup, login, both OAuth flows, refresh-on-401. It's the one part written but never actually run; finding a broken interceptor after building five data-fetching pages on top of it is a much worse day.
2. Rekey `JOB_STATUSES`/`KANBAN_COLUMNS` to uppercase; decide the `type` and `outcome` questions.
3. Add a `src/lib/jobsApi.js` alongside `lib/api.js` (list/get/create/update/delete/stats) so pages don't hand-roll axios calls.
4. Swap `ApplicationsPage` → real list + filters; then `DashboardPage` stats; then the job create/edit form.
5. Interview rounds on a job detail view.
6. `SettingsPage` → `PUT /api/users/me`, change-password (gate on `provider === 'LOCAL'`), default-resume, `logout-all`.
7. Delete `mockJobs`' `INITIAL_JOBS`, `mockStats`, `mockUser` — keep `JOB_STATUSES`/`KANBAN_COLUMNS`/`JOB_TYPES` if still used as UI config.

### Endpoints still with no UI

`change-password`, `logout-all` (exists as an unused `AuthContext` function), `PUT /api/users/me`, and the default-resume pair. `SettingsPage` exists but runs on `MOCK_USER`. When wiring it: only offer change-password when `provider === 'LOCAL'`, since OAuth accounts have no password.

### Client-side password rules contradict the backend

[src/lib/validation.js:17](src/lib/validation.js#L17) enforces **8+ characters, mixed case, a number and a symbol**. The backend's real policy — verified against the DTOs — is just **4–12 characters, no complexity rules**.

These don't merely differ, they **conflict in a way that breaks real signups**: the client rule has no upper bound, so a user entering a perfectly reasonable 16-character password passes client validation and then gets a `400` from the server, because the backend caps at 12. The error surfaces on a field the form already told them was valid.

Two ways to reconcile, and it's worth deciding deliberately rather than just making the client match:

1. **Relax the client to match the backend** (4–12, no complexity). Quick, removes the conflict, but 12 characters is a genuinely weak ceiling for a password max — there's no security reason to cap length that low, and it blocks passphrases and password managers.
2. **Raise the backend's ceiling** (e.g. `@Size(min = 8, max = 64)`) and keep the stronger client rules, adjusting the min to match. Requires touching `SignupRequestDto`, `ChangePasswordRequestDto`, and `ResetPasswordRequestDto` — all three currently say `min = 4, max = 12`. Note the stored column is a bcrypt hash of fixed length, so a longer max costs nothing in the schema.

Option 2 is the better end state; option 1 is the faster unblock. Either way the two sides must agree before launch.