import { describe, expect, it } from "@jest/globals";
import {
  guardUrl,
  isPublicAddress,
  parsePublicUrl,
  UnsafeUrl,
} from "@/lib/server/url-guard";

const resolving =
  (...addresses: string[]) =>
  async () =>
    addresses;

const failing = async (): Promise<string[]> => {
  throw new Error("nxdomain");
};

describe("isPublicAddress", () => {
  it.each([
    "127.0.0.1",
    "10.1.2.3",
    "172.16.0.1",
    "192.168.1.1",
    "169.254.169.254",
    "100.64.0.1",
    "0.0.0.0",
    "224.0.0.1",
    "::1",
    "fe80::1",
    "fc00::1",
  ])("rejects %s", (ip) => {
    expect(isPublicAddress(ip)).toBe(false);
  });

  it.each([
    "8.8.8.8",
    "93.184.216.34",
    "2606:4700:4700::1111",
  ])("accepts %s", (ip) => {
    expect(isPublicAddress(ip)).toBe(true);
  });
});

describe("parsePublicUrl", () => {
  it("accepts a normal https URL and drops the fragment", () => {
    expect(parsePublicUrl("https://bca.co.id/login#top").href).toBe(
      "https://bca.co.id/login",
    );
  });

  it.each([
    "http://localhost/admin",
    "http://127.0.0.1/",
    "http://169.254.169.254/latest/meta-data/",
    "ftp://bca.co.id/file",
    "https://user:pass@bca.co.id/",
    "https://bca.co.id:8080/",
    "http://intranet/",
    "http://router.local/",
    "javascript:alert(1)",
  ])("rejects %s", (url) => {
    expect(() => parsePublicUrl(url)).toThrow(UnsafeUrl);
  });
});

describe("guardUrl", () => {
  it("pins the resolved public address", async () => {
    const target = await guardUrl(
      "https://example.com/a",
      resolving("93.184.216.34"),
    );
    expect(target.address).toBe("93.184.216.34");
    expect(target.family).toBe(4);
    expect(target.all).toEqual(["93.184.216.34"]);
  });

  it("refuses a hostname that resolves into a private range", async () => {
    await expect(
      guardUrl("https://rebind.example.com/", resolving("10.0.0.5")),
    ).rejects.toThrow(UnsafeUrl);
  });

  it("refuses the metadata address even when it is one of several answers", async () => {
    await expect(
      guardUrl(
        "https://mixed.example.com/",
        resolving("93.184.216.34", "169.254.169.254"),
      ),
    ).rejects.toThrow(UnsafeUrl);
  });

  it("refuses a hostname that does not resolve at all", async () => {
    await expect(
      guardUrl("https://nowhere.example.com/", failing),
    ).rejects.toThrow(UnsafeUrl);
  });

  it("does not resolve an IP literal through DNS", async () => {
    let called = false;
    const target = await guardUrl("https://93.184.216.34/", async () => {
      called = true;
      return [];
    });
    expect(target.address).toBe("93.184.216.34");
    expect(called).toBe(false);
  });

  it("refuses a private IP literal before any resolution", async () => {
    await expect(guardUrl("https://10.0.0.5/", failing)).rejects.toThrow(
      UnsafeUrl,
    );
  });
});
