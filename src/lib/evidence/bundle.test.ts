import { EMPTY_BUNDLE } from "@/lib/contracts/evidence";
import { buildEvidenceBundle } from "@/lib/evidence/bundle";
import { scoreText } from "@/lib/scoring/score";

const NOW = () => new Date("2026-11-05T10:00:00.000Z");

function sentenceCount(text: string): number {
  return text
    .split(/\.\s+/)
    .map((part) => part.trim())
    .filter(Boolean).length;
}

describe("EvidenceBundle producer", () => {
  it("extracts the artifacts a bank clerk can act on", () => {
    const text =
      "Transfer DP Rp500.000 ke rekening 1234567890 a.n. Budi Santoso, lalu konfirmasi ke 081234567890.";
    const result = scoreText({ text });

    const bundle = buildEvidenceBundle([{ text, result }], { now: NOW });
    const values = bundle.artifacts.map((a) => a.value);

    expect(values).toContain("1234567890");
    expect(values).toContain("081234567890");
    expect(values).toContain("Rp500.000");
    expect(
      bundle.artifacts.every((a) => a.capturedAt === NOW().toISOString()),
    ).toBe(true);
  });

  it("never records an OTP code as an artifact", () => {
    const text =
      "OTP Anda: 483221. Jangan berikan kode ini kepada siapa pun, termasuk petugas bank.";
    const result = scoreText({ text });

    const bundle = buildEvidenceBundle([{ text, result }], { now: NOW });

    expect(bundle.artifacts.some((a) => a.value.includes("483221"))).toBe(
      false,
    );
  });

  it("does not mistake a tracking number for a rekening", () => {
    const text =
      "[JNE Express] Paket JD04492332 sudah tiba di gudang kota Anda, estimasi besok pagi.";
    const result = scoreText({ text });

    const bundle = buildEvidenceBundle([{ text, result }], { now: NOW });

    expect(bundle.artifacts).toHaveLength(0);
  });

  it("turns an APK and its link into file/link artifacts", () => {
    const text =
      "Buka undangan-nikah.apk dari wa-undangan.site sekarang, sebelum tautannya kedaluwarsa.";
    const result = scoreText({ text });

    const bundle = buildEvidenceBundle([{ text, result }], { now: NOW });
    const kinds = bundle.artifacts.map((a) => a.kind);

    expect(bundle.artifacts.some((a) => a.value === "undangan-nikah.apk")).toBe(
      true,
    );
    expect(kinds).toContain("file");
  });

  it("writes a 2–4 sentence narrative that quotes the verdict", () => {
    const text =
      "Halaman undangan digital! Buka file undangan-nikah.apk untuk melihat detail acara. Unduh sekarang sebelum tautannya kedaluwarsa ya.";
    const result = scoreText({ text });

    const bundle = buildEvidenceBundle([{ text, result }], { now: NOW });

    expect(bundle.narrative).toContain("risiko tinggi");
    expect(sentenceCount(bundle.narrative)).toBeGreaterThanOrEqual(2);
    expect(sentenceCount(bundle.narrative)).toBeLessThanOrEqual(4);
    expect(bundle.narrative).not.toContain("undefined");
  });

  it("records the recipient name a QRIS report cannot do without", () => {
    const text =
      "Barang sudah dikemas, bayar sisa ongkir via QRIS pada stiker ini (nama penerima a.n. Hadi Wibowo).";
    const result = scoreText({ text });

    const bundle = buildEvidenceBundle([{ text, result }], { now: NOW });
    const name = bundle.artifacts.find(
      (a) => a.label === "Nama penerima yang disebut",
    );

    expect(name?.value).toBe("Hadi Wibowo");
    expect(bundle.artifacts.length).toBeGreaterThan(0);
  });

  it("does not read a pronoun as a recipient name", () => {
    const text =
      "Transfer DP Rp250.000 sudah saya kirim ke rekening 1234567890 atas nama saya sendiri.";
    const result = scoreText({ text });

    const bundle = buildEvidenceBundle([{ text, result }], { now: NOW });

    expect(
      bundle.artifacts.some((a) => a.label === "Nama penerima yang disebut"),
    ).toBe(false);
  });

  it("keeps the timeline in conversation order and deduplicated", () => {
    const first =
      "Halo, saya petugas BNI. Saya perlu kode OTP yang masuk di HP Anda sekarang.";
    const second = "Kirim file undangan.apk ya, jangan bilang siapa-siapa.";
    const bundle = buildEvidenceBundle(
      [
        { text: first, result: scoreText({ text: first }) },
        { text: second, result: scoreText({ text: second }) },
      ],
      { now: NOW },
    );

    expect(bundle.timeline.length).toBeGreaterThanOrEqual(2);
    expect(bundle.timeline[0]?.what).toMatch(/meminta kode otp/i);
    expect(bundle.timeline.every((e) => e.at === NOW().toISOString())).toBe(
      true,
    );
  });

  it("does not call a legitimate receipt a fraud pattern", () => {
    const text =
      "Pesanan #SPO-220202 telah dikirim. Gratis ongkir s.d. 25 Nov. Lihat pengiriman di aplikasi Shopee.";
    const result = scoreText({ text });

    const bundle = buildEvidenceBundle([{ text, result }], { now: NOW });

    expect(result.risk).toBe("bersih");
    expect(bundle.narrative.toLowerCase()).not.toContain("jual-beli");
    expect(sentenceCount(bundle.narrative)).toBeGreaterThanOrEqual(2);
  });

  it("returns the honest empty bundle when nothing was scored", () => {
    const bundle = buildEvidenceBundle([{ text: "halo" }], { now: NOW });
    expect(bundle).toEqual(EMPTY_BUNDLE);
  });
});
