# Identity Agent Orchestrator — Design

Date: 2026-11-11
Status: approved by the request in chat; implementation follows.

## Intent

Lumina's Orchestrator must spawn the **eight identity agents already shown in the
Agents view**, not a separate set of generic "Injection Agent / Message Agent"
cards. Each spawned agent must carry its own profile, tools, and a typed report
that it actually generates from tool evidence:

- bullet points / findings
- the reasoning why the evidence is suspicious
- the pattern or mechanism represented
- what the reader must watch out for

The final score remains deterministic and is never written by a model.

## Identity crew (the eight cards)

| # | id | name | role label | field |
|---|----|------|-----------|-------|
| 01 | message | Mochi | Message Agent | Pesan & rekayasa sosial |
| 02 | link | Bubu | Link Agent | Tautan & domain |
| 03 | identity | Piyo | Identity Agent | Identitas pengirim |
| 04 | conversation | Naga | Conversation Agent | Percakapan & eskalasi |
| 05 | job | Kiko | Lowongan Agent | Lowongan kerja |
| 06 | marketplace | Lala | Marketplace Agent | Jual-beli |
| 07 | qris | Ruru | QRIS Agent | QRIS & pembayaran |
| 08 | evidence | Bao | Evidence Agent | Bukti & pelaporan |

`injection` and `email` remain deterministic safety stages in the scorer and the
right-hand evidence panel, but they are **not** part of the eight identity crew
and are not spawned by the Orchestrator.

## Non-goals

- Do not let a model write or alter `score`, `risk`, or `signals`.
- Do not remove the deterministic evidence panel or the old answer path.
- Do not expose hidden chain-of-thought. The visible `thought` is a short
  intent/reasoning note and is collapsed by default.
- Do not leak raw model JSON into a card or answer.
- Do not require an external agent framework; the existing `fetchChat` boundary
  is enough.

## Decisions

1. **Single server-safe identity projection.** The eight names, fields, portraits,
   and purposes come from one module shared by the panel, the orchestrator, and
   the process trace. A test pins the mapping; no card invents a name.
2. **Planner chooses from the crew only.** It must pick 2–3 relevant identities
   based on baseline signals. No forced `injection` or `evidence` insertion.
3. **Typed report tool.** Each specialist must finish by calling
   `submit_report`. The harness validates the arguments against the evidence it
   received. A malformed or ungrounded report returns a tool error
   (`{ ok: false, error: "invalid-report", issues: [...] }`) and the model gets
   one chance to correct it. This is the Pi-style "the tool declines" behavior.
4. **Grounding rules.** Every point must cite a signal label returned by that
   agent's tools, and an optional quote must occur in the message or signal
   evidence. Duplicate points, invented signals, out-of-range confidence, or a
   report with no points when the tools found signals are rejected.
5. **UI.** The process block stays visible (not collapsed) so the identity cards
   and points are findable. Each agent card shows portrait/initial, name, field,
   role label, purpose, skills, tools, and a "Poin temuan" section with reason,
   pattern chip, and watchout. The "Pemikiran agen" section is collapsed by
   default. Tool arguments/results stay collapsible.
6. **Synthesis.** The synthesizer receives the validated points, patterns, and
   watchouts, and uses them in the answer. The scorer's `advice` remains a
   deterministic fallback, not the agent's reasoning.

## `submit_report` contract

```ts
type ReportPoint = {
  signal: string;   // exact label from a tool signal
  point: string;    // short finding
  reason: string;   // why it matters
  pattern: string;  // mechanism/characteristic
  watchout: string; // what the reader must do/check
  quote?: string;   // optional exact substring
};

type SubmitReport = {
  thought: string;      // short visible intent, max 800
  summary: string;      // max 1200
  points: ReportPoint[];// 0..5; >=1 when signals exist
  watchouts: string[];  // 0..4 cross-point actions
  confidence: number;   // 0..1
};
```

Validation is server-side and deterministic. The tool returns a readable error
list so the model can fix the report; a second failure ends the specialist as
`gagal` rather than inventing a result.

## Event/UI changes

- `agent_start` remains the event that opens a card; the UI resolves the
  identity profile from the shared registry by `agent`.
- `agent_result` gains `points: ReportPoint[]` (default `[]`).
- `ProcessTrace` renders the profile and points, keeps thoughts collapsed.
- Synthesis input includes point/reason/pattern/watchout text.

## Verification

- Unit: identity registry has exactly the eight ids and matching panel data.
- Unit: planner cannot return injection/email; default plan picks crew agents.
- Unit: `submit_report` accepts grounded reports, rejects unknown signal,
  invented quote, invalid confidence, duplicate signal, missing points when
  signals exist, and enforces the retry bound.
- Loop: invalid tool report → tool_error event → corrected report → points in
  `agent_result`; no raw JSON in summary.
- UI: process visible; identity name/field/portrait visible; points visible;
  thoughts collapsed; expanding thoughts shows prose only.
- Live Playwright: send an OTP scam, assert Mochi/Ruru (or another crew pair),
  points/reasons/patterns/watchouts, no Penjaga/Email, score still 100/100.
