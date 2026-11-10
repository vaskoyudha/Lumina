import { afterEach, beforeEach, describe, expect, it } from "@jest/globals";
import {
  inspectFileMetadata,
  sha256File,
  verifyFileHash,
} from "@/lib/verify/file";

const controller = () => new AbortController().signal;

describe("inspectFileMetadata", () => {
  it("flags a double extension that hides the real type", () => {
    const [signal] = inspectFileMetadata({
      name: "invoice.pdf.apk",
      type: "application/vnd.android.package-archive",
      size: 1024,
    });
    expect(signal.weight).toBe(0.8);
    expect(signal.ruleId).toBe("file.double-extension");
    expect(signal.mechanism).toBe("attachment-risk");
    expect(signal.evidence).toBe("invoice.pdf.apk");
  });

  it("flags an extension that disagrees with the reported type", () => {
    const [signal] = inspectFileMetadata({
      name: "foto.png",
      type: "application/pdf",
      size: 1024,
    });
    expect(signal.ruleId).toBe("file.mime-mismatch");
    expect(signal.weight).toBe(0.3);
  });

  it("flags hidden direction characters in the filename", () => {
    const signals = inspectFileMetadata({
      name: "foto\u202Egnp.exe",
      type: "application/octet-stream",
      size: 1024,
    });
    expect(signals.map((s) => s.ruleId)).toContain("file.hidden-name");
  });

  it("flags an empty file without pretending it is dangerous", () => {
    const [signal] = inspectFileMetadata({
      name: "kosong.pdf",
      type: "application/pdf",
      size: 0,
    });
    expect(signal.ruleId).toBe("file.empty");
    expect(signal.weight).toBe(0.1);
  });

  it("says nothing about an ordinary attachment", () => {
    expect(
      inspectFileMetadata({
        name: "slip-transfer.pdf",
        type: "application/pdf",
        size: 240_000,
      }),
    ).toEqual([]);
  });
});

describe("sha256File", () => {
  it("hashes locally and returns lowercase hex", async () => {
    const bytes = new TextEncoder().encode("abc");
    const digest = await sha256File({
      size: bytes.byteLength,
      arrayBuffer: async () => bytes.buffer as ArrayBuffer,
    });
    expect(digest).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });

  it("refuses a file larger than the local hash limit", async () => {
    await expect(
      sha256File({
        size: 51 * 1024 * 1024,
        arrayBuffer: async () => new ArrayBuffer(0),
      }),
    ).rejects.toThrow(/50 MB/);
  });
});

describe("verifyFileHash", () => {
  const sha256 = "a".repeat(64);
  const saved = { ...process.env };

  beforeEach(() => {
    process.env = { ...saved };
    delete process.env.MALWAREBAZAAR_AUTH_KEY;
    delete process.env.VIRUSTOTAL_API_KEY;
  });

  afterEach(() => {
    process.env = { ...saved };
    jest.restoreAllMocks();
  });

  it("reports every source as unavailable when no key is configured", async () => {
    const result = await verifyFileHash(sha256, controller());
    expect(result.status).toBe("dilewati");
    expect(result.sources.map((s) => s.status)).toEqual([
      "tidak tersedia",
      "tidak tersedia",
    ]);
    expect(result.signals).toEqual([]);
    expect(result.note).toMatch(/bukan bukti berkas aman/i);
  });

  it("treats an unknown VirusTotal hash as unknown, not as safe", async () => {
    process.env.VIRUSTOTAL_API_KEY = "test-key";
    global.fetch = jest.fn(async () => ({
      ok: false,
      status: 404,
      body: null,
    })) as unknown as typeof fetch;
    const result = await verifyFileHash(sha256, controller());
    expect(result.status).toBe("ok");
    expect(result.signals).toEqual([]);
    expect(result.sources.find((s) => s.source === "VirusTotal")?.listed).toBe(
      false,
    );
    expect(result.note).toMatch(/bukan bukti/i);
  });

  it("never uploads the file: only the hash reaches the source", async () => {
    process.env.VIRUSTOTAL_API_KEY = "test-key";
    const calls: unknown[][] = [];
    global.fetch = jest.fn(async (...args: unknown[]) => {
      calls.push(args);
      return { ok: false, status: 404, body: null };
    }) as unknown as typeof fetch;
    await verifyFileHash(sha256, controller());
    const [url, init] = calls[0] as [string, RequestInit];
    expect(url).toContain(sha256);
    expect(JSON.stringify(init)).not.toContain("arrayBuffer");
  });
});
