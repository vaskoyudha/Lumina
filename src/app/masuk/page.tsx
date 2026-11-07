import type { Metadata } from "next";
import { AuthPage } from "@/components/auth/auth-page";

export const metadata: Metadata = {
  title: "Masuk",
  description: "Masuk ke Lumina dengan Google atau email dan password.",
};

export default function MasukPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; tab?: string }>;
}) {
  return <AuthPage intent="masuk" searchParams={searchParams} />;
}
