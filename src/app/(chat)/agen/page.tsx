import type { Metadata } from "next";
import { Suspense } from "react";
import { CompanionChat } from "@/components/companion/companion-chat";
import { CompanionWithSession } from "@/components/companion/companion-with-session";

export const metadata: Metadata = {
  title: "Agen pemeriksa · Companion",
  description:
    "Delapan agen deterministik membaca pesan mencurigakan sebelum skor dihitung.",
};

/**
 * `/agen` is the agent surface as its own address.
 *
 * The overview does not need the conversation's request-time data, so it is the
 * fallback: the static shell paints the agents immediately while the session
 * and the job corpus stream in behind it. There is no `/companion?panel=agen`
 * alias — the address is always `/agen`.
 */
export default function AgenPage() {
  return (
    <Suspense fallback={<CompanionChat initialPanel="agen" />}>
      <CompanionWithSession agentPanel />
    </Suspense>
  );
}
