/**
 * Verified reporting contacts, one entry per institution.
 *
 * `REPORT_CHANNELS` in `tactics.ts` answers *which institution applies to this
 * scheme*; this file answers *how to reach it*. Digits live here once.
 *
 * Policy (`tactics.ts:274`): no hotline number ships unless it was read from the
 * institution's own page. `verifiedAt` records when; `source` records where.
 * Re-verify before changing a value; never guess a digit.
 */

export type ContactKind = "tel" | "wa" | "email" | "form";

export interface ReportContact {
  kind: ContactKind;
  /** Button label, e.g. "Telepon 157". */
  label: string;
  /** `tel:`/`wa.me` digits, a mailbox, or an https URL. */
  value: string;
  /** Hours or requirements. Never a promise about the outcome. */
  note?: string;
  /** Page the value was read from. Printed nowhere. */
  source: string;
  /** ISO date of verification; "existing" = kept from the repo, not re-read. */
  verifiedAt: string;
}

export type ReportChannelId =
  | "iasc"
  | "komdigi"
  | "patrolisiber"
  | "cekrekening";

const OJK_KONTAK =
  "https://ojk.go.id/id/kanal/edukasi-dan-perlindungan-konsumen/tentang-epk/Pages/Kontak.aspx";
const OJK_JADWAL =
  "https://ojk.go.id/id/berita-dan-kegiatan/publikasi/Pages/Jadwal-Operasional-Kontak-157.aspx";

export const REPORT_CONTACTS: Readonly<
  Record<ReportChannelId, readonly ReportContact[]>
> = {
  iasc: [
    {
      kind: "tel",
      label: "Telepon",
      value: "157",
      note: "24 jam setiap hari.",
      source: OJK_KONTAK,
      verifiedAt: "2026-11-10",
    },
    {
      kind: "wa",
      label: "WhatsApp",
      value: "6281157157157",
      note: "Chat digital 07.45–16.50 WIB.",
      source: OJK_JADWAL,
      verifiedAt: "2026-11-10",
    },
    {
      kind: "email",
      label: "Email",
      value: "konsumen@ojk.go.id",
      source: OJK_KONTAK,
      verifiedAt: "2026-11-10",
    },
    {
      kind: "form",
      label: "Formulir pengaduan",
      value: "https://kontak157.ojk.go.id/appkpublicportal/Pengaduan",
      note: "Untuk korban penipuan transaksi keuangan.",
      source: OJK_KONTAK,
      verifiedAt: "2026-11-10",
    },
  ],
  komdigi: [
    {
      kind: "form",
      label: "Formulir aduan nomor",
      value: "https://aduannomor.id/buat-laporan",
      note: "Perlu foto KTP dan bukti; maksimal 8 berkas, 35 MB.",
      source: "https://aduannomor.id/",
      verifiedAt: "2026-11-10",
    },
    {
      kind: "wa",
      label: "WhatsApp",
      value: "628118331316",
      note: "Hanya menerima WhatsApp.",
      source: "https://aduannomor.id/pertanyaan-yang-sering-diajukan",
      verifiedAt: "2026-11-10",
    },
    {
      kind: "email",
      label: "Email",
      value: "aduanite@mail.komdigi.go.id",
      source: "https://aduannomor.id/pertanyaan-yang-sering-diajukan",
      verifiedAt: "2026-11-10",
    },
  ],
  patrolisiber: [
    {
      kind: "form",
      label: "Formulir laporan",
      value: "https://patrolisiber.id",
      source: "https://patrolisiber.id",
      verifiedAt: "existing",
    },
  ],
  cekrekening: [
    {
      kind: "form",
      label: "Cek dan laporkan rekening",
      value: "https://cekrekening.id",
      source: "https://cekrekening.id",
      verifiedAt: "existing",
    },
  ],
};
