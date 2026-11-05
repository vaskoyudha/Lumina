import { describe, expect, it } from "@jest/globals";
import { identitySignals } from "@/lib/scoring/identity";

const labels = (text: string) =>
  identitySignals(text).signals.map((signal) => signal.label);

describe("Identity Agent", () => {
  it("flags a bank claim carried by an ordinary mobile number", () => {
    const found = labels(
      "Halo Bu, saya dari BCA. Nomor saya 0812-3456-7890, mohon dihubungi.",
    );
    expect(found.join(" ")).toMatch(/BCA/);
    expect(found.join(" ")).toMatch(/ponsel/i);
  });

  it("flags a foreign number claiming an Indonesian institution", () => {
    const found = labels(
      "Ini dari pihak BRI. Hubungi +60 12-345 6789 untuk verifikasi.",
    );
    expect(found.join(" ")).toMatch(/asing|luar/i);
  });

  it("flags a shortcode claiming a bank", () => {
    const found = labels(
      "Pengirim: 8888. Kami dari Mandiri, akun Anda ditutup.",
    );
    expect(found.join(" ")).toMatch(/singkat/i);
  });

  it("keeps the user's sender number out of the finding text", () => {
    // `label` is part of the digest that leaves the device; `evidence` is not.
    // A shortcode printed inside a label would smuggle a number past that rule.
    const found = labels("Pengirim: 8888. Kami dari Mandiri, akun ditutup.");
    expect(found.join(" ")).not.toMatch(/8888/);
  });

  it("treats a forward marker as context, not proof", () => {
    const { signals } = identitySignals(
      "Diteruskan banyak kali. Selamat, Anda menang.",
    );
    const forward = signals.find((signal) => /diteruskan/i.test(signal.label));
    expect(forward?.weight).toBeLessThan(0.4);
  });

  it("stays silent on a legitimate mobile number with no institution claim", () => {
    expect(
      labels("Kak, pesananmu sudah dikirim ya. Kurir: 0813-2222-3333."),
    ).toEqual([]);
  });

  it("stays silent on an official bank notification with no number", () => {
    expect(labels("BCA: Transaksi Rp250.000 di Indomaret berhasil.")).toEqual(
      [],
    );
  });

  it("says why it had nothing to inspect", () => {
    const result = identitySignals("Halo, apa kabar?");
    expect(result.signals).toEqual([]);
    expect(result.note).toMatch(/nomor/i);
  });
});
