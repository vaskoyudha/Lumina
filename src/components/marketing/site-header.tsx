"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MarketingAuth } from "@/components/marketing/marketing-auth";
import { useSite } from "@/components/marketing/site-provider";
import { Button } from "@/components/ui/button";
import { scrollToId } from "@/lib/scroll";
import { brand, navLinks } from "@/lib/site";

const SCROLL_THRESHOLD = 16;

function RoughBird({ className }: { className?: string }) {
  return (
    <svg
      className={`bird-float ${className ?? ""}`}
      viewBox="0 0 40 30"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M3.4 18.8C6.6 13.9 10.2 12.5 13.6 14.8c1.3.9 2.4 2.1 3.4 3.7"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.9"
      />
      <path
        d="M17 18.5c2.3-4.2 5.2-6.2 8.7-6.3 2.3-.1 4.2 1 5.9 3"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.9"
      />
      <path
        d="M31.6 15.2 36 13.4l-2.7 3"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
      <circle cx="28.1" cy="12.6" r="0.95" fill="currentColor" />
    </svg>
  );
}

export function SiteHeader() {
  const { openDrawer } = useSite();
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

  const linkTone = scrolled
    ? "text-espresso-950 hover:text-espresso-700"
    : "text-amberwarm-100/90 hover:text-white";

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
            className={`pointer-events-none absolute inset-0 rounded-[1.25rem] bg-white transition-opacity duration-500 ease-out ${
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
            className={`group relative flex items-center gap-2 font-semibold text-lg tracking-tight transition-colors duration-300 sm:text-xl ${
              scrolled ? "text-espresso-950" : "text-white"
            }`}
          >
            <span
              className="flex shrink-0 items-center justify-center transition-transform duration-200 ease-out group-hover:-translate-y-0.5"
              style={{
                width: scrolled ? 24 : 44,
                height: scrolled ? 20 : 36,
                transition:
                  "width 300ms ease-out, height 300ms ease-out, transform 200ms ease-out",
              }}
            >
              <RoughBird
                className={`h-full w-full transition-colors duration-300 ease-out ${
                  scrolled ? "text-espresso-800" : "text-amberwarm-300"
                }`}
              />
            </span>
            <span className="font-display">{brand.name}</span>
          </button>

          <div className="relative flex items-center gap-1.5 sm:gap-2.5">
            <MarketingAuth scrolled={scrolled} />
            <Link
              href="/companion"
              data-pressable
              aria-label={brand.navCta}
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-md transition-[background-color,color,transform] duration-200 ease-out active:scale-[0.97] sm:hidden ${
                scrolled
                  ? "bg-espresso-950 text-white hover:bg-espresso-800"
                  : "bg-amberwarm-50 text-espresso-950 hover:bg-amberwarm-100"
              }`}
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
              className={`hidden h-auto gap-3 rounded-xl py-1.5 pr-1.5 pl-5 font-semibold text-xs shadow-md transition-[background-color,color,transform] duration-300 ease-out active:scale-[0.97] sm:inline-flex sm:text-sm ${
                scrolled
                  ? "bg-espresso-950 text-white hover:bg-espresso-800"
                  : "bg-amberwarm-50 text-espresso-950 hover:bg-amberwarm-100"
              }`}
            >
              <Link href="/companion">
                <span>{brand.navCta}</span>
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors duration-300 ease-out ${
                    scrolled
                      ? "bg-white text-espresso-950"
                      : "bg-espresso-800 text-amberwarm-100"
                  }`}
                >
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
            <button
              type="button"
              aria-label="Buka menu navigasi cepat"
              onClick={openDrawer}
              className={`flex h-11 w-11 items-center justify-center rounded-xl shadow-md transition-[background-color,color,transform] duration-200 ease-out active:scale-[0.97] ${
                scrolled
                  ? "bg-sand-300 text-espresso-950 hover:bg-sand-500/40"
                  : "bg-amberwarm-50 text-espresso-900 hover:bg-amberwarm-100"
              }`}
            >
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <circle cx="8.5" cy="8.5" r="2" />
                <circle cx="15.5" cy="8.5" r="2" />
                <circle cx="8.5" cy="15.5" r="2" />
                <circle cx="15.5" cy="15.5" r="2" />
              </svg>
            </button>
          </div>
        </div>
      </nav>
    </div>
  );
}
