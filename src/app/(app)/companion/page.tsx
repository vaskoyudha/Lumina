import type { Metadata } from "next";
import { CompanionChat } from "@/components/companion/companion-chat";

export const metadata: Metadata = {
  title: "Companion",
  description:
    "Ceritakan pesan atau tautan yang mencurigakan; Lumina menjelaskan kenapa berbahaya.",
};

export default function CompanionPage() {
  /*
    Full-height app surface, not a document. The chat shell owns its own scroll
    containers, so the page itself must not scroll. The whole chain has to be
    `flex` with `min-h-0`, or the shell collapses to the height of its content
    instead of filling the viewport.
  */
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <CompanionChat />
    </div>
  );
}
