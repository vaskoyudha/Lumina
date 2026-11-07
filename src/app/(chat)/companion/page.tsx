import type { Metadata } from "next";
import { Suspense } from "react";
import { CompanionChat } from "@/components/companion/companion-chat";
import { CompanionWithSession } from "@/components/companion/companion-with-session";

export const metadata: Metadata = {
  title: "Companion",
  description:
    "Ceritakan pesan atau tautan yang mencurigakan; Lumina menjelaskan kenapa berbahaya.",
};

export default function CompanionPage() {
  return (
    <Suspense fallback={<CompanionChat />}>
      <CompanionWithSession />
    </Suspense>
  );
}
