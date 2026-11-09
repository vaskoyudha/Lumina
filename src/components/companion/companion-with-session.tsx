import { CompanionChat } from "@/components/companion/companion-chat";
import { getSession } from "@/lib/auth/server-session";
import { CORPUS_LIMIT, capCorpus } from "@/lib/loker/corpus";
import { loadCorpus } from "@/lib/loker/store";
import type { LokerCorpus } from "@/lib/loker/types";

const EMPTY_CORPUS: LokerCorpus = {
  postings: [],
  total: 0,
  capped: false,
};

/**
 * The session read and the corpus read both belong to request time.
 *
 * `loadCorpus` is the only database read on this page and it is allowed to
 * fail: a database outage must not take the companion down, because the
 * message checker is entirely local. A failed read is an empty corpus, not an
 * error page.
 */
export async function CompanionWithSession({
  searchParams,
}: {
  searchParams: Promise<{ panel?: string }>;
}) {
  const [session, { panel }, corpus] = await Promise.all([
    getSession(),
    searchParams,
    loadCorpus(CORPUS_LIMIT)
      .then(({ postings, total }) => capCorpus(postings, total))
      .catch(() => EMPTY_CORPUS),
  ]);

  return (
    <CompanionChat
      session={session ? { nama: session.nama, email: session.email } : null}
      initialPanel={panel === "agen" ? "agen" : undefined}
      corpus={corpus}
    />
  );
}
