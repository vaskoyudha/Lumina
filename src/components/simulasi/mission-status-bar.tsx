"use client";

import { Check, Clock, Pause, Play, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const DEFAULT_SECONDS = 4 * 60 + 32;

function formatClock(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

/**
 * The mission header from the reference: identity on the left, the
 * Mulai → Keputusan → Hasil stepper in the middle, and the remaining-time
 * clock plus pause control on the right.
 *
 * The clock is a guide, not a fail condition — Santai mode has no time
 * pressure. It ticks only while running and stops at 00:00.
 */
export function MissionStatusBar({
  title = "Simulasi Keamanan Digital",
  description = "Pahami risiko, ambil keputusan yang tepat.",
  steps = ["Mulai", "Keputusan", "Hasil"],
  activeStep = 0,
  budgetSeconds = DEFAULT_SECONDS,
  className,
}: {
  title?: string;
  description?: string;
  steps?: string[];
  activeStep?: number;
  budgetSeconds?: number;
  className?: string;
}) {
  const [remaining, setRemaining] = useState(budgetSeconds);
  const [paused, setPaused] = useState(false);
  const clock = formatClock(remaining);
  const running = !paused && remaining > 0;

  useEffect(() => {
    if (!running) return;
    const interval = window.setInterval(() => {
      setRemaining((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [running]);

  return (
    <section
      aria-label="Status simulasi"
      className={cn(
        "relative overflow-hidden rounded-[22px] border border-brand-line bg-gradient-to-b from-panel to-brand-tint/40 shadow-[var(--appnext-shadow-ambient)]",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-brand-tint/80 via-brand-tint/30 to-transparent"
      />
      <div className="relative flex flex-col gap-4 px-4 py-4 sm:px-5 lg:flex-row lg:items-center lg:justify-between lg:gap-5">
        <div className="flex min-w-0 items-center gap-3 lg:max-w-[24rem]">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-brand-soft text-brand ring-1 ring-brand-line">
            <ShieldCheck
              aria-hidden="true"
              strokeWidth={1.8}
              className="size-5"
            />
          </span>
          <div className="min-w-0">
            <p className="font-semibold text-[15px] text-txt leading-snug">
              {title}
            </p>
            <p className="mt-0.5 text-[11.5px] text-dim leading-snug">
              {description}
            </p>
          </div>
        </div>

        <ol
          aria-label="Tahap simulasi"
          className="flex w-full shrink-0 items-start lg:w-[260px]"
        >
          {steps.map((step, index) => {
            const done = index < activeStep;
            const current = index === activeStep;
            return (
              <li
                key={step}
                aria-current={current ? "step" : undefined}
                className="relative flex flex-1 flex-col items-center gap-1.5"
              >
                {index > 0 && (
                  <span
                    aria-hidden="true"
                    className={cn(
                      "absolute top-[11px] right-1/2 left-[-50%] h-px",
                      done || current ? "bg-brand-line" : "bg-line",
                    )}
                  />
                )}
                <span
                  className={cn(
                    "tabular relative z-10 grid size-[22px] place-items-center rounded-full font-semibold text-[11px]",
                    current
                      ? "bg-brand text-bg shadow-sm"
                      : done
                        ? "bg-brand-soft text-brand ring-1 ring-brand-line"
                        : "bg-panel text-dim ring-1 ring-line",
                  )}
                >
                  {done ? (
                    <Check
                      aria-hidden="true"
                      strokeWidth={3}
                      className="size-3"
                    />
                  ) : (
                    index + 1
                  )}
                </span>
                <span
                  className={cn(
                    "text-[11px] leading-none",
                    current ? "font-semibold text-txt" : "text-dim",
                  )}
                >
                  {step}
                </span>
              </li>
            );
          })}
        </ol>

        <div className="flex items-center justify-between gap-3 border-line border-t pt-3 lg:justify-end lg:border-0 lg:pt-0">
          <div className="flex items-center gap-2">
            <Clock aria-hidden="true" className="size-4 shrink-0 text-brand" />
            <div
              role="timer"
              aria-live="off"
              aria-label={`Sisa waktu ${clock}`}
              className="flex flex-col leading-none"
            >
              <span className="whitespace-nowrap text-[10px] text-dim">
                Sisa Waktu
              </span>
              <span className="tabular mt-0.5 font-bold text-[17px] text-brand-strong">
                {clock}
              </span>
            </div>
          </div>

          <span
            aria-hidden="true"
            className="hidden h-8 w-px bg-line lg:block"
          />

          <Button
            data-pressable
            variant="outline"
            className="h-9 rounded-full border-line px-3 font-medium text-xs"
            aria-pressed={paused}
            onClick={() => setPaused((current) => !current)}
          >
            {paused ? (
              <Play aria-hidden="true" className="size-3.5" />
            ) : (
              <Pause aria-hidden="true" className="size-3.5" />
            )}
            <span>{paused ? "Lanjutkan" : "Pause"}</span>
          </Button>
        </div>
      </div>
    </section>
  );
}
