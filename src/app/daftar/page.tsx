import type { Metadata } from "next";
import { AuthPage } from "@/components/auth/auth-page";

export const metadata: Metadata = {
  title: "Daftar",
  description: "Buat akun Lumina dengan Google atau email dan password.",
};

export default function DaftarPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  return <AuthPage intent="daftar" searchParams={searchParams} />;
}
