import type { EvidenceBundle } from "@/lib/contracts/evidence";

/**
 * Report model — shared by the on-screen preview and the PDF (§5-D).
 *
 * One model, two renderers. If the preview and the file ever disagree, the
 * person carrying the report to the bank is the one who finds out.
 */

export interface ReportDraft {
  reporterName: string;
  reporterPhone: string;
  /** Value from `<input type="datetime-local">`, or an ISO string. */
  incidentAt: string;
  /** City / place for the signature block. */
  location: string;
  perpetratorAccount: string;
  perpetratorBank: string;
  /** Digits only. Formatting happens at render time. */
  lossAmount: string;
  /** One event per line, oldest first. */
  chronology: string;
  /** 2..4 sentences, same shape as EvidenceBundle.narrative. */
  narrative: string;
}

export interface ReportModel {
  reporter: { name: string; phone: string };
  incident: {
    at: string;
    modus: string;
    loss: string;
    account: string;
    bank: string;
    place: string;
  };
  chronology: string[];
  artifacts: EvidenceBundle["artifacts"];
  narrative: string;
}

/** Fields a bank report cannot work without. */
export const REPORT_REQUIRED_FIELDS = [
  { key: "reporterName", label: "nama pelapor" },
  { key: "perpetratorAccount", label: "nomor rekening pelaku" },
  { key: "chronology", label: "kronologi" },
] as const satisfies ReadonlyArray<{
  key: keyof ReportDraft;
  label: string;
}>;

const MONTHS = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
] as const;

function parseDate(value: string): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/** "5 November 2026" — stable, no locale-dependent formatting. */
export function formatIndonesianDate(value: string): string {
  const date = parseDate(value);
  if (!date) return value || "—";
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

/** "5 November 2026, 20.14" — Indonesian time notation, not 8:14 PM. */
export function formatIndonesianDateTime(value: string): string {
  const date = parseDate(value);
  if (!date) return value || "—";
  return `${formatIndonesianDate(value)}, ${pad(date.getHours())}.${pad(
    date.getMinutes(),
  )}`;
}

/** "2500000" -> "Rp2.500.000". Empty stays honest instead of "RpNaN". */
export function formatRupiah(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "Rp0";
  return `Rp${Number(digits).toLocaleString("id-ID")}`;
}

export function chronologyLines(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function missingReportFields(draft: ReportDraft): string[] {
  return REPORT_REQUIRED_FIELDS.filter(({ key }) => {
    const value = draft[key];
    return typeof value !== "string" || value.trim().length === 0;
  }).map(({ label }) => label);
}

/**
 * The single data source for `ReportPreview` and `ReportDocument`.
 * `bundle` supplies evidence captured by Stream A; `draft` supplies what the
 * person typed. Neither one overrides the other silently.
 */
export function buildReportModel(
  draft: ReportDraft,
  bundle: EvidenceBundle,
  modus: string,
): ReportModel {
  return {
    reporter: {
      name: draft.reporterName.trim() || "—",
      phone: draft.reporterPhone.trim() || "—",
    },
    incident: {
      at: formatIndonesianDateTime(draft.incidentAt),
      modus,
      loss: formatRupiah(draft.lossAmount),
      account: draft.perpetratorAccount.trim() || "—",
      bank: draft.perpetratorBank.trim() || "—",
      place: draft.location.trim() || "—",
    },
    chronology: chronologyLines(draft.chronology),
    artifacts: bundle.artifacts,
    narrative: draft.narrative.trim() || bundle.narrative,
  };
}

export const REPORT_STATEMENT =
  "Saya menyatakan bahwa keterangan di atas benar dan saya membuat laporan ini untuk meminta bank menahan atau memblokir transaksi terkait. Saya bersedia menyerahkan bukti asli bila diminta.";
