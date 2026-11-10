"use client";

import Link from "next/link";
import { useState } from "react";
import DotBorderButton from "@/components/marketing/dot-border-button";
import { Button } from "@/components/ui/button";
import { scrollToId } from "@/lib/scroll";
import { brand, heroPerks } from "@/lib/site";

const moodQuotes: { label: string; quote: string }[] = [
  {
    label: "Tenang",
    quote:
      "Ketegasan yang tenang justru yang paling sering menyelamatkan. Tidak perlu buru-buru.",
  },
  {
    label: "Curiga",
    quote:
      "Rasa curiga yang kecil itu berharga. Mari kita periksa bersama, tanpa menuduh siapa pun.",
  },
  {
    label: "Takut",
    quote:
      "Takut itu wajar. Yang penting langkah berikutnya bisa dibaca dan diikuti satu per satu.",
  },
  {
    label: "Berharap",
    quote:
      "Tawaran yang benar tidak takut diperiksa. Kita bisa memeriksanya pelan-pelan.",
  },
  {
    label: "Bingung",
    quote:
      "Bingung bukan berarti bodoh. Penipuan memang dirancang membingungkan.",
  },
  {
    label: "Menyesal",
    quote:
      "Kalau sudah terjadi, yang dibutuhkan bukan penyesalan, tapi urutan tindakan.",
  },
];

const defaultQuote =
  "Pilih kondisi yang paling dekat. Setiap perasaan valid, dan langkah berikutnya tetap bisa disusun.";

export function Hero() {
  const [mood, setMood] = useState<string | null>(null);

  const activeQuote =
    moodQuotes.find((item) => item.label === mood)?.quote ?? defaultQuote;

  return (
    <header id="section-home" className="hero-bg relative text-white">
      <div className="mx-auto max-w-[1680px] px-5 pt-28 pb-16 sm:px-8 sm:pt-32 sm:pb-20 lg:pt-36 lg:pb-24">
        <div className="grid grid-cols-1 items-end gap-8 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-7">
            <div className="inline-flex items-center gap-2 rounded-full border border-amberwarm-300/25 bg-espresso-950/75 px-3.5 py-1.5 font-semibold text-[11px] text-amberwarm-200 uppercase tracking-[0.14em]">
              <span className="text-amberwarm-400">☺</span>
              <span>{brand.heroBadge}</span>
            </div>

            <h2 className="max-w-xl font-medium text-4xl text-white leading-[1.08] tracking-tight sm:text-5xl lg:text-[58px]">
              {brand.heroTitle[0]}
              <br />
              {brand.heroTitle[1]}
            </h2>

            <p className="max-w-md font-normal text-amberwarm-100/85 text-sm leading-relaxed sm:text-base">
              {brand.heroBody}
            </p>

            <div className="flex flex-wrap items-center gap-3.5 pt-2">
              <Button
                asChild
                className="h-auto gap-3 rounded-full bg-amberwarm-50 py-2 pr-2 pl-5 font-semibold text-espresso-950 text-xs shadow-lg transition-all active:scale-[0.97] hover:bg-amberwarm-100 sm:text-sm"
              >
                <Link href="/companion">
                  <span>{brand.primaryCta}</span>
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-espresso-800 text-amberwarm-100">
                    <svg
                      className="h-3.5 w-3.5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      aria-hidden="true"
                    >
                      <rect x="3" y="4" width="18" height="18" rx="2" />
                      <path d="M16 2v4M8 2v4M3 10h18" />
                    </svg>
                  </span>
                </Link>
              </Button>

              <div className="relative h-[55px] w-56">
                <DotBorderButton
                  label={brand.secondaryCta}
                  onActivate={() => scrollToId("section-programs")}
                  className="pointer-events-auto"
                />
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => scrollToId("section-programs")}
                  className="pointer-events-none absolute inset-0 h-auto w-auto rounded-md bg-transparent p-0 hover:bg-transparent focus-visible:ring-0 [&_svg]:hidden"
                >
                  <span className="sr-only">{brand.secondaryCta}</span>
                </Button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5" />
        </div>

        <div className="mt-12 grid grid-cols-1 items-end gap-6 lg:mt-16 lg:grid-cols-12">
          <div className="grid max-w-xl grid-cols-1 gap-3 sm:grid-cols-3 lg:col-span-7">
            {heroPerks.map((perk) => (
              <div
                key={perk.title}
                className="glass-pill flex items-start gap-2.5 rounded-2xl p-3.5"
              >
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-amberwarm-200/40 bg-amberwarm-300/20 text-[11px] text-amberwarm-200">
                  ✓
                </span>
                <div>
                  <div className="font-semibold text-white text-xs">
                    {perk.title}
                  </div>
                  <div className="mt-0.5 text-[11px] text-amberwarm-100/75">
                    {perk.body}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex lg:col-span-5 lg:justify-end">
            <div className="glass-card w-full max-w-sm rounded-2xl p-4 shadow-2xl sm:p-5">
              <div className="mb-3 flex items-center justify-between">
                <span className="font-medium text-amberwarm-50 text-xs sm:text-sm">
                  Bagaimana perasaanmu?
                </span>
                <span
                  id="mood-status-badge"
                  aria-live="polite"
                  className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] text-amberwarm-200 uppercase tracking-wider"
                >
                  {mood ?? "Pilih kondisi"}
                </span>
              </div>

              <fieldset
                className="m-0 mb-3.5 flex min-w-0 flex-wrap gap-1.5 border-0 p-0"
                aria-label="Pilih kondisi perasaan"
              >
                {moodQuotes.map((item) => {
                  const active = mood === item.label;
                  return (
                    <button
                      key={item.label}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setMood(active ? null : item.label)}
                      className={
                        active
                          ? "rounded-lg border border-white bg-amberwarm-200 px-2.5 py-1 font-medium text-espresso-950 text-xs shadow-sm transition-all active:scale-[0.97]"
                          : "rounded-lg border border-white/20 bg-white/15 px-2.5 py-1 font-medium text-white text-xs transition-all hover:bg-white/25 active:scale-[0.97]"
                      }
                    >
                      + {item.label}
                    </button>
                  );
                })}
              </fieldset>

              <div
                aria-live="polite"
                className="rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-[11px] text-amberwarm-100/90 italic leading-snug sm:text-xs"
              >
                &ldquo;{activeQuote}&rdquo;
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
