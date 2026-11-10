"use client";

import { useSearchParams } from "next/navigation";
import { CompanionChat } from "@/components/companion/companion-chat";

/**
 * The loading UI for `/companion` has to know which panel the URL asked for.
 *
 * The route streams `CompanionChat` behind a `<Suspense>` boundary because the
 * session and the job corpus are request-time reads. A fixed chat fallback made
 * every `/companion?panel=agen` navigation paint the conversation first — the
 * exact detour that made the sidebar's "Agen" row feel broken on slow loads.
 * Reading the URL here keeps the first painted frame on the requested panel.
 */
export function CompanionPanelFallback() {
  const panel = useSearchParams().get("panel");
  return <CompanionChat initialPanel={panel === "agen" ? "agen" : undefined} />;
}
