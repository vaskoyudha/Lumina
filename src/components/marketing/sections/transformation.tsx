"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { scrollToId } from "@/lib/scroll";
import { transformationCopy, transformationPairs } from "@/lib/site";

const ACTIVE_PAIR = 3;

const activeLeftClass =
  "transform-left-pill rounded-lg border border-amberwarm-200 bg-amberwarm-400/30 px-4 py-2 font-semibold text-sm text-white transition-all";
const idleLeftClass =
  "transform-left-pill rounded-lg border border-white/15 bg-white/10 px-4 py-2 text-amberwarm-100 text-sm transition-all hover:bg-white/20";
const activeRightClass =
  "transform-right-pill rounded-lg bg-amberwarm-300 px-4 py-2 font-bold text-espresso-950 text-sm shadow-lg ring-2 ring-white transition-all";
const idleRightClass =
  "transform-right-pill rounded-lg bg-sand-400 px-4 py-2 font-semibold text-espresso-950 text-sm shadow-md transition-all";

export function Transformation() {
  const [selected, setSelected] = useState(ACTIVE_PAIR);

  return (
    <section
      id="section-transformation"
      className="bg-sand-100 px-4 pt-24 pb-20 sm:px-8"
    >
      <div className="transformation-bg relative mx-auto flex max-w-[1680px] flex-col justify-center overflow-hidden rounded-3xl border border-amberwarm-400/20 p-6 text-white shadow-xl sm:p-12 lg:min-h-[880px] lg:py-20">
        <div className="relative z-10 mx-auto max-w-3xl text-center">
          <div className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-amberwarm-200/25 bg-black/35 px-3.5 py-1 font-semibold text-[12px] text-amberwarm-200 uppercase tracking-widest">
            <span>☺</span>
            <span>{transformationCopy.badge}</span>
          </div>
          <h2 className="font-medium text-3xl leading-[1.1] sm:text-5xl lg:text-[52px]">
            {transformationCopy.title[0]}
            <br />
            {transformationCopy.title[1]}
          </h2>
          <p aria-live="polite" className="mt-3 text-amberwarm-100/80 text-sm">
            {transformationCopy.helper}
          </p>
        </div>

        <div className="relative z-10 mt-12 grid grid-cols-1 items-center gap-8 md:grid-cols-11 lg:mt-16">
          <div className="flex flex-col items-center space-y-5 md:col-span-5 md:items-end">
            <div className="mb-1 flex w-full items-center justify-between gap-4 md:justify-start">
              <span className="font-medium text-amberwarm-100/90 text-sm sm:text-base">
                {transformationCopy.leftLabel}
              </span>
            </div>
            <fieldset
              className="m-0 flex min-w-0 max-w-md flex-wrap justify-center gap-3 border-0 p-0 md:justify-end"
              aria-label={transformationCopy.leftLabel}
            >
              {transformationPairs.map((pair, index) => (
                <button
                  key={pair.left}
                  type="button"
                  aria-pressed={selected === index}
                  onClick={() => setSelected(index)}
                  className={
                    selected === index ? activeLeftClass : idleLeftClass
                  }
                >
                  + {pair.left}
                </button>
              ))}
            </fieldset>
          </div>

          <div className="relative flex flex-col items-center justify-center py-2 md:col-span-1">
            <div className="hidden h-64 w-px bg-gradient-to-b from-transparent via-amberwarm-200/60 to-transparent md:block" />
            <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-amberwarm-300/70 bg-espresso-900 shadow-lg md:absolute">
              <svg
                className="h-6 w-6 animate-spin text-amberwarm-300 [animation-duration:18s]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.93 4.93l2.12 2.12M16.95 16.95l2.12 2.12M19.07 4.93l-2.12 2.12M7.05 16.95l-2.12 2.12" />
              </svg>
            </div>
          </div>

          <div className="flex flex-col items-center space-y-5 md:col-span-5 md:items-start">
            <div className="mb-1 flex w-full items-center justify-between gap-4 md:justify-end">
              <span className="font-medium text-amberwarm-100/90 text-sm sm:text-base">
                {transformationCopy.rightLabel}
              </span>
            </div>
            <fieldset
              className="m-0 flex min-w-0 max-w-md flex-wrap justify-center gap-3 border-0 p-0 md:justify-start"
              aria-label={transformationCopy.rightLabel}
            >
              {transformationPairs.map((pair, index) => (
                <button
                  key={pair.right}
                  type="button"
                  aria-pressed={selected === index}
                  onClick={() => setSelected(index)}
                  className={
                    selected === index ? activeRightClass : idleRightClass
                  }
                >
                  + {pair.right}
                </button>
              ))}
            </fieldset>
          </div>
        </div>

        <div className="relative z-10 mt-12 text-center lg:mt-16">
          <Button
            className="inline-flex h-auto items-center gap-3 rounded-full bg-amberwarm-50 py-2 pr-2 pl-6 font-semibold text-espresso-950 text-sm shadow-lg transition-all hover:bg-amberwarm-100 active:scale-[0.97] sm:text-base"
            onClick={() => scrollToId("section-programs")}
          >
            <span>{transformationCopy.cta}</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-espresso-800 text-white text-sm">
              »
            </span>
          </Button>
        </div>
      </div>
    </section>
  );
}
