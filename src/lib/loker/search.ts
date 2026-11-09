import {
  buatFilterGaji,
  buatFilterKonten,
  buatFilterLokasi,
} from "@/lib/loker/filters";
import { teksLoker, uraiKueri } from "@/lib/loker/query";
import type { LokerSearchArgs, LokerView } from "@/lib/loker/types";

/**
 * The client-side search pipeline.
 *
 * The user's query is filtered here, in the browser, against the RSC snapshot.
 * There is no search endpoint, which is what makes "the query never leaves the
 * device" structural rather than a promise.
 *
 * Order matches the spec: query terms (AND) → location → salary → hide-flagged.
 */
export function filterPostings(
  postings: readonly LokerView[],
  args: LokerSearchArgs,
): LokerView[] {
  const terms = uraiKueri(args.query);
  const cocokLokasi = buatFilterLokasi(
    args.location ? { allow: [args.location] } : null,
  );
  const cocokGaji = buatFilterGaji(
    args.salaryMin !== undefined || args.salaryMax !== undefined
      ? { min: args.salaryMin, max: args.salaryMax }
      : null,
  );

  return postings.filter((posting) => {
    if (terms.length > 0) {
      const text = teksLoker({
        title: posting.title,
        description: posting.description,
        location: posting.location ?? "",
        tags: posting.tags,
      });
      // One `buatFilterKonten` call per term: the ported filter ORs its
      // positive list, and the chat box needs AND.
      for (const term of terms) {
        if (!buatFilterKonten({ positive: [term] })(text)) return false;
      }
    }

    if (!cocokLokasi(posting.location)) return false;

    const salary =
      posting.salaryMin === null && posting.salaryMax === null
        ? null
        : {
            min: posting.salaryMin,
            max: posting.salaryMax,
            currency: "IDR",
          };
    if (!cocokGaji(salary)) return false;

    if (args.hideFlagged) {
      if (posting.sentinelStatus !== "clean") return false;
      if (
        posting.luminaRisk === "mencurigakan" ||
        posting.luminaRisk === "tinggi"
      ) {
        return false;
      }
    }

    return true;
  });
}
