import type { EvidenceBundle } from "@/lib/contracts/evidence";
import {
  buildReportModel,
  chronologyLines,
  formatIndonesianDate,
  formatIndonesianDateTime,
  formatRupiah,
  missingReportFields,
  type ReportDraft,
} from "@/lib/darurat/report";

const BUNDLE: EvidenceBundle = {
  artifacts: [
    {
      id: "a1",
      label: "Bukti transfer",
      kind: "text",
      value: "Transfer Rp1.000.000",
      capturedAt: "2026-11-05T13:00:00.000Z",
    },
  ],
  timeline: [],
  narrative: "Narasi dari companion.",
};

const DRAFT: ReportDraft = {
  reporterName: "Siti",
  reporterPhone: "0812",
  incidentAt: "2026-11-05T20:14",
  location: "Jakarta",
  perpetratorAccount: "123",
  perpetratorBank: "BCA",
  lossAmount: "2500000",
  chronology: "Baris pertama\n\n  Baris kedua  \n",
  narrative: "",
};

describe("report model", () => {
  it("formats rupiah from digits without producing NaN", () => {
    expect(formatRupiah("2500000")).toBe("Rp2.500.000");
    expect(formatRupiah("")).toBe("Rp0");
    expect(formatRupiah("abc")).toBe("Rp0");
  });

  it("formats Indonesian dates without locale drift", () => {
    expect(formatIndonesianDate("2026-11-05T10:00:00")).toBe("5 November 2026");
    expect(formatIndonesianDateTime("2026-11-05T20:14")).toBe(
      "5 November 2026, 20.14",
    );
    expect(formatIndonesianDate("bukan tanggal")).toBe("bukan tanggal");
  });

  it("drops blank chronology lines but keeps order", () => {
    expect(chronologyLines("satu\n\n dua \n")).toEqual(["satu", "dua"]);
  });

  it("names the fields a bank report cannot be made without", () => {
    expect(missingReportFields(DRAFT)).toEqual([]);
    expect(
      missingReportFields({
        ...DRAFT,
        reporterName: " ",
        perpetratorAccount: "",
        chronology: "",
      }),
    ).toEqual(["nama pelapor", "nomor rekening pelaku", "kronologi"]);
  });

  it("builds one model for both preview and PDF", () => {
    const model = buildReportModel(DRAFT, BUNDLE, "File APK via WhatsApp");

    expect(model.reporter.name).toBe("Siti");
    expect(model.incident.loss).toBe("Rp2.500.000");
    expect(model.incident.modus).toBe("File APK via WhatsApp");
    expect(model.chronology).toEqual(["Baris pertama", "Baris kedua"]);
    expect(model.narrative).toBe("Narasi dari companion.");
    expect(model.artifacts).toBe(BUNDLE.artifacts);
  });
});
