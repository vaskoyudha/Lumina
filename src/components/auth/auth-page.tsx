import { ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AuthFeedback } from "@/components/auth/auth-feedback";
import { AuthPanel } from "@/components/auth/auth-panel";
import { SignInPage } from "@/components/auth/sign-in-page";
import { BackButton } from "@/components/shell/back-button";

async function LegacyTab({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  if ((await searchParams).tab === "daftar") redirect("/daftar");
  return null;
}

export function AuthPage({
  intent,
  searchParams,
}: {
  intent: "masuk" | "daftar";
  searchParams: Promise<{ error?: string; tab?: string }>;
}) {
  return (
    <main className="h-dvh bg-background">
      <SignInPage
        title={
          <span className="font-light">
            {intent === "daftar"
              ? "Mulai bersama Lumina"
              : "Selamat datang kembali"}
          </span>
        }
        description={
          intent === "daftar"
            ? "Buat akun dengan Google atau email. Kenali penipuan dan belajar melindungi diri, selangkah demi selangkah."
            : "Masuk ke akunmu dan lanjutkan belajar. Lumina tetap bisa dipakai tanpa akun."
        }
        topSlot={<BackButton href="/" />}
        footerSlot={
          <p className="flex items-start gap-1.5 text-dim text-xs leading-relaxed">
            <ShieldCheck
              aria-hidden
              className="mt-0.5 size-3.5 shrink-0 text-brand"
            />
            Nama dan email disimpan untuk akun. Progres belajar tetap di
            perangkat ini; pesan yang diperiksa tetap diproses di perangkat.
          </p>
        }
      >
        <div className="flex flex-col gap-5">
          <Suspense fallback={null}>
            {intent === "masuk" ? (
              <LegacyTab searchParams={searchParams} />
            ) : null}
            <AuthFeedback searchParams={searchParams} />
          </Suspense>
          <AuthPanel mode={intent} />
        </div>
      </SignInPage>
    </main>
  );
}
