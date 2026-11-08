import { jobSignals } from "@/lib/scoring/job";

const has = (text: string, label: RegExp) =>
  jobSignals(text).signals.some((signal) => label.test(signal.label));

describe("jobSignals", () => {
  it("catches a training fee in a job ad", () => {
    const text =
      "Lowongan admin online, gaji Rp4 juta. Biaya pelatihan Rp150.000 ditransfer dulu ya.";
    expect(has(text, /biaya pendaftaran|pelatihan/i)).toBe(true);
  });

  it("catches pay-to-earn plus a deposit", () => {
    const text =
      "Tugas harian: like dan subscribe video. Komisi besar, cukup top up saldo Rp100.000 dulu.";
    expect(has(text, /tugas berbayar|top.?up|deposit/i)).toBe(true);
  });

  it("catches a personal e-wallet rail", () => {
    const text =
      "Lowongan kerja freelance. Pembayaran biaya pelatihan via DANA ke nomor 0812xxxx.";
    expect(has(text, /dompet digital|rekening pribadi|e-wallet/i)).toBe(true);
  });

  it("catches an overseas placement fee", () => {
    const text =
      "Penempatan kerja ke luar negeri, tanpa ijazah. Biaya visa dan tiket pesawat ditanggung pelamar.";
    expect(has(text, /luar negeri|visa|tiket/i)).toBe(true);
  });

  it("does not fire on a generic fee message with no job context", () => {
    expect(jobSignals("Biaya administrasi transfer Rp25.000.").signals).toEqual(
      [],
    );
  });

  it("does not fire when the employer pays the fee", () => {
    const text =
      "Lowongan kerja resmi. Biaya tes kesehatan dan pelatihan ditanggung perusahaan.";
    expect(jobSignals(text).signals).toEqual([]);
  });

  it("does not score on context traits alone", () => {
    const text =
      "Lowongan staf gudang, langsung diterima tanpa wawancara, gaji Rp18 juta. Kirim CV ke hrd.rekrut@gmail.com.";
    expect(jobSignals(text).signals).toEqual([]);
  });
});
