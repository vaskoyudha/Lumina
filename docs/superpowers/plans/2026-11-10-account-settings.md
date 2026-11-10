# Account Settings Dialog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the shared profile popup as a two-pane settings dialog and make the account tab real — rename, password change, active-session list, and per-session revocation.

**Architecture:** `ProfileDialog` keeps its public props (`session`, `section`, `onOpenChange`) but becomes a full-height settings shell with an ARIA tab rail and four panels. Data for the live parts comes from a new authenticated `GET /api/account`; mutations are server actions in `src/lib/auth/actions.ts`. Session metadata is captured at login into four additive columns on `sessions`.

**Tech Stack:** Next.js 16.4.5 App Router · React 19.3 · TypeScript strict · Tailwind v4 tokens · shadcn/radix primitives · zod 4 · PostgreSQL 18 (`pg`) · Jest 30 + React Testing Library · Biome.

**Spec:** `docs/superpowers/specs/2026-11-10-account-settings-design.md`

## Global Constraints

- Work only in the `codex/account-settings` worktree. Never edit `main`.
- No new dependency. No new shadcn primitive. Reuse the installed `Dialog`, `Card`, `Button`, `Input`, `Field`, `Alert`, `Avatar`, `Badge`, `Progress`.
- Colour comes only from `--lumina-*` utilities (`bg-panel`, `bg-panel-2`, `border-line`, `ring-line`, `text-txt`, `text-dim`, `text-brand-ink`, `bg-brand-soft`, `text-danger`). No hex, no raw Tailwind colours.
- Indonesian copy, `baku`. Close button label: `Tutup pengaturan`.
- Every control has an accessible name. The dialog must work at **380 px**: no horizontal page scroll, rail becomes a 2×2 grid, touch rows ≥ 36 px.
- Do not use `export const runtime` or `export const dynamic` (Cache Components rejects them). Authenticated route handlers rely on `getSession()` for request-time semantics.
- Parameterized SQL only. Never put database text in a user-facing error.
- Integration tests are skipped without `TEST_DATABASE_URL`. When it is set, run the migration first:
  `DATABASE_URL="$TEST_DATABASE_URL" npm run db:migrate`
- `npm run verify` must pass before each commit. Stop any dev server before `next build`.
- Do not touch `/profil`, the menu labels, `ProfileSection` ids, or the saved-jobs store.

---

## File Structure

| File | Responsibility |
|---|---|
| `migrations/006_account_sessions.sql` | **new** — session metadata columns + user index |
| `src/lib/auth/account-view.ts` | **new** — pure view types, UA label, date/relative formatters |
| `src/lib/auth/account-view.test.ts` | **new** — pure helper tests |
| `src/lib/auth/session.ts` | modified — `createSession` meta, touch, list/revoke helpers |
| `src/lib/auth/session-settings.test.ts` | **new** — DB-gated session metadata tests |
| `src/lib/auth/accounts.ts` | modified — `updateAccountName`, `changeAccountPassword` |
| `src/lib/auth/account-settings.test.ts` | **new** — DB-gated mutation tests |
| `src/lib/server/request.ts` | modified — `requestMeta(headers)` |
| `src/lib/server/request-meta.test.ts` | **new** — proxy/IP/UA unit tests |
| `src/lib/auth/actions.ts` | modified — meta capture, settings actions |
| `src/lib/auth/actions.test.ts` | modified — new mocks + action tests |
| `src/app/api/account/route.ts` | **new** — authenticated settings payload |
| `src/app/api/account/route.test.ts` | **new** — 401/200 shape |
| `src/components/profil/profile-dialog.tsx` | rewritten — settings shell |
| `src/components/profil/settings-account-panel.tsx` | **new** — identity + forms + actions |
| `src/components/profil/settings-progress-panel.tsx` | **new** — learning progress |
| `src/components/profil/settings-jobs-panel.tsx` | **new** — saved jobs |
| `src/components/profil/settings-security-panel.tsx` | **new** — privacy copy + sessions |
| `src/components/profil/profile-dialog.test.tsx` | **new** — shell, forms, sessions |
| `src/components/auth/user-menu.test.tsx` | modified — accessible name + action mocks |
| `src/components/profil/profile-popup.test.tsx` | modified — accessible name + action/router mocks |
| `src/components/companion/companion-auth.test.tsx` | modified — accessible names + action mock |
| `docs/auth.md` | modified — metadata, endpoint, actions, test note |

---

### Task 1: Pure account view helpers

**Files:**
- Create: `src/lib/auth/account-view.ts`
- Test: `src/lib/auth/account-view.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `interface AccountView { nama: string; email: string; createdAt: string | null }`
  - `interface SessionView { id: string; device: string; ip: string | null; signedIn: string; lastActive: string; current: boolean }`
  - `interface AccountPayload { ok: boolean; account?: AccountView; hasPassword?: boolean; sessions?: SessionView[]; error?: string }`
  - `deviceLabel(userAgent: string | null | undefined): string`
  - `formatAccountDate(value: string | null | undefined): string | null`
  - `formatSessionMoment(value: string | null | undefined): string`
  - `relativeActivity(value: string | null | undefined, now?: Date): string`

- [ ] **Step 1: Write the failing test**

```ts
import {
  deviceLabel,
  formatAccountDate,
  formatSessionMoment,
  relativeActivity,
} from "@/lib/auth/account-view";

describe("account view helpers", () => {
  it("labels the common browsers and systems", () => {
    expect(
      deviceLabel(
        "Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0",
      ),
    ).toBe("Firefox · Linux");
    expect(
      deviceLabel(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140.0.0.0 Safari/537.36",
      ),
    ).toBe("Chrome · Windows");
    expect(
      deviceLabel(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0",
      ),
    ).toBe("Edge · Windows");
  });

  it("never invents a device when the user agent is missing", () => {
    expect(deviceLabel(null)).toBe("Perangkat tidak dikenal");
    expect(deviceLabel("")).toBe("Perangkat tidak dikenal");
  });

  it("formats account dates in Jakarta time", () => {
    expect(formatAccountDate("2026-01-02T00:00:00.000Z")).toBe(
      "2 Januari 2026",
    );
    expect(formatAccountDate(null)).toBeNull();
    expect(formatAccountDate("not-a-date")).toBeNull();
  });

  it("formats a session moment with the Jakarta clock", () => {
    expect(formatSessionMoment("2026-11-10T04:30:00.000Z")).toBe(
      "10 Nov 2026, 11.30",
    );
    expect(formatSessionMoment(null)).toBe("—");
  });

  it("formats recent activity relative to now", () => {
    const now = new Date("2026-11-10T04:05:00.000Z");
    expect(relativeActivity("2026-11-10T04:05:00.000Z", now)).toBe(
      "baru saja",
    );
    expect(relativeActivity("2026-11-10T04:00:00.000Z", now)).toBe(
      "5 menit lalu",
    );
    expect(relativeActivity("2026-11-10T01:00:00.000Z", now)).toBe(
      "3 jam lalu",
    );
    expect(relativeActivity(null, now)).toBe("—");
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npm test -- src/lib/auth/account-view.test.ts`
Expected: FAIL — cannot resolve `@/lib/auth/account-view`.

- [ ] **Step 3: Implement the module**

```ts
export interface AccountView {
  nama: string;
  email: string;
  createdAt: string | null;
}

export interface SessionView {
  id: string;
  device: string;
  ip: string | null;
  signedIn: string;
  lastActive: string;
  current: boolean;
}

export interface AccountPayload {
  ok: boolean;
  account?: AccountView;
  hasPassword?: boolean;
  sessions?: SessionView[];
  error?: string;
}

const BROWSERS: Array<[RegExp, string]> = [
  [/Edg\//, "Edge"],
  [/OPR\//, "Opera"],
  [/Chrome\//, "Chrome"],
  [/Firefox\//, "Firefox"],
  [/Safari\//, "Safari"],
];

const SYSTEMS: Array<[RegExp, string]> = [
  [/Android/, "Android"],
  [/iPhone|iPad|iPod/, "iOS"],
  [/Windows/, "Windows"],
  [/Mac OS X|Macintosh/, "macOS"],
  [/Linux/, "Linux"],
];

function firstMatch(
  value: string,
  table: Array<[RegExp, string]>,
  fallback: string,
): string {
  for (const [pattern, label] of table) {
    if (pattern.test(value)) return label;
  }
  return fallback;
}

export function deviceLabel(userAgent: string | null | undefined): string {
  const ua = userAgent?.trim();
  if (!ua) return "Perangkat tidak dikenal";
  return `${firstMatch(ua, BROWSERS, "Browser")} · ${firstMatch(ua, SYSTEMS, "sistem tidak dikenal")}`;
}

export function formatAccountDate(
  value: string | null | undefined,
): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(date);
}

export function formatSessionMoment(
  value: string | null | undefined,
): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  }).format(date);
}

export function relativeActivity(
  value: string | null | undefined,
  now: Date = new Date(),
): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const minutes = Math.round((date.getTime() - now.getTime()) / 60000);
  if (Math.abs(minutes) < 1) return "baru saja";
  const format = new Intl.RelativeTimeFormat("id-ID", { numeric: "auto" });
  if (Math.abs(minutes) < 60) return format.format(minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return format.format(hours, "hour");
  return format.format(Math.round(hours / 24), "day");
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- src/lib/auth/account-view.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth/account-view.ts src/lib/auth/account-view.test.ts
git commit -m "feat(account): add account view labels and formatters"
```

---

### Task 2: Session metadata, touch, list and revoke

**Files:**
- Create: `migrations/006_account_sessions.sql`
- Modify: `src/lib/auth/session.ts`
- Test: `src/lib/auth/session-settings.test.ts`

**Interfaces:**
- Consumes: `digest` from `@/lib/auth/accounts`.
- Produces:
  - `interface SessionMeta { userAgent?: string | null; clientIp?: string | null }`
  - `createSession(userId: string, previous?: string, meta?: SessionMeta): Promise<string>`
  - `interface AccountSession { id: string; userAgent: string | null; clientIp: string | null; signedIn: string; lastActive: string; expiresAt: string; current: boolean }`
  - `listSessions(userId: string, currentToken?: string): Promise<AccountSession[]>`
  - `revokeUserSession(userId: string, tokenHash: string): Promise<boolean>`
  - `revokeOtherSessions(userId: string, currentToken?: string): Promise<number>`
  - `revokeAllSessions(userId: string): Promise<number>`

- [ ] **Step 1: Add the migration**

```sql
-- Session metadata for the account settings surface. Rows created before this
-- migration backfill their timestamps to migration time; device and IP stay
-- unknown (NULL) instead of being guessed.
ALTER TABLE sessions
  ADD COLUMN user_agent text,
  ADD COLUMN client_ip text,
  ADD COLUMN created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN last_seen_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX sessions_user ON sessions(user_id);
```

Apply it to the test database now (the suite below needs the columns):

```bash
DATABASE_URL="$TEST_DATABASE_URL" npm run db:migrate
```

- [ ] **Step 2: Write the failing integration test**

```ts
/** @jest-environment node */

import { authDatabase } from "@/lib/auth/database";
import { registerAccount } from "@/lib/auth/accounts";
import {
  createSession,
  listSessions,
  readSession,
  revokeOtherSessions,
  revokeUserSession,
} from "@/lib/auth/session";
import { testDatabaseUrl } from "@/lib/auth/test-database";

jest.mock("server-only", () => ({}), { virtual: true });
const testUrl = testDatabaseUrl();
if (testUrl) process.env.DATABASE_URL = testUrl;
const integration = testUrl ? describe : describe.skip;

integration("session settings", () => {
  afterAll(async () => {
    await authDatabase().end();
  });

  beforeEach(async () => {
    await authDatabase().query(
      "DELETE FROM sessions; DELETE FROM users; DELETE FROM auth_attempts;",
    );
  });

  async function account(suffix: string) {
    return registerAccount({
      nama: "Siti Rahma",
      email: `siti-${suffix}@lumina.test`,
      password: "password123",
      consent: true,
    });
  }

  it("records device metadata and marks the current session", async () => {
    const user = await account("meta");
    const current = await createSession(user.id, undefined, {
      userAgent: "Firefox/140",
      clientIp: "103.28.1.2",
    });
    await createSession(user.id, undefined, {
      userAgent: "Chrome/140",
      clientIp: null,
    });

    const rows = await listSessions(user.id, current);
    expect(rows).toHaveLength(2);
    expect(rows.find((row) => row.userAgent === "Firefox/140")).toMatchObject({
      clientIp: "103.28.1.2",
      current: true,
    });
    expect(rows.find((row) => row.userAgent === "Chrome/140")).toMatchObject({
      clientIp: null,
      current: false,
    });
  });

  it("touches last_seen_at at most once per guard window", async () => {
    const user = await account("touch");
    const token = await createSession(user.id);
    await authDatabase().query(
      "UPDATE sessions SET last_seen_at = now() - interval '1 hour' WHERE user_id = $1",
      [user.id],
    );

    await readSession(token);

    const row = (
      await authDatabase().query<{ fresh: boolean }>(
        "SELECT last_seen_at > now() - interval '1 minute' AS fresh FROM sessions WHERE user_id = $1",
        [user.id],
      )
    ).rows[0];
    expect(row.fresh).toBe(true);
  });

  it("revokes only the caller's sessions", async () => {
    const mine = await account("mine");
    const other = await account("other");
    const mineToken = await createSession(mine.id);
    const otherToken = await createSession(other.id);

    const mineRows = await listSessions(mine.id, mineToken);
    expect(await revokeUserSession(mine.id, otherToken)).toBe(false);
    expect(await revokeUserSession(mine.id, mineRows[0].id)).toBe(true);
    expect(await readSession(otherToken)).not.toBeNull();
  });

  it("keeps the current session when revoking the others", async () => {
    const user = await account("others");
    const current = await createSession(user.id);
    await createSession(user.id);

    expect(await revokeOtherSessions(user.id, current)).toBe(1);
    const rows = await listSessions(user.id, current);
    expect(rows).toHaveLength(1);
    expect(rows[0].current).toBe(true);
  });
});
```

- [ ] **Step 3: Run it and watch it fail**

Run: `npm test -- src/lib/auth/session-settings.test.ts`
Expected: FAIL — `createSession` ignores the third argument; `listSessions` is not exported.

- [ ] **Step 4: Implement the session changes**

Replace the top of `src/lib/auth/session.ts` and extend it:

```ts
import "server-only";
import { randomBytes } from "node:crypto";
import { type Account, digest } from "@/lib/auth/accounts";
import { authDatabase } from "@/lib/auth/database";

export const SESSION_COOKIE = "lumina_session";
export const SESSION_MAX_AGE = 60 * 60 * 24;

export interface SessionPayload extends Account {
  exp: number;
}

export interface SessionMeta {
  userAgent?: string | null;
  clientIp?: string | null;
}

export interface AccountSession {
  id: string;
  userAgent: string | null;
  clientIp: string | null;
  signedIn: string;
  lastActive: string;
  expiresAt: string;
  current: boolean;
}

interface SessionRecord {
  token_hash: string;
  user_agent: string | null;
  client_ip: string | null;
  created_at: Date | string;
  last_seen_at: Date | string;
  expires_at: Date | string;
}
```

Change `createSession` to accept metadata:

```ts
export async function createSession(
  userId: string,
  previous?: string,
  meta: SessionMeta = {},
): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  const client = await authDatabase().connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `INSERT INTO sessions
        (token_hash, user_id, expires_at, user_agent, client_ip, created_at, last_seen_at)
       VALUES ($1, $2, now() + interval '24 hours', $3, $4, now(), now())`,
      [digest(token), userId, meta.userAgent ?? null, meta.clientIp ?? null],
    );
    if (previous)
      await client.query("DELETE FROM sessions WHERE token_hash = $1", [
        digest(previous),
      ]);
    await client.query("COMMIT");
    return token;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}
```

In `readSession`, after `if (!row) return null;`, add the guarded touch:

```ts
  await authDatabase()
    .query(
      "UPDATE sessions SET last_seen_at = now() WHERE token_hash = $1 AND last_seen_at < now() - interval '5 minutes'",
      [digest(token)],
    )
    .catch(() => {});
```

Append the new helpers:

```ts
export async function listSessions(
  userId: string,
  currentToken?: string,
): Promise<AccountSession[]> {
  const currentHash = currentToken ? digest(currentToken) : "";
  const rows = (
    await authDatabase().query<SessionRecord>(
      `SELECT token_hash, user_agent, client_ip, created_at, last_seen_at, expires_at
       FROM sessions
       WHERE user_id = $1 AND expires_at > now()
       ORDER BY last_seen_at DESC
       LIMIT 50`,
      [userId],
    )
  ).rows;
  return rows.map((row) => ({
    id: row.token_hash,
    userAgent: row.user_agent,
    clientIp: row.client_ip,
    signedIn: new Date(row.created_at).toISOString(),
    lastActive: new Date(row.last_seen_at).toISOString(),
    expiresAt: new Date(row.expires_at).toISOString(),
    current: row.token_hash === currentHash,
  }));
}

export async function revokeUserSession(
  userId: string,
  tokenHash: string,
): Promise<boolean> {
  const result = await authDatabase().query(
    "DELETE FROM sessions WHERE token_hash = $1 AND user_id = $2",
    [tokenHash, userId],
  );
  return Boolean(result.rowCount);
}

export async function revokeOtherSessions(
  userId: string,
  currentToken?: string,
): Promise<number> {
  const currentHash = currentToken ? digest(currentToken) : null;
  const result = currentHash
    ? await authDatabase().query(
        "DELETE FROM sessions WHERE user_id = $1 AND token_hash <> $2",
        [userId, currentHash],
      )
    : await authDatabase().query(
        "DELETE FROM sessions WHERE user_id = $1",
        [userId],
      );
  return result.rowCount ?? 0;
}

export async function revokeAllSessions(userId: string): Promise<number> {
  const result = await authDatabase().query(
    "DELETE FROM sessions WHERE user_id = $1",
    [userId],
  );
  return result.rowCount ?? 0;
}
```

- [ ] **Step 5: Run the tests**

Run: `npm test -- src/lib/auth/session-settings.test.ts src/lib/auth/session.test.ts`
Expected: PASS when `TEST_DATABASE_URL` is set; both suites skip otherwise.

- [ ] **Step 6: Commit**

```bash
git add migrations/006_account_sessions.sql src/lib/auth/session.ts src/lib/auth/session-settings.test.ts
git commit -m "feat(account): record and manage session metadata"
```

---

### Task 3: Name and password mutations

**Files:**
- Modify: `src/lib/auth/accounts.ts`
- Test: `src/lib/auth/account-settings.test.ts`

**Interfaces:**
- Consumes: `hashPassword`, `checkPassword`, `authDatabase`, `AuthError`.
- Produces:
  - `updateAccountName(userId: string, nama: string): Promise<Account>`
  - `changeAccountPassword(userId: string, current: string, next: string): Promise<void>`

- [ ] **Step 1: Write the failing integration test**

```ts
/** @jest-environment node */

import {
  AuthError,
  authenticatePassword,
  changeAccountPassword,
  registerAccount,
  updateAccountName,
} from "@/lib/auth/accounts";
import { authDatabase } from "@/lib/auth/database";
import { testDatabaseUrl } from "@/lib/auth/test-database";

jest.mock("server-only", () => ({}), { virtual: true });
const testUrl = testDatabaseUrl();
if (testUrl) process.env.DATABASE_URL = testUrl;
const integration = testUrl ? describe : describe.skip;

integration("account settings mutations", () => {
  afterAll(async () => {
    await authDatabase().end();
  });

  beforeEach(async () => {
    await authDatabase().query(
      "DELETE FROM sessions; DELETE FROM users; DELETE FROM auth_attempts;",
    );
  });

  const email = "settings@lumina.test";
  const password = "password123";

  async function user() {
    return registerAccount({
      nama: "Siti Rahma",
      email,
      password,
      consent: true,
    });
  }

  it("renames the account and trims the value", async () => {
    const account = await user();
    const updated = await updateAccountName(account.id, "  Siti Baru  ");
    expect(updated.nama).toBe("Siti Baru");
    const row = (
      await authDatabase().query<{ nama: string }>(
        "SELECT nama FROM users WHERE id = $1",
        [account.id],
      )
    ).rows[0];
    expect(row.nama).toBe("Siti Baru");
  });

  it("rejects an empty name", async () => {
    const account = await user();
    await expect(updateAccountName(account.id, "   ")).rejects.toBeInstanceOf(
      AuthError,
    );
  });

  it("changes the password only with the current one", async () => {
    const account = await user();
    await expect(
      changeAccountPassword(account.id, "salah-password", "password456"),
    ).rejects.toThrow(/password saat ini salah/i);

    await changeAccountPassword(account.id, password, "password456");
    const signedIn = await authenticatePassword(email, "password456");
    expect(signedIn.id).toBe(account.id);
    await expect(authenticatePassword(email, password)).rejects.toThrow();
  });

  it("refuses a password change for a Google-only account", async () => {
    const account = await user();
    await authDatabase().query(
      "UPDATE users SET password_hash = NULL, google_sub = 'google-1' WHERE id = $1",
      [account.id],
    );
    await expect(
      changeAccountPassword(account.id, "anything", "password456"),
    ).rejects.toThrow(/google/i);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npm test -- src/lib/auth/account-settings.test.ts`
Expected: FAIL — the two functions are not exported.

- [ ] **Step 3: Implement the mutations**

Append to `src/lib/auth/accounts.ts`:

```ts
const displayName = z.string().trim().min(1).max(80);

export async function updateAccountName(
  userId: string,
  nama: string,
): Promise<Account> {
  const parsed = displayName.safeParse(nama);
  if (!parsed.success) throw new AuthError("Nama harus 1–80 karakter.");
  const row = (
    await authDatabase().query<Account>(
      `UPDATE users SET nama = $2
       WHERE id = $1
       RETURNING id, email, nama, created_at`,
      [userId, parsed.data],
    )
  ).rows[0];
  if (!row) throw new AuthError("Akun tidak ditemukan.");
  return { ...row, created_at: new Date(row.created_at).toISOString() };
}

export async function changeAccountPassword(
  userId: string,
  current: string,
  next: string,
): Promise<void> {
  const parsed = z
    .object({
      current: z.string().max(128),
      next: z.string().min(8).max(128),
    })
    .safeParse({ current, next });
  if (!parsed.success)
    throw new AuthError("Password baru harus 8–128 karakter.");

  const row = (
    await authDatabase().query<{ password_hash: string | null }>(
      "SELECT password_hash FROM users WHERE id = $1",
      [userId],
    )
  ).rows[0];
  if (!row) throw new AuthError("Akun tidak ditemukan.");
  if (!row.password_hash)
    throw new AuthError(
      "Akun ini masuk lewat Google. Password belum dapat diubah di sini.",
    );
  if (!(await checkPassword(parsed.data.current, row.password_hash)))
    throw new AuthError("Password saat ini salah.");

  await authDatabase().query(
    "UPDATE users SET password_hash = $2 WHERE id = $1",
    [userId, await hashPassword(parsed.data.next)],
  );
}
```

- [ ] **Step 4: Run the tests**

Run: `npm test -- src/lib/auth/account-settings.test.ts`
Expected: PASS when `TEST_DATABASE_URL` is set, skip otherwise.

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth/accounts.ts src/lib/auth/account-settings.test.ts
git commit -m "feat(account): rename accounts and change passwords"
```

---

### Task 4: Request metadata, server actions and `/api/account`

**Files:**
- Modify: `src/lib/server/request.ts`
- Create: `src/lib/server/request-meta.test.ts`
- Modify: `src/lib/auth/actions.ts`
- Modify: `src/lib/auth/actions.test.ts`
- Modify: `src/app/api/auth/google/callback/route.ts`
- Create: `src/app/api/account/route.ts`
- Test: `src/app/api/account/route.test.ts`

**Interfaces:**
- Consumes: Task 2 `SessionMeta`, `listSessions`, `revokeUserSession`, `revokeOtherSessions`, `revokeAllSessions`; Task 3 `updateAccountName`, `changeAccountPassword`.
- Produces:
  - `requestMeta(headers: Pick<Headers, "get">): { userAgent: string | null; clientIp: string | null }`
  - `interface SettingsResult { ok: boolean; error?: string; account?: { nama: string; email: string } }`
  - `updateNama(prev, formData): Promise<SettingsResult>`
  - `changePasswordAction(prev, formData): Promise<SettingsResult>`
  - `revokeSessionAction(tokenHash: string): Promise<SettingsResult>`
  - `logoutEverywhere(): Promise<void>`
  - `GET /api/account` payload matching `AccountPayload`.

- [ ] **Step 1: Write the failing pure test for request metadata**

```ts
import { requestMeta } from "@/lib/server/request";

jest.mock("server-only", () => ({}), { virtual: true });

describe("requestMeta", () => {
  const previous = process.env.TRUST_PROXY;

  afterEach(() => {
    if (previous === undefined) delete process.env.TRUST_PROXY;
    else process.env.TRUST_PROXY = previous;
  });

  it("records the user agent and truncates it", () => {
    const meta = requestMeta(
      new Headers({ "user-agent": "A".repeat(400) }),
    );
    expect(meta.userAgent).toHaveLength(300);
  });

  it("ignores the forwarded IP unless the proxy is trusted", () => {
    process.env.TRUST_PROXY = "false";
    expect(
      requestMeta(new Headers({ "x-lumina-client-ip": "103.28.1.2" }))
        .clientIp,
    ).toBeNull();
  });

  it("records the forwarded IP only when it is valid", () => {
    process.env.TRUST_PROXY = "true";
    expect(
      requestMeta(new Headers({ "x-lumina-client-ip": "103.28.1.2" }))
        .clientIp,
    ).toBe("103.28.1.2");
    expect(
      requestMeta(new Headers({ "x-lumina-client-ip": "not-an-ip" })).clientIp,
    ).toBeNull();
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npm test -- src/lib/server/request-meta.test.ts`
Expected: FAIL — `requestMeta` is not exported.

- [ ] **Step 3: Add the helper**

Append to `src/lib/server/request.ts`:

```ts
export interface RequestMeta {
  userAgent: string | null;
  clientIp: string | null;
}

/** Account metadata for the session list; the IP is proxy-trusted only. */
export function requestMeta(headers: Pick<Headers, "get">): RequestMeta {
  const userAgent = headers.get("user-agent")?.trim() ?? "";
  const ip = headers.get("x-lumina-client-ip")?.trim() ?? "";
  return {
    userAgent: userAgent ? userAgent.slice(0, 300) : null,
    clientIp: process.env.TRUST_PROXY === "true" && isIP(ip) ? ip : null,
  };
}
```

- [ ] **Step 4: Update the actions and their mocks**

In `src/lib/auth/actions.ts`:

a. Imports:

```ts
import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  type Account,
  AuthError,
  authenticatePassword,
  changeAccountPassword,
  consumeAttempt,
  ensureDemoAccount,
  registerAccount,
  updateAccountName,
} from "@/lib/auth/accounts";
import {
  createSession,
  readSession,
  revokeAllSessions,
  revokeOtherSessions,
  revokeSession,
  revokeUserSession,
  SESSION_COOKIE,
  sessionCookieOptions,
} from "@/lib/auth/session";
import { requestMeta } from "@/lib/server/request";
```

b. Add the result shape below `AuthResult`:

```ts
export interface SettingsResult {
  ok: boolean;
  error?: string;
  account?: { nama: string; email: string };
}
```

c. Replace `failure` with the shared shape (structurally compatible with both
result types):

```ts
function failure(error: unknown): { ok: false; error: string } {
  return {
    ok: false,
    error:
      error instanceof AuthError
        ? error.message
        : "Layanan akun sedang tidak tersedia. Coba lagi sebentar.",
  };
}
```

d. Pass metadata in `signedIn`:

```ts
async function signedIn(account: Account): Promise<AuthResult> {
  const jar = await cookies();
  const token = await createSession(
    account.id,
    jar.get(SESSION_COOKIE)?.value,
    requestMeta(await headers()),
  );
  jar.set(SESSION_COOKIE, token, sessionCookieOptions);
  return { ok: true, account: { email: account.email, nama: account.nama } };
}
```

e. Append the settings actions:

```ts
async function currentAccount() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  return { jar, token, session: await readSession(token) };
}

export async function updateNama(
  _prev: SettingsResult | undefined,
  formData: FormData,
): Promise<SettingsResult> {
  try {
    const { session } = await currentAccount();
    if (!session)
      return { ok: false, error: "Sesi berakhir. Masuk lagi untuk melanjutkan." };
    await consumeAttempt(`account:name:${session.id}`, 20, 600000);
    const account = await updateAccountName(
      session.id,
      String(formData.get("nama") ?? ""),
    );
    revalidatePath("/", "layout");
    return { ok: true, account: { nama: account.nama, email: account.email } };
  } catch (error) {
    return failure(error);
  }
}

export async function changePasswordAction(
  _prev: SettingsResult | undefined,
  formData: FormData,
): Promise<SettingsResult> {
  try {
    const { session, token } = await currentAccount();
    if (!session)
      return { ok: false, error: "Sesi berakhir. Masuk lagi untuk melanjutkan." };
    const next = String(formData.get("password") ?? "");
    if (next !== String(formData.get("konfirmasi") ?? ""))
      return { ok: false, error: "Konfirmasi password tidak sama." };
    await consumeAttempt(`account:password:${session.id}`, 5, 900000);
    await changeAccountPassword(
      session.id,
      String(formData.get("current") ?? ""),
      next,
    );
    await revokeOtherSessions(session.id, token);
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

export async function revokeSessionAction(
  tokenHash: string,
): Promise<SettingsResult> {
  try {
    if (!/^[a-f0-9]{64}$/.test(tokenHash))
      return { ok: false, error: "Sesi tidak dikenal." };
    const { session } = await currentAccount();
    if (!session)
      return { ok: false, error: "Sesi berakhir. Masuk lagi untuk melanjutkan." };
    const removed = await revokeUserSession(session.id, tokenHash);
    return removed
      ? { ok: true }
      : { ok: false, error: "Sesi itu sudah tidak aktif." };
  } catch (error) {
    return failure(error);
  }
}

export async function logoutEverywhere(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  try {
    const session = await readSession(token);
    if (session) await revokeAllSessions(session.id);
    else await revokeSession(token);
  } catch {
    throw new Error(
      "Layanan akun sedang tidak tersedia. Coba keluar lagi sebentar.",
    );
  }
  jar.delete(SESSION_COOKIE);
  redirect("/");
}
```

f. Google callback (`src/app/api/auth/google/callback/route.ts`) passes metadata:

```ts
import { requestMeta } from "@/lib/server/request";
// inside the success branch:
const token = await createSession(
  account.id,
  request.cookies.get(SESSION_COOKIE)?.value,
  requestMeta(request.headers),
);
```

g. `src/lib/auth/actions.test.ts` — add `headers` to the `next/headers` mock and the new exports to the module mocks:

```ts
import { cookies, headers } from "next/headers";
jest.mock("next/headers", () => ({ cookies: jest.fn(), headers: jest.fn() }));
jest.mock("@/lib/auth/accounts", () => ({
  AuthError: class AuthError extends Error {},
  consumeAttempt: jest.fn(),
  authenticatePassword: jest.fn(),
  ensureDemoAccount: jest.fn(),
  registerAccount: jest.fn(),
  updateAccountName: jest.fn(),
  changeAccountPassword: jest.fn(),
}));
jest.mock("@/lib/auth/session", () => ({
  SESSION_COOKIE: "lumina_session",
  readSession: jest.fn(),
  revokeSession: jest.fn(),
  revokeUserSession: jest.fn(),
  revokeOtherSessions: jest.fn(),
  revokeAllSessions: jest.fn(),
  createSession: jest.fn(),
  sessionCookieOptions: {},
}));
```

Add a default header in the suite:

```ts
beforeEach(() => {
  jest.mocked(headers).mockResolvedValue(
    new Headers({ "user-agent": "jest" }) as never,
  );
});
```

Import the new actions and add these unit tests:

```ts
import {
  changePasswordAction,
  revokeSessionAction,
  updateNama,
} from "@/lib/auth/actions";

it("refuses settings actions without a session", async () => {
  jest.mocked(cookies).mockResolvedValue({ get: () => undefined } as never);
  jest.mocked(readSession).mockResolvedValue(null);
  await expect(updateNama(undefined, new FormData())).resolves.toMatchObject({
    ok: false,
  });
  await expect(
    changePasswordAction(undefined, new FormData()),
  ).resolves.toMatchObject({ ok: false });
});

it("rejects a mismatched password confirmation before touching the store", async () => {
  jest.mocked(cookies).mockResolvedValue({
    get: () => ({ value: "token" }),
  } as never);
  jest.mocked(readSession).mockResolvedValue({
    id: "user-1",
    email: "siti@lumina.id",
    nama: "Siti",
    created_at: "2026-01-02T00:00:00.000Z",
    exp: 0,
  });
  const form = new FormData();
  form.set("password", "password456");
  form.set("konfirmasi", "password789");
  await expect(changePasswordAction(undefined, form)).resolves.toMatchObject({
    ok: false,
    error: expect.stringMatching(/konfirmasi/i),
  });
});

it("rejects a malformed session id", async () => {
  await expect(revokeSessionAction("../../etc/passwd")).resolves.toMatchObject({
    ok: false,
  });
});
```

- [ ] **Step 5: Write the failing route test**

```ts
/** @jest-environment node */

import { cookies } from "next/headers";
import { GET } from "@/app/api/account/route";
import { authDatabase } from "@/lib/auth/database";
import { getSession } from "@/lib/auth/server-session";
import { listSessions } from "@/lib/auth/session";

jest.mock("next/headers", () => ({ cookies: jest.fn() }));
jest.mock("@/lib/auth/server-session", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/auth/session", () => ({ listSessions: jest.fn() }));
jest.mock("@/lib/auth/database", () => ({ authDatabase: jest.fn() }));

describe("GET /api/account", () => {
  beforeEach(() => {
    jest.mocked(cookies).mockResolvedValue({
      get: () => ({ value: "token" }),
    } as never);
  });

  it("returns 401 without a session", async () => {
    jest.mocked(getSession).mockResolvedValue(null);
    const response = await GET();
    expect(response.status).toBe(401);
  });

  it("returns the account and labelled sessions", async () => {
    jest.mocked(getSession).mockResolvedValue({
      id: "user-1",
      nama: "Siti",
      email: "siti@lumina.id",
      created_at: "2026-01-02T00:00:00.000Z",
      exp: 0,
    });
    jest.mocked(authDatabase).mockReturnValue({
      query: jest.fn().mockResolvedValue({ rows: [{ has_password: true }] }),
    } as never);
    jest.mocked(listSessions).mockResolvedValue([
      {
        id: "a".repeat(64),
        userAgent: "Firefox/140",
        clientIp: "103.28.1.2",
        signedIn: "2026-11-10T04:30:00.000Z",
        lastActive: "2026-11-10T04:30:00.000Z",
        expiresAt: "2026-11-11T04:30:00.000Z",
        current: true,
      },
    ]);

    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      ok: true,
      hasPassword: true,
      account: { nama: "Siti", email: "siti@lumina.id" },
      sessions: [
        {
          device: "Firefox · Linux",
          ip: "103.28.1.2",
          current: true,
        },
      ],
    });
  });
});
```

- [ ] **Step 6: Implement the route**

```ts
import { cookies } from "next/headers";
import { authDatabase } from "@/lib/auth/database";
import { getSession } from "@/lib/auth/server-session";
import { listSessions } from "@/lib/auth/session";
import { deviceLabel } from "@/lib/auth/account-view";

const headers = { "cache-control": "no-store" };

export async function GET() {
  const session = await getSession();
  if (!session)
    return Response.json(
      { ok: false, error: "unauthorized" },
      { status: 401, headers },
    );

  const jar = await cookies();
  const [password, sessions] = await Promise.all([
    authDatabase().query<{ has_password: boolean }>(
      "SELECT password_hash IS NOT NULL AS has_password FROM users WHERE id = $1",
      [session.id],
    ),
    listSessions(session.id, jar.get("lumina_session")?.value),
  ]);

  return Response.json(
    {
      ok: true,
      account: {
        nama: session.nama,
        email: session.email,
        createdAt: session.created_at,
      },
      hasPassword: password.rows[0]?.has_password ?? false,
      sessions: sessions.map((row) => ({
        id: row.id,
        device: deviceLabel(row.userAgent),
        ip: row.clientIp,
        signedIn: row.signedIn,
        lastActive: row.lastActive,
        current: row.current,
      })),
    },
    { headers },
  );
}
```

- [ ] **Step 7: Run the task tests**

```bash
npm test -- src/lib/server/request-meta.test.ts src/lib/auth/actions.test.ts src/app/api/account/route.test.ts
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/lib/server/request.ts src/lib/server/request-meta.test.ts \
  src/lib/auth/actions.ts src/lib/auth/actions.test.ts \
  src/app/api/auth/google/callback/route.ts \
  src/app/api/account/route.ts src/app/api/account/route.test.ts
git commit -m "feat(account): expose settings actions and session payload"
```

---

### Task 5: Settings shell and read-only panels

**Files:**
- Rewrite: `src/components/profil/profile-dialog.tsx`
- Create: `src/components/profil/settings-account-panel.tsx`
- Create: `src/components/profil/settings-progress-panel.tsx`
- Create: `src/components/profil/settings-jobs-panel.tsx`
- Create: `src/components/profil/settings-security-panel.tsx`
- Create: `src/components/profil/profile-dialog.test.tsx`
- Modify: `src/components/auth/user-menu.test.tsx`
- Modify: `src/components/profil/profile-popup.test.tsx`
- Modify: `src/components/companion/companion-auth.test.tsx`

**Interfaces:**
- Consumes: `AccountView`, `SessionView`, `AccountPayload`, `formatAccountDate` from Task 1.
- Produces: `ProfileDialog({ session, section, onOpenChange })` with unchanged `ProfileSection` ids and `SettingsSession` (`{ nama; email; createdAt? }`).

- [ ] **Step 1: Write the failing shell test**

```tsx
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProfileDialog } from "@/components/profil/profile-dialog";

jest.mock("next/link", () => {
  const Link = ({
    children,
    href,
    ...rest
  }: React.ComponentProps<"a"> & { href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  );
  return { __esModule: true, default: Link };
});

jest.mock("@/lib/auth/actions", () => ({
  logout: jest.fn(),
}));

const session = {
  nama: "Siti Rahma",
  email: "siti@lumina.id",
  createdAt: "2026-01-02T00:00:00.000Z",
};

beforeEach(() => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      ok: true,
      account: session,
      hasPassword: true,
      sessions: [],
    }),
  }) as unknown as typeof fetch;
});

beforeAll(() => {
  const target = window.HTMLElement.prototype as unknown as {
    hasPointerCapture?: () => boolean;
    releasePointerCapture?: () => void;
    scrollIntoView?: () => void;
  };
  target.hasPointerCapture ??= () => false;
  target.releasePointerCapture ??= () => {};
  target.scrollIntoView ??= () => {};
});

describe("ProfileDialog settings shell", () => {
  it("opens as Pengaturan and exposes the four sections as tabs", async () => {
    render(
      <ProfileDialog session={session} section="profil" onOpenChange={jest.fn()} />,
    );

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveAccessibleName(/pengaturan/i);
    expect(
      within(dialog).getByRole("tab", { name: /^akun$/i }),
    ).toHaveAttribute("aria-selected", "true");
    expect(
      within(dialog).getByRole("tab", { name: /kemajuan/i }),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole("tab", { name: /lowongan/i }),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole("tab", { name: /privasi/i }),
    ).toBeInTheDocument();
  });

  it("switches panels by click and by arrow key", async () => {
    const user = userEvent.setup();
    render(
      <ProfileDialog session={session} section="profil" onOpenChange={jest.fn()} />,
    );

    const akun = await screen.findByRole("tab", { name: /^akun$/i });
    const kemajuan = screen.getByRole("tab", { name: /kemajuan/i });

    await user.click(kemajuan);
    expect(kemajuan).toHaveAttribute("aria-selected", "true");
    expect(
      screen.getByRole("heading", { name: /kemajuan belajar/i }),
    ).toBeVisible();

    akun.focus();
    await user.keyboard("{ArrowDown}");
    expect(kemajuan).toHaveAttribute("aria-selected", "true");
  });

  it("keeps identity and the created date in the account panel", async () => {
    render(
      <ProfileDialog session={session} section="profil" onOpenChange={jest.fn()} />,
    );

    const dialog = await screen.findByRole("dialog");
    expect(
      within(dialog).getAllByText("siti@lumina.id").length,
    ).toBeGreaterThan(0);
    expect(within(dialog).getByText("2 Januari 2026")).toBeInTheDocument();
    expect(
      within(dialog).getAllByText(/jenis akun/i).length,
    ).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npm test -- src/components/profil/profile-dialog.test.tsx`
Expected: FAIL — the dialog is still titled "Profil saya" and has no tabs.

- [ ] **Step 3: Create the static panels**

`src/components/profil/settings-progress-panel.tsx`:

```tsx
"use client";

import { GraduationCap } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export function ProgressPanel({
  done,
  total,
  pct,
  badges,
}: {
  done: number;
  total: number;
  pct: number;
  badges: string[];
}) {
  return (
    <Card className="gap-0 rounded-xl py-0 ring-1 ring-line">
      <CardHeader className="p-4 pb-0">
        <CardTitle className="flex items-center gap-2 text-sm">
          <GraduationCap aria-hidden className="size-4 text-brand" />
          {done} dari {total} modul selesai
        </CardTitle>
        <CardDescription>
          Progres tersimpan di akunmu, bukan di perangkat ini.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 pt-3">
        <Progress
          value={pct}
          aria-label="Progres belajar"
          className="h-2 bg-panel-2 [&>[data-slot=progress-indicator]]:bg-brand"
        />
        <p className="mt-3 text-dim text-xs">
          {badges.length > 0
            ? `Lencana: ${badges.join(", ")}.`
            : "Belum ada lencana. Selesaikan satu modul untuk mulai."}
        </p>
      </CardContent>
    </Card>
  );
}
```

`src/components/profil/settings-jobs-panel.tsx`:

```tsx
"use client";

import { Briefcase } from "lucide-react";
import { ProfilLoker } from "@/components/profil/profil-loker";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function JobsPanel({ savedCount }: { savedCount: number }) {
  return (
    <Card className="gap-0 rounded-xl py-0 ring-1 ring-line">
      <CardHeader className="p-4 pb-0">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Briefcase aria-hidden className="size-4 text-brand" />
          {savedCount} lowongan tersimpan
        </CardTitle>
        <CardDescription>
          Daftar ini tersimpan di perangkat ini.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 pt-3">
        <ProfilLoker />
      </CardContent>
    </Card>
  );
}
```

`src/components/profil/settings-security-panel.tsx` (privacy copy only in this task):

```tsx
"use client";

import { ShieldCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function SecurityPanel() {
  return (
    <Card className="gap-0 rounded-xl py-0 ring-1 ring-line">
      <CardContent className="p-4">
        <p className="text-dim text-sm leading-relaxed">
          Nama, email, dan metadata sesi (perangkat, IP bila tersedia, waktu
          masuk dan aktivitas terakhir) tersimpan untuk akunmu. Percakapan
          tidak disimpan dalam database akun; progres belajar dan lowongan
          tersimpan tetap di sisi akun dan perangkat ini. Sesi berlaku 24 jam.
        </p>
        <p className="mt-3 flex items-start gap-1.5 text-dim text-xs leading-relaxed">
          <ShieldCheck
            aria-hidden
            className="mt-px size-3.5 shrink-0 text-brand"
          />
          Keluar mencabut sesi ini di server. Verifikasi email dan pemulihan
          password belum tersedia.
        </p>
      </CardContent>
    </Card>
  );
}
```

`src/components/profil/settings-account-panel.tsx` (read-only in this task):

```tsx
"use client";

import { ArrowLeftRight, LogOut } from "lucide-react";
import Link from "next/link";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { logout } from "@/lib/auth/actions";
import { type AccountView, formatAccountDate } from "@/lib/auth/account-view";

export interface SettingsSession {
  nama: string;
  email: string;
  createdAt?: string | null;
}

function initialsFor(nama: string): string {
  const parts = nama.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "L";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0].slice(0, 1)}${parts[parts.length - 1].slice(0, 1)}`.toUpperCase();
}

export function AccountPanel({
  session,
  account,
}: {
  session: SettingsSession;
  account: AccountView | null;
}) {
  const nama = account?.nama ?? session.nama;
  const email = account?.email ?? session.email;
  const created = formatAccountDate(account?.createdAt ?? session.createdAt);

  return (
    <>
      <Card className="gap-0 rounded-xl py-0 ring-1 ring-line">
        <CardContent className="flex flex-wrap items-center gap-3 p-4">
          <Avatar className="size-11 shrink-0">
            <AvatarFallback className="bg-brand-soft font-semibold text-[12px] text-brand-ink">
              {initialsFor(nama)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-sm text-txt">{nama}</p>
            <p className="truncate text-dim text-xs">{email}</p>
          </div>
          <Badge variant="outline" className="shrink-0">
            Akun Lumina
          </Badge>
        </CardContent>
      </Card>

      <Card className="gap-0 rounded-xl py-0 ring-1 ring-line">
        <CardContent className="p-4">
          <dl className="grid gap-3 sm:grid-cols-2">
            <div className="min-w-0">
              <dt className="text-dim text-[11px]">Nama</dt>
              <dd className="truncate text-sm text-txt">{nama}</dd>
            </div>
            <div className="min-w-0">
              <dt className="text-dim text-[11px]">Email</dt>
              <dd className="truncate text-sm text-txt">{email}</dd>
            </div>
            <div className="min-w-0">
              <dt className="text-dim text-[11px]">Jenis akun</dt>
              <dd className="text-sm text-txt">Sesi akun, berlaku 24 jam</dd>
            </div>
            <div className="min-w-0">
              <dt className="text-dim text-[11px]">Profil dibuat</dt>
              <dd className="tabular text-sm text-txt">
                {created ?? "Tidak tersedia"}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline" className="h-10">
          <Link href="/masuk" data-pressable>
            <ArrowLeftRight aria-hidden className="size-4" />
            Ganti akun
          </Link>
        </Button>
        <form action={logout}>
          <Button type="submit" variant="outline" className="h-10">
            <LogOut aria-hidden className="size-4" />
            Keluar
          </Button>
        </form>
      </div>
    </>
  );
}
```

- [ ] **Step 4: Rewrite the dialog shell**

```tsx
"use client";

import {
  Briefcase,
  GraduationCap,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";
import { type KeyboardEvent, useEffect, useRef, useState } from "react";
import { useAccountProgress } from "@/components/belajar/account-progress-context";
import {
  AccountPanel,
  type SettingsSession,
} from "@/components/profil/settings-account-panel";
import { JobsPanel } from "@/components/profil/settings-jobs-panel";
import { ProgressPanel } from "@/components/profil/settings-progress-panel";
import { SecurityPanel } from "@/components/profil/settings-security-panel";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  type AccountPayload,
  type AccountView,
} from "@/lib/auth/account-view";
import { useSavedLoker } from "@/lib/loker/use-saved";
import { MODUS } from "@/lib/modus";
import { BADGE_LABEL } from "@/lib/progress";
import { cn } from "@/lib/utils";

export type ProfileSection = "profil" | "kemajuan" | "loker" | "privasi";

const SECTIONS: Array<{
  id: ProfileSection;
  label: string;
  icon: typeof UserRound;
}> = [
  { id: "profil", label: "Akun", icon: UserRound },
  { id: "kemajuan", label: "Kemajuan", icon: GraduationCap },
  { id: "loker", label: "Lowongan", icon: Briefcase },
  { id: "privasi", label: "Privasi & keamanan", icon: ShieldCheck },
];

const COPY: Record<ProfileSection, { title: string; description: string }> = {
  profil: {
    title: "Akun",
    description: "Identitas akun dan sesi yang sedang aktif.",
  },
  kemajuan: {
    title: "Kemajuan belajar",
    description: "Modul dan lencana yang tersimpan di akunmu.",
  },
  loker: {
    title: "Lowongan tersimpan",
    description: "Lowongan yang kamu simpan di perangkat ini.",
  },
  privasi: {
    title: "Privasi & keamanan",
    description: "Apa yang disimpan dan bagaimana sesi bekerja.",
  },
};

export function ProfileDialog({
  session,
  section,
  onOpenChange,
}: {
  session: SettingsSession;
  section: ProfileSection | null;
  onOpenChange: (open: boolean) => void;
}) {
  const [active, setActive] = useState<ProfileSection>("profil");
  const [account, setAccount] = useState<AccountView | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const { progress, modules } = useAccountProgress();
  const { saved } = useSavedLoker();

  const done = progress?.completedModules.length ?? 0;
  const total = modules.length || MODUS.length;
  const pct = Math.min(100, Math.round((done / total) * 100));
  const badges = Object.entries(BADGE_LABEL)
    .filter(([id]) => progress?.badges.includes(id))
    .map(([, label]) => label);

  useEffect(() => {
    if (section) setActive(section);
  }, [section]);

  useEffect(() => {
    if (section === null) return;
    if (typeof fetch !== "function") return;
    let alive = true;
    setLoadError(null);
    fetch("/api/account", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("account");
        return (await response.json()) as AccountPayload;
      })
      .then((data) => {
        if (!alive) return;
        setAccount(data.account ?? null);
      })
      .catch(() => {
        if (!alive) return;
        setLoadError(
          "Pengaturan akun tidak dapat dimuat. Tutup lalu buka lagi.",
        );
      });
    return () => {
      alive = false;
    };
  }, [section]);

  function moveTab(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const forward = event.key === "ArrowDown" || event.key === "ArrowRight";
    const backward = event.key === "ArrowUp" || event.key === "ArrowLeft";
    if (!forward && !backward && event.key !== "Home" && event.key !== "End")
      return;
    event.preventDefault();
    let next = index;
    if (forward) next = (index + 1) % SECTIONS.length;
    if (backward) next = (index - 1 + SECTIONS.length) % SECTIONS.length;
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = SECTIONS.length - 1;
    setActive(SECTIONS[next].id);
    tabRefs.current[next]?.focus();
  }

  return (
    <Dialog open={section !== null} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="block h-[min(44rem,calc(100dvh-2rem))] w-[min(64rem,calc(100vw-2rem))] max-w-none overflow-hidden rounded-3xl border-0 bg-background p-0 shadow-2xl ring-0 sm:max-w-none"
      >
        <DialogDescription className="sr-only">
          Kelola identitas akun, password, dan sesi yang aktif.
        </DialogDescription>
        <div className="flex h-full min-h-0 flex-col">
          <div className="flex h-14 shrink-0 items-center justify-between border-line border-b px-5">
            <DialogTitle className="font-heading font-medium text-base">
              Pengaturan
            </DialogTitle>
            <DialogClose asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Tutup pengaturan"
                className="rounded-full"
              >
                <X aria-hidden />
              </Button>
            </DialogClose>
          </div>

          <div className="grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)] md:grid-cols-[13.5rem_minmax(0,1fr)] md:grid-rows-1">
            <div
              role="tablist"
              aria-label="Bagian pengaturan"
              aria-orientation="vertical"
              className="grid grid-cols-2 gap-1 border-line border-b p-2 md:flex md:flex-col md:border-r md:border-b-0"
            >
              {SECTIONS.map((item, index) => {
                const Icon = item.icon;
                const selected = active === item.id;
                return (
                  <button
                    key={item.id}
                    ref={(node) => {
                      tabRefs.current[index] = node;
                    }}
                    type="button"
                    role="tab"
                    id={`settings-tab-${item.id}`}
                    aria-selected={selected}
                    aria-controls={`settings-panel-${item.id}`}
                    tabIndex={selected ? 0 : -1}
                    onClick={() => setActive(item.id)}
                    onKeyDown={(event) => moveTab(event, index)}
                    className={cn(
                      "flex h-9 items-center gap-2 rounded-lg px-2.5 text-left text-[13px] transition-colors",
                      selected
                        ? "bg-panel font-medium text-txt shadow-rest"
                        : "text-dim hover:bg-panel-2/60 hover:text-txt",
                    )}
                  >
                    <Icon aria-hidden className="size-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="min-h-0 overflow-y-auto px-5 py-5">
              {loadError ? (
                <Alert role="alert" variant="destructive" className="mb-4">
                  <AlertDescription>{loadError}</AlertDescription>
                </Alert>
              ) : null}

              {SECTIONS.map((item) => (
                <section
                  key={item.id}
                  role="tabpanel"
                  id={`settings-panel-${item.id}`}
                  aria-labelledby={`settings-tab-${item.id}`}
                  hidden={active !== item.id}
                  className="flex flex-col gap-5"
                >
                  <header>
                    <h2 className="font-heading font-medium text-lg text-txt">
                      {COPY[item.id].title}
                    </h2>
                    <p className="mt-1 text-dim text-sm">
                      {COPY[item.id].description}
                    </p>
                  </header>
                  {item.id === "profil" ? (
                    <AccountPanel session={session} account={account} />
                  ) : null}
                  {item.id === "kemajuan" ? (
                    <ProgressPanel
                      done={done}
                      total={total}
                      pct={pct}
                      badges={badges}
                    />
                  ) : null}
                  {item.id === "loker" ? (
                    <JobsPanel savedCount={saved.length} />
                  ) : null}
                  {item.id === "privasi" ? (
                    <SecurityPanel />
                  ) : null}
                </section>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

Do not re-add the old `StoredProgress` type import; the shell now derives
`done`, `total`, `pct`, and `badges` from `useAccountProgress()`.

- [ ] **Step 5: Update the three existing tests**

a. `src/components/auth/user-menu.test.tsx`

Add `next/navigation` mock (Task 6 needs it too, so add it now):

```ts
jest.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: jest.fn() }),
}));
```

Change the dialog assertion:

```ts
expect(dialog).toHaveAccessibleName(/pengaturan/i);
```

b. `src/components/profil/profile-popup.test.tsx`

Add the same `next/navigation` mock. Change:

```ts
const dialog = await screen.findByRole("dialog", { name: /pengaturan/i });
```

Keep the email and `"2 Januari 2026"` assertions — the new Akun panel renders both.

c. `src/components/companion/companion-auth.test.tsx`

Change both accessible-name assertions:

```ts
expect(await screen.findByRole("dialog")).toHaveAccessibleName(/pengaturan/i);
// and the second one at the Kemajuan step
```

Keep `getByText(/jenis akun/i)` and `getByText(/0 dari 12 modul selesai/i)`.

- [ ] **Step 6: Run the shell and consumer tests**

```bash
npm test -- src/components/profil/profile-dialog.test.tsx \
  src/components/auth/user-menu.test.tsx \
  src/components/profil/profile-popup.test.tsx \
  src/components/companion/companion-auth.test.tsx
```

Expected: PASS. If `useAccountProgress` warns about `act`, the fetch promise is resolved after `findByRole`; no change needed.

- [ ] **Step 7: Commit**

```bash
git add src/components/profil/profile-dialog.tsx \
  src/components/profil/settings-account-panel.tsx \
  src/components/profil/settings-progress-panel.tsx \
  src/components/profil/settings-jobs-panel.tsx \
  src/components/profil/settings-security-panel.tsx \
  src/components/profil/profile-dialog.test.tsx \
  src/components/auth/user-menu.test.tsx \
  src/components/profil/profile-popup.test.tsx \
  src/components/companion/companion-auth.test.tsx
git commit -m "feat(profile): rebuild the profile popup as a settings dialog"
```

---

### Task 6: Account forms (name + password)

**Files:**
- Modify: `src/components/profil/settings-account-panel.tsx`
- Modify: `src/components/profil/profile-dialog.tsx`
- Modify: `src/components/profil/profile-dialog.test.tsx`
- Modify: `src/components/auth/user-menu.test.tsx`
- Modify: `src/components/profil/profile-popup.test.tsx`
- Modify: `src/components/companion/companion-auth.test.tsx`

**Interfaces:**
- Consumes: `updateNama`, `changePasswordAction`, `SettingsResult` (Task 4).
- Produces: `AccountPanel({ session, account, hasPassword, onAccountSaved })` where `hasPassword` is `boolean | null` and `onAccountSaved` receives `{ nama; email }`.

- [ ] **Step 1: Extend the failing component test**

First, replace the Task 5 `@/lib/auth/actions` mock at the top of
`profile-dialog.test.tsx` with the full set, and add the router mock the new
panel needs:

```tsx
jest.mock("@/lib/auth/actions", () => ({
  logout: jest.fn(),
  updateNama: jest.fn(),
  changePasswordAction: jest.fn(),
  revokeSessionAction: jest.fn(),
  logoutEverywhere: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: jest.fn() }),
}));
```

Then append the two tests:

```tsx
it("saves a new display name and refreshes the identity row", async () => {
  const { updateNama } = jest.requireMock("@/lib/auth/actions");
  updateNama.mockResolvedValue({
    ok: true,
    account: { nama: "Siti Baru", email: "siti@lumina.id" },
  });
  const user = userEvent.setup();
  render(
    <ProfileDialog session={session} section="profil" onOpenChange={jest.fn()} />,
  );

  const input = await screen.findByLabelText(/nama tampilan/i);
  await user.clear(input);
  await user.type(input, "Siti Baru");
  await user.click(screen.getByRole("button", { name: /simpan nama/i }));

  expect(updateNama).toHaveBeenCalled();
  expect(await screen.findByRole("status")).toHaveTextContent(/diperbarui/i);
  expect(screen.getAllByText("Siti Baru").length).toBeGreaterThan(0);
});

it("shows a password error from the action", async () => {
  const { changePasswordAction } = jest.requireMock("@/lib/auth/actions");
  changePasswordAction.mockResolvedValue({
    ok: false,
    error: "Password saat ini salah.",
  });
  const user = userEvent.setup();
  render(
    <ProfileDialog session={session} section="profil" onOpenChange={jest.fn()} />,
  );

  await user.type(await screen.findByLabelText(/password saat ini/i), "lama");
  await user.type(screen.getByLabelText(/^password baru$/i), "password456");
  await user.type(screen.getByLabelText(/ulangi password baru/i), "password456");
  await user.click(screen.getByRole("button", { name: /ubah password/i }));

  expect(
    (await screen.findAllByText(/password saat ini salah/i)).length,
  ).toBeGreaterThan(0);
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npm test -- src/components/profil/profile-dialog.test.tsx`
Expected: FAIL — no `Nama tampilan` field.

- [ ] **Step 3: Implement the forms**

Replace `settings-account-panel.tsx` with:

```tsx
"use client";

import {
  ArrowLeftRight,
  Loader2,
  LogOut,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  changePasswordAction,
  logout,
  updateNama,
} from "@/lib/auth/actions";
import { type AccountView, formatAccountDate } from "@/lib/auth/account-view";

export interface SettingsSession {
  nama: string;
  email: string;
  createdAt?: string | null;
}

function initialsFor(nama: string): string {
  const parts = nama.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "L";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0].slice(0, 1)}${parts[parts.length - 1].slice(0, 1)}`.toUpperCase();
}

export function AccountPanel({
  session,
  account,
  hasPassword,
  onAccountSaved,
  onPasswordChanged,
}: {
  session: SettingsSession;
  account: AccountView | null;
  hasPassword: boolean | null;
  onAccountSaved: (next: { nama: string; email: string }) => void;
  onPasswordChanged: () => void;
}) {
  const router = useRouter();
  const [nameState, nameAction, namePending] = useActionState(
    updateNama,
    undefined,
  );
  const [passwordState, passwordAction, passwordPending] = useActionState(
    changePasswordAction,
    undefined,
  );
  const passwordForm = useRef<HTMLFormElement>(null);

  const nama = account?.nama ?? session.nama;
  const email = account?.email ?? session.email;
  const created = formatAccountDate(account?.createdAt ?? session.createdAt);

  useEffect(() => {
    if (!nameState?.ok || !nameState.account) return;
    onAccountSaved(nameState.account);
    router.refresh();
  }, [nameState, onAccountSaved, router]);

  useEffect(() => {
    if (!passwordState?.ok) return;
    passwordForm.current?.reset();
    onPasswordChanged();
  }, [passwordState, onPasswordChanged]);

  return (
    <>
      <Card className="gap-0 rounded-xl py-0 ring-1 ring-line">
        <CardContent className="flex flex-wrap items-center gap-3 p-4">
          <Avatar className="size-11 shrink-0">
            <AvatarFallback className="bg-brand-soft font-semibold text-[12px] text-brand-ink">
              {initialsFor(nama)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-sm text-txt">{nama}</p>
            <p className="truncate text-dim text-xs">{email}</p>
          </div>
          <Badge variant="outline" className="shrink-0">
            Akun Lumina
          </Badge>
        </CardContent>
      </Card>

      <Card className="gap-0 rounded-xl py-0 ring-1 ring-line">
        <CardContent className="p-4">
          <dl className="grid gap-3 sm:grid-cols-2">
            <div className="min-w-0">
              <dt className="text-dim text-[11px]">Nama</dt>
              <dd className="truncate text-sm text-txt">{nama}</dd>
            </div>
            <div className="min-w-0">
              <dt className="text-dim text-[11px]">Email</dt>
              <dd className="truncate text-sm text-txt">{email}</dd>
            </div>
            <div className="min-w-0">
              <dt className="text-dim text-[11px]">Jenis akun</dt>
              <dd className="text-sm text-txt">Sesi akun, berlaku 24 jam</dd>
            </div>
            <div className="min-w-0">
              <dt className="text-dim text-[11px]">Profil dibuat</dt>
              <dd className="tabular text-sm text-txt">
                {created ?? "Tidak tersedia"}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card className="gap-0 rounded-xl py-0 ring-1 ring-line">
        <CardHeader className="p-4 pb-0">
          <CardTitle className="text-sm">Nama tampilan</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-3">
          <form action={nameAction} className="flex flex-col gap-2 sm:flex-row">
            <div className="min-w-0 flex-1">
              <Label htmlFor="settings-nama" className="sr-only">
                Nama tampilan
              </Label>
              <Input
                id="settings-nama"
                name="nama"
                defaultValue={nama}
                maxLength={80}
                autoComplete="name"
                className="h-10 rounded-xl"
              />
            </div>
            <Button
              type="submit"
              disabled={namePending}
              className="h-10 rounded-xl"
            >
              {namePending ? (
                <Loader2 aria-hidden className="size-4 animate-spin" />
              ) : null}
              Simpan nama
            </Button>
          </form>
          {nameState?.ok ? (
            <p role="status" className="mt-2 text-brand-ink text-xs">
              Nama diperbarui.
            </p>
          ) : null}
          {nameState?.error ? (
            <p role="alert" className="mt-2 text-danger text-xs">
              {nameState.error}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card className="gap-0 rounded-xl py-0 ring-1 ring-line">
        <CardHeader className="p-4 pb-0">
          <CardTitle className="text-sm">Password</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-3">
          {hasPassword === null ? (
            <p className="text-dim text-xs">Memeriksa pengaturan akun…</p>
          ) : hasPassword ? (
            <form
              ref={passwordForm}
              action={passwordAction}
              className="flex flex-col gap-3"
            >
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="settings-current">Password saat ini</Label>
                <Input
                  id="settings-current"
                  name="current"
                  type="password"
                  autoComplete="current-password"
                  className="h-10 rounded-xl"
                  required
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="settings-new">Password baru</Label>
                  <Input
                    id="settings-new"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    maxLength={128}
                    className="h-10 rounded-xl"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="settings-confirm">
                    Ulangi password baru
                  </Label>
                  <Input
                    id="settings-confirm"
                    name="konfirmasi"
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    maxLength={128}
                    className="h-10 rounded-xl"
                    required
                  />
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="submit"
                  disabled={passwordPending}
                  className="h-10 rounded-xl"
                >
                  {passwordPending ? (
                    <Loader2 aria-hidden className="size-4 animate-spin" />
                  ) : null}
                  Ubah password
                </Button>
                <p className="text-dim text-[11px]">
                  Sesi lain dikeluarkan setelah password berubah.
                </p>
              </div>
              {passwordState?.ok ? (
                <p role="status" className="text-brand-ink text-xs">
                  Password diperbarui. Sesi lain sudah dikeluarkan.
                </p>
              ) : null}
              {passwordState?.error ? (
                <p role="alert" className="text-danger text-xs">
                  {passwordState.error}
                </p>
              ) : null}
            </form>
          ) : (
            <p className="flex items-start gap-1.5 text-dim text-xs leading-relaxed">
              <ShieldCheck
                aria-hidden
                className="mt-px size-3.5 shrink-0 text-brand"
              />
              Akun ini masuk lewat Google, jadi belum punya password Lumina.
              Perubahan password belum tersedia di sini.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline" className="h-10">
          <Link href="/masuk" data-pressable>
            <ArrowLeftRight aria-hidden className="size-4" />
            Ganti akun
          </Link>
        </Button>
        <form action={logout}>
          <Button type="submit" variant="outline" className="h-10">
            <LogOut aria-hidden className="size-4" />
            Keluar
          </Button>
        </form>
      </div>
    </>
  );
}
```

In `profile-dialog.tsx`, make these five edits.

1. Replace the React import with:

```tsx
import {
  type KeyboardEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
```

2. After the `account` state, add:

```tsx
const [hasPassword, setHasPassword] = useState<boolean | null>(null);
const [reloadKey, setReloadKey] = useState(0);
```

Then change the fetch effect dependency from `[section]` to
`[section, reloadKey]` so a password change can refresh the session list.

3. Inside the fetch `.then` callback, directly after
`setAccount(data.account ?? null)`, add:

```tsx
setHasPassword(
  typeof data.hasPassword === "boolean" ? data.hasPassword : null,
);
```

4. Immediately before the component's `return (`, add:

```tsx
const handleAccountSaved = useCallback(
  (next: { nama: string; email: string }) =>
    setAccount((current) => ({
      nama: next.nama,
      email: next.email,
      createdAt: current?.createdAt ?? session.createdAt ?? null,
    })),
  [session.createdAt],
);

const handlePasswordChanged = useCallback(() => {
  setReloadKey((key) => key + 1);
}, []);
```

5. Replace the `AccountPanel` call with:

```tsx
<AccountPanel
  session={session}
  account={account}
  hasPassword={hasPassword}
  onAccountSaved={handleAccountSaved}
  onPasswordChanged={handlePasswordChanged}
/>
```

- [ ] **Step 4: Update the consumer test mocks**

The dialog now calls `useActionState` with `updateNama` and
`changePasswordAction`, and `useRouter`. Add them to every consumer mock:

`user-menu.test.tsx` and `profile-popup.test.tsx`:

```ts
jest.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: jest.fn() }),
}));

jest.mock("@/lib/auth/actions", () => ({
  logout: jest.fn(),
  updateNama: jest.fn(),
  changePasswordAction: jest.fn(),
  revokeSessionAction: jest.fn(),
  logoutEverywhere: jest.fn(),
}));
```

`companion-auth.test.tsx` already mocks `next/navigation`; extend its actions mock:

```ts
jest.mock("@/lib/auth/actions", () => ({
  login: jest.fn(),
  register: jest.fn(),
  logout: jest.fn(),
  updateNama: jest.fn(),
  changePasswordAction: jest.fn(),
  revokeSessionAction: jest.fn(),
  logoutEverywhere: jest.fn(),
}));
```

`profile-dialog.test.tsx` already has the full mock from Step 1.

- [ ] **Step 5: Run the tests**

```bash
npm test -- src/components/profil/profile-dialog.test.tsx \
  src/components/auth/user-menu.test.tsx \
  src/components/profil/profile-popup.test.tsx \
  src/components/companion/companion-auth.test.tsx
```

Expected: PASS, including the two new form tests.

- [ ] **Step 6: Commit**

```bash
git add src/components/profil/settings-account-panel.tsx \
  src/components/profil/profile-dialog.tsx \
  src/components/profil/profile-dialog.test.tsx \
  src/components/auth/user-menu.test.tsx \
  src/components/profil/profile-popup.test.tsx \
  src/components/companion/companion-auth.test.tsx
git commit -m "feat(profile): edit display name and password in settings"
```

---

### Task 7: Session list and revocation

**Files:**
- Modify: `src/components/profil/settings-security-panel.tsx`
- Modify: `src/components/profil/profile-dialog.tsx`
- Modify: `src/components/profil/profile-dialog.test.tsx`

**Interfaces:**
- Consumes: `SessionView`, `relativeActivity` (Task 1); `revokeSessionAction`, `logoutEverywhere` (Task 4).
- Produces: `SecurityPanel({ sessions })` with an accessible session list and per-session revoke.

- [ ] **Step 1: Write the failing test**

Append to `profile-dialog.test.tsx`:

```tsx
it("lists active sessions and revokes another device", async () => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      ok: true,
      account: session,
      hasPassword: true,
      sessions: [
        {
          id: "a".repeat(64),
          device: "Firefox · Linux",
          ip: "103.28.1.2",
          signedIn: "2026-11-10T04:30:00.000Z",
          lastActive: "2026-11-10T04:30:00.000Z",
          current: true,
        },
        {
          id: "b".repeat(64),
          device: "Chrome · Windows",
          ip: null,
          signedIn: "2026-10-13T15:23:00.000Z",
          lastActive: "2026-10-13T15:23:00.000Z",
          current: false,
        },
      ],
    }),
  }) as unknown as typeof fetch;
  const { revokeSessionAction } = jest.requireMock("@/lib/auth/actions");
  revokeSessionAction.mockResolvedValue({ ok: true });

  const user = userEvent.setup();
  render(
    <ProfileDialog session={session} section="privasi" onOpenChange={jest.fn()} />,
  );

  expect(
    (await screen.findAllByText(/firefox · linux/i)).length,
  ).toBeGreaterThan(0);
  expect(screen.getAllByText(/chrome · windows/i).length).toBeGreaterThan(0);
  expect(screen.getAllByText(/sesi ini/i).length).toBeGreaterThan(0);
  expect(screen.getAllByText(/ip tidak tercatat/i).length).toBeGreaterThan(0);

  await user.click(
    screen.getByRole("button", { name: /keluarkan chrome · windows/i }),
  );

  expect(revokeSessionAction).toHaveBeenCalledWith("b".repeat(64));
  await waitFor(() =>
    expect(screen.queryByText(/chrome · windows/i)).toBeNull(),
  );
  expect(
    screen.getByRole("button", { name: /keluar dari semua perangkat/i }),
  ).toBeInTheDocument();
});
```

Add `waitFor` to the Testing Library import at the top of the file.

- [ ] **Step 2: Run it and watch it fail**

Run: `npm test -- src/components/profil/profile-dialog.test.tsx -t "lists active sessions"`
Expected: FAIL — no session list.

- [ ] **Step 3: Implement the session list**

Replace `settings-security-panel.tsx` with:

```tsx
"use client";

import { Loader2, LogOut, MonitorSmartphone, ShieldCheck } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  type SessionView,
  formatSessionMoment,
  relativeActivity,
} from "@/lib/auth/account-view";
import { logoutEverywhere, revokeSessionAction } from "@/lib/auth/actions";

export function SecurityPanel({
  sessions,
}: {
  sessions: SessionView[] | null;
}) {
  const [items, setItems] = useState<SessionView[]>(sessions ?? []);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setItems(sessions ?? []);
  }, [sessions]);

  function revoke(id: string) {
    setError(null);
    startTransition(async () => {
      const result = await revokeSessionAction(id);
      if (result.ok) setItems((current) => current.filter((s) => s.id !== id));
      else setError(result.error ?? "Sesi tidak dapat dikeluarkan.");
    });
  }

  return (
    <>
      <Card className="gap-0 rounded-xl py-0 ring-1 ring-line">
        <CardContent className="p-4">
          <p className="text-dim text-sm leading-relaxed">
            Nama, email, dan metadata sesi (perangkat, IP bila tersedia, waktu
            masuk dan aktivitas terakhir) tersimpan untuk akunmu. Percakapan
            tidak disimpan dalam database akun; progres belajar dan lowongan
            tersimpan tetap di sisi akun dan perangkat ini. Sesi berlaku 24 jam.
          </p>
          <p className="mt-3 flex items-start gap-1.5 text-dim text-xs leading-relaxed">
            <ShieldCheck
              aria-hidden
              className="mt-px size-3.5 shrink-0 text-brand"
            />
            Keluar mencabut sesi ini di server. Verifikasi email dan pemulihan
            password belum tersedia.
          </p>
        </CardContent>
      </Card>

      <Card className="gap-0 rounded-xl py-0 ring-1 ring-line">
        <CardHeader className="p-4 pb-0">
          <CardTitle className="flex items-center gap-2 text-sm">
            <MonitorSmartphone aria-hidden className="size-4 text-brand" />
            Sesi & perangkat
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-3">
          {sessions === null ? (
            <p className="flex items-center gap-2 text-dim text-xs">
              <Loader2 aria-hidden className="size-3.5 animate-spin" />
              Memuat sesi…
            </p>
          ) : items.length === 0 ? (
            <p className="text-dim text-xs">Tidak ada sesi aktif lain.</p>
          ) : (
            <ul className="divide-y divide-line">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-wrap items-start justify-between gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 text-sm text-txt">
                      {item.device}
                      {item.current ? (
                        <Badge variant="secondary" className="shrink-0">
                          Sesi ini
                        </Badge>
                      ) : null}
                    </p>
                    <p className="mt-1 text-dim text-[11px]">
                      {item.ip ?? "IP tidak tercatat"} · Masuk{" "}
                      {formatSessionMoment(item.signedIn)} · Aktif{" "}
                      {relativeActivity(item.lastActive)}
                    </p>
                  </div>
                  {item.current ? null : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={pending}
                      onClick={() => revoke(item.id)}
                      aria-label={`Keluarkan ${item.device}`}
                    >
                      Keluarkan
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}

          {error ? (
            <Alert role="alert" variant="destructive" className="mt-3">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <form action={logoutEverywhere} className="mt-4">
            <Button type="submit" variant="outline" className="h-10">
              <LogOut aria-hidden className="size-4" />
              Keluar dari semua perangkat
            </Button>
          </form>
        </CardContent>
      </Card>
    </>
  );
}
```

In `profile-dialog.tsx`, make these four edits:

1. Add `type SessionView` to the account-view import.
2. After the `hasPassword` state, add:

```tsx
const [sessions, setSessions] = useState<SessionView[] | null>(null);
```

3. In the fetch effect, set the sessions in all three branches:

- After `setAccount(data.account ?? null);` add
  `setSessions(Array.isArray(data.sessions) ? data.sessions : []);`
- Inside `.catch`, before `setLoadError(...)`, add `setSessions([]);`
- Inside the `typeof fetch !== "function"` guard, add `setSessions([]);`
  before `return;`

4. Pass the sessions to the panel:

```tsx
{item.id === "privasi" ? <SecurityPanel sessions={sessions} /> : null}
```

- [ ] **Step 4: Run the tests**

```bash
npm test -- src/components/profil/profile-dialog.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/profil/settings-security-panel.tsx \
  src/components/profil/profile-dialog.tsx \
  src/components/profil/profile-dialog.test.tsx
git commit -m "feat(profile): list and revoke active sessions"
```

---

### Task 8: Docs and full verification

**Files:**
- Modify: `docs/auth.md`

**Interfaces:**
- Consumes: everything above.
- Produces: documentation only.

- [ ] **Step 1: Update `docs/auth.md`**

Replace the session-security paragraph with:

```markdown
Sesi disimpan sebagai hash token di PostgreSQL. Setiap baris juga menyimpan
`user_agent`, `client_ip`, `created_at`, dan `last_seen_at`; IP hanya diisi bila
`TRUST_PROXY=true` dan header `X-Lumina-Client-IP` valid. Cookie sesi HttpOnly
berlaku 24 jam. Login merotasi sesi lama secara atomik; logout mencabut sesi.

`GET /api/account` mengembalikan identitas, status password, dan daftar sesi
aktif (maksimal 50) dengan label perangkat dari user-agent. Tidak ada geolokasi.
Server action `updateNama`, `changePasswordAction`, `revokeSessionAction`, dan
`logoutEverywhere` menangani perubahan; semua mutasi dibatasi `user_id` dari
sesi, bukan dari body permintaan. Mengubah password mencabut semua sesi lain.
Akun Google tanpa password tidak dapat mengubah password di dialog ini.
```

Add to the "Tes" section:

```markdown
Suite sesi dan pengaturan akun memakai `TEST_DATABASE_URL`. Jalankan migrasi
sekali sebelum suite: `DATABASE_URL="$TEST_DATABASE_URL" npm run db:migrate`.
Tanpa variabel itu suite dilewati.
```

- [ ] **Step 2: Run the full gate**

```bash
npm run verify
```

Expected: typecheck, Biome, all Jest suites, and the production build pass. If
`next build` fails because a dev server owns `.next`, stop the dev server by PID
first — never `pkill -f "next dev"`.

- [ ] **Step 3: Manual narrow-width check**

Apply the migration to the development database first (`npm run db:migrate`),
then with `npm run dev`, open `/companion` at 380 px, open the profile menu, and
confirm: the dialog fits, the rail is a 2×2 grid, no horizontal scroll, the
close button is reachable, and each tab panel scrolls inside the dialog.

- [ ] **Step 4: Commit**

```bash
git add docs/auth.md
git commit -m "docs(auth): document account settings and session metadata"
```

---

## Self-review

- **Spec coverage:** layout (Task 5), name (Task 6), password + Google-only
  (Tasks 3/6), session metadata/list/revoke (Tasks 2/7), API (Task 4), privacy
  copy (Tasks 5/7), security scoping (Tasks 3/4), tests (every task), docs
  (Task 8). Non-goals are absent by construction.
- **Placeholders:** none; every new file has full code and every command is
  runnable.
- **Type consistency:** `AccountSession` (server) → `SessionView` (client) via
  the route; `SettingsSession` is the dialog prop; `SettingsResult` is shared by
  all four actions; `requestMeta` returns the fields `SessionMeta` expects.
