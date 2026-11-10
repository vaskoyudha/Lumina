import { validateReport } from "@/lib/orchestrator/report";

const message = "Selamat! Kirim kode OTP dan biaya admin Rp250.000.";
const signals = [
  { label: "Meminta kode OTP", evidence: "kirim kode OTP" },
  { label: "Biaya admin di muka", evidence: "biaya admin" },
];

const valid = {
  thought: "Pesan meminta OTP dan biaya di muka.",
  summary: "Permintaan OTP dan biaya admin adalah indikator penipuan.",
  points: [
    {
      signal: "Meminta kode OTP",
      point: "Pesan meminta kode OTP.",
      reason: "Bank tidak meminta kode OTP lewat chat.",
      pattern: "credential-request",
      watchout: "Jangan kirim kode OTP.",
      quote: "kirim kode OTP",
    },
  ],
  watchouts: ["Jangan kirim kode OTP."],
  confidence: 0.9,
};

describe("validateReport", () => {
  it("accepts a grounded report", () => {
    const result = validateReport(valid, { message, signals });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.report.points).toHaveLength(1);
  });

  it("accepts an empty report only when the tools found nothing", () => {
    const report = { ...valid, points: [] };
    expect(validateReport(report, { message, signals }).ok).toBe(false);
    expect(validateReport(report, { message, signals: [] }).ok).toBe(true);
  });

  it("accepts one quoted observation when no tool signal fits", () => {
    const report = {
      ...valid,
      points: [
        {
          ...valid.points[0],
          signal: "Pola tugas berbayar",
          quote: "biaya admin",
        },
      ],
    };
    const result = validateReport(report, { message, signals });
    expect(result.ok).toBe(true);
  });

  it("accepts one quoted observation when the tools returned nothing", () => {
    const report = {
      ...valid,
      points: [
        {
          ...valid.points[0],
          signal: "Pola tugas berbayar",
          quote: "biaya admin",
        },
      ],
    };
    expect(validateReport(report, { message, signals: [] }).ok).toBe(true);
  });

  it("accepts two quoted observations when the tools returned nothing", () => {
    const report = {
      ...valid,
      points: [
        {
          ...valid.points[0],
          signal: "Pola tugas berbayar",
          quote: "biaya admin",
        },
        {
          ...valid.points[0],
          signal: "Desakan membayar",
          point: "Pesan mendesak membayar biaya admin.",
          quote: "Rp250.000",
        },
      ],
    };
    const result = validateReport(report, { message, signals: [] });
    expect(result.ok).toBe(true);
  });

  it("rejects a third observation when the tools returned nothing", () => {
    const report = {
      ...valid,
      points: [
        { ...valid.points[0], signal: "Pola satu", quote: "biaya admin" },
        { ...valid.points[0], signal: "Pola dua", quote: "Rp250.000" },
        { ...valid.points[0], signal: "Pola tiga", quote: "Selamat!" },
      ],
    };
    const result = validateReport(report, { message, signals: [] });
    expect(result.ok).toBe(false);
  });

  it("rejects an observation without a quote", () => {
    const report = {
      ...valid,
      points: [
        { ...valid.points[0], signal: "Pola tugas berbayar", quote: undefined },
      ],
    };
    const result = validateReport(report, { message, signals });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.issues.join(" ")).toContain("kutipan");
  });

  it("rejects an invented quote", () => {
    const report = {
      ...valid,
      points: [{ ...valid.points[0], quote: "kata-kata yang tidak ada" }],
    };
    const result = validateReport(report, { message, signals });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.issues.join(" ")).toContain("kutipan");
  });

  it("rejects out-of-range confidence", () => {
    expect(
      validateReport({ ...valid, confidence: 1.2 }, { message, signals }).ok,
    ).toBe(false);
  });

  it("rejects a watchout that asks the user to send OTP", () => {
    const report = {
      ...valid,
      points: [
        {
          ...valid.points[0],
          watchout: "Kirim kode OTP ke nomor pengirim sekarang.",
        },
      ],
      watchouts: ["Kirim kode OTP ke nomor pengirim sekarang."],
    };
    const result = validateReport(report, { message, signals });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.join(" ")).toContain("OTP/PIN/password");
    }
  });

  it("does not reject a watchout that tells the user not to send OTP", () => {
    const report = {
      ...valid,
      points: [
        {
          ...valid.points[0],
          watchout: "Jangan pernah mengirim kode OTP ke siapa pun.",
        },
      ],
      watchouts: ["Jangan pernah mengirim kode OTP ke siapa pun."],
    };
    expect(validateReport(report, { message, signals }).ok).toBe(true);
  });

  it("rejects duplicate signals", () => {
    const report = {
      ...valid,
      points: [valid.points[0], valid.points[0]],
    };
    const result = validateReport(report, { message, signals });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.issues.join(" ")).toContain("duplikat");
  });

  it("rejects raw JSON in the summary", () => {
    const report = { ...valid, summary: '{"summary":"x"}' };
    const result = validateReport(report, { message, signals });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.issues.join(" ")).toContain("JSON");
  });

  it("rejects too many points", () => {
    const report = {
      ...valid,
      points: Array.from({ length: 6 }, () => valid.points[0]),
    };
    const result = validateReport(report, { message, signals });
    expect(result.ok).toBe(false);
  });
});
