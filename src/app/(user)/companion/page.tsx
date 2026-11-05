import type { Metadata } from "next";
import { CompanionEntry } from "@/components/companion/companion-entry";

export const metadata: Metadata = {
  title: "Companion",
  description:
    "Ceritakan pesan atau tautan yang mencurigakan; Lumina menjelaskan kenapa berbahaya.",
};

export default function CompanionPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <CompanionEntry />
    </div>
  );
}
