import { ArrowLeft, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthPanel } from "@/components/auth/auth-panel";
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
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-10 sm:py-14">
      <Link
        href="/"
        data-pressable
        className="inline-flex w-fit items-center gap-1 text-dim text-sm hover:text-txt"
      >
        <ArrowLeft aria-hidden className="size-3.5" />
        Kembali
      </Link>

      <header>
        <h1 className="font-semibold text-2xl tracking-tight">Masuk</h1>
        <p className="mt-1.5 text-dim text-sm">
          Lumina bisa dipakai tanpa akun. Akun demo di bawah hanya untuk
          memperlihatkan alur yang sudah selesai.
        </p>
      </header>

      <Suspense fallback={<AuthSkeleton />}>
        <TabbedAuth searchParams={searchParams} />
      </Suspense>

      <p className="flex items-start gap-1.5 text-dim text-xs leading-relaxed">
        <ShieldCheck
          aria-hidden
          className="mt-0.5 size-3.5 shrink-0 text-safe"
        />
        Sesi ini hanya cookie bertanda tangan di perangkat ini. Tidak ada
        database, tidak ada unggahan, tidak ada reset password.
      </p>
    </div>
  );
}
