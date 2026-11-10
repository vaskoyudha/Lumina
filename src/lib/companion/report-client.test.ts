/** @jest-environment node */
import {
  keepsBlanks,
  requestReportPolish,
} from "@/lib/companion/report-client";

const input = {
  channelId: "iasc" as const,
  draft: { subject: "Laporan", body: "Nama: [NAMA ANDA]" },
  facts: { modus: "fake-call", tactics: ["otoritas"] },
};

describe("keepsBlanks", () => {
  it("accepts text that carries every blank", () => {
    expect(keepsBlanks("Nama: [NAMA ANDA]", "Nama pelapor: [NAMA ANDA]")).toBe(
      true,
    );
  });

  it("rejects text that dropped a blank", () => {
    expect(keepsBlanks("Nama: [NAMA ANDA]", "Nama pelapor: Sari")).toBe(false);
  });
});

describe("requestReportPolish", () => {
  it("returns polished text when blanks survive", async () => {
    const fetchImpl = jest.fn().mockResolvedValue(
      new Response(JSON.stringify({ text: "Nama pelapor: [NAMA ANDA]" }), {
        status: 200,
      }),
    ) as unknown as typeof fetch;

    await expect(
      requestReportPolish(input, undefined, fetchImpl),
    ).resolves.toBe("Nama pelapor: [NAMA ANDA]");
  });

  it("returns null when the model drops a blank", async () => {
    const fetchImpl = jest.fn().mockResolvedValue(
      new Response(JSON.stringify({ text: "Nama pelapor: Sari" }), {
        status: 200,
      }),
    ) as unknown as typeof fetch;

    await expect(
      requestReportPolish(input, undefined, fetchImpl),
    ).resolves.toBeNull();
  });

  it("never throws on a failed request", async () => {
    const fetchImpl = jest
      .fn()
      .mockRejectedValue(new Error("offline")) as unknown as typeof fetch;
    await expect(
      requestReportPolish(input, undefined, fetchImpl),
    ).resolves.toBeNull();
  });
});
