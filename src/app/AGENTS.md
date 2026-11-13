# src/app — App Router surfaces

## OVERVIEW
Every URL in Lumina: RSC pages/layouts for the six surfaces plus `robots`/`sitemap`, `globals.css`, and the `api/` route handlers (own guide). Pages compose domain modules; they do not own scoring, sessions, or SQL.

## STRUCTURE
| Dir | Surface |
|---|---|
| `(marketing)/` | Landing shell `.landing[data-theme]`, Powder CSS import, inline pre-paint theme script |
| `(app)/` | Signed-in shell + `/profil`; never add `page.tsx` here (collides with `/`) |
| `(chat)/` | `/companion`, `/agen`, `/belajar[/modul|/latihan]`, `/simulasi[/id]`, `/komunitas[...]` |
| `admin/` | Curriculum workbench, `robots:{index:false}`; unlinked from public nav |
| `studio/` | Allowlisted coding agent (`STUDIO_ALLOWED_IDS`) |
| `masuk/`, `daftar/` | Auth pages rendered by `components/auth/auth-page.tsx` |
| `api/` | Route handlers — see `src/app/api/AGENTS.md` |

## WHERE TO LOOK
| Task | File | Notes |
|---|---|---|
| Token root | `globals.css` | `.appnext` installs app palette once; tests in `globals.test.ts` |
| Root HTML/fonts | `layout.tsx` | `.appnext` on `<body>`; `next/font/local` webfonts |
| Public origin | `robots.ts`, `sitemap.ts` | `await connection()`; origin per request, never `AUTH_URL` at module scope |
| Simulation runner | `(chat)/simulasi/[id]/Runner.tsx` | 1618 LOC client component; timers/pause/submit |
| Simulation catalog | `(chat)/simulasi/page.tsx` | Mission catalog + planned (“Rencana”) levels |
| Module reader | `(chat)/belajar/[modul]/page.tsx` | DB module + prev/next nav |
| Community pages | `(chat)/komunitas/**` | Threads, new post, moderation (404 when not moderator) |

## CONVENTIONS (different from root)
- Export page content separately (`BelajarContent`, `ModulContent`, `CommunityContent`, `ThreadContent`, `SimulasiContent`, `RunnerContent`) so tests render it without the Suspense wrapper.
- Dynamic pages use `export const instant = false` **and** `await connection()` before DB reads: `belajar/[modul]`, `belajar/latihan`, `komunitas/[id]`, `simulasi/[id]`, `admin/[no]`.
- Wrap session/DB reads in `Suspense` with a loading file that renders `WorkspaceFrame`/`ContentLoading`, so shells still prerender.
- Route handlers use plain `Response.json` + a local `fail(status, error)`; only auth redirects use `NextResponse.redirect` with cookies.
- Only `(chat)/simulasi/[id]/Runner.tsx` is `"use client"` in this tree.

## ANTI-PATTERNS (THIS DIRECTORY)
- Never add `export const runtime|dynamic|revalidate` — `cacheComponents: true` rejects them.
- Never copy the hardcoded hex in `(chat)/simulasi/page.tsx` and `Runner.tsx` into new surfaces; they are the documented exception.
- `/api/companion/*` `503 not-configured` when `LUMINA_LLM_URL`/`MODEL` are unset is the demo path, not a bug.
- `/api/loker/scan` relies on `after()`; do not await the lease in-request.
- Unauthorized moderation must `notFound()`, not redirect, so the surface is not disclosed.
