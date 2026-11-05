import { ArrowRight, ShieldAlert } from "lucide-react";
import Link from "next/link";

/**
 * Hero — the whole page's job in one screen: say the problem, offer the two
 * actions that matter, and show the product working.
 *
 * The emergency button sits in the hero because for this audience it is not an
 * edge case; someone reading this may be mid-scam right now.
 */
export function Hero({ score, risk }: { score: number; risk: string }) {
  return (
    <section className="appnext-container grid gap-10 py-16 sm:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-14">
      <div>
        <h1 className="appnext-hero max-w-[15ch] text-balance">
          Kenali penipuannya sebelum uangnya hilang.
        </h1>

        <p className="appnext-lead mt-5 max-w-[46ch]">
          Tempel pesan atau tautan yang mencurigakan. Lumina menjelaskan kenapa
          berbahaya, mengajarkan polanya, dan menyiapkan laporan kalau kamu
          sudah terlanjur kena.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link
            href="/companion"
            data-pressable
            className="appnext-button appnext-button--primary group gap-2"
          >
            Periksa pesan sekarang
            <ArrowRight
              aria-hidden
              className="arrow-nudge arrow-nudge--right size-4"
            />
          </Link>
          <Link
            href="/darurat"
            data-pressable
            className="appnext-button gap-2 border border-[#FF5D5D]/40 bg-white text-[#B42626]"
          >
            <ShieldAlert aria-hidden className="size-4" />
            Saya sedang kena sekarang
          </Link>
        </div>

        <p className="appnext-caption mt-4">
          Tanpa akun. Pemeriksaan berjalan di perangkatmu.
        </p>
      </div>

      <HeroPanel score={score} risk={risk} />
    </section>
  );
}

/**
 * Static mock of the evidence panel. Deliberately not the live component: a
 * marketing page must never depend on runtime state, and the real figures are
 * reproduced from the APK demo case.
 */
function HeroPanel({ score, risk }: { score: number; risk: string }) {
  const signals = [
    {
      agent: "Message Agent",
      label:
        "Mengirim file APK — aplikasi di luar Play Store bisa mencuri SMS dan OTP",
      evidence: "Undangan-Pernikahan.apk",
    },
    {
      agent: "Message Agent",
      label: "Mengaku dari kurir atau instansi resmi",
      evidence: "kurir",
    },
    {
      agent: "Link Agent",
      label: "Tautan tidak ada di daftar domain resmi",
      evidence: "wa-undangan.site",
    },
  ];

  return (
    <div className="appnext-card p-5">
      <div className="flex items-center justify-between">
        <p className="text-[12px] font-medium text-[#121212]">Panel bukti</p>
        <span className="rounded-full bg-[#F4F4F4] px-2 py-0.5 text-[11px] text-[#606060]">
          3 temuan
        </span>
      </div>

      <div className="mt-4 flex items-baseline gap-3">
        <p className="text-[44px] font-medium leading-none tracking-[-1.4px] text-[#000]">
          {score}
          <span className="ml-1 text-[16px] font-light text-[#606060]">
            /100
          </span>
        </p>
        <span className="rounded-full border border-[#FF5D5D]/40 bg-[#FF5D5D]/10 px-2.5 py-1 text-[11px] font-medium text-[#B42626]">
          {risk}
        </span>
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#F4F4F4]">
        <div
          className="h-full rounded-full bg-[#FF5D5D]"
          style={{ width: `${score}%` }}
        />
      </div>

      <ul className="mt-4 flex flex-col gap-2">
        {signals.map((signal) => (
          <li
            key={signal.label}
            className="rounded-lg bg-[#F4F4F4] px-3 py-2.5"
          >
            <p className="text-[10px] uppercase tracking-wide text-[#606060]">
              {signal.agent}
            </p>
            <p className="mt-0.5 text-[13px] leading-snug text-[#121212]">
              {signal.label}
            </p>
            <p className="mt-1 text-[11px] text-[#606060]">
              Kutipan:{" "}
              <span className="text-[#121212]">“{signal.evidence}”</span>
            </p>
          </li>
        ))}
      </ul>

      <p className="mt-4 border-[#EEEEEE] border-t pt-3 text-[11px] text-[#606060]">
        Skor ditentukan <span className="text-[#121212]">scoring.ts</span> —
        deterministik, bukan tebakan model bahasa.
      </p>
    </div>
  );
}
