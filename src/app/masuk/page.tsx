import { ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthPanel } from "@/components/auth/auth-panel";
import { SignInPage } from "@/components/auth/sign-in-page";
import { BackButton } from "@/components/shell/back-button";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: "Masuk",
  description: "Masuk dengan akun demo, atau pakai Lumina tanpa akun.",
};

/**
 * `/daftar` redirects here with `?tab=daftar`. searchParams is runtime data, so
 * under Cache Components it has to sit inside a Suspense boundary or the whole
 * route fails to prerender.
 */
async function TabbedAuth({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  return <AuthPanel defaultTab={tab === "daftar" ? "daftar" : "masuk"} />;
}

function AuthSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <Skeleton className="h-9 w-full rounded-lg" />
      <Skeleton className="h-11 w-full rounded-lg" />
      <Skeleton className="h-11 w-full rounded-lg" />
      <Skeleton className="h-11 w-full rounded-lg" />
    </div>
  );
}

export default function MasukPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  return (
    <main className="h-dvh bg-background">
      <SignInPage
        title={<span className="font-light">Selamat datang</span>}
        description="Masuk untuk menyimpan progres belajar dan melanjutkan percakapan. Lumina tetap bisa dipakai tanpa akun."
        topSlot={<BackButton href="/" />}
        footerSlot={
          <p className="flex items-start gap-1.5 text-dim text-xs leading-relaxed">
            <ShieldCheck
              aria-hidden
              className="mt-0.5 size-3.5 shrink-0 text-brand"
            />
            Sesi ini hanya cookie bertanda tangan di perangkat ini. Tidak ada
            database, tidak ada unggahan, tidak ada reset password.
          </p>
        }
      >
        <Suspense fallback={<AuthSkeleton />}>
          <TabbedAuth searchParams={searchParams} />
        </Suspense>
      </SignInPage>
    </main>
  );
}
