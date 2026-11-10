"use client";

import { PanelLeftOpen } from "lucide-react";
import { useRouter } from "next/navigation";
import { type ReactNode, useState } from "react";
import { AccountProgressProvider } from "@/components/belajar/belajar-progress";
import {
  CompanionAuth,
  type CompanionSession,
} from "@/components/companion/companion-auth";
import { SessionSidebar } from "@/components/companion/session-sidebar";
import { ProfilePopup } from "@/components/profil/profile-popup";
import { Button } from "@/components/ui/button";
import type { LearningSummary } from "@/lib/content/schema";
import { cn } from "@/lib/utils";

/**
 * The shared workspace chrome: the Companion sidebar on the left, a scrolling
 * content column, and an optional right rail. `Belajar` and `Simulasi` both use
 * it — same brand row, new-chat action, search, history, destinations, account
 * and privacy card — not a lookalike.
 *
 * `label` only names the mobile drawer header; the destinations in `NavRail`
 * determine the active row from the pathname, so a new route does not need its
 * own copy of this component.
 *
 * The sidebar's chat-only surfaces stay honest here: history is empty because
 * thread history lives in Companion's tab state, and "Percakapan baru" takes the
 * reader to Companion instead of pretending to start a thread here.
 */
export function WorkspaceFrame({
  children,
  aside,
  session = null,
  className,
  label = "Belajar",
  progressModules,
}: {
  children: ReactNode;
  aside?: ReactNode;
  session?: CompanionSession | null;
  className?: string;
  /** Mobile drawer header; the sidebar itself is the shared navigation. */
  label?: string;
  /**
   * Learning surfaces pass their catalog here so the account-progress provider
   * sits inside the streamed workspace instead of above its Suspense boundary.
   * That keeps the first client render identical to the server HTML.
   */
  progressModules?: LearningSummary[];
}) {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const content = (
    <>
      <a
        href="#workspace-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-panel focus:px-3 focus:py-2 focus:font-medium focus:text-sm focus:text-txt focus:shadow-lg"
      >
        Langsung ke konten
      </a>
      <SessionSidebar
        sessions={[]}
        onSelect={() => {}}
        onNew={() => router.push("/companion")}
        onClose={() => setMobileOpen(false)}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((open) => !open)}
        onShowAgents={() => router.push("/agen")}
        auth={(iconsOnly) => (
          <CompanionAuth session={session} iconsOnly={iconsOnly} />
        )}
        className={cn(
          "max-md:absolute max-md:inset-y-0 max-md:left-0 max-md:z-30 max-md:rounded-r-xl max-md:border-line max-md:border-r-2 max-md:bg-bg max-md:shadow-rest md:z-10 md:bg-transparent",
          mobileOpen ? "max-md:flex" : "max-md:hidden",
        )}
      />

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex h-12 shrink-0 items-center gap-2 border-line border-b bg-panel px-4 md:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileOpen(true)}
            aria-label="Buka navigasi"
            aria-expanded={mobileOpen}
            className="size-11 shrink-0 rounded-full bg-chip text-ink-mute hover:bg-chip-hover hover:text-ink"
          >
            <PanelLeftOpen aria-hidden strokeWidth={1.6} className="size-4" />
          </Button>
          <span className="truncate font-medium text-sm text-txt">{label}</span>
          <ProfilePopup className="ml-auto size-8 text-[10px]" />
        </div>

        <div
          data-workspace-scroll
          className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:flex-row lg:gap-4 lg:overflow-hidden"
        >
          <div
            id="workspace-content"
            tabIndex={-1}
            className="no-scrollbar flex min-w-0 flex-1 flex-col outline-none lg:overflow-y-auto"
          >
            <div className="flex min-w-0 flex-col gap-3.5 px-4 py-3.5 sm:px-5 lg:py-4 lg:pl-4 lg:pr-0">
              {children}
            </div>
          </div>

          {aside ? (
            <aside
              aria-label="Ringkasan halaman"
              className="no-scrollbar min-w-0 border-line border-t px-4 py-3.5 sm:px-5 lg:w-[340px] lg:shrink-0 lg:overflow-y-auto lg:border-t-0 lg:border-l lg:py-4 lg:pl-0 lg:pr-4"
            >
              {aside}
            </aside>
          ) : null}
        </div>
      </main>
    </>
  );

  return (
    <div
      data-workspace
      className={cn(
        "relative flex h-full min-h-0 overflow-hidden bg-bg text-txt",
        className,
      )}
    >
      {progressModules ? (
        <AccountProgressProvider modules={progressModules}>
          {content}
        </AccountProgressProvider>
      ) : (
        content
      )}
    </div>
  );
}
