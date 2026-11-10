import { describe, expect, it } from "@jest/globals";
import { inspectWallet, walletReputation } from "@/lib/verify/crypto";

const memory = () => {
  const map = new Map<string, string>();
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => void map.set(key, value),
    removeItem: (key: string) => void map.delete(key),
  };
};

describe("inspectWallet", () => {
  it("recognises an ETH address without claiming the checksum", async () => {
    expect(
      await inspectWallet("0x52908400098527886E0F7030069857D2E4169EE7"),
    ).toEqual({ network: "ETH", checksum: "belum diperiksa" });
  });

  it("validates a bech32 BTC address", async () => {
    const result = await inspectWallet(
      "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq",
    );
    expect(result).toEqual({ network: "BTC", checksum: "valid" });
  });

  it("rejects a bech32 address with a broken checksum", async () => {
    const result = await inspectWallet(
      "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdx",
    );
    expect(result).toEqual({ network: "BTC", checksum: "tidak valid" });
  });

  it("validates a base58 BTC address", async () => {
    const result = await inspectWallet("1BoatSLRHtKNngkdXEeobR76b53LETtpyT");
    expect(result).toEqual({ network: "BTC", checksum: "valid" });
  });

  it("validates a TRON address", async () => {
    const result = await inspectWallet("TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t");
    expect(result).toEqual({ network: "TRON", checksum: "valid" });
  });

  it("returns null for something that is not an address", async () => {
    expect(await inspectWallet("bukan-alamat")).toBeNull();
  });
});

describe("walletReputation", () => {
  it("never calls an unreported address safe", async () => {
    const result = await walletReputation(
      "0x52908400098527886E0F7030069857D2E4169EE7",
      memory(),
    );
    expect(result.note).toMatch(/bukan jaminan/i);
  });

  it("says an address was reported when a source reports it", async () => {
    const result = await walletReputation(
      "0x52908400098527886E0F7030069857D2E4169EE7",
      memory(),
      {
        name: "Sumber uji",
        lookup: async () => ({ reported: true }),
      },
    );
    expect(result.note).toBe("Alamat pernah dilaporkan");
    expect(result.source).toBe("Sumber uji");
  });

  it("says the format is unknown instead of guessing", async () => {
    const result = await walletReputation("bukan-alamat", memory());
    expect(result.format).toBeNull();
    expect(result.note).toMatch(/belum dikenali/i);
  });
});
