"use client";

import { PanelLeftOpen } from "lucide-react";
import { useRouter } from "next/navigation";
import { type ReactNode, useState } from "react";
import {
  CompanionAuth,
  type CompanionSession,
} from "@/components/companion/companion-auth";
import { SessionSidebar } from "@/components/companion/session-sidebar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * The Belajar workspace: the Companion sidebar on the left, a scrolling study
 * column, and the optional right rail. It is deliberately the same chrome the
 * companion uses — brand, new chat, search, history, the four destinations,
 * account and privacy card — not a lookalike.
 *
 * The sidebar's chat-only surfaces stay honest on this page: history is empty
 * because thread history lives in Companion's tab state, and "Percakapan baru"
 * takes the reader to Companion instead of pretending to start a thread here.
 */
export function BelajarWorkspace({
  children,
  aside,
  session = null,
  className,
}: {
  children: ReactNode;
  aside?: ReactNode;
  session?: CompanionSession | null;
  className?: string;
}) {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div
      data-belajar-workspace
      className={cn(
        "relative flex h-full min-h-0 overflow-hidden bg-bg text-txt",
        className,
      )}
    >
      <SessionSidebar
        sessions={[]}
        onSelect={() => {}}
        onNew={() => router.push("/companion")}
        onClose={() => setMobileOpen(false)}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((open) => !open)}
        auth={(iconsOnly) => (
          <CompanionAuth session={session} iconsOnly={iconsOnly} />
        )}
        className={cn(
          "bg-bg max-md:absolute max-md:inset-y-0 max-md:left-0 max-md:z-30 max-md:border-line max-md:border-r md:border-line md:border-r",
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
            className="size-8 shrink-0 rounded-full bg-chip text-ink-mute hover:bg-chip-hover hover:text-ink"
          >
            <PanelLeftOpen aria-hidden strokeWidth={1.6} className="size-4" />
          </Button>
          <span className="truncate font-medium text-sm text-txt">Belajar</span>
        </div>

        <div
          data-belajar-scroll
          className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:flex-row lg:overflow-hidden"
        >
          <div className="flex min-w-0 flex-1 flex-col lg:overflow-y-auto">
            <div className="flex min-w-0 flex-col gap-6 px-5 py-6 sm:px-8 lg:py-7">
              {children}
            </div>
          </div>

          {aside ? (
            <aside className="min-w-0 border-line border-t bg-panel px-5 py-6 lg:w-[340px] lg:shrink-0 lg:overflow-y-auto lg:border-t-0 lg:border-l lg:py-7">
              {aside}
            </aside>
          ) : null}
        </div>
      </main>
    </div>
  );
}
