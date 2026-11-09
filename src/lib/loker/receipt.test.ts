/** @jest-environment node */
import { buildScanArgs, parseScanReceipt } from "@/lib/loker/receipt";

const RECEIPT = {
  version: "careerops.scan.receipt@1",
  date: "2026-11-09",
  scanned: 36,
  skipped: 2,
  found: 40,
  filtered: 10,
  duplicates: 4,
  added: 26,
  added_urls: ["https://id.jobstreet.com/job/1"],
  errors: [{ company: "Glints", error: "403" }],
  unverified_zero: [],
  dry_run: false,
};

describe("parseScanReceipt", () => {
  it("accepts exit 0 with a receipt", () => {
    const out = parseScanReceipt(JSON.stringify(RECEIPT), 0);
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.receipt.added).toBe(26);
    expect(out.exitCode).toBe(0);
  });

  it("accepts exit 2 when a valid receipt exists", () => {
    const out = parseScanReceipt(JSON.stringify(RECEIPT), 2);
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.receipt.errors).toHaveLength(1);
    expect(out.exitCode).toBe(2);
  });

  it("rejects exit 1 even if stdout happens to hold JSON", () => {
    const out = parseScanReceipt(JSON.stringify(RECEIPT), 1);
    expect(out).toEqual({
      ok: false,
      reason: "fatal",
      exitCode: 1,
    });
  });

  it("rejects a receipt without a numeric added count", () => {
    const out = parseScanReceipt(
      JSON.stringify({ version: "careerops.scan.receipt@1", added: "26" }),
      0,
    );
    expect(out.ok).toBe(false);
  });

  it("finds the receipt after dotenv noise on stdout", () => {
    const out = parseScanReceipt(
      `[dotenv] injected 4 vars\n${JSON.stringify(RECEIPT)}\n`,
      0,
    );
    expect(out.ok).toBe(true);
  });

  it("builds the exact engine arguments", () => {
    expect(buildScanArgs(30)).toEqual([
      "scanner/scan.mjs",
      "--json",
      "--quiet",
      "--since",
      "30",
    ]);
  });
});
