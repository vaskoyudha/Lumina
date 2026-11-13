# src/lib/learning — progress, quizzes, spaced review, simulation results

## OVERVIEW
Server actions and SQL for per-account learning progress and simulation results, plus pure scheduling logic (path, practice, review intervals) and the tutor fallback.

## STRUCTURE
| File | Owns |
|---|---|
| `actions.ts` | `"use server"`: `startSimulationIntrusion`, `getAccountProgress`, `submitQuiz`, `submitReview`, `submitSimulation` |
| `store.ts` | `LearningError`, `readAccountProgress`, `saveQuiz`, `saveSimulation`, `recordSimulationIntrusion` |
| `review-store.ts` | `learningTransaction`, `readLearningReviews`, `recordQuizLearning`, `savePractice` |
| `path.ts`, `pattern-map.ts`, `practice.ts`, `review.ts` | Pure selection / SM-2-style scheduling |
| `validation.ts` | Zod submission schemas |
| `tutor.ts` | `tutorContext`, `tutorFallback` |

## WHERE TO LOOK
| Task | File | Notes |
|---|---|---|
| Ownership + limits | `actions.ts` | `getSession` + `consumeAttempt`; all writes use a transaction |
| Advisory lock | `review-store.ts:11` | `pg_advisory_xact_lock(hashtextextended('learning:<userId>',0))` |
| Review interval | `review.ts:2` | `REVIEW_INTERVALS_DAYS`, `dueDate`, `gradeReview` |
| Practice selection | `practice.ts:10` | `selectPractice` from misses/patterns |
| Pattern→quiz coupling | `pattern-map.ts` | Ids must match `src/data/patterns.ts` questions |

## CONVENTIONS (different from root)
- Actions return discriminated `{ ok:true, ... } | { ok:false, error }`; throw `LearningError` in the store.
- Every DB write runs inside `learningTransaction` with the per-user advisory lock.
- Pure logic (`path`, `practice`, `review`, `pattern-map`) has no I/O and is unit-tested directly.
- Server-only store modules import `server-only`; tests mock it `{ virtual: true }`.

## ANTI-PATTERNS (THIS DIRECTORY)
- Never write progress without session ownership and an attempt limit.
- Never return DB errors to the client; map to `LearningError` / Indonesian messages.
- Never trust client-supplied simulation timers; only server receipt time counts.
- Never rename a quiz id or pattern id without updating `src/data/patterns.ts` and its tests.
- Never persist practice drills into `simulation_scenarios`; practice is not a recorded mission.
