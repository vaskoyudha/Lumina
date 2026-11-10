"use client";

import { Check, Clock, Pause, Play, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { SURFACE_PANEL } from "@/components/simulasi/surface";
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
      className={cn("relative overflow-hidden", SURFACE_PANEL, className)}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-[#fdf3ec]/80 via-[#fdf3ec]/30 to-transparent"
      />
      <div className="relative flex flex-col gap-4 px-4 py-4 sm:px-5 lg:flex-row lg:items-center lg:justify-between lg:gap-5">
        <div className="flex min-w-0 items-center gap-3 lg:max-w-[24rem]">
          <span className="grid size-10 shrink-0 place-items-center rounded-[12px] bg-[linear-gradient(180deg,#fde8d8_0%,#fbd9c2_100%)] text-[#e65808]">
            <ShieldCheck
              aria-hidden="true"
              strokeWidth={1.8}
              className="size-5"
            />
          </span>
          <div className="min-w-0">
            <p className="font-extrabold text-[13px] text-[#1e1c1a] leading-snug">
              {title}
            </p>
            <p className="mt-0.5 text-[#8a8077] text-[10.5px] leading-snug">
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
                      done || current ? "bg-[#f5decb]" : "bg-[#ede3da]",
                    )}
                  />
                )}
                <span
                  className={cn(
                    "tabular relative z-10 grid size-[22px] place-items-center rounded-full font-semibold text-[11px]",
                    current
                      ? "bg-[#f2600c] text-white shadow-sm"
                      : done
                        ? "bg-[#fde8d8] text-[#e65808] ring-1 ring-[#f5decb]"
                        : "bg-[#fdfaf7] text-[#8a8077] ring-1 ring-[#ede3da]",
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
                    "text-[10px] leading-none",
                    current ? "font-bold text-[#1e1c1a]" : "text-[#8a8077]",
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
            <Clock
              aria-hidden="true"
              className="size-4 shrink-0 text-[#f2600c]"
            />
            <div
              role="timer"
              aria-live="off"
              aria-label={`Sisa waktu ${clock}`}
              className="flex flex-col leading-none"
            >
              <span className="whitespace-nowrap text-[9.5px] text-[#8a8077]">
                Sisa Waktu
              </span>
              <span className="tabular mt-0.5 font-extrabold text-[16px] text-[#c8430e]">
                {clock}
              </span>
            </div>
          </div>

          <span
            aria-hidden="true"
            className="hidden h-8 w-px bg-[#f0e5dc] lg:block"
          />

          <Button
            data-pressable
            variant="outline"
            className="h-8 rounded-full border-[#ede3da] bg-[linear-gradient(180deg,#ffffff_0%,#fdfaf7_100%)] px-3 font-semibold text-[#221f1d] text-[10.5px]"
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
