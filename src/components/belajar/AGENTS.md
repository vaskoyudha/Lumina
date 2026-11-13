# src/components/belajar — course reader, progress, practice

## OVERVIEW
Learning UI for `/belajar`: catalog, module reader, quiz, learning path, progress boxes, and practice/remediation. Renders content passed in by the page; persistence goes through `lib/learning` actions.

## STRUCTURE
| Area | Files |
|---|---|
| Workspace/catalog | `belajar-workspace.tsx`, `belajar-dashboard.tsx`, `belajar-shell.tsx`, `modul-katalog.tsx`, `belajar-lencana.tsx` |
| Module body | `modul-body.tsx` (renders `ModuleContent`), `modul-visual.tsx`, `module-progress-box.tsx`, `complete-button.tsx` |
| Quiz/practice | `quiz.tsx`, `latihan.tsx`, `remediation.tsx` |
| Progress | `account-progress-context.tsx`, `belajar-progress.tsx`, `learning-path.tsx`, `level-meter.tsx`, `module-done-mark.tsx` |
| Aside | `belajar-aside.tsx`, `content-state.tsx`, `course-simulation-cta.tsx` |

## WHERE TO LOOK
| Task | File | Notes |
|---|---|---|
| Module render | `modul-body.tsx:338` | Takes parsed `ModuleContent`; previews use the same component |
| Quiz submission | `quiz.tsx:76` | Calls `onAttempt`/`onDone`; ids must match `src/data/patterns.ts` |
| Account progress | `account-progress-context.tsx` | Server-action results; anonymous progress stays device-local |
| Practice drill | `latihan.tsx` + `lib/learning/practice` | Built from misses, not a recorded mission |
| Catalog state | `modul-katalog.tsx` | “Segera” for unwritten modules, never an empty stub |

## CONVENTIONS (different from root)
- Product vocabulary Indonesian (`modul`, `latihan`, `kemajuan`); identifiers English.
- Content is a prop; components do not query the DB.
- Accessible queries in tests; render the real component, mock only navigation.
- Learning-path/remediation derive from `src/data/patterns.ts` ids, so id renames are contract changes.

## ANTI-PATTERNS (THIS DIRECTORY)
- Never claim a module complete without real content; unwritten modules show “Segera”.
- Never persist message text or answers locally as account data; use server actions for account progress.
- Never let a practice drill masquerade as a mission result.
- Never rename quiz/pattern ids here without updating `src/data/patterns.ts` and `lib/learning`.
- Do not hand-edit token colors; use `bg-*`/`text-*` mapped utilities.
