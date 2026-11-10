import { type LocalStorageLike, lookupLedger } from "@/lib/ledger";
export function phonePrefix(input: string) {
  const digits = input.replace(/[^\d+]/g, "");
  if (/^\d{3,8}$/.test(digits))
    return {
      kind: "shortcode" as const,
      prefix: digits,
      note: "Nomor singkat; cocokkan dengan kanal resmi.",
    };
  const local = digits.replace(/^\+?62/, "0");
  if (/^08\d{8,12}$/.test(local))
    return {
      kind: "indonesia" as const,
      prefix: local.slice(0, 4),
      note: "Format seluler Indonesia; operator dan pemilik tidak diverifikasi.",
    };
  return {
    kind: "foreign-or-unknown" as const,
    prefix: null,
    note: "Nomor luar negeri atau format belum dikenali; identitas tidak dapat disimpulkan.",
  };
}
export async function phoneReputation(
  phone: string,
  storage: LocalStorageLike,
) {
  const matches = await lookupLedger(storage, phone);
  return {
    prefix: phonePrefix(phone),
    status: matches.length
      ? "Pernah dilaporkan di perangkat ini"
      : "Belum ada laporan",
    source: "Riwayat perangkat ini",
  };
}
