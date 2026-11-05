import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

/**
 * Inter, matching the reference chat UI's `$font-ui` stack
 * (`'Inter', system-ui, -apple-system, sans-serif`). Loaded through
 * `next/font` so it is self-hosted and needs no network at runtime — the same
 * file the browser would get from the system stack, just guaranteed.
 */
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

/**
 * Root shell only carries the document and the design-token ground.
 *
 * `body.appnext` installs the measured AppNext light palette once; the
 * `--lumina-*` names are remapped inside that subtree, so every product
 * surface and the marketing pages share one light ground.
 *
 * The chrome still lives in the route groups: `(app)` for the four product
 * surfaces, `(chat)` for the full-height companion, `(marketing)` for the
 * landing page, and `admin/` for its own separate shell.
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
    <html lang="id" className={`font-sans ${inter.variable}`}>
      <body className="appnext min-h-dvh bg-bg text-txt antialiased">
        {children}
      </body>
    </html>
  );
}
