import { describe, expect, it } from "@jest/globals";
import { conversationSignals } from "@/lib/scoring/conversation";

const turn = (text: string) => ({ text });

const labels = (input: Parameters<typeof conversationSignals>[0]) =>
  conversationSignals(input)
    .signals.map((signal) => signal.label)
    .join(" ");

describe("Conversation Agent — escalation", () => {
  it("fires when an approach is followed by a demand", () => {
    expect(
      labels({
        turns: [
          turn("Halo kak, ada lowongan tugas online, bayarannya besar lho."),
        ],
        text: "Untuk mencairkan komisi, transfer dulu biaya admin Rp250.000.",
      }),
    ).toMatch(/bertahap/i);
  });

  it("fires when a demand is followed by urgency", () => {
    expect(
      labels({
        turns: [turn("Silakan transfer DP Rp500.000 ke rekening 1234567890.")],
        text: "Harus sekarang ya, sebelum pukul 15.00, kalau tidak pesanan dibatalkan.",
      }),
    ).toMatch(/bertahap/i);
  });

  it("stays silent for two benign turns", () => {
    const result = conversationSignals({
      turns: [turn("Halo, pesanan saya kapan dikirim?")],
      text: "Terima kasih sudah menunggu, paketnya sampai besok ya.",
    });
    expect(result.signals).toEqual([]);
  });

  it("stays silent on a single turn and says why", () => {
    const result = conversationSignals({
      turns: [],
      text: "Harus sekarang, sebelum pukul 15.00.",
    });
    expect(result.signals).toEqual([]);
    expect(result.note).toMatch(/pesan kedua/i);
  });

  it("does not ask for a second message when the first already combined", () => {
    const result = conversationSignals({
      turns: [],
      text: "Selamat Anda menang hadiah utama Rp25.000.000. Untuk pencairan, bayar biaya admin Rp350.000 lebih dulu ya.",
    });
    expect(result.signals.length).toBeGreaterThan(0);
    expect(result.note).toBeUndefined();
  });

  it("cannot call a single message an escalation, even a bad one", () => {
    // The in-message combination pass may still fire here — that is a different
    // mechanism and it is allowed. What must not appear is the escalation
    // finding, because escalation is a property of a sequence.
    expect(
      labels({ turns: [], text: "Transfer biaya admin sekarang juga." }),
    ).not.toMatch(/bertahap/i);
  });

  it("does not fire when the order is reversed", () => {
    // Money first, small talk after: that is a conversation winding down, not
    // a script walking forward.
    expect(
      labels({
        turns: [turn("Transfer biaya admin Rp250.000 ke rekening ini.")],
        text: "Halo kak, apa kabar?",
      }),
    ).not.toMatch(/bertahap/i);
  });
});
