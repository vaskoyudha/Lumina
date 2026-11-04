import { ArrowRight, LifeBuoy } from "lucide-react";
import Link from "next/link";

/**
 * Marketing nav — light surface, no app chrome.
 * Logged-out only; the app has its own nav inside (app).
 */
export function MarketingNav() {
  return (
    <header className="border-b border-[#EEEEEE] bg-white/90 backdrop-blur-sm">
      <div className="appnext-container flex items-center gap-4 py-4">
        <Link
          href="/"
          data-pressable
          className="text-[15px] font-semibold tracking-tight text-[#121212]"
        >
          Lumina
        </Link>

        <nav
          aria-label="Navigasi halaman"
          className="ml-auto flex items-center gap-1"
        >
          <Link
            href="/#cara-kerja"
            data-pressable
            className="hidden rounded-md px-3 py-1.5 text-[13px] text-[#606060] hover:bg-[#F4F4F4] hover:text-[#121212] sm:inline-flex"
          >
            Cara kerja
          </Link>
          <Link
            href="/#kapabilitas"
            data-pressable
            className="hidden rounded-md px-3 py-1.5 text-[13px] text-[#606060] hover:bg-[#F4F4F4] hover:text-[#121212] sm:inline-flex"
          >
            Fitur
          </Link>
          <Link
            href="/masuk"
            data-pressable
            className="rounded-md px-3 py-1.5 text-[13px] text-[#606060] hover:bg-[#F4F4F4] hover:text-[#121212]"
          >
            Masuk
          </Link>
          <Link
            href="/companion"
            data-pressable
            className="group inline-flex items-center gap-1.5 rounded-full bg-[#121212] px-4 py-2 text-[13px] font-medium text-white hover:bg-[#000]"
          >
            Periksa pesan
            <ArrowRight
              aria-hidden
              className="arrow-nudge arrow-nudge--right size-3.5"
            />
          </Link>
        </nav>
      </div>

      {/* Emergency stays reachable from every page, including marketing. */}
      <div className="border-[#EEEEEE] border-t bg-white">
        <div className="appnext-container flex items-center gap-2 py-2">
          <LifeBuoy aria-hidden className="size-3.5 text-[#1BAB49]" />
          <p className="text-[12px] text-[#606060]">
            Sedang terjadi sekarang?{" "}
            <Link
              href="/darurat"
              data-pressable
              className="font-medium text-[#044680] underline-offset-4 hover:underline"
            >
              Buka mode darurat
            </Link>{" "}
            — tidak perlu akun.
          </p>
        </div>
      </div>
    </header>
  );
}
