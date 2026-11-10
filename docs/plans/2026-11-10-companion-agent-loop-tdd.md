# Companion bounded agent loop — TDD and verification plan

**Status:** proposed, not implemented
**Scope:** `/api/companion/answer`, `CompanionChat`, local tools, trace
**Baseline:** commit `3fbd2de`; targeted suites green (33 route/contract tests, 55 chat/image/regression/trace tests)

## 1. The invariant this plan must not move

> The checked message, its OCR transcription, attachment filenames, extracted
> URLs, and `Signal.evidence` quotes never leave the browser.

The current route is single-shot. It receives only `question`, chat `history`,
a lossy `VoiceDigest`, and public `modus`/`tactics` facts. `AnswerRequestSchema`
is `.strict()` at every level, so a `message` or `evidence` key is a rejected
request, not a silently dropped field. That property must survive the loop.

The loop does not change what the model can see: it still never receives the
checked message, so it cannot copy one into a `job_search.query` or a report
channel. Observations are built from public postings and local labels; the
only new text is a count and a kind.

## 2. Architecture decision: client-owned loop, route-owned gating

A server-side loop cannot execute `job_search` or `report_draft`: the corpus,
the last `ScoreResult`, the explanation, the attachment objects, and the OCR
text all live in the browser. Moving them server-side would break the invariant.

Therefore the loop mirrors Pi's shape but runs in the browser:

```
browser                                              server
─────────────────────────────────────────────────────────────────────────
local engine + OCR + corpus
  │ build grounding (lossy)                            
  ├─ POST /api/companion/answer  ──────────────────────►  validate strict body
  │     question/history/digest/grounding                  choose allowed tools
  │                                                        one upstream call
  │◄──────────────────────────  text + toolCalls ─────────┘
  │ execute tool locally (filterPostings / open report)
  ├─ POST /api/companion/answer  ──────────────────────►  rebuild assistant+tool
  │     + observation (typed, lossy)                       messages, one call
  │◄──────────────────────────  final text ───────────────┘
  └─ seal one turn, one merged trace
```

- **No `pi-agent-core` dependency for this slice.** The runtime is
  `src/lib/companion/agent-loop.ts`. If Pi is later adopted, it must run on the
  browser side and use the same `executeTool` interface; the contracts below
  stay unchanged.
- **Route never executes a tool.** It validates the observation and reconstructs
  the OpenAI `assistant(tool_calls) → tool` messages. This keeps every tool
  result under the same strict-schema posture as the request.
- **Bounded:** max 3 model calls and max 2 tool executions per turn. The last
  call carries `final: true`, so the route withholds tools and the loop cannot
  run away.
- **Why not a server-side loop?** A server loop is only possible for tools whose
  entire state is public (for example a module lookup). `job_search` needs the
  browser's `LokerCorpus`; `report_draft` needs the browser's last
  `ScoreResult`/`Explanation`; OCR and attachments are browser objects. Keeping
  one loop in the browser avoids two orchestration paths with different privacy
  guarantees.

## 3. Contracts

**Coordination:** `lib/contracts/answer.ts` is marked BEKU in `AGENTS.md`. The
change is additive and defaults keep every existing request valid, but it still
needs Stream A sign-off and a PR note. `app/api` is a shared surface, so the
route change must be called out in the commit/PR. `StageId` is unchanged; the
existing additive `job-search` entry is reused.

### 3.1 New `src/lib/contracts/loop.ts`

```ts
import { z } from "zod";
import { ReportChannelIdSchema } from "@/lib/contracts/report";
import { JobSearchArgsSchema, ReportDraftArgsSchema } from "@/lib/contracts/tool";

export const MAX_TOOL_ROUNDS = 2;
export const MAX_OBSERVATION_POSTINGS = 5;

const PostingObservationSchema = z
  .object({
    title: z.string().min(1).max(200),
    company: z.string().min(1).max(200),
    sentinelStatus: z.enum(["clean", "suspicious", "rejected"]),
    luminaRisk: z.enum(["bersih", "rendah", "mencurigakan", "tinggi"]),
  })
  .strict();

const JobSearchObservationSchema = z
  .object({
    name: z.literal("job_search"),
    callId: z.string().min(1).max(100),
    arguments: JobSearchArgsSchema,
    ok: z.literal(true),
    result: z
      .object({
        count: z.number().int().min(0).max(10_000),
        total: z.number().int().min(0).max(10_000),
        capped: z.boolean(),
        postings: z.array(PostingObservationSchema).max(MAX_OBSERVATION_POSTINGS),
      })
      .strict(),
  })
  .strict();

const ReportObservationSchema = z
  .object({
    name: z.literal("report_draft"),
    callId: z.string().min(1).max(100),
    arguments: ReportDraftArgsSchema,
    ok: z.literal(true),
    result: z
      .object({
        opened: z.literal(true),
        channel: ReportChannelIdSchema.nullable(),
      })
      .strict(),
  })
  .strict();

export const ToolObservationSchema = z.discriminatedUnion("name", [
  JobSearchObservationSchema,
  ReportObservationSchema,
]);

export const GroundingSchema = z
  .object({
    image: z
      .object({
        attempted: z.number().int().min(0).max(8),
        read: z.number().int().min(0).max(8),
        failed: z.number().int().min(0).max(8),
        skipped: z.number().int().min(0).max(8),
        signalLabels: z.array(z.string().min(1).max(120)).max(8),
        score: z.number().int().min(0).max(100).nullable(),
        risk: z.enum(["bersih", "rendah", "mencurigakan", "tinggi"]).nullable(),
      })
      .strict()
      .nullable(),
    attachments: z
      .array(
        z
          .object({
            kind: z.enum(["image", "pdf", "apk", "document", "code", "other"]),
            read: z.boolean(),
          })
          .strict(),
      )
      .max(8),
    links: z.number().int().min(0).max(20),
    evidenceKinds: z
      .array(z.enum(["text", "screenshot", "number", "link", "file"]))
      .max(12),
  })
  .strict();

export type Grounding = z.infer<typeof GroundingSchema>;

export const EMPTY_GROUNDING: Grounding = {
  image: null,
  attachments: [],
  links: 0,
  evidenceKinds: [],
};
```

There is deliberately no `text`, `message`, `evidence`, `quote`, `url`,
`filename`, or `transcription` key anywhere in this file. A model or a buggy
client that tries to add one gets a rejected request.

### 3.2 `src/lib/contracts/answer.ts` (additive only)

```ts
observations: z.array(ToolObservationSchema).max(MAX_TOOL_ROUNDS).default([]),
grounding: GroundingSchema.default(EMPTY_GROUNDING),
final: z.boolean().default(false),
```

`payloadFor()` includes `grounding` for `tanya`, `lanjutan`, and `obrolan`.
`belajar` never receives it: the tutor sees only the module and the question.

### 3.3 Route protocol

`src/app/api/companion/answer/route.ts`:

1. Parse with `AnswerRequestSchema`.
2. Build `gatedTools` from the **original question**, never from an
   observation:
   - `wantsJobSearch(question)` → `job_search`
   - `wantsReportDraft(question)` → `report_draft` (new helper)
   - `belajar` → none
3. Build `offeredTools`: `gatedTools` unless `final === true` or
   `observations.length >= MAX_TOOL_ROUNDS`, in which case it is empty.
4. Reject any observation whose `name` is not in **`gatedTools`** (not
   `offeredTools`): `400 invalid-observation`. A final request still carries
   the observations from earlier steps, so validating them against the
   withheld tool list would reject a legitimate final answer.
5. Build messages:
   ```
   system
   user(JSON payloadFor(data))
   for each observation:
     assistant { content: "", tool_calls: [{ id, type, function: { name, arguments } }] }
     tool      { tool_call_id, content: JSON.stringify(result) }
   ```
6. One upstream call with `tools: offeredTools` (omit when empty). Validate
   returned tool calls exactly as today: unknown name, unknown type, malformed
   JSON, invalid args, or a name not in `offeredTools` → drop. Give every
   emitted call a non-empty id (the model's id or a generated one), because the
   client must return it as `callId`.
7. Return `{ ok: true, text, toolCalls }`.

Update the system prompt: observations and grounding are **metadata about what
was checked**, not message content. The model must answer from counts, kinds,
labels, score, and risk; it must never quote an observation, invent a filename,
or claim to have read a PDF/APK. The existing "isi lampiran tidak tersedia"
rule stays true.

`wantsReportDraft()` moves the inline regex out of the route into
`src/lib/companion/turn.ts` (beside `isQuestionAbout`) and adds negative guards:

```ts
export function wantsReportDraft(text: string): boolean {
  return (
    !/\b(jangan|bukan|nggak|gak|ga|tidak)\b.{0,30}\b(laporan|template)\b/i.test(text) &&
    !isQuestionAbout(text) &&
    /\b(buat(?:kan)?|bikin(?:kan)?|susun(?:kan)?)\b.{0,50}\b(laporan|template)\b/i.test(text)
  );
}
```

This is what makes "apa itu laporan?" and "bagaimana cara buat laporan?"
plain questions rather than template requests.

## 4. Client loop

### 4.1 New `src/lib/companion/agent-loop.ts`

```ts
export interface LoopResult {
  outcome: "model" | "timeout" | "unconfigured" | "failed";
  text: string;
  calls: ToolCall[];
  observations: ToolObservation[];
  terminal: "report" | null;
  toolTrace: {
    calls: number;
    matches: number;
    ms: number;
    failed: boolean;
    note: string;
  } | null;
}

export async function runAgentLoop(input: {
  request: AnswerRequest;
  requestStep?: typeof requestAnswer;
  execute: (call: ToolCall) => Promise<ToolObservation | { terminal: "report" }>;
  signal: AbortSignal;
  maxSteps?: number; // default 3
}): Promise<LoopResult>;
```

Rules:

- Check `signal.aborted` before every step and before every tool execution.
- `final = step === maxSteps - 1` on the last request.
- `report_draft` is terminal: execute once, return, no second model call.
- `job_search` executes locally over `corpus.postings`; observation carries
  only `count`, `total`, `capped`, and at most five
  `{title, company, sentinelStatus, luminaRisk}` records.
- Only the first tool call of a response is executed; extra calls are ignored
  and the trace note gets a `+N diabaikan` suffix.
- If a step fails after a tool ran, keep the tool data for the deterministic
  fallback; never replace a real card with a generic error. If the failed step
  followed a non-empty model preamble, keep that preamble as the lead sentence.
- Merge all `job_search` executions into **one** `job-search` `AgentStage`:
  `status` = `gagal` if any execution failed, `ms` = sum, note =
  `${calls} panggilan · ${matches} lowongan cocok`.

### 4.2 New `src/lib/companion/grounding.ts`

```ts
export function buildGrounding(input: {
  transcription?: { attempted: number; failed: number; skipped: number; text: string };
  attachments?: readonly Attachment[];
  result?: ScoreResult | null;
  evidenceKinds?: readonly ArtifactKind[];
  linkCount?: number;
}): Grounding;
```

- `image.read = attempted - failed - skipped`, clamped to `[0, 8]`; the other
  three counts are also clamped to 8.
- `signalLabels` from `result.signals` with `weight > 0`, max 8.
- Attachment `kind` from MIME type and extension only (`image/*` → image,
  `.pdf` → pdf, `.apk` → apk, `.doc/.docx` → document, known code extensions →
  code, else other); `read` is true only for an image whose transcription is
  non-empty; cap the array at 8. **No filename.**
- `links` is the caller-supplied count from `extractLinks(scored)`, clamped to
  20; the builder never receives `scored`. **No URL.**
- `evidenceKinds` is the deduped `artifact.kind` list. **No value or label.**

The builder never receives `scored` text, so there is no parameter that could
leak it.

### 4.3 `CompanionChat`

- Build `grounding` once per send and store the safe snapshot on the companion
  `Turn` (`Turn.grounding?: Grounding`) only when the turn was checked, so it
  follows `latestResult`; a later `lanjutan` can reuse it
  without re-reading OCR. `latestGrounding` follows the same rule as
  `latestResult`: the last **checked** turn, not the last chat turn, so a later
  question cannot wipe the image/link/attachment context.
- Replace the single `requestAnswer` + inline tool branch with `runAgentLoop`.
- `execute` closes over `corpus`, `latestResult`, `latestExplanation`; it calls
  `filterPostings` and `patchCompanion` for the card, exactly as today.
- Keep one `finish()` seal. The loop returns text; the chat seals once.
  `trace.totalMs` includes the merged tool `ms`; `AgentRun`'s `engineMs`
  subtracts it, so the detector duration stays honest.
- Total deadline: `LOOP_DEADLINE_MS = 35_000` (route per call 20_000).
  `AbortController` is shared across steps; unmount aborts it.
- The job-search phase-2 summary still uses the existing safe
  `ToolSummaryRequestSchema` payload, and only after the loop settles. If the
  loop ran `job_search` twice, the card and summary reflect the last call; the
  trace note records both.
- Chat history still filters `privateIds` and only includes turns with
  `text.trim().length > 0`; an observation is never a history entry.

## 5. Files

### New files

| File | Purpose |
|---|---|
| `src/lib/contracts/loop.ts` | strict observation + grounding schemas |
| `src/lib/contracts/loop.test.ts` | rejects every forbidden key; caps |
| `src/lib/companion/agent-loop.ts` | bounded browser loop |
| `src/lib/companion/agent-loop.test.ts` | sequencing, tools, fallback, abort |
| `src/lib/companion/grounding.ts` | lossy image/link/attachment snapshot |
| `src/lib/companion/grounding.test.ts` | no OCR text / filename / URL |
| `src/lib/companion/answer-client.test.ts` | `buildAnswerRequest` privacy |
| `src/app/api/companion/answer/route.observations.test.ts` | multi-turn route protocol |
| `scripts/verify-companion-live.mjs` | live-URL acceptance harness |
| `scripts/fixtures/companion-scam.png` | deterministic OCR fixture |

### Existing files that must change

| File | Required change |
|---|---|
| `src/lib/contracts/answer.ts` | add `observations`, `grounding`, `final` |
| `src/lib/companion/turn.ts` | add `wantsReportDraft()` beside `isQuestionAbout` |
| `src/lib/companion/turn.test.ts` | report gating: concept/negated vs request |
| `src/app/api/companion/answer/route.ts` | observation messages, gating, `final`, grounding |
| `src/app/api/companion/answer/route.test.ts` | add plain-question gating, `final`, disallowed observation |
| `src/lib/companion/answer-client.ts` | forward `grounding`; `final` |
| `src/components/companion/companion-chat.tsx` | call loop; store grounding; merged trace |
| `src/components/companion/companion-chat.test.tsx` | update job-search fetch count; add loop/fallback/cancel/timeout |
| `src/components/companion/companion-regressions.test.tsx` | update tool-only history test; add sentinel privacy test |
| `src/components/companion/companion-image.test.tsx` | follow-up OCR grounding test |
| `src/components/companion/agent-run.test.tsx` | job-search stage note/failure rendering |
| `src/components/companion/agent-run.tsx` | count a failed tool stage in the failure chip/announcement |
| `src/app/api/companion/vision/route.test.ts` | add strict `message`/`filename` rejection |
| `docs/agent-orchestration.md` | document the loop and the new privacy boundary |

### Explicitly unchanged

| File | Why |
|---|---|
| `src/lib/contracts/tool.ts` / `tool.test.ts` | no new tool; two existing tools only |
| `src/lib/contracts/agent-run.ts` / `trace-contract.test.ts` | reuse `job-search`; no new `StageId` |
| `src/app/api/companion/vision/route.ts` | OCR contract untouched |
| `src/lib/companion/vision-client.ts` | OCR client untouched |
| `src/lib/loker/search.ts` | local filter reused as-is |
| `src/lib/scoring/**` | no scoring change; run as guard |
| `src/components/companion/link-verify.tsx` | opt-in link check untouched |

Lane routing in `turn.ts` is untouched; only the new `wantsReportDraft` helper
is added there.

### Requirement → test map

| Requirement | Primary tests |
|---|---|
| No `report_draft` on a plain question | `turn.test.ts`, `answer/route.test.ts`, `agent-loop.test.ts` |
| No `job_search` unless requested | `answer/route.test.ts`, `agent-loop.test.ts`, `companion-chat.test.tsx` |
| Multi-turn tool observation | `answer/route.observations.test.ts`, `agent-loop.test.ts`, `companion-chat.test.tsx` |
| Image / OCR grounding | `grounding.test.ts`, `companion-image.test.tsx`, `vision/route.test.ts` |
| Link / attachment observation | `companion-regressions.test.tsx`, `grounding.test.ts`, `answer/route.observations.test.ts` |
| Fallback | `agent-loop.test.ts`, `companion-chat.test.tsx` |
| Cancellation / timeout | `agent-loop.test.ts`, `companion-chat.test.tsx`, `answer/route.observations.test.ts` |
| Client rendering / trace | `agent-run.test.tsx`, `companion-chat.test.tsx` |
| Live multi-turn + image + link | `scripts/verify-companion-live.mjs` |

## 6. TDD slices

### Slice 0 — baseline

```bash
cd /opt/lumina
git status --short
npm run verify
```

Record the test count. The targeted baseline on `3fbd2de` is 88 passing tests
across the six suites below.

**Workspace hygiene:** remove or ignore untracked build backups such as
`.next.bak-*` before the gate. `biome check` and `tsc` both walk those
directories (`**/*.ts`), so a stale backup produces tens of thousands of
diagnostics that have nothing to do with this change.

### Slice 1 — contracts

Red:

```bash
npx jest src/lib/contracts/loop.test.ts --runInBand
```

Expected: `Cannot find module '@/lib/contracts/loop'`.

Tests:

- valid job observation with one posting passes;
- top-level `text`, `message`, `evidence`, `quote`, `url`, `filename` rejected;
- nested `postings[0].description` rejected;
- more than 5 postings rejected;
- more than 2 observations rejected by `AnswerRequestSchema`;
- grounding with `image.text`, `attachments[0].name`, `url`, `quote` rejected;
- `AnswerRequestSchema` defaults observations/grounding/final;
- `.strict()` still rejects a top-level `message`.

Green: implement `loop.ts`, extend `answer.ts`.

### Slice 2 — report gating

Red:

```bash
npx jest src/lib/companion/turn.test.ts --runInBand
```

New cases:

- `"apa itu laporan penipuan?"` → false
- `"bagaimana cara buat laporan?"` → false
- `"apakah saya harus buat laporan?"` → false
- `"jangan buat laporan dulu"` → false
- `"tolong buatkan laporan"` → true
- `"buatkan template laporan ke OJK"` → true
- `"saya mau buat laporan"` → true

Green: add `wantsReportDraft()`, use it in the route.

### Slice 3 — route observation protocol

Red:

```bash
npx jest src/app/api/companion/answer/route.test.ts \
  src/app/api/companion/answer/route.observations.test.ts --runInBand
```

Route tests:

- plain question + model emits `report_draft` → dropped, upstream `tools`
  undefined;
- plain question + model emits `job_search` → dropped;
- explicit job request → upstream tools exactly `["job_search"]`;
- report request → upstream tools exactly `["report_draft"]`;
- `belajar` with "lowongan/laporan" in the question → no tools;
- `final: true` → no tools, even with a job request;
- observation for a disallowed tool → `400 invalid-observation`;
- observation with an extra key → `400 invalid-request`;
- 1 observation → tools still offered; 2 → schema accepts but the route
  withholds tools; 3 → 400 (schema max);
- observation `result.postings` > 5 → 400.

Observation round tests (two POSTs, because the route is deliberately one
model step and the browser owns the loop):

- first POST returns a `job_search` call;
- second POST sends `assistant(tool_calls)` + `tool` in that order;
- final text returned; no raw message/evidence in the upstream body;
- second-step upstream 503 → `503 upstream-failed`;
- request already aborted → `503 upstream-timeout`;
- fake timers advance 20 s → `503 upstream-timeout`;
- grounding forwarded to the upstream user payload; `belajar` omits it.

Green: implement message reconstruction and gating.

### Slice 4 — grounding + client request

Red:

```bash
npx jest src/lib/companion/grounding.test.ts \
  src/lib/companion/answer-client.test.ts --runInBand
```

Tests:

- `buildGrounding` with OCR sentinel returns `image.read` and labels, and
  `JSON.stringify` does not contain the sentinel;
- attachment names never appear; kinds map correctly (`apk`, `pdf`, `image`);
- URLs never appear; only `links` count;
- evidence kinds only, no artifact values;
- `buildAnswerRequest("tanya", ...)` includes grounding;
- `buildAnswerRequest("belajar", ...)` sends `EMPTY_GROUNDING` and no history;
  the route's `payloadFor` omits grounding from the tutor payload;
- `lanjutan` still includes digest; `tanya` still includes tactics.

Green: implement `grounding.ts`, extend `answer-client.ts`.

### Slice 5 — loop

Red:

```bash
npx jest src/lib/companion/agent-loop.test.ts --runInBand
```

Tests:

- no tool call → one request, text returned, no observation;
- `job_search` → local filter runs, second request contains only safe
  observation fields, final text returned;
- two `job_search` calls → three requests, two observations, one merged trace;
- `report_draft` → terminal, one model call, no observation;
- `report_draft` on a plain question → not opened, text returned;
- `report_draft` without latest verdict → deterministic "Periksa pesan..."
  message, no report opened;
- `job_search` on a plain question → not executed, text returned;
- empty corpus → `count: 0`, model still called, trace `selesai` note `0`;
- `filterPostings` throws → trace `gagal`, no fabricated postings, fallback
  text;
- max steps → exactly 3 requests, last has `final: true`, loop stops;
- abort before step 2 → no second request, `outcome: "timeout"`;
- second step 503 → `outcome: "failed"`, observations retained.

Green: implement `agent-loop.ts`.

### Slice 6 — chat integration

Red:

```bash
npx jest src/components/companion/companion-chat.test.tsx \
  src/components/companion/companion-regressions.test.tsx \
  src/components/companion/companion-image.test.tsx \
  src/components/companion/agent-run.test.tsx --runInBand
```

Required changes/additions:

- `companion-chat.test.tsx`:
  - job-search test now expects 3 fetches (answer tool call, answer final,
    summary) and asserts the observation body;
  - plain question with a mocked `report_draft` shows text, no report card;
  - second-step 503 still renders the job card with the deterministic
    `summaryFallback` and releases the composer;
  - step cap: exactly 3 answer calls, third body `final: true`, fallback text;
  - unmount aborts the in-flight step and no further fetch occurs;
  - 35 s fake-timer timeout shows fallback and clears busy; use
    `userEvent.setup({ advanceTimers: jest.advanceTimersByTime })` so the
    composer events and the abort timer share the fake clock.
- `companion-regressions.test.tsx`:
  - update "keeps a tool-only response out of subsequent model history" for
    the two-call turn; final text is history, observation is not;
  - add one sentinel test: checked message, OCR text, filename, URL, and a
    quote phrase never appear in any `/api/companion/answer` body;
  - follow-up after a link sends `grounding.links: 1` and
    `evidenceKinds` includes `"link"`, with no URL;
  - follow-up after an APK sends
    `grounding.attachments: [{ kind: "apk", read: false }]`, with no filename;
  - report-without-verdict test asserts exactly one model call.
- `companion-image.test.tsx`:
  - follow-up after an image sends `grounding.image` with `read: 1` and no OCR
    sentinel or filename.
- `agent-run.test.tsx`:
  - a `job-search` stage note appears in `runAnnouncement`;
  - a `gagal` job-search stage sets `data-run-state="gagal"`; the header chip
    counts it and the announcement says `1 alat gagal`, not `0 agen gagal`;
  - no `agent-job-search` detector bubble is rendered (it is not an agent).

Green: wire `runAgentLoop` into `companion-chat.tsx`, merge the trace, store
grounding on the turn, adjust `agent-run.tsx` failure counting.

### Slice 7 — live harness

```bash
node --check scripts/verify-companion-live.mjs
LUMINA_BASE_URL=http://127.0.0.1:3000 \
  node scripts/verify-companion-live.mjs \
  --image scripts/fixtures/companion-scam.png \
  --link https://example.com \
  --expect-image-text hadiah
```

Acceptance: exit 0, all checks PASS (or explicit SKIP when the LLM/url.vet is
not configured). Run it against `npm run dev` while iterating, and against
`npm run build && npm start` before release; the release gate uses the
production build.

### Slice 8 — full gate

```bash
npm run verify
```

`verify` = `typecheck && lint && test && build`.

## 7. Live-URL verification script

`scripts/verify-companion-live.mjs` is a zero-dependency Node 24 script. It
prints a PASS/FAIL/SKIP table and a JSON report; it never prints the checked
message, OCR text, filenames, user-content URLs, or secrets.

**Scope:** API-level. It exercises the same routes the browser calls (answer,
vision, link verify) with a real model; DOM rendering is covered by the Jest
suites. A Playwright browser mode can be added later, but it is not part of the
zero-dependency release gate.

Usage:

```bash
LUMINA_BASE_URL=https://lumina.example \
  node scripts/verify-companion-live.mjs \
  --image scripts/fixtures/companion-scam.png \
  --link https://example.com \
  --expect-image-text hadiah \
  --attempts 2 \
  --json /tmp/lumina-live.json
```

Checks:

1. **Health** — `GET /api/health` returns 200 `{status:"ok"}`.
2. **Plain-question gating** — `POST /api/companion/answer`
   `{lane:"tanya",question:"apa itu pinjol?"}` returns 200, non-empty text, and
   no `job_search` or `report_draft` in `toolCalls`.
3. **Explicit job request** — `{lane:"obrolan",question:"cari lowongan React
   remote di Jakarta"}` returns a `job_search` call (retry up to `--attempts`).
   Arguments may only contain `query`, `location`, `salaryMin`, `salaryMax`,
   `hideFlagged`.
4. **Multi-turn observation** — resend the same question with
   `observations:[{name:"job_search",callId,arguments,ok:true,result:{count:1,
   total:1,capped:false,postings:[{title:"Frontend Engineer",company:"PT Maju",
   sentinelStatus:"clean",luminaRisk:"bersih"}]}}]` and `final:true`.
   Assert 200, non-empty text matching `/lowongan|Frontend|Maju/i`, and no
   tool calls. Assert the observation/grounding subtrees contain none of
   `message`, `evidence`, `quote`, `transcription`, `filename`, `url`, `text`.
5. **Image upload** — read `--image`, infer `image/png|jpeg|webp|gif`, base64
   encode, `POST /api/companion/vision`. Assert 200 `{ok:true,text}`; if
   `--expect-image-text` is set, assert the text contains it; assert the
   response has no `score`, `risk`, `signals`, or `grounding` keys.
6. **Link** — `POST /api/link/verify {url:"<--link>"}`. Assert 200
   `{ok:true,verdict}` with `verdict.verdict` in `Safe|Suspicious|Risky` and a
   numeric `score` 0–100; assert no `message`/`evidence` key. A 503
   `not-configured` is SKIP.
7. **Grounding** — `POST /api/companion/answer` `{lane:"lanjutan",
   question:"kenapa tautan itu berbahaya?",digest:{...},grounding:{image:
   {attempted:1,read:1,failed:0,skipped:0,signalLabels:["Permintaan OTP"],
   score:85,risk:"tinggi"},attachments:[{kind:"image",read:true}],links:1,
   evidenceKinds:["text","link"]}}`. Assert 200, non-empty text, and no
   forbidden key in the grounding subtree.
8. **Bounded** — count answer calls; assert ≤ 3 per turn and the final request
   has `final: true`.

Exit codes: `0` all PASS/SKIP; `1` any FAIL; `2` bad usage. `--strict` turns
SKIP into FAIL.

Deterministic OCR fixture:

```bash
mkdir -p scripts/fixtures
convert -size 900x420 xc:white -font DejaVu-Sans -pointsize 38 -fill black \
  -annotate +40+90  'Selamat! Anda menang hadiah utama.' \
  -annotate +40+160 'Transfer biaya admin Rp250.000' \
  -annotate +40+230 'ke 081234567890 sebelum hari ini.' \
  scripts/fixtures/companion-scam.png
```

Measured locally against `127.0.0.1:3000` on 2026-11-10: vision returned the
three lines verbatim; `/api/link/verify` on `https://example.com` returned
`Safe/98`; the answer route returned a `job_search` call for the explicit job
prompt. Those three endpoints are already live-testable; the observation and
grounding checks are the red part this plan adds.

Current run (before implementation):

```
PASS  health
PASS  plain question does not offer tools
PASS  explicit job request selects job_search
FAIL  multi-turn observation returns a grounded answer — HTTP 400
PASS  image upload returns text only
PASS  link verification returns a typed verdict
FAIL  grounding is lossy and accepted — HTTP 400
```

The two failures are the intended red state: `AnswerRequestSchema` does not
have `observations`/`grounding` yet. They turn green in Slice 3 and Slice 4.

## 8. Acceptance criteria

### Privacy (hard gate)

- [ ] A unique checked-message sentinel (`SENTINEL-MSG-…`), OCR sentinel
      (`SENTINEL-OCR-…`), filename sentinel (`SENTINEL-FILE-….apk`), URL
      sentinel (`https://sentinel.example/…`), and quote sentinel never appear
      in any `/api/companion/answer` request body across a full conversation.
- [ ] `AnswerRequestSchema.safeParse` succeeds for every body the client sends.
- [ ] `ToolObservationSchema` and `GroundingSchema` reject `text`, `message`,
      `evidence`, `quote`, `url`, `filename`, `transcription` at any depth.
- [ ] The observation sent to the model contains only counts, postings fields
      (`title`, `company`, `sentinelStatus`, `luminaRisk`), attachment kinds,
      link count, and evidence kinds.
- [ ] `belajar` never receives grounding, observations, or checked history.

### Tool selection / gating

- [ ] Plain question: upstream body has no `tools`; a mocked `job_search` or
      `report_draft` is dropped; response `toolCalls: []`.
- [ ] Explicit job request: only `job_search` is offered; client executes it.
- [ ] Explicit report request: only `report_draft` is offered; it is terminal.
- [ ] `final: true` withholds tools even when the question is a job request.
- [ ] Observation for a tool that was not offered → `400 invalid-observation`.
- [ ] More than 2 observations → `400 invalid-request`.

### Multi-turn behavior

- [ ] First response emits a tool call; second request includes
      `assistant(tool_calls)` then `tool`; final text is returned.
- [ ] At most 3 model calls and 2 tool executions per turn.
- [ ] Two `job_search` calls produce one merged `job-search` stage with summed
      `ms` and note `${calls} panggilan · ${matches} lowongan cocok`.
- [ ] `report_draft` opens one card and makes no second model call.
- [ ] `report_draft` without a prior verdict shows the existing deterministic
      "Periksa pesan yang mencurigakan terlebih dahulu…" message.

### Image / OCR grounding

- [ ] OCR text reaches `scoreWithTrace` and never `/api/companion/answer`.
- [ ] Follow-up after an image carries `grounding.image` with
      `attempted/read/failed/skipped`, labels, score, risk; no OCR text.
- [ ] A failed vision read carries `failed > 0` and no invented text.
- [ ] Filename never appears in grounding.

### Link / attachment observation

- [ ] Follow-up after a link carries `links: 1` and `evidenceKinds` includes
      `"link"`; the URL never appears.
- [ ] Follow-up after an APK carries `attachments:[{kind:"apk",read:false}]`;
      the filename never appears.
- [ ] Follow-up after an image carries `attachments:[{kind:"image",read:true}]`.

### Fallback

- [ ] Second-step 503/timeout still renders the job card with
      `summaryFallback(matches)` and releases `busy`.
- [ ] A tool execution failure renders `gagal` in the trace and a deterministic
      sentence; no fabricated postings.
- [ ] Max steps returns a final answer or deterministic fallback; never loops.

### Cancellation / timeout

- [ ] Unmount aborts the in-flight step; no further fetch; no state update after
      unmount.
- [ ] 35 s total deadline aborts, clears `busy`, renders fallback.
- [ ] Route abort signal propagates to `fetch`; already-aborted request returns
      `503 upstream-timeout`.

### Trace / rendering

- [ ] Job search is not rendered as a detector bubble (`agent-job-search`
      absent).
- [ ] `runAnnouncement` includes the job-search note.
- [ ] A failed job-search stage sets `data-run-state="gagal"` and the failure
      chip/announcement names it honestly.
- [ ] `engineMs` excludes the job-search `ms`.
- [ ] Final text, card, and trace render in the transcript; no duplicate stage
      ids.

### Release gate

- [ ] `npm run verify` passes (typecheck, lint, all tests, production build).
- [ ] Scoring bench unchanged: recall ≥ 90%, FP ≤ 5%, classification ≥ 85%.
- [ ] Live script exits 0 against the local build and the deployed URL.
- [ ] No new dependency, no secret in logs, no raw text in the report.

## 9. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Loop doubles latency | 35 s total / 20 s per route; last step `final: true`; fallback after any failure. Measure p95 in the live script. |
| Rate limit (10 text calls/min) | A 3-step loop consumes 3. Raise the per-client text limit to 20/min or count a loop as one attempt with a server-issued loop id; decide before demo. |
| Model ignores observations | The observation is a real `tool` message; the prompt says to answer from it. Tests use a mocked LLM that emits a tool call, then a final answer. |
| Trace duplicate ids | Merge tool calls into one `job-search` stage; `AgentRun` already maps by id. |
| History contamination | Observation is never a `Turn`; history includes only non-private turns with non-empty text. Sentinel test enforces it. |
| Malicious client sends a quote in `question` or `signalLabels` | Out of scope for schema shape; the route already accepts free-text questions, and `signalLabels` is bounded text. The app derives labels from `Signal.label`, never `Signal.evidence`; the sentinel test covers the real client. |
| Report card stale after a new turn | `patchCompanion` targets the turn id; the existing "still last" guard for the summary is preserved. |

## 10. Rollback

The loop is behind a client constant. If it fails the gate, set
`COMPANION_LOOP=off` (build-time env) and `runAgentLoop` falls back to the
current single `requestAnswer` + inline tool branch. No route contract change is
needed to roll back the client; the added request fields are optional and
defaulted.
