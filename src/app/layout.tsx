import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import { SiteNav } from "@/components/shell/site-nav";
import { cn } from "@/lib/utils";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: {
    default: "Lumina — Kenali penipuan sebelum kehilangan uang",
    template: "%s · Lumina",
  },
  description:
    "Asisten yang menjelaskan kenapa sebuah pesan berbahaya, mengajarkan polanya, dan menyiapkan laporan kalau kamu sudah kena.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className={cn("dark font-sans", geist.variable)}>
      <body className="min-h-dvh bg-bg text-txt">
        <div className="flex min-h-dvh flex-col">
          <Suspense
            fallback={<div className="h-14 border-line border-b bg-panel" />}
          >
            <SiteNav />
          </Suspense>
          <main className="flex-1">{children}</main>
          <footer className="border-t border-line px-4 py-6 text-dim text-sm sm:px-6">
            <p className="mx-auto max-w-6xl">
              Lumina tidak menyimpan percakapan. Tidak ada akun, tidak ada
              unggahan ke server. Tutup tab, riwayatnya hilang.
            </p>
          </footer>
        </div>
      </body>
    </html>
  );
}
