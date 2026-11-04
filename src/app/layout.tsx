import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

/**
 * Root layout: document only. Chrome lives in the route groups so the light
 * marketing pages and auth pages do not inherit the dark app shell.
 *
 *   (app)        dark shell — nav + footer, product surfaces
 *   (marketing)  light AppNext shell — landing page
 *   /masuk       light, centred, no app nav
 */

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
    <html lang="id" className={`dark font-sans ${geist.variable}`}>
      <body className="min-h-dvh bg-bg text-txt antialiased">{children}</body>
    </html>
  );
}
