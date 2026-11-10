"use client";

import Image from "next/image";
import {
  AGENT_REGISTRY,
  AGENT_SEQUENCE,
  type DetectorAgent,
} from "@/components/companion/agents";
import { Button } from "@/components/ui/button";
import { scrollToId } from "@/lib/scroll";
import { aboutCopy, aboutStats } from "@/lib/site";

/**
 * The crew shown above the section copy is the same registry the companion
 * uses, so a new agent or a replaced mascot reaches the landing without a
 * second list to maintain. Alt text names the agent and the surface it reads.
 */
const CREW_ROLE: Record<DetectorAgent, string> = {
  message: "agen pemeriksa pesan",
  link: "agen pemeriksa tautan",
  identity: "agen pemeriksa identitas pengirim",
  conversation: "agen pemeriksa alur percakapan",
  job: "agen pemeriksa tawaran kerja",
  marketplace: "agen pemeriksa jual-beli",
  qris: "agen pemeriksa QRIS",
  evidence: "agen penyusun bukti",
};

const agents = AGENT_SEQUENCE.flatMap((id) => {
  const profile = AGENT_REGISTRY[id];
  if (!profile.portrait) return [];
  return [
    {
      key: id,
      portrait: profile.portrait,
      alt: `${profile.displayName}, ${CREW_ROLE[id]}`,
    },
  ];
});

/**
 * Lumina sits in the middle of its own crew: four detectors on each side.
 * The split is four, not zero, so every agent stays visible without a second row.
 */
const CREW = [
  ...agents.slice(0, 4),
  {
    key: "lumina",
    portrait: "/brand/agents/lumina.jpg",
    alt: "Lumina, orkestrator",
  },
  ...agents.slice(4),
];

/** Position in the nine-card fan: outer cards sit lower and turn further. */
const fan = [
  {
    rotate: "-rotate-[30deg]",
    translate: "translate-y-12",
    size: "w-[clamp(80px,7.6vw,118px)] h-[clamp(80px,7.6vw,118px)]",
    z: "",
  },
  {
    rotate: "-rotate-[22deg]",
    translate: "translate-y-7",
    size: "w-[clamp(90px,8.7vw,134px)] h-[clamp(90px,8.7vw,134px)]",
    z: "",
  },
  {
    rotate: "-rotate-[15deg]",
    translate: "translate-y-3",
    size: "w-[clamp(102px,9.9vw,152px)] h-[clamp(102px,9.9vw,152px)]",
    z: "z-10",
  },
  {
    rotate: "-rotate-[7deg]",
    translate: "translate-y-1",
    size: "w-[clamp(112px,11vw,168px)] h-[clamp(112px,11vw,168px)]",
    z: "z-20",
  },
  {
    rotate: "rotate-0",
    translate: "-translate-y-2",
    size: "w-[clamp(130px,12.8vw,196px)] h-[clamp(130px,12.8vw,196px)]",
    z: "z-30",
  },
  {
    rotate: "rotate-[7deg]",
    translate: "translate-y-1",
    size: "w-[clamp(112px,11vw,168px)] h-[clamp(112px,11vw,168px)]",
    z: "z-20",
  },
  {
    rotate: "rotate-[15deg]",
    translate: "translate-y-3",
    size: "w-[clamp(102px,9.9vw,152px)] h-[clamp(102px,9.9vw,152px)]",
    z: "z-10",
  },
  {
    rotate: "rotate-[22deg]",
    translate: "translate-y-7",
    size: "w-[clamp(90px,8.7vw,134px)] h-[clamp(90px,8.7vw,134px)]",
    z: "",
  },
  {
    rotate: "rotate-[30deg]",
    translate: "translate-y-12",
    size: "w-[clamp(80px,7.6vw,118px)] h-[clamp(80px,7.6vw,118px)]",
    z: "",
  },
];

export function About() {
  return (
    <section
      id="section-about"
      className="relative overflow-hidden bg-ls-surface px-4 pt-28 pb-24 sm:px-8"
    >
      <div className="mx-auto max-w-[1440px]">
        <div data-reveal className="relative -mx-4 sm:-mx-8">
          <ul
            aria-label="Delapan agen pemeriksa dan Lumina"
            className="mx-auto grid max-w-[600px] grid-cols-3 gap-2 sm:gap-3 lg:hidden"
          >
            {CREW.map((agent) => (
              <li
                key={agent.key}
                className="overflow-hidden rounded-2xl border-2 border-white shadow-md"
              >
                <Image
                  src={agent.portrait}
                  alt={agent.alt}
                  width={320}
                  height={320}
                  className="aspect-square w-full object-cover"
                />
              </li>
            ))}
          </ul>

          <div className="hidden min-h-[220px] items-end justify-center gap-[clamp(12px,1.2vw,18px)] pt-4 pb-6 lg:flex">
            {CREW.map((agent, index) => {
              const position = fan[index % fan.length];
              return (
                <div
                  key={agent.key}
                  className={`${position.size} shrink-0 overflow-hidden rounded-2xl border-2 border-white shadow-lg transform ${position.rotate} ${position.translate} transition-transform duration-300 hover:scale-105 ${position.z}`}
                >
                  <Image
                    src={agent.portrait}
                    alt={agent.alt}
                    width={320}
                    height={320}
                    className="h-full w-full object-cover"
                  />
                </div>
              );
            })}
          </div>
        </div>

        <div className="relative pt-10 pb-6 text-center sm:pt-14">
          <div className="pointer-events-none absolute top-0 left-1/2 h-20 w-[calc(100%-2rem)] max-w-[1280px] -translate-x-1/2 select-none sm:h-[120px]">
            <svg
              className="h-full w-full"
              viewBox="0 0 1280 120"
              preserveAspectRatio="none"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M2 116C310 116 372 6 640 6S970 116 1278 116"
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

            <h2 className="mx-auto max-w-2xl text-balance font-semibold text-3xl text-ls-ink leading-[1.15] sm:text-4xl lg:text-[42px]">
              {aboutCopy.title.join(" ")}
            </h2>

            <p className="mx-auto mt-4 max-w-md text-ls-ink-2 text-sm leading-relaxed">
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
