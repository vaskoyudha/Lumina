"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { scrollToId } from "@/lib/scroll";
import { aboutCopy, aboutStats } from "@/lib/site";

const portraits = [
  {
    key: "about-1",
    rotate: "-rotate-[26deg]",
    translate: "translate-y-12 sm:translate-y-16",
    size: "w-24 h-28 sm:w-36 sm:h-40",
    shadow: "shadow-lg",
    extra: "",
  },
  {
    key: "about-2",
    rotate: "-rotate-[13deg]",
    translate: "translate-y-3 sm:translate-y-5",
    size: "w-24 h-28 sm:w-36 sm:h-40",
    shadow: "shadow-lg",
    extra: "",
  },
  {
    key: "about-3",
    rotate: "rotate-0",
    translate: "-translate-y-2",
    size: "w-28 h-32 sm:w-40 sm:h-44",
    shadow: "shadow-xl",
    extra: "z-10",
  },
  {
    key: "about-4",
    rotate: "rotate-[13deg]",
    translate: "translate-y-3 sm:translate-y-5",
    size: "w-24 h-28 sm:w-36 sm:h-40",
    shadow: "shadow-lg",
    extra: "",
  },
  {
    key: "about-5",
    rotate: "rotate-[26deg]",
    translate: "translate-y-12 sm:translate-y-16",
    size: "w-24 h-28 sm:w-36 sm:h-40",
    shadow: "shadow-lg",
    extra: "",
  },
];

export function About() {
  return (
    <section
      id="section-about"
      className="relative overflow-hidden bg-ls-surface px-4 pt-28 pb-24 sm:px-8"
    >
      <div className="mx-auto max-w-[1440px]">
        <div
          data-reveal
          className="relative flex min-h-[210px] items-end justify-center gap-3 pt-4 pb-6 sm:min-h-[260px] sm:gap-6 md:gap-8"
        >
          {portraits.map((portrait, index) => (
            <div
              key={portrait.key}
              className={`${portrait.size} overflow-hidden rounded-2xl border-2 border-white ${portrait.shadow} transform ${portrait.rotate} ${portrait.translate} transition-transform duration-300 hover:scale-105 ${portrait.extra}`}
            >
              <Image
                src={`/images/${portrait.key}.jpg`}
                alt={aboutCopy.portraits[index].alt}
                width={320}
                height={352}
                className="h-full w-full object-cover"
                priority={index === 2}
              />
            </div>
          ))}
        </div>

        <div className="relative pt-10 pb-6 text-center sm:pt-14">
          <div className="pointer-events-none absolute top-0 left-1/2 h-16 w-[calc(100%-2rem)] max-w-[760px] -translate-x-1/2 select-none sm:h-[84px]">
            <svg
              className="h-full w-full"
              viewBox="0 0 760 84"
              preserveAspectRatio="none"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M0 84C150 84 210 8 380 8S610 84 760 84"
                stroke="var(--ls-line-strong)"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeDasharray="4 8"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
          </div>

          <div data-reveal className="relative z-10">
            <div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-ls-line-strong bg-ls-card-alt px-3.5 py-1 font-semibold text-[11px] text-ls-ink-2 uppercase tracking-wider">
              <span>☺</span>
              <span>{aboutCopy.badge}</span>
            </div>

            <h2 className="mx-auto max-w-xl font-semibold text-3xl text-ls-ink leading-[1.15] sm:text-4xl lg:text-[42px]">
              {aboutCopy.title[0]}
              <br />
              {aboutCopy.title[1]}
            </h2>

            <p className="mx-auto mt-4 max-w-md text-ls-ink-2 text-xs leading-relaxed sm:text-sm">
              {aboutCopy.body}
            </p>

            <div className="mt-7">
              <Button
                className="h-auto gap-3 rounded-full bg-ls-accent py-1.5 pr-1.5 pl-5 font-semibold text-ls-ink text-xs shadow-sm transition-colors duration-200 ease-out hover:bg-ls-accent-strong sm:text-sm"
                onClick={() => scrollToId("section-steps")}
              >
                <span>{aboutCopy.cta}</span>
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ls-solid text-ls-solid-ink">
                  <svg
                    className="h-3.5 w-3.5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="m7 6 5.5 6L7 18" />
                    <path d="m13 6 5.5 6L13 18" />
                  </svg>
                </span>
              </Button>
            </div>
          </div>
        </div>

        <div
          data-reveal
          className="mt-10 grid grid-cols-2 gap-6 border-ls-line border-t pt-8 text-center sm:grid-cols-4"
        >
          {aboutStats.map((stat, index) => (
            <div
              key={stat.label}
              className={
                index === aboutStats.length - 1
                  ? "px-2"
                  : "border-ls-line-strong border-dashed px-2 sm:border-r"
              }
            >
              <div className="font-bold font-display text-3xl text-ls-ink sm:text-4xl">
                {stat.value}
              </div>
              <div className="mt-1 text-ls-ink-3 text-xs">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
