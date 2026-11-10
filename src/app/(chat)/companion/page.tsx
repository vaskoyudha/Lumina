import type { Metadata } from "next";
import { Suspense } from "react";
import { CompanionPanelFallback } from "@/components/companion/companion-panel-fallback";
import { CompanionWithSession } from "@/components/companion/companion-with-session";

export const metadata: Metadata = {
  title: "Companion",
  description:
    "Ceritakan pesan atau tautan yang mencurigakan; Lumina menjelaskan kenapa berbahaya.",
};

/**
 * The panel-aware loading UI reads the URL, which is only known at request
 * time. That read suspends while the static shell is prerendered, so the outer
 * boundary holds a neutral frame for direct visits; client navigations resolve
 * the URL synchronously and go straight to the requested panel.
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

export default function CompanionPage({
  searchParams,
}: {
  searchParams: Promise<{ panel?: string }>;
}) {
  return (
    <Suspense fallback={<CompanionBoot />}>
      <Suspense fallback={<CompanionPanelFallback />}>
        <CompanionWithSession searchParams={searchParams} />
      </Suspense>
    </Suspense>
  );
}
