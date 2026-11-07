"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { programsCopy, serviceRows, stepsCopy } from "@/lib/site";

const activeRowClass =
  "service-row group -mx-3 cursor-pointer rounded-2xl bg-ls-card px-3 py-4 transition-all";
const idleRowClass =
  "service-row group -mx-3 cursor-pointer rounded-2xl px-3 py-4 transition-all hover:bg-ls-card";

export function Programs() {
  const [activeSlot, setActiveSlot] = useState<string | null>(
    serviceRows[1]?.slot ?? null,
  );

  return (
    <section
      id="section-programs"
      className="border-ls-line border-t bg-ls-surface-alt px-4 pt-28 pb-24 sm:px-8"
    >
      <div className="mx-auto grid max-w-[1680px] grid-cols-1 items-start gap-10 lg:grid-cols-12">
        <div
          data-reveal
          id="section-steps"
          className="relative overflow-hidden rounded-3xl border border-ls-line-strong bg-ls-card-alt p-7 shadow-sm sm:p-10 lg:col-span-5"
        >
          <p className="mb-8 border-ls-accent-strong border-l-2 pl-4 text-ls-ink-2 text-xs leading-relaxed sm:text-sm">
            {stepsCopy.intro}
          </p>

          <div className="relative space-y-8">
            {stepsCopy.steps.map((step, index) => (
              <div
                key={step.no}
                className={
                  index === 1
                    ? "rounded-2xl border border-ls-line bg-ls-card/90 p-5 shadow-sm sm:ml-8"
                    : "rounded-2xl border border-ls-line bg-ls-card/80 p-5 shadow-sm"
                }
              >
                <span className="mb-2 inline-block rounded-md border border-ls-line-strong bg-ls-card-alt px-2.5 py-0.5 font-bold text-[10px] text-ls-ink-2 uppercase tracking-wider">
                  {step.no}
                </span>
                <h3 className="font-semibold text-base text-ls-ink sm:text-lg">
                  {step.title}
                </h3>
                <p className="mt-1.5 text-ls-ink-2 text-xs leading-relaxed">
                  {step.body}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div
          data-reveal
          className="relative rounded-3xl border border-ls-line-strong bg-ls-card p-7 shadow-sm sm:p-10 lg:col-span-7"
        >
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-ls-line-strong bg-ls-card-alt px-3 py-1 font-semibold text-[11px] text-ls-ink-2 uppercase tracking-wider">
            <span>☺</span>
            <span>{programsCopy.badge}</span>
          </div>

          <h2 className="mb-6 max-w-md font-semibold text-2xl text-ls-ink leading-tight sm:text-3xl lg:text-4xl">
            {programsCopy.title}
          </h2>

          <div className="divide-y divide-dashed divide-ls-line">
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
                              ? "flex h-7 w-7 items-center justify-center rounded-lg bg-ls-solid font-semibold text-ls-solid-ink text-xs"
                              : "flex h-7 w-7 items-center justify-center rounded-lg bg-ls-card-alt font-semibold text-ls-ink-2 text-xs"
                          }
                        >
                          {row.slot}
                        </span>
                        <span
                          className={
                            active
                              ? "font-semibold text-base text-ls-ink sm:text-lg"
                              : "font-semibold text-base text-ls-ink group-hover:text-ls-ink-2 sm:text-lg"
                          }
                        >
                          {row.title}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {row.features.map((feature) => (
                          <span
                            key={feature}
                            className="rounded-md border border-ls-line bg-ls-card-alt px-2.5 py-1 font-medium text-[11px] text-ls-ink-2"
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
                        ? "service-detail mt-3 flex flex-col justify-between gap-3 pr-2 pl-10 text-ls-ink-2 text-xs sm:flex-row sm:items-center"
                        : "service-detail mt-3 hidden flex-col justify-between gap-3 pr-2 pl-10 text-ls-ink-2 text-xs sm:flex-row sm:items-center"
                    }
                  >
                    <p>{row.body}</p>
                    <Button
                      asChild
                      size="sm"
                      className="shrink-0 rounded-full border-ls-solid-line bg-ls-solid px-3.5 font-semibold text-ls-solid-ink transition-colors hover:bg-ls-solid-hover"
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
