import type { Metadata } from "next";
import { Suspense } from "react";
import { CompanionWithSession } from "@/components/companion/companion-with-session";

export const metadata: Metadata = {
  title: "Companion",
  description:
    "Ceritakan pesan atau tautan yang mencurigakan; Lumina menjelaskan kenapa berbahaya.",
};

/**
 * The conversation streams `CompanionChat` behind a `<Suspense>` boundary
 * because the session and the job corpus are request-time reads. A neutral
 * spinner holds the frame for direct visits; client navigations swap the
 * route's static shell immediately.
 */
function CompanionBoot() {
  return (
    <output className="grid h-full place-items-center">
      <span className="sr-only">Memuat Companion</span>
      <span
        aria-hidden
        className="size-6 animate-spin rounded-full border-2 border-line border-t-brand"
      />
    </output>
  );
}

export default function CompanionPage() {
  return (
    <Suspense fallback={<CompanionBoot />}>
      <CompanionWithSession />
    </Suspense>
  );
}
