# src/lib/auth — accounts, sessions, OAuth

## OVERVIEW
PostgreSQL-backed email/password + Google authentication, session tokens, server actions, and account view helpers. Secrets and DB access stay server-only.

## STRUCTURE
| Area | Files |
|---|---|
| DB pool | `database.ts` (`authDatabase`, one `pg.Pool` via `globalThis`) |
| Accounts | `accounts.ts` (`AuthError`, `registerAccount`, `authenticatePassword`, `googleAccount`) |
| Sessions | `session.ts` (`createSession`, `readSession`, `revoke*`), `server-session.ts` (`getSession`) |
| OAuth | `google.ts` (PKCE S256, state/nonce, `beginGoogle`/`finishGoogle`) |
| Actions | `actions.ts` (`"use server"`: login/register/logout/settings) |
| View/test | `account-view.ts`, `test-database.ts` (`TEST_DATABASE_URL` guard) |

## WHERE TO LOOK
| Task | File | Notes |
|---|---|---|
| Session cookie | `session.ts:37` | httpOnly, sameSite lax, secure in prod, 24h |
| Token storage | `session.ts:45` `createSession` | DB stores `digest(token)` only; 32-byte base64url |
| OAuth callback | `google.ts:93` `finishGoogle` | Verify ID token, `email_verified`, matching nonce; state deleted atomically |
| Server session | `server-session.ts` | `await connection()` then cookie read; intentionally not `"use server"` |
| Errors | `accounts.ts:19` `AuthError` | Actions catch → `{ ok:false, error }` |
| Pool limits | `database.ts` | max 5, 2 s connect/query/statement timeouts |

## CONVENTIONS (different from root)
- DB/secret modules start with `import "server-only"`; tests mock it `{ virtual: true }`.
- Sessions rotate by deleting the previous token inside a transaction; `last_seen_at` touches only when older than 5 minutes.
- `server-session.ts` avoids `"use server"` so `getSession()` is not a server action.
- `AUTH_URL` must be https in production and must not embed credentials.
- Integration suites need `TEST_DATABASE_URL` ending `_test` and run serially.

## ANTI-PATTERNS (THIS DIRECTORY)
- Never return a session token to the browser or store plaintext tokens.
- Never decode a Google ID token without full verification, or skip state/nonce/PKCE checks.
- Never read `AUTH_URL`/origin at module scope; read per request.
- Never throw strings for domain failures; use `AuthError`.
- Never add `export const runtime|dynamic` to pages here; use `connection()`.
