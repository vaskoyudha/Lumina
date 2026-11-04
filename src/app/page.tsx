import {
  ArrowRight,
  GraduationCap,
  MessagesSquare,
  ShieldAlert,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

/**
 * Home — one screen, three pillars, one loud emergency button (§5-D).
 * No hero metrics, no eyebrow pill, no gradient. The emergency path leads.
 */

const PILLARS = [
  {
    href: "/companion",
    title: "Tanya companion",
    body: "Ceritakan pesan atau tautan yang mencurigakan. Ia menjelaskan kenapa berbahaya, bukan hanya memberi skor.",
    cta: "Mulai dari pesan",
    Icon: MessagesSquare,
  },
  {
    href: "/belajar",
    title: "Pelajari polanya",
    body: "Satu modul lengkap lebih berguna daripada dua belas halaman kosong. Mulai dari file APK lewat WhatsApp.",
    cta: "Buka modul",
    Icon: GraduationCap,
  },
  {
    href: "/simulasi",
    title: "Berlatih di bawah tekanan",
    body: "Roleplay 7 menit: meter panik naik saat kamu berpikir, dan jawaban salah langsung dijelaskan.",
    cta: "Coba simulasi",
    Icon: ShieldAlert,
  },
] as const;

export default function HomePage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-16">
      <section className="max-w-2xl">
        <h1 className="text-balance font-semibold text-3xl text-txt leading-tight tracking-tight sm:text-4xl">
          Kenali penipuannya sebelum uangnya hilang.
        </h1>
        <p className="mt-4 max-w-prose text-dim">
          Lumina menjelaskan kenapa sebuah pesan berbahaya, mengajarkan pola di
          baliknya, dan menyiapkan laporan kalau kamu sudah terlanjur kena.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Button
            asChild
            data-pressable
            className="h-11 bg-safe px-5 text-bg hover:bg-safe/90"
          >
            <Link href="/companion">
              Periksa pesan sekarang
              <ArrowRight data-icon="inline-end" aria-hidden />
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            data-pressable
            className="h-11 border-danger/60 px-5 text-danger hover:bg-danger/10"
          >
            <Link href="/darurat">Saya sedang kena sekarang</Link>
          </Button>
        </div>
      </section>

      <section aria-labelledby="pilar" className="mt-14">
        <h2 id="pilar" className="sr-only">
          Tiga cara memakai Lumina
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PILLARS.map(({ href, title, body, cta, Icon }, index) => (
            <article
              key={href}
              className="flex flex-col rounded-lg border border-line bg-panel p-5"
            >
              <div className="flex items-start gap-2">
                <Icon aria-hidden className="mt-0.5 size-4 text-safe" />
                <h3 className="font-medium text-txt">
                  <span className="tabular mr-1.5 text-dim">0{index + 1}</span>
                  {title}
                </h3>
              </div>
              <p className="mt-2 flex-1 text-dim text-sm">{body}</p>
              <Link
                href={href}
                data-pressable
                className="mt-4 inline-flex items-center gap-1 font-medium text-safe text-sm"
              >
                {cta}
                <ArrowRight aria-hidden className="size-3.5" />
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-14 max-w-2xl rounded-lg border border-danger/40 bg-danger/5 p-5">
        <h2 className="font-medium text-txt">Kalau ini sedang terjadi</h2>
        <p className="mt-2 text-dim text-sm">
          Uang sudah ditransfer, OTP sudah diberikan, atau kamu sedang ditelepon
          pelaku. Lewati pelajaran — ikuti checklist berurutan dan cetak
          laporannya.
        </p>
        <Button
          asChild
          variant="destructive"
          data-pressable
          className="mt-4 h-10 px-4"
        >
          <Link href="/darurat">Buka mode darurat</Link>
        </Button>
      </section>
    </div>
  );
}
