"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";

/**
 * Announcement that the rail asked for the filter panel.
 *
 * Next's `<Link>` updates the hash with `history.pushState`, which never fires
 * `hashchange`, so the rail also dispatches this event. Arriving from another
 * route still works without it: the panel mounts and reads the hash itself.
 */
export const EXPLORE_EVENT = "lumina:community-explore";

/**
 * Search and filter disclosure for the timeline.
 *
 * The rail links to `/komunitas#jelajahi`, but an anchor alone only scrolls to
 * a collapsed `<details>`. This opens the panel for both entry paths.
 */
export function ExplorePanel({
  defaultOpen,
  children,
}: {
  defaultOpen: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const reveal = () => {
      setOpen(true);
      ref.current?.scrollIntoView({ block: "start" });
    };
    const sync = () => {
      if (window.location.hash === "#jelajahi") reveal();
    };
    sync();
    window.addEventListener("hashchange", sync);
    window.addEventListener(EXPLORE_EVENT, reveal);
    return () => {
      window.removeEventListener("hashchange", sync);
      window.removeEventListener(EXPLORE_EVENT, reveal);
    };
  }, []);
  return (
    <details
      ref={ref}
      id="jelajahi"
      open={open}
      onToggle={() => setOpen(ref.current?.open ?? false)}
      className="scroll-mt-16 border-b border-line"
    >
      {children}
    </details>
  );
}
