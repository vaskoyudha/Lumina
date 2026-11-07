"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { programsCopy, serviceRows, stepsCopy } from "@/lib/site";

const activeRowClass =
  "service-row group -mx-3 cursor-pointer rounded-2xl bg-sand-50 px-3 py-4 transition-all";
const idleRowClass =
  "service-row group -mx-3 cursor-pointer rounded-2xl px-3 py-4 transition-all hover:bg-sand-50";

export function Programs() {
  const [activeSlot, setActiveSlot] = useState<string | null>(
    serviceRows[1]?.slot ?? null,
  );

  return (
    <section
      id="section-programs"
      className="border-hairline border-t bg-sand-100 px-4 pt-28 pb-24 sm:px-8"
    >
      <div className="mx-auto grid max-w-[1680px] grid-cols-1 items-start gap-10 lg:grid-cols-12">
        <div
          id="section-steps"
          className="relative overflow-hidden rounded-3xl border border-hairline-strong bg-sand-300 p-7 shadow-sm sm:p-10 lg:col-span-5"
        >
          <p className="mb-8 border-amberwarm-400 border-l-2 pl-4 text-ink-body text-xs leading-relaxed sm:text-sm">
            {stepsCopy.intro}
          </p>

          <div className="relative space-y-8">
            {stepsCopy.steps.map((step, index) => (
              <div
                key={step.no}
                className={
                  index === 1
                    ? "rounded-2xl border border-hairline bg-white/90 p-5 shadow-sm sm:ml-8"
                    : "rounded-2xl border border-hairline bg-white/80 p-5 shadow-sm"
                }
              >
                <span className="mb-2 inline-block rounded-md border border-hairline-strong bg-sand-150 px-2.5 py-0.5 font-bold text-[10px] text-espresso-800 uppercase tracking-wider">
                  {step.no}
                </span>
                <h3 className="font-semibold text-base text-espresso-950 sm:text-lg">
                  {step.title}
                </h3>
                <p className="mt-1.5 text-ink-body text-xs leading-relaxed">
                  {step.body}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative rounded-3xl border border-hairline-strong bg-white p-7 shadow-sm sm:p-10 lg:col-span-7">
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-hairline-strong bg-sand-150 px-3 py-1 font-semibold text-[11px] text-espresso-900 uppercase tracking-wider">
            <span>☺</span>
            <span>{programsCopy.badge}</span>
          </div>

          <h2 className="mb-6 max-w-md font-semibold text-2xl text-espresso-950 leading-tight sm:text-3xl lg:text-4xl">
            {programsCopy.title}
          </h2>

          <div className="divide-y divide-dashed divide-hairline">
            {serviceRows.map((row) => {
              const active = activeSlot === row.slot;
              return (
                <div
                  key={row.slot}
                  data-service-id={row.slot}
                  className={active ? activeRowClass : idleRowClass}
                >
                  <button
                    type="button"
                    aria-expanded={active}
                    aria-controls={`service-detail-${row.slot}`}
                    onClick={() => setActiveSlot(active ? null : row.slot)}
                    className="w-full text-left"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-3.5">
                        <span
                          className={
                            active
                              ? "flex h-7 w-7 items-center justify-center rounded-lg bg-espresso-800 font-semibold text-white text-xs"
                              : "flex h-7 w-7 items-center justify-center rounded-lg bg-sand-300 font-semibold text-espresso-800 text-xs"
                          }
                        >
                          {row.slot}
                        </span>
                        <span
                          className={
                            active
                              ? "font-semibold text-base text-espresso-950 sm:text-lg"
                              : "font-semibold text-base text-espresso-950 group-hover:text-espresso-700 sm:text-lg"
                          }
                        >
                          {row.title}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {row.features.map((feature) => (
                          <span
                            key={feature}
                            className="rounded-md border border-hairline bg-sand-250 px-2.5 py-1 font-medium text-[11px] text-espresso-800"
                          >
                            + {feature}
                          </span>
                        ))}
                      </div>
                    </div>
                  </button>
                  <div
                    id={`service-detail-${row.slot}`}
                    className={
                      active
                        ? "service-detail mt-3 flex flex-col justify-between gap-3 pr-2 pl-10 text-ink-body text-xs sm:flex-row sm:items-center"
                        : "service-detail mt-3 hidden flex-col justify-between gap-3 pr-2 pl-10 text-ink-body text-xs sm:flex-row sm:items-center"
                    }
                  >
                    <p>{row.body}</p>
                    <Button
                      asChild
                      size="sm"
                      className="shrink-0 rounded-full bg-espresso-800 px-3.5 font-semibold text-white transition-colors hover:bg-espresso-700"
                    >
                      <Link href="/companion">{programsCopy.cta} »</Link>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
