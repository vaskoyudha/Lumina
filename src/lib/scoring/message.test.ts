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

describe("Message Agent — OTP notifications vs OTP requests", () => {
  it("does not call a bank's own OTP delivery a request", () => {
    const text =
      "Kode OTP 719204 telah kami kirim. Jangan bagikan kode ini kepada siapa pun.";
    const result = scoreText({ text });

    expect(ruleIds(text)).not.toContain("otp-request");
    expect(result.risk).not.toBe("tinggi");
  });

  it("does not call a verification-code delivery a request", () => {
    const text =
      "Kode verifikasi 9081 kami kirim untuk login ke aplikasi. Berlaku 5 menit.";
    const result = scoreText({ text });

    expect(ruleIds(text)).not.toContain("otp-request");
    expect(result.risk).not.toBe("tinggi");
  });

  it("catches the natural 'read it to me' request", () => {
    const text = "Kode OTP sudah masuk? Mohon dibacakan ya, Pak.";
    const result = scoreText({ text });

    expect(ruleIds(text)).toContain("otp-request");
    expect(result.hardOverride).toBe(true);
    expect(result.risk).toBe("tinggi");
  });

  it("catches 'beri tahu 6 angka' as a request", () => {
    const text = "Tolong beri tahu 6 angka yang baru masuk ke HP Anda.";
    const result = scoreText({ text });

    expect(ruleIds(text)).toContain("otp-request");
    expect(result.risk).toBe("tinggi");
  });

  it("catches 'bacakan kode verifikasi' as a request", () => {
    const text = "Bacakan kode verifikasinya ya, supaya bisa saya proses.";
    const result = scoreText({ text });

    expect(ruleIds(text)).toContain("otp-request");
    expect(result.risk).toBe("tinggi");
  });

  it("keeps catching an explicit 'kirim kode verifikasi' request", () => {
    const text = "Kirim kode verifikasi ke nomor ini sekarang.";
    const result = scoreText({ text });

    expect(ruleIds(text)).toContain("otp-request");
    expect(result.risk).toBe("tinggi");
  });
});
