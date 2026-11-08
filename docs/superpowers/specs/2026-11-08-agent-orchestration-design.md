# Agent orchestration & crew bubbles — design

**Date:** 2026-11-08
**Status:** Approved design, not implemented
**Plan:** `docs/superpowers/plans/2026-11-08-agent-orchestration-ui.md`
**Companion plan:** `docs/superpowers/plans/2026-11-08-scam-expansion.md` (normalisation,
evidence spans, authority pack). That plan lands first and does **not** add agents;
this plan extends it.
**Research:** `/home/vyns/.cache/tmp/opencode/orchestrator-research/{architectures,chat-ux,protocols}.md`

---

## 0. Goal and non-goals

### Goal

Make the companion's deterministic pipeline visible as a **crew of specialist agents**
inside the chat thread:

a. one orchestrator bubble that owns the run and the `scoring` stage;
b. one persistent, compact bubble per specialist agent;
c. real per-stage status, findings, measured `ms`, and note;
d. a per-agent identity colour on the bubble border, tokenised;
e. staged arrival animation, reduced-motion safe, 320/380 px safe;
f. a registry that makes adding a field-agent a four-file change plus one bench case;
g. three new real detectors — job ads, marketplace sellers, QRIS payloads — so the
   crew grows with real capability, not decoration.

### Non-goals

a. No LLM-driven routing. `planTurn()` and `scoreWithTrace()` stay the only deciders
   (AGENTS.md §4).
b. No live per-detector "running" state. Detectors are synchronous; pretending
   otherwise is the defect `agent-trace.tsx:32-34` removed.
c. No new dependency. `motion@14.9.1` and Tailwind's `tw-animate-css` already exist.
d. No adoption of AG-UI / AI SDK streams / AI Elements. AI Elements is deprecated at
   the end of November 2026; we borrow vocabulary only.
e. No server-side run state, no telemetry export, no logging of checked text.

---

## 1. Ground truth (read from the repo)

| Fact | Anchor |
|---|---|
| `AgentId = message \| link \| identity \| conversation \| evidence \| scoring` | `src/lib/contracts/score.ts:28-34` |
| `StageStatus = menunggu \| berjalan \| selesai \| temuan \| dilewati \| gagal` | `src/lib/contracts/agent-run.ts:15-22` |
| `StageId = AgentId \| "voice"` | `agent-run.ts:25` |
| `AgentStage = {id,label,task,status,findings,ms,note?}` | `agent-run.ts:27-42` |
| `STAGE_LABEL` maps every `StageId` | `agent-run.ts:46-75` |
| Detectors run synchronously in `DETECTORS` order | `src/lib/scoring/score.ts:209-238` |
| `scoreWithTrace` appends `scoring`, recounts findings, derives status | `score.ts:307-362` |
| `evidence` is appended by the chat, not the engine | `companion-chat.tsx:466-486` |
| `voice` is attached `berjalan` immediately and replaced at finish | `companion-chat.tsx:498-512`, `:623-644` |
| Chat renders `AgentTraceCard` above the reply | `companion-chat.tsx:1139` |
| No per-agent colour tokens exist | `src/app/globals.css:295-374` |
| `motion` installed and `useReducedMotion` already used | `package.json`, `agents-view.tsx:13` |
| Panel/card counts derive from `AGENT_SEQUENCE.length` | `signal-panel.tsx:1205`, `score-card.tsx:213` |

The trace is already the exact contract this UI needs. Nothing new is required to
render it; only three additive `AgentId` values and their `STAGE_LABEL` entries are.

---

## 2. Contract delta (frozen files, additive, coordinated)

Two frozen files change, **additively**:

```ts
// src/lib/contracts/score.ts
export type AgentId =
  | "message"
  | "link"
  | "identity"
  | "conversation"
  | "job"
  | "marketplace"
  | "qris"
  | "evidence"
  | "scoring";
```

```ts
// src/lib/contracts/agent-run.ts — three new STAGE_LABEL entries
job: {
  label: "Lowongan Agent",
  task: "Biaya pendaftaran, tugas berbayar, dan penempatan luar negeri",
},
marketplace: {
  label: "Marketplace Agent",
  task: "Pembayaran di luar platform, harga tidak wajar, dan resi palsu",
},
qris: {
  label: "QRIS Agent",
  task: "Payload EMVCo, CRC, dan nama merchant yang tidak cocok",
},
```

`StageId`, `DetectorId`, and `AGENT_SEQUENCE` extend automatically. No existing field
changes; no runtime behaviour changes until the detectors land.

**Process:** AGENTS.md §5 freezes these files. The three other owners must be told
**before** the commit, and the commit message must say why. This is the only contract
change in either plan.

---

## 3. Agent registry

`src/components/companion/agents.ts` becomes the single source of truth.

```ts
export interface AgentProfile {
  id: DetectorAgent;
  displayName: string;            // "Mochi"
  label: string;                  // STAGE_LABEL[id].label — never duplicated
  task: string;                   // STAGE_LABEL[id].task
  mechanism: readonly string[];   // three real rule families
  purpose: string;                // one sentence for the overview pane
  flavor: string;                 // one fixed line for the bubble
  caveat?: string;                // honesty caveat in the expanded body (qris)
  icon: LucideIcon;
  portrait: string | null;        // null = icon fallback until art lands
  identity: `--lumina-agent-${DetectorAgent}`;
}
```

`AGENT_DISPLAY_NAME`, `AGENT_MECHANISM`, `AGENT_PURPOSE`, and `AGENT_SEQUENCE` stay
exported and are **derived** from the registry, so existing consumers keep working.

| id | name | label | flavour (fixed) |
|---|---|---|---|
| message | Mochi | Message Agent | "Membaca kata yang dipakai untuk menekan." |
| link | Bubu | Link Agent | "Membaca domain dan bentuk tautan yang dikirim." |
| identity | Piyo | Identity Agent | "Memeriksa nomor dan klaim pengirim." |
| conversation | Naga | Conversation Agent | "Melihat apakah tekanan itu datang bertahap." |
| job | Kiko | Lowongan Agent | "Memeriksa biaya yang diminta sebelum ada surat tawaran." |
| marketplace | Lala | Marketplace Agent | "Mengikuti alur bayar yang keluar dari platform." |
| qris | Ruru | QRIS Agent | "Membaca payload QR dan nama penerimanya." · caveat: "CRC valid hanya berarti formatnya benar; cocokkan nama merchant di layar sebelum membayar." |
| evidence | Bao | Evidence Agent | "Menyimpan kutipan yang bisa diperiksa ulang." |

Rules for the registry:

a. `label` and `task` are read from `STAGE_LABEL`; a second copy is a defect.
b. `flavor` describes **what the agent reads**, never a personality claim and never
   an action it did not take.
c. `portrait: null` renders the registry icon on a token background. Adding art is
   "drop the file, set the path" — no component change.
d. A test asserts every `DetectorAgent` has a profile and that `AGENT_SEQUENCE`
   equals the registry order.

---

## 4. The crew in the thread

### 4.1 Layout

```
assistant turn (data-turn, max-w-[820px])
┌ Orchestrator ────────────────────────────────────────────┐
│ (Lumina) Orkestrator · 8 agen                            │
│ Jalankan agen → Kumpulkan temuan → Hitung skor   41 ms   │
│ [avatars ×8]  5 selesai · 3 dilewati · 3 temuan · 41 ms │
└──────────────────────────────────────────────────────────┘
  ┃ (Mochi) Message Agent                      ✓ 2 · 3 ms
  ┃ "Membaca kata yang dipakai untuk menekan."  [2 temuan]
  ┃ (Bubu) Link Agent                          – 0 · 0,4 ms
  ┃ …                                                      
  ┃ (Ruru) QRIS Agent                          ✓ 1 · 0,7 ms
  ┃ (Penyusun bahasa) Menulis jawaban…        ⟳
answer text (outside the crew)
```

- Orchestrator is full width within the turn.
- Specialist bubbles are indented (`ms-3`), narrower by the rail gutter, and compact:
  a 44 px header row. The flavour line shows while the stage is live or expanded; a
  settled collapsed row is one line, so eight bubbles do not push the answer off a
  380 px screen.
- The rail is decorative (`aria-hidden`): a 1px `--lumina-line` line with a 6px dot in
  the agent's identity colour per bubble.
- Order: `AGENT_SEQUENCE` (eight detectors, ending with `evidence`), then `voice` last.
  Never reorder by completion; users learn position.
- The answer text, `ScoreCard`, `ExplanationCard`, and `ActionRow` remain **outside**
  the crew, in that order.

### 4.2 Bubble anatomy

Header (a `CollapsibleTrigger asChild` `<button>` with `aria-expanded` /
`aria-controls` provided by Radix, ≥44 px high):

| slot | content |
|---|---|
| avatar | 28 px portrait, or registry icon on `bg-agent-<id>-soft` |
| name | `displayName` (Mochi) |
| label | `stage.label` in mono, `text-[10px]`; `sr-only` below `sm`, still in the accessible name |
| status | shape + word (see 4.3) |
| ms | `stage.ms` formatted `id-ID`, one decimal |

The trigger also shows the `note` for `dilewati`/`gagal` (or "Tidak ada alasan
tercatat.") so the honest reason is visible **without expanding**. The flavour line
renders only while the stage is live or expanded.

Expanded body:

a. `stage.task`;
b. three `mechanism` chips;
c. the real signals for this agent:
   `result.signals.filter(s => s.weight > 0 && s.agent === stage.id)`, each with its
   `label` and `evidence` (quoted, `overflow-wrap:anywhere`);
d. `profile.caveat` when present (QRIS: CRC validity is not legitimacy);
e. the signals inline, each with its quoted `evidence`; the audit panel stays the
   full-surface view, so the bubble does not need a "Lihat bukti" jump link.

Expansion state is local to the bubble and keyed by `stage.id`; completion never
force-closes it.

### 4.3 Status taxonomy and copy

The UI never recomputes status; it prints `AgentStage.status`.

| `status` | shape | word | extra | motion |
|---|---|---|---|---|
| `menunggu` | hollow ring | "Menunggu" | — | none |
| `berjalan` | spinner | "Berjalan" | ms shows `…` | spin only here |
| `selesai` | check | "Selesai" | "· 0 temuan" when `findings === 0` and no note; Identity uses "Tidak melapor" | none |
| `temuan` | filled dot | `N temuan` | count chip | none |
| `dilewati` | dash / strike row | "Dilewati" | `note` | none |
| `gagal` | cross | "Gagal" | `note` | none |

Hard rules:

a. `selesai` with `findings === 0` is never "berhasil".
b. `dilewati`/`gagal` render `note` **in the visible header**; if `note` is absent,
   render "Tidak ada alasan tercatat" and fail review (the contract says the note is
   the honest reason). It must not require expanding the bubble.
c. Status is shape + word; the border colour is identity, never status.
d. `AgentStage.ms` is printed as measured. No rounding up, no minimum display delay.

### 4.4 Orchestrator bubble

The orchestrator owns the run and displays the `scoring` stage. It is **not** a
specialist row.

- Header: Lumina mascot, "Orkestrator", `${specialistCount} agen`.
- Three-step strip from `LUMINA_STEPS`:
  "Jalankan agen → Kumpulkan temuan → Hitung skor".
  Step 3 shows the real `scoring.ms`. Steps 1–2 are the detector phase.
- Crew strip: up to eight 20 px avatars, overlapping by 6 px; the rest collapse to
  `+N`.
- Summary arithmetic: `${completed} selesai · ${skipped} dilewati · ${findings} temuan ·
  ${engineMs} ms`, where `completed` counts `selesai|temuan`, `skipped` counts
  `dilewati`, and `engineMs = trace.totalMs - (voice?.ms ?? 0)`. A failed run prefixes
  `${failed} gagal · ` and sets `data-run-state="gagal"`; a `dilewati` row is never
  counted as "selesai".
- Run state derived, never asserted:

```ts
function runState(stages: AgentStage[], live: boolean): StageStatus {
  if (stages.some((s) => s.status === "gagal")) return "gagal";
  if (live && stages.some((s) => s.id === "voice" && s.status === "berjalan"))
    return "berjalan";
  if (stages.some((s) => s.status === "temuan")) return "temuan";
  return "selesai";
}
```

- While voice streams, the header adds a real line: `${completed} agen selesai ·
  menyusun jawaban…`. `completed` excludes `dilewati` and `gagal`, so the line never
  overstates coverage. This is the only live indicator, and it is true.

### 4.5 Voice bubble

`voice` gets a bubble like a specialist but uses the brand tokens, not an agent hue.
It is the only stage that may render `berjalan`:

- running: `aria-busy="true"` + spinner + "Berjalan"; the ms slot shows `…` rather
  than a ticking counter (no animated numbers);
- settled: "Selesai" or "Dilewati" + `ms` + `note`;
- it always sits last, below the specialists, so the reader sees the crew finish
  before the prose.

---

## 5. The reveal model (honesty)

### 5.1 Why there is no live detector state

`scoreWithTrace` runs every detector synchronously before React renders the turn.
By the time a bubble exists, every detector is `selesai`/`temuan`/`dilewati`. Showing
`menunggu` and flipping it 200 ms later would be a fabricated state transition — the
exact thing `agent-trace.tsx:32-34` and AGENTS.md "Kejujuran yang diuji" forbid.

### 5.2 What animates

The reveal is a **display schedule over a finished trace**, not a second engine.

- The schedule is `motion`'s parent/child variants: `delayChildren: 0.08`,
  `staggerChildren: 0.04`. There is no `revealDelay()` helper and no timer that writes
  status; the engine has already finished before the first paint.

- Each bubble paints with its **real final status**; only opacity/translate animate.
- The stagger is applied by `motion` variants (`staggerChildren: 0.04`), not by
  `setTimeout` state changes.
- Historical turns and reloads render with `initial={false}` / `animate={false}`: no
  stagger, no pulse. The element tree is **not** swapped — only the animation props
  change — so expansion state and focus survive the live→settled transition.
- Reduced motion uses the same tree with the animation disabled, not a different
  `<ol>`; status words and shapes carry the information.

### 5.3 What the user sees while actually waiting

The only real wait is the `/api/companion/answer` request (the voice stage). During
it:

- the crew is already complete with real statuses;
- the voice bubble is `berjalan`; its ms slot shows `…` until the answer lands (no
  ticking counter);
- the orchestrator says `${completed} agen selesai · menyusun jawaban…`.

This gives a live process indicator without inventing detector work. It also answers
the "what is the agent doing" question truthfully: the agents finished; the writer
is writing.

### 5.4 Invariants (tested)

1. `data-status` equals `trace.stages[i].status` on first paint.
2. Advancing fake timers changes no status.
3. `berjalan` appears only on `voice`.
4. `ms` is `AgentStage.ms`, never a reveal delay.
5. `dilewati`/`gagal` always show their note.
6. The run summary is arithmetic, no adjectives.

---

## 6. Identity colour ramp

Add to `src/app/globals.css` `:root`:

```css
--lumina-agent-message: oklch(0.52 0.1 245);
--lumina-agent-link: oklch(0.52 0.1 200);
--lumina-agent-identity: oklch(0.52 0.1 155);
--lumina-agent-conversation: oklch(0.52 0.1 290);
--lumina-agent-job: oklch(0.52 0.1 110);
--lumina-agent-marketplace: oklch(0.52 0.1 335);
--lumina-agent-qris: oklch(0.52 0.1 5);
--lumina-agent-evidence: oklch(0.52 0.1 75);
/* soft variants: same hue, L 0.96 C 0.02 */
--lumina-agent-message-soft: oklch(0.96 0.02 245);
/* … one per agent */
```

and to `@theme inline`:

```css
--color-agent-message: var(--lumina-agent-message);
--color-agent-message-soft: var(--lumina-agent-message-soft);
/* … one per agent */
```

Rules:

a. These tokens are **identity only**: bubble border, avatar tint, rail dot.
b. Status introduces no new hue: the `selesai`/`dilewati` word is neutral `text-txt`,
   `gagal` is `text-danger`, and the only brand-tinted status surface is the live voice
   line (`text-brand-ink`). No green, and never `border-agent-*` for a status.
c. Brand orange (`--lumina-brand`, hue ≈ 40) is excluded from the ramp and remains the
   only action accent.
d. Every border token must reach ≥3:1 against `--lumina-panel` (#fff); the text on the
   soft tint must reach ≥4.5:1. Verify with a contrast check before commit.
e. If two hues are indistinguishable at 2 px, shift one by ±10 and re-check; identity
   is also carried by avatar, name, and label, so hue is redundant by design.

### AGENTS.md §3 addendum

> "Aksen tindakan tetap `--lumina-brand`. Identitas agen memakai ramp
> `--lumina-agent-*`, hanya untuk border/tint bubble agen; status tetap memakai token
> status."

This widens the single-accent rule. **Record the product owner's approval in the
commit body**: the eight-hue ramp was chosen on 2026-11-08 over a neutral ramp, with
brand orange reserved for actions. The other three owners receive the same text before
the commit.

Measured on the shipped values (white `#fff` panel): border hues are 5.2–5.8:1, and
text on the soft tints is 4.6–5.1:1, so both exceed the 3:1 and 4.5:1 floors. Re-check
if a hue is shifted.

---

## 7. Motion

| element | animation | reduced motion |
|---|---|---|
| orchestrator | opacity 0→1, y 4→0, 120 ms | instant |
| specialist list | parent variants, `staggerChildren: 0.04`, `delayChildren: 0.08` | same list, variants off |
| bubble | spring `{stiffness: 380, damping: 30}`, opacity tween 140 ms | same tree, animation off |
| rail | `scaleY 0→1`, 240 ms, origin top | visible, no animation |
| status swap | none — the glyph is static per status | none |
| expand | Radix `Collapsible` mount; content is absent from the tree while closed | instant mount |
| live voice | spinner on the status mark | static filled dot, same row |

Constraints:

- No continuous shimmer anywhere except the live voice spinner.
- No animation on historical renders.
- No animated counters; `ms` prints immediately.
- Reserve the status mark width so a swap cannot shift the row.
- Total entrance ceiling ≈ 520 ms for eight bubbles; beyond that it feels slow.

`motion` is already a dependency; do not add another.

---

## 8. Accessibility

a. One `role="status"` / `aria-live="polite"` region **per run**, outside the list.
   It announces the run summary once when the voice stage settles, and nothing while
   detectors are revealed.
b. The bubble header is a `CollapsibleTrigger asChild` button; Radix supplies
   `aria-expanded` / `aria-controls`. The trigger also carries the visible note for
   `dilewati`/`gagal`. Closed content is unmounted, so task/mechanism/evidence are not
   in the accessibility tree while collapsed.
c. Status is shape + word; colour alone never carries meaning (WCAG 1.4.1).
d. Touch targets: header ≥44 px; any inner control ≥24×24 (WCAG 2.5.8).
e. `aria-busy` only on the voice bubble while it streams.
f. Decorative rail and avatars are `aria-hidden`; the text carries the name.
g. Contrast: body text ≥4.5:1, borders ≥3:1, focus ring visible on both surfaces.
   The focus ring uses `ring-brand-strong` (not `brand-glow`, which is 2.1:1 on white);
   measured `ms` uses `text-txt/70` (not `/45`, which is ~3.4:1 at 10 px).

---

## 9. Width

| width | behaviour |
|---|---|
| ≥ 820 px | orchestrator full turn width; bubbles indented 12 px; label visible |
| 380 px | header truncates the name, keeps status + ms; label `sr-only`; flavour line `line-clamp-1` |
| 320 px | same, with `minmax(0,1fr)`; no horizontal scroll; evidence wraps anywhere |

No fixed columns, no `nowrap` on the row, no nested scroll container.

---

## 10. New detectors

Each detector is pure, local, rule-based, and lives beside the existing ones. Every
signal carries `agent: <id>` and quotes real text in `evidence`. No dependency, no
network, no ML.

### 10.1 `job` — fake job ads and pay-to-earn tasks

Module `src/lib/scoring/job.ts`. A **job-context gate** keeps generic fee language with
`message`:

```ts
const JOB_CONTEXT =
  /\b(?:lowongan|kerja|karier|recruiter|rekrut|kandidat|pelamar|gaji|upah|honor|interview|wawancara|bergabung|tim|posisi|magang|part\s*time|full\s*time)\b/i;
```

Rules (high precision):

| rule | pattern gist | weight |
|---|---|---|
| `job-fee` | `biaya\|bayar\|transfer` + `pendaftaran\|pelatihan\|seragam\|tes kesehatan\|akomodasi` near money | 0.75 |
| `job-pay-to-earn` | `(like\|subscribe\|follow\|rating\|ulasan\|komisi\|misi\|tugas harian)` + `(deposit\|top ?up\|saldo)` | 0.85 |
| `job-personal-rail` | e-wallet name + `transfer\|bayar\|kirim`, or `rekening pribadi\|atas nama` | 0.7 |
| `job-early-data` | `KTP\|selfie KTP\|PIN\|OTP\|nomor rekening\|kartu ATM` before an offer | 0.6 |
| `job-overseas-fee` | `luar negeri\|visa\|tiket pesawat\|paspor` + `biaya\|ditanggung pelamar` | 0.7 |
| `job-brand-lure` | brand token + `wa.me\|t.me\|forms.gle\|bit.ly\|blogspot` | 0.6 |

Noisy traits (free-mail recruiter, "langsung diterima", implausible salary, no PT
name) are **context only**: weight 0.2–0.3, and they are emitted only when a strong
rule already fired, so they can never cross a band alone. A negation gate suppresses
"biaya ditanggung perusahaan/pemberi kerja".

### 10.2 `marketplace` — fake sellers and off-platform payment

Module `src/lib/scoring/marketplace.ts`. Commerce-context gate:

```ts
const SHOP_CONTEXT =
  /\b(?:jual|dijual|harga|murah|beli|barang|toko|seller|penjual|pembeli|ongkir|paket|kiriman|stok|pre\s*order|dp|cod|marketplace|shopee|tokopedia|lazada|bukalapak|blibli|tiktok\s*shop|refund|pengembalian\s+dana|qris)\b/i;
```

The gate includes `dijual`, `harga`, and `murah` because `\bjual\b` does not match
inside "dijual", and the under-price rule is meaningless without its own vocabulary.
A text that mentions a platform *and* a completed on-platform payment
(`Pesanan Shopee sudah dibayar lewat Shopee`) returns no signals: the receipt is the
opposite of the scam being checked.

| rule | pattern gist | weight |
|---|---|---|
| `mkt-offplatform` | `jangan\|tidak` + `lewat\|via\|di` + marketplace token, or `bayar/transaksi di luar marketplace\|aplikasi` | 0.7 |
| `mkt-personal-rail` | e-wallet + transfer/pay/send, or `a.n.` personal name | 0.6 |
| `mkt-giftcard-crypto` | `gift card\|voucher google play\|bitcoin\|usdt\|crypto` | 0.7 |
| `mkt-qris-refund` | `qris` + `refund\|pengembalian dana\|pembatalan` + `scan` | 0.7 |
| `mkt-underprice` | `harga\|murah` + `\d+%` or `di bawah pasaran` | 0.35 |
| `mkt-dp` | `dp\|uang muka\|booking fee` + `transfer` | 0.45 |
| `mkt-fake-resi` | `resi\|nomor kirim` + `belum\|tidak bisa dilacak` | 0.35 |
| `mkt-urgency` | `sisa \d\|terakhir\|hari ini` + `transfer` | 0.3 |

Do **not** re-run domain/typosquat checks here; `link.ts` owns domains. "New account /
no badge / no address" is not visible in a pasted message and is deliberately not
detected — document that gap in the module comment.

### 10.3 `qris` — QRIS payload inspection

Module `src/lib/scoring/qris.ts`, ported from `verssache/qris-dinamis` (MIT; keep the
header and add an `ATTRIBUTION.md` entry).

- `extractQrisPayload(text)`: longest substring starting `0002` and containing `6304`.
- `parseQris(payload)`: TLV walk `[2-digit tag][2-digit length][value]`; required
  `00,52,53,58,59,60,63`; CRC-16/CCITT (poly `0x1021`, init `0xFFFF`) over everything
  through `6304`.
- `qrisSignals(text)`:
  - no payload → no signals + note "Tidak ada payload QRIS." (`dilewati`); when the
    text mentions QRIS/QR, the note adds that image decoding is not available and the
    payload must be pasted as text;
  - payload contains `http://`, `https://`, `wa.me`, or any URI scheme → quishing
    (0.9);
  - CRC invalid → malformed/tampered (0.6);
  - tag `53 ≠ 360` or `58 ≠ ID` → cross-border/odd (0.4);
  - tag `59` merchant name does not overlap a name typed in the message → possible
    sticker swap (0.5), only when the message names a merchant;
  - tag `51` GUI/NMID parsing is best-effort; a missing NMID is a note, not a signal.
- A valid CRC is never treated as legitimacy: the registry `caveat` renders "CRC valid
  hanya berarti formatnya benar; cocokkan nama merchant di layar sebelum membayar."
  in the expanded bubble, and a clean QRIS row never reads as "aman".
- **Input-path limitation, stated not hidden:** `/api/companion/vision` copies text;
  it does not decode a QR matrix. A user who pastes a photo of a sticker gets the
  no-payload note, not a silent pass. A real image path is out of scope for this plan;
  the limitation is visible instead of faked.

### 10.4 Ownership and de-duplication

- `message` keeps generic urgency/authority/OTP/fee language.
- `job` fires only under the job gate; `marketplace` only under the commerce gate;
  `qris` only with a real payload.
- `dedupe()` is by `label`; new labels are distinct, and the `message` quishing rule
  defers entirely when the text carries a `000201` payload (the `qris` agent owns it).
- `rekening pribadi` stays owned by `message/off-marketplace`; `marketplace` reaches the
  same scheme through a platform token, so the two agents quote different substrings.
  Likewise `biaya administrasi` stays with `message`'s admin-fee rule; `job-fee` names
  the registration/training fee.
- `message/topup-loop` and `job/job-pay-to-earn` may both fire on a task scam that
  mentions "lowongan". They quote different substrings (the bare top-up demand vs the
  task sentence), so this is the allowed two-facet case, not a duplicate; neither rule
  is silenced, because a payout loop outside a job offer must still be caught.
- Tests assert, over a fixture set, that no two agents emit the same `evidence`
  substring — the proxy for double counting — and the job detector emits context
  traits only after a strong rule fires.

### 10.5 Bench and measurement

Every detector ships bench cases in the same commit:

- 3 scam cases per detector (fee, pay-to-earn/off-platform, quishing or overseas),
- 1–2 legitimate traps per detector (real job ad with employer-paid fees, real
  marketplace receipt, valid merchant QRIS with matching name).

The plan uses semantic ids (`job-s01`, `mkt-s01`, `qris-s01`, `job-l01`) so it does not
depend on the scoring plan's numbering. `runEval()` is the only source of the updated
totals; `eval.test.ts`, `score.bench.test.ts`, and `STATUS.md` are updated in the same
commit as the measurement.

---

## 11. Existing surfaces

| surface | change |
|---|---|
| `AgentTraceCard` (`agent-trace.tsx`) | **removed from the thread**; `agent-trace.tsx` and its test are deleted; its collapse pattern moves into the bubble |
| `ThinkingRow` | only for turns with no trace (`tanya`/`obrolan`); the voice bubble replaces it for checked turns |
| `SignalPanel` | `BRANCH_KIND` / `BRANCH_CONDITION` gain the three agents (Task 1) because both are exhaustive `Record<AgentId, …>`; otherwise unchanged. Still the audit surface |
| `AgentsView` / `agents-detail-panel` | registry icons/portraits, 8 rows, four-column lane grid, counts derived from `AGENT_SEQUENCE.length` |
| `ScoreCard` | unchanged; coverage count now reads "dari 8" automatically |
| `AgentsView` static diagram | remains static; it must not read a trace |

The crew is the narrative; the panel is the audit. Both derive from the same trace.

---

## 12. Extensibility recipe (doc + test)

To add a field-agent:

1. Add the id to `AgentId` (`score.ts`) — **contract change; notify the owners**.
2. Add `label`/`task` to `STAGE_LABEL` (`agent-run.ts`) — same commit.
3. Write the pure detector module, tag signals with `agent: <id>`, add a context gate
   that keeps it disjoint.
4. Add the registry row (`agents.ts`): name, flavour, mechanism, purpose, icon,
   `portrait: null`.
5. Add bench cases (scams + legit traps) and run `runEval()`; update the measured
   claims.
6. Run `npm run verify`.

Adding mascot art is step 4b only: drop the jpg in `public/brand/agents/` and set
`portrait`. Nothing else changes.

A test asserts the recipe's mechanical half: every `AgentId` (except `scoring`) has a
registry row, a `STAGE_LABEL` entry, and a position in `AGENT_SEQUENCE`.

---

## 13. Test strategy

### New

`src/components/companion/agent-run.test.tsx`

a. renders the orchestrator plus one bubble per present stage, in sequence order;
b. `data-status` equals the trace status for every bubble;
c. fake timers do not change status;
d. `berjalan` appears only on voice, and only the voice trigger carries
   `aria-busy="true"`;
e. `dilewati`/`gagal` render `note` **visibly in the collapsed header** (assert
   `toBeVisible()`), including the "Tidak ada alasan tercatat" fallback when absent;
f. `selesai` with 0 findings never says "berhasil";
g. expansion is user-controlled and survives both a re-render and the live→settled
   transition (the bubble is not remounted);
h. `role="status"` announces the settle summary once; a historical turn announces
   nothing;
i. no `AgentTraceCard` in the tree;
j. a failed specialist makes `data-run-state="gagal"` and the summary shows the
   failure count instead of "selesai".

`src/components/companion/agents.test.ts` — registry completeness and label equality.

`src/lib/scoring/{job,marketplace,qris}.test.ts` — positives, negatives, context
gates, evidence quotes, and the no-shared-evidence invariant.

### Updated

| file | change |
|---|---|
| `companion-chat.test.tsx` | agent names now appear as bubbles; use `getAllByText`; the `tanya` case still has no bubbles |
| `signal-panel.test.tsx` | derive the count from `AGENT_SEQUENCE.length` |
| `score-card.test.tsx` | derive "dari 8" |
| `companion-entry.test.tsx` | derive "dari 8" |
| `companion-shell.test.tsx` | 8 labels, 8 mascots, `Lihat detail` |
| `agent-trace.test.tsx` | deleted |
| `src/lib/scoring/trace.test.ts` | stage id list includes the three new detectors; orchestrator still 0 findings |
| `src/lib/scoring/eval.test.ts` | totals after measurement |

---

## 14. Risks and rejected alternatives

| risk | mitigation |
|---|---|
| Nine bubbles read as spam | nested rail + 44 px settled rows (flavour line only while live/expanded); answer stays outside; the research supports compact rows, not nine full-width bubbles |
| Per-agent hues violate §3 | product owner approved the eight-hue ramp on 2026-11-08; documented token ramp + explicit §3 addendum + brand reserved for actions |
| New `AgentId`s break a consumer | additive union; typecheck forces every `Record<AgentId/StageId>`; Task 1 fills all six maps in the same commit and notifies owners |
| Detector overlap double-counts | context gates + no-shared-evidence test + labels + the `message` quishing gate defers to `qris` on a payload |
| Staged reveal reads as fake progress | real statuses from first paint; only voice is live; no element swap on settle, so expansion/focus survive |
| QRIS parser wrong | literal valid vectors (`2908`, `41C7`), separate broken-CRC case, `caveat` rendered, input-path limitation stated |
| QRIS looks clean because the payload was a photo | the no-payload note names the image limitation; the row is `dilewati`, never "aman" |
| Motion hurts accessibility | reduced-motion uses the same tree with animation off; shape+word status |

Rejected:

a. **LLM-written agent dialogue** — violates §4 and the privacy boundary.
b. **Fake per-detector running states** — the defect the honesty rules name.
c. **Collapse-to-summary on completion** — the user asked for persistent bubbles, and
   every trace UI keeps its ledger.
d. **Full-width bubbles for all eight** — too heavy at 380 px.
e. **Adopting AG-UI or AI Elements** — a transport we do not need; a dependency that is
   deprecated in three weeks.

---

## 15. Research basis

- Anthropic, *Building effective agents* (2024-12-19) — workflow vs agent.
- Anthropic, *How we built our multi-agent research system* (2025-06-13) — trace
  decisions, not contents; terminal citation pass.
- Magentic-One (arXiv:2411.04468) — plan vs progress ledger.
- A2A, *Life of a Task* — terminal task immutability; `input-required`.
- AWS Bedrock multi-agent — supervisor + disjoint collaborators.
- MAST (arXiv:2503.13657) — failures are design failures; verification is the weak
  category.
- TRAIL (arXiv:2505.08638) — model trace-reading is unreliable; structure for humans.
- Linear agent interaction, Devin, Copilot Workspace, Perplexity, ChatGPT deep
  research — status contract, plan-as-progress, keep the ledger.
- assistant-ui RunActivity, Vercel AI Elements Task/Tool, CopilotKit subagents,
  Chainlit Step — disclosure and status primitives (structure only; AI Elements is
  deprecated end of Nov 2026).
- AG-UI events, Vercel AI SDK stream parts, OpenAI Responses, Anthropic streaming,
  OTel GenAI semconv — event vocabulary; our trace is already sufficient.
- WCAG 1.4.1, 1.4.11, 2.5.8, reflow — status redundancy, contrast, target size.
