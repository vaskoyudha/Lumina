# Report template — contact registry

**Date:** 2026-11-10
**Registry:** `src/data/report-contacts.ts`
**Feature:** `docs/report-template.md`

---

## 0. Why this file exists

`REPORT_CHANNELS` in `src/data/tactics.ts` answers *which institution applies to
this scheme*. This registry answers *how to reach it*. Digits live here once, so
a contact change is a one-line edit and a single re-verification, not twelve.

Policy inherited from `tactics.ts:274`: **no hotline number, mailbox, or address
ships unless it was read from the institution's own page.** When a page cannot
be read, the entry is marked `verifiedAt: "existing"` and keeps only the link
that was already in the repo. A number is never guessed, and a plausible-looking
short code is not enough.

---

## 1. Registry

| Channel id | Kind | Label | Value | Source | Verified |
|---|---|---|---|---|---|
| `iasc` | `tel` | Telepon | `157` | `ojk.go.id/.../Kontak.aspx` | 2026-11-10 |
| `iasc` | `wa` | WhatsApp | `6281157157157` | `ojk.go.id/.../Jadwal-Operasional-Kontak-157.aspx` | 2026-11-10 |
| `iasc` | `email` | Email | `konsumen@ojk.go.id` | `ojk.go.id/.../Kontak.aspx` | 2026-11-10 |
| `iasc` | `form` | Formulir pengaduan | `kontak157.ojk.go.id/appkpublicportal/Pengaduan` | `ojk.go.id/.../Kontak.aspx` | 2026-11-10 |
| `komdigi` | `form` | Formulir aduan nomor | `aduannomor.id/buat-laporan` | `aduannomor.id` | 2026-11-10 |
| `komdigi` | `wa` | WhatsApp | `628118331316` | `aduannomor.id/pertanyaan-yang-sering-diajukan` | 2026-11-10 |
| `komdigi` | `email` | Email | `aduanite@mail.komdigi.go.id` | `aduannomor.id/pertanyaan-yang-sering-diajukan` | 2026-11-10 |
| `patrolisiber` | `form` | Formulir laporan | `patrolisiber.id` | `patrolisiber.id` | existing |
| `cekrekening` | `form` | Cek dan laporkan rekening | `cekrekening.id` | `cekrekening.id` | existing |

Operational notes shipped with the entries:

a. Kontak 157 runs 24 hours every day. Digital chat (WhatsApp/Instagram/Facebook)
   runs 07.45–16.50 WIB.
b. AduanNomor needs a KTP photo and evidence before a report can be submitted:
   maximum 8 files, 35 MB total, jpg/png/mp3/wav/pdf.
c. Patroli Siber and CekRekening publish forms, not mailboxes. Do not add an
   email for them unless one is published and verified.

---

## 2. Normalisation

a. `tel` values are digits only (`157`), used as `tel:157`.
b. `wa` values are international form starting with `62`, no `+`, no spaces:
   `081-157-157-157` → `6281157157157`; `08118331316` → `628118331316`.
c. `email` values are the mailbox exactly as published.
d. `form` values are https URLs.

Tests enforce a–d in `src/data/report-contacts.test.ts`.

---

## 3. Bank numbers are deliberately absent

The bank is the first call in a real fraud case, but call-center numbers change
and a wrong digit sends a victim to a stranger. The card therefore says: call
the number printed on the card or in the bank's official app, then ask for the
access to be frozen. No bank digits are stored, and there is no per-bank map.

---

## 4. Re-verification checklist

Run this before changing any value, and at least once before a new submission or
release:

a. Open the `source` URL and confirm the value on the institution's own page.
   Aggregators, news articles, and social posts do not count.
b. Update `value`, `verifiedAt` (ISO date), and `source` together.
c. If the page refuses automated fetch (403), do **not** claim a fresh
   verification: keep `verifiedAt: "existing"` and change nothing else.
d. Confirm the WhatsApp number still resolves to `wa.me/<digits>` and is not a
   premium short code.
e. For form channels, confirm the URL still loads a form rather than a homepage.
f. Run `npm test -- src/data/report-contacts.test.ts`.

Known limitation: on 2026-11-10, `patrolisiber.id` and `cekrekening.id` returned
HTTP 403 to automated fetches. Their links are unchanged from what the repo
already shipped; no new contact value was added.

---

## 5. Adding a channel

a. Add the id to `ReportChannelId` in `src/data/report-contacts.ts`.
b. Add its contacts, each with `source` and `verifiedAt`.
c. Point `REPORT_CHANNELS` in `src/data/tactics.ts` at the new id (scheme
   mapping only; do not duplicate the value).
d. Teach `INSTITUTION` in `src/lib/companion/report-template.ts` the display
   name used in "Kepada …".
e. Run the contact test and `src/lib/companion/report-template.test.ts`.

---

## 6. Related

- `docs/report-template.md` — behaviour, privacy, failure modes, screenshots.
- `docs/superpowers/specs/2026-11-10-report-template-design.md` — decisions.
- `docs/superpowers/plans/2026-11-10-report-template.md` — implementation steps.
