import { cachedBlocklists } from "@/lib/verify/blocklists";
export function cachedReputation(url: string) {
  const sources = cachedBlocklists(url);
  return {
    sources: sources ?? [],
    note: sources
      ? "Reputasi dari cache sumber publik; ketiadaan laporan bukan bukti aman."
      : "Belum ada reputasi tersimpan",
  };
}
