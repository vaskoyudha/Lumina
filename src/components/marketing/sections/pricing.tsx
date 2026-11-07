"use client";

import Image from "next/image";
import { useState } from "react";
import { useSite } from "@/components/marketing/site-provider";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { scrollToId } from "@/lib/scroll";
import {
  plans,
  pricingCopy,
  promoEnabledMessage,
  testimonialCopy,
} from "@/lib/site";

type Plan = (typeof plans)[number];

function priceFor(plan: Plan, promo: boolean) {
  if (!promo) return { price: plan.price, oldPrice: plan.oldPrice };
  if (plan.price === "Rp0") return { price: "Rp0", oldPrice: "" };
  const numeric = Number(plan.price.replace(/[^\d]/g, ""));
  if (!Number.isFinite(numeric) || numeric === 0) {
    return { price: plan.price, oldPrice: plan.oldPrice };
  }
  const half = Math.round(numeric / 2);
  return {
    price: `Rp${half.toLocaleString("id-ID")}`,
    oldPrice: plan.price,
  };
}

export function Pricing() {
  const { openBooking, showToast } = useSite();
  const [promo, setPromo] = useState(false);
  const [story, setStory] = useState(0);

  const total = testimonialCopy.items.length;
  const active = testimonialCopy.items[story] ?? testimonialCopy.items[0];

  function togglePromo(next: boolean) {
    setPromo(next);
    if (next) showToast(promoEnabledMessage);
  }

  function move(delta: number) {
    setStory((current) => (current + delta + total) % total);
  }

  return (
    <section
      id="section-pricing"
      className="border-ls-line border-t bg-ls-surface px-4 pt-28 pb-24 sm:px-8"
    >
      <div className="mx-auto grid max-w-[1680px] grid-cols-1 items-stretch gap-10 lg:grid-cols-12">
        <div className="flex flex-col lg:col-span-7">
          <div data-reveal className="mb-8 text-center sm:text-left">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-ls-line-strong bg-ls-card px-3.5 py-1 font-semibold text-[11px] text-ls-ink-2 uppercase tracking-wider">
                <span>☺</span>
                <span>{pricingCopy.badge}</span>
              </div>
              <Label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-ls-line-strong bg-ls-card px-3 py-1.5 font-medium text-ls-ink-2 text-xs shadow-sm">
                <Checkbox
                  id="pricing-promo-toggle"
                  checked={promo}
                  onCheckedChange={(value) => togglePromo(value === true)}
                />
                <span>{pricingCopy.promoLabel}</span>
              </Label>
            </div>

            <h2 className="mt-3 font-semibold text-3xl text-ls-ink sm:text-4xl">
              {pricingCopy.title}
            </h2>
            <p className="mt-1.5 text-ls-ink-2 text-xs sm:text-sm">
              {pricingCopy.body}
            </p>
          </div>

          <div className="grid flex-1 grid-cols-1 gap-6 sm:grid-cols-2">
            {plans.map((plan) => {
              const display = priceFor(plan, promo);
              return (
                <div
                  key={plan.id}
                  data-reveal
                  className="flex flex-col justify-between overflow-hidden rounded-3xl border border-ls-line-strong bg-ls-card shadow-md"
                >
                  <div>
                    <div
                      className={`${plan.ribbonClass} px-4 py-2 text-center font-bold text-[10px] uppercase tracking-widest`}
                    >
                      {plan.ribbon}
                    </div>
                    <div className="p-6">
                      <div className="flex items-start gap-3">
                        <span
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${plan.iconClass} font-bold text-sm`}
                        >
                          {plan.icon}
                        </span>
                        <div>
                          <h3 className="font-bold text-ls-ink text-lg">
                            {plan.name}
                          </h3>
                          <p className="mt-0.5 text-ls-ink-3 text-xs leading-snug">
                            {plan.desc}
                          </p>
                        </div>
                      </div>

                      <div className="mt-5 border-ls-line border-t pt-4">
                        <div className="mb-3 font-bold text-[10px] text-ls-ink-3 uppercase tracking-wider">
                          YANG KAMU DAPAT:
                        </div>
                        <ul className="space-y-2.5 text-ls-ink-2 text-xs">
                          {plan.features.map((feature) => (
                            <li
                              key={feature}
                              className="flex items-center gap-2"
                            >
                              <span className={plan.bulletClass}>●</span>
                              {feature}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 pt-0">
                    <div className="mb-4 flex items-baseline gap-1.5 border-ls-line border-dashed border-t pt-4">
                      <span
                        id={`price-${plan.id}`}
                        className="font-bold font-display text-3xl text-ls-ink"
                      >
                        {display.price}
                      </span>
                      <span
                        id={`price-${plan.id}-old`}
                        className={
                          display.oldPrice
                            ? "text-ls-ink-3 text-sm line-through"
                            : "hidden text-ls-ink-3 text-sm line-through"
                        }
                      >
                        {display.oldPrice || plan.price}
                      </span>
                      <span className="text-[11px] text-ls-ink-3">
                        {plan.suffix}
                      </span>
                    </div>
                    <Button
                      className={
                        plan.id === "gratis"
                          ? "h-auto w-full justify-between rounded-full border-ls-solid-line bg-ls-solid py-2 pr-2 pl-5 font-semibold text-ls-solid-ink text-xs shadow transition-all hover:bg-ls-solid-hover active:scale-[0.98]"
                          : "h-auto w-full justify-between rounded-full bg-ls-accent py-2 pr-2 pl-5 font-semibold text-ls-accent-ink text-xs shadow-sm transition-all hover:bg-ls-accent-strong active:scale-[0.98]"
                      }
                      onClick={() => {
                        if (plan.action === "scroll") {
                          scrollToId("section-home");
                        } else {
                          openBooking(plan.name);
                        }
                      }}
                    >
                      <span>{plan.cta}</span>
                      <span
                        className={
                          plan.id === "gratis"
                            ? "flex h-6 w-6 items-center justify-center rounded-full bg-ls-card font-bold text-[11px] text-ls-ink-2"
                            : "flex h-6 w-6 items-center justify-center rounded-full bg-ls-solid font-bold text-[11px] text-ls-solid-ink"
                        }
                      >
                        »
                      </span>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div
          data-reveal
          className="flex flex-col justify-between rounded-3xl border border-ls-line-strong bg-ls-card p-6 shadow-sm sm:p-8 lg:col-span-5"
        >
          <div>
            <div className="mb-4 flex items-center justify-between gap-2">
              <h2 className="font-semibold text-2xl text-ls-ink leading-tight sm:text-3xl">
                {testimonialCopy.title}
              </h2>
            </div>

            <div className="mb-5 h-1 w-full overflow-hidden rounded-full bg-ls-line">
              <div
                id="testimonial-progress"
                className="h-full bg-ls-solid transition-all duration-300"
                style={{ width: active.progress }}
              />
            </div>
          </div>

          <div className="relative aspect-[4/4.3] overflow-hidden rounded-2xl bg-espresso-950 shadow-lg">
            <Image
              src="/images/testimonial.jpg"
              alt="Ilustrasi pendampingan Lumina"
              fill
              sizes="(min-width: 1024px) 420px, 100vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-transparent" />

            <div className="absolute right-4 bottom-4 left-4 rounded-xl border border-white/15 bg-black/55 p-4 text-white backdrop-blur-md">
              <div className="mb-2 flex items-center gap-1 text-amberwarm-400 text-xs">
                <span>★</span>
                <span>★</span>
                <span>★</span>
                <span>★</span>
                <span>★</span>
              </div>
              <p
                aria-live="polite"
                id="testimonial-quote"
                className="text-amberwarm-50 text-xs italic leading-relaxed sm:text-sm"
              >
                &ldquo;{active.quote}&rdquo;
              </p>
              <div className="mt-2.5 flex items-center justify-between text-[11px] text-amberwarm-200/80">
                <span
                  id="testimonial-author"
                  className="font-semibold text-white"
                >
                  {active.author}{" "}
                  <span className="font-normal text-amberwarm-200/75">
                    {active.meta}
                  </span>
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    id="prev-testimonial"
                    type="button"
                    aria-label="Kutipan sebelumnya"
                    onClick={() => move(-1)}
                    className="flex h-6 w-6 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/30"
                  >
                    ‹
                  </button>
                  <button
                    id="next-testimonial"
                    type="button"
                    aria-label="Kutipan berikutnya"
                    onClick={() => move(1)}
                    className="flex h-6 w-6 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/30"
                  >
                    ›
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
