# src/lib/scoring — deterministic verdict engine

## OVERVIEW
The only score producer. Ten detectors collect weighted `Signal`s; `score.ts` normalizes, validates, accumulates, and bands them. Nothing here fetches, calls a model, or reads a clock.

## STRUCTURE
| Area | Files |
|---|---|
| Verdict | `score.ts` (`finalize`, `scoreWithTrace`, `scoreText`, `authorScore`) |
| Detectors | `message`, `link`, `identity`, `conversation`, `email`, `job`, `marketplace`, `qris`, `injection`, `fingerprint` |
| Support | `normalize`, `mechanism`, `validate`, `context`, `extract`, `unicode-host` |
| Measurement | `eval.ts` (`runEval`), `bench-cases.ts`, `bench-v2.ts` (60 scam / 60 legit) |
| Data-only | `detector-ids.ts` (client-safe `DETECTOR_IDS`) |

## WHERE TO LOOK
| Task | File | Notes |
|---|---|---|
| Add a detector | `score.ts:255` `DETECTORS` | Add `detector-ids.ts` entry too; `detector-ids.test.ts` pins order |
| Score math | `score.ts` `accumulate()` | Probabilistic OR, integer 0–100, never sums past 100 |
| Risk bands | `lib/contracts/score.ts` `riskFor()` | Only band source: ≥70 `tinggi`, ≥40 `mencurigakan`, ≥15 `rendah`, else `bersih` |
| Caps/overrides | `score.ts` `finalize()` | `validation.capped` ≤39; `otp-request` hard rule ≥70 |
| Model-authored score | `score.ts` `authorScore()` | Requires grounded consensus; keeps `baselineScore`, `source` |
| Accuracy claims | `eval.ts` `runEval()` | Never quote targets; re-measure after detector edits |

## CONVENTIONS (different from root)
- All matching runs on `normalizeWithMap()` (NFKC, zero-width strip, homoglyph fold); evidence spans remap through `originalSpan()`.
- Detect evidence quotes the user's own words; `label` must never embed message digits.
- `annotateSignal` assigns `ruleId` + `mechanism`; clustering/dedupe keys on `mechanism`.
- `isQuotedWarning()` suppresses matches inside citations; fee rules are scoped per occurrence, not globally.
- `scoreWithTrace` measures only; `finalize` is the single place `score`/`risk`/`signals` are created.
- Tests replace global `fetch` and fail if any detector performs I/O.

## ANTI-PATTERNS (THIS DIRECTORY)
- Never compute or adjust `score`, `risk`, or `signals` outside `score.ts` (routes, components, prompts).
- Do not classify a modus without a positive-weight finding; a clean transfer confirmation must not name a scam module.
- `quishing` needs a real `QR_ACTION`; OTP-delivery text vetoes the OTP-request hard rule.
- Link verification results never write into `signals`; the engine stays offline (URL shape + `official-domains.json`).
- Keep the `bench-cases.ts` comment counts out of docs — `eval.test.ts` 60/60/120 assertions are authoritative.
