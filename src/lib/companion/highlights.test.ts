import {
  collectHighlights,
  type HighlightDetail,
  highlightSegments,
} from "@/lib/companion/highlights";
import type { OrchestratorEvent } from "@/lib/contracts/orchestrator";
import type { Signal } from "@/lib/contracts/score";

const signal = (over: Partial<Signal> = {}): Signal => ({
  label: "Meminta kode OTP",
  weight: 0.9,
  evidence: "kode OTP",
  agent: "message",
  ...over,
});

const agentResult = (over: Partial<Record<string, unknown>> = {}) =>
  ({
    type: "agent_result",
    agent: "message",
    label: "Message Agent",
    status: "selesai",
    summary: "Pesan meminta OTP.",
    findings: ["Permintaan OTP"],
    points: [
      {
        signal: "Meminta kode OTP",
        point: "Pesan meminta kode OTP.",
        reason: "Bank tidak meminta OTP lewat chat.",
        pattern: "credential-request",
        watchout: "Jangan kirim kode OTP.",
        quote: "kode OTP",
      },
    ],
    ms: 12,
    ...over,
  }) as OrchestratorEvent;

describe("collectHighlights", () => {
  it("uses agent report points with their detailed explanation", () => {
    const details = collectHighlights({
      text: "Selamat! Kirim kode OTP sekarang.",
      events: [agentResult()],
    });

    expect(details).toHaveLength(1);
    expect(details[0]).toMatchObject({
      quote: "kode OTP",
      title: "Pesan meminta kode OTP.",
      reason: "Bank tidak meminta OTP lewat chat.",
      pattern: "credential-request",
      watchout: "Jangan kirim kode OTP.",
      source: "agent",
      agent: "Mochi · Message Agent",
    });
  });

  it("falls back to deterministic signals when no agent point exists", () => {
    const details = collectHighlights({
      text: "Kirim kode OTP sekarang.",
      signals: [signal()],
    });

    expect(details).toHaveLength(1);
    expect(details[0]).toMatchObject({
      quote: "kode OTP",
      title: "Meminta kode OTP",
      source: "detector",
    });
  });

  it("does not turn an invented quote into a highlight", () => {
    const details = collectHighlights({
      text: "Halo, apa kabar?",
      signals: [signal({ evidence: "kode OTP" })],
    });
    expect(details).toEqual([]);
  });

  it("ignores an agent quote that pastes the entire message", () => {
    const longQuote =
      "Selamat! Anda menang hadiah Rp10.000.000. Kirim kode OTP dan biaya admin Rp250.000 sekarang juga.";
    const details = collectHighlights({
      text: longQuote,
      signals: [signal({ evidence: "kode OTP" })],
      events: [
        agentResult({
          points: [
            {
              signal: "Meminta kode OTP",
              point: "Seluruh pesan adalah penipuan.",
              reason: "Pesan meminta OTP dan biaya.",
              pattern: "credential-request",
              watchout: "Jangan kirim OTP.",
              quote: longQuote,
            },
          ],
        }),
      ],
    });

    expect(details.some((detail) => detail.source === "agent")).toBe(false);
    expect(details[0]?.quote).toBe("kode OTP");
  });

  it("keeps the detector span and attaches a contained agent explanation", () => {
    const text = "akun diblokir dalam 2 jam";
    const details: HighlightDetail[] = [
      {
        quote: "akun diblokir",
        title: "Blokir akun",
        reason: "Ancaman waktu.",
        source: "detector",
        weight: 0.9,
      },
      {
        quote: "diblokir dalam 2 jam",
        title: "Batas waktu palsu",
        reason: "Tekanan waktu.",
        source: "agent",
        weight: 0.9,
      },
    ];
    const segments = highlightSegments(text, details);

    expect(segments.map((segment) => segment.text).join("")).toBe(text);
    expect(segments.filter((segment) => segment.quote)).toHaveLength(1);
    expect(segments.find((segment) => segment.quote)?.quote).toBe(
      "akun diblokir",
    );
    expect(segments.find((segment) => segment.quote)?.details).toHaveLength(2);
    expect(
      segments
        .find((segment) => segment.quote)
        ?.details.map((item) => item.source),
    ).toEqual(["detector", "agent"]);
  });

  it("locates a whitespace-collapsed quote without shifting the span", () => {
    const text = "Kirim   kode OTP sekarang.";
    const details: HighlightDetail[] = [
      {
        quote: "kirim kode OTP",
        title: "Meminta kode OTP",
        reason: "Aturan OTP.",
        source: "detector",
        weight: 0.9,
      },
    ];
    const highlighted = highlightSegments(text, details).find(
      (segment) => segment.quote,
    );

    expect(highlighted?.text).toBe("Kirim   kode OTP");
    expect(highlighted?.quote).toBe("Kirim   kode OTP");
  });

  it("keeps spans aligned after a Unicode lowercase expansion", () => {
    const text = "İstanbul transfer hari ini";
    const details: HighlightDetail[] = [
      {
        quote: "transfer",
        title: "Transfer",
        reason: "Arah pembayaran.",
        source: "detector",
        weight: 0.8,
      },
    ];
    const segments = highlightSegments(text, details);
    const highlighted = segments.find((segment) => segment.quote);

    expect(segments.map((segment) => segment.text).join("")).toBe(text);
    expect(highlighted?.text).toBe("transfer");
  });
});
