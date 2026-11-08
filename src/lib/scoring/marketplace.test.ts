import { marketplaceSignals } from "@/lib/scoring/marketplace";

const has = (text: string, label: RegExp) =>
  marketplaceSignals(text).signals.some((signal) => label.test(signal.label));

describe("marketplaceSignals", () => {
  it("catches payment outside the marketplace", () => {
    const text =
      "Barang masih ada. Jangan lewat Shopee ya, transfer langsung ke rekening pribadi saya.";
    expect(has(text, /di luar marketplace|rekening pribadi/i)).toBe(true);
  });

  it("catches a gift-card/crypto rail", () => {
    const text =
      "Untuk DP barang, bayar pakai voucher Google Play atau USDT saja.";
    expect(has(text, /gift card|voucher|kripto/i)).toBe(true);
  });

  it("catches the QRIS refund trap", () => {
    const text =
      "Refund gagal, scan QRIS ini dulu supaya dana kembali ke rekening kamu.";
    expect(has(text, /refund|qris/i)).toBe(true);
  });

  it("treats an implausible price as context, not a verdict", () => {
    const text = "Dijual cepat, harga 80% di bawah pasaran, transfer dulu.";
    const signals = marketplaceSignals(text).signals;
    expect(signals.some((s) => /harga/i.test(s.label))).toBe(true);
    expect(Math.max(...signals.map((s) => s.weight))).toBeLessThan(0.6);
  });

  it("does not fire on a real marketplace receipt", () => {
    const text =
      "Pesanan Shopee sudah dibayar lewat Shopee. Paket dikirim dengan JNE, resi bisa dilacak di aplikasi.";
    expect(marketplaceSignals(text).signals).toEqual([]);
  });

  it("does not fire outside commerce context", () => {
    expect(
      marketplaceSignals("Transfer Rp50.000 ke rekening pribadi.").signals,
    ).toEqual([]);
  });
});
