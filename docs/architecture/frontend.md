# Frontend Architecture

## 1. Stack

| Layer | Choice | Version |
| --- | --- | --- |
| Framework | Next.js App Router + Turbopack + Cache Components | 16.4.5 |
| UI runtime | React | 19.3.0 |
| Language | TypeScript, strict | 5.x |
| Styling | Tailwind CSS v4, tokens via `@theme inline` | 4.x |
| Components | shadcn/ui on Radix (`radix-nova`) | CLI 4.x |
| Icons | `lucide-react` | 1.x |
| Motion | `motion` (respects reduced motion) | 14.x |
| Notifications | `sonner` | 2.x |
| Themes | `next-themes` | 0.4.x |

Next 16 in this repository has behaviors that differ from older App Router
knowledge:

- `cacheComponents: true` — `export const runtime` and `export const dynamic`
  are rejected. Use `export const instant = false` for dynamic pages, or
  `await connection()` inside a route handler.
- Reading cookies in a layout makes every route dynamic. Wrap the reader in
  `Suspense` (`src/components/shell/nav-with-session.tsx`).
- Read `node_modules/next/dist/docs/` before using a remembered API.

---

## 2. Route map

Route groups do not change the URL. `/` is served by `(marketing)/page.tsx`;
there must not be an `(app)/page.tsx` or the two collide.

| URL | File | Shell | Notes |
| --- | --- | --- | --- |
| `/` | `src/app/(marketing)/page.tsx` | Marketing | Landing with Powder sections and theme switcher. |
| `/masuk` | `src/app/masuk/page.tsx` | None | Email/password + Google sign-in. |
| `/daftar` | `src/app/daftar/page.tsx` | None | Registration. |
| `/profil` | `src/app/(app)/profil/page.tsx` | App | Direct-link fallback; menus open a dialog instead. |
| `/companion` | `src/app/(chat)/companion/page.tsx` | Workspace | Chat + evidence panel + agent crew. |
| `/agen` | `src/app/(chat)/agen/page.tsx` | Workspace | Agent overview. |
| `/belajar` | `src/app/(chat)/belajar/page.tsx` | Workspace | Module catalogue, next step, progress. |
| `/belajar/[modul]` | `src/app/(chat)/belajar/[modul]/page.tsx` | Workspace | Module body and quiz. |
| `/belajar/latihan` | `src/app/(chat)/belajar/latihan/page.tsx` | Workspace | Mixed practice / due review. |
| `/simulasi` | `src/app/(chat)/simulasi/page.tsx` | Workspace | Scenario catalogue and level picker. |
| `/simulasi/[id]` | `src/app/(chat)/simulasi/[id]/page.tsx` | Workspace | Runner (`Runner.tsx`). |
| `/komunitas` | `src/app/(chat)/komunitas/page.tsx` | Workspace | Feed, search, categories, pagination. |
| `/komunitas/baru` | `src/app/(chat)/komunitas/baru/page.tsx` | Workspace | Full editor with source URL. |
| `/komunitas/[id]` | `src/app/(chat)/komunitas/[id]/page.tsx` | Workspace | Thread and replies. |
| `/komunitas/moderasi` | `src/app/(chat)/komunitas/moderasi/page.tsx` | Workspace | Moderator report and verification queues. |
| `/admin` | `src/app/admin/page.tsx` | Admin | Local curriculum workbench, no public nav link. |
| `/admin/[no]` | `src/app/admin/[no]/page.tsx` | Admin | Course editor. |
| `/api/*` | `src/app/api/**/route.ts` | — | See [backend.md](backend.md). |
| `not-found` | `src/app/not-found.tsx` | Root | 404. |
| `robots`, `sitemap` | `src/app/robots.ts`, `sitemap.ts` | — | Generated metadata routes. |

### Layout hierarchy

```
src/app/layout.tsx
  └─ body.appnext  (global tokens, font, Toaster)
     ├─ (marketing)/layout.tsx   SiteProvider + SiteHeader + Footer + ThemeSlider + SmoothScroll
     ├─ (app)/layout.tsx         SiteNav + footer
     ├─ (chat)/layout.tsx        WorkspaceShell (no global nav)
     ├─ admin/layout.tsx         AdminNav
     ├─ masuk/ daftar/           no chrome
     └─ api/                     route handlers
```

`(chat)` contains `companion`, `belajar`, `simulasi`, `komunitas`, and `agen`.
They share a workspace shell: left sidebar, scrolling content column, and a
340 px right rail where the surface needs one.

---

## 3. Shells

### 3.1 Marketing shell

- `SiteProvider` owns landing theme state.
- `SiteHeader`, `Footer`, `ThemeSlider`, `SmoothScroll`.
- Landing palette uses `--ls-*`, not `--lumina-*`.
- Theme persists in `localStorage["lumina-theme"]`; a pre-paint script in the
  marketing layout prevents a flash.
- Powder sections are vendored and Biome-exempt; keep `framer-*` classes intact.

### 3.2 App shell

Used by `/profil`: `SiteNav` + `AuthNav` + footer, `--lumina-*` tokens.

### 3.3 Workspace shell

Used by all four product surfaces. `WorkspaceShell` provides:

- Left navigation rail/sidebar with product destinations and account entry.
- Content column that scrolls independently.
- Optional right rail (evidence, agent brief, community rules).
- Mobile bottom navigation at narrow widths.
- Session-aware account entry via `CompanionAuth` / `UserMenu`.

Account and profile menu items open **floating dialogs** over the current
dashboard (`ProfileDialog`, `ProfilePopup`). They must not navigate to
`/profil`; the route remains a direct-link fallback only.

### 3.4 Admin shell

`AdminNav` and a local-only course editor. Drafts live in the browser; publish
is an export + commit, not a database write. `/admin` is intentionally absent
from public navigation.

### 3.5 Auth shell

`/masuk` and `/daftar` render `AuthPanel` without global chrome. Navigation
surfaces open the same `AuthDialog`, a controlled dialog with Masuk/Daftar
tabs. Three entry points share it:

| Surface | Component | Notes |
| --- | --- | --- |
| Marketing header | `MarketingAuth` | Follows `--ls-*` tokens. |
| App nav | `AuthNav` | Rightmost item after Komunitas. |
| Companion rail/sidebar | `CompanionAuth` | Icon-only; accessible name required. |

---

## 4. Component domains

| Directory | Owns | Representative files |
| --- | --- | --- |
| `components/ui/` | shadcn primitives | `button.tsx`, `dialog.tsx`, `sheet.tsx`, `tabs.tsx` |
| `components/shell/` | navigation, session readers, workspace frame | `workspace-shell.tsx`, `nav-with-session.tsx`, `site-nav.tsx` |
| `components/auth/` | sign-in, registration, user menu | `auth-dialog.tsx`, `auth-panel.tsx`, `user-menu.tsx` |
| `components/brand/` | logo, mascot | `lumina-logo.tsx`, `mascot.tsx` |
| `components/marketing/` | landing, Powder sections | `sections/*`, `powder/*` |
| `components/companion/` | chat, trace, evidence, tools | `companion-chat.tsx`, `agent-run.tsx`, `panel-ledger.ts` |
| `components/belajar/` | dashboard, module body, quiz, progress | `belajar-workspace.tsx`, `modul-body.tsx`, `quiz.tsx` |
| `components/simulasi/` | runner chrome, chat surface, meters | `Runner.tsx` (route), `mission-status-bar.tsx`, `chat/*` |
| `components/community/` | feed, thread, composer, moderation | `community-view.tsx`, `community-explorer.tsx`, `community-editor.tsx` |
| `components/profil/` | profile dialog and settings panels | `profile-dialog.tsx`, `profile-popup.tsx` |
| `components/admin/` | curriculum workbench | `course-editor.tsx`, `quiz-editor.tsx` |

Tests sit beside their source as `*.test.ts(x)`.

---

## 5. Rendering and data flow

### 5.1 Server Components first

Pages fetch through server-only stores (`lib/content/store`, `lib/learning/store`,
`lib/community/store`, `lib/loker/store`). Rows are validated with Zod before
reaching components. Client components receive plain serializable props.

### 5.2 Client boundaries

`"use client"` is used only where interaction, browser APIs, or local scoring
require it:

- Companion chat and scoring (`scoreWithTrace` runs locally).
- Quiz interaction and progress submission.
- Simulation runner (timers, state machine).
- Community composer and optimistic controls.
- Theme and motion.

Keep `server-only` imports out of client modules. A known trap: importing
`belajar-progress.tsx` (which imports a server action) into `ProfileDialog`
pulls a server action into every Jest suite that renders the account menu.
Profile components import only `account-progress-context.tsx`.

### 5.3 Mutations

All writes use Server Actions:

| Domain | Actions |
| --- | --- |
| Auth | `register`, `login`, `logout`, `updateNama`, `changePasswordAction`, `revokeSessionAction`, `logoutEverywhere` |
| Learning | `saveQuiz`, `recordSimulationResult`, `recordIntrusion` |
| Community | `publishPost`, `publishReply`, `deleteContent`, `markHelpful`, `markSaved`, `flagContent`, `moderateContent`, `verifyPost` |
| Companion | `saveConversationHistory`, `listConversationHistory` |

Each action resolves the session server-side and scopes the query by `user_id`.

### 5.4 Client state

| State | Where | Persistence |
| --- | --- | --- |
| Companion transcript | Client memory | Lost when tab closes. |
| Companion history list | Server metadata | Title, turns, risk, timestamps only. |
| Learning progress | PostgreSQL | Per account. |
| Quiz in progress | Component state | Lost on navigation; no mid-attempt resume. |
| Simulation in progress | Component state | Lost on navigation; final result saved. |
| Community draft | Component state | Lost on navigation; never localStorage. |
| Saved job postings | `localStorage` | Per browser, not per account. |
| Landing theme | `localStorage["lumina-theme"]` | Per browser. |
| Admin draft | Browser | Export + commit. |

There is no fallback from account progress to localStorage.

---

## 6. Design tokens

Three token layers exist and must not be mixed.

| Layer | Defined in | Applied to | Used by |
| --- | --- | --- | --- |
| `--lumina-*` | `src/app/globals.css` `:root` | Global | Canonical names; Tailwind utilities `bg-brand`, `text-danger`, `border-line`. |
| `.appnext` | `src/styles/appnext-tokens.css` | Once on `<body>` in `src/app/layout.tsx` | Remaps `--lumina-*` to the light AppNext palette, adds `--appnext-*` and `.appnext-*`. |
| `.landing[data-theme]` | `src/styles/landing-tokens.css` | `(marketing)/layout.tsx` | Three landing palettes (`cream`, `paper`, `black`) via `--ls-*`. |

Rules:

1. Do not add a second `.appnext` wrapper; it duplicates custom properties and
   creates color islands.
2. Do not put hex colors in components. Use mapped utilities.
3. Landing does not use `--lumina-*`; Powder sections use `--pw-*`, which map to
   `--ls-*`.
4. Agent identity colors use `--lumina-agent-<id>` and `-soft` for border/tint;
   status still uses brand/warn/danger/neutral tokens.
5. Elevation uses `shadow-rest`, `shadow-lift`, `shadow-orb`, `shadow-sm`.

Detailed design system: [docs/design-system/appnext.md](../design-system/appnext.md).

---

## 7. Accessibility and responsive rules

The shell must work at **380 px**.

- No horizontal scrolling: verify `document.documentElement.scrollWidth ===
  window.innerWidth`, not just vertical layout.
- Touch targets: rows and key controls are at least 44 px high.
- Icon-only controls require an accessible name (`aria-label` or visually
  hidden text).
- Dialogs use Radix focus trapping; closed content is unmounted.
- Reduced motion is honored with `useReducedMotion()` and `motion-reduce:*`;
  the stagger in `AgentRun` is display-only.
- Long emails, URLs, and evidence strings use `[overflow-wrap:anywhere]`.
- A long email or URL can expand a grid track; add `min-w-0` to the flex/grid
  child and `overflow-x-hidden` to `DialogContent`.

---

## 8. Adding a route or surface

Checklist:

1. Choose the correct route group: marketing, app, chat/workspace, admin, or
   auth. Do not create a second `page.tsx` for `/`.
2. Add the page under `src/app/`. If it reads cookies or the database, follow
   the Next 16 rules (`instant = false`, `connection()`, `Suspense`).
3. Build the UI from `components/ui` and an existing domain directory.
4. Fetch through a server-only store, validate with Zod, pass plain props.
5. Add the destination to the appropriate navigation only if it is a product
   surface. `/admin` stays out of public nav.
6. Add a loading state (`loading.tsx` or `Suspense`) for slow data.
7. Verify at 380 px and at desktop; check keyboard order and focus.
8. Add a colocated test for user-visible behavior, not implementation details.
9. Run `npm run verify`.

## 9. Anti-patterns

- Computing `score`, `risk`, or `signals` in a component. Import the engine.
- Calling an LLM route with the checked message or evidence quote.
- Adding a second `.appnext` wrapper or raw hex colors.
- Linking account menus to `/profil`.
- Storing learning progress or community drafts in `localStorage`.
- Importing a server action into a component that is rendered in unrelated
  Jest suites.
- Adding `export const runtime` or `export const dynamic` in a route/page.
- Adding a public admin link.
