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

  it("does not read a negated fee as a fee demand", () => {
    const text = "Lowongan ini tanpa biaya pendaftaran, gratis untuk pelamar.";
    expect(jobSignals(text).signals).toEqual([]);
  });

  it("does not read a fee the employer covers as a demand", () => {
    const text = "Biaya pendaftaran ditanggung perusahaan. Gaji Rp8 juta.";
    expect(jobSignals(text).signals).toEqual([]);
  });

  it("still catches a second, non-negated fee in the same ad", () => {
    const text =
      "Lowongan ini tanpa biaya pendaftaran, tetapi biaya pelatihan Rp500.000 wajib dibayar dulu.";
    expect(has(text, /biaya pendaftaran|pelatihan/i)).toBe(true);
    expect(jobSignals(text).signals[0]?.evidence).toMatch(/pelatihan/i);
  });

  it("catches a fee billed to the applicant", () => {
    expect(
      has("Lowongan kerja. Biaya pelatihan ditanggung pelamar.", /pelatihan/i),
    ).toBe(true);
    expect(
      has(
        "Lowongan kerja. Biaya pendaftaran ditanggung pelamar sendiri.",
        /pendaftaran/i,
      ),
    ).toBe(true);
  });

  it("catches the short 'biaya daftar' wording", () => {
    expect(
      has(
        "Lowongan kerja. Biaya daftar Rp50.000 ditransfer dulu.",
        /pendaftaran|pelatihan/i,
      ),
    ).toBe(true);
  });

  it("does not let one waived fee hide a different fee in the same span", () => {
    expect(
      jobSignals(
        "Lowongan kerja. Gratis biaya administrasi, biaya pelatihan Rp100.000.",
      ).signals.some((signal) => /pelatihan/i.test(signal.evidence)),
    ).toBe(true);
    expect(
      jobSignals(
        "Lowongan kerja. Tanpa biaya administrasi, biaya seragam Rp50.000.",
      ).signals.some((signal) => /seragam/i.test(signal.evidence)),
    ).toBe(true);
  });

  it("honours an employer waiver that follows a comma", () => {
    expect(
      jobSignals("Lowongan kerja. Biaya pelatihan, ditanggung perusahaan.")
        .signals,
    ).toEqual([]);
    expect(
      jobSignals(
        "Lowongan kerja. Biaya pendaftaran dan seragam, ditanggung perusahaan.",
      ).signals,
    ).toEqual([]);
  });

  it("honours an employer waiver after a Rupiah amount", () => {
    expect(
      jobSignals("Lowongan: biaya pelatihan Rp100.000 ditanggung perusahaan.")
        .signals,
    ).toEqual([]);
    expect(
      jobSignals(
        "Lowongan kerja luar negeri, biaya visa Rp2.000.000 ditanggung perusahaan.",
      ).signals,
    ).toEqual([]);
  });

  it("reads an in-match denial on an overseas placement", () => {
    expect(
      jobSignals("Lowongan kerja luar negeri tanpa biaya visa.").signals,
    ).toEqual([]);
    expect(
      jobSignals("Lowongan kerja luar negeri, tanpa biaya visa dan tiket.")
        .signals,
    ).toEqual([]);
  });

  it("catches a fee billed to the applicant even when another is covered", () => {
    expect(
      jobSignals(
        "Lowongan kerja luar negeri, visa ditanggung perusahaan, tiket ditanggung pelamar.",
      ).signals.some((signal) => /tiket|pelamar/i.test(signal.evidence)),
    ).toBe(true);
    expect(
      jobSignals(
        "Lowongan: biaya seragam ditanggung perusahaan dan biaya pelatihan ditanggung pelamar.",
      ).signals.some((signal) => /pelatihan/i.test(signal.evidence)),
    ).toBe(true);
  });

  it("catches KTP/OTP collected before an offer, in either word order", () => {
    expect(has("Sebelum wawancara, kirim OTP.", /ktp|otp|data rekening/i)).toBe(
      true,
    );
    expect(
      has(
        "Lowongan: kirim KTP dan nomor rekening ke HRD.",
        /ktp|otp|data rekening/i,
      ),
    ).toBe(true);
    expect(
      has(
        "Lowongan: KTP dan nomor rekening dikirim ke HRD.",
        /ktp|otp|data rekening/i,
      ),
    ).toBe(true);
  });

  it("catches a link that comes before the job wording", () => {
    expect(
      has(
        "Hubungi wa.me/628123456789 untuk lowongan PT Maju.",
        /tautan chat|perusahaan resmi/i,
      ),
    ).toBe(true);
    expect(
      has(
        "Lowongan PT Maju. Hubungi wa.me/628123456789.",
        /tautan chat|perusahaan resmi/i,
      ),
    ).toBe(true);
  });

  it("reads a direct denial of asking for a fee", () => {
    expect(
      jobSignals("Lowongan kerja. Kami tidak meminta biaya pendaftaran.")
        .signals,
    ).toEqual([]);
  });

  it("does not let an unrelated negation hide a fee", () => {
    expect(
      has(
        "Lowongan kerja. Gratis konsultasi biaya pelatihan Rp150.000.",
        /pelatihan/i,
      ),
    ).toBe(true);
    expect(
      has("Lowongan tanpa pengalaman biaya pelatihan Rp150.000.", /pelatihan/i),
    ).toBe(true);
  });

  it("still matches a fee phrase split by a comma", () => {
    expect(
      has(
        "Lowongan kerja. Biaya 150rb, untuk pendaftaran dan seragam.",
        /pendaftaran|seragam/i,
      ),
    ).toBe(true);
  });

  it("does not fire when the whole fee list is denied", () => {
    expect(
      jobSignals(
        "Lowongan kerja. Tanpa biaya apa pun, termasuk biaya pendaftaran.",
      ).signals,
    ).toEqual([]);
  });

  it("does not let one employer-paid fee hide another demand", () => {
    const text =
      "Lowongan kerja. Biaya pelatihan ditanggung perusahaan, biaya seragam ditanggung pelamar.";
    const signals = jobSignals(text).signals;
    expect(signals.some((signal) => /seragam/i.test(signal.evidence))).toBe(
      true,
    );
  });

  it("catches early KTP/OTP collection before an offer", () => {
    const text =
      "Lowongan kerja resmi. Kirim KTP dan selfie KTP sebelum daftar ke admin.";
    expect(has(text, /ktp|otp|data rekening/i)).toBe(true);
  });

  it("catches a brand lure that redirects to a chat link", () => {
    const text = "Lowongan resmi perusahaan, daftar di bit.ly/rekrutmen cepat.";
    expect(has(text, /perusahaan resmi|tautan chat/i)).toBe(true);
  });

  it("credits every finding to the job agent", () => {
    const text =
      "Lowongan admin online, gaji Rp4 juta. Biaya pelatihan Rp150.000 ditransfer dulu ya.";
    const signals = jobSignals(text).signals;
    expect(signals.length).toBeGreaterThan(0);
    expect(signals.every((signal) => signal.agent === "job")).toBe(true);
  });
});
