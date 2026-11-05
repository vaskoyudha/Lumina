import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
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

/**
 * Root shell only carries the document and the design-token ground.
 *
 * The product chrome (nav + footer) lives in `app/(user)/layout.tsx`, and the
 * admin chrome lives in `app/admin/layout.tsx`. That split is deliberate: the
 * admin is a separate area, not a page inside the learner app, so opening
 * `/admin` must not show the four learner destinations at all.
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className={cn("font-sans", geist.variable)}>
      <body className="appnext min-h-dvh">{children}</body>
    </html>
  );
}
