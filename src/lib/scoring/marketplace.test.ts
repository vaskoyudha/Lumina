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

  it("catches a down-payment demand before shipping", () => {
    const text = "Barang ready. DP 50% transfer dulu sebelum paket dikirim.";
    expect(has(text, /dp|uang muka/i)).toBe(true);
  });

  it("catches a thousands-separated Rupiah down payment", () => {
    expect(
      has("Barang ready. DP Rp200.000 transfer dulu.", /dp|uang muka/i),
    ).toBe(true);
    expect(
      has("Barang ready. DP 1.500.000 transfer dulu.", /dp|uang muka/i),
    ).toBe(true);
  });

  it("catches a booking fee and a spelled-out down payment", () => {
    expect(
      has("Barang ready. Booking fee Rp50.000 bayar dulu ya.", /dp|uang muka/i),
    ).toBe(true);
    expect(has("Uang muka 30% via transfer dulu.", /dp|uang muka/i)).toBe(true);
  });

  it("catches prefixed and abbreviated down-payment wording", () => {
    expect(has("Barang ready. DP 50% dibayar dulu.", /dp|uang muka/i)).toBe(
      true,
    );
    expect(
      has("Barang ready. DP Rp200.000 wajib ditransfer dulu.", /dp|uang muka/i),
    ).toBe(true);
    expect(has("Barang ready. DP 200rb transfer dulu.", /dp|uang muka/i)).toBe(
      true,
    );
    expect(
      has("Barang ready. DP 50 persen transfer dulu.", /dp|uang muka/i),
    ).toBe(true);
  });

  it("catches a reversed down-payment wording", () => {
    expect(has("Barang ready. transfer DP 50% dulu.", /dp|uang muka/i)).toBe(
      true,
    );
    expect(
      has("Barang ready, transfer DP Rp200.000 dulu ya.", /dp|uang muka/i),
    ).toBe(true);
    expect(
      has("Barang ready, transfer DP 200rb dulu ya.", /dp|uang muka/i),
    ).toBe(true);
  });

  it("does not read a reversed past transfer as a demand", () => {
    expect(has("Saya sudah transfer DP 50% kemarin.", /dp|uang muka/i)).toBe(
      false,
    );
    expect(has("sudah saya transfer DP 50%.", /dp|uang muka/i)).toBe(false);
  });

  it("keeps a demand that is followed by talk of a past transfer", () => {
    expect(
      has(
        "Barang ready. DP 50% transfer dulu, sudah saya transfer kemarin.",
        /dp|uang muka/i,
      ),
    ).toBe(true);
  });

  it("ignores a zero down payment", () => {
    expect(has("Barang ready. DP Rp0 transfer.", /dp|uang muka/i)).toBe(false);
    expect(has("Barang ready. DP Rp 0 transfer.", /dp|uang muka/i)).toBe(false);
  });

  it("does not call an already-paid down payment a demand", () => {
    expect(has("DP 50% sudah saya transfer kemarin ya.", /dp|uang muka/i)).toBe(
      false,
    );
    expect(
      has("DP 50% sudah dibayar lewat transfer bank.", /dp|uang muka/i),
    ).toBe(false);
    expect(
      has("Barang ready. DP 50% lunas via transfer.", /dp|uang muka/i),
    ).toBe(false);
    expect(
      has("Barang ready. DP 100% lunas, transfer berhasil.", /dp|uang muka/i),
    ).toBe(false);
  });

  it("does not read an unrelated percentage as a down payment", () => {
    expect(has("Barang ready. DP 1234% transfer.", /dp|uang muka/i)).toBe(
      false,
    );
    expect(has("Barang ready, diskon 50% transfer.", /dp|uang muka/i)).toBe(
      false,
    );
    expect(
      has(
        "Barang ready. Promo DP 0% untuk cicilan, bayar per bulan.",
        /dp|uang muka/i,
      ),
    ).toBe(false);
    expect(
      has(
        "Barang ready. DP 2% cashback, transfer ke rekening toko.",
        /dp|uang muka/i,
      ),
    ).toBe(false);
  });

  it("catches an untraceable receipt", () => {
    const text = "Paket sudah dikirim, tapi nomor resi tidak bisa dilacak.";
    expect(has(text, /resi/i)).toBe(true);
  });

  it("catches stock/time pressure to transfer", () => {
    const text = "Sisa 2 stok saja, hari ini transfer biar langsung dikirim.";
    expect(has(text, /stok|waktu/i)).toBe(true);
  });

  it("catches a personal account name", () => {
    const text = "Barang masih ada, transfer ke rekening a.n. Budi ya.";
    expect(has(text, /nama pribadi|dompet digital|rekening/i)).toBe(true);
  });

  it("credits every finding to the marketplace agent", () => {
    const text =
      "Barang masih ada. Jangan lewat Shopee ya, transfer langsung ke rekening pribadi saya.";
    const signals = marketplaceSignals(text).signals;
    expect(signals.length).toBeGreaterThan(0);
    expect(signals.every((signal) => signal.agent === "marketplace")).toBe(
      true,
    );
  });
});
