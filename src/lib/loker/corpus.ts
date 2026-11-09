import type { LokerCorpus, LokerView } from "@/lib/loker/types";

/** The number of rows the RSC loader asks the database for. */
export const CORPUS_LIMIT = 300;

/**
 * The serialization budget the RSC payload may carry. The card prints the real
 * count, so lowering the cap is visible rather than silent.
 */
export const CORPUS_BUDGET_BYTES = 500_000;

const encoder = new TextEncoder();

/**
 * Keep the newest rows until the payload budget is reached.
 *
 * Order is preserved: `loadCorpus` returns newest `fetched_at` first, and the
 * card says "lowongan terbaru". `capped` is true whenever the caller is shown
 * fewer rows than the database holds, whether the limit or the budget caused it.
 */
export function capCorpus(
  postings: readonly LokerView[],
  total: number,
  budgetBytes: number = CORPUS_BUDGET_BYTES,
): LokerCorpus {
  const kept: LokerView[] = [];
  let bytes = 0;

  for (const posting of postings) {
    if (kept.length >= CORPUS_LIMIT) break;
    const size = encoder.encode(JSON.stringify(posting)).byteLength;
    // Always keep at least one row so a tiny budget cannot produce a lie.
    if (kept.length > 0 && bytes + size > budgetBytes) break;
    kept.push(posting);
    bytes += size;
  }

  return { postings: kept, total, capped: kept.length < total };
}
