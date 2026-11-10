import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

/**
 * Inter, matching the reference chat UI's `$font-ui` stack
 * (`'Inter', system-ui, -apple-system, sans-serif`). The variable font is
 * committed under `app/fonts` instead of fetched from Google at build/dev time:
 * an offline demo must not spend 20+ seconds timing out before first paint.
 * The workspace's `--font-jakarta` falls back to this family.
 */
const inter = localFont({
  src: "./fonts/inter-variable.woff2",
  variable: "--font-sans",
  weight: "100 900",
  display: "swap",
});

/**
 * DeepTutor typography, scoped to Companion only.
 *
 * DeepTutor uses Geist for the workspace chrome and user bubbles, and Lora for
 * assistant prose, the chat title, and the empty-state greeting. Both are
 * vendored here (OFL, latin subset) so the offline demo never waits on Google
 * Fonts. The `companion-font` class in globals.css remaps --font-sans/--font-serif
 * inside the Companion shell; the rest of Lumina keeps Inter.
 */
const geist = localFont({
  src: "./fonts/geist-variable.woff2",
  variable: "--font-geist",
  weight: "100 900",
  display: "swap",
});

const lora = localFont({
  src: [
    {
      path: "./fonts/lora-variable.woff2",
      weight: "400 700",
      style: "normal",
    },
    {
      path: "./fonts/lora-italic-variable.woff2",
      weight: "400 700",
      style: "italic",
    },
  ],
  variable: "--font-lora",
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
    <html
      lang="id"
      className={`font-sans ${inter.variable} ${geist.variable} ${lora.variable}`}
    >
      <body
        className="appnext min-h-dvh bg-bg text-txt antialiased"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
