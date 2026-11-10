# Account Settings Dialog — Design

**Date:** 2026-11-10
**Status:** Approved in chat; plan pending execution
**Worktree:** `codex/account-settings` (base `main` @ `318674e`)

## Goal

Turn the shared profile popup (`ProfileDialog`) into a Claude-style two-pane
settings modal, and make the account tab real: edit the display name, change the
password, see every active session, and revoke sessions.

## Non-goals

a. No account deletion, email change, avatar upload, 2FA, or notification
   preferences. None of those exist in the data model and none were requested.
b. No geolocation. The reference shows "Salatiga, Central Java"; we have no
   geo-IP source and will not invent one. The session row shows the IP address
   when it was recorded, otherwise `—`.
c. No search field in the rail. Four sections do not need a filter, and a filter
   that cannot narrow anything is decoration.
d. `/profil` (the full page) keeps its current single-column layout. Only the
   popup changes.

## Layout

The popup is one controlled dialog shared by `UserMenu`, `ProfilePopup`, and
`CompanionAuth`; all three keep the existing `section` / `onOpenChange` API.

```
┌──────────────────────────────────────────────────────┐
│ Pengaturan                                        [x] │  header, border-b
├──────────────┬───────────────────────────────────────┤
│ ◉ Akun       │  Akun                                 │
│   Kemajuan   │  Identitas dan sesi yang aktif.        │
│   Lowongan   │  ┌─────────────────────────────────┐  │
│   Privasi    │  │ avatar  nama · email   [Akun]   │  │
│              │  └─────────────────────────────────┘  │
│              │  Nama tampilan            [input] [Simpan] │
│              │  Password …                             │
│              │  …                                      │
└──────────────┴───────────────────────────────────────┘
```

- `DialogContent`: `showCloseButton={false}`, `block`,
  `w-[min(64rem,calc(100vw-2rem))]`, `h-[min(44rem,calc(100dvh-2rem))]`,
  `max-w-none overflow-hidden rounded-3xl border-0 bg-background p-0
  shadow-2xl ring-0 sm:max-w-none` — the measured `AuthDialog` recipe
  (`src/components/auth/auth-dialog.tsx:28-33`).
- Header: `DialogTitle` "Pengaturan" + a custom close button with
  `aria-label="Tutup pengaturan"` (the primitive's default close is English).
- Body: a vertical `role="tablist"` rail (13.5rem) and a scrollable pane.
  - Rail rows: `Akun` (UserRound), `Kemajuan` (GraduationCap), `Lowongan`
    (Briefcase), `Privasi & keamanan` (ShieldCheck), icon + label, active =
    `bg-panel` + `text-txt` + `shadow-rest`; inactive = `text-dim`.
  - Arrow Up/Down/Left/Right, Home, End move focus and selection. The rail is a
    2×2 grid below `md`, one column above it.
  - Pane scrolls independently (`overflow-y-auto`); header and rail stay put.
- Panels keep all current content and ids (`profil`, `kemajuan`, `loker`,
  `privasi`), so menu deep-links still open the right tab.

## Account capabilities

### Display name

- `zod`: trimmed, 1–80 characters.
- Server action `updateNama` reads the cookie session, rate-limits with
  `consumeAttempt("account:name:<id>", 20, 10 min)`, updates `users.nama`, and
  `revalidatePath("/", "layout")`.
- Form uses `useActionState` (the repo's existing auth-form idiom); inline
  `role="status"` success, `Alert`/`FieldError` on failure, no toast (there is
  no `<Toaster>` outside the marketing shell).

### Password

- Current + new + confirm. New password 8–128 characters.
- Verify the current password with the existing scrypt `checkPassword`.
- If `users.password_hash IS NULL` the account is Google-only: show an honest
  note and no form. This avoids letting a borrowed session mint a password
  without re-authenticating with Google.
- On success: revoke every other session for that user; keep the current one.
- Rate limit `account:password:<id>` at 5 per 15 minutes.

## Sessions

`migrations/006_account_sessions.sql` adds to `sessions`:

| Column | Type | Notes |
|---|---|---|
| `user_agent` | `text` | nullable; max 300 chars at capture |
| `client_ip` | `text` | nullable; only from `X-Lumina-Client-IP` when `TRUST_PROXY=true` |
| `created_at` | `timestamptz NOT NULL DEFAULT now()` | existing rows backfill to migration time |
| `last_seen_at` | `timestamptz NOT NULL DEFAULT now()` | touched at most every 5 minutes |

Plus `CREATE INDEX sessions_user ON sessions(user_id)`.

- `createSession(userId, previous?, meta?)` captures UA/IP on password login,
  registration, and the Google callback.
- `readSession` performs one guarded `UPDATE … WHERE last_seen_at < now() -
  interval '5 minutes'`; failure to touch never fails the read.
- `listSessions(userId, currentToken)` returns active rows,
  `current = token_hash === digest(currentToken)`, newest activity first, max 50.
  `token_hash` is already a SHA-256 digest and is used as the opaque session id;
  it cannot authenticate.
- `revokeUserSession(userId, tokenHash)` only deletes a row owned by that user.
- `revokeOtherSessions(userId, currentToken)` supports password change.
- `revokeAllSessions(userId)` supports "Keluar dari semua perangkat", which also
  clears the cookie and redirects home.

## API

`GET /api/account` (authenticated, `cache-control: no-store`):

```json
{
  "ok": true,
  "account": { "nama": "…", "email": "…", "createdAt": "…" },
  "hasPassword": true,
  "sessions": [
    {
      "id": "<sha256 token hash>",
      "device": "Firefox · Linux",
      "ip": "103.28.1.2",
      "signedIn": "2026-11-10T04:30:00.000Z",
      "lastActive": "2026-11-10T04:30:00.000Z",
      "current": true
    }
  ]
}
```

- 401 `{ ok: false, error: "unauthorized" }` without a session.
- Device label is a small UA parser (`Edg/OPR/Chrome/Firefox/Safari` +
  `Android/iOS/Windows/macOS/Linux`), no dependency, no geo.
- Relative activity (`baru saja`, `5 menit lalu`) and dates are formatted on the
  client from ISO strings with `Intl` (`id-ID`, `Asia/Jakarta`).

## Security and privacy

a. All new SQL is parameterized; every mutation scopes by `user_id` from the
   session, never from the request body.
b. IP is recorded only behind the trusted proxy; otherwise it stays `NULL`.
c. Errors never include database text; they follow the existing `AuthError`
   mapping.
d. Privacy copy is updated: account metadata (UA/IP/session timestamps) is
   stored to show and revoke sessions; conversations still are never stored.
e. Revoking the current session is not offered in the list. The global action
   explicitly signs out the current device too.

## Testing

- `src/lib/auth/account-view.test.ts` — UA labels, date formatting, relative
  time boundaries.
- `src/lib/auth/session.test.ts` (extend, DB-gated) — meta capture, touch guard,
  list ordering/current flag, revoke scoping.
- `src/lib/auth/account-settings.test.ts` (new, DB-gated) — rename validation,
  password change wrong/right/Google-only, other-session revocation.
- `src/app/api/account/route.test.ts` — 401 and 200 payload shape with mocked
  session/store.
- `src/components/profil/profile-dialog.test.tsx` — rail switching, name save
  calls the action, session list + revoke.
- Update three existing tests whose dialog accessible name changes from the
  section title to "Pengaturan": `user-menu.test.tsx`, `profile-popup.test.tsx`,
  `companion-auth.test.tsx`.

Gate: `npm run verify`. Integration tests require
`DATABASE_URL="$TEST_DATABASE_URL" npm run db:migrate` once.

## Rollout

Additive migration; no data removed. Existing sessions appear with unknown
device/IP and a `created_at` equal to migration time. Deploy runs
`npm run db:migrate` as the separate release step, as before.
