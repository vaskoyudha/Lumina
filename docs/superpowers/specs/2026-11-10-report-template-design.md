# Report template tool — design

**Date:** 2026-11-10
**Status:** Approved design, not implemented
**Source of truth:** this file. Plan not written yet.
**Branch:** `codex/report-template` (worktree `/home/vyns/.local/share/opencode/worktree/300b12/report-template`)

---

## 0. Goal and non-goals

### Goal

Give the companion a report-drafting tool that turns a verdict into something a
victim can actually send, per institution:

a. inside the existing "Kalau sudah terlanjur" block, the user opens a short form
   (nama, nomor/akun pelaku, kerugian) and gets a plain-text report template;
b. the template is assembled **deterministically** from the verdict and the
   channel, then optionally polished by the model (tone only);
c. each channel row exposes real actions: **Salin**, **Telepon** (`tel:`),
   **WhatsApp** (`wa.me`), **Email** (`mailto:` with prefilled subject+body),
   **Buka formulir**;
d. contacts are the verified institution channels, not invented hotlines;
e. the bank step stays text-only ("nomor di belakang kartu") — no digits shipped;
f. the whole card degrades to the raw skeleton when the model is unset or times
   out, exactly like the chat lanes.

### Non-goals

a. No change to `scoreText()` or to any detector weight. The template reads the
   verdict; it never writes one.
b. No model-callable tool (`report_draft`) that summons the card from chat. Only
   a polish endpoint ships. Adding a third tool-calling path is a separate
   decision.
c. No persistence. No saved reports, no journal, no server storage, no logging of
   the fields.
d. No quotes copied from the checked message. Evidence enters only if the user
   types it into the kronologi field.
e. No bank call-center dataset, no address book, no addresses (`tactics.ts:274`
   policy).
f. No new product surface outside `components/companion/` and its data/contracts.

---

## 1. Ground truth (verified 2026-11-10)

Read from the repo:

a. `ReportChannel` is `{ label, href, note }` and `REPORT_CHANNELS` maps all
   twelve `modus.json` ids to 2–3 channels (`src/data/tactics.ts:277-323`).
b. `explain()` sets `report = []` when `result.modus === "tidak-dikenali"`
   (`src/lib/companion/explain.ts:207-209`).
c. `classifyModus()` returns `UNRECOGNIZED_ID` when no keyword or OTP+authority
   pair matches (`src/lib/scoring/score.ts:103-115`), while the OTP hard rule
   raises the band to 70 independently (`score.ts:303-306`).
d. **Probe 2026-11-10:** `"Kirim kode OTP 6 digit yang baru saja masuk ke nomor
   ini sekarang."` → `score 100`, `risk tinggi`, `modus tidak-dikenali`,
   `explain().report = []`. The worst case currently renders no reporting block.
e. The report block prints "belum ada kanal laporan khusus" whenever
   `unrecognized` (`src/components/companion/explanation-card.tsx:259-263`).
f. The tool layer already exists once: `JOB_SEARCH_TOOL` schema, a
   `tools` field in the answer route, and a `POST /api/companion/tools/summary`
   endpoint. A second endpoint follows the same shape.
g. No `tel:` or `mailto:` link exists anywhere in `src/` today.

Verified institution contacts (fetched 2026-11-10, URLs recorded per entry):

| Channel | Actions | Value | Source |
|---|---|---|---|
| OJK (IASC / Kontak 157) | `tel` | `157` | `https://ojk.go.id/id/kanal/edukasi-dan-perlindungan-konsumen/tentang-epk/Pages/Kontak.aspx` |
| OJK | `wa` | `6281157157157` (`081-157-157-157`) | `https://ojk.go.id/id/berita-dan-kegiatan/publikasi/Pages/Jadwal-Operasional-Kontak-157.aspx` |
| OJK | `email` | `konsumen@ojk.go.id` | same as tel |
| OJK | `form` | `https://kontak157.ojk.go.id/appkpublicportal/Pengaduan` | same as tel |
| Komdigi AduanNomor | `form` | `https://aduannomor.id/buat-laporan` | `https://aduannomor.id/` |
| Komdigi AduanNomor | `wa` | `628118331316` (`08118331316`, WhatsApp only) | `https://aduannomor.id/pertanyaan-yang-sering-diajukan` |
| Komdigi AduanNomor | `email` | `aduanite@mail.komdigi.go.id` | same |
| Patroli Siber | `form` | `https://patrolisiber.id` | link already in the repo; re-fetch returned 403 to the fetcher, so no new value is added |
| CekRekening | `form` | `https://cekrekening.id` | link already in the repo; re-fetch returned 403 to the fetcher, so no new value is added |

Only the OJK and Komdigi rows were re-read from the institutions' own pages on
2026-11-10. Patroli Siber and CekRekening keep the `href` already shipped and
gain no new contact value; they are marked `verifiedAt: "existing"` rather than
being claimed as re-verified today.

Operational facts that belong in the channel note, not invented copy:

a. Kontak 157 runs 24 hours every day; digital chat (WA/IG/FB) runs 07.45–16.50
   WIB.
b. AduanNomor requires a KTP photo and evidence (max 8 files, 35 MB total,
   jpg/png/mp3/wav/pdf) before a report can be submitted.
c. Patroli Siber and CekRekening publish forms, not mailboxes; the card must not
   print an email that does not exist.

---

## 2. Data model

New `src/data/report-contacts.ts`:

```ts
export type ContactKind = "tel" | "wa" | "email" | "form";

export interface ReportContact {
  kind: ContactKind;
  label: string;      // "Telepon 157", "WhatsApp", "Email", "Formulir"
  value: string;      // raw value: "157", "6281157157157", "konsumen@ojk.go.id", URL
  note?: string;      // hours, requirements; never a claim about outcome
  source: string;     // verification URL, printed nowhere
  verifiedAt: string; // ISO date, printed nowhere
}

export type ReportChannelId = "iasc" | "komdigi" | "patrolisiber" | "cekrekening";

export const REPORT_CONTACTS: Readonly<
  Record<ReportChannelId, readonly ReportContact[]>
>;
```

`ReportChannel` in `tactics.ts` gains `id: ReportChannelId`; its `href` becomes
the primary `form` value so existing consumers keep working. The four channel
constants (`IASC`, `KOMDIGI`, `POLISI`, `CEKREKENING`) map 1:1 to the ids.

Rationale for a separate registry: `REPORT_CHANNELS` answers *which institution
applies to this scheme*; `REPORT_CONTACTS` answers *how to reach it*. Mixing them
duplicates digits across twelve entries and makes a contact change a twelve-line
edit.

---

## 3. Template skeleton

New `src/lib/companion/report-template.ts`, pure and synchronous:

```ts
export interface ReportInputs {
  name?: string;
  perpetrator?: string; // nomor / rekening / akun
  loss?: string;        // "Rp1.500.000"
  narrative?: string;   // kronologi, user-written
}

export function buildReportDraft(args: {
  result: ScoreResult;
  inputs: ReportInputs;
  channel: ReportChannelId;
}): { subject: string; body: string };
```

Body shape (Indonesian, plain text, no markdown, no score, no percentage):

```
Kepada <institution>,

Saya ingin melaporkan dugaan penipuan melalui <saluran>.
Modus yang saya alami: <nama modus from modus.json>.

Nama pelapor: [NAMA ANDA]
Nomor/akun pelaku: [NOMOR ATAU REKENING PELAKU]
Tanggal kejadian: [TANGGAL]
Jumlah kerugian: [JUMLAH KERUGIAN]
Kronologi: [KRONOLOGI SINGKAT]
Bukti yang saya lampirkan: [DAFTAR BUKTI]

Mohon nomor tiket laporan agar saya dapat memantau tindak lanjutnya.
```

Rules:

a. Unfilled inputs render as the bracketed blank, never as an invented value.
b. `result.modus === "tidak-dikenali"` omits the "Modus" line rather than naming
   a scheme the engine did not match.
c. No tactic names, no quotes, no evidence substrings. The engine's `signals`
   stay out of the body.
d. `subject` per channel: `"Laporan dugaan penipuan — <nama modus>"`, and
   `"Laporan dugaan penipuan"` for unrecognized.
e. Hard cap: 700 characters before URL encoding, so `wa.me` and `mailto:` stay
   under practical limits. The builder trims the narrative field first, then
   stops adding optional lines; blanks are never dropped.
f. The bank row is not a `ReportChannelId`. It renders as a note-only step with
   no link, telling the user to call the number on the card/app.

---

## 4. Polish endpoint

New `src/app/api/companion/tools/report/route.ts`, mirroring
`api/companion/tools/summary`:

```ts
// request, zod .strict()
{ channelId: ReportChannelId, draft: { subject, body }, facts: { modus: string, tactics: string[] } }
```

a. `readJson(request, 65536)`, `limitAI(request, "text")`, 20 s deadline,
   `max_tokens` 600.
b. System prompt: rewrite tone only; keep every `[BLANK]` verbatim; never add
   facts, names, numbers, amounts, or legal claims; same language (Indonesian);
   at most 140 words; no markdown, no lists.
c. Response `{ text }` on success, `503 not-configured` when `LUMINA_LLM_URL` or
   `LUMINA_LLM_MODEL` is empty, `400 invalid-request` on schema failure.
d. The client keeps the deterministic draft and only swaps in the polished text
   when the response parses and still contains every blank. A polish that drops a
   blank is discarded — the skeleton wins.

Privacy: the payload contains only the user's typed fields, the scheme name, the
channel id, and tactic names. It never contains the checked message, its quotes,
or the score.

---

## 5. UI

New `src/components/companion/report-template.tsx`, mounted at the bottom of the
`report` card in `explanation-card.tsx`.

Flow:

a. Disclosure "Buat template laporan" (a button, `aria-expanded`).
b. Three inputs + one textarea: nama, nomor/akun pelaku, kerugian, kronologi.
   All optional; empty means the blank stays.
c. Live preview of the body in a `pre` block, capped visually.
d. Channel selector: the channels from `explanation.report`, plus the bank note.
e. Actions per selected channel: **Salin** (`navigator.clipboard`, with a
   "Tersalin" state that reverts), **Telepon** (`tel:` + the number printed as
   text for desktop), **WhatsApp** (`wa.me/<value>?text=`), **Email**
   (`mailto:<value>?subject=&body=`), **Buka formulir** (`href`, new tab).
f. All links get `rel="noreferrer noopener"` except `tel:`.

Layout: stacks under 380px; actions wrap; touch targets ≥ 44px; no horizontal
scroll. The component is `"use client"` but holds no persistence and no effect
that fetches on mount — polish runs only on the explicit "Rapikan" action, so an
offline demo never waits on the network.

---

## 6. Fold-in fix

`explain()` gains (requires exporting the existing `IASC` and `KOMDIGI`
constants from `tactics.ts`, or moving them into `report-contacts.ts`):

```ts
const report = unrecognized
  ? (result.risk === "tinggi" ? [IASC, KOMDIGI] : [])
  : (REPORT_CHANNELS[result.modus] ?? []);
```

and `explanation-card.tsx` prints, for the unrecognized-but-reported case:
"Polanya belum cocok dengan skema yang dikenal. Kanal di atas tetap menerima
laporan penipuan; langkah pemeriksaan di bawah juga berlaku."

This closes the OTP-only hole in §1d without pretending the scheme was
recognised.

---

## 7. Failure modes

a. Model unset / 503 / timeout → raw skeleton, no error copy, no spinner left
   behind.
b. Clipboard denied → select the text and say "Salin manual"; never fail silently.
c. Email client absent (`mailto:` no-op) → the address is printed as text.
d. Desktop `tel:` no-op → the number is always printed next to the link.
e. Body over the cap → trim narrative, keep blanks, tell the user which field was
   shortened.
f. Contact data stale → `verifiedAt` + `source` live in the registry; a unit test
   asserts every value is non-empty and every `source` is https.

---

## 8. Tests

a. `report-template.test.ts`: every blank preserved; unrecognized omits the modus
   line; no score/percentage appears; 700-char cap trims narrative only; per
   channel subject.
b. `report-contacts.test.ts`: four channels; every contact has `source` https and
   `verifiedAt`; `tel`/`wa` values are digits only; `wa` values start with `62`.
c. `report-template.test.tsx`: open disclosure, type, preview updates, copy
   called, `tel:`/`wa.me`/`mailto:` hrefs correct with encoded body, bank row has
   no link, 380px markup has no fixed width.
d. `explain.test.ts`: OTP-only message yields non-empty `report` (regression for
   §1d); unrecognized + `rendah` still yields `[]`.
e. `explanation-card.test.tsx`: updated note copy; report block renders for the
   OTP-only case; verification still precedes reporting.
f. `route.test.ts`: strict schema rejects extra fields; 503 when unset; polished
   text missing a blank is rejected by the client helper (unit-tested in
   `report-client.test.ts`).

---

## 9. Files

New:

- `src/data/report-contacts.ts`
- `src/lib/contracts/report.ts` (+ test)
- `src/lib/companion/report-template.ts` (+ test)
- `src/lib/companion/report-client.ts` (+ test)
- `src/app/api/companion/tools/report/route.ts` (+ test)
- `src/components/companion/report-template.tsx` (+ test)

Changed:

- `src/data/tactics.ts` — add `id` to `ReportChannel`, keep `href`
- `src/lib/companion/explain.ts` — unrecognized-high fallback
- `src/components/companion/explanation-card.tsx` — mount builder, fix note
- `src/lib/companion/explain.test.ts`, `explanation-card.test.tsx`

Shared surfaces touched: `api/companion`, `components/companion`,
`lib/companion`. Per AGENTS.md this must be called out in the commit/PR.

---

## 10. Risks

a. Contacts change without notice. Mitigation: one registry, `verifiedAt`,
   `source`, and a re-verification checklist entry; the UI never claims a channel
   is guaranteed to answer.
b. Model polish can drift into advice or invented facts. Mitigation: blank check,
   word cap, and discarding any output that fails either.
c. `tel:157` is a short code, not a full number: it only works on Indonesian
   networks and some dialers refuse short codes. Mitigation: the number is
   printed; the WA/email paths work regardless.
d. Scope creep into "save my report". Explicit non-goal (§0c).
