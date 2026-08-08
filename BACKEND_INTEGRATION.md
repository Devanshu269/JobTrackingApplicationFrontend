# Backend Integration Notes

The contract between this frontend and `JobTrackingApplicationBackend`. The backend must be running locally on port 8080 for any of this to work.

> **Status:** the frontend implements everything below, but **none of it has been exercised against a running backend**. Treat this document as the spec that was built to, not as verified behaviour. See [Frontend implementation map](#frontend-implementation-map) at the bottom for where each endpoint is called from.

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

| Method | URL | Auth | Body | Notes |
|---|---|---|---|---|
| POST | `/api/auth/signup` | no | `{ userFirstName, userLastName, email, password }` | Returns `{ token, refreshToken, userId }`, 201 |
| POST | `/api/auth/login` | no | `{ email, password }` | Returns `{ token, refreshToken, userId }`, 200 |
| POST | `/api/auth/oauth/exchange` | no | `{ code }` | Swaps the one-time OAuth2 code (see below) for real tokens |
| GET | `/api/auth/me` | **yes** | — | Returns `{ userId, userFirstName, userLastName, email, avatarUrl, provider }` |
| POST | `/api/auth/change-password` | **yes** | `{ currentPassword, newPassword }` | 204 on success. Only show this option when `provider === 'LOCAL'` (from `/me`) — OAuth accounts have no password |
| POST | `/api/auth/forgot-password` | no | `{ email }` | Always returns 200 regardless of whether the email exists (deliberate — don't treat a non-200 as "email not found") |
| POST | `/api/auth/reset-password` | no | `{ token, newPassword }` | 204 on success, 401 if token invalid/expired/already used |
| POST | `/api/auth/refresh` | no | `{ refreshToken }` | Returns a new `token` (refresh token itself isn't rotated) |
| POST | `/api/auth/logout` | no | `{ refreshToken }` | 204, kills that one session |
| POST | `/api/auth/logout-all` | **yes** | — | 204, kills every session for the current user |

Error responses (4xx) all share this shape:
```json
{ "timestamp": "...", "status": 401, "message": "...", "errors": null }
```
`errors` is a field-name → message map, only populated on 400 validation failures.

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

## Pages to build — all built

- **Login page** — local email/password form, plus "Sign in with Google"/"Sign in with GitHub" links to the OAuth2 URLs above, plus a "Forgot password?" link to a forgot-password form (`POST /api/auth/forgot-password`). Built as `/login`; signup is the same page, toggled.
- **`/oauth2/redirect`** — as described above, effectively a loading/processing screen, not something a user looks at for long.
- **`/reset-password`** — as described above.
- **Error page / fallback UI** — this is a separate concern from the two redirect routes above. Those two have their own specific, expected error states (bad OAuth2 code, bad reset token) that should show inline, contextual messages — not dump the user onto a generic error page. What's still worth having, separately: a top-level error boundary (or equivalent for your framework) that catches *unexpected* frontend crashes (a bug, a null reference, something truly unhandled), so the user sees a friendly "something went wrong, try again" screen instead of a blank white page. That's an app-wide concern, not tied to any specific backend redirect — the backend never sends anyone to a URL like `/error`.

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

### Endpoints with no UI yet

`change-password` isn't wired up at all, and `logout-all` exists as a function on the auth
context but nothing calls it — there's no account settings page. Note the constraint when one
is built: only offer change-password when `provider === 'LOCAL'` from `/me`, since OAuth
accounts have no password.

### Client-side password rules are a guess

[src/lib/validation.js:17](src/lib/validation.js#L17) enforces 8+ characters, mixed case, a
number and a symbol. **The backend's actual policy is unknown** — these were invented to give
the signup form useful feedback. Reconcile them with the real server-side validation before
launch, otherwise the form will either accept passwords the backend rejects or reject ones it
would have accepted.