import { describe, expect, it } from "@jest/globals";
import {
  STAGE_LABEL,
  VoiceDigestSchema,
  voiceDigest,
} from "@/lib/contracts/agent-run";
import { scoreText } from "@/lib/scoring/score";

const SCAM =
  "Selamat siang Bu, ini undangan pernikahan. Silakan instal undangan-nikah.apk. " +
  "Transfer biaya administrasi Rp150.000 ke rekening 1234567890 a.n. Budi, " +
  "lalu konfirmasi ke 0812-3456-7890. Buka juga https://bca-verif.xyz/login";

describe("voiceDigest", () => {
  it("keeps the findings and drops every quote from the message", () => {
    const result = scoreText({ text: SCAM });
    const digest = voiceDigest(result, "Undangan APK");

    expect(digest.findings.length).toBeGreaterThan(0);
    expect(digest.risk).toBe(result.risk);
    expect(digest.score).toBe(result.score);

    const serialized = JSON.stringify(digest);
    // None of these appear in the message as findings; all of them are
    // strings the user typed and must not leave the device.
    expect(serialized).not.toContain("0812");
    expect(serialized).not.toContain("1234567890");
    expect(serialized).not.toContain("bca-verif");
    expect(serialized).not.toContain("undangan-nikah");
  });

  it("rejects a payload with an extra key", () => {
    const result = scoreText({ text: SCAM });
    const digest = voiceDigest(result, "Undangan APK");
    const parsed = VoiceDigestSchema.safeParse({ ...digest, text: SCAM });
    expect(parsed.success).toBe(false);
  });

  it("accepts its own output", () => {
    const result = scoreText({ text: SCAM });
    expect(
      VoiceDigestSchema.safeParse(voiceDigest(result, "Undangan APK")).success,
    ).toBe(true);
  });
});

describe("STAGE_LABEL", () => {
  it("names every stage the pipeline can report", () => {
    for (const id of [
      "message",
      "link",
      "identity",
      "conversation",
      "evidence",
      "scoring",
      "voice",
    ] as const) {
      expect(STAGE_LABEL[id].label.length).toBeGreaterThan(0);
      expect(STAGE_LABEL[id].task.length).toBeGreaterThan(0);
    }
  });
});
