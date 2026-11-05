# Live agent pipeline + real voice — design

Date: 2026-11-05
Stream: A (Companion)
Status: approved for implementation

## 1. Problem

The companion currently does this:

```
send() → scoreText()  (0.071 ms)  → setTimeout(420) → composeReply() → one bubble appears
```

Three defects follow from that shape.

a. **The 420 ms is theatre.** Nothing happens during it. A judge who reads the
   source finds `window.setTimeout(…, 420)` and the whole "agent" framing loses
   its footing.
b. **The evidence panel appears all at once.** `docs/plan.md` §3 promises *"panel
   bukti hidup — signal muncul satu per satu, dengan indikator agent mana yang
   sedang jalan."* It does not. Every agent row materialises simultaneously
   after the timeout.
c. **There is no language layer at all.** `composeReply()` picks one of eight
   fixed sentences. It cannot answer "kenapa berbahaya?", cannot vary tone, and
   cannot follow a second question.

## 2. The thesis the interface has to teach

The reference product streams because a model is slow. Lumina's split is
different, and it is the stronger claim:

> **The verdict is instant and deterministic. Only the words wait for a model.**

Everything in this design serves one sentence a judge can repeat back: the score
never waits for the AI. That is why the AI cannot be the judge, and it is why
the product is defensible at all.

Consequence: **no invented delays anywhere.** The trace prints measured
milliseconds, including when they are less than one.

## 3. Contract — `src/lib/contracts/agent-run.ts` (new file)

`ScoreResult` is frozen (§5). This file is additive; nothing in it changes an
existing field, so no other stream is broken by it. It must still be announced
before the commit, per `AGENTS.md` §5.

```ts
export type StageStatus =
  | "menunggu"
  | "berjalan"
  | "selesai"
  | "temuan"
  | "dilewati"
  | "gagal";

/** `voice` is not a detector and does not belong in `AgentId`. */
export type StageId = AgentId | "voice";

export interface AgentStage {
  id: StageId;
  label: string;          // "Identity Agent"
  task: string;           // one line: what it looks for
  status: StageStatus;
  findings: number;       // signals this stage contributed
  ms: number;             // measured, never invented
  note?: string;          // the honest reason when "dilewati" or "gagal"
}

export interface AgentTrace {
  stages: AgentStage[];
  totalMs: number;
}
```

### The payload that leaves the device

```ts
export const VoiceDigestSchema = z.object({
  risk: z.enum(["bersih", "rendah", "mencurigakan", "tinggi"]),
  score: z.number().int().min(0).max(100),
  modusName: z.string(),
  findings: z.array(z.object({
    label: z.string(),
    weight: z.number().min(0).max(1),
  })),
  advice: z.array(z.string()),
  moduleNo: z.number().int().min(1).max(12).nullable(),
  locale: z.literal("id"),
}).strict();
```

`Signal.evidence` is a verbatim quote from the user's message. **The digest has
no field for it.** Plan §11.6a — *"kirim hanya hasil sinyal"* — therefore stops
being a promise and becomes a schema property, enforced by `.strict()` (an extra
key is a `400`) and by a unit test that hashes the digest of a message containing
a phone number, an account number, and a URL and asserts none of those substrings
survive.

This is the single most valuable line of code in the design, because it converts
the privacy claim into an artefact the demo can display.

## 4. One pipeline, two entry points

`src/lib/scoring/score.ts` gains an ordered step list. Both public functions
drive the same list, so the trace cannot drift from the verdict.

```ts
const STEPS: readonly AgentStep[] = [
  { agent: "message",      run: (ctx) => messageSignals(ctx.text) },
  { agent: "link",         run: (ctx) => linkSignals(ctx.text) },
  { agent: "identity",     run: (ctx) => identitySignals(ctx.text) },
  { agent: "conversation", run: (ctx) => conversationSignals(ctx.turns) },
];
```

- `scoreText(input)` = `finalize(runPipeline(input))` — behaviour unchanged.
- `scoreWithTrace(input)` = the same run, recording per-step `ms` and `findings`
  with `performance.now()`, then `finalize` once.

`scoreWithTrace` **measures**; it never computes a score. `finalize` remains the
only place `score`, `risk`, and `signals` are produced.

`ScoreInput` widens by one optional field, `turns?: readonly ScoredTurn[]`, so the
Conversation Agent can see a sequence (§5c). `ScoreInput` lives in `score.ts`, not
in `contracts/`, so this is not a frozen-contract change.

Gate: a test asserts `scoreWithTrace(c).result` deep-equals `scoreText(c)` across
all 43 bench cases, and the bench itself stays 20/20 recall and 0/23 false
positives.

### Decision: the detector stages are not in flight when you see them

The whole pipeline — four detectors plus scoring — runs synchronously in roughly
0.4 ms. Nothing can be rendered while it runs, so a stage is never genuinely
`"berjalan"` for a detector. Pretending otherwise would mean slowing real work to
look busy, which is precisely the `setTimeout(420)` defect this design removes.

Therefore:

a. The four detector rows are **revealed with a stagger after all of them have
   already completed**. The animation is a reveal over true data, not a progress
   simulation. The card header states the true total — `4 pemeriksaan · 0,4 ms` —
   and each row prints its own measured `ms`, so a careful reader sees that these
   were not sequential.
b. `"berjalan"` plus the sweep applies to the **`voice` stage only**, which has
   real latency and is the only thing in the product that makes the user wait.
c. The contract still supports genuine incremental updates: an asynchronous agent
   added later emits `"berjalan"` and the same UI renders it without change.

This is the one place where the design deliberately differs from the reference.
The reference animates because its agents are genuinely slow; animating ours at
the same tempo would be a lie about what the code does.


## 5. The three missing agents

### a. Identity Agent — `src/lib/scoring/identity.ts`

Fully offline, and genuinely new capability rather than a rename of something
present. Rules:

| Rule | Condition | Weight |
|---|---|---|
| `institution-on-mobile` | Names a bank / instansi / kurir from `official-domains.json`, and the only sender number is an ordinary mobile | 0.55 |
| `foreign-claiming-local` | Prefix is not `+62` / `08`, and the text claims an Indonesian institution | 0.60 |
| `shortcode-masquerade` | 4–6 digit sender claiming a bank | 0.50 |
| `forward-artifact` | `Diteruskan` / `Forwarded many times` | 0.25 (context) |

No number in the text is not a failure — it is `status: "dilewati"` with the note
`"Tidak ada nomor untuk diperiksa."` The panel keeps showing a real gap instead
of a fabricated clean sweep, which is the honesty rule from `AGENTS.md` §a.

### b. Link Agent — three additions to `src/lib/scoring/link.ts`

Existing kinds stay: `official`, `typosquat`, `apk-host`, `shortener`,
`risky-tld`, `unknown`. Added:

| Kind | Condition | Weight |
|---|---|---|
| `punycode` | Hostname contains `xn--`, or mixes Latin and non-Latin scripts | 0.60 |
| `credential-path` | Path or query matches `login\|verifikasi\|otp\|pin\|password\|token\|aktivasi\|pulihkan`, on a non-official host | 0.50 |
| `brand-subdomain` | A brand label sits in a subdomain while the registrable domain is not official (`bca.klik-verifikasi.xyz`) | 0.60 |

Ordering rule already in the file applies: brand impersonation resolves before
shortener and TLD styling, because `bit.ly/bca-verif` is both.

### c. Conversation Agent — `src/lib/scoring/conversation.ts`

Today the "combination pass" works inside one message. The proposal promises
*"tahap eskalasi"*, which is a property of a **sequence**. New behaviour: given
the session's scored turns, detect an ordered escalation —

```
approach (kenalan / tawaran) → trust (otoritas / janji) → demand (uang / data) → urgency (sekarang / blokir)
```

— and emit one signal only when the stages occur **in that order**. A single
message cannot contain an escalation:

`status: "dilewati"`, note `"Butuh pesan kedua untuk menilai tahapan."`

## 6. Voice route — `src/app/api/companion/voice/route.ts`

- `POST`, body validated by `VoiceDigestSchema.strict()`; unknown key → `400`.
- Any OpenAI-compatible endpoint, configured only by environment:
  `LUMINA_LLM_URL`, `LUMINA_LLM_MODEL`, `LUMINA_LLM_KEY`. None committed;
  `.env.example` documents them.
- System prompt constrains the model to: Bahasa Indonesia; never blame the
  victim; never invent a finding not in `findings`; never call anything safe
  beyond the findings; at most three sentences; name the strongest finding by
  its label.
- Streams tokens as plain text chunks through a `ReadableStream`.
- Unset, non-200, or slower than 6 s → `503`; the client falls back to
  `composeReply()`. Plan §3c: *"Demo tidak boleh bergantung pada API pihak
  ketiga yang hidup."*
- `export const runtime = "nodejs"`; no caching.

A live OpenAI-compatible endpoint already exists on this machine
(`127.0.0.1:20138/v1/models` → `200`), so the demo runs against a real model
with no secret in the repository.

## 7. Interface

### a. Trace card — `src/components/companion/agent-trace.tsx`

Composed from two reference components, not invented: the collapsible shell of
`ToolRunSummary.vue` and the step list of `TaskPlanCard.vue`.

**Header** — extracted values: min-height 30px, padding 4/8, 1px border at 9%
ink, radius 8, font 11px, gap 7px, chevron 11px rotating to 90° when open, icon
13px, count at weight 500, live `•••` in ink at 70% while the voice stage runs,
✓ 14px when the run is complete, and the measured total on the right.

**Body** — `grid-template-rows: 0fr → 1fr`, 220 ms
`cubic-bezier(0.22, 1, 0.36, 1)`, opacity 150 ms, `translateY(-4px)` on enter.
Both curves are copied from the reference.

**Rows** — fixed 14px glyph column (`✓ ◉ ○ –`), label 12px, note muted, measured
`ms` right-aligned in tabular figures.

### b. Thinking row — `src/components/companion/thinking-row.tsx`

From `LiveReasoningStatus.vue`: 40px avatar, label 15px at weight 600 with the
reference's 300% / 2.2 s shimmer, elapsed seconds beside it. Rendered **only
while the model is streaming**, because that is the only real wait in the product.

The shimmer runs in ink, not in an accent colour: on a surface where colour means
risk, a coloured shimmer reads as a warning.

### c. Evidence panel goes live

`SignalPanel` consumes `AgentTrace`. Each agent row moves
`menunggu → berjalan → n temuan` as the pipeline reports, instead of the whole
panel appearing at once. This is the `plan.md` §3 promise that is currently
unkept.

### d. Disclosure — "Apa yang dikirim ke model"

One collapsed row under the trace that prints the exact JSON body. One click. It
answers the judge's hardest question without a slide, and it is the reason the
`evidence`-free digest in §3 is worth the extra schema.

### e. Feedback — `Umpan balik` (proposal §5)

`Benar` / `Keliru` under the score card → `"Catatan ini hanya ada di tab ini dan
hilang saat ditutup."` No storage, no server, ~30 lines. Closes a promised
feature rather than a hoped-for one.

## 8. Motion

Motion is a requirement of this pass, not polish. It is specified as a small set
of jobs so nothing is added that has no meaning.

New tokens in `src/app/globals.css`:

```css
--lumina-ease-out: cubic-bezier(0.22, 1, 0.36, 1);   /* the reference's expand curve */
--lumina-ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
--lumina-dur-quick: 120ms;
--lumina-dur-base: 180ms;
--lumina-dur-reveal: 220ms;
```

| # | Motion | Timing | Job |
|---|---|---|---|
| 1 | Detector row reveals: 6px lift + fade, staggered 45 ms | 180 ms `ease-out` | makes evaluation order legible after the fact (§4 decision) |
| 2 | In-flight stage: 1 px ink underline sweeps the row | 900 ms, ease-in-out, infinite while running | "work is happening" with no invented percentage — the voice stage only |
| 3 | Stage resolves: ○ → ✓ path draw + a single 8% ink flash on the row | 220 ms `ease-spring`, flash 320 ms | confirmation at the moment it becomes true |
| 4 | Findings counter rolls 0 → n | 220 ms | a finding is a countable fact; rolling reads as a tally |
| 5 | Trace collapses to its 30 px summary chip | 260 ms `ease-out`, height morph | leaves without disappearing |
| 6 | Model streaming: ink shimmer + elapsed + 2 px caret blink | 2.2 s shimmer, 1 s blink | the one long wait, declared as a wait |
| 7 | Panel rows stagger in | 40 ms apart | keeps both surfaces visibly in sync |

### Where this improves on the reference

a. **The ink flash on resolve** — the reference has no per-row completion
   ceremony; a row simply changes state. The flash is the moment that catches the
   eye, and it costs one `setTimeout` of CSS class.
b. **A sweep instead of a spinner** — a spinner implies measurable progress; an
   underline sweep is honest about being indeterminate.
c. **The counter rolls** — the reference prints a static count.
d. **The trace collapses** — the reference leaves the tool card expanded, which
   burdens the transcript; collapsing returns the space and keeps the summary.
e. **One axis for all reveals** — vertical, because it encodes order. The
   reference mixes horizontal and vertical reveals across panels.

### Refusals

No confetti, no gold foil, no conic sheen, no embers, no gradient sweep on cards,
no percentage bar for a task that finishes in microseconds, and no looping
animation that outlives its request. `lumina-ui` bans decorative gradients; a
progress affordance that is monochrome ink is not one.

`@media (prefers-reduced-motion: reduce)` drops every transform and stagger to an
opacity-only 120 ms, stops the caret blink, and freezes the shimmer at 60%.

## 9. Honesty constraints

a. The trace prints measured milliseconds. Where the measurement is `0.1`, it
   prints `0,1 ms` — it never rounds up to look busier.
b. An agent with nothing to inspect reports `dilewati` plus its reason. It never
   reports `selesai` with zero findings when it did not run.
c. The model receives findings, never the message. The disclosure shows the
   payload.
d. Nothing in `components/companion/` computes or adjusts `score`, `risk`, or
   `signals` (`AGENTS.md` §4).

## 10. Tests

| File | Asserts |
|---|---|
| `trace.test.ts` | step order; every stage reported; `ms ≥ 0`; skip notes present; deep-equality with `scoreText` across all 43 bench cases |
| `digest.test.ts` | digest of a text containing `0812…`, a rekening number, and a URL retains none of those substrings; `.strict()` rejects an extra key |
| `identity.test.ts` | each rule fires on its case and stays silent on the legitimate counterpart |
| `link.test.ts` | punycode, credential-path, brand-subdomain fire; official domains still resolve first |
| `conversation.test.ts` | ordered escalation fires; two benign turns do not; a single turn is `dilewati` |
| `voice/route.test.ts` | unset env → 503; mocked stream → chunks in order; malformed body → 400 |
| `agent-trace.test.tsx` | 7 stages render; count and status glyphs correct; disclosure prints the payload and not the message |

Bench gate unchanged: **20/20 recall, 0/23 false positives**. If a new rule
flips a legitimate message, tune the weight or add a negative-context guard —
never weaken the rule set.

## 11. Order

1. Contract + `agent-run.ts` + pipeline refactor + parity test. No UI change.
2. `identity.ts`, `link.ts` additions, `conversation.ts`; re-run the bench.
3. Voice route + client fallback + `.env.example`.
4. `agent-trace.tsx`, `thinking-row.tsx`, live `SignalPanel`.
5. Motion tokens and the seven motions.
6. Disclosure + feedback.
7. `npm run verify`, then a browser pass at 380 px and 1440 px.

Steps 1–2 are independently shippable and carry no visual risk.

## 12. Out of scope

The twelve learning modules (Stream B), the simulation runner (Stream C), the PDF
report (Stream D), the Crypto Agent (Fase 2, explicitly not to be built).
