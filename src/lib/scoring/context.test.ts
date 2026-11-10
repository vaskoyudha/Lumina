import { isQuotedWarning } from "@/lib/scoring/context";

const at = (text: string, needle: string) => {
  const start = text.indexOf(needle);
  if (start < 0) throw new Error(`missing ${needle}`);
  return isQuotedWarning(text, start, needle.length);
};

describe("isQuotedWarning", () => {
  it("suppresses a rule quoted inside a warning", () => {
    const text =
      "Waspada penipuan! Jangan pernah berikan OTP kepada siapa pun.";
    expect(at(text, "Jangan pernah berikan")).toBe(true);
  });

  it("suppresses a rule quoted as an example", () => {
    const text = "Contoh pesan penipuan: kirim kode OTP Anda ke nomor ini.";
    expect(at(text, "kirim kode OTP")).toBe(true);
  });

  it("does not suppress the same imperative when nobody warned first", () => {
    const text = "Kirim kode OTP Anda ke nomor ini sekarang.";
    expect(at(text, "Kirim kode OTP")).toBe(false);
  });

  it("does not let a warning earlier in the text excuse a later turn", () => {
    const text =
      "Waspada penipuan, tetapi transfer sekarang juga ke rekening 1234567890.";
    expect(at(text, "transfer sekarang")).toBe(false);
  });

  it("does not fire on unrelated text", () => {
    const text = "Selamat pagi, ini jadwal rapat pukul sembilan.";
    expect(isQuotedWarning(text, 0, text.length)).toBe(false);
  });
});
