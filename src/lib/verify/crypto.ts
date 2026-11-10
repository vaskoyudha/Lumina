import { type LocalStorageLike, lookupLedger } from "@/lib/ledger";

const BASE58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
async function base58Check(value: string): Promise<boolean> {
  try {
    const base = BigInt(58);
    let n = BigInt(0);
    for (const char of value) {
      const i = BASE58.indexOf(char);
      if (i < 0) return false;
      n = n * base + BigInt(i);
    }
    const bytes: number[] = [];
    while (n > BigInt(0)) {
      bytes.unshift(Number(n & BigInt(255)));
      n >>= BigInt(8);
    }
    for (const c of value) {
      if (c !== "1") break;
      bytes.unshift(0);
    }
    if (bytes.length < 5) return false;
    const payload = Uint8Array.from(bytes.slice(0, -4));
    const once = await crypto.subtle.digest("SHA-256", payload);
    const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", once));
    return bytes.slice(-4).every((b, i) => b === digest[i]);
  } catch {
    return false;
  }
}
function bech32Check(value: string): boolean {
  if (value !== value.toLowerCase() && value !== value.toUpperCase())
    return false;
  const lower = value.toLowerCase();
  const split = lower.lastIndexOf("1");
  const hrp = lower.slice(0, split);
  const alphabet = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";
  const data = [...lower.slice(split + 1)].map((c) => alphabet.indexOf(c));
  if (hrp !== "bc" || data.length < 6 || data.some((v) => v < 0)) return false;
  const values = [
    ...[...hrp].map((c) => c.charCodeAt(0) >> 5),
    0,
    ...[...hrp].map((c) => c.charCodeAt(0) & 31),
    ...data,
  ];
  let chk = 1;
  const generators = [
    0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3,
  ];
  for (const value of values) {
    const top = chk >>> 25;
    chk = ((chk & 0x1ffffff) << 5) ^ value;
    for (let i = 0; i < 5; i++) if ((top >>> i) & 1) chk ^= generators[i];
  }
  return chk >>> 0 === 1 || chk >>> 0 === 0x2bc830a3;
}
export async function inspectWallet(address: string) {
  if (/^0x[a-fA-F0-9]{40}$/.test(address))
    return { network: "ETH", checksum: "belum diperiksa" };
  if (/^bc1[ac-hj-np-z02-9]{11,71}$/i.test(address))
    return {
      network: "BTC",
      checksum: bech32Check(address) ? "valid" : "tidak valid",
    };
  if (/^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(address))
    return {
      network: "BTC",
      checksum: (await base58Check(address)) ? "valid" : "tidak valid",
    };
  if (/^T[a-km-zA-HJ-NP-Z1-9]{33}$/.test(address))
    return {
      network: "TRON",
      checksum: (await base58Check(address)) ? "valid" : "tidak valid",
    };
  return null;
}
export interface WalletReputationSource {
  name: string;
  lookup(
    address: string,
  ): Promise<{ reported: boolean; label?: string } | null>;
}
export async function walletReputation(
  address: string,
  storage: LocalStorageLike,
  source?: WalletReputationSource,
) {
  const format = await inspectWallet(address);
  if (!format) return { format: null, note: "Bentuk alamat belum dikenali." };
  let reported = (await lookupLedger(storage, address)).length > 0;
  let sourceName = "Riwayat perangkat ini";
  if (source) {
    try {
      const result = await source.lookup(address);
      if (result) {
        reported ||= result.reported;
        sourceName = source.name;
      }
    } catch {}
  }
  return {
    format,
    source: sourceName,
    note: reported
      ? "Alamat pernah dilaporkan"
      : "Belum ada laporan; ini bukan jaminan keamanan alamat.",
  };
}
