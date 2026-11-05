import type { EvidenceBundle } from "@/lib/contracts/evidence";
import {
  formatIndonesianDateTime,
  type ReportDraft,
} from "@/lib/darurat/report";

/**
 * Hardcoded evidence sample for the emergency report.
 *
 * TODO(stream-A): replace with the real `EvidenceBundle` from
 * `src/lib/scoring/evidence.ts` when A lands it (handoff 6 November).
 * The *shape* is the frozen contract; the contents are placeholder.
 */

export const SAMPLE_BUNDLE: EvidenceBundle = {
  artifacts: [
    {
      id: "chat-undangan",
      label: "Tangkapan layar chat WhatsApp",
      kind: "screenshot",
      value:
        "Nomor +62 812-0000-0000 mengirim file bernama Undangan_Pernikahan.apk.",
      capturedAt: "2026-11-05T13:14:00.000Z",
    },
    {
      id: "file-apk",
      label: "Nama dan ukuran file APK",
      kind: "file",
      value: "Undangan_Pernikahan.apk · 2,4 MB · diunduh dari chat",
      capturedAt: "2026-11-05T13:15:00.000Z",
    },
    {
      id: "rekening-pelaku",
      label: "Rekening tujuan transfer",
      kind: "number",
      value: "BCA 1234567890 a.n. Budi Santoso",
      capturedAt: "2026-11-05T13:31:00.000Z",
    },
    {
      id: "bukti-transfer",
      label: "Bukti transfer",
      kind: "text",
      value: "Transfer Rp2.500.000 pada 5 November 2026 pukul 20.31.",
      capturedAt: "2026-11-05T13:32:00.000Z",
    },
  ],
  timeline: [
    {
      at: "2026-11-05T13:14:00.000Z",
      what: "Pelaku mengirim file APK melalui chat WhatsApp.",
    },
    {
      at: "2026-11-05T13:21:00.000Z",
      what: "Pelaku meminta kode OTP dengan alasan verifikasi undangan.",
    },
    {
      at: "2026-11-05T13:31:00.000Z",
      what: "Pelaku meminta transfer biaya administrasi ke rekening pribadi.",
    },
    {
      at: "2026-11-05T13:45:00.000Z",
      what: "Pelapor menyadari permintaan itu penipuan dan menghubungi bank.",
    },
  ],
  narrative:
    "Pelapor menerima file APK undangan pernikahan dari nomor tak dikenal melalui WhatsApp. Pengirim kemudian meminta kode OTP dan transfer biaya administrasi ke rekening pribadi. Pelapor tidak memberikan OTP, tetapi sudah mengirim uang sebelum menyadari bahwa berkas itu bukan undangan.",
};

/** Editable example values so the PDF can be demonstrated without typing. */
export const SAMPLE_REPORT_DRAFT: ReportDraft = {
  reporterName: "Siti Rahma",
  reporterPhone: "0812-3456-7890",
  incidentAt: "2026-11-05T20:14",
  location: "Jakarta",
  perpetratorAccount: "1234567890",
  perpetratorBank: "BCA",
  lossAmount: "2500000",
  chronology: SAMPLE_BUNDLE.timeline
    .map((entry) => `${formatIndonesianDateTime(entry.at)} — ${entry.what}`)
    .join("\n"),
  narrative: SAMPLE_BUNDLE.narrative,
};
