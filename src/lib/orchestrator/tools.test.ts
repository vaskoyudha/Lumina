import type { ScoreResult } from "@/lib/contracts/score";
import { TOOL_DEFS, type ToolContext } from "@/lib/orchestrator/tools";

const result = {
  score: 84,
  risk: "tinggi",
  modus: "lowongan-tugas-berbayar",
  advice: ["Jangan setor."],
  relatedModule: 4,
  hardOverride: false,
  signals: [
    {
      label: "Tugas berbayar meminta pembayaran lanjutan",
      weight: 0.82,
      evidence: "tugas selanjutnya",
      agent: "job",
      mechanism: "payment-redirect",
    },
    {
      label: "Tautan di luar domain resmi",
      weight: 0.4,
      evidence: "https://scam.example/login",
      agent: "link",
      mechanism: "masked-link",
    },
  ],
} as ScoreResult;

const trace = {
  stages: [
    {
      id: "job",
      label: "Lowongan",
      status: "selesai",
      findings: ["tugas selanjutnya"],
      ms: 1,
    },
    {
      id: "qris",
      label: "QRIS",
      status: "nihil",
      findings: [],
      ms: 0,
    },
  ],
  totalMs: 1,
  validation: {},
} as never;

function context(
  agent: ToolContext["agent"],
  message = "Lowongan ini meminta tugas selanjutnya dan transfer ke https://scam.example/login.",
): ToolContext {
  return {
    agent,
    message,
    priorTurns: [],
    signal: new AbortController().signal,
    score: (() => ({ result, trace })) as never,
  };
}

describe("orchestrator tools", () => {
  it("scopes score_message to the calling agent's detector", async () => {
    const output = (await TOOL_DEFS.score_message.execute(
      {},
      context("job"),
    )) as { signals: { agent: string }[] };

    expect(output.signals).toHaveLength(1);
    expect(output.signals[0]?.agent).toBe("job");
  });

  it("lets the evidence agent read the full signal set", async () => {
    const output = (await TOOL_DEFS.score_message.execute(
      {},
      context("evidence"),
    )) as { signals: { agent: string }[] };

    expect(output.signals.map((signal) => signal.agent)).toEqual([
      "job",
      "link",
    ]);
  });

  it("rejects a domain that is not present in the message", async () => {
    await expect(
      TOOL_DEFS.domain_lookup.execute(
        { domain: "evil.example" },
        context("link"),
      ),
    ).rejects.toThrow("domain-not-in-message");
  });

  it("returns RDAP registrar and age for a domain in the message", async () => {
    const originalFetch = globalThis.fetch;
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        events: [
          { eventAction: "registration", eventDate: "2020-01-01T00:00:00Z" },
        ],
        entities: [
          {
            roles: ["registrar"],
            vcardArray: ["vcard", [["fn", {}, "text", "Example Registrar"]]],
          },
        ],
        status: ["clientTransferProhibited"],
      }),
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const output = (await TOOL_DEFS.domain_lookup.execute(
      { domain: "scam.example" },
      context("link", "Buka https://scam.example/login sekarang."),
    )) as {
      ok: boolean;
      registrar: string | null;
      ageDays: number | null;
      statuses: string[];
    };

    expect(output.ok).toBe(true);
    expect(output.registrar).toBe("Example Registrar");
    expect(output.ageDays).toBeGreaterThan(0);
    expect(output.statuses).toEqual(["clientTransferProhibited"]);
    globalThis.fetch = originalFetch;
  });
});
