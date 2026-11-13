# src/data — static curriculum, patterns, tactics, official lists

## OVERVIEW
Compile-time knowledge: 12 course bodies, the shared module schema, scam patterns, tactics/verify steps/report channels, report contacts, paraphrase templates, and official-domain lists. Runtime curriculum is PostgreSQL; this tree feeds seeding, admin authoring, and scoring inputs.

## STRUCTURE
| Area | Files |
|---|---|
| Curriculum | `modul-01.ts` … `modul-12.ts`, `kurikulum.ts`, `modul-schema.ts` |
| Learning graph | `patterns.ts`, `tactics.ts` (`TACTICS`, `MODUS_TACTICS`, `VERIFY_STEPS`, `REPORT_CHANNELS`) |
| Reporting | `report-contacts.ts`, `scam-templates.ts` |
| Raw JSON | `modus.json`, `official-domains.json` |
| Community fixtures | `community/agent-news.json` |
| Generated | `powder/` — never hand-edit |

## WHERE TO LOOK
| Task | File | Notes |
|---|---|---|
| Add/edit a course | `modul-NN.ts` + `content/competition.json` | Both must match; `modul-11.ts` currently drifts from the bundle |
| Content contract | `modul-schema.ts` | `ModuleContentSchema`, `parseModule`, `ModuleContent`/`QuizQuestion` types |
| Pattern/quiz coupling | `patterns.ts` | `questions[]` are quiz ids inside `moduleNo`; renames break remediation |
| Tactic mapping | `tactics.ts` | Keyed by the 12 ids from `modus.json`; imported by report/explain |
| Official domains | `official-domains.json` | Consumed by `src/lib/scoring/link.ts` |
| Community briefs | `community/agent-news.json` | One brief per `COMMUNITY_AGENT_IDS`; `sourceUrl: null` |

## CONVENTIONS (different from root)
- Module content is plain object literals typed by `ModuleContent`; `modus.json` carries metadata only.
- Indonesian prose, English identifiers, anonymised examples (tests forbid real `08…`/`+62 8` numbers).
- Each module needs ≥1 `contohIsi[].berbahaya: true`; `contohJenis` defaults to `"pesan"`, `contohSumber` required for `"situs"`.
- `report-contacts.ts` stores digits once with `source` + `verifiedAt`; WhatsApp normalized to `62…`.
- `ContentBundleSchema` (`src/lib/content/schema.ts`) rejects duplicate module numbers/scenario ids.

## ANTI-PATTERNS (THIS DIRECTORY)
- Never reintroduce `contohPesan`; never add real hotline digits — use `REPORT_CONTACTS` and re-verify.
- Never claim `modulStatus: "lengkap"` without real content; `kurikulum.test.ts` enforces it.
- Never let `modul-NN.ts` and `content/competition.json` diverge (known drift in module 11).
- Never seed `difficulty` other than `"mudah"`; the schema is a literal.
- Never hand-edit `src/data/powder/*`; it is generated.
