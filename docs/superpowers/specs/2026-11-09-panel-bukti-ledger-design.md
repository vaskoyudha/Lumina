# Panel Bukti — Ledger Design

**Status:** Approved for implementation · 2026-11-09

## Intent

The right-hand evidence panel currently draws a fixed eight-branch graph. It
under-reports its own work: every detector runs, but `dilewati` is rendered like
“skipped” and excluded from `x/8 agen`. The result state should become an
outcome-grouped evidence ledger that stays honest about all eight agents while
letting the height follow the findings.

## Goals

- Account for all eight agents on every result, including clean and no-object
  stages.
- Lead with the verdict, then coverage, then findings, then absence, then the
  language stage.
- Let finding agents carry their own quotes and a “Lihat di pesan” action.
- Collapse clean and no-object agents into disclosure rows; never collapse a
  failed agent.
- Replace index-derived Q-codes and per-branch “Then → Qn” rows with a stable
  ledger.
- Keep the empty state as a teaching preview of the planned pipeline.

## Non-goals

- No scoring changes, no new trace fields, no dependency additions.
- No tabs, coverage rings, animated agent spawning, or portrait roster.
- No reordering of the pipeline by finding weight.
- No redesign of the left score card in this pass.

## Decisions

1. **Stable coverage, adaptive emphasis.** All eight agents remain represented.
   Findings get full cards; clean/no-object agents collapse into groups.
2. **Findings live with their agents.** The synthesis card becomes a summary,
   not a second findings list.
3. **Outcome vocabulary.** `finding`, `clean`, `no_object`, `failed`, `live`,
   `pending` are derived from the trace status and the surviving signals.
   `dilewati` is rendered as “Tanpa objek”, never “Dilewati” or “skipped”.
4. **No fake graph in the result state.** The measured canvas stays in the empty
   state; the result state uses a vertical ledger. Wires disappear from results
   rather than pretending a topology the engine does not have.
5. **Evidence link.** A finding can select its exact quote in the chat message
   through the existing `EvidenceText` selection.

## Layout

```
Panel bukti
[verdict + score + risk + modus + advice]
[coverage sentence + 8 ticks]
MENEMUKAN · n
  [agent card with findings + quotes + Lihat di pesan]
DIPERIKSA, NIHIL · n        ▸
TANPA OBJEK · n             ▸
BELUM TERCATAT · n          ▸   (only when trace exists)
[gagal cards, always open]
Sintesis temuan · n
  [artifacts]
  [Jejak n tahap · total ms ▸]
[Penyusun bahasa]
[privacy note + emergency link]
```

## Data model

`buildPanelLedger(sequence, trace, findings)` returns:

- `agents`: one `PanelAgent` per sequence entry, in pipeline order.
- `findingAgents`, `cleanAgents`, `noObjectAgents`, `failedAgents`,
  `liveAgents`, `pendingAgents`: filtered views in pipeline order.
- `otherFindings`: positive signals whose agent is not in the sequence.
- `counts`: `checked`, `finding`, `clean`, `noObject`, `failed`, `live`,
  `pending`.

A finding is any signal with `weight > 0`. Agent counts come from those
surviving signals, not from `stage.findings`.

## Acceptance

- Ledger unit tests cover finding, clean, no-object, failed, live, pending, and
  no-trace cases.
- Panel tests assert the coverage sentence, grouped absence rows, finding quotes,
  and the evidence callback.
- `npm run verify` exits 0.
- Visual check at 1440×900 and 380×800: no horizontal overflow; groups open and
  close; finding button selects the message quote.
