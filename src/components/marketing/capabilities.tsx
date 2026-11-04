import {
  ArrowRight,
  BookOpen,
  Gamepad2,
  LifeBuoy,
  MessagesSquare,
} from "lucide-react";
import Link from "next/link";

/**
 * Capabilities — deliberately asymmetric.
 *
 * Darurat is separated and tinted as the safety exit because it is the only
 * surface a user reaches *while* being defrauded. An equal four-card grid would
 * flatten that hierarchy, which is the mistake the plan warns about.
 */
export function Capabilities() {
  return (
    <section id="kapabilitas" className="bg-[#F4F4F4] py-16 sm:py-20">
      <div className="appnext-container">
        <div className="max-w-[58ch]">
          <h2 className="appnext-h2">Empat permukaan, satu perjalanan.</h2>
          <p className="appnext-lead mt-3">
            Semuanya terhubung: temuan di companion mengarah ke modul yang
            menjelaskan polanya, lalu ke latihan di bawah tekanan.
          </p>
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          <article className="appnext-card p-5 lg:col-span-2">
            <MessagesSquare aria-hidden className="size-5 text-[#1BAB49]" />
            <h3 className="mt-3 text-[20px] font-medium text-[#000]">
              Companion
            </h3>
            <p className="mt-1.5 text-[14px] leading-relaxed text-[#606060]">
              Asisten percakapan yang memanggil agent deteksi di baliknya. Ia
              tidak mengarang skor: angka dan alasan datang dari aturan
              deterministik, lalu dijelaskan dengan bahasa manusia.
            </p>
            <Link
              href="/companion"
              data-pressable
              className="mt-4 inline-flex items-center gap-1 text-[13px] font-medium text-[#0F7A34]"
            >
              Mulai dari pesan
              <ArrowRight aria-hidden className="size-3.5" />
            </Link>
          </article>

          <article className="appnext-card p-5">
            <BookOpen aria-hidden className="size-5 text-[#606060]" />
            <h3 className="mt-3 text-[20px] font-medium text-[#000]">
              Belajar
            </h3>
            <p className="mt-1.5 text-[14px] leading-relaxed text-[#606060]">
              Dua belas modus penipuan Indonesia, diurutkan menurut laporan
              IASC. Satu modul selesai penuh, sisanya berstatus segera.
            </p>
            <Link
              href="/belajar"
              data-pressable
              className="mt-4 inline-flex items-center gap-1 text-[13px] font-medium text-[#606060]"
            >
              Buka modul
              <ArrowRight aria-hidden className="size-3.5" />
            </Link>
          </article>

          <article className="appnext-card p-5">
            <Gamepad2 aria-hidden className="size-5 text-[#606060]" />
            <h3 className="mt-3 text-[20px] font-medium text-[#000]">
              Simulasi
            </h3>
            <p className="mt-1.5 text-[14px] leading-relaxed text-[#606060]">
              Roleplay tujuh menit. Meter panik naik saat kamu berpikir, dan
              jawaban salah langsung dijelaskan tanpa memblokir cerita.
            </p>
            <Link
              href="/simulasi"
              data-pressable
              className="mt-4 inline-flex items-center gap-1 text-[13px] font-medium text-[#606060]"
            >
              Coba simulasi
              <ArrowRight aria-hidden className="size-3.5" />
            </Link>
          </article>

          <article className="rounded-[24px] border border-[#FF5D5D]/30 bg-white p-5">
            <LifeBuoy aria-hidden className="size-5 text-[#B42626]" />
            <h3 className="mt-3 text-[20px] font-medium text-[#000]">
              Darurat
            </h3>
            <p className="mt-1.5 text-[14px] leading-relaxed text-[#606060]">
              Untuk yang sedang kena sekarang. Checklist bernomor, kanal resmi,
              dan laporan siap cetak untuk dibawa ke bank. Tanpa skor, tanpa
              gamifikasi.
            </p>
            <Link
              href="/darurat"
              data-pressable
              className="mt-4 inline-flex items-center gap-1 text-[13px] font-medium text-[#B42626]"
            >
              Buka mode darurat
              <ArrowRight aria-hidden className="size-3.5" />
            </Link>
          </article>
        </div>
      </div>
    </section>
  );
}
