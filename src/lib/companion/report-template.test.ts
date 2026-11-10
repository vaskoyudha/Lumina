import { buildReportDraft } from "@/lib/companion/report-template";
import { MODUS_BY_ID } from "@/lib/modus";
import { scoreText } from "@/lib/scoring/score";

const PHISH =
  "Halo, ini dari BCA. Akun Anda akan diblokir dalam 2 jam. " +
  "Verifikasi di https://bca-verif.xyz/login sekarang.";

const OTP_ONLY =
  "Kirim kode OTP 6 digit yang baru saja masuk ke nomor ini sekarang.";

describe("buildReportDraft", () => {
  it("keeps every blank when nothing was typed", () => {
    const result = scoreText({ text: PHISH });
    const { body } = buildReportDraft({
      result,
      inputs: {},
      channel: "iasc",
    });

    expect(body).toContain("[NAMA ANDA]");
    expect(body).toContain("[NOMOR ATAU REKENING PELAKU]");
    expect(body).toContain("[TANGGAL KEJADIAN]");
    expect(body).toContain("[JUMLAH KERUGIAN]");
    expect(body).toContain("[KRONOLOGI SINGKAT]");
    expect(body).toContain("[DAFTAR BUKTI]");
  });

  it("uses typed values and keeps the rest blank", () => {
    const result = scoreText({ text: PHISH });
    const { body } = buildReportDraft({
      result,
      inputs: { name: "Sari", perpetrator: "0812xxxx", loss: "Rp1.500.000" },
      channel: "komdigi",
    });

    expect(body).toContain("Nama pelapor: Sari");
    expect(body).toContain("Nomor/akun pelaku: 0812xxxx");
    expect(body).not.toContain("[NAMA ANDA]");
  });

  it("names the matched scheme in the body and subject", () => {
    const result = scoreText({ text: PHISH });
    const name = MODUS_BY_ID.get(result.modus)?.nama;
    const { subject, body } = buildReportDraft({
      result,
      inputs: {},
      channel: "iasc",
    });

    expect(subject).toContain("Laporan dugaan penipuan");
    expect(body).toContain(`Modus yang saya alami: ${name}`);
  });

  it("omits the modus line when no scheme matched", () => {
    const result = scoreText({ text: OTP_ONLY });
    const { body } = buildReportDraft({
      result,
      inputs: {},
      channel: "iasc",
    });

    expect(result.modus).toBe("tidak-dikenali");
    expect(body).not.toContain("Modus yang saya alami");
  });

  it("never prints a score or a percentage", () => {
    const result = scoreText({ text: PHISH });
    const { body } = buildReportDraft({
      result,
      inputs: {},
      channel: "iasc",
    });

    expect(body).not.toMatch(/\b\d{1,3}\s*\/\s*100\b/);
    expect(body).not.toMatch(/\bskor\b/i);
    expect(body).not.toContain(`${result.score}`);
  });

  it("trims the narrative before anything else when over the cap", () => {
    const result = scoreText({ text: PHISH });
    const narrative = "a".repeat(1200);
    const { body } = buildReportDraft({
      result,
      inputs: { narrative },
      channel: "iasc",
    });

    expect(body.length).toBeLessThanOrEqual(700);
    expect(body).toContain("[NOMOR ATAU REKENING PELAKU]");
    expect(body).toContain("[NAMA ANDA]");
    expect(body).toContain("[DAFTAR BUKTI]");
  });
});
