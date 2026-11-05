import { riskFor } from "@/lib/contracts/score";
import { MODUS, MODUS_BY_ID, MODUS_BY_NO, ModusListSchema } from "@/lib/modus";
import { OFFICIAL, OfficialDomainsSchema } from "@/lib/scoring/link";
import { scoreText } from "@/lib/scoring/score";

describe("modus.json (§11.2 — single source of truth for A and B)", () => {
  it("has exactly 12 entries numbered 1..12", () => {
    expect(ModusListSchema.safeParse(MODUS).success).toBe(true);
    expect(MODUS).toHaveLength(12);
    expect([...MODUS_BY_NO.keys()].sort((a, b) => a - b)).toEqual(
      Array.from({ length: 12 }, (_, i) => i + 1),
    );
  });

  it("has one unique id per module", () => {
    expect(MODUS_BY_ID.size).toBe(12);
  });

  it("wires only module 10 to the one playable scenario", () => {
    const playable = MODUS.filter((m) => m.scenarioId !== null);
    expect(playable).toHaveLength(1);
    expect(playable[0]?.no).toBe(10);
    expect(playable[0]?.scenarioId).toBe("L1-kurir-apk");
  });

  it("marks modules with no written lesson as 'segera'", () => {
    expect(MODUS.filter((m) => m.modulStatus === "lengkap")).toHaveLength(1);
  });
});

describe("official domain list (§5-A: ~40 domains, offline-safe)", () => {
  it("parses and is large enough to be useful", () => {
    expect(OfficialDomainsSchema.safeParse(OFFICIAL).success).toBe(true);
    expect(OFFICIAL.length).toBeGreaterThanOrEqual(40);
  });
});

describe("riskFor (§4 bands)", () => {
  it("maps each boundary exactly", () => {
    expect(riskFor(0)).toBe("bersih");
    expect(riskFor(14)).toBe("bersih");
    expect(riskFor(15)).toBe("rendah");
    expect(riskFor(39)).toBe("rendah");
    expect(riskFor(40)).toBe("mencurigakan");
    expect(riskFor(69)).toBe("mencurigakan");
    expect(riskFor(70)).toBe("tinggi");
    expect(riskFor(100)).toBe("tinggi");
  });
});

describe("scoreText contract invariants", () => {
  it("never returns an empty signals array", () => {
    const result = scoreText({ text: "besok kita makan siang bareng ya" });
    expect(result.signals.length).toBeGreaterThanOrEqual(1);
    expect(result.risk).toBe("bersih");
  });

  it("sorts signals by descending weight", () => {
    const result = scoreText({
      text: "Akun Anda akan diblokir dalam 2 jam. Verifikasi OTP sekarang di bit.ly/verifikasi-wa",
    });
    const weights = result.signals.map((s) => s.weight);
    expect(weights).toEqual([...weights].sort((a, b) => b - a));
  });

  it("forces risk 'tinggi' when OTP is requested, whatever the score", () => {
    const result = scoreText({ text: "kirim kode otp kamu" });
    expect(result.hardOverride).toBe(true);
    expect(result.risk).toBe("tinggi");
    expect(result.score).toBeGreaterThanOrEqual(70);
  });

  it("quotes the user's own words as evidence", () => {
    const result = scoreText({ text: "kirim kode otp kamu sekarang" });
    const otpSignal = result.signals.find((s) => s.label.includes("OTP"));
    expect(otpSignal?.evidence.toLowerCase()).toContain("otp");
  });

  it("classifies the demo APK case and links to module 10", () => {
    const result = scoreText({
      text: "Selamat siang Bu, ini undangan pernikahan anak kami. Mohon dibuka ya file Undangan-Pernikahan.apk yang saya kirim.",
    });
    expect(result.risk).toBe("tinggi");
    expect(result.modus).toBe("apk-whatsapp");
    expect(result.relatedModule).toBe(10);
  });

  it("does not treat a greeting as a prize announcement", () => {
    // Regression: bare "Selamat" in "Selamat siang" scored 65/mencurigakan.
    const result = scoreText({
      text: "Selamat siang Bu, ini undangan pernikahan anak kami.",
    });
    expect(result.signals.some((s) => s.label.includes("hadiah"))).toBe(false);
    expect(result.risk).not.toBe("mencurigakan");
  });

  it("quotes the APK filename rather than the bare extension", () => {
    const result = scoreText({
      text: "Mohon dibuka ya file Undangan-Pernikahan.apk yang saya kirim.",
    });
    const apk = result.signals.find((s) => s.label.includes("APK"));
    expect(apk?.evidence).toMatch(/\.apk$/);
    expect(apk?.evidence.length).toBeGreaterThan(4);
  });

  it("scores the top-up case high without inventing an OTP claim", () => {
    const result = scoreText({
      text: "tugas like 10 video komisi Rp15.000. untuk lanjut, kakak perlu top up saldo Rp500.000 dulu",
    });

    // §11.6 claims 88/100 for this example; the engine currently measures 85.
    // The claim, not the honesty, is what gets adjusted (§11.8).
    expect(result.score).toBeGreaterThanOrEqual(70);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.risk).toBe("tinggi");
    expect(result.modus).toBe("lowongan-tugas-berbayar");

    // No OTP was requested, so no OTP signal may be reported.
    expect(result.hardOverride).toBe(false);
    expect(result.signals.some((s) => s.label.includes("OTP"))).toBe(false);
  });

  it("stays inside the 2-second budget with no network (§11.8)", () => {
    const started = performance.now();
    scoreText({ text: "x".repeat(4000) });
    expect(performance.now() - started).toBeLessThan(2000);
  });
});

describe("measured bench traps (5 Nov 2026)", () => {
  // These four were LIVE engine defects found by the 40-message corpus. Each
  // assertion is the exact measurement that turned red before the fix.

  it("a bank OTP NOTIFICATION is not an OTP request", () => {
    const result = scoreText({
      text: "OTP Anda: 483221. Jangan berikan kode ini kepada siapa pun, termasuk petugas bank. Trx Rp250.000 untuk Tokopedia.",
    });
    expect(result.hardOverride).toBe(false);
    expect(result.risk).not.toBe("tinggi");
    expect(result.risk).not.toBe("mencurigakan");
  });

  it("a benign courier update keeps its institution weight low", () => {
    const result = scoreText({
      text: "[JNE Express] Paket JD04492332 sudah tiba di gudang kota Anda, estimasi besok pagi. Salam, tim kurir.",
    });
    expect(result.risk).toBe("rendah");
  });

  it("a fake courier update DOES escalate (authority + konfirmasi)", () => {
    const result = scoreText({
      text: "Paket Anda tertahan di gudang kurir, nomor pelacakan tidak valid. Konfirmasi alamat lewat bit.ly/kurircek untuk pembukaan kembali pengiriman.",
    });
    expect(result.risk).toBe("tinggi");
  });

  it("a polite OTP request ('saya perlu kode OTP') is still a hard request", () => {
    const result = scoreText({
      text: "Halo, saya petugas BNI. Ada transaksi anomali Rp1.900.000 di kartu ATM Anda. Untuk pembatalannya saya perlu kode OTP yang masuk di HP Anda sekarang.",
    });
    expect(result.hardOverride).toBe(true);
    expect(result.risk).toBe("tinggi");
    expect(result.modus).toBe("fake-call");
  });

  it("a QRIS sticker payment is caught and classified (was 0/bersih)", () => {
    const result = scoreText({
      text: "Barang sudah dikemas, bayar sisa ongkir via QRIS pada stiker ini (nama penerima a.n. Hadi Wibowo).",
    });
    expect(result.risk).toBe("tinggi");
    expect(result.modus).toBe("quishing-qris");
  });
});

describe("combination pass (note 01 §a)", () => {
  it("names the combo when a prize requires a payment first", () => {
    const result = scoreText({
      text: "Selamat Anda menang hadiah utama Rp25.000.000. Untuk pencairan, bayar biaya admin Rp350.000 lebih dulu ya.",
    });

    const signal = result.signals.find((s) => s.agent === "conversation");
    expect(signal).toBeDefined();
    expect(signal?.label).toMatch(/hadiah.*pembayaran lebih dulu/i);
    expect(signal?.evidence).toMatch(/selamat anda menang/i);
  });

  it("names the combo when a deadline is paired with a demand for money", () => {
    const result = scoreText({
      text: "Tagihan denda parkir harus diselesaikan dalam 2 jam. Transfer langsung ke rekening pribadi petugas ya.",
    });

    const signal = result.signals.find((s) => s.agent === "conversation");
    expect(signal).toBeDefined();
    expect(signal?.label).toMatch(/mendesak sekaligus meminta uang/i);
  });

  it("never invents a combination on a legitimate bill", () => {
    const result = scoreText({
      text: "[PLN] Tagihan Nov Rp278.400 jatuh tempo 15 Nov. Bayar via VA 778820083xx atau saldoku.",
    });

    expect(result.signals.some((s) => s.agent === "conversation")).toBe(false);
    expect(result.risk).toBe("bersih");
  });

  it("does not call a bare deadline a combination", () => {
    // Urgency alone is one vector. A seller saying "segera" is not two scams.
    const result = scoreText({
      text: "Promo berakhir malam ini, segera pesan sebelum kehabisan.",
    });

    expect(result.signals.some((s) => s.agent === "conversation")).toBe(false);
  });

  it("keeps the honest empty state when nothing matched", () => {
    const result = scoreText({ text: "Halo kak, gimana kabarnya?" });

    expect(result.signals).toHaveLength(1);
    expect(result.signals[0]?.weight).toBe(0);
  });
});

describe("modus classification (5 Nov 2026)", () => {
  it("classifies the ordinary 'akun Anda akan diblokir' phrasing as phishing", () => {
    // The demo example, word for word. The keyword list used to require the
    // exact string "akun diblokir", which real Indonesian does not use —
    // "akan diblokir" is how the threat is actually written. The message
    // scored 96 and still came back `tidak-dikenali`, so the panel printed
    // "Belum dikenali" beside a "risiko tinggi" verdict.
    const result = scoreText({
      text: "Akun Anda akan diblokir dalam 2 jam. Verifikasi OTP sekarang di bit.ly/verifikasi-wa agar akun tidak ditutup permanen.",
    });
    expect(result.risk).toBe("tinggi");
    expect(result.modus).toBe("phishing-tautan");
  });

  it("still classifies the terse imperative form", () => {
    const result = scoreText({
      text: "Akun diblokir. Login di bca-verifikasi.site untuk membuka kembali.",
    });
    expect(result.modus).toBe("phishing-tautan");
  });

  it("does not read a benign account notification as phishing", () => {
    // Widening a keyword list is how a detector starts accusing ordinary
    // messages. A transaction receipt mentions "akun" and no threat at all.
    const result = scoreText({
      text: "Transaksi Rp50.000 di akun kamu berhasil. Saldo tersisa Rp1.250.000.",
    });
    expect(result.modus).toBe("tidak-dikenali");
  });
});
