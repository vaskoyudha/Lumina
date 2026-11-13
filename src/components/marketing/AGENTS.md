# src/components/marketing — landing and shared auth/studio UI

## OVERVIEW
Public landing sections, the theme system, the scripted hero companion preview, and the shared auth/studio components mounted by marketing, shell, and companion. The `powder/` subtree is generated reference art.

## STRUCTURE
| Area | Files |
|---|---|
| Shell/theme | `site-header.tsx`, `site-provider.tsx`, `theme-slider.tsx`, `smooth-scroll.tsx`, `section-reveal.tsx`, `stacked-layer.tsx` |
| Sections | `sections/{hero,about,programs,triage,transformation,pricing,faq,contact,footer}.tsx` |
| Demo | `companion-preview.tsx`, `companion-preview-demo.tsx`, `companion-preview-chrome.tsx`, `dot-border-button.tsx` |
| Auth | `marketing-auth.tsx`, `booking-modal.tsx` |
| Shared (also used elsewhere) | `components/auth/*`, `components/studio/studio-chat.tsx` |
| Generated | `powder/` (Framer extraction) — never hand-edit |

## WHERE TO LOOK
| Task | File | Notes |
|---|---|---|
| Theme switch | `theme-slider.tsx` | `.landing[data-theme]`, storage `lumina-theme`, normalizes legacy `warm`→`cream` |
| Reveal contract | `section-reveal.tsx` | Queries `[data-reveal]`; hidden state applied in JS so no-JS stays readable |
| Hero demo | `companion-preview-demo.tsx` | 2071 LOC; drives real `scoreWithTrace`/`buildEvidenceBundle`/`SCENARIOS` |
| Shared preview chrome | `companion-preview-chrome.tsx` | `.lc-preview` remaps app tokens; consumed by Powder Hero/CTA |
| Auth form | `components/auth/login-form.tsx` | `useActionState`, `Field`/`FieldGroup`, Indonesian errors |
| Studio chat | `components/studio/studio-chat.tsx` | `fetch("/api/studio/chat")`, last 8 turns |

## CONVENTIONS (different from root)
- Landing uses only `--ls-*` token utilities; app tokens are off-limits except inside `.lc-preview` remap.
- `data-pressable` marks bespoke controls; hover only for fine pointers.
- Server components: `auth-page`, `auth-feedback`, `sign-in-page`, `google-button`, `sections/triage.tsx`.
- Heavy reference files (`dot-border-button`, `companion-preview*`, `stacked-layer`) rely on client parents; preserve import direction.
- Copy lives in `@/lib/site`; icons are `lucide-react`.

## ANTI-PATTERNS (THIS DIRECTORY)
- Never add a second `.appnext` wrapper or use landing tokens inside the app.
- Do not drop the `warm`→`cream` normalization (old visitors) or refactor the iframe `dot-border-button` blindly.
- Do not move `Triage` into a client component; keep its `.triage-*` CSS names.
- Demo login shows regardless of env; keep the server's graceful `{ ok:false }` failure instead of hiding it.
- Never hand-edit `powder/` or copy its literal colors into token-based sections.
