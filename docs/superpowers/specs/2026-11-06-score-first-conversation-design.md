# Score-first conversation — design

**Date:** 6 November 2026
**Stream:** A (Companion)
**Status:** approved for planning
**Supersedes:** the "model-driven tool loop" proposal of the same date, which was
rejected after review. See §9 for what was rejected and why.

---

## 1. The problem, measured

The companion feels canned. That is a real defect, not a taste complaint, and it
has five separate causes. Every number below was produced by running the shipped
functions, not by reading them.

### 1a. A greeting regex silently skips real scams

`isGreeting()` (`src/lib/companion/reply.ts:49`) anchors `GREETING` only at the
start of the string (`:15`) and accepts anything shorter than 40 characters
(`:51`). Measured against six realistic short messages:

```
SKIPPED-AS-GREETING  <- "Halo, ini dari BCA. Akun Anda diblokir."     (39 chars)
SKIPPED-AS-GREETING  <- "Hai, ini undangan pernikahan.apk"
SKIPPED-AS-GREETING  <- "Halo, selamat pagi. Anda menang undian."
SKIPPED-AS-GREETING  <- "Hi, ada lowongan kerja online."
analyzed             <- "Halo, saya dari kurir. Paket Anda tertahan."
analyzed             <- "Halo, ini dari CS Shopee. Ada paket gagal kirim."
```

`companion-chat.tsx:179` turns this into `hasContent = false`, which skips
`scoreWithTrace` entirely (`:207`), builds no digest (`:391`), and returns the
hardcoded string from `reply.ts:62` (`:399-402`). The detectors never run. The
user sees "Siap. Kalau ada pesan lain yang mencurigakan, tempel saja."

The 20/20 recall bench does not catch this because every bench sample is longer
than 40 characters. Four of six realistic short scams are skipped. **This is the
most damaging bug in the repository and it is a correctness bug against the
product's entire reason to exist.**

### 1b. Asking what a scam is produces a red verdict about the user

```
scoreText("apa itu pinjol?") -> score=70  risk=tinggi
                               modus=pinjol-fiktif  relatedModule=9
                               signals=1  weight=0.7
```

The `pinjol` keyword rule (`src/lib/scoring/message.ts:76`) cannot distinguish
*receiving* a pinjol offer from *asking about* pinjol. A judge who types "apa itu
pinjol?" is shown a 70/100 red card about themselves. The legitimate-message
bench (0 false positives on 23 samples) does not catch it because none of the 23
samples use scam vocabulary in a question.

### 1c. A real model reply is streamed and then deleted

`appendText` (`companion-chat.tsx:314`) renders model chunks live. When
`isComplete()` (`voice-client.ts:37-42`) rejects the result, `requestReply`
returns `{outcome: "truncated", text: ""}` and `finish(fallback, ...)` (`:404-412`)
replaces the visible text with the template. The reader watches a real answer
appear for two seconds, then watches it get swapped for canned copy.

Measured on the live route: clean digests passed `isComplete` 3/3; high-risk
digests failed 3/3. Both truncation hypotheses are true, on different inputs.

### 1d. Truncation is budget starvation, not gateway flakiness

The model is `yoga/deepseek-v4.1-flash`, a reasoning model, and
`reasoning_tokens` are billed inside `completion_tokens`. Measured:

| `max_tokens` | `finish_reason` | `reasoning_tokens` | visible chars |
|---|---|---|---|
| 40 | `length` | 40 of 40 | 0 |
| 80 | `length` | 54 of 80 | 85, cut mid-word |
| 220 | `stop` / `length` | 54-157 | 0-322, sometimes cut |
| 800 | `stop` | 95 | 359, complete |

`voice-stream.ts:24-27` parses only `delta.content` and discards `finish_reason`,
so the authoritative truncation signal was never available to the client and
`isComplete()` guesses from trailing punctuation instead.

### 1e. Four shipped strings claim nothing leaves the device

- `src/components/marketing/privacy-note.tsx:13` — "Pesanmu tidak dikirim ke mana pun."
- `src/components/marketing/hero.tsx:48` — "Tidak ada yang dikirim ke server."
- `src/components/companion/companion-entry.tsx:75` — "tidak dikirim ke mana pun."
- `src/components/auth/register-form.tsx:83-84` — "tidak ada data yang dikirim ke server."

Meanwhile a findings digest POSTs to a gateway on every non-greeting turn. These
strings are false today, before any change in this spec.

---

## 2. The design

**Score first. Route second. Speak third.**

The model chooses what to do next. It never chooses whether to judge.

```
every message
  |
  v
scoreWithTrace()            local, ~1 ms, authoritative, cannot be skipped
  |
  v
planTurn()                  deterministic lane selection, no network
  |
  +-- periksa   engine found something      -> digest -> verdict prose
  +-- periksa   message-shaped, no findings -> digest -> verdict prose
  +-- tanya     a question about the product -> question + facts -> real answer
  +-- lanjutan  follow-up on a prior verdict -> Explanation in state -> answer
  +-- obrolan   greeting / small talk        -> conversation -> real answer
  |
  v
one model call (streamed)  + at most one tool round when the model asks
  |
  v
ScoreCard + ExplanationCard + AgentTrace render on every lane where the engine ran
```

### 2a. Why routing is deterministic and not a model call

The router decides whether the engine runs. If the model decides that, three
things break:

a. A model that routes "Halo, ini dari BCA" to *obrolan* skips the detectors,
   and recall becomes model-dependent. The 20/20 gate is then a property of the
   network.
b. Every analysis waits for a router call (measured floor 2.5 s, because ~6k
   tokens of upstream preamble are injected per call) before the verdict — which
   was already computed in 1 ms — can render. That destroys the instant-verdict
   claim.
c. The router's degraded state is `composeReply()`, which is the reported bug.
   A design whose failure mode is the defect it fixes has hidden the defect
   behind average-case latency.

`planTurn()` is a pure function over data the pipeline already has. It is
testable with a table, and the recall invariant becomes a three-line assertion
over `SCAM_CASES`.

### 2b. The lanes

`src/lib/companion/turn.ts` — new, pure, no React, no network.

```ts
export type Lane = "periksa" | "tanya" | "lanjutan" | "obrolan";

export interface TurnPlan {
  lane: Lane;
  /** True when the deterministic engine produced at least one weighted signal. */
  hasFindings: boolean;
  /** Human-readable reason, rendered in the trace as the lane note. */
  why: string;
}

export function planTurn(input: {
  text: string;              // attachment filenames already folded in
  result: ScoreResult | null; // null when the question-guard short-circuited
  lastResult: ScoreResult | null;
  lastExplanation: Explanation | null;
  asked?: boolean;            // the guard already claimed this turn
  attachments?: number;       // attachment-only turn is still a check
}): TurnPlan;
```

Evaluation order, first match wins:

| # | Test | Lane | Why |
|---|---|---|---|
| 1 | `result` has any signal with `weight > 0` | `periksa` | the engine found something; recall cannot depend on phrasing |
| 2 | `extractLinks(text).length > 0` | `periksa` | a link deserves the Link Agent row even when nothing else scored |
| 3 | an attachment, a phone pattern, or an `\.apk` / `\.pdf` name | `periksa` | an attached file or a number is something the user received |
| 4 | `lastResult && lastExplanation && FOLLOW_UP` | `lanjutan` | answerable from the `Explanation` already in state |
| 5 | money/transaction vocabulary (`transfer`, `rekening`, `bayar`, `top ?up`, `dana`, `ovo`, `gopay`, `pulsa`) | `periksa` | text about a transaction is checkable |
| 6 | `text.length >= PASTE_LENGTH` (160) | `periksa` | length is a weak signal, so the bar is a pasted paragraph |
| 7 | question-shaped (`?` at end, or `CONCEPT_QUESTION` pattern) | `tanya` | a question is not a message someone received |
| 8 | greeting (fully anchored token match) | `obrolan` | small talk |
| 9 | default | `obrolan` | nothing to check, nothing to answer |

Tests 1-3 and 5-6 run **after** scoring, because the score is the strongest
routing feature available and it costs 1 ms. Test 7 is what the question guard
decides **before** scoring, because a question must not be scored at all (§1b).

### 2c. The question guard

`src/lib/companion/turn.ts` exports:

```ts
/** True when the text is a question about scams, not a message that uses one. */
export function isQuestionAbout(
  text: string,
  options?: { hasPriorVerdict?: boolean },
): boolean;
```

It runs before `scoreWithTrace`. A question is never scored, so "apa itu pinjol?"
cannot produce a red card. The guard is deliberately narrow — it requires a
question mark **and** the absence of message-shaped signals (no URL, no phone
number, no money amount, no `.apk`) — so that "Halo, ini dari BCA. Akun Anda
diblokir?" is still scored even though it is a complete sentence.

This is the correct place for the fix: `score.ts` is frozen by contract (§5 of
AGENTS.md) and is the 20/20 gate. The guard is a routing decision, not a scoring
rule.

### 2d. What the model receives, per lane

| Lane | Payload | Model's job |
|---|---|---|
| `periksa` | `VoiceDigest` (unchanged) + optional tools | write the verdict in its own words |
| `tanya` | the question + product facts derived from the same arrays the panels render | answer it |
| `lanjutan` | the question + the prior `Explanation` | answer from the explanation |
| `obrolan` | the conversation so far | hold a conversation |

New route: `src/app/api/companion/answer/route.ts` for `tanya` / `lanjutan` /
`obrolan`. The existing `/api/companion/voice` route stays **byte-identical** for
`periksa`, so the tested streaming path and its `voice-wiring` tests are not
touched.

The answer route uses a `.strict()` schema with **no field for a received
message**. Only the user's own question and derived facts can be sent. The
privacy boundary therefore stays structural, not a promise in prose.

### 2e. The tools

Two tools, both executed **client-side, after the verdict exists**, maximum one
round. They are requestable by the model on the `periksa` and `tanya` lanes;
none of them can produce or move a `Signal`.

**`cari_modul(query: string)`**

```ts
interface CariModulResult {
  matches: { no: number; nama: string; status: "lengkap" | "segera" }[];
}
```

The model picks a search query over the twelve schemes in `modus.json`. This is
genuine selection — the model decides which module is relevant to what the user
just asked — and the return type carries no field capable of holding a `Signal`.

**`klarifikasi(pertanyaan: string, opsi: string[])`**

```ts
interface KlarifikasiResult {
  chips: { label: string; send: string }[];
}
```

The model asks a disambiguating question with tappable options, e.g.
"Sudah ada uang yang terkirim?" → [Belum / Sudah]. A chip click is a **normal
`send()`** with the label as text. There is no resume protocol, no pending
`tool_call_id` to replay, and no new state machine — which is what made the
rejected design's `clarify` unimplementable in the time available.

Both tools are defined in `src/lib/companion/tools.ts` as pure functions over
typed arguments, so they are testable without the route compiler.

### 2f. The safety floor

The deterministic engine runs on **every** message, in the client, before any
network call. `ScoreResult` is produced exactly once and is the only one that
exists.

Consequences:

a. A model failure cannot hide a verdict. `finish()` sets `result` on both the
   model path and the template path, as it already does (`companion-chat.tsx:338`).
b. There is no second `ScoreResult` to diverge. The route may receive a digest;
   it must never produce one.
c. `conversationSignals` still sees `priorTurns`, so escalation across messages
   keeps working. A route-side scorer could not see them.

**The card renders on `result`, never on `risk`.** The bench records 20/20
caught but 18/20 `tinggi`; two scam samples sit at `mencurigakan`. Gating the
card on `tinggi` would silently drop those two and turn a 20/20 claim into
18/20 on stage.

---

## 3. Latency

| Lane | Calls | First visible word | Complete |
|---|---|---|---|
| `obrolan` | 1 | ~2.5 s (streamed) | ~2.5 s |
| `tanya` | 1 | ~2.5 s (streamed) | ~2.5 s |
| `lanjutan` | 0-1 | 0 ms if composed locally | 0-2.5 s |
| `periksa` | 1 (+1 if a tool runs) | card at ~0 ms, prose at ~2.5 s | ~2.5-5 s |

The card and chips are local and appear immediately on every `periksa` turn. The
prose streams behind them. `ThinkingRow` already counts the elapsed seconds out
loud, so the wait reads as work.

### 3a. Timeout structure

- Client: `AbortSignal` at **12 s**, wired into `requestReply`. Today it passes
  no signal at all (`companion-chat.tsx:404`), so a wedge leaves `busy` true
  forever and the composer disabled.
- Route: **10 s**, at least 1.5 s below the client, so the client never shows a
  template while the server is still working and then receives a late body into
  a closed turn.
- A late write is prevented by an epoch guard: `finish()` seals the turn, and
  `appendText` ignores chunks for a sealed turn.

---

## 4. What the reader sees

| Lane | Card | Trace | Explanation | Lane chip |
|---|---|---|---|---|
| `periksa` with findings | yes | yes | yes | no |
| `periksa` clean | yes | yes | no | no |
| `tanya` | no | no | no | "Dijawab sebagai pertanyaan" |
| `lanjutan` | no (prior card stays) | no | no | no |
| `obrolan` | no | no | no | no |

The lane chip carries a one-tap correction: **[Periksa sebagai pesan]**, which
re-runs the turn in `periksa`. A misroute becomes visible and correctable, which
neither a regex nor a model router can offer — a model's misroute is silent.

No celebration, no score change, no gamification on this surface (AGENTS.md,
`lumina-ui`).

---

## 5. Privacy

**The checked message never leaves the device.** That is stronger than the
rejected proposal, and it is provable rather than promised:

| Data | Leaves the device? |
|---|---|
| the message someone sent you | **never** |
| the derived digest (risk band, finding labels, advice) | yes, on `periksa` |
| your own question | yes, on `tanya` / `obrolan` |
| score, signals | never — computed locally |

The four false strings listed in §1e are corrected in the same commit that adds
the notice. The notice is a permanent line under the composer, not a dismissible
dialog:

> Percakapan ini dikirim ke model untuk menyusun jawaban. Pesan yang kamu
> periksa tidak pernah dikirim.

`docs/plan.md` §11.6a is updated to match. `docs/plan-source.md:564` is updated
too — a proposal that says content is never sent, beside an app that sends
questions, is a credibility risk on the project's central honesty claim.

---

## 6. Failure modes, honestly

1. **The router is wrong on shapes nobody anticipated.** A 40-character,
   digit-free, link-free, money-word-free scam routes to `obrolan` and gets
   conversation instead of a card. Tests 3-5 shrink this; the lane chip makes it
   correctable. It is real.
2. **The lane knowledge is bounded by `modus.json`.** Ask about a scam family
   that is not in the twelve and the answer is honest about not having a module.
   For a product whose pitch is "we never invent findings", refusing is on-brand,
   but a hostile judge can call it incomplete.
3. **Deterministic answers repeat.** The `tanya` lane is model-voiced, which
   mitigates this, but the facts are fixed.
4. **A misroute costs confidence even when correctable.** If the chip says
   "Dijawab sebagai pertanyaan" over a real scam, the demo is already damaged.
5. **No multi-step synthesis.** "Compare this message with the previous one" gets
   a per-turn answer.
6. **Two model calls on the `periksa` path when a tool runs** doubles tail
   exposure. Mitigated by capping at one tool round and by the client abort.

---

## 7. Testing

New tests, all rendering real components or calling real functions:

a. `turn.test.ts` — a 40-case lane table, plus four invariants:
   - every `SCAM_CASES` entry routes to `periksa`
   - no `BENIGN_CASES` entry routes to `periksa` with findings
   - `isQuestionAbout("apa itu pinjol?")` is true
   - `isQuestionAbout("Halo, ini dari BCA. Akun Anda diblokir.")` is false
b. `reply.test.ts` — the four skipped scams from §1a are no longer greetings.
c. `companion-chat.test.tsx` — a `tanya` turn renders no `AgentTraceCard` and no
   `ScoreCard`; a `periksa` turn renders both; a greeting reaches `fetch`.
d. `answer-route.test.ts` — the answer schema rejects any field carrying a
   received message.
e. `tools.test.ts` — `cari_modul` returns only real modules; `klarifikasi` chips
   are non-empty and each `send` is non-empty.

The bench gates (`score.bench.test.ts`) must remain green and unmodified.

---

## 8. Scope boundaries

- **Not changed:** `src/lib/scoring/**`, `src/lib/contracts/score.ts`,
  `src/lib/companion/explain.ts`, `src/data/tactics.ts`,
  `src/app/api/companion/voice/route.ts`, `src/lib/companion/voice-stream.ts`.
- **Changed:** `reply.ts`, `companion-chat.tsx`, `agent-run.ts` (trace label only),
  the four privacy strings, `plan.md`, `plan-source.md`.
- **New:** `turn.ts`, `tools.ts`, `answer/route.ts`, lane chip component.
- **No new dependencies.** AGENTS.md §7.

---

## 9. What was rejected

A "model-driven tool loop" was proposed first: the model receives full
conversation history plus three tools including `analyze_message(text)`, and the
route performs a two-call loop with SSE removed.

Rejected because:

a. **`analyze_message(text)` lets the model choose what gets scored.** The engine
   is regex-driven. Paraphrasing "kode OTP" to "kode masuk" stops `otp-request`
   from firing, which also kills the hard override at `score.ts:94`. The model
   never writes `risk`; it picks the input that produces it. That is AGENTS.md §4
   violated through the back door.
b. **A route-side scorer cannot see `turns`.** `conversationSignals` is the only
   detector that sees escalation across messages, and `send()` passes
   `priorTurns` (`companion-chat.tsx:203`). Two scorers means two `ScoreResult`s
   for one turn, and the "Pelajari pola ini" link could point at the wrong module.
c. **Deleting SSE** would delete the only tests covering split JSON across
   chunks and the missing trailing event — both observed in production.
d. **`max_tokens: 1600`** was wished, not measured. 800 already returns
   `finish_reason: stop`.
e. **Routing through the model** makes the router's degraded state
   `composeReply()` — the reported defect itself.

Retained from that proposal: the instinct to give the model real choices
(`cari_modul`, `klarifikasi`), confined to where the choice is genuine.
