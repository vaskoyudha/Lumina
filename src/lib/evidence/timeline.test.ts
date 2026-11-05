import type { ScoreResult, Signal } from "@/lib/contracts/score";
import { buildTimeline } from "@/lib/evidence/timeline";

/**
 * The timeline is what a bank clerk reads first, so these tests are about
 * restraint, not recall: a finding belongs in the report only when it is solid
 * enough to stand as a sentence about the sender.
 */

const AT = "2026-11-05T10:00:00.000Z";

function resultWith(signals: Signal[], risk: ScoreResult["risk"]): ScoreResult {
  return {
    score: risk === "tinggi" ? 90 : 30,
    risk,
    signals,
    modus: "tidak-dikenali",
    advice: ["Hubungi kanal resmi."],
    relatedModule: null,
    hardOverride: false,
  };
}

describe("buildTimeline", () => {
  it("drops soft context signals that would read as accusations", () => {
    const entries = buildTimeline([
      {
        at: AT,
        result: resultWith(
          [
            {
              label: "Meminta kode OTP — bank tidak pernah memintanya",
              weight: 0.95,
              evidence: "kode OTP",
              agent: "message",
            },
            {
              label: "Menyebut kode OTP",
              weight: 0.15,
              evidence: "OTP",
              agent: "message",
            },
          ],
          "tinggi",
        ),
      },
    ]);

    expect(entries).toHaveLength(1);
    expect(entries[0]?.what).toMatch(/meminta kode otp/i);
  });

  it("never blames a perpetrator in a message the engine called safe", () => {
    const entries = buildTimeline([
      {
        at: AT,
        result: resultWith(
          [
            {
              label: "Menyebut kode OTP",
              weight: 0.15,
              evidence: "OTP",
              agent: "message",
            },
          ],
          "rendah",
        ),
      },
    ]);

    expect(entries).toHaveLength(0);
  });

  it("strips the explanatory tail a label carries for the panel", () => {
    const entries = buildTimeline([
      {
        at: AT,
        result: resultWith(
          [
            {
              label:
                "Domain meniru BCA — bca-verifikasi.site bukan situs resmi",
              weight: 0.6,
              evidence: "bca-verifikasi.site",
              agent: "link",
            },
          ],
          "mencurigakan",
        ),
      },
    ]);

    expect(entries[0]?.what).toBe("Pesan memuat domain meniru BCA.");
  });
});
