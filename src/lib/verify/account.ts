import { type LocalStorageLike, lookupLedger } from "@/lib/ledger";
export interface AccountReputationSource {
  name: string;
  lookup(account: string): Promise<{ reported: boolean } | null>;
}
export async function accountReputation(
  account: string,
  storage: LocalStorageLike,
) {
  const found = await lookupLedger(storage, `rekening ${account}`);
  return {
    reported: found.length > 0,
    status: found.length
      ? "Pernah dilaporkan di perangkat ini"
      : "Belum ada laporan",
    note: "Hanya riwayat perangkat ini. CekRekening.id tidak menyediakan API publik yang terhubung di Lumina; hasil ini bukan pemeriksaan rekening nasional.",
  };
}
