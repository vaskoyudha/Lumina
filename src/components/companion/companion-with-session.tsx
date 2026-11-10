import { CompanionChat } from "@/components/companion/companion-chat";
import { latestAgentRun } from "@/lib/agent/runs";
import { getSession } from "@/lib/auth/server-session";
import { getModule } from "@/lib/content/store";
import { CORPUS_LIMIT, capCorpus } from "@/lib/loker/corpus";
import { loadCorpus } from "@/lib/loker/store";
import type { LokerCorpus } from "@/lib/loker/types";
import { isOrchestratorEnabled } from "@/lib/orchestrator/flag";

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
  searchParams = Promise.resolve({}),
  agentPanel = false,
}: {
  searchParams?: Promise<{ panel?: string; modul?: string }>;
  agentPanel?: boolean;
} = {}) {
  const session = await getSession();
  const [{ panel, modul }, corpus, latestRun] = await Promise.all([
    searchParams,
    loadCorpus(CORPUS_LIMIT)
      .then(({ postings, total }) => capCorpus(postings, total))
      .catch(() => EMPTY_CORPUS),
    session
      ? latestAgentRun(session.id).catch(() => null)
      : Promise.resolve(null),
  ]);
  const module =
    modul && /^[1-9]\d?$/.test(modul)
      ? await getModule(Number(modul)).catch(() => null)
      : null;

  return (
    <CompanionChat
      session={session ? { nama: session.nama, email: session.email } : null}
      initialPanel={agentPanel || panel === "agen" ? "agen" : undefined}
      latestRun={latestRun}
      corpus={corpus}
      orchestrator={isOrchestratorEnabled()}
      initialModule={
        module?.content
          ? { no: module.metadata.no, title: module.metadata.nama }
          : undefined
      }
    />
  );
}
