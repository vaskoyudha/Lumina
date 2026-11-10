import { ReportPolishRequestSchema } from "@/lib/contracts/report";

const valid = {
  channelId: "iasc",
  draft: { subject: "Laporan", body: "Nama: [NAMA ANDA]" },
  facts: { modus: "fake-call", tactics: ["otoritas"] },
};

describe("ReportPolishRequestSchema", () => {
  it("accepts the documented shape", () => {
    expect(ReportPolishRequestSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects an extra field", () => {
    const parsed = ReportPolishRequestSchema.safeParse({
      ...valid,
      text: "pesan yang diperiksa",
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects an unknown channel id", () => {
    const parsed = ReportPolishRequestSchema.safeParse({
      ...valid,
      channelId: "bank",
    });
    expect(parsed.success).toBe(false);
  });
});
