"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ThemedLuminaLogo } from "@/components/brand/lumina-logo";
import { MarketingAuth } from "@/components/marketing/marketing-auth";
import { Button } from "@/components/ui/button";
import { scrollToId } from "@/lib/scroll";
import { brand, navLinks } from "@/lib/site";

const SCROLL_THRESHOLD = 16;

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () =>
      setScrolled((wasScrolled) =>
        wasScrolled
          ? window.scrollY > SCROLL_THRESHOLD - 8
          : window.scrollY > SCROLL_THRESHOLD + 8,
      );
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const linkTone = "text-ls-ink hover:text-ls-ink-2";

  return (
    <div className="fixed inset-x-0 top-0 z-40">
      <nav
        aria-label="Navigasi utama"
        className="mx-auto max-w-[1680px] px-4 pt-4 sm:px-8 sm:pt-5"
      >
        <div
          className="relative mx-auto flex min-h-14 items-center justify-between gap-2 rounded-[1.25rem] py-1.5 pr-1.5 pl-4 sm:gap-4 sm:pr-2 sm:pl-6"
          style={{
            maxWidth: scrolled ? 1240 : 1680,
            transition: "max-width 420ms cubic-bezier(0.33, 1, 0.68, 1)",
          }}
        >
          <span
            aria-hidden="true"
            className={`nav-glass pointer-events-none absolute inset-0 rounded-[1.25rem] transition-opacity duration-500 ease-out ${
              scrolled ? "opacity-100" : "opacity-0"
            }`}
          />
          <span
            aria-hidden="true"
            className={`pointer-events-none absolute inset-0 rounded-[1.25rem] bg-ls-surface transition-opacity duration-500 ease-out ${
              scrolled ? "opacity-[0.22]" : "opacity-0"
            }`}
          />
          <span
            aria-hidden="true"
            className={`nav-glass-light pointer-events-none absolute inset-0 rounded-[1.25rem] transition-opacity duration-500 ease-out ${
              scrolled ? "opacity-100" : "opacity-0"
            }`}
          />
          <div className="relative hidden items-center gap-7 font-medium text-sm md:flex">
            {navLinks.map((link) => (
              <button
                key={link.id}
                type="button"
                onClick={() => scrollToId(link.id)}
                className={`transition-colors duration-300 ${linkTone}`}
              >
                {link.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => scrollToId("section-home")}
            aria-label={`${brand.name} — kembali ke atas`}
            className="group relative flex items-center transition-transform duration-200 ease-out hover:-translate-y-0.5"
          >
            {/* The wordmark is the widest thing in the bar; below `sm` the
                auth cluster leaves ~94px for it, so the height steps down. */}
            <span
              className={`flex shrink-0 items-center justify-center transition-[height] duration-300 ease-out ${
                scrolled ? "h-6 sm:h-8" : "h-7 sm:h-[42px]"
              }`}
            >
              <ThemedLuminaLogo className="h-full w-auto" priority />
            </span>
          </button>

          <div className="relative flex items-center gap-1.5 sm:gap-2.5">
            <MarketingAuth />
            <Link
              href="/companion"
              data-pressable
              aria-label={brand.navCta}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-flame-500 text-espresso-950 shadow-[inset_0_1px_0_0_var(--color-flame-300),0_3px_0_0_var(--color-flame-600)] transition-[background-color,color,transform,translate,box-shadow] duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[inset_0_1px_0_0_var(--color-flame-300),0_5px_0_0_var(--color-flame-600)] active:translate-y-[3px]! active:transform-none active:bg-[color-mix(in_oklab,var(--color-flame-500)_90%,var(--color-espresso-950))] active:shadow-[inset_0_1px_0_0_var(--color-flame-300),0_0px_0_0_var(--color-flame-600)] active:[--t-approach:80ms] active:duration-75 sm:hidden"
            >
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.4"
                aria-hidden="true"
              >
                <path d="m7 6 5.5 6L7 18" />
                <path d="m13 6 5.5 6L13 18" />
              </svg>
            </Link>
            <Button
              asChild
              className="relative -top-0.5 hidden h-auto gap-2 rounded-xl border-0 bg-flame-500 bg-clip-border py-1.5 pr-1.5 pl-4 font-semibold text-espresso-950 text-xs shadow-[inset_0_1px_0_0_var(--color-flame-300),0_4px_0_0_var(--color-flame-600)] transition-[background-color,color,transform,translate,box-shadow] duration-300 ease-out hover:-translate-y-0.5 hover:bg-flame-500 hover:shadow-[inset_0_1px_0_0_var(--color-flame-300),0_6px_0_0_var(--color-flame-600)] active:translate-y-[4px]! active:transform-none active:bg-[color-mix(in_oklab,var(--color-flame-500)_90%,var(--color-espresso-950))] active:shadow-[inset_0_1px_0_0_var(--color-flame-300),0_0px_0_0_var(--color-flame-600)] active:[--t-approach:80ms] active:duration-75 sm:inline-flex sm:text-sm"
            >
              <Link href="/companion">
                <span>{brand.navCta}</span>
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-ls-card text-ls-ink transition-colors duration-300 ease-out">
                  <svg
                    className="h-3.5 w-3.5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2.4"
                    aria-hidden="true"
                  >
                    <path d="m7 6 5.5 6L7 18" />
                    <path d="m13 6 5.5 6L13 18" />
                  </svg>
                </span>
              </Link>
            </Button>
          </div>
        </div>
      </nav>
    </div>
  );
}
