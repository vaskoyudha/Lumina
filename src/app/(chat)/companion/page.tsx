import type { Metadata } from "next";
import { CompanionChat } from "@/components/companion/companion-chat";

export const metadata: Metadata = {
  title: "Companion",
  description:
    "Ceritakan pesan atau tautan yang mencurigakan; Lumina menjelaskan kenapa berbahaya.",
};

export default function CompanionPage() {
  return <CompanionChat />;
}
