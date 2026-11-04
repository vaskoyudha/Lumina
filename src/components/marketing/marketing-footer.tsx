import Link from "next/link";

export function MarketingFooter() {
  return (
    <footer className="border-[#EEEEEE] border-t bg-white">
      <div className="appnext-container flex flex-col gap-4 py-8 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[14px] font-semibold tracking-tight text-[#121212]">
            Lumina
          </p>
          <p className="mt-1 max-w-[52ch] text-[12px] leading-relaxed text-[#606060]">
            Alat bantu mengenali penipuan digital Indonesia. Bukan layanan
            hukum, dan tidak menggantikan laporan resmi ke bank atau kepolisian.
          </p>
        </div>

        <nav
          aria-label="Tautan kaki"
          className="flex flex-wrap gap-x-5 gap-y-2"
        >
          <Link
            href="/companion"
            className="text-[12px] text-[#606060] hover:text-[#121212]"
          >
            Companion
          </Link>
          <Link
            href="/belajar"
            className="text-[12px] text-[#606060] hover:text-[#121212]"
          >
            Belajar
          </Link>
          <Link
            href="/simulasi"
            className="text-[12px] text-[#606060] hover:text-[#121212]"
          >
            Simulasi
          </Link>
          <Link
            href="/darurat"
            className="text-[12px] font-medium text-[#B42626]"
          >
            Darurat
          </Link>
          <Link
            href="/masuk"
            className="text-[12px] text-[#606060] hover:text-[#121212]"
          >
            Akun demo
          </Link>
        </nav>
      </div>
    </footer>
  );
}
