# Backend Integration Notes

The contract between this frontend and `JobTrackingApplicationBackend`. The backend must be running locally on port 8080 for any of this to work.

> **Status (2026-08-09, updated after the mock → API migration).**
> - **Backend:** every endpoint documented here is built and manually exercised against a running server and real MySQL — including cross-user isolation checks with a second account. Behaviour below is verified, not aspirational.
> - **Frontend: the migration is done. There is no mock data left in the app.** `src/data/mockJobs.js`, `mockStats.js` and `mockUser.js` have been deleted; the UI-config constants that used to live in `mockJobs.js` now live in [src/data/jobConstants.js](src/data/jobConstants.js), rekeyed to the backend's enum values.
> - **Every page reads the live API:** dashboard, applications (table + kanban), job detail with interview rounds, analytics, and settings.
> - Auth was verified end-to-end against the running backend before anything was built on top of it — signup, duplicate-email 409, login, wrong-password 401, `/me`, refresh (including `refreshToken: null`), bad-refresh 401, bogus exchange-code 401, and both OAuth2 authorize redirects. The only untested path is the interactive Google/GitHub consent screen, which needs real credentials in a browser.
>
> See **[What the migration changed](#what-the-migration-changed)** for the field-by-field record and the decisions taken along the way.

## Project setup

The frontend is already scaffolded (Vite + React + JavaScript). To run it:

```bash
npm install
npm run dev
```

Vite's dev port is **5173**, which matters because the backend's CORS and OAuth2 redirect config is pointed at `http://localhost:5173`.

Good news, verified: this project sets `strictPort`, so if 5173 is occupied Vite **fails to start** with `Port 5173 is already in use` rather than silently sliding to 5174 and breaking CORS and OAuth in a way that's confusing to debug. If you see that error, something else is already serving the app — find it rather than starting a second one on another port.

CORS is confirmed working from that origin: a preflight to `/api/jobs` returns `Access-Control-Allow-Origin: http://localhost:5173` with `GET,POST,PUT,DELETE,PATCH,OPTIONS` and the `authorization` header allowed.

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

### Password rules (verified live against a running server)

Every password field that **sets** a password — signup, change-password's `newPassword`, reset-password — enforces:

- **`@NotBlank`** — cannot be empty or whitespace-only
- **`@Size(min = 8, max = 64)`** — between 8 and 64 characters

**There are no complexity requirements server-side** (no mixed case, digit, or symbol rule). The client adds its own advisory complexity rules on top; see [password rules, reconciled](#password-rules-reconciled).

`change-password`'s **`currentPassword` has `@NotBlank` only, deliberately no `@Size`.** It is an existing password being checked, not a new one being set — length-validating it would permanently lock out any account created under the old 4-character minimum.

> Changed from `@Size(min = 4, max = 12)`. The old ceiling was the more urgent half of the problem: 12 characters blocks passphrases and password managers for no security benefit, since the column stores a fixed-length bcrypt hash either way. Verified after the change: a 20-character password returns 201, and a 5-character one returns
> `400 { "errors": { "password": "Password must be between 8 and 64 characters" } }`.

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
  "errors": { "password": "Password must be between 8 and 64 characters" } }
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
| `location` | string | no | free text, e.g. `"San Francisco, CA"` |
| `jobType` | JobType enum | no | `REMOTE` / `HYBRID` / `ONSITE` |
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

This is the single easiest way to lose data in this API, so here is the captured proof. Starting from the created job above and sending a body with only the three required fields:

```jsonc
// PUT /api/jobs/10 — a "just change the status" request
{ "companyName": "Acme Corp", "jobRole": "Frontend Engineer", "status": "INTERVIEW" }

// 200 — everything not sent is now null
{ "jobId": 10, "companyName": "Acme Corp", "jobRole": "Frontend Engineer", "status": "INTERVIEW",
  "priority": null,        // was "HIGH"
  "jobType": null,         // was "HYBRID"
  "location": null,        // was "Remote"
  "salaryRange": null,     // was "20-25 LPA"
  "recruiterEmail": null,  // was "hr@acme.com"
  "notes": null,           // was "Referred by a friend"
  "appliedDate": null,     // was "2026-08-01T10:00:00"
  … }
```

The frontend guards this with `toJobRequestBody()` in [src/lib/jobsApi.js](src/lib/jobsApi.js), which projects a complete job object onto exactly the request fields. Every write path — the kanban drag, the table's status dropdown, the edit form — goes through it. Don't hand-roll a `PUT` body.

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
| `jobType` | `?jobType=REMOTE` | exact match on the JobType enum |
| `search` | `?search=acme` | case-insensitive substring, matches company name **OR** job role |

e.g. `/api/jobs?status=INTERVIEW&jobType=REMOTE&search=acme`. Omitting all four returns everything you own. A filter combination that matches nothing returns `[]`, not a 404.

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

### Upcoming interviews (cross-job)

| Method | URL | Auth | Request body | Success | Response body |
|---|---|---|---|---|---|
| GET | `/api/rounds/upcoming` | **yes** | — | 200 | `UpcomingRoundResponseDto[]`, soonest first |

Separate from `/api/jobs/{jobId}/rounds` because it spans **every** job you own — built specifically so a dashboard widget doesn't have to fetch rounds job-by-job. Each row carries its parent job's `companyName`/`jobRole` so no follow-up request is needed.

```jsonc
// GET /api/rounds/upcoming → 200
[
  {
    "jobRoundId": 5,
    "jobId": 8,
    "companyName": "GitHub",
    "jobRole": "Staff Eng",
    "roundNumber": 1,
    "roundType": "Technical",
    "roundDate": "2026-08-25T10:30:00",
    "interviewerName": null,
    "notes": null,
    "outcome": "PENDING"
  },
  { "jobRoundId": 4, "companyName": "Stripe", "roundDate": "2026-09-20T14:00:00", ... }
]
```

Semantics worth knowing:
- **"Upcoming" means `roundDate >= now`.** Past rounds are excluded.
- **Rounds with a null `roundDate` are excluded** — an unscheduled round isn't upcoming.
- Sorted by `roundDate` ascending across all jobs.
- No rounds → `[]` with a 200, never a 404.

### Enum values (exact strings — these go over JSON as-is)

- **Status:** `WISHLIST`, `APPLIED`, `INTERVIEW`, `OFFER`, `REJECTED`
- **Priority:** `HIGH`, `MEDIUM`, `LOW`
- **JobType:** `REMOTE`, `HYBRID`, `ONSITE`
- **Outcome:** `ACCEPTED`, `REJECTED`, `PENDING`, `NO_RESPONSE`, `WITHDRAWN`, `OTHER`
- **RoundType:** `Technical`, `HR`, `Managerial`, `Group`, `Coding`, `Behavioral`, `CaseStudy`, `HLD`, `LLD`, `SystemDesign`, `CultureFit`, `Other` — note these are **PascalCase**, unlike the other three enums which are UPPERCASE. Easy to get wrong; sending a value that isn't in this list returns a 400.
- **Provider** (read-only, from `/me`): `LOCAL`, `GOOGLE`, `GITHUB`, `LINKEDIN`

Sending an invalid enum string returns a `400` that **names the field and lists the accepted values** — useful enough to surface directly in the UI:

```jsonc
// POST /api/jobs with { "status": "applied" }  ← lowercase, the classic mock-data mistake
{ "timestamp": "...", "status": 400, "message": "Malformed request body",
  "errors": { "status": "Invalid value 'applied'. Expected one of: [WISHLIST, APPLIED, INTERVIEW, OFFER, REJECTED]" } }

// GET /api/jobs?jobType=BOGUS
{ "timestamp": "...", "status": 400, "message": "Invalid request parameter",
  "errors": { "jobType": "Invalid value 'BOGUS'. Expected one of: [REMOTE, HYBRID, ONSITE]" } }

// GET /api/jobs/abc
{ "timestamp": "...", "status": 400, "message": "Invalid request parameter",
  "errors": { "jobId": "Invalid value 'abc'. Expected type Integer" } }
```

Genuinely malformed JSON (not just a bad value) gives `message: "Malformed request body"` with `errors: null`, so still null-check `errors`.

### Not built yet

- **File upload** — Cloudinary isn't integrated. `resumeUrl`, `coverLetterUrl`, `avatarUrl` and `defaultResumeUrl` are all plain strings you set yourself; nothing accepts a file today.
- **AI features** — the `job_ai_results` table and entity exist, but there are no endpoints and Gemini isn't integrated.
- **Pagination** — `GET /api/jobs` returns every matching row. Fine now, will need `Pageable` once someone has hundreds of applications.
- **`PATCH` semantics** — job and round updates are full-replace only. If you build a kanban board where dragging a card changes just `status`, you'll need to send the entire job object back, or add a real `PATCH` endpoint.

Error responses (4xx) all share this shape:
```json
{ "timestamp": "...", "status": 401, "message": "...", "errors": null }
```
`errors` is a field-name → message map, populated only on 400s (bean validation, bad enum values, bad path/query types — see above). It is null on 401/404/409. Read it with `getApiFieldErrors()` from [src/lib/api.js](src/lib/api.js), which returns null when absent so callers fall back to `message`.

**One exception to the shape:** a 401 raised by the security filter rather than by application code — an absent, malformed, or expired bearer token — comes back with an **empty body**, because `SecurityConfig` uses `response.sendError(...)`. There is no `message` to read, so `getApiErrorMessage()` returns its fallback string. Don't rely on `data.message` for auth-filter rejections.

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

Every page below is wired to the real API. There is no mock data anywhere in the app.

### Auth pages

- **Login page** — local email/password form, plus "Sign in with Google"/"Sign in with GitHub" links to the OAuth2 URLs above, plus a "Forgot password?" link to a forgot-password form (`POST /api/auth/forgot-password`). Built as `/login`; signup is the same page, toggled.
- **`/oauth2/redirect`** — as described above, effectively a loading/processing screen, not something a user looks at for long.
- **`/reset-password`** — as described above.
- **Error page / fallback UI** — this is a separate concern from the two redirect routes above. Those two have their own specific, expected error states (bad OAuth2 code, bad reset token) that should show inline, contextual messages — not dump the user onto a generic error page. What's still worth having, separately: a top-level error boundary that catches *unexpected* frontend crashes (a bug, a null reference, something truly unhandled), so the user sees a friendly "something went wrong" screen instead of a blank white page. That's an app-wide concern, not tied to any specific backend redirect — the backend never sends anyone to a URL like `/error`.

### App pages

- **Dashboard** ([DashboardPage.jsx](src/pages/DashboardPage.jsx)) — `GET /api/jobs/stats` for the tiles, `GET /api/jobs` for the mini pipeline, `GET /api/rounds/upcoming` for the interviews widget. The weekly trend is derived client-side from the jobs list.
- **Applications** ([ApplicationsPage.jsx](src/pages/ApplicationsPage.jsx)) — `GET /api/jobs` with `status`/`priority`/`jobType`/`search` all wired to server-side query params. Search is debounced 300 ms, and a request counter discards a slow early response that would otherwise overwrite a faster later one. The list is server-ordered newest-first; the table adds no default sort of its own.
- **Job detail** ([JobDetailPage.jsx](src/pages/JobDetailPage.jsx), route `/JobJuggler/applications/:jobId`) — `GET`/`PUT`/`DELETE /api/jobs/{jobId}` plus the full rounds CRUD. `roundNumber` isn't auto-assigned, so the UI defaults it to `max(existing) + 1` rather than `length + 1` — the two differ once a middle round has been deleted.
- **Create / edit job** ([JobFormModal.jsx](src/components/JobFormModal.jsx)) — `POST`/`PUT /api/jobs`. New jobs prefill `resumeUrl` from `defaultResumeUrl` on `/me`.
- **Analytics** ([AnalyticsPage.jsx](src/pages/AnalyticsPage.jsx)) — `GET /api/jobs/stats` for the funnel and donut; the trend is derived like the dashboard's.
- **Settings** ([SettingsPage.jsx](src/pages/SettingsPage.jsx)) — `PUT /api/users/me`, change-password (only rendered when `provider === 'LOCAL'`), default-resume set/clear, logout and `logout-all`.

**Kanban drag-and-drop:** handled. `KanbanBoard` passes the *whole job object* to `onStatusChange`, not just an id, so the caller can send a complete full-replace `PUT`. The move is applied optimistically and rolled back if the request fails.

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
| Error message extraction | `getApiErrorMessage()` / `getApiFieldErrors()` in [src/lib/api.js](src/lib/api.js) |
| Unexpected-crash fallback | [src/components/ErrorBoundary.jsx](src/components/ErrorBoundary.jsx), wraps the whole router |
| All `/api/jobs*` and `/api/jobs/{id}/rounds*` calls | [src/lib/jobsApi.js](src/lib/jobsApi.js) |
| `GET /api/rounds/upcoming` | `listUpcomingRounds()` in [src/lib/jobsApi.js](src/lib/jobsApi.js) |
| Full-replace `PUT` body construction | `toJobRequestBody()` in [src/lib/jobsApi.js](src/lib/jobsApi.js) |
| `PUT /api/users/me`, default-resume, change-password | [src/lib/userApi.js](src/lib/userApi.js) |
| `LocalDateTime` ↔ `<input>` conversions, weekly trend | [src/lib/dates.js](src/lib/dates.js) |
| Status / type / priority / round enums as UI config | [src/data/jobConstants.js](src/data/jobConstants.js) |

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

## What the migration changed

**Done.** `mockJobs.js`, `mockStats.js` and `mockUser.js` are deleted. The UI-config constants that shared `mockJobs.js` were moved to [src/data/jobConstants.js](src/data/jobConstants.js) and rekeyed to the backend's exact enum strings, so API objects index into them directly with no translation layer.

Kept for reference, because it explains why the field names in this repo look the way they do:

### Job object — field mapping

| Old mock (`INITIAL_JOBS`) | API (`JobApplicationResponseDto`) | Resolution |
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
| `companyIcon: '💳'` | — | **no backend field.** Replaced by [CompanyAvatar.jsx](src/components/ui/CompanyAvatar.jsx), a monogram tinted by a hash of the company name — deterministic, so the same company always looks the same |
| `type: 'remote' \| 'hybrid' \| 'onsite'` | `jobType: 'REMOTE' \| 'HYBRID' \| 'ONSITE'` | ✅ **added to the backend** — rename + uppercase, and it's filterable via `?jobType=` |
| `outcome: 'accepted' \| null` | — | **not on the job.** Dropped from the job UI; per-round outcomes are shown on the job detail page instead |
| — | `priority` | new: `HIGH`/`MEDIUM`/`LOW`, nullable |
| — | `recruiterName`, `recruiterEmail`, `recruiterPhone` | new, all nullable |
| — | `resumeUrl`, `coverLetterUrl` | new, nullable |
| — | `followUpDate`, `reminderEnabled` | new |
| — | `createdAt`, `updatedAt` | new, server-set |

### How the three real problems were resolved

**1. Status casing — rekeyed.** `JOB_STATUSES` and `KANBAN_COLUMNS[].statuses` now use `WISHLIST`/`APPLIED`/`INTERVIEW`/`OFFER`/`REJECTED`, and `JOB_TYPES` uses `REMOTE`/`HYBRID`/`ONSITE`. The kanban's combined column key also changed from `'offer-rejected'` to `'OFFER_REJECTED'`. Nothing translates casing at runtime, which is the point: a lookup either hits or is a visible bug, rather than quietly re-encoding on every read and write.

**2. `outcome` on a job — dropped.** It was redundant with `status: 'OFFER' | 'REJECTED'`, and `Outcome` genuinely lives on interview rounds in the backend. Row and card accents now derive from `status` alone via `getStatusAccent()`; real per-round outcomes render on the job detail page.

**3. Dates — centralised in [src/lib/dates.js](src/lib/dates.js).** No component does date arithmetic inline. The send path is pure string manipulation and never constructs a `Date`, because `new Date('2026-08-01')` parses as **UTC** midnight while `new Date('2026-08-01T00:00:00')` parses as **local** midnight — round-tripping through a `Date` shifts the day for anyone west of UTC.

  One addition beyond the original plan: `mergeDateIntoDateTime()`. A `<input type="date">` can only express a day, so naively saving a job applied at `T10:00:00` would rewrite it to `T00:00:00` the first time anyone edited an unrelated field. The helper keeps the original clock time when the calendar day hasn't changed.

### Stats — shape change

```js
// mock: flat, lowercase
{ total: 15, wishlist: 4, applied: 4, interview: 3, offer: 2, rejected: 2 }

// API: nested, uppercase
{ total: 2, byStatus: { WISHLIST: 1, APPLIED: 0, INTERVIEW: 1, OFFER: 0, REJECTED: 0 } }
```
All five keys are always present and zero-filled, so tiles can render unconditionally.

### Dashboard widgets without a direct endpoint

These live in `mockStats.js` and are rendered by `DashboardPage`/`AnalyticsPage`:

| Mock export | Status | Path |
|---|---|---|
| `UPCOMING_INTERVIEWS` | ✅ **live** | `GET /api/rounds/upcoming`, added for this widget. One request across all jobs, company/role flattened in, so no N+1. |
| `WEEKLY_TREND` | ✅ **live, derived client-side** | `buildWeeklyTrend()` in [src/lib/dates.js](src/lib/dates.js) buckets the jobs list by `appliedDate` (falling back to `createdAt`) over the last 7 days. Comparison is on the `YYYY-MM-DD` prefix, so it never touches timezone conversion. No backend work needed. |
| `RECENT_ACTIVITY` | ⚠️ **live, but derived** | Rebuilt from job `createdAt`/`updatedAt` in [src/lib/activity.js](src/lib/activity.js). Real data, real limits — see [Recent Activity](#recent-activity-derived-now-logged-later) below. |

The mock's `UPCOMING_INTERVIEWS` shape differed from the API's: it had `date` plus a preformatted `time` string (`"10:00 AM PST"`) and a `companyIcon`. The API gives one `roundDate` and no icon, so the dashboard formats the time via `formatDateTime()` and uses `CompanyAvatar`. The backend stores no timezone, so times render in the browser's local zone.

### Recent Activity: derived now, logged later

The widget is live, but it is **not** reading an audit log — there isn't one. `buildActivityFeed()` in [src/lib/activity.js](src/lib/activity.js) synthesises events from timestamps `GET /api/jobs` already returns. Every event is real; the derivation is what's limited:

| | Derived (today) | A real activity log |
|---|---|---|
| Job added | ✅ from `createdAt` | ✅ |
| Job edited | ⚠️ **latest edit only** — `updatedAt` is `@LastModifiedDate`, so five edits collapse to one event | ✅ full history |
| What changed | ❌ previous values aren't recoverable, so an edit reports the job's *current* status rather than claiming a transition | ✅ `WISHLIST → APPLIED` |
| Round scheduled / outcome recorded | ❌ past rounds need one request per job | ✅ |
| Deleted jobs | ❌ gone from `GET /api/jobs`, so the event vanishes with the row | ✅ survives deletion |

**To upgrade it**, the backend needs an activity log. Sketch:

```java
// enums/ActivityAction.java
public enum ActivityAction {
    JOB_CREATED, JOB_UPDATED, STATUS_CHANGED, JOB_DELETED,
    ROUND_SCHEDULED, ROUND_UPDATED, ROUND_DELETED, OUTCOME_RECORDED
}

// model/ActivityLog.java
@Entity @Table(name = "activity_log")
public class ActivityLog {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer activityId;

    @ManyToOne @JoinColumn(name = "user_id", nullable = false)
    private User user;                    // scope every query by this, as /api/rounds/upcoming does

    @Enumerated(EnumType.STRING) @Column(nullable = false)
    private ActivityAction action;

    // NOT a @ManyToOne. See the note below — this is the one decision worth getting right.
    @Column(name = "job_id")     private Integer jobId;
    @Column(name = "company_name") private String companyName;   // snapshot, not a join
    @Column(name = "job_role")     private String jobRole;       // snapshot

    @Enumerated(EnumType.STRING) private Status fromStatus;      // null unless STATUS_CHANGED
    @Enumerated(EnumType.STRING) private Status toStatus;

    @CreatedDate @Column(nullable = false)
    private LocalDateTime createdAt;
}
```

Four things that will bite otherwise:

1. **Do not make `jobId` a `@ManyToOne` to `JobApplication`.** `JobApplication` already cascades `ALL` with `orphanRemoval` to its rounds, so a real FK means deleting a job either fails on the constraint or cascade-deletes its own history — including the `JOB_DELETED` event you just wrote. Store a plain `Integer` plus a `companyName`/`jobRole` snapshot so the log outlives the row. That snapshot is also what lets the feed render a deleted job's name at all.
2. **Capture the old status *before* `jobUtils.applyToEntity(dto, job)`.** That call overwrites the entity in place, so reading `job.getStatus()` after it gives you the new value twice and every `STATUS_CHANGED` row records `X → X`.
3. **Write from `JobApplicationService`/`InterviewRoundService`, not an `@EntityListener`.** A JPA listener can't tell a status change from a notes edit without extra bookkeeping, and it fires inside the flush, where saving another entity is awkward.
4. **Cap the query.** `GET /api/activity?limit=20` with a `Pageable` or `Sort` + limit, ordered `createdAt DESC`. Unlike `/api/jobs`, this table grows without bound.

Suggested endpoint — `GET /api/activity?limit=20`, auth required, returns newest first:

```jsonc
[
  { "activityId": 12, "action": "STATUS_CHANGED", "jobId": 3,
    "companyName": "Acme Corp", "jobRole": "Frontend Engineer",
    "fromStatus": "APPLIED", "toStatus": "INTERVIEW",
    "createdAt": "2026-08-09T14:30:00" }
]
```

Remember to add `.requestMatchers("/api/activity/**").authenticated()` to `SecurityConfig`.

**Frontend swap when it lands:** `activity.js` already emits `{ id, action, jobId, companyName, jobRole, status, timestamp }` with `ACTIVITY_ACTIONS` keyed by the same action names. Add `listActivity()` to `jobsApi.js`, replace the `buildActivityFeed(jobs)` memo in `DashboardPage` with the fetched array, and map `createdAt → timestamp`. The widget itself doesn't change.

**Also removed:** the three notification toggles on `SettingsPage`. They were local `useState` that reset on reload, with no endpoint behind them — the same "don't ship fiction" reasoning as `RECENT_ACTIVITY`. Worth rebuilding when `reminderEnabled` grows a real notification backend.

### `mockUser` — fallback deleted

`MOCK_USER` is gone. `AppShell`, `DashboardPage` and `SettingsPage` now read `user` from `AuthContext` with no fallback, so a failed `/me` surfaces as a real failure instead of silently rendering "Alex Johnson". This is safe because all three render only inside `ProtectedRoute`, which waits for `/me` to resolve before mounting them.

### Endpoints that now have UI

All of them. `change-password`, `logout-all`, `PUT /api/users/me` and the default-resume pair are wired into [SettingsPage.jsx](src/pages/SettingsPage.jsx); change-password is rendered only when `provider === 'LOCAL'`, and OAuth accounts get an explanatory panel instead.

Two asymmetries that bit during wiring and are easy to hit again:

- **`PUT /api/users/me` takes `firstName`/`lastName`, but `UserDto` returns `userFirstName`/`userLastName`.** Sending the `user`-prefixed names is not an error — the fields are simply ignored and the update silently does nothing.
- **Those fields are `@Size(min = 3, max = 20)` with no `@NotBlank`.** So `null` means "leave unchanged" but `""` is a 400. `updateProfile()` in [src/lib/userApi.js](src/lib/userApi.js) drops blank values rather than forwarding them.

### Password rules, reconciled

**Resolved 2026-08-09.** Both sides were changed, and they now agree.

The backend was raised from `4–12` to **`@Size(min = 8, max = 64)`** across `SignupRequestDto`, `ChangePasswordRequestDto` and `ResetPasswordRequestDto`. Raising the ceiling was the more valuable half: 12 characters blocked passphrases and password managers for no security benefit, since the column stores a fixed-length bcrypt hash regardless of input length.

The client's length rule in [src/lib/validation.js](src/lib/validation.js) gained the matching **upper** bound it never had. That missing ceiling was the actual bug in the original mismatch — an unbounded client rule doesn't merely differ from the server, it green-ticks a password the server will reject, putting the error on a field the form already called valid.

| | Client (`validation.js`) | Backend | |
|---|---|---|---|
| Minimum | 8 | 8 | ✅ agrees |
| Maximum | 64 | 64 | ✅ agrees |
| Complexity | mixed case + digit + symbol | none | ⚠️ client stricter — the safe direction: it can never produce a surprise 400 |

Two deliberate asymmetries to leave alone:

- **`currentPassword` on change-password has `@NotBlank` only, no `@Size`.** It's an existing password being verified, not a new one being set. Length-validating it would permanently lock out any account created under the old 4-character minimum.
- **The login form does not apply these rules.** They gate signup only; `handleSubmit` in [LoginPage.jsx](src/pages/LoginPage.jsx) never blocks on them. Enforcing a new policy at login would lock out existing users with legacy passwords.

Verified live after the change: a 20-character password returns `201`; a 5-character one returns `400 { "errors": { "password": "Password must be between 8 and 64 characters" } }`.