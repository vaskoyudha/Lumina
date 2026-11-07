import { describe, expect, it } from "@jest/globals";
import { detectMessage, HARD_RULES } from "@/lib/scoring/message";
import { scoreText } from "@/lib/scoring/score";

/**
 * Messages the engine must not accuse. Found by reading what the detectors
 * actually match on 8 Nov 2026, not by widening a corpus:
 *
 *   a. a honest transfer confirmation names a recipient ("a.n.") and a bank
 *      account, and the old quishing rule treated both as a scheme;
 *   b. describing how QRIS works is not asking someone to scan a sticker;
 *   c. warning "jangan buka file .apk" is the opposite of asking to install it.
 *
 * Each assertion is the measurement that turned red before the fix.
 */

const ruleIds = (text: string) => detectMessage(text).map((hit) => hit.rule.id);

describe("Message Agent — legitimate messages stay clean (8 Nov 2026)", () => {
  it("does not flag a class treasurer's transfer confirmation", () => {
    const text =
      "Pembayaran sudah saya transfer ke rekening kelas. Nama penerima a.n. Bendahara Kelas, tolong dicek.";
    const result = scoreText({ text });

    expect(ruleIds(text)).not.toContain("quishing");
    expect(ruleIds(text)).not.toContain("off-marketplace");
    expect(result.score).toBe(0);
    expect(result.risk).toBe("bersih");
  });

  it("does not flag advice to check the recipient name", () => {
    const text =
      "Sebelum transfer, cocokkan nama penerima di layar. Kalau a.n. tidak cocok, batalkan.";
    const result = scoreText({ text });

    expect(ruleIds(text)).not.toContain("quishing");
    expect(result.score).toBe(0);
    expect(result.risk).toBe("bersih");
  });

  it("does not treat a QRIS payment method description as quishing", () => {
    const text =
      "Pembayaran QRIS di aplikasi resmi langsung tercatat di riwayat transaksi.";
    const result = scoreText({ text });

    expect(ruleIds(text)).not.toContain("quishing");
    expect(result.score).toBe(0);
    expect(result.risk).toBe("bersih");
  });
});

describe("Message Agent — scam shapes still fire", () => {
  it("keeps catching a QRIS sticker that asks for payment", () => {
    const text =
      "Barang sudah dikemas, bayar sisa ongkir via QRIS pada stiker ini (nama penerima a.n. Hadi Wibowo).";
    const result = scoreText({ text });

    expect(ruleIds(text)).toContain("quishing");
    expect(result.risk).toBe("tinggi");
    expect(result.modus).toBe("quishing-qris");
  });

  it("does not treat a warning against opening an APK as a request to open it", () => {
    const text =
      "Jangan buka file undangan.apk dari pengirim yang tidak dikenal.";
    const result = scoreText({ text });

    expect(ruleIds(text)).not.toContain("apk");
    expect(result.score).toBe(0);
    expect(result.risk).toBe("bersih");
  });

  it("still fires when the sender asks the reader to open the APK", () => {
    const text = "Jangan lupa buka file undangan.apk ya, besok acaranya.";
    const result = scoreText({ text });

    expect(ruleIds(text)).toContain("apk");
    expect(result.risk).toBe("tinggi");
    expect(result.hardOverride).toBe(false);
  });

  it("keeps the OTP request after a warning sentence in the same message", () => {
    const text =
      "Jangan pernah bagikan kode OTP kepada siapa pun. Kalau petugas meminta, kirim kode verifikasi ke nomor ini.";
    const result = scoreText({ text });

    expect(ruleIds(text)).toContain("otp-request");
    expect(result.hardOverride).toBe(true);
    expect(result.risk).toBe("tinggi");
  });
});

describe("hard indicators name only what really forces the top band", () => {
  it("keeps OTP requests hard and drops the APK extension", () => {
    expect(HARD_RULES.has("otp-request")).toBe(true);
    expect(HARD_RULES.has("apk")).toBe(false);
  });
});
